/** Tests for where each screen lives. */

import { describe, expect, it } from "vitest";

import { companyPath, hitPath, newsPath, populationPath, slug } from "./paths";

describe("paths", () => {
  it("names a company by its NSE symbol, as the previous project did", () => {
    expect(companyPath("NSE_EQ|INE002A01018", "RELIANCE")).toBe("/company/RELIANCE");
    // An ampersand in a symbol must not end the path segment.
    expect(companyPath("NSE_EQ|INE101A01026", "M&M")).toBe("/company/M%26M");
  });

  it("names a BSE-only company by its ISIN, which no other company shares", () => {
    expect(companyPath("BSE_EQ|INE999Z01011", "SBIN")).toBe("/company/INE999Z01011");
  });

  it("names an index or a sector by a slug of its name", () => {
    expect(populationPath("index", "NSE_INDEX|Nifty 50")).toBe("/index/nifty-50");
    expect(populationPath("index", "BSE_INDEX|SENSEX")).toBe("/index/sensex");
    expect(populationPath("sector", "IT - Software")).toBe("/sector/it-software");
  });

  it("leads each kind of search hit to its page", () => {
    expect(hitPath({ kind: "company", key: "NSE_EQ|INE002A01018", label: "RELIANCE" })).toBe(
      "/company/RELIANCE",
    );
    expect(hitPath({ kind: "index", key: "NSE_INDEX|Nifty Bank", label: "Nifty Bank" })).toBe(
      "/index/nifty-bank",
    );
    expect(hitPath({ kind: "sector", key: "Banks", label: "Banks" })).toBe("/sector/banks");
    expect(hitPath({ kind: "fund", key: "120503", label: "Axis Bluechip" })).toBe("/fund/120503");
  });

  it("writes a slug without leading, trailing or doubled hyphens", () => {
    expect(slug("  Nifty  Alpha / Low-Vol 30 ")).toBe("nifty-alpha-low-vol-30");
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
