// Adapted from MediaLyze frontend/src/components/NotificationHost.tsx and
// frontend/src/medialyze.css, AGPL-3.0; see docs/PROJECT_PLAN.md.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

export type Notification = { id: number; type: "success" | "error"; message: string; topicKey?: string };

function Deck({ entries, dismiss }: { entries: Notification[]; dismiss: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const expanded = hovered || focused;
  const deck = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!expanded && deck.current) deck.current.scrollTop = 0; }, [expanded]);
  const cards = [...entries].reverse();
  const visible = Math.min(cards.length, 5);
  return <div ref={deck} className="notification-deck" data-expanded={expanded} data-overflow={cards.length > 5}
    role="group" aria-label={`${cards.length} Benachrichtigungen`} tabIndex={cards.length > 1 ? 0 : undefined}
    onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }}
    onPointerLeave={() => setHovered(false)} onPointerDown={(event) => { if (event.pointerType === "touch") event.currentTarget.focus(); }}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    style={{ "--notification-stack-height": `${42 + (visible - 1) * 5}px`, "--notification-fan-height": `${42 + (visible - 1) * 46}px` } as CSSProperties}>
    {cards.map((entry, index) => <article key={entry.id} className="notification-card" data-type={entry.type}
      inert={!expanded && index > 0} style={{ "--notification-top": `${(visible - 1) * 5 - index * 5}px`, "--notification-fan-top": `${index * 46}px`, "--notification-delay": `${Math.min(index, 4) * 18}ms`, zIndex: cards.length - index } as CSSProperties}>
      {entry.type === "success" ? <CheckCircle2 className="notification-icon" aria-hidden="true" /> : <CircleAlert className="notification-icon" aria-hidden="true" />}
      <span className="notification-copy" title={entry.message}>{entry.message}</span>
      <button type="button" className="notification-dismiss" aria-label="Benachrichtigung schließen" onClick={() => dismiss(entry.id)}><X size={15} aria-hidden="true" /></button>
    </article>)}
  </div>;
}

export function Notifications({ entries, dismiss }: { entries: Notification[]; dismiss: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [dialogOpen, setDialogOpen] = useState(false);
  const host = useRef<HTMLElement>(null);
  const timers = useRef(new Map<number, { remaining: number; started: number }>());
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    const update = () => setDialogOpen([...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]')].some((dialog) => !dialog.closest('[hidden], [aria-hidden="true"]')));
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open", "hidden", "aria-hidden", "aria-modal", "role"] });
    update();
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (!host.current?.contains(document.activeElement)) setFocused(false); }, [entries]);
  useEffect(() => {
    if (!entries.length) { setHovered(false); setFocused(false); }
    const current = timers.current;
    for (const entry of entries) if (!current.has(entry.id)) current.set(entry.id, { remaining: 2500, started: 0 });
    for (const id of current.keys()) if (!entries.some((entry) => entry.id === id)) current.delete(id);
    if (hovered || focused || hidden || dialogOpen) return;
    const handles: ReturnType<typeof setTimeout>[] = [];
    for (const [id, timer] of current) {
      timer.started = performance.now();
      handles.push(setTimeout(() => dismissRef.current(id), timer.remaining));
    }
    return () => {
      const now = performance.now();
      for (const handle of handles) clearTimeout(handle);
      for (const timer of current.values()) timer.remaining = Math.max(0, timer.remaining - (now - timer.started));
    };
  }, [entries, hovered, focused, hidden, dialogOpen]);
  const groups = new Map<string, Notification[]>();
  for (const entry of entries) {
    const key = entry.topicKey ?? `notification:${entry.id}`;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return <>
    <section ref={host} className="notification-host" aria-label="Benachrichtigungen"
      onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }}
      onPointerLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      {[...groups].reverse().map(([key, group]) => <Deck key={key} entries={group} dismiss={dismiss} />)}
    </section>
    <div className="notification-announcements" role="status" aria-live="polite" aria-relevant="additions">{entries.map((entry) => <p key={entry.id}>{entry.type === "error" ? "Fehler: " : ""}{entry.message}</p>)}</div>
  </>;
}
