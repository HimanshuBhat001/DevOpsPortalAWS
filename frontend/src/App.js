import { useState } from 'react';
import './index.css';
import Login from './pages/login';
import Dashboard from './pages/Dash';
import Deploy from './pages/Deploy';
import Chat from './pages/Chat';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [token, setToken] = useState(null);

  return (
    <>
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />

      <nav>
        <div className="nav-inner">
          <div className="logo">
            <div className="logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#050810" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            Dev<span>Ops</span> Portal
          </div>

          <div className="nav-links">
            {['dashboard','deploy','chat','login'].map(p => (
              <button
                key={p}
                className={`nav-link ${page === p ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="nav-status">
            <div className="status-dot" />
            {token ? 'AUTHENTICATED' : 'SYSTEM ONLINE'}
          </div>
        </div>
      </nav>

      <div className="container">
        {page === 'dashboard' && <Dashboard />}
        {page === 'deploy'    && <Deploy token={token} />}
        {page === 'chat'      && <Chat />}
        {page === 'login'     && <Login onLogin={setToken} />}
      </div>
    </>
  );
}