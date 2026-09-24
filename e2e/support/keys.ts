/**
 * The keys that move a text caret to the start or the end of its line, on the host
 * that runs the browser.
 *
 * Home and End are not those keys on macOS. Playwright sends each key with the Cocoa
 * editing commands a Mac text field binds to it, and a Mac binds Home and End to
 * `scrollToBeginningOfDocument:` and `scrollToEndOfDocument:`. Chromium runs them as a
 * scroll of the nearest scrollable ancestor, the docs page, and moves the caret only
 * when nothing is left to scroll. So a spec that presses Home in a field below the
 * fold scrolls the page and leaves the caret where it was, on the Mac alone: the Linux
 * runner sends no commands and gets the line boundary. Command+Arrow is the Mac's line
 * boundary (`moveToLeftEndOfLine:` and `moveToRightEndOfLine:`), whatever the scroll.
 *
 * A key the page handles itself (a tab list's Home, a listbox's End) needs none of
 * this: the component's keydown handler runs on every host.
 */
const mac = process.platform === "darwin";

/** Moves a text field's caret to the start of its line. */
export const LINE_START = mac ? "Meta+ArrowLeft" : "Home";

/** Moves a text field's caret to the end of its line. */
export const LINE_END = mac ? "Meta+ArrowRight" : "End";
