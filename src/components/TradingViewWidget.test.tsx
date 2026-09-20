/** Tests for the embedded TradingView widgets. */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TradingViewWidget } from "./TradingViewWidget";
import { ThemeProvider } from "@/lib/theme";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

function mount(settings: Record<string, unknown> = { locale: "en" }): HTMLElement {
  render(
    <ThemeProvider>
      <TradingViewWidget widget="market-overview" settings={settings} label="World markets" />
    </ThemeProvider>,
  );
  return screen.getByRole("region", { name: "World markets" });
}

/** The configuration the widget was mounted with. */
function configuration(holder: HTMLElement): Record<string, unknown> {
  const script = holder.querySelector("script");
  return JSON.parse(script?.innerHTML ?? "{}") as Record<string, unknown>;
}

describe("TradingViewWidget", () => {
  it("loads the embed TradingView publishes for that widget", () => {
    const holder = mount();

    expect(holder.querySelector("script")).toHaveAttribute(
      "src",
      "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js",
    );
  });

  it("passes its settings through to the widget", () => {
    const holder = mount({ locale: "en", showChart: true });

    expect(configuration(holder)).toMatchObject({ locale: "en", showChart: true });
  });

  it("asks for the theme the rest of the page is in", () => {
    // A widget keeping its own light palette on a dark page is the most
    // visible way an embed announces itself as somebody else's.
    window.localStorage.setItem("artha-theme", "dark");

    expect(configuration(mount())).toMatchObject({ colorTheme: "dark" });
  });

  it("names the panel for a reader who cannot see it", () => {
    // The widget itself is an iframe this side cannot describe.
    expect(mount()).toHaveAttribute("aria-label", "World markets");
  });

  it("leaves nothing behind when the page moves on", () => {
    // The embed replaces its own script with an iframe; left in place, a
    // second one appears beside it on every change.
    const { unmount } = render(
      <ThemeProvider>
        <TradingViewWidget widget="stock-heatmap" settings={{}} label="Heatmap" />
      </ThemeProvider>,
    );
    const holder = screen.getByRole("region", { name: "Heatmap" });
    expect(holder.querySelector("script")).not.toBeNull();

    unmount();

    expect(holder.querySelector("script")).toBeNull();
  });
});
