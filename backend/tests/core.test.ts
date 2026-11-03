import { describe, expect, it } from "vitest";
import { normalizeSlug, externalUrl, randomSlug } from "../src/links";
import { parseRange } from "../src/range";
import { openDatabase } from "../src/database";

describe("link validation", () => {
  it("normalizes names and rejects reserved and unsafe values", () => {
    expect(normalizeSlug(" Wedding-Photos ")).toBe("wedding-photos");
    for (const s of ["api", "../admin", "-invalid", "a/b", ""])
      expect(() => normalizeSlug(s)).toThrow();
    expect(randomSlug()).toMatch(/^[a-f0-9]{32}$/);
  });
  it("permits only external http(s) links without credentials", () => {
    expect(externalUrl("https://example.org/path")).toBe(
      "https://example.org/path",
    );
    for (const s of [
      "javascript:alert(1)",
      "file:///etc/passwd",
      "https://a:b@example.org",
    ])
      expect(() => externalUrl(s)).toThrow();
  });
});

describe("HTTP range parser", () => {
  it("handles bounded, open and suffix ranges", () => {
    expect(parseRange("bytes=2-5", 10)).toEqual({ start: 2, end: 5 });
    expect(parseRange("bytes=8-", 10)).toEqual({ start: 8, end: 9 });
    expect(parseRange("bytes=-20", 10)).toEqual({ start: 0, end: 9 });
  });
  it("rejects unsatisfiable, malformed and multiple ranges", () => {
    for (const r of [
      "bytes=10-",
      "bytes=4-3",
      "bytes=-0",
      "bytes=0-1,3-4",
      "bytes=9007199254740992-",
    ])
      expect(parseRange(r, 10)).toBeNull();
    expect(parseRange("bytes=0-", 0)).toBeNull();
  });
});

describe("database migration", () => {
  it("creates constrained tables and refuses links with two targets", () => {
    const db = openDatabase(":memory:");
    expect(db.pragma("user_version", { simple: true })).toBe(6);
    expect(() =>
      db
        .prepare(
          "INSERT INTO links(id,slug,created_at) VALUES ('1','example','now')",
        )
        .run(),
    ).toThrow();
    db.close();
  });
});
