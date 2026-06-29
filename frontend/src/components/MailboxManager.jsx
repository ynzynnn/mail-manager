import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Key, 
  Settings, 
  Check, 
  UserPlus, 
  Power,
  RefreshCw,
  Sliders
} from 'lucide-react';

export default function MailboxManager({ token, API_URL }) {
  const [mailboxes, setMailboxes] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddMailboxModal, setShowAddMailboxModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddAliasModal, setShowAddAliasModal] = useState(false);

  // Add Mailbox Form State
  const [newUsername, setNewUsername] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newQuotaGb, setNewQuotaGb] = useState(2); // default 2GB
  const [mailboxError, setMailboxError] = useState('');

  // Edit Mailbox State
  const [selectedMailbox, setSelectedMailbox] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [editQuotaGb, setEditQuotaGb] = useState(2);
  const [editError, setEditError] = useState('');

  // Add Alias Form State
  const [aliasSource, setAliasSource] = useState('');
  const [aliasDest, setAliasDest] = useState('');
  const [aliasError, setAliasError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch Mailboxes
      const resMailboxes = await fetch(`${API_URL}/mailboxes`, { headers });
      const dataMailboxes = await resMailboxes.json();
      
      // Fetch Aliases
      const resAliases = await fetch(`${API_URL}/aliases`, { headers });
      const dataAliases = await resAliases.json();
      
      // Fetch Domains (to populate select list)
      const resDomains = await fetch(`${API_URL}/domains`, { headers });
      const dataDomains = await resDomains.json();

      if (resMailboxes.ok) setMailboxes(dataMailboxes);
      if (resAliases.ok) setAliases(dataAliases);
      if (resDomains.ok) {
        setDomains(dataDomains);
        if (dataDomains.length > 0) {
          setNewDomain(dataDomains[0].name);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleAddMailbox = async (e) => {
    e.preventDefault();
    setMailboxError('');

    if (!newUsername || !newDomain || !newPassword) {
      setMailboxError('Please fill in all fields');
      return;
    }

    const quota_bytes = newQuotaGb * 1024 * 1024 * 1024;

    try {
      const res = await fetch(`${API_URL}/mailboxes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          username: newUsername.trim().toLowerCase(), 
          domain: newDomain, 
          password: newPassword,
          quota_bytes 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewUsername('');
        setNewPassword('');
        setNewQuotaGb(2);
        setShowAddMailboxModal(false);
        fetchData();
      } else {
        setMailboxError(data.error || 'Failed to create mailbox');
      }
    } catch (err) {
      setMailboxError('Network connection error');
    }
  };

  const handleEditMailboxSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    const quota_bytes = editQuotaGb * 1024 * 1024 * 1024;
    const body = { quota_bytes };
    if (editPassword) {
      body.password = editPassword;
    }

    try {
      const res = await fetch(`${API_URL}/mailboxes/${selectedMailbox.email}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setEditPassword('');
        setShowEditModal(false);
        fetchData();
      } else {
        const data = await res.json();
        setEditError(data.error || 'Failed to update mailbox');
      }
    } catch (err) {
      setEditError('Network connection error');
    }
  };

  const handleToggleStatus = async (email, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`${API_URL}/mailboxes/${email}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMailbox = async (email) => {
    if (!window.confirm(`Are you sure you want to permanently delete the mailbox ${email}? All emails in the inbox will be lost.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/mailboxes/${email}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAlias = async (e) => {
    e.preventDefault();
    setAliasError('');

    if (!aliasSource || !aliasDest) {
      setAliasError('Please fill in both fields');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/aliases`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          source_email: aliasSource.trim().toLowerCase(), 
          destination_email: aliasDest.trim().toLowerCase() 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAliasSource('');
        setAliasDest('');
        setShowAddAliasModal(false);
        fetchData();
      } else {
        setAliasError(data.error || 'Failed to create virtual alias');
      }
    } catch (err) {
      setAliasError('Network connection error');
    }
  };

  const handleDeleteAlias = async (source_email) => {
    if (!window.confirm(`Are you sure you want to delete alias forwarding rule from ${source_email}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/aliases/${source_email}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getQuotaPercent = (used, quota) => {
    if (!quota) return 0;
    return Math.min(100, Math.round((used / quota) * 100));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: '#94a3b8' }}>Loading mail accounts...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Mailboxes & Accounts</h2>
          <p style={{ color: '#94a3b8' }}>Manage virtual mailboxes, SMTP login credentials, quotas and forwardings.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowAddAliasModal(true)}
            disabled={domains.length === 0}
          >
            <Plus size={18} />
            Create Alias
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (domains.length === 0) {
                alert('Please add a domain first before creating mail accounts.');
                return;
              }
              setShowAddMailboxModal(true);
            }}
          >
            <UserPlus size={18} />
            New Mailbox
          </button>
        </div>
      </div>

      {domains.length === 0 && (
        <div style={{ 
          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
          color: '#f59e0b', 
          border: '1px solid rgba(245, 158, 11, 0.2)', 
          padding: '1rem', 
          borderRadius: '10px', 
          marginBottom: '2rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <ShieldAlert size={20} />
          <span>You need to configure a <strong>Domain Name</strong> before creating mailboxes. Head to the domains tab first.</span>
        </div>
      )}

      {/* Mailbox List */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#f8fafc' }}>Active Mailboxes</h3>
      <div className="table-container" style={{ marginBottom: '3rem' }}>
        <table>
          <thead>
            <tr>
              <th>Email Address</th>
              <th>Quota & Storage Usage</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                  No mailboxes created yet. Click "New Mailbox" to register one.
                </td>
              </tr>
            ) : (
              mailboxes.map((mb) => {
                const percent = getQuotaPercent(mb.bytes_used, mb.quota_bytes);
                return (
                  <tr key={mb.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Mail size={16} style={{ color: '#00A8FF' }} />
                        {mb.email}
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '280px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                          <span>{formatBytes(mb.bytes_used)} of {formatBytes(mb.quota_bytes)}</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="stat-bar-container" style={{ height: '5px' }}>
                          <div 
                            className="stat-bar" 
                            style={{ 
                              width: `${percent}%`,
                              background: percent > 85 ? 'var(--danger)' : percent > 60 ? 'var(--warning)' : 'var(--color-primary)'
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${mb.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        <span className="badge-dot"></span> {mb.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          title="Suspend/Activate"
                          onClick={() => handleToggleStatus(mb.email, mb.status)}
                        >
                          <Power size={12} style={{ color: mb.status === 'active' ? '#ef4444' : '#10b981' }} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedMailbox(mb);
                            setEditQuotaGb(Math.round(mb.quota_bytes / 1024 / 1024 / 1024));
                            setShowEditModal(true);
                          }}
                        >
                          <Settings size={12} />
                          Edit
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteMailbox(mb.email)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Aliases List */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#f8fafc' }}>Virtual Forwarding Aliases</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Sender / Source Address</th>
              <th>Destination Redirects To</th>
              <th>Domain</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {aliases.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                  No virtual mail aliases or forwarders defined.
                </td>
              </tr>
            ) : (
              aliases.map((al) => (
                <tr key={al.id}>
                  <td>
                    <strong style={{ color: '#00A8FF' }}>{al.source_email}</strong>
                  </td>
                  <td>{al.destination_email}</td>
                  <td><code>{al.domain}</code></td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteAlias(al.source_email)}
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Mailbox */}
      {showAddMailboxModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Create Mail Account</h3>
            
            {mailboxError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {mailboxError}
              </div>
            )}

            <form onSubmit={handleAddMailbox}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'end', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Username</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="john.doe" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>
                <div style={{ paddingBottom: '0.65rem', fontSize: '1.25rem', color: '#64748b' }}>@</div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Domain</label>
                  <select 
                    className="form-input"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                  >
                    {domains.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    title="Generate Password"
                    onClick={() => setNewPassword(generateRandomPassword())}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Mailbox Storage Limit: <strong style={{ color: '#00A8FF' }}>{newQuotaGb} GB</strong></label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  className="form-input"
                  style={{ padding: 0 }}
                  value={newQuotaGb} 
                  onChange={(e) => setNewQuotaGb(parseInt(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  <span>1 GB</span>
                  <span>5 GB</span>
                  <span>10 GB</span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMailboxModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Mailbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Mailbox (Quota / Password) */}
      {showEditModal && selectedMailbox && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Configure Mailbox: {selectedMailbox.email}</h3>

            {editError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditMailboxSubmit}>
              <div className="form-group">
                <label>Reset Password (leave empty to keep current)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="New password" 
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setEditPassword(generateRandomPassword())}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Adjust Storage Quota: <strong style={{ color: '#00A8FF' }}>{editQuotaGb} GB</strong></label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  className="form-input"
                  style={{ padding: 0 }}
                  value={editQuotaGb} 
                  onChange={(e) => setEditQuotaGb(parseInt(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  <span>1 GB</span>
                  <span>5 GB</span>
                  <span>10 GB</span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Alias */}
      {showAddAliasModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">New Forwarding Alias</h3>

            {aliasError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {aliasError}
              </div>
            )}

            <form onSubmit={handleAddAlias}>
              <div className="form-group">
                <label>Source Address (Email which receives mail)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="info@yourdomain.com" 
                  value={aliasSource}
                  onChange={(e) => setAliasSource(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Destination Address (Where emails will redirect to)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="personal.email@gmail.com" 
                  value={aliasDest}
                  onChange={(e) => setAliasDest(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddAliasModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Forward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
