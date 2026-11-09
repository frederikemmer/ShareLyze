import { useEffect, useRef, useState } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import { defaultUploadPatterns, validateUploadSettings, type UploadSettings as Settings } from "../../shared/upload-filter";
import { createAutosave } from "./autosave";
import { SettingsHelp } from "./SettingsHelp";

export function UploadSettings({notify}:{notify:(message:string,error?:boolean)=>void}) {
  const [open,setOpen]=useState(false);
  const [settings,setSettings]=useState<Settings|null>(null);
  const [patterns,setPatterns]=useState("");
  const [error,setError]=useState("");
  const notifyRef=useRef(notify);
  notifyRef.current=notify;
  const [autosave]=useState(() => createAutosave<Settings>(async value => {
    const response=await fetch("/api/settings/uploads",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
    if(!response.ok) throw new Error("Upload-Filter konnte nicht gespeichert werden.");
  }, () => {setError("");notifyRef.current("Upload-Filter gespeichert.");}, error => {
    const message=error instanceof Error ? error.message : "Upload-Filter konnte nicht gespeichert werden.";
    setError(message);notifyRef.current(message,true);
  }, 800));
  useEffect(() => {
    const controller=new AbortController();
    void fetch("/api/settings/uploads",{signal:controller.signal}).then(async response => {
      if (!response.ok) throw new Error("Upload-Filter konnte nicht geladen werden.");
      const value=await response.json() as Settings;
      setSettings(value);setPatterns(value.patterns.join("\n"));
    }).catch(error => {if(error.name !== "AbortError") notifyRef.current(error.message,true);});
    return () => {controller.abort();autosave.cancel();};
  },[autosave]);
  function update(enabled:boolean, text:string) {
    setSettings(current => current && {...current,enabled});
    setPatterns(text);
    try {
      const value=validateUploadSettings({enabled,patterns:text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)});
      setError(""); autosave.schedule(value);
    } catch {
      autosave.cancel(); setError("Höchstens 100 Regeln mit je 128 Zeichen eingeben; Pfadtrenner und Steuerzeichen sind nicht erlaubt. Änderungen wurden nicht gespeichert.");
    }
  }
  return <div className="settings-block upload-settings">
    <div className="upload-settings-heading">
      <button type="button" role="switch" className="toggle-switch" aria-label="Upload-Filter aktivieren" aria-checked={!!settings?.enabled} disabled={!settings} onClick={() => settings && update(!settings.enabled,patterns)}><span className="switch-track" aria-hidden="true"/></button>
      <button type="button" className="proxy-settings-toggle" aria-expanded={open} aria-controls="upload-filter-content" onClick={() => setOpen(!open)}><ChevronRight size={18} aria-hidden="true"/><h2>Upload-Filter</h2></button><SettingsHelp label="Hinweise zum Upload-Filter">Der Filter überspringt beim Hochladen passende Dateien und Ordner. Er berücksichtigt Namen auf jeder Ordnerebene ohne Unterscheidung von Groß- und Kleinschreibung. Bereits vorhandene Dateien und Speicherquellen bleiben unverändert.</SettingsHelp>
      <button type="button" className="share-action upload-reset" aria-label="Standardregeln wiederherstellen" title="Standardregeln wiederherstellen" disabled={!settings} onClick={() => settings && update(settings.enabled,defaultUploadPatterns.join("\n"))}><RotateCcw size={17} aria-hidden="true"/></button>
    </div>
    <div id="upload-filter-content" hidden={!open}>{settings ? <div className="upload-filter-editor">
      <div className="proxy-address-heading"><label htmlFor="upload-filter-rules">Ausgeschlossene Namen</label><SettingsHelp label="Hinweise zu ausgeschlossenen Namen">Eine Regel pro Zeile. <code>*</code> steht für beliebig viele Zeichen, <code>?</code> für genau eines. Beispielsweise erfasst <code>*.tmp</code> alle Namen mit dieser Endung. Passt ein Ordnername, wird der gesamte Ordner übersprungen. Gib nur Namen, keine Pfade, ein.</SettingsHelp></div>
      <textarea id="upload-filter-rules" className="upload-filter-rules" rows={8} value={patterns} spellCheck={false} aria-invalid={!!error} aria-describedby={error ? "upload-filter-error" : undefined} onChange={event => update(settings.enabled,event.target.value)}/>
      {error && <p id="upload-filter-error" role="alert">{error}</p>}
    </div> : <p>Einstellungen werden geladen …</p>}</div>
  </div>;
}
