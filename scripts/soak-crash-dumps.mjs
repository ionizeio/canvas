// The E2E soak's crash capture (.github/workflows/e2e-soak.yml, `crash_dumps: on`).
//
// Playwright's Firefox builds leave Firefox's own crash reporter out: the binary carries
// none of its code and Playwright's playwright.cfg locks toolkit.crashreporter.enabled
// off, so a crashed browser leaves no minidump whatever MOZ_CRASHREPORTER variables or
// preferences it is given. The soak keeps the kernel's core dump instead: the workflow
// points kernel.core_pattern at a directory of the lane's and lifts the core size limit
// for the replay, and this script does the rest.
//
//   self-test <browser> <cores> <report>
//                               Launches the soak's build of <browser> (chromium,
//                               firefox or webkit), crashes it with SIGSEGV and fails
//                               unless its core lands in <cores> and gdb reads it, so a
//                               lane never replays for an hour with a capture that cannot
//                               work. The core's report goes to <report> (it also shows
//                               whether the build's frames can be named) and the core is
//                               deleted.
//   report <core> <report>      Writes what a core says: the signal and the address it
//                               faulted on, Mozilla's crash reason when MOZ_CRASH or a
//                               release assertion set one, the faulting instruction and
//                               registers, the crashing thread's stack and every other
//                               thread's, each frame as module+offset (the form a
//                               symbol file or the kernel's segfault line uses), and the
//                               build IDs and symbol tables of the modules involved.
//                               gdb's whole output is kept beside it as <report>.gdb.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const SIGNALS = { 4: "SIGILL", 5: "SIGTRAP", 6: "SIGABRT", 7: "SIGBUS", 8: "SIGFPE", 11: "SIGSEGV" };
// si_code of a fault. A general protection fault reports SI_KERNEL with a zero address:
// the pointer was non-canonical (mozjemalloc's 0xe5e5... poison, for one), and only the
// registers hold it.
const SIGNAL_CODES = {
  0: "SI_USER (sent by kill)",
  1: "SEGV_MAPERR (address not mapped)",
  2: "SEGV_ACCERR (no permission for the access)",
  128: "SI_KERNEL (general protection fault; the address is in a register)",
};

/** gdb commands, each under its own marker so its output can be found again. */
const SECTIONS = [
  ["mappings", "info proc mappings"],
  ["signal", "print $_siginfo.si_signo"],
  ["code", "print $_siginfo.si_code"],
  ["address", "print $_siginfo._sifields._sigfault.si_addr"],
  ["sender", "print $_siginfo._sifields._kill.si_pid"],
  // Set by MOZ_CRASH and MOZ_RELEASE_ASSERT before they fault; exported from mozglue.
  ["reason", "print *(const char **)&gMozCrashReason"],
  ["instruction", "x/3i $pc"],
  ["registers", "info registers"],
  ["threads", "info threads"],
  ["crashing", "bt 200"],
  ["all", "thread apply all bt 100"],
];

/** A command's standard output, or a line saying why there is none. */
function run(file, args) {
  const result = spawnSync(file, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return result.error ? `${file} failed: ${result.error.message}` : `${result.stdout}${result.stderr}`;
}

/** The sections of one batch gdb run, by name. */
export function splitSections(output) {
  const sections = {};
  let current = null;
  for (const line of output.split("\n")) {
    const marker = /^@@section (\w+)$/.exec(line);
    if (marker) {
      current = marker[1];
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  return Object.fromEntries(Object.entries(sections).map(([name, lines]) => [name, lines.join("\n").trim()]));
}

/** The core's mapped files from `info proc mappings`: start, end and path. */
export function parseMappings(text) {
  const mappings = [];
  for (const line of text.split("\n")) {
    const match = /^\s*(0x[0-9a-f]+)\s+(0x[0-9a-f]+)\s+0x[0-9a-f]+\s+0x[0-9a-f]+\s+(?:[r-][w-][x-][ps-]\s+)?(\/\S.*)$/.exec(line);
    if (match) mappings.push({ start: BigInt(match[1]), end: BigInt(match[2]), file: match[3].trim() });
  }
  return mappings;
}

/**
 * `module+0xoffset` for an address, the offset taken from the module's lowest mapping
 * (its load base), which is how a symbol file or a minidump's stack names a frame.
 */
export function moduleOffset(address, mappings) {
  const hit = mappings.find((mapping) => address >= mapping.start && address < mapping.end);
  if (!hit) return null;
  const base = mappings.filter((mapping) => mapping.file === hit.file).reduce((low, mapping) => (mapping.start < low ? mapping.start : low), hit.start);
  return `${path.basename(hit.file)}+0x${(address - base).toString(16)}`;
}

/** Stack lines with each frame's module+offset appended in brackets. */
export function annotateFrames(text, mappings) {
  return text.split("\n").map((line) => {
    const frame = /^#\d+\s+(0x[0-9a-f]+)\s/.exec(line);
    const where = frame ? moduleOffset(BigInt(frame[1]), mappings) : null;
    return where ? `${line}  [${where}]` : line;
  }).join("\n");
}

/** The value of gdb's `$n = value` answer, or null when it answered with an error. */
export function printed(text) {
  const match = /^\$\d+ = (.*)$/m.exec(text ?? "");
  return match ? match[1].trim() : null;
}

/** The executable a core came from, as file(1) reads it from the core's notes. */
function executableOf(core) {
  const described = run("file", ["-b", core]);
  const match = /execfn: '([^']+)'/.exec(described);
  if (!match) throw new Error(`file(1) names no executable for ${core}: ${described.trim()}`);
  return match[1];
}

/** A module's GNU build ID and whether it still has a symbol table or debug info. */
function describeModule(file) {
  const buildId = /Build ID: ([0-9a-f]+)/.exec(run("readelf", ["-n", file]))?.[1] ?? "none";
  const sectionTable = run("readelf", ["-S", "-W", file]);
  const symbols = [".symtab", ".debug_info", ".gnu_debugdata"].filter((name) => sectionTable.includes(` ${name} `));
  return `${file}: build ID ${buildId}, ${symbols.length ? `carries ${symbols.join(", ")}` : "stripped (dynamic symbols only)"}`;
}

/** Write the report for one core and return what it found. */
export function report(core, destination) {
  const executable = executableOf(core);
  const args = ["-nx", "-batch", "-ex", "set debuginfod enabled off", "-ex", "set pagination off", "-ex", "set width 0", "-ex", "set print frame-arguments none"];
  for (const [name, command] of SECTIONS) args.push("-ex", `echo \\n@@section ${name}\\n`, "-ex", command);
  // One file for both streams, so an error lands in the section of the command it answers.
  const raw = `${destination}.gdb`;
  const fd = fs.openSync(raw, "w");
  const gdb = spawnSync("gdb", [...args, executable, core], { stdio: ["ignore", fd, fd] });
  fs.closeSync(fd);
  if (gdb.error) throw new Error(`gdb could not run: ${gdb.error.message}`);
  const sections = splitSections(fs.readFileSync(raw, "utf8"));
  const mappings = parseMappings(sections.mappings ?? "");

  const signal = Number(printed(sections.signal));
  const code = Number(printed(sections.code));
  const reason = printed(sections.reason);
  const modules = [executable, ...new Set(mappings.map((mapping) => mapping.file).filter((file) => file.endsWith("/libxul.so")))];
  const crashing = annotateFrames(sections.crashing ?? "", mappings);
  const frames = crashing.split("\n").filter((line) => /^#\d+ .*\[\S+\+0x[0-9a-f]+\]$/.test(line)).length;

  const lines = [
    `Core: ${path.basename(core)}, ${fs.statSync(core).size} bytes (apparent size)`,
    `Executable: ${executable}`,
    `Signal: ${signal} ${SIGNALS[signal] ?? ""}, si_code ${code} ${SIGNAL_CODES[code] ?? ""}`,
    code === 0
      ? `Sent by pid: ${printed(sections.sender) ?? "(not reported)"}`
      : `Fault address: ${printed(sections.address) ?? "(not reported)"}`,
    `Mozilla crash reason: ${reason === null ? "(gMozCrashReason not found)" : reason === "0x0" ? "(none set: not a MOZ_CRASH or release assertion)" : reason}`,
    `Mapped files: ${mappings.length}; crashing thread's frames placed in a module: ${frames}`,
    "",
    "Faulting instruction:",
    sections.instruction ?? "",
    "",
    "Modules:",
    ...modules.map((file) => `  ${describeModule(file)}`),
    "",
    "Threads (* marks the one that received the signal):",
    sections.threads ?? "",
    "",
    "Crashing thread's stack:",
    crashing,
    "",
    "Registers:",
    sections.registers ?? "",
    "",
    "Every thread's stack:",
    annotateFrames(sections.all ?? "", mappings),
    "",
    "Mappings:",
    sections.mappings ?? "",
  ];
  fs.writeFileSync(destination, `${lines.join("\n")}\n`);
  return { signal, code, sender: printed(sections.sender), frames, mappings: mappings.length };
}

/** A process's core files in a directory where the pattern is core.<pid>.<thread name>. */
function coresOf(cores, pid) {
  return fs.readdirSync(cores).filter((name) => name.startsWith(`core.${pid}.`)).map((name) => path.join(cores, name));
}

async function selfTest(engine, cores, destination) {
  if (!["chromium", "firefox", "webkit"].includes(engine)) throw new Error(`no Playwright browser is called ${engine}`);
  const server = await (await import("playwright"))[engine].launchServer();
  const browser = server.process();
  const limit = fs.readFileSync(`/proc/${browser.pid}/limits`, "utf8").split("\n").find((line) => line.startsWith("Max core file size"));
  console.log(`${engine} ${browser.pid}: ${limit?.replace(/\s+/g, " ").trim()}`);
  const exited = new Promise((resolve) => browser.once("exit", (exitCode, signal) => resolve(signal)));
  browser.kill("SIGSEGV");
  const signal = await exited;
  await server.close();
  if (signal !== "SIGSEGV") throw new Error(`${engine} ${browser.pid} ended with ${signal}, not SIGSEGV`);
  const found = coresOf(cores, browser.pid);
  if (found.length !== 1) {
    const pattern = fs.readFileSync("/proc/sys/kernel/core_pattern", "utf8").trim();
    throw new Error(`${engine} ${browser.pid} died of SIGSEGV but left ${found.length} cores in ${cores} (kernel.core_pattern ${pattern})`);
  }
  const result = report(found[0], destination);
  fs.rmSync(found[0]);
  console.log(fs.readFileSync(destination, "utf8").split("\nRegisters:")[0]);
  if (result.signal !== 11 || result.code !== 0 || result.sender !== String(process.pid)) {
    throw new Error(`gdb read signal ${result.signal}, si_code ${result.code} from pid ${result.sender} in the self-test core, not the SIGSEGV this process (${process.pid}) sent`);
  }
  if (result.mappings === 0 || result.frames === 0) throw new Error("gdb read no mappings or placed no frame in a module: every report would be blind");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "self-test" && rest.length === 3) {
    await selfTest(rest[0], rest[1], rest[2]);
  } else if (command === "report" && rest.length === 2) {
    const result = report(rest[0], rest[1]);
    console.log(`${rest[1]}: signal ${result.signal}, si_code ${result.code}, ${result.frames} frames placed in modules`);
  } else {
    throw new Error("usage: soak-crash-dumps.mjs self-test <browser> <cores> <report> | report <core> <report>");
  }
}
