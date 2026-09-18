# Avatar

A photo when the account has one, falling back to one or two initials in white on a colour picked deterministically from the name, so each person stays visually distinct in a stack or list. A pressable avatar (`onPress`) keeps interactive Liquid Glass on iOS 26+ under glass surface mode. Sizes scale font proportionally (40% of diameter), down to `tiny`, the 24px disc a capsule is built around, which holds the 12px glyph rather than shrinking past legibility. `AvatarMenu` builds the signed-in account control on the same circle: one capsule trigger carrying the avatar, the name, and the email, opening the account menu under that same identity.

## Usage

```tsx
<Avatar name="AO" />
```

## Variants

### Photo

```tsx
<Avatar src="/rachel-chen.jpg" name="RC" />
```

### Sizes

Four steps: `tiny` (24px), `small` (28px), the default 40px row avatar, and `large` (48px). Initials scale with the circle at about 40% of the diameter, except at `tiny`, which keeps `small`'s 12px glyph rather than shrinking to a 10px pair that stops reading. `tiny` is the disc `AvatarMenu` builds its capsule around, so a standalone tiny avatar and the one inside a pill are the same circle. Precedence when several are passed: `tiny` beats `small` beats `large`.

```tsx
<Row relaxed alignCenter>
  <Avatar tiny name="NP" />
  <Avatar small name="AL" />
  <Avatar name="MA" />
  <Avatar large name="RC" />
</Row>
```

### Rounded

```tsx
<Avatar rounded name="LB" />
```

### Ring outline

```tsx
<Avatar ring name="AO" />
```

### Stacked

```tsx
<AvatarGroup max={3}>
  <Avatar name="RC" />
  <Avatar name="LB" />
  <Avatar name="MA" />
  <Avatar name="KT" />
</AvatarGroup>
```

### Topbar

A lone avatar as the account trigger: on iOS the circle is interactive Liquid Glass, so it reads as a control and tapping it opens the account menu, no email or chevron needed.

```tsx
<Dropdown items={[{ label: "Your profile" }, { label: "Sign out" }]}>
  <Avatar small name="MA" />
</Dropdown>
```

### Account menu

Built on Dropdown, so in glass mode the menu takes Dropdown's liquid opening and
closing while the identity capsule, photo and name stay fixed.

The whole account control in one component. `AvatarMenu` renders a single capsule trigger (the avatar, the name over the muted email, a chevron that turns as the menu opens) and the account menu itself, with `name` and `email` repeated as the menu's own identity header. One press target covers the capsule, so nothing beside it has to be wired up.

```tsx
<AvatarMenu
  name="Rachel Chen"
  email="rachel.chen@example.com"
  src="/rachel-chen.jpg"
  items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings" },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]}
/>
```

### Compact menu

`compact` drops the name block for a bar with no room for it, leaving the avatar and the chevron. The identity still travels with the menu, so the name and email head the rows the moment it opens. A topbar parks the pill at the trailing edge, so the menu hangs from that edge by default; `alignStart` moves it to the leading edge for a pill that sits at the start of a bar.

```tsx
<AvatarMenu
  compact
  name="Marcus Allen"
  email="admin@example.com"
  src="/marcus-allen.jpg"
  items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings" },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]}
/>
```

### Menu alignment

The menu hangs from the pill's trailing edge by default, the edge a topbar parks the account control against and the only one a right-parked trigger can open from without running off the surface. `alignStart` swings it to the leading edge for a pill that sits at the start of a bar, and `alignEnd` spells the default out. Both are logical, so a right-to-left locale mirrors them. Press each pill to see which edge its menu meets.

```tsx
<Row between>
  <AvatarMenu
    compact
    alignStart
    name="Liang Bao"
    email="liang.bao@example.com"
    src="/liang-bao.jpg"
    items={[
      { label: "Profile", icon: "user" },
      { label: "Settings", icon: "settings" },
      { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
    ]}
  />
  <AvatarMenu
    compact
    alignEnd
    name="Kira Tanaka"
    email="kira.tanaka@example.com"
    src="/kira-tanaka.jpg"
    items={[
      { label: "Profile", icon: "user" },
      { label: "Settings", icon: "settings" },
      { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
    ]}
  />
</Row>
```

### Disabled menu

`disabled` takes the whole pill out of service: it dims to the platform's disabled treatment, the press is a no-op, the menu never opens, and the button announces itself disabled before anyone reaches for it. Reach for it while the session is still resolving, not to park a menu whose rows simply have nothing to offer.

```tsx
<AvatarMenu
  disabled
  name="Ada Lovelace"
  email="ada.lovelace@example.com"
  src="/ada-lovelace.jpg"
  items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings" },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]}
/>
```

## Do & Don't

### Single

**Do** — One or two initials, sized about 40% of the diameter.

```tsx
<Avatar name="AO" />
```

**Don't** — Cramming in a full set of initials shrinks the type and crowds the circle.

```tsx
<View style={{ flexShrink: 0, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: tokens.muted, width: 40, height: 40, borderRadius: 9999 }}>
  <Text style={{ fontWeight: "500", color: tokens["muted-foreground"], fontSize: 12 }}>ABCD</Text>
</View>
```

### Stacked

**Do** — Cap the stack with `max` and let AvatarGroup summarize the rest as a +N count.

```tsx
<AvatarGroup small max={4} total={16}>
  <Avatar name="AO" />
  <Avatar name="RC" />
  <Avatar name="LB" />
  <Avatar name="KT" />
</AvatarGroup>
```

**Don't** — An unbounded stack (no `max`) runs off the row and stops being scannable.

```tsx
<AvatarGroup small>
  <Avatar name="AO" />
  <Avatar name="RC" />
  <Avatar name="LB" />
  <Avatar name="KT" />
  <Avatar name="JD" />
  <Avatar name="MA" />
  <Avatar name="AL" />
  <Avatar name="SK" />
</AvatarGroup>
```

### Topbar account menu

**Do**: Press the avatar: `AvatarMenu compact` makes it a real trigger in a bar with no room for a name, and the account is named in the menu header the moment the menu opens.

```tsx
<AvatarMenu compact name="Marcus Allen" email="admin@example.com" src="/marcus-allen.jpg" items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings", shortcut: "⌘," },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]} />
```

**Don't** — A bare avatar with no Dropdown around it is decorative, not a trigger, and opens nothing.

```tsx
<Avatar small src="/marcus-allen.jpg" name="MA" />
```

### Identity

**Do** — Name primary; email muted and secondary.

```tsx
<MediaObject center src="/rachel-chen.jpg" title="Rachel Chen" description="rachel.chen@example.com" />
```

**Don't** — Equal weight on the name and email flattens the hierarchy.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
  <Avatar src="/rachel-chen.jpg" name="RC" />
  <View>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>Rachel Chen</Text>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>rachel.chen@example.com</Text>
  </View>
</View>
```

### Menu header

**Do** — Keep one consistent circular avatar shape across contexts.

```tsx
<MediaObject compact center src="/ada-lovelace.jpg" title="Ada Lovelace" description="admin@example.com" />
```

**Don't** — Squaring the avatar here clashes with the circular avatars everywhere else.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
  <Avatar rounded src="/ada-lovelace.jpg" name="AL" />
  <View>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground }}>Ada Lovelace</Text>
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>admin@example.com</Text>
  </View>
</View>
```

### Account identity

**Do**: Press the pill: `name` and `email` go through AvatarMenu, which owns both lines, the shared press target, and the identity header on the menu it opens.

```tsx
<AvatarMenu name="Rachel Chen" email="rachel.chen@example.com" src="/rachel-chen.jpg" items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings", shortcut: "⌘," },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]} />
```

**Don't**: Hand-composing the identity beside the trigger drifts from the pill's type and spacing, and the menu that opens names no account at all.

```tsx
<Dropdown items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings" },
    { label: "Sign out", icon: "logOut", separatorBefore: true }
  ]}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Avatar small src="/rachel-chen.jpg" name="RC" />
    <View>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>Rachel Chen</Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>rachel.chen@example.com</Text>
    </View>
    <Icon chevronDown muted size={12} />
  </View>
</Dropdown>
```

### Sign out

**Do**: Open the menu: keep the destructive sign out last and behind a separator, a reach away from the rows people press every day.

```tsx
<AvatarMenu name="Kira Tanaka" email="kira.tanaka@example.com" src="/kira-tanaka.jpg" items={[
    { label: "Profile", icon: "user" },
    { label: "Billing", icon: "creditCard" },
    { label: "Settings", icon: "settings", shortcut: "⌘," },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]} />
```

**Don't**: Sign out buried mid-list, in the same tone as its neighbours, is one slip away on the path to Settings.

```tsx
<AvatarMenu name="Kira Tanaka" email="kira.tanaka@example.com" src="/kira-tanaka.jpg" items={[
    { label: "Profile", icon: "user" },
    { label: "Sign out", icon: "logOut" },
    { label: "Billing", icon: "creditCard" },
    { label: "Settings", icon: "settings", shortcut: "⌘," }
  ]} />
```

### Compact trigger

**Do**: Press the pill: where the row has space, the full form says who is signed in before anything is opened.

```tsx
<AvatarMenu name="Noor Park" email="noor.park@example.com" src="/noor-park.jpg" items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings", shortcut: "⌘," },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]} />
```

**Don't**: `compact` on a roomy page that names the account nowhere else hides who is signed in behind a press, to save room the row never needed.

```tsx
<AvatarMenu compact name="Noor Park" email="noor.park@example.com" src="/noor-park.jpg" items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings", shortcut: "⌘," },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]} />
```

### Unavailable account

**Do**: `disabled` on the pill itself: the whole trigger dims, the press is inert, and the button announces itself disabled instead of inviting a press that goes nowhere.

```tsx
<AvatarMenu disabled name="Ada Lovelace" email="ada.lovelace@example.com" src="/ada-lovelace.jpg" items={[
    { label: "Profile", icon: "user" },
    { label: "Settings", icon: "settings", shortcut: "⌘," },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true }
  ]} />
```

**Don't**: Disabling every row instead leaves the pill live: it still opens, onto a menu where nothing can be pressed.

```tsx
<AvatarMenu name="Ada Lovelace" email="ada.lovelace@example.com" src="/ada-lovelace.jpg" items={[
    { label: "Profile", icon: "user", disabled: true },
    { label: "Settings", icon: "settings", shortcut: "⌘,", disabled: true },
    { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true, disabled: true }
  ]} />
```
