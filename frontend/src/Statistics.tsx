import { useMemo, useState } from "react";

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
const labels: Record<string, string> = {
  view: "Seitenaufrufe",
  redirect: "Weiterleitungen",
  download_start: "Downloadstarts",
  transfer_finished: "Serverübertragungen abgeschlossen",
  zip_start: "ZIP-Starts",
  zip_finished: "ZIP-Übertragungen abgeschlossen",
};
function describeAgent(agent: string | null) {
  if (!agent) return "Unbekannt";
  const browser = agent.match(/(?:Edg|OPR|Chrome|Firefox|Version)\/([\d.]+)/);
  const name = browser?.[0].startsWith("Edg/") ? "Edge" : browser?.[0].startsWith("OPR/") ? "Opera" : browser?.[0].startsWith("Chrome/") ? "Chrome" : browser?.[0].startsWith("Firefox/") ? "Firefox" : browser && agent.includes("Safari/") ? "Safari" : "Unbekannter Browser";
  const os = /Android/i.test(agent) ? "Android" : /iPhone|iPad|iPod/i.test(agent) ? "iOS / iPadOS" : /Windows/i.test(agent) ? "Windows" : /Mac OS X/i.test(agent) ? "macOS" : /Linux/i.test(agent) ? "Linux" : "Unbekanntes Betriebssystem";
  const device = /iPad|Tablet/i.test(agent) ? "Tablet" : /Mobile|iPhone/i.test(agent) ? "Mobilgerät" : "Gerät nicht sicher bestimmbar";
  return `${name}${browser && name !== "Unbekannter Browser" ? " " + browser[1] : ""} · ${os} · ${device}`;
}
export function Statistics({ data }: { data: Analytics | null }) {
  const [slug, setSlug] = useState("all");
  const [metric, setMetric] = useState("view");
  const choices = useMemo(
    () => Array.from(new Set(data?.links.map((x) => x.slug) ?? [])).sort(),
    [data],
  );
  const rows =
    (slug === "all"
      ? data?.daily
      : data?.dailyByLink.filter((x) => x.slug === slug)
    )
      ?.filter((x) => x.type === metric)
      .slice()
      .reverse() ?? [];
  const max = Math.max(1, ...rows.map((x) => x.count));
  const summary = (data?.links ?? []).filter(
    (x) => slug === "all" || x.slug === slug,
  );
  const count = (type: string) =>
    summary.filter((x) => x.type === type).reduce((sum, x) => sum + x.count, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ÜBERSICHT</p>
          <h1>Statistiken</h1>
          <p>Aufrufe und Übertragungen deiner Freigaben und Kurzlinks.</p>
        </div>
      </div>
      <div className="stat-filters">
        <label className="compact-field">
          <span>Link</span>
          <select value={slug} onChange={(e) => setSlug(e.target.value)}>
            <option value="all">Alle Links</option>
            {choices.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          <span>Verlauf</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {Object.entries(labels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="stats-grid">
        {["view", "redirect", "download_start", "transfer_finished"].map(
          (k) => (
            <div className="stat-cell" key={k}>
              <span>{labels[k]}</span>
              <strong>{count(k).toLocaleString("de-DE")}</strong>
            </div>
          ),
        )}
      </div>
      <div className="stats-block">
        <h2>Verlauf</h2>
        <p className="muted">
          {labels[metric]} · {slug === "all" ? "Alle Links" : slug}
        </p>
        {rows.length ? (
          <div className="chart" role="list" aria-label="Tageswerte">
            {rows.map((x, i) => (
              <div className="chart-row" role="listitem" key={`${x.day}-${i}`}>
                <time>{x.day}</time>
                <div className="chart-track">
                  <span
                    style={{ width: `${Math.max(2, (x.count / max) * 100)}%` }}
                  />
                </div>
                <strong>{x.count}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            Für diese Auswahl liegen noch keine Daten vor.
          </p>
        )}
      </div>
      <div className="stats-block">
        <h2>Downloads nach Datei</h2>
        <p className="muted">
          Downloadstarts einschließlich fortgesetzter Anfragen; angezeigt werden
          höchstens die 100 häufigsten Dateieinträge über alle Links.
        </p>
        {(data?.files.filter((f) => slug === "all" || f.slug === slug).length ??
          0) > 0 ? (
          <ul className="stat-list">
            {data?.files
              .filter((f) => slug === "all" || f.slug === slug)
              .map((f, i) => (
                <li key={i}>
                  <span>
                    {f.title} · {f.relative_path}
                    {f.file_path ? "/" + f.file_path : ""}
                  </span>
                  <strong>{f.count}</strong>
                </li>
              ))}
          </ul>
        ) : (
          <p className="empty-state">Keine Dateieinträge in dieser Auswahl.</p>
        )}
      </div>
      <div className="stats-block">
        <h2>Letzte Abrufe</h2>
        <p className="muted">Die letzten 200 Ereignisse über alle Links. Browser und Gerät beruhen auf ungeprüften Angaben des Clients; ein Standort wird nicht ermittelt.</p>
        {(data?.recent ?? []).filter((e) => slug === "all" || e.slug === slug).map((e) => (
          <div className="visitor-event" key={e.id}>
            <strong>{labels[e.type] ?? e.type} · {e.slug}</strong>
            <div>{new Date(e.created_at).toLocaleString("de-DE")} · IP: {e.ip_address ?? "Unbekannt"}</div>
            <div>Browser / Gerät: {describeAgent(e.user_agent)}</div>
            {e.user_agent && <details><summary>Vollständiger User-Agent</summary>{e.user_agent}</details>}
            <div>Herkunft: {e.referrer_origin ?? "Unbekannt"}</div>
          </div>
        ))}
        {!data?.recent.length && <p className="empty-state">Noch keine Ereignisse vorhanden.</p>}
      </div>
      <p className="muted">
        Serverübertragungen bestätigen nicht, dass eine Datei gespeichert wurde.
        Aufrufe und Anfragen sind keine eindeutigen Personen.
      </p>
    </>
  );
}
