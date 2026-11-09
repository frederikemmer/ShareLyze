import { isIP } from "node:net";
import type Database from "better-sqlite3";

export function validateTrustedProxies(input: unknown): string[] {
  if (!Array.isArray(input) || input.length > 100) throw new Error("Invalid proxy list");
  return input.map((entry: unknown) => {
    if (typeof entry !== "string" || entry.length > 100 || entry !== entry.trim()) throw new Error("Invalid proxy address");
    const parts = entry.split("/");
    const family = isIP(parts[0]);
    if (!family || parts.length > 2) throw new Error("Invalid proxy address");
    if (parts.length === 2 && (!/^[0-9]+$/.test(parts[1]) || Number(parts[1]) < 1 || Number(parts[1]) > (family === 4 ? 32 : 128))) throw new Error("Invalid proxy prefix");
    return entry;
  });
}

export function getTrustedProxies(db: Database.Database): string[] {
  const row = db.prepare("SELECT value FROM settings WHERE key='trusted_proxies'").get() as {value:string}|undefined;
  return row ? validateTrustedProxies(JSON.parse(row.value)) : [];
}
