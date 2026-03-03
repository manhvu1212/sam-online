import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../../data/sam_loc.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY, 
    name TEXT,
    avatar_seed TEXT
  );

  CREATE TABLE IF NOT EXISTS match_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT,
    player_id TEXT,
    score_change INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;