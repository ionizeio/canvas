// Guards the docs' patched dependencies (`patchedDependencies` in docs/package.json).
// Run by CI after the docs install (.github/workflows/validate.yml) and by
// `bun run check:patches`.
//
// 1. Every patch is still in force. bun applies a patch only while its key's version is
//    the installed version, and when a bump leaves the key behind it skips the patch
//    without a word: bun 1.4.0 exits 0 with no warning, --frozen-lockfile included, and
//    a plain install also drops the entry from bun.lock. A hunk that no longer applies
//    does fail the install loudly, so the silent case is the version bump, and it is the
//    one an Expo upgrade produces. So for each entry: the installed version is the key's,
//    bun.lock lists it, and every line the patch adds is in the installed file.
//
// 2. The expo patch still does its job (patches/expo@57.0.16.patch). Expo's development
//    wrapper around the root the client hydrates must add no useId fork, or every id a
//    pre-rendered page hydrates differs from the server's on the dev server. This renders
//    a useId probe on the server, hydrates it under the patched wrapper with the docs'
//    own React (the development build, the only one that reports a hydration diff), and
//    requires matching ids, no console error, and the Fast Refresh toast still mounting,
//    once, outside the root. The @expo/router-server patch needs Metro to run at all, so
//    its behaviour is guarded in a browser instead: e2e/behavior/hydration-ids.e2e.ts,
//    which the CI e2e job runs on the export.
//
// The root unit suite cannot do either: it runs before the docs install, on a different
// React, and bun there has no web platform resolution.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ComponentType, ReactElement, ReactNode } from "react";

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODULES = join(DOCS, "node_modules");

interface Pkg {
  version?: string;
  patchedDependencies?: Record<string, string>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** "@expo/router-server@57.0.7" -> ["@expo/router-server", "57.0.7"]. */
function splitKey(key: string): [string, string] {
  const at = key.lastIndexOf("@");
  return [key.slice(0, at), key.slice(at + 1)];
}

/** The lines a unified diff adds, per file it touches. */
function addedLines(patch: string): Map<string, string[]> {
  const files = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of patch.split("\n")) {
    const header = /^diff --git a\/.+ b\/(.+)$/.exec(line);
    if (header) {
      current = [];
      files.set(header[1]!, current);
      continue;
    }
    if (!current || line.startsWith("+++") || !line.startsWith("+")) continue;
    if (line.slice(1).trim() !== "") current.push(line.slice(1));
  }
  return files;
}

function checkPatchesInForce(): string[] {
  const problems: string[] = [];
  const pkg = readJson<Pkg>(join(DOCS, "package.json"));
  const lock = readFileSync(join(DOCS, "bun.lock"), "utf8");
  for (const [key, patchPath] of Object.entries(pkg.patchedDependencies ?? {})) {
    const [name, version] = splitKey(key);
    const manifest = join(MODULES, name, "package.json");
    if (!existsSync(manifest)) {
      problems.push(`${key}: ${name} is not installed, so ${patchPath} patches nothing`);
      continue;
    }
    const installed = readJson<Pkg>(manifest).version;
    if (installed !== version) {
      problems.push(
        `${key}: ${name}@${installed} is installed, so bun skips ${patchPath} without a warning. ` +
          `Re-create the patch against ${installed} with \`bun patch ${name}\`, or drop it if ${installed} fixes what it patched.`,
      );
      continue;
    }
    if (!lock.includes(`"${key}": "${patchPath}"`)) {
      problems.push(`${key}: bun.lock does not list ${patchPath} under patchedDependencies; run \`bun install\` in docs/ and commit the lockfile`);
    }
    for (const [file, lines] of addedLines(readFileSync(join(DOCS, patchPath), "utf8"))) {
      const target = join(MODULES, name, file);
      const present = existsSync(target) ? new Set(readFileSync(target, "utf8").split("\n")) : new Set<string>();
      const missing = lines.filter((line) => !present.has(line));
      if (missing.length > 0) {
        problems.push(`${key}: ${missing.length} line(s) ${patchPath} adds are missing from node_modules/${name}/${file} (first: ${JSON.stringify(missing[0]!.trim())}); reinstall with \`bun install\` in docs/`);
      }
    }
  }
  return problems;
}

// The part of bun's runtime plugin API used below, declared here because the docs
// project carries no Bun types.
declare const Bun: {
  plugin(plugin: {
    name: string;
    setup(build: {
      onLoad(
        options: { filter: RegExp },
        load: (args: { path: string }) => { contents: string; loader: "ts" | "tsx" },
      ): void;
    }): void;
  }): void;
};

/**
 * Load a module's `.web` sibling in place of the module, the way Metro resolves a web
 * bundle. Only Expo's own source needs it here: withDevTools.web.tsx imports
 * `../environment/DevLoadingView`, whose native build pulls in react-native.
 */
function registerWebPlatformFiles(): void {
  Bun.plugin({
    name: "expo-web-platform-files",
    setup(build) {
      build.onLoad({ filter: /[\\/]node_modules[\\/]expo[\\/]src[\\/].*\.tsx?$/ }, (args: { path: string }) => {
        const web = [".web.tsx", ".web.ts"].map((ext) => args.path.replace(/(\.web)?\.tsx?$/, ext)).find((path) => existsSync(path));
        const path = web ?? args.path;
        return { contents: readFileSync(path, "utf8"), loader: path.endsWith(".tsx") ? "tsx" : "ts" };
      });
    },
  });
}

interface ReactRoot {
  render(element: ReactNode): void;
  unmount(): void;
}

/**
 * Import a module by a specifier held in a variable. The docs carry no @types/react-dom,
 * and Expo's source is not part of this project, so both are typed at the call site.
 */
async function load<T>(specifier: string): Promise<T> {
  return (await import(specifier)) as T;
}

/** Poll until `done` holds, for up to two seconds of timers. */
async function settle(done: () => boolean): Promise<boolean> {
  for (let i = 0; i < 100; i++) {
    if (done()) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return done();
}

async function checkDevRoot(): Promise<string[]> {
  const problems: string[] = [];
  // React reports a hydrated attribute diff in its development build only.
  process.env.NODE_ENV ??= "development";
  const { GlobalRegistrator } = await import("@happy-dom/global-registrator");
  GlobalRegistrator.register({ url: "http://localhost:8081/" });
  registerWebPlatformFiles();
  const logged: string[] = [];
  const consoleError = console.error;
  console.error = (...args: unknown[]) => logged.push(args.map(String).join(" "));
  try {
    const React = await import("react");
    const { renderToString } = await load<{ renderToString: (element: ReactElement) => string }>("react-dom/server");
    const { createRoot, hydrateRoot } = await load<{
      createRoot: (container: Element) => ReactRoot;
      hydrateRoot: (container: Element, element: ReactElement) => ReactRoot;
    }>("react-dom/client");
    const { withDevTools } = await load<{
      withDevTools: <P extends object>(component: ComponentType<P>) => ComponentType<P>;
    }>(join(MODULES, "expo", "src", "launch", "withDevTools.web.tsx"));
    const emitter = await load<{ emit: (event: string, data?: unknown) => void }>(
      join(MODULES, "expo", "src", "devLoadingViewEmitter.ts"),
    );

    // A field's label id, the kind of id the templates carry.
    const rendered: string[] = [];
    function Field() {
      const id = React.useId();
      rendered.push(id);
      return React.createElement("label", { id }, "Email");
    }

    // The server renders the app alone, the shape the patched static renderer writes
    // into #root, and the client hydrates it under the development wrapper.
    const root = document.createElement("div");
    root.id = "root";
    root.innerHTML = renderToString(React.createElement(Field));
    document.body.appendChild(root);
    const serverId = rendered[0];
    const hydrated = hydrateRoot(root, React.createElement(withDevTools(Field)));
    const label = () => root.querySelector("label");
    if (!(await settle(() => rendered.length > 1 && label() !== null))) problems.push("the dev root never hydrated the probe");
    const clientId = rendered[rendered.length - 1];
    if (clientId !== serverId) {
      problems.push(`the dev wrapper shifts useId: the server rendered "${serverId}", the dev client "${clientId}" (a fork beside the app in withDevTools.web.tsx)`);
    }
    if (label()?.id !== clientId) {
      problems.push(`the hydrated label keeps "${label()?.id}" while the client rendered "${clientId}"`);
    }

    // A second registration (expo-router registers a fallback root when the first throws)
    // must not add a second toast root.
    const fallback = document.createElement("div");
    document.body.appendChild(fallback);
    const second = createRoot(fallback);
    second.render(React.createElement(withDevTools(() => null)));

    // Let the toast's mount animation run out, then show it the way Fast Refresh does.
    await new Promise((resolve) => setTimeout(resolve, 400));
    emitter.emit("devLoadingView:showMessage", { message: "Refreshing..." });
    const toasts = () => Array.from(document.querySelectorAll(".__expo_fast_refresh_show"));
    if (!(await settle(() => toasts().length > 0))) {
      problems.push("the Fast Refresh toast never showed");
    } else {
      if (toasts().length !== 1) problems.push(`${toasts().length} Fast Refresh toasts showed; the toast root mounts once per page`);
      if (toasts().some((toast) => root.contains(toast) || fallback.contains(toast))) {
        problems.push("the Fast Refresh toast rendered inside an app root, where it forks the app's useId");
      }
    }
    emitter.emit("devLoadingView:hide");

    hydrated.unmount();
    second.unmount();
    // React flushes an unmount's passive effects on a later task; let it run while the
    // DOM globals still exist.
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally {
    console.error = consoleError;
  }
  for (const line of logged) problems.push(`console error while hydrating: ${line.split("\n")[0]}`);
  await GlobalRegistrator.unregister();
  return problems;
}

const inForce = checkPatchesInForce();
const devRoot = inForce.length === 0 ? await checkDevRoot() : [];
const problems = [...inForce, ...devRoot];
if (problems.length > 0) {
  console.error(`check:patches - ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
const count = Object.keys(readJson<Pkg>(join(DOCS, "package.json")).patchedDependencies ?? {}).length;
console.log(`check:patches - ${count} patches in force, and the dev root hydrates the server's useIds`);
