import { createPagination } from "./pagination.shared.js";
import { androidSkin } from "./pagination.styles.js";

// Android Pagination. Material 3 has no pagination component, so this is the web skin (Dark
// Factory's pager). Metro resolves this file on Android; the docs import it for preview.
export const Pagination = createPagination(androidSkin);
export type { PaginationProps } from "./pagination.shared.js";
