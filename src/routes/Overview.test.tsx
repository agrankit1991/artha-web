/** Tests for the overview page. */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Overview } from "./Overview";
import {
  breadth,
  moverRow,
  moversResponse,
  newsItem,
  overview,
  panel,
  scopeOptions,
  stubPlatform,
} from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/movers/scopes": { body: scopeOptions() },
    "/api/movers": {
      body: moversResponse([
        panel(),
        panel({ name: "unusual-volume", rows: [moverRow({ value: "4.23" })] }),
      ]),
    },
    "/api/overviews": {
      body: [overview(), overview({ instrument_key: "BSE_INDEX|SENSEX" })],
    },
    "/api/breadth": { body: breadth() },
    "/api/news": { body: [newsItem()] },
  });
}

describe("Overview", () => {
  it("shows the headline indices as cards, in their settled order", async () => {
    stubEverything();

    render(<Overview />);

    await screen.findAllByText("24,812.40");
    const cards = screen.getByRole("region", { name: "Market indices" });
    const names = within(cards)
      .getAllByText(/Nifty|Sensex|Bank Nifty|India VIX/)
      .map((element) => element.textContent);
    expect(names.slice(0, 3)).toEqual(["Nifty 50", "Sensex", "Nifty Next 50"]);
    expect(names).toContain("India VIX");
  });

  it("asks for every featured index in one request", async () => {
    // Eight requests to draw one row of cards is eight chances for the row
    // to arrive in pieces.
    const fetchMock = stubEverything();

    render(<Overview />);

    await waitFor(() => {
      const asked = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .find((path) => path.startsWith("/api/overviews"));
      expect(asked).toBeDefined();
      expect(asked?.match(/keys=/g)).toHaveLength(8);
    });
  });

  it("draws every list the platform returned", async () => {
    // One request brings all of them, so the page arrives whole rather
    // than panel by panel.
    stubEverything();

    render(<Overview />);

    expect(await screen.findByText("Top gainers")).toBeInTheDocument();
    expect(screen.getByText("Unusual volume")).toBeInTheDocument();
  });

  it("re-ranks when the scope changes, and says which scope it asked for", async () => {
    const fetchMock = stubEverything();
    render(<Overview />);
    await screen.findByText("Top gainers");

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "IT - Software" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("scope_key=IT+-+Software"))).toBe(true);
    });
  });

  it("ranks the indices against each other, not only the companies", async () => {
    const fetchMock = stubEverything();
    render(<Overview />);
    await screen.findByText("Top gainers");

    await userEvent.click(screen.getByRole("button", { name: "Indices" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some((path) => path.includes("/api/movers?") && path.includes("scope_kind=indices")),
      ).toBe(true);
    });
  });

  it("shows breadth beside the lists, for the same population", async () => {
    // An index rising on five companies while four hundred fall is exactly
    // what the lists alone cannot show.
    stubEverything();

    render(<Overview />);

    expect(await screen.findByText("Market breadth")).toBeInTheDocument();
    expect(screen.getByText("60 advancing")).toBeInTheDocument();
  });

  it("offers the way through to breadth in full", async () => {
    stubEverything();
    const open = vi.fn();
    render(<Overview onOpenBreadth={open} />);
    await screen.findByText("Market breadth");

    await userEvent.click(screen.getByRole("button", { name: /See breadth in full/ }));

    expect(open).toHaveBeenCalled();
  });

  it("shows what was published about the market", async () => {
    stubEverything();

    render(<Overview />);

    expect(await screen.findByText("Refiners lead the index higher")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    // An empty overview and a broken one look identical otherwise, and the
    // second is the one worth knowing about.
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/movers": { status: 500, body: { detail: "the lists are being rebuilt" } },
      "/api/overviews": { body: [] },
      "/api/breadth": { body: breadth() },
      "/api/news": { body: [] },
    });

    render(<Overview />);

    expect(await screen.findByRole("alert")).toHaveTextContent("the lists are being rebuilt");
  });

  it("passes a chosen instrument on to whoever asked for it", async () => {
    stubEverything();
    const chosen = vi.fn();
    render(<Overview onSelect={chosen} />);
    await screen.findByText("Top gainers");

    const [firstPanel] = screen.getAllByRole("table");
    const [, firstRow] = within(firstPanel as HTMLElement).getAllByRole("row");
    await userEvent.click(firstRow as HTMLElement);

    expect(chosen).toHaveBeenCalledWith(expect.objectContaining({ symbol: "RELIANCE" }));
  });
});
