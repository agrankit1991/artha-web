/** Tests for where each screen lives. */

import { describe, expect, it } from "vitest";

import { companyPath, newsPath, populationPath } from "./paths";

describe("paths", () => {
  it("encodes a key that carries a bar and spaces", () => {
    // `NSE_INDEX|Nifty 50` laid into a path raw would be a different path
    // from the one the router matches.
    expect(populationPath("index", "NSE_INDEX|Nifty 50")).toBe("/index/NSE_INDEX%7CNifty%2050");
    expect(companyPath("NSE_EQ|INE002A01018")).toBe("/company/NSE_EQ%7CINE002A01018");
  });

  it("is the plain feed when no company is asked for", () => {
    expect(newsPath()).toBe("/news");
  });

  it("carries the company and what it is called", () => {
    // The feed shows what it is filtered to, and a page arriving with only
    // a key would print the key at a reader.
    expect(newsPath("NSE_EQ|INE002A01018", "RELIANCE")).toBe(
      "/news?instrument=NSE_EQ%7CINE002A01018&symbol=RELIANCE",
    );
  });

  it("carries the company alone when nothing named it", () => {
    expect(newsPath("NSE_EQ|INE002A01018")).toBe("/news?instrument=NSE_EQ%7CINE002A01018");
  });
});
