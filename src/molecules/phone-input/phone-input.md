# PhoneInput

A phone number field: the Input's box with a country segment at its start (the chosen country's flag and a caret, which open a list of countries with their names and dial codes) and that country's dial code inline before the number. The number and the country are each controlled (`value` / `country`) or self-managed (`defaultValue` / `defaultCountry`), the segment defaults to the kit's curated `PHONE_COUNTRIES` list (pass `countries` for a full or localized one), and the number field asks for the phone keypad. Pass `label` (and `required`) to name it; `error` paints the whole box, segment included, and Field delegates its label, required mark and error into it. On iOS the field is drawn to the iOS input-field reference: the white box, the flag and gray caret segment with its state-coloured divider, the dial code in the placeholder gray.

In glass mode the country list hands off with the field, the way the iOS 26 menu
takes its button: on open the box's glass, segment, dial code and number vanish
whole and a compact droplet forms hanging under the box, in its corner and tone,
with the countries inside it; the list blooms up out of it over the spot the box
held, recoils and settles resting over the box, and stays there while it is open.
On close the rows go inert at once and the pane deflates onto the box, pinching to
the droplet's width and re-widening into it, and the box is back the moment the
pane has settled on it. A pick commits the country and returns focus to the
number at once. A field that becomes disabled or read-only while the list is open
closes it. Reduce Motion settles at once with the box untouched and the list
beside it; solid mode keeps the ordinary entrance.

## Usage

```tsx
<PhoneInput label="Phone number" placeholder="Add your phone number" />
```

## Variants

### Pre-filled

```tsx
<PhoneInput label="Phone number" defaultCountry="US" defaultValue="(415) 728-3046" />
```

### Another country

```tsx
<PhoneInput label="Phone number" defaultCountry="GB" placeholder="Add your phone number" />
```

### Error

```tsx
<Field label="Phone number" error="Invalid phone number.">
  <PhoneInput defaultCountry="US" defaultValue="(415) 72" />
</Field>
```

### Required

```tsx
<PhoneInput label="Phone number" required placeholder="Add your phone number" />
```

### Controlled country

```tsx
<Stateful initial="CA">
  {(country, setCountry) => (
    <Column snug>
      <PhoneInput label="Phone number" country={country} onCountryChange={setCountry} placeholder="Add your phone number" />
      <Typography small muted>Selected: {country}</Typography>
    </Column>
  )}
</Stateful>
```

### Custom country list

```tsx
<PhoneInput
  label="Phone number"
  countries={[
    { code: "FR", name: "France", dialCode: "+33" },
    { code: "DE", name: "Germany", dialCode: "+49" },
    { code: "ES", name: "Spain", dialCode: "+34" },
  ]}
  defaultCountry="DE"
  placeholder="Add your phone number"
/>
```

### Disabled

```tsx
<PhoneInput label="Phone number" disabled defaultValue="(415) 728-3046" />
```

### Sizes

```tsx
<Column relaxed>
  <PhoneInput small label="Small" placeholder="Add your phone number" />
  <PhoneInput label="Default" placeholder="Add your phone number" />
  <PhoneInput large label="Large" placeholder="Add your phone number" />
</Column>
```

## Do & Don't

### The country segment

**Do** — Let the segment carry the country so the number stays national and the dial code is never typed twice.

```tsx
<PhoneInput label="Phone number" defaultCountry="US" defaultValue="(415) 728-3046" />
```

**Don't** — A plain Input makes the user type the prefix, and nothing tells the app which country the digits belong to.

```tsx
<Input label="Phone number" defaultValue="+1 (415) 728-3046" />
```

### Errors

**Do** — Wrap the field in a Field so the message sits under the box and the box, segment included, paints the error border.

```tsx
<Field label="Phone number" error="Invalid phone number.">
  <PhoneInput defaultCountry="US" defaultValue="(415) 72" />
</Field>
```

**Don't** — A loose red caption beside a neutral box reads as unfinished, and a screen reader never hears it with the field.

```tsx
<Column tight>
  <PhoneInput label="Phone number" defaultCountry="US" defaultValue="(415) 72" />
  <Typography tiny destructive>Invalid phone number.</Typography>
</Column>
```
