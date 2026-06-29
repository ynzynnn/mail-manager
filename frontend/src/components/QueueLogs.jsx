import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Mail, 
  Trash2, 
  PlusCircle,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

export default function QueueLogs({ token, API_URL }) {
  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    fetchLogs();

    // Auto-polling for live logs & sending updates
    const interval = setInterval(() => {
      fetchHistory();
      fetchLogs();
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      scrollToBottom();
    }
  }, [logs, activeTab]);

  const scrollToBottom = () => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/logs/transmission`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear the terminal activity log console?')) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateTraffic = async () => {
    try {
      const res = await fetch(`${API_URL}/logs/mock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchHistory();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatLogTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: '#94a3b8' }}>Loading logs and history...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Logs & Send History</h2>
          <p style={{ color: '#94a3b8' }}>Track transmission success/failure logs and monitor connection activity.</p>
        </div>
        
        {/* Simulator Button */}
        <button className="btn btn-primary" onClick={handleSimulateTraffic}>
          <PlusCircle size={18} />
          Simulate Mail Log
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1e293b', marginBottom: '1.5rem', paddingBottom: '1px' }}>
        <button 
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('history')}
        >
          <Mail size={16} />
          Send History ({history.length})
        </button>
        <button 
          className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('logs')}
        >
          <Terminal size={16} />
          Console Logs
        </button>
      </div>

      {/* Send History Tab */}
      {activeTab === 'history' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>SMTP Profile</th>
                <th>Sender</th>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Diagnostic / Error Details</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '3.5rem' }}>
                    No emails sent yet. Try configuring an SMTP profile and send a test email.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.smtp_name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.sender}</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.recipient}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.subject}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>
                        <span className="badge-dot"></span> {item.status === 'sent' ? 'Delivered' : 'Failed'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.error_message}>
                      {item.error_message || '-'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(item.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleClearLogs}>
              <Trash2 size={12} style={{ marginRight: '0.25rem' }} />
              Clear Console Logs
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', color: '#10b981' }}>
              <span className="badge-dot" style={{ backgroundColor: '#10b981', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%' }}></span>
              Live Feed Connected
            </div>
          </div>

          <div className="console-box">
            {logs.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '4rem' }}>No log messages recorded yet</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="console-line">
                  <span className="time">[{formatLogTime(log.timestamp)}]</span>
                  <span className="component">{log.component}:</span>
                  <span className={`level-${log.level.toLowerCase()}`} style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>
                    [{log.level}]
                  </span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
