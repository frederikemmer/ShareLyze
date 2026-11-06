import { startPublicTelemetry,publicCampaignQuery,reportPublicResourceError,withPublicVisit } from "./public-telemetry";
import { isUploadIgnored, type UploadSettings } from "../../shared/upload-filter";
import { StorageSettings } from "./StorageSettings";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { RegionTimeSettings, browserDateTime } from "./RegionTimeSettings";
import type { DateTimeSettings } from "../../backend/src/date-time-settings";
import { SettingsHelp } from "./SettingsHelp";
import { SlugDefaults } from "./SlugDefaults";
import { LinkOptions, ProtectionIcon } from "./LinkOptions";
import { formatTimestamp, resolvedDateTime } from "./date-time";
import { formatRemaining } from "./expiry";
import { Statistics, type Analytics } from "./Statistics";
import { Notifications, type Notification } from "./Notifications";
import { version } from "../../package.json";
import { motion, useReducedMotion } from "motion/react";
import {
  BarChart3, CircleAlert, QrCode,
  Download, CalendarDays,
  File, Files, Image as ImageIcon, LayoutGrid, List, ListCollapse, ChevronDown, ChevronLeft, ChevronRight, Film,
  Folder,
  Link2,
  LockKeyhole,
  LogOut,
  Settings,
  Search, X, Save,
  Share2,
  UserRound,
} from "lucide-react";

const QrCodes = React.lazy(() => import("./QrCodes").then(module => ({default:module.QrCodes})));

function ActionIcon({ kind }: { kind: "external" | "copy" | "pen" }) {
  return <svg className={`action-icon action-icon-${kind}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "external" ? <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><g className="icon-moving"><path d="M15 3h6v6" /><path d="M10 14 21 3" /></g></> : kind === "copy" ? <><rect className="icon-moving" height="14" rx="2" width="14" x="8" y="8" /><path className="icon-copy-back" d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></> : <><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path className="icon-moving" d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" /></>}
  </svg>;
}

function DeleteIcon() {
  return <svg className="delete-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <g className="delete-lid"><path d="M3 6h18"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></g>
    <path className="delete-body" d="M19 8v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V8"/>
    <g className="delete-lines"><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></g>
  </svg>;
}

function HardDriveUploadIcon() {
  return <svg className="upload-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect height="8" rx="2" width="20" x="2" y="14"/><path d="M6 18h.01M10 18h.01"/><g className="upload-arrow"><path d="m16 6-4-4-4 4"/><path d="M12 2v8"/></g></svg>;
}

function PublicImage({ src, name, onOpen }: { src: string; name: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <button type="button" className="public-image" aria-label={`${name} groß anzeigen`} disabled={failed} onClick={onOpen}>{failed ? <ImageIcon size={32} aria-hidden="true" /> : <img src={src} alt="" loading="lazy" decoding="async" onError={() => {setFailed(true);reportPublicResourceError(src);}} />}</button>;
}

type ViewerMedia = { name: string; view: string; download: string; size: string; kind: "image" | "video" };
function PublicMediaViewer({ media, index, onMove, onClose }: { media: ViewerMedia[]; index: number; onMove: (index: number) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const current = media[index];
  const [failed, setFailed] = useState(false);
  useEffect(() => { const node = dialog.current!; if (!node.open) node.showModal(); }, []);
  useEffect(() => { setFailed(false); }, [current.view]);
  return <dialog className="public-image-dialog" ref={dialog} aria-labelledby="public-image-title" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }} onKeyDown={event => {
    if (event.target instanceof HTMLVideoElement || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); onMove(index - 1); }
    if (event.key === "ArrowRight" && index < media.length - 1) { event.preventDefault(); onMove(index + 1); }
  }}>
    <div className="public-image-dialog-content"><div className="public-viewer-stage">
      <button type="button" className="public-viewer-close public-viewer-action" aria-label="Vorschau schließen" onClick={() => dialog.current?.close()} autoFocus><X size={22} aria-hidden="true"/></button>
      {index > 0 && <button type="button" className="public-viewer-prev public-viewer-action" aria-label="Vorheriges Medium" onClick={() => onMove(index - 1)}><ChevronLeft size={22} aria-hidden="true"/></button>}
      {failed ? <p className="public-image-error" role="alert">{current.kind === "video" ? "Dieses Videoformat oder der Codec wird von deinem Browser nicht unterstützt oder das Video konnte nicht geladen werden." : "Das Bild kann nicht angezeigt werden."} Du kannst die Datei herunterladen.</p> : current.kind === "video" ? <video key={current.view} className="public-image-original" controls playsInline preload="metadata" src={current.view} onError={() => {setFailed(true);reportPublicResourceError(current.view);}}>Dieses Video wird von deinem Browser nicht unterstützt.</video> : <img key={current.view} className="public-image-original" src={current.view} alt={current.name} onError={() => {setFailed(true);reportPublicResourceError(current.view);}}/>}
      {index < media.length - 1 && <button type="button" className="public-viewer-next public-viewer-action" aria-label="Nächstes Medium" onClick={() => onMove(index + 1)}><ChevronRight size={22} aria-hidden="true"/></button>}
    </div><div className="public-viewer-meta"><strong id="public-image-title" title={current.name}>{current.name}</strong><span className="public-download-pill"><PublicSize url={current.size}/><PublicDownload href={current.download} name={current.name}/></span><span className="public-viewer-position">{index + 1} / {media.length}</span></div></div>
  </dialog>;
}

let publicSizeActive = 0;
const publicSizeQueue: (() => void)[] = [];
function schedulePublicSize(task: () => Promise<void>) {
  let cancelled = false;
  const start = () => {
    if (cancelled) return;
    publicSizeActive++;
    void task().finally(() => { publicSizeActive--; publicSizeQueue.shift()?.(); });
  };
  if (publicSizeActive < 4) start(); else publicSizeQueue.push(start);
  return () => { cancelled = true; const index = publicSizeQueue.indexOf(start); if (index >= 0) publicSizeQueue.splice(index, 1); };
}
function PublicSize({ url }: { url: string }) {
  const [size, setSize] = useState<number | "error" | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    setSize(null);
    const controller = new AbortController();
    let cancel = () => {};
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      cancel = schedulePublicSize(async () => {
        try { const result = await api<{totalBytes:number}>(url, { signal: controller.signal }); setSize(result.totalBytes); }
        catch { if (!controller.signal.aborted) setSize("error"); }
      });
    }, {rootMargin:"200px"});
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); cancel(); controller.abort(); };
  }, [url]);
  return <span ref={ref} className="public-size" title={size === "error" ? "Größe nicht verfügbar" : "Größe der enthaltenen Dateien"}>{typeof size === "number" ? formatBytes(size) : size === "error" ? "–" : "…"}</span>;
}
function PublicDownload({ href, name }: { href:string; name:string }) {
  const reducedMotion = useReducedMotion();
  return <motion.a className="public-item-download" href={href} aria-label={`${name} herunterladen`} title={`${name} herunterladen`} initial="normal" whileHover={reducedMotion ? "normal" : "animate"} whileFocus={reducedMotion ? "normal" : "animate"}>
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <motion.g variants={{ normal: { y: 0 }, animate: { y: 2, transition: { type: "spring", stiffness: 320, damping: 12, mass: 1 } } }}><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></motion.g>
    </svg>
  </motion.a>;
}

type Source = { id: string; name: string };
type Entry = { name: string; kind: "file" | "directory" };
type Item = { sourceId: string; path: string; kind: "file" | "directory"; fileCount?: number; totalBytes?: number };
function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${Math.round(value * 10) / 10} ${units[unit]}`;
}
function SelectedItem({ item, sourceName, onRemove }: { item: Item; sourceName: string; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [measurement, setMeasurement] = useState<{fileCount: number; totalBytes: number} | "loading" | "error">(item.totalBytes !== undefined ? { fileCount: item.fileCount ?? 1, totalBytes: item.totalBytes } : "loading");
  useEffect(() => {
    if (item.totalBytes !== undefined) { setMeasurement({fileCount: item.fileCount ?? 1, totalBytes: item.totalBytes}); return; }
    const controller = new AbortController();
    setMeasurement("loading");
    api<{fileCount: number; totalBytes: number}>(`/api/sources/${encodeURIComponent(item.sourceId)}/size?path=${encodeURIComponent(item.path)}&kind=${item.kind}`, {signal: controller.signal})
      .then(setMeasurement).catch(() => { if (!controller.signal.aborted) setMeasurement("error"); });
    return () => controller.abort();
  }, [item.sourceId, item.path, item.kind, item.fileCount, item.totalBytes]);
  const root = useRef<HTMLLIElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 16, top: 0 });
  const name = item.path.split("/").filter(Boolean).at(-1) || sourceName;
  useEffect(() => {
    if (!open) return;
    const place = () => { const rect = trigger.current?.getBoundingClientRect(); if (rect) setPosition({ left: Math.max(16, Math.min(rect.right - 290, window.innerWidth - Math.min(290, window.innerWidth - 32) - 16)), top: rect.bottom + 8 }); };
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    place(); document.addEventListener("pointerdown", outside); window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);
  return <li ref={root} className="selected-pill" onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <span className="selected-pill-name" title={item.sourceId === "sharelyze-uploads" ? name : `${sourceName}: /${item.path}`}>{item.kind === "directory" ? <Folder size={15} aria-hidden="true"/> : <File size={15} aria-hidden="true"/>}{name}</span>
    {typeof measurement === "object" && item.kind === "directory" && <span>{measurement.fileCount} {measurement.fileCount === 1 ? "Datei" : "Dateien"}</span>}
    {typeof measurement === "object" && <span>{formatBytes(measurement.totalBytes)}</span>}
    {measurement === "loading" && <span role="status" aria-label="Größe wird ermittelt"><svg className="upload-spinner" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>}
    {measurement === "error" && <span title="Größe konnte nicht ermittelt werden">Größe unbekannt</span>}
    <button ref={trigger} type="button" aria-label={`${name} aus Auswahl entfernen`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}><X size={15} aria-hidden="true"/></button>
    {open && <div role="dialog" aria-label="Aus Auswahl entfernen" className="link-option-popover" style={position}><strong>„{name}“ entfernen?</strong><small>Das Element wird nur aus dieser Freigabeauswahl entfernt.</small><div className="selected-confirm-actions"><button type="button" className="secondary" onClick={() => {setOpen(false); trigger.current?.focus();}}>Abbrechen</button><button type="button" onClick={onRemove}>Entfernen</button></div></div>}
  </li>;
}
type Share = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  active: number;
  expires_at: string | null;
  has_password: number;
};
type Link = { id: string; slug: string; target_url: string; active: number; expires_at: string | null; has_password: number; has_copyable_password: number };
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    let code: unknown;
    if (response.status === 403) {
      try {
        code = (await response.json()).code;
      } catch {
        /* Use a generic message. */
      }
    }
    throw new Error(
      code === "INVALID_SETUP_TOKEN"
        ? "Der Einrichtungsschlüssel ist ungültig. Verwende den Schlüssel des aktuellen Starts oder aus der SETUP_TOKEN-Konfiguration."
        : response.status === 501 && path === "/api/uploads"
          ? "Uploads sind mit dem lokal gestarteten macOS-Backend noch nicht verfügbar. Verwende ein Linux-Backend."
        : code === "INVALID_ORIGIN"
          ? "Diese Adresse ist nicht für ShareLyze freigegeben. Öffne die im Terminal angezeigte Adresse oder prüfe PUBLIC_ORIGIN."
          : response.status === 401
            ? path.endsWith("/unlock")
              ? "Das Passwort ist falsch."
              : path === "/api/auth/login"
                ? "Benutzername oder Passwort ist falsch."
                : "Anmeldung erforderlich."
            : response.status === 400 && path === "/api/settings"
              ? "Bitte eine HTTPS-Adresse ohne Pfad, Zugangsdaten oder Parameter eingeben. HTTP ist nur für localhost erlaubt."
              : response.status === 413
                ? "Die Anfrage oder der Ordner ist zu groß (höchstens 10.000 Einträge pro Ordner)."
                : response.status === 429
                  ? "Zu viele Anfragen. Bitte später erneut versuchen."
                  : `Anfrage fehlgeschlagen (${response.status}).`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
function ShareEditor({
  share,
  onSave,
  selection,
  dateTimeSettings,
  onError,
  onClose,
}: {
  share: Share;
  dateTimeSettings: DateTimeSettings;
  onError: (message: string) => void;
  onClose: () => void;
  selection: Item[];
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [description, setDescription] = useState(share.description ?? ""),
    [slug, setSlug] = useState(share.slug),
    [expiry, setExpiry] = useState(share.expires_at ?? ""),
    [secret, setSecret] = useState(""),
    [remove, setRemove] = useState(false),
    [replace, setReplace] = useState(false);
  useEffect(() => {
    setReplace(false);
  }, [selection]);
  return (
    <>
      <form className="inline-editor"
        onSubmit={(e) => {
          e.preventDefault();
          if(secret && secret.length < 12) { onError("Das Freigabepasswort muss mindestens 12 Zeichen haben."); return; }
          const payload: Record<string, unknown> = {
            description,
            slug,
            ...(expiry !== (share.expires_at ?? "") ? {expiresAt: expiry || null} : {}),
          };
          if (replace) payload.items = selection;
          if (remove) payload.password = null;
          else if (secret) payload.password = secret;
          void onSave(payload).then((ok) => {
            if (ok) {
              setSecret("");
              setRemove(false);
              setReplace(false);
            }
          });
        }}
      >
        <label className="compact-field"><span>Beschreibung (optional)</span><input value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} /></label>
        <label className="compact-field">
          <span>Kurzname</span>
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <LinkOptions dateTimeSettings={dateTimeSettings} minPasswordLength={12} expiresAt={expiry} password={secret} passwordSaved={!!share.has_password && !remove && !secret} onExpiry={setExpiry} onPassword={value => {setSecret(value); setRemove(!!share.has_password && !value);}}/>
        <label className="inline">
          <input
            type="checkbox"
            checked={replace}
            disabled={!selection.length}
            onChange={(e) => setReplace(e.target.checked)}
          />{" "}
          Inhalt durch die unten ausgewählten {selection.length} Elemente
          ersetzen
        </label>
        {replace && (
          <div>
            <p>
              Diese Elemente ersetzen den bisherigen Inhalt von „{share.slug}“:
            </p>
            <ul>
              {selection.map((item, index) => (
                <li key={`${item.sourceId}:${item.path}:${index}`}>
                  {item.sourceId}: /{item.path || ""} (
                  {item.kind === "directory" ? "Ordner" : "Datei"})
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="link-editor-actions"><button type="submit" className="share-action" aria-label="Änderungen speichern" title="Änderungen speichern"><Save className="save-icon" size={16} aria-hidden="true"/></button><button type="button" className="share-action" aria-label="Bearbeitung schließen" title="Abbrechen" onClick={onClose}><X size={16} aria-hidden="true"/></button></div>
      </form>
    </>
  );
}
function App() {
  const [clockNow, setClockNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setClockNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const [status, setStatus] = useState<{
      configured: boolean;
      authenticated: boolean;
    } | null>(null),
    [user, setUser] = useState(""),
    [password, setPassword] = useState(""),
    [setupToken, setSetupToken] = useState(""),
    [, setErrorState] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const nextNotification = useRef(0);
  const notify = (type: Notification["type"], message: string, topicKey?: string) => {
    if (message) {
      const id = ++nextNotification.current;
      setNotifications((current) => [...current, { id, type, message, topicKey }]);
    }
  };
  const setError = (message: string) => { setErrorState(message); if (message) notify("error", message); };
  const [sources, setSources] = useState<Source[]>([]),
    [source, setSource] = useState(""),
    [path, setPath] = useState(""),
    [entries, setEntries] = useState<Entry[]>([]),
    [selected, setSelected] = useState<Item[]>([]),
    [shares, setShares] = useState<Share[]>([]),
    [links, setLinks] = useState<Link[]>([]),
    [description, setDescription] = useState(""),
    [slug, setSlug] = useState(""),
    [sharePassword, setSharePassword] = useState(""),
    [expires, setExpires] = useState(""),
    [url, setUrl] = useState(""),
    [linkSlug, setLinkSlug] = useState("");
  const [shareMode, setShareMode] = useState<"existing" | "upload">("existing");
  const activeSelected = selected.filter(item => (item.sourceId === "sharelyze-uploads") === (shareMode === "upload"));
  const [editLinkExpiry, setEditLinkExpiry] = useState("");
  const [editLinkPassword, setEditLinkPassword] = useState<string | undefined>(undefined);
  const [dateTimeSettings, setDateTimeSettings] = useState<DateTimeSettings>(browserDateTime);
  const dateLocale = resolvedDateTime(dateTimeSettings, navigator.language).locale;
  const [linkExpiry, setLinkExpiry] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const linkSlugEdited = useRef(false);
  const shareSlugEdited = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ percent: 0, label: "Wird vorbereitet" });
  const [linkSearchOpen, setLinkSearchOpen] = useState(false);
  const [shareSearchOpen, setShareSearchOpen] = useState(false);
  const shareSearchButton = useRef<HTMLButtonElement>(null);
  const [linkCreateOpen, setLinkCreateOpen] = useState(false);
  const linkSearchButton = useRef<HTMLButtonElement>(null);
  const [shareQuery, setShareQuery] = useState(""),
    [linkQuery, setLinkQuery] = useState(""),
    [editingShare, setEditingShare] = useState<string | null>(null),
    [editingLink, setEditingLink] = useState<string | null>(null),
    [editUrl, setEditUrl] = useState(""),
    [editSlug, setEditSlug] = useState("");
  const [shareFilter, setShareFilter] = useState<
    "all" | "active" | "expired" | "inactive"
  >("all");
  const [linkFilter, setLinkFilter] = useState<"all" | "active" | "expired">(
    "all",
  );
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [view, setView] = useState<
    "freigaben" | "kurzlinks" | "qrcodes" | "statistiken" | "einstellungen"
  >("freigaben");
  const [qrOpened,setQrOpened] = useState(false);
  const [publicLinkOrigin, setPublicLinkOrigin] = useState("");
  const [savedLinkOrigin, setSavedLinkOrigin] = useState("");
  const [defaultOrigin, setDefaultOrigin] = useState("");
  const setNotice = (message: string, topicKey?: string) => notify("success", message, topicKey);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const shareCreateRef = useRef<HTMLDetailsElement>(null);
  const uploadMenuRef = useRef<HTMLDetailsElement>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState(false);
  const [viewer, setViewer] = useState<{media: ViewerMedia[]; index: number} | null>(null);
  const [publicView, setPublicView] = useState<"grid" | "list" | "compact">("grid");
  const [page, setPage] = useState<{
      locked: boolean;
      telemetry?:string;
      title?: string;
      items?: { id: string; name: string; kind: string }[];
    } | null>(null),
    [folder, setFolder] = useState<{
      id: string;
      path: string;
      entries: Entry[];
    } | null>(null);
  const publicSlug = location.pathname.startsWith("/share/")
    ? decodeURIComponent(location.pathname.slice(7))
    : null;
  const publicViewRef=useRef(publicView);
  publicViewRef.current=publicView;
  const telemetryRef=useRef<ReturnType<typeof startPublicTelemetry>|null>(null);
  useEffect(() => {
    if(!publicSlug || !page?.telemetry) return;
    const telemetry=startPublicTelemetry(publicSlug,page.telemetry,() => publicViewRef.current);
    telemetryRef.current=telemetry;
    return () => {telemetry.stop();if(telemetryRef.current===telemetry) telemetryRef.current=null;};
  },[publicSlug,page?.telemetry]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if(uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) uploadMenuRef.current.open = false; };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (
        !accountMenuRef.current?.contains(event.target as Node) &&
        accountMenuRef.current
      )
        accountMenuRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, []);
  useEffect(() => {
    const syncView = () => {
      const next = location.hash.slice(1);
      if(next === "qrcodes") setQrOpened(true);
      if (
        next === "freigaben" ||
        next === "kurzlinks" ||
        next === "qrcodes" ||
        next === "statistiken" ||
        next === "einstellungen"
      )
        setView(next);
      else if (!next) setView("freigaben");
    };
    syncView();
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);
  async function refresh() {
    const s = await api<{ configured: boolean; authenticated: boolean }>(
      "/api/auth/status",
    );
    setStatus(s);
    if (s.authenticated) {
      const [a, b, c, d, settings, proposedLink, proposedShare] = await Promise.all([
        api<{ sources: Source[] }>("/api/sources"),
        api<{ shares: Share[] }>("/api/shares"),
        api<{ links: Link[] }>("/api/links"),
        api<Analytics>("/api/analytics"),
        api<{ publicLinkOrigin: string; defaultOrigin: string }>(
          "/api/settings",
        ),
        api<{slug:string}>("/api/slugs/suggest", {method:"POST",body:"{}"}),
        api<{slug:string}>("/api/slugs/suggest", {method:"POST",body:"{}"}),
      ]);
      setLinkSlug(current => current || proposedLink.slug);
      setSlug(current => current || proposedShare.slug);
      setSources(a.sources);
      setShares(b.shares);
      setLinks(c.links);
      setAnalytics(d);
      setPublicLinkOrigin(settings.publicLinkOrigin);
      setSavedLinkOrigin(settings.publicLinkOrigin);
      setDefaultOrigin(settings.defaultOrigin);
    }
  }
  async function copyLinkPassword(link: Link) {
    if(link.has_copyable_password === undefined) throw new Error("Das Backend läuft noch mit einem älteren Stand. Bitte den Entwicklungsserver neu starten.");
    if(!link.has_copyable_password) throw new Error("Dieses Passwort bitte einmal neu setzen, damit es kopiert werden kann.");
    if(!navigator.clipboard) throw new Error("Die Zwischenablage ist hier nicht verfügbar.");
    const load = async () => {
      const response = await fetch(`/api/links/${encodeURIComponent(link.id)}/password`, {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      if(!response.ok) throw new Error("Passwort konnte nicht geladen werden. Gegebenenfalls erneut setzen.");
      return (await response.json() as {password:string}).password;
    };
    if(typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({"text/plain":load().then(password => new Blob([password],{type:"text/plain"}))})]);
    } else await navigator.clipboard.writeText(await load());
    setNotice("Passwort kopiert.", `link-password:${link.id}`);
  }
  async function loadPage() {
    if (publicSlug)
      setPage(await api(`/api/public/${encodeURIComponent(publicSlug)}?${publicCampaignQuery()}`));
  }
  useEffect(() => {
    const timer=setTimeout(() => {(publicSlug ? loadPage() : refresh()).catch((e) => setError(e.message));},0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!source) {
      setEntries([]);
      setBrowseError(false);
      return;
    }
    const controller = new AbortController();
    setEntries([]);
    setBrowseError(false);
    setBrowseLoading(true);
    api<{ entries: Entry[] }>(
      `/api/sources/${encodeURIComponent(source)}/browse?path=${encodeURIComponent(path)}`,
      { signal: controller.signal },
    )
      .then((x) => setEntries(x.entries))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setBrowseError(true);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBrowseLoading(false);
      });
    return () => controller.abort();
  }, [source, path]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented || view !== "freigaben" || shareMode !== "existing" || !source || !shareCreateRef.current?.open) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable], [role=dialog]"))) return;
      event.preventDefault();
      if (path) setPath(path.split("/").slice(0, -1).join("/"));
      else setSource("");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [view, source, path, shareMode]);
  async function run(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ein Fehler ist aufgetreten.");
    }
  }
  const post = (route: string, body: unknown) =>
    api(route, { method: "POST", body: JSON.stringify(body) });
  async function uploadFiles(files: FileList | null) {
    if (!files?.length || uploading) return;
    const chosen = Array.from(files);
    setUploading(true);
    let batch = "";
    const uploaded: Item[] = [];
    try {
      const settings = await api<UploadSettings>("/api/settings/uploads");
      const list = chosen.filter(file => !isUploadIgnored(file.webkitRelativePath || file.name,settings));
      let ignored = chosen.length-list.length;
      if (!list.length) {setNotice(`${ignored} Datei(en) gemäß Upload-Filter übersprungen.`);return;}
      if (list.length > 500) throw new Error("Bitte höchstens 500 nicht ausgeschlossene Dateien gleichzeitig hochladen.");
      const result = await post("/api/uploads", {}) as { id: string };
      batch = result.id;
      const total = list.reduce((sum, file) => sum + file.size, 0);
      let completed = 0;
      let uploadedCount = 0;
      const started = Date.now();
      for (const file of list) {
        const relative = file.webkitRelativePath || file.name;
        const saved = await new Promise<boolean>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", `/api/uploads/${encodeURIComponent(batch)}?path=${encodeURIComponent(relative)}`);
          xhr.setRequestHeader("Content-Type", "application/octet-stream");
          xhr.upload.onprogress = event => {
            const sent = completed + event.loaded;
            const rate = sent / Math.max((Date.now() - started) / 1000, 0.1);
            const remaining = rate > 0 ? Math.ceil((total - sent) / rate) : 0;
            const duration = remaining >= 3600 ? `${Math.ceil(remaining / 3600)} h` : remaining >= 60 ? `${Math.ceil(remaining / 60)} min` : `${remaining} s`;
            const speed = rate >= 1024 ** 2 ? `${(rate / 1024 ** 2).toFixed(1)} MB/s` : `${Math.round(rate / 1024)} KB/s`;
            setUploadProgress({ percent: total ? Math.min(100, sent / total * 100) : 0, label: `${speed} · ca. ${duration}` });
          };
          xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {reject(new Error(`Upload von „${file.name}“ fehlgeschlagen (${xhr.status}).`));return;}
            try {resolve(JSON.parse(xhr.responseText).skipped !== true);}
            catch {reject(new Error("Ungültige Upload-Antwort."));}
          };
          xhr.onerror = () => reject(new Error(`Upload von „${file.name}“ fehlgeschlagen.`));
          xhr.onabort = () => reject(new Error("Upload abgebrochen."));
          xhr.send(file);
        });
        completed += file.size;
        if (!saved) {ignored++;continue;}
        uploadedCount++;
        const first = relative.split("/")[0];
        const item: Item = { sourceId: "sharelyze-uploads", path: `${batch}/${relative.includes("/") ? first : relative}`, kind: relative.includes("/") ? "directory" : "file" };
        const existing = uploaded.find((entry) => entry.path === item.path);
        if (existing) { existing.fileCount = (existing.fileCount ?? 0) + 1; existing.totalBytes = (existing.totalBytes ?? 0) + file.size; }
        else uploaded.push({ ...item, fileCount: 1, totalBytes: file.size });
      }
      addItems(uploaded);
      setNotice(`${uploadedCount} Datei(en) hochgeladen und ausgewählt.${ignored ? ` ${ignored} Datei(en) gemäß Upload-Filter übersprungen.` : ""}`);
    } catch (error) {
      if (uploaded.length) addItems(uploaded);
      setError(`${error instanceof Error ? error.message : "Upload fehlgeschlagen."}${uploaded.length ? " Bereits hochgeladene Dateien bleiben im Upload-Speicher erhalten." : ""}`);
    } finally { setUploading(false); setUploadProgress({ percent: 0, label: "Wird vorbereitet" }); }
  }
  function addItems(items: Item[]) {
    const seen = new Set(
      selected.map((item) => JSON.stringify([item.sourceId, item.path])),
    );
    const additions: Item[] = [];
    for (const item of items) {
      const key = JSON.stringify([item.sourceId, item.path]);
      if (!seen.has(key)) {
        seen.add(key);
        additions.push(item);
      }
      if (selected.length + additions.length > 500) {
        setError(
          "Pro Freigabe sind höchstens 500 ausgewählte Elemente möglich. Wähle bei Bedarf einen Ordner aus.",
        );
        return;
      }
    }
    setError("");
    setSelected([...selected, ...additions]);
  }
  const toggle = (entry: Entry) => {
    const item = {
      sourceId: source,
      path: [path, entry.name].filter(Boolean).join("/"),
      kind: entry.kind,
    };
    if (
      selected.some((x) => x.sourceId === item.sourceId && x.path === item.path)
    )
      setSelected(
        selected.filter(
          (x) => !(x.sourceId === item.sourceId && x.path === item.path),
        ),
      );
    else addItems([item]);
  };
  const normalized = (value: string) => value.trim().toLocaleLowerCase("de");
  const shareStatus = (s: Share) =>
    !s.active
      ? "inactive"
      : s.expires_at && Date.parse(s.expires_at) <= clockNow
        ? "expired"
        : "active";
  const visibleShares = shares.filter(
    (s) =>
      (shareFilter === "all" || shareStatus(s) === shareFilter) &&
      `${s.slug}`
        .toLocaleLowerCase("de")
        .includes(normalized(shareQuery)),
  );
  const visibleLinks = links.filter(
    (link) =>
      (linkFilter === "all" ||
        (linkFilter === "active" ? !link.expires_at || Date.parse(link.expires_at) > clockNow : !!link.expires_at && Date.parse(link.expires_at) <= clockNow)) &&
      `${link.slug} ${link.target_url}`
        .toLocaleLowerCase("de")
        .includes(normalized(linkQuery)),
  );
  async function browse(id: string, sub = "") {
    const x = await api<{ entries: Entry[] }>(
      withPublicVisit(`/api/public/${encodeURIComponent(publicSlug!)}/items/${id}?path=${encodeURIComponent(sub)}`,page?.telemetry),
    );
    setFolder({ id, path: sub, entries: x.entries });
  }
  useEffect(() => {
    if (!publicSlug || !page || page.locked || page.items?.length !== 1 || page.items[0].kind !== "directory") return;
    void run(() => browse(page.items![0].id));
  }, [page, publicSlug]);
  return (
    <main className="shell">
      <header className={`app-header${!publicSlug && status?.authenticated ? " admin-header" : ""}`}>
        <div className="app-title-block">
          <a
            className="app-brand"
            href={publicSlug ? "/" : "#freigaben"}
            aria-label="ShareLyze – Freigaben"
          >
            <picture className="brand-icon" aria-hidden="true">
              <source media="(prefers-color-scheme: dark)" srcSet="/logo-dark-transparent.svg" />
              <img src="/logo-light-transparent.svg" width="48" height="48" alt="" />
            </picture>
            <span className="brand-label"><span className="brand-word">ShareLyze</span><span className="app-version">v{version}</span></span>
          </a>
        </div>
        {!publicSlug && status?.authenticated && (
          <nav className="header-nav" aria-label="Hauptnavigation">
            <span
              className="header-nav-indicator"
              aria-hidden="true"
              style={{
                transform: `translateX(${["freigaben", "kurzlinks", "qrcodes", "statistiken", "einstellungen"].indexOf(view) * 46}px)`,
              }}
            />
            {(
              [
                ["freigaben", "Freigaben", Share2],
                ["kurzlinks", "Kurzlinks", Link2],
                ["qrcodes", "QR-Codes", QrCode],
                ["statistiken", "Statistiken", BarChart3],
                ["einstellungen", "Einstellungen", Settings],
              ] as const
            ).map(([id, label, Icon]) => (
              <a
                href={`#${id}`}
                key={id}
                className={
                  view === id ? "header-nav-item active" : "header-nav-item"
                }
                aria-label={label}
                data-tooltip={label}
                aria-current={view === id ? "page" : undefined}
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                <Icon size={18} aria-hidden="true" />
              </a>
            ))}
            <span className="header-divider" aria-hidden="true" />
            <details
              className="account-menu"
              ref={accountMenuRef}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  if (accountMenuRef.current)
                    accountMenuRef.current.open = false;
                  accountMenuRef.current?.querySelector("summary")?.focus();
                }
              }}
            >
              <summary
                className="header-nav-item"
                aria-label="Kontomenü"
                title="Konto"
              >
                <UserRound size={18} aria-hidden="true" />
              </summary>
              <div className="account-popover">
                <div className="account-heading">
                  <span className="account-avatar" aria-hidden="true">
                    A
                  </span>
                  <span>
                    <strong>Administrator</strong>
                    <small>Administratorkonto</small>
                  </span>
                </div>
                <span className="account-separator" />
                <button
                  type="button"
                  onClick={() => {
                    if (accountMenuRef.current)
                      accountMenuRef.current.open = false;
                    void run(async () => {
                      await post("/api/auth/logout", {});
                      await refresh();
                    });
                  }}
                >
                  <LogOut size={16} aria-hidden="true" /> Abmelden
                </button>
              </div>
            </details>
          </nav>
        )}
      </header>
      {!publicSlug && status?.authenticated && <details className="mobile-menu" onKeyDown={(event) => {
        if (event.key === "Escape") {
          const menu = event.currentTarget;
          menu.open = false;
          menu.querySelector("summary")?.focus();
        }
      }}>
        <summary aria-label="Menü öffnen"><picture aria-hidden="true"><source media="(prefers-color-scheme: dark)" srcSet="/logo-dark-transparent.svg" /><img src="/logo-light-transparent.svg" width="36" height="36" alt="" /></picture></summary>
        <nav className="mobile-menu-panel" aria-label="Mobile Hauptnavigation">
          {([
            ["freigaben", "Freigaben", Share2], ["kurzlinks", "Kurzlinks", Link2],
            ["qrcodes", "QR-Codes", QrCode],
            ["statistiken", "Statistiken", BarChart3], ["einstellungen", "Einstellungen", Settings],
          ] as const).map(([id, label, Icon]) => <a key={id} href={`#${id}`} aria-current={view === id ? "page" : undefined} onClick={(event) => { event.currentTarget.closest("details")!.open = false; setError(""); setNotice(""); }}><Icon size={18} aria-hidden="true" />{label}</a>)}
          <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; void run(async () => { await post("/api/auth/logout", {}); await refresh(); }); }}><LogOut size={18} aria-hidden="true" />Abmelden</button>
        </nav>
      </details>}
      <Notifications entries={notifications} dismiss={(id) => setNotifications((current) => current.filter((entry) => entry.id !== id))} />
      {publicSlug ? (
        <section className="public-share">
          {!page ? (
            <p>Wird geladen …</p>
          ) : page.locked ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await post(
                    `/api/public/${encodeURIComponent(publicSlug)}/unlock`,
                    { password },
                  );
                  setPassword("");
                  await loadPage();
                });
              }}
            >
              <h1>Passwort eingeben</h1>
              <label className="compact-field">
                <span>Passwort</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button>Freigabe öffnen</button>
            </form>
          ) : (
            <>
              <div className="public-share-heading">
                <h1>{page.title}</h1>
                <a className="button public-download" href={withPublicVisit(`/api/public/${encodeURIComponent(publicSlug)}/zip`,page.telemetry)}><Download size={18} aria-hidden="true" /> Herunterladen</a>
              </div>
              {folder && <nav className="breadcrumbs public-breadcrumbs" aria-label="Ordnerpfad">
                {page.items && page.items.length > 1 && <button type="button" onClick={() => setFolder(null)}>Freigabe</button>}
                <button type="button" onClick={() => void run(() => browse(folder.id))}>{page.items?.find(item => item.id === folder.id)?.name ?? "Ordner"}</button>
                {folder.path.split("/").filter(Boolean).map((part, index, parts) => <React.Fragment key={parts.slice(0, index + 1).join("/")}><span aria-hidden="true">/</span><button type="button" onClick={() => void run(() => browse(folder.id, parts.slice(0, index + 1).join("/")))}>{part}</button></React.Fragment>)}
              </nav>}
              {(() => {
                const entries = folder ? folder.entries.map(entry => ({...entry, id: folder.id, path: [folder.path, entry.name].filter(Boolean).join("/")})) : (page.items ?? []).map(item => ({...item, path: ""}));
                const directories = entries.filter(entry => entry.kind === "directory");
                const files = entries.filter(entry => entry.kind === "file");
                const itemUrl = (entry: typeof entries[number], action: string) => withPublicVisit(`/api/public/${encodeURIComponent(publicSlug)}/items/${encodeURIComponent(entry.id)}/${action}${entry.path ? `?path=${encodeURIComponent(entry.path)}` : ""}`,page.telemetry);
                const sizeUrl = (entry: typeof entries[number]) => `${itemUrl(entry, "size")}${entry.path || page.telemetry ? "&" : "?"}kind=${entry.kind}`;
                const mediaEntries = files.filter(entry => /\.(jpe?g|png|webp|gif|avif|svg|tiff?|heic|heif|txt|md|csv|json|log|ya?ml|mp4|m4v|mov|webm|mkv|ogv|avi)$/i.test(entry.name));
                const openMedia = (entry: typeof entries[number]) => setViewer({ media: mediaEntries.map(file => ({name:file.name, view:itemUrl(file,"view"), download:itemUrl(file,"download"), size:sizeUrl(file), kind: /\.(mp4|m4v|mov|webm|mkv|ogv|avi)$/i.test(file.name) ? "video" : "image"})), index: mediaEntries.indexOf(entry) });
                const folderRow = (entry: typeof entries[number]) => <li key={`${entry.id}:${entry.path}`} className="public-folder-row"><button type="button" className="public-folder" onClick={() => void run(() => browse(entry.id, entry.path))}><Folder size={20} aria-hidden="true"/><span>{entry.name}</span></button><span className="public-download-pill"><PublicSize url={sizeUrl(entry)}/><PublicDownload href={itemUrl(entry, "zip")} name={entry.name}/></span></li>;
                const fileRow = (entry: typeof entries[number]) => { const image = /\.(jpe?g|png|webp|gif|avif|svg|tiff?|heic|heif|txt|md|csv|json|log|ya?ml)$/i.test(entry.name); const video = /\.(mp4|m4v|mov|webm|mkv|ogv|avi)$/i.test(entry.name); return <li key={`${entry.id}:${entry.path}`} className="public-file-row"><div className="public-file">
                  {publicView !== "compact" && image ? <PublicImage src={itemUrl(entry, "preview")} name={entry.name} onOpen={() => openMedia(entry)}/> : video && publicView !== "compact" ? <button type="button" className="public-file-icon public-video-icon" aria-label={`${entry.name} anzeigen`} onClick={() => openMedia(entry)}><Film size={24} aria-hidden="true"/></button> : <span className="public-file-icon">{video ? <Film size={20} aria-hidden="true"/> : <File size={20} aria-hidden="true"/>}</span>}
                  {image || video ? <button type="button" className="public-file-name public-media-name" title={entry.name} onClick={() => openMedia(entry)}>{entry.name}</button> : <span className="public-file-name" title={entry.name}>{entry.name}</span>}<span className="public-download-pill"><PublicSize url={sizeUrl(entry)}/><PublicDownload href={itemUrl(entry, "download")} name={entry.name}/></span>
                </div></li>; };
                const viewMenu = <details className="public-view-menu"><summary aria-label="Ansicht auswählen">{publicView === "grid" ? <LayoutGrid size={17} aria-hidden="true"/> : publicView === "list" ? <List size={17} aria-hidden="true"/> : <ListCollapse size={17} aria-hidden="true"/>}<span>{publicView === "grid" ? "Kacheln" : publicView === "list" ? "Liste" : "Kompakt"}</span><ChevronDown size={15} aria-hidden="true"/></summary><div className="public-view-options" role="group" aria-label="Ansicht">{([["grid", "Kacheln", LayoutGrid], ["list", "Liste", List], ["compact", "Kompakt", ListCollapse]] as const).map(([value, label, Icon]) => <button type="button" key={value} aria-pressed={publicView === value} onClick={event => {if(publicViewRef.current!==value) {setPublicView(value);publicViewRef.current=value;telemetryRef.current?.viewChanged();} event.currentTarget.closest("details")!.open = false;}}><Icon size={16} aria-hidden="true"/> {label}</button>)}</div></details>;
                return <>
                  {viewer && <PublicMediaViewer media={viewer.media} index={viewer.index} onMove={index => setViewer(previous => previous ? {...previous, index} : null)} onClose={() => setViewer(null)}/>}
                  {publicView === "compact" ? <div className="public-files-group"><div className="public-files-heading compact-heading">{viewMenu}</div><ul className="public-compact-list">{directories.map(folderRow)}{files.map(fileRow)}</ul></div> : <>
                    {directories.length > 0 && <div className="public-folder-group"><h2>Ordner</h2><ul className={`public-folders ${publicView}`}>{directories.map(folderRow)}</ul></div>}
                    <div className="public-files-group"><div className="public-files-heading"><h2>{files.length ? "Dateien" : "Ansicht"}</h2>{viewMenu}</div>{files.length > 0 && <ul className={`public-file-list ${publicView}`}>{files.map(fileRow)}</ul>}</div>
                  </>}
                  {entries.length === 0 && <p>Dieser Ordner ist leer.</p>}
                </>;
              })()}
            </>
          )}
        </section>
      ) : !status ? (
        <section>Lädt …</section>
      ) : !status.authenticated ? (
        <section>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await post(
                  status.configured ? "/api/auth/login" : "/api/auth/setup",
                  {
                    username: user,
                    password,
                    ...(!status.configured ? { setupToken } : {}),
                  },
                );
                setPassword("");
                setSetupToken("");
                await refresh();
              });
            }}
          >
            <h1>{status.configured ? "Anmelden" : "ShareLyze einrichten"}</h1>
            {!status.configured && (
              <label className="compact-field">
                <span>Einrichtungsschlüssel</span>
                <input
                  required
                  type="password"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                />
              </label>
            )}
            <label className="compact-field">
              <span>Benutzername</span>
              <input
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
            </label>
            <label className="compact-field">
              <span>Passwort</span>
              <input
                required
                minLength={12}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button>
              {status.configured ? "Anmelden" : "Konto erstellen"}
            </button>
          </form>
        </section>
      ) : (
        <div className="admin-layout">
          <div className="admin-content">
            <section id="freigaben" hidden={view !== "freigaben"}>
              <div className="share-toolbar link-heading">
                {shareSearchOpen ? <>
                  <h1 className="visually-hidden">Datenfreigabe</h1>
                  <label className="search-field compact-field"><span>Freigaben suchen</span><input autoFocus type="search" value={shareQuery} onChange={(e) => setShareQuery(e.target.value)} placeholder="Kurzname" /></label>
                  <button type="button" className="share-action heading-search-button" aria-label="Suche schließen" onClick={() => { setShareSearchOpen(false); setShareQuery(""); requestAnimationFrame(() => shareSearchButton.current?.focus()); }}><X size={18} aria-hidden="true" /></button>
                </> : <>
                  <h1>Datenfreigabe</h1>
                  <button ref={shareSearchButton} type="button" className="share-action heading-search-button" aria-label="Freigaben suchen" onClick={() => setShareSearchOpen(true)}><Search size={18} aria-hidden="true" /></button>
                </>}
              <div
                className="share-filters link-filters"
                role="group"
                aria-label="Freigaben filtern"
              >
                {(
                  [
                    ["all", "Alle"],
                    ["active", "Aktiv"],
                    ["expired", "Abgelaufen"],
                    ["inactive", "Deaktiviert"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    className={
                      shareFilter === id
                        ? "share-filter active"
                        : "share-filter"
                    }
                    aria-pressed={shareFilter === id}
                    onClick={() => setShareFilter(id)}
                  >
                    {label}{" "}
                    <span>
                      {id === "all"
                        ? shares.length
                        : shares.filter((s) => shareStatus(s) === id).length}
                    </span>
                  </button>
                ))}
              </div>
              </div>
              <ul className="managed-list share-list">
                {visibleShares.map((s) => (
                  <li key={s.id}>
                    <div className="managed-row share-table-row">
                      <button type="button" className="share-slug" title="Link kopieren" aria-label={`Link /${s.slug} kopieren`} onClick={() => void run(async () => {
                        await navigator.clipboard.writeText(`${savedLinkOrigin}/${s.slug}`);
                        setNotice("Link kopiert.", `share:${s.id}`);
                      })}>/{s.slug}</button>
                      <span
                        className="share-stat"
                        title="Downloadstarts einschließlich fortgesetzter Anfragen"
                      >
                        <Download size={15} aria-label="Downloadstarts" /> {analytics?.links.find(
                          (x) =>
                            x.slug === s.slug && x.type === "download_start",
                        )?.count ?? 0}
                      </span>
                      {s.expires_at && <span className="share-expiry" title={`Ablauf: ${formatTimestamp(s.expires_at, dateTimeSettings, navigator.language)}`} aria-label={`Ablauf: ${formatRemaining(s.expires_at, clockNow, dateLocale)}`}><CalendarDays size={15} aria-hidden="true" />{formatRemaining(s.expires_at, clockNow, dateLocale)}</span>}
                      <div className="managed-actions">
                      <div className="status-control">
                        <button
                          type="button" role="switch" aria-checked={!!s.active} aria-label={`Freigabe /${s.slug} aktivieren`} className="toggle-switch"
                          onClick={() =>
                            void run(async () => {
                              await api(`/api/shares/${s.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({ active: !s.active }),
                              });
                              await refresh();
                            })
                          }
                        >
                          <span className="switch-track" aria-hidden="true" />
                        </button>
                        {shareStatus(s) === "expired" && <span className="expired-indicator" title="Abgelaufen" aria-label="Abgelaufen">!</span>}
                      </div>
                        <a
                          className="share-action"
                          href={`/${s.slug}`}
                          aria-label={`Freigabe ${s.slug} öffnen`}
                          title="Freigabe öffnen"
                        >
                          <ActionIcon kind="external" />
                        </a>
                        <button type="button" className="share-action" title="Bearbeiten" aria-label="Freigabe bearbeiten" aria-expanded={editingShare === s.id} onClick={() => setEditingShare(editingShare === s.id ? null : s.id)}><ActionIcon kind="pen" /></button>
                        <button type="button" className="share-action delete-action" aria-label={`Freigabe /${s.slug} löschen`} title="Freigabe löschen" onClick={() => {
                          if (!window.confirm(`Freigabe /${s.slug} löschen? Der Zugriff endet sofort. Eigene Uploads werden nach der Aufbewahrungsfrist bereinigt, wenn sie nicht mehr verwendet werden. Statistiken bleiben erhalten.`)) return;
                          void run(async () => {await api(`/api/shares/${s.id}`,{method:"DELETE"});await refresh();});
                        }}><DeleteIcon/></button>
                      </div>
                    </div>
                    {editingShare === s.id && <ShareEditor
                      share={s}
                      selection={selected}
                      dateTimeSettings={dateTimeSettings}
                      onError={setError}
                      onClose={() => setEditingShare(null)}
                      onSave={async (payload) => {
                        setError("");
                        try {
                          await api(`/api/shares/${s.id}`, {
                            method: "PATCH",
                            body: JSON.stringify(payload),
                          });
                          await refresh();
                          setEditingShare(null);
                          return true;
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Ein Fehler ist aufgetreten.",
                          );
                          return false;
                        }
                      }}
                    />}
                  </li>
                ))}
                {visibleShares.length === 0 && (
                  <li className="empty-state">
                    {shares.length === 0 ? "Noch keine Freigabe erstellt." : "Keine passenden Freigaben gefunden."}
                  </li>
                )}
              </ul>
              <details className="create-panel share-create-panel" ref={shareCreateRef}>
                <summary>＋ Neue Freigabe</summary>
                <form className="share-create-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      if(sharePassword && sharePassword.length < 12) throw new Error("Das Freigabepasswort muss mindestens 12 Zeichen haben.");
                      await post("/api/shares", {
                        description,
                        slug,
                        items: activeSelected.map(({ sourceId, path, kind }) => ({ sourceId, path, kind })),
                        ...(sharePassword ? { password: sharePassword } : {}),
                        ...(expires
                          ? { expiresAt: new Date(expires).toISOString() }
                          : {}),
                      });
                      setSelected(current => current.filter(item => (item.sourceId === "sharelyze-uploads") !== (shareMode === "upload")));
                      setDescription("");
                      setSlug(""); shareSlugEdited.current = false;
                      setSharePassword("");
                      setExpires("");
                      await refresh();
                      setNotice("Freigabe erstellt.", "share:create");
                    });
                  }}
                >
                  <label className="compact-field"><span>Beschreibung (optional)</span><input value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} /></label>
                  <label className="compact-field">
                    <span>Kurzname</span>
                    <input
                      required
                      value={slug}
                      onChange={(e) => {shareSlugEdited.current = true; setSlug(e.target.value);}}
                    />
                  </label>
                  <LinkOptions dateTimeSettings={dateTimeSettings} minPasswordLength={12} expiresAt={expires} password={sharePassword} onExpiry={setExpires} onPassword={setSharePassword}/>
                  <button type="submit" disabled={!activeSelected.length || uploading}>Erstellen</button>
                  <button type="button" className="share-action share-create-cancel" aria-label="Freigabeerstellung abbrechen" title="Abbrechen" disabled={uploading} onClick={() => {if(shareCreateRef.current) {shareCreateRef.current.open = false; shareCreateRef.current.querySelector("summary")?.focus();}}}><X size={18} aria-hidden="true"/></button>
                </form>
                <div className="share-mode-toggle" role="group" aria-label="Art der Freigabe">
                  <button type="button" aria-pressed={shareMode === "existing"} disabled={uploading} onClick={() => setShareMode("existing")}>Bestehendes freigeben</button>
                  <button type="button" aria-pressed={shareMode === "upload"} disabled={uploading} onClick={() => setShareMode("upload")}>Hochladen</button>
                </div>
                {shareMode === "upload" && <div className="upload-actions">
                  <details className="upload-menu" ref={uploadMenuRef} onKeyDown={event => {if(event.key === "Escape") {event.preventDefault(); if(uploadMenuRef.current) uploadMenuRef.current.open=false; uploadMenuRef.current?.querySelector("summary")?.focus();}}}>
                    <summary className="upload-trigger" aria-disabled={uploading} onClick={event => {if(uploading) event.preventDefault();}}>{uploading ? <><svg className="upload-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span role="status">{uploadProgress.label}</span><span className="upload-progress" style={{width: `${uploadProgress.percent}%`}} /></> : <><HardDriveUploadIcon/> Hochladen</>}</summary>
                    <div className="upload-menu-panel">
                      <label className="upload-picker">Dateien auswählen<input type="file" multiple disabled={uploading} onChange={event => {void uploadFiles(event.currentTarget.files); event.currentTarget.value=""; if(uploadMenuRef.current) uploadMenuRef.current.open=false;}}/></label>
                      <label className="upload-picker">Ordner auswählen<input type="file" multiple ref={input => input?.setAttribute("webkitdirectory", "")} disabled={uploading} onChange={event => {void uploadFiles(event.currentTarget.files); event.currentTarget.value=""; if(uploadMenuRef.current) uploadMenuRef.current.open=false;}}/></label>
                    </div>
                  </details>
                </div>}
                {shareMode === "existing" && !source && <ul className="file-list source-list" aria-label="Verfügbare Speicherquellen">
                  {sources.filter(item => item.id !== "sharelyze-uploads").map((item) => <li key={item.id}>
                    <button type="button" className="source-open" onClick={() => { setSource(item.id); setPath(""); }}><Folder size={16} aria-hidden="true" />{item.name}</button>
                  </li>)}
                  {sources.every(item => item.id === "sharelyze-uploads") && <li className="empty-state">Keine Speicherquellen verfügbar.</li>}
                </ul>}
                {shareMode === "existing" && source && (
                  <>
                    <div className="picker-header"><div className="breadcrumbs" aria-label="Aktueller Ordner">
                      <button type="button" className="breadcrumbs-home" aria-label="Speicherquellen" title="Speicherquellen" onClick={() => { setSource(""); setPath(""); }}><picture aria-hidden="true"><source media="(prefers-color-scheme: dark)" srcSet="/logo-dark-transparent.svg" /><img src="/logo-light-transparent.svg" width="20" height="20" alt="" /></picture></button> / {" "}
                      <button type="button" onClick={() => setPath("")}>
                        {sources.find((s) => s.id === source)?.name}
                      </button>
                      {path
                        .split("/")
                        .filter(Boolean)
                        .map((part, index, parts) => (
                          <span key={index}>
                            {" "}
                            /{" "}
                            <button
                              type="button"
                              onClick={() =>
                                setPath(parts.slice(0, index + 1).join("/"))
                              }
                            >
                              {part}
                            </button>
                          </span>
                        ))}
                    </div>
                    <div className="picker-toolbar">
                      <div className="picker-actions">
                        <button type="button" className="picker-button" disabled={browseLoading || browseError} onClick={() => addItems([{ sourceId: source, path, kind: "directory" }])}><Folder size={16} aria-hidden="true"/>Ordner auswählen</button>
                        <button type="button" className="picker-button" disabled={browseLoading || entries.length === 0} onClick={() => addItems(entries.map(entry => ({ sourceId: source, path: [path, entry.name].filter(Boolean).join("/"), kind: entry.kind })))}><Files size={16} aria-hidden="true"/>Sichtbare auswählen</button>
                      </div>
                    </div></div>
                    <ul className="file-list folder-entries" tabIndex={0} aria-label="Ordnerinhalt">
                      {entries.map((e) => (
                          <li key={e.name}>
                            <div className="folder-entry">
                              <input type="checkbox" aria-label={`${e.name} auswählen`} checked={selected.some(x => x.sourceId === source && x.path === [path, e.name].filter(Boolean).join("/"))} onChange={() => toggle(e)} />
                              {e.kind === "directory" ? <button type="button" className="folder-entry-open" onClick={() => setPath([path, e.name].filter(Boolean).join("/"))}><Folder size={16} aria-hidden="true" />{e.name}</button> : <span className="folder-entry-file"><File size={16} aria-hidden="true" />{e.name}</span>}
                            </div>
                          </li>
                        ))}
                      {!browseLoading && !browseError && entries.length === 0 && <li className="empty-state">Dieser Ordner ist leer.</li>}
                    </ul>
                  </>
                )}
                {activeSelected.length > 0 && <ul className="selected-pills" aria-label="Ausgewählte Dateien und Ordner">
                  {activeSelected.map((item) => <SelectedItem key={`${item.sourceId}/${item.path}`} item={item} sourceName={sources.find(source => source.id === item.sourceId)?.name ?? item.sourceId} onRemove={() => setSelected(current => current.filter(entry => entry.sourceId !== item.sourceId || entry.path !== item.path))}/>)}
                </ul>}
              </details>
            </section>
            <section id="kurzlinks" hidden={view !== "kurzlinks"}>
              <div className="share-toolbar link-heading">
                {linkSearchOpen ? <>
                  <h1 className="visually-hidden">Kurzlinks</h1>
                  <label className="search-field compact-field">
                    <span>Kurzlinks suchen</span>
                    <input autoFocus type="search" value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} placeholder="Kurzname oder Zieladresse" />
                  </label>
                  <button type="button" className="share-action heading-search-button" aria-label="Suche schließen" onClick={() => { setLinkSearchOpen(false); setLinkQuery(""); requestAnimationFrame(() => linkSearchButton.current?.focus()); }}><X size={18} aria-hidden="true" /></button>
                </> : <>
                  <h1>Kurzlinks</h1>
                  <button ref={linkSearchButton} type="button" className="share-action heading-search-button" aria-label="Kurzlinks suchen" onClick={() => setLinkSearchOpen(true)}><Search size={18} aria-hidden="true" /></button>
                </>}
              <div
                className="share-filters link-filters"
                role="group"
                aria-label="Kurzlinks filtern"
              >
                {(
                  [
                    ["all", "Alle"],
                    ["active", "Gültig"],
                    ["expired", "Abgelaufen"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    className={
                      linkFilter === id ? "share-filter active" : "share-filter"
                    }
                    aria-pressed={linkFilter === id}
                    onClick={() => setLinkFilter(id)}
                  >
                    {label}{" "}
                    <span>
                      {id === "all"
                        ? links.length
                        : links.filter((link) =>
                            id === "active"
                              ? !link.expires_at || Date.parse(link.expires_at) > clockNow
                              : !!link.expires_at && Date.parse(link.expires_at) <= clockNow,
                          ).length}
                    </span>
                  </button>
                ))}
              </div>
              </div>
              <ul className="managed-list share-list">
                {visibleLinks.map((l) => (
                  <li key={l.id}>
                    <div className="managed-row share-table-row link-table-row">
                      <div className="link-identity">
                      <button type="button" className="share-slug" title="Link kopieren" aria-label={`Link /${l.slug} kopieren`} onClick={() => void run(async () => {
                        await navigator.clipboard.writeText(`${savedLinkOrigin}/${l.slug}`);
                        setNotice("Link kopiert.", `link:${l.id}`);
                      })}>/{l.slug}</button>
                      <span className="link-target" title={l.target_url}>{l.target_url}</span>
                      </div>
                      <div className="link-metadata">
                        {l.expires_at && <span className="share-expiry" title={`Ablauf: ${formatTimestamp(l.expires_at, dateTimeSettings, navigator.language)}`}><ProtectionIcon kind="calendar"/>{Date.parse(l.expires_at) <= clockNow ? <CircleAlert size={15} aria-label="Abgelaufen"/> : formatRemaining(l.expires_at, clockNow, dateLocale)}</span>}{!!l.has_password && <button type="button" className="link-password-state" title={l.has_copyable_password ? "Passwort kopieren" : "Passwort zum Kopieren einmal neu setzen"} aria-label="Passwort kopieren" onClick={() => void run(() => copyLinkPassword(l))}><ProtectionIcon kind="lock"/></button>}
                      <span
                        className="link-stat"
                        title="Gezählte Weiterleitungen innerhalb der Aufbewahrungsdauer"
                      >
                        <BarChart3 size={15} aria-label="Weiterleitungen" /> {analytics?.links.find(
                          (x) => x.slug === l.slug && x.type === "redirect",
                        )?.count ?? 0}
                      </span>
                      </div>
                      <div className="managed-actions">
                        <a
                          className="share-action"
                          href={`/${l.slug}`}
                          aria-label={`Kurzlink /${l.slug} öffnen`}
                          title="Kurzlink öffnen"
                        >
                          <ActionIcon kind="external" />
                        </a>
                        <button
                          className="share-action"
                          title="Bearbeiten" aria-label="Kurzlink bearbeiten" aria-expanded={editingLink === l.id}
                          aria-controls={`link-editor-${l.id}`}
                          onClick={() => {
                            if (editingLink === l.id) setEditingLink(null);
                            else {
                              setEditingLink(l.id);
                              setEditUrl(l.target_url);
                              setEditSlug(l.slug);
                              setEditLinkExpiry(l.expires_at || ""); setEditLinkPassword(undefined);
                            }
                          }}
                        >
                          <ActionIcon kind="pen" />
                        </button>
                      </div>
                    </div>
                    {editingLink === l.id && (
                      <form
                        id={`link-editor-${l.id}`}
                        className="inline-editor link-inline-editor"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(async () => {
                            await api(`/api/links/${l.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({
                                url: editUrl,
                                slug: editSlug,
                                expiresAt: editLinkExpiry === (l.expires_at || "") ? undefined : editLinkExpiry || null,
                                password: editLinkPassword,
                              }),
                            });
                            setEditingLink(null);
                            await refresh();
                          });
                        }}
                      >
                        <label className="compact-field">
                          <span>Zieladresse</span>
                          <input
                            type="url"
                            required
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                          />
                        </label>
                        <label className="compact-field">
                          <span>Kurzname</span>
                          <input
                            required
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                          />
                        </label>
                        <div className="link-editor-actions">
                          <LinkOptions dateTimeSettings={dateTimeSettings} expiresAt={editLinkExpiry} password={editLinkPassword || ""} passwordSaved={editLinkPassword === undefined && !!l.has_password} onExpiry={setEditLinkExpiry} onPassword={setEditLinkPassword}/>
                          <button type="button" className="share-action delete-action" aria-label={`Kurzlink /${l.slug} löschen`} title="Kurzlink löschen" onClick={() => {
                            if (!window.confirm(`Kurzlink /${l.slug} löschen? Die Statistik bleibt erhalten.`)) return;
                            void run(async () => { await api(`/api/links/${l.id}`, {method:"DELETE"}); setEditingLink(null); await refresh(); setNotice("Kurzlink gelöscht.", `link:${l.id}`); });
                          }}><DeleteIcon/></button>
                          <button type="submit" className="share-action" aria-label="Änderungen speichern" title="Änderungen speichern"><Save className="save-icon" size={16} aria-hidden="true"/></button>
                          <button
                            type="button"
                            className="share-action" aria-label="Bearbeitung schließen" title="Abbrechen"
                            onClick={() => setEditingLink(null)}
                          >
                            <X size={16} aria-hidden="true"/>
                          </button>
                        </div>
                      </form>
                    )}
                  </li>
                ))}
                {visibleLinks.length === 0 && (
                  <li className="empty-state">
                    Keine passenden Kurzlinks gefunden.
                  </li>
                )}
              </ul>
              <div className="create-panel link-create-panel">
                {!linkCreateOpen ? <button type="button" className="link-create-toggle" onClick={() => setLinkCreateOpen(true)}>＋ Neuer Kurzlink</button> : <form className="link-create-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await post("/api/links", { url, slug: linkSlug, expiresAt: linkExpiry || null, password: linkPassword });
                      setLinkExpiry(""); setLinkPassword("");
                      setUrl("");
                      setLinkSlug(""); linkSlugEdited.current = false;
                      await refresh();
                    });
                  }}
                >
                  <div className="link-create-fields">
                  <label className="compact-field">
                    <span>Zieladresse</span>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </label>
                  <label className="compact-field">
                    <span>Kurzname</span>
                    <input
                      required
                      value={linkSlug}
                      onChange={(e) => {linkSlugEdited.current = true; setLinkSlug(e.target.value);}}
                    />
                  </label>
                  </div>
                  <div className="link-create-actions"><LinkOptions dateTimeSettings={dateTimeSettings} expiresAt={linkExpiry} password={linkPassword} onExpiry={setLinkExpiry} onPassword={setLinkPassword}/><button type="submit">Erstellen</button><button type="button" className="share-action" aria-label="Kurzlink-Erstellung abbrechen" title="Abbrechen" onClick={() => setLinkCreateOpen(false)}><X size={18} aria-hidden="true" /></button></div>
                </form>}
              </div>
            </section>
            <section id="qrcodes" hidden={view !== "qrcodes"}>
              {qrOpened && <React.Suspense fallback={<p role="status">QR-Werkbank wird geladen …</p>}><QrCodes origin={savedLinkOrigin || defaultOrigin} links={[...links,...shares]}/></React.Suspense>}
            </section>
            <section id="statistiken" hidden={view !== "statistiken"}>
              <Statistics data={analytics} dateTimeSettings={dateTimeSettings} />
            </section>
            <section id="einstellungen" hidden={view !== "einstellungen"}>
              <h1>Einstellungen</h1>
              <div className="settings-block">
                <h2 className="slug-settings-heading">Öffentliche Linkadresse <SettingsHelp label="Hinweise zur öffentlichen Linkadresse">Die Adresse ändert weder DNS noch Reverse Proxy oder den geschützten Admin-Ursprung. Für die Anmeldung muss <code>PUBLIC_ORIGIN</code> weiterhin zur verwendeten Adresse passen. Standard: {defaultOrigin}</SettingsHelp></h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      const result = await api<{ publicLinkOrigin: string }>(
                        "/api/settings",
                        {
                          method: "PUT",
                          body: JSON.stringify({ publicLinkOrigin }),
                        },
                      );
                      setPublicLinkOrigin(result.publicLinkOrigin);
                      setSavedLinkOrigin(result.publicLinkOrigin);
                      setNotice("Linkadresse gespeichert.", "settings:link-origin");
                    });
                  }}
                >
                  <label className="compact-field">
                    <span>Domain</span>
                    <input
                      type="url"
                      required
                      value={publicLinkOrigin}
                      onChange={(e) => {
                        setPublicLinkOrigin(e.target.value);
                        setNotice("");
                      }}
                    />
                  </label>
                  <button disabled={publicLinkOrigin === savedLinkOrigin}>
                    Änderungen speichern
                  </button>
                </form>
              </div>
              <StorageSettings notify={(message,error) => error ? setError(message) : setNotice(message,"settings:storage")}/>
              <RegionTimeSettings value={dateTimeSettings} onChange={setDateTimeSettings} notify={(message,error)=>error ? setError(message) : setNotice(message,"settings:datetime")}/>
              <SlugDefaults onSaved={() => void run(async () => {
                const [link, share] = await Promise.all([post("/api/slugs/suggest", {}) as Promise<{slug:string}>, post("/api/slugs/suggest", {}) as Promise<{slug:string}>]);
                if(!linkSlugEdited.current) setLinkSlug(link.slug); if(!shareSlugEdited.current) setSlug(share.slug);
              })} notify={(message, error) => error ? setError(message) : setNotice(message, "settings:slugs")}/>
              <div className="settings-block">
                <h2>Speicherquellen</h2><p>Verzeichnisse in Docker Compose lesend unter <code>/sources/Name</code> einbinden. Nach einem Container-Neustart erscheinen sie hier als „Name“.</p>
                <ul className="stat-list">
                  {sources.map((s) => (
                    <li key={s.id}>
                      <span>{s.name}</span>
                      <small>{s.id}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
