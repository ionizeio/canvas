import { describe, it, expect, afterEach } from "bun:test";
import { type ReactNode } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { CodeBlock, tokenize } from "../src/molecules/code-block/code-block.tsx";

// CodeBlock: the in-kit tokenizer (pure string-in/spans-out), and the feature
// set added in the 2026-07 build-out — clipboard copy with feedback, diff mode,
// collapsible folding, and the tabs switcher (controlled + uncontrolled).

const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);
afterEach(cleanup);

const kinds = (line: { text: string; kind: string }[]) =>
  Object.fromEntries(line.map((t) => [t.text, t.kind]));

describe("tokenize", () => {
  it("classifies ts keywords, strings, numbers, and comments", () => {
    const [line] = tokenize('const n = 42; // answer "x"', "ts");
    const map = kinds(line);
    expect(map["const"]).toBe("keyword");
    expect(map["42"]).toBe("number");
    expect(map['// answer "x"']).toBe("comment");
    const [strLine] = tokenize('const s = "hi";', "ts");
    expect(kinds(strLine)['"hi"']).toBe("string");
  });

  it("classifies JSX tags and their attributes (bare semantic booleans included)", () => {
    const [line] = tokenize("<Button primary large>", "tsx");
    const map = kinds(line);
    expect(map["<Button"]).toBe("tag");
    expect(map["primary"]).toBe("attr");
    expect(map["large"]).toBe("attr");
    expect(map[">"]).toBe("tag");
  });

  it("keeps the arrow out of tag classification and spans block comments across lines", () => {
    const [arrow] = tokenize("() => 1", "ts");
    expect(kinds(arrow)["=>"]).toBe("text");
    const lines = tokenize("/* a\nb */", "ts");
    expect(lines.length).toBe(2);
    expect(lines[0][0].kind).toBe("comment");
    expect(lines[1][0].kind).toBe("comment");
  });

  it("distinguishes json keys from string values", () => {
    const [line] = tokenize('{ "name": "canvas", "beta": true }', "json");
    const map = kinds(line);
    expect(map['"name"']).toBe("attr");
    expect(map['"canvas"']).toBe("string");
    expect(map["true"]).toBe("keyword");
  });

  it("highlights shell command position, flags, and variables", () => {
    const [line] = tokenize("npm install --save-dev $PKG", "bash");
    const map = kinds(line);
    expect(map["npm"]).toBe("fn");
    expect(map["install"]).toBe("text");
    expect(map["--save-dev"]).toBe("attr");
    expect(map["$PKG"]).toBe("var");
  });

  it("falls back to monochrome for unknown languages and preserves line count", () => {
    const lines = tokenize("alpha\n\nbeta", "brainfuck");
    expect(lines.length).toBe(3);
    expect(lines[0]).toEqual([{ text: "alpha", kind: "text" }]);
    expect(lines[1]).toEqual([]);
    expect(lines.every((l) => l.every((t) => t.kind === "text"))).toBe(true);
  });
});

describe("CodeBlock copy", () => {
  it("passes the code back on press and flips the chip to Copied", () => {
    let copied: string | null = null;
    ui(<CodeBlock code="npm run build" copy onCopy={(c) => { copied = c; }} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(copied).toBe("npm run build");
    expect(screen.getByText("Copied")).toBeTruthy();
  });

  it("hosts the chip in the header when a filename is present", () => {
    const { container } = ui(<CodeBlock code="x" filename="a.ts" language="ts" copy />);
    // Header hosts the chip: nothing is absolutely pinned over the code.
    expect(screen.getByText("a.ts")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeTruthy();
    expect(container.textContent).toContain("ts"); // trailing language badge
  });
});

describe("CodeBlock diff", () => {
  const DIFF = "-const theme = dark;\n+const theme = getTheme();\n setTheme(theme);";

  it("renders +/- markers and copies the post-change code without them", () => {
    let copied: string | null = null;
    const { container } = ui(<CodeBlock diff code={DIFF} copy onCopy={(c) => { copied = c; }} />);
    // Both sides of the change render.
    expect(container.textContent).toContain("dark");
    expect(container.textContent).toContain("getTheme");
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    // Removed line dropped, markers stripped, context kept.
    expect(copied).toBe("const theme = getTheme();\nsetTheme(theme);");
  });
});

describe("CodeBlock collapsible", () => {
  const TEN = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join("\n");

  it("folds past collapsedLines and expands on press (uncontrolled)", () => {
    const { container } = ui(<CodeBlock collapsible collapsedLines={3} code={TEN} />);
    expect(container.textContent).toContain("line 3");
    expect(container.textContent).not.toContain("line 4");
    const expander = screen.getByRole("button", { name: /Show all 10 lines/ });
    expect(expander.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(expander);
    expect(container.textContent).toContain("line 10");
    expect(screen.getByText("Show less")).toBeTruthy();
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("true");
  });

  it("supports the controlled expanded contract", () => {
    let next: boolean | null = null;
    const { container } = ui(
      <CodeBlock collapsible collapsedLines={3} code={TEN} expanded={false} onExpandedChange={(e) => { next = e; }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Show all 10 lines/ }));
    expect(next).toBe(true);
    // Controlled: the parent did not update, so the block stays folded.
    expect(container.textContent).not.toContain("line 10");
  });

  it("does not fold when the code fits", () => {
    ui(<CodeBlock collapsible collapsedLines={8} code={"a\nb"} />);
    expect(screen.queryByText(/Show all/)).toBeNull();
  });
});

describe("CodeBlock tabs", () => {
  const TABS = [
    { label: "npm", code: "npm install @ionizeio/canvas" },
    { label: "bun", code: "bun add @ionizeio/canvas" },
  ];

  it("is interactive out of the box: first tab active, press switches", () => {
    const { container } = ui(<CodeBlock language="bash" tabs={TABS} />);
    expect(container.textContent).toContain("npm install");
    expect(container.textContent).not.toContain("bun add");
    fireEvent.click(screen.getByText("bun"));
    expect(container.textContent).toContain("bun add");
    expect(container.textContent).not.toContain("npm install");
  });

  it("marks exactly one tab aria-selected", () => {
    const { container } = ui(<CodeBlock language="bash" tabs={TABS} defaultActive={1} />);
    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabs.length).toBe(2);
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "true"]);
    expect(container.textContent).toContain("bun add");
  });

  it("supports the controlled active contract", () => {
    let picked: number | null = null;
    const { container } = ui(
      <CodeBlock language="bash" tabs={TABS} active={0} onTabChange={(i) => { picked = i; }} />,
    );
    fireEvent.click(screen.getByText("bun"));
    expect(picked).toBe(1);
    // Controlled: the parent did not update, so tab 0 stays active.
    expect(container.textContent).toContain("npm install");
  });
});

describe("CodeBlock terminal + numbered", () => {
  it("renders transcript output lines without a prompt and copies only commands", () => {
    let copied: string | null = null;
    const { container } = ui(
      <CodeBlock terminal copy onCopy={(c) => { copied = c; }} code={"$ npm install\nadded 12 packages"} />,
    );
    expect(container.textContent).toContain("added 12 packages");
    // Exactly one prompt: the output row carries none.
    expect(container.textContent!.split("$ ").length - 1).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(copied).toBe("npm install");
  });

  it("honors a custom prompt marker", () => {
    const { container } = ui(<CodeBlock terminal prompt=">" code={"> deploy\ndone"} />);
    expect(container.textContent).toContain("> deploy");
    expect(container.textContent).toContain("done");
  });

  it("offsets the numbered gutter by startLine", () => {
    ui(<CodeBlock numbered startLine={41} code={"a\nb"} />);
    expect(screen.getByText("41")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.queryByText("1")).toBeNull();
  });
});
