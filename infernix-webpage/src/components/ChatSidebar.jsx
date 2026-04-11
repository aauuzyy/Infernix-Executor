import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  Send, Flame, ChevronDown, RotateCcw,
  Copy, Sparkles, HelpCircle, Edit3, Globe, Brain, User,
  Code2, ArrowLeft, Check, ChevronRight, CornerUpLeft,
} from 'lucide-react';

const STORAGE_KEY = 'infernix-chat-v1';
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

// ── Artifact helpers ──────────────────────────────────────────
const ARTIFACT_KEY = 'infernix-chat-artifacts-v1';
const ARTIFACT_SRC = '<artifact\\s+id="([^"]+)"\\s+title="([^"]+)"\\s+language="([^"]+)">((?:.|\\n)*?)<\\/artifact>';
const PATCH_SRC = '<artifact-patch\\s+id="([^"]+)">((?:.|\\n)*?)<\\/artifact-patch>';

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
  return text
    .replace(/```[\w]*\s*(<artifact[\s\S]*?<\/artifact>)\s*```/g, '$1')
    .replace(/```[\w]*\s*(<artifact-patch[\s\S]*?<\/artifact-patch>)\s*```/g, '$1')
    .replace(new RegExp(ARTIFACT_SRC, 'g'), (_, id) => `\n[ARTIFACT:${id}]\n`)
    .replace(new RegExp(PATCH_SRC, 'g'), (_, id) => `\n[ARTIFACT:${id}]\n`);
}

// Custom dark code theme (Catppuccin-inspired)
const codeTheme = {
  'code[class*="language-"]': { color: '#cdd6f4', background: 'none', fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '12px', lineHeight: '1.65' },
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

// ── Sidebar code block ────────────────────────────────────────
function SidebarCodeBlock({ language, children, onSummarize }) {
  const [copied, setCopied] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const ctxRef = useRef(null);
  const code = String(children).replace(/\n$/, '');
  const lang = language || 'lua';

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [code]);

  useEffect(() => {
    if (!ctxMenu) return;
    const down = e => { if (!ctxRef.current?.contains(e.target)) setCtxMenu(null); };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [ctxMenu]);

  return (
    <div
      className="relative rounded-lg overflow-hidden mt-2 mb-2 border border-white/[0.07]"
      style={{ background: '#0a0a0a' }}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        const sel = window.getSelection()?.toString().trim();
        setCtxMenu({ x: e.clientX, y: e.clientY, code: sel || code });
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05]"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <span className="text-[10px] text-white/20 font-mono">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/55 transition-colors">
          {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
          <span className="ml-0.5">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={lang}
          style={codeTheme}
          customStyle={{ margin: 0, padding: '12px', background: 'transparent' }}
          codeTagProps={{ style: { fontFamily: '"JetBrains Mono","Fira Code",monospace' } }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
      {ctxMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] backdrop-blur-sm bg-black/25" />
          <motion.div
            ref={ctxRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.1 }}
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
            className="fixed z-[9999] min-w-[180px] rounded-xl border border-white/10 bg-black/90 shadow-2xl overflow-hidden py-1"
          >
            <button
              onClick={() => { onSummarize?.(ctxMenu.code); setCtxMenu(null); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-default"
            >
              <Sparkles size={13} className="shrink-0 opacity-55" />
              Summarize this code
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(ctxMenu.code); setCtxMenu(null); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-default"
            >
              <Copy size={13} className="shrink-0 opacity-55" />
              Copy code
            </button>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── Sidebar artifact card ─────────────────────────────────────
function SidebarArtifactCard({ artifact, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-black hover:bg-white/[0.04] hover:border-white/[0.13] transition-all group mt-1.5 mb-1.5"
    >
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">
        <Code2 size={13} className="text-white/35 group-hover:text-white/60 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white/60 group-hover:text-white/85 transition-colors truncate">{artifact.title}</p>
        <p className="text-[10px] text-white/25 mt-0.5">{artifact.language} · artifact</p>
      </div>
      <ChevronRight size={12} className="text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
    </button>
  );
}

// ── Sidebar artifact overlay ──────────────────────────────────
function SidebarArtifactView({ artifact, isStreaming, onClose, onSummarize }) {
  const [copied, setCopied] = useState(false);
  const [codeCtx, setCodeCtx] = useState(null);
  const codeRef = useRef(null);
  const ctxRef = useRef(null);

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

  useEffect(() => {
    if (!codeCtx) return;
    const down = e => { if (!ctxRef.current?.contains(e.target)) setCodeCtx(null); };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [codeCtx]);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 right-0 bottom-0 w-80 z-[100] flex flex-col border-l border-white/[0.07]"
      style={{ background: '#080808' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-3 border-b border-white/[0.07] shrink-0">
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.07] transition-all shrink-0"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">
          <Code2 size={11} className="text-white/40" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-white/70 truncate">{artifact.title}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] text-white/25">{artifact.language}</p>
            {isStreaming && (
              <span className="flex items-center gap-1 text-[10px] text-white/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400/60 animate-pulse" />
                generating
              </span>
            )}
          </div>
        </div>
        {!isStreaming && (
          <button
            onClick={copy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/25 hover:text-white/55 hover:bg-white/[0.05] transition-all shrink-0"
          >
            {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
            <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>

      {/* Code */}
      <div
        ref={codeRef}
        className="flex-1 overflow-auto"
        onContextMenu={e => {
          e.preventDefault();
          const sel = window.getSelection()?.toString().trim();
          setCodeCtx({ x: e.clientX, y: e.clientY, code: sel || artifact.code });
        }}
      >
        <SyntaxHighlighter
          language={artifact.language}
          style={codeTheme}
          customStyle={{ margin: 0, padding: '14px', background: 'transparent', fontSize: '11.5px' }}
          codeTagProps={{ style: { fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '11.5px' } }}
        >
          {artifact.code || ' '}
        </SyntaxHighlighter>
      </div>

      {/* Code context menu */}
      {codeCtx && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] backdrop-blur-sm bg-black/25" />
          <motion.div
            ref={ctxRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.1 }}
            style={{ top: codeCtx.y, left: codeCtx.x }}
            className="fixed z-[9999] min-w-[180px] rounded-xl border border-white/10 bg-black/90 shadow-2xl overflow-hidden py-1"
          >
            <button
              onClick={() => { onSummarize(codeCtx.code); setCodeCtx(null); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-default"
            >
              <Sparkles size={13} className="shrink-0 opacity-55" />
              Summarize this code
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(codeCtx.code); setCodeCtx(null); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-default"
            >
              <Copy size={13} className="shrink-0 opacity-55" />
              Copy code
            </button>
          </motion.div>
        </>,
        document.body
      )}
    </motion.div>
  );
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

  if (!seconds) return null;

  return (
    <div className="mb-2.5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/45 transition-colors cursor-pointer"
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
function MsgBubble({ msg, onCtx, artifacts, onOpenArtifact, onSummarize }) {
  const isUser = msg.role === 'user';
  const isEmpty = !msg.content && msg.streaming;

  const mdComponents = useMemo(() => ({
    p: ({ node, children, ...props }) => {
      const flat = Array.isArray(children) ? children.join('') : String(children ?? '');
      const artMatch = flat.trim().match(/^\[ARTIFACT:([^\]]+)\]$/);
      if (artMatch) {
        const art = artifacts?.[artMatch[1]];
        if (art) return <SidebarArtifactCard artifact={art} onClick={() => onOpenArtifact?.(artMatch[1])} />;
      }
      const loadMatch = flat.trim().match(/^\[ARTIFACT_LOADING:(.+)\]$/);
      if (loadMatch) {
        return (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] mt-1.5 mb-1.5 text-white/25 text-xs">
            <Code2 size={12} className="animate-pulse shrink-0" />
            <span>Generating {loadMatch[1]}...</span>
          </div>
        );
      }
      return <p className="mb-1.5 last:mb-0" {...props}>{children}</p>;
    },
    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5" {...props} />,
    li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
    strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
    em: ({node, ...props}) => <em className="italic text-white/90" {...props} />,
    pre: ({ node, children }) => <>{children}</>,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && (match || String(children).includes('\n'))) {
        return <SidebarCodeBlock language={match?.[1]} onSummarize={onSummarize}>{children}</SidebarCodeBlock>;
      }
      return <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono text-white/90" {...props}>{children}</code>;
    },
    h1: ({node, ...props}) => <h1 className="font-semibold text-white text-base mb-1" {...props} />,
    h2: ({node, ...props}) => <h2 className="font-semibold text-white text-sm mb-1" {...props} />,
    h3: ({node, ...props}) => <h3 className="font-medium text-white text-sm mb-1" {...props} />,
    a: ({node, ...props}) => <a className="underline text-white/70 hover:text-white" target="_blank" rel="noopener noreferrer" {...props} />,
  }), [artifacts, onOpenArtifact, onSummarize]);

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
      {!isUser && (msg.streaming && !msg.content
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
          <ReactMarkdown components={mdComponents}>{msg.content || ''}</ReactMarkdown>
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
    { icon: Copy,         label: 'Copy message',    action: () => navigator.clipboard.writeText(msg.content) },
    { icon: CornerUpLeft, label: 'Branch from here', action: () => onAIAction('rewind', msg) },
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
    <>
      <div className="fixed inset-0 z-[9998] backdrop-blur-sm bg-black/25" />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.1 }}
        style={{ top: pos.y, left: pos.x }}
        className="ctx-menu fixed z-[9999] min-w-[200px] rounded-xl border border-white/10 bg-black/90 shadow-2xl overflow-hidden py-1"
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
      </motion.div>
    </>,
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
  const { pathname } = useLocation();
  const isAssistant = pathname === '/assistant';

  const [open, setOpen] = useState(false);  // kept for compat, unused
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [artifacts, setArtifacts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ARTIFACT_KEY)) || {}; } catch { return {}; }
  });
  const [openArtifactId, setOpenArtifactId] = useState(null);
  const [streamingArtifact, setStreamingArtifact] = useState(null);

  const bottomRef = useRef(null);
  const textRef = useRef(null);
  const afterClearRef = useRef(null);
  const doSendRef = useRef(null);

  // Persist (only finalized messages)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter(m => !m.streaming)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(ARTIFACT_KEY, JSON.stringify(artifacts));
  }, [artifacts]);

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
    setOpenArtifactId(null);

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
        body: JSON.stringify({ messages: history, page: pathname }),
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
      const thinkTime = think ? Math.max(elapsed, Math.round(think.length / 400)) : 0;

      const { path, hasClear, afterMsg, text: cleaned } = stripNav(full);
      const unFenced = cleaned
        .replace(/```[\w]*\s*(<artifact[\s\S]*?<\/artifact>)\s*```/g, '$1')
        .replace(/```[\w]*\s*(<artifact-patch[\s\S]*?<\/artifact-patch>)\s*```/g, '$1');
      const newArtifacts = extractArtifacts(unFenced);
      const patches = extractPatches(unFenced);

      if (patches.length > 0) {
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: '', thinking: think, thinkTime, streaming: true, generatingArtifact: true }
          : m
        ));
        for (const patch of patches) {
          const existing = artifacts[patch.id];
          if (!existing) continue;
          setOpenArtifactId(patch.id);
          const patched = applyPatch(existing.code, patch.patchContent);
          let diffStart = 0;
          while (diffStart < existing.code.length && diffStart < patched.length && existing.code[diffStart] === patched[diffStart]) diffStart++;
          let oldTail = existing.code.length - 1, newTail = patched.length - 1;
          while (newTail > diffStart && oldTail >= 0 && existing.code[oldTail] === patched[newTail]) { oldTail--; newTail--; }
          const prefix = patched.slice(0, diffStart);
          const changedSection = patched.slice(diffStart, newTail + 1);
          const suffix = patched.slice(newTail + 1);
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
        }
        const displayContent = toDisplayContent(unFenced);
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: displayContent, rawContent: unFenced, thinking: think, thinkTime, streaming: false, generatingArtifact: false }
          : m
        ));
      } else if (Object.keys(newArtifacts).length > 0) {
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: '', thinking: think, thinkTime, streaming: true, generatingArtifact: true }
          : m
        ));
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
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, content: snap, thinking: think, thinkTime, streaming: true } : m
          ));
          await new Promise(r => setTimeout(r, 8));
        }
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: unFenced, thinking: think, thinkTime, streaming: false } : m
        ));
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
      setMessages(prev => prev.map(m =>
        m.id === aiId
          ? { ...m, content: msg, streaming: false }
          : m
      ));
    }

    setBusy(false);
  }, [messages, busy, input, navigate, artifacts]);

  // Keep doSendRef current so post-clear effect can call latest version
  useEffect(() => { doSendRef.current = doSend; }, [doSend]);

  // After a clear-with-followup, fire the follow-up into the fresh chat
  useEffect(() => {
    if (afterClearRef.current && messages.length === 0 && !busy) {
      const msg = afterClearRef.current;
      afterClearRef.current = null;
      doSendRef.current?.(msg);
    }
  }, [messages, busy]);

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
    } else if (action === 'rewind') {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === msg.id);
        return idx !== -1 ? prev.slice(0, idx + 1) : prev;
      });
      setTimeout(() => textRef.current?.focus(), 50);
    } else if (prompts[action]) {
      doSend(prompts[action]);
    }
    setCtxMenu(null);
  }, [doSend]);

  return (
    <>
      {/* ── Always-visible sidebar ───────────────────── */}
      <motion.aside
        animate={{
          x: isAssistant ? 320 : 0,
          opacity: isAssistant ? 0 : 1,
          filter: isAssistant ? 'blur(12px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed right-0 top-0 bottom-0 z-[60] w-80 flex flex-col bg-[rgba(0,0,0,0.80)] backdrop-blur-2xl border-l border-white/[0.07] overflow-hidden"
      >

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
            onClick={clearChat}
            title="Clear chat"
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors"
          >
            <RotateCcw size={13} className={clearing ? 'animate-spin' : 'transition-transform'} />
          </button>
        </div>

        {/* Messages + artifact overlay — overlay is scoped here so sidebar header stays visible */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto px-4 py-5 space-y-5 chat-scroll">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center mt-6"
              >
                <div className="w-12 h-12 rounded-full bg-black border-[0.5px] border-white/12 flex items-center justify-center mx-auto mb-4">
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
              <MsgBubble
                key={msg.id}
                msg={msg}
                onCtx={handleCtx}
                artifacts={artifacts}
                onOpenArtifact={id => setOpenArtifactId(id)}
                onSummarize={code => doSend(`Explain and summarize this code:\n\`\`\`\n${code}\n\`\`\``)}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Artifact overlay — slides over the messages area only */}
          <AnimatePresence>
            {!!(openArtifactId || streamingArtifact) && (streamingArtifact || artifacts[openArtifactId]) && (
              <SidebarArtifactView
                key={openArtifactId || 'streaming'}
                artifact={streamingArtifact || artifacts[openArtifactId]}
                isStreaming={!!streamingArtifact}
                onClose={() => setOpenArtifactId(null)}
                onSummarize={code => { setOpenArtifactId(null); doSend(`Explain and summarize this code:\n\`\`\`\n${code}\n\`\`\``); }}
              />
            )}
          </AnimatePresence>
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
      </motion.aside>

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
