import { open, type Reader, type CityResponse, type AsnResponse } from "maxmind";
import ipaddr from "ipaddr.js";
import { createWriteStream, mkdirSync } from "node:fs";
import { rename, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

export function normalizeIp(input: string | undefined): {address:string|null;family:number|null;scope:string} {
  try {
    const address=ipaddr.process(input || "");
    return {address:address.toString(),family:address.kind()==="ipv4" ? 4 : 6,scope:address.range()};
  } catch {return {address:null,family:null,scope:"unknown"};}
}
export type GeoLocation = {
  status: string; source: string; databaseDate: string | null;
  country: string | null; countryCode: string | null; continent: string | null;
  region: string | null; city: string | null; latitude: number | null; longitude: number | null;
  timeZone: string | null; postalCode: string | null; accuracyRadiusKm: number | null;
  asn: number | null; organization: string | null; asnDatabaseDate: string | null;
};
const named=(value?: {names?:{de?:string;en?:string}}) => value?.names?.de || value?.names?.en || null;
export class GeoIpService {
  private city?: Reader<CityResponse>;
  private asn?: Reader<AsnResponse>;
  private lastMonth?: string;
  state={running:false,phase:"idle",downloadedBytes:0,error:"",cityDate:null as string|null,asnDate:null as string|null};
  constructor(readonly directory?:string) {if(directory) mkdirSync(directory,{recursive:true,mode:0o700});}
  get status() {return {...this.state,available:!!this.directory,cityReady:!!this.city,asnReady:!!this.asn,source:"DB-IP Lite",attribution:"https://db-ip.com/"};}
  async load() {
    if(!this.directory) return;
    for(const kind of ["city","asn"] as const) {
      try {
        const path=join(this.directory,kind+".mmdb");
        const info=await stat(path);
        if(info.size>300*1024**2) throw new Error("GeoIP-Datenbank ist zu groß.");
        const reader=await open<any>(path,{cache:{max:2000}});
        if(!reader.metadata.databaseType.toLowerCase().includes(kind)) throw new Error("Falscher GeoIP-Datenbanktyp.");
        if(kind==="city") this.city=reader;else this.asn=reader;
        this.state[kind+"Date" as "cityDate"|"asnDate"]=reader.metadata.buildEpoch.toISOString();
      } catch(error) {if((error as NodeJS.ErrnoException).code!=="ENOENT") this.state.error="Eine GeoIP-Datenbank konnte nicht geladen werden.";}
    }
  }
  lookup(input:string): GeoLocation {
    const ip=normalizeIp(input);
    const result:GeoLocation={status:"database_missing",source:"DB-IP Lite",databaseDate:this.state.cityDate,country:null,countryCode:null,continent:null,region:null,city:null,latitude:null,longitude:null,timeZone:null,postalCode:null,accuracyRadiusKm:null,asn:null,organization:null,asnDatabaseDate:this.state.asnDate};
    if(ip.scope!=="unicast" || !ip.address) return {...result,status:ip.address ? "non_public_ip" : "invalid_ip"};
    try {
      const city=this.city?.get(ip.address), asn=this.asn?.get(ip.address);
      if(asn) {result.asn=asn.autonomous_system_number;result.organization=asn.autonomous_system_organization;}
      if(city) Object.assign(result,{status:"found",country:named(city.country),countryCode:city.country?.iso_code ?? null,continent:named(city.continent),region:city.subdivisions?.map(named).filter(Boolean).join(", ") || null,city:named(city.city),latitude:city.location?.latitude ?? null,longitude:city.location?.longitude ?? null,timeZone:city.location?.time_zone ?? null,postalCode:city.postal?.code ?? null,accuracyRadiusKm:city.location?.accuracy_radius ?? null});
      else if(this.city) result.status="not_found";
    } catch {result.status="lookup_failed";}
    return result;
  }
  /** Monthly database downloads only; no visitor IP or request data ever leaves this server. */
  async update(fetcher:typeof fetch=fetch, now=new Date()) {
    if(this.state.running || !this.directory) return;
    this.state.running=true;this.state.error="";this.state.downloadedBytes=0;
    const month=now.toISOString().slice(0,7);
    try {
      for(const kind of ["city","asn"] as const) {
        this.state.phase=kind;
        const temporary=join(this.directory,kind+".mmdb.part");
        try {
          const response=await fetcher("https://download.db-ip.com/free/dbip-"+kind+"-lite-"+month+".mmdb.gz",{signal:AbortSignal.timeout(180000),redirect:"error"});
          if(!response.ok || !response.body) throw new Error("DB-IP-Download fehlgeschlagen (HTTP "+response.status+").");
          let compressed=0,expanded=0;
          const download=new Transform({transform:(chunk,_encoding,done) => {compressed+=chunk.length;this.state.downloadedBytes+=chunk.length;done(compressed>200*1024**2 ? new Error("Download zu groß.") : null,chunk);}});
          const limit=new Transform({transform(chunk,_encoding,done) {expanded+=chunk.length;done(expanded>300*1024**2 ? new Error("Datenbank zu groß.") : null,chunk);}});
          await pipeline(Readable.fromWeb(response.body as any),download,createGunzip(),limit,createWriteStream(temporary,{mode:0o600,flags:"w"}));
          const reader=await open<any>(temporary,{cache:{max:2000}});
          if(!reader.metadata.databaseType.toLowerCase().includes(kind)) throw new Error("Ungültige GeoIP-Datenbank.");
          await rename(temporary,join(this.directory,kind+".mmdb"));
          if(kind==="city") this.city=reader;else this.asn=reader;
          this.state[kind+"Date" as "cityDate"|"asnDate"]=reader.metadata.buildEpoch.toISOString();
        } finally {await unlink(temporary).catch(() => {});}
      }
      this.lastMonth=month;
    } catch(error) {this.state.error=error instanceof Error ? error.message : "GeoIP-Aktualisierung fehlgeschlagen.";}
    finally {this.state.running=false;this.state.phase="idle";}
  }
  /** Keep installed data current. First download requires the admin's setup button. */
  async maintain() {
    if(!this.city || this.state.running) return;
    const month=new Date().toISOString().slice(0,7);
    if(!this.lastMonth && this.state.cityDate?.slice(0,7)===month && this.state.asnDate?.slice(0,7)===month) this.lastMonth=month;
    if(this.lastMonth!==month) {this.lastMonth=month;await this.update();}
  }
}
