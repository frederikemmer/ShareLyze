import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { Statistics, type Analytics } from "./Statistics";
import { Notifications, type Notification } from "./Notifications";
import { version } from "../../package.json";
import {
  BarChart3,
  Download, CalendarDays,
  File,
  Folder,
  Link2,
  LockKeyhole,
  LogOut,
  Settings,
  Search, X,
  Share2,
  UserRound,
} from "lucide-react";

function ActionIcon({ kind }: { kind: "external" | "copy" | "pen" }) {
  return <svg className={`action-icon action-icon-${kind}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "external" ? <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><g className="icon-moving"><path d="M15 3h6v6" /><path d="M10 14 21 3" /></g></> : kind === "copy" ? <><rect className="icon-moving" height="14" rx="2" width="14" x="8" y="8" /><path className="icon-copy-back" d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></> : <><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path className="icon-moving" d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" /></>}
  </svg>;
}

type Source = { id: string; name: string };
type Entry = { name: string; kind: "file" | "directory" };
type Item = { sourceId: string; path: string; kind: "file" | "directory" };
type Share = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  active: number;
  expires_at: string | null;
  has_password: number;
};
type Link = { id: string; slug: string; target_url: string; active: number };
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
  return response.json();
}
function ShareEditor({
  share,
  onSave,
  selection,
}: {
  share: Share;
  selection: Item[];
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [description, setDescription] = useState(share.description ?? ""),
    [slug, setSlug] = useState(share.slug),
    [expiry, setExpiry] = useState(
      share.expires_at
        ? new Date(
            new Date(share.expires_at).getTime() -
              new Date(share.expires_at).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
    ),
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
          const payload: Record<string, unknown> = {
            description,
            slug,
            expiresAt: expiry ? new Date(expiry).toISOString() : null,
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
        <label className="compact-field">
          <span>Ablauf</span>
          <input
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </label>
        <label className="compact-field">
          <span>Neues Passwort (optional)</span>
          <input
            type="password"
            minLength={12}
            disabled={remove}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </label>
        {!!share.has_password && (
          <label className="inline">
            <input
              type="checkbox"
              checked={remove}
              onChange={(e) => setRemove(e.target.checked)}
            />{" "}
            Passwort entfernen
          </label>
        )}
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
        <button>Änderungen speichern</button>
      </form>
    </>
  );
}
function App() {
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [linkSearchOpen, setLinkSearchOpen] = useState(false);
  const [shareSearchOpen, setShareSearchOpen] = useState(false);
  const shareSearchButton = useRef<HTMLButtonElement>(null);
  const [linkCreateOpen, setLinkCreateOpen] = useState(false);
  const linkSearchButton = useRef<HTMLButtonElement>(null);
  const [shareQuery, setShareQuery] = useState(""),
    [linkQuery, setLinkQuery] = useState(""),
    [entryQuery, setEntryQuery] = useState(""),
    [editingShare, setEditingShare] = useState<string | null>(null),
    [editingLink, setEditingLink] = useState<string | null>(null),
    [editUrl, setEditUrl] = useState(""),
    [editSlug, setEditSlug] = useState("");
  const [shareFilter, setShareFilter] = useState<
    "all" | "active" | "expired" | "inactive"
  >("all");
  const [linkFilter, setLinkFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [view, setView] = useState<
    "freigaben" | "kurzlinks" | "statistiken" | "einstellungen"
  >("freigaben");
  const [publicLinkOrigin, setPublicLinkOrigin] = useState("");
  const [savedLinkOrigin, setSavedLinkOrigin] = useState("");
  const [defaultOrigin, setDefaultOrigin] = useState("");
  const setNotice = (message: string, topicKey?: string) => notify("success", message, topicKey);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [page, setPage] = useState<{
      locked: boolean;
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
      if (
        next === "freigaben" ||
        next === "kurzlinks" ||
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
      const [a, b, c, d, settings] = await Promise.all([
        api<{ sources: Source[] }>("/api/sources"),
        api<{ shares: Share[] }>("/api/shares"),
        api<{ links: Link[] }>("/api/links"),
        api<Analytics>("/api/analytics"),
        api<{ publicLinkOrigin: string; defaultOrigin: string }>(
          "/api/settings",
        ),
      ]);
      setSources(a.sources);
      setShares(b.shares);
      setLinks(c.links);
      setAnalytics(d);
      setPublicLinkOrigin(settings.publicLinkOrigin);
      setSavedLinkOrigin(settings.publicLinkOrigin);
      setDefaultOrigin(settings.defaultOrigin);
    }
  }
  async function loadPage() {
    if (publicSlug)
      setPage(await api(`/api/public/${encodeURIComponent(publicSlug)}`));
  }
  useEffect(() => {
    (publicSlug ? loadPage() : refresh()).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!source) {
      setEntries([]);
      return;
    }
    const controller = new AbortController();
    setEntries([]);
    setBrowseLoading(true);
    api<{ entries: Entry[] }>(
      `/api/sources/${encodeURIComponent(source)}/browse?path=${encodeURIComponent(path)}`,
      { signal: controller.signal },
    )
      .then((x) => setEntries(x.entries))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBrowseLoading(false);
      });
    return () => controller.abort();
  }, [source, path]);
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
    const list = Array.from(files);
    if (list.length > 500) { setError("Bitte höchstens 500 Dateien gleichzeitig hochladen."); return; }
    setUploading(true);
    let batch = "";
    const uploaded: Item[] = [];
    try {
      const result = await post("/api/uploads", {}) as { id: string };
      batch = result.id;
      for (const [index, file] of list.entries()) {
        setUploadProgress(`${index + 1} / ${list.length}: ${file.name}`);
        const relative = file.webkitRelativePath || file.name;
        const response = await fetch(`/api/uploads/${encodeURIComponent(batch)}?path=${encodeURIComponent(relative)}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file });
        if (!response.ok) throw new Error(`Upload von „${file.name}“ fehlgeschlagen (${response.status}).`);
        const first = relative.split("/")[0];
        const item: Item = { sourceId: "sharelyze-uploads", path: `${batch}/${relative.includes("/") ? first : relative}`, kind: relative.includes("/") ? "directory" : "file" };
        if (!uploaded.some((existing) => existing.path === item.path)) uploaded.push(item);
      }
      addItems(uploaded);
      setNotice(`${list.length} Datei(en) hochgeladen und ausgewählt.`);
    } catch (error) {
      if (uploaded.length) addItems(uploaded);
      setError(`${error instanceof Error ? error.message : "Upload fehlgeschlagen."} Bereits hochgeladene Dateien bleiben im Upload-Speicher erhalten.`);
    } finally { setUploading(false); setUploadProgress(""); }
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
      : s.expires_at && Date.parse(s.expires_at) <= Date.now()
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
        (linkFilter === "active" ? Boolean(link.active) : !link.active)) &&
      `${link.slug} ${link.target_url}`
        .toLocaleLowerCase("de")
        .includes(normalized(linkQuery)),
  );
  async function browse(id: string, sub = "") {
    const x = await api<{ entries: Entry[] }>(
      `/api/public/${encodeURIComponent(publicSlug!)}/items/${id}?path=${encodeURIComponent(sub)}`,
    );
    setFolder({ id, path: sub, entries: x.entries });
  }
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
                transform: `translateX(${["freigaben", "kurzlinks", "statistiken", "einstellungen"].indexOf(view) * 46}px)`,
              }}
            />
            {(
              [
                ["freigaben", "Freigaben", Share2],
                ["kurzlinks", "Kurzlinks", Link2],
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
            ["statistiken", "Statistiken", BarChart3], ["einstellungen", "Einstellungen", Settings],
          ] as const).map(([id, label, Icon]) => <a key={id} href={`#${id}`} aria-current={view === id ? "page" : undefined} onClick={(event) => { event.currentTarget.closest("details")!.open = false; setError(""); setNotice(""); }}><Icon size={18} aria-hidden="true" />{label}</a>)}
          <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; void run(async () => { await post("/api/auth/logout", {}); await refresh(); }); }}><LogOut size={18} aria-hidden="true" />Abmelden</button>
        </nav>
      </details>}
      <Notifications entries={notifications} dismiss={(id) => setNotifications((current) => current.filter((entry) => entry.id !== id))} />
      {publicSlug ? (
        <section>
          <p className="eyebrow">FREIGABE</p>
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
              <h1>{page.title}</h1>
              <a
                className="button"
                href={`/api/public/${encodeURIComponent(publicSlug)}/zip`}
              >
                Alles als ZIP herunterladen
              </a>
              <ul>
                {page.items?.map((i) => (
                  <li key={i.id}>
                    {i.kind === "directory" ? (
                      <button
                        className="plain"
                        onClick={() => void run(() => browse(i.id))}
                      >
                        <Folder size={16} aria-hidden="true" /> {i.name}
                      </button>
                    ) : (
                      <a
                        href={`/api/public/${encodeURIComponent(publicSlug)}/items/${i.id}/download`}
                      >
                        ↓ {i.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              {folder && (
                <div>
                  <h2>Ordner {folder.path}</h2>
                  <button
                    onClick={() =>
                      void run(() =>
                        browse(
                          folder.id,
                          folder.path.split("/").slice(0, -1).join("/"),
                        ),
                      )
                    }
                  >
                    Zurück
                  </button>
                  <ul>
                    {folder.entries.map((e) => {
                      const p = [folder.path, e.name].filter(Boolean).join("/");
                      return (
                        <li key={p}>
                          {e.kind === "directory" ? (
                            <button
                              className="plain"
                              onClick={() =>
                                void run(() => browse(folder.id, p))
                              }
                            >
                              <Folder size={16} aria-hidden="true" /> {e.name}
                            </button>
                          ) : (
                            <a
                              href={`/api/public/${encodeURIComponent(publicSlug)}/items/${folder.id}/download?path=${encodeURIComponent(p)}`}
                            >
                              ↓ {e.name}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
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
                      <span className="share-expiry" title="Ablauf"><CalendarDays size={15} aria-label="Ablauf" />
                        {s.expires_at
                          ? new Date(s.expires_at).toLocaleDateString("de-DE")
                          : "Unbegrenzt"}
                      </span>
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
                        <button
                          type="button"
                          className="share-action" title="Link kopieren" aria-label="Link kopieren"
                          onClick={() =>
                            void run(async () => {
                              await navigator.clipboard.writeText(
                                `${savedLinkOrigin}/${s.slug}`,
                              );
                              setNotice("Link kopiert.", `share:${s.id}`);
                            })
                          }
                        >
                          <ActionIcon kind="copy" />
                        </button>
                        <button type="button" className="share-action" title="Bearbeiten" aria-label="Freigabe bearbeiten" aria-expanded={editingShare === s.id} onClick={() => setEditingShare(editingShare === s.id ? null : s.id)}><ActionIcon kind="pen" /></button>
                      </div>
                    </div>
                    {editingShare === s.id && <ShareEditor
                      share={s}
                      selection={selected}
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
                    Keine passenden Freigaben gefunden.
                  </li>
                )}
              </ul>
              <details className="create-panel">
                <summary>＋ Neue Freigabe</summary>
                <div className="upload-actions">
                  <label className="upload-picker">Dateien hochladen<input type="file" multiple disabled={uploading} onChange={(e) => { void uploadFiles(e.currentTarget.files); e.currentTarget.value = ""; }} /></label>
                  <label className="upload-picker">Ordner hochladen<input type="file" multiple ref={(input) => input?.setAttribute("webkitdirectory", "")} disabled={uploading} onChange={(e) => { void uploadFiles(e.currentTarget.files); e.currentTarget.value = ""; }} /></label>
                  {uploading && <span role="status">Upload: {uploadProgress}</span>}
                </div>
                {!source && <ul className="file-list source-list" aria-label="Verfügbare Speicherquellen">
                  {sources.map((item) => <li key={item.id}>
                    <button type="button" className="source-open" onClick={() => { setSource(item.id); setPath(""); setEntryQuery(""); }}><Folder size={16} aria-hidden="true" />{item.name}</button>
                  </li>)}
                  {sources.length === 0 && <li className="empty-state">Keine Speicherquellen verfügbar.</li>}
                </ul>}
                {source && (
                  <>
                    <div className="breadcrumbs" aria-label="Aktueller Ordner">
                      <button type="button" onClick={() => { setSource(""); setPath(""); setEntryQuery(""); }}>Speicherquellen</button> / {" "}
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
                    <label className="search-field compact-field">
                      <span>Dateien und Ordner suchen</span>
                      <input
                        type="search"
                        value={entryQuery}
                        onChange={(e) => setEntryQuery(e.target.value)}
                        placeholder="Name eingeben"
                      />
                    </label>
                    <div className="row">
                      <button
                        className="secondary"
                        onClick={() =>
                          path ? setPath(path.split("/").slice(0, -1).join("/")) : setSource("")
                        }
                      >
                        Eine Ebene zurück
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          addItems([
                            { sourceId: source, path, kind: "directory" },
                          ])
                        }
                      >
                        Diesen Ordner auswählen
                      </button>
                    </div>
                    <div className="picker-toolbar">
                      <button
                        type="button"
                        className="plain"
                        onClick={() =>
                          addItems(
                            entries
                              .filter((e) =>
                                e.name
                                  .toLocaleLowerCase("de")
                                  .includes(normalized(entryQuery)),
                              )
                              .map((entry) => ({
                                sourceId: source,
                                path: [path, entry.name]
                                  .filter(Boolean)
                                  .join("/"),
                                kind: entry.kind,
                              })),
                          )
                        }
                      >
                        Sichtbare auswählen
                      </button>
                      <span>
                        {browseLoading
                          ? "Wird geladen …"
                          : `${entries.length} Einträge`}
                      </span>
                    </div>
                    <ul className="file-list">
                      {entries
                        .filter((e) =>
                          e.name
                            .toLocaleLowerCase("de")
                            .includes(normalized(entryQuery)),
                        )
                        .map((e) => (
                          <li key={e.name}>
                            <label className="inline">
                              <input
                                type="checkbox"
                                checked={selected.some(
                                  (x) =>
                                    x.sourceId === source &&
                                    x.path ===
                                      [path, e.name].filter(Boolean).join("/"),
                                )}
                                onChange={() => toggle(e)}
                              />
                              {e.kind === "directory" ? (
                                <Folder size={16} aria-hidden="true" />
                              ) : (
                                <File size={16} aria-hidden="true" />
                              )}
                              {e.name}
                            </label>
                            {e.kind === "directory" && (
                              <button
                                className="plain"
                                onClick={() =>
                                  setPath(
                                    [path, e.name].filter(Boolean).join("/"),
                                  )
                                }
                              >
                                Öffnen
                              </button>
                            )}
                          </li>
                        ))}
                      {!browseLoading &&
                        entries.filter((e) =>
                          e.name
                            .toLocaleLowerCase("de")
                            .includes(normalized(entryQuery)),
                        ).length === 0 && (
                          <li className="empty-state">
                            {entryQuery
                              ? "Keine passenden Dateien oder Ordner gefunden."
                              : "Dieser Ordner ist leer."}
                          </li>
                        )}
                    </ul>
                  </>
                )}
                <p>{selected.length} ausgewählt</p>
                <ul>
                  {selected.map((i, n) => (
                    <li key={`${i.sourceId}/${i.path}/${n}`}>
                      {i.sourceId}: /{i.path}{" "}
                      <button
                        className="plain"
                        onClick={() =>
                          setSelected(selected.filter((_, idx) => idx !== n))
                        }
                      >
                        Entfernen
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await post("/api/shares", {
                        description,
                        slug,
                        items: selected,
                        ...(sharePassword ? { password: sharePassword } : {}),
                        ...(expires
                          ? { expiresAt: new Date(expires).toISOString() }
                          : {}),
                      });
                      setSelected([]);
                      setDescription("");
                      setSlug("");
                      setSharePassword("");
                      setExpires("");
                      await refresh();
                    });
                  }}
                >
                  <label className="compact-field"><span>Beschreibung (optional)</span><input value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} /></label>
                  <label className="compact-field">
                    <span>Eigener Kurzname (optional)</span>
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </label>
                  <label className="compact-field">
                    <span>Passwort (optional, mindestens 12 Zeichen)</span>
                    <input
                      type="password"
                      minLength={12}
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                    />
                  </label>
                  <label className="compact-field">
                    <span>Ablauf (optional)</span>
                    <input
                      type="datetime-local"
                      value={expires}
                      onChange={(e) => setExpires(e.target.value)}
                    />
                  </label>
                  <button disabled={!selected.length || uploading}>
                    Freigabe erstellen
                  </button>
                </form>
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
                    ["active", "Aktiv"],
                    ["inactive", "Deaktiviert"],
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
                              ? Boolean(link.active)
                              : !link.active,
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
                      <span
                        className="link-stat"
                        title="Gezählte Weiterleitungen innerhalb der Aufbewahrungsdauer"
                      >
                        <BarChart3 size={15} aria-label="Weiterleitungen" /> {analytics?.links.find(
                          (x) => x.slug === l.slug && x.type === "redirect",
                        )?.count ?? 0}
                      </span>
                      <div className="managed-actions">
                      <div className="status-control">
                        <button
                          type="button" role="switch" aria-checked={!!l.active} aria-label={`Kurzlink /${l.slug} aktivieren`} className="toggle-switch"
                          onClick={() =>
                            void run(async () => {
                              await api(`/api/links/${l.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({ active: !l.active }),
                              });
                              await refresh();
                            })
                          }
                        >
                          <span className="switch-track" aria-hidden="true" />
                        </button>
                      </div>
                        <a
                          className="share-action"
                          href={`/${l.slug}`}
                          aria-label={`Kurzlink /${l.slug} öffnen`}
                          title="Kurzlink öffnen"
                        >
                          <ActionIcon kind="external" />
                        </a>
                        <button
                          type="button"
                          className="share-action" title="Link kopieren" aria-label="Link kopieren"
                          onClick={() =>
                            void run(async () => {
                              await navigator.clipboard.writeText(
                                `${savedLinkOrigin}/${l.slug}`,
                              );
                              setNotice("Link kopiert.", `link:${l.id}`);
                            })
                          }
                        >
                          <ActionIcon kind="copy" />
                        </button>
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
                        className="inline-editor"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(async () => {
                            await api(`/api/links/${l.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({
                                url: editUrl,
                                slug: editSlug,
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
                        <div className="row">
                          <button>Änderungen speichern</button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setEditingLink(null)}
                          >
                            Abbrechen
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
                      await post("/api/links", { url, slug: linkSlug });
                      setUrl("");
                      setLinkSlug("");
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
                    <span>Kurzname (optional)</span>
                    <input
                      value={linkSlug}
                      onChange={(e) => setLinkSlug(e.target.value)}
                    />
                  </label>
                  </div>
                  <div className="link-create-actions"><button type="submit">Erstellen</button><button type="button" className="share-action" aria-label="Kurzlink-Erstellung abbrechen" title="Abbrechen" onClick={() => setLinkCreateOpen(false)}><X size={18} aria-hidden="true" /></button></div>
                </form>}
              </div>
            </section>
            <section id="statistiken" hidden={view !== "statistiken"}>
              <Statistics data={analytics} />
            </section>
            <section id="einstellungen" hidden={view !== "einstellungen"}>
              <p className="eyebrow">KONFIGURATION</p>
              <h1>Einstellungen</h1>
              <div className="settings-block">
                <h2>Öffentliche Linkadresse</h2>
                <p>
                  Diese Adresse wird für kopierte Links verwendet. Sie muss
                  bereits auf ShareLyze zeigen.
                </p>
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
                <p className="muted">
                  Die Adresse ändert weder DNS noch Reverse Proxy oder den
                  geschützten Admin-Ursprung. Für die Anmeldung muss{" "}
                  <code>PUBLIC_ORIGIN</code> weiterhin zur verwendeten Adresse
                  passen. Standard: {defaultOrigin}
                </p>
              </div>
              <div className="settings-block">
                <h2>Speicherquellen</h2>
                <p>
                  Quellen werden beim Start über <code>SOURCES_JSON</code> und
                  lesende Bind-Mounts konfiguriert.
                </p>
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
