/** Tests for a page reached by a readable address. */

import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPage, stubPlatform } from "@/test/support";

import { ReferencedPage } from "./ReferencedPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

function page(at: string): void {
  renderPage(
    <Routes>
      <Route
        path="/company/:ref"
        element={<ReferencedPage kind="company">{(key) => <p>Drawn for {key}</p>}</ReferencedPage>}
      />
    </Routes>,
    { at },
  );
}

describe("ReferencedPage", () => {
  it("asks what the address names and draws the page for that key", async () => {
    const fetched = stubPlatform({
      "/api/references": {
        body: { kind: "company", key: "NSE_EQ|INE101A01026", name: "Mahindra & Mahindra" },
      },
    });
    page("/company/M%26M");

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(await screen.findByText("Drawn for NSE_EQ|INE101A01026")).toBeInTheDocument();
    // The ampersand travels encoded, or the platform would read half a symbol.
    expect(String(fetched.mock.calls[0]?.[0])).toBe("/api/references/company/M%26M");
  });

  it("says so when the address names nothing", async () => {
    stubPlatform({
      "/api/references": { status: 404, body: { detail: "no company is called NOSUCH" } },
    });
    page("/company/NOSUCH");

    expect(await screen.findByRole("alert")).toHaveTextContent("no company is called NOSUCH");
  });
});
