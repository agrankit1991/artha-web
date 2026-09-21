/** Tests for sharing a card. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShareButton } from "./ShareButton";
import { renderPage } from "@/test/support";

const FACTS = {
  title: "Reliance Industries",
  subtitle: "NSE: RELIANCE",
  price: "₹1,240.00",
  changePercent: 1.5,
  changeText: "+1.50%",
  asOf: "As of 16 Sep 2026",
};

/** A 2D context that accepts every call the card makes, with the text call kept to assert on. */
const fillText = vi.fn();

function fakeContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  return {
    fillRect: vi.fn(),
    fillText,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
  } as unknown as CanvasRenderingContext2D;
}

describe("ShareButton", () => {
  const drawn = fakeContext();
  const written = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(drawn);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["png"], { type: "image/png" }));
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: written },
      configurable: true,
    });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:card"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("draws the card when opened, copies the link, and downloads the picture", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderPage(
      <ShareButton
        facts={FACTS}
        loadPoints={() => Promise.resolve([100, 110, 120])}
        filename="reliance"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    const card = await screen.findByRole("img", { name: "Reliance Industries: ₹1,240.00, +1.50%" });
    expect(card).toBeInTheDocument();
    await waitFor(() => {
      expect(fillText).toHaveBeenCalledWith(
        "Reliance Industries",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
    });

    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(written).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByRole("button", { name: "Link copied" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Download image" }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("says when the line cannot be read, and still draws the rest", async () => {
    renderPage(
      <ShareButton
        facts={FACTS}
        loadPoints={() => Promise.reject(new Error("no closes"))}
        filename="reliance"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(await screen.findByText(/no closes/)).toBeInTheDocument();
    await waitFor(() => {
      expect(fillText).toHaveBeenCalledWith("₹1,240.00", expect.any(Number), expect.any(Number));
    });
  });

  it("says when the browser refuses the clipboard, the canvas or the picture", async () => {
    written.mockRejectedValueOnce(new Error("denied"));
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(null);
    });
    renderPage(
      <ShareButton facts={FACTS} loadPoints={() => Promise.resolve([1, 2])} filename="x" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    await screen.findByRole("img");

    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText(/refused the clipboard/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Download image" })).toBeEnabled();
    });
    await userEvent.click(screen.getByRole("button", { name: "Download image" }));
    expect(await screen.findByText(/could not make the picture/)).toBeInTheDocument();

    // And a canvas with no 2D context at all.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByText(/cannot draw the card/)).toBeInTheDocument();
  });

  it("takes a class of its own, and words a failure that is not an Error", async () => {
    renderPage(
      <ShareButton
        facts={FACTS}
        loadPoints={() => Promise.reject(new TypeError("closes: not an array"))}
        filename="x"
        className="ml-2"
      />,
    );
    expect(screen.getByRole("button", { name: "Share" })).toHaveClass("ml-2");
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByText(/closes: not an array/)).toBeInTheDocument();
  });

  it("falls back to plain words when what was thrown is not an Error", async () => {
    renderPage(
      <ShareButton
        facts={FACTS}
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
        loadPoints={() => Promise.reject("nope")}
        filename="x"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByText(/could not be read/)).toBeInTheDocument();
  });
});
