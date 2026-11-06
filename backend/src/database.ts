import Database from "better-sqlite3";

/** Versioned migrations fail closed if a migration fails. */
export function openDatabase(filename: string): Database.Database {
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version > 13) {
    db.close();
    throw new Error("Database version is newer than this application");
  }
  if (version === 0)
    db.transaction(() => {
      db.exec(`
      CREATE TABLE sources (id TEXT PRIMARY KEY, name TEXT NOT NULL, root TEXT NOT NULL);
      CREATE TABLE shares (id TEXT PRIMARY KEY, title TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), password_hash TEXT, expires_at TEXT, created_at TEXT NOT NULL);
      CREATE TABLE share_items (id TEXT PRIMARY KEY, share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE, source_id TEXT NOT NULL REFERENCES sources(id), relative_path TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('file','directory')));
      CREATE TABLE links (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, share_id TEXT REFERENCES shares(id) ON DELETE CASCADE, target_url TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL, CHECK ((share_id IS NULL) != (target_url IS NULL)));
      CREATE TABLE events (id INTEGER PRIMARY KEY, link_id TEXT REFERENCES links(id) ON DELETE SET NULL, share_id TEXT REFERENCES shares(id) ON DELETE SET NULL, item_id TEXT REFERENCES share_items(id) ON DELETE SET NULL, type TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX events_created_at ON events(created_at);
      CREATE INDEX events_link_time ON events(link_id, created_at);
      CREATE TABLE admins (id INTEGER PRIMARY KEY CHECK(id = 1), username TEXT NOT NULL, password_hash TEXT NOT NULL);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
      PRAGMA user_version = 1;
    `);
    })();
  if (version < 2)
    db.transaction(() => {
      db.exec(
        `CREATE TABLE share_grants (token_hash TEXT PRIMARY KEY, share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE, expires_at TEXT NOT NULL); PRAGMA user_version = 2;`,
      );
    })();
  if (version < 3)
    db.transaction(() => {
      db.exec(
        "ALTER TABLE events ADD COLUMN file_path TEXT; PRAGMA user_version = 3;",
      );
    })();
  if (version < 4)
    db.transaction(() => {
      db.exec(
        "ALTER TABLE sources ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)); PRAGMA user_version = 4;",
      );
    })();
  if (version < 5)
    db.transaction(() => {
      db.exec(
        "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); PRAGMA user_version = 5;",
      );
    })();
  if (version < 6)
    db.transaction(() => {
      db.exec("ALTER TABLE events ADD COLUMN ip_address TEXT; ALTER TABLE events ADD COLUMN user_agent TEXT; ALTER TABLE events ADD COLUMN referrer_origin TEXT; PRAGMA user_version = 6;");
    })();
  if (version < 7) db.transaction(() => { db.exec("ALTER TABLE shares ADD COLUMN description TEXT; PRAGMA user_version = 7;"); })();
  if (version < 8) db.transaction(() => { db.exec("ALTER TABLE links ADD COLUMN password_hash TEXT; ALTER TABLE links ADD COLUMN expires_at TEXT; PRAGMA user_version = 8;"); })();
  if (version < 9) db.transaction(() => { db.exec(`ALTER TABLE links ADD COLUMN case_sensitive INTEGER NOT NULL DEFAULT 0 CHECK(case_sensitive IN (0,1)); CREATE UNIQUE INDEX "links.slug_folded" ON links(lower(slug)); PRAGMA user_version = 9;`); })();
  if (version < 10) db.transaction(() => { db.exec("ALTER TABLE links ADD COLUMN password_encrypted TEXT; PRAGMA user_version = 10;"); })();
  if (version < 11) db.transaction(() => { db.exec("UPDATE links SET expires_at=CASE WHEN expires_at IS NULL OR expires_at > '1970-01-01T00:00:00.000Z' THEN '1970-01-01T00:00:00.000Z' ELSE expires_at END, active=1 WHERE target_url IS NOT NULL AND active=0; PRAGMA user_version = 11;"); })();
  if (version < 12) db.transaction(() => { db.exec("ALTER TABLE links ADD COLUMN deleted_at TEXT; PRAGMA user_version = 12;"); })();
  if (version < 13) db.transaction(() => { db.exec("ALTER TABLE shares ADD COLUMN deleted_at TEXT; ALTER TABLE shares ADD COLUMN purged_at TEXT; PRAGMA user_version = 13;"); })();
  return db;
}
