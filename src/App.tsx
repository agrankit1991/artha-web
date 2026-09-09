/**
 * Placeholder application shell.
 *
 * Exists to prove the deployed frontend can reach the API through the same
 * reverse proxy that serves it. Replace with real routing and views once the
 * platform exposes domain endpoints.
 */

import { useEffect, useState } from "react";

import { type Hello, fetchHello } from "./api/client";

type Status =
  { kind: "loading" } | { kind: "ready"; hello: Hello } | { kind: "failed"; reason: string };

export function App(): React.JSX.Element {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    // Guards against setting state after unmount, which React 19 still warns
    // about in development and which masks real errors in tests.
    let active = true;

    fetchHello()
      .then((hello) => {
        if (active) setStatus({ kind: "ready", hello });
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus({
            kind: "failed",
            reason: error instanceof Error ? error.message : "unknown error",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <h1>Artha Science</h1>
      {status.kind === "loading" && <p>Contacting the platform…</p>}
      {status.kind === "ready" && (
        <p>
          Connected to <strong>{status.hello.service}</strong> v{status.hello.version} —{" "}
          {status.hello.message}
        </p>
      )}
      {status.kind === "failed" && <p role="alert">Platform unreachable: {status.reason}</p>}
    </main>
  );
}
