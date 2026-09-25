# Carousel

A horizontally paged slide viewer: swipe (or use the prev/next arrows and the
dot indicators) to move one slide at a time. Paging snaps to the viewport width,
the current slide drives the dots, and the arrows step the index (clamped, or
wrapped when `loop`). Slides hold any content; pass an `items` array of
`{ key, content }`.

Each slide is itself the card: it paints the surface, rounds the corners and
clips its content to them. So pass the slide's content, not a Card. A plain
string renders in the slide's own type, inset from its edge; any other node
fills the slide inside its 1px edge, so a picture is masked to the slide's
shape. A
Card nested inside frames the slide twice, and on Android the Material 3
item's 28dp corners cut the Card's own 12dp edge.

The prev and next arrows sit beside the slides, never over them, so nothing
near a slide's edge is hidden behind an arrow; the slides narrow by the two
arrow gutters instead.

Every slide is mounted from the first frame and stays mounted, so a slide's own
state (a field's text, a playing video) survives the carousel measuring its
viewport, on the first layout and whenever a hidden carousel is shown again.
Until it has measured, the current slide fills the viewport on its own. A
carousel does not window its slides, so a long gallery loads every slide's
content up front.

On web, Tab visits the carousel in the order it reads: the previous arrow, the
slide viewport, the next arrow, then the slide picker (an arrow disabled at the
end of a non-looping carousel is skipped). Tab reaches the viewport while its
slides overflow it, and the focused viewport draws the theme's focus ring around
the slide. Left and Right move between
slides, while Home and End reach the first and last. Controls inside a slide
keep their own keyboard behavior. The named slide-picker buttons report the
current slide and its position in the set; activating the current slide does
nothing. Picker targets measure at least 24px on web, 44pt on iOS, and 48dp on
Android, independently of the small painted dots.

The active dot follows the committed slide (a dot press, the arrows, the
keyboard, a controlled `index`, a finished swipe) in both surface modes; the
strip is absent with one slide, with `showDots={false}`, and by default on
Android.

## Usage

```tsx
<Carousel
  items={[
    { key: "one", content: "Slide 1" },
    { key: "two", content: "Slide 2" },
    { key: "three", content: "Slide 3" }
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
    { key: "a", content: "Featured" },
    { key: "b", content: "Popular" }
  ]}
/>
```

### Default index

Start on a later slide with `defaultIndex`; the matching dot reads selected.

```tsx
<Carousel
  defaultIndex={1}
  items={[
    { key: "x", content: "First" },
    { key: "y", content: "Second" },
    { key: "z", content: "Third" }
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
    { key: "p", content: "Photos" },
    { key: "q", content: "Albums" },
    { key: "r", content: "Shared" }
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
    { key: "first", content: "Start" },
    { key: "mid", content: "Middle" },
    { key: "last", content: "End" }
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
