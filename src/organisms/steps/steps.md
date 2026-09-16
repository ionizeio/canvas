# Steps

Multi-step progress indicators: horizontal, vertical, with progress.

## Usage

```tsx
<Steps
  steps={[
    { label: "Account", description: "Email verified and password set." },
    { label: "Profile", description: "Add your name and avatar." },
    { label: "Review", description: "Invite collaborators to your workspace." },
    { label: "Done", description: "You're all set." }
  ]}
  defaultCurrent={1}
  onStepPress={() => {}}
  value={68}
  label="Setup progress"
/>
```

## Variants

### Vertical

```tsx
<Steps
  steps={[
    { label: "Account", description: "Email verified and password set." },
    { label: "Profile", description: "Add your name and avatar." },
    { label: "Review", description: "Invite collaborators to your workspace." },
    { label: "Done", description: "You're all set." }
  ]}
  defaultCurrent={1}
  vertical
  onStepPress={() => {}}
  value={68}
  label="Setup progress"
/>
```

### Stacks at narrow widths

`stacks` renders the horizontal layout as the vertical one when the component's
own container is at or below `stackBreakpoint` (default `sm` = 640):
container-measured, like Row `stacks`, so a wizard header inside a narrow
column stacks too.

```tsx
<Steps
  stacks
  steps={[{ label: "Account" }, { label: "Profile" }, { label: "Review" }, { label: "Done" }]}
  defaultCurrent={1}
/>
```

### Progress bar

```tsx
<Steps
  steps={[
    { label: "Account", description: "Email verified and password set." },
    { label: "Profile", description: "Add your name and avatar." },
    { label: "Review", description: "Invite collaborators to your workspace." },
    { label: "Done", description: "You're all set." }
  ]}
  defaultCurrent={1}
  progress
  value={68}
  label="Setup progress"
/>
```

## Do & Don't

### Horizontal

**Do** — Mark exactly one step active; show completed steps filled and the rest pending.

```tsx
<Steps defaultCurrent={1} steps={[
    { label: "Account" },
    { label: "Profile" },
    { label: "Review" }
  ]} />
```

**Don't** — Styling several steps as active at once hides which step the user is actually on.

```tsx
<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
  <View style={{ flexDirection: "row", alignItems: "flex-start", flexGrow: 1, flexShrink: 1, flexBasis: "0%" }}>
    <View style={{ alignItems: "center", gap: 6 }}>
      <View style={{ height: 32, width: 32, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 9999, borderWidth: 2, borderColor: tokens.primary, backgroundColor: "transparent" }}>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.primary }}>1</Text>
      </View>
      <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: tokens.foreground }}>Account</Text>
    </View>
    <View style={{ marginHorizontal: 8, marginTop: 16, height: 1, flexGrow: 1, flexShrink: 1, flexBasis: "0%", backgroundColor: tokens.border }} />
  </View>
  <View style={{ flexDirection: "row", alignItems: "flex-start", flexGrow: 1, flexShrink: 1, flexBasis: "0%" }}>
    <View style={{ alignItems: "center", gap: 6 }}>
      <View style={{ height: 32, width: 32, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 9999, borderWidth: 2, borderColor: tokens.primary, backgroundColor: "transparent" }}>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.primary }}>2</Text>
      </View>
      <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: tokens.foreground }}>Profile</Text>
    </View>
    <View style={{ marginHorizontal: 8, marginTop: 16, height: 1, flexGrow: 1, flexShrink: 1, flexBasis: "0%", backgroundColor: tokens.border }} />
  </View>
  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
    <View style={{ alignItems: "center", gap: 6 }}>
      <View style={{ height: 32, width: 32, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 9999, borderWidth: 2, borderColor: tokens.primary, backgroundColor: "transparent" }}>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.primary }}>3</Text>
      </View>
      <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: tokens.foreground }}>Review</Text>
    </View>
  </View>
</View>
```

### Vertical

**Do** — Pair each vertical step with a one-line description so the extra width earns its place.

```tsx
<Container xs>
  <Steps vertical defaultCurrent={1} steps={[
    { label: "Account created", description: "Email verified and password set." },
    { label: "Profile setup", description: "Add your name and avatar." },
    { label: "Team invite", description: "Invite collaborators to your workspace." },
    { label: "Done", description: "You're all set." }
  ]} />
</Container>
```

**Don't** — A vertical step with only a title wastes the space the layout is built to use.

```tsx
<Container xs>
  <Steps vertical defaultCurrent={1} steps={[
    { label: "Account created" },
    { label: "Profile setup" },
    { label: "Team invite" },
    { label: "Done" }
  ]} />
</Container>
```

### Progress bar

**Do** — Label the bar and show the exact percentage so progress is legible at a glance.

```tsx
<Container xs>
  <Steps progress current={0} steps={[]} label="Setup progress" value={68} />
</Container>
```

**Don't** — A bare progress bar with no percentage leaves users guessing how far along they are.

```tsx
<Container xs>
  <View style={{ height: 6, overflow: "hidden", borderRadius: 9999, backgroundColor: tokens.muted }}>
    <View style={{ height: "100%", borderRadius: 9999, backgroundColor: tokens.primary, width: "68%" }} />
  </View>
</Container>
```
