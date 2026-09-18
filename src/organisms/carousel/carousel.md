# Carousel

A horizontally paged slide viewer: swipe (or use the prev/next arrows and the
dot indicators) to move one slide at a time. Paging snaps to the viewport width,
the current slide drives the dots, and the arrows step the index (clamped, or
wrapped when `loop`). Slides hold any content; pass an `items` array of
`{ key, content }`.

On web, Tab reaches an overflowing slide viewport. Left and Right move between
slides, while Home and End reach the first and last. Controls inside a slide
keep their own keyboard behavior. The named slide-picker buttons report the
current slide and its position in the set; activating the current slide does
nothing. Picker targets measure at least 24px on web, 44pt on iOS, and 48dp on
Android, independently of the small painted dots.

In glass mode the active dot's brand mark travels between the dots as one
measured marker with stretch, recoil and settle, following the committed slide
(a dot press, the arrows, the keyboard, a controlled `index`, a finished swipe)
while the dots, their press targets and the slides stay still; the marker is
ink like the dots and keeps the skin's own active dot size, so the resting strip
is unchanged and never shows two marks. A loop from the last slide to the first
travels back along the strip. Dragging is not tracked: the marker moves once a
slide is committed. A change of the slide set resets the marker in place, and
the strip's absence (one slide, `showDots={false}`, Android's default) means
no marker. Reduce Motion selects the final bounds at once; solid mode keeps
the static dots.

## Usage

```tsx
<Carousel
  items={[
    { key: "one", content: <Card title="Slide 1" /> },
    { key: "two", content: <Card title="Slide 2" /> },
    { key: "three", content: <Card title="Slide 3" /> }
  ]}
/>
```

## Variants

### Arrows hidden (dots only)

Hide the prev/next chevrons with `showArrows={false}`; swipe and the dots still
page the carousel, the iOS page-control idiom.

```tsx
<Carousel
  showArrows={false}
  items={[
    { key: "a", content: <Card title="Featured" /> },
    { key: "b", content: <Card title="Popular" /> }
  ]}
/>
```

### Default index

Start on a later slide with `defaultIndex`; the matching dot reads selected.

```tsx
<Carousel
  defaultIndex={1}
  items={[
    { key: "x", content: <Card title="First" /> },
    { key: "y", content: <Card title="Second" /> },
    { key: "z", content: <Card title="Third" /> }
  ]}
/>
```

### Arrows and dots everywhere

The chrome defaults are platform-adaptive (web shows both, iOS dots only,
Android neither); pass `showArrows` and `showDots` to force the full
arrows-plus-dots anatomy on every platform.

```tsx
<Carousel
  showArrows
  showDots
  items={[
    { key: "p", content: <Card title="Photos" /> },
    { key: "q", content: <Card title="Albums" /> },
    { key: "r", content: <Card title="Shared" /> }
  ]}
/>
```

### Loop

With `loop` the index wraps: both arrows stay enabled at the ends, and next on the
last slide returns to the first.

```tsx
<Carousel
  loop
  showArrows
  items={[
    { key: "first", content: <Card title="Start" /> },
    { key: "mid", content: <Card title="Middle" /> },
    { key: "last", content: <Card title="End" /> }
  ]}
/>
```

## Do & Don't

**Do** — Keep one current slide and let the dots mirror it, so the position in
the set is always clear.

```tsx
<Carousel
  items={[
    { key: "do1", content: (
      <Column alignCenter center style={{ height: 140, backgroundColor: tokens.muted }}>{/* docgen-allow-style: demo placeholder slide surface */}
        <Typography lead medium>Step 1</Typography>
      </Column>
    ) },
    { key: "do2", content: (
      <Column alignCenter center style={{ height: 140, backgroundColor: tokens.muted }}>{/* docgen-allow-style: demo placeholder slide surface */}
        <Typography lead medium>Step 2</Typography>
      </Column>
    ) }
  ]}
  defaultIndex={0}
  onIndexChange={() => {}}
/>
```

**Don't** — Stack the slides yourself with a manual row of pressables; it loses
the snap paging, the synced dots, and the per-slide accessibility.

```tsx
<View style={{ flexDirection: "row", gap: 8 }}>
  <View style={{ width: 200, height: 140, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.muted }}>
    <Text style={{ fontSize: 16, color: tokens.foreground }}>Slide 1</Text>
  </View>
  <View style={{ width: 200, height: 140, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.muted }}>
    <Text style={{ fontSize: 16, color: tokens.foreground }}>Slide 2</Text>
  </View>
</View>
```
