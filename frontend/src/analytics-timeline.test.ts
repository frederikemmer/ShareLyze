import { expect, it } from "vitest";
import { timelinePoints } from "../../shared/analytics-timeline";
it("fills quiet days without inventing events and accumulates each metric independently",()=>{
  const points=timelinePoints({from:"2026-11-01T00:00:00.000Z",to:"2026-11-05T00:00:00.000Z",resolution:"day",rows:[{bucket:"2026-11-01T00:00:00.000Z",type:"view",count:2},{bucket:"2026-11-03T00:00:00.000Z",type:"view",count:1},{bucket:"2026-11-03T00:00:00.000Z",type:"download_start",count:1}]});
  expect(points).toHaveLength(4);expect(points[1].counts).toEqual({});expect(points[1].cumulative).toEqual({view:2});expect(points[3].cumulative).toEqual({view:3,download_start:1});
});
it("includes hourly boundary values once and bounds malformed input",()=>{
  const points=timelinePoints({from:"2026-11-01T00:00:00.000Z",to:"2026-11-02T00:00:00.000Z",resolution:"hour",rows:[{bucket:"2026-11-01T23:00:00.000Z",type:"transfer_finished",count:1}]});
  expect(points).toHaveLength(24);expect(points[22].cumulative).toEqual({});expect(points[23].cumulative.transfer_finished).toBe(1);
  expect(timelinePoints({from:"invalid",to:"invalid",resolution:"day",rows:[]})).toEqual([]);
});
