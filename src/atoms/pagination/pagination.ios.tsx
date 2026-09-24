import { createPagination } from "./pagination.shared.js";
import { iosSkin } from "./pagination.styles.js";

// iOS Pagination. iOS ships no pagination control, so this is the web skin (Dark Factory's pager).
// Metro resolves this file on iOS; the docs import it for preview.
export const Pagination = createPagination(iosSkin);
export type { PaginationProps } from "./pagination.shared.js";
