import { randomInt } from "node:crypto";
import type Database from "better-sqlite3";
import { normalizeSlug } from "./links";

export type SlugSettings = { length: number; alphabet: "letters" | "alphanumeric"; letterCase: "lower" | "upper" | "mixed"; caseSensitive: boolean; avoidAmbiguous: boolean };
export const defaultSlugSettings: SlugSettings = { length: 6, alphabet: "alphanumeric", letterCase: "upper", caseSensitive: false, avoidAmbiguous: true };
export function validateSlugSettings(value: unknown): SlugSettings {
  const s = value as SlugSettings;
  if (!s || !Number.isInteger(s.length) || s.length < 4 || s.length > 64 || !["letters","alphanumeric"].includes(s.alphabet) || !["lower","upper","mixed"].includes(s.letterCase) || typeof s.caseSensitive !== "boolean" || typeof s.avoidAmbiguous !== "boolean") throw new Error("Invalid slug settings");
  return {length:s.length, alphabet:s.alphabet, letterCase:s.letterCase, caseSensitive:s.caseSensitive, avoidAmbiguous:s.avoidAmbiguous};
}
export function getSlugSettings(db: Database.Database): SlugSettings {
  const row = db.prepare("SELECT value FROM settings WHERE key='slug_defaults'").get() as {value:string} | undefined;
  return row ? validateSlugSettings(JSON.parse(row.value)) : {...defaultSlugSettings};
}
export function suggestSlug(db: Database.Database): string {
  const settings = getSlugSettings(db);
  const lower = "abcdefghijklmnopqrstuvwxyz", upper = lower.toUpperCase();
  let alphabet = settings.letterCase === "lower" ? lower : settings.letterCase === "upper" ? upper : lower + upper;
  if (settings.alphabet === "alphanumeric") alphabet += "0123456789";
  if (settings.avoidAmbiguous) alphabet = alphabet.replace(/[0Ool1Ii]/g, "");
  for (let attempt=0; attempt<100; attempt++) {
    const slug = Array.from({length:settings.length}, () => alphabet[randomInt(alphabet.length)]).join("");
    try { normalizeSlug(slug, true); } catch { continue; }
    if (!db.prepare("SELECT 1 FROM links WHERE lower(slug)=lower(?)").get(slug)) return slug;
  }
  throw new Error("No available slug");
}
