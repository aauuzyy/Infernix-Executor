import { useState, useRef, useEffect } from 'react';
import { Flame, Key, AlertCircle, CheckCircle, ArrowRight, Shield, Clock, Zap, Lock, Minus, Maximize2, X } from 'lucide-react';
import './KeyGate.css';

// Your Supabase project credentials
const SUPABASE_URL = 'https://ntjigzeqnkppvgsxfwjl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50amlnemVxbmtwcHZnc3hmd2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTUzODksImV4cCI6MjA5MjE5MTM4OX0.WyulLNoLCHO25tl1WMNGCY359nNSm09qJ9TxMy2HzZU';

const LS_KEY = 'infernix_access_key';
const LS_EXPIRY = 'infernix_key_expiry';
const LS_TYPE = 'infernix_key_type';

export function hasSavedKey() {
  try {
    const key = localStorage.getItem(LS_KEY);
    const expiry = Number(localStorage.getItem(LS_EXPIRY) || 0);
    return !!(key && expiry > Date.now());
  } catch {
    return false;
  }
}

export function isPremium() {
  try {
    return localStorage.getItem(LS_TYPE) === 'premium';
  } catch {
    return false;
  }
}

export function clearSavedKey() {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_EXPIRY);
  localStorage.removeItem(LS_TYPE);
}

async function validateKey(key) {
  // Try IPC path first (main process bypasses CSP)
  try {
    const result = await window.electronAPI?.validateKey({
      key,
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    });
    if (result) {
      if (!result.ok) throw new Error(result.error || 'Server error');
      if (!result.found) return null;
      return { key: result.key, expires_at: result.expires_at, type: result.type };
    }
  } catch (ipcErr) {
    console.warn('[KeyGate] IPC validateKey failed:', ipcErr.message);
    // Fall through to direct fetch
  }

  // Fallback: direct Supabase fetch — check premium_keys first, then keys
  const now = new Date().toISOString();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Accept': 'application/json',
  };

  const premiumParams = new URLSearchParams({
    'key': `eq.${key}`,
    'expires_at': `gt.${now}`,
    'select': 'key,expires_at',
    'limit': '1',
  });
  const premiumRes = await fetch(`${SUPABASE_URL}/rest/v1/premium_keys?${premiumParams}`, { headers });
  if (premiumRes.ok) {
    const premiumRows = await premiumRes.json();
    if (Array.isArray(premiumRows) && premiumRows.length > 0) {
      return { ...premiumRows[0], type: 'premium' };
    }
  }

  const normalParams = new URLSearchParams({
    'key': `eq.${key}`,
    'expires_at': `gt.${now}`,
    'select': 'key,expires_at',
    'limit': '1',
  });
  const normalRes = await fetch(`${SUPABASE_URL}/rest/v1/keys?${normalParams}`, { headers });
  if (!normalRes.ok) throw new Error(`Supabase ${normalRes.status}`);
  const normalRows = await normalRes.json();
  if (Array.isArray(normalRows) && normalRows.length > 0) {
    return { ...normalRows[0], type: 'normal' };
  }
  return null;
}

const FEATURES = [
  { icon: Shield, label: 'Anti-cheat safe', desc: 'Bypasses Byfron & Hyperion' },
  { icon: Zap,    label: 'Script Hub',      desc: '10,000+ ready-to-run scripts' },
  { icon: Clock,  label: '3-day keys',      desc: 'Free, no account required' },
  { icon: Lock,   label: 'AI Assistant',    desc: 'Built-in Infernix AI chat' },
];

export default function KeyGate({ onUnlocked }) {
  const [keyInput, setKeyInput] = useState('');
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleActivate = async () => {
    const trimmed = keyInput.trim().toUpperCase();
    if (!trimmed) {
      setState('error');
      setMessage('Please enter your key.');
      setTimeout(() => setState('idle'), 2500);
      return;
    }
    setState('loading');
    setMessage('');
    try {
      const row = await validateKey(trimmed);
      if (!row) {
        setState('error');
        setMessage('Invalid or expired key. Get a new one at infernix.vercel.app/key');
        setTimeout(() => setState('idle'), 4000);
        return;
      }
      localStorage.setItem(LS_KEY, trimmed);
      localStorage.setItem(LS_EXPIRY, String(new Date(row.expires_at).getTime()));
      localStorage.setItem(LS_TYPE, row.type || 'normal');
      setState('success');
      setMessage(row.type === 'premium' ? 'Premium access granted — welcome to Infernix!' : 'Access granted — welcome to Infernix!');
      setShowSuccess(true);
      setTimeout(() => onUnlocked?.(), 1200);
    } catch (err) {
      console.error('[KeyGate] Activation error:', err);
      setState('error');
      setMessage(
        err.message?.includes('Timeout') ? 'Key server timed out. Try again.' :
        err.message?.includes('Failed to fetch') ? 'Could not reach key server. Check your connection.' :
        err.message || 'Could not reach key server. Check your connection.'
      );
      setTimeout(() => setState('idle'), 5000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && state === 'idle') handleActivate();
  };

  return (
    <div className="kg-overlay">
      {/* Draggable titlebar */}
      <div className="kg-titlebar">
        <div className="kg-titlebar-drag" />
        <div className="kg-titlebar-controls">
          <button className="kg-ctrl-btn" onClick={() => window.electronAPI?.minimizeWindow()} title="Minimize"><Minus size={13} /></button>
          <button className="kg-ctrl-btn" onClick={() => window.electronAPI?.maximizeWindow()} title="Maximize"><Maximize2 size={11} /></button>
          <button className="kg-ctrl-btn kg-ctrl-close" onClick={() => window.electronAPI?.closeWindow()} title="Close"><X size={13} /></button>
        </div>
      </div>
      <div className="kg-glow" aria-hidden="true" />
      <div className="kg-glow kg-glow-2" aria-hidden="true" />

      {/* Floating particles */}
      <div className="kg-particles" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className={`kg-particle kg-particle-${i}`} />
        ))}
      </div>

      <div className="kg-layout">
        {/* Left panel — branding + features */}
        <div className="kg-left">
          <div className="kg-brand">
            <div className="kg-brand-icon">
              <Flame size={28} color="#fff" />
            </div>
            <div>
              <div className="kg-brand-name">Infernix</div>
              <div className="kg-brand-tag">Roblox Script Executor</div>
            </div>
          </div>

          <div className="kg-tagline">
            The most powerful<br />
            <span className="kg-tagline-accent">executor ever built.</span>
          </div>

          <p className="kg-desc">
            Infernix uses a key system to keep things fast and fair for everyone.
            Keys are free, rotate every 3 days, and take under a minute to get.
          </p>

          <div className="kg-features">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="kg-feature">
                <div className="kg-feature-icon">
                  <Icon size={14} />
                </div>
                <div>
                  <div className="kg-feature-label">{label}</div>
                  <div className="kg-feature-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="kg-version-badge">v1.4.0 — Latest Release</div>
        </div>

        {/* Right panel — key entry card */}
        <div className="kg-right">
          <div className="kg-card">
            {showSuccess && <div className="kg-success-overlay" aria-hidden="true" />}

            <div className="kg-card-header">
              <div className="kg-card-icon">
                <Key size={18} color="#fff" />
              </div>
              <h1 className="kg-title">Enter Access Key</h1>
              <p className="kg-subtitle">
                Get your free key at{' '}
                <a href="https://infernix.vercel.app/key" target="_blank" rel="noopener noreferrer">
                  infernix.vercel.app/key
                </a>
              </p>
            </div>

            {/* Input */}
            <div className={`kg-input-wrap${focused ? ' focused' : ''}`}>
              <div className="kg-input-inner">
                <Key size={13} className="kg-input-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  className="kg-input"
                  placeholder="INFERNIX-XXXXXXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  disabled={state === 'loading' || state === 'success'}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Status message */}
            {message && (
              <div className={`kg-message ${state === 'success' ? 'success' : 'error'}`}>
                {state === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {message}
              </div>
            )}

            {/* Activate button */}
            <button
              className={`kg-btn${state === 'loading' ? ' loading' : ''}`}
              onClick={handleActivate}
              disabled={state === 'loading' || state === 'success'}
            >
              {state === 'loading' ? (
                <><div className="kg-spin" /> Validating…</>
              ) : state === 'success' ? (
                <><CheckCircle size={14} /> Unlocked!</>
              ) : (
                <>Activate Key <ArrowRight size={14} /></>
              )}
            </button>

            <div className="kg-divider" />

            <div className="kg-steps">
              <div className="kg-step">
                <div className="kg-step-num">1</div>
                <span>Visit <a href="https://infernix.vercel.app/key" target="_blank" rel="noopener noreferrer">infernix.vercel.app/key</a></span>
              </div>
              <div className="kg-step">
                <div className="kg-step-num">2</div>
                <span>Click Generate Key &amp; copy it</span>
              </div>
              <div className="kg-step">
                <div className="kg-step-num">3</div>
                <span>Paste it above &amp; click Activate</span>
              </div>
            </div>

            <p className="kg-footer">
              Keys last 3 days &bull; Free &bull; No account needed &bull;{' '}
              <a href="https://discord.gg/d3CdsJnHHb" target="_blank" rel="noopener noreferrer">Discord</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
