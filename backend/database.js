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

  // Seed default domains
  db.get("SELECT COUNT(*) as count FROM domains", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      const domains = [
        {
          name: 'septacloud.net',
          selector: 'sig1',
          spf: 'v=spf1 mx a ip4:103.186.31.22 ~all',
          dmarc: 'v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@septacloud.net',
          dkim_pub: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv1r6tE1...',
          status: 'active'
        },
        {
          name: 'example.com',
          selector: 'default',
          spf: 'v=spf1 mx ~all',
          dmarc: 'v=DMARC1; p=none;',
          dkim_pub: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA123...',
          status: 'active'
        },
        {
          name: 'testmail.org',
          selector: 'default',
          spf: 'v=spf1 mx -all',
          dmarc: 'v=DMARC1; p=reject;',
          dkim_pub: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA789...',
          status: 'active'
        }
      ];

      domains.forEach(d => {
        db.run(
          "INSERT INTO domains (name, dkim_selector, spf_value, dmarc_value, dkim_public, status) VALUES (?, ?, ?, ?, ?, ?)",
          [d.name, d.selector, d.spf, d.dmarc, d.dkim_pub, d.status]
        );
      });
      console.log('Seeded default domains');
    }
  });

  // Seed default mailboxes
  db.get("SELECT COUNT(*) as count FROM mailboxes", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      const salt = bcrypt.genSaltSync(10);
      const defaultPass = bcrypt.hashSync('password123', salt);
      const mailboxes = [
        { username: 'admin', domain: 'septacloud.net', email: 'admin@septacloud.net', quota: 5368709120, used: 1245890000, status: 'active' }, // 5GB quota, ~1.2GB used
        { username: 'support', domain: 'septacloud.net', email: 'support@septacloud.net', quota: 2147483648, used: 85200000, status: 'active' }, // 2GB quota
        { username: 'ceo', domain: 'septacloud.net', email: 'ceo@septacloud.net', quota: 10737418240, used: 8432000000, status: 'active' }, // 10GB quota
        { username: 'info', domain: 'example.com', email: 'info@example.com', quota: 1073741824, used: 5420000, status: 'active' }, // 1GB quota
        { username: 'test', domain: 'testmail.org', email: 'test@testmail.org', quota: 512000000, used: 0, status: 'suspended' } // 500MB, suspended
      ];

      mailboxes.forEach(m => {
        db.run(
          "INSERT INTO mailboxes (username, domain, email, password, quota_bytes, bytes_used, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [m.username, m.domain, m.email, defaultPass, m.quota, m.used, m.status]
        );
      });
      console.log('Seeded default mailboxes (password: password123)');
    }
  });

  // Seed default aliases
  db.get("SELECT COUNT(*) as count FROM aliases", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      db.run("INSERT INTO aliases (source_email, destination_email, domain, status) VALUES (?, ?, ?, ?)",
        ['help@septacloud.net', 'support@septacloud.net', 'septacloud.net', 'active']
      );
      db.run("INSERT INTO aliases (source_email, destination_email, domain, status) VALUES (?, ?, ?, ?)",
        ['contact@example.com', 'info@example.com', 'example.com', 'active']
      );
      console.log('Seeded default aliases');
    }
  });

  // Seed default queue
  db.get("SELECT COUNT(*) as count FROM queue", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      const queueItems = [
        { msgId: 'E350E18A49', sender: 'sales@partner.com', recipient: 'ceo@septacloud.net', subject: 'Partnership Proposal', size: 104520, status: 'active', error: null },
        { msgId: 'A87F3D0841', sender: 'newsletter@tech.info', recipient: 'admin@septacloud.net', subject: 'Weekly Tech Insights', size: 45210, status: 'deferred', error: '451 4.4.1 Connection timed out' },
        { msgId: '7B32F0903E', sender: 'spammer@shady.net', recipient: 'support@septacloud.net', subject: 'Get rich quick!!!', size: 8500, status: 'hold', error: 'Flagged by rspamd policy' }
      ];

      queueItems.forEach(q => {
        db.run(
          "INSERT INTO queue (message_id, sender, recipient, subject, size_bytes, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [q.msgId, q.sender, q.recipient, q.subject, q.size, q.status, q.error]
        );
      });
      console.log('Seeded mail queue items');
    }
  });

  // Seed initial log messages
  db.get("SELECT COUNT(*) as count FROM logs", [], (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      const initialLogs = [
        { level: 'INFO', comp: 'postfix', msg: 'daemon started -- version 3.6.4, configuration /etc/postfix' },
        { level: 'INFO', comp: 'dovecot', msg: 'Master: Dovecot v2.3.16 starting up for imap, pop3, lmtp' },
        { level: 'INFO', comp: 'rspamd', msg: 'rspamd v3.2 loading configuration, enabled modules: spf, dkim, dmarc, spamassassin' },
        { level: 'INFO', comp: 'panel', msg: 'Mail Server Manager dashboard initialized in Mock Mode' },
        { level: 'INFO', comp: 'postfix/smtpd', msg: 'connect from mail-sender.external.com[203.0.113.5]' },
        { level: 'INFO', comp: 'postfix/smtpd', msg: 'Anonymous TLS connection established from mail-sender.external.com: TLSv1.3 with cipher TLS_AES_256_GCM_SHA384' },
        { level: 'INFO', comp: 'postfix/cleanup', msg: 'E350E18A49: message-id=<propos-99a3-48@partner.com>' },
        { level: 'INFO', comp: 'postfix/qmgr', msg: 'E350E18A49: from=<sales@partner.com>, size=104520, nrcpt=1 (queue active)' },
        { level: 'INFO', comp: 'dovecot', msg: 'imap-login: Login: user=<admin@septacloud.net>, method=PLAIN, rip=127.0.0.1, lip=127.0.0.1, mpid=2045, TLS' },
        { level: 'WARN', comp: 'postfix/smtp', msg: 'A87F3D0841: to=<admin@septacloud.net>, relay=none, delay=30, delays=0.02/0.01/30/0, dsn=4.4.1, status=deferred (connect to mail.tech.info[198.51.100.12]: Connection timed out)' },
        { level: 'WARN', comp: 'rspamd', msg: 'spammer@shady.net score 12.5 (SPF fail, DKIM missing, subject contains high-risk keywords)' },
        { level: 'INFO', comp: 'postfix/cleanup', msg: '7B32F0903E: hold: Action from filter rspamd: spammer@shady.net' }
      ];

      initialLogs.forEach(l => {
        db.run("INSERT INTO logs (level, component, message) VALUES (?, ?, ?)", [l.level, l.comp, l.msg]);
      });
      console.log('Seeded default logs');
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
