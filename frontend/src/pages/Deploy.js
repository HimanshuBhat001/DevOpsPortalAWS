import { useState, useEffect } from 'react';
import { deployRepo, fetchLogs } from '../api';

export default function Deploy({ token }) {
  const [repo, setRepo]     = useState('');
  const [branch, setBranch] = useState('main');
  const [p1, setP1] = useState(0);
  const [p2, setP2] = useState(0);
  const [p3, setP3] = useState(0);
  const [logs, setLogs]     = useState([]);
  const [status, setStatus] = useState('');
  const [started, setStarted] = useState(false);

  const addLog = (type, msg) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setLogs(prev => [...prev, { time, type, msg }]);
  };

  // 🔥 POLLING LOGIC (NO SOCKETS)
  useEffect(() => {
    if (!started) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchLogs();

        if (!data.logs) return;

        // show last few logs only (avoid duplicates spam)
        const latestLogs = data.logs.slice(-5);

        latestLogs.forEach(line => {
          addLog("info", line);
        });

        // 🔥 Detect success
        const lastLog = data.logs[data.logs.length - 1] || "";

        if (lastLog.includes("DEPLOY SUCCESS")) {
          addLog("success", "🎉 Deployment SUCCESS");
          setStatus("✅ Deployment SUCCESS");
          setStarted(false);
          clearInterval(interval);
        }

      } catch (err) {
        console.error(err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [started]);

  const animateBar = (setter, duration) =>
    new Promise(resolve => {
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setter(Math.round(p * 100));
        if (p < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });

  const handleDeploy = async () => {
    if (!token) { setStatus('⚠ Please login first!'); return; }
    if (!repo)  { setStatus('⚠ Enter a repository URL'); return; }

    setStatus('');
    setP1(0); setP2(0); setP3(0);
    setLogs([]);
    setStarted(true);

    addLog('info', `→ Starting deployment of ${repo} @ ${branch}`);
    await animateBar(setP1, 1200);
    addLog('success', '[OK] Repository cloned');

    await animateBar(setP2, 1500);
    addLog('success', '[OK] Dependencies installed');

    await animateBar(setP3, 1800);
    addLog('info', '→ Calling backend...');

    try {
      const data = await deployRepo(token, repo, branch);
      addLog('success', '[OK] ' + (data.msg || 'Deployment started!'));
      addLog('info', `→ Deploy ID: #${data.id || '—'}`);
      setStatus('🚀 Deployment in progress...');
    } catch {
      addLog('warn', '⚠ Backend unreachable — check server');
      setStatus('⚠ Backend unreachable');
    }
  };

  return (
    <div style={{ paddingTop:100, paddingBottom:60 }}>
      <div style={{ marginBottom:32 }}>
        <h2 style={{ fontSize:32, fontWeight:800, letterSpacing:-1, marginBottom:8 }}>
          Deploy a <span style={{ color:'var(--accent)' }}>Repository</span>
        </h2>
        <p style={{ color:'var(--muted)', fontFamily:"'Space Mono',monospace", fontSize:13 }}>
          Push your code to the server. Metrics update automatically after deploy.
        </p>
      </div>

      <div className="panels-grid">
        <div className="panel">
          <div className="panel-tag"><div className="tag-dot" />DEPLOY CONFIG</div>

          <div className="form-group">
            <label>Repository URL</label>
            <input value={repo} onChange={e => setRepo(e.target.value)} placeholder="https://github.com/user/repo" />
          </div>

          <div className="form-group">
            <label>Branch</label>
            <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" />
          </div>

          <button className="btn" onClick={handleDeploy}>DEPLOY →</button>

          {status && (
            <p style={{
              marginTop:14,
              fontFamily:"'Space Mono',monospace",
              fontSize:12,
              color: status.includes('SUCCESS') ? 'var(--success)' : 'var(--accent3)',
              textAlign:'center'
            }}>
              {status}
            </p>
          )}

          {started && (
            <div style={{ marginTop:24 }}>
              {[
                { label:'Cloning repo', val:p1, color:'var(--accent)' },
                { label:'Installing deps', val:p2, color:'var(--accent2)' },
                { label:'Building image', val:p3, color:'var(--accent3)' },
              ].map(item => (
                <div className="progress-item" key={item.label}>
                  <label>
                    <span>{item.label}</span>
                    <span>{item.val}%</span>
                  </label>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${item.val}%`, background:item.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-tag"><div className="tag-dot" />DEPLOY LOGS</div>

          <div className="terminal">
            {logs.length === 0
              ? <div className="log-line">
                  <span className="log-time">—</span>
                  <span className="log-info">Waiting for deployment...</span>
                </div>
              : logs.map((l, i) => (
                  <div className="log-line" key={i}>
                    <span className="log-time">{l.time}</span>
                    <span className={`log-${l.type}`}>{l.msg}</span>
                  </div>
                ))
            }
          </div>

          <div style={{
            marginTop:16,
            fontFamily:"'Space Mono',monospace",
            fontSize:11,
            color:'var(--muted)'
          }}>
            ℹ Logs refresh automatically every 3 seconds.
          </div>
        </div>
      </div>
    </div>
  );
}