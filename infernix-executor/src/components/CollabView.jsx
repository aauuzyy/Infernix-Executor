import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Link2, Copy, Check, AlertCircle, Loader, RefreshCw, Flame, X, Clock, WifiOff, Wifi } from 'lucide-react';
import {
  generateFriendCode,
  joinFriendCode,
  friendCodeCooldownMs,
  getStoredSession,
  clearStoredSession,
  revalidateStoredSession,
  resetCollabCooldown,
} from '../services/collabService';
import './CollabView.css';

// ─── Scramble animation helper ───────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
function useScramble(target, running) {
  const [display, setDisplay] = useState('');
  const frameRef = useRef(null);
  const iterRef  = useRef(0);

  useEffect(() => {
    if (!running || !target) { setDisplay(target || ''); return; }
    iterRef.current = 0;
    const totalFrames = 22;
    const step = () => {
      iterRef.current++;
      const progress = Math.min(iterRef.current / totalFrames, 1);
      const revealUpTo = Math.floor(progress * target.length);
      const scrambled = target.split('').map((ch, i) => {
        if (i < revealUpTo) return ch;
        if (ch === '-') return '-';
        return CHARS[Math.floor(Math.random() * (CHARS.length - 1))];
      }).join('');
      setDisplay(scrambled);
      if (iterRef.current < totalFrames) frameRef.current = requestAnimationFrame(step);
      else setDisplay(target);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, running]);

  return display;
}

// ─── Countdown timer display ─────────────────────────────────────────────────
function Countdown({ expiresAt }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, new Date(expiresAt) - Date.now());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return (
    <span className="collab-expiry">
      <Clock size={11} /> Expires in {label}
    </span>
  );
}

// ─── Spinning ring loader ─────────────────────────────────────────────────────
function SpinRing({ label }) {
  return (
    <div className="collab-spinner-wrap">
      <div className="collab-ring-outer">
        <motion.div className="collab-ring ring-a" animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="collab-ring ring-b" animate={{ rotate: -360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
        <div className="collab-ring-icon"><Flame size={18} /></div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={label} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="collab-spinner-label">
          {label}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ─── Code display box ─────────────────────────────────────────────────────────
function CodeBox({ code, expiresAt }) {
  const [copied, setCopied] = useState(false);
  const scrambled = useScramble(code, !!code);

  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div className="collab-code-box" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <div className="collab-code-glow" />
      <div className="collab-code-inner">
        <span className="collab-code-text">{scrambled || '...'}</span>
        <button className="collab-copy-btn" onClick={copy} title="Copy code">
          <AnimatePresence mode="wait">
            {copied
              ? <motion.span key="chk" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={14} className="text-green-400" /></motion.span>
              : <motion.span key="cpy" initial={{ scale: 0 }} animate={{ scale: 1 }}><Copy size={14} /></motion.span>
            }
          </AnimatePresence>
        </button>
      </div>
      {expiresAt && <Countdown expiresAt={expiresAt} />}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CollabView
// Props:
//   onStartCollab({ sessionId, content, expiresAt, role }) — called when session is ready
//   onNotify(notif)
// ─────────────────────────────────────────────────────────────────────────────
export default function CollabView({ onStartCollab, onNotify }) {
  // 'idle' | 'generating' | 'generated' | 'waiting' | 'joining' | 'error'
  const [phase, setPhase] = useState('idle');
  const [genData, setGenData] = useState(null);     // { sessionId, code, expiresAt }
  const [joinCode, setJoinCode] = useState('');
  const [joinInput, setJoinInput] = useState('');   // raw user input
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldownLabel, setCooldownLabel] = useState('');
  const [activeTab, setActiveTab] = useState('host'); // 'host' | 'join'
  const [genStepLabel, setGenStepLabel] = useState('Initializing...');
  const [joinStepLabel, setJoinStepLabel] = useState('Connecting...');
  const pollRef = useRef(null);

  // Dev shortcut: Ctrl+Shift+D resets the friend-code cooldown
  useEffect(() => {
    if (window.electronAPI?.isPackaged?.()) return; // no-op in production builds
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        resetCollabCooldown();
        setCooldownLabel('');
        setPhase('idle');
        setErrorMsg('');
        onNotify?.({ type: 'success', message: 'Collab cooldown reset.' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Refresh cooldown label every 10s
  useEffect(() => {
    const tick = () => {
      const ms = friendCodeCooldownMs();
      if (ms <= 0) { setCooldownLabel(''); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setCooldownLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [phase]);

  // Generate steps
  const GEN_STEPS = [
    'Initializing secure session...',
    'Generating friend code...',
    'Registering with server...',
    'Finalizing 3-day window...',
    'Code ready.',
  ];

  const handleGenerate = async () => {
    if (phase === 'generating') return;

    const hostKey = localStorage.getItem('infernix_access_key') || `anon-${Date.now()}`;

    setPhase('generating');
    setErrorMsg('');

    // Animate through steps while waiting for network
    let si = 0;
    setGenStepLabel(GEN_STEPS[si]);
    const stepTimer = setInterval(() => {
      si = Math.min(si + 1, GEN_STEPS.length - 2);
      setGenStepLabel(GEN_STEPS[si]);
    }, 700);

    try {
      const result = await generateFriendCode(hostKey);
      clearInterval(stepTimer);
      setGenStepLabel(GEN_STEPS[GEN_STEPS.length - 1]);
      await new Promise(r => setTimeout(r, 150));
      setGenData(result);
      setPhase('generated');
      startPollingForGuest(result.sessionId);
    } catch (err) {
      clearInterval(stepTimer);
      setErrorMsg(err.message);
      setPhase('error');
      setTimeout(() => setPhase('idle'), 5000);
    }
  };

  // Poll every 1.5s waiting for guest to join
  const startPollingForGuest = useCallback((sessionId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase('waiting');
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const { checkSessionStatus } = await import('../services/collabService');
        const status = await checkSessionStatus(sessionId);
        if (status === 'expired') {
          clearInterval(pollRef.current);
          setErrorMsg('Session expired. Generate a new code.');
          setPhase('error');
          setTimeout(() => setPhase('idle'), 4000);
          return;
        }
        if (status === 'ready') {
          clearInterval(pollRef.current);
          const { revalidateStoredSession: rev } = await import('../services/collabService');
          const session = await rev();
          if (session) {
            onStartCollab({ sessionId, content: session.content, expiresAt: session.expiresAt, role: 'host' });
          }
        }
      } catch { /* network hiccup — try again */ }
    };
    pollRef.current = setInterval(tick, 1500);
  }, [onStartCollab]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleJoin = async () => {
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    const guestKey = localStorage.getItem('infernix_access_key') || `anon-${Date.now()}`;
    setPhase('joining');
    setErrorMsg('');

    const JOIN_STEPS = ['Validating code...', 'Connecting to session...', 'Syncing editor...'];
    let si = 0;
    setJoinStepLabel(JOIN_STEPS[si]);
    const stepTimer = setInterval(() => {
      si = Math.min(si + 1, JOIN_STEPS.length - 1);
      setJoinStepLabel(JOIN_STEPS[si]);
    }, 800);

    try {
      const result = await joinFriendCode(code, guestKey);
      clearInterval(stepTimer);
      await new Promise(r => setTimeout(r, 150));
      onStartCollab({ sessionId: result.sessionId, content: result.content, expiresAt: result.expiresAt, role: 'guest' });
    } catch (err) {
      clearInterval(stepTimer);
      setErrorMsg(err.message);
      setPhase('error');
      setTimeout(() => setPhase(activeTab === 'join' ? 'idle' : 'idle'), 4000);
    }
  };

  const handleJoinInput = (e) => {
    // Auto-format: insert dashes at positions 4 and 9
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    // Strip all dashes, then re-insert
    const raw = v.replace(/-/g, '');
    if (raw.length <= 4) v = raw;
    else if (raw.length <= 8) v = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    else v = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    setJoinInput(v);
  };

  const isLoading = phase === 'generating' || phase === 'joining';
  const isWaiting = phase === 'waiting';

  return (
    <div className="collab-view">
      {/* Header */}
      <motion.div className="collab-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="collab-header-icon">
          <Users size={20} />
        </div>
        <div>
          <h2 className="collab-title">Collaborate</h2>
          <p className="collab-subtitle">Share a live editor tab with a friend — real-time, no account needed</p>
        </div>
      </motion.div>

      {/* Tab selector */}
      <motion.div className="collab-tabs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
        <button className={`collab-tab-btn${activeTab === 'host' ? ' active' : ''}`} onClick={() => { setActiveTab('host'); setPhase('idle'); setErrorMsg(''); }}>
          Generate Code
        </button>
        <button className={`collab-tab-btn${activeTab === 'join' ? ' active' : ''}`} onClick={() => { setActiveTab('join'); setPhase('idle'); setErrorMsg(''); }}>
          Join with Code
        </button>
      </motion.div>

      {/* Card */}
      <motion.div className="collab-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.12 }}>
        <div className="collab-card-inner">
        <AnimatePresence mode="wait">

          {/* ── HOST: IDLE ── */}
          {activeTab === 'host' && phase === 'idle' && (
            <motion.div key="host-idle" className="collab-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="collab-panel-icon">
                <Link2 size={30} />
              </div>
              <p className="collab-panel-desc">
                Generate a <strong>friend code</strong> and share it. When your friend enters it, a shared Collaborate tab opens for both of you — live, synced typing.
              </p>
              <ul className="collab-feature-list">
                <li>Real-time synced editor</li>
                <li>Code valid for 3 days</li>
                <li>Tab auto-opens when both online</li>
                <li>One code per 24 hours</li>
              </ul>
              {cooldownLabel && (
                <div className="collab-cooldown">
                  <Clock size={13} />
                  Next code available in <strong>{cooldownLabel}</strong>
                </div>
              )}
              <motion.button
                className="collab-primary-btn"
                onClick={handleGenerate}
                disabled={!!cooldownLabel}
                whileHover={!cooldownLabel ? { scale: 1.02 } : {}}
                whileTap={!cooldownLabel ? { scale: 0.97 } : {}}
              >
                <Flame size={15} />
                {cooldownLabel ? `Cooldown — ${cooldownLabel}` : 'Generate Friend Code'}
              </motion.button>
            </motion.div>
          )}

          {/* ── HOST: GENERATING ── */}
          {activeTab === 'host' && phase === 'generating' && (
            <motion.div key="host-gen" className="collab-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SpinRing label={genStepLabel} />
            </motion.div>
          )}

          {/* ── HOST: WAITING FOR GUEST ── */}
          {(phase === 'generated' || phase === 'waiting') && genData && (
            <motion.div key="host-wait" className="collab-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="collab-success-badge">
                <Check size={14} /> Code Generated
              </div>
              <p className="collab-panel-desc-sm">Share this code with your friend. The Collaborate tab will open automatically once they join.</p>
              <CodeBox code={genData.code} expiresAt={genData.expiresAt} />
              <div className="collab-waiting-row">
                <motion.span className="collab-waiting-dot" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
                Waiting for friend to join…
              </div>
              <button className="collab-ghost-btn" onClick={() => { clearInterval(pollRef.current); clearStoredSession(); setGenData(null); setPhase('idle'); }}>
                <X size={13} /> Cancel
              </button>
            </motion.div>
          )}

          {/* ── JOIN: IDLE ── */}
          {activeTab === 'join' && phase === 'idle' && (
            <motion.div key="join-idle" className="collab-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="collab-panel-icon">
                <Users size={30} />
              </div>
              <p className="collab-panel-desc">
                Enter the friend code your collaborator shared with you. You'll both be dropped into a live shared editor tab.
              </p>
              <div className="collab-input-wrap">
                <input
                  className="collab-code-input"
                  placeholder="IFXC-XXXX-XXXX"
                  value={joinInput}
                  onChange={handleJoinInput}
                  onKeyDown={(e) => e.key === 'Enter' && joinInput.length >= 12 && handleJoin()}
                  maxLength={14}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <motion.button
                className="collab-primary-btn"
                onClick={handleJoin}
                disabled={joinInput.replace(/-/g, '').length < 12}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <Users size={15} />
                Join Session
              </motion.button>
            </motion.div>
          )}

          {/* ── JOINING ── */}
          {phase === 'joining' && (
            <motion.div key="joining" className="collab-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SpinRing label={joinStepLabel} />
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {phase === 'error' && (
            <motion.div key="error" className="collab-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AlertCircle size={36} className="collab-error-icon" />
              <p className="collab-error-msg">{errorMsg}</p>
            </motion.div>
          )}

        </AnimatePresence>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div className="collab-how" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.22 }}>
        <p className="collab-how-title">How it works</p>
        <div className="collab-steps">
          {[
            { n: '1', t: 'Generate', d: 'Host clicks Generate — gets a 3-day code. One code every 24 hours.' },
            { n: '2', t: 'Share',    d: 'Send the IFXC-XXXX-XXXX code to your friend any way you like.' },
            { n: '3', t: 'Join',     d: 'Friend pastes the code here and clicks Join.' },
            { n: '4', t: 'Collab',   d: 'A shared "Collaborate" tab opens for both — live synced typing.' },
          ].map(s => (
            <div key={s.n} className="collab-step">
              <div className="collab-step-num">{s.n}</div>
              <div>
                <p className="collab-step-title">{s.t}</p>
                <p className="collab-step-desc">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
