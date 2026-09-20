/** Tests for the news page. */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { News } from "./News";
import { mentionedInstrument, newsItem, newsItems, newsPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(
  page = newsPage({ total: 40, items: newsItems(12) }),
): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/news/mentions": { body: [mentionedInstrument()] },
    "/api/news": { body: page },
  });
}

/** The paths the page asked the platform for. */
function asked(fetchMock: ReturnType<typeof stubPlatform>): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

describe("News", () => {
  it("gives the newest article the room its picture deserves", async () => {
    // What the old overview did, and what makes a feed readable rather
    // than a wall of equal cards.
    stubEverything();

    render(<News />);

    expect(await screen.findByText("Headline 0")).toBeInTheDocument();
    // The lead is not repeated in the grid below it.
    expect(screen.getAllByText("Headline 0")).toHaveLength(1);
  });

  it("searches once typing stops, rather than once per keystroke", async () => {
    // A request per letter races its own answers and leaves the reply for
    // "rel" on screen after the reply for "relian".
    const user = userEvent.setup();
    const fetchMock = stubEverything();
    render(<News />);
    await screen.findByText("Headline 0");

    await user.type(screen.getByLabelText("Search news"), "refiners");

    await waitFor(() => {
      expect(asked(fetchMock).some((path) => path.includes("q=refiners"))).toBe(true);
    });
    expect(asked(fetchMock).filter((path) => path.includes("q=")).length).toBeLessThan(8);
  });

  it("narrows to a window without leaving the page", async () => {
    const fetchMock = stubEverything();
    render(<News />);
    await screen.findByText("Headline 0");

    await userEvent.click(screen.getByRole("button", { name: "Week" }));

    await waitFor(() => {
      expect(asked(fetchMock).some((path) => path.includes("days=7"))).toBe(true);
    });
  });

  it("offers the companies actually written about, rather than a blank box", async () => {
    stubEverything();

    render(<News />);

    const companies = await screen.findByRole("group", { name: "Companies in the news" });
    expect(within(companies).getByRole("button", { name: /TCS/ })).toBeInTheDocument();
  });

  it("narrows to one company's news", async () => {
    const fetchMock = stubEverything();
    render(<News />);
    await screen.findByRole("group", { name: "Companies in the news" });

    await userEvent.click(screen.getByRole("button", { name: /TCS/ }));

    await waitFor(() => {
      expect(
        asked(fetchMock).some((path) => path.includes("instrument_key=NSE_EQ%7CINE467B01029")),
      ).toBe(true);
    });
    expect(screen.getByText("Showing news about")).toBeInTheDocument();
  });

  it("lets a company filter be taken off again", async () => {
    stubEverything();
    render(<News />);
    await screen.findByRole("group", { name: "Companies in the news" });
    await userEvent.click(screen.getByRole("button", { name: /TCS/ }));
    await screen.findByText("Showing news about");

    await userEvent.click(screen.getByRole("button", { name: /Clear company filter/ }));

    expect(await screen.findByRole("group", { name: "Companies in the news" })).toBeInTheDocument();
  });

  it("pages through the feed", async () => {
    const fetchMock = stubEverything();
    render(<News />);
    await screen.findByText("Headline 0");

    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));

    await waitFor(() => {
      expect(asked(fetchMock).some((path) => path.includes("offset=12"))).toBe(true);
    });
  });

  it("returns to the first page when the question changes", async () => {
    // Staying on page four of a result that now has two is how a reader
    // concludes there is nothing.
    const fetchMock = stubEverything();
    render(<News />);
    await screen.findByText("Headline 0");
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    await waitFor(() => {
      expect(asked(fetchMock).some((path) => path.includes("offset=12"))).toBe(true);
    });

    await userEvent.click(screen.getByRole("button", { name: "Week" }));

    await waitFor(() => {
      expect(
        asked(fetchMock).some((path) => path.includes("days=7") && path.includes("offset=0")),
      ).toBe(true);
    });
  });

  it("keeps the lead to the first page", async () => {
    // A "featured" article on page five is whatever happened to sort
    // there, which is not a feature.
    stubEverything(newsPage({ total: 40, offset: 12, items: newsItems(12) }));

    render(<News />);

    await screen.findByText("Headline 0");
    expect(screen.queryByText("Showing news about")).not.toBeInTheDocument();
    expect(screen.getAllByText("Headline 0")).toHaveLength(1);
  });

  it("gives the lead article its picture", async () => {
    stubEverything(
      newsPage({
        total: 1,
        items: [newsItem({ thumbnail_url: "https://example.test/lead.webp" })],
      }),
    );

    render(<News />);

    await screen.findByText("Refiners lead the index higher");
    const [picture] = document.querySelectorAll("img");
    expect(picture).toHaveAttribute("src", "https://example.test/lead.webp");
    expect(picture).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("says a search found nothing rather than showing an empty page", async () => {
    stubEverything(newsPage({ total: 0, items: [] }));

    render(<News />);

    expect(await screen.findByText("No news stored yet")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({
      "/api/news/mentions": { body: [] },
      "/api/news": { status: 500, body: { detail: "the feed is being rebuilt" } },
    });

    render(<News />);

    expect(await screen.findByRole("alert")).toHaveTextContent("the feed is being rebuilt");
  });

  it("shows an article with no picture without leaving a gap", async () => {
    stubEverything(newsPage({ total: 1, items: [newsItem({ thumbnail_url: null })] }));

    render(<News />);

    expect(await screen.findByText("Refiners lead the index higher")).toBeInTheDocument();
    expect(document.querySelectorAll("img")).toHaveLength(0);
  });
});
