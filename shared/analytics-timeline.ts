export type TimelineResolution = "day" | "hour" | "minute";
export type TimelineRow = { bucket: string; type: string; count: number };
export type Timeline = { from: string; to: string; resolution: TimelineResolution; rows: TimelineRow[] };
export type TimelinePoint = { timestamp: string; counts: Record<string, number>; cumulative: Record<string, number> };
export const timelineStep = (resolution: TimelineResolution) => resolution === "day" ? 86400000 : resolution === "hour" ? 3600000 : 60000;
export function timelinePoints(data: Timeline): TimelinePoint[] {
  const grouped = new Map<string, Record<string, number>>();
  for (const row of data.rows) {
    const counts = grouped.get(row.bucket) ?? {};
    counts[row.type] = (counts[row.type] ?? 0) + row.count;
    grouped.set(row.bucket, counts);
  }
  const totals: Record<string, number> = {}, points: TimelinePoint[] = [];
  const step = timelineStep(data.resolution), start = Date.parse(data.from), end = Date.parse(data.to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || (end-start)/step > 10000) return [];
  for (let t = start; t < end; t += step) {
    const timestamp = new Date(t).toISOString();
    const counts = grouped.get(timestamp) ?? {};
    for (const [key, count] of Object.entries(counts)) totals[key] = (totals[key] ?? 0) + count;
    points.push({ timestamp, counts, cumulative: { ...totals } });
  }
  return points;
}
