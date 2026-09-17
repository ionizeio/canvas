---
"@ionizeio/canvas": minor
---

`DataTable` takes `attached`: the header band squares its corners to a frame the parent draws.

Minor because it adds a public option. On the web skin the header is Riskora's soft
10px-cornered band, which is the look of a table standing on its own (the design floats
it inside a padded card). A table flush inside a frame, a `flush` Card or a bordered panel
that clips to its corners, now passes `attached`, and the band drops its own corners so
the frame's clipped corners are the only rounded ones; before, the frame's fill peeked
out under the band's bottom corners. `bordered` squares the band the same way for the
table's own outline. iOS and Android bands were square already, so nothing changes there.

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <DataTable attached columns={columns} rows={rows} />
</Card>
```

The docs use it on every prop table, and the docs playground is now a fully rounded
card sitting a gap above its source block in every example and at every simulated tier,
instead of squaring its bottom edge into the code block.
