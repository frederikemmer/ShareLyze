import { useEffect, useRef, useState } from "react";
import type { DateTimeSettings } from "../../backend/src/date-time-settings";
import { SettingsSection } from "./SettingsSection";
import { createAutosave } from "./autosave";
export const browserDateTime: DateTimeSettings = {region:"auto",timeFormat:"auto"};
export function RegionTimeSettings({value,onChange,notify}: {value:DateTimeSettings;onChange:(value:DateTimeSettings)=>void;notify:(message:string,error?:boolean)=>void}) {
 const callbacks=useRef({onChange,notify}); callbacks.current={onChange,notify};
 const current=useRef(value);
 const [saver]=useState(()=>createAutosave<DateTimeSettings>(async value=>{
  const response=await fetch("/api/settings/datetime",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
  if(!response.ok) throw new Error("Region und Zeitformat konnten nicht gespeichert werden.");
 },()=>callbacks.current.notify("Region und Zeitformat übernommen."),error=>callbacks.current.notify(error instanceof Error ? error.message : "Speichern fehlgeschlagen.",true)));
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/settings/datetime",{signal:controller.signal}).then(async response=>{if(!response.ok) throw new Error("Region und Zeitformat konnten nicht geladen werden."); const result=await response.json() as DateTimeSettings; current.current=result;callbacks.current.onChange(result);}).catch(error=>{if(error.name!=="AbortError") callbacks.current.notify(error.message,true);});
  return ()=>{controller.abort();saver.cancel();};
 },[saver]);
 function update(change:Partial<DateTimeSettings>) {const next={...current.current,...change};current.current=next;onChange(next);saver.schedule(next);}
 return <SettingsSection title="Region und Zeitformat"><div className="region-settings">
  <label className="compact-field"><span>Region</span><select value={value.region} onChange={event=>update({region:event.target.value as DateTimeSettings["region"]})}><option value="auto">Browser</option><option value="de-DE">Deutsch (Deutschland)</option><option value="en-GB">Englisch (Vereinigtes Königreich)</option><option value="en-US">Englisch (USA)</option></select></label>
  <label className="compact-field"><span>Zeitformat</span><select value={value.timeFormat} onChange={event=>update({timeFormat:event.target.value as DateTimeSettings["timeFormat"]})}><option value="auto">Browser / Region</option><option value="24">24 Stunden</option><option value="12">12 Stunden</option></select></label>
 </div></SettingsSection>;
}
