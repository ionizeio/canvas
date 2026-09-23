import { createCalendar } from "./calendar.shared.js";
import { androidSkin } from "./calendar.styles.js";
import { ButtonGroup } from "../../atoms/button-group/button-group.android.js";

// Material 3 date picker Calendar. Metro resolves this file on Android; the docs import it for preview.
export const Calendar = createCalendar(androidSkin, { ButtonGroup });
export type { CalendarProps } from "./calendar.shared.js";
