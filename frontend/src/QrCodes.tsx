import { SettingsHelp } from "./SettingsHelp";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Copy, Download, ImagePlus, Link2, Paintbrush, X } from "lucide-react";
import type { Campaign } from "../../shared/telemetry";
import { defaultQrDesign, directQrLink, qrLink, qrRaster, qrSvg, readQrLogo, svgDataUrl, type QrCorrection } from "./qr-code";

export type QrLinkOption = { id: string; slug: string; title?: string; active?: number; expires_at?: string|null };
const steps = ["Link", "Gestalten", "Export"];
export function QrCodes({links,origin,onCreateLink,selection}:{links:QrLinkOption[];origin:string;selection?:{slug:string}|null;onCreateLink:(url:string)=>Promise<QrLinkOption>}) {
  const [contextOpen,setContextOpen]=useState(false),[linkMode,setLinkMode]=useState<"existing"|"custom">("existing"),[customUrl,setCustomUrl]=useState(""),[creatingLink,setCreatingLink]=useState(false);
  const [step,setStep]=useState(0), [slug,setSlug]=useState(""), [campaign,setCampaign]=useState<Campaign>({utm_medium:"qr"});
  const [design,setDesign]=useState(defaultQrDesign),[format,setFormat]=useState("png"),[size,setSize]=useState(2048);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[logoBusy,setLogoBusy]=useState(false);
  const logoRequest=useRef(0), customLogo=useRef("");
  useEffect(() => { if (selection) { setSlug(selection.slug); setLinkMode("existing"); setStep(0); } }, [selection]);
  const chosen=links.find(link=>link.slug===slug) ?? links[0];
  const customTarget=useMemo(()=>{try {return directQrLink(customUrl);} catch {return "";}},[customUrl]);
  const result=useMemo(() => {
    if(linkMode==="existing" && (!chosen || !origin) || linkMode==="custom" && !customUrl.trim()) return {url:"",svg:"",error:""};
    try {const url=linkMode==="custom" ? directQrLink(customUrl) : qrLink(origin,chosen!.slug,campaign);return {url,svg:qrSvg(url,design),error:""};}
    catch(e) {return {url:"",svg:"",error:e instanceof Error ? e.message : "QR-Code konnte nicht erstellt werden. Bitte kürze die Angaben."};}
  },[linkMode,customUrl,chosen?.slug,origin,campaign,design]);
  const invalid=linkMode==="existing" && !!chosen && (chosen.active===0 || !!chosen.expires_at && Date.parse(chosen.expires_at)<=Date.now());
  async function createShortLink() {
    if(creatingLink) return;
    let url:string;
    try {url=directQrLink(customUrl);} catch(e) {setError(e instanceof Error ? e.message : "Ungültige Adresse.");return;}
    setCreatingLink(true);setError("");setNotice("");
    try {const link=await onCreateLink(url);setSlug(link.slug);setLinkMode("existing");setNotice("Kurzlink erstellt. Aufrufe werden in ShareLyze erfasst.");}
    catch(e) {setError(e instanceof Error ? e.message : "Kurzlink konnte nicht erstellt werden.");}
    finally {setCreatingLink(false);}
  }
  function move(next:number) {setStep(next);setNotice("");setError("");}
  async function selectLogo() {
    const request=++logoRequest.current;
    setLogoBusy(true);setError("");
    try {
      let logo=customLogo.current;
      if(!logo) {
        const response=await fetch("/logo-qr.png");
        if(!response.ok) throw new Error("ShareLyze-Logo konnte nicht geladen werden.");
        const blob=await response.blob();
        logo=await readQrLogo(new File([blob],"sharelyze.png",{type:"image/png"}));
      }
      if(request===logoRequest.current) setDesign(current=>({...current,logo}));
    } catch(e) {if(request===logoRequest.current) setError(e instanceof Error ? e.message : "Logo konnte nicht geladen werden.");}
    finally {if(request===logoRequest.current) setLogoBusy(false);}
  }
  async function download() {
    if(!result.svg) return;
    setBusy(true);setError("");setNotice("");
    try {
      const blob=format==="svg" ? new Blob([result.svg],{type:"image/svg+xml;charset=utf-8"}) : await qrRaster(result.svg,size,format as "png" | "jpg");
      const url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url;a.download=`sharelyze-${linkMode==="existing" ? chosen!.slug : "qrcode"}.${format}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setNotice("QR-Code exportiert.");
    } catch(e) {setError(e instanceof Error ? e.message : "Export fehlgeschlagen.");} finally {setBusy(false);}
  }
  return <>
    <div className="qr-titlebar"><h1>QR-Codes</h1>{(linkMode==="existing" ? !!chosen : !!customUrl.trim()) && <div className="qr-context"><Link2 size={16} aria-hidden="true"/><span title={linkMode==="custom" ? customUrl : [chosen?.title || '/'+chosen?.slug,campaign.utm_campaign].filter(Boolean).join(' · ')}>{linkMode==="custom" ? customUrl : <>{chosen?.title || '/'+chosen?.slug}{campaign.utm_campaign && <> · {campaign.utm_campaign}</>}</>}</span></div>}</div>
    <div className="qr-workbench">
      <div className="qr-controls">
        <div className="share-mode-toggle qr-steps" role="group" aria-label="QR-Code bearbeiten">
          {steps.map((label,index)=><button key={label} type="button" aria-pressed={step===index} aria-controls="qr-step-panel" onClick={()=>move(index)}><span className="qr-step-number">{index+1}</span>{label}</button>)}
        </div>
        <div id="qr-step-panel" className="qr-panel" aria-label={steps[step]}>
          {step===0 && <>
            <h2>Welchen Link möchtest du teilen?</h2>
            <div className="share-mode-toggle qr-link-mode" role="group" aria-label="Linktyp"><button type="button" aria-pressed={linkMode==="existing"} disabled={creatingLink} onClick={()=>{setLinkMode("existing");setError("");setNotice("");}}>Bestehender Kurzlink</button><button type="button" aria-pressed={linkMode==="custom"} disabled={creatingLink} onClick={()=>{setLinkMode("custom");setError("");setNotice("");}}>Eigener Link</button></div>
            {linkMode==="existing" ? <>
              {chosen ? <label className="compact-field"><span>Kurzlink</span><select value={chosen.slug} onChange={e=>setSlug(e.target.value)}>{links.map(link=><option key={link.id} value={link.slug}>{link.title ? link.title+' · ' : ''}/{link.slug}</option>)}</select></label> : <p className="muted">Noch kein Kurzlink vorhanden. Wähle „Eigener Link“, um eine Adresse zu verwenden.</p>}
            <div className="qr-context-heading"><button type="button" className="qr-context-toggle" aria-expanded={contextOpen} aria-controls="qr-context-fields" onClick={()=>setContextOpen(!contextOpen)}><ChevronRight size={16} aria-hidden="true" className={contextOpen ? "qr-context-chevron open" : "qr-context-chevron"}/><span>Kontext</span></button><SettingsHelp label="Hinweise zum Kontext">Mit Quelle, Medium, Kampagne und Variante kannst du Aufrufe in den Statistiken nach Anlass oder Verbreitungsweg unterscheiden. Die Angaben sind Teil des öffentlichen Links. Medium ist standardmäßig „qr“; ein Aufruf belegt keinen tatsächlichen Scan. Keine vertraulichen Angaben eintragen.</SettingsHelp></div>
            <div id="qr-context-fields" hidden={!contextOpen}>
            <div className="qr-fields">{([["utm_campaign","Kampagne","fotobuch2026"],["utm_source","Quelle","fotobuch"],["utm_medium","Medium","qr"],["utm_content","Variante","buchrueckseite"]] as const).map(([key,label,placeholder])=><label key={key} className="compact-field"><span>{label}</span><input maxLength={100} value={campaign[key] ?? ""} placeholder={placeholder} onChange={e=>setCampaign({...campaign,[key]:e.target.value.replace(/[\u0000-\u001f\u007f]/g,"")})}/></label>)}</div>
            </div></> : <>
              <label className="compact-field"><span>Adresse</span><input type="url" placeholder="https://beispiel.de" value={customUrl} disabled={creatingLink} onChange={e=>{setCustomUrl(e.target.value);setError("");setNotice("");}}/></label>
              <div className="qr-create-shortlink"><p className="muted">Direkte Links werden nicht in ShareLyze gezählt. Für Statistiken kannst du einen Kurzlink erstellen.</p><button type="button" className="secondary" disabled={!customTarget || creatingLink} onClick={()=>void createShortLink()}>{creatingLink ? "Wird erstellt …" : "Kurzlink erstellen"}</button></div>
            </>}
          </>}
          {step===1 && <>
            <h2>Wie soll dein QR-Code aussehen?</h2>
            <div className="qr-presets" role="group" aria-label="Gestaltungsvorlage">{["Klar","Weich","Mit Logo"].map((label,index)=>{
              const selected=index===2 ? !!design.logo : !design.logo && design.rounded===(index===1);
              const sampleDesign={...defaultQrDesign,correction:design.correction,foreground:design.foreground,background:design.background,rounded:index===1 || (index===2 && design.rounded),logoSize:design.logoSize,logo:index===2 ? design.logo : ""};
              let sample: string;
              try { sample=qrSvg(result.url || "https://example.org",sampleDesign); }
              catch { sample=qrSvg("https://example.org",{...defaultQrDesign,rounded:index===1}); }
              return <button type="button" key={label} aria-pressed={selected} onClick={()=>{
                if(index===2) {void selectLogo();return;}
                logoRequest.current++;setLogoBusy(false);setDesign({...design,rounded:index===1,logo:""});
              }}><span className="qr-preset-preview"><img src={svgDataUrl(sample)} alt="" width={52} height={52}/>{index===2 && !design.logo && <img className="qr-preset-example-logo" src="/logo-light-transparent.svg" alt=""/>}</span><span>{label}</span>{selected && <Check size={16} aria-hidden="true"/>}</button>;
            })}</div>
            <h3>Farben & Logo</h3>
            <div className="qr-fields"><label className="compact-field qr-color"><span>Vordergrund</span><input aria-label="Vordergrundfarbe" type="color" value={design.foreground} onChange={e=>setDesign({...design,foreground:e.target.value})}/></label><label className="compact-field qr-color"><span>Hintergrund</span><input aria-label="Hintergrundfarbe" type="color" value={design.background} onChange={e=>setDesign({...design,background:e.target.value})}/></label></div>
            <div className="qr-logo-row"><button type="button" className="secondary qr-logo-input" onClick={()=>document.getElementById("qr-logo")?.click()}>{design.logo ? <img className="qr-logo-thumbnail" src={design.logo} alt="" width={18} height={18}/> : <ImagePlus size={18} aria-hidden="true"/>}Logo wählen <small>(bis 2 MiB)</small></button><SettingsHelp label="Unterstützte Logoformate">Unterstützt werden PNG, JPG/JPEG, WebP, HEIC/HEIF, JPEG XL (JXL) und SVG.</SettingsHelp>{design.logo && <label className="qr-logo-size"><span>Logogröße <output>{design.logoSize} %</output></span><input type="range" min="8" max="18" step="1" value={design.logoSize} onChange={e=>setDesign({...design,logoSize:Number(e.target.value)})}/></label>}</div>
            <details className="qr-details"><summary>Rahmen & Beschriftung</summary><label className="compact-field"><span>Beschriftung</span><input value={design.label} maxLength={60} onChange={e=>setDesign({...design,label:e.target.value})}/></label><label className="qr-check"><input type="checkbox" checked={design.frame} onChange={e=>setDesign({...design,frame:e.target.checked})}/>Rahmen anzeigen</label></details>
            <details className="qr-details"><summary>Erweiterte Gestaltung</summary><div className="qr-correction-row"><label className="compact-field"><span>Fehlerkorrektur</span><select value={design.correction ?? "H"} onChange={e=>setDesign({...design,correction:e.target.value as QrCorrection})}><option value="L">Niedrig (L)</option><option value="M">Mittel (M)</option><option value="Q">Hoch (Q)</option><option value="H">Sehr hoch (H)</option></select></label><SettingsHelp label="Hinweise zur Fehlerkorrektur"><span className="qr-correction-table" role="table" aria-label="Fehlerkorrektur nach Stufe"><span role="row"><strong role="columnheader">Stufe</strong><strong role="columnheader">Wiederherstellbar*</strong></span>{[["L", "ca. 7 %"], ["M", "ca. 15 %"], ["Q", "ca. 25 %"], ["H", "ca. 30 %"]].map(([level, amount]) => <span role="row" key={level}><span role="cell">{level}</span><span role="cell">{amount}</span></span>)}<small>* Anteil der Codewörter</small></span></SettingsHelp></div>{design.logo && (design.correction ?? "H")!=="H" && <p className="muted qr-hint">Mit Logo wird eine sehr hohe Fehlerkorrektur empfohlen. Bitte den QR-Code vor der Verwendung testen.</p>}</details>
          </>}
          {step===2 && <>
            <h2>Dein QR-Code ist bereit</h2>
            <div className="qr-export-options"><div className="share-mode-toggle" role="group" aria-label="Exportformat">{["png","jpg","svg"].map(value=><button type="button" key={value} aria-pressed={format===value} onClick={()=>setFormat(value)}>{value.toUpperCase()}</button>)}</div>
            <label className="compact-field"><span>Breite</span><select value={format==="svg" ? "scalable" : String(size)} disabled={format==="svg"} onChange={e=>setSize(Number(e.target.value))}>{format==="svg" ? <option value="scalable">Beliebig skalierbar</option> : [512,1024,2048,4096].map(n=><option key={n} value={n}>{n} px</option>)}</select></label></div>
            <button type="button" className="qr-export" disabled={!result.svg || busy || logoBusy} onClick={()=>void download()}><Download size={18} aria-hidden="true"/>{busy ? "Export wird erstellt …" : "QR-Code exportieren"}</button>
          </>}
        </div>
        <input id="qr-logo" type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/jxl,image/svg+xml,.png,.jpg,.jpeg,.webp,.heic,.heif,.jxl,.svg" className="qr-file" aria-label="Logo hochladen" onChange={async e=>{
          const file=e.target.files?.[0];e.target.value="";if(!file) return;
          const request=++logoRequest.current;setLogoBusy(true);setError("");
          try {const logo=await readQrLogo(file);if(request===logoRequest.current) {customLogo.current=logo;setDesign(current=>({...current,logo}));}}
          catch(e) {if(request===logoRequest.current) setError(e instanceof Error ? e.message : "Logo konnte nicht geladen werden.");}
          finally {if(request===logoRequest.current) setLogoBusy(false);}
        }}/>
        {logoBusy && <p role="status">Logo wird geladen …</p>}
        {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      </div>
      <aside className="qr-preview" aria-label="QR-Code-Vorschau">
        {result.svg ? <img className="qr-preview-image" src={svgDataUrl(result.svg)} alt="QR-Code des gewählten Links mit aktueller Gestaltung"/> : <div className="qr-preview-empty"><Paintbrush size={32} aria-hidden="true"/><p>{result.error || "Bitte einen Link auswählen."}</p></div>}
        {result.error && <p role="alert">{result.error}</p>}
        {invalid && <p role="status">Dieser Link ist deaktiviert oder abgelaufen. Der QR-Code hebt diese Einschränkung nicht auf.</p>}
        {result.url && <div className="qr-url"><code>{result.url}</code><button type="button" className="share-action qr-copy" title="QR-Link kopieren" aria-label="QR-Link kopieren" onClick={()=>{void Promise.resolve().then(()=>navigator.clipboard.writeText(result.url)).then(()=>setNotice("Link kopiert.")).catch(()=>setError("Link konnte nicht kopiert werden."));}}><Copy size={16} aria-hidden="true"/></button></div>}
      </aside>
    </div>
  </>;
}
