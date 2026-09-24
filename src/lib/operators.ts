/**
 * The comparisons a screen condition can make, and how each is written.
 *
 * One list, read by the screener's condition builder and by anything that
 * writes a condition back to a reader (a scan's badges), so the two cannot
 * spell a comparison differently.
 */

import type { ScreenOperator } from "@/api/client";

/** How each comparison is written on the page, in the order a menu offers them. */
export const OPERATORS: readonly { key: ScreenOperator; label: string }[] = [
  { key: "gt", label: ">" },
  { key: "gte", label: "≥" },
  { key: "lt", label: "<" },
  { key: "lte", label: "≤" },
  { key: "eq", label: "=" },
];
