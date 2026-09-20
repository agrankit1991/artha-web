/** Tests for fetching one thing, and the three states that implies. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { useResource } from "./useResource";

function Probe({ fetcher }: { fetcher: () => Promise<string> }): React.JSX.Element {
  const stable = useCallback(fetcher, [fetcher]);
  const { data, loading, error, unauthorised, reload } = useResource(stable);
  return (
    <div>
      <span data-testid="state">
        {loading ? "loading" : (error ?? data ?? "nothing")}
        {unauthorised ? " (sign in)" : ""}
      </span>
      <button type="button" onClick={reload}>
        reload
      </button>
    </div>
  );
}

describe("useResource", () => {
  it("reports loading, then what arrived", async () => {
    render(<Probe fetcher={() => Promise.resolve("the answer")} />);

    expect(screen.getByTestId("state")).toHaveTextContent("loading");
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("the answer");
    });
  });

  it("reports the platform's own explanation when it fails", async () => {
    render(<Probe fetcher={() => Promise.reject(new Error("that invitation is not valid"))} />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("that invitation is not valid");
    });
  });

  it("says something went wrong when the failure is not an error", async () => {
    // A rejection that is not an Error -- a string thrown from somewhere in
    // the stack -- must not read as an empty message on screen.
    const throwsAString = (): Promise<string> =>
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the point of the test
      Promise.reject("a string");
    render(<Probe fetcher={throwsAString} />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("something went wrong");
    });
  });

  it("separates needing to sign in from anything else", async () => {
    // One means show the sign-in page; the other means show the failure.
    render(<Probe fetcher={() => Promise.reject(new ApiError(401, "not signed in"))} />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("(sign in)");
    });
  });

  it("ignores a failure from a request it has moved on from", async () => {
    // The same rule as for a late success: a screen that has gone should
    // not raise an error about a request nobody is waiting for.
    let fail: (reason: Error) => void = () => undefined;
    const slow = (): Promise<string> =>
      new Promise((_resolve, reject) => {
        fail = reject;
      });

    const { unmount } = render(<Probe fetcher={slow} />);
    unmount();
    fail(new Error("too late"));

    await waitFor(() => {
      expect(screen.queryByTestId("state")).not.toBeInTheDocument();
    });
  });

  it("fetches again when asked", async () => {
    const fetcher = vi.fn().mockResolvedValue("the answer");
    render(<Probe fetcher={fetcher} />);
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("the answer");
    });

    await userEvent.click(screen.getByRole("button", { name: "reload" }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it("ignores the answer to a request it has moved on from", async () => {
    // Two scope changes in quick succession must not leave the first one's
    // answer on screen -- which is what happens if a late reply is applied.
    let release: (value: string) => void = () => undefined;
    const slow = (): Promise<string> =>
      new Promise((resolve) => {
        release = resolve;
      });

    const { unmount } = render(<Probe fetcher={slow} />);
    unmount();
    release("too late");

    await waitFor(() => {
      expect(screen.queryByTestId("state")).not.toBeInTheDocument();
    });
  });
});
