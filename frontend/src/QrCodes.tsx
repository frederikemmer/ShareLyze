import { useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Download, ImagePlus, Link2, Paintbrush, X } from "lucide-react";
import type { Campaign } from "../../shared/telemetry";
import { defaultQrDesign, qrLink, qrPng, qrSvg, readQrLogo, svgDataUrl } from "./qr-code";

export type QrLinkOption = { id: string; slug: string; title?: string; active?: number; expires_at?: string|null };
const steps = ["Link & Kampagne", "Gestalten", "Export"];
export function QrCodes({links,origin}:{links:QrLinkOption[];origin:string}) {
  const [step,setStep]=useState(0), [slug,setSlug]=useState(""), [campaign,setCampaign]=useState<Campaign>({utm_medium:"qr"});
  const [design,setDesign]=useState(defaultQrDesign),[format,setFormat]=useState("png"),[size,setSize]=useState(2048);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[logoBusy,setLogoBusy]=useState(false);
  const logoRequest=useRef(0);
  const chosen=links.find(link=>link.slug===slug) ?? links[0];
  const result=useMemo(() => {
    if(!chosen || !origin) return {url:"",svg:"",error:""};
    try {const url=qrLink(origin,chosen.slug,campaign);return {url,svg:qrSvg(url,design),error:""};}
    catch(e) {return {url:"",svg:"",error:e instanceof Error ? e.message : "QR-Code konnte nicht erstellt werden. Bitte kürze die Kampagnenangaben."};}
  },[chosen?.slug,origin,campaign,design]);
  const invalid=!!chosen && (chosen.active===0 || !!chosen.expires_at && Date.parse(chosen.expires_at)<=Date.now());
  function move(next:number) {setStep(next);setNotice("");setError("");}
  async function download() {
    if(!result.svg) return;
    setBusy(true);setError("");setNotice("");
    try {
      const blob=format==="svg" ? new Blob([result.svg],{type:"image/svg+xml;charset=utf-8"}) : await qrPng(result.svg,size);
      const url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url;a.download=`sharelyze-${chosen!.slug}.${format}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setNotice("QR-Code exportiert.");
    } catch(e) {setError(e instanceof Error ? e.message : "Export fehlgeschlagen.");} finally {setBusy(false);}
  }
  return <>
    <h1>QR-Codes</h1>
    {!links.length ? <div className="empty-state"><p>Noch kein Kurzlink vorhanden.</p><a href="#kurzlinks">Zuerst einen Kurzlink erstellen</a></div> : <div className="qr-workbench">
      <div className="qr-controls">
        <div className="share-mode-toggle qr-steps" role="group" aria-label="QR-Code bearbeiten">
          {steps.map((label,index)=><button key={label} type="button" aria-pressed={step===index} aria-controls="qr-step-panel" onClick={()=>move(index)}><span className="qr-step-number">{index+1}</span>{label}</button>)}
        </div>
        <div className="qr-context"><Link2 size={16} aria-hidden="true"/><span>{chosen?.title || '/'+chosen?.slug}{campaign.utm_campaign && <> · {campaign.utm_campaign}</>}</span>{step!==0 && <button className="secondary" onClick={()=>move(0)} aria-label="Link und Kampagne bearbeiten">Bearbeiten</button>}</div>
        <div id="qr-step-panel" className="qr-panel" aria-label={steps[step]}>
          {step===0 && <>
            <h2>Welchen Link möchtest du teilen?</h2>
            <label className="compact-field"><span>Kurzlink</span><select value={chosen?.slug} onChange={e=>setSlug(e.target.value)}>{links.map(link=><option key={link.id} value={link.slug}>{link.title ? link.title+' · ' : ''}/{link.slug}</option>)}</select></label>
            <h3>Kampagneninfos <small className="muted">optional</small></h3>
            <div className="qr-fields">{([["utm_campaign","Kampagne","fotobuch2026"],["utm_source","Quelle","fotobuch"],["utm_medium","Medium","qr"],["utm_content","Variante","buchrueckseite"]] as const).map(([key,label,placeholder])=><label key={key} className="compact-field"><span>{label}</span><input maxLength={100} value={campaign[key] ?? ""} placeholder={placeholder} onChange={e=>setCampaign({...campaign,[key]:e.target.value.replace(/[\u0000-\u001f\u007f]/g,"")})}/></label>)}</div>
            <p className="muted qr-hint">Diese Angaben stehen öffentlich im Link. Ein Aufruf über den QR-Link ist kein Nachweis eines Kamerascans.</p>
          </>}
          {step===1 && <>
            <h2>Wie soll dein QR-Code aussehen?</h2>
            <div className="qr-presets" role="group" aria-label="Gestaltungsvorlage">{["Klar","Weich","Mit Logo"].map((label,index)=>{
              const selected=index===2 ? !!design.logo : !design.logo && design.rounded===(index===1);
              const sample=qrSvg("https://example.org",{...defaultQrDesign,rounded:index===1,foreground:defaultQrDesign.foreground});
              return <button type="button" key={label} aria-pressed={selected} onClick={()=>{
                if(index===2) {document.getElementById("qr-logo")?.click();return;}
                logoRequest.current++;setLogoBusy(false);setDesign({...design,rounded:index===1,logo:""});
              }}><img src={svgDataUrl(sample)} alt="" width={52} height={52}/><span>{label}</span>{selected && <Check size={16} aria-hidden="true"/>}{index===2 && <ImagePlus size={16} aria-hidden="true"/>}</button>;
            })}</div>
            <h3>Farben & Logo</h3>
            <div className="qr-fields"><label className="compact-field qr-color"><span>Vordergrund</span><input aria-label="Vordergrundfarbe" type="color" value={design.foreground} onChange={e=>setDesign({...design,foreground:e.target.value})}/></label><label className="compact-field qr-color"><span>Hintergrund</span><input aria-label="Hintergrundfarbe" type="color" value={design.background} onChange={e=>setDesign({...design,background:e.target.value})}/></label></div>
            <button type="button" className="secondary qr-logo-input" onClick={()=>document.getElementById("qr-logo")?.click()}><ImagePlus size={18} aria-hidden="true"/>Logo wählen <small>(PNG, JPEG, WebP · bis 2 MiB)</small></button>
            {design.logo && <div className="qr-logo-current"><img src={design.logo} alt="Gewähltes Logo" width={36} height={36}/><button className="secondary" aria-label="Logo entfernen" onClick={()=>{logoRequest.current++;setLogoBusy(false);setDesign({...design,logo:""});}}><X size={16}/></button></div>}
            <details className="qr-details"><summary>Rahmen & Beschriftung</summary><label className="compact-field"><span>Beschriftung</span><input value={design.label} maxLength={60} onChange={e=>setDesign({...design,label:e.target.value})}/></label><label className="qr-check"><input type="checkbox" checked={design.frame} onChange={e=>setDesign({...design,frame:e.target.checked})}/>Rahmen anzeigen</label></details>
            <details className="qr-details"><summary>Erweiterte Gestaltung</summary><label className="qr-check"><input type="checkbox" checked={design.rounded} onChange={e=>setDesign({...design,rounded:e.target.checked})}/>Abgerundete Punkte</label><p className="muted qr-hint">Ruhezone und Erkennungsmuster bleiben erhalten. Hohe Fehlerkorrektur; Logos werden bewusst klein gehalten.</p></details>
          </>}
          {step===2 && <>
            <h2>Dein QR-Code ist bereit</h2>
            <div className="share-mode-toggle" role="group" aria-label="Exportformat">{["png","svg"].map(value=><button type="button" key={value} aria-pressed={format===value} onClick={()=>setFormat(value)}>{value.toUpperCase()}</button>)}</div>
            {format==="png" ? <label className="compact-field"><span>Breite</span><select value={size} onChange={e=>setSize(Number(e.target.value))}>{[512,1024,2048,4096].map(n=><option key={n} value={n}>{n} px</option>)}</select></label> : <p className="muted">SVG lässt sich ohne Auflösungsverlust vergrößern.</p>}
            <p className="muted qr-hint">Vor dem Drucken mit dem Smartphone testen. Der QR-Code verweist dauerhaft auf denselben Link; Ablauf und Zugriffsschutz gelten weiterhin.</p>
            <button type="button" className="qr-export" disabled={!result.svg || busy || logoBusy} onClick={()=>void download()}><Download size={18} aria-hidden="true"/>{busy ? "Export wird erstellt …" : "QR-Code exportieren"}</button>
          </>}
        </div>
        <input id="qr-logo" type="file" accept="image/png,image/jpeg,image/webp" className="qr-file" aria-label="Logo hochladen" onChange={async e=>{
          const file=e.target.files?.[0];e.target.value="";if(!file) return;
          const request=++logoRequest.current;setLogoBusy(true);setError("");
          try {const logo=await readQrLogo(file);if(request===logoRequest.current) setDesign(current=>({...current,logo}));}
          catch(e) {if(request===logoRequest.current) setError(e instanceof Error ? e.message : "Logo konnte nicht geladen werden.");}
          finally {if(request===logoRequest.current) setLogoBusy(false);}
        }}/>
        {logoBusy && <p role="status">Logo wird geladen …</p>}
        {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
        <div className="qr-step-actions">{step>0 && <button className="secondary" onClick={()=>move(step-1)}><ChevronLeft size={16} aria-hidden="true"/>Zurück</button>}{step<2 && <button onClick={()=>move(step+1)}>{step===0 ? 'Weiter zur Gestaltung' : 'Weiter zum Export'}<ChevronRight size={16} aria-hidden="true"/></button>}</div>
      </div>
      <aside className="qr-preview" aria-label="QR-Code-Vorschau">
        {result.svg ? <img className="qr-preview-image" src={svgDataUrl(result.svg)} alt="QR-Code des gewählten Links mit aktueller Gestaltung"/> : <div className="qr-preview-empty"><Paintbrush size={32} aria-hidden="true"/><p>{result.error || "Bitte einen Link auswählen."}</p></div>}
        <p className="muted">Vorschau</p>
        {result.error && <p role="alert">{result.error}</p>}
        {invalid && <p role="status">Dieser Link ist deaktiviert oder abgelaufen. Der QR-Code hebt diese Einschränkung nicht auf.</p>}
        {result.url && <div className="qr-url"><code>{result.url}</code><button className="secondary" aria-label="QR-Link kopieren" onClick={()=>{void Promise.resolve().then(()=>navigator.clipboard.writeText(result.url)).then(()=>setNotice("Link kopiert.")).catch(()=>setError("Link konnte nicht kopiert werden."));}}><Copy size={16} aria-hidden="true"/></button></div>}
        <p className="muted qr-hint">Vorschau und Export werden lokal erzeugt. Deine Gestaltung bleibt beim Wechsel der Schritte erhalten.</p>
      </aside>
    </div>}
  </>;
}
