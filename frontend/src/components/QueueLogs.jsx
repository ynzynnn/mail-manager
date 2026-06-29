import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Trash2, 
  Terminal, 
  Mail, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  RefreshCw,
  PlusCircle
} from 'lucide-react';

export default function QueueLogs({ token, API_URL }) {
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    fetchQueue();
    fetchLogs();
    
    // Auto polling for live logs & queue updates
    const interval = setInterval(() => {
      fetchQueue();
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

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${API_URL}/queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
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

  const handleFlushQueue = async () => {
    try {
      const res = await fetch(`${API_URL}/queue/flush`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.message);
      fetchQueue();
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearQueue = async () => {
    if (!window.confirm('Are you sure you want to delete ALL messages in the SMTP queue?')) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/queue/clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      fetchQueue();
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (id) => {
    try {
      const res = await fetch(`${API_URL}/queue/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchQueue();
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
        fetchLogs();
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatLogTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: '#94a3b8' }}>Loading queue and logs...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>SMTP Queue & Server Logs</h2>
          <p style={{ color: '#94a3b8' }}>Monitor real-time mail transactions, flush pending SMTP queue items, and debug delivery issues.</p>
        </div>
        
        {/* Simulator Button */}
        <button className="btn btn-primary" onClick={handleSimulateTraffic}>
          <PlusCircle size={18} />
          Simulate SMTP Traffic
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1e293b', marginBottom: '1.5rem', paddingBottom: '1px' }}>
        <button 
          className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('queue')}
        >
          <Mail size={16} />
          SMTP Queue ({queue.length})
        </button>
        <button 
          className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('logs')}
        >
          <Terminal size={16} />
          Server Logs
        </button>
      </div>

      {/* Queue View */}
      {activeTab === 'queue' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleFlushQueue}
              disabled={queue.length === 0}
            >
              <Play size={14} style={{ color: '#00A8FF' }} />
              Flush Queue
            </button>
            <button 
              className="btn btn-danger btn-sm"
              onClick={handleClearQueue}
              disabled={queue.length === 0}
            >
              <Trash2 size={14} />
              Purge Queue
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Queue ID</th>
                  <th>Sender</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Err Description / Diagnostic</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '3.5rem' }}>
                      SMTP Queue is currently empty. No messages delayed or on hold.
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => (
                    <tr key={item.id}>
                      <td><code>{item.message_id}</code></td>
                      <td style={{ fontSize: '0.85rem' }}>{item.sender}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.recipient}</td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.subject}
                      </td>
                      <td>{formatBytes(item.size_bytes)}</td>
                      <td>
                        <span className={`badge ${
                          item.status === 'active' ? 'badge-success' : 
                          item.status === 'deferred' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          <span className="badge-dot"></span> {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.error_message}>
                        {item.error_message || '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-danger btn-sm"
                          title="Delete from Queue"
                          onClick={() => handleDeleteMessage(item.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeTab === 'logs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Showing last 100 entries of Postfix / Dovecot logger.</span>
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
