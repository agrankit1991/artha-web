/** Tests for the bar of links to a page's sections. */

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionBar } from "./SectionBar";

afterEach(() => {
  vi.unstubAllGlobals();
});

const SECTIONS = [
  { id: "growth", label: "Growth" },
  { id: "trades", label: "Trades" },
];

function draw(): void {
  render(
    <>
      <SectionBar label="Sections" sections={SECTIONS} />
      <section id="growth" />
      <section id="trades" />
    </>,
  );
}

describe("SectionBar", () => {
  it("leads to each section, and marks none where the browser cannot watch them", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    draw();

    expect(screen.getByRole("link", { name: "Trades" })).toHaveAttribute("href", "#trades");
    expect(screen.getByRole("link", { name: "Growth" })).not.toHaveAttribute("aria-current");
  });

  it("marks the section being read, and stops watching when it goes", () => {
    let report: (entries: { isIntersecting: boolean; target: Element }[]) => void = () => undefined;
    const watched: string[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof report) {
          report = callback;
        }
        observe(element: Element): void {
          watched.push(element.id);
        }
        disconnect(): void {
          disconnect();
        }
      },
    );
    render(
      <>
        <SectionBar label="Sections" sections={[...SECTIONS, { id: "gone", label: "Gone" }]} />
        <section id="growth" />
        <section id="trades" />
      </>,
    );

    // A section with no element on the page is not watched.
    expect(watched).toEqual(["growth", "trades"]);
    act(() => {
      report([
        { isIntersecting: false, target: document.getElementById("growth") as Element },
        { isIntersecting: true, target: document.getElementById("trades") as Element },
      ]);
    });
    expect(screen.getByRole("link", { name: "Trades" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(screen.getByRole("link", { name: "Growth" })).not.toHaveAttribute("aria-current");
  });
});
