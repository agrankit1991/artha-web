/** Tests for the application shell's three states. */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Replace global fetch with a stub returning the given response. */
function stubFetch(response: Partial<Response>): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

describe("App", () => {
  it("shows the service and version once the platform answers", async () => {
    stubFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          message: "Artha Science is running.",
          service: "artha-platform",
          version: "0.1.0",
        }),
    });

    render(<App />);

    expect(await screen.findByText(/artha-platform/)).toBeInTheDocument();
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
  });

  it("reports a failure status rather than rendering an empty page", async () => {
    // A silent blank page is the failure mode worth guarding against: it is
    // indistinguishable from a deploy that did not take effect.
    stubFetch({ ok: false, status: 503 });

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/503/);
  });

  it("still reports a failure when the rejection is not an Error", async () => {
    // fetch can reject with anything; a thrown string must not crash the
    // shell or leave it stuck on the loading message.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network unreachable"));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unknown error/);
  });
});
