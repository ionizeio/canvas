# CodeBlock

Syntax-highlighted code display with clipboard copy, horizontal scrolling, line
emphasis, diff rendering, collapsible folding, and tabbed alternatives. The
variant axis picks the surface (`terminal` > `numbered` > `inline` > plain,
first match wins); `compact` tightens the density; `copy`, `wrap`, `diff`,
`collapsible`, and `attached` stack orthogonally. `language` drives the in-kit
highlighter (ts/tsx/js/jsx, json, bash, css, html, python; anything else renders
monochrome), and long lines scroll horizontally instead of truncating.

When a line is wider than the block, Tab reaches the scrollable code and the
platform's arrow keys scroll it; while it has keyboard focus, the block's card
draws the theme's focus ring. Short content, `wrap`, and `inline` do not add
a scrolling tab stop. Native scrolling continues to use the native ScrollView.

## Usage

```tsx
<CodeBlock
  language="ts"
  code={`const theme = getTheme();
setTheme(theme === "dark" ? "light" : "dark");`}
/>
```

## Variants

### Syntax highlighting

```tsx
<CodeBlock
  language="tsx"
  code={`export function Hello({ name }: { name: string }) {
  // Greet the current user
  return <Badge primary>Hi {name}</Badge>;
}`}
/>
```

### Terminal

```tsx
<CodeBlock
  terminal
  code={`$ npm install @ionizeio/canvas
added 42 packages in 3s`}
/>
```

### Numbered

```tsx
<CodeBlock
  numbered
  language="ts"
  code={`const theme = getTheme();
setTheme(theme === "dark" ? "light" : "dark");`}
/>
```

### Inline

```tsx
<CodeBlock inline language="bash" code="npm install" />
```

### Compact

```tsx
<CodeBlock
  compact
  language="json"
  code={`{
  "theme": "system",
  "surface": "glass",
  "primary": "#6366f1"
}`}
/>
```

### Copy button

```tsx
<CodeBlock
  copy
  language="ts"
  code={`const theme = getTheme();
setTheme(theme === "dark" ? "light" : "dark");`}
/>
```

### Wrap long lines

```tsx
<CodeBlock
  wrap
  language="ts"
  code={`const message = "This is a very long line that would normally scroll horizontally, but wrap lets it soft-wrap onto the next line instead.";`}
/>
```

### Terminal label

```tsx
<CodeBlock
  terminal
  filename="deploy.sh"
  code={`$ ./deploy.sh --stage production
Build complete in 12s`}
/>
```

### Highlight lines

```tsx
<CodeBlock
  numbered
  language="tsx"
  highlightLines={["2-3"]}
  code={`export function Cta() {
  const label = getLabel();
  return <Button primary large>{label}</Button>;
}`}
/>
```

### Excerpt

```tsx
<CodeBlock
  numbered
  startLine={128}
  language="ts"
  code={`function resolveTokens(scheme: Scheme) {
  return scheme === "dark" ? darkTokens : lightTokens;
}`}
/>
```

### Diff

```tsx
<CodeBlock
  diff
  language="ts"
  code={`-const theme = "light";
+const theme = getTheme();
 setTheme(theme);`}
/>
```

### Collapsible

```tsx
<CodeBlock
  collapsible
  collapsedLines={3}
  language="ts"
  code={`export const tokens = {
  primary: "#6366f1",
  radius: 8,
  border: "#e4e4e7",
  muted: "#f4f4f5",
};`}
/>
```

### Tabs

```tsx
<CodeBlock
  tabs={[
    { label: "npm", code: "npm install @ionizeio/canvas" },
    { label: "yarn", code: "yarn add @ionizeio/canvas" },
    { label: "bun", code: "bun add @ionizeio/canvas" },
  ]}
/>
```

## Do & Don't

### Plain

**Do** — Use CodeBlock so whitespace, line breaks, and indentation survive verbatim.

```tsx
<CodeBlock code={`const theme = getTheme();
setTheme(theme === "dark" ? "light" : "dark");`} />
```

**Don't** — A paragraph collapses the line breaks and indentation, so multi-line code reads as one run-on string.

```tsx
<Text style={{ fontSize: 13, fontFamily: "monospace" }}>const theme = getTheme(); setTheme(theme === "dark" ? "light" : "dark");</Text>
```

### Terminal

**Do** — Use the terminal variant: the prompt stays out of the selection, so a copy yields only the command, not the shell glyph.

```tsx
<CodeBlock terminal code="npm install @ionizeio/canvas" />
```

**Don't** — Selectable prompt text means a reader who copies the line drags the $ marker into their shell.

```tsx
<View style={{ width: "100%", alignSelf: "flex-start", borderRadius: 8, backgroundColor: palette["zinc-900"], padding: 16 }}>
  <Text style={{ fontSize: 13, color: palette["zinc-100"], fontFamily: "monospace" }}>$ npm install @ionizeio/canvas</Text>
</View>
```

### Numbered

**Do** — Use the numbered variant: the gutter stays out of the selection, so copying the block returns clean, runnable code.

```tsx
<CodeBlock numbered code={`const theme = getTheme();
setTheme(theme);`} />
```

**Don't** — Selectable line numbers get swept into the selection and pasted as 1 2 ahead of every line.

```tsx
<View style={{ width: "100%", alignSelf: "flex-start", flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: alpha(tokens.muted, 0.5), padding: 16 }}>
  <View style={{ marginRight: 16, alignItems: "flex-end" }}>
    <Text style={{ fontSize: 14, lineHeight: 28, color: alpha(tokens["muted-foreground"], 0.5), fontFamily: "monospace" }}>1</Text>
    <Text style={{ fontSize: 14, lineHeight: 28, color: alpha(tokens["muted-foreground"], 0.5), fontFamily: "monospace" }}>2</Text>
  </View>
  <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%" }}>
    <Text style={{ fontSize: 14, lineHeight: 28, color: tokens.foreground, fontFamily: "monospace" }}>const theme = getTheme();</Text>
    <Text style={{ fontSize: 14, lineHeight: 28, color: tokens.foreground, fontFamily: "monospace" }}>setTheme(theme);</Text>
  </View>
</View>
```

### Diff

**Do** — Use diff mode: markers stay out of the selection and the copy chip yields the post-change code.

```tsx
<CodeBlock diff copy language="ts" code={`-const theme = "light";
+const theme = getTheme();
 setTheme(theme);`} />
```

**Don't** — Hand-colored +/- rows leave the markers selectable, so a copied block pastes broken code.

```tsx
<View style={{ width: "100%", alignSelf: "flex-start", borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: alpha(tokens.muted, 0.5), padding: 16 }}>
  <Text style={{ fontSize: 14, lineHeight: 28, color: palette["red-700"], fontFamily: "monospace" }}>-const theme = "light";</Text>
  <Text style={{ fontSize: 14, lineHeight: 28, color: palette["green-700"], fontFamily: "monospace" }}>+const theme = getTheme();</Text>
  <Text style={{ fontSize: 14, lineHeight: 28, color: tokens.foreground, fontFamily: "monospace" }}>setTheme(theme);</Text>
</View>
```

### Tabs

**Do** — One tabbed block keeps the package-manager alternatives in one place; the reader picks once.

```tsx
<CodeBlock terminal tabs={[
  { label: "npm", code: "npm install @ionizeio/canvas" },
  { label: "bun", code: "bun add @ionizeio/canvas" },
]} />
```

**Don't** — Stacked one-per-manager blocks repeat the same install three times and triple the page height.

```tsx
<Column snug>
  <CodeBlock terminal code="npm install @ionizeio/canvas" />
  <CodeBlock terminal code="yarn add @ionizeio/canvas" />
  <CodeBlock terminal code="bun add @ionizeio/canvas" />
</Column>
```

### Inline

**Do** — Reserve inline code for short tokens; move anything multi-line into a block.

```tsx
<Column snug>
  <Typography body>Run the setup command:</Typography>
  <CodeBlock code={`npm install @ionizeio/canvas
npm run build`} />
</Column>
```

**Don't** — A long, multi-step command crammed inline wraps mid-token and offers no horizontal scroll.

```tsx
<View style={{ maxWidth: 360, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
  <Text style={{ fontSize: 14, lineHeight: 28, color: tokens.foreground }}>Run </Text>
  <View style={{ alignSelf: "flex-start", borderRadius: 4, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.muted, paddingHorizontal: 6, paddingVertical: 2 }}>
    <Text style={{ fontSize: 13, color: tokens.foreground, fontFamily: "monospace" }}>npm install @ionizeio/canvas && npm run build && npm run preview</Text>
  </View>
  <Text style={{ fontSize: 14, lineHeight: 28, color: tokens.foreground }}> to start.</Text>
</View>
```
