import QRCode from "qrcode";
import { campaignQuery, type Campaign } from "../../shared/telemetry";

export type QrCorrection = "L" | "M" | "Q" | "H";
export type QrDesign = { correction: QrCorrection; foreground: string; background: string; rounded: boolean; label: string; frame: boolean; logo: string; logoSize: number };
export const defaultQrDesign: QrDesign = { correction: "H", foreground: "#000000", background: "#ffffff", rounded: false, label: "", frame: false, logo: "", logoSize: 12 };
const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[char]!));
export function qrLink(origin: string, slug: string, campaign: Campaign) {
  const url = new URL("/" + encodeURIComponent(slug), origin);
  if(!["http:","https:"].includes(url.protocol)) throw new Error("Ungültige öffentliche Linkadresse.");
  url.search = campaignQuery(campaign).slice(1);
  return url.toString();
}
export function directQrLink(value: string): string {
  let url: URL;
  try {url=new URL(value.trim());} catch {throw new Error("Bitte eine vollständige HTTP- oder HTTPS-Adresse eingeben.");}
  if(!["http:","https:"].includes(url.protocol) || url.username || url.password) throw new Error("Bitte eine HTTP- oder HTTPS-Adresse ohne Zugangsdaten eingeben.");
  return url.href;
}
function luminance(hex: string) {
  const rgb = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16)/255).map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
  return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722;
}
export function qrSvg(url: string, design: QrDesign): string {
  if(!/^#[a-f0-9]{6}$/i.test(design.foreground) || !/^#[a-f0-9]{6}$/i.test(design.background)) throw new Error("Bitte gültige Farben wählen.");
  const dark = luminance(design.foreground), light = luminance(design.background);
  if((light+.05)/(dark+.05) < 4.5) throw new Error("Bitte dunklere QR-Punkte oder einen helleren Hintergrund wählen (Kontrast mindestens 4,5:1).");
  if(design.logo && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(design.logo)) throw new Error("Ungültiges Logo.");
  if (!Number.isFinite(design.logoSize) || design.logoSize < 8 || design.logoSize > 18) throw new Error("Ungültige Logogröße.");
  const correction = design.correction ?? "H";
  if(!["L","M","Q","H"].includes(correction)) throw new Error("Ungültige Fehlerkorrektur.");
  let matrix: ReturnType<typeof QRCode.create>["modules"];
  try {matrix=QRCode.create(url,{errorCorrectionLevel:correction}).modules;}
  catch {throw new Error("Der Link ist zu lang für einen QR-Code. Bitte kürze die Kampagnenangaben.");}
  const n = matrix.size, margin = design.frame ? 5 : 4, width = n+margin*2, caption = design.label.trim().slice(0,60), height = width+(caption ? 8 : 0);
  // One filled path avoids antialiasing seams between neighbouring modules.
  // Round only exposed corners; functional modules keep their square geometry.
  const paths: string[] = [];
  const darkAt = (row: number, col: number) => row >= 0 && col >= 0 && row < n && col < n && !!matrix.get(row, col);
  for(let row=0;row<n;row++) for(let col=0;col<n;col++) if(darkAt(row,col)) {
    const x=col+margin, y=row+margin, radius=design.rounded && !matrix.isReserved(row,col) ? 0.4 : 0;
    const tl=!darkAt(row-1,col) && !darkAt(row,col-1) ? radius : 0;
    const tr=!darkAt(row-1,col) && !darkAt(row,col+1) ? radius : 0;
    const br=!darkAt(row+1,col) && !darkAt(row,col+1) ? radius : 0;
    const bl=!darkAt(row+1,col) && !darkAt(row,col-1) ? radius : 0;
    paths.push(`M${x+tl} ${y}H${x+1-tr}${tr ? `Q${x+1} ${y} ${x+1} ${y+tr}` : ""}V${y+1-br}${br ? `Q${x+1} ${y+1} ${x+1-br} ${y+1}` : ""}H${x+bl}${bl ? `Q${x} ${y+1} ${x} ${y+1-bl}` : ""}V${y+tl}${tl ? `Q${x} ${y} ${x+tl} ${y}` : ""}Z`);
  }
  const cells = `<path d="${paths.join(" ")}"/>`;
  // Keep four clear modules around the symbol; the frame gets an additional module of spacing.
  // Functional modules retain square geometry; the bounded logo may cover the symbol center.
  // The small logo is superimposed; error correction can help compensate for the covered area.
  const logoSize = n*design.logoSize/100, logoX = (width-logoSize)/2;
  const logo = design.logo ? `<rect x="${logoX-.5}" y="${logoX-.5}" width="${logoSize+1}" height="${logoSize+1}" fill="${design.background}"/><image href="${design.logo}" x="${logoX}" y="${logoX}" width="${logoSize}" height="${logoSize}"/>` : "";
  const label = caption ? `<text x="${width/2}" y="${width+3}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="${Math.min(3.3,(width-8)/(caption.length*.65))}" fill="${design.foreground}">${escapeXml(caption)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width*16}" height="${height*16}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${design.background}"/><g fill="${design.foreground}">${cells}</g>${logo}${label}${design.frame ? `<rect x="0.5" y="0.5" width="${width-1}" height="${height-1}" rx="1.5" fill="none" stroke="${design.foreground}" stroke-width="0.25"/>` : ''}</svg>`;
}
export const svgDataUrl = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
export async function qrRaster(svg: string, width: number, format: "png" | "jpg"): Promise<Blob> {
  if(![512,1024,2048,4096].includes(width)) throw new Error("Ungültige Exportgröße.");
  const image = new Image();
  image.src = svgDataUrl(svg);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = Math.round(width*image.naturalHeight/image.naturalWidth);
  canvas.getContext("2d")!.drawImage(image,0,0,canvas.width,canvas.height);
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  return new Promise((resolve,reject) => canvas.toBlob(blob => blob && blob.type === mime ? resolve(blob) : reject(new Error(`${format.toUpperCase()} konnte nicht erstellt werden.`)),mime,format === "jpg" ? 0.95 : undefined));
}
/** Reject active content, external references and CSS escape tricks before rasterizing SVG. */
export function safeLogoSvg(text: string): string {
  const clean=text.replace(/^\uFEFF/,"").replace(/^\s*<\?xml\s[^?]*\?>/i,"");
  if(/<!|<\?|@import|\\/i.test(clean)) throw new Error("SVG enthält nicht unterstützte Inhalte.");
  const doc=new DOMParser().parseFromString(clean,"image/svg+xml"), root=doc.documentElement;
  if(root.localName!=="svg" || root.namespaceURI!=="http://www.w3.org/2000/svg" || doc.querySelector("parsererror")) throw new Error("Ungültige SVG-Datei.");
  const denied=new Set(["script","style","foreignobject","iframe","object","embed","image","audio","video","animate","animatemotion","animatetransform","set"]);
  for(const el of [root,...Array.from(root.querySelectorAll("*"))]) {
    if(el.namespaceURI!=="http://www.w3.org/2000/svg" || denied.has(el.localName.toLowerCase())) throw new Error("SVG enthält nicht unterstützte Inhalte.");
    for(const attr of Array.from(el.attributes)) {
      const name=attr.name.toLowerCase().split(":").pop()!, value=attr.value.trim();
      if(name==="base" || name.startsWith("on") || ((name==="href" || name==="src") && !/^#[\w.-]+$/.test(value)) || /@import|expression\s*\(/i.test(value)) throw new Error("SVG enthält nicht unterstützte Inhalte.");
      for(const match of value.matchAll(/url\s*\(([^)]*)\)/gi)) if(!/^\s*['"]?#[\w.-]+['"]?\s*$/.test(match[1])) throw new Error("SVG enthält externe Verweise.");
      if(/url\s*\(/i.test(value.replace(/url\s*\(([^)]*)\)/gi,""))) throw new Error("SVG enthält ungültige Verweise.");
    }
  }
  return new XMLSerializer().serializeToString(root);
}
let jxlDecoder: Promise<typeof import("@jsquash/jxl/decode.js")> | undefined;
async function decodeJxl(file: File): Promise<ImageData> {
  jxlDecoder ??= (async () => {
    const [decoder, asset]=await Promise.all([import("@jsquash/jxl/decode.js"),import("@jsquash/jxl/codec/dec/jxl_dec.wasm?url")]);
    const response=await fetch(asset.default);
    if(!response.ok) throw new Error("JPEG-XL-Decoder konnte nicht geladen werden.");
    await decoder.init({wasmBinary:await response.arrayBuffer()});
    return decoder;
  })();
  try {return await (await jxlDecoder).default(await file.arrayBuffer());}
  catch {jxlDecoder=undefined;throw new Error("JPEG-XL-Datei konnte nicht gelesen werden.");}
}
export async function readQrLogo(file: File): Promise<string> {
  if(file.size>2*1024*1024 || file.size===0) throw new Error("Das Logo darf höchstens 2 MiB groß sein.");
  const name=file.name.toLowerCase();
  const svg=file.type==="image/svg+xml" || name.endsWith(".svg");
  const heic=["image/heic","image/heif"].includes(file.type) || /\.hei[cf]$/.test(name);
  const jxl=file.type==="image/jxl" || name.endsWith(".jxl");
  if(!svg && !heic && !jxl && !["image/png","image/jpeg","image/webp"].includes(file.type)) throw new Error("Dieses Logoformat wird nicht unterstützt.");
  if(jxl) {
    const pixels=await decodeJxl(file);
    if(pixels.width>4096 || pixels.height>4096 || !pixels.width || !pixels.height) throw new Error("Das Logo darf höchstens 4096 × 4096 Pixel groß sein.");
    const source=document.createElement("canvas");source.width=pixels.width;source.height=pixels.height;source.getContext("2d")!.putImageData(pixels,0,0);
    const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;
    const scale=Math.min(256/pixels.width,256/pixels.height),w=pixels.width*scale,h=pixels.height*scale;
    canvas.getContext("2d")!.drawImage(source,(256-w)/2,(256-h)/2,w,h);
    return canvas.toDataURL("image/png");
  }
  let data: Blob=file;
  if(svg) data=new Blob([safeLogoSvg(await file.text())],{type:"image/svg+xml"});
  if(heic) {
    try {const {heicTo}=await import("heic-to/csp");data=await heicTo({blob:file,type:"image/png"});}
    catch {throw new Error("HEIC-Datei konnte nicht gelesen werden.");}
  }
  const url = URL.createObjectURL(data), image = new Image();
  try {
    image.src=url;
    try {await image.decode();} catch {throw new Error("Das Logo konnte nicht als Bild gelesen werden.");}
    if(!image.naturalWidth || !image.naturalHeight || image.naturalWidth>4096 || image.naturalHeight>4096) throw new Error("Das Logo darf höchstens 4096 × 4096 Pixel groß sein.");
    const canvas=document.createElement("canvas"); canvas.width=256;canvas.height=256;
    const scale=Math.min(256/image.naturalWidth,256/image.naturalHeight), w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    canvas.getContext("2d")!.drawImage(image,(256-w)/2,(256-h)/2,w,h);
    return canvas.toDataURL("image/png");
  } finally {URL.revokeObjectURL(url);}
}
