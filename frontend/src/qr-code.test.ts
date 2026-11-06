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
