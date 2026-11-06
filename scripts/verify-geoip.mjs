// Uses small public MaxMind test fixtures, not real visitor data or production config.
// https://github.com/maxmind/MaxMind-DB/tree/main/test-data
// Run: node --import tsx scripts/verify-geoip.mjs
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { GeoIpService } from "../backend/src/geoip.ts";
const root=await mkdtemp(join(tmpdir(),"sharelyze-geoip-"));
try {
  for(const [kind,filename] of [["city","GeoIP2-City-Test.mmdb"],["asn","GeoLite2-ASN-Test.mmdb"]]) {
    const response=await fetch("https://raw.githubusercontent.com/maxmind/MaxMind-DB/main/test-data/"+filename,{signal:AbortSignal.timeout(30000)});
    assert.ok(response.ok);
    await writeFile(join(root,kind+".mmdb"),Buffer.from(await response.arrayBuffer()));
  }
  const service=new GeoIpService(root);
  await service.load();
  assert.ok(service.status.cityReady && service.status.asnReady,JSON.stringify(service.status));
  const city=service.lookup("81.2.69.142");
  assert.equal(city.status,"found");
  assert.equal(city.countryCode,"GB");
  assert.ok(city.city && city.latitude!=null);
  const asn=service.lookup("1.0.0.1");
  assert.ok(asn.asn!=null);
  assert.equal(service.lookup("192.168.1.1").status,"non_public_ip");
  console.log("PASS: real MMDB decoding for city, coordinates, ASN and private-IP exclusion");
  let calls=0;
  const fakeDownload=async url => {
    const parsed=new URL(url);
    assert.equal(parsed.hostname,"download.db-ip.com");
    assert.equal(parsed.search,""); // No visitor IP sent to the database host.
    calls++;
    const kind=parsed.pathname.includes("-city-") ? "city" : "asn";
    return new Response(gzipSync(await readFile(join(root,kind+".mmdb"))));
  };
  await service.update(fakeDownload);
  assert.equal(calls,2);
  assert.equal(service.status.error,"");
  const restarted=new GeoIpService(root);await restarted.load();
  assert.equal(restarted.lookup("81.2.69.142").countryCode,"GB");
  const before=await readFile(join(root,"city.mmdb"));
  await service.update(async () => new Response("bad gzip"));
  assert.ok(service.status.error);
  assert.deepEqual(await readFile(join(root,"city.mmdb")),before);
  assert.equal(service.lookup("81.2.69.142").countryCode,"GB");
  console.log("PASS: bounded gzip download/validation/install, restart and preservation after corrupt download");
} finally {await rm(root,{recursive:true,force:true});}
