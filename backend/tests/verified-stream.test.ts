import { expect,it } from "vitest";
import { once } from "node:events";
import { verifiedTail } from "../src/verified-stream";

it("withholds the final bytes until source verification, including a one-chunk Content-Length body", async () => {
  for(const chunks of [["whole file"],["first ","last"]]) {
    let verified=false;
    const stream=verifiedTail(()=>{verified=true;});
    const received:Buffer[]=[];
    stream.on("data",chunk=>{if(Buffer.concat(received).length+chunk.length===chunks.join("").length) expect(verified).toBe(true);received.push(chunk);});
    for(const chunk of chunks) stream.write(Buffer.from(chunk));
    expect(Buffer.concat(received).toString()).toBe(chunks.slice(0,-1).join(""));
    expect(verified).toBe(false);
    const done=once(stream,"end");stream.end();await done;
    expect(Buffer.concat(received).toString()).toBe(chunks.join(""));
  }
});
it("discards the tail when the source changes and verifies empty files",async()=>{
  const stream=verifiedTail(()=>{throw new Error("Source changed");}),received:Buffer[]=[];
  stream.on("data",chunk=>received.push(chunk));
  const failure=once(stream,"error");stream.end(Buffer.from("all bytes"));
  expect((await failure)[0].message).toBe("Source changed");
  expect(Buffer.concat(received).length).toBe(0);
  let verified=false;const empty=verifiedTail(()=>{verified=true;});empty.resume();const end=once(empty,"end");empty.end();await end;expect(verified).toBe(true);
});
