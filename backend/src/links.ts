import { randomBytes } from "node:crypto";

const reserved = new Set([
  "admin",
  "api",
  "assets",
  "health",
  "login",
  "setup",
  "share",
  "r",
  "favicon.ico",
]);

/** Slugs are ASCII and never occupy application routes, regardless of case. */
export function normalizeSlug(value: string, preserveCase = false): string {
  const slug = preserveCase ? value.trim() : value.trim().toLowerCase();
  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/i.test(slug) ||
    reserved.has(slug.toLowerCase())
  ) {
    throw new Error("Invalid or reserved slug");
  }
  return slug;
}

export function randomSlug(): string {
  return randomBytes(16).toString("hex");
}

export function externalUrl(value: string): string {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid redirect URL");
  }
  return url.href;
}
