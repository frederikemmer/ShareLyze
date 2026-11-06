import QRCode from "qrcode";
import { campaignQuery, type Campaign } from "../../shared/telemetry";

export type QrDesign = { foreground: string; background: string; rounded: boolean; label: string; frame: boolean; logo: string };
export const defaultQrDesign: QrDesign = { foreground: "#000000", background: "#ffffff", rounded: false, label: "", frame: false, logo: "" };
const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[char]!));
export function qrLink(origin: string, slug: string, campaign: Campaign) {
  const url = new URL("/" + encodeURIComponent(slug), origin);
  if(!["http:","https:"].includes(url.protocol)) throw new Error("Ungültige öffentliche Linkadresse.");
  url.search = campaignQuery(campaign).slice(1);
  return url.toString();
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
  let matrix: ReturnType<typeof QRCode.create>["modules"];
  try {matrix=QRCode.create(url,{errorCorrectionLevel:"H"}).modules;}
  catch {throw new Error("Der Link ist zu lang für einen QR-Code. Bitte kürze die Kampagnenangaben.");}
  const n = matrix.size, margin = design.frame ? 5 : 4, width = n+margin*2, caption = design.label.trim().slice(0,60), height = width+(caption ? 8 : 0);
  let cells = "";
  for(let row=0;row<n;row++) for(let col=0;col<n;col++) if(matrix.get(row,col)) {
    cells += `<rect x="${col+margin}" y="${row+margin}" width="1" height="1"${design.rounded && !matrix.isReserved(row,col) ? ' rx="0.22"' : ' shape-rendering="crispEdges"'}/>`;
  }
  // Keep four clear modules around the symbol; the frame gets an additional module of spacing.
  // Functional modules retain square geometry; the bounded logo may cover the symbol center.
  // The small logo is superimposed; high error correction supports the bounded covered area.
  const logoSize = n*.12, logoX = (width-logoSize)/2;
  const logo = design.logo ? `<rect x="${logoX-.5}" y="${logoX-.5}" width="${logoSize+1}" height="${logoSize+1}" fill="${design.background}"/><image href="${design.logo}" x="${logoX}" y="${logoX}" width="${logoSize}" height="${logoSize}"/>` : "";
  const label = caption ? `<text x="${width/2}" y="${width+3}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="${Math.min(3.3,(width-8)/(caption.length*.65))}" fill="${design.foreground}">${escapeXml(caption)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width*16}" height="${height*16}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${design.background}"/><g fill="${design.foreground}">${cells}</g>${logo}${label}${design.frame ? `<rect x="0.5" y="0.5" width="${width-1}" height="${height-1}" rx="1.5" fill="none" stroke="${design.foreground}" stroke-width="0.25"/>` : ''}</svg>`;
}
export const svgDataUrl = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
export async function qrPng(svg: string, width: number): Promise<Blob> {
  if(![512,1024,2048,4096].includes(width)) throw new Error("Ungültige Exportgröße.");
  const image = new Image();
  image.src = svgDataUrl(svg);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = Math.round(width*image.naturalHeight/image.naturalWidth);
  canvas.getContext("2d")!.drawImage(image,0,0,canvas.width,canvas.height);
  return new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG konnte nicht erstellt werden.")),"image/png"));
}
export async function readQrLogo(file: File): Promise<string> {
  if(!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>2*1024*1024) throw new Error("Bitte PNG, JPEG oder WebP bis 2 MiB wählen.");
  const url = URL.createObjectURL(file), image = new Image();
  try {
    image.src=url; await image.decode();
    if(image.naturalWidth>4096 || image.naturalHeight>4096) throw new Error("Das Logo darf höchstens 4096 × 4096 Pixel groß sein.");
    const canvas=document.createElement("canvas"); canvas.width=256;canvas.height=256;
    const scale=Math.min(256/image.naturalWidth,256/image.naturalHeight), w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    canvas.getContext("2d")!.drawImage(image,(256-w)/2,(256-h)/2,w,h);
    return canvas.toDataURL("image/png");
  } finally {URL.revokeObjectURL(url);}
}
