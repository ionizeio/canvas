import { createMetricBreakdown } from "./metric-breakdown.shared.js";
import { androidSkin } from "../shared/charts.styles.js";
import { Chip } from "../../atoms/chip/chip.android.js";

// MetricBreakdown is a "Shared" platform treatment: the implementation is
// platform-neutral, so every platform entry builds from the same skin. The
// per-OS files exist only so the architecture is uniform across the kit.
export const MetricBreakdown = createMetricBreakdown(androidSkin, { Chip });
export type { MetricBreakdownProps, MetricBreakdownChip, BreakdownRow } from "./metric-breakdown.shared.js";
