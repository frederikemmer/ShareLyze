import { CampaignFilters,type TelemetryReport } from "./StatisticsTelemetry";
import type { DateTimeSettings } from "../../backend/src/date-time-settings";
import { resolvedDateTime } from "./date-time";
import { useEffect, useRef, useState } from "react";
import { StatisticsCalendar } from "./StatisticsCalendar";
import { StatisticsChart } from "./StatisticsChart";
import { type Timeline } from "../../shared/analytics-timeline";
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
const utcDate = (date = new Date()) => date.toISOString().slice(0,10);
const defaultFrom = () => utcDate(new Date(Date.now()-89*86400000));
async function analyticsGet<T>(path: string, signal: AbortSignal): Promise<T> {
  const response=await fetch(path,{signal});
  if(!response.ok) throw new Error(response.status===400 ? "Bitte einen gültigen Zeitraum von höchstens 366 Tagen auswählen." : "Statistik konnte nicht geladen werden. Bitte erneut versuchen.");
  return response.json();
}
export function Statistics({data,dateTimeSettings}:{data:Analytics|null;dateTimeSettings:DateTimeSettings}) {
  const locale=resolvedDateTime(dateTimeSettings,navigator.language).locale;
  const [slug,setSlug]=useState(""),[traffic,setTraffic]=useState("all"),[query,setQuery]=useState(""),[search,setSearch]=useState("");
  const [period,setPeriod]=useState("90"),[from,setFrom]=useState(defaultFrom),[to,setTo]=useState(()=>utcDate()),[day,setDay]=useState(()=>utcDate());
  const [report,setReport]=useState<Report|null>(null),[timeline,setTimeline]=useState<Timeline|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[revision,setRevision]=useState(0);
  const reportFilter=useRef("");
  const rangeFrom=period==="custom" ? from : period==="day" ? day : period==="live" ? utcDate() : utcDate(new Date(Date.now()-(Number(period)-1)*86400000));
  const rangeTo=period==="custom" ? to : period==="day" ? day : utcDate();
  const resolution=period==="live" ? "minute" : period==="day" ? "hour" : "day";
  const valid=!!rangeFrom && !!rangeTo && rangeFrom<=rangeTo && Date.parse(rangeTo)-Date.parse(rangeFrom)<366*86400000;
  const [campaignFilter,setCampaignFilter]=useState({source:"",medium:"",campaign:""});
  const filters=new URLSearchParams({...Object.fromEntries(Object.entries(campaignFilter).filter(([,value]) => !!value)),...(slug ? {slug} : {}),from:rangeFrom,to:rangeTo,traffic,...(search ? {q:search} : {})}).toString();
  useEffect(()=>{
    if(!valid){setReport(null);setTimeline(null);setLoading(false);return;}
    const controller=new AbortController();
    const changed=reportFilter.current!==filters+resolution;reportFilter.current=filters+resolution;
    setLoading(true);setError("");if(changed){setReport(null);setTimeline(null);}
    void Promise.all([analyticsGet<Report>("/api/analytics/report?"+filters,controller.signal),analyticsGet<Timeline>("/api/analytics/timeline?"+filters+"&resolution="+resolution,controller.signal)])
      .then(([overview,series])=>{if(controller.signal.aborted)return;setReport(overview);setTimeline(resolution==="minute" ? {...series,to:new Date(Math.min(Date.parse(series.to),Math.floor(Date.now()/60000)*60000+60000)).toISOString()} : series);})
      .catch(e=>{if(e.name!=="AbortError")setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[filters,resolution,revision,valid]);
  useEffect(()=>{
    
    const timer=window.setInterval(()=>{if(!document.hidden)setRevision(n=>n+1);},30000);
    const visible=()=>{if(!document.hidden)setRevision(n=>n+1);};
    document.addEventListener("visibilitychange",visible);
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
  },[]);
  const choices=Array.from(new Set([...(data?.links.map(link=>link.slug)??[]),...(report?.links.map(link=>link.slug)??[]),...(slug?[slug]:[])])).sort();
  return <div className="statistics-page">
    <div className="page-heading"><div><p className="eyebrow">DEINE FREIGABEN IM BLICK</p><h1>Statistiken</h1><p>Gelegentliche Abrufe und lange Zeiträume im Blick.</p></div></div>
    <div className="statistics-scope"><label>Link <select value={slug} onChange={e=>setSlug(e.target.value)}><option value="">Alle Links</option>{choices.map(value=><option key={value} value={value}>/{value}</option>)}</select></label><div className="statistics-periods" aria-label="Zeitraum">{["90","30","7","day","live","custom"].map(value=><button key={value} type="button" aria-pressed={period===value} onClick={()=>{setPeriod(value);}}>{value==="day"?"Tag":value==="live"?"Live":value==="custom"?"Zeitraum":value+" Tage"}</button>)}</div></div>
    {period==="custom" && <div className="statistics-dates"><label>Von (UTC) <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Bis (UTC) <input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><span>Bis zu 366 Tage gemeinsam</span></div>}
    {period==="day" && <div className="statistics-dates"><label>Tag (UTC) <input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label></div>}
    <details className="statistics-filter-panel"><summary>Weitere Filter{search ? ` · Suche: ${search}` : ""}{traffic!=="all" ? " · Traffic gefiltert" : ""}{Object.values(campaignFilter).some(Boolean) ? " · Kampagne gefiltert" : ""}</summary><div className="stat-filters analytics-filters"><label className="compact-field"><span>Traffic</span><select value={traffic} onChange={e=>setTraffic(e.target.value)}><option value="all">Alle Ereignisse</option><option value="human">Ohne erkannte Bots / Vorladen</option><option value="bots">Bots / Vorladen</option></select></label><form className="analytics-search" onSubmit={e=>{e.preventDefault();setSearch(query.trim());}}><input aria-label="IP, Standort, Gerät oder Browser suchen" placeholder="IP, Standort, Gerät …" maxLength={256} value={query} onChange={e=>setQuery(e.target.value)}/><button>Suchen</button>{search && <button type="button" className="secondary" onClick={()=>{setSearch("");setQuery("");}}>Zurücksetzen</button>}</form></div><CampaignFilters value={campaignFilter} onApply={setCampaignFilter}/></details>
    {!valid && <p role="alert">Bitte einen gültigen Zeitraum von höchstens 366 Tagen auswählen.</p>}
    {error && <p role="alert">{error}{timeline ? " Angezeigt wird der letzte erfolgreich geladene Stand." : ""}</p>}
    {loading && <p role="status">Statistik wird geladen …</p>}
    {timeline && report && <>
      <div className="statistics-chart-card"><StatisticsChart key={filters+resolution} timeline={timeline} locale={locale}/>
        {!report.total && <p className="empty-state">Keine Ereignisse in diesem Zeitraum. Hier darf es ruhig sein.</p>}
      </div>
    </>}
    {timeline && <StatisticsCalendar key={filters} timeline={timeline} locale={locale} selection={null} onSelect={timestamp=>{setDay(timestamp.slice(0,10));setPeriod("day");}}/>}
  </div>;
}
