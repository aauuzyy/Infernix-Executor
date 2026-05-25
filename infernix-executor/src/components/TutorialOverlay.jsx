import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Rocket, BookOpen, Link, AlertCircle, CheckCircle } from 'lucide-react';
import './TutorialOverlay.css';

// ─── Steps definition ───────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    view: null,
    title: 'Welcome to Infernix',
    text: "Let's take a quick tour of everything Infernix has to offer. This will only take a minute — and you'll know the app inside and out.",
    selector: null,
    padding: 0,
    icon: Sparkles,
  },
  {
    id: 'navbar',
    view: 'dashboard',
    title: 'Navigation Bar',
    text: 'Use the navigation bar at the top to switch between views — Dashboard, Executor, Script Hub, Clients, Settings, and the AI Assistant.',
    selector: '.titlebar-nav',
    padding: 10,
    icon: BookOpen,
  },
  {
    id: 'dashboard',
    view: 'dashboard',
    title: 'Dashboard',
    text: 'Your home base. See live session stats, attached client count, total executions, uptime, and quick-launch actions at a glance.',
    selector: '.dashboard',
    padding: 12,
    icon: BookOpen,
  },
  {
    id: 'tabs',
    view: 'executor',
    title: 'Script Tabs',
    text: 'Manage multiple scripts at once. Click + to create a new tab, double-click to rename it, and right-click for copy or close options.',
    selector: '.tab-bar',
    padding: 6,
    icon: BookOpen,
  },
  {
    id: 'toolbar',
    view: 'executor',
    title: 'Toolbar',
    text: 'Quick-access buttons for Execute, Clear, Kill Roblox, Hook templates, AutoExec management, VirusTotal scanning, and file operations.',
    selector: '.toolbar',
    padding: 6,
    icon: BookOpen,
  },
  {
    id: 'editor',
    view: 'executor',
    title: 'Script Editor',
    text: 'A full Monaco editor with Lua syntax highlighting, auto-complete, and error markers. Drop .lua or .txt files directly onto the editor.',
    selector: '.editor-container',
    padding: 8,
    icon: BookOpen,
  },
  {
    id: 'hooks',
    view: 'executor',
    title: 'Hook Templates',
    text: 'The Hook button (</> icon) in the toolbar drops ready-made Lua templates into the editor — RemoteEvent listeners, NameCall hooks, function wrappers, and more. A huge time-saver.',
    selector: '.toolbar',
    padding: 6,
    icon: BookOpen,
  },
  {
    id: 'autoexec',
    view: 'executor',
    title: 'Auto-Execute on Join',
    text: 'AutoExec runs scripts automatically whenever you join a Roblox game. Click the AutoExec button in the toolbar to add the current tab to your autoexec list — it will fire every time you load in.',
    selector: '.toolbar',
    padding: 6,
    icon: BookOpen,
  },
  {
    id: 'virustotal',
    view: 'executor',
    title: 'VirusTotal Scan',
    text: "Safety first — the Shield icon in the toolbar uploads the current script to VirusTotal and shows a summary of any engine detections. Always scan untrusted scripts before running them.",
    selector: '.toolbar',
    padding: 6,
    icon: BookOpen,
  },
  {
    id: 'execution-history',
    view: 'executor',
    title: 'Execution History',
    text: 'Switch to the History tab inside the executor to see a full log of every script you\'ve executed — timestamped, with game info. You can re-run or restore any past script in one click.',
    selector: '.tab-bar',
    padding: 6,
    icon: BookOpen,
  },
  {
    id: 'scripthub',
    view: 'scripthub',
    title: 'Script Hub',
    text: 'Browse thousands of community scripts. Search by game, preview code, and execute with one click — no copy-pasting required.',
    selector: '.scripthub',
    padding: 12,
    icon: BookOpen,
  },
  {
    id: 'attach',
    view: 'clients',
    title: 'Attaching to Roblox',
    text: null, // computed dynamically
    selector: null,
    padding: 0,
    icon: Rocket,
    interactive: true,
  },
  {
    id: 'clients',
    view: 'clients',
    title: 'Client Manager',
    text: null, // computed dynamically
    selector: '.client-manager',
    padding: 12,
    icon: BookOpen,
    interactive: true,
  },
  {
    id: 'settings',
    view: 'settings',
    title: 'Settings',
    text: 'Customize everything — themes, accent colors, auto-attach, auto-execute, background images, and more. Preferences are saved automatically.',
    selector: '.settings-view',
    padding: 12,
    icon: BookOpen,
  },
  {
    id: 'theme',
    view: 'settings',
    title: 'Themes & Accent Colors',
    text: 'Pick from Dark, Light, or Midnight themes, then choose an accent color to make Infernix your own. Changes apply instantly — no restart needed.',
    selector: '.settings-view',
    padding: 12,
    icon: BookOpen,
  },
  {
    id: 'background',
    view: 'settings',
    title: 'Custom Background',
    text: 'Upload any image as your app background. Adjust the blur slider to keep it subtle or make it bold. The UI adapts its contrast automatically so text stays readable.',
    selector: '.settings-view',
    padding: 12,
    icon: BookOpen,
  },
  {
    id: 'presets',
    view: 'settings',
    title: 'Preset Themes',
    text: 'The Preset Manager lets you save your current theme configuration — colors, background, toggles — and restore it with one click. Perfect for switching between setups.',
    selector: '.settings-view',
    padding: 12,
    icon: BookOpen,
  },
  {
    id: 'ai-sidebar',
    view: 'dashboard',
    title: 'AI Assistant',
    text: "Your always-on AI co-pilot. Ask anything, generate scripts, navigate the app with natural language, and automate your entire workflow. Try asking it anything!",
    selector: '.assistant-sidebar',
    padding: 0,
    icon: Sparkles,
  },
  {
    id: 'finish',
    view: null,
    title: "You're all set!",
    text: "That's the full tour! You now know everything you need to script smarter with Infernix. Stuck? Just ask the AI Assistant — it can do almost anything.",
    selector: null,
    padding: 0,
    icon: Rocket,
  },
];

// ─── Typewriter hook ─────────────────────────────────────────────────────────
function useTypewriter(text, speed = 20) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  const skipToEnd = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(text || '');
    setDone(true);
  }, [text]);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) { setDone(true); return; }

    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timerRef.current);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(timerRef.current);
  }, [text, speed]);

  return { displayed, done, skipToEnd };
}

// ─── Spotlight SVG overlay ───────────────────────────────────────────────────
function SpotlightSVG({ rect, padding, vw, vh }) {
  const uniqueId = useRef(`tut-mask-${Math.random().toString(36).slice(2)}`).current;

  if (!rect) {
    return (
      <div
        className="tut-backdrop"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', zIndex: 9998, pointerEvents: 'none' }}
      />
    );
  }

  const px = padding;
  const sx = rect.x - px;
  const sy = rect.y - px;
  const sw = rect.width + px * 2;
  const sh = rect.height + px * 2;
  const br = 12;

  return (
    <svg
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9998 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id={uniqueId}>
          <rect width={vw} height={vh} fill="white" />
          <rect x={sx} y={sy} width={sw} height={sh} rx={br} ry={br} fill="black" />
        </mask>
      </defs>

      {/* Dark backdrop with spotlight hole */}
      <rect width={vw} height={vh} fill="rgba(0,0,0,0.80)" mask={`url(#${uniqueId})`} />

      {/* Spotlight border (crisp line, no glow) */}
      <rect
        x={sx} y={sy}
        width={sw} height={sh}
        rx={0} ry={0}
        fill="none"
        stroke="rgba(255,255,255,0.30)"
        strokeWidth="1.5"
      />

      {/* Corner accents */}
      {[
        [sx, sy],
        [sx + sw, sy],
        [sx, sy + sh],
        [sx + sw, sy + sh],
      ].map(([cx, cy], i) => {
        const len = 12;
        const dx1 = i % 2 === 0 ? len : -len;
        const dy1 = i < 2 ? len : -len;
        return (
          <g key={i} stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
            <line x1={cx} y1={cy} x2={cx + dx1} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + dy1} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ total, current }) {
  return (
    <div className="tut-dots">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`tut-dot${i === current ? ' active' : i < current ? ' done' : ''}`}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TutorialOverlay({ active, onClose, onNavigate, clients, onRobloxAction }) {
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState(null);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [attachTried, setAttachTried] = useState(false);

  const hasClients = (clients || []).length > 0;
  const clientCount = (clients || []).length;
  const isAttached = (clients || []).some(c => (Array.isArray(c) ? c[3] : c.status) === 3);

  // Compute dynamic text per step based on actual app state
  const getStepText = useCallback((stepId) => {
    switch (stepId) {
      case 'attach': {
        if (hasClients)
          return `You're already attached! ${clientCount} Roblox instance${clientCount !== 1 ? 's are' : ' is'} connected and ready. You can see ${clientCount !== 1 ? 'them' : 'it'} listed below — each entry shows the PID, username, and current game.`;
        if (attachTried)
          return `Roblox doesn't seem to be running right now — that's okay! Open Roblox and then click the Attach button (top of this page) or click "Try Attach" below to connect. You can do this at any time.`;
        return `Before you can execute scripts, Infernix needs to attach to Roblox. Make sure Roblox is open, then click the Attach button at the top of this page — or hit "Try Attach" below to connect right now.`;
      }
      case 'clients': {
        if (hasClients)
          return `${isAttached ? '✓ Attached!' : 'Roblox detected!'} You have ${clientCount} active instance${clientCount !== 1 ? 's' : ''}. Here you can manage each connection, see the current game per PID, and target specific clients for script execution.`;
        return `No Roblox clients connected yet — that's fine! Once you attach, every open Roblox instance appears here in real time with its PID, username, and current game. You can target specific clients for execution.`;
      }
      default:
        return STEPS.find(s => s.id === stepId)?.text || '';
    }
  }, [hasClients, clientCount, isAttached, attachTried]);

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const stepText = currentStep.text ?? getStepText(currentStep.id);

  const { displayed, done, skipToEnd } = useTypewriter(active ? stepText : '', 18);

  // Reset attachTried when step changes
  useEffect(() => { setAttachTried(false); }, [step]);

  // ── Script Hub demo scroll animation ──
  useEffect(() => {
    if (!active || currentStep.id !== 'scripthub') return;
    let cancelled = false;
    let pollTimer = null;
    let rafId = null;

    // Poll until the grid has at least 6 rendered cards, then animate
    const waitForCards = () => {
      if (cancelled) return;
      const grid = document.querySelector('.scripts-grid');
      const cards = grid ? grid.querySelectorAll('.script-card, [class*="script-card"], .script-item, [class*="script-item"]') : [];
      if (cards.length >= 6) {
        // Cards are loaded — wait one more frame to let layout settle, then scroll
        requestAnimationFrame(() => {
          if (cancelled) return;
          const container = document.querySelector('.scripts-container');
          if (!container) return;

          const totalDuration = 3200;
          const targetScroll = 1800;
          const startTime = performance.now();
          const startScroll = container.scrollTop;

          // Fast burst → long glide (expo in, quad out)
          const ease = (t) => {
            if (t < 0.35) {
              const p = t / 0.35;
              return p * p * p * 0.55;
            }
            const p = (t - 0.35) / 0.65;
            return 0.55 + (1 - (1 - p) * (1 - p)) * 0.45;
          };

          const animate = (now) => {
            if (cancelled) return;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            container.scrollTop = startScroll + targetScroll * ease(progress);
            if (progress < 1) { rafId = requestAnimationFrame(animate); }
          };
          rafId = requestAnimationFrame(animate);
        });
      } else {
        pollTimer = setTimeout(waitForCards, 200);
      }
    };

    // Start polling after view has switched and initial render fired
    pollTimer = setTimeout(waitForCards, 500);

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [step, active]); // eslint-disable-line

  // ── Navigate view when step changes ──
  useEffect(() => {
    if (!active) return;
    if (currentStep.view) {
      onNavigate(currentStep.view);
    }
  }, [step, active]); // eslint-disable-line

  // ── Query spotlight element ──
  useEffect(() => {
    if (!active || !currentStep.selector) {
      setSpotRect(null);
      return;
    }
    const delay = currentStep.view ? 380 : 80;
    const t = setTimeout(() => {
      const el = document.querySelector(currentStep.selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setSpotRect({ x: r.left, y: r.top, width: r.width, height: r.height });
      } else {
        setSpotRect(null);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [step, active, currentStep.selector, currentStep.view]);

  // Re-query spotlight when clients change (attach step may shift layout)
  useEffect(() => {
    if (!active || !currentStep.selector) return;
    const el = document.querySelector(currentStep.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setSpotRect({ x: r.left, y: r.top, width: r.width, height: r.height });
    }
  }, [clients]); // eslint-disable-line

  // ── Window resize ──
  useEffect(() => {
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Reset step when opened ──
  useEffect(() => {
    if (active) setStep(0);
  }, [active]);

  const goNext = useCallback(() => {
    if (!done) { skipToEnd(); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else onClose();
  }, [done, step, skipToEnd, onClose]);

  const goPrev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  if (!active) return null;

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  // ── Popup positioning ──
  const PADDING = currentStep.padding ?? 16;
  const POPUP_W = 420;
  const POPUP_H_EST = 300;
  const GAP = 18;

  let popupPos = {};
  if (!spotRect) {
    popupPos = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  } else {
    const spx = spotRect.x - PADDING;
    const spy = spotRect.y - PADDING;
    const spw = spotRect.width + PADDING * 2;
    const sph = spotRect.height + PADDING * 2;
    const cx = spx + spw / 2;

    const canBelow  = spy + sph + GAP + POPUP_H_EST < windowSize.h - 8;
    const canAbove  = spy - GAP - POPUP_H_EST > 8;
    const canRight  = spx + spw + GAP + POPUP_W < windowSize.w - 8;

    const clampX = (x) => Math.max(16, Math.min(x, windowSize.w - POPUP_W - 16));
    const clampY = (y) => Math.max(16, Math.min(y, windowSize.h - POPUP_H_EST - 16));

    if (canBelow) {
      popupPos = { left: clampX(cx - POPUP_W / 2), top: spy + sph + GAP };
    } else if (canAbove) {
      popupPos = { left: clampX(cx - POPUP_W / 2), top: spy - GAP - POPUP_H_EST };
    } else if (canRight) {
      popupPos = { left: spx + spw + GAP, top: clampY(spy + sph / 2 - POPUP_H_EST / 2) };
    } else {
      popupPos = { left: Math.max(16, spx - GAP - POPUP_W), top: clampY(spy + sph / 2 - POPUP_H_EST / 2) };
    }
  }

  // ── Interactive attach button state ──
  const showAttachBtn = currentStep.id === 'attach' && !hasClients;
  const showAttachSuccess = currentStep.id === 'attach' && hasClients;
  const showClientsStatus = currentStep.id === 'clients';

  return (
    <div className="tut-root">
      {/* Click interceptor — blocks app interaction during tutorial */}
      <div className="tut-click-block" onClick={() => { if (!done) skipToEnd(); }} />

      {/* Spotlight SVG */}
      <SpotlightSVG
        rect={spotRect}
        padding={PADDING}
        vw={windowSize.w}
        vh={windowSize.h}
      />

      {/* Skip button — fixed top-left */}
      <motion.button
        className="tut-skip"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={onClose}
      >
        <X size={12} />
        Skip Tour
      </motion.button>

      {/* Step label — top-right */}
      <motion.div
        className="tut-step-badge"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {step + 1} / {STEPS.length}
      </motion.div>

      {/* Popup card — persistent, slides to new position */}
      <motion.div
        className="tut-popup"
        style={{ position: 'fixed', width: POPUP_W, zIndex: 10000 }}
        animate={{
          left: typeof popupPos.left === 'number' ? popupPos.left : undefined,
          top:  typeof popupPos.top  === 'number' ? popupPos.top  : undefined,
          x: popupPos.transform ? '-50%' : 0,
          y: popupPos.transform ? '-50%' : 0,
          ...(popupPos.transform ? { left: '50%', top: '50%' } : {}),
        }}
        initial={false}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
          {/* Header */}
          <div className="tut-popup-header">
            <div className="tut-popup-icon">
              <Icon size={16} />
            </div>
            <h3 className="tut-popup-title">{currentStep.title}</h3>
          </div>

          {/* Body text with typewriter */}
          <div className="tut-popup-body">
            <p className="tut-popup-text">
              {displayed}
              {!done && <span className="tut-cursor" />}
            </p>

            {/* Interactive: attach status badge */}
            {done && showAttachSuccess && (
              <div className="tut-status tut-status-ok">
                <CheckCircle size={13} />
                <span>{clientCount} client{clientCount !== 1 ? 's' : ''} connected — ready to execute!</span>
              </div>
            )}
            {done && showClientsStatus && !hasClients && (
              <div className="tut-status tut-status-warn">
                <AlertCircle size={13} />
                <span>No clients yet — attach to Roblox to see them appear here.</span>
              </div>
            )}
            {done && showClientsStatus && hasClients && (
              <div className="tut-status tut-status-ok">
                <CheckCircle size={13} />
                <span>{clientCount} instance{clientCount !== 1 ? 's' : ''} visible</span>
              </div>
            )}

            {/* Interactive: try attach button */}
            {done && showAttachBtn && (
              <button
                className={`tut-action-btn${attachTried ? ' tried' : ''}`}
                onClick={() => {
                  setAttachTried(true);
                  onRobloxAction?.('attach');
                  skipToEnd();
                }}
              >
                <Link size={13} />
                {attachTried ? 'Try Again' : 'Try Attach'}
              </button>
            )}
          </div>

          {/* Progress */}
          <ProgressDots total={STEPS.length} current={step} />

          {/* Actions */}
          <div className="tut-popup-actions">
            {!isFirst && (
              <button className="tut-btn-back" onClick={goPrev}>
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            <motion.button
              className={`tut-btn-next${isLast ? ' finish' : ''}`}
              onClick={goNext}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {isLast ? (
                <>
                  <Rocket size={14} />
                  Get Started
                </>
              ) : done ? (
                <>
                  Next
                  <ChevronRight size={14} />
                </>
              ) : (
                <>
                  Skip text
                  <ChevronRight size={14} />
                </>
              )}
            </motion.button>
          </div>
      </motion.div>
    </div>
  );
}
