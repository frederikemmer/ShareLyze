export type Campaign = Partial<Record<"utm_source"|"utm_medium"|"utm_campaign"|"utm_content"|"utm_term",string>>;
export const campaignKeys=["utm_source","utm_medium","utm_campaign","utm_content","utm_term"] as const;
export function readCampaign(query:Record<string,unknown>):Campaign {
  return Object.fromEntries(campaignKeys.flatMap(key => {
    const value=query[key];
    return typeof value==="string" && value.length<=100 && !/[\u0000-\u001f\u007f]/.test(value) ? [[key,value.trim()]].filter(([,text]) => !!text) : [];
  }));
}
export function campaignQuery(query:Record<string,unknown>) {const params=new URLSearchParams(readCampaign(query));return params.size ? "?"+params.toString() : "";}
export type ClientContext={timeZone:string;utcOffsetMinutes:number;touchPoints:number|null;colorScheme:"light"|"dark";view:"grid"|"list"|"compact"};
export type TransferMetrics={id:string;retryOf:string|null;kind:"download"|"zip"|"preview"|"media";outcome:"started"|"completed"|"aborted"|"failed";bytes:number;expectedBytes:number|null;durationMs:number;bytesPerSecond:number;status:number;rangeRequested:boolean;rangeAccepted:boolean;rangeFallback:string|null;resumeAttempt:boolean;fileType:string};
export type Diagnostic={systemCode?:string;code:string;observed:string;possibleReasons:string[]};
export type QualityMetrics={origin:"server"|"browser";resource:"navigation"|"api"|"preview"|"media"|"download"|"zip";durationMs:number;ttfbMs?:number;domReadyMs?:number;status:number;transferBytes?:number;fileType?:string};
export function fileType(path:string) {return path.split("/").at(-1)?.match(/\.([a-z0-9]{1,10})$/i)?.[1].toLowerCase() || "unknown";}
export function validateClientContext(input:any):ClientContext {
  if(!input || typeof input.timeZone!=="string" || input.timeZone.length>64 || !Number.isInteger(input.utcOffsetMinutes) || Math.abs(input.utcOffsetMinutes)>840 || (input.touchPoints!==null && (!Number.isInteger(input.touchPoints) || input.touchPoints<0 || input.touchPoints>64)) || !["light","dark"].includes(input.colorScheme) || !["grid","list","compact"].includes(input.view)) throw new Error("Invalid context");
  new Intl.DateTimeFormat("en",{timeZone:input.timeZone});
  return {timeZone:input.timeZone,utcOffsetMinutes:input.utcOffsetMinutes,touchPoints:input.touchPoints,colorScheme:input.colorScheme,view:input.view};
}
