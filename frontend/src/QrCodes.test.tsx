// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { QrCodes, type QrLinkOption } from "./QrCodes";

it("works with an empty list, keeps a direct URL unchanged, and creates a short link only on request",async()=>{
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
  const create=vi.fn(async(url:string)=>({id:"new",slug:"new-link",target_url:url}));
  function Fixture() {
    const [links,setLinks]=useState<QrLinkOption[]>([]);
    return <QrCodes links={links} origin="https://share.example" onCreateLink={async url=>{const created=await create(url);setLinks(current=>[created,...current]);return created;}}/>;
  }
  const container=document.createElement("div");document.body.append(container);const root=createRoot(container);
  try {
    await act(async()=>root.render(<Fixture/>));
    expect(container.textContent).toContain("Noch kein Kurzlink vorhanden");
    const custom=Array.from(container.querySelectorAll('button')).find(b=>b.textContent==='Eigener Link')!;
    await act(async()=>custom.click());
    const input=container.querySelector('input[type=url]') as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
    await act(async()=>{setter.call(input,'https://example.org/path?token=a%2Bb#part');input.dispatchEvent(new Event('input',{bubbles:true}));});
    expect(container.querySelector('.qr-url code')?.textContent).toBe('https://example.org/path?token=a%2Bb#part');
    expect(create).not.toHaveBeenCalled();
    const button=Array.from(container.querySelectorAll('button')).find(b=>b.textContent==='Kurzlink erstellen')!;
    await act(async()=>button.click());
    expect(create).toHaveBeenCalledOnce();expect(create).toHaveBeenCalledWith('https://example.org/path?token=a%2Bb#part');
    expect(container.querySelector('.qr-url code')?.textContent).toBe('https://share.example/new-link?utm_medium=qr');
    expect(container.textContent).toContain('Kurzlink erstellt');
  } finally {await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();}
});

it("allows shortening a valid address even when it is too long for a direct QR code, while rejecting unsafe schemes",async()=>{
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
  const create=vi.fn(async()=>({id:"new",slug:"new"}));
  const container=document.createElement("div");document.body.append(container);const root=createRoot(container);
  try {
    await act(async()=>root.render(<QrCodes links={[]} origin="https://share.example" onCreateLink={create}/>));
    await act(async()=>Array.from(container.querySelectorAll('button')).find(b=>b.textContent==='Eigener Link')!.click());
    const input=container.querySelector('input[type=url]') as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
    async function enter(value:string) {await act(async()=>{setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
    await enter('javascript:alert(1)');
    const button=Array.from(container.querySelectorAll('button')).find(b=>b.textContent==='Kurzlink erstellen')!;
    expect(button.disabled).toBe(true);expect(create).not.toHaveBeenCalled();
    await enter('https://example.org/?q='+('a'.repeat(2500)));
    expect(container.textContent).toContain('zu lang für einen QR-Code');expect(button.disabled).toBe(false);
  } finally {await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();}
});
