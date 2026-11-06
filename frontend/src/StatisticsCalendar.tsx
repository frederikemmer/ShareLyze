import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Timeline } from "../../shared/analytics-timeline";
import { chartMetrics } from "./StatisticsChart";
import { eventLabels } from "../../shared/analytics";

export function calendarActivity(timeline: Timeline) {
  const days = new Map<string, Record<string, number>>();
  for (const row of timeline.rows) {
    if (row.bucket < timeline.from || row.bucket >= timeline.to) continue;
    const day = row.bucket.slice(0, 10), counts = days.get(day) ?? {};
    counts[row.type] = (counts[row.type] ?? 0) + row.count;
    days.set(day, counts);
  }
  return days;
}
export function StatisticsCalendar({ timeline, locale, selection, onSelect }: {
  timeline: Timeline; locale: string; selection: string | null; onSelect: (timestamp: string) => void;
}) {
  const days = useMemo(() => calendarActivity(timeline), [timeline]);
  const first = timeline.from.slice(0, 10);
  const last = new Date(Date.parse(timeline.to) - 1).toISOString().slice(0, 10);
  const firstMonth = first.slice(0, 7), lastMonth = last.slice(0, 7);
  const [chosenMonth, setMonth] = useState(lastMonth);
  const month = chosenMonth < firstMonth ? firstMonth : chosenMonth > lastMonth ? lastMonth : chosenMonth;
  const [year, number] = month.split("-").map(Number);
  const start = Date.UTC(year, number - 1, 1);
  const offset = (new Date(start).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const move = (delta: number) => setMonth(new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7));
  const selectedDay = selection?.slice(0, 10);
  const metrics = chartMetrics.filter(m => ["view", "download_start", "transfer_finished"].includes(m.key) || timeline.rows.some(r => r.type === m.key && r.count));
  const other = timeline.rows.some(row => !chartMetrics.some(m => m.key === row.type) && row.count > 0);
  return <div className="statistics-calendar-card">
    <div className="statistics-card-heading"><div><h2>Tage, an denen etwas passiert ist</h2><p>Aktivität deiner aktuellen Auswahl · UTC · Tag auswählen, um das Log einzugrenzen.</p></div></div>
    <div className="statistics-calendar-toolbar"><strong aria-live="polite">{new Intl.DateTimeFormat(locale, {month:"long",year:"numeric",timeZone:"UTC"}).format(start)}</strong><div><button type="button" className="secondary" aria-label="Vorheriger Monat" disabled={month <= firstMonth} onClick={() => move(-1)}><ChevronLeft size={16} aria-hidden="true"/></button><button type="button" className="secondary" aria-label="Nächster Monat" disabled={month >= lastMonth} onClick={() => move(1)}><ChevronRight size={16} aria-hidden="true"/></button></div></div>
    <div className="statistics-calendar-grid" aria-label="Aktivitätskalender">
      {Array.from({length:7}, (_, i) => <span className="statistics-weekday" key={i}>{new Intl.DateTimeFormat(locale,{weekday:"short",timeZone:"UTC"}).format(Date.UTC(2026,0,5+i))}</span>)}
      {Array.from({length:offset}, (_, i) => <span aria-hidden="true" key={`empty-${i}`}/>)}
      {Array.from({length}, (_, i) => {
        const date = `${month}-${String(i+1).padStart(2,"0")}`, timestamp = date+"T00:00:00.000Z";
        const counts = days.get(date) ?? {}, total = Object.values(counts).reduce((sum,count) => sum+count,0);
        const outside = date < first || date > last;
        const description = `${new Intl.DateTimeFormat(locale,{dateStyle:"full",timeZone:"UTC"}).format(new Date(timestamp))}: ${outside ? "außerhalb des gewählten Zeitraums" : total ? Object.entries(counts).map(([type,count])=>`${count} ${eventLabels[type] ?? type}`).join(", ") : "Keine Ereignisse"}`;
        const rest = Object.entries(counts).some(([type,count]) => count > 0 && !chartMetrics.some(m => m.key===type));
        return <button type="button" key={date} disabled={outside} aria-pressed={selectedDay === date} aria-label={description} title={description} onClick={() => onSelect(timestamp)}><span className="statistics-calendar-day"><span>{i+1}</span>{total>0 && <small aria-hidden="true">{total.toLocaleString(locale)}</small>}</span><span className="statistics-calendar-marks" aria-hidden="true">{metrics.map(m => <i key={m.key} style={{background:m.color,opacity:counts[m.key] ? 1 : .08}}/>)}{other && <i style={{background:"var(--stat-grey)",opacity:rest ? 1 : .08}}/>}</span></button>;
      })}
    </div>
    <div className="statistics-calendar-legend">{metrics.map(m => <span key={m.key}><i style={{background:m.color}}/>{m.label}</span>)}{other && <span><i style={{background:"var(--stat-grey)"}}/>Weitere Ereignisse</span>}</div>
    <p className="statistics-note">Farben markieren Tage mit mindestens einem Ereignis dieser Art. Die kleine Zahl zählt alle Ereignisse des Tages, keine Personen. Leere Tage bleiben auswählbar.</p>
  </div>;
}
