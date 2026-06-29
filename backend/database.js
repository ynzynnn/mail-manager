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
    // 1. Users Table (Admin accounts)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. SMTP Configurations Table
    db.run(`
      CREATE TABLE IF NOT EXISTS smtp_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        host TEXT,
        port INTEGER,
        secure INTEGER DEFAULT 0, -- 0 = False, 1 = True (SSL)
        username TEXT,
        password TEXT,
        status TEXT DEFAULT 'untested', -- verified, failed, untested
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Email Transmission Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS send_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        smtp_id INTEGER,
        smtp_name TEXT,
        sender TEXT,
        recipient TEXT,
        subject TEXT,
        status TEXT, -- sent, failed
        error_message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Panel Activity Logs Table (For console output)
    db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        level TEXT DEFAULT 'INFO',
        component TEXT DEFAULT 'panel',
        message TEXT
      )
    `);

    seedData();
  });
}

function seedData() {
  // Seed default admin: admin / admin
  db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('admin', salt);
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedPassword, 'admin']);
      console.log('Seeded admin user (admin/admin)');
    }
  });

  // Seed default startup logs
  db.get("SELECT COUNT(*) as count FROM logs", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      const initialLogs = [
        { level: 'INFO', comp: 'panel', msg: 'SMTP Connection Client Manager initialized successfully.' },
        { level: 'INFO', comp: 'database', msg: 'SQLite connection active. SMTP profiles ready.' }
      ];

      initialLogs.forEach(l => {
        db.run("INSERT INTO logs (level, component, message) VALUES (?, ?, ?)", [l.level, l.comp, l.msg]);
      });
      console.log('Seeded startup system logs');
    }
  });
}

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
