/** Tests for the dialog that styles every kind of line. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LineStylesDialog } from "./LineStylesDialog";
import { LINE_KEYS } from "@/lib/chartLines";
import { LineStylesProvider } from "@/lib/lineStyles";
import { renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stub(refuse = false): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/line-styles": {
      bodyFor: (_path, method) => (method === "GET" ? [] : { detail: "No room for that style" }),
      statusFor: (_path, method) => (refuse && method !== "GET" ? 409 : 200),
    },
  });
}

function show(): ReturnType<typeof vi.fn> {
  const onClose = vi.fn();
  renderPage(
    <LineStylesProvider>
      <LineStylesDialog open onClose={onClose} />
    </LineStylesProvider>,
  );
  return onClose;
}

/** The requests made, as method and path. */
function made(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map(([path, init]) => `${init?.method ?? "GET"} ${path}`);
}

describe("LineStylesDialog", () => {
  it("lists every line, keeps a colour chosen for one, and resets them all", async () => {
    const fetched = stub();
    const onClose = show();
    const lines = screen.getByRole("list", { name: "Lines" });
    expect(within(lines).getAllByRole("listitem")).toHaveLength(LINE_KEYS.length);

    await userEvent.click(
      within(screen.getByRole("group", { name: "SMA 50 colour" })).getByRole("button", {
        name: "Orange",
      }),
    );
    await waitFor(() => {
      expect(made(fetched)).toContain("PUT /api/line-styles/sma_50");
    });

    await userEvent.click(screen.getByRole("button", { name: "Reset all" }));
    await waitFor(() => {
      expect(made(fetched)).toContain("DELETE /api/line-styles");
    });

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("says why a style could not be kept", async () => {
    stub(true);
    show();

    await userEvent.click(
      within(screen.getByRole("group", { name: "RSI colour" })).getByRole("button", {
        name: "Blue",
      }),
    );

    expect(await screen.findByText(/No room for that style/)).toBeInTheDocument();
  });
});
