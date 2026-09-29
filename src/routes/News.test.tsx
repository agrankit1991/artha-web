/** Tests for the news page. */

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { News } from "./News";
import {
  mentionedInstrument,
  newsItem,
  newsItems,
  newsPage,
  renderPage,
  stubPlatform,
} from "@/test/support";

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

    renderPage(<News />);

    expect(await screen.findByText("Headline 0")).toBeInTheDocument();
    // The lead is not repeated in the grid below it.
    expect(screen.getAllByText("Headline 0")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "News", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("40 articles")).toBeInTheDocument();
  });

  it("searches once typing stops, rather than once per keystroke", async () => {
    // A request per letter races its own answers and leaves the reply for
    // "rel" on screen after the reply for "relian".
    const user = userEvent.setup();
    const fetchMock = stubEverything();
    renderPage(<News />);
    await screen.findByText("Headline 0");

    await user.type(screen.getByLabelText("Search news"), "refiners");

    await waitFor(() => {
      expect(asked(fetchMock).some((path) => path.includes("q=refiners"))).toBe(true);
    });
    expect(asked(fetchMock).filter((path) => path.includes("q=")).length).toBeLessThan(8);
  });

  it("reads a window it does not know as every article", async () => {
    const fetchMock = stubEverything();
    renderPage(<News />, { at: "/news?within=year" });
    await screen.findByText("Headline 0");

    expect(asked(fetchMock).some((path) => path.includes("days="))).toBe(false);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  it("narrows to a window without leaving the page", async () => {
    const fetchMock = stubEverything();
    renderPage(<News />);
    await screen.findByText("Headline 0");

    await userEvent.click(screen.getByRole("button", { name: "Week" }));

    await waitFor(() => {
      expect(asked(fetchMock).some((path) => path.includes("days=7"))).toBe(true);
    });
  });

  it("offers the companies actually written about, rather than a blank box", async () => {
    stubEverything();

    renderPage(<News />);

    const companies = await screen.findByRole("group", { name: "Companies in the news" });
    expect(within(companies).getByRole("button", { name: /TCS/ })).toBeInTheDocument();
  });

  it("narrows to one company's news", async () => {
    const fetchMock = stubEverything();
    renderPage(<News />);
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
    renderPage(<News />);
    await screen.findByRole("group", { name: "Companies in the news" });
    await userEvent.click(screen.getByRole("button", { name: /TCS/ }));
    await screen.findByText("Showing news about");

    await userEvent.click(screen.getByRole("button", { name: /Clear company filter/ }));

    expect(await screen.findByRole("group", { name: "Companies in the news" })).toBeInTheDocument();
  });

  it("asks for the next batch rather than replacing what is on screen", async () => {
    // A feed is read downwards. Replacing the batch a reader is part-way
    // through loses their place every time they ask for more.
    const fetchMock = stubEverything();
    renderPage(<News />);
    await screen.findByText("Headline 0");

    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));

    await waitFor(() => {
      expect(asked(fetchMock).some((path) => path.includes("offset=12"))).toBe(true);
    });
  });

  it("keeps the articles already read when more arrive", async () => {
    const user = userEvent.setup();
    stubPlatform({
      "/api/news/mentions": { body: [mentionedInstrument()] },
      // Answers the batch it was asked for, as the platform does. A stub
      // that always returns the first batch would hide the very thing
      // this test is about.
      "/api/news": {
        bodyFor: (path: string) => {
          const offset = Number(new URL(path, "http://test").searchParams.get("offset") ?? "0");
          return newsPage({
            total: 24,
            offset,
            items: newsItems(24).slice(offset, offset + 12),
          });
        },
      },
    });
    renderPage(<News />);
    await screen.findByText("Headline 11");

    await user.click(screen.getByRole("button", { name: /Load more/ }));

    // The second batch is added under the first rather than replacing it.
    expect(await screen.findByText("Headline 23")).toBeInTheDocument();
    expect(screen.getByText("Headline 0")).toBeInTheDocument();
    expect(screen.getAllByText("Headline 11")).toHaveLength(1);
    expect(screen.getByText("All 24 articles shown")).toBeInTheDocument();
  });

  it("shows an article once even if a batch arrives twice", async () => {
    // React's strict mode makes an effect run twice in development, and a
    // batch appended blindly would then show every article twice.
    const user = userEvent.setup();
    stubPlatform({
      "/api/news/mentions": { body: [mentionedInstrument()] },
      "/api/news": { body: newsPage({ total: 24, items: newsItems(12) }) },
    });
    renderPage(<News />);
    await screen.findByText("Headline 11");

    await user.click(screen.getByRole("button", { name: /Load more/ }));

    await waitFor(() => {
      expect(screen.getAllByText("Headline 11")).toHaveLength(1);
    });
  });

  it("starts again from the beginning when the question changes", async () => {
    // Articles answering the old question left under ones answering the
    // new is a list that means two things at once.
    const fetchMock = stubEverything();
    renderPage(<News />);
    await screen.findByText("Headline 0");
    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));
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

  it("stops offering more once the whole feed is on screen", async () => {
    stubEverything(newsPage({ total: 12, items: newsItems(12) }));

    renderPage(<News />);

    expect(await screen.findByText("All 12 articles shown")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Load more/ })).not.toBeInTheDocument();
  });

  it("gives the lead article its picture", async () => {
    stubEverything(
      newsPage({
        total: 1,
        items: [newsItem({ thumbnail_url: "https://example.test/lead.webp" })],
      }),
    );

    renderPage(<News />);

    await screen.findByText("Refiners lead the index higher");
    const [picture] = document.querySelectorAll("img");
    expect(picture).toHaveAttribute("src", "https://example.test/lead.webp");
    expect(picture).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("says nothing is stored when nothing is, before anything is narrowed", async () => {
    stubEverything(newsPage({ total: 0, items: [] }));

    renderPage(<News />);

    expect(await screen.findByText("No news stored yet")).toBeInTheDocument();
  });

  it("says nothing matches when a narrowed feed is empty, not that nothing is stored", async () => {
    stubEverything(newsPage({ total: 0, items: [] }));

    renderPage(<News />, { at: "/news?q=zinc" });

    expect(await screen.findByText("No news matches")).toBeInTheDocument();
    expect(screen.queryByText("No news stored yet")).not.toBeInTheDocument();
  });

  it("shows one article as the lead alone, with no empty feed under it", async () => {
    stubEverything(newsPage({ total: 1, items: [newsItem()] }));

    renderPage(<News />);

    expect(await screen.findByText("Refiners lead the index higher")).toBeInTheDocument();
    expect(screen.queryByText(/No news/)).not.toBeInTheDocument();
    expect(screen.getByText("1 article")).toBeInTheDocument();
  });

  it("opens narrowed by the words, the window and the company in its address", async () => {
    const fetchMock = stubEverything(newsPage({ total: 1, items: [newsItem()] }));

    renderPage(<News />, {
      at: "/news?q=refiners&within=week&company=NSE_EQ%7CINE002A01018",
    });

    await waitFor(() => {
      expect(
        asked(fetchMock).some(
          (path) =>
            path.includes("q=refiners") &&
            path.includes("days=7") &&
            path.includes("instrument_key=NSE_EQ%7CINE002A01018"),
        ),
      ).toBe(true);
    });
    expect(screen.getByRole("searchbox", { name: "Search news" })).toHaveValue("refiners");
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
    // Named by its symbol once an article mentioning it is on screen.
    const filter = screen.getByText("Showing news about").parentElement as HTMLElement;
    expect(await within(filter).findByText("RELIANCE")).toBeInTheDocument();
  });

  it("drops a lead picture that fails to load rather than showing a broken one", async () => {
    stubEverything(
      newsPage({
        total: 1,
        items: [newsItem({ thumbnail_url: "https://example.test/gone.webp" })],
      }),
    );
    renderPage(<News />);
    await screen.findByText("Refiners lead the index higher");

    fireEvent.error(document.querySelector("img") as HTMLImageElement);

    expect(document.querySelectorAll("img")).toHaveLength(0);
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({
      "/api/news/mentions": { body: [] },
      "/api/news": { status: 500, body: { detail: "the feed is being rebuilt" } },
    });

    renderPage(<News />);

    expect(await screen.findByRole("alert")).toHaveTextContent("The feed is being rebuilt");
  });

  it("shows an article with no picture without leaving a gap", async () => {
    stubEverything(newsPage({ total: 1, items: [newsItem({ thumbnail_url: null })] }));

    renderPage(<News />);

    expect(await screen.findByText("Refiners lead the index higher")).toBeInTheDocument();
    expect(document.querySelectorAll("img")).toHaveLength(0);
  });

  it("filters to a company when its tag is chosen from a card", async () => {
    // The tags are the fastest way in: a reader sees a symbol on an
    // article and wants the rest of that company's news.
    const fetchMock = stubEverything();
    renderPage(<News />);
    await screen.findByText("Headline 0");

    const [tag] = screen.getAllByRole("button", { name: /RELIANCE/ });
    await userEvent.click(tag as HTMLElement);

    await waitFor(() => {
      expect(
        asked(fetchMock).some((path) => path.includes("instrument_key=NSE_EQ%7CINE002A01018")),
      ).toBe(true);
    });
    expect(screen.getByText("Showing news about")).toBeInTheDocument();
  });

  it("filters from the lead article's tags too", async () => {
    const fetchMock = stubEverything(newsPage({ total: 1, items: [newsItem()] }));
    renderPage(<News />);
    await screen.findByText("Refiners lead the index higher");

    await userEvent.click(screen.getByRole("button", { name: /RELIANCE/ }));

    await waitFor(() => {
      expect(
        asked(fetchMock).some((path) => path.includes("instrument_key=NSE_EQ%7CINE002A01018")),
      ).toBe(true);
    });
  });
});
