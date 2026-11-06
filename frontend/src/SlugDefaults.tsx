import { useEffect, useRef, useState } from "react";
import { createAutosave } from "./autosave";
import { SettingsHelp } from "./SettingsHelp";
import type { SlugSettings } from "../../backend/src/slug-settings";

export function SlugDefaults({notify, onSaved}: {onSaved: () => void; notify: (message: string, error?: boolean) => void}) {
  const [settings, setSettings] = useState<SlugSettings | null>(null);
  const [example, setExample] = useState("");
  const currentSettings = useRef<SlugSettings | null>(null);
  const callbacks = useRef({notify,onSaved});
  callbacks.current = {notify,onSaved};
  const [autosave] = useState(() => createAutosave<SlugSettings>(
    async value => {
      const response = await fetch("/api/settings/slugs", {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
      if(!response.ok) throw new Error("Kurznamen-Einstellungen konnten nicht übernommen werden.");
    },
    value => {
      void fetch("/api/slugs/suggest", {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})
        .then(async response => {if(response.ok) {const result = await response.json(); if(JSON.stringify(currentSettings.current) === JSON.stringify(value)) setExample(result.slug);}})
        .catch(() => {});
      callbacks.current.notify("Kurznamen-Einstellungen übernommen.");
      callbacks.current.onSaved();
    },
    error => callbacks.current.notify(error instanceof Error ? error.message : "Speichern fehlgeschlagen.",true),
  ));
  useEffect(() => () => autosave.cancel(), [autosave]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings/slugs", {signal:controller.signal}).then(async response => {if(!response.ok) throw new Error("Kurznamen-Einstellungen konnten nicht geladen werden."); const loaded = await response.json() as SlugSettings; currentSettings.current = loaded; setSettings(loaded);}).catch(error => {if(error.name !== "AbortError") notify(error.message, true);});
    return () => controller.abort();
  }, []);
  if (!settings) return <div className="settings-block"><h2>Kurznamen</h2><p>Einstellungen werden geladen …</p></div>;
  function update(values: Partial<SlugSettings>) {
    if(!currentSettings.current) return;
    const next = {...currentSettings.current,...values};
    currentSettings.current = next;
    setSettings(next);
    setExample("");
    if(Number.isInteger(next.length) && next.length >= 4 && next.length <= 64) autosave.schedule(next);
    else autosave.cancel();
  }
  return <div className="settings-block"><h2 className="slug-settings-heading">Kurznamen<SettingsHelp label="Hinweise zu Kurznamen">Aufrufregeln gelten für neu angelegte Links. Bestehende Links behalten ihre Regeln. Namen, die sich nur in Groß-/Kleinschreibung unterscheiden, bleiben zur Vermeidung von Verwechslungen gesperrt.</SettingsHelp></h2>
    <form onSubmit={event => event.preventDefault()}>
      <div className="slug-default-fields">
        <label className="compact-field"><span>Stellen</span><input type="number" required min={4} max={64} value={settings.length} onChange={event => update({length:Number(event.target.value)})}/></label>
        <label className="compact-field"><span>Zeichensatz</span><select value={settings.alphabet} onChange={event => update({alphabet:event.target.value as SlugSettings["alphabet"]})}><option value="alphanumeric">Buchstaben und Zahlen</option><option value="letters">Nur Buchstaben</option></select></label>
        <label className="compact-field"><span>Schreibweise</span><select value={settings.letterCase} onChange={event => update({letterCase:event.target.value as SlugSettings["letterCase"]})}><option value="lower">Kleinbuchstaben</option><option value="upper">Großbuchstaben</option><option value="mixed">Gemischt</option></select></label>
      </div>
      <label className="inline"><input type="checkbox" checked={settings.caseSensitive} onChange={event => update({caseSensitive:event.target.checked})}/>Groß-/Kleinschreibung beim Aufruf unterscheiden</label>
      <label className="inline"><input type="checkbox" checked={settings.avoidAmbiguous} onChange={event => update({avoidAmbiguous:event.target.checked})}/>Verwechselbare Zeichen vermeiden (0, O, o, 1, I, i, l)</label>
      {example && <p className="slug-example">Beispiel: <code>{example}</code></p>}
    </form>
  </div>;
}
