import Database from "better-sqlite3";

/** Versioned migrations fail closed if a migration fails. */
export function openDatabase(filename: string): Database.Database {
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version > 6) {
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
  return db;
}
