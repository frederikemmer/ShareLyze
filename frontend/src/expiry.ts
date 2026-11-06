/** Format remaining time for an expiry badge. */
export function formatRemaining(expiresAt: string, now: number, locale = "de-DE"): string {
  const milliseconds = Date.parse(expiresAt) - now;
  if (!Number.isFinite(milliseconds)) return "–";
  if (milliseconds <= 0) return "Abgelaufen";
  const minutes = milliseconds / 60000;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}min`;
  const hours = minutes / 60;
  const value = hours >= 24 ? hours / 24 : hours;
  return `${value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${hours >= 24 ? "d" : "h"}`;
}
