# Typography

Type scale classes for headings, body text, and helper styles.

## Usage

```tsx
<Typography h1>The quick brown fox</Typography>
```

## Variants

### Display

```tsx
<Typography display>The quick brown fox</Typography>
```

### H2

```tsx
<Typography h2>The quick brown fox</Typography>
```

### H3

```tsx
<Typography h3>The quick brown fox</Typography>
```

### H4

```tsx
<Typography h4>The quick brown fox</Typography>
```

### H5

```tsx
<Typography h5>The quick brown fox</Typography>
```

### Body

```tsx
<Typography body>The quick brown fox</Typography>
```

### Small

```tsx
<Typography small>The quick brown fox</Typography>
```

### Tiny

```tsx
<Typography tiny>The quick brown fox</Typography>
```

### Muted

```tsx
<Typography muted>The quick brown fox</Typography>
```

### Caption

```tsx
<Typography caption>The quick brown fox</Typography>
```

### Code

```tsx
<Typography code>The quick brown fox</Typography>
```

### Mono

```tsx
<Typography mono>The quick brown fox</Typography>
```

### Lead

```tsx
<Typography lead>The quick brown fox</Typography>
```

### Semibold

```tsx
<Typography lead semibold>Rachel Chen</Typography>
```

### Tight leading

```tsx
<Column flush>
  <Typography lead semibold tightLeading>Canvas</Typography>
  <Typography tiny tightLeading>design system</Typography>
</Column>
```

### Primary

```tsx
<Typography body primary>View invoices</Typography>
```

### Success

```tsx
<Typography small success>+12.4% this week</Typography>
```

### Destructive

```tsx
<Typography small destructive>Payment failed</Typography>
```

### Underline

```tsx
<Typography body primary underline>View invoices</Typography>
```

## Do & Don't

### display

**Do** — Use display once per hero, then drop to a muted line for the supporting copy.

```tsx
<Column snug>
  <Typography display>Welcome</Typography>
  <Typography muted>Sign in to pick up where you left off.</Typography>
</Column>
```

**Don't** — Two display-size lines in one view fight for attention and leave no clear focal point.

```tsx
<View style={{ gap: 8 }}>
  <Typography display>Welcome</Typography>
  <Typography display>Get started</Typography>
</View>
```

### h1

**Do** — Give each page a single h1, then step down to h2 for the sections beneath it.

```tsx
<Column relaxed>
  <Typography h1>Billing</Typography>
  <Typography h2>Invoices</Typography>
</Column>
```

**Don't** — Two h1 titles on a page break the document outline and confuse assistive tech.

```tsx
<View style={{ gap: 4 }}>
  <Typography h1>Billing</Typography>
  <Typography h1>Invoices</Typography>
</View>
```

### h2

**Do** — Follow an h1 with h2 for its top-level sections; don't skip the scale.

```tsx
<Column relaxed>
  <Typography h1>Settings</Typography>
  <Typography h2>Profile</Typography>
</Column>
```

**Don't** — Jumping from h1 straight to h4 skips a level and flattens the visible hierarchy.

```tsx
<View>
  <Typography h1>Settings</Typography>
  <Typography h4 style={{ marginTop: 16 }}>Profile</Typography>
</View>
```

### h3

**Do** — Reserve heading styles for titles; set running text in a small body utility.

```tsx
<Column tight>
  <Typography h3>About Canvas</Typography>
  <Typography body>Canvas is a universal React Native UI kit for building consistent product interfaces.</Typography>
</Column>
```

**Don't** — Body copy set in a heading style is hard to read in bulk and flattens the hierarchy.

```tsx
<Typography h3>Canvas is a universal React Native UI kit for building consistent product interfaces.</Typography>
```

### h4

**Do** — Keep h4 to a short label and carry the explanation in a small supporting line.

```tsx
<Column tight>
  <Typography h4>Notifications</Typography>
  <Typography small>Choose how and when we reach you.</Typography>
</Column>
```

**Don't** — h4 is a minor heading, not a place for full sentences; long text at this weight reads as a wall.

```tsx
<View style={{ gap: 4, flexShrink: 1 }}>
  <Typography h4>Notifications</Typography>
  <Typography h4>A long descriptive sentence that explains everything in detail.</Typography>
</View>
```

### h5

**Do** — Use h5 only for the label; render the value in body so the pair stays scannable.

```tsx
<Column tight>
  <Typography h5>Members</Typography>
  <Typography body>Aisha, Bao, Cleo, and 9 others have access.</Typography>
</Column>
```

**Don't** — Setting the value in h5 too makes the label and its data indistinguishable.

```tsx
<View style={{ gap: 4 }}>
  <Typography h5>Members</Typography>
  <Typography h5>Aisha, Bao, Cleo, and 9 others have access.</Typography>
</View>
```

### body

**Do** — Keep body copy in sentence case and let inline code carry the technical emphasis.

```tsx
<Typography body>
  Run 
  <Typography code>npm install</Typography>
  , then restart the dev server before you continue.
</Typography>
```

**Don't** — All-caps emphasis inside body copy shouts and undercuts the relaxed reading rhythm.

```tsx
<Typography body>
  <Typography code>npm install</Typography>
   THEN restart the dev server BEFORE you continue.
</Typography>
```

### small

**Do** — Use small for secondary captions on a plain surface, not for the primary label.

```tsx
<Column tight>
  <Typography body>Save changes</Typography>
  <Typography small>Last saved 2 minutes ago.</Typography>
</Column>
```

**Don't** — small is muted-foreground; on a colored button it loses contrast and looks disabled.

```tsx
<Button secondary>
  <Typography small>Save changes</Typography>
</Button>
```

### tiny

**Do** — Reserve tiny for short metadata like timestamps and counts beside the main text.

```tsx
<Row alignCenter snug>
  <Typography body>Deploy succeeded</Typography>
  <Typography tiny>3m ago</Typography>
</Row>
```

**Don't** — tiny is for metadata, not legal prose; long copy at 12px strains the eye.

```tsx
<Typography tiny>These terms govern your use of the service and your data; please read them carefully before you continue past this screen.</Typography>
```

### muted

**Do** — Keep muted for de-emphasized context; give the actual action full foreground or primary color.

```tsx
<Typography body>
  Payment due May 31. 
  <Typography body primary underline>View invoices</Typography>
</Typography>
```

**Don't** — A primary, clickable action in muted-foreground reads as disabled and is easy to miss.

```tsx
<Typography muted style={{ alignSelf: "flex-start", textDecorationLine: "underline" }}>View your invoices</Typography>
```

### caption

**Do** — Use caption as a short eyebrow label above a section, then explain in body.

```tsx
<Column tight>
  <Typography caption>Billing</Typography>
  <Typography body>Your subscription renews automatically each month.</Typography>
</Column>
```

**Don't** — Uppercase, letter-spaced caption text is illegible for anything longer than a label.

```tsx
<Typography caption>Your subscription renews automatically each month unless you cancel from the billing page.</Typography>
```

### code

**Do** — Use code for inline tokens inside a sentence; reach for the code block component for multi-line snippets.

```tsx
<Typography body>
  Create a branch with 
  <Typography code>git checkout -b feature</Typography>
   before committing.
</Typography>
```

**Don't** — The inline code utility has tight padding and no scroll; multi-line blocks overflow and clip.

```tsx
<Typography code>git checkout -b feature
git add .
git commit -m "wip"</Typography>
```

### mono

**Do** — Use mono for identifiers, hashes, and tabular values where character alignment matters.

```tsx
<Row alignCenter between relaxed>
  <Typography small>Request ID</Typography>
  <Typography mono>req_8f2c10ab</Typography>
</Row>
```

**Don't** — Mono spacing makes prose sentences sparse and slow to read; it is meant for fixed-width data.

```tsx
<Typography mono>We could not process your request because the upstream service returned an unexpected response.</Typography>
```

## Inline links (href)

Inline text that NAVIGATES should be a real link, not pressable text that sets `location`: pass `href` and the web render becomes a genuine browser link (middle-click, new tab, crawlers, and assistive tech all treat it as one). Native platforms ignore `href`, so pair it with an `onPress` that runs the same navigation through your router; `underline` supplies the conventional link look, and `hrefAttrs` forwards `target` / `rel` / `download` on the web.

```tsx
<Typography small>
  Read the <Typography small underline href="https://canvas.nannier.com">Canvas docs</Typography> for the full component list.
</Typography>
```
