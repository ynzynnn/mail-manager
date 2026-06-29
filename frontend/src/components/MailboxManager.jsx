import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Mail, 
  Send,
  Eye,
  EyeOff
} from 'lucide-react';

export default function MailboxManager({ token, API_URL }) {
  const [smtps, setSmtps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Add SMTP Profile Form State
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [addError, setAddError] = useState('');

  // Send Test Mail Form State
  const [selectedSmtp, setSelectedSmtp] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('SMTP Connection Test Mail');
  const [body, setBody] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState('');

  // Connection Handshake testing state
  const [verifyingId, setVerifyingId] = useState(null);

  useEffect(() => {
    fetchSmtps();
  }, []);

  const fetchSmtps = async () => {
    try {
      const res = await fetch(`${API_URL}/smtps`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSmtps(data);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSmtp = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!name || !host || !port || !username || !password) {
      setAddError('All fields are required');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/smtps`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          host: host.trim(), 
          port: parseInt(port), 
          secure, 
          username: username.trim(), 
          password 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setName('');
        setHost('');
        setPort('587');
        setSecure(false);
        setUsername('');
        setPassword('');
        setShowAddModal(false);
        fetchSmtps();
      } else {
        setAddError(data.error || 'Failed to create SMTP Profile');
      }
    } catch (err) {
      setAddError('Network error connecting to backend');
    }
  };

  const handleVerifySmtp = async (id) => {
    setVerifyingId(id);
    try {
      const res = await fetch(`${API_URL}/smtps/${id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.success) {
          alert('Handshake Successful! SMTP configuration is verified online.');
        } else {
          alert('Verification Failed:\n' + data.error);
        }
        fetchSmtps();
      }
    } catch (err) {
      alert('Verification request failed. Connection error.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteSmtp = async (id, profileName) => {
    if (!window.confirm(`Are you sure you want to delete the SMTP profile "${profileName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/smtps/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSmtps();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTestMail = async (e) => {
    e.preventDefault();
    setSendError('');
    setSendLoading(true);

    if (!recipient) {
      setSendError('Recipient email is required');
      setSendLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/smtps/${selectedSmtp.id}/send-test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ recipient, subject, body })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.success) {
          alert('Email successfully dispatched! Check the recipient\'s inbox.');
          setRecipient('');
          setBody('');
          setShowTestModal(false);
        } else {
          setSendError(data.error || 'Failed to dispatch email');
        }
      } else {
        setSendError(data.error || 'Internal server error');
      }
    } catch (err) {
      setSendError('Network connection error');
    } finally {
      setSendLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: '#94a3b8' }}>Loading SMTP accounts...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>SMTP Profiles</h2>
          <p style={{ color: '#94a3b8' }}>Register external SMTP credentials. Test connection handshakes and dispatch test emails.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add SMTP Profile
        </button>
      </div>

      {/* SMTP Profile List */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Profile Name</th>
              <th>Server Host</th>
              <th>Port</th>
              <th>Auth Username</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {smtps.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                  No SMTP Profiles configured yet. Click "Add SMTP Profile" to register one.
                </td>
              </tr>
            ) : (
              smtps.map((smtp) => (
                <tr key={smtp.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Server size={18} style={{ color: '#00A8FF' }} />
                      {smtp.name}
                    </div>
                  </td>
                  <td><code>{smtp.host}</code></td>
                  <td>
                    <span className="badge badge-secondary" style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                      {smtp.port} {smtp.secure === 1 ? '(SSL)' : ''}
                    </span>
                  </td>
                  <td>{smtp.username}</td>
                  <td>
                    <span className={`badge ${
                      smtp.status === 'verified' ? 'badge-success' : 
                      smtp.status === 'failed' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      <span className="badge-dot"></span> {smtp.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        title="Check Handshake Connection"
                        onClick={() => handleVerifySmtp(smtp.id)}
                        disabled={verifyingId === smtp.id}
                      >
                        {verifyingId === smtp.id ? <RefreshCw size={12} className="animate-spin" /> : 'Verify'}
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        title="Send Test Email"
                        onClick={() => {
                          setSelectedSmtp(smtp);
                          setRecipient('');
                          setBody('');
                          setSendError('');
                          setShowTestModal(true);
                        }}
                      >
                        <Send size={12} />
                        Test Email
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteSmtp(smtp.id, smtp.name)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add SMTP Profile Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Configure SMTP Connection</h3>
            
            {addError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSmtp}>
              <div className="form-group">
                <label>Profile Friendly Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Gmail Server, Corporate Mail, etc." 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>SMTP Host</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="smtp.gmail.com" 
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>SMTP Port</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="587" 
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input 
                  type="checkbox" 
                  id="secure"
                  style={{ cursor: 'pointer' }}
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                />
                <label htmlFor="secure" style={{ margin: 0, cursor: 'pointer' }}>Use SSL Encryption (recommended for Port 465)</label>
              </div>

              <div className="form-group">
                <label>Auth Username (Email Address)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="your.name@gmail.com" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Auth Password (or App Password)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-input" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {showTestModal && selectedSmtp && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <h3 className="modal-title">Send Test Message via {selectedSmtp.name}</h3>

            {sendError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {sendError}
              </div>
            )}

            <form onSubmit={handleSendTestMail}>
              <div className="form-group">
                <label>From: <strong>{selectedSmtp.username}</strong></label>
              </div>

              <div className="form-group">
                <label>Recipient Address (To)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="receiver@example.com" 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Body Text (leave blank to send default template)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '100px', resize: 'vertical' }}
                  placeholder="Write a custom test message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTestModal(false)} disabled={sendLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={sendLoading}>
                  {sendLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
