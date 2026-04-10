import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Send, Flame, ChevronDown, RotateCcw,
  Copy, Sparkles, HelpCircle, Edit3, Globe, Brain, User,
} from 'lucide-react';

const STORAGE_KEY = 'infernix-chat-v1';
const NAV_RE = /\[NAV:(\/[^\]]*)\]/g;

function stripNav(text) {
  const matches = [...text.matchAll(NAV_RE)];
  const path = matches.length ? matches[matches.length - 1][1] : null;
  return { path, text: text.replace(NAV_RE, '').trim() };
}

// ── Avatars ───────────────────────────────────────────────────
function AIAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0 shadow-sm">
      <Flame className="w-3 h-3 text-white" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
      <User size={13} className="text-white/60" />
    </div>
  );
}

// ── Thinking block ────────────────────────────────────────────
function ThinkBlock({ content, seconds, live }) {
  const [open, setOpen] = useState(false);

  if (live) {
    return (
      <div className="flex items-center gap-2 mb-2 pl-0.5">
        <div className="flex gap-0.5 items-end">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-white/25 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-white/25 italic">Thinking…</span>
      </div>
    );
  }

  if (!content || !seconds) return null;

  return (
    <div className="mb-2.5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/45 transition-colors"
      >
        <Brain size={10} className="opacity-50 shrink-0" />
        <span>Thought for {seconds}s</span>
        <ChevronDown
          size={10}
          className={`transition-transform duration-200 shrink-0 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 pl-3 border-l border-white/8 text-[11px] text-white/20 leading-relaxed max-h-28 overflow-y-auto chat-scroll">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Typing dots ───────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1 py-0.5 px-0.5 items-center">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/35 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────
function MsgBubble({ msg, onCtx }) {
  const isUser = msg.role === 'user';
  const isEmpty = !msg.content && msg.streaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
    >
      {/* Avatar + name + time */}
      <div className={`flex items-center gap-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
        {isUser ? <UserAvatar /> : <AIAvatar />}
        <span className="text-[10px] text-white/30 font-medium">
          {isUser ? 'You' : 'Infernix AI'}
        </span>
        {msg.timestamp && (
          <span className="text-[9px] text-white/15">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Thinking */}
      {!isUser && (msg.streaming && msg.inThink
        ? <ThinkBlock live />
        : <ThinkBlock content={msg.thinking} seconds={msg.thinkTime} />
      )}

      {/* Bubble */}
      <div
        onContextMenu={e => onCtx(e, msg)}
        className={`max-w-[90%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed select-text cursor-default ${
          isUser
            ? 'bg-white text-black font-medium rounded-tr-sm'
            : 'bg-white/[0.06] text-white/85 rounded-tl-sm border border-white/[0.07]'
        }`}
      >
        {isEmpty ? <TypingDots /> : isUser ? (msg.content || '') : (
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p className="mb-1.5 last:mb-0" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5" {...props} />,
              li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
              em: ({node, ...props}) => <em className="italic text-white/90" {...props} />,
              code: ({node, inline, ...props}) => inline
                ? <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono text-white/90" {...props} />
                : <code className="block bg-white/10 p-2 rounded-lg text-xs font-mono text-white/90 mt-1 mb-1.5 overflow-x-auto whitespace-pre" {...props} />,
              h1: ({node, ...props}) => <h1 className="font-semibold text-white text-base mb-1" {...props} />,
              h2: ({node, ...props}) => <h2 className="font-semibold text-white text-sm mb-1" {...props} />,
              h3: ({node, ...props}) => <h3 className="font-medium text-white text-sm mb-1" {...props} />,
              a: ({node, ...props}) => <a className="underline text-white/70 hover:text-white" target="_blank" rel="noopener noreferrer" {...props} />,
            }}
          >{msg.content || ''}</ReactMarkdown>
        )}
      </div>
    </motion.div>
  );
}

// ── Message context menu ──────────────────────────────────────
function MsgCtxMenu({ x, y, msg, onClose, onAIAction }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const down = e => { if (!ref.current?.contains(e.target)) onClose(); };
    const esc = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - width - 8),
      y: Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y]);

  const items = [
    { icon: Copy, label: 'Copy message', action: () => navigator.clipboard.writeText(msg.content) },
    ...(msg.role === 'assistant' ? [
      null,
      { icon: Globe,       label: 'Translate to English', action: () => onAIAction('translate', msg) },
      { icon: Sparkles,    label: 'Summarize',            action: () => onAIAction('summarize', msg) },
      { icon: HelpCircle,  label: 'Explain simply',       action: () => onAIAction('explain', msg) },
    ] : [
      { icon: Edit3, label: 'Edit & resend', action: () => onAIAction('edit', msg) },
    ]),
  ];

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.1 }}
      style={{ top: pos.y, left: pos.x }}
      className="ctx-menu fixed z-[9999] min-w-[200px] rounded-xl border border-white/10 shadow-2xl overflow-hidden py-1"
    >
      <div className="px-3 py-1.5 border-b border-white/[0.07]">
        <span className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">
          {msg.role === 'user' ? 'Your message' : 'AI message'}
        </span>
      </div>
      {items.map((item, i) =>
        item === null ? (
          <div key={i} className="my-1 border-t border-white/[0.07]" />
        ) : (
          <button
            key={item.label}
            onClick={() => { item.action(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-default"
          >
            <item.icon size={13} className="shrink-0 opacity-55" />
            {item.label}
          </button>
        )
      )}
    </motion.div>,
    document.body
  );
}

// ── Suggested prompts ─────────────────────────────────────────
const SUGGESTIONS = [
  "What features does Infernix have?",
  "Take me to the download page",
  "What's new in v1.3.1?",
  "How do I use the AI assistant?",
];

// ── Main component ────────────────────────────────────────────
export default function ChatSidebar() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);  // kept for compat, unused
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);

  const bottomRef = useRef(null);
  const textRef = useRef(null);

  // Persist (only finalized messages)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter(m => !m.streaming)));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 110) + 'px';
    }
  }, [input]);

  const doSend = useCallback(async (text) => {
    const trimmed = typeof text === 'string' ? text.trim() : input.trim();
    if (!trimmed || busy) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    const aiId = `a-${Date.now() + 1}`;
    const aiMsg = {
      id: aiId,
      role: 'assistant',
      content: '',
      thinking: '',
      thinkTime: 0,
      inThink: false,
      streaming: true,
      timestamp: Date.now() + 1,
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setBusy(true);

    const history = messages
      .filter(m => !m.streaming)
      .concat(userMsg)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const raw = data.content ?? '';

      // Parse <think>...</think> out of the full response
      const thinkStart = Date.now();
      let think = '';
      let full = raw;
      const thinkMatch = raw.match(/^<think>([\s\S]*?)<\/think>\s*/);
      if (thinkMatch) {
        think = thinkMatch[1].trim();
        full = raw.slice(thinkMatch[0].length);
      }
      const thinkTime = think ? Math.max(1, Math.round(think.length / 400)) : 0;

      const { path, text: cleaned } = stripNav(full);

      // Typewriter reveal
      let revealed = '';
      for (let i = 0; i < cleaned.length; i++) {
        revealed += cleaned[i];
        const snap = revealed;
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: snap, thinking: think, thinkTime, streaming: true } : m
        ));
        await new Promise(r => setTimeout(r, 8));
      }

      setMessages(prev => prev.map(m =>
        m.id === aiId
          ? { ...m, content: cleaned, thinking: think, thinkTime, streaming: false }
          : m
      ));

      if (path) setTimeout(() => navigate(path), 700);

    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiId
          ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false }
          : m
      ));
    }

    setBusy(false);
  }, [messages, busy, input, navigate]);

  const handleCtx = useCallback((e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, msg });
  }, []);

  const handleAIAction = useCallback((action, msg) => {
    const prompts = {
      translate: `Please translate this to English:\n\n"${msg.content}"`,
      summarize: `Summarize this in 1-2 sentences:\n\n"${msg.content}"`,
      explain:   `Explain this very simply:\n\n"${msg.content}"`,
    };
    if (action === 'edit') {
      setInput(msg.content);
      textRef.current?.focus();
    } else if (prompts[action]) {
      doSend(prompts[action]);
    }
    setCtxMenu(null);
  }, [doSend]);

  return (
    <>
      {/* ── Always-visible sidebar ───────────────────── */}
      <aside className="fixed right-0 top-0 bottom-0 z-40 w-80 flex flex-col bg-[rgba(0,0,0,0.80)] backdrop-blur-2xl border-l border-white/[0.07]">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07] shrink-0">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-black border border-white/20 flex items-center justify-center shadow-sm">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white leading-tight">Infernix AI</div>
            <div className="text-[10px] text-white/30 mt-0.5">Ask me anything • Free forever</div>
          </div>
          <button
            onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); }}
            title="Clear chat"
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 chat-scroll">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center mt-6"
            >
              <div className="w-12 h-12 rounded-full bg-black border border-white/12 flex items-center justify-center mx-auto mb-4">
                <Flame className="w-5 h-5 text-white/40" />
              </div>
              <p className="text-white/25 text-xs leading-relaxed mb-5">
                Hi! I'm Infernix AI.<br />Ask me anything or pick a suggestion.
              </p>
              <div className="space-y-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => doSend(s)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/40 hover:text-white/70 hover:border-white/15 hover:bg-white/[0.06] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map(msg => (
            <MsgBubble key={msg.id} msg={msg} onCtx={handleCtx} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2.5 border-t border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-1.5 focus-within:border-white/20 transition-colors">
            <textarea
              ref={textRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  doSend();
                }
              }}
              placeholder="Ask anything…"
              rows={1}
              disabled={busy}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/20 resize-none focus:outline-none disabled:opacity-40 leading-normal py-0.5"
              style={{ maxHeight: '90px' }}
            />
            <motion.button
              onClick={doSend}
              disabled={!input.trim() || busy}
              className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-black disabled:opacity-20 hover:bg-white/90 transition-all shrink-0"
              whileTap={{ scale: 0.9 }}
            >
              <Send size={11} />
            </motion.button>
          </div>
          <p className="text-center text-[9px] text-white/12 mt-1.5">
            Shift + Enter for new line
          </p>
        </div>
      </aside>

      {/* Message context menu */}
      {ctxMenu && (
        <MsgCtxMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          msg={ctxMenu.msg}
          onClose={() => setCtxMenu(null)}
          onAIAction={handleAIAction}
        />
      )}
    </>
  );
}
