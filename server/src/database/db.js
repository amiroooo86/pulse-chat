import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.env.DB_FILE || './data/chat.sqlite';
const abs = path.isAbsolute(file) ? file : path.resolve(serverRoot, file);
fs.mkdirSync(path.dirname(abs), {
  recursive: true
});
const SQL = await initSqlJs({
  locateFile: filename => path.join(serverRoot, 'node_modules', 'sql.js', 'dist', filename)
});
const db = fs.existsSync(abs) ? new SQL.Database(new Uint8Array(fs.readFileSync(abs))) : new SQL.Database();
function save() {
  const bytes = db.export();
  fs.writeFileSync(abs, Buffer.from(bytes));
}
function normalizeParams(params = []) {
  return Array.isArray(params) ? params : [params];
}
const wrapper = {
  pragma() {
    // SQLite pragmas used by better-sqlite3 are not needed by sql.js.
  },
  exec(sql) {
    db.run(sql);
    save();
  },
  prepare(sql) {
    return {
      get(...params) {
        const stmt = db.prepare(sql);
        try {
          stmt.bind(normalizeParams(params));
          if (!stmt.step()) return undefined;
          return stmt.getAsObject();
        } finally {
          stmt.free();
        }
      },
      all(...params) {
        const stmt = db.prepare(sql);
        const rows = [];
        try {
          stmt.bind(normalizeParams(params));
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          return rows;
        } finally {
          stmt.free();
        }
      },
      run(...params) {
        const values = normalizeParams(params);
        db.run(sql, values);
        const result = db.exec('SELECT last_insert_rowid() AS lastInsertRowid');
        const lastInsertRowid = result?.[0]?.values?.[0]?.[0] ?? 0;
        save();
        return {
          changes: db.getRowsModified(),
          lastInsertRowid
        };
      }
    };
  }
};
wrapper.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
 avatar TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL UNIQUE,
 avatar TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
 group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(group_id,user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_a,user_b)
);

CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
 conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
 sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 text TEXT,
 image_url TEXT,
 reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL,
 message_type TEXT NOT NULL DEFAULT 'text',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ((group_id IS NOT NULL) != (conversation_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS message_reactions (
 message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reaction TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(message_id,user_id)
);
`);

// Pulsy economy migrations. These are additive only: existing users, chats and messages are preserved.
try {
  wrapper.exec(`ALTER TABLE users ADD COLUMN pulsy_balance INTEGER NOT NULL DEFAULT 0`);
} catch {}
try {
  wrapper.exec(`ALTER TABLE users ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0`);
} catch {}
try {
  wrapper.exec(`ALTER TABLE users ADD COLUMN pulsy_rewarded_milestones INTEGER NOT NULL DEFAULT 0`);
} catch {}
try {
  wrapper.exec(`ALTER TABLE users ADD COLUMN profile_border_id TEXT`);
} catch {}
try {
  wrapper.exec(`ALTER TABLE messages ADD COLUMN emote_id TEXT`);
} catch {}
wrapper.exec(`CREATE TABLE IF NOT EXISTS pulsy_inventory (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emote_id TEXT NOT NULL,
  purchased_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, emote_id)
)`);
wrapper.exec(`CREATE TABLE IF NOT EXISTS pulsy_border_inventory (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  border_id TEXT NOT NULL,
  purchased_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, border_id)
)`);
wrapper.exec(`CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
)`);
// Per-user read markers power live unread badges without changing existing chats/messages.
wrapper.exec(`CREATE TABLE IF NOT EXISTS conversation_reads (
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(conversation_id,user_id)
)`);
wrapper.exec(`CREATE TABLE IF NOT EXISTS group_reads (
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(group_id,user_id)
)`);
try {
  const migrated = wrapper.prepare("SELECT value FROM app_meta WHERE key = 'pulsy_backfill_v1'").get();
  if (!migrated) {
    const users = wrapper.prepare("SELECT id FROM users").all();
    for (const user of users) {
      const row = wrapper.prepare("SELECT COUNT(*) AS count FROM messages WHERE sender_id = ?").get(user.id);
      const count = Number(row?.count || 0);
      const milestones = Math.floor(count / 200);
      if (milestones > 0) {
        wrapper.prepare("UPDATE users SET message_count = ?, pulsy_balance = pulsy_balance + ?, pulsy_rewarded_milestones = ? WHERE id = ?").run(count, milestones * 10, milestones, user.id);
      } else {
        wrapper.prepare("UPDATE users SET message_count = 0, pulsy_rewarded_milestones = 0 WHERE id = ?").run(user.id);
      }
    }
    wrapper.prepare("INSERT INTO app_meta(key,value) VALUES('pulsy_backfill_v1','done')").run();
  }
} catch (error) {
  console.error('Pulsy migration warning:', error.message);
}

// Safe migrations for existing Pulse Chat databases. These only add missing
// group metadata and never delete existing users, groups, messages or chats.
try {
  wrapper.exec(`ALTER TABLE groups ADD COLUMN owner_id INTEGER REFERENCES users(id)`);
} catch {
  // Column already exists.
}
try {
  wrapper.exec(`ALTER TABLE groups ADD COLUMN description TEXT`);
} catch {
  // Column already exists.
}

// Older groups did not have an owner. Treat their earliest member (the creator
// in the original implementation) as the group owner.
wrapper.exec(`
  UPDATE groups
  SET owner_id = (
    SELECT gm.user_id
    FROM group_members gm
    WHERE gm.group_id = groups.id
    ORDER BY gm.created_at ASC, gm.user_id ASC
    LIMIT 1
  )
  WHERE owner_id IS NULL
`);
export default wrapper;
