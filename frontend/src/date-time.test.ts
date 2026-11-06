import { expect, it } from "vitest";
import { formatDate, formatTimestamp, parseDateTime, resolvedDateTime } from "./date-time";
it("formats and parses region-specific dates and 12/24-hour times",()=>{
 const value=new Date(2026,10,6,23,45);
 expect(formatDate(value,"de-DE")).toBe("06.11.2026");
 expect(formatDate(value,"en-US")).toBe("11/06/2026");
 expect(formatDate(value,"en-GB")).toBe("06/11/2026");
 for(const [date,locale] of [["06.11.2026","de-DE"],["11/06/2026","en-US"],["06/11/2026","en-GB"]]) {
  expect(parseDateTime(date,"23","45","AM",locale,false)?.getTime()).toBe(value.getTime());
  expect(parseDateTime(date,"11","45","PM",locale,true)?.getTime()).toBe(value.getTime());
 }
 expect(parseDateTime("30.02.2026","12","00","AM","de-DE",false)).toBeNull();
 expect(parseDateTime("06.11.2026","13","00","PM","de-DE",true)).toBeNull();
 expect(parseDateTime("06.11.2026","00","00","AM","de-DE",true)).toBeNull();
 expect(parseDateTime("06.11.2026","12","00","AM","de-DE",true)?.getHours()).toBe(0);
 expect(parseDateTime("06.11.2026","12","00","PM","de-DE",true)?.getHours()).toBe(12);
 expect(resolvedDateTime({region:"auto",timeFormat:"auto"},"en-US").hour12).toBe(true);
 expect(resolvedDateTime({region:"de-DE",timeFormat:"12"},"en-US")).toEqual({locale:"de-DE",hour12:true});
});

it("uses the chosen hour cycle in rendered timestamps",()=>{
 const timestamp="2026-11-06T12:30:00Z";
 expect(formatTimestamp(timestamp,{region:"en-US",timeFormat:"12"},"de-DE")).toMatch(/AM|PM/i);
 expect(formatTimestamp(timestamp,{region:"en-US",timeFormat:"24"},"de-DE")).not.toMatch(/AM|PM/i);
});
