import Database from "better-sqlite3";
import { existsSync, lstatSync, mkdirSync, renameSync, copyFileSync, constants } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** One app instance owns these private directories; source mounts are never modified. */
export async function dataLayout(env: NodeJS.ProcessEnv = process.env) {
  const root = resolve(env.DATA_ROOT || "./.local-config");
  const configRoot = resolve(env.CONFIG_ROOT || join(root,"config"));
  const dbPath = resolve(env.DB_PATH || join(root,"database/sharelyze.db"));
  const uploadRoot = resolve(env.UPLOAD_ROOT || join(root,"uploads"));
  const previewRoot = resolve(env.PREVIEW_ROOT || join(root,"previews"));
  const directories = [configRoot,dirname(dbPath),uploadRoot,previewRoot];
  if (directories.some((path,index) => directories.some((other,j) => index !== j && (path === other || (path.startsWith(other+"/") && !(j === 1 && other === root)))))) throw new Error("Application directories must be separate and must not overlap");
  for (const path of directories) {
    mkdirSync(path,{recursive:true,mode:0o700});
    if (lstatSync(path).isSymbolicLink()) throw new Error("Application directories must not be symlinks");
  }
  const legacy = join(root,"sharelyze.db");
  if (!env.DB_PATH && existsSync(legacy)) {
    if (existsSync(dbPath)) throw new Error("Both legacy and new database exist; select DB_PATH explicitly");
    const old = new Database(legacy);
    try { await old.backup(dbPath); } finally { old.close(); }
    renameSync(legacy,legacy+".migrated");
    for (const suffix of ["-wal","-shm","-journal"]) if (existsSync(legacy+suffix)) renameSync(legacy+suffix,legacy+".migrated"+suffix);
  }
  const passwordKeyPath = join(configRoot,"link-password.key");
  const legacyKey = join(env.DB_PATH ? dirname(dbPath) : root,"link-password.key");
  if (legacyKey !== passwordKeyPath && existsSync(legacyKey)) {
    if (existsSync(passwordKeyPath)) throw new Error("Both legacy and new password keys exist");
    copyFileSync(legacyKey,passwordKeyPath,constants.COPYFILE_EXCL);
    renameSync(legacyKey,legacyKey+".migrated");
  }
  return {root,configRoot,dbPath,uploadRoot,previewRoot,passwordKeyPath};
}
