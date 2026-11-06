import { visitDetails } from "./visits";
import type { Request } from "express";
import type Database from "better-sqlite3";
import { UAParser, type IResult } from "ua-parser-js";
import { isBot, isAICrawler, isAIAssistant } from "ua-parser-js/bot-detection";
import { GeoIpService, normalizeIp } from "./geoip";
import type { VisitorSnapshot, AnalyticsEvent } from "../../shared/analytics";

const hints=["sec-ch-ua","sec-ch-ua-mobile","sec-ch-ua-platform","sec-ch-ua-full-version-list","sec-ch-ua-platform-version","sec-ch-ua-model","sec-ch-ua-arch","sec-ch-ua-bitness","sec-ch-ua-wow64"];
export const acceptClientHints=hints.join(", ");
const header=(req:Request,key:string,length=512) => req.get(key)?.slice(0,length) || null;
// Only addresses accepted by Express' trust proxy policy; no arbitrary forwarded headers.
export function visitorDetails(req:Request) {
  let referrer:string|null=null;
  try {const url=new URL(req.get("referer") || "");if(["http:","https:"].includes(url.protocol)) referrer=url.origin.slice(0,512);} catch {}
  return [normalizeIp(req.ip).address,header(req,"user-agent",1024),referrer] as const;
}
export function visitorSnapshot(req:Request,geoIp:GeoIpService):VisitorSnapshot {
  const ua=header(req,"user-agent",1024) || "";
  const clientHints=Object.fromEntries(hints.flatMap(key => {const value=header(req,key);return value ? [[key,value]] : [];}));
  // UAParser uses supplied HTTP Client Hints synchronously in Node; no browser APIs/network.
  const parsed=new UAParser(ua,clientHints).getResult().withClientHints() as IResult;
  const ip=normalizeIp(req.ip);
  return {
    version:1,
    agent:{browser:parsed.browser.name || null,browserVersion:parsed.browser.version || null,os:parsed.os.name || null,osVersion:parsed.os.version || null,device:parsed.device.type || (parsed.browser.name && parsed.os.name ? "desktop" : null),vendor:parsed.device.vendor || null,model:parsed.device.model || null,architecture:parsed.cpu.architecture || null,engine:parsed.engine.name || null,engineVersion:parsed.engine.version || null,bot:isBot(ua),aiCrawler:isAICrawler(ua),aiAssistant:isAIAssistant(ua)},
    network:{family:ip.family,scope:ip.scope,peerIp:normalizeIp(req.socket.remoteAddress).address,proxyChain:req.ips.slice(0,16).map(address => normalizeIp(address).address).filter((address):address is string => !!address),protocol:req.protocol,httpVersion:req.httpVersion},
    request:{method:req.method,path:req.path.slice(0,512),language:header(req,"accept-language"),range:header(req,"range",128),fetchSite:header(req,"sec-fetch-site",64),fetchMode:header(req,"sec-fetch-mode",64),fetchDest:header(req,"sec-fetch-dest",64),prefetch:/prefetch|prerender/i.test(req.get("sec-purpose") || req.get("purpose") || "")},
    clientHints,geo:geoIp.lookup(ip.address || ""),
  };
}
export type EventTarget={linkId:string;shareId?:string;itemId?:string;filePath?:string;type:string;details?:Partial<VisitorSnapshot>};
export function recordEvent(db:Database.Database,req:Request,target:EventTarget,geoIp:GeoIpService) {
  return db.prepare("INSERT INTO events(link_id,share_id,item_id,type,created_at,file_path,ip_address,user_agent,referrer_origin,details_json) VALUES(?,?,?,?,?,?,?,?,?,?)").run(target.linkId,target.shareId ?? null,target.itemId ?? null,target.type,new Date().toISOString(),target.filePath ?? null,...visitorDetails(req),JSON.stringify({...visitorSnapshot(req,geoIp),...visitDetails(db,req,target.linkId),...target.details}));
}
export function decodeEvent(row:any):AnalyticsEvent {
  let details:VisitorSnapshot|null=null;
  try {details=row.details_json ? JSON.parse(row.details_json) : null;} catch {}
  const {details_json,...rest}=row;
  return {...rest,details};
}
