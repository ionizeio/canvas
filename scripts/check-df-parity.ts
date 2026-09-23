/**
 * Dark Factory parity check: the kit's color tokens (styles/tokens/colors.css and
 * src/style/tokens.ts) equal the table derived from Dark Factory's palettes
 * (tools/darkfactory/tokens.json). See tools/darkfactory/parity.ts.
 *
 * Usage: bun run check-df
 */
import { checkParity, readTable } from "../tools/darkfactory/parity.ts";

const table = readTable();
const failures = checkParity(table);
if (failures.length) {
  console.log(`Dark Factory parity: ${failures.length} token(s) differ from tools/darkfactory/tokens.json`);
  for (const line of failures) console.log(`  ${line}`);
  console.log("  Derive with `bun run df:tokens`, then write the values into the hand-off and tokens.ts.");
  process.exit(1);
}
const roles = Object.keys(table.palettes.blush ?? {}).length;
console.log(`Dark Factory parity: ${roles} roles in each of the light and dark palettes and ${table.chart.length} chart series match the table derived from Dark Factory ${table.source.commit}.`);
