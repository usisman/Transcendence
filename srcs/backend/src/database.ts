import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { promises as fs } from 'fs';

// SQLite bağlantısını tek noktada yönetebilmek için bir helper fonksiyon oluşturuyoruz.
export const createDatabaseConnection = async () => {
  // Veritabanı dosyasını backend konteyneri içindeki data dizininde saklıyoruz.
  const dataDir = path.join(process.cwd(), 'data');
  const databasePath = path.join(dataDir, 'transcendence.sqlite');

  // Klasörün varlığını garanti ediyoruz; yoksa sqlite dosyası oluşturulurken hata alabiliriz.
  await fs.mkdir(dataDir, { recursive: true });

  // sqlite modülünü promise tabanlı kullanabilmek için sqlite package'ının open fonksiyonundan yararlanıyoruz.
  const db = await open({
    filename: databasePath,
    driver: sqlite3.Database
  });

  // Uygulama ilk kez ayağa kalktığında ihtiyaç duyulan tabloları oluşturuyoruz.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'local',
      provider_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Var olan tablolar için yeni kolonları ekleyerek geri uyumluluk sağlıyoruz.
  const existingColumnsRaw = await db.all(`PRAGMA table_info(users)`);
  const existingColumns = existingColumnsRaw as Array<{ name: string }>;
  const columnNames = new Set(
    existingColumns.map((column: { name: string }) => column.name)
  );

  if (!columnNames.has('provider')) {
    await db.exec(`ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'local';`);
  }

  if (!columnNames.has('provider_id')) {
    await db.exec(`ALTER TABLE users ADD COLUMN provider_id TEXT;`);
  }

  // Google kayıtları için provider + provider_id çiftini benzersiz kılıyoruz (provider_id boş değilse).
  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_id
    ON users (provider, provider_id)
    WHERE provider_id IS NOT NULL
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER,
      max_players INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      bracket_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      user_id INTEGER,
      alias TEXT NOT NULL,
      is_ai INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_players_unique_user
    ON tournament_players (tournament_id, user_id)
    WHERE user_id IS NOT NULL
  `);

  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_players_alias
    ON tournament_players (tournament_id, alias)
  `);

  return db;
};

export type AppDatabase = Database;
