/** Tests for telling the platform which page was opened. */

import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubPlatform } from "@/test/support";

import { useRecordPageViews } from "./useRecordPageViews";

function Recorded(): React.JSX.Element {
  useRecordPageViews();
  return <Link to="/breadth?window=5y">Breadth</Link>;
}

/** The pages recorded so far, in order. */
function recorded(fetchMock: ReturnType<typeof stubPlatform>): string[] {
  return fetchMock.mock.calls
    .filter((call) => String(call[0]) === "/api/page-views")
    .map((call) => (JSON.parse((call[1] as RequestInit).body as string) as { path: string }).path);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRecordPageViews", () => {
  it("records the page arrived on, and each one moved to, without its query", async () => {
    const fetchMock = stubPlatform({ "/api/page-views": { status: 204 } });
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Recorded />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(recorded(fetchMock)).toEqual(["/"]);
    });

    await userEvent.click(getByRole("link", { name: "Breadth" }));

    await waitFor(() => {
      expect(recorded(fetchMock)).toEqual(["/", "/breadth"]);
    });
  });

  it("carries on quietly when the platform cannot record it", async () => {
    const fetchMock = stubPlatform({ "/api/page-views": { status: 500 } });

    const { getByRole } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Recorded />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(recorded(fetchMock)).toEqual(["/"]);
    });
    expect(getByRole("link", { name: "Breadth" })).toBeInTheDocument();
  });
});
