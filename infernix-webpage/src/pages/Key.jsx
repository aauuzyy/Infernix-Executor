import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Key, Copy, Check, AlertCircle, RefreshCw, Clock, Shield, Zap, Brain, Code2 } from 'lucide-react';

const STEPS = [
  'Initializing secure session...',
  'Generating unique identifier...',
  'Registering with key server...',
  'Finalizing 3-day access window...',
  'Key ready.',
];

function GeneratingAnimation({ step }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/10"
          style={{ borderTopColor: 'white' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-white/10"
          style={{ borderBottomColor: 'rgba(255,255,255,0.5)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Flame className="w-5 h-5 text-white" />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-sm text-white/50 font-mono"
        >
          {STEPS[step] || 'Processing...'}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function KeyDisplay({ keyValue, expiresAt, onCopy, copied }) {
  const timeLeft = expiresAt ? Math.max(0, expiresAt - Date.now()) : 0;
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full flex flex-col gap-4"
    >
      {/* Success badge */}
      <div className="flex items-center justify-center gap-2 text-green-400">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
        >
          <Shield className="w-5 h-5" />
        </motion.div>
        <span className="text-sm font-semibold">Key Generated Successfully</span>
      </div>

      {/* Key box */}
      <div className="relative group">
        {/* Animated gradient border */}
        <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-white/20 via-white/5 to-white/20 animate-pulse" />
        <div className="relative bg-black rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="font-mono text-sm text-white/90 break-all leading-relaxed">{keyValue}</span>
          <button
            onClick={onCopy}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/10 hover:border-white/20"
          >
            <AnimatePresence mode="wait">
              {copied
                ? <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-4 h-4 text-green-400" /></motion.div>
                : <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }}><Copy className="w-4 h-4 text-white/50" /></motion.div>
              }
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Expiry info */}
      <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
        <Clock className="w-3 h-3" />
        <span>Expires in {daysLeft}d {hoursLeft}h &mdash; valid until {expiresAt?.toLocaleString()}</span>
      </div>

      {/* Instructions */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-sm text-white/50 leading-relaxed">
        <p className="font-semibold text-white/70 mb-2">How to use:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Copy the key above</li>
          <li>Open Infernix — the key prompt will appear on startup</li>
          <li>Paste your key and click Activate</li>
          <li>You&apos;re in. Key auto-saves for 3 days.</li>
        </ol>
      </div>
    </motion.div>
  );
}

export default function KeyPage() {
  const [state, setState] = useState('idle'); // idle | generating | done | error
  const [keyValue, setKeyValue] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const stepRef = useRef(null);
  const [searchParams] = useSearchParams();

  const generate = async () => {
    if (state !== 'idle') return;
    setState('generating');
    setGenStep(0);

    // Animate through steps
    for (let i = 1; i < STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 300));
      setGenStep(i);
    }

    try {
      const res = await fetch('/api/generate-key', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setGenStep(STEPS.length - 1);
      await new Promise(r => setTimeout(r, 500));
      setKeyValue(data.key);
      setExpiresAt(new Date(data.expires_at));
      setState('done');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate key. Try again.');
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  // Auto-start key generation when navigated here by the AI assistant
  useEffect(() => {
    if (searchParams.get('autostart') === '1') {
      const t = setTimeout(() => generate(), 700);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = () => {
    navigator.clipboard.writeText(keyValue).catch(() => {
      const el = document.createElement('textarea');
      el.value = keyValue;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 relative">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.012] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.008] blur-3xl" />
      </div>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 w-full max-w-4xl"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-black border border-white/15 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Infernix</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs text-white/40 mb-4">
          <Key className="w-3 h-3" />
          Key System
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Get Your Key</h1>
        <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
          Free 3-day access key. No account needed — click, copy, paste.
        </p>

        {/* Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {['Free', 'No Account', 'Instant', '3-Day Access', 'Windows 10/11'].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/35">
              {tag}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Two-column body */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* LEFT — key card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.03]" />
            <div className="relative bg-[#080808] rounded-2xl p-6 md:p-8 flex flex-col gap-6">
              <AnimatePresence mode="wait">
                {state === 'idle' && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                        <Key className="w-7 h-7 text-white/60" />
                      </div>
                      <p className="text-sm text-white/40">
                        Keys are valid for <span className="text-white/70 font-medium">3 days</span> from generation.
                        After expiry, simply generate a new one.
                      </p>
                    </div>
                    <motion.button
                      onClick={generate}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm transition-all hover:bg-white/90 relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <Flame className="w-4 h-4" />
                        Generate Key
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </motion.button>
                  </motion.div>
                )}

                {state === 'generating' && (
                  <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <GeneratingAnimation step={genStep} />
                  </motion.div>
                )}

                {state === 'done' && (
                  <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <KeyDisplay keyValue={keyValue} expiresAt={expiresAt} onCopy={copy} copied={copied} />
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      onClick={() => { setState('idle'); setKeyValue(''); setExpiresAt(null); }}
                      className="mt-5 w-full py-2.5 rounded-xl border border-white/[0.07] text-white/30 text-sm hover:text-white/60 hover:border-white/15 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Generate another key
                    </motion.button>
                  </motion.div>
                )}

                {state === 'error' && (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-4">
                    <AlertCircle className="w-10 h-10 text-red-400/70" />
                    <p className="text-sm text-red-400/80 text-center">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="mt-4 text-xs text-white/20 text-center">
            Having issues?{' '}
            <a href="https://discord.gg/d3CdsJnHHb" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 transition-colors underline">
              Join our Discord
            </a>{' '}
            for support.
          </p>
        </motion.div>

        {/* RIGHT — how it works + what's included */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="flex flex-col gap-8"
        >
          {/* How it works */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-4">How it works</p>
            <div className="flex flex-col gap-3">
              {[
                { n: '1', title: 'Generate', desc: 'Click the button to instantly create a unique key tied to your IP.' },
                { n: '2', title: 'Copy',     desc: 'Copy the key to your clipboard with one click.' },
                { n: '3', title: 'Paste & go', desc: 'Open Infernix, paste the key on startup, and you\'re in.' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-[11px] font-bold text-white/35 shrink-0 mt-0.5">{s.n}</div>
                  <div>
                    <p className="text-sm font-semibold text-white/65">{s.title}</p>
                    <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What's included */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-4">What&apos;s included</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Zap    className="w-4 h-4" />, title: 'Script Hub',      desc: '10,000+ ready-to-run scripts' },
                { icon: <Brain  className="w-4 h-4" />, title: 'AI Assistant',    desc: 'Generate Lua scripts with AI' },
                { icon: <Shield className="w-4 h-4" />, title: 'Anti-cheat Safe', desc: 'Bypasses Byfron & Hyperion' },
                { icon: <Code2  className="w-4 h-4" />, title: 'Monaco Editor',   desc: 'Pro-grade Lua code editor' },
              ].map(f => (
                <div key={f.title} className="flex flex-col gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/35">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/65">{f.title}</p>
                    <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-black border border-white/15 flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Infernix</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs text-white/40 mb-4">
          <Key className="w-3 h-3" />
          Key System
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Get Your Key
        </h1>
        <p className="text-white/40 text-base max-w-md mx-auto leading-relaxed">
          Generate a free 3-day access key. No account needed — just click, copy, and paste into Infernix.
        </p>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="flex flex-wrap justify-center gap-2 mb-8"
      >
        {['Free', 'No Account', 'Instant', '3-Day Access', 'Windows 10/11'].map(tag => (
          <span key={tag} className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/35">
            {tag}
          </span>
        ))}
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md"
      >
        <div className="relative">
          {/* Card glow border */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.03]" />
          <div className="relative bg-[#080808] rounded-2xl p-6 md:p-8 flex flex-col gap-6">

            {/* Idle state: generate button */}
            <AnimatePresence mode="wait">
              {state === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                      <Key className="w-7 h-7 text-white/60" />
                    </div>
                    <p className="text-sm text-white/40">
                      Keys are valid for <span className="text-white/70 font-medium">3 days</span> from generation.
                      After expiry, simply generate a new one.
                    </p>
                  </div>
                  <motion.button
                    onClick={generate}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm transition-all hover:bg-white/90 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Flame className="w-4 h-4" />
                      Generate Key
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </motion.button>
                </motion.div>
              )}

              {state === 'generating' && (
                <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GeneratingAnimation step={genStep} />
                </motion.div>
              )}

              {state === 'done' && (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <KeyDisplay keyValue={keyValue} expiresAt={expiresAt} onCopy={copy} copied={copied} />
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => { setState('idle'); setKeyValue(''); setExpiresAt(null); }}
                    className="mt-5 w-full py-2.5 rounded-xl border border-white/[0.07] text-white/30 text-sm hover:text-white/60 hover:border-white/15 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Generate another key
                  </motion.button>
                </motion.div>
              )}

              {state === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-4"
                >
                  <AlertCircle className="w-10 h-10 text-red-400/70" />
                  <p className="text-sm text-red-400/80 text-center">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-xs text-white/20 text-center max-w-sm"
      >
        Having issues? Join our{' '}
        <a href="https://discord.gg/d3CdsJnHHb" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 transition-colors underline">
          Discord server
        </a>{' '}
        for support.
      </motion.p>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="w-full max-w-md mt-12"
      >
        <p className="text-[10px] uppercase tracking-widest text-white/20 text-center mb-5">How it works</p>
        <div className="flex flex-col gap-3">
          {[
            { n: '1', title: 'Generate',     desc: 'Click the button to instantly create a unique key' },
            { n: '2', title: 'Copy',         desc: 'Copy the key to your clipboard with one click' },
            { n: '3', title: 'Paste & go',   desc: 'Open Infernix, paste the key on startup, and you\'re in' },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-[11px] font-bold text-white/35 shrink-0">{s.n}</div>
              <div>
                <p className="text-sm font-semibold text-white/65">{s.title}</p>
                <p className="text-xs text-white/30 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* What's included grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="w-full max-w-md mt-8 mb-16"
      >
        <p className="text-[10px] uppercase tracking-widest text-white/20 text-center mb-5">What&apos;s included</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Zap   className="w-4 h-4" />, title: 'Script Hub',      desc: '10,000+ ready-to-run scripts' },
            { icon: <Brain className="w-4 h-4" />, title: 'AI Assistant',    desc: 'Generate Lua scripts with AI' },
            { icon: <Shield className="w-4 h-4" />, title: 'Anti-cheat Safe', desc: 'Bypasses Byfron & Hyperion' },
            { icon: <Code2 className="w-4 h-4" />, title: 'Monaco Editor',   desc: 'Pro-grade Lua code editor' },
          ].map(f => (
            <div key={f.title} className="flex flex-col gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/35">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/65">{f.title}</p>
                <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
