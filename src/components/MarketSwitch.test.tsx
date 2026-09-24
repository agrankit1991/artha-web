/** Tests for where the strategies' market switch stands. */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ScreenField } from "@/api/client";
import { niftyFifty as nifty, strategyFields, stubPlatform } from "@/test/support";

import { MarketSwitch } from "./MarketSwitch";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The registry's entry for a close against the 150-day average. */
const FROM_SMA_150 = strategyFields().find(
  (field) => field.name === "from_sma_150_percent",
) as ScreenField;

/** Render the switch against a stubbed platform, and wait for its reading. */
async function reading(
  reply: Parameters<typeof stubPlatform>[0][string],
  fields: ScreenField[] = [FROM_SMA_150],
): Promise<HTMLElement> {
  const fetched = stubPlatform({ "/api/overviews": reply });
  render(<MarketSwitch fields={fields} />);
  const group = await screen.findByRole("group", { name: "Market switch" });
  expect(String(fetched.mock.calls[0]?.[0])).toContain("keys=NSE_INDEX%7CNifty+50");
  return group;
}

describe("MarketSwitch", () => {
  it("is on, and invested, clear above the average", async () => {
    const group = await reading({ body: [nifty("3.10")] });

    expect(group).toHaveTextContent("Nifty 50 +3.10% from its 150-day average");
    expect(group).toHaveTextContent(/23 Sept? 2026/);
    expect(group).toHaveTextContent("On: invested");
  });

  it("is off, and in gold, clear below it", async () => {
    const group = await reading({ body: [nifty("-2.50")] });

    expect(group).toHaveTextContent("-2.50%");
    expect(group).toHaveTextContent("Off: in gold");
    // Clear of the band, today's reading needs no word from the lab.
    expect(group).not.toHaveTextContent("lab's last reading");
  });

  it("stays as it was inside the band, which one reading cannot tell", async () => {
    const group = await reading({ body: [nifty("1.00")] });

    expect(group).toHaveTextContent("In the band: as it was");
    expect(group).toHaveTextContent(
      /At the lab's last reading, on 21 Sept? 2026, it was off, as it had been since 2 Mar 2026\./,
    );
    expect(screen.getByRole("button", { name: "What this means" })).toBeInTheDocument();
  });

  it("says the reading is not available rather than guessing one", async () => {
    // The registry has no such figure yet.
    expect(await reading({ body: [nifty("3.10")] }, [])).toHaveTextContent("not available");
  });

  it("says so too when the index has no figures, no value, or none could be fetched", async () => {
    for (const reply of [
      { body: [] },
      { body: [nifty(null)] },
      { status: 500, body: { detail: "overviews broke" } },
    ]) {
      const group = await reading(reply);
      expect(group).toHaveTextContent("not available");
      cleanup();
      vi.unstubAllGlobals();
    }
  });

  it("holds a place while the registry is still arriving, then reads the switch", async () => {
    stubPlatform({ "/api/overviews": { body: [nifty("3.10")] } });
    const { rerender } = render(<MarketSwitch fields={null} />);
    expect(screen.queryByRole("group", { name: "Market switch" })).not.toBeInTheDocument();

    rerender(<MarketSwitch fields={[FROM_SMA_150]} />);

    expect(await screen.findByRole("group", { name: "Market switch" })).toHaveTextContent(
      "On: invested",
    );
  });
});
