import { join } from "node:path";

/**
 * Local kit dev: watches web and native compilation, then mirrors dist/ and
 * styles/ into linked sibling consumers. Any process dying stops the others so
 * an incomplete dev session cannot silently stop building or syncing.
 */

const procs = [
	Bun.spawn(["bunx", "tsc", "-p", "packages/canvas-blur/tsconfig.json", "--watch", "--preserveWatchOutput"], {
		stdout: "inherit", stderr: "inherit",
	}),
	Bun.spawn(["bunx", "tsc", "-p", "tsconfig.build.json", "--watch", "--preserveWatchOutput"], {
		stdout: "inherit",
		stderr: "inherit",
	}),
	Bun.spawn(["bun", join(import.meta.dir, "build-native.ts"), "--watch"], {
		stdout: "inherit",
		stderr: "inherit",
	}),
	Bun.spawn(["bun", join(import.meta.dir, "dev-sync.ts")], {
		stdout: "inherit",
		stderr: "inherit",
	}),
];

let shuttingDown = false;
function shutdown(): void {
	if (shuttingDown) return;
	shuttingDown = true;
	for (const proc of procs) proc.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const code = await Promise.race(procs.map((proc) => proc.exited));
shutdown();
await Promise.all(procs.map((proc) => proc.exited));
process.exit(code);
