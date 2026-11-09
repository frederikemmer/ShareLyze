import { SettingsSection } from "./SettingsSection";
import { GeoIpSettings } from "./GeoIpSettings";
import { UploadSettings } from "./UploadSettings";
import { useEffect, useState } from "react";
import type { RetentionSettings } from "../../backend/src/retention";

type Settings = RetentionSettings & {analyticsLocked:boolean};
type Cache = {running:boolean;phase:string;total:number;completed:number;failed:number;error:string;bytes:number;files:number};
export function StorageSettings({notify}: {notify:(message:string,error?:boolean)=>void}) {
  const [settings,setSettings] = useState<Settings|null>(null);
  const [cache,setCache] = useState<Cache|null>(null);
  const [busy,setBusy] = useState(false);
  async function call(path:string, method="GET", body?:unknown) {
    const response = await fetch(path,{method,headers:{"Content-Type":"application/json"},...(body ? {body:JSON.stringify(body)} : {})});
    if (!response.ok) throw new Error(response.status === 409 ? "Der Vorschau-Cache arbeitet noch. Bitte später erneut versuchen." : "Speichereinstellungen konnten nicht verarbeitet werden.");
    return response.json();
  }
  useEffect(() => {
    let alive=true;
    void call("/api/settings/retention").then(value => {if(alive) setSettings(value);}).catch(error => {if(alive) notify(error.message,true);});
    const poll = () => {void call("/api/previews").then(value => {if(alive) setCache(value);}).catch(error => {if(alive) notify(error.message,true);});};
    poll();
    const timer=setInterval(poll,3000);
    return () => {alive=false;clearInterval(timer);};
  },[]);
  async function action(path:string,method:string) {
    setBusy(true);
    try {await call(path,method);setCache(await call("/api/previews"));}
    catch(error) {notify((error as Error).message,true);}
    finally {setBusy(false);}
  }
  return <>
    <UploadSettings notify={notify}/>
    <GeoIpSettings/>
    <SettingsSection title="Aufbewahrung" help="Gelöschte Freigaben sind sofort gesperrt. Nach der Frist werden nur eigene Uploads ohne weitere Freigabezuordnung bereinigt. Historische Statistikzuordnungen und Kurznamen bleiben erhalten.">
    {settings && <form onSubmit={event => {
      event.preventDefault();setBusy(true);
      void call("/api/settings/retention","PUT",settings).then(value => {setSettings(value);notify("Aufbewahrung gespeichert.");}).catch(error => notify(error.message,true)).finally(() => setBusy(false));
    }}>
      <label className="compact-field"><span>Statistiken (Tage, leer = dauerhaft)</span><input type="number" min={1} max={3650} disabled={settings.analyticsLocked} value={settings.analyticsDays ?? ""} onChange={e => setSettings({...settings,analyticsDays:e.target.value === "" ? null : Number(e.target.value)})}/></label>
      {settings.analyticsLocked && <p>Durch ANALYTICS_RETENTION_DAYS im Deployment festgelegt.</p>}
      {([["deletedShareDays","Gelöschte Freigaben (Tage)"],["orphanUploadDays","Nicht zugeordnete Uploads (Tage)"],["previewDays","Vorschau-Cache (Tage)"]] as const).map(([key,label]) => <label className="compact-field" key={key}><span>{label}</span><input type="number" min={1} max={3650} required value={settings[key]} onChange={e => setSettings({...settings,[key]:Number(e.target.value)})}/></label>)}
      <button disabled={busy}>Aufbewahrung speichern</button>
    </form>}</SettingsSection>
    <SettingsSection title="Vorschau-Cache" help="Vorschauen entstehen im Hintergrund und bei Zugriff. Der Cache ist auf 512 MiB begrenzt, wird stündlich bereinigt und kann neu aufgebaut werden.">
      {cache && <div role="status" aria-live="polite"><p>{cache.running ? "Vorschauen werden vorbereitet" : "Bereit"} · {cache.completed} von {cache.total} erstellt · {cache.failed} fehlgeschlagen</p>{cache.running && <progress aria-label="Vorschau-Fortschritt" max={Math.max(cache.total,1)} value={cache.completed+cache.failed}/>}<p>{cache.files} Cachedateien · {(cache.bytes/1024**2).toFixed(1)} MiB</p>{cache.error && <p role="alert">{cache.error}</p>}</div>}
      <div className="upload-actions"><button type="button" disabled={busy || cache?.running} onClick={() => void action("/api/previews/warm","POST")}>Vorschauen vorbereiten</button><button type="button" className="secondary" disabled={busy || cache?.running} onClick={() => void action("/api/previews","DELETE")}>Cache leeren</button></div>
    </SettingsSection>
  </>;
}
