export type UploadSettings = { enabled: boolean; patterns: string[] };
export const defaultUploadPatterns = [".DS_Store", "._*", "Thumbs.db", "desktop.ini", "__MACOSX", ".Spotlight-V100", ".Trashes"];

export function validateUploadSettings(value: unknown): UploadSettings {
  const input = value as Partial<UploadSettings> | null;
  if (!input || typeof input.enabled !== "boolean" || !Array.isArray(input.patterns) || input.patterns.length > 100 ||
      input.patterns.some(pattern => typeof pattern !== "string" || !pattern.trim() || pattern.trim().length > 128 ||
        /[/\\\u0000-\u001f\u007f]/.test(pattern) || [".",".."].includes(pattern.trim()))) throw new Error("Invalid upload settings");
  return {enabled:input.enabled,patterns:[...new Set(input.patterns.map(pattern => pattern.trim()))]};
}

/** Bounded wildcard matching without regular expressions or recursive backtracking. */
function matchesName(name: string, pattern: string): boolean {
  const chars = [...name.toLowerCase()], glob = [...pattern.toLowerCase()];
  let previous: boolean[] = Array(chars.length+1).fill(false);
  previous[0] = true;
  for (const token of glob) {
    const next: boolean[] = Array(chars.length+1).fill(false);
    next[0] = token === "*" && previous[0];
    for (let i=1;i<=chars.length;i++) next[i] = token === "*" ? previous[i] || next[i-1] : previous[i-1] && (token === "?" || token === chars[i-1]);
    previous = next;
  }
  return previous[chars.length];
}

/** Simple filename globs, applied to every path component, case-insensitively. */
export function isUploadIgnored(path: string, settings: UploadSettings): boolean {
  return settings.enabled && path.split("/").some(part => settings.patterns.some(pattern => matchesName(part,pattern)));
}
