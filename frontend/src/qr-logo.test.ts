// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { readQrLogo, safeLogoSvg } from "./qr-code";

it("accepts a ShareLyze SVG with internal mask and rejects active or externally linked SVG content", () => {
  const svg=readFileSync("frontend/public/logo-light-transparent.svg","utf8");
  expect(safeLogoSvg(svg)).toContain('url(#gap)');
  const unsafe=[
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"/>',
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/test.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://evil.example/test)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://evil.example/"><use href="#x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>',
  ];
  for(const input of unsafe) expect(()=>safeLogoSvg(input), input).toThrow();
});
it("rejects oversized and unsupported files before decoding",async()=>{
  await expect(readQrLogo(new File([new Uint8Array(2*1024*1024+1)],"large.jxl",{type:"image/jxl"}))).rejects.toThrow(/2 MiB/);
  await expect(readQrLogo(new File(["hi"],"logo.pdf",{type:"application/pdf"}))).rejects.toThrow(/nicht unterstützt/);
});
