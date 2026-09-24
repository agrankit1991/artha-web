/** Tests for finding a mutual fund scheme. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Funds, shortCategory } from "./Funds";
import { fundScheme, renderPage, schemePage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(replies: Parameters<typeof stubPlatform>[0] = {}) {
  return stubPlatform({
    "/api/funds/filters": {
      body: { categories: ["Equity Scheme - Large Cap"], fund_houses: ["Axis Mutual Fund"] },
    },
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
    expect(within(table).getAllByText("—").length).toBeGreaterThan(1);

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
      "/api/funds": { status: 500, body: { detail: "the values are being rebuilt" } },
    });

    renderPage(<Funds />);

    expect(await screen.findByRole("alert")).toHaveTextContent("the values are being rebuilt");
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

    expect(within(table).getByText("+12.30%")).toHaveClass("text-gain");
    expect(within(table).getByText("-3.00%")).toHaveClass("text-loss");
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

  it("names the plan plainly and explains what it costs", async () => {
    stubEverything({
      "/api/funds": {
        body: schemePage({
          items: [fundScheme(), fundScheme({ scheme_code: "2", plan: "Regular Plan" })],
        }),
      },
    });
    renderPage(<Funds />);
    const table = await screen.findByRole("table", { name: "Schemes" });

    expect(within(table).getByText("Direct")).toBeInTheDocument();
    expect(within(table).getByText("Regular")).toBeInTheDocument();
    await userEvent.hover(
      within(table).getAllByRole("button", { name: "What this means" })[0] as HTMLElement,
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

  it("shortens a category to the part that distinguishes it", () => {
    expect(shortCategory("Open Ended Schemes(Equity Scheme - Large Cap Fund)")).toBe(
      "Large Cap Fund",
    );
    expect(shortCategory("Close Ended Schemes ( Income )")).toBe("Income");
    expect(shortCategory("Debt")).toBe("Debt");
    expect(shortCategory(null)).toBe("—");
  });
});
