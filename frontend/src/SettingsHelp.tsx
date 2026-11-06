import { useId, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

export function SettingsHelp({label, children}: {label: string; children: ReactNode}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <span className="slug-help" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" className="slug-help-button" aria-label={label} aria-describedby={id} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)} onKeyDown={event => { if(event.key === "Escape") {event.preventDefault();setOpen(false);} }}><Info size={15} aria-hidden="true"/></button>
    <span id={id} role="tooltip" className="slug-help-tooltip" hidden={!open}>{children}</span>
  </span>;
}
