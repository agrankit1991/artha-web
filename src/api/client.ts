/**
 * Typed client for the artha-platform API.
 *
 * Hand-written for now because the surface is one endpoint. Once the API has
 * real breadth, generate this from the OpenAPI schema the backend already
 * publishes -- that turns the contract into a build artifact rather than
 * something two repositories must agree on by hand.
 */

/** Response from the platform's placeholder greeting endpoint. */
export interface Hello {
  message: string;
  service: string;
  version: string;
}

/** Raised when the API responds with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch JSON from the API, converting a failure status into an ApiError.
 *
 * Paths are relative so the same code works behind Caddy in production and
 * behind Vite's dev proxy locally; there is deliberately no configurable
 * base URL to get wrong.
 *
 * @param path - API path beginning with a slash, e.g. `/api/hello`.
 * @returns The parsed JSON body.
 * @throws {ApiError} If the response status is not 2xx.
 */
async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `GET ${path} failed with status ${String(response.status)}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Fetch the platform greeting, which identifies the service and its version.
 *
 * @returns The greeting payload.
 * @throws {ApiError} If the API is unreachable or returns a failure status.
 */
export function fetchHello(): Promise<Hello> {
  return getJson<Hello>("/api/hello");
}
