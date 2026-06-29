import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Clipboard, 
  ClipboardCheck 
} from 'lucide-react';

export default function DomainManager({ token, API_URL }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDnsDrawer, setShowDnsDrawer] = useState(null); // stores the domain object
  const [copiedField, setCopiedField] = useState(null);

  // New Domain form state
  const [domainName, setDomainName] = useState('');
  const [dkimSelector, setDkimSelector] = useState('default');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await fetch(`${API_URL}/domains`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!domainName) {
      setErrorMsg('Domain name is required');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/domains`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: domainName.toLowerCase(), dkim_selector: dkimSelector })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setDomainName('');
        setDkimSelector('default');
        fetchDomains();
        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMsg('');
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Failed to create domain');
      }
    } catch (err) {
      setErrorMsg('Network error connecting to backend');
    }
  };

  const handleDeleteDomain = async (name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will remove SPF/DKIM records associated with it.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/domains/${name}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchDomains();
      } else {
        alert(data.error || 'Failed to delete domain');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: '#94a3b8' }}>Loading domains...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Mail Domains</h2>
          <p style={{ color: '#94a3b8' }}>Configure sending domains, SPF, DKIM and DMARC credentials.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add Domain
        </button>
      </div>

      {/* Domain Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Domain Name</th>
              <th>DKIM Selector</th>
              <th>Status</th>
              <th>DNS Verification</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                  No domains configured yet. Click "Add Domain" to get started.
                </td>
              </tr>
            ) : (
              domains.map((domain) => (
                <tr key={domain.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Globe size={18} style={{ color: '#00A8FF' }} />
                      {domain.name}
                    </div>
                  </td>
                  <td><code>{domain.dkim_selector}</code></td>
                  <td>
                    <span className="badge badge-success">
                      <span className="badge-dot"></span> Active
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowDnsDrawer(domain)}
                    >
                      Show DNS Configuration
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteDomain(domain.name)}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Configure New Mail Domain</h3>
            {errorMsg && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {successMsg}
              </div>
            )}
            <form onSubmit={handleAddDomain}>
              <div className="form-group">
                <label>Domain Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="example.com" 
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>DKIM Selector</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="default" 
                  value={dkimSelector}
                  onChange={(e) => setDkimSelector(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DNS Configuration Drawer/Modal */}
      {showDnsDrawer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>DNS Settings for {showDnsDrawer.name}</h3>
              <button 
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setShowDnsDrawer(null)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Add these DNS records to your domain registrar (e.g. Cloudflare, Namecheap) to verify ownership and ensure high SMTP deliverability.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* MX Record */}
              <div className="dns-item">
                <div className="dns-header">
                  <span>MX Record (Mail Exchange)</span>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ padding: '0.2rem 0.5rem' }}
                    onClick={() => copyToClipboard(`mail.${showDnsDrawer.name}`, 'mx')}
                  >
                    {copiedField === 'mx' ? <ClipboardCheck size={14} style={{ color: '#10b981' }} /> : <Clipboard size={14} />}
                    {copiedField === 'mx' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <div>Type: <strong>MX</strong></div>
                  <div>Host: <strong>@</strong></div>
                  <div>Priority: <strong>10</strong></div>
                </div>
                <div className="dns-value-box">mail.{showDnsDrawer.name}</div>
              </div>

              {/* SPF Record */}
              <div className="dns-item">
                <div className="dns-header">
                  <span>SPF Record (Sender Policy Framework)</span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem' }}
                    onClick={() => copyToClipboard(showDnsDrawer.spf_value, 'spf')}
                  >
                    {copiedField === 'spf' ? <ClipboardCheck size={14} style={{ color: '#10b981' }} /> : <Clipboard size={14} />}
                    {copiedField === 'spf' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <div>Type: <strong>TXT</strong></div>
                  <div>Host: <strong>@</strong></div>
                  <div>TTL: <strong>Auto</strong></div>
                </div>
                <div className="dns-value-box">{showDnsDrawer.spf_value}</div>
              </div>

              {/* DKIM Record */}
              <div className="dns-item">
                <div className="dns-header">
                  <span>DKIM Record (DomainKeys Identified Mail)</span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem' }}
                    onClick={() => copyToClipboard(showDnsDrawer.dkim_public, 'dkim')}
                  >
                    {copiedField === 'dkim' ? <ClipboardCheck size={14} style={{ color: '#10b981' }} /> : <Clipboard size={14} />}
                    {copiedField === 'dkim' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 200px 1fr', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <div>Type: <strong>TXT</strong></div>
                  <div>Host: <strong>{showDnsDrawer.dkim_selector}._domainkey</strong></div>
                </div>
                <div className="dns-value-box" style={{ maxHeight: '70px', overflowY: 'auto' }}>{showDnsDrawer.dkim_public}</div>
              </div>

              {/* DMARC Record */}
              <div className="dns-item">
                <div className="dns-header">
                  <span>DMARC Record</span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem' }}
                    onClick={() => copyToClipboard(showDnsDrawer.dmarc_value, 'dmarc')}
                  >
                    {copiedField === 'dmarc' ? <ClipboardCheck size={14} style={{ color: '#10b981' }} /> : <Clipboard size={14} />}
                    {copiedField === 'dmarc' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 150px 1fr', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <div>Type: <strong>TXT</strong></div>
                  <div>Host: <strong>_dmarc</strong></div>
                </div>
                <div className="dns-value-box">{showDnsDrawer.dmarc_value}</div>
              </div>

            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowDnsDrawer(null)}>
                Done Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
