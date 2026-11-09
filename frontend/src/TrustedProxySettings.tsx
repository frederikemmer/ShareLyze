import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { createAutosave } from "./autosave";
import { SettingsHelp } from "./SettingsHelp";

type Settings = { proxies:string[]; locked:boolean; peerAddress:string|null };

export function TrustedProxySettings({notify}:{notify:(message:string,error?:boolean)=>void}) {
  const [open,setOpen]=useState(false);
  const [settings,setSettings]=useState<Settings|null>(null);
  const [addresses,setAddresses]=useState("");
  const [error,setError]=useState("");
  const callbacks=useRef(notify);
  callbacks.current=notify;
  const [autosave]=useState(() => createAutosave<string>(async value => {
    const proxies=value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    const response=await fetch("/api/settings/trusted-proxies",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({proxies})});
    if(!response.ok) throw new Error(response.status===409 ? "Die Proxy-Einstellungen werden durch TRUSTED_PROXIES vorgegeben." : response.status===400 ? "Bitte gültige IP-Adressen oder CIDR-Netze ohne /0 eingeben. Änderungen wurden nicht gespeichert." : "Proxy-Einstellungen konnten nicht gespeichert werden.");
  }, () => {setError(""); callbacks.current("Proxy-Einstellungen gespeichert.");}, error => {
    const message=error instanceof Error ? error.message : "Proxy-Einstellungen konnten nicht gespeichert werden.";
    setError(message); callbacks.current(message,true);
  }, 1200));
  useEffect(() => {
    const controller=new AbortController();
    void fetch("/api/settings/trusted-proxies",{signal:controller.signal}).then(async response => {
      if(!response.ok) throw new Error("Proxy-Einstellungen konnten nicht geladen werden.");
      const value=await response.json() as Settings;
      setSettings(value);setAddresses(value.proxies.join("\n"));
    }).catch(error => {if(error.name !== "AbortError") callbacks.current(error.message,true);});
    return () => {controller.abort(); autosave.cancel();};
  },[autosave]);
  return <div className="settings-block proxy-settings">
    <div className="proxy-settings-heading"><button type="button" className="proxy-settings-toggle" aria-expanded={open} aria-controls="proxy-settings-content" onClick={() => setOpen(!open)}><ChevronRight size={18} aria-hidden="true"/><h2>Vertrauenswürdige Proxys</h2></button><SettingsHelp label="Hinweise zu vertrauenswürdigen Proxys">Trage die IP-Adressen deiner Reverse-Proxys ein, damit ShareLyze weitergeleitete Besucheradressen für Statistiken und Zugriffslimits verwendet.</SettingsHelp></div>
      <div id="proxy-settings-content" hidden={!open}>{settings ? <div className="proxy-settings-content">
        <div className="proxy-address-heading"><label htmlFor="trusted-proxy-addresses">Erlaubte Proxy-Adressen (eine pro Zeile)</label><SettingsHelp label="Hinweise zu Proxy-Adressen">Direkte Verbindungsadresse: <code>{settings.peerAddress ?? "unbekannt"}</code>. Trage sie nur ein, wenn sie zu deinem Proxy gehört. Auch weitere vertrauenswürdige Proxys in der Weiterleitungskette müssen eingetragen werden. Der Proxy muss <code>X-Forwarded-For</code> korrekt setzen. Bereits gespeicherte Zugriffe ändern sich nicht.</SettingsHelp></div>
        <textarea id="trusted-proxy-addresses" className="upload-filter-rules" rows={4} value={addresses} disabled={settings.locked} spellCheck={false} placeholder={'192.168.1.10\n2001:db8::1'} aria-invalid={!!error} aria-describedby={error ? "trusted-proxy-error" : undefined} onChange={event => {const value=event.target.value; setAddresses(value); setError(""); autosave.schedule(value);}} />
        {error && <p id="trusted-proxy-error" role="alert">{error}</p>}
        {settings.locked && <p>Diese Einstellung wird durch <code>TRUSTED_PROXIES</code> vorgegeben und kann hier nicht geändert werden.</p>}
      </div> : <p>Einstellungen werden geladen …</p>}
    </div>
  </div>;
}
