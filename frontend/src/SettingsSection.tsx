import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { SettingsHelp } from "./SettingsHelp";

export function SettingsSection({title, help, children}: {title:string; help?:ReactNode; children:ReactNode}) {
  const [open,setOpen]=useState(false);
  const id=useId();
  return <div className="settings-block">
    <div className="proxy-settings-heading"><button type="button" className="proxy-settings-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><ChevronRight size={18} aria-hidden="true"/><h2>{title}</h2></button>{help && <SettingsHelp label={`Hinweise zu ${title}`}>{help}</SettingsHelp>}</div>
    <div id={id} hidden={!open} className="settings-section-content">{children}</div>
  </div>;
}
