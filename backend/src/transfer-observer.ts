import type { Request,Response } from "express";
import type { Diagnostic,TransferMetrics } from "../../shared/telemetry";
import { Transform } from "node:stream";
import { randomUUID } from "node:crypto";
export function diagnose(code:string,status=0):Diagnostic {
  const entries:Record<string,[string,string[]]>={
    client_disconnected:["Verbindung vor Serverabschluss geschlossen",["Abbruch durch Empfänger","Tab oder Download geschlossen","Netzunterbrechung","Proxy-Timeout"]],
    source_unavailable:["Speicherquelle aktuell nicht verfügbar",["Quellenmount entfernt oder deaktiviert","Verbindung zum Speicher unterbrochen"]],
    input_limit:["Vorschaudatei überschreitet ein Verarbeitungs-/Sicherheitslimit",["Datei zu groß","Zu viele Bildpixel","SVG mit nicht zugelassenen Inhalten"]],
    source_changed:["Quelldatei während Vorbereitung oder Übertragung geändert",["Datei wurde bearbeitet oder ersetzt"]],
    unavailable:["Angeforderter Inhalt ist nicht verfügbar",["Pfad nicht verfügbar","Format nicht unterstützt","Quelle nicht erreichbar"]],
    unsupported_format:["Inhalt kann nicht als Vorschau dargestellt werden",["Format oder Codec nicht unterstützt"]],
    source_missing:["Datei oder Verzeichnis nicht gefunden",["Datei entfernt","Quellenmount nicht verfügbar"]],
    permission_denied:["Lesender Zugriff verweigert",["Dateirechte oder NAS-ACL verhindern Zugriff"]],
    invalid_range:["Range-Anfrage nicht erfüllbar",["Ungültiger Bytebereich","Geänderte Dateigröße"]],
    capacity_limit:["Gleichzeitige Verarbeitungskapazität erreicht",["Zu viele parallele Anfragen; später erneut versuchen"]],
    render_failed:["Vorschau konnte nicht erzeugt werden",["Format oder Codec nicht unterstützt","Beschädigte oder zu große Datei","Ressourcenlimit"]],
    browser_load_error:["Browser meldet Lade- oder Darstellungsfehler",["HTTP-/Netzwerkfehler","Format oder Codec nicht unterstützt","Beschädigter Inhalt"]],
    archive_limit:["Archivliste überschreitet Verarbeitungsgrenze",["Zu viele Einträge oder zu tiefe Ordnerstruktur"]],
    read_error:["Fehler beim Lesen der Quelle",["Speicher- oder Mountproblem","Leserechte geändert"]],
    request_failed:["Anfrage nicht erfolgreich",["Details anhand HTTP-Status und serverseitigem Ereignis prüfen"]],
  };
  const fallback=status===416 ? "invalid_range" : status===503 ? "capacity_limit" : status===404 ? "unavailable" : "request_failed";
  const key=entries[code] ? code : fallback,[observed,possibleReasons]=entries[key];
  return {code:key,observed,possibleReasons};
}
function safeSystemCode(error:unknown) {
  const code=(error as {code?:unknown})?.code;
  return typeof code==="string" && /^(E[A-Z0-9_]{1,30}|ERR_[A-Z0-9_]{1,50})$/.test(code) ? code : undefined;
}
export function errorCode(error:unknown,fallback="read_error") {
  const value=error as {code?:string;message?:string};
  if(value?.code==="ENOENT" || value?.code==="ENOTDIR") return "source_missing";
  if(value?.code==="EACCES" || value?.code==="EPERM") return "permission_denied";
  if(/^(File|Source) changed$/.test(value?.message || "")) return "source_changed";
  if(value?.message==="Source unavailable") return "source_unavailable";
  if(["Preview input too large","Unsafe SVG"].includes(value?.message || "")) return "input_limit";
  if(value?.message==="Preview queue full") return "capacity_limit";
  if(value?.message==="Archive too large") return "archive_limit";
  return fallback;
}
/** Measures bounded streaming with backpressure. Bytes are handed to the HTTP response, not proof of client storage. */
export function observeTransfer(req:Request,res:Response,kind:TransferMetrics["kind"],fileType:string,emit:(type:string,transfer:TransferMetrics,diagnostic?:Diagnostic)=>void) {
  const started=performance.now(),id=randomUUID();
  let retryOf:string|null=null;
  let bytes=0,expected:number|null=null,done=false,reason:string|undefined,accepted=false,systemCode:string|undefined;
  const meter=new Transform({transform(chunk,_encoding,callback) {bytes+=chunk.length;callback(null,chunk);}});
  const snapshot=(outcome:TransferMetrics["outcome"]):TransferMetrics => {
    const durationMs=Math.max(0,performance.now()-started);
    return {id,retryOf,kind,outcome,bytes,expectedBytes:expected,durationMs,bytesPerSecond:durationMs>0 ? bytes*1000/durationMs : 0,status:res.statusCode,rangeRequested:!!req.get("range"),rangeAccepted:accepted,rangeFallback:req.get("range") && res.statusCode===200 ? req.get("if-range") ? "if_range_mismatch_or_unsupported" : "range_not_applied" : null,resumeAttempt:kind==="download" && !!req.get("range") && (req.get("range")!=="bytes=0-" || !!req.get("if-range")),fileType};
  };
  function finish(closed:boolean) {
    if(done || req.method==="HEAD") return;
    done=true;
    reason ||= res.locals?.telemetryError;
    const failed=!!reason || res.statusCode>=400;
    const outcome=failed ? "failed" : closed ? "aborted" : "completed";
    const diagnostic=outcome==="completed" ? undefined : {...diagnose(reason || (closed && !failed ? "client_disconnected" : ""),res.statusCode),...(systemCode ? {systemCode} : {})};
    const type=outcome==="completed" ? kind==="download" ? "transfer_finished" : kind==="zip" ? "zip_finished" : kind==="preview" ? "preview_finished" : "media_finished" : kind+"_"+
      (outcome==="aborted" ? "aborted" : "error");
    try {emit(type,snapshot(outcome),diagnostic);}
    catch {console.error("ShareLyze: transfer analytics result could not be persisted.");}
    finally {meter.destroy();}
  }
  res.once("error",error => {systemCode=safeSystemCode(error);});
  res.once("finish",() => finish(false));
  res.once("close",() => finish(!res.writableFinished));
  meter.on("error",() => res.destroy());
  if(kind==="download" && req.get("range")) emit("resume_attempt",snapshot("started"));
  return {
    meter,
    expected(value:number) {expected=value;},
    range(value:boolean) {accepted=value;},
    retry(value:string|null) {retryOf=value;},
    fail(code:string) {reason=code;},
    failure(error:unknown,fallback="read_error") {reason=errorCode(error,fallback);systemCode=safeSystemCode(error);},
    start() {emit(kind==="zip" ? "zip_start" : "download_start",snapshot("started"));if(retryOf) emit("retry_attempt",snapshot("started"));},
    // Buffered previews do not pass through the stream meter.
    buffered(value:number) {bytes=value;expected=value;},
  };
}
