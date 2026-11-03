import { describe, it, expect } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  closeSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DirectoryLimitError,
  listSourceDirectory,
  openSourceFile,
} from "../src/storage";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";

describe.skipIf(process.platform !== "linux")(
  "Linux descriptor-based storage access",
  () => {
    it("opens regular files beneath the root and rejects traversal and symlinks", () => {
      const root = mkdtempSync(join(tmpdir(), "sharelyze-storage-"));
      try {
        mkdirSync(join(root, "folder"));
        writeFileSync(join(root, "folder", "file.txt"), "test");
        writeFileSync(join(root, "folder", "second.txt"), "test");
        expect(() => listSourceDirectory(root, "folder", 1)).toThrow(
          DirectoryLimitError,
        );
        expect(listSourceDirectory(root, "folder", 2)).toHaveLength(2);
        symlinkSync("/etc", join(root, "link"));
        symlinkSync("/etc/passwd", join(root, "file-link"));
        execFileSync("mkfifo", [join(root, "fifo")]);
        const fd = openSourceFile(root, "folder/file.txt");
        try {
          expect(readFileSync(fd, "utf8")).toBe("test");
        } finally {
          closeSync(fd);
        }
        for (const path of [
          "../etc/passwd",
          "/etc/passwd",
          "link/passwd",
          "file-link",
          "fifo",
          "folder",
          "folder//file.txt",
        ]) {
          expect(() => openSourceFile(root, path)).toThrow();
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
    it("never follows a symlink swapped into a source during concurrent opens", async () => {
      const base = mkdtempSync(join(tmpdir(), "sharelyze-race-"));
      const root = join(base, "root");
      mkdirSync(root);
      writeFileSync(join(root, "target"), "safe");
      writeFileSync(join(base, "outside"), "outside-secret");
      const script = `const fs=require('fs'),p=process.argv[1],outside=process.argv[2]; console.log('ready'); for(let i=0;i<2500;i++){let t=p+'.tmp';try{fs.unlinkSync(t)}catch{};if(i%2)fs.symlinkSync(outside,t);else fs.writeFileSync(t,'safe');fs.renameSync(t,p)}`;
      const child = spawn(
        process.execPath,
        ["-e", script, join(root, "target"), join(base, "outside")],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      try {
        await once(child.stdout!, "data");
        let reads = 0;
        for (let i = 0; i < 2500; i++) {
          try {
            const fd = openSourceFile(root, "target");
            try {
              expect(readFileSync(fd, "utf8")).toBe("safe");
              reads++;
            } finally {
              closeSync(fd);
            }
          } catch (error) {
            if (error instanceof Error && error.name === "AssertionError")
              throw error;
          }
        }
        expect(reads).toBeGreaterThan(0);
        const [code] = await once(child, "exit");
        expect(code).toBe(0);
      } finally {
        child.kill();
        rmSync(base, { recursive: true, force: true });
      }
    });
  },
);
