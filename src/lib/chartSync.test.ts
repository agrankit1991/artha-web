import { type Mock, describe, expect, it, vi } from "vitest";

import { ChartSync, type SessionSpan, type SyncedChart } from "@/lib/chartSync";

function member(): {
  showCrosshair: Mock<(day: string | null) => void>;
  showSpan: Mock<(span: SessionSpan) => void>;
} {
  return {
    showCrosshair: vi.fn<(day: string | null) => void>(),
    showSpan: vi.fn<(span: SessionSpan) => void>(),
  };
}

describe("ChartSync", () => {
  it("tells every other chart where the crosshair is and what span is shown", () => {
    const sync = new ChartSync();
    const [one, two, three] = [member(), member(), member()];
    sync.join(one);
    sync.join(two);
    sync.join(three);

    sync.crosshairMoved(one, "2026-09-02");
    sync.spanChanged(two, { from: "2026-01-01", to: "2026-06-30" });

    expect(one.showCrosshair).not.toHaveBeenCalled();
    expect(two.showCrosshair).toHaveBeenCalledWith("2026-09-02");
    expect(three.showCrosshair).toHaveBeenCalledWith("2026-09-02");
    expect(two.showSpan).not.toHaveBeenCalled();
    expect(one.showSpan).toHaveBeenCalledWith({ from: "2026-01-01", to: "2026-06-30" });
  });

  it("forgets a chart that leaves", () => {
    const sync = new ChartSync();
    const [one, two] = [member(), member()];
    sync.join(one);
    const leave = sync.join(two);
    leave();

    sync.crosshairMoved(one, null);
    expect(two.showCrosshair).not.toHaveBeenCalled();
  });

  it("keeps in step only what it is set to", () => {
    const sync = new ChartSync({ crosshair: false, span: true });
    const [one, two] = [member(), member()];
    sync.join(one);
    sync.join(two);

    sync.crosshairMoved(one, "2026-09-02");
    expect(two.showCrosshair).not.toHaveBeenCalled();
    sync.configure({ crosshair: true, span: false });
    sync.spanChanged(one, { from: "a", to: "b" });
    expect(two.showSpan).not.toHaveBeenCalled();
    sync.crosshairMoved(one, "2026-09-02");
    expect(two.showCrosshair).toHaveBeenCalled();
  });

  it("does not echo: a chart moved by the group telling it again is ignored", () => {
    const sync = new ChartSync();
    const one = member();
    const two: SyncedChart = {
      showCrosshair: vi.fn(() => {
        // A chart that reports the move it was just given, as a library may.
        sync.crosshairMoved(two, "2026-09-03");
      }),
      showSpan: vi.fn(),
    };
    sync.join(one);
    sync.join(two);

    sync.crosshairMoved(one, "2026-09-02");

    expect(two.showCrosshair).toHaveBeenCalledTimes(1);
    expect(one.showCrosshair).not.toHaveBeenCalled();
  });
});
