import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Send, Flame, Brain, ChevronDown, RotateCcw, User, Copy, Check } from 'lucide-react';

const STORAGE_KEY = 'infernix-assistant-v1';
const NAV_RE = /\[NAV:(\/[^\]]*)\]/g;

function stripNav(text) {
  const matches = [...text.matchAll(NAV_RE)];
  const path = matches.length ? matches[matches.length - 1][1] : null;
  return { path, text: text.replace(NAV_RE, '').trim() };
}

const SUGGESTIONS = [
  'What is Infernix?',
  'Write me a speed hack script',
  'What features does Infernix have?',
  'Who made Infernix?',
];

// Custom dark code theme (Catppuccin-inspired)
const codeTheme = {
  'code[class*="language-"]': { color: '#cdd6f4', background: 'none', fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '13px', lineHeight: '1.65' },
  'pre[class*="language-"]': { background: 'none', margin: 0, padding: 0, overflow: 'auto' },
  comment: { color: '#585b70', fontStyle: 'italic' },
  punctuation: { color: '#7f849c' },
  keyword: { color: '#cba6f7' },
  operator: { color: '#89dceb' },
  string: { color: '#a6e3a1' },
  number: { color: '#fab387' },
  boolean: { color: '#fab387' },
  constant: { color: '#fab387' },
  'class-name': { color: '#f9e2af' },
  function: { color: '#89b4fa' },
  'function-variable': { color: '#89b4fa' },
  variable: { color: '#cdd6f4' },
  'attr-name': { color: '#89dceb' },
  property: { color: '#89b4fa' },
  builtin: { color: '#cba6f7' },
  regex: { color: '#a6e3a1' },
  important: { color: '#f38ba8', fontWeight: 'bold' },
};

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const lang = language || 'lua';
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [code]);
  return (
    <div className="relative rounded-xl overflow-hidden mt-3 mb-3 border border-white/[0.07]" style={{ background: 'rgba(14,14,21,0.95)' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,95,87,0.4)' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,188,46,0.4)' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(40,201,64,0.4)' }} />
          </div>
          <span className="text-[11px] text-white/20 font-mono">{lang}</span>
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/55 transition-colors">
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter language={lang} style={codeTheme} customStyle={{ margin: 0, padding: '16px', background: 'transparent' }} codeTagProps={{ style: { fontFamily: '"JetBrains Mono","Fira Code",monospace' } }}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 items-center h-6">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/35"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function ThinkBlock({ content, seconds, live }) {
  const [open, setOpen] = useState(false);
  if (live) return (
    <div className="flex items-center gap-2 text-white/25 text-xs mb-3">
      <Brain size={11} className="animate-pulse text-purple-400/60" />
      <span>Thinking...</span>
    </div>
  );
  if (!content || !seconds) return null;
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-white/25 text-xs hover:text-white/45 transition-colors group"
      >
        <Brain size={11} className="text-purple-400/50 group-hover:text-purple-400/70 transition-colors" />
        <span>Thought for {seconds}s</span>
        <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
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
            <div className="mt-2 pl-3 border-l-2 border-purple-500/20 text-white/20 text-xs leading-relaxed max-h-48 overflow-y-auto pr-2">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const mdComponents = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-7" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
  em: ({ node, ...props }) => <em className="italic text-white/80" {...props} />,
  pre: ({ node, children }) => <>{children}</>,
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && (match || String(children).includes('\n'))) {
      return <CodeBlock language={match?.[1]}>{children}</CodeBlock>;
    }
    return <code className="bg-white/[0.08] border border-white/[0.06] px-1.5 py-0.5 rounded text-[13px] font-mono text-purple-300" {...props}>{children}</code>;
  },
  h1: ({ node, ...props }) => <h1 className="font-bold text-white text-xl mb-3 mt-4" {...props} />,
  h2: ({ node, ...props }) => <h2 className="font-semibold text-white text-lg mb-2 mt-3" {...props} />,
  h3: ({ node, ...props }) => <h3 className="font-medium text-white/90 mb-2 mt-2" {...props} />,
  a: ({ node, ...props }) => <a className="text-blue-400 underline hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
  blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-white/20 pl-4 my-2 text-white/45 italic" {...props} />,
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center min-h-[55vh] max-w-2xl mx-auto text-center select-none"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center">
                <Flame className="w-7 h-7 text-white/55" />
              </div>
              <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Infernix AI</h1>
            <p className="text-white/30 text-sm leading-relaxed mb-10 max-w-sm">
              Ask anything about Infernix — features, Lua scripting, setup help, or just explore the site.
            </p>
            <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => doSend(s)}
                  className="text-left px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] text-sm text-white/35 hover:text-white/70 hover:border-white/[0.14] hover:bg-white/[0.05] transition-all"
                >
                  {s}
                </motion.button>
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                    isUser ? 'bg-white/[0.06] border border-white/10' : 'bg-black border border-white/15'
                  }`}>
                    {isUser
                      ? <User size={13} className="text-white/50" />
                      : <Flame size={13} className="text-white/70" />
                    }
                  </div>
                  <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
                    <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[11px] font-medium text-white/30">{isUser ? 'You' : 'Infernix AI'}</span>
                      {msg.timestamp && (
                        <span className="text-[10px] text-white/15">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {!isUser && (msg.streaming && msg.inThink
                      ? <ThinkBlock live />
                      : <ThinkBlock content={msg.thinking} seconds={msg.thinkTime} />
                    )}
                    {isUser ? (
                      <div className="bg-white text-black text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm font-medium max-w-[78%] leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="text-white/80 text-sm leading-relaxed min-w-0 w-full">
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
      <div className="sticky bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-4 pb-4 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 focus-within:border-white/[0.18] transition-colors">
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
            <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
              <button
                onClick={clearChat}
                title="Clear chat"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/45 transition-colors"
              >
                <RotateCcw size={13} className={clearing ? 'animate-spin' : ''} />
              </button>
              <motion.button
                onClick={() => doSend()}
                disabled={!input.trim() || busy}
                className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black disabled:opacity-20 hover:bg-white/90 transition-all"
                whileTap={{ scale: 0.88 }}
              >
                <Send size={12} />
              </motion.button>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/12 mt-2">Shift + Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
