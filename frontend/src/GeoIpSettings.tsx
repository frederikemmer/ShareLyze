import { useEffect, useState } from "react";
export type GeoIpStatus={available:boolean;running:boolean;phase:string;downloadedBytes:number;error:string;cityReady:boolean;asnReady:boolean;cityDate:string|null;asnDate:string|null};
export function GeoIpSettings() {
  const [status,setStatus]=useState<GeoIpStatus|null>(null),[error,setError]=useState("");
  useEffect(() => {
    const controller=new AbortController();
    const load=() => {void fetch("/api/geoip",{signal:controller.signal}).then(async response => {if(!response.ok) throw new Error("GeoIP-Status konnte nicht geladen werden.");setStatus(await response.json());}).catch(e => {if(e.name!=="AbortError") setError(e.message);});};
    load();const timer=setInterval(load,3000);
    return () => {controller.abort();clearInterval(timer);};
  },[]);
  return <div className="settings-block"><h2>Standort und Netzanbieter</h2>
    <p>Standorte und Netzbetreiber werden lokal aus kostenlosen DB-IP-Lite-Datenbanken ermittelt. Besucher-IPs werden nicht an DB-IP gesendet. Einmal installieren; danach werden installierte Daten monatlich im Hintergrund aktualisiert.</p>
    <p>IP-Standorte sind Näherungen und können bei VPN, Mobilfunk und Proxys deutlich abweichen. Datenumfang und Genauigkeit hängen von der Datenbank ab.</p>
    {status && <><p role="status">Standortdaten: {status.cityReady ? "installiert" : "fehlen"}{status.cityDate ? " · "+new Date(status.cityDate).toLocaleDateString() : ""} · Netzanbieter: {status.asnReady ? "installiert" : "fehlen"}{status.asnDate ? " · "+new Date(status.asnDate).toLocaleDateString() : ""}</p>
      {status.running && <p role="status">Download {status.phase==="city" ? "Standorte" : "Netzanbieter"} · {(status.downloadedBytes/1024**2).toFixed(1)} MiB empfangen</p>}
      {status.error && <p role="alert">{status.error} Vorhandene Datenbanken bleiben bei einem fehlgeschlagenen Download verfügbar.</p>}
      <button type="button" disabled={!status.available || status.running} onClick={() => {
        setError("");
        void fetch("/api/geoip/update",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}).then(async response => {if(!response.ok) throw new Error("GeoIP-Download konnte nicht gestartet werden.");setStatus(await response.json());}).catch(e => setError(e.message));
      }}>{status.cityReady ? "Standortdaten aktualisieren" : "Standortdaten installieren"}</button>
      {!status.available && <p>Für GeoIP wird ein beschreibbares Konfigurationsverzeichnis benötigt.</p>}
    </>}
    {error && <p role="alert">{error}</p>}
    <p className="muted">Erster Download: etwa 130 MB, zusätzlich Arbeitsspeicher und Platz für entpackte Daten. <a href="https://db-ip.com" target="_blank" rel="noreferrer">IP Geolocation by DB-IP</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>
  </div>;
}
