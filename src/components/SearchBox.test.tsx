/** Tests for finding anything from the header. */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { SearchBox } from "./SearchBox";
import type { SearchHit } from "@/api/client";
import { stubPlatform } from "@/test/support";

const HITS: SearchHit[] = [
  { kind: "company", key: "NSE_EQ|INE002A01018", label: "RELIANCE", detail: "Reliance Industries" },
  { kind: "index", key: "NSE_INDEX|Nifty 50", label: "Nifty 50", detail: null },
  { kind: "fund", key: "120503", label: "Axis Bluechip Fund", detail: "Axis" },
];

/** Where the router has been sent, for a test to read. */
function Where(): React.JSX.Element {
  const location = useLocation();
  return <output data-testid="where">{location.pathname}</output>;
}

function draw(): void {
  render(
    <MemoryRouter>
      <SearchBox />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SearchBox", () => {
  it("shows what was found, with what kind of thing each is", async () => {
    stubPlatform({ "/api/search": { body: HITS } });
    draw();

    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "reli");
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(await screen.findByRole("option", { name: /RELIANCE/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Nifty 50/ })).toHaveTextContent("Index");
    expect(screen.getByRole("option", { name: /Axis Bluechip/ })).toHaveTextContent("Fund");
  });

  it("opens the chosen thing's page on Enter, moving with the arrows", async () => {
    stubPlatform({ "/api/search": { body: HITS } });
    draw();
    const box = screen.getByRole("combobox", { name: "Search" });
    await userEvent.type(box, "reli");
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await screen.findByRole("option", { name: /RELIANCE/ });

    await userEvent.keyboard("{ArrowDown}{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("where")).toHaveTextContent("/index/NSE_INDEX%7CNifty%2050");
    });
  });

  it("opens a result under the pointer", async () => {
    stubPlatform({ "/api/search": { body: HITS } });
    draw();
    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "axis");
    act(() => {
      vi.advanceTimersByTime(400);
    });

    await userEvent.click(await screen.findByRole("option", { name: /Axis Bluechip/ }));

    await waitFor(() => {
      expect(screen.getByTestId("where")).toHaveTextContent("/fund/120503");
    });
  });

  it("is reached from anywhere with a slash", async () => {
    stubPlatform({ "/api/search": { body: [] } });
    draw();

    await userEvent.keyboard("/");

    expect(screen.getByRole("combobox", { name: "Search" })).toHaveFocus();
  });

  it("leaves a slash alone when it is being typed somewhere else", async () => {
    stubPlatform({ "/api/search": { body: [] } });
    render(
      <MemoryRouter>
        <SearchBox />
        <input aria-label="Notes" />
      </MemoryRouter>,
    );
    const notes = screen.getByRole("textbox", { name: "Notes" });
    await userEvent.click(notes);

    await userEvent.keyboard("a/b");

    expect(notes).toHaveValue("a/b");
    expect(notes).toHaveFocus();
  });

  it("does not ask for one letter", async () => {
    // One letter matches half the market; the platform declines it and
    // the box should not even ask.
    const fetchMock = stubPlatform({ "/api/search": { body: HITS } });
    draw();

    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "r");
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says nothing was found rather than showing an empty list", async () => {
    stubPlatform({ "/api/search": { body: [] } });
    draw();

    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "zzzz");
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(await screen.findByText(/Nothing called/)).toBeInTheDocument();
  });

  it("remembers what was chosen and offers it before anything is typed", async () => {
    stubPlatform({ "/api/search": { body: HITS } });
    draw();
    const box = screen.getByRole("combobox", { name: "Search" });
    await userEvent.type(box, "reli");
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await userEvent.click(await screen.findByRole("option", { name: /RELIANCE/ }));
    // Choosing clears the box; the cleared value has to settle through the
    // debounce before the list is the recent one rather than the results.
    act(() => {
      vi.advanceTimersByTime(400);
    });

    await userEvent.click(box);

    expect(await screen.findByRole("listbox", { name: "Recent" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /RELIANCE/ })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("artha.search.recent") ?? "[]")).toHaveLength(1);
  });

  it("puts the list away on Escape", async () => {
    stubPlatform({ "/api/search": { body: HITS } });
    draw();
    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "reli");
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await screen.findByRole("listbox");

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("is reached with Ctrl+K as well", async () => {
    stubPlatform({ "/api/search": { body: [] } });
    draw();

    await userEvent.keyboard("{Control>}k{/Control}");

    expect(screen.getByRole("combobox", { name: "Search" })).toHaveFocus();
  });

  it("moves back up the list with the arrow", async () => {
    stubPlatform({ "/api/search": { body: HITS } });
    draw();
    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "reli");
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await screen.findByRole("option", { name: /RELIANCE/ });

    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("where")).toHaveTextContent("/index/NSE_INDEX%7CNifty%2050");
    });
  });

  it("says nothing was found when the platform failed", async () => {
    stubPlatform({ "/api/search": { status: 500, body: { detail: "down" } } });
    draw();

    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "reli");
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(await screen.findByText(/Nothing called/)).toBeInTheDocument();
  });

  it("forgets recent searches it cannot read, and carries on", async () => {
    window.localStorage.setItem("artha.search.recent", "not json");
    stubPlatform({ "/api/search": { body: [] } });
    draw();

    await userEvent.click(screen.getByRole("combobox", { name: "Search" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("still opens the page when storage refuses to remember", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    stubPlatform({ "/api/search": { body: HITS } });
    draw();
    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "reli");
    act(() => {
      vi.advanceTimersByTime(400);
    });

    await userEvent.click(await screen.findByRole("option", { name: /RELIANCE/ }));

    await waitFor(() => {
      expect(screen.getByTestId("where")).toHaveTextContent("/company/");
    });
    setItem.mockRestore();
  });
});
