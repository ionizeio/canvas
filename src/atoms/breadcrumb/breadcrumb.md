# Breadcrumb

Hierarchical navigation showing where you are.

## Usage

```tsx
<Breadcrumb items={["Projects", "Identity Platform", "Settings"]} />
```

## Variants

### Slash

```tsx
<Breadcrumb items={["Projects", "Identity Platform", "Settings"]} slash />
```

### Dot

```tsx
<Breadcrumb items={["Projects", "Identity Platform", "Settings"]} dot />
```

### Home icon

```tsx
<Breadcrumb items={["Projects", "Identity Platform", "Settings"]} homeIcon />
```

## Do & Don't

### Current page

**Do** — Ancestors are links; the page you're on is plain text at the end of the trail.

```tsx
<Breadcrumb items={["Projects", "Identity Platform", "Settings"]} />
```

**Don't** — Linking the current page implies there's somewhere to go; it's a dead link to itself.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Projects</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>/</Text>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Identity Platform</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>/</Text>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Settings</Text>
  </Pressable>
</View>
```

### Deep paths

**Do** — Collapse the middle to an ellipsis; keep the root and the last couple of levels.

```tsx
<Breadcrumb maxItems={3} items={["Projects", "Identity Platform", "Settings", "Avatar", "Edit"]} />
```

**Don't** — A fully expanded deep path wraps and competes with the page.

```tsx
<Breadcrumb items={[
    "Projects",
    "Identity Platform",
    "Settings",
    "Profile",
    "Avatar",
    "Edit"
  ]} />
```

### Separator

**Do** — Pick one separator and use it the whole way.

```tsx
<Breadcrumb items={["Projects", "Identity Platform", "Settings"]} />
```

**Don't** — Mixing separators in one trail looks broken.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Projects</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>/</Text>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Identity Platform</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>›</Text>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Settings</Text>
</View>
```

### Home root

**Do** — Give the home icon an aria-label so the root is announced.

```tsx
<Breadcrumb homeIcon items={["Settings"]} />
```

**Don't** — An icon-only root with no label is unclear to screen readers.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Icon home muted size={14} />
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>/</Text>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Settings</Text>
</View>
```

### Chevron

**Do** — Point the chevron in the reading direction (right in LTR) so each one means 'drill into the next level'.

```tsx
<Breadcrumb chevron items={["Projects", "Identity Platform", "Settings"]} />
```

**Don't** — A down (or back) chevron reads as a dropdown or a back affordance, not progression down the hierarchy.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Projects</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>⌄</Text>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Identity Platform</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>⌄</Text>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Settings</Text>
</View>
```

### Slash

**Do** — Keep the slash muted and lighter than the text so it reads as a quiet path divider.

```tsx
<Breadcrumb slash items={["Projects", "Identity Platform", "Settings"]} />
```

**Don't** — A full-weight, foreground slash competes with the labels and can read as part of a link.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Projects</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, paddingHorizontal: 4 }}>/</Text>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Identity Platform</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, paddingHorizontal: 4 }}>/</Text>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Settings</Text>
</View>
```

### Dot

**Do** — Use a centered middot (·) so the dot sits between the crumbs and clearly divides them.

```tsx
<Breadcrumb dot items={["Projects", "Identity Platform", "Settings"]} />
```

**Don't** — A baseline period looks like a typo or end-of-sentence, not a separator between crumbs.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Projects</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>.</Text>
  <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Identity Platform</Text>
  </Pressable>
  <Text style={{ fontSize: 14, lineHeight: 20, color: alpha(tokens["muted-foreground"], 0.6) }}>.</Text>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Settings</Text>
</View>
```
