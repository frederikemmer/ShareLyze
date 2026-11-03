import type { Request } from "express";

// Forwarded addresses are accepted only through Express' configured trust proxy policy.
export function visitorDetails(req: Request) {
  let referrer: string | null = null;
  try {
    const url = new URL(req.get("referer") || "");
    if (url.protocol === "http:" || url.protocol === "https:") referrer = url.origin.slice(0, 512);
  } catch { /* Missing or invalid referrer. */ }
  return [req.ip?.slice(0, 64) ?? null, req.get("user-agent")?.slice(0, 512) ?? null, referrer] as const;
}
