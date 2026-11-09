import { expect, it } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
import { defaultQrDesign, qrLink, qrSvg } from "./qr-code";

it("decodes exported square, rounded and logo/frame QR codes to the complete campaign URL", async () => {
  const logo=await sharp({create:{width:40,height:40,channels:4,background:"#202523"}}).png().toBuffer();
  for(const slug of ["Familienfotos","EinLangerLinkMitGrossbuchstaben2026","Kurz"]) {
    const url=qrLink("https://share.example",slug,slug==="Kurz" ? {} : {utm_source:"Fotobuch & Freunde",utm_medium:"qr",utm_campaign:"Sommer 2026",utm_content:"Buchrückseite"});
    for(const rounded of [false,true]) for(const withLogo of [false,true]) for(const width of [512,1024]) {
      const svg=qrSvg(url,{...defaultQrDesign,rounded,logo:withLogo ? "data:image/png;base64,"+logo.toString("base64") : "",frame:withLogo,label:withLogo ? 'Fotos <Familie> & "Freunde"' : ''});
      const {data,info}=await sharp(Buffer.from(svg)).resize({width}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);
      expect(decoded?.data,`rounded=${rounded},logo=${withLogo},slug=${slug},width=${width}`).toBe(url);
      expect(svg).not.toContain('<Familie>');
    }
  }
},20000);
it("keeps the canonical origin, omits blank/unknown campaigns, and rejects unsafe export inputs",()=>{
  expect(qrLink("https://share.example/old","Fotos",{utm_medium:"qr",utm_campaign:"  "})).toBe("https://share.example/Fotos?utm_medium=qr");
  expect(()=>qrSvg("https://example.org",{...defaultQrDesign,foreground:"#cccccc"})).toThrow(/Kontrast/);
  expect(()=>qrSvg("https://example.org",{...defaultQrDesign,foreground:'" onload="alert(1)'})).toThrow(/Farben/);
  expect(()=>qrSvg("https://example.org",{...defaultQrDesign,logo:"https://external.example/logo.svg"})).toThrow(/Logo/);
  expect(()=>qrLink("javascript:alert(1)","fotos",{})).toThrow();
});

it("embeds the generated ShareLyze logo in a decodable QR export",async()=>{
  const {readFile}=await import("node:fs/promises");
  const logo=await readFile(new URL("../public/logo-qr.png",import.meta.url));
  const url="https://share.example/fotos?utm_medium=qr";
  const svg=qrSvg(url,{...defaultQrDesign,logo:"data:image/png;base64,"+logo.toString("base64")});
  const {data,info}=await sharp(Buffer.from(svg)).resize({width:1024}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  expect(jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data).toBe(url);
  expect(svg).toContain('href="data:image/png;base64,');
});

it("encodes each selected error-correction level in a scannable QR code",async()=>{
  const url="https://share.example/fotos?utm_medium=qr";
  const widths:number[]=[];
  for(const correction of ["L","M","Q","H"] as const) {
    const svg=qrSvg(url,{...defaultQrDesign,correction});
    widths.push(Number(svg.match(/viewBox="0 0 (\d+)/)?.[1]));
    const {data,info}=await sharp(Buffer.from(svg)).resize({width:512}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    expect(jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data).toBe(url);
  }
  expect(new Set(widths).size).toBeGreaterThan(1);
  expect(()=>qrSvg(url,{...defaultQrDesign,correction:"invalid" as never})).toThrow(/Fehlerkorrektur/);
});

it("keeps minimum and maximum logo sizes decodable", async () => {
  const logo=await sharp({create:{width:40,height:40,channels:4,background:"#202523"}}).png().toBuffer();
  for(const logoSize of [8,18]) for(const rounded of [false,true]) {
    const url="https://share.example/fotos?utm_medium=qr&utm_campaign=Familienfotos";
    const svg=qrSvg(url,{...defaultQrDesign,logoSize,rounded,logo:"data:image/png;base64,"+logo.toString("base64")});
    const {data,info}=await sharp(Buffer.from(svg)).resize({width:512}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    expect(jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data).toBe(url);
  }
  expect(()=>qrSvg("https://example.org",{...defaultQrDesign,logoSize:19})).toThrow(/Logogröße/);
});

it("accepts direct HTTP links without changing their query or fragment and rejects other schemes and credentials",async()=>{
  const {directQrLink}=await import("./qr-code");
  expect(directQrLink(" https://example.org/path?token=a%2Bb&x=1#section ")).toBe("https://example.org/path?token=a%2Bb&x=1#section");
  for(const bad of ["", "example.org", "javascript:alert(1)", "https://user:pass@example.org/"]) expect(()=>directQrLink(bad)).toThrow();
});
