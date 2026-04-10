import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Send, Flame, Brain, ChevronDown, RotateCcw, User } from 'lucide-react';

const STORAGE_KEY = 'infernix-assistant-v1';
const NAV_RE = /\[NAV:(\/[^\]]*)\]/g;

function stripNav(text) {
  const matches = [...text.matchAll(NAV_RE)];
  const path = matches.length ? matches[matches.length - 1][1] : null;
  return { path, text: text.replace(NAV_RE, '').trim() };
}

const SUGGESTIONS = [
  'What is Infernix?',
  'How do I download Infernix?',
  'What features does the executor have?',
  'Who made Infernix?',
];

function TypingDots() {
  return (
    <span className="flex gap-1 items-center h-5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

function ThinkBlock({ content, seconds, live }) {
  const [open, setOpen] = useState(false);
  if (live) return (
    <div className="flex items-center gap-2 text-white/30 text-xs mb-3">
      <Brain size={12} className="animate-pulse" />
      <span>Thinking...</span>
    </div>
  );
  if (!content || !seconds) return null;
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-white/30 text-xs hover:text-white/50 transition-colors"
      >
        <Brain size={12} />
        <span>Thought for {seconds}s</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pl-3 border-l border-white/10 text-white/25 text-xs leading-relaxed max-h-52 overflow-y-auto">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const mdComponents = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
  em: ({ node, ...props }) => <em className="italic text-white/90" {...props} />,
  pre: ({ node, ...props }) => <pre className="bg-white/[0.06] border border-white/[0.08] rounded-xl mt-2 mb-3 overflow-x-auto" {...props} />,
  code: ({ node, inline, ...props }) => inline
    ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-white/90" {...props} />
    : <code className="block p-4 text-sm font-mono text-white/85 whitespace-pre" {...props} />,
  h1: ({ node, ...props }) => <h1 className="font-bold text-white text-xl mb-2 mt-1" {...props} />,
  h2: ({ node, ...props }) => <h2 className="font-semibold text-white text-lg mb-2 mt-1" {...props} />,
  h3: ({ node, ...props }) => <h3 className="font-semibold text-white mb-1.5 mt-1" {...props} />,
  a: ({ node, ...props }) => <a className="underline text-white/70 hover:text-white" target="_blank" rel="noopener noreferrer" {...props} />,
};

export default function Assistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter(m => !m.streaming)));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setBusy(false);
    localStorage.removeItem(STORAGE_KEY);
    setClearing(true);
    setTimeout(() => setClearing(false), 750);
  }, []);

  const doSend = useCallback(async (text) => {
    const trimmed = typeof text === 'string' ? text.trim() : input.trim();
    if (!trimmed || busy) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: trimmed, timestamp: Date.now() };
    const aiId = `a-${Date.now() + 1}`;
    const aiMsg = { id: aiId, role: 'assistant', content: '', thinking: '', thinkTime: 0, inThink: false, streaming: true, timestamp: Date.now() + 1 };

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

      let think = '', full = raw;
      const thinkMatch = raw.match(/^<think>([\s\S]*?)<\/think>\s*/);
      if (thinkMatch) { think = thinkMatch[1].trim(); full = raw.slice(thinkMatch[0].length); }
      const thinkTime = think ? Math.max(1, Math.round(think.length / 400)) : 0;

      const { path, text: cleaned } = stripNav(full);

      let revealed = '';
      for (let i = 0; i < cleaned.length; i++) {
        revealed += cleaned[i];
        const snap = revealed;
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: snap, thinking: think, thinkTime, streaming: true } : m));
        await new Promise(r => setTimeout(r, 8));
      }

      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: cleaned, thinking: think, thinkTime, streaming: false } : m));
      if (path) setTimeout(() => navigate(path), 700);
    } catch {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false } : m));
    }

    setBusy(false);
  }, [messages, busy, input, navigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  }, [doSend]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-10">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center min-h-[55vh] max-w-2xl mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-full bg-black border border-[0.5px] border-white/15 flex items-center justify-center mb-5">
              <Flame className="w-7 h-7 text-white/50" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Infernix AI</h1>
            <p className="text-white/30 text-sm leading-relaxed mb-8 max-w-xs">
              Ask me anything about Infernix — features, setup, scripting help, or navigate the site.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => doSend(s)}
                  className="text-left px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-sm text-white/35 hover:text-white/65 hover:border-white/15 hover:bg-white/[0.05] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-8 pb-4">
            {messages.map(msg => {
              const isUser = msg.role === 'user';
              const isEmptyStream = !msg.content && msg.streaming;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${isUser ? 'bg-white/10 border border-white/15' : 'bg-black border border-white/20'}`}>
                    {isUser
                      ? <User size={14} className="text-white/70" />
                      : <Flame size={14} className="text-white" />
                    }
                  </div>
                  <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
                    <div className={`text-[11px] text-white/25 mb-1.5 flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <span>{isUser ? 'You' : 'Infernix AI'}</span>
                      {msg.timestamp && (
                        <span className="text-white/15">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {!isUser && (msg.streaming && msg.inThink
                      ? <ThinkBlock live />
                      : <ThinkBlock content={msg.thinking} seconds={msg.thinkTime} />
                    )}
                    {isUser ? (
                      <div className="bg-white text-black text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm font-medium max-w-[80%]">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="text-white/85 text-sm leading-relaxed">
                        {isEmptyStream ? <TypingDots /> : (
                          <ReactMarkdown components={mdComponents}>{msg.content || ''}</ReactMarkdown>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-6 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-white/[0.04] border border-white/[0.09] rounded-2xl px-4 py-3 focus-within:border-white/20 transition-colors">
            <textarea
              ref={textRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Infernix AI anything..."
              rows={1}
              disabled={busy}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/20 resize-none focus:outline-none disabled:opacity-40 leading-normal py-0.5"
              style={{ maxHeight: '160px' }}
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={clearChat}
                title="Clear chat"
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors"
              >
                <RotateCcw size={13} className={clearing ? 'animate-spin' : ''} />
              </button>
              <motion.button
                onClick={() => doSend()}
                disabled={!input.trim() || busy}
                className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black disabled:opacity-20 hover:bg-white/90 transition-all"
                whileTap={{ scale: 0.9 }}
              >
                <Send size={13} />
              </motion.button>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/15 mt-2">Shift + Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
