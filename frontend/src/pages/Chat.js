import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api';
const SUGGESTIONS = [
  "Why did my last deployment fail?",
  "What's my current success rate?",
  "Explain the latest errors in the logs",
  "How can I improve my build time?",
  "What deployments ran today?",
  "Is my system healthy?",
];

const INITIAL = [
  {
    role: 'ai',
    text: "Hey! I'm your DevOps AI. I have full visibility into your deployments, metrics, and logs. Ask me anything — I can explain errors, diagnose failures, and suggest fixes.",
  },
];

export default function Chat() {
  const [messages, setMessages] = useState(INITIAL);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const data = await sendChatMessage(msg);
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: '⚠️ Cannot reach backend. Make sure Docker is running on port 5000.',
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ paddingTop: 100, paddingBottom: 60 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>
          AI <span style={{ color: 'var(--accent2)' }}>Assistant</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
          Powered by Claude — knows your deployments, logs and metrics in real time.
        </p>
      </div>

      {/* SUGGESTED PROMPTS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)}
            style={{
              padding: '8px 14px',
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 20,
              color: 'var(--accent2)',
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.2s',
              letterSpacing: 0.5,
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(124,58,237,0.18)'}
            onMouseLeave={e => e.target.style.background = 'rgba(124,58,237,0.08)'}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="panel" style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="panel-tag" style={{ marginBottom: 0 }}>
            <div className="tag-dot" style={{ background: 'var(--accent2)' }} />
            AI DEVOPS ASSISTANT
          </div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10,
            color: 'var(--muted)', letterSpacing: 1 }}>
            POWERED BY CLAUDE
          </span>
        </div>

        {/* MESSAGES */}
        <div className="chat-messages" style={{ maxHeight: 420 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                fontSize: 10,
                fontFamily: "'Space Mono', monospace",
                color: 'var(--muted)',
                marginBottom: 4,
                letterSpacing: 1,
              }}>
                {m.role === 'user' ? 'YOU' : 'CLAUDE AI'}
              </div>
              <div className={`chat-msg ${m.role}`}
                style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {m.text}
              </div>
            </div>
          ))}

          {/* TYPING INDICATOR */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace",
                color: 'var(--muted)', marginBottom: 4, letterSpacing: 1 }}>
                CLAUDE AI
              </div>
              <div className="chat-msg ai" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent2)', animation: 'blink 1s ease-in-out infinite' }} />
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent2)', animation: 'blink 1s ease-in-out 0.2s infinite' }} />
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent2)', animation: 'blink 1s ease-in-out 0.4s infinite' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about your deployments, errors, or system health..."
              disabled={loading}
            />
            <button className="chat-send" onClick={() => send()} disabled={loading}
              style={{ opacity: loading ? 0.5 : 1 }}>
              {loading ? '...' : 'SEND ↗'}
            </button>
          </div>
          <div style={{ marginTop: 10, fontFamily: "'Space Mono', monospace", fontSize: 10,
            color: 'var(--muted)', textAlign: 'center' }}>
            AI has access to your real deployment data, metrics and logs
          </div>
        </div>
      </div>
    </div>
  );
}