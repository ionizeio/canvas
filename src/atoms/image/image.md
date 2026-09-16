# Image

Displays a local or remote image. Set the `source` (`{ uri }`) and a size, then choose how it fills its box with a fit prop: `cover` (the default) fills the box and crops the overflow, while `contain` fits the whole image inside and letterboxes the spare space. `stretch`, `center`, `repeat`, and `none` cover the rarer fits. Remote images load over the network; bundle local assets with `require`. For a circular identity photo with an initials fallback, reach for `<Avatar src="…" name="…" />` rather than rounding a bare Image.

## Usage

```tsx
<Image source={{ uri: "/kira-tanaka.jpg" }} width={120} height={120} />
```

## Variants

### Contain

```tsx
<Image source={{ uri: "/liang-bao.jpg" }} contain width={160} height={120} />
```

### Cover

```tsx
<Image source={{ uri: "/ada-lovelace.jpg" }} cover width={240} height={96} />
```
