import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, Zap, Sparkles } from 'lucide-react';

const MODELS = [
  { id: 'groq',   provider: 'groq',   model: 'llama-3.3-70b-versatile', name: 'Groq Llama', desc: 'Fast & free', icon: Zap, requiresPremium: false },
  { id: 'kimi',   provider: 'kimi',   model: 'kimi-k2-6',               name: 'Kimi K2.6',  desc: 'Thinking & reasoning', icon: Sparkles, requiresPremium: true },
  { id: 'gemini', provider: 'gemini', model: 'gemini-2.5-flash',        name: 'Gemini 2.5', desc: 'Temporarily locked',   icon: Zap, requiresPremium: true, locked: true },
];

export default function ModelPicker({ provider, onChange, isPremium }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = MODELS.find(m => m.provider === provider) || MODELS[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-muted)',
          fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
          cursor: 'pointer', transition: 'all 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <CurrentIcon size={11} style={{ color: 'var(--accent)' }} />
        <span>{current.name}</span>
        <ChevronDown size={11} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
              minWidth: 180,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '6px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            {MODELS.map(m => {
              const Icon = m.icon;
              const locked = (m.requiresPremium && !isPremium) || m.locked;
              const active = m.provider === current.provider;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    if (!locked) { onChange(m.provider, m.model); setOpen(false); }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 6,
                    border: 'none', background: active ? 'var(--bg-hover)' : 'transparent',
                    color: locked ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontSize: 12, fontFamily: 'inherit',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    opacity: locked ? 0.5 : 1,
                    transition: 'background 0.12s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!locked) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {m.name}
                      {locked && <Lock size={10} style={{ opacity: 0.7 }} />}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.desc}</div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
