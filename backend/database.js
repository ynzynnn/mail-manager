import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'mailmanager.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Domains Table
    db.run(`
      CREATE TABLE IF NOT EXISTS domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        dkim_selector TEXT DEFAULT 'default',
        dkim_public TEXT,
        dkim_private TEXT,
        spf_value TEXT,
        dmarc_value TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Mailboxes Table
    db.run(`
      CREATE TABLE IF NOT EXISTS mailboxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        domain TEXT,
        email TEXT UNIQUE,
        password TEXT,
        quota_bytes INTEGER DEFAULT 2147483648, -- 2GB default
        bytes_used INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active', -- active, suspended
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Aliases Table
    db.run(`
      CREATE TABLE IF NOT EXISTS aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_email TEXT UNIQUE,
        destination_email TEXT,
        domain TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Queue Table
    db.run(`
      CREATE TABLE IF NOT EXISTS queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE,
        sender TEXT,
        recipient TEXT,
        subject TEXT,
        size_bytes INTEGER,
        status TEXT DEFAULT 'active', -- active, deferred, hold
        arrival_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT
      )
    `);

    // 6. Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        level TEXT DEFAULT 'INFO', -- INFO, WARN, ERROR
        component TEXT DEFAULT 'system', -- postfix, dovecot, rspamd, panel
        message TEXT
      )
    `);

    seedData();
  });
}

function seedData() {
  // Check if admin user exists
  db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      // Seed default admin: admin / admin
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('admin', salt);
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedPassword, 'admin']);
      console.log('Seeded admin user (admin/admin)');
    }
  });

  // Seed default logs with initial server startup messages only
  db.get("SELECT COUNT(*) as count FROM logs", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      const initialLogs = [
        { level: 'INFO', comp: 'postfix', msg: 'daemon started -- version 3.6.4, configuration /etc/postfix' },
        { level: 'INFO', comp: 'dovecot', msg: 'Master: Dovecot v2.3.16 starting up for imap, pop3, lmtp' },
        { level: 'INFO', comp: 'rspamd', msg: 'rspamd v3.2 loading configuration, enabled modules: spf, dkim, dmarc, spamassassin' },
        { level: 'INFO', comp: 'panel', msg: 'Mail Server Manager dashboard initialized. Awaiting configuration.' }
      ];

      initialLogs.forEach(l => {
        db.run("INSERT INTO logs (level, component, message) VALUES (?, ?, ?)", [l.level, l.comp, l.msg]);
      });
      console.log('Seeded startup system logs');
    }
  });
}

// Wrapper database functions
export function getDb() {
  return db;
}

export function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}
