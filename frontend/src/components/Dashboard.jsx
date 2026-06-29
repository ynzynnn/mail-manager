import React, { useState, useEffect } from 'react';
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  Activity, 
  HardDrive, 
  Zap,
  RefreshCw
} from 'lucide-react';

export default function Dashboard({ token, API_URL, sysStatus }) {
  const [stats, setStats] = useState({
    total_smtps: 0,
    active_smtps: 0,
    total_sent: 0,
    total_failed: 0
  });
  const [smtpList, setSmtpList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchSmtps();
    const interval = setInterval(() => {
      fetchStats();
      fetchSmtps();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSmtps = async () => {
    try {
      const res = await fetch(`${API_URL}/smtps`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSmtpList(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching smtps:', err);
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
        fetchStats();
      }
    } catch (err) {
      alert('Verification request failed. Connection error.');
    } finally {
      setVerifyingId(null);
    }
  };

  const getSuccessRate = () => {
    const total = stats.total_sent + stats.total_failed;
    if (total === 0) return 0;
    return Math.round((stats.total_sent / total) * 100);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: '#94a3b8' }}>Loading SMTP dashboard...</p>
      </div>
    );
  }

  // Draw smooth SVG path for SMTP activity
  const getSvgPath = () => {
    if (!sysStatus.traffic || sysStatus.traffic.length === 0) return '';
    const width = 600;
    const height = 150;
    const maxVal = Math.max(...sysStatus.traffic.map(t => t.sent), 50);
    
    const points = sysStatus.traffic.map((t, idx) => {
      const x = (idx / (sysStatus.traffic.length - 1)) * (width - 40) + 20;
      const ySent = height - ((t.sent / maxVal) * (height - 40) + 20);
      return { x, ySent };
    });

    const sentPath = `M ${points[0].x} ${points[0].ySent} ` + points.slice(1).map(p => `L ${p.x} ${p.ySent}`).join(' ');
    return { sentPath, points };
  };

  const { sentPath, points } = getSvgPath();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>SMTP Dashboard</h2>
        <p style={{ color: '#94a3b8' }}>Monitor SMTP server connectivity profiles, send history, and connection handshakes.</p>
      </div>

      {/* Counters Grid */}
      <div className="card-grid">
        <div className="card">
          <div className="card-header-row">
            <span className="card-title">SMTP Configurations</span>
            <div className="icon-wrapper">
              <Server size={20} />
            </div>
          </div>
          <div className="card-value">{stats.total_smtps}</div>
          <div className="card-desc">Total registered profiles</div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <span className="card-title">Verified Servers</span>
            <div className="icon-wrapper success">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="card-value">{stats.active_smtps}</div>
          <div className="card-desc">Handshake verified online</div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <span className="card-title">Emails Delivered</span>
            <div className="icon-wrapper blue">
              <Activity size={20} />
            </div>
          </div>
          <div className="card-value">{stats.total_sent}</div>
          <div className="card-desc">Successful SMTP dispatches</div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <span className="card-title">Failed Dispatches</span>
            <div className="icon-wrapper warning" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <XCircle size={20} />
            </div>
          </div>
          <div className="card-value">{stats.total_failed}</div>
          <div className="card-desc">Errors / handshakes refused</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Activity Chart */}
        <div className="panel-card" style={{ padding: '1.5rem', margin: 0 }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} style={{ color: '#00A8FF' }} />
            SMTP Outgoing Dispatch Load (Hourly Activity)
          </h3>

          <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden' }}>
            {sysStatus.traffic && sysStatus.traffic.length > 0 ? (
              <svg viewBox="0 0 600 150" width="100%" height="100%" preserveAspectRatio="none">
                <line x1="20" y1="20" x2="580" y2="20" stroke="#1e293b" strokeDasharray="3,3" />
                <line x1="20" y1="75" x2="580" y2="75" stroke="#1e293b" strokeDasharray="3,3" />
                <line x1="20" y1="130" x2="580" y2="130" stroke="#1e293b" strokeDasharray="3,3" />
                
                <path d={sentPath} fill="none" stroke="#00A8FF" strokeWidth="2.5" strokeLinecap="round" />

                {points.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.ySent} r="4" fill="#00A8FF" />
                ))}
              </svg>
            ) : (
              <p style={{ color: '#64748b', textAlign: 'center', paddingTop: '4rem' }}>No recent traffic recorded</p>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', padding: '0 0.5rem' }}>
            {sysStatus.traffic?.map((t, idx) => (
              <span key={idx} style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.hour}</span>
            ))}
          </div>
        </div>

        {/* Deliverability Rating Card */}
        <div className="panel-card" style={{ padding: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', alignSelf: 'flex-start' }}>Deliverability Success</h3>
          
          <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                fill="none" 
                stroke="#00A8FF" 
                strokeWidth="10" 
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - getSuccessRate() / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>
              {getSuccessRate()}%
            </div>
          </div>
          
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
            Total Email Dispatches: {(stats.total_sent + stats.total_failed).toLocaleString()}
          </div>
        </div>
      </div>

      {/* SMTP Profile Status List */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#f8fafc' }}>Registered Connections Status</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Profile Name</th>
              <th>SMTP Host & Port</th>
              <th>Auth Username</th>
              <th>Handshake Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {smtpList.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                  No SMTP profiles configured. Navigate to SMTP Profiles to add one.
                </td>
              </tr>
            ) : (
              smtpList.map((smtp) => (
                <tr key={smtp.id}>
                  <td style={{ fontWeight: 600 }}>{smtp.name}</td>
                  <td><code>{smtp.host}:{smtp.port}</code> {smtp.secure === 1 ? '(SSL)' : ''}</td>
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
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleVerifySmtp(smtp.id)}
                      disabled={verifyingId === smtp.id}
                    >
                      {verifyingId === smtp.id ? <RefreshCw size={12} className="animate-spin" /> : 'Check Connection'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
