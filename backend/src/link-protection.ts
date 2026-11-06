import type { Request, Response, RequestHandler } from "express";
import type Database from "better-sqlite3";
import { verifyPassword } from "./auth";
import { visitorDetails } from "./analytics";

export function validateLinkProtection(body: Record<string, unknown>) {
  if (body.password !== undefined && (typeof body.password !== "string" || Buffer.byteLength(body.password) > 1024)) throw new Error("Invalid password");
  if (body.expiresAt !== undefined && body.expiresAt !== null && (typeof body.expiresAt !== "string" || !Number.isFinite(Date.parse(body.expiresAt)) || Date.parse(body.expiresAt) <= Date.now())) throw new Error("Invalid expiry");
}
export function linkAccess(db: Database.Database) {
  const find = (slug: string) => db.prepare("SELECT id,slug,target_url,password_hash FROM links WHERE (slug=? OR (case_sensitive=0 AND slug=? COLLATE NOCASE)) AND target_url IS NOT NULL AND active=1 AND (expires_at IS NULL OR expires_at>?)").get(slug, slug, new Date().toISOString()) as {id: string; slug: string; target_url: string; password_hash: string | null} | undefined;
  const redirect = (req: Request, res: Response, link: NonNullable<ReturnType<typeof find>>) => {
    db.prepare("INSERT INTO events(link_id,type,created_at,ip_address,user_agent,referrer_origin) VALUES (?,?,?,?,?,?)").run(link.id, "redirect", new Date().toISOString(), ...visitorDetails(req));
    res.redirect(302, link.target_url);
  };
  const prompt = (res: Response, slug: string, invalid = false) => {
    const action = `/api/link-access/${encodeURIComponent(slug)}`;
    res.status(invalid ? 401 : 200).type("html").send(`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Geschützter Kurzlink · ShareLyze</title><style>body{font:16px system-ui;background:#f3efe8;color:#1f1c16;margin:0;padding:24px}main{max-width:400px;margin:12vh auto}input,button{box-sizing:border-box;width:100%;padding:10px;border-radius:8px;margin-top:12px}input{border:1px solid #ccc4b8}button{border:0;background:#ff6b3d;color:white;font:inherit}p{color:#a73327}</style><main><h1>Passwort eingeben</h1><form method="post" action="${action}"><label for="password">Passwort</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024" autofocus>${invalid ? '<p role="alert">Das Passwort ist falsch.</p>' : ''}<button>Kurzlink öffnen</button></form></main></html>`);
  };
  const open: RequestHandler = (req, res) => {
    const link = find(String(req.params.slug));
    if (!link) { res.status(404).json({error:"Not found"}); return; }
    if (link.password_hash) prompt(res, link.slug); else redirect(req, res, link);
  };
  const unlock: RequestHandler = async (req, res) => {
    const link = find(String(req.params.slug));
    if (!link?.password_hash) {res.status(404).json({error:"Not found"}); return;}
    const password = req.body?.password;
    if (typeof password !== "string" || Buffer.byteLength(password) > 1024 || !await verifyPassword(password, link.password_hash)) {prompt(res, link.slug, true);return;}
    // Recheck expiry/status and password after the asynchronous verification.
    const current = find(link.slug);
    if (!current || current.password_hash !== link.password_hash) {res.status(404).json({error:"Not found"});return;}
    redirect(req, res, current);
  };
  return {open, unlock};
}
