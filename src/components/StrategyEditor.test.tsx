/** Tests for the strategy editor and its live check. */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPage, stubPlatform } from "@/test/support";

import { StrategyEditor } from "./StrategyEditor";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The editor holding its own text, as a page would. */
function Harness({ initial }: { initial: string }): React.JSX.Element {
  const [text, setText] = useState(initial);
  return <StrategyEditor text={text} onChange={setText} />;
}

describe("StrategyEditor", () => {
  it("says what a text that reads is called", async () => {
    stubPlatform({
      "/api/strategies/check": {
        body: {
          valid: true,
          message: null,
          name: "Mine",
          combines: false,
          plays: [{ name: "Mine", when: "1" }],
        },
      },
    });
    renderPage(<Harness initial='name = "Mine"' />);

    expect(await screen.findByRole("status")).toHaveTextContent("Reads as Mine");
    expect(screen.queryByText(/plays/)).not.toBeInTheDocument();
  });

  it("lists what a combination plays, and when", async () => {
    stubPlatform({
      "/api/strategies/check": {
        body: {
          valid: true,
          message: null,
          name: "Both",
          combines: true,
          plays: [
            { name: "Trend", when: "nifty50 > sma(nifty50, 200)" },
            { name: "Calm", when: "1" },
          ],
        },
      },
    });
    renderPage(<Harness initial='name = "Both"' />);

    const verdict = await screen.findByRole("status");
    expect(verdict).toHaveTextContent("plays Trend when nifty50 > sma(nifty50, 200)");
    expect(verdict).toHaveTextContent("plays Calm otherwise");
  });

  it("says why a text cannot be read", async () => {
    stubPlatform({
      "/api/strategies/check": {
        body: {
          valid: false,
          message: "Mine, rank: no series named 'closes'",
          name: null,
          combines: false,
          plays: [],
        },
      },
    });
    renderPage(<Harness initial='name = "Mine"' />);

    expect(await screen.findByRole("status")).toHaveTextContent("no series named 'closes'");
  });

  it("says so when the check itself fails", async () => {
    stubPlatform({
      "/api/strategies/check": { status: 500, body: { detail: "check broke" } },
    });
    renderPage(<Harness initial='name = "Mine"' />);

    expect(await screen.findByRole("status")).toHaveTextContent("Could not check it: check broke");
  });

  it("checks nothing while the text is empty, and the text once typed", async () => {
    const platform = stubPlatform({
      "/api/strategies/check": {
        body: { valid: true, message: null, name: "X", combines: false, plays: [] },
      },
    });
    renderPage(<Harness initial="" />);
    expect(platform).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole("textbox", { name: "Strategy text" }), "name");

    expect(await screen.findByRole("status", {}, { timeout: 3000 })).toHaveTextContent(
      "Reads as X",
    );
    const [, init] = platform.mock.calls.at(-1) as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ text: "name" });
  });
});
