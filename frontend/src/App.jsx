import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DomainManager from './components/DomainManager';
import MailboxManager from './components/MailboxManager';
import QueueLogs from './components/QueueLogs';
import { 
  Server, 
  Globe, 
  Mail, 
  List, 
  LogOut, 
  ShieldCheck,
  Cpu,
  HardDrive
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [sysStatus, setSysStatus] = useState({ cpu: 0, ram: 0, disk: 0, uptime: '' });

  // API base URL
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchSystemStatus();
      const interval = setInterval(fetchSystemStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard/system-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSysStatus(data);
      }
    } catch (err) {
      console.error('Error fetching system status:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (err) {
      setAuthError('Connection error to backend server');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setActiveView('dashboard');
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="gradient-bg">
          <div className="gradient-circle-1"></div>
          <div className="gradient-circle-2"></div>
        </div>
        
        <div className="login-card">
          <div className="login-logo">
            <span>SEPTACLOUD</span> Mail
          </div>
          <div className="login-title">Mail Server Manager</div>
          
          {authError && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '0.75rem', 
              borderRadius: '8px', 
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontWeight: 'bold' }}>Error:</span> {authError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input 
                type="text" 
                id="username"
                className="form-input" 
                placeholder="admin" 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password"
                className="form-input" 
                placeholder="••••••••" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Sign In to Mail Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="gradient-bg">
        <div className="gradient-circle-1"></div>
        <div className="gradient-circle-2"></div>
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>SEPTACLOUD</span> Mail
        </div>
        
        <ul className="sidebar-menu">
          <li>
            <a 
              className={`menu-item ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              <Server size={18} />
              Dashboard
            </a>
          </li>
          <li>
            <a 
              className={`menu-item ${activeView === 'domains' ? 'active' : ''}`}
              onClick={() => setActiveView('domains')}
            >
              <Globe size={18} />
              Domains
            </a>
          </li>
          <li>
            <a 
              className={`menu-item ${activeView === 'mailboxes' ? 'active' : ''}`}
              onClick={() => setActiveView('mailboxes')}
            >
              <Mail size={18} />
              Mailboxes & Accounts
            </a>
          </li>
          <li>
            <a 
              className={`menu-item ${activeView === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveView('queue')}
            >
              <List size={18} />
              Queue & Logs
            </a>
          </li>
        </ul>

        {/* System Health Widget */}
        <div className="system-widget">
          <div className="system-widget-title">Server Metrics</div>
          
          <div className="system-stat-row">
            <div className="stat-info">
              <span>CPU Usage</span>
              <span>{sysStatus.cpu}%</span>
            </div>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${sysStatus.cpu}%` }}></div>
            </div>
          </div>
          
          <div className="system-stat-row">
            <div className="stat-info">
              <span>Memory Usage</span>
              <span>{sysStatus.ram}%</span>
            </div>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${sysStatus.ram}%`, background: 'linear-gradient(90deg, #2563eb, #8b5cf6)' }}></div>
            </div>
          </div>
          
          <div className="system-stat-row">
            <div className="stat-info">
              <span>Disk Storage</span>
              <span>{sysStatus.disk}%</span>
            </div>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${sysStatus.disk}%`, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }}></div>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div>Signed in as: <strong>{user?.username}</strong></div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Role: Administrator</div>
        </div>
      </aside>

      {/* Glass Header */}
      <header className="glass-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} className="text-primary" style={{ color: '#00A8FF' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#94a3b8' }}>
            Postfix + Dovecot SMTP Server Active
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Uptime: {sysStatus.uptime || 'Loading...'}
          </span>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeView === 'dashboard' && <Dashboard token={token} API_URL={API_URL} sysStatus={sysStatus} />}
        {activeView === 'domains' && <DomainManager token={token} API_URL={API_URL} />}
        {activeView === 'mailboxes' && <MailboxManager token={token} API_URL={API_URL} />}
        {activeView === 'queue' && <QueueLogs token={token} API_URL={API_URL} />}
      </main>
    </div>
  );
}
