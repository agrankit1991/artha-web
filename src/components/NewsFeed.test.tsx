/** Tests for the news feed. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NewsFeed } from "./NewsFeed";
import { newsItem } from "@/test/support";

describe("NewsFeed", () => {
  it("links each headline out to the publisher", () => {
    render(<NewsFeed items={[newsItem()]} />);

    const link = screen.getByRole("link", { name: "Refiners lead the index higher" });
    expect(link).toHaveAttribute("href", "https://upstox.com/news/oil");
  });

  it("opens the publisher without handing them this page", () => {
    // Without noreferrer the opened page can reach back through
    // window.opener, which is a real hole rather than a formality.
    render(<NewsFeed items={[newsItem()]} />);

    expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("tags an article with the instruments it concerns", () => {
    // The part a market platform adds over a news site.
    render(<NewsFeed items={[newsItem()]} />);

    expect(screen.getByText("RELIANCE")).toBeInTheDocument();
  });

  it("summarises the rest rather than listing forty symbols", () => {
    const mentions = ["A", "B", "C", "D", "E", "F"].map((symbol) => ({
      instrument_key: `NSE_EQ|${symbol}`,
      symbol,
    }));

    render(<NewsFeed items={[newsItem({ mentions })]} tagLimit={4} />);

    expect(screen.getByText("+2 more")).toBeInTheDocument();
    expect(screen.queryByText("E")).not.toBeInTheDocument();
  });

  it("says how long ago it was published", () => {
    render(<NewsFeed items={[newsItem()]} />);

    expect(screen.getByText("3h ago")).toBeInTheDocument();
  });

  it("omits the summary when the publisher gave none", () => {
    render(<NewsFeed items={[newsItem({ summary: "" })]} />);

    expect(screen.queryByText(/Crude eased/)).not.toBeInTheDocument();
  });

  it("says nothing is stored rather than showing an empty page", () => {
    render(<NewsFeed items={[]} />);

    expect(screen.getByText("No news stored yet")).toBeInTheDocument();
  });

  it("holds room while the articles are on their way", () => {
    // An empty feed and a loading one look identical otherwise.
    const { container } = render(<NewsFeed items={null} loading />);

    expect(screen.queryByText("No news stored yet")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
