import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readFileSync, writeFileSync } from "node:fs";

/** Deployment-owned directory; keep this key with the database backup, never in source control. */
export function loadPasswordKey(path: string, mustExist = false): Buffer {
  if(!mustExist) {
    try {writeFileSync(path, randomBytes(32), {flag:"wx",mode:0o600});}
    catch(error) {if((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;}
  }
  const fd=openSync(path,constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat=fstatSync(fd);
    if(!stat.isFile() || (stat.mode & 0o077) !== 0) throw new Error("Password key must be a private regular file (0600)");
    const key=readFileSync(fd);
    if(key.length !== 32) throw new Error("Invalid password encryption key");
    return key;
  } finally {closeSync(fd);}
}
export function encryptLinkPassword(password: string, key: Buffer, linkId: string): string {
  const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(Buffer.from(linkId));
  const encrypted=Buffer.concat([cipher.update(password,"utf8"),cipher.final()]);
  return ["v1",iv.toString("base64"),cipher.getAuthTag().toString("base64"),encrypted.toString("base64")].join(":");
}
export function decryptLinkPassword(value: string, key: Buffer, linkId: string): string {
  const [version,iv,tag,encrypted,...extra]=value.split(":");
  if(version !== "v1" || !iv || !tag || !encrypted || extra.length) throw new Error("Invalid encrypted password");
  const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(iv,"base64"));
  decipher.setAAD(Buffer.from(linkId));decipher.setAuthTag(Buffer.from(tag,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted,"base64")),decipher.final()]).toString("utf8");
}
