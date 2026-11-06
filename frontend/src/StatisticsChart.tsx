import { useEffect, useMemo, useRef, useState } from "react";
import type { Timeline, TimelinePoint } from "../../shared/analytics-timeline";
import { timelinePoints } from "../../shared/analytics-timeline";
import { eventLabels } from "../../shared/analytics";

export const chartMetrics = [
  { key: "view", label: "Freigabeansichten", color: "var(--stat-teal)" },
  { key: "download_start", label: "Downloadstarts", color: "var(--stat-purple)" },
  { key: "transfer_finished", label: "Serverabschlüsse", color: "var(--stat-amber)" },
  { key: "redirect", label: "Weiterleitungen", color: "var(--stat-blue)" },
  { key: "zip_start", label: "ZIP-Starts", color: "var(--stat-pink)" },
  { key: "zip_finished", label: "ZIP-Abschlüsse", color: "var(--stat-grey)" },
];
export function StatisticsChart({ timeline, locale, onSelect, selection }: {
  timeline: Timeline; locale: string; onSelect: (point: TimelinePoint) => void; selection: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [width,setWidth] = useState(900);
  useEffect(() => {
    const svg=svgRef.current;if(!svg)return;
    const observer=new ResizeObserver(()=>setWidth(Math.max(260,svg.clientWidth)));
    observer.observe(svg);return ()=>observer.disconnect();
  },[]);
  const points = useMemo(() => timelinePoints(timeline), [timeline]);
  const [index, setIndex] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const total = points.at(-1)?.cumulative ?? {};
  const metrics = chartMetrics.filter(m => ["view", "download_start", "transfer_finished"].includes(m.key) || total[m.key]);
  const shown = metrics.filter(m => !hidden.includes(m.key));
  const lastActive = points.reduce((last,p,i) => Object.values(p.counts).some(n => n > 0) ? i : last, -1);
  const selectedIndex = Math.min(points.length - 1, Math.max(0, index ?? (lastActive < 0 ? points.length - 1 : lastActive)));
  const point = points[selectedIndex];
  const max = Math.max(2, Math.ceil(Math.max(0, ...shown.map(m => total[m.key] ?? 0)) / 2) * 2);
  const x = (i: number) => 42 + (i / Math.max(1, points.length - 1)) * (width - 66);
  const y = (value: number) => 186 - value / max * 150;
  const date = (timestamp: string) => new Intl.DateTimeFormat(locale, timeline.resolution === "day" ? { day: "2-digit", month: "short", timeZone: "UTC" } : { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(timestamp));
  const choose = (event: React.PointerEvent<SVGSVGElement>, commit = false) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(points.length - 1, Math.round(((event.clientX - rect.left) / rect.width * width - 42) / (width - 66) * (points.length - 1))));
    setIndex(i);
    if (commit && points[i]) onSelect(points[i]);
  };
  return <>
    <div className="statistics-series" aria-label="Kurven ein- oder ausblenden">{metrics.map(m => <button type="button" key={m.key} aria-pressed={!hidden.includes(m.key)} onClick={() => setHidden(current => current.includes(m.key) ? current.filter(k => k !== m.key) : [...current, m.key])}><i style={{ background: m.color }}/>{m.label}<strong>{(total[m.key] ?? 0).toLocaleString(locale)}</strong></button>)}</div>
    <svg ref={svgRef} className="statistics-chart" viewBox={`0 0 ${width} 232`} preserveAspectRatio="none" role="img" aria-label="Kumulierte Ereignisse im gewählten Zeitraum. Genaue Werte über den Regler darunter." onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); choose(e); }} onPointerMove={e => { if (e.pointerType === "mouse" || e.currentTarget.hasPointerCapture(e.pointerId)) choose(e); }} onPointerUp={e => choose(e, true)}>
      {[0, 1, 2].map(i => <g key={i}><line x1="42" x2={width - 24} y1={y(max * i / 2)} y2={y(max * i / 2)} className="statistics-gridline"/><text x="0" y={y(max * i / 2) + 4}>{(max * i / 2).toLocaleString(locale)}</text></g>)}
      {shown.map((m,j) => <path key={m.key} d={points.map((p, i) => `${i ? "H" : "M"} ${x(i)}${i ? " V" : ""} ${y(p.cumulative[m.key] ?? 0)}`).join(" ")} fill="none" stroke={m.color} strokeWidth="2.3" strokeDasharray={j > 2 ? "5 3" : undefined}/>)}
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].filter((i, n, all) => i >= 0 && all.indexOf(i) === n).map((i,n) => <text key={i} x={x(i)} y="220" textAnchor={n === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>{date(points[i].timestamp)}</text>)}
      {point && <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1="24" y2="188" className="statistics-crosshair"/>}
    </svg>
    {point && <>
      <div className="statistics-readout"><strong>{date(point.timestamp)} · UTC</strong>{shown.map(m => <span key={m.key}><i style={{ background: m.color }}/><b>{(point.cumulative[m.key] ?? 0).toLocaleString(locale)}</b> {m.label}<small>+{point.counts[m.key] ?? 0} in diesem {timeline.resolution === "day" ? "Tag" : timeline.resolution === "hour" ? "Stundenintervall" : "Minutenintervall"}</small></span>)}</div>
      <input className="statistics-range" type="range" min={0} max={points.length - 1} value={selectedIndex} aria-label="Zeitpunkt im Verlauf" aria-valuetext={`${date(point.timestamp)} UTC: ${shown.map(m => `${point.cumulative[m.key] ?? 0} ${eventLabels[m.key]}`).join(", ")}`} onChange={e => setIndex(Number(e.target.value))}/>
      <div className="statistics-chart-actions"><span>Kurven kumulieren seit Zeitraumstart · Tippen filtert das Log.</span><button type="button" className="secondary" aria-pressed={selection === point.timestamp} onClick={() => onSelect(point)}>Ereignisse dieses Zeitpunkts</button></div>
    </>}
    {!shown.length && <p role="status">Alle Kurven ausgeblendet. Oben mindestens eine Kennzahl einschalten.</p>}
  </>;
}
