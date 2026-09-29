/** Tests for the owner's visitors page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Visitors as VisitorsReport } from "@/api/client";
import { renderPage, stubPlatform } from "@/test/support";

import { Visitors } from "./Visitors";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Two people, one of whom has not opened anything, and a stranger at the door. */
function report(overrides: Partial<VisitorsReport> = {}): VisitorsReport {
  return {
    since: "2026-08-31",
    people: [
      {
        account_id: 2,
        name: "A Member",
        email: "member@example.com",
        joined_at: "2026-09-21T10:00:00+05:30",
        last_seen_at: "2026-09-29T09:00:00+05:30",
        active_days: 3,
        visits: 5,
        page_views: 42,
      },
      {
        account_id: 1,
        name: "Tester",
        email: "tester@example.com",
        joined_at: "2026-09-20T10:00:00+05:30",
        last_seen_at: null,
        active_days: 0,
        visits: 0,
        page_views: 0,
      },
    ],
    anonymous: { visitors: 4, page_views: 9 },
    pages: [
      { path: "/breadth", page_views: 30, people: 1 },
      { path: "/", page_views: 9, people: 0 },
    ],
    days: [
      { day: "2026-09-28", people: 1, anonymous_visitors: 2, page_views: 20 },
      { day: "2026-09-29", people: 1, anonymous_visitors: 2, page_views: 31 },
    ],
    ...overrides,
  };
}

/** The visitors requests made, as the platform reads them. */
function asked(fetchMock: ReturnType<typeof stubPlatform>): string[] {
  return fetchMock.mock.calls
    .map((call) => String(call[0]))
    .filter((path) => path.startsWith("/api/visitors"));
}

describe("Visitors", () => {
  it("names every person by name and email, with how much they used the platform", async () => {
    stubPlatform({ "/api/visitors": { body: report() } });

    renderPage(<Visitors />);

    const people = await screen.findByRole("table", { name: "People" });
    const [, member, owner] = within(people).getAllByRole("row");
    expect(member).toHaveTextContent("A Member");
    expect(member).toHaveTextContent("member@example.com");
    expect(member).toHaveTextContent("42");
    // Never seen reads as a dash, not as a date.
    expect(owner).toHaveTextContent("tester@example.com");
    expect(owner).toHaveTextContent("—");
  });

  it("totals the span, the browsers nobody was signed in on included", async () => {
    stubPlatform({ "/api/visitors": { body: report() } });

    renderPage(<Visitors />);

    const totals = await screen.findByRole("region", { name: "Totals" });
    await waitFor(() => {
      expect(totals).toHaveTextContent("1 of 2");
    });
    // 42 by people and 9 by nobody signed in.
    expect(totals).toHaveTextContent("51");
    expect(totals).toHaveTextContent("9 views");
  });

  it("ranks the pages opened, each leading to itself", async () => {
    stubPlatform({ "/api/visitors": { body: report() } });

    renderPage(<Visitors />);

    const pages = await screen.findByRole("table", { name: "Pages" });
    expect(within(pages).getByRole("link", { name: "/breadth" })).toHaveAttribute(
      "href",
      "/breadth",
    );
  });

  it("narrows the pages to one person when they are chosen, and back again", async () => {
    const fetchMock = stubPlatform({ "/api/visitors": { body: report() } });
    renderPage(<Visitors />);
    const people = await screen.findByRole("table", { name: "People" });

    await userEvent.click(within(people).getByText("A Member"));

    expect(await screen.findByText("A Member's pages")).toBeInTheDocument();
    await waitFor(() => {
      expect(asked(fetchMock)).toContain("/api/visitors?days=30&account_id=2");
    });

    await userEvent.click(screen.getByRole("button", { name: "Everyone's pages" }));

    expect(await screen.findByText("Most viewed pages")).toBeInTheDocument();
  });

  it("lets the people be sorted by when they joined or were last seen, and a choice be undone", async () => {
    const fetchMock = stubPlatform({ "/api/visitors": { body: report() } });
    renderPage(<Visitors />);
    const people = await screen.findByRole("table", { name: "People" });

    await userEvent.click(within(people).getByRole("button", { name: /Joined/ }));
    await userEvent.click(within(people).getByRole("button", { name: /Last seen/ }));
    await userEvent.click(within(people).getByText("A Member"));
    await screen.findByText("A Member's pages");
    await userEvent.click(within(people).getByText("A Member"));

    expect(await screen.findByText("Most viewed pages")).toBeInTheDocument();
    expect(asked(fetchMock).at(-1)).toBe("/api/visitors?days=30");
  });

  it("asks for the span chosen, a month to begin with", async () => {
    const fetchMock = stubPlatform({ "/api/visitors": { body: report() } });
    renderPage(<Visitors />);
    await screen.findByRole("table", { name: "People" });

    await userEvent.click(screen.getByRole("button", { name: "All time" }));

    await waitFor(() => {
      expect(asked(fetchMock)).toEqual(["/api/visitors?days=30", "/api/visitors?days=0"]);
    });
  });

  it("draws the days", async () => {
    stubPlatform({ "/api/visitors": { body: report() } });

    renderPage(<Visitors />);

    const drawn = await screen.findByRole("region", { name: "Day by day" });
    await waitFor(() => {
      expect(within(drawn).getByText("Page views")).toBeInTheDocument();
    });
    expect(within(drawn).getByText("Not signed in")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({ "/api/visitors": { status: 500, body: { detail: "the count broke" } } });

    renderPage(<Visitors />);

    expect(await screen.findByRole("alert")).toHaveTextContent("the count broke");
  });
});
