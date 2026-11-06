import { useEffect, useId, useRef, useState } from "react";
import { RegionDateTimeInput } from "./RegionDateTimeInput";
import { browserDateTime } from "./RegionTimeSettings";
import type { DateTimeSettings } from "../../backend/src/date-time-settings";
import { X } from "lucide-react";
import { resolvedDateTime } from "./date-time";
import { formatRemaining } from "./expiry";

type Props = { expiresAt: string; password: string; onExpiry: (value: string) => void; onPassword: (value: string) => void; passwordSaved?: boolean; dateTimeSettings?: DateTimeSettings; minPasswordLength?: number };
export function ProtectionIcon({ kind }: { kind: "calendar-cog" | "calendar" | "open" | "lock" }) {
  return <svg className={`protection-icon protection-${kind}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "calendar-cog" ? <><path d="M21 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6M16 2v4M3 10h18M8 2v4"/><g className="calendar-gear"><path d="m15.2 16.9-.9-.4m.9 2.6-.9.4m2.6-4.3-.4-.9m.4 6.5-.4.9m3-7.4-.4.9m.4 6.5-.4-.9m2.6-4.3-.9.4m.9 2.6-.9-.4"/><circle cx="18" cy="18" r="3"/></g></> : kind === "calendar" ? <><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>{[8,12,16].flatMap((cx, index) => [14,18].map((cy, row) => <circle key={`${cx}-${cy}`} className="calendar-dot" style={{animationDelay:`${(index + row * 3) * .1}s`}} cx={cx} cy={cy} r="1" fill="currentColor" stroke="none"/>))}</> : <><rect height="11" rx="2" width="18" x="3" y="11"/><path className="lock-arch" pathLength="1" strokeDasharray="1" strokeDashoffset={kind === "open" ? ".2" : "0"} d="M7 11V7a5 5 0 0 1 10 0v4"/></>}
  </svg>;
}
export function LinkOptions({ expiresAt, password, onExpiry, onPassword, passwordSaved = false, dateTimeSettings = browserDateTime, minPasswordLength = 0 }: Props) {
  const [open, setOpen] = useState<"expiry" | "password" | null>(null);
  const [expiryHovered, setExpiryHovered] = useState(false);
  const expiryHoverRect = useRef<DOMRect | null>(null);
  const expiryHoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!expiryHovered) return;
    const move = (event: PointerEvent) => {
      const rect = expiryHoverRect.current;
      if (!rect || event.pointerType !== "mouse") return;
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (inside) { clearTimeout(expiryHoverTimer.current); expiryHoverTimer.current = undefined; }
      else if (!expiryHoverTimer.current) expiryHoverTimer.current = setTimeout(() => { expiryHoverTimer.current = undefined; setExpiryHovered(false); }, 350);
    };
    window.addEventListener("pointermove", move);
    return () => { window.removeEventListener("pointermove", move); clearTimeout(expiryHoverTimer.current); expiryHoverTimer.current = undefined; };
  }, [expiryHovered]);
  const root = useRef<HTMLDivElement>(null);
  const expiryTrigger = useRef<HTMLButtonElement>(null);
  const passwordTrigger = useRef<HTMLButtonElement>(null);
  const expiryInput = useRef<HTMLDivElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const [position, setPosition] = useState({left:16,top:0});
  function close() { const previous = open; setOpen(null); (previous === "expiry" ? expiryTrigger : passwordTrigger).current?.focus(); }
  useEffect(() => {
    if (!open) return;
    if(open === "expiry") expiryInput.current?.querySelector("input")?.focus(); else passwordInput.current?.focus();
    const place = () => {const rect = (open === "expiry" ? expiryTrigger : passwordTrigger).current!.getBoundingClientRect(); setPosition({left:Math.max(16, Math.min(rect.right - 290, window.innerWidth - Math.min(290, window.innerWidth - 32) - 16)),top:rect.bottom+8});};
    place(); window.addEventListener("resize",place); window.addEventListener("scroll",place,true);
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null); };
    document.addEventListener("pointerdown", outside);
    return () => {document.removeEventListener("pointerdown", outside);window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);};
  }, [open]);
  function clearOption(option: "expiry" | "password") {
    if (option === "expiry") onExpiry(""); else onPassword("");
    setOpen(null);
    (option === "expiry" ? expiryTrigger : passwordTrigger).current?.focus();
  }
  const protectedLink = !!password || passwordSaved;
  return <div className="link-options" ref={root} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <div className="link-option-anchor">
      <div className={`option-control${expiresAt ? " has-expiry" : ""}${expiryHovered && expiresAt ? " hover-retained" : ""}`} onPointerEnter={event => { if (event.pointerType === "mouse" && expiresAt && !expiryHovered) { expiryHoverRect.current = event.currentTarget.getBoundingClientRect(); setExpiryHovered(true); } }}>
      <button ref={expiryTrigger} type="button" className={`option-trigger${expiresAt ? " is-set" : ""}`} title="Gültigkeit einstellen" aria-label={expiresAt ? `Gültigkeit: ${formatRemaining(expiresAt, Date.now(), resolvedDateTime(dateTimeSettings, navigator.language).locale)}` : "Gültigkeit einstellen"} aria-haspopup="dialog" aria-expanded={open === "expiry"} aria-controls={`${id}-expiry`} onClick={() => setOpen(open === "expiry" ? null : "expiry")}><ProtectionIcon kind={expiresAt ? "calendar" : "calendar-cog"}/>{expiresAt && <span className="option-value">{formatRemaining(expiresAt, Date.now(), resolvedDateTime(dateTimeSettings, navigator.language).locale)}</span>}</button>
      {expiresAt && <button type="button" className="option-remove" title="Gültigkeit entfernen" aria-label="Gültigkeit entfernen" onClick={() => clearOption("expiry")}><X size={14} aria-hidden="true"/></button>}
      </div>
      {open === "expiry" && <div id={`${id}-expiry`} className="link-option-popover" style={position} role="dialog" aria-label="Gültigkeit einstellen">
        <strong>Gültigkeit</strong>
        <div className="expiry-presets">{[[1,"1h"],[24,"1d"],[168,"7d"],[720,"30d"]].map(([hours,label]) => <button key={label} type="button" className="plain" onClick={() => {onExpiry(new Date(Date.now() + Number(hours) * 3600000).toISOString()); close();}}>{label}</button>)}</div>
        <div ref={expiryInput}><RegionDateTimeInput key={`${dateTimeSettings.region}-${dateTimeSettings.timeFormat}`} value={expiresAt} settings={dateTimeSettings} onChange={onExpiry} onEnter={close}/></div>
      </div>}
    </div>
    <div className="link-option-anchor">
      <div className={`option-control${protectedLink ? " has-password" : ""}`}>
      <button ref={passwordTrigger} type="button" className={`option-trigger${protectedLink ? " is-set" : ""}`} title={protectedLink ? "Passwortschutz ändern" : "Passwortschutz einstellen"} aria-label={protectedLink ? "Passwortschutz aktiv, ändern" : "Passwortschutz einstellen"} aria-haspopup="dialog" aria-expanded={open === "password"} aria-controls={`${id}-password`} onClick={() => setOpen(open === "password" ? null : "password")}><ProtectionIcon kind={protectedLink ? "lock" : "open"}/></button>
      {protectedLink && <button type="button" className="option-remove" title="Passwortschutz entfernen" aria-label="Passwortschutz entfernen" onClick={() => clearOption("password")}><X size={14} aria-hidden="true"/></button>}
      </div>
      {open === "password" && <div id={`${id}-password`} className="link-option-popover" style={position} role="dialog" aria-label="Passwortschutz einstellen"><strong>Passwortschutz</strong>{minPasswordLength > 0 && <small>Mindestens {minPasswordLength} Zeichen.</small>}<label className="compact-field"><span>Passwort</span><input ref={passwordInput} type="password" autoComplete="new-password" minLength={minPasswordLength || undefined} maxLength={1024} value={password} onChange={event => onPassword(event.target.value)} onKeyDown={event => {if(event.key === "Enter") {event.preventDefault();close();}}}/></label></div>}
    </div>
  </div>;
}
