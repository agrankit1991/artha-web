/** Tests for the drawing tools' names and the keys that take them up. */

import { describe, expect, it } from "vitest";

import { keysOf, toolForKeys } from "@/lib/drawingTools";

/** A key press: Alt held unless said, nothing else. */
function press(
  code: string,
  held: Partial<Record<"altKey" | "shiftKey" | "ctrlKey" | "metaKey", boolean>> = {},
) {
  return { code, altKey: true, shiftKey: false, ctrlKey: false, metaKey: false, ...held };
}

describe("toolForKeys", () => {
  it("takes up TradingView's tools by their keys, the rectangle with Shift", () => {
    expect(toolForKeys(press("KeyH"))).toBe("horizontal");
    expect(toolForKeys(press("KeyJ"))).toBe("horizontal-ray");
    expect(toolForKeys(press("KeyV"))).toBe("vertical");
    expect(toolForKeys(press("KeyT"))).toBe("trend");
    expect(toolForKeys(press("KeyR", { shiftKey: true }))).toBe("rectangle");
  });

  it("lets other presses by: no Alt, Ctrl or Meta too, Shift where none is wanted, other keys", () => {
    expect(toolForKeys(press("KeyH", { altKey: false }))).toBeNull();
    expect(toolForKeys(press("KeyH", { ctrlKey: true }))).toBeNull();
    expect(toolForKeys(press("KeyH", { metaKey: true }))).toBeNull();
    expect(toolForKeys(press("KeyH", { shiftKey: true }))).toBeNull();
    expect(toolForKeys(press("KeyR"))).toBeNull();
    expect(toolForKeys(press("KeyZ"))).toBeNull();
  });
});

describe("keysOf", () => {
  it("says a tool's keys as they are pressed, and none for a tool without", () => {
    expect(keysOf("horizontal")).toEqual(["Alt", "H"]);
    expect(keysOf("rectangle")).toEqual(["Alt", "Shift", "R"]);
    expect(keysOf("measure")).toBeNull();
  });
});
