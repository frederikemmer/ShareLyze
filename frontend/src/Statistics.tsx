import { StatisticsTelemetry,CampaignBuilder,CampaignFilters,type TelemetryReport } from "./StatisticsTelemetry";
import { Activity, ChevronDown, RefreshCw, X } from "lucide-react";
import type { DateTimeSettings } from "../../backend/src/date-time-settings";
import { formatTimestamp, resolvedDateTime } from "./date-time";
import { useEffect, useRef, useState } from "react";
import { eventLabels as labels, type AnalyticsEvent } from "../../shared/analytics";
import { StatisticsCalendar } from "./StatisticsCalendar";
import { StatisticsChart } from "./StatisticsChart";
import { timelineStep, type Timeline, type TimelinePoint } from "../../shared/analytics-timeline";
import type { GeoIpStatus } from "./GeoIpSettings";

export type Analytics = {
  recent: { id: number; created_at: string; type: string; slug: string; ip_address: string | null; user_agent: string | null; referrer_origin: string | null }[];
  links: { slug: string; type: string; count: number }[];
  daily: { day: string; type: string; count: number }[];
  dailyByLink: { slug: string; day: string; type: string; count: number }[];
  files: {
    slug: string;
    title: string;
    relative_path: string;
    file_path: string | null;
    count: number;
  }[];
};
type Count={label:string;count:number};
type Report=TelemetryReport & {files:{slug:string;relative_path:string|null;file_path:string|null;count:number}[];total:number;counts:{type:string;count:number}[];daily:{day:string;type:string;count:number}[];hourly:Count[];dimensions:Record<string,Count[]>;links:{slug:string;count:number}[];geoIp:GeoIpStatus};
const deviceLabels:Record<string,string>={desktop:"Desktop (abgeleitet)",mobile:"Smartphone",tablet:"Tablet",smarttv:"Smart-TV",console:"Konsole",wearable:"Wearable",embedded:"Eingebettetes Gerät",xr:"XR-Gerät"};
const geoLabels:Record<string,string>={database_missing:"Standortdaten fehlen",non_public_ip:"Lokale / reservierte IP",invalid_ip:"Ungültige IP",not_found:"Kein Datenbanktreffer",lookup_failed:"Standortabfrage fehlgeschlagen"};
const shown=(value:unknown) => value===null || value===undefined || value==="" ? "Unbekannt" : String(value);
function EventDetails({event,dateTimeSettings}:{event:AnalyticsEvent;dateTimeSettings:DateTimeSettings}) {
  const detail=event.details, geo=detail?.geo, agent=detail?.agent;
  const location=geo?.status==="found" ? [geo.city,geo.region,geo.country].filter(Boolean).join(", ") : geoLabels[geo?.status || ""] || "Keine historischen Standortdaten";
  const fields: [string,unknown][]=[
    ["Zeitpunkt",formatTimestamp(event.created_at,dateTimeSettings,navigator.language)],
    ["Ereignis",labels[event.type] ?? event.type],["Link",event.slug],["IP-Adresse",event.ip_address],
    ["Standort (ungefähr)",location],["Kontinent",geo?.continent],["Ländercode",geo?.countryCode],
    ["Koordinaten (ungefähr)",geo?.latitude!=null && geo.longitude!=null ? geo.latitude.toFixed(4)+", "+geo.longitude.toFixed(4) : null],
    ["PLZ",geo?.postalCode],["GeoIP-Zeitzone",geo?.timeZone],["Genauigkeitsradius (km)",geo?.accuracyRadiusKm],
    ["ASN",geo?.asn ? "AS"+geo.asn : null],["Netzbetreiber / Organisation",geo?.organization],
    ["Browser",[agent?.browser,agent?.browserVersion].filter(Boolean).join(" ")],
    ["Betriebssystem",[agent?.os,agent?.osVersion].filter(Boolean).join(" ")],
    ["Geräteklasse",agent?.device ? deviceLabels[agent.device] || agent.device : null],
    ["Hersteller",agent?.vendor],["Modell",agent?.model],["CPU-Architektur",agent?.architecture],
    ["Browser-Engine",[agent?.engine,agent?.engineVersion].filter(Boolean).join(" ")],
    ["Bot / Automatisierung",agent ? (agent.bot ? "Vermuteter Bot" : "Kein Bot erkannt") : null],
    ["KI-Crawler / Assistent",agent ? [agent.aiCrawler ? "KI-Crawler" : "",agent.aiAssistant ? "KI-Assistent" : ""].filter(Boolean).join(", ") || "Nicht erkannt" : null],
    ["Sprache(n)",detail?.request.language],["Herkunft",event.referrer_origin],
    ["Methode / HTTP",detail ? detail.request.method+" · HTTP/"+detail.network.httpVersion+" · "+detail.network.protocol : null],
    ["Request-Pfad",detail?.request.path],["Dateipfad",event.file_path],["Range",detail?.request.range],
    ["IP-Version / Bereich",detail ? "IPv"+shown(detail.network.family)+" · "+detail.network.scope : null],
    ["Verbindungs-IP",detail?.network.peerIp],["Vertrauenswürdige Proxykette",detail?.network.proxyChain.join(" → ")],
    ["Fetch-Kontext",detail ? [detail.request.fetchSite,detail.request.fetchMode,detail.request.fetchDest].filter(Boolean).join(" · ") : null],
    ["Vorladen",detail ? detail.request.prefetch ? "Prefetch / Prerender" : "Nicht gemeldet" : null],
    ["Besuchszuordnung",detail?.visitId],["Dateityp",detail?.fileType],
    ["Übertragung",detail?.transfer ? `${detail.transfer.kind} · ${detail.transfer.outcome} · HTTP ${detail.transfer.status}` : null],
    ["Übertragungskennung",detail?.transfer?.id],["Vorheriger fehlgeschlagener Versuch",detail?.transfer?.retryOf],["Ressource",detail?.resource],["Übertragene Bytes",detail?.transfer?.bytes],["Erwartete Bytes",detail?.transfer?.expectedBytes],
    ["Übertragungsdauer (ms)",detail?.transfer?.durationMs],["Bytes pro Sekunde",detail?.transfer?.bytesPerSecond],["Range angefordert / angenommen",detail?.transfer ? String(detail.transfer.rangeRequested)+" / "+String(detail.transfer.rangeAccepted) : null],["Vollübertragung statt Range",detail?.transfer?.rangeFallback],
    ["Diagnose",detail?.diagnostic?.observed],["Systemfehlercode",detail?.diagnostic?.systemCode],["Mögliche Ursachen",detail?.diagnostic?.possibleReasons.join(" · ")],
    ["Browser-Zeitzone",detail?.client?.timeZone],["UTC-Abstand (Minuten, Browserkonvention)",detail?.client?.utcOffsetMinutes],["Ansicht",detail?.client?.view],["Touch-Punkte",detail?.client?.touchPoints],["Farbschema",detail?.client?.colorScheme],["Kampagne",detail?.campaign ? Object.entries(detail.campaign).map(([key,value]) => key+"="+value).join(" · ") : null],
    ["Qualitätsmessung",detail?.quality ? `${detail.quality.resource} · ${detail.quality.durationMs} ms · ${detail.quality.origin}` : null],
    ["GeoIP-Datenstand",geo?.databaseDate],["ASN-Datenstand",geo?.asnDatabaseDate],
  ];
  return <details className="visitor-event">
    <summary><ChevronDown className="visitor-toggle" size={16} aria-hidden="true"/><strong>{labels[event.type] ?? event.type} · /{event.slug ?? "historisch"}</strong><span>{formatTimestamp(event.created_at,dateTimeSettings,navigator.language)} · {event.ip_address ?? "IP unbekannt"} · {location}</span><span>{[agent?.browser,agent?.os,agent?.device ? deviceLabels[agent.device] || agent.device : ""].filter(Boolean).join(" · ") || "Gerät unbekannt"}{agent?.bot ? " · Bot-Hinweis" : ""}</span></summary>
    {!detail && <p className="muted">Dieser historische Abruf wurde vor der erweiterten Erfassung gespeichert. Fehlende Angaben werden nicht nachträglich als damalige Fakten ergänzt.</p>}
    <dl className="visitor-detail-grid">{fields.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{shown(value)}</dd></div>)}</dl>
    <details><summary>User-Agent und Client Hints</summary><pre>{event.user_agent ?? "Kein User-Agent"}</pre>{detail && <pre>{JSON.stringify(detail.clientHints,null,2)}</pre>}</details>
    {detail && <details><summary>Vollständige gespeicherte Momentaufnahme</summary><pre>{JSON.stringify(detail,null,2)}</pre></details>}
  </details>;
}
function Breakdown({title,rows,devices=false}:{title:string;rows:Count[];devices?:boolean}) {
  const maximum=Math.max(1,...rows.map(row => row.count));
  return <div className="stats-block"><h2>{title}</h2>{rows.length ? <ul className="stat-list analytics-breakdown">{rows.map(row => <li key={row.label}><span>{devices ? deviceLabels[row.label] || row.label : row.label}<span className="analytics-mini-track" aria-hidden="true"><span style={{width:(row.count/maximum*100)+"%"}}/></span></span><strong>{row.count}</strong></li>)}</ul> : <p className="empty-state">Keine Ereignisse für diese Auswahl.</p>}</div>;
}
const utcDate = (date = new Date()) => date.toISOString().slice(0,10);
const defaultFrom = () => utcDate(new Date(Date.now()-89*86400000));
async function analyticsGet<T>(path: string, signal: AbortSignal): Promise<T> {
  const response=await fetch(path,{signal});
  if(!response.ok) throw new Error(response.status===400 ? "Bitte einen gültigen Zeitraum von höchstens 366 Tagen auswählen." : "Statistik konnte nicht geladen werden. Bitte erneut versuchen.");
  return response.json();
}
type EventPage = { events: AnalyticsEvent[]; nextCursor: number | null };
export function Statistics({data,dateTimeSettings}:{data:Analytics|null;dateTimeSettings:DateTimeSettings}) {
  const locale=resolvedDateTime(dateTimeSettings,navigator.language).locale;
  const [slug,setSlug]=useState(""),[type,setType]=useState(""),[traffic,setTraffic]=useState("all"),[query,setQuery]=useState(""),[search,setSearch]=useState("");
  const [period,setPeriod]=useState("90"),[from,setFrom]=useState(defaultFrom),[to,setTo]=useState(()=>utcDate()),[day,setDay]=useState(()=>utcDate()),[paused,setPaused]=useState(false);
  const [selection,setSelection]=useState<string|null>(null);
  const [selectionStep,setSelectionStep]=useState(86400000);
  const [report,setReport]=useState<Report|null>(null),[timeline,setTimeline]=useState<Timeline|null>(null),[events,setEvents]=useState<AnalyticsEvent[]>([]),[nextCursor,setNextCursor]=useState<number|null>(null);
  const [loading,setLoading]=useState(true),[logLoading,setLogLoading]=useState(true),[more,setMore]=useState(false),[error,setError]=useState(""),[logError,setLogError]=useState(""),[revision,setRevision]=useState(0),[updated,setUpdated]=useState<string|null>(null);
  const logController=useRef<AbortController|null>(null),reportFilter=useRef("");
  const rangeFrom=period==="custom" ? from : period==="day" ? day : period==="live" ? utcDate() : utcDate(new Date(Date.now()-(Number(period)-1)*86400000));
  const rangeTo=period==="custom" ? to : period==="day" ? day : utcDate();
  const resolution=period==="live" ? "minute" : period==="day" ? "hour" : "day";
  const valid=!!rangeFrom && !!rangeTo && rangeFrom<=rangeTo && Date.parse(rangeTo)-Date.parse(rangeFrom)<366*86400000;
  const [campaignFilter,setCampaignFilter]=useState({source:"",medium:"",campaign:""});
  const filters=new URLSearchParams({...Object.fromEntries(Object.entries(campaignFilter).filter(([,value]) => !!value)),...(slug ? {slug} : {}),from:rangeFrom,to:rangeTo,traffic,...(search ? {q:search} : {})}).toString();
  const logParams=new URLSearchParams(filters);
  if(type) logParams.set("type",type);
  if(selection) {logParams.set("since",selection);logParams.set("until",new Date(Date.parse(selection)+selectionStep).toISOString());}
  const logFilters=logParams.toString();
  useEffect(()=>{setSelection(null);},[filters,resolution]);
  useEffect(()=>{
    if(!valid){setReport(null);setTimeline(null);setLoading(false);return;}
    const controller=new AbortController();
    const changed=reportFilter.current!==filters+resolution;reportFilter.current=filters+resolution;
    setLoading(true);setError("");if(changed){setReport(null);setTimeline(null);setUpdated(null);}
    void Promise.all([analyticsGet<Report>("/api/analytics/report?"+filters,controller.signal),analyticsGet<Timeline>("/api/analytics/timeline?"+filters+"&resolution="+resolution,controller.signal)])
      .then(([overview,series])=>{if(controller.signal.aborted)return;setReport(overview);setTimeline(resolution==="minute" ? {...series,to:new Date(Math.min(Date.parse(series.to),Math.floor(Date.now()/60000)*60000+60000)).toISOString()} : series);setUpdated(new Date().toISOString());})
      .catch(e=>{if(e.name!=="AbortError")setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[filters,resolution,revision,valid]);
  useEffect(()=>{
    if(!valid){setEvents([]);setNextCursor(null);setLogLoading(false);return;}
    const controller=new AbortController();logController.current=controller;setLogLoading(true);setMore(false);setLogError("");setEvents([]);setNextCursor(null);
    void analyticsGet<EventPage>("/api/analytics/events?"+logFilters,controller.signal).then(page=>{if(controller.signal.aborted)return;setEvents(page.events);setNextCursor(page.nextCursor);}).catch(e=>{if(e.name!=="AbortError")setLogError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLogLoading(false);});
    return ()=>controller.abort();
  },[logFilters,revision,valid]);
  useEffect(()=>{
    if(period!=="live" || paused)return;
    const timer=window.setInterval(()=>{if(!document.hidden)setRevision(n=>n+1);},30000);
    return ()=>window.clearInterval(timer);
  },[period,paused]);
  const choices=Array.from(new Set([...(data?.links.map(link=>link.slug)??[]),...(report?.links.map(link=>link.slug)??[]),...(slug?[slug]:[])])).sort();
  const count=(event:string)=>report?.counts.find(row=>row.type===event)?.count??0;
  const activeDays=new Set(timeline?.rows.map(row=>row.bucket.slice(0,10))??[]).size;
  const selectPoint=(point:TimelinePoint)=>{setSelectionStep(timelineStep(resolution));setSelection(point.timestamp);};
  return <div className="statistics-page">
    <div className="page-heading"><div><p className="eyebrow">DEINE FREIGABEN IM BLICK</p><h1>Statistiken</h1><p>Gelegentliche Abrufe, lange Zeiträume und die Details zu jedem Ereignis.</p></div></div>
    <div className="statistics-scope"><label>Link <select value={slug} onChange={e=>setSlug(e.target.value)}><option value="">Alle Links</option>{choices.map(value=><option key={value} value={value}>/{value}</option>)}</select></label><div className="statistics-periods" aria-label="Zeitraum">{["90","30","7","day","live","custom"].map(value=><button key={value} type="button" aria-pressed={period===value} onClick={()=>{setPeriod(value);setPaused(false);}}>{value==="day"?"Tag":value==="live"?"Live":value==="custom"?"Zeitraum":value+" Tage"}</button>)}</div></div>
    {period==="custom" && <div className="statistics-dates"><label>Von (UTC) <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Bis (UTC) <input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><span>Bis zu 366 Tage gemeinsam</span></div>}
    {period==="day" && <div className="statistics-dates"><label>Tag (UTC) <input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label></div>}
    <details className="statistics-filter-panel"><summary>Weitere Filter{search ? ` · Suche: ${search}` : ""}{traffic!=="all" ? " · Traffic gefiltert" : ""}</summary><div className="stat-filters analytics-filters"><label className="compact-field"><span>Traffic</span><select value={traffic} onChange={e=>setTraffic(e.target.value)}><option value="all">Alle Ereignisse</option><option value="human">Ohne erkannte Bots / Vorladen</option><option value="bots">Bots / Vorladen</option></select></label><form className="analytics-search" onSubmit={e=>{e.preventDefault();setSearch(query.trim());}}><input aria-label="IP, Standort, Gerät oder Browser suchen" placeholder="IP, Standort, Gerät …" maxLength={256} value={query} onChange={e=>setQuery(e.target.value)}/><button>Suchen</button>{search && <button type="button" className="secondary" onClick={()=>{setSearch("");setQuery("");}}>Zurücksetzen</button>}</form></div><p className="muted">Filter gelten für Verlauf und Log. Bot-Erkennung ist eine Schätzung; „Ohne erkannte Bots“ enthält keine historischen Ereignisse ohne Zusatzdaten.</p></details>
    <CampaignFilters value={campaignFilter} onApply={setCampaignFilter}/>
    <div className="statistics-refresh"><span>{period==="live" && <><Activity size={14} aria-hidden="true"/> Heute · {paused?"Pausiert":"Aktualisierung alle 30 Sekunden"} · </>}{updated ? `Stand: ${formatTimestamp(updated,dateTimeSettings,navigator.language)}` : ""}</span>{period==="live" && <button type="button" className="secondary" aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?"Fortsetzen":"Pause"}</button>}<button type="button" className="secondary" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={14} aria-hidden="true"/> Aktualisieren</button></div>
    {!valid && <p role="alert">Bitte einen gültigen Zeitraum von höchstens 366 Tagen auswählen.</p>}
    {error && <p role="alert">{error}{timeline ? " Angezeigt wird der letzte erfolgreich geladene Stand." : ""}</p>}
    {loading && <p role="status">Statistik wird geladen …</p>}
    {timeline && report && <>
      <div className="statistics-chart-card"><div className="statistics-card-heading"><div><h2>Was über die Zeit zusammenkommt</h2><p>{slug?`/${slug}`:"Alle Links"} · {rangeFrom} – {rangeTo} · {resolution==="day"?"Tage":resolution==="hour"?"Stunden":"Minuten"} in UTC</p></div><span className="statistics-badge">Kumuliert im Zeitraum</span></div>
        <StatisticsChart key={filters+resolution} timeline={timeline} locale={locale} onSelect={selectPoint} selection={selection}/>
        {!report.total && <p className="empty-state">Keine Ereignisse in diesem Zeitraum. Hier darf es ruhig sein.</p>}
        <p className="statistics-note">Flache Abschnitte bedeuten keine neuen Ereignisse der eingeblendeten Arten. Die Summen beginnen bei null am Zeitraumstart. Eine Navigation kann mehrere getrennte Ereignisse auslösen.</p>
      </div>
      <div className="statistics-summary"><div><span>Aktive Tage</span><strong>{activeDays.toLocaleString(locale)}</strong><small>Mit mindestens einem Ereignis</small></div><div><span>Freigabeansichten</span><strong>{count("view").toLocaleString(locale)}</strong><small>Wiederholte Anfragen eingeschlossen</small></div><div><span>Weiterleitungen</span><strong>{count("redirect").toLocaleString(locale)}</strong><small>Externe Kurzlinks</small></div><div><span>Alle Ereignisse</span><strong>{report.total.toLocaleString(locale)}</strong><small>Inklusive weiterer Ereignisarten im Log</small></div></div>
    </>}
    {timeline && <StatisticsCalendar key={filters} timeline={timeline} locale={locale} selection={selection} onSelect={timestamp=>{setSelectionStep(86400000);setSelection(timestamp);}}/>}
    <div className="statistics-log"><div className="statistics-card-heading"><div><h2>Ereignislog</h2><p>{selection ? `${selection.slice(0,10)} · ${selectionStep===86400000?"ganzer Tag":selection.slice(11,16)+" Uhr"} · UTC` : "Alle Ereignisse im gewählten Zeitraum"}</p></div><label>Ereignis <select value={type} onChange={e=>setType(e.target.value)}><option value="">Alle Arten</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
      <div className="analytics-toolbar">{selection && <><button className="secondary" type="button" onClick={()=>setSelection(null)}><X size={14} aria-hidden="true"/> Zeitpunktauswahl aufheben</button>{selectionStep===86400000 && <button className="secondary" type="button" onClick={()=>{setDay(selection.slice(0,10));setSelection(null);setPeriod("day");}}>Tag im Stundenverlauf ansehen</button>}</>}<a className="button secondary" href={"/api/analytics/export?"+logFilters}>Log exportieren (JSONL)</a></div>
      <p className="muted">Eintrag aufklappen für genaue Zeit, IP, Standort, Gerät, Datei und Request-Details. Die Ereignisart filtert nur das Log; Graph und Kennzahlen behalten den gesamten Zeitraum.</p>
      {logError && <p role="alert">{logError}</p>}{logLoading && <p role="status">Abrufe werden geladen …</p>}
      {events.map(event=><EventDetails key={event.id} event={event} dateTimeSettings={dateTimeSettings}/>)}
      {!logLoading && !logError && !events.length && <p className="empty-state">Keine Ereignisse für diese Auswahl.</p>}
      {nextCursor!==null && <button type="button" disabled={more || logLoading} onClick={()=>{const controller=logController.current;if(!controller || controller.signal.aborted || more)return;setMore(true);setLogError("");void analyticsGet<EventPage>("/api/analytics/events?"+logFilters+"&cursor="+nextCursor,controller.signal).then(page=>{if(controller.signal.aborted)return;setEvents(current=>[...current,...page.events]);setNextCursor(page.nextCursor);}).catch(e=>{if(e.name!=="AbortError")setLogError(e.message);}).finally(()=>{if(!controller.signal.aborted)setMore(false);});}}>{more?"Wird geladen …":"Weitere Abrufe laden"}</button>}
    </div>
    {report && <details className="statistics-more"><summary>Übertragungen, Heatmap, Browserkontext und Qualität</summary><StatisticsTelemetry report={report} dateTimeSettings={dateTimeSettings}/></details>}
    <CampaignBuilder slugs={choices} selected={slug}/>
    {report && <details className="statistics-more"><summary>Weitere Auswertungen · Dateien, Geräte und Herkunft</summary><p className="muted">Diese Auswertungen gelten für den gesamten gefilterten Zeitraum; die Auswahl im Graphen grenzt nur das Log ein. Häufigkeiten zählen Ereignisse, keine Personen.</p><div className="stats-block"><h2>Downloads nach Datei</h2><p className="muted">Downloadstarts inklusive Range-Anfragen; höchstens 100 häufigste Dateieinträge.</p>{report.files.length ? <ul className="stat-list">{report.files.map((file,index)=><li key={index}><span>/{file.slug} · {file.relative_path || "Historische Datei"}{file.file_path?"/"+file.file_path:""}</span><strong>{file.count.toLocaleString(locale)}</strong></li>)}</ul> : <p className="empty-state">Keine Downloadstarts in dieser Auswahl.</p>}</div><div className="analytics-dimensions">{([["countries","Länder"],["cities","Städte (ungefähr)"],["devices","Geräte"],["systems","Betriebssysteme"],["browsers","Browser"],["networks","Netzanbieter"],["referrers","Herkunfts-Domains"],["ips","IP-Adressen"]] as const).map(([key,title])=><Breakdown key={key} title={title} rows={report.dimensions[key]??[]} devices={key==="devices"}/>)}</div><Breakdown title="Tageszeit (UTC)" rows={report.hourly.slice().sort((a,b)=>a.label.localeCompare(b.label)).map(row=>({...row,label:row.label+" Uhr"}))}/><p className="muted">Jeweils zehn häufigste Werte. {!report.geoIp.cityReady && "Standortdaten können in den Einstellungen installiert werden; historische Momentaufnahmen bleiben unverändert. "}<a href="https://db-ip.com" target="_blank" rel="noreferrer">IP Geolocation by DB-IP</a> · CC BY 4.0.</p></details>}
    <p className="statistics-note">Aufrufe sind keine eindeutigen Personen. Serverabschlüsse bestätigen keine Speicherung beim Empfänger. Standortdaten sind ungefähre Netzstandorte; Clientangaben können fehlen oder manipuliert sein.</p>
    <p className="statistics-attribution"><a href="https://db-ip.com" target="_blank" rel="noreferrer">IP Geolocation by DB-IP</a> · CC BY 4.0</p>
  </div>;
}
