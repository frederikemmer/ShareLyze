import type Database from "better-sqlite3";
import type { Request } from "express";
import { randomBytes,randomUUID,createHash } from "node:crypto";
import { readCampaign, type Campaign, type ClientContext } from "../../shared/telemetry";
export type Visit={id:string;link_id:string;share_id:string;event_id:number|null;client_json:string|null;campaign_json:string;reports:number};
const hash=(token:string) => createHash("sha256").update(token).digest("hex");
export function createVisit(db:Database.Database,linkId:string,shareId:string,campaign:Campaign) {
  const token=randomBytes(32).toString("base64url"),id=randomUUID();
  db.prepare("DELETE FROM public_visits WHERE expires_at<=?").run(new Date().toISOString());
  db.prepare("INSERT INTO public_visits(token_hash,id,link_id,share_id,expires_at,campaign_json) VALUES(?,?,?,?,?,?)").run(hash(token),id,linkId,shareId,new Date(Date.now()+8*3600000).toISOString(),JSON.stringify(campaign));
  return {token,id};
}
export function getVisit(db:Database.Database,req:Request,linkId:string):Visit|undefined {
  const token=req.get("X-ShareLyze-Visit") || req.query.visit;
  if(typeof token!=="string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  return db.prepare("SELECT id,link_id,share_id,event_id,client_json,campaign_json,reports FROM public_visits WHERE token_hash=? AND link_id=? AND expires_at>?").get(hash(token),linkId,new Date().toISOString()) as Visit|undefined;
}
export function visitDetails(db:Database.Database,req:Request,linkId:string) {
  const visit=getVisit(db,req,linkId);
  return visit ? {visitId:visit.id,campaign:JSON.parse(visit.campaign_json) as Campaign,...(visit.client_json ? {client:JSON.parse(visit.client_json) as ClientContext} : {})} : {campaign:readCampaign(req.query)};
}

export function previousTransferAttempt(db:Database.Database,req:Request,linkId:string,itemId:string|undefined,path:string|undefined,kind:"download"|"zip") {
  const visit=getVisit(db,req,linkId);
  if(!visit) return null;
  const row=db.prepare("SELECT json_extract(details_json,'$.transfer.id') AS id,json_extract(details_json,'$.transfer.outcome') AS outcome FROM events WHERE link_id=? AND item_id IS ? AND file_path IS ? AND json_extract(details_json,'$.visitId')=? AND json_extract(details_json,'$.transfer.kind')=? AND json_extract(details_json,'$.transfer.outcome') IN ('completed','aborted','failed') ORDER BY events.id DESC LIMIT 1").get(linkId,itemId ?? null,path ?? null,visit.id,kind) as {id:string;outcome:string}|undefined;
  return row && row.outcome!=="completed" ? row.id : null;
}
