import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { query, get, run } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'septacloud-secret-key-12345';

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helper: Log message to DB logs
async function logActivity(level, component, message) {
  try {
    await run("INSERT INTO logs (level, component, message) VALUES (?, ?, ?)", [level, component, message]);
  } catch (err) {
    console.error('Failed to write to logs table:', err);
  }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==========================================
// AUTH ROUTES
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    
    await logActivity('INFO', 'panel', `User ${username} logged in successfully`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await get("SELECT id, username, role, created_at FROM users WHERE id = ?", [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DASHBOARD & MONITORING ROUTES
// ==========================================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const domainCount = await get("SELECT COUNT(*) as count FROM domains");
    const mailboxCount = await get("SELECT COUNT(*) as count FROM mailboxes");
    const aliasCount = await get("SELECT COUNT(*) as count FROM aliases");
    const queueCount = await get("SELECT COUNT(*) as count FROM queue");
    const totalStorage = await get("SELECT SUM(quota_bytes) as total, SUM(bytes_used) as used FROM mailboxes");

    res.json({
      domains: domainCount.count,
      mailboxes: mailboxCount.count,
      aliases: aliasCount.count,
      queue: queueCount.count,
      storage: {
        total: totalStorage.total || 0,
        used: totalStorage.used || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Helper to simulate system stats with a slight variation
let lastCpu = 12.5;
let lastRam = 48.2;
let lastDisk = 32.1;

app.get('/api/dashboard/system-status', authenticateToken, (req, res) => {
  // Add small random oscillations to mimic real monitoring metrics
  lastCpu = Math.max(2, Math.min(99, +(lastCpu + (Math.random() * 4 - 2)).toFixed(1)));
  lastRam = Math.max(10, Math.min(95, +(lastRam + (Math.random() * 0.4 - 0.2)).toFixed(1)));
  
  // Storage is more static
  const disk = lastDisk;

  // Mock hourly SMTP traffic data (sent / received)
  const trafficData = [
    { hour: '08:00', sent: 124, received: 184 },
    { hour: '09:00', sent: 245, received: 312 },
    { hour: '10:00', sent: 412, received: 450 },
    { hour: '11:00', sent: 356, received: 390 },
    { hour: '12:00', sent: 210, received: 280 },
    { hour: '13:00', sent: 289, received: 340 },
    { hour: '14:00', sent: 388, received: 410 },
  ];

  res.json({
    cpu: lastCpu,
    ram: lastRam,
    disk: disk,
    uptime: '14 days, 6 hours, 23 minutes',
    postfix_status: 'running',
    dovecot_status: 'running',
    rspamd_status: 'running',
    traffic: trafficData
  });
});

// ==========================================
// DOMAIN ROUTES
// ==========================================

app.get('/api/domains', authenticateToken, async (req, res) => {
  try {
    const domains = await query("SELECT * FROM domains ORDER BY name ASC");
    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

app.post('/api/domains', authenticateToken, async (req, res) => {
  const { name, dkim_selector } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Domain name is required' });
  }

  const selector = dkim_selector || 'default';
  // Simulate DKIM keypair generation
  const mockDkimPublic = `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${Math.random().toString(36).substring(2, 15).toUpperCase()}...`;
  const mockDkimPrivate = `-----BEGIN RSA PRIVATE KEY-----\n${Math.random().toString(36).substring(2, 15).repeat(5)}\n-----END RSA PRIVATE KEY-----`;
  
  const spf = 'v=spf1 mx ~all';
  const dmarc = `v=DMARC1; p=none; rua=mailto:dmarc@${name}`;

  try {
    await run(
      "INSERT INTO domains (name, dkim_selector, spf_value, dmarc_value, dkim_public, dkim_private, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, selector, spf, dmarc, mockDkimPublic, mockDkimPrivate, 'active']
    );

    await logActivity('INFO', 'postfix', `Domain ${name} configured in postfix configuration maps`);
    await logActivity('INFO', 'panel', `Domain ${name} added successfully`);
    
    res.status(201).json({ message: 'Domain created successfully', name });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Domain already exists' });
    }
    res.status(500).json({ error: 'Failed to create domain' });
  }
});

app.delete('/api/domains/:name', authenticateToken, async (req, res) => {
  const { name } = req.params;
  try {
    // Delete domain, and warning/cleanup mailboxes associated
    const mailboxes = await query("SELECT COUNT(*) as count FROM mailboxes WHERE domain = ?", [name]);
    if (mailboxes[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete domain. Delete all email accounts associated with it first.' });
    }

    await run("DELETE FROM domains WHERE name = ?", [name]);
    await logActivity('INFO', 'postfix', `Domain ${name} removed from postfix maps`);
    await logActivity('INFO', 'panel', `Domain ${name} deleted`);
    
    res.json({ message: 'Domain deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// ==========================================
// MAILBOX ROUTES
// ==========================================

app.get('/api/mailboxes', authenticateToken, async (req, res) => {
  try {
    const mailboxes = await query("SELECT id, username, domain, email, quota_bytes, bytes_used, status, created_at FROM mailboxes ORDER BY email ASC");
    res.json(mailboxes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mailboxes' });
  }
});

app.post('/api/mailboxes', authenticateToken, async (req, res) => {
  const { username, domain, password, quota_bytes } = req.body;
  if (!username || !domain || !password) {
    return res.status(400).json({ error: 'Username, domain, and password are required' });
  }

  const email = `${username}@${domain}`.toLowerCase();
  const quota = quota_bytes || 2147483648; // Default 2GB

  try {
    // Check if domain exists
    const domainCheck = await get("SELECT * FROM domains WHERE name = ?", [domain]);
    if (!domainCheck) {
      return res.status(404).json({ error: 'Parent domain not configured. Please add the domain first.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    await run(
      "INSERT INTO mailboxes (username, domain, email, password, quota_bytes, bytes_used, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [username, domain, email, hashedPassword, quota, 0, 'active']
    );

    await logActivity('INFO', 'dovecot', `Mailbox ${email} provisioned with quota ${quota} bytes`);
    await logActivity('INFO', 'postfix', `Local alias generated for virtual mailbox ${email}`);
    
    res.status(201).json({ message: 'Mailbox created successfully', email });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email address already exists' });
    }
    res.status(500).json({ error: 'Failed to create mailbox' });
  }
});

app.put('/api/mailboxes/:email', authenticateToken, async (req, res) => {
  const { email } = req.params;
  const { password, quota_bytes, status } = req.body;

  try {
    const mailbox = await get("SELECT * FROM mailboxes WHERE email = ?", [email]);
    if (!mailbox) {
      return res.status(404).json({ error: 'Mailbox not found' });
    }

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      await run("UPDATE mailboxes SET password = ? WHERE email = ?", [hashedPassword, email]);
      await logActivity('INFO', 'dovecot', `Password updated for mailbox ${email}`);
    }

    if (quota_bytes !== undefined) {
      await run("UPDATE mailboxes SET quota_bytes = ? WHERE email = ?", [quota_bytes, email]);
      await logActivity('INFO', 'dovecot', `Quota changed for mailbox ${email} to ${quota_bytes} bytes`);
    }

    if (status) {
      await run("UPDATE mailboxes SET status = ? WHERE email = ?", [status, email]);
      await logActivity('INFO', 'dovecot', `Account status for ${email} set to ${status}`);
    }

    res.json({ message: 'Mailbox updated successfully', email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update mailbox' });
  }
});

app.delete('/api/mailboxes/:email', authenticateToken, async (req, res) => {
  const { email } = req.params;
  try {
    await run("DELETE FROM mailboxes WHERE email = ?", [email]);
    await logActivity('INFO', 'dovecot', `Mailbox ${email} de-provisioned and storage marked for deletion`);
    await logActivity('INFO', 'panel', `Mailbox ${email} deleted`);
    res.json({ message: 'Mailbox deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete mailbox' });
  }
});

// ==========================================
// ALIAS ROUTES
// ==========================================

app.get('/api/aliases', authenticateToken, async (req, res) => {
  try {
    const aliases = await query("SELECT * FROM aliases ORDER BY source_email ASC");
    res.json(aliases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch aliases' });
  }
});

app.post('/api/aliases', authenticateToken, async (req, res) => {
  const { source_email, destination_email } = req.body;
  if (!source_email || !destination_email) {
    return res.status(400).json({ error: 'Source and destination emails are required' });
  }

  const domain = source_email.split('@')[1];
  if (!domain) {
    return res.status(400).json({ error: 'Invalid source email format' });
  }

  try {
    // Check if domain exists
    const domainCheck = await get("SELECT * FROM domains WHERE name = ?", [domain]);
    if (!domainCheck) {
      return res.status(404).json({ error: 'Domain for source email is not configured on this server.' });
    }

    await run(
      "INSERT INTO aliases (source_email, destination_email, domain, status) VALUES (?, ?, ?, ?)",
      [source_email.toLowerCase(), destination_email.toLowerCase(), domain, 'active']
    );

    await logActivity('INFO', 'postfix', `Virtual alias map updated: ${source_email} -> ${destination_email}`);
    res.status(201).json({ message: 'Alias created successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Alias source address already exists' });
    }
    res.status(500).json({ error: 'Failed to create alias' });
  }
});

app.delete('/api/aliases/:source_email', authenticateToken, async (req, res) => {
  const { source_email } = req.params;
  try {
    await run("DELETE FROM aliases WHERE source_email = ?", [source_email]);
    await logActivity('INFO', 'postfix', `Virtual alias map removed: ${source_email}`);
    res.json({ message: 'Alias deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete alias' });
  }
});

// ==========================================
// MAIL QUEUE & LOGS ROUTES
// ==========================================

app.get('/api/queue', authenticateToken, async (req, res) => {
  try {
    const queue = await query("SELECT * FROM queue ORDER BY arrival_time DESC");
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Flush mail queue (simulation)
app.post('/api/queue/flush', authenticateToken, async (req, res) => {
  try {
    const queueItems = await query("SELECT * FROM queue");
    if (queueItems.length === 0) {
      return res.json({ message: 'Mail queue is empty. Nothing to flush.' });
    }

    await logActivity('INFO', 'postfix/qmgr', `Initiating SMTP queue flush (postqueue -f)`);
    
    // Simulate attempts to send queue items
    for (const item of queueItems) {
      if (item.status === 'deferred') {
        // Randomly succeed or remain deferred
        if (Math.random() > 0.4) {
          // Success
          await run("DELETE FROM queue WHERE id = ?", [item.id]);
          await logActivity('INFO', 'postfix/smtp', `${item.message_id}: sent to relay ${item.recipient} (Success after retry)`);
        } else {
          // Keep deferred
          await logActivity('WARN', 'postfix/smtp', `${item.message_id}: failed to send to ${item.recipient}. Keep deferred.`);
        }
      } else if (item.status === 'hold') {
        // Items on hold are not flushed automatically, need release
        await logActivity('INFO', 'postfix/qmgr', `${item.message_id}: held message skipped from automatic flush`);
      } else {
        // Sent successfully
        await run("DELETE FROM queue WHERE id = ?", [item.id]);
        await logActivity('INFO', 'postfix/smtp', `${item.message_id}: sent to remote relay for recipient ${item.recipient}`);
      }
    }

    res.json({ message: 'Queue flush completed. Check logs for delivery updates.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to flush queue' });
  }
});

// Clear all messages in mail queue
app.delete('/api/queue/clear', authenticateToken, async (req, res) => {
  try {
    await run("DELETE FROM queue");
    await logActivity('INFO', 'postfix/qmgr', 'Mail queue purged completely (postsuper -d ALL)');
    res.json({ message: 'Mail queue cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear queue' });
  }
});

// Remove a specific message from queue
app.delete('/api/queue/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await get("SELECT message_id FROM queue WHERE id = ?", [id]);
    if (!item) {
      return res.status(404).json({ error: 'Message not found in queue' });
    }
    await run("DELETE FROM queue WHERE id = ?", [id]);
    await logActivity('INFO', 'postfix/qmgr', `Removed message ${item.message_id} from queue (postsuper -d)`);
    res.json({ message: 'Message removed from queue' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message from queue' });
  }
});

// Get recent log items
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await query("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100");
    // Return logs in natural time order (oldest first) for scrolling console log view
    res.json(logs.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Mock/add a new log entry to simulate live SMTP flow
app.post('/api/logs/mock', authenticateToken, async (req, res) => {
  const mockSenders = ['hello@customer.com', 'jobs@developer.net', 'alert@server.mon', 'spam@viagra-deals.ru'];
  const mockRecipients = ['admin@septacloud.net', 'support@septacloud.net', 'info@example.com', 'ceo@septacloud.net'];
  const mockSubjects = ['Urgent Invoice #4023', 'Job application - Full Stack Node Developer', 'Disk usage alert: 92%', 'Buy cheap pills online fast'];
  
  const sender = mockSenders[Math.floor(Math.random() * mockSenders.length)];
  const recipient = mockRecipients[Math.floor(Math.random() * mockRecipients.length)];
  const subject = mockSubjects[Math.floor(Math.random() * mockSubjects.length)];
  const size = Math.floor(Math.random() * 500000) + 1000;
  const msgId = Math.random().toString(36).substring(2, 10).toUpperCase();

  try {
    await logActivity('INFO', 'postfix/smtpd', `connect from mail-relay.random-sender.net[198.51.100.${Math.floor(Math.random() * 254) + 1}]`);
    
    // Check if spam
    if (sender.includes('spam')) {
      await logActivity('WARN', 'rspamd', `${sender} score 14.2 (High spam score)`);
      // Put on hold in queue
      await run(
        "INSERT INTO queue (message_id, sender, recipient, subject, size_bytes, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [msgId, sender, recipient, subject, size, 'hold', 'Flagged by rspamd policy']
      );
      await logActivity('INFO', 'postfix/cleanup', `${msgId}: hold: Action from filter rspamd: ${sender}`);
    } else {
      // Normal transaction
      await logActivity('INFO', 'postfix/cleanup', `${msgId}: message-id=<${msgId}@random-sender.net>`);
      await logActivity('INFO', 'postfix/qmgr', `${msgId}: from=<${sender}>, size=${size}, nrcpt=1 (queue active)`);
      
      // Let it go to Dovecot
      await logActivity('INFO', 'dovecot', `lmtp(${recipient}): Saved message to Maildir (uid=${Math.floor(Math.random()*1000)}, size=${size})`);
      await logActivity('INFO', 'postfix/lmtp', `${msgId}: to=<${recipient}>, relay=127.0.0.1[127.0.0.1], delay=0.15, dsn=2.0.0, status=sent (250 2.0.0 Ok)`);
      
      // Update mailbox size_used in database
      await run("UPDATE mailboxes SET bytes_used = bytes_used + ? WHERE email = ?", [size, recipient]);
    }
    
    res.json({ message: 'Mock mail log entry generated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate mock log' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
