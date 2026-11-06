import { it, expect } from "vitest";
import { mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPasswordKey, encryptLinkPassword, decryptLinkPassword } from "../src/password-vault";
it("persists a private key and authenticates both ciphertext and link identity", () => {
 const dir=mkdtempSync(join(tmpdir(),"sharelyze-key-"));
 try {
 const path=join(dir,"key"), key=loadPasswordKey(path);
 expect(statSync(path).mode & 0o777).toBe(0o600);
 expect(loadPasswordKey(path)).toEqual(key);
 const encrypted=encryptLinkPassword("secret sample",key,"first");
 expect(encrypted).not.toContain("secret sample");
 expect(decryptLinkPassword(encrypted,loadPasswordKey(path),"first")).toBe("secret sample");
 expect(()=>decryptLinkPassword(encrypted,key,"second")).toThrow();
 expect(()=>decryptLinkPassword(encrypted,Buffer.alloc(32),"first")).toThrow();
 const parts=encrypted.split(":"), changed=Buffer.from(parts[3],"base64");changed[0]^=1;parts[3]=changed.toString("base64");
 expect(()=>decryptLinkPassword(parts.join(":"),key,"first")).toThrow();
 symlinkSync(path,join(dir,"symlink"));expect(()=>loadPasswordKey(join(dir,"symlink"))).toThrow();
 expect(()=>loadPasswordKey(join(dir,"missing"),true)).toThrow();
 } finally {rmSync(dir,{recursive:true,force:true});}
});
