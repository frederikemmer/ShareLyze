import { useState } from "react";
import type { DateTimeSettings } from "../../backend/src/date-time-settings";
import { formatDate, parseDateTime, resolvedDateTime } from "./date-time";
export function RegionDateTimeInput({value,settings,onChange,onEnter}: {value:string;settings:DateTimeSettings;onChange:(value:string)=>void;onEnter:()=>void}) {
 const {locale,hour12}=resolvedDateTime(settings,navigator.language);
 const initial=value ? new Date(value) : null;
 const [date,setDate]=useState(initial ? formatDate(initial,locale) : "");
 const [pickerDate,setPickerDate]=useState(initial ? `${initial.getFullYear()}-${String(initial.getMonth()+1).padStart(2,"0")}-${String(initial.getDate()).padStart(2,"0")}` : "");
 const [hour,setHour]=useState(initial ? String(hour12 ? initial.getHours()%12||12 : initial.getHours()).padStart(2,"0") : "");
 const [minute,setMinute]=useState(initial ? String(initial.getMinutes()).padStart(2,"0") : "");
 const [period,setPeriod]=useState(initial && initial.getHours()>=12 ? "PM" : "AM");
 const [error,setError]=useState("");
 function update(d:string,h:string,m:string,p:string) {
  if(!d && !h && !m) {setError("");return;}
  if(!d || !h || !m) {setError("Datum und Uhrzeit vervollständigen.");return;}
  const result=parseDateTime(d,h,m,p,locale,hour12);
  if(!result) {setError("Bitte ein gültiges Datum und eine gültige Uhrzeit eingeben.");return;}
  if(result.getTime()<=Date.now()) {setError("Der Zeitpunkt muss in der Zukunft liegen.");return;}
  setError("");onChange(result.toISOString());
 }
 return <div><div className="region-date-time" onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();if(!error) onEnter();}}}>
  <div className="region-date-field"><input aria-label="Datum" type="text" inputMode="numeric" placeholder={formatDate(new Date(2026,10,6),locale)} value={date} onChange={event=>{const next=event.target.value;setDate(next);const parsed=parseDateTime(next,hour12?"12":"00","00","AM",locale,hour12);if(parsed) setPickerDate(`${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,"0")}-${String(parsed.getDate()).padStart(2,"0")}`);update(next,hour,minute,period);}}/>
  <input aria-label="Datum im Kalender auswählen" title="Kalender öffnen" className="region-date-picker" type="date" value={pickerDate} onChange={event=>{const next=event.target.value;setPickerDate(next);if(next){const [y,m,d]=next.split("-").map(Number);const formatted=formatDate(new Date(y,m-1,d),locale);setDate(formatted);update(formatted,hour,minute,period);}}}/></div>
  <div className="region-time-fields"><input aria-label="Stunde" type="text" inputMode="numeric" maxLength={2} placeholder="hh" value={hour} onChange={event=>{const next=event.target.value;setHour(next);update(date,next,minute,period);}}/><span aria-hidden="true">:</span><input aria-label="Minute" type="text" inputMode="numeric" maxLength={2} placeholder="mm" value={minute} onChange={event=>{const next=event.target.value;setMinute(next);update(date,hour,next,period);}}/>{hour12 && <select aria-label="Tageshälfte" value={period} onChange={event=>{const next=event.target.value;setPeriod(next);update(date,hour,minute,next);}}><option value="AM">AM</option><option value="PM">PM</option></select>}</div>
 </div>{error && <small className="region-date-error" role="status">{error}</small>}</div>;
}
