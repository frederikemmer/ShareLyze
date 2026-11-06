import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const image = process.argv[2] || "sharelyze-storage-check";
const docker = args => execFileSync("docker",args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
const origin="http://localhost:3000", setupToken="isolated-storage-test-token-123456789";
for (const split of [false,true]) {
  const root=mkdtempSync(join(tmpdir(),"sharelyze-layout-smoke-"));
  const name="sharelyze-layout-"+Date.now();
  const picture='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>';
  let cookie="";
  try {
    const photos=join(root,"photos");mkdirSync(photos);writeFileSync(join(photos,"test.svg"),picture);
    const mounts=[];
    for(const area of split ? ["config","database","uploads","previews"] : ["data"]) {
      const path=join(root,area);mkdirSync(path);
      mounts.push("--mount",`type=bind,src=${path},dst=${split ? "/data/"+area : "/data"}`);
    }
    mounts.push("--mount",`type=bind,src=${photos},dst=/sources/Fotos,readonly`);
    docker(["run","-d","--name",name,"-p","127.0.0.1::3000","-e","PUBLIC_ORIGIN="+origin,"-e","SETUP_TOKEN="+setupToken,"-e","PUID=1234","-e","PGID=1234",...mounts,image]);
    const port=docker(["port",name,"3000/tcp"]).split(":").at(-1);
    let base="http://127.0.0.1:"+port;
    async function api(path,method="GET",body) {
      const response=await fetch(base+path,{method,headers:{"Origin":origin,"Content-Type":"application/json",...(cookie ? {Cookie:cookie} : {})},...(body ? {body:JSON.stringify(body)} : {})});
      return response;
    }
    for(let i=0;i<100;i++) {
      try {const response=await api("/api/auth/status");if(response.status<500) break;} catch {}
      if(i===99) throw new Error("Container did not start: "+docker(["logs",name]));
      await new Promise(resolve => setTimeout(resolve,100));
    }
    let response=await api("/api/auth/setup","POST",{username:"admin",password:"isolated long test password",setupToken});
    assert.equal(response.status,201);
    cookie=response.headers.get("set-cookie").split(";")[0];
    const sources=(await (await api("/api/sources")).json()).sources;
    const source=sources.find(source => source.name==="Fotos");assert.ok(source);
    response=await api("/api/shares","POST",{slug:"test-photos",items:[{sourceId:source.id,path:"test.svg",kind:"file"}]});
    assert.equal(response.status,201);const share=await response.json();
    const page=await (await api("/api/public/test-photos")).json(), item=page.items[0];
    response=await api(`/api/public/test-photos/items/${item.id}/preview`);
    assert.equal(response.status,200);assert.match(response.headers.get("content-type"),/image\/jpeg/);
    assert.ok((await response.arrayBuffer()).byteLength>0);
    response=await api("/api/uploads","POST",{});assert.equal(response.status,201);
    const batch=await response.json();
    response=await fetch(base+`/api/uploads/${batch.id}?path=hello.txt`,{method:"PUT",headers:{Origin:origin,Cookie:cookie,"Content-Type":"application/octet-stream"},body:"hello"});
    assert.equal(response.status,201);
    response=await api("/api/shares/"+share.id,"DELETE");assert.equal(response.status,200);
    assert.equal((await api("/api/public/test-photos")).status,404);
    const analytics=await (await api("/api/analytics")).json();
    assert.ok(analytics.links.some(link => link.slug==="test-photos"));
    assert.equal(readFileSync(join(photos,"test.svg"),"utf8"),picture);
    const data=split ? root : join(root,"data");
    for(const path of ["config/link-password.key","database/sharelyze.db",`uploads/${batch.id}/hello.txt`,"previews"]) assert.ok(existsSync(join(data,path)),path);
    const uid=docker(["exec",name,"stat","-c","%u:%g","/data/config","/data/database","/data/uploads","/data/previews"]);
    assert.ok(uid.split("\n").every(line => line==="1234:1234"));
    docker(["restart",name]);
    base="http://127.0.0.1:"+docker(["port",name,"3000/tcp"]).split(":").at(-1);
    for(let i=0;i<100;i++) {
      try {response=await api("/api/sources");if(response.status===200) break;} catch {}
      await new Promise(resolve => setTimeout(resolve,100));
    }
    assert.equal(response.status,200);
    const afterRestart=await response.json();
    assert.ok(afterRestart.sources?.some(s => s.id===source.id),JSON.stringify(afterRestart)+" logs: "+docker(["logs",name]));
    console.log(`PASS: ${split ? "separate mounts" : "single data mount"}; source discovery, UID/GID, upload, SVG cache, deletion, analytics and restart`);
  } finally {
    try {docker(["rm","-f",name]);} catch {}
    rmSync(root,{recursive:true,force:true});
  }
}
