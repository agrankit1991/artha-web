/** Tests for finding a mutual fund scheme. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Funds } from "./Funds";
import { fundGroups, fundScheme, renderPage, schemePage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(replies: Parameters<typeof stubPlatform>[0] = {}) {
  return stubPlatform({
    "/api/funds/filters": {
      body: { categories: ["Equity Scheme - Large Cap"], fund_houses: ["Axis Mutual Fund"] },
    },
    "/api/funds/groups": { body: fundGroups() },
    "/api/funds": { body: schemePage() },
    ...replies,
  });
}

describe("Funds", () => {
  it("lists the schemes with their latest value", async () => {
    stubEverything();

    renderPage(<Funds />);

    expect(
      await screen.findByText("Axis Bluechip Fund - Direct Plan - Growth"),
    ).toBeInTheDocument();
    expect(screen.getByText("62.50")).toBeInTheDocument();
  });

  it("leads from a scheme's name to its own page", async () => {
    stubEverything();

    renderPage(<Funds />);

    const table = await screen.findByRole("table", { name: "Schemes" });
    expect(within(table).getByRole("link", { name: /Axis Bluechip/ })).toHaveAttribute(
      "href",
      "/fund/120503",
    );
  });

  it("searches at the platform, because twenty thousand cannot be sent", async () => {
    const fetchMock = stubEverything();
    renderPage(<Funds />);
    await screen.findByText("Axis Bluechip Fund - Direct Plan - Growth");

    await userEvent.type(screen.getByLabelText("Search schemes"), "bluechip");

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("text=bluechip"))).toBe(true);
    });
  });

  it("narrows by fund house", async () => {
    const fetchMock = stubEverything();
    renderPage(<Funds />);
    await screen.findByText("Axis Bluechip Fund - Direct Plan - Growth");

    await userEvent.click(screen.getByLabelText("Fund house"));
    await userEvent.click(await screen.findByRole("option", { name: "Axis Mutual Fund" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("amc=Axis"))).toBe(true);
    });
  });

  it("narrows by category too", async () => {
    const fetchMock = stubEverything();
    renderPage(<Funds />);
    await screen.findByText("Axis Bluechip Fund - Direct Plan - Growth");

    await userEvent.click(screen.getByLabelText("Category"));
    await userEvent.click(await screen.findByRole("option", { name: /Large Cap/ }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("category=Equity"))).toBe(true);
    });
  });

  it("sorts by any column, not only by name", async () => {
    // Asked of this table: which of these is the cheapest unit, which was
    // valued most recently. Neither is answerable by reading down a name.
    stubEverything({
      "/api/funds": {
        body: schemePage({
          total: 2,
          items: [
            fundScheme(),
            fundScheme({ scheme_code: "118989", name: "HDFC Liquid", nav: "4800.000000" }),
          ],
        }),
      },
    });
    renderPage(<Funds />);
    const table = await screen.findByRole("table", { name: "Schemes" });

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByRole("row").length).toBe(3);
  });

  it("asks for the next batch rather than a numbered page", async () => {
    const fetchMock = stubEverything({ "/api/funds": { body: schemePage({ total: 60 }) } });
    renderPage(<Funds />);
    await screen.findByText("Axis Bluechip Fund - Direct Plan - Growth");

    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("offset=1"))).toBe(true);
    });
  });

  it("starts again at the beginning when the search changes", async () => {
    // Keeping what is on screen would leave a reader looking at a list
    // that answers two questions at once.
    const fetchMock = stubEverything({
      "/api/funds": { body: schemePage({ total: 60, offset: 25 }) },
    });
    renderPage(<Funds />);
    await screen.findByText("Axis Bluechip Fund - Direct Plan - Growth");

    await userEvent.type(screen.getByLabelText("Search schemes"), "axis");

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("text=axis") && path.includes("offset=0"))).toBe(
        true,
      );
    });
  });

  it("says what a scheme has not published rather than showing a nought", async () => {
    // AMFI publishes some schemes with no house, no category and no value.
    // A nought in the value column would place such a scheme among the
    // cheapest units there are, including when the column is sorted.
    stubEverything({
      "/api/funds": {
        body: schemePage({
          total: 2,
          items: [
            fundScheme({
              nav: null,
              nav_date: null,
              plan: null,
              option: null,
              amc: null,
              category: null,
            }),
            fundScheme({ scheme_code: "118989", name: "HDFC Liquid" }),
          ],
        }),
      },
    });

    renderPage(<Funds />);

    const table = await screen.findByRole("table", { name: "Schemes" });
    expect(within(table).getByText("House not published")).toBeInTheDocument();
    expect(within(table).getAllByText("-").length).toBeGreaterThan(1);

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByRole("row").length).toBe(3);
  });

  it("says nothing matched rather than looking broken", async () => {
    stubEverything({ "/api/funds": { body: schemePage({ total: 0, items: [] }) } });

    renderPage(<Funds />);

    expect(await screen.findByText("No scheme matches that")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({
      "/api/funds/filters": { body: { categories: [], fund_houses: [] } },
      "/api/funds/groups": { body: fundGroups() },
      "/api/funds": { status: 500, body: { detail: "the values are being rebuilt" } },
    });

    renderPage(<Funds />);

    expect(await screen.findByRole("alert")).toHaveTextContent("The values are being rebuilt");
    // The search stays, so a reader can change what failed.
    expect(screen.getByLabelText("Search schemes")).toBeInTheDocument();
    expect(screen.queryByText("No scheme matches that")).not.toBeInTheDocument();
  });

  it("reads the search, the filters and the order from the address", async () => {
    const fetchMock = stubEverything();

    renderPage(<Funds />, {
      at: "/funds?q=bluechip&house=Axis%20Mutual%20Fund&category=Equity%20Scheme%20-%20Large%20Cap&sort=one_year&order=asc",
    });

    expect(screen.getByLabelText("Search schemes")).toHaveValue("bluechip");
    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) =>
        decodeURIComponent(String(call[0])).replaceAll("+", " "),
      );
      expect(
        asked.some(
          (path) =>
            path.startsWith("/api/funds?") &&
            path.includes("text=bluechip") &&
            path.includes("amc=Axis Mutual Fund") &&
            path.includes("category=Equity Scheme - Large Cap") &&
            path.includes("sort=one_year") &&
            path.includes("order=asc"),
        ),
      ).toBe(true);
    });
  });

  it("counts every fund that matches, not the batch on screen", async () => {
    stubEverything({ "/api/funds": { body: schemePage({ total: 1284 }) } });

    renderPage(<Funds />);

    expect(await screen.findByText("1,284 funds")).toBeInTheDocument();
  });

  it("carries what each scheme has returned, coloured and sortable", async () => {
    // A list of funds is read by what they have returned; without the
    // figures it is an alphabetical index of twenty thousand names.
    stubEverything({
      "/api/funds": {
        body: schemePage({
          total: 2,
          items: [
            fundScheme(),
            fundScheme({
              scheme_code: "118989",
              name: "HDFC Liquid",
              returns: { ...fundScheme().returns, one_year: "-3.00", five_years: null },
            }),
          ],
        }),
      },
    });
    renderPage(<Funds />);
    const table = await screen.findByRole("table", { name: "Schemes" });

    // Tinted as the heatmap tints a move; without a stylesheet the colour is mixed in it.
    expect(within(table).getByText("+12.30%").style.backgroundColor).toContain("var(--heat-gain)");
    expect(within(table).getByText("-3.00%").style.backgroundColor).toContain("var(--heat-loss)");
    expect(within(table).getByRole("button", { name: /3Y p.a./ })).toBeInTheDocument();
  });

  it("orders every scheme at the platform, not only the batch on screen", async () => {
    // Twenty-five rows of twenty thousand cannot say which fund returned
    // most; the platform orders them all and the table shows its order,
    // even where sorting the rows on screen would have put them otherwise.
    const worst = fundScheme({
      scheme_code: "118989",
      name: "HDFC Liquid",
      returns: { ...fundScheme().returns, one_year: "-3.00" },
    });
    const fetchMock = stubEverything({
      "/api/funds": {
        bodyFor: (path: string) =>
          schemePage({
            total: 2,
            items: path.includes("sort=one_year") ? [worst, fundScheme()] : [fundScheme(), worst],
          }),
      },
    });
    renderPage(<Funds />);
    const table = await screen.findByRole("table", { name: "Schemes" });

    await userEvent.click(within(table).getByRole("button", { name: /^1Y/ }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some(
          (path) =>
            path.includes("sort=one_year") &&
            path.includes("order=desc") &&
            path.includes("offset=0"),
        ),
      ).toBe(true);
    });
    await waitFor(() => {
      const [, first] = within(table).getAllByRole("row");
      expect(first).toHaveTextContent("HDFC Liquid");
    });

    await userEvent.click(within(table).getByRole("button", { name: /^1Y/ }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some((path) => path.includes("sort=one_year") && path.includes("order=asc")),
      ).toBe(true);
    });
  });

  it("does not offer to sort what the platform cannot order by", async () => {
    stubEverything();
    renderPage(<Funds />);
    const table = await screen.findByRole("table", { name: "Schemes" });

    expect(within(table).queryByRole("button", { name: /^Plan/ })).not.toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: /^Category/ })).not.toBeInTheDocument();
  });

  it("names the plan plainly when every plan is listed, and explains what it costs", async () => {
    stubEverything({
      "/api/funds": {
        body: schemePage({
          items: [fundScheme(), fundScheme({ scheme_code: "2", plan: "Regular Plan" })],
        }),
      },
    });
    renderPage(<Funds />, { at: "/funds?plans=all" });
    const table = await screen.findByRole("table", { name: "Schemes" });

    expect(within(table).getByText("Direct")).toBeInTheDocument();
    expect(within(table).getByText("Regular")).toBeInTheDocument();
    await userEvent.hover(
      within(table).getAllByRole("button", { name: /^What .+ means$/ })[0] as HTMLElement,
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent(/commission/);
  });

  it("shows the part of a category that distinguishes it", async () => {
    // "Open Ended Schemes(Equity Scheme - Large Cap Fund)" is "Large Cap
    // Fund" to anybody reading a table.
    stubEverything();
    renderPage(<Funds />);
    const table = await screen.findByRole("table", { name: "Schemes" });

    expect(within(table).getByText("Large Cap Fund")).toBeInTheDocument();
    expect(within(table).queryByText(/Open Ended Schemes/)).not.toBeInTheDocument();
  });

  it("opens on the funds still publishing, one plan each, best over three years first", async () => {
    const fetchMock = stubEverything();

    renderPage(<Funds />);

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some(
          (path) =>
            path.startsWith("/api/funds?") &&
            path.includes("live=true") &&
            path.includes("one_per_fund=true") &&
            path.includes("sort=three_years") &&
            path.includes("order=desc"),
        ),
      ).toBe(true);
      expect(asked).toContain("/api/funds/groups?live=true&one_per_fund=true");
    });
    const table = await screen.findByRole("table", { name: "Schemes" });
    expect(within(table).getByRole("columnheader", { name: /3Y p.a./ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("widens to every plan and the closed schemes when asked", async () => {
    const fetchMock = stubEverything({ "/api/funds": { body: schemePage({ total: 20393 }) } });
    renderPage(<Funds />);
    await screen.findByText("20,393 funds");

    await userEvent.click(screen.getByRole("button", { name: "Every plan" }));

    expect(await screen.findByText("20,393 schemes")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Closed too" }));
    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked).toContain("/api/funds/groups");
      expect(
        asked.some(
          (path) =>
            path.startsWith("/api/funds?") &&
            !path.includes("live=") &&
            !path.includes("one_per_fund="),
        ),
      ).toBe(true);
    });
  });

  it("shows each group's middle fund, and narrows to a group when it is chosen", async () => {
    const fetchMock = stubEverything({
      "/api/funds": {
        bodyFor: (path: string) =>
          schemePage({
            items: [
              fundScheme({
                name: path.includes("limit=10") ? "Leading Mid Cap Fund" : "Listed Mid Cap Fund",
                returns: { ...fundScheme().returns, three_years: "31.40" },
              }),
            ],
          }),
      },
    });
    renderPage(<Funds />, { at: "/funds?category=Equity%20Scheme%20-%20Large%20Cap" });
    const tiles = await screen.findByRole("group", { name: "Groups of funds" });
    const midCap = within(tiles).getByRole("button", { name: /Mid cap/ });
    expect(midCap).toHaveTextContent("20 funds");
    expect(midCap).toHaveTextContent("+22.10%");
    // No gold fund among those shown: nothing to narrow to.
    expect(within(tiles).getByRole("button", { name: /Gold/ })).toBeDisabled();

    await userEvent.click(midCap);

    expect(midCap).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("Mid cap: best over three years")).toBeInTheDocument();
    const leaders = await screen.findByRole("list", {
      name: /Mid cap funds, best over three years/,
    });
    expect(within(leaders).getByRole("link", { name: "Leading Mid Cap Fund" })).toHaveAttribute(
      "href",
      "/fund/120503",
    );
    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      // The group replaces the category chosen before it.
      expect(
        asked.some(
          (path) =>
            path.startsWith("/api/funds?") &&
            path.includes("group=mid_cap") &&
            !path.includes("category="),
        ),
      ).toBe(true);
    });

    await userEvent.click(midCap);

    expect(midCap).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Mid cap: best over three years")).not.toBeInTheDocument();
  });

  it("clears the group when a category is chosen instead", async () => {
    const fetchMock = stubEverything();
    renderPage(<Funds />, { at: "/funds?group=mid_cap" });
    await screen.findByText("Mid cap: best over three years");

    await userEvent.click(screen.getByLabelText("Category"));
    await userEvent.click(await screen.findByRole("option", { name: /Large Cap/ }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some(
          (path) =>
            path.startsWith("/api/funds?") &&
            path.includes("category=Equity") &&
            !path.includes("group="),
        ),
      ).toBe(true);
    });
    expect(screen.queryByText("Mid cap: best over three years")).not.toBeInTheDocument();
  });

  it("ignores a group the address names that does not exist", async () => {
    const fetchMock = stubEverything();

    renderPage(<Funds />, { at: "/funds?group=crypto" });

    await screen.findByRole("table", { name: "Schemes" });
    const asked = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(asked.some((path) => path.includes("group="))).toBe(false);
  });

  it("reports the groups or the leaders failing without losing the list", async () => {
    stubEverything({
      "/api/funds/groups": { status: 500, body: { detail: "the groups are being counted" } },
      "/api/funds": {
        statusFor: (path: string) => (path.includes("limit=10") ? 500 : 200),
        bodyFor: (path: string) =>
          path.includes("limit=10") ? { detail: "the leaders are being ranked" } : schemePage(),
      },
    });

    renderPage(<Funds />, { at: "/funds?group=mid_cap" });

    expect(await screen.findByText("The groups are being counted")).toBeInTheDocument();
    expect(await screen.findByText("The leaders are being ranked")).toBeInTheDocument();
    expect(
      await screen.findByText("Axis Bluechip Fund - Direct Plan - Growth"),
    ).toBeInTheDocument();
  });

  it("leaves the plan out when each fund is listed once, the page having said which", async () => {
    stubEverything();
    renderPage(<Funds />);
    const table = await screen.findByRole("table", { name: "Schemes" });

    expect(within(table).queryByRole("columnheader", { name: "Plan" })).not.toBeInTheDocument();
    expect(screen.getByText(/one plan per fund: the direct plan with growth/)).toBeInTheDocument();
  });
});
