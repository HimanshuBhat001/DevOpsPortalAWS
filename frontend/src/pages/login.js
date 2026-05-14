import { useState } from 'react';
import { loginUser } from '../api';
export default function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('var(--muted)');

  const handleLogin = async () => {
    setStatus('Authenticating...');
    setStatusColor('var(--accent)');
    try {
      const data = await loginUser(username, password);
      if (data.token) {
        onLogin(data.token);
        setStatus('✓ Authenticated! Token stored.');
        setStatusColor('var(--success)');
      } else {
        setStatus('✗ ' + (data.msg || 'Invalid credentials'));
        setStatusColor('var(--danger)');
      }
    } catch {
      setStatus('✗ Cannot reach backend at localhost:5000');
      setStatusColor('var(--danger)');
    }
  };

  return (
    <div style={{ paddingTop: 120, maxWidth: 480, margin: '0 auto' }}>
      <div className="panel">
        <div className="panel-title">// AUTHENTICATE</div>

        <div className="form-group">
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <button className="btn" onClick={handleLogin}>AUTHENTICATE →</button>

        {status && (
          <p style={{ marginTop: 14, fontFamily: "'Space Mono', monospace", fontSize: 12,
            color: statusColor, textAlign: 'center' }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}