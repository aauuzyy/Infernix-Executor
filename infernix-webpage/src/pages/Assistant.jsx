import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Send, Flame, Brain, ChevronDown, ChevronRight, RotateCcw, User, Copy, Check, X, Code2, CornerUpLeft } from 'lucide-react';

const STORAGE_KEY = 'infernix-assistant-v1';
const ARTIFACT_KEY = 'infernix-assistant-artifacts-v1';
const NAV_RE = /\[NAV:(\/[^\]]*)\]/g;
const AFTER_RE = /\[AFTER:([\s\S]*?)\]/;

function stripNav(text) {
  const navMatches = [...text.matchAll(NAV_RE)];
  const path = navMatches.length ? navMatches[navMatches.length - 1][1] : null;
  const hasClear = /\[CLEAR\]/.test(text);
  const afterMatch = AFTER_RE.exec(text);
  const afterMsg = afterMatch ? afterMatch[1].trim() : null;
  return { path, hasClear, afterMsg, text: text.replace(NAV_RE, '').replace(/\[CLEAR\]/g, '').replace(AFTER_RE, '').trim() };
}

const SUGGESTIONS = [
  'What is Infernix?',
  'Write me a speed hack script',
  'What features does Infernix have?',
  'Who made Infernix?',
];

// Artifact parsing
const ARTIFACT_SRC = '<artifact\\s+id="([^"]+)"\\s+title="([^"]+)"\\s+language="([^"]+)">((?:.|\n)*?)<\/artifact>';
const PATCH_SRC = '<artifact-patch\\s+id="([^"]+)">((?:.|\n)*?)<\/artifact-patch>';

function extractArtifacts(text) {
  const found = {};
  const re = new RegExp(ARTIFACT_SRC, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    found[m[1]] = { id: m[1], title: m[2], language: m[3], code: m[4].trim() };
  }
  return found;
}

function extractPatches(text) {
  const found = [];
  const re = new RegExp(PATCH_SRC, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    found.push({ id: m[1], patchContent: m[2] });
  }
  return found;
}

function applyPatch(code, patchContent) {
  const pairRe = /<<<FIND\n([\s\S]*?)\nFIND>>>\n<<<REPLACE\n([\s\S]*?)\nREPLACE>>>/g;
  let result = code;
  let m;
  while ((m = pairRe.exec(patchContent)) !== null) {
    result = result.replace(m[1], m[2]);
  }
  return result;
}

function toDisplayContent(text) {
  // Strip code fences that the model sometimes wraps around artifact/patch tags
  let out = text
    .replace(/```[\w]*\s*(<artifact[\s\S]*?<\/artifact>)\s*```/g, '$1')
    .replace(/```[\w]*\s*(<artifact-patch[\s\S]*?<\/artifact-patch>)\s*```/g, '$1')
    .replace(new RegExp(ARTIFACT_SRC, 'g'), (_, id) => `\n[ARTIFACT:${id}]\n`)
    .replace(new RegExp(PATCH_SRC, 'g'), (_, id) => `\n[ARTIFACT:${id}]\n`);
  return out;
}

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
    <div className="relative rounded-xl overflow-hidden mt-3 mb-3 border border-white/[0.07]" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3">
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

function ArtifactCard({ artifact, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-black hover:bg-white/[0.04] hover:border-white/[0.13] transition-all group mt-2 mb-2"
    >
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">
        <Code2 size={15} className="text-white/35 group-hover:text-white/60 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white/60 group-hover:text-white/85 transition-colors truncate">{artifact.title}</p>
        <p className="text-[11px] text-white/25 mt-0.5">{artifact.language} · Interactive artifact</p>
      </div>
      <ChevronRight size={14} className="text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
    </button>
  );
}

const THINKING_WORDS = ['Reviewing...', 'Analyzing...', 'Considering...', 'Planning...', 'Crafting...', 'Thinking...'];
function ThinkingWords() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % THINKING_WORDS.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2">
      <Brain size={11} className="text-white/20 shrink-0" />
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18 }}
          className="text-white/25 text-xs"
        >
          {THINKING_WORDS[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function ArtifactPanel({ artifact, isStreaming, justPatched, onClose }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(artifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [artifact.code]);
  useEffect(() => {
    if (isStreaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [artifact.code, isStreaming]);
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 right-0 bottom-0 w-[480px] z-[100] flex flex-col border-l border-white/[0.07]"
      style={{ background: '#080808', backdropFilter: 'blur(24px)' }}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">
          <Code2 size={14} className="text-white/40" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/70 truncate">{artifact.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-white/25">{artifact.language}</p>
            {isStreaming && (
              <span className="flex items-center gap-1 text-[10px] text-white/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400/60 animate-pulse" />
                generating
              </span>
            )}
            {justPatched && !isStreaming && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[10px] text-emerald-400/60"
              >
                <Check size={9} /> updated
              </motion.span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isStreaming && (
            <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all">
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/55 hover:bg-white/[0.05] transition-all">
            <X size={14} />
          </button>
        </div>
      </div>
      <div ref={codeRef} className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={artifact.language}
          style={codeTheme}
          customStyle={{ margin: 0, padding: '20px', background: 'transparent' }}
          codeTagProps={{ style: { fontFamily: '"JetBrains Mono","Fira Code",monospace' } }}
        >
          {artifact.code || ' '}
        </SyntaxHighlighter>
      </div>
    </motion.div>
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
  if (!seconds) return null;
  return (
    <div className="mb-3">
      {content ? (
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-white/25 text-xs hover:text-white/45 transition-colors group cursor-pointer"
        >
          <Brain size={11} className="text-purple-400/50 group-hover:text-purple-400/70 transition-colors" />
          <span>Thought for {seconds}s</span>
          <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 text-white/20 text-xs">
          <Brain size={11} className="text-purple-400/30" />
          <span>Thought for {seconds}s</span>
        </div>
      )}
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

export default function Assistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [artifacts, setArtifacts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ARTIFACT_KEY)) || {}; } catch { return {}; }
  });
  const [openArtifactId, setOpenArtifactId] = useState(null);
  const [streamingArtifact, setStreamingArtifact] = useState(null);
  const [patchedArtifactId, setPatchedArtifactId] = useState(null);
  const [msgCtx, setMsgCtx] = useState(null); // { x, y, msgId }
  const bottomRef = useRef(null);
  const textRef = useRef(null);
  const afterClearRef = useRef(null);
  const doSendRef = useRef(null);
  const msgCtxRef = useRef(null);

  const mdComponents = useMemo(() => ({
    p: ({ node, children, ...props }) => {
      const flat = Array.isArray(children) ? children.join('') : String(children ?? '');
      const artMatch = flat.trim().match(/^\[ARTIFACT:([^\]]+)\]$/);
      if (artMatch) {
        const art = artifacts[artMatch[1]];
        if (art) return <ArtifactCard artifact={art} onClick={() => setOpenArtifactId(prev => prev === artMatch[1] ? null : artMatch[1])} />;
      }
      const loadMatch = flat.trim().match(/^\[ARTIFACT_LOADING:(.+)\]$/);
      if (loadMatch) {
        return (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] mt-2 mb-2 text-white/25 text-[13px]">
            <Code2 size={13} className="animate-pulse shrink-0" />
            <span>Generating {loadMatch[1]}...</span>
          </div>
        );
      }
      return <p className="mb-2 last:mb-0 leading-7" {...props}>{children}</p>;
    },
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
      return <code className="bg-white/[0.07] border border-white/[0.05] px-1.5 py-0.5 rounded text-[13px] font-mono text-white/75" {...props}>{children}</code>;
    },
    h1: ({ node, ...props }) => <h1 className="font-bold text-white text-xl mb-3 mt-4" {...props} />,
    h2: ({ node, ...props }) => <h2 className="font-semibold text-white text-lg mb-2 mt-3" {...props} />,
    h3: ({ node, ...props }) => <h3 className="font-medium text-white/90 mb-2 mt-2" {...props} />,
    a: ({ node, ...props }) => <a className="text-blue-400 underline hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-white/20 pl-4 my-2 text-white/45 italic" {...props} />,
  }), [artifacts, setOpenArtifactId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter(m => !m.streaming)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(ARTIFACT_KEY, JSON.stringify(artifacts));
  }, [artifacts]);

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
    setArtifacts({});
    setOpenArtifactId(null);
    setStreamingArtifact(null);
    setBusy(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ARTIFACT_KEY);
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
      .map(m => ({ role: m.role, content: m.rawContent || m.content }));

    const reqStart = Date.now();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const raw = data.content ?? '';
      const elapsed = Math.max(1, Math.round((Date.now() - reqStart) / 1000));

      let think = '', full = raw;
      const thinkMatch = raw.match(/^<think>([\s\S]*?)<\/think>\s*/);
      if (thinkMatch) { think = thinkMatch[1].trim(); full = raw.slice(thinkMatch[0].length); }
      const thinkTime = Math.max(elapsed, think ? Math.round(think.length / 400) : 0);

      const { path, hasClear, afterMsg, text: cleaned } = stripNav(full);
      const unFenced = cleaned
        .replace(/```[\w]*\s*(<artifact[\s\S]*?<\/artifact>)\s*```/g, '$1')
        .replace(/```[\w]*\s*(<artifact-patch[\s\S]*?<\/artifact-patch>)\s*```/g, '$1');
      const newArtifacts = extractArtifacts(unFenced);
      const patches = extractPatches(unFenced);

      if (patches.length > 0) {
        // Patch mode — apply diffs to existing code, animate only replacement
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: '', thinking: think, thinkTime, streaming: true, generatingArtifact: true }
          : m
        ));
        for (const patch of patches) {
          const existing = artifacts[patch.id];
          if (!existing) continue;
          setOpenArtifactId(patch.id);
          const patched = applyPatch(existing.code, patch.patchContent);
          // Find the first changed char position and stream from there
          let diffStart = 0;
          while (diffStart < existing.code.length && diffStart < patched.length && existing.code[diffStart] === patched[diffStart]) diffStart++;
          // Show existing code up to diff point instantly, then stream the rest
          // Also compute unchanged suffix from the end
          let oldTail = existing.code.length - 1;
          let newTail = patched.length - 1;
          while (newTail > diffStart && oldTail >= 0 && existing.code[oldTail] === patched[newTail]) {
            oldTail--;
            newTail--;
          }
          const prefix = patched.slice(0, diffStart);
          const changedSection = patched.slice(diffStart, newTail + 1);
          const suffix = patched.slice(newTail + 1);
          // Show prefix instantly, stream only the changed chunk, then show suffix instantly
          setStreamingArtifact({ ...existing, code: prefix + suffix });
          let revealed = prefix;
          for (let i = 0; i < changedSection.length; i++) {
            revealed += changedSection[i];
            const snap = revealed + suffix;
            setStreamingArtifact(s => s ? { ...s, code: snap } : null);
            await new Promise(r => setTimeout(r, 4));
          }
          await new Promise(r => setTimeout(r, 80));
          const updated = { ...existing, code: patched };
          setArtifacts(prev => ({ ...prev, [patch.id]: updated }));
          setStreamingArtifact(null);
          setPatchedArtifactId(patch.id);
          setTimeout(() => setPatchedArtifactId(null), 2500);
        }
        const displayContent = toDisplayContent(unFenced);
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: displayContent, rawContent: unFenced, thinking: think, thinkTime, streaming: false, generatingArtifact: false }
          : m
        ));
      } else if (Object.keys(newArtifacts).length > 0) {
        // Show thinking state while animating artifact
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: '', thinking: think, thinkTime, streaming: true, generatingArtifact: true }
          : m
        ));
        // Animate each artifact's code char by char in the panel
        for (const art of Object.values(newArtifacts)) {
          setStreamingArtifact({ ...art, code: '' });
          setOpenArtifactId(art.id);
          let revealedCode = '';
          for (let i = 0; i < art.code.length; i++) {
            revealedCode += art.code[i];
            const snap = revealedCode;
            setStreamingArtifact(s => s ? { ...s, code: snap } : null);
            await new Promise(r => setTimeout(r, 3));
          }
          setArtifacts(prev => ({ ...prev, [art.id]: art }));
        }
        setStreamingArtifact(null);
        const displayContent = toDisplayContent(unFenced);
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: displayContent, rawContent: unFenced, thinking: think, thinkTime, streaming: false, generatingArtifact: false }
          : m
        ));
      } else {
        let revealed = '';
        for (let i = 0; i < unFenced.length; i++) {
          revealed += unFenced[i];
          const snap = revealed;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: snap, thinking: think, thinkTime, streaming: true } : m));
          await new Promise(r => setTimeout(r, 8));
        }
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: unFenced, thinking: think, thinkTime, streaming: false } : m));
      }
      if (hasClear) setTimeout(() => {
        if (afterMsg) afterClearRef.current = afterMsg;
        setMessages([]);
        setArtifacts({});
        setOpenArtifactId(null);
        setStreamingArtifact(null);
        setBusy(false);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ARTIFACT_KEY);
      }, 900);
      if (path) setTimeout(() => navigate(path), 700);
    } catch (err) {
      const msg = err?.message || 'Sorry, something went wrong. Please try again.';
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: msg, streaming: false } : m));
    }

    setBusy(false);
  }, [messages, busy, input, navigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  }, [doSend]);

  // Keep doSendRef current so post-clear effect can call latest version
  useEffect(() => { doSendRef.current = doSend; }, [doSend]);

  // Close message context menu on outside click / Escape
  useEffect(() => {
    if (!msgCtx) return;
    const down = e => { if (!msgCtxRef.current?.contains(e.target)) setMsgCtx(null); };
    const esc = e => { if (e.key === 'Escape') setMsgCtx(null); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', esc); };
  }, [msgCtx]);

  // After a clear-with-followup, fire the follow-up into the fresh chat
  useEffect(() => {
    if (afterClearRef.current && messages.length === 0 && !busy) {
      const msg = afterClearRef.current;
      afterClearRef.current = null;
      doSendRef.current?.(msg);
    }
  }, [messages, busy]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col transition-all duration-300" style={{ minHeight: 'calc(100vh - 4rem)', paddingRight: openArtifactId ? '480px' : 0 }}>
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
                  onContextMenu={msg.streaming ? undefined : e => { e.preventDefault(); e.stopPropagation(); setMsgCtx({ x: e.clientX, y: e.clientY, msgId: msg.id }); }}
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
                    {!isUser && (msg.streaming && !msg.content
                      ? <ThinkBlock live />
                      : <ThinkBlock content={msg.thinking} seconds={msg.thinkTime} />
                    )}
                    {isUser ? (
                      <div className="bg-white text-black text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm font-medium max-w-[78%] leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="text-white/80 text-sm leading-relaxed min-w-0 w-full">
                        {msg.generatingArtifact && msg.streaming
                          ? <ThinkingWords />
                          : isEmptyStream
                            ? <TypingDots />
                            : <ReactMarkdown components={mdComponents}>{msg.content || ''}</ReactMarkdown>
                        }
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

      {/* Message context menu */}
      {msgCtx && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-black/20" onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }} onClick={() => setMsgCtx(null)} />
          <motion.div
            ref={msgCtxRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[9999] bg-black/60 backdrop-blur-xl border border-white/[0.09] rounded-xl shadow-2xl py-1.5 min-w-[180px]"
            style={{ top: msgCtx.y, left: msgCtx.x }}
          >
            <div className="px-3 py-1.5 mb-1 border-b border-white/[0.06]">
              <span className="text-[10px] text-white/25 uppercase tracking-widest">Message</span>
            </div>
            <button
              onClick={() => {
                setMessages(prev => {
                  const idx = prev.findIndex(m => m.id === msgCtx.msgId);
                  return idx !== -1 ? prev.slice(0, idx + 1) : prev;
                });
                setMsgCtx(null);
                setTimeout(() => textRef.current?.focus(), 50);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-default"
            >
              <CornerUpLeft size={13} className="shrink-0 opacity-55" />
              Branch from here
            </button>
          </motion.div>
        </>,
        document.body
      )}

      {/* Input */}
      <div className="sticky bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-4 pb-4 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1 focus-within:border-white/[0.18] transition-colors">
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
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={clearChat}
                title="Clear chat"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-white/45 transition-colors"
              >
                <RotateCcw size={12} className={clearing ? 'animate-spin' : ''} />
              </button>
              <motion.button
                onClick={() => doSend()}
                disabled={!input.trim() || busy}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black disabled:opacity-20 hover:bg-white/90 transition-all"
                whileTap={{ scale: 0.88 }}
              >
                <Send size={11} />
              </motion.button>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/10 mt-1.5">Shift + Enter for new line</p>
        </div>
      </div>      {createPortal(
        <AnimatePresence>
          {openArtifactId && (streamingArtifact || artifacts[openArtifactId]) && (
            <ArtifactPanel
              artifact={streamingArtifact?.id === openArtifactId ? streamingArtifact : artifacts[openArtifactId]}
              isStreaming={!!streamingArtifact && streamingArtifact.id === openArtifactId}
              justPatched={patchedArtifactId === openArtifactId}
              onClose={() => { setOpenArtifactId(null); setStreamingArtifact(null); }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}    </div>
  );
}
