import { readCampaign,type ClientContext } from "../../shared/telemetry";

function context(view:ClientContext["view"]):ClientContext {
  return {view,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",utcOffsetMinutes:new Date().getTimezoneOffset(),touchPoints:typeof navigator.maxTouchPoints==="number" ? Math.min(64,Math.max(0,navigator.maxTouchPoints)) : null,colorScheme:matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"};
}
export function publicCampaignQuery() {return new URLSearchParams(readCampaign(Object.fromEntries(new URLSearchParams(location.search)))).toString();}
const observedResources=new Set<string>();
let navigationReported=false;
type Sender=(body:Record<string,unknown>)=>void;
let resourceError:((url:string)=>void)|undefined;
export function reportPublicResourceError(url:string) {resourceError?.(url);}
export function startPublicTelemetry(slug:string,token:string,getView:()=>ClientContext["view"]) {
  const base="/api/public/"+encodeURIComponent(slug),controller=new AbortController();
  let reports=0,stopped=false;
  const send:Sender=body => {
    if(stopped || reports>=150) return;
    reports++;
    void fetch(base+"/telemetry",{method:"POST",headers:{"Content-Type":"application/json","X-ShareLyze-Visit":token},body:JSON.stringify({...body,client:context(getView())}),signal:controller.signal,keepalive:true}).catch(() => {});
  };
  const resource=(url:string) => {
    try {
      const parsed=new URL(url,location.href);
      if(parsed.origin!==location.origin || (parsed.pathname!==base && !parsed.pathname.startsWith(base+"/"))) return;
      const suffix=parsed.pathname.slice(base.length), match=suffix.match(/^\/items\/([^/]+)\/(preview|view|download)$/);
      if(match) return {resource:match[2]==="preview" ? "preview" : match[2]==="view" ? "media" : "download",itemId:decodeURIComponent(match[1]),path:parsed.searchParams.get("path") || ""};
      if(!suffix.includes("telemetry") && !suffix.endsWith("zip")) return {resource:"api"};
    } catch {}
  };
  send({kind:"context"});
  const scheme=matchMedia("(prefers-color-scheme: dark)");
  const changed=() => send({kind:"context"});
  scheme.addEventListener("change",changed);
  const onError=(url:string) => {const item=resource(url);if(item && item.resource!=="api") send({kind:"resource_error",...item});};
  resourceError=onError;
  let navigationSent=false;
  const navigation=() => {
    if(navigationSent || navigationReported) return;
    const entry=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming|undefined;
    if(!entry || !entry.loadEventEnd) return;
    navigationSent=true;navigationReported=true;
    send({kind:"navigation",timing:{durationMs:entry.loadEventEnd-entry.startTime,...(entry.responseStart>0 ? {ttfbMs:Math.max(0,entry.responseStart-entry.startTime)} : {}),domReadyMs:Math.max(0,entry.domContentLoadedEventEnd-entry.startTime),status:entry.responseStatus || 0,transferBytes:entry.transferSize}});
  };
  const load=() => {setTimeout(navigation,0);};
  window.addEventListener("load",load);
  const timer=setTimeout(navigation,0);
  let observer:PerformanceObserver|undefined;
  if(typeof PerformanceObserver!=="undefined") {
    try {
      observer=new PerformanceObserver(list => {
        for(const item of list.getEntries() as PerformanceResourceTiming[]) {
          const info=resource(item.name),key=item.name+":"+item.startTime;
          if(!info || info.resource==="download" || observedResources.has(key)) continue;
          if(observedResources.size>=500) continue;
          observedResources.add(key);
          send({kind:"resource",...info,timing:{durationMs:item.duration,...(item.responseStart>0 ? {ttfbMs:Math.max(0,item.responseStart-item.startTime)} : {}),status:item.responseStatus || 0,transferBytes:item.transferSize}});
        }
      });
      observer.observe({type:"resource",buffered:true});
    } catch {}
  }
  return {
    viewChanged() {send({kind:"view_change"});},
    stop() {stopped=true;controller.abort();observer?.disconnect();clearTimeout(timer);window.removeEventListener("load",load);scheme.removeEventListener("change",changed);if(resourceError===onError) resourceError=undefined;},
  };
}
export function withPublicVisit(url:string,token?:string) {return token ? url+(url.includes("?") ? "&" : "?")+"visit="+encodeURIComponent(token) : url;}
