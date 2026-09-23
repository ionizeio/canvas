import { createCalendar } from "./calendar.shared.js";
import { iosSkin } from "./calendar.styles.js";
import { ButtonGroup } from "../../atoms/button-group/button-group.ios.js";

// iOS (HIG date picker) Calendar. Metro resolves this file on iOS; the docs import it for preview.
export const Calendar = createCalendar(iosSkin, { ButtonGroup });
export type { CalendarProps } from "./calendar.shared.js";
