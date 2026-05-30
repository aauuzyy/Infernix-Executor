import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';


// Fuzzy tab name matcher — scores candidates so AI near-matches work
function findTabByName(tabs, query) {
  const needle = (query || '').trim().toLowerCase();
  if (!needle) return null;
  if (needle === 'all') return { all: true };
  let best = null;
  let bestScore = -1;
  for (const tab of tabs) {
    const name = tab.name.toLowerCase();
    if (name === needle) return tab; // exact match — immediate return
    let score = 0;
    if (name.startsWith(needle)) score += 50;
    if (name.includes(needle)) score += 30;
    // word-level matching: each word in query must appear in tab name
    const qWords = needle.split(/\s+/).filter(Boolean);
    const nWords = name.split(/\s+/).filter(Boolean);
    const matchedWords = qWords.filter(qw => nWords.some(nw => nw.includes(qw) || nw === qw));
    score += matchedWords.length * 10;
    if (score > bestScore) { bestScore = score; best = tab; }
  }
  // Require a minimum score threshold so random strings don't match
  return bestScore >= 10 ? best : null;
}

function BackgroundOverlay() {
  const { customBackground, backgroundBlur } = useTheme();
  if (!customBackground) return null;
  // Use an <img> so animated GIFs remain animated and blur works correctly
  const blurPx = (backgroundBlur / 100) * 20;
  return (
    <div className="custom-bg-overlay">
      <img
        src={customBackground}
        alt=""
        className="custom-bg-img"
        style={{ filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none' }}
      />
    </div>
  );
}

function CursorGlow() {
  const glowRef = useRef(null);
  const pos = useRef({ x: -999, y: -999 });
  const cur = useRef({ x: -999, y: -999 });
  const raf = useRef(null);
  useEffect(() => {
    const onMove = (e) => { pos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove);
    const tick = () => {
      cur.current.x = cur.current.x + (pos.current.x - cur.current.x) * 1.0;
      cur.current.y = cur.current.y + (pos.current.y - cur.current.y) * 1.0;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${cur.current.x}px, ${cur.current.y}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf.current); };
  }, []);
  return (
    <div ref={glowRef} aria-hidden="true" style={{
      position: 'fixed', top: -60, left: -60,
      width: 120, height: 120, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.045) 0%, transparent 70%)',
      pointerEvents: 'none', zIndex: 0, willChange: 'transform',
    }} />
  );
}
import TitleBar from './components/TitleBar';
import Dashboard from './components/Dashboard';
import EditorView from './components/EditorView';
import ScriptHub from './components/ScriptHub';
import ClientManager from './components/ClientManager';
import SettingsView from './components/SettingsView';
import Assistant from './components/Assistant';
import AssistantSidebar from './components/AssistantSidebar';
import Notification from './components/Notification';

import LoadingScreen from './components/LoadingScreen';
import KeyGate, { hasSavedKey, isPremium } from './components/KeyGate';
import TutorialOverlay from './components/TutorialOverlay';
import CollabView from './components/CollabView';
import { revalidateStoredSession, subscribeToSession, pushContent, fetchSessionSnapshot, clearStoredSession, openCursorChannel } from './services/collabService';
import { loadStats, recordAttach, recordExecution, recordAI, recordSessionStart, recordSessionEnd } from './utils/stats';
import './App.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[Infernix] UI Error Boundary:', error, info);
    this.setState({ error, info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="err-overlay">
          {/* Grid background */}
          <div className="err-grid" />
          {/* Ambient glows */}
          <div className="err-glow" />
          <div className="err-glow err-glow-2" />
          {/* Floating particles */}
          <div className="err-particles" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className={`err-particle err-particle-${i}`} />
            ))}
          </div>

          <div className="err-content">
            {/* Brand icon */}
            <div className="err-brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
            <h1 className="err-title">Something went wrong</h1>
            <p className="err-desc">
              Infernix ran into an unexpected issue. Don't worry — your scripts and settings are safe.
            </p>
            {this.state.error && (
              <div style={{
                margin: '0 0 20px', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                textAlign: 'left', maxWidth: '100%', overflow: 'auto', maxHeight: 120,
                lineHeight: 1.5,
              }}>
                <strong style={{ color: '#f87171' }}>{this.state.error.name}:</strong> {this.state.error.message}
              </div>
            )}
            <div className="err-actions">
              <button className="err-btn err-btn-primary" onClick={() => window.location.reload()}>
                Reload Infernix
              </button>
              <button className="err-btn err-btn-ghost" onClick={() => window.electronAPI?.closeWindow?.()}>
                Close App
              </button>
            </div>
            <p className="err-footer">
              If this keeps happening, try restarting the app or checking for updates.
            </p>
          </div>

          <style>{`
            .err-overlay {
              position: fixed; inset: 0; z-index: 99999;
              background: var(--bg-primary);
              color: var(--text-primary);
              display: flex; align-items: center; justify-content: center;
              font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
              overflow: hidden;
            }
            .err-grid {
              position: absolute; inset: 0; pointer-events: none;
              background-image:
                linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
              background-size: 48px 48px;
            }
            .err-glow {
              position: absolute; top: 30%; left: 20%;
              width: 600px; height: 600px; border-radius: 50%;
              background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
              pointer-events: none;
              animation: err-pulse 6s ease-in-out infinite;
            }
            .err-glow-2 { top: 60%; left: 60%; width: 400px; height: 400px;
              background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%);
              animation-delay: 3s;
            }
            @keyframes err-pulse {
              0%, 100% { opacity: 0.6; transform: scale(1); }
              50%       { opacity: 1;   transform: scale(1.08); }
            }
            .err-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
            .err-particle { position: absolute; border-radius: 50%; animation: err-float linear infinite; }
            .err-particle-0  { left:  8%; top: 20%; width: 3px; height: 3px; background: rgba(255,255,255,0.75); box-shadow: 0 0 6px 3px rgba(255,255,255,0.35); animation-duration: 12s; animation-delay:  0s;   }
            .err-particle-1  { left: 25%; top: 70%; width: 2px; height: 2px; background: rgba(255,255,255,0.50); box-shadow: 0 0 5px 2px rgba(255,255,255,0.25); animation-duration:  9s; animation-delay:  1.5s; }
            .err-particle-2  { left: 50%; top: 15%; width: 4px; height: 4px; background: rgba(255,255,255,0.65); box-shadow: 0 0 8px 4px rgba(255,255,255,0.30); animation-duration: 15s; animation-delay:  0.5s; animation-name: err-float-drift; }
            .err-particle-3  { left: 72%; top: 80%; width: 2px; height: 2px; background: rgba(255,255,255,0.50); box-shadow: 0 0 5px 2px rgba(255,255,255,0.25); animation-duration: 11s; animation-delay:  3s;   }
            .err-particle-4  { left: 88%; top: 40%; width: 3px; height: 3px; background: rgba(255,255,255,0.70); box-shadow: 0 0 6px 3px rgba(255,255,255,0.35); animation-duration:  8s; animation-delay:  2s;   animation-name: err-float-drift; }
            .err-particle-5  { left: 15%; top: 55%; width: 2px; height: 2px; background: rgba(255,255,255,0.50); box-shadow: 0 0 5px 2px rgba(255,255,255,0.22); animation-duration: 13s; animation-delay:  4s;   }
            .err-particle-6  { left: 60%; top: 55%; width: 3px; height: 3px; background: rgba(255,255,255,0.65); box-shadow: 0 0 7px 3px rgba(255,255,255,0.30); animation-duration: 10s; animation-delay:  1s;   }
            .err-particle-7  { left: 40%; top: 90%; width: 2px; height: 2px; background: rgba(255,255,255,0.50); box-shadow: 0 0 5px 2px rgba(255,255,255,0.25); animation-duration: 14s; animation-delay:  2.5s; animation-name: err-float-drift; }
            .err-particle-8  { left: 33%; top: 35%; width: 3px; height: 3px; background: rgba(255,255,255,0.70); box-shadow: 0 0 7px 3px rgba(255,255,255,0.35); animation-duration: 11s; animation-delay:  0.8s; }
            .err-particle-9  { left: 78%; top: 22%; width: 2px; height: 2px; background: rgba(255,255,255,0.50); box-shadow: 0 0 5px 2px rgba(255,255,255,0.25); animation-duration: 16s; animation-delay:  3.2s; animation-name: err-float-drift; }
            .err-particle-10 { left:  5%; top: 75%; width: 3px; height: 3px; background: rgba(255,255,255,0.65); box-shadow: 0 0 7px 3px rgba(255,255,255,0.30); animation-duration:  9s; animation-delay:  1.8s; }
            .err-particle-11 { left: 55%; top: 45%; width: 2px; height: 2px; background: rgba(255,255,255,0.50); box-shadow: 0 0 5px 2px rgba(255,255,255,0.22); animation-duration: 12s; animation-delay:  5s;   animation-name: err-float-drift; }
            .err-particle-12 { left: 20%; top: 10%; width: 5px; height: 5px; background: rgba(255,255,255,0.25); box-shadow: 0 0 14px 7px rgba(255,255,255,0.14); animation-duration: 18s; animation-delay:  0s;   }
            .err-particle-13 { left: 80%; top: 65%; width: 5px; height: 5px; background: rgba(255,255,255,0.22); box-shadow: 0 0 16px 8px rgba(255,255,255,0.12); animation-duration: 20s; animation-delay:  2s;   animation-name: err-float-drift; }
            .err-particle-14 { left: 45%; top: 60%; width: 4px; height: 4px; background: rgba(255,255,255,0.28); box-shadow: 0 0 12px 6px rgba(255,255,255,0.14); animation-duration: 14s; animation-delay:  6s;   }
            .err-particle-15 { left: 65%; top: 10%; width: 4px; height: 4px; background: rgba(255,255,255,0.28); box-shadow: 0 0 10px 5px rgba(255,255,255,0.14); animation-duration: 10s; animation-delay:  3.5s; animation-name: err-float-drift; }
            @keyframes err-float {
              0%   { transform: translateY(0);     opacity: 0.9; }
              25%  { transform: translateY(-28px); opacity: 0.5; }
              50%  { transform: translateY(-55px); opacity: 0.9; }
              75%  { transform: translateY(-28px); opacity: 0.4; }
              100% { transform: translateY(0);     opacity: 0.9; }
            }
            @keyframes err-float-drift {
              0%   { transform: translate(0, 0);          opacity: 0.8; }
              25%  { transform: translate(12px, -30px);   opacity: 0.4; }
              50%  { transform: translate(-8px, -55px);   opacity: 0.8; }
              75%  { transform: translate(10px, -25px);   opacity: 0.4; }
              100% { transform: translate(0, 0);          opacity: 0.8; }
            }
            .err-content {
              position: relative; z-index: 1;
              display: flex; flex-direction: column; align-items: center; text-align: center;
              max-width: 440px; padding: 0 24px;
              animation: err-fadeup 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
            }
            @keyframes err-fadeup {
              from { opacity: 0; transform: translateY(20px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .err-brand-icon {
              width: 64px; height: 64px; border-radius: 50%;
              background: var(--bg-secondary);
              border: 1px solid var(--border);
              display: flex; align-items: center; justify-content: center;
              margin-bottom: 24px;
              box-shadow: 0 0 32px rgba(var(--accent-rgb), 0.15);
              color: var(--accent);
            }
            .err-title {
              margin: 0 0 8px;
              font-size: 22px; font-weight: 700;
              letter-spacing: -0.02em;
              color: var(--text-primary);
            }
            .err-desc {
              margin: 0 0 28px;
              font-size: 14px; line-height: 1.6;
              color: var(--text-muted);
            }
            .err-actions {
              display: flex; gap: 12;
            }
            .err-btn {
              padding: 11px 26px; border-radius: 999px;
              font-size: 13px; font-weight: 600;
              cursor: pointer; transition: all 0.2s ease;
              border: none;
              font-family: inherit;
              letter-spacing: 0.01em;
              display: flex; align-items: center; gap: 8px;
            }
            .err-btn-primary {
              background: var(--accent);
              color: var(--bg-primary);
              box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.25), 0 4px 12px rgba(0,0,0,0.2);
            }
            .err-btn-primary:hover {
              transform: translateY(-1px);
              box-shadow: 0 0 28px rgba(var(--accent-rgb), 0.4), 0 6px 16px rgba(0,0,0,0.25);
              filter: brightness(1.1);
            }
            .err-btn-primary:active {
              transform: translateY(0);
            }
            .err-btn-ghost {
              background: transparent;
              color: var(--text-secondary);
              border: 1.5px solid var(--border);
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .err-btn-ghost:hover {
              color: var(--text-primary);
              border-color: var(--accent);
              box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.15);
            }
            .err-footer {
              margin-top: 20px;
              font-size: 11px;
              color: var(--text-muted);
              opacity: 0.5;
            }
          `}</style>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent({ isPremium }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [executorVersion, setExecutorVersion] = useState('1.4.1');
  const [executionCount, setExecutionCount] = useState(0);

  const { setThemeMode, setAccentColor, setColorShift, accentPresets, themeMode, accentColor } = useTheme();
  const [startTime] = useState(Date.now());
  const [scanFeedback, setScanFeedback] = useState(null);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [stats, setStats] = useState(() => loadStats());

  // ── Collab state ──────────────────────────────────────────────────────────
  // collabSession: null | { sessionId, expiresAt, role } when a session is active
  const [collabSession, setCollabSession] = useState(null);
  const collabTabIdRef = useRef(null); // tab id of the Collaborate tab
  const collabUnsub = useRef(null);    // Realtime unsubscribe fn
  const collabPushTimer = useRef(null);
  const collabPollRef = useRef(null);
  const collabLastPushAtRef = useRef(0);
  const collabPendingContentRef = useRef(null);
  const collabPushErrorAtRef = useRef(0);
  const collabLastLocalEditAtRef = useRef(0);
  const lastRemoteContentRef = useRef('');
  const lastPushedContentRef = useRef('');
  const collabCursorChannel = useRef(null); // Broadcast channel for cursor positions
  // remoteWrite: signals EditorView to push content directly into the Monaco model
  const [remoteWrite, setRemoteWrite] = useState(null); // { tabId, content, seq }
  const remoteWriteSeq = useRef(0);
  // remoteCursors: map of userId -> { lineNumber, column }
  const [remoteCursors, setRemoteCursors] = useState({});
  const collabSessionRef = useRef(null);
  useEffect(() => { collabSessionRef.current = collabSession; }, [collabSession]);
  const lastCursorSendRef = useRef(0);

  // On app startup: clean up expired collab sessions, but NEVER auto-reopen the tab.
  // The collab tab should only open when the user explicitly clicks Collaborate.
  useEffect(() => {
    (async () => {
      const stored = JSON.parse(localStorage.getItem('infernix_collab_session') || 'null');
      if (!stored) return;
      // Fast client-side expiry check before hitting Supabase
      if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
        clearStoredSession();
        return;
      }
      // Re-validate against Supabase and clear if truly expired/missing
      const session = await revalidateStoredSession();
      if (!session) return;
      // DO NOT call startCollabSession here — the tab only opens when the user
      // explicitly clicks the Collaborate button. Otherwise the tab reopens on
      // every launch even when the other user is offline.
    })();
  }, []); // eslint-disable-line

  // Stats: record session start on mount, session end on unmount
  useEffect(() => {
    setStats(prev => recordSessionStart(prev));
    return () => {
      const uptime = Date.now() - startTime;
      setStats(prev => recordSessionEnd(prev, uptime));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCollabSession = (session) => {
    if (collabSession?.sessionId === session.sessionId && collabTabIdRef.current !== null) {
      setActiveView('executor');
      setActiveTab(collabTabIdRef.current);
      return;
    }

    let nextCollabId;
    // Keep exactly one Collaborate tab to prevent duplicates.
    setTabs(prev => {
      const existingCollab = prev.find(t => t.isCollab);
      nextCollabId = existingCollab?.id ?? tabCounter.current++;
      const withoutCollab = prev.filter(t => !t.isCollab);
      return [...withoutCollab, { id: nextCollabId, name: 'Collaborate', content: session.content || '', isCollab: true }];
    });

    collabTabIdRef.current = nextCollabId;
    setActiveTab(nextCollabId);
    setActiveView('executor');
    setCollabSession({ sessionId: session.sessionId, expiresAt: session.expiresAt, role: session.role });
    lastRemoteContentRef.current = session.content || '';

    const applyRemoteContent = (remoteContent) => {
      if (typeof remoteContent !== 'string') return;
      if (remoteContent === lastRemoteContentRef.current) return;
      // Echo suppression: ignore our own push coming back from Supabase
      if (remoteContent === lastPushedContentRef.current && Date.now() - collabLastPushAtRef.current < 300) return;
      // Don't overwrite tabs state while user is actively typing (prevents clobbering on tab switch)
      if (Date.now() - collabLastLocalEditAtRef.current < 150) return;
      lastRemoteContentRef.current = remoteContent;
      setTabs(prev => prev.map(t =>
        t.id === collabTabIdRef.current ? { ...t, content: remoteContent } : t
      ));
      setRemoteWrite({ tabId: collabTabIdRef.current, content: remoteContent, seq: ++remoteWriteSeq.current });
    };

    // Subscribe to Realtime content updates
    if (collabUnsub.current) collabUnsub.current();
    collabUnsub.current = subscribeToSession(
      session.sessionId,
      (remoteContent) => applyRemoteContent(remoteContent),
      () => {
        addNotification({ type: 'warning', title: 'Collaborate', message: 'Session expired. Generate a new friend code.' });
        endCollabSession();
      },
      (status) => {
        if (status === 'CHANNEL_ERROR') {
          addNotification({ type: 'warning', title: 'Collaborate', message: 'Realtime channel issue detected. Fallback sync is active.' });
        }
      }
    );

    // Polling fallback: keep content in sync even if Realtime fails.
    if (collabPollRef.current) clearInterval(collabPollRef.current);
    collabPollRef.current = setInterval(async () => {
      try {
        const snap = await fetchSessionSnapshot(session.sessionId);
        if (!snap) return;
        if (new Date(snap.expires_at) < new Date()) {
          addNotification({ type: 'warning', title: 'Collaborate', message: 'Session expired. Generate a new friend code.' });
          endCollabSession();
          return;
        }
        applyRemoteContent(snap.content ?? '');
      } catch {
        // Keep trying silently; realtime may still be working.
      }
    }, 200);

    // Open cursor presence channel
    if (collabCursorChannel.current) collabCursorChannel.current.close();
    collabCursorChannel.current = openCursorChannel(session.sessionId, session.role, ({ userId, lineNumber, column }) => {
      setRemoteCursors(prev => ({ ...prev, [userId]: { lineNumber, column } }));
    });

    addNotification({ type: 'success', title: 'Collaborate', message: 'Shared editor is live!' });
  };

  const endCollabSession = () => {
    if (collabUnsub.current) { collabUnsub.current(); collabUnsub.current = null; }
    if (collabPollRef.current) { clearInterval(collabPollRef.current); collabPollRef.current = null; }
    if (collabCursorChannel.current) { collabCursorChannel.current.close(); collabCursorChannel.current = null; }
    if (collabTabIdRef.current !== null) {
      setTabs(prev => prev.filter(t => t.id !== collabTabIdRef.current));
      collabTabIdRef.current = null;
    }
    clearTimeout(collabPushTimer.current);
    collabPushTimer.current = null;
    collabPendingContentRef.current = null;
    collabLastPushAtRef.current = 0;
    collabLastLocalEditAtRef.current = 0;
    setCollabSession(null);
    setRemoteCursors({});
    lastRemoteContentRef.current = '';
    clearStoredSession();
  };

  // When the Collaborate tab content changes, push to Supabase (throttled for live typing)
  const handleCollabCodeChange = (tabId, content) => {
    if (tabId !== collabTabIdRef.current || !collabSessionRef.current) return;
    collabLastLocalEditAtRef.current = Date.now();
    collabPendingContentRef.current = content;

    const PUSH_INTERVAL_MS = 60;
    const pushNow = (payload) => {
      if (typeof payload !== 'string') return;
      collabLastPushAtRef.current = Date.now();
      lastPushedContentRef.current = payload;
      pushContent(collabSessionRef.current.sessionId, payload).catch(() => {
        const now = Date.now();
        if (now - collabPushErrorAtRef.current > 4000) {
          collabPushErrorAtRef.current = now;
          addNotification({ type: 'warning', title: 'Collaborate', message: 'Failed to push latest content. Retrying...' });
        }
      });
    };

    const elapsed = Date.now() - collabLastPushAtRef.current;
    if (elapsed >= PUSH_INTERVAL_MS && !collabPushTimer.current) {
      const payload = collabPendingContentRef.current;
      collabPendingContentRef.current = null;
      pushNow(payload);
      return;
    }

    if (!collabPushTimer.current) {
      const wait = Math.max(15, PUSH_INTERVAL_MS - elapsed);
      collabPushTimer.current = setTimeout(() => {
        collabPushTimer.current = null;
        const payload = collabPendingContentRef.current;
        collabPendingContentRef.current = null;
        pushNow(payload);
      }, wait);
    }
  };

  // Broadcast local cursor position to partner
  const handleSendCursor = (lineNumber, column) => {
    if (!collabSessionRef.current || !collabCursorChannel.current) return;
    if (activeTab !== collabTabIdRef.current) return;
    const now = Date.now();
    // Throttle to 100ms to stay within Supabase Realtime eventsPerSecond: 10
    if (now - lastCursorSendRef.current < 100) return;
    lastCursorSendRef.current = now;
    collabCursorChannel.current.send(lineNumber, column);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Assistant sidebar is always open — no toggle

  // Listen for client updates from main process
  useEffect(() => {
    // Add smoothing to avoid flicker when main briefly reports empty
    const lastNonEmptyRef = { clients: [], at: 0 };
    // Sticky placeId map: pid -> last known non-zero placeId
    const stickyPlaceId = new Map();

    const stabiliseClients = (list) => {
      return list.map(client => {
        const isArr = Array.isArray(client);
        const pid   = String(isArr ? client[0] : client.pid);
        const rawPlaceId = isArr ? client[5] : (client.placeId || client.PlaceId || 0);
        const status = isArr ? client[3] : client.status;

        // If attached and placeId is non-zero, remember it
        if (status === 3 && rawPlaceId && Number(rawPlaceId) > 0) {
          stickyPlaceId.set(pid, rawPlaceId);
        }

        // Substitute sticky placeId if current is 0/null
        const stablePlaceId = (rawPlaceId && Number(rawPlaceId) > 0)
          ? rawPlaceId
          : (stickyPlaceId.get(pid) || rawPlaceId);

        // Clean up sticky entry when client disconnects
        if (status !== 3) stickyPlaceId.delete(pid);

        if (isArr) {
          const copy = [...client];
          copy[5] = stablePlaceId;
          return copy;
        }
        return { ...client, placeId: stablePlaceId, PlaceId: stablePlaceId };
      });
    };

    const updateClients = (incoming) => {
      const list = incoming || [];
      const now = Date.now();
      if (Array.isArray(list) && list.length > 0) {
        const stable = stabiliseClients(list);
        lastNonEmptyRef.clients = stable;
        lastNonEmptyRef.at = now;
        setClients(stable);
        return;
      }

      // If we recently had clients, keep showing them for a short grace period
      if (now - lastNonEmptyRef.at < 1500 && Array.isArray(lastNonEmptyRef.clients) && lastNonEmptyRef.clients.length > 0) {
        setClients(lastNonEmptyRef.clients);
      } else {
        stickyPlaceId.clear();
        setClients([]);
      }
    };

    if (window.electronAPI?.onClientsUpdate) {
      window.electronAPI.onClientsUpdate((newClients) => {
        updateClients(newClients);
      });

      // Get initial version (prefer app package version for consistent UI/display)
      (async () => {
        const ver =
          (await window.electronAPI.getCurrentVersion?.()) ||
          (await window.electronAPI.getVersion?.()) ||
          '1.4.1';
        setExecutorVersion(String(ver).replace(/^v/, ''));
      })();
    }

    return () => {
      window.electronAPI?.removeClientsListener?.();
    };
  }, []);

  // NOTE: Removed fallback polling — it called getClients() which returns raw
  // addon data without placeId merge, causing the client list to flicker every 1s.

  // Auto-start tutorial on first run
  useEffect(() => {
    const seen = localStorage.getItem('infernix-tutorial-seen');
    if (!seen) {
      const t = setTimeout(() => setTutorialActive(true), 1800);
      return () => clearTimeout(t);
    }
  }, []);

  // Mark tutorial as seen when it closes
  const handleTutorialClose = useCallback(() => {
    localStorage.setItem('infernix-tutorial-seen', '1');
    setTutorialActive(false);
  }, []);

  // Drive Discord RPC state from client attachment status
  useEffect(() => {
    const hasAttached = clients.some(c => {
      const status = Array.isArray(c) ? c[3] : c.status;
      return status === 3;
    });
    window.electronAPI?.setRPCState?.(hasAttached ? 'attached' : 'idle');
  }, [clients]);

  // Live execution count — incremented when main process broadcasts a successful execution
  useEffect(() => {
    if (window.electronAPI?.onExecutionOccurred) {
      window.electronAPI.onExecutionOccurred((data) => {
        setExecutionCount(prev => prev + 1);
      });
    }
    return () => {
      window.electronAPI?.removeExecutionListener?.();
    };
  }, []);

  // Lifted tab state for cross-component access
  const [tabs, setTabs] = useState([
    { id: 1, name: 'Script 1', content: '-- Welcome to Infernix\nprint("Hello, World!")'}
  ]);
  const [activeTab, setActiveTab] = useState(1);
  const tabCounter = useRef(2);
  const [tabsLoaded, setTabsLoaded] = useState(false);

  // Load saved tabs on startup
  useEffect(() => {
    const loadSavedTabs = async () => {
      try {
        const savedTabs = await window.electronAPI?.loadTabs();
        if (savedTabs && savedTabs.tabs && savedTabs.tabs.length > 0) {
          setTabs(savedTabs.tabs);
          setActiveTab(savedTabs.activeTab || savedTabs.tabs[0].id);
          tabCounter.current = savedTabs.counter || (Math.max(...savedTabs.tabs.map(t => t.id)) + 1);
        }
      } catch (e) {
        console.error('Failed to load tabs:', e);
      } finally {
        setTabsLoaded(true);
      }
    };
    loadSavedTabs();
  }, []);


  // Save tabs whenever they change (debounced)
  useEffect(() => {
    if (!tabsLoaded) return; // Don't save until initial load is done
    
    const saveTimeout = setTimeout(() => {
      window.electronAPI?.saveTabs({
        tabs,
        activeTab,
        counter: tabCounter.current
      });
    }, 500);
    
    return () => clearTimeout(saveTimeout);
  }, [tabs, activeTab, tabsLoaded]);

  // Ctrl+T: open new tab and switch to executor from anywhere
  const handleNewTabRef = useRef(null);
  useEffect(() => { handleNewTabRef.current = handleNewTab; });
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        handleNewTabRef.current?.();
        setActiveView('executor');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const notificationId = useRef(0);

  const addNotification = useCallback((notif, typeArg) => {
    const id = ++notificationId.current;
    const normalized = typeof notif === 'string'
      ? { type: typeArg || 'info', title: notif, id }
      : { ...notif, id };
    setNotifications(prev => [...prev, normalized]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Tab operations
  const handleNewTab = (initialData = null) => {
    const newTab = {
      id: tabCounter.current++,
      name: initialData?.name || `Script ${tabCounter.current - 1}`,
      content: initialData?.content || '-- New Script\n'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
    return newTab.id;
  };

  const handleCloseTab = (tabId) => {
    if (tabs.length === 1) return;
    // Prevent manually closing the Collaborate tab while session is active
    if (tabId === collabTabIdRef.current && collabSession) return;
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  const handleRenameTab = (tabId, newName) => {
    setTabs(tabs.map(t => 
      t.id === tabId ? { ...t, name: newName } : t
    ));
  };

  const handleCodeChange = (tabId, content) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, content } : t
    ));
    // Push to Supabase if this is the collab tab
    if (tabId === collabTabIdRef.current && collabSession) {
      handleCollabCodeChange(tabId, content);
    }
  };

  // Alias used by Assistant to write generated code into a tab
  const handleWriteToTab = handleCodeChange;

  // Update tab scan status for safety badges
  const handleUpdateTabScan = (tabId, scanStatus, scanResult = null) => {
    setTabs(tabs.map(t =>
      t.id === tabId ? { ...t, scanStatus, scanResult } : t
    ));
  };

  const handleSwitchToExecutor = (tabId) => {
    setActiveView('executor');
    if (tabId) {
      setActiveTab(tabId);
    }
  };

  // Navigate to executor and switch to a tab by name (case-insensitive, partial match)
  const handleNavigateToTab = (tabName) => {
    setActiveView('executor');
    const match = findTabByName(tabs, tabName);
    if (match && !match.all) setActiveTab(match.id);
  };

  // Apply settings/theme changes from the AI assistant
  const ACCENT_PRESET_MAP = {
    fire: '#f97316', ruby: '#ef4444', emerald: '#22c55e', ocean: '#3b82f6',
    violet: '#8b5cf6', pink: '#ec4899', cyan: '#06b6d4', gold: '#eab308',
    white: '#ffffff',
  };
  const handleApplySettings = useCallback((patch) => {
    if (!patch) return;
    // Handle full presets
    if (patch.__preset) {
      const name = patch.__preset.toLowerCase();
      if (name === 'random') {
        const colors = Object.values(ACCENT_PRESET_MAP);
        setAccentColor(colors[Math.floor(Math.random() * colors.length)]);
      } else if (name === 'midnight') {
        setThemeMode('midnight');
      } else if (name === 'light') {
        setThemeMode('light');
      } else if (name === 'dark') {
        setThemeMode('dark');
      } else if (ACCENT_PRESET_MAP[name]) {
        setAccentColor(ACCENT_PRESET_MAP[name]);
      }
      return;
    }
    // Handle individual keys
    if (patch.themeMode) setThemeMode(patch.themeMode);
    if (patch.accentColor) setAccentColor(patch.accentColor);
    if (patch.colorShift !== undefined) setColorShift(patch.colorShift);
    // Boolean settings — persist via electronAPI
    const settingsKeys = ['autoAttach','autoExecute','closeRoblox','debugConsole','topmost'];
    const settingsPatch = {};
    for (const k of settingsKeys) {
      if (patch[k] !== undefined) settingsPatch[k] = patch[k];
    }
    if (Object.keys(settingsPatch).length > 0) {
      window.electronAPI?.loadSettings?.().then(current => {
        window.electronAPI?.saveSettings?.({ ...current, ...settingsPatch });
      });
    }
    // Apply always-on-top immediately
    if (patch.topmost !== undefined) {
      window.electronAPI?.setAlwaysOnTop?.(patch.topmost);
    }
    addNotification?.({ type: 'success', title: 'Settings Updated', message: 'Settings applied by AI' });
  }, [setThemeMode, setAccentColor, setColorShift]);

  const handleScanTab = useCallback(async (tabName) => {
    const tab = findTabByName(tabs, tabName);
    if (!tab || tab.all) {
      addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` });
      return;
    }
    setActiveView('executor');
    setActiveTab(tab.id);
    const EXPECTED = ['hacktool','hack.tool','gamehack','game.hack','riskware','exploit','cheat','gamemod','tool.lua','not-a-virus'];
    const THREATS = ['trojan','stealer','keylogger','backdoor','ransomware','miner','worm','rootkit','spyware','banker','rat.','infostealer'];
    const SUSPICIOUS = ['grabify.link','iplogger.org','blasze.tk','2no.co','iplogger.com','iplogger.ru','yip.su','iplis.org','ipgrabber.ru','discord.com/api/webhooks'];
    handleUpdateTabScan(tab.id, 'scanning');
    addNotification({ type: 'info', title: 'Scanning', message: `Scanning "${tab.name}"...` });
    try {
      const content = tab.content || '';
      const hasSuspiciousDomain = SUSPICIOUS.some(d => content.toLowerCase().includes(d));
      const vtResult = await window.electronAPI?.virusTotalScan?.(content);
      if (!vtResult || vtResult.error) {
        handleUpdateTabScan(tab.id, 'unknown', { error: vtResult?.error || 'Scan failed' });
        addNotification({ type: 'warning', title: 'Scan Result', message: 'Scan failed or unavailable' });
        setScanFeedback({ tabName: tab.name, status: 'unknown', detections: [], error: vtResult?.error || 'Scan failed or unavailable', timestamp: Date.now() });
        return;
      }
      const detections = vtResult.detections || [];
      let hasRealThreat = false, hasExpected = false;
      for (const det of detections) {
        const r = det.result.toLowerCase();
        if (THREATS.some(t => r.includes(t))) { hasRealThreat = true; break; }
        if (EXPECTED.some(e => r.includes(e))) hasExpected = true;
      }
      if (hasRealThreat || hasSuspiciousDomain) {
        handleUpdateTabScan(tab.id, 'threat', { detections, hasSuspiciousDomain });
        addNotification({ type: 'error', title: 'Threat Detected', message: `"${tab.name}" contains a threat!` });
        setScanFeedback({ tabName: tab.name, status: 'threat', detections, hasSuspiciousDomain, timestamp: Date.now() });
      } else if (hasExpected) {
        handleUpdateTabScan(tab.id, 'expected', { detections });
        addNotification({ type: 'info', title: 'Scan Result', message: `"${tab.name}" looks like a game mod` });
        setScanFeedback({ tabName: tab.name, status: 'expected', detections, timestamp: Date.now() });
      } else if (detections.length > 0) {
        handleUpdateTabScan(tab.id, 'suspicious', { detections });
        addNotification({ type: 'warning', title: 'Scan Result', message: `"${tab.name}" has suspicious detections` });
        setScanFeedback({ tabName: tab.name, status: 'suspicious', detections, timestamp: Date.now() });
      } else {
        handleUpdateTabScan(tab.id, 'safe', { detections: [] });
        addNotification({ type: 'success', title: 'Scan Result', message: `"${tab.name}" is safe!` });
        setScanFeedback({ tabName: tab.name, status: 'safe', detections: [], timestamp: Date.now() });
      }
    } catch (err) {
      handleUpdateTabScan(tab.id, 'unknown', { error: err.message });
      addNotification({ type: 'error', title: 'Scan Error', message: err.message });
      setScanFeedback({ tabName: tab.name, status: 'unknown', detections: [], error: err.message, timestamp: Date.now() });
    }
  }, [tabs, handleUpdateTabScan, addNotification]);

  const handleRobloxAction = useCallback(async (action) => {
    switch (action) {
      case 'rejoin':
        await window.electronAPI?.aiRejoinServer?.();
        addNotification({ type: 'info', title: 'Rejoining', message: 'Rejoining server...' });
        break;
      case 'close-roblox':
        await window.electronAPI?.killRoblox?.();
        addNotification({ type: 'info', title: 'Roblox Closed', message: 'Roblox has been closed' });
        break;
      case 'restart-infernix':
        addNotification({ type: 'info', title: 'Restarting', message: 'Infernix is restarting...' });
        setTimeout(() => window.electronAPI?.restartApp?.(), 1200);
        break;
      case 'close-infernix':
        addNotification({ type: 'info', title: 'Closing', message: 'Closing Infernix...' });
        setTimeout(() => window.electronAPI?.quitApp?.(), 1200);
        break;
      case 'attach': {
        const t0 = performance.now();
        try {
          const result = await window.electronAPI?.attach?.();
          const elapsed = Math.round(performance.now() - t0);
          setStats(prev => recordAttach(prev, !!result?.ok, elapsed));
          addNotification({ type: 'success', title: 'Attached', message: 'Attached to Roblox' });
        } catch (e) {
          const elapsed = Math.round(performance.now() - t0);
          setStats(prev => recordAttach(prev, false, elapsed));
          addNotification({ type: 'error', title: 'Attach Error', message: e.message });
        }
        break;
      }
    }
  }, [addNotification]);

  const handleAddToAutoExec = useCallback(async (tabName) => {
    const result = findTabByName(tabs, tabName);
    let matchTabs;
    if (result?.all) {
      matchTabs = tabs;
    } else if (result) {
      matchTabs = [result];
    } else {
      matchTabs = [];
    }
    if (matchTabs.length === 0) {
      addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` });
      return;
    }
    for (const tab of matchTabs) {
      await window.electronAPI?.addToAutoExec?.({ name: tab.name, content: tab.content });
    }
    addNotification({ type: 'success', title: 'Auto Execute', message: `${matchTabs.length} script(s) added to Auto Execute` });
  }, [tabs, addNotification]);

  const handleSavePreset = useCallback(async (presetName) => {
    try {
      const settings = await window.electronAPI?.loadSettings?.();
      const presetData = {
        name: presetName || 'AI Preset',
        description: `Saved by Infernix AI — ${themeMode} theme`,
        settings: settings || null,
        theme: { themeMode, accentColor },
        tabs: null,
      };
      const result = await window.electronAPI?.savePreset?.(presetData);
      if (result?.ok) {
        addNotification({ type: 'success', title: 'Preset Saved', message: `"${presetData.name}" saved to Preset Manager` });
      }
    } catch {
      addNotification({ type: 'error', title: 'Preset Error', message: 'Failed to save preset' });
    }
  }, [themeMode, accentColor, addNotification]);

  const handleExecuteTab = useCallback(async (tabName) => {
    window.electronAPI?.logToMain?.('log', '[handleExecuteTab] called with:', tabName);
    addNotification({ type: 'info', title: 'Execute', message: `Looking for tab "${tabName}"...` });
    const tab = findTabByName(tabs, tabName);
    if (!tab || tab.all) {
      addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` });
      window.electronAPI?.logToMain?.('error', '[handleExecuteTab] Tab not found:', tabName);
      return;
    }
    window.electronAPI?.logToMain?.('log', '[handleExecuteTab] Found tab:', tab.name);
    const attached = clients.filter(c => (Array.isArray(c) ? c[3] : c.status) === 3);
    window.electronAPI?.logToMain?.('log', '[handleExecuteTab] Attached clients:', attached.length);
    if (attached.length === 0) {
      addNotification({ type: 'warning', title: 'Not Attached', message: 'Attach to Roblox first' });
      window.electronAPI?.logToMain?.('warn', '[handleExecuteTab] No attached clients');
      return;
    }
    const pids = attached.map(c => String(Array.isArray(c) ? c[0] : c.pid));
    const t0 = performance.now();
    let ok = false;
    try {
      window.electronAPI?.logToMain?.('log', '[handleExecuteTab] Calling IPC execute...');
      const result = await window.electronAPI?.execute?.(tab.content, pids, tab.name);
      window.electronAPI?.logToMain?.('log', '[handleExecuteTab] IPC result:', result);
      if (result?.ok) { ok = true; }
      else {
        throw new Error(result?.error || 'IPC returned not ok');
      }
    } catch (ipcErr) {
      window.electronAPI?.logToMain?.('warn', '[handleExecuteTab] IPC failed:', ipcErr.message);
      try {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', 'http://localhost:3110/o', true);
          xhr.setRequestHeader('Content-Type', 'text/plain');
          xhr.setRequestHeader('clients', JSON.stringify(pids));
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`HTTP ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error('HTTP request failed'));
          xhr.send(tab.content);
        });
        ok = true;
        window.electronAPI?.logToMain?.('log', '[handleExecuteTab] HTTP fallback succeeded');
        try { await window.electronAPI?.recordExecution?.(tab.name, tab.content); } catch (_) {}
      } catch (httpErr) {
        window.electronAPI?.logToMain?.('error', '[handleExecuteTab] HTTP fallback failed:', httpErr.message);
        addNotification({ type: 'error', title: 'Execution Failed', message: httpErr.message });
        return;
      }
    }
    const elapsed = Math.round(performance.now() - t0);
    setStats(prev => recordExecution(prev, elapsed));
    if (ok) addNotification({ type: 'success', title: 'Executed', message: `"${tab.name}" executed` });
  }, [tabs, clients, addNotification, setStats]);

  const handleExecuteAll = useCallback(async () => {
    const attached = clients.filter(c => (Array.isArray(c) ? c[3] : c.status) === 3);
    if (attached.length === 0) { addNotification({ type: 'warning', title: 'Not Attached', message: 'Attach to Roblox first' }); return; }
    const pids = attached.map(c => Array.isArray(c) ? c[0] : c.pid);
    const t0 = performance.now();
    for (const tab of tabs) {
      try { await window.electronAPI?.execute?.(tab.content, pids, tab.name); } catch (_) {}
    }
    const elapsed = Math.round(performance.now() - t0);
    setStats(prev => recordExecution(prev, elapsed));
    addNotification({ type: 'success', title: 'Executed All', message: `${tabs.length} script(s) executed` });
  }, [tabs, clients, addNotification]);

  const handleNewTabAI = useCallback(() => {
    handleNewTab();
    setActiveView('executor');
    addNotification({ type: 'success', title: 'New Tab', message: 'New script tab created' });
  }, [addNotification]);

  const handleCloseTabByName = useCallback((tabName) => {
    const tab = findTabByName(tabs, tabName);
    if (!tab || tab.all) { addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` }); return; }
    handleCloseTab(tab.id);
    addNotification({ type: 'info', title: 'Tab Closed', message: `"${tab.name}" closed` });
  }, [tabs, addNotification]);

  const handleDuplicateTab = useCallback((tabName) => {
    const tab = findTabByName(tabs, tabName);
    if (!tab || tab.all) { addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` }); return; }
    handleNewTab({ name: `${tab.name} (copy)`, content: tab.content });
    setActiveView('executor');
    addNotification({ type: 'success', title: 'Duplicated', message: `"${tab.name}" duplicated` });
  }, [tabs, addNotification]);

  const handleSaveScript = useCallback(async (tabName) => {
    const tab = findTabByName(tabs, tabName);
    if (!tab || tab.all) { addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` }); return; }
    await window.electronAPI?.saveScript?.(tab.name, '', tab.content);
    addNotification({ type: 'success', title: 'Script Saved', message: `"${tab.name}" saved to library` });
  }, [tabs, addNotification]);

  const handleLoadScript = (scriptContent) => {
    const newTab = {
      id: tabCounter.current++,
      name: `Script ${tabCounter.current - 1}`,
      content: scriptContent
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
    setActiveView('executor');
    addNotification({
      type: 'success',
      title: 'Script Loaded',
      message: 'Script added to new tab'
    });
  };

  const renderView = () => {
    switch (activeView) {
      case 'collab':
        return (
          <CollabView
            onStartCollab={(session) => startCollabSession(session)}
            onNotify={addNotification}
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            clients={clients}
            executionCount={executionCount}
            scriptCount={tabs.length}
            startTime={startTime}
            onViewChange={setActiveView}
            executorVersion={executorVersion}
            stats={stats}
          />
        );
      case 'executor':
        return (
          <EditorView
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNewTab={handleNewTab}
            onCloseTab={handleCloseTab}
            onRenameTab={handleRenameTab}
            onCodeChange={handleCodeChange}
            onUpdateTabScan={handleUpdateTabScan}
            onNotify={addNotification}
            clients={clients}
            remoteWrite={remoteWrite}
            remoteCursors={remoteCursors}
            collabTabId={collabTabIdRef.current}
            onSendCursor={handleSendCursor}
            stats={stats}
            onRecordExecution={(timeMs) => setStats(prev => recordExecution(prev, timeMs))}
          />
        );
      case 'scripthub':
        return <ScriptHub onLoadScript={handleLoadScript} clients={clients} />;
      case 'clients':
        return <ClientManager clients={clients} onNotify={addNotification} stats={stats} onAttach={() => handleRobloxAction('attach')} />;
      case 'settings':
        return (
          <SettingsView 
            tabs={tabs} 
            onNewTab={handleNewTab}
            onSwitchToExecutor={() => setActiveView('executor')}
            onStartTutorial={() => setTutorialActive(true)}
            onNotify={addNotification}
          />
        );
      case 'assistant':
        return (
          <Assistant 
            tabs={tabs}
            clients={clients}
            onWriteToTab={handleWriteToTab}
            onSwitchToExecutor={handleSwitchToExecutor}
            onNotify={addNotification}
            onNavigate={setActiveView}
            onNavigateToTab={handleNavigateToTab}
            onApplySettings={handleApplySettings}
            onRobloxAction={handleRobloxAction}
            onScanTab={handleScanTab}
            onAddToAutoExec={handleAddToAutoExec}
            onSavePreset={handleSavePreset}
            onExecuteTab={handleExecuteTab}
            onExecuteAll={handleExecuteAll}
            onNewTab={handleNewTabAI}
            onCloseTabByName={handleCloseTabByName}
            onDuplicateTab={handleDuplicateTab}
            onSaveScript={handleSaveScript}
            onStartTutorial={() => setTutorialActive(true)}
            stats={stats}
            onRecordAI={(timeMs) => setStats(prev => recordAI(prev, timeMs))}
            isPremium={isPremium}
          />
        );
      default:
        return (
          <EditorView
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNewTab={handleNewTab}
            onCloseTab={handleCloseTab}
            onRenameTab={handleRenameTab}
            onCodeChange={handleCodeChange}
            onUpdateTabScan={handleUpdateTabScan}
            onNotify={addNotification}
            clients={clients}
            remoteWrite={remoteWrite}
            remoteCursors={remoteCursors}
            collabTabId={collabTabIdRef.current}
            onSendCursor={handleSendCursor}
          />
        );
    }
  };

  return (
    <>
      <BackgroundOverlay />
      <div className="app">
        {/* Grid background (matches website) */}
        <div className="grid-bg" aria-hidden="true" />
        {/* Cursor glow */}
        <CursorGlow />
        <TitleBar
          activeView={activeView}
          onViewChange={setActiveView}
          clientCount={clients.length}
        />
        <div className="app-body">
          <main className={`main-view${activeView !== 'assistant' ? ' sidebar-open' : ''}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                className="view-transition"
                initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.993 }}
                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(3px)', scale: 0.993 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Assistant right sidebar — absolutely positioned, never overlaps content */}
          <AnimatePresence initial={false}>
            {activeView !== 'assistant' && (
              <motion.aside
                className="assistant-sidebar"
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
            <AssistantSidebar
              tabs={tabs}
              clients={clients}
              onWriteToTab={handleWriteToTab}
              onSwitchToExecutor={handleSwitchToExecutor}
              onNavigate={setActiveView}
              onNavigateToTab={handleNavigateToTab}
              onApplySettings={handleApplySettings}
              onNotify={addNotification}
              onScanTab={handleScanTab}
              onRobloxAction={handleRobloxAction}
              onLoadScript={handleLoadScript}
              scanFeedback={scanFeedback}
              onAddToAutoExec={handleAddToAutoExec}
              onSavePreset={handleSavePreset}
              onExecuteTab={handleExecuteTab}
              onExecuteAll={handleExecuteAll}
              onNewTab={handleNewTabAI}
              onCloseTabByName={handleCloseTabByName}
              onDuplicateTab={handleDuplicateTab}
              onSaveScript={handleSaveScript}
              onStartTutorial={() => setTutorialActive(true)}
              stats={stats}
              isPremium={isPremium}
              onRecordAI={(timeMs) => setStats(prev => recordAI(prev, timeMs))}
            />
            </motion.aside>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Notifications */}
      <Notification notifications={notifications} onRemove={removeNotification} />

      {/* Tutorial overlay */}
      <TutorialOverlay
        active={tutorialActive}
        onClose={handleTutorialClose}
        onNavigate={setActiveView}
        clients={clients}
        onRobloxAction={handleRobloxAction}
      />
    </>
  );
}

function App() {
  const [ready, setReady] = useState(false);   // loading screen done
  const [keyed, setKeyed] = useState(false);    // key validated
  const [premium, setPremium] = useState(isPremium());

  // After loading finishes, check for a saved valid key
  const handleLoadingDone = useCallback(() => {
    setReady(true);
    if (hasSavedKey()) {
      setKeyed(true);
      setPremium(isPremium());
    }
  }, []);

  if (!ready) return <LoadingScreen onDone={handleLoadingDone} />;
  if (!keyed) return <KeyGate onUnlocked={() => setKeyed(true)} />;
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppContent isPremium={premium} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;


