import {
  constants,
  closeSync,
  fstatSync,
  openSync,
  opendirSync,
} from "node:fs";

/** Linux only; roots and their ancestors must be trusted deployment configuration. */
function openBeneath(
  root: string,
  relativePath: string,
  directory: boolean,
): number {
  if (process.platform !== "linux")
    throw new Error("Secure source access requires Linux");
  if (relativePath.startsWith("/") || relativePath.includes("\0"))
    throw new Error("Invalid path");
  const parts = relativePath ? relativePath.split("/") : [];
  if (parts.some((part) => !part || part === "." || part === ".."))
    throw new Error("Invalid path");
  let current = openSync(
    root,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  );
  try {
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      // O_PATH inspects the final inode without opening a device/FIFO for I/O.
      // Node does not expose Linux O_PATH as a constant.
      const flags =
        isLast && !directory
          ? 0x200000 | constants.O_NOFOLLOW
          : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_DIRECTORY;
      const next = openSync(`/proc/self/fd/${current}/${parts[i]}`, flags);
      closeSync(current);
      current = next;
    }
    const stat = fstatSync(current);
    if (directory ? !stat.isDirectory() : !stat.isFile())
      throw new Error("Invalid file type");
    if (!directory)
      return openSync(
        `/proc/self/fd/${current}`,
        constants.O_RDONLY | constants.O_NONBLOCK,
      );
    const result = current;
    current = -1;
    return result;
  } finally {
    if (current !== -1) closeSync(current);
  }
}
export function openSourceFile(root: string, relativePath: string): number {
  if (!relativePath) throw new Error("Invalid path");
  return openBeneath(root, relativePath, false);
}
export class DirectoryLimitError extends Error {}
/** Snapshot of accessible regular files, using the same no-symlink traversal as downloads. */
export async function measureSourceItem(root: string, relativePath: string, kind: "file" | "directory", signal?: AbortSignal): Promise<{ fileCount: number; totalBytes: number }> {
  const pending = [{ path: relativePath, kind }];
  let fileCount = 0, totalBytes = 0, visited = 0;
  while (pending.length) {
    if (signal?.aborted) throw new Error("Measurement cancelled");
    const item = pending.pop()!;
    if (++visited > 100000) throw new DirectoryLimitError("Too many entries");
    if (item.kind === "file") {
      const fd = openSourceFile(root, item.path);
      try { totalBytes += fstatSync(fd).size; fileCount++; } finally { closeSync(fd); }
    } else {
      const children = listSourceDirectory(root, item.path);
      if (visited + pending.length + children.length > 100000) throw new DirectoryLimitError("Too many entries");
      for (const child of children) pending.push({ path: [item.path, child.name].filter(Boolean).join("/"), kind: child.kind });
    }
    if (visited % 100 === 0) await new Promise<void>(resolve => setImmediate(resolve));
  }
  return { fileCount, totalBytes };
}
export function listSourceDirectory(
  root: string,
  relativePath = "",
  limit = 10000,
): { name: string; kind: "file" | "directory" }[] {
  const fd = openBeneath(root, relativePath, true);
  try {
    const dir = opendirSync(`/proc/self/fd/${fd}`, { bufferSize: 128 });
    const entries: { name: string; kind: "file" | "directory" }[] = [];
    let seen = 0;
    try {
      for (let entry = dir.readSync(); entry; entry = dir.readSync()) {
        if (++seen > limit)
          throw new DirectoryLimitError("Directory contains too many entries");
        if (entry.isFile() || entry.isDirectory())
          entries.push({
            name: entry.name,
            kind: entry.isDirectory() ? "directory" : "file",
          });
      }
    } finally {
      dir.closeSync();
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  } finally {
    closeSync(fd);
  }
}
