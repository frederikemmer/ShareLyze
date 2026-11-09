import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Link2, Download, CircleCheck, CircleX } from "lucide-react";
import type { Timeline } from "../../shared/analytics-timeline";
import { timelinePoints } from "../../shared/analytics-timeline";


export const chartMetrics = [
  { key: "view", label: "Freigabeansichten", color: "var(--stat-teal)" },
  { key: "download_start", label: "Downloadstarts", color: "var(--stat-purple)" },
  { key: "transfer_finished", label: "Serverabschlüsse", color: "var(--stat-amber)" },
  { key: "redirect", label: "Weiterleitungen", color: "var(--stat-blue)" },
  { key: "zip_start", label: "ZIP-Starts", color: "var(--stat-pink)" },
  { key: "zip_finished", label: "ZIP-Abschlüsse", color: "var(--stat-grey)" },
];
export function StatisticsChart({ timeline, locale }: {
  timeline: Timeline; locale: string;
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
  const metrics = [
    {key:"view", label:"Freigabeansichten", color:"var(--stat-teal)", keys:["view"], icon:Eye},
    {key:"redirect", label:"Kurzlink-Weiterleitungen", color:"var(--stat-blue)", keys:["redirect"], icon:Link2},
    {key:"started", label:"Downloads gestartet", color:"var(--stat-purple)", keys:["download_start","zip_start"], icon:Download},
    {key:"aborted", label:"Downloads abgebrochen", color:"var(--stat-pink)", keys:["download_aborted","zip_aborted"], icon:CircleX},
    {key:"completed", label:"Downloads erfolgreich", color:"var(--stat-amber)", keys:["transfer_finished","zip_finished"], icon:CircleCheck},
  ];
  const value = (counts: Record<string, number>, metric: typeof metrics[number]) => metric.keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  const shown = metrics.filter(m => !hidden.includes(m.key));
  const lastActive = points.reduce((last,p,i) => Object.values(p.counts).some(n => n > 0) ? i : last, -1);
  const selectedIndex = Math.min(points.length - 1, Math.max(0, index ?? (lastActive < 0 ? points.length - 1 : lastActive)));
  const point = points[selectedIndex];
  const max = Math.max(2, Math.ceil(Math.max(0, ...shown.map(m => value(total, m))) / 2) * 2);
  const x = (i: number) => 42 + (i / Math.max(1, points.length - 1)) * (width - 66);
  const y = (value: number) => 186 - value / max * 150;
  const date = (timestamp: string) => new Intl.DateTimeFormat(locale, timeline.resolution === "day" ? { day: "2-digit", month: "short", timeZone: "UTC" } : { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(timestamp));
  const choose = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(points.length - 1, Math.round(((event.clientX - rect.left) / rect.width * width - 42) / (width - 66) * (points.length - 1))));
    setIndex(i);
  };
  return <>
    <div className="statistics-card-heading"><h2>Kumuliert</h2><div className="statistics-series" aria-label="Kurven ein- oder ausblenden">{[[metrics[0]], [metrics[1]], metrics.slice(2)].map((group, i) => <div className="statistics-series-group" key={i}>{group.map(m => <button type="button" key={m.key} title={m.label} aria-label={`${m.label}: ${value(total,m).toLocaleString(locale)}`} aria-pressed={!hidden.includes(m.key)} onClick={() => setHidden(current => current.includes(m.key) ? current.filter(k => k !== m.key) : [...current, m.key])}><m.icon size={15} style={{color:m.color}} aria-hidden="true"/><strong>{value(total,m).toLocaleString(locale)}</strong></button>)}</div>)}</div></div>
    <div className="statistics-chart-wrap" onPointerLeave={() => setIndex(null)}>
    <svg ref={svgRef} className="statistics-chart" viewBox={`0 0 ${width} 232`} preserveAspectRatio="none" role="img" aria-label="Kumulierte Ereignisse im gewählten Zeitraum. Werte beim Bewegen über den Graphen." onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); choose(e); }} onPointerMove={e => { if (e.pointerType === "mouse" || e.currentTarget.hasPointerCapture(e.pointerId)) choose(e); }} >
      {[0, 1, 2].map(i => <g key={i}><line x1="42" x2={width - 24} y1={y(max * i / 2)} y2={y(max * i / 2)} className="statistics-gridline"/><text x="0" y={y(max * i / 2) + 4}>{(max * i / 2).toLocaleString(locale)}</text></g>)}
      {shown.map((m,j) => <path key={m.key} d={points.map((p, i) => `${i ? "H" : "M"} ${x(i)}${i ? " V" : ""} ${y(value(p.cumulative, m))}`).join(" ")} fill="none" stroke={m.color} strokeWidth="2.3" strokeDasharray={j > 2 ? "5 3" : undefined}/>)}
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].filter((i, n, all) => i >= 0 && all.indexOf(i) === n).map((i,n) => <text key={i} x={x(i)} y="220" textAnchor={n === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>{date(points[i].timestamp)}</text>)}
      {point && index !== null && <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1="24" y2="188" className="statistics-crosshair"/>}
    </svg>
    {point && index !== null && <div className="statistics-tooltip" style={{left: `${Math.min(78, Math.max(2, x(selectedIndex) / width * 100))}%`}}><strong>{date(point.timestamp)} · UTC</strong>{shown.map(m => <span key={m.key}><i style={{background:m.color}}/><span>{m.label}</span><b>{(value(point.cumulative, m)).toLocaleString(locale)}</b></span>)}</div>}
    </div>
    {!shown.length && <p role="status">Alle Kurven ausgeblendet. Oben mindestens eine Kennzahl einschalten.</p>}
  </>;
}
