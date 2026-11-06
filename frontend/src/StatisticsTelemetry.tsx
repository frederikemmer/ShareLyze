import { useEffect,useState } from "react";
import type { DateTimeSettings } from "../../backend/src/date-time-settings";
import { resolvedDateTime } from "./date-time";
type Count={label:string;count:number};
export type TelemetryReport={
  heatmap:{weekday:number;hour:number;count:number}[];
  transfers:{kind:string;outcome:string;count:number;bytes:number;durationMs:number}[];
  quality:{origin:string;resource:string;count:number;durationMs:number;ttfbMs:number|null}[];
  errors:{type:string;code:string;device:string;os:string;browser:string;network:string;fileType:string;count:number}[];
  performanceByClient:{origin:string;resource:string;device:string;os:string;browser:string;network:string;fileType:string;count:number;durationMs:number}[];
  context:{initialViews:Count[];viewChanges:Count[];themes:Count[];regions:{timeZone:string;country:string;ip:string|null;count:number}[];touch:{device:string;os:string;touch:string;count:number}[]};
  campaigns:{source:string;medium:string;campaign:string;content:string;views:number;downloads:number;completed:number}[];
};
const kindLabels:Record<string,string>={download:"Dateidownload",zip:"ZIP",preview:"Vorschau",media:"Medium",api:"API-Antwort",navigation:"Seitenladen",completed:"abgeschlossen",aborted:"abgebrochen",failed:"fehlgeschlagen"};
const viewLabels:Record<string,string>={grid:"Kacheln",list:"Liste",compact:"Kompakt",light:"Hell",dark:"Dunkel"};
const bytes=(value:number) => value>=1024**3 ? (value/1024**3).toFixed(2)+" GiB" : value>=1024**2 ? (value/1024**2).toFixed(2)+" MiB" : value>=1024 ? (value/1024).toFixed(1)+" KiB" : value+" B";
const duration=(ms:number) => ms>=1000 ? (ms/1000).toFixed(2)+" s" : Math.round(ms)+" ms";
function Distribution({title,rows}:{title:string;rows:Count[]}) {
  return <div><h3>{title}</h3>{rows.length ? <ul className="stat-list">{rows.map(row => <li key={row.label}><span>{viewLabels[row.label] || row.label}</span><strong>{row.count}</strong></li>)}</ul> : <p className="muted">Noch keine Angaben.</p>}</div>;
}
export function CampaignBuilder({slugs,selected}:{slugs:string[];selected:string}) {
  const [slug,setSlug]=useState(""),[source,setSource]=useState(""),[medium,setMedium]=useState("qr"),[campaign,setCampaign]=useState(""),[content,setContent]=useState("");
  const [result,setResult]=useState<{url:string;qrDataUrl:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [available,setAvailable]=useState<string[]>([]);
  useEffect(() => {
    const controller=new AbortController();
    void Promise.all(["/api/links","/api/shares"].map(path => fetch(path,{signal:controller.signal}).then(async response => {if(!response.ok) throw new Error();return response.json();}))).then(([links,shares]) => setAvailable([...links.links,...shares.shares].map(item => item.slug))).catch(() => {});
    return () => controller.abort();
  },[]);
  const options=Array.from(new Set([...slugs,...available])).sort();
  const chosen=slug || selected || options[0] || "";
  return <details className="stats-block"><summary><strong>Gekennzeichneten Link / QR-Code erstellen</strong></summary><p className="muted">Zum Beispiel Quelle „einladung“, Medium „qr“, Kampagne „sommerfest“ und Variante „karte“. Der QR-Code enthält dieselbe URL; ein physischer Scan kann nicht sicher von einem anderen Aufruf dieser URL unterschieden werden. Öffentliche Angaben, keine Geheimnisse eintragen.</p>
    <form className="analytics-campaign-form" onSubmit={event => {
      event.preventDefault();setBusy(true);setError("");setResult(null);
      void fetch("/api/analytics/campaign-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:chosen,utm_source:source,utm_medium:medium,utm_campaign:campaign,utm_content:content})}).then(async response => {if(!response.ok) throw new Error(response.status===400 ? "Kennzeichnungen sind zu lang oder ungültig. Bitte kürzen." : "Kampagnenlink konnte nicht erstellt werden. Bitte einen vorhandenen Link auswählen.");setResult(await response.json());}).catch(e => setError(e.message)).finally(() => setBusy(false));
    }}>
      <label className="compact-field"><span>Link</span><select value={chosen} onChange={e => setSlug(e.target.value)} required>{options.map(value => <option key={value} value={value}>/{value}</option>)}</select></label>
      {([["Quelle",source,setSource],["Medium",medium,setMedium],["Kampagne",campaign,setCampaign],["Variante",content,setContent]] as const).map(([label,value,set]) => <label className="compact-field" key={label}><span>{label}</span><input value={value} maxLength={100} onChange={e => set(e.target.value)}/></label>)}
      <button disabled={busy || !chosen}>{busy ? "Wird erstellt …" : "Link und QR-Code erstellen"}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {result && <div className="analytics-campaign-result"><label>Gekennzeichneter Link<input aria-label="Gekennzeichneter Link" readOnly value={result.url} onFocus={e => e.target.select()}/></label><img src={result.qrDataUrl} width={192} height={192} alt="QR-Code des gekennzeichneten Links"/><a className="button secondary" download="sharelyze-kampagne.png" href={result.qrDataUrl}>QR-Code als PNG speichern</a></div>}
  </details>;
}
export function StatisticsTelemetry({report,dateTimeSettings}:{report:TelemetryReport;dateTimeSettings:DateTimeSettings}) {
  const [heatmapMetric,setHeatmapMetric]=useState<"all"|"visits">("visits");
  const locale=resolvedDateTime(dateTimeSettings,navigator.language).locale;
  const weekdays=Array.from({length:7},(_,i) => new Intl.DateTimeFormat(locale,{weekday:"short",timeZone:"UTC"}).format(new Date(Date.UTC(2026,0,5+i))));
  // Separate visit-only cells avoid mistaking performance/telemetry event volume for popularity.
  const heatmap=(heatmapMetric==="visits" ? (report as TelemetryReport & {visitHeatmap?:TelemetryReport["heatmap"]}).visitHeatmap : report.heatmap) ?? [];
  const cells=new Map(heatmap.map(cell => [cell.weekday+":"+cell.hour,cell.count]));
  const maximum=Math.max(1,...heatmap.map(cell => cell.count));
  return <>
    <section className="stats-block analytics-telemetry"><h2>Übertragungen</h2>
      <p className="muted">Serverseitig beobachtete Nutzdaten und Dauer. Datenrate = Summe der Bytes / Summe der Übertragungszeiten je Gruppe. Range-/Teilübertragungen werden pro Anfrage gezählt; daraus folgt keine eindeutige Dateigröße oder Speicherung beim Empfänger.</p>
      <div className="analytics-table-scroll"><table className="analytics-table"><thead><tr><th>Art / Ergebnis</th><th>Anfragen</th><th>Nutzdaten</th><th>Dauer gesamt</th><th>Mittlere Datenrate</th></tr></thead><tbody>{report.transfers?.map(row => <tr key={row.kind+row.outcome}><td>{kindLabels[row.kind] || row.kind} · {kindLabels[row.outcome] || row.outcome}</td><td>{row.count}</td><td>{bytes(row.bytes)}</td><td>{duration(row.durationMs)}</td><td>{row.durationMs>0 ? bytes(Math.round(row.bytes*1000/row.durationMs))+"/s" : "–"}</td></tr>)}</tbody></table></div>
    </section>
    <section className="stats-block analytics-telemetry"><h2>Stunden-/Wochen-Heatmap</h2><label className="compact-field"><span>Ereignisse</span><select value={heatmapMetric} onChange={e => setHeatmapMetric(e.target.value as "all"|"visits")}><option value="visits">Freigabeansichten / externe Weiterleitungen</option><option value="all">Alle Ereignisse der Filterauswahl</option></select></label>
      <p className="muted">Wochentage und Stunden in UTC. Nullwerte bleiben sichtbar; Client-Zeitzonen stehen separat bei Region und IP.</p>
      <div className="analytics-table-scroll"><table className="analytics-heatmap"><caption>Ereigniszahlen je Wochentag und UTC-Stunde</caption><thead><tr><th scope="col">UTC</th>{Array.from({length:24},(_,hour) => <th scope="col" key={hour}>{hour}</th>)}</tr></thead><tbody>{weekdays.map((day,index) => <tr key={day}><th scope="row">{day}</th>{Array.from({length:24},(_,hour) => {const count=cells.get(((index+1)%7)+":"+hour) ?? 0;return <td key={hour} title={day+" "+hour+":00 UTC · "+count} style={{backgroundColor:count ? "rgba(27,153,139,"+(0.08+0.32*count/maximum)+")" : undefined}}><span>{count}</span></td>;})}</tr>)}</tbody></table></div>
    </section>
    <section className="stats-block analytics-telemetry"><h2>Ansicht, Farbschema und Geräte</h2><p className="muted">Die anfängliche Ansicht ist eine Vorgabe, keine nachgewiesene Vorliebe. Bewusste Wechsel werden getrennt gezählt. Browserangaben ergänzen die Geräteschätzung.</p>
      <div className="analytics-dimensions"><Distribution title="Anfängliche Ansicht" rows={report.context?.initialViews ?? []}/><Distribution title="Bewusste Ansichtswechsel" rows={report.context?.viewChanges ?? []}/><Distribution title="Farbschema beim Aufruf" rows={report.context?.themes ?? []}/></div>
      <details><summary>Touch nach Gerät und Betriebssystem</summary><ul className="stat-list">{report.context?.touch.map((row,index) => <li key={index}><span>{row.touch} · {row.device} · {row.os}</span><strong>{row.count}</strong></li>)}</ul></details>
      <details><summary>Browser-Zeitzone, Region und IP</summary><ul className="stat-list">{report.context?.regions.map((row,index) => <li key={index}><span>{row.timeZone} · {row.country} · {row.ip ?? "IP unbekannt"}</span><strong>{row.count}</strong></li>)}</ul></details>
    </section>
    <section className="stats-block analytics-telemetry"><h2>Kampagnenvergleich</h2><p className="muted">Aufrufe zählen Freigabeansichten und externe Weiterleitungen. Downloadstarts können mehrfach pro Aufruf vorkommen. Kennzeichnungen sind selbst angegeben und kein Beweis für den tatsächlichen Verbreitungsweg.</p><div className="analytics-table-scroll"><table className="analytics-table"><thead><tr><th>Quelle / Medium / Kampagne / Variante</th><th>Aufrufe</th><th>Starts</th><th>Serverabschlüsse</th></tr></thead><tbody>{report.campaigns?.map((row,index) => <tr key={index}><td>{[row.source,row.medium,row.campaign,row.content].filter(Boolean).join(" · ")}</td><td>{row.views}</td><td>{row.downloads}</td><td>{row.completed}</td></tr>)}</tbody></table></div></section>
    <section className="stats-block analytics-telemetry"><h2>Lade- und Antwortzeiten</h2><p className="muted">Browsermessungen und Servermessungen sind getrennt. Fehlende/unterdrückte Browsermessungen sind keine Null-Ladezeit. Pro Gruppe arithmetisches Mittel der vorhandenen Messwerte.</p><ul className="stat-list">{report.quality?.map(row => <li key={row.origin+row.resource}><span>{row.origin==="server" ? "Server" : "Browser"} · {kindLabels[row.resource] || row.resource} · {row.count} Messungen</span><strong>{duration(row.durationMs)}{row.ttfbMs!=null ? " · TTFB "+duration(row.ttfbMs) : ""}</strong></li>)}</ul>
      <details><summary>Zeiten nach Geräten, Betriebssystemen und Dateitypen</summary><ul className="stat-list">{report.performanceByClient?.map((row,index) => <li key={index}><span>{row.origin} · {row.resource} · {row.device} · {row.os} · {row.browser} · {row.network} · {row.fileType} · {row.count} Messungen</span><strong>{duration(row.durationMs)}</strong></li>)}</ul></details>
    </section>
    <section className="stats-block analytics-telemetry"><h2>Abbrüche und Fehlermeldungen</h2><p className="muted">Beobachtete Fehlercodes und mögliche Ursachen stehen bei jedem Einzelereignis. Eine Servermeldung und eine zugehörige Browsermeldung können denselben Fehler betreffen; dies sind Meldungen, keine eindeutigen Vorfälle.</p>
      <ul className="stat-list">{report.errors?.map((row,index) => <li key={index}><span>{row.type} · {row.code} · {row.device} · {row.os} · {row.browser} · {row.network} · {row.fileType}</span><strong>{row.count}</strong></li>)}</ul>
      {!report.errors?.length && <p className="muted">Keine erfassten Abbruch-/Fehlermeldungen für diese Auswahl.</p>}
    </section>
  </>;
}

export function CampaignFilters({value,onApply}:{value:{source:string;medium:string;campaign:string};onApply:(value:{source:string;medium:string;campaign:string})=>void}) {
  const [draft,setDraft]=useState(value);
  const active=Object.values(value).some(Boolean);
  return <details className="statistics-filter-panel"><summary>Kampagne eingrenzen{active ? " · Filter aktiv" : ""}</summary><form className="analytics-campaign-form" onSubmit={event => {event.preventDefault();onApply({source:draft.source.trim(),medium:draft.medium.trim(),campaign:draft.campaign.trim()});}}>
    {([["source","Quelle"],["medium","Medium"],["campaign","Kampagne"]] as const).map(([key,label]) => <label className="compact-field" key={key}><span>{label}</span><input value={draft[key]} maxLength={100} onChange={event => setDraft({...draft,[key]:event.target.value})}/></label>)}
    <button>Filter anwenden</button><button type="button" className="secondary" disabled={!active} onClick={() => {const empty={source:"",medium:"",campaign:""};setDraft(empty);onApply(empty);}}>Zurücksetzen</button>
  </form><p className="muted">Exakter Abgleich mit den selbst angegebenen Kennzeichnungen. Filter gelten für Zeitraum, Log und Export.</p></details>;
}
