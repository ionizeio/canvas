import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join, relative, resolve, sep } from "node:path";

/**
 * Mirror compiled outputs and package metadata into registered local consumers.
 * Consumers use real node_modules directories stamped with this checkout's
 * .origin, since Next/Turbopack cannot follow workspace-external package links.
 * Registry installs, source symlinks and another checkout's overlays stay intact.
 *
 * A one-second mtime/size scan avoids Bun/macOS recursive fs.watch gaps. The web
 * and native compilers start concurrently with this process; defer syncing until
 * the package's referenced outputs exist, then copy files before publishing its
 * metadata. Every pass completes before the next begins.
 */
const ROOT = resolve(import.meta.dir, "..");
const SYNC_DIRS = ["dist", "styles"];
const SCAN_INTERVAL_MS = 1000;

interface Consumer { name: string; target: string }

// Retain every scope until existing consumers have migrated. The .origin
// registration, rather than the package name alone, authorizes each overlay.
const OVERLAY_SCOPES = [["@ionizeio", "canvas"], ["@nannier-com", "canvas"], ["@nannier", "canvas"]] as const;

function registered(target: string, root: string): boolean {
  try {
    const entry = lstatSync(target);
    return entry.isDirectory() && !entry.isSymbolicLink() &&
      realpathSync(readFileSync(join(target, ".origin"), "utf8").trim()) === realpathSync(root);
  } catch {
    return false;
  }
}

function findConsumers(root: string): Consumer[] {
  const consumers: Consumer[] = [];
  for (const parent of [resolve(root, ".."), resolve(root, "..", "ionize")]) {
    if (!existsSync(parent)) continue;
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const [scope, name] of OVERLAY_SCOPES) {
        const target = join(parent, entry.name, "node_modules", scope, name);
        if (registered(target, root)) consumers.push({ name: entry.name, target });
      }
    }
  }
  return consumers;
}

/** Paths and signatures for actual build files only, never followed source links. */
function scan(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (rel: string) => {
    const directory = join(root, rel);
    if (!existsSync(directory) || lstatSync(directory).isSymbolicLink()) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const child = join(rel, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) {
        const file = statSync(join(root, child));
        files.set(child, `${file.mtimeMs}:${file.size}`);
      }
    }
  };
  for (const directory of SYNC_DIRS) walk(directory);
  return files;
}

function targetStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(targetStrings);
  return [];
}

type Metadata = { raw: string; files: string[] } | { pending: string };
function readyMetadata(root: string, outputs: Map<string, string>): Metadata {
  let raw: string;
  let metadata: Record<string, unknown>;
  try {
    raw = readFileSync(join(root, "package.json"), "utf8");
    metadata = JSON.parse(raw);
    if (!metadata || Array.isArray(metadata) || typeof metadata !== "object" ||
      typeof metadata.name !== "string" || typeof metadata.version !== "string") {
      return { pending: "package.json must contain package name and version strings" };
    }
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT") {
      return { pending: "package.json is missing or not valid JSON" };
    }
    throw error;
  }
  const targets = [metadata.main, metadata.module, metadata.types, metadata["react-native"], metadata.exports].flatMap(targetStrings);
  if (!targets.length) return { pending: "package.json has no compiled entry points" };
  const files = new Set<string>();
  for (const target of targets) {
    const rel = relative(root, resolve(root, target));
    if (rel === "package.json") continue;
    // An accidental source entry must never turn the real-directory overlay
    // into a src alias. Only files in the two mirrored output trees can resolve.
    if (!SYNC_DIRS.some((directory) => rel.startsWith(`${directory}${sep}`))) {
      return { pending: `package target is outside the compiled output: ${target}` };
    }
    const pattern = new RegExp(`^${rel.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    const matches = [...outputs.keys()].filter((file) => pattern.test(file));
    if (!matches.length) return { pending: `waiting for package target ${target}` };
    for (const file of matches) files.add(file);
  }
  return { raw, files: [...files] };
}

async function publishMetadata(consumer: Consumer, root: string, metadata: Extract<Metadata, { raw: string }>): Promise<boolean | null> {
  if (!registered(consumer.target, root)) return null;
  // Check the destination too: finding a source entry is insufficient when a
  // copy has not completed. A concurrent package edit belongs to the next pass.
  if (readFileSync(join(root, "package.json"), "utf8") !== metadata.raw ||
    !metadata.files.every((file) => existsSync(join(root, file)) && existsSync(join(consumer.target, file)))) return null;
  const destination = join(consumer.target, "package.json");
  if (existsSync(destination) && readFileSync(destination, "utf8") === metadata.raw) return false;
  const temporary = join(consumer.target, `.canvas-package-${randomUUID()}.json`);
  try {
    // Preserve version, dependency ranges, condition order and every other field
    // byte for byte. Atomic replacement keeps JSON readers from seeing a prefix.
    await writeFile(temporary, metadata.raw, { flag: "wx" });
    if (!registered(consumer.target, root) || readFileSync(join(root, "package.json"), "utf8") !== metadata.raw) return null;
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return true;
}

export interface SyncResult {
  consumers: string[];
  changed: number;
  deleted: number;
  metadata: number;
  pending?: string;
}

/** One serialized pass, also used by disposable consumer fixtures without timers. */
export function createConsumerSync(root = ROOT): () => Promise<SyncResult> {
  const snapshots = new Map<string, Map<string, string>>();
  async function sync(): Promise<SyncResult> {
    const consumers = findConsumers(root);
    const active = new Set(consumers.map((consumer) => consumer.target));
    for (const target of snapshots.keys()) if (!active.has(target)) snapshots.delete(target);
    const result: SyncResult = { consumers: consumers.map((consumer) => consumer.name), changed: 0, deleted: 0, metadata: 0 };
    const current = scan(root);
    const metadata = readyMetadata(root, current);
    if ("pending" in metadata) return { ...result, pending: metadata.pending };
    for (const consumer of consumers) {
      const previous = snapshots.get(consumer.target);
      const changed = [...current.keys()].filter((file) => !previous || previous.get(file) !== current.get(file));
      const deleted = [...(previous ?? scan(consumer.target)).keys()].filter((file) => !current.has(file));
      if (!registered(consumer.target, root)) continue;
      for (const file of changed) {
        const destination = join(consumer.target, file);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(join(root, file), destination);
      }
      const published = await publishMetadata(consumer, root, metadata);
      // Keep old entry files until valid replacement metadata is visible. If
      // the source package changed while copying, defer deletion and the snapshot
      // update so the next pass still sees all outstanding work.
      if (published === null) continue;
      if (published) result.metadata += 1;
      for (const file of deleted) await rm(join(consumer.target, file), { force: true });
      snapshots.set(consumer.target, current);
      result.changed += changed.length;
      result.deleted += deleted.length;
    }
    return result;
  }
  let previous: Promise<unknown> = Promise.resolve();
  return () => {
    const next = previous.then(sync);
    previous = next.catch(() => {});
    return next;
  };
}

if (import.meta.main) {
  const sync = createConsumerSync();
  let previousPending: string | undefined;
  let first = true;
  while (true) {
    const result = await sync();
    if (result.pending && result.pending !== previousPending) console.log(`[canvas-sync] ${result.pending}; retaining consumer package metadata`);
    else if (!result.pending && (first || result.changed || result.deleted || result.metadata)) {
      console.log(result.consumers.length
        ? `[canvas-sync] ${result.changed} files, ${result.deleted} removed, ${result.metadata} package metadata updates -> ${result.consumers.join(", ")}`
        : "[canvas-sync] no linked consumers found yet; scanning anyway");
    }
    previousPending = result.pending;
    first = false;
    await new Promise((done) => setTimeout(done, SCAN_INTERVAL_MS));
  }
}
