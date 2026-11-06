import type { DateTimeSettings } from "../../backend/src/date-time-settings";
export function resolvedDateTime(settings:DateTimeSettings, browserLocale:string) {
 const locale=settings.region === "auto" ? browserLocale : settings.region;
 const hour12=settings.timeFormat === "auto" ? !!new Intl.DateTimeFormat(locale,{hour:"numeric"}).resolvedOptions().hour12 : settings.timeFormat === "12";
 return {locale,hour12};
}
export function datePartsOrder(locale:string) {
 return new Intl.DateTimeFormat(locale,{year:"numeric",month:"2-digit",day:"2-digit",numberingSystem:"latn"}).formatToParts(new Date(2026,10,6)).filter(part=>["year","month","day"].includes(part.type)).map(part=>part.type);
}
export function formatDate(date:Date,locale:string) {return new Intl.DateTimeFormat(locale,{year:"numeric",month:"2-digit",day:"2-digit",numberingSystem:"latn"}).format(date);}
export function parseDateTime(dateText:string,hourText:string,minuteText:string,period:string,locale:string,hour12:boolean):Date|null {
 const chunks=dateText.match(/\d+/g); const order=datePartsOrder(locale);
 if(!chunks || chunks.length!==3 || !/^\d{1,2}$/.test(hourText) || !/^\d{2}$/.test(minuteText)) return null;
 const values=Object.fromEntries(order.map((part,index)=>[part,Number(chunks[index])]));
 if(chunks[order.indexOf("year")].length!==4) return null;
 let hour=Number(hourText), minute=Number(minuteText);
 if(minute>59 || (hour12 ? hour<1 || hour>12 : hour>23)) return null;
 if(hour12) hour=hour%12+(period==="PM"?12:0);
 const date=new Date(values.year,values.month-1,values.day,hour,minute);
 if(date.getFullYear()!==values.year || date.getMonth()!==values.month-1 || date.getDate()!==values.day || date.getHours()!==hour || date.getMinutes()!==minute) return null;
 return date;
}

export function formatTimestamp(value:string,settings:DateTimeSettings,browserLocale:string) {
 const {locale,hour12}=resolvedDateTime(settings,browserLocale);
 return new Intl.DateTimeFormat(locale,{dateStyle:"short",timeStyle:"short",hour12}).format(new Date(value));
}
