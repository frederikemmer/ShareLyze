import { useEffect, useState } from "react";
import { defaultUploadPatterns, type UploadSettings as Settings } from "../../shared/upload-filter";

export function UploadSettings({notify}:{notify:(message:string,error?:boolean)=>void}) {
  const [settings,setSettings]=useState<Settings|null>(null);
  const [patterns,setPatterns]=useState("");
  const [saving,setSaving]=useState(false);
  useEffect(() => {
    const controller=new AbortController();
    void fetch("/api/settings/uploads",{signal:controller.signal}).then(async response => {
      if (!response.ok) throw new Error("Upload-Filter konnte nicht geladen werden.");
      const value=await response.json() as Settings;
      setSettings(value);setPatterns(value.patterns.join("\n"));
    }).catch(error => {if(error.name !== "AbortError") notify(error.message,true);});
    return () => controller.abort();
  },[]);
  return <div className="settings-block"><h2>Upload-Filter</h2>
    <p>System- und Metadatendateien beim Hochladen überspringen. Regeln gelten für Dateinamen und Ordnernamen auf jeder Ebene, unabhängig von Groß-/Kleinschreibung. Bestehende Dateien und Speicherquellen werden nicht verändert.</p>
    {settings && <form onSubmit={event => {
      event.preventDefault();setSaving(true);
      const value={enabled:settings.enabled,patterns:patterns.split(/\r?\n/).map(line => line.trim()).filter(Boolean)};
      void fetch("/api/settings/uploads",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)}).then(async response => {
        if(!response.ok) throw new Error("Upload-Filter konnte nicht gespeichert werden. Höchstens 100 Regeln mit je 128 Zeichen, ohne Pfadtrenner.");
        const saved=await response.json() as Settings;setSettings(saved);setPatterns(saved.patterns.join("\n"));notify("Upload-Filter gespeichert.");
      }).catch(error => notify(error.message,true)).finally(() => setSaving(false));
    }}>
      <label className="inline"><input type="checkbox" checked={settings.enabled} disabled={saving} onChange={event => setSettings({...settings,enabled:event.target.checked})}/>Upload-Filter aktivieren</label>
      <label className="upload-filter-field"><span>Ausgeschlossene Namen (eine Regel pro Zeile)</span><textarea className="upload-filter-rules" rows={8} value={patterns} disabled={saving} spellCheck={false} onChange={event => setPatterns(event.target.value)} aria-describedby="upload-filter-help"/></label>
      <p id="upload-filter-help"><code>*</code> steht für beliebig viele Zeichen, <code>?</code> für ein Zeichen. Zum Beispiel <code>._*</code> oder <code>*.tmp</code>. Ein passender Ordnername schließt dessen gesamten Inhalt aus. Keine Pfade oder regulären Ausdrücke.</p>
      <div className="upload-actions"><button disabled={saving}>Upload-Filter speichern</button><button type="button" className="secondary" disabled={saving} onClick={() => {setSettings({...settings,enabled:true});setPatterns(defaultUploadPatterns.join("\n"));}}>Standardregeln einsetzen</button></div>
    </form>}
  </div>;
}
