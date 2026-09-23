import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// CLAUDE.md and AGENTS.md carry the same repo instructions for different agents (Claude
// Code reads the first, Codex and the rest the second). They drifted apart once: AGENTS.md
// lost the sizing and motion sections while CLAUDE.md lacked the role-based material
// contract. One text, checked here, keeps every agent on the same rules.
const root = join(import.meta.dir, "..", "..");
const read = (name: string) => readFileSync(join(root, name), "utf8");

describe("agent instruction files", () => {
  it("AGENTS.md carries exactly the instructions in CLAUDE.md", () => {
    expect(read("AGENTS.md")).toBe(read("CLAUDE.md"));
  });
});
