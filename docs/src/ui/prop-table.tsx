import { View, Text, Column, Row, Typography, Badge, DataTable, useTheme } from "@ionizeio/canvas";
import type { PropGroup } from "../core/scope";
import { DocsSurface } from "./surface";
import { sans } from "./fonts";

// The generated prop tables for a component page. Data comes from
// each component's generated docs module (extracted from its `*Props` interface by
// tools/docgen/extract-props.ts). Rendered with the kit's own DataTable, so the
// docs dogfood the component they document.
//
// Layout: two columns rather than four. The prop name and its type stack in the
// first cell (name in monospace, the required ones flagged; type on the line
// below), and the description fills the second. That reads far better on a phone
// than four thin columns of wrapped text, and keeps long union types from
// squeezing the description to nothing. On a phone-width page the table
// `stacks`: each prop's name and type lead its row and the description runs
// under them at the table's full width, instead of beside them in half of it
// (and instead of iOS's first-column-only table, which would drop it).

function PropRowName({ name, type, required }: { name: string; type: string; required: boolean }) {
  return (
    <Column tight>
      <Row snug alignCenter wrap>
        <Typography mono semibold>{name}</Typography>
        {required ? <Badge outline mono>required</Badge> : null}
      </Row>
      <Typography mono subtle>{type}</Typography>
    </Column>
  );
}

function GroupTable({ group }: { group: PropGroup }) {
  // Wrap the table in a DocsSurface so it reads as a solid card in solid mode and a
  // real frost in glass/frost mode (DocsSurface routes through the kit GlassSurface),
  // exactly like the live-example stage and the do/don't cards. Without it the table
  // is a clear hole: its rows are transparent between the muted stripes, so in frost
  // mode the page behind bleeds straight through and washes the rows out.
  // The surface owns the rounded bordered frame now, so the table drops its own
  // `bordered` outline to avoid doubling it and passes `attached` instead: the
  // header band squares up to the surface's frame rather than floating as a
  // rounded band with the card fill peeking out under its bottom corners.
  return (
    <DocsSurface bordered>
      <DataTable
        attached
        striped
        compact
        stacks
        columns={["Prop", "Description"]}
        rows={group.props.map((p) => [
          <PropRowName name={p.name} type={p.type} required={p.required} />,
          p.description ? (
            <Typography small>{p.description}</Typography>
          ) : (
            <Typography small muted>—</Typography>
          ),
        ])}
      />
    </DocsSurface>
  );
}

export function PropTables({ groups }: { groups: PropGroup[] }) {
  const { tokens } = useTheme();
  const multi = groups.length > 1;
  return (
    <View style={{ gap: 16 }}>
      <Text accessibilityRole="header" aria-level={2} style={{ fontFamily: sans("600"), fontSize: 20, letterSpacing: -0.3, color: tokens.foreground }}>Props</Text>
      {groups.map((g) => (
        <View key={g.name} style={{ gap: 8 }}>
          {/* Only label each table when a component has more than one prop group
              (e.g. Avatar + AvatarGroup); a single group needs no sub-heading. */}
          {multi ? (
            <View accessible accessibilityRole="header" aria-level={3}>
              <Typography mono semibold>{g.name.replace(/Props$/, "")}</Typography>
            </View>
          ) : null}
          <GroupTable group={g} />
        </View>
      ))}
    </View>
  );
}
