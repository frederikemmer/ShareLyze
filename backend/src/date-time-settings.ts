import type Database from "better-sqlite3";
export type DateTimeSettings = { region: "auto" | "de-DE" | "en-GB" | "en-US"; timeFormat: "auto" | "12" | "24" };
export const defaultDateTimeSettings: DateTimeSettings = {region:"auto",timeFormat:"auto"};
export function validateDateTimeSettings(value: unknown): DateTimeSettings {
 const v=value as DateTimeSettings;
 if(!v || !["auto","de-DE","en-GB","en-US"].includes(v.region) || !["auto","12","24"].includes(v.timeFormat)) throw new Error("Invalid date/time settings");
 return {region:v.region,timeFormat:v.timeFormat};
}
export function getDateTimeSettings(db:Database.Database): DateTimeSettings {
 const row=db.prepare("SELECT value FROM settings WHERE key='date_time_defaults'").get() as {value:string}|undefined;
 return row ? validateDateTimeSettings(JSON.parse(row.value)) : {...defaultDateTimeSettings};
}
