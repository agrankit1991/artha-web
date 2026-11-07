/** Tests for the shared count of watchlists holding each instrument, and its badge. */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WatchCount } from "@/components/WatchCount";
import { WatchlistMembershipProvider, useWatchlistMembership } from "@/lib/watchlistMembership";
import { renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A button that refreshes the membership, as anything changing a list does. */
function Refresh(): React.JSX.Element {
  const { refresh } = useWatchlistMembership();
  return (
    <button type="button" onClick={refresh}>
      Refresh
    </button>
  );
}

describe("watchlist membership", () => {
  it("counts each instrument's lists, once for the whole page, and says it in words", async () => {
    const platform = stubPlatform({
      "/api/watchlists/membership": { body: { "NSE_EQ|A": [1, 2], "NSE_EQ|B": [1] } },
    });
    renderPage(
      <WatchlistMembershipProvider>
        <WatchCount instrumentKey="NSE_EQ|A" symbol="AAA" />
        <WatchCount instrumentKey="NSE_EQ|B" symbol="BBB" />
        <WatchCount instrumentKey="NSE_EQ|C" symbol="CCC" />
        <Refresh />
      </WatchlistMembershipProvider>,
    );

    expect(
      await screen.findByRole("img", { name: "AAA is on 2 of your watchlists" }),
    ).toHaveTextContent("2");
    expect(screen.getByRole("img", { name: "BBB is on one of your watchlists" })).toHaveAttribute(
      "title",
      "On one of your watchlists",
    );
    expect(screen.queryByRole("img", { name: /CCC/ })).toBeNull();
    expect(platform).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(platform).toHaveBeenCalledTimes(2);
  });

  it("counts nothing outside the provider, or when the membership cannot be read", async () => {
    stubPlatform({ "/api/watchlists/membership": { status: 500 } });
    renderPage(
      <>
        <WatchCount instrumentKey="NSE_EQ|A" symbol="AAA" />
        <WatchlistMembershipProvider>
          <WatchCount instrumentKey="NSE_EQ|A" symbol="AAA" />
        </WatchlistMembershipProvider>
        <Refresh />
      </>,
    );

    // Refresh outside the provider does nothing, and nothing is counted.
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(screen.queryByRole("img")).toBeNull();
  });
});
