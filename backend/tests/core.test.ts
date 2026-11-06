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
    expect(db.pragma("user_version", { simple: true })).toBe(13);
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

it("migrates inactive external links to expired without activating shares", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "sharelyze-migration-"));
  try {
    const file = join(dir, "db.sqlite");
    const old = openDatabase(file);
    old.exec("INSERT INTO shares(id,title,created_at) VALUES('s','s','now'); INSERT INTO links(id,slug,target_url,active,created_at) VALUES('x','old','https://example.org',0,'now'); INSERT INTO links(id,slug,share_id,active,created_at) VALUES('y','share-test','s',0,'now'); ALTER TABLE links DROP COLUMN deleted_at; ALTER TABLE shares DROP COLUMN deleted_at; ALTER TABLE shares DROP COLUMN purged_at; PRAGMA user_version=10;");
    old.close();
    const migrated = openDatabase(file);
    expect(migrated.prepare("SELECT active,expires_at FROM links WHERE id='x'").get()).toEqual({active:1,expires_at:"1970-01-01T00:00:00.000Z"});
    expect(migrated.prepare("SELECT active,expires_at FROM links WHERE id='y'").get()).toEqual({active:0,expires_at:null});
    migrated.close();
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
