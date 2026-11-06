import QRCode from "qrcode";
import { readCampaign,campaignKeys } from "../../shared/telemetry";
import { Router, type Request, type RequestHandler } from "express";
import type Database from "better-sqlite3";
import { Readable } from "node:stream";
import { eventLabels } from "../../shared/analytics";
import { decodeEvent } from "./analytics";
import { GeoIpService } from "./geoip";

function filters(req:Request, extraKeys:string[]=[]) {
  if(Object.keys(req.query).some(key => !["slug","type","from","to","traffic","q","cursor","since","until","source","medium","campaign",...extraKeys].includes(key))) throw new Error("Unknown filter");
  const where:string[]=["1=1"], params:(string|number)[]=[];
  const value=(key:string) => {
    if(req.query[key]===undefined) return "";
    if(typeof req.query[key]!=="string" || (req.query[key] as string).length>256) throw new Error("Invalid filter");
    return req.query[key] as string;
  };
  const slug=value("slug"), type=value("type"), from=value("from"), to=value("to"), traffic=value("traffic"), search=value("q");
  if(slug) {where.push("l.slug=?");params.push(slug);}
  for(const [key,field] of [["source","utm_source"],["medium","utm_medium"],["campaign","utm_campaign"]] as const) {const term=value(key);if(term) {where.push("json_extract(e.details_json,'$.campaign."+field+"')=?");params.push(term);}}
  if(type) {if(!eventLabels[type]) throw new Error("Invalid type");where.push("e.type=?");params.push(type);}
  for(const [date,op,add] of [[from,">=",0],[to,"<",86400000]] as const) if(date) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date) throw new Error("Invalid date");
    where.push("e.created_at"+op+"?");params.push(new Date(Date.parse(date)+add).toISOString());
  }
  if(from && to && from>to) throw new Error("Invalid period");
  const since=value("since"), until=value("until");
  for(const [stamp,op] of [[since,">="],[until,"<"]] as const) if(stamp) {
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(stamp) || !Number.isFinite(Date.parse(stamp)) || new Date(stamp).toISOString()!==stamp) throw new Error("Invalid timestamp");
    where.push("e.created_at"+op+"?");params.push(stamp);
  }
  if(since && until && since>=until) throw new Error("Invalid interval");
  if(traffic && !["all","human","bots"].includes(traffic)) throw new Error("Invalid traffic");
  const bot="(COALESCE(json_extract(e.details_json,'$.agent.bot'),0)=1 OR COALESCE(json_extract(e.details_json,'$.request.prefetch'),0)=1)";
  if(traffic==="bots") where.push(bot);
  if(traffic==="human") where.push("e.details_json IS NOT NULL AND NOT "+bot);
  if(search) {where.push("instr(lower(COALESCE(e.ip_address,'') || ' ' || COALESCE(e.user_agent,'') || ' ' || COALESCE(e.referrer_origin,'') || ' ' || COALESCE(e.details_json,'')),lower(?))>0");params.push(search);}
  return {where:where.join(" AND "),params};
}
const base="FROM events e LEFT JOIN links l ON l.id=e.link_id";
export function analyticsRouter(db:Database.Database,admin:RequestHandler,geoIp:GeoIpService,publicOrigin:string) {
  const router=Router();
  router.post("/api/analytics/campaign-link",admin,async (req,res) => {
    const body=req.body,slug=body?.slug;
    if(typeof slug!=="string" || slug.length>128 || !body || campaignKeys.some(key => body[key]!==undefined && (typeof body[key]!=="string" || body[key].length>100 || /[\u0000-\u001f\u007f]/.test(body[key])))) {res.status(400).json({error:"Invalid campaign"});return;}
    const link=db.prepare("SELECT slug FROM links WHERE slug=? AND deleted_at IS NULL").get(slug) as {slug:string}|undefined;
    if(!link) {res.sendStatus(404);return;}
    const setting=db.prepare("SELECT value FROM settings WHERE key='public_link_origin'").get() as {value:string}|undefined;
    const url=new URL("/"+encodeURIComponent(link.slug),setting?.value || publicOrigin);
    url.search=new URLSearchParams(readCampaign(body)).toString();
    if(Buffer.byteLength(url.toString())>1800) {res.status(400).json({error:"Campaign URL too long for QR code"});return;}
    const qrDataUrl=await QRCode.toDataURL(url.toString(),{width:512,margin:4,errorCorrectionLevel:"M"});
    res.json({url:url.toString(),qrDataUrl});
  });
  router.get("/api/geoip",admin,(_req,res) => res.json(geoIp.status));
  router.post("/api/geoip/update",admin,(_req,res) => {
    if(!geoIp.directory) {res.status(503).json({error:"GeoIP storage unavailable"});return;}
    void geoIp.update();
    res.status(202).json(geoIp.status);
  });
  // Dedicated complete time series: never use the legacy 730-group top list for cumulative totals.
  router.get("/api/analytics/timeline",admin,(req,res) => {
    try {
      const {where,params}=filters(req,["resolution"]);
      const resolution=req.query.resolution ?? "day";
      if(!["day","hour","minute"].includes(String(resolution)) || typeof resolution!=="string") throw new Error();
      if(typeof req.query.from!=="string" || typeof req.query.to!=="string" || !req.query.from || !req.query.to) throw new Error();
      const from=new Date(req.query.from).toISOString(), to=new Date(Date.parse(req.query.to)+86400000).toISOString();
      const duration=Date.parse(to)-Date.parse(from);
      if(duration<=0 || duration>366*86400000 || (resolution!=="day" && duration>86400000)) throw new Error();
      const expression=resolution==="day" ? "substr(e.created_at,1,10)||'T00:00:00.000Z'" : resolution==="hour" ? "substr(e.created_at,1,13)||':00:00.000Z'" : "substr(e.created_at,1,16)||':00.000Z'";
      const rows=db.prepare("SELECT "+expression+" AS bucket,e.type,count(*) AS count "+base+" WHERE "+where+" GROUP BY bucket,e.type ORDER BY bucket,e.type").all(...params);
      res.json({from,to,resolution,rows});
    } catch {res.status(400).json({error:"Invalid timeline range (maximum 366 days, hourly/minutely maximum one UTC day)"});}
  });
  router.get("/api/analytics/report",admin,(req,res) => {
    let filter;
    try {filter=filters(req);} catch {res.status(400).json({error:"Invalid analytics filter"});return;}
    const {where,params}=filter;
    // GROUP BY must be appended after WHERE; keep all aggregates over the same complete selection.
    const group=(expression:string,limit=10) => db.prepare("SELECT COALESCE(NULLIF("+expression+",''),'Unbekannt') AS label,count(*) AS count "+base+" WHERE "+where+" GROUP BY label ORDER BY count DESC,label LIMIT "+limit).all(...params);
    res.json({
      counts:db.prepare("SELECT e.type,count(*) AS count "+base+" WHERE "+where+" GROUP BY e.type").all(...params),
      total:(db.prepare("SELECT count(*) AS count "+base+" WHERE "+where).get(...params) as {count:number}).count,
      daily:db.prepare("SELECT substr(e.created_at,1,10) AS day,e.type,count(*) AS count "+base+" WHERE "+where+" GROUP BY day,e.type ORDER BY day DESC LIMIT 730").all(...params),
      hourly:group("substr(e.created_at,12,2)",24),
      visitHeatmap:db.prepare("SELECT CAST(strftime('%w',e.created_at) AS INTEGER) AS weekday,CAST(substr(e.created_at,12,2) AS INTEGER) AS hour,count(*) AS count "+base+" WHERE "+where+" AND e.type IN ('view','redirect') GROUP BY weekday,hour ORDER BY weekday,hour").all(...params),
      heatmap:db.prepare("SELECT CAST(strftime('%w',e.created_at) AS INTEGER) AS weekday,CAST(substr(e.created_at,12,2) AS INTEGER) AS hour,count(*) AS count "+base+" WHERE "+where+" GROUP BY weekday,hour ORDER BY weekday,hour").all(...params),
      transfers:db.prepare("SELECT json_extract(e.details_json,'$.transfer.kind') AS kind,json_extract(e.details_json,'$.transfer.outcome') AS outcome,count(*) AS count,sum(json_extract(e.details_json,'$.transfer.bytes')) AS bytes,sum(json_extract(e.details_json,'$.transfer.durationMs')) AS durationMs FROM events e LEFT JOIN links l ON l.id=e.link_id WHERE "+where+" AND json_extract(e.details_json,'$.transfer.outcome') IN ('completed','aborted','failed') GROUP BY kind,outcome").all(...params),
      quality:db.prepare("SELECT json_extract(e.details_json,'$.quality.origin') AS origin,json_extract(e.details_json,'$.quality.resource') AS resource,count(*) AS count,avg(json_extract(e.details_json,'$.quality.durationMs')) AS durationMs,avg(json_extract(e.details_json,'$.quality.ttfbMs')) AS ttfbMs "+base+" WHERE "+where+" AND json_extract(e.details_json,'$.quality.durationMs') IS NOT NULL GROUP BY origin,resource").all(...params),
      errors:db.prepare("SELECT e.type,json_extract(e.details_json,'$.diagnostic.code') AS code,COALESCE(json_extract(e.details_json,'$.agent.device'),'unknown') AS device,COALESCE(json_extract(e.details_json,'$.agent.os'),'unknown') AS os,COALESCE(json_extract(e.details_json,'$.agent.browser'),'unknown') AS browser,COALESCE(json_extract(e.details_json,'$.geo.organization'),'unknown') AS network,COALESCE(json_extract(e.details_json,'$.fileType'),json_extract(e.details_json,'$.quality.fileType'),'unknown') AS fileType,count(*) AS count "+base+" WHERE "+where+" AND json_extract(e.details_json,'$.diagnostic.code') IS NOT NULL GROUP BY e.type,code,device,os,browser,network,fileType ORDER BY count DESC LIMIT 100").all(...params),
      performanceByClient:db.prepare("SELECT json_extract(e.details_json,'$.quality.origin') AS origin,json_extract(e.details_json,'$.quality.resource') AS resource,COALESCE(json_extract(e.details_json,'$.agent.device'),'unknown') AS device,COALESCE(json_extract(e.details_json,'$.agent.os'),'unknown') AS os,COALESCE(json_extract(e.details_json,'$.agent.browser'),'unknown') AS browser,COALESCE(json_extract(e.details_json,'$.geo.organization'),'unknown') AS network,COALESCE(json_extract(e.details_json,'$.quality.fileType'),'unknown') AS fileType,count(*) AS count,avg(json_extract(e.details_json,'$.quality.durationMs')) AS durationMs "+base+" WHERE "+where+" AND json_extract(e.details_json,'$.quality.durationMs') IS NOT NULL GROUP BY origin,resource,device,os,browser,network,fileType ORDER BY count DESC LIMIT 100").all(...params),
      context:{
        initialViews:db.prepare("SELECT COALESCE(json_extract(e.details_json,'$.client.view'),'Unbekannt') AS label,count(*) AS count "+base+" WHERE "+where+" AND e.type='view' GROUP BY label ORDER BY count DESC").all(...params),
        viewChanges:db.prepare("SELECT json_extract(e.details_json,'$.client.view') AS label,count(*) AS count "+base+" WHERE "+where+" AND e.type='view_change' GROUP BY label ORDER BY count DESC").all(...params),
        themes:db.prepare("SELECT COALESCE(json_extract(e.details_json,'$.client.colorScheme'),'Unbekannt') AS label,count(*) AS count "+base+" WHERE "+where+" AND e.type='view' GROUP BY label ORDER BY count DESC").all(...params),
        regions:db.prepare("SELECT COALESCE(json_extract(e.details_json,'$.client.timeZone'),'Unbekannt') AS timeZone,COALESCE(json_extract(e.details_json,'$.geo.country'),'Unbekannt') AS country,e.ip_address AS ip,count(*) AS count "+base+" WHERE "+where+" AND e.type IN ('view','redirect') GROUP BY timeZone,country,ip ORDER BY count DESC LIMIT 100").all(...params),
        touch:db.prepare("SELECT COALESCE(json_extract(e.details_json,'$.agent.device'),'unknown') AS device,COALESCE(json_extract(e.details_json,'$.agent.os'),'unknown') AS os,CASE WHEN json_extract(e.details_json,'$.client.touchPoints') IS NULL THEN 'Unbekannt' WHEN json_extract(e.details_json,'$.client.touchPoints')>0 THEN 'Touch' ELSE 'Ohne Touch' END AS touch,count(*) AS count "+base+" WHERE "+where+" AND e.type='view' GROUP BY device,os,touch ORDER BY count DESC LIMIT 100").all(...params),
      },
      campaigns:db.prepare("SELECT COALESCE(json_extract(e.details_json,'$.campaign.utm_source'),'Ohne Kennzeichnung') AS source,COALESCE(json_extract(e.details_json,'$.campaign.utm_medium'),'') AS medium,COALESCE(json_extract(e.details_json,'$.campaign.utm_campaign'),'') AS campaign,COALESCE(json_extract(e.details_json,'$.campaign.utm_content'),'') AS content,sum(CASE WHEN e.type IN ('view','redirect') THEN 1 ELSE 0 END) AS views,sum(CASE WHEN e.type IN ('download_start','zip_start') THEN 1 ELSE 0 END) AS downloads,sum(CASE WHEN e.type IN ('transfer_finished','zip_finished') THEN 1 ELSE 0 END) AS completed "+base+" WHERE "+where+" GROUP BY source,medium,campaign,content HAVING views+downloads+completed>0 ORDER BY views DESC LIMIT 100").all(...params),
      files:db.prepare("SELECT COALESCE(l.slug,'historisch') AS slug,i.relative_path,e.file_path,count(*) AS count "+base+" LEFT JOIN share_items i ON i.id=e.item_id WHERE "+where+" AND e.type='download_start' GROUP BY e.link_id,e.item_id,e.file_path ORDER BY count DESC LIMIT 100").all(...params),
      dimensions:{
        countries:group("json_extract(e.details_json,'$.geo.country')"),
        cities:group("json_extract(e.details_json,'$.geo.city')"),
        browsers:group("json_extract(e.details_json,'$.agent.browser')"),
        systems:group("json_extract(e.details_json,'$.agent.os')"),
        devices:group("json_extract(e.details_json,'$.agent.device')"),
        networks:group("json_extract(e.details_json,'$.geo.organization')"),
        referrers:group("e.referrer_origin"),
        ips:group("e.ip_address"),
      },
      links:db.prepare("SELECT l.slug,count(*) AS count FROM links l JOIN events e ON e.link_id=l.id GROUP BY l.id ORDER BY l.slug").all(),
      geoIp:geoIp.status,
    });
  });
  router.get("/api/analytics/events",admin,(req,res) => {
    let filter,cursor:number|undefined;
    try {
      filter=filters(req);
      if(req.query.cursor!==undefined) {cursor=Number(req.query.cursor);if(typeof req.query.cursor!=="string" || !Number.isSafeInteger(cursor) || cursor<1) throw new Error();}
    } catch {res.status(400).json({error:"Invalid analytics filter"});return;}
    const {where,params}=filter;
    const rows=db.prepare("SELECT e.*,l.slug "+base+" WHERE "+where+(cursor ? " AND e.id<?" : "")+" ORDER BY e.id DESC LIMIT 51").all(...params,...(cursor ? [cursor] : [])) as {id:number}[];
    res.json({events:rows.slice(0,50).map(decodeEvent),nextCursor:rows.length>50 ? rows[49].id : null});
  });
  router.get("/api/analytics/export",admin,(req,res) => {
    let filter;
    try {filter=filters(req);} catch {res.status(400).json({error:"Invalid analytics filter"});return;}
    const {where,params}=filter;
    const maximum=(db.prepare("SELECT max(id) AS id FROM events").get() as {id:number|null}).id ?? 0;
    async function* lines() {
      let cursor=0;
      while(!res.destroyed) {
        const rows=db.prepare("SELECT e.*,l.slug "+base+" WHERE "+where+" AND e.id>? AND e.id<=? ORDER BY e.id LIMIT 250").all(...params,cursor,maximum) as {id:number}[];
        if(!rows.length) return;
        for(const row of rows) {if(res.destroyed) return;yield JSON.stringify(decodeEvent(row))+"\n";}
        cursor=rows.at(-1)!.id;
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }
    res.attachment("sharelyze-ereignisse.jsonl").type("application/x-ndjson");
    const stream=Readable.from(lines());
    res.on("close",() => stream.destroy());
    stream.on("error",() => res.destroy());
    stream.pipe(res);
  });
  return router;
}
