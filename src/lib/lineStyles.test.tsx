/** Tests for the reader's line styles, shared by every chart. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CHART_LINES } from "@/lib/chartLines";
import { LineStylesProvider, useLineStyles } from "@/lib/lineStyles";
import { renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** What the styles say, and buttons that change them. */
function Probe(): React.JSX.Element {
  const styles = useLineStyles();
  const average = styles.drawn("sma_50");
  const price = styles.drawn("price");
  return (
    <div>
      <p data-testid="average">{`${average.colour} ${String(average.width)}`}</p>
      <p data-testid="price">{`${price.colour} ${String(price.width)}`}</p>
      <p data-testid="own">{JSON.stringify(styles.own("sma_50"))}</p>
      <p data-testid="problem">{styles.problem ?? ""}</p>
      <button
        type="button"
        onClick={() => {
          styles.save("sma_50", { colour: "#dc2626", width: 3 });
        }}
      >
        Red
      </button>
      <button type="button" onClick={styles.forgetAll}>
        Reset
      </button>
    </div>
  );
}

const KEPT = [{ line: "sma_50", colour: "#0d9488", width: 2 }];

/** The platform, keeping one style and refusing writes when asked to. */
function stub(refuse = false): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/line-styles": {
      bodyFor: (_path, method) => (method === "GET" ? KEPT : { detail: "refused" }),
      statusFor: (_path, method) => (refuse && method !== "GET" ? 500 : 200),
    },
  });
}

/** The requests made, as method and path. */
function made(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map(([path, init]) => `${init?.method ?? "GET"} ${path}`);
}

describe("line styles", () => {
  it("lays the reader's styles over the chart's own", async () => {
    stub();
    renderPage(
      <LineStylesProvider>
        <Probe />
      </LineStylesProvider>,
    );

    expect(await screen.findByText("#0d9488 2")).toBeInTheDocument();
    expect(screen.getByTestId("price")).toHaveTextContent(
      `${CHART_LINES.price.colour} ${String(CHART_LINES.price.width)}`,
    );
  });

  it("shows a change at once and keeps it on the account", async () => {
    const fetched = stub();
    renderPage(
      <LineStylesProvider>
        <Probe />
      </LineStylesProvider>,
    );
    await screen.findByText("#0d9488 2");

    await userEvent.click(screen.getByRole("button", { name: "Red" }));

    expect(screen.getByTestId("average")).toHaveTextContent("#dc2626 3");
    expect(screen.getByTestId("own")).toHaveTextContent('{"colour":"#dc2626","width":3}');
    await waitFor(() => {
      expect(made(fetched)).toContain("PUT /api/line-styles/sma_50");
    });
    const sent = fetched.mock.calls.find(([, init]) => init?.method === "PUT")?.[1]?.body;
    expect(JSON.parse(sent as string)).toEqual({ colour: "#dc2626", width: 3 });
  });

  it("undoes a change the platform refuses, and says so", async () => {
    stub(true);
    renderPage(
      <LineStylesProvider>
        <Probe />
      </LineStylesProvider>,
    );
    await screen.findByText("#0d9488 2");

    await userEvent.click(screen.getByRole("button", { name: "Red" }));

    await waitFor(() => {
      expect(screen.getByTestId("average")).toHaveTextContent("#0d9488 2");
    });
    expect(screen.getByTestId("problem")).not.toHaveTextContent(/^$/);
  });

  it("draws every line the chart's own way again, or puts them back when refused", async () => {
    const fetched = stub();
    renderPage(
      <LineStylesProvider>
        <Probe />
      </LineStylesProvider>,
    );
    await screen.findByText("#0d9488 2");

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByTestId("average")).toHaveTextContent(
      `${CHART_LINES.sma_50.colour} ${String(CHART_LINES.sma_50.width)}`,
    );
    await waitFor(() => {
      expect(made(fetched)).toContain("DELETE /api/line-styles");
    });
  });

  it("puts every style back when a reset is refused", async () => {
    stub(true);
    renderPage(
      <LineStylesProvider>
        <Probe />
      </LineStylesProvider>,
    );
    await screen.findByText("#0d9488 2");

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() => {
      expect(screen.getByTestId("average")).toHaveTextContent("#0d9488 2");
    });
  });

  it("draws the chart's own outside the provider, and keeps nothing", async () => {
    const fetched = stub();
    renderPage(<Probe />);

    await userEvent.click(screen.getByRole("button", { name: "Red" }));
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByTestId("average")).toHaveTextContent(
      `${CHART_LINES.sma_50.colour} ${String(CHART_LINES.sma_50.width)}`,
    );
    expect(fetched).not.toHaveBeenCalled();
  });
});
