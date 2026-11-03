import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("release metadata", () => {
  it("checks version/tag alignment and extracts only matching release notes", () => {
    const dir = mkdtempSync(join(tmpdir(), "sharelyze-release-"));
    try {
      mkdirSync(join(dir, ".github/scripts"), { recursive: true });
      copyFileSync(
        ".github/scripts/release-metadata.mjs",
        join(dir, ".github/scripts/release-metadata.mjs"),
      );
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ version: "1.2.3" }),
      );
      writeFileSync(
        join(dir, "package-lock.json"),
        JSON.stringify({
          version: "1.2.3",
          packages: { "": { version: "1.2.3" } },
        }),
      );
      writeFileSync(
        join(dir, "CHANGELOG.md"),
        "# Changelog\n\n## [1.2.3]\n\n- Current notes.\n\n## [1.2.2]\n\n- Old notes.\n",
      );
      const options = {
        cwd: dir,
        env: { ...process.env, RELEASE_TAG: "v1.2.3" },
        encoding: "utf8" as const,
      };
      expect(
        execFileSync(
          process.execPath,
          [".github/scripts/release-metadata.mjs", "--notes"],
          options,
        ).trim(),
      ).toBe("- Current notes.");
      expect(
        spawnSync(process.execPath, [".github/scripts/release-metadata.mjs"], {
          ...options,
          env: { ...options.env, RELEASE_TAG: "v1.2.4" },
        }).status,
      ).not.toBe(0);
      writeFileSync(
        join(dir, "CHANGELOG.md"),
        "# Changelog\n\n## [Unreleased]\n\n- Not a release.\n",
      );
      expect(
        spawnSync(
          process.execPath,
          [".github/scripts/release-metadata.mjs"],
          options,
        ).status,
      ).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
