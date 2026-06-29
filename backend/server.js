import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { query, get, run } from './database.js';
import { verifyConnection, sendTestEmail } from './smtp-tester.js';

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
// DASHBOARD STATS
// ==========================================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalSmtps = await get("SELECT COUNT(*) as count FROM smtp_configs");
    const activeSmtps = await get("SELECT COUNT(*) as count FROM smtp_configs WHERE status = 'verified'");
    const totalSent = await get("SELECT COUNT(*) as count FROM send_logs WHERE status = 'sent'");
    const totalFailed = await get("SELECT COUNT(*) as count FROM send_logs WHERE status = 'failed'");

    res.json({
      total_smtps: totalSmtps.count,
      active_smtps: activeSmtps.count,
      total_sent: totalSent.count,
      total_failed: totalFailed.count
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Helper to simulate system stats with a slight variation
let lastCpu = 12.5;
let lastRam = 48.2;
let lastDisk = 15.4;

app.get('/api/dashboard/system-status', authenticateToken, (req, res) => {
  lastCpu = Math.max(2, Math.min(99, +(lastCpu + (Math.random() * 4 - 2)).toFixed(1)));
  lastRam = Math.max(10, Math.min(95, +(lastRam + (Math.random() * 0.4 - 0.2)).toFixed(1)));

  // Mock sending history chart over time
  const trafficData = [
    { hour: '08:00', sent: 12, received: 0 },
    { hour: '09:00', sent: 24, received: 1 },
    { hour: '10:00', sent: 41, received: 0 },
    { hour: '11:00', sent: 35, received: 3 },
    { hour: '12:00', sent: 21, received: 0 },
    { hour: '13:00', sent: 28, received: 2 },
    { hour: '14:00', sent: 38, received: 0 },
  ];

  res.json({
    cpu: lastCpu,
    ram: lastRam,
    disk: lastDisk,
    uptime: '14 days, 6 hours',
    traffic: trafficData
  });
});

// ==========================================
// SMTP PROFILES CRUD ROUTES
// ==========================================

app.get('/api/smtps', authenticateToken, async (req, res) => {
  try {
    const smtps = await query("SELECT id, name, host, port, secure, username, status, created_at FROM smtp_configs ORDER BY id DESC");
    res.json(smtps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SMTP configurations' });
  }
});

app.post('/api/smtps', authenticateToken, async (req, res) => {
  const { name, host, port, secure, username, password } = req.body;
  if (!name || !host || !port || !username || !password) {
    return res.status(400).json({ error: 'Name, host, port, username, and password are required' });
  }

  const isSecure = secure ? 1 : 0;

  try {
    const result = await run(
      "INSERT INTO smtp_configs (name, host, port, secure, username, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, host, parseInt(port), isSecure, username, password, 'untested']
    );

    await logActivity('INFO', 'smtp-client', `Added SMTP Profile: "${name}" (${host}:${port})`);
    
    res.status(201).json({ id: result.id, message: 'SMTP Profile created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create SMTP Profile' });
  }
});

app.delete('/api/smtps/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const smtp = await get("SELECT name FROM smtp_configs WHERE id = ?", [id]);
    if (!smtp) {
      return res.status(404).json({ error: 'SMTP Profile not found' });
    }

    await run("DELETE FROM smtp_configs WHERE id = ?", [id]);
    await logActivity('INFO', 'smtp-client', `Removed SMTP Profile: "${smtp.name}"`);
    
    res.json({ message: 'SMTP Profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete SMTP profile' });
  }
});

// ==========================================
// SMTP VERIFICATION & SENDING TEST ROUTES
// ==========================================

// Tests connection handshake to SMTP Server
app.post('/api/smtps/:id/verify', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const smtp = await get("SELECT * FROM smtp_configs WHERE id = ?", [id]);
    if (!smtp) {
      return res.status(404).json({ error: 'SMTP profile not found' });
    }

    await logActivity('INFO', 'smtp-tester', `Starting handshake verification with ${smtp.host}:${smtp.port}...`);
    
    const checkResult = await verifyConnection(smtp);

    if (checkResult.success) {
      await run("UPDATE smtp_configs SET status = 'verified' WHERE id = ?", [id]);
      await logActivity('INFO', 'smtp-tester', `Handshake successful. SMTP Profile "${smtp.name}" is verified online.`);
      res.json({ success: true, message: 'SMTP connection handshake verified successfully!' });
    } else {
      await run("UPDATE smtp_configs SET status = 'failed' WHERE id = ?", [id]);
      await logActivity('ERROR', 'smtp-tester', `Handshake failed with ${smtp.host}:${smtp.port}: ${checkResult.error}`);
      res.json({ success: false, error: checkResult.error });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error during verification' });
  }
});

// Sends a test email via the configured SMTP profile
app.post('/api/smtps/:id/send-test', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { recipient, subject, body } = req.body;

  if (!recipient) {
    return res.status(400).json({ error: 'Recipient email address is required' });
  }

  try {
    const smtp = await get("SELECT * FROM smtp_configs WHERE id = ?", [id]);
    if (!smtp) {
      return res.status(404).json({ error: 'SMTP configuration not found' });
    }

    await logActivity('INFO', 'nodemailer', `Attempting to send email via "${smtp.name}" to ${recipient}...`);

    const result = await sendTestEmail(smtp, recipient, subject, body);

    if (result.success) {
      await run(
        "INSERT INTO send_logs (smtp_id, smtp_name, sender, recipient, subject, status) VALUES (?, ?, ?, ?, ?, ?)",
        [smtp.id, smtp.name, smtp.username, recipient, subject || 'SMTP Server Test Connection', 'sent']
      );
      await logActivity('INFO', 'nodemailer', `Email successfully sent via "${smtp.name}" to ${recipient}. MessageID: ${result.messageId}`);
      res.json({ success: true, message: 'Test email successfully sent!' });
    } else {
      await run(
        "INSERT INTO send_logs (smtp_id, smtp_name, sender, recipient, subject, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [smtp.id, smtp.name, smtp.username, recipient, subject || 'SMTP Server Test Connection', 'failed', result.error]
      );
      await logActivity('WARN', 'nodemailer', `Failed to dispatch email via "${smtp.name}": ${result.error}`);
      res.json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error during test dispatch' });
  }
});

// ==========================================
// TRANSMISSION LOGS & ACTIVITY LOGS
// ==========================================

// Get transmission history
app.get('/api/logs/transmission', authenticateToken, async (req, res) => {
  try {
    const logs = await query("SELECT * FROM send_logs ORDER BY timestamp DESC LIMIT 100");
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transmission logs' });
  }
});

// Get recent panel activity console logs
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await query("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100");
    res.json(logs.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Clear console log history
app.delete('/api/logs', authenticateToken, async (req, res) => {
  try {
    await run("DELETE FROM logs");
    await logActivity('INFO', 'panel', 'Console activity log history cleared.');
    res.json({ message: 'Console log history cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Mock/add a new log entry to simulate live SMTP flow
app.post('/api/logs/mock', authenticateToken, async (req, res) => {
  const mockSmtps = [
    { id: 1, name: 'Gmail Relay' },
    { id: 2, name: 'Outlook SMTP' },
    { id: 3, name: 'Company SMTP Server' }
  ];
  
  const mockRecipients = ['client@partner.com', 'jobs@devteam.io', 'support@client.com', 'test-receiver@yahoo.com'];
  const mockSubjects = ['Weekly Status Report', 'Connection verification test', 'Invoice #4023 payment check', 'Alert: API threshold exceeded'];
  
  const recipient = mockRecipients[Math.floor(Math.random() * mockRecipients.length)];
  const subject = mockSubjects[Math.floor(Math.random() * mockSubjects.length)];
  const selectedSmtp = mockSmtps[Math.floor(Math.random() * mockSmtps.length)];
  
  const isSuccess = Math.random() > 0.15; // 85% success rate

  try {
    if (isSuccess) {
      await run(
        "INSERT INTO send_logs (smtp_id, smtp_name, sender, recipient, subject, status) VALUES (?, ?, ?, ?, ?, ?)",
        [selectedSmtp.id, selectedSmtp.name, `sender@${selectedSmtp.name.toLowerCase().replace(' ', '')}.com`, recipient, subject, 'sent']
      );
      await logActivity('INFO', 'nodemailer', `Email successfully sent via "${selectedSmtp.name}" to ${recipient}. MessageID: <MOCK_${Math.random().toString(36).substring(2, 10).toUpperCase()}@relay.com>`);
    } else {
      const errorMsg = '535 5.7.8 Username and Password not accepted / Auth credentials rejected';
      await run(
        "INSERT INTO send_logs (smtp_id, smtp_name, sender, recipient, subject, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [selectedSmtp.id, selectedSmtp.name, `sender@${selectedSmtp.name.toLowerCase().replace(' ', '')}.com`, recipient, subject, 'failed', errorMsg]
      );
      await logActivity('WARN', 'nodemailer', `Failed to dispatch email via "${selectedSmtp.name}": ${errorMsg}`);
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
