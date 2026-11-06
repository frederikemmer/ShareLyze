import type { Campaign,ClientContext,TransferMetrics,Diagnostic,QualityMetrics } from "./telemetry";
export type VisitorSnapshot = {
  version:1;
  resource?:string;visitId?:string;campaign?:Campaign;client?:ClientContext;transfer?:TransferMetrics;diagnostic?:Diagnostic;quality?:QualityMetrics;fileType?:string;
  agent:{browser:string|null;browserVersion:string|null;os:string|null;osVersion:string|null;device:string|null;vendor:string|null;model:string|null;architecture:string|null;engine:string|null;engineVersion:string|null;bot:boolean;aiCrawler:boolean;aiAssistant:boolean};
  network:{family:number|null;scope:string;peerIp:string|null;proxyChain:string[];protocol:string;httpVersion:string};
  request:{method:string;path:string;language:string|null;range:string|null;fetchSite:string|null;fetchMode:string|null;fetchDest:string|null;prefetch:boolean};
  clientHints:Record<string,string>;
  geo:{status:string;source:string;databaseDate:string|null;country:string|null;countryCode:string|null;continent:string|null;region:string|null;city:string|null;latitude:number|null;longitude:number|null;timeZone:string|null;postalCode:string|null;accuracyRadiusKm:number|null;asn:number|null;organization:string|null;asnDatabaseDate:string|null};
};
export type AnalyticsEvent = {
  id:number;created_at:string;type:string;slug:string;ip_address:string|null;user_agent:string|null;referrer_origin:string|null;
  file_path:string|null;link_id:string|null;share_id:string|null;details:VisitorSnapshot|null;
};
export const eventLabels:Record<string,string>={
  view:"Freigabeansichten",redirect:"Weiterleitungen",link_view:"Passwortseite Kurzlink",share_redirect:"Kurzlink zur Freigabe",
  landing:"Freigabeseite geladen",unlock_failed:"Fehlgeschlagene Passwortversuche",
  retry_attempt:"Erneute Anfrage nach Abbruch/Fehler",client_context:"Browserkontext",view_change:"Ansicht gewechselt",client_error:"Browserfehler",page_performance:"Ladezeit im Browser",resource_performance:"Ressourcen-Ladezeit",api_response:"API-Antwortzeit",resume_attempt:"Range-/Wiederaufnahmeversuch",download_aborted:"Download abgebrochen",download_error:"Downloadfehler",zip_aborted:"ZIP abgebrochen",zip_error:"ZIP-Fehler",preview_finished:"Vorschau ausgeliefert",preview_aborted:"Vorschau abgebrochen",preview_error:"Vorschaufehler",media_finished:"Medium ausgeliefert",media_aborted:"Medium abgebrochen",media_error:"Medienfehler",
  download_start:"Downloadstarts",transfer_finished:"Serverübertragungen abgeschlossen",zip_start:"ZIP-Starts",zip_finished:"ZIP-Übertragungen abgeschlossen",
};
