import { useState, useEffect, useRef } from 'react';
import { fetchLogs, fetchMetrics } from '../api';

const DEFAULT_METRICS = {
  total_deploys: 0,
  success_rate: 0,
  avg_build_time: 0,
  active_services: 0,
};

function useCounter(target, duration = 1000) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function MetricCard({ label, value, suffix, color, sub, delay }) {
  const count = useCounter(value);
  return (
    <div className="metric-card" style={{ animationDelay: delay }}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value color-${color}`}>{count}{suffix}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function getLogType(line) {
  if (line.includes('ERROR') || line.includes('✗')) return 'error';
  if (line.includes('⚠') || line.includes('WARNING') || line.includes('failed')) return 'warn';
  if (line.includes('✓') || line.includes('success') || line.includes('started')) return 'success';
  return 'info';
}

function formatTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [logs, setLogs] = useState([
    { time: '--:--:--', type: 'info', msg: '→ Connecting to backend...' }
  ]);
  const [connected, setConnected] = useState(false);
  const [deployFinished, setDeployFinished] = useState(false); // ✅ NEW

  const terminalRef = useRef();

  const loadMetrics = async () => {
    try {
      const data = await fetchMetrics();
      setMetrics(data);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await fetchLogs();

      if (data.logs && data.logs.length > 0) {
        const parsed = data.logs
          .filter(l => l.trim())
          .map(l => ({
            time: formatTime(),
            type: getLogType(l),
            msg: l.trim()
          }));

        setLogs(parsed);

        // 🔥 Detect deployment success
        const lastLog = parsed[parsed.length - 1]?.msg || "";
        if (lastLog.includes("DEPLOY SUCCESS")) {
          setDeployFinished(true);
        }

      } else {
        setLogs([
          { time: formatTime(), type: 'info', msg: '→ No logs yet. Deploy something!' }
        ]);
      }

    } catch {
      setLogs(prev => [
        ...prev,
        { time: formatTime(), type: 'warn', msg: '⚠ Cannot reach /logs' }
      ]);
    }
  };

  useEffect(() => {
    loadMetrics();
    loadLogs();

    //  Smart polling (stops when finished)
    const logInterval = setInterval(() => {
      if (!deployFinished) {
        loadLogs();
      }
    }, 3000);

    const metricInterval = setInterval(loadMetrics, 30000);

    return () => {
      clearInterval(logInterval);
      clearInterval(metricInterval);
    };
  }, [deployFinished]);

  // Auto scroll
  useEffect(() => {
    if (terminalRef.current)
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);

  const METRIC_CARDS = [
    { label: 'Total Deploys', value: metrics.total_deploys, suffix: '', color: 'cyan', sub: 'all time', delay: '0s' },
    { label: 'Success Rate', value: metrics.success_rate, suffix: '%', color: 'green', sub: 'last 30 days', delay: '0.1s' },
    { label: 'Avg Build Time', value: metrics.avg_build_time, suffix: 's', color: 'purple', sub: 'per deployment', delay: '0.2s' },
    { label: 'Active Services', value: metrics.active_services, suffix: '', color: 'orange', sub: 'running now', delay: '0.3s' },
  ];

  return (
    <div style={{ paddingTop: 100 }}>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">⬡ CLOUD DEVOPS PLATFORM — ACTIVE</div>
        <h1>Deploy.<br /><span className="gradient">Monitor. Ship.</span></h1>
        <p>Your personal cloud deployment portal. Real metrics. Live logs. All in one place.</p>
      </section>

      {/* METRICS */}
      <div className="metrics-grid">
        {METRIC_CARDS.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      <div className="panels-grid panels-mb">

        {/* 🔥 LIVE LOGS */}
        <div className="panel">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
            <div className="panel-tag">
              <div className="tag-dot" style={{
                background: deployFinished ? 'var(--success)' : (connected ? 'var(--accent)' : 'var(--danger)')
              }} />
              LIVE LOGS — {
                deployFinished
                  ? 'COMPLETED'
                  : connected
                    ? 'POLLING'
                    : 'DISCONNECTED'
              }
            </div>

            <button className="btn btn-secondary" onClick={loadLogs}>
              REFRESH
            </button>
          </div>

          <div className="terminal" ref={terminalRef}>
            {logs.map((l, i) => (
              <div className="log-line" key={i}>
                <span className="log-time">{l.time}</span>
                <span className={`log-${l.type}`}>{l.msg}</span>
              </div>
            ))}

            <div className="log-line">
              <span className="log-time">—</span>
              <span className={deployFinished ? "log-success" : "log-info"}>
                {
                  deployFinished
                    ? 'Deployment Completed ✓'
                    : connected
                      ? 'Polling every 3s'
                      : 'Reconnecting'
                }...
                <span className="cursor" />
              </span>
            </div>
          </div>
        </div>

        {/* SYSTEM STATUS */}
        <div className="panel">
          <div className="panel-tag"><div className="tag-dot" />SYSTEM STATUS</div>

          {[
            { label: 'Flask API', val: 100, color: 'var(--success)' },
            { label: 'Docker Container', val: 100, color: 'var(--accent)' },
            { label: 'JWT Auth', val: 100, color: 'var(--accent2)' },
            { label: 'SQLite DB', val: 100, color: 'var(--accent3)' },
            { label: 'AWS (coming next)', val: 0, color: 'var(--muted)' },
          ].map(item => (
            <div className="progress-item" key={item.label}>
              <label>
                <span>{item.label}</span>
                <span style={{ color: item.val === 100 ? 'var(--success)' : 'var(--danger)' }}>
                  {item.val === 100 ? 'ONLINE' : 'PENDING'}
                </span>
              </label>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${item.val}%`, background:item.color }} />
              </div>
            </div>
          ))}

          {/* LIVE STATS */}
          <div style={{ marginTop:24, padding:16, background:'rgba(0,245,196,0.05)', border:'1px solid rgba(0,245,196,0.15)', borderRadius:10 }}>
            <div style={{ fontSize:11, color:'var(--accent)', marginBottom:8 }}>
              LIVE STATS
            </div>
            <div style={{ fontSize:12 }}>
              <div>Total deploys: {metrics.total_deploys}</div>
              <div>Success rate: {metrics.success_rate}%</div>
              <div>Avg build: {metrics.avg_build_time}s</div>
              <div>Backend: {connected ? 'Connected ✓' : 'Disconnected ✗'}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}