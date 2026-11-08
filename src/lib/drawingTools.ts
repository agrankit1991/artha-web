/**
 * The drawing tools by name, and the keys that take one up.
 *
 * One place, so the toolbar's labels, its tooltips and the keyboard
 * shortcuts list say the same. The keys are TradingView's own (the owner,
 * 2026-11-08: "can I have shortcuts like alt + h for horizontal line, alt + v
 * for vertical?"), so a reader who knows them there knows them here; the
 * rectangle is Alt+Shift+R there too, plain Alt+R being its reset.
 */

import type { DrawingKind } from "@/api/client";

/** A tool: a kind of drawing to place, or a measure that is read and not kept. */
export type DrawingTool = DrawingKind | "measure";

/** What each tool is called. */
export const TOOL_NAMES: Record<DrawingTool, string> = {
  horizontal: "Horizontal line",
  "horizontal-ray": "Horizontal ray",
  trend: "Trend line",
  ray: "Ray",
  extended: "Extended line",
  vertical: "Vertical line",
  rectangle: "Rectangle",
  measure: "Measure",
};

/** A tool's shortcut: Alt held with a key, and Shift with it where said. */
interface ToolKeys {
  tool: DrawingTool;
  /**
   * The key's place on the keyboard, as `KeyboardEvent.code` names it, not
   * the letter it types: on a Mac, Option with a letter types a symbol.
   */
  code: string;
  shift: boolean;
}

export const TOOL_KEYS: readonly ToolKeys[] = [
  { tool: "horizontal", code: "KeyH", shift: false },
  { tool: "horizontal-ray", code: "KeyJ", shift: false },
  { tool: "vertical", code: "KeyV", shift: false },
  { tool: "trend", code: "KeyT", shift: false },
  { tool: "rectangle", code: "KeyR", shift: true },
];

/**
 * A tool's shortcut as it is pressed, keys held together.
 *
 * @param tool - The tool.
 * @returns Its keys in order (`["Alt", "H"]`), or null for one with none.
 */
export function keysOf(tool: DrawingTool): string[] | null {
  const found = TOOL_KEYS.find((one) => one.tool === tool);
  return found === undefined
    ? null
    : ["Alt", ...(found.shift ? ["Shift"] : []), found.code.slice("Key".length)];
}

/**
 * The tool a key press takes up.
 *
 * @param event - The press: which key, and what was held with it.
 * @returns The tool, or null when the press is no tool's shortcut (Ctrl or
 *   the Meta key held too, so a browser's own shortcuts pass by).
 */
export function toolForKeys(
  event: Pick<KeyboardEvent, "altKey" | "shiftKey" | "ctrlKey" | "metaKey" | "code">,
): DrawingTool | null {
  if (!event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }
  return (
    TOOL_KEYS.find((one) => one.code === event.code && one.shift === event.shiftKey)?.tool ?? null
  );
}
