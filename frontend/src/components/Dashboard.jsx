import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Mail, 
  List, 
  Activity, 
  ShieldCheck, 
  HardDrive, 
  Zap 
} from 'lucide-react';

export default function Dashboard({ token, API_URL, sysStatus }) {
  const [stats, setStats] = useState({
    domains: 0,
    mailboxes: 0,
    aliases: 0,
    queue: 0,
    storage: { total: 0, used: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
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
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    if (!stats.storage.total) return 0;
    return Math.min(100, Math.round((stats.storage.used / stats.storage.total) * 100));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: '#94a3b8' }}>Loading server statistics...</p>
      </div>
    );
  }

  // Draw smooth SVG path for SMTP Traffic
  const getSvgPath = () => {
    if (!sysStatus.traffic || sysStatus.traffic.length === 0) return '';
    const width = 600;
    const height = 150;
    const maxVal = Math.max(...sysStatus.traffic.flatMap(t => [t.sent, t.received]), 100);
    
    // Scale values
    const points = sysStatus.traffic.map((t, idx) => {
      const x = (idx / (sysStatus.traffic.length - 1)) * (width - 40) + 20;
      const ySent = height - ((t.sent / maxVal) * (height - 40) + 20);
      const yReceived = height - ((t.received / maxVal) * (height - 40) + 20);
      return { x, ySent, yReceived };
    });

    const sentPath = `M ${points[0].x} ${points[0].ySent} ` + points.slice(1).map(p => `L ${p.x} ${p.ySent}`).join(' ');
    const receivedPath = `M ${points[0].x} ${points[0].yReceived} ` + points.slice(1).map(p => `L ${p.x} ${p.yReceived}`).join(' ');

    return { sentPath, receivedPath, points };
  };

  const { sentPath, receivedPath, points } = getSvgPath();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>SMTP Server Overview</h2>
        <p style={{ color: '#94a3b8' }}>Real-time SMTP status and queue monitor.</p>
      </div>

      {/* Counters Grid */}
      <div className="card-grid">
        <div className="card">
          <div className="card-header-row">
            <span className="card-title">SMTP Domains</span>
            <div className="icon-wrapper">
              <Globe size={20} />
            </div>
          </div>
          <div className="card-value">{stats.domains}</div>
          <div className="card-desc">Active sending domains configured</div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <span className="card-title">SMTP Accounts</span>
            <div className="icon-wrapper blue">
              <Mail size={20} />
            </div>
          </div>
          <div className="card-value">{stats.mailboxes}</div>
          <div className="card-desc">Active SMTP authentication credentials</div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <span className="card-title">Routing Aliases</span>
            <div className="icon-wrapper success">
              <List size={20} />
            </div>
          </div>
          <div className="card-value">{stats.aliases}</div>
          <div className="card-desc">Virtual redirection rules mapped</div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <span className="card-title">SMTP Mail Queue</span>
            <div className="icon-wrapper warning">
              <Activity size={20} />
            </div>
          </div>
          <div className="card-value">{stats.queue}</div>
          <div className="card-desc">Messages currently in delivery queue</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Traffic Chart Card */}
        <div className="panel-card" style={{ padding: '1.5rem', margin: 0 }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} style={{ color: '#00A8FF' }} />
            SMTP Outbound & Inbound Email Activity
          </h3>

          <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden' }}>
            {sysStatus.traffic && sysStatus.traffic.length > 0 ? (
              <svg viewBox="0 0 600 150" width="100%" height="100%" preserveAspectRatio="none">
                {/* Grids */}
                <line x1="20" y1="20" x2="580" y2="20" stroke="#1e293b" strokeDasharray="3,3" />
                <line x1="20" y1="75" x2="580" y2="75" stroke="#1e293b" strokeDasharray="3,3" />
                <line x1="20" y1="130" x2="580" y2="130" stroke="#1e293b" strokeDasharray="3,3" />
                
                {/* Paths */}
                <path d={sentPath} fill="none" stroke="#00A8FF" strokeWidth="2.5" strokeLinecap="round" />
                <path d={receivedPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />

                {/* Points */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.ySent} r="4" fill="#00A8FF" />
                    <circle cx={p.x} cy={p.yReceived} r="4" fill="#2563eb" />
                  </g>
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

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#00A8FF' }}></span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>SMTP Outbound (Sent)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#2563eb' }}></span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>SMTP Inbound (Received)</span>
            </div>
          </div>
        </div>

        {/* Server & Storage Info Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel-card" style={{ padding: '1.5rem', margin: 0, flex: 1 }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HardDrive size={18} style={{ color: '#00A8FF' }} />
              Queue & Log Storage
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Disk Space Allocation</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{getStoragePercentage()}%</span>
            </div>
            
            <div className="stat-bar-container" style={{ height: '10px', marginBottom: '1rem' }}>
              <div 
                className="stat-bar" 
                style={{ 
                  width: `${getStoragePercentage()}%`, 
                  background: 'linear-gradient(90deg, #00A8FF, #2563eb)' 
                }}
              ></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Provisioned Max Quota:</span>
                <span>{formatBytes(stats.storage.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Queue & Log Bytes Used:</span>
                <span>{formatBytes(stats.storage.used)}</span>
              </div>
            </div>
          </div>

          <div className="panel-card" style={{ padding: '1.5rem', margin: 0 }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} style={{ color: '#10b981' }} />
              SMTP Daemon Ports
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8' }}>SMTP Mail Transport (Postfix)</span>
                <span className="badge badge-success"><span className="badge-dot"></span> Port 25</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8' }}>SMTP Submission (Postfix TLS)</span>
                <span className="badge badge-success"><span className="badge-dot"></span> Port 587</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8' }}>SMTP Secure SSL (Postfix)</span>
                <span className="badge badge-success"><span className="badge-dot"></span> Port 465</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
