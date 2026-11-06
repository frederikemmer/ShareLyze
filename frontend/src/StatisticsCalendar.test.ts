import { expect, it } from "vitest";
import { calendarActivity } from "./StatisticsCalendar";
it("aggregates hourly and non-chart events into UTC days without including the exclusive end",()=>{
  const activity=calendarActivity({from:"2026-11-01T00:00:00.000Z",to:"2026-11-03T00:00:00.000Z",resolution:"hour",rows:[
    {bucket:"2026-11-01T09:00:00.000Z",type:"view",count:2},
    {bucket:"2026-11-01T23:00:00.000Z",type:"view",count:1},
    {bucket:"2026-11-02T00:00:00.000Z",type:"download_error",count:1},
    {bucket:"2026-11-03T00:00:00.000Z",type:"view",count:5},
  ]});
  expect(activity.get("2026-11-01")).toEqual({view:3});expect(activity.get("2026-11-02")).toEqual({download_error:1});expect(activity.has("2026-11-03")).toBe(false);
});
