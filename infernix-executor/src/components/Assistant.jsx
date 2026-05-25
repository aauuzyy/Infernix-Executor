import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Flame, User, Copy, Check, RotateCcw, ArrowRight, Settings, Palette, Trash2,
  Shield, Zap, RefreshCw, XCircle, Link, Search, Play, BookmarkPlus,
  Plus, FolderOpen, Save, Download, MessageSquare, Terminal, BookOpen,
  Sparkles, ImageIcon, X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'infernix-assistant-chat-v1';

const NAV_VIEWS = {
  dashboard: 'Dashboard', executor: 'Executor', scripthub: 'Script Hub',
  clients: 'Clients', settings: 'Settings',
};

const SYSTEM_PROMPT = `You are Infernix AI, a helpful assistant for the Infernix Roblox executor app.

You can help users:
- Generate and explain Roblox Lua scripts
- Navigate to sections of the app (Dashboard, Executor, Script Hub, Clients, Settings)
- Explain executor features like Auto Attach, Script Hub, Execution History
- Answer questions about Infernix
- Perform Roblox and app actions on their behalf

Navigation: When a user asks to go somewhere or you want to direct them to a section, ALWAYS include a nav tag like [nav:executor] or [nav:dashboard] or [nav:scripthub] or [nav:clients] or [nav:settings] in your reply. This AUTOMATICALLY navigates them there AND creates a button.

Tab navigation: If a user wants to go to a specific script tab by name, include BOTH [nav:executor] AND [tab:TabName] in your reply.

Tutorial: When a user asks "how do I use Infernix?", "how do I get started?", "I'm new", "what does this do", "what can you do", "show me around", "help me use this", or any general how-to/overview/getting-started question about the app — ALWAYS include [start-tutorial] in your reply. This automatically launches an interactive guided tour. Also use it when a user seems confused or lost.

Settings control: You can directly change the user's app settings by including special tags in your reply. These apply instantly:
- Theme mode: [set:themeMode=dark] or [set:themeMode=light] or [set:themeMode=midnight]
- Accent color (hex): [set:accentColor=#f97316]
- Color shift animation: [set:colorShift=true] or [set:colorShift=false]
- Toggle booleans: [set:autoAttach=true], [set:autoExecute=true], [set:closeRoblox=true/false], [set:debugConsole=true/false], [set:topmost=true/false]
- Apply a full theme preset: [preset:Fire] [preset:Ruby] [preset:Emerald] [preset:Ocean] [preset:Violet] [preset:Pink] [preset:Cyan] [preset:Gold] [preset:Midnight] [preset:Light] [preset:Random]
- Clear the chat history: [clear-chat]

Script search: When a user asks for scripts, include [search-scripts] in your reply.

Tab scanning: To scan a script tab with VirusTotal, include [scan:TabName] in your reply.

Auto-Execute: To add a script tab to Auto Execute (scripts that run on every game join), include [autoexec:TabName]. Use [autoexec:all] to add ALL open tabs at once. Do this immediately when asked — do NOT ask for confirmation first, just do it and confirm what you added in your reply.

Chip gallery: When a user asks "what can you do?", "show me all actions", "what chips are there", "show me everything", or wants to browse all available actions — include [show-chips] in your reply. This displays a full interactive menu of every available action chip. These are shown for the user to click manually — they do NOT auto-execute.

Preset saving: To save the user's current settings as a named preset in the Preset Manager, include [save-preset:Name]. Analyze the user's current theme and settings to generate a descriptive name like "Dark Ocean", "Fire Shift", "Light Minimal". Always describe what's being saved.

Roblox actions (execute automatically):
- [attach] — attaches Infernix to Roblox
- [rejoin] — rejoins the current Roblox server
- [close-roblox] — closes Roblox
- [restart-infernix] — restarts the Infernix app
- [close-infernix] — closes the Infernix app
- [open-website] — opens the official Infernix website.
- [open-discord] — opens the Infernix Discord server.
- [check-updates] — checks for a new Infernix update.
- [start-tutorial] — launches the interactive Infernix tutorial. Executes immediately — use whenever user asks how to use the app.
- [reset-settings] — resets all settings to defaults. Confirm with user first.
- [refresh-clients] — rescans for Roblox clients.
- [clear-history] — clears all script execution history.

Script contents: You have FULL READ ACCESS to the contents of every open script tab (provided below in this message). When a user asks you to fix, review, improve, or explain code in a specific tab, READ the code from the tab content below and provide the fixed or improved code directly in your reply. Do NOT ask the user to paste the code — you already have it.

Script execution (requires Roblox attached):
- [execute:TabName] — executes a specific tab's script. You are provided with the list of open tabs below — ALWAYS use an exact tab name from that list. Never guess or hallucinate tab names.
- [execute-all] — executes every open tab at once.

Tab management:
- [new-tab] — creates a new empty script tab.
- [close-tab:TabName] — closes a tab by name. Use an exact tab name from the open tabs list below.
- [duplicate-tab:TabName] — duplicates a tab into a new copy. Use an exact tab name from the open tabs list below.
- [save-script:TabName] — saves a tab to the script library. Use an exact tab name from the open tabs list below.

Folder shortcuts:
- [open-autoexec-folder] — opens the Auto Execute folder.
- [open-workspace-folder] — opens the Workspace folder.
- [open-scripts-folder] — opens the saved Scripts folder.

When generating scripts, wrap them in code blocks using \`\`\`lua.

Image generation: You can generate images using Gemini's native image generation. When the user asks for an image, diagram, visualization, or anything visual — generate it! The image will automatically appear in the chat alongside your text. Describe what you're creating in your text response.`;

const SUGGESTIONS = [
  'What is Infernix?',
  'Write me a speed hack script',
  'Take me to the Executor',
  'Change theme to Fire',
];

// Shared code theme
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
  function: { color: '#89b4fa' },
  variable: { color: '#cdd6f4' },
  'class-name': { color: '#f9e2af' },
  property: { color: '#89b4fa' },
};

function CodeBlock({ language, children, onSendToEditor }) {
  const [copied, setCopied] = useState(false);
  const [copyHov, setCopyHov] = useState(false);
  const [sendHov, setSendHov] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const lang = language || 'lua';

  const copy = useCallback(() => {
    try { navigator.clipboard.writeText(code); } catch {
      const el = document.createElement('textarea');
      el.value = code; el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [code]);

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', marginTop: 8, marginBottom: 8, border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{lang}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onSendToEditor && (
            <button onClick={() => onSendToEditor(code)}
              style={{ fontSize: 11, color: sendHov ? 'var(--text-primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit', transition: 'color 0.12s' }}
              onMouseEnter={() => setSendHov(true)} onMouseLeave={() => setSendHov(false)}>
              Send to Editor
            </button>
          )}
          <button onClick={copy}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: copied ? '#34d399' : copyHov ? 'var(--text-primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit', transition: 'color 0.12s' }}
            onMouseEnter={() => setCopyHov(true)} onMouseLeave={() => setCopyHov(false)}>
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <SyntaxHighlighter language={lang} style={codeTheme}
          customStyle={{ margin: 0, padding: '14px 16px', background: 'transparent' }}
          codeTagProps={{ style: { fontFamily: '"JetBrains Mono","Fira Code",monospace' } }}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center', height: 24 }}>
      {[0, 1, 2].map(i => (
        <motion.span key={i}
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', display: 'block' }}
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function ImageGenPlaceholder() {
  return (
    <div style={{ marginTop: 10, marginBottom: 10 }}>
      <div style={{
        position: 'relative',
        borderRadius: 16,
        padding: 2,
        background: 'linear-gradient(135deg, rgba(var(--accent-rgb),0.5), rgba(var(--accent-rgb),0.15), rgba(var(--accent-rgb),0.5))',
        backgroundSize: '200% 200%',
        animation: 'gradient-shift 3s ease infinite',
      }}>
        <div style={{
          borderRadius: 14,
          background: 'var(--bg-tertiary)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', minHeight: 140 }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.08), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(var(--accent-rgb),0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--accent-rgb),0.06) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <motion.div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(var(--accent-rgb),0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles size={22} style={{ color: 'var(--accent)' }} />
              </motion.div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Generating image...</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Gemini 2.5 Flash is rendering your visual</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Parse all action tags in AI responses
function parseNavTags(content) {
  if (!content) return [{ type: 'text', value: '' }];
  const parts = [];
  const regex = /\[nav:(\w+)\]|\[tab:([^\]]+)\]|\[set:([\w]+)=([^\]]+)\]|\[preset:([^\]]+)\]|\[clear-chat\]|\[search-scripts\]|\[scan:([^\]]+)\]|\[rejoin\]|\[close-roblox\]|\[restart-infernix\]|\[close-infernix\]|\[attach\]|\[autoexec:([^\]]+)\]|\[save-preset:([^\]]+)\]|\[open-website\]|\[execute:([^\]]+)\]|\[execute-all\]|\[new-tab\]|\[close-tab:([^\]]+)\]|\[duplicate-tab:([^\]]+)\]|\[save-script:([^\]]+)\]|\[clear-history\]|\[refresh-clients\]|\[open-discord\]|\[open-autoexec-folder\]|\[open-workspace-folder\]|\[open-scripts-folder\]|\[reset-settings\]|\[check-updates\]|\[start-tutorial\]|\[show-chips\]/g;
  let last = 0, m;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: content.slice(last, m.index) });
    if      (m[1] !== undefined) { const v = m[1].toLowerCase(); if (NAV_VIEWS[v]) parts.push({ type: 'nav', viewId: v, label: NAV_VIEWS[v] }); }
    else if (m[2] !== undefined) parts.push({ type: 'tab', tabName: m[2] });
    else if (m[3] !== undefined) parts.push({ type: 'set', key: m[3], value: m[4] });
    else if (m[5] !== undefined) parts.push({ type: 'preset', name: m[5] });
    else if (m[0] === '[clear-chat]') parts.push({ type: 'clear-chat' });
    else if (m[0] === '[search-scripts]') parts.push({ type: 'search-scripts' });
    else if (m[6] !== undefined) parts.push({ type: 'scan', tabName: m[6] });
    else if (m[0] === '[rejoin]') parts.push({ type: 'roblox-action', action: 'rejoin' });
    else if (m[0] === '[close-roblox]') parts.push({ type: 'roblox-action', action: 'close-roblox' });
    else if (m[0] === '[restart-infernix]') parts.push({ type: 'roblox-action', action: 'restart-infernix' });
    else if (m[0] === '[close-infernix]') parts.push({ type: 'roblox-action', action: 'close-infernix' });
    else if (m[0] === '[attach]') parts.push({ type: 'roblox-action', action: 'attach' });
    else if (m[7] !== undefined) parts.push({ type: 'autoexec', tabName: m[7] });
    else if (m[8] !== undefined) parts.push({ type: 'save-preset', name: m[8] });
    else if (m[0] === '[open-website]') parts.push({ type: 'open-website' });
    else if (m[9] !== undefined) parts.push({ type: 'execute', tabName: m[9] });
    else if (m[0] === '[execute-all]') parts.push({ type: 'execute-all' });
    else if (m[0] === '[new-tab]') parts.push({ type: 'new-tab' });
    else if (m[10] !== undefined) parts.push({ type: 'close-tab', tabName: m[10] });
    else if (m[11] !== undefined) parts.push({ type: 'duplicate-tab', tabName: m[11] });
    else if (m[12] !== undefined) parts.push({ type: 'save-script', tabName: m[12] });
    else if (m[0] === '[clear-history]') parts.push({ type: 'clear-history' });
    else if (m[0] === '[refresh-clients]') parts.push({ type: 'refresh-clients' });
    else if (m[0] === '[open-discord]') parts.push({ type: 'open-discord' });
    else if (m[0] === '[open-autoexec-folder]') parts.push({ type: 'open-autoexec-folder' });
    else if (m[0] === '[open-workspace-folder]') parts.push({ type: 'open-workspace-folder' });
    else if (m[0] === '[open-scripts-folder]') parts.push({ type: 'open-scripts-folder' });
    else if (m[0] === '[reset-settings]') parts.push({ type: 'reset-settings' });
    else if (m[0] === '[check-updates]') parts.push({ type: 'check-updates' });
    else if (m[0] === '[start-tutorial]') parts.push({ type: 'start-tutorial' });
    else if (m[0] === '[show-chips]') parts.push({ type: 'show-chips' });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: 'text', value: content.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: content }];
}

function chip(bg, border, color) {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, margin: '4px 3px', padding: '5px 12px', background: bg, border: `1px solid ${border}`, borderRadius: 20, fontSize: 12, color, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' };
}

let msgId = 0;

import { avgAIResponseTime, formatMs } from '../utils/stats';
import ModelPicker from './ModelPicker';

export default function Assistant({
  tabs, clients = [], onWriteToTab, onSwitchToExecutor, onNotify,
  onNavigate, onNavigateToTab, onApplySettings, onRobloxAction, onScanTab,
  onAddToAutoExec, onSavePreset, onExecuteTab, onExecuteAll, onNewTab, onCloseTabByName, onDuplicateTab, onSaveScript, onStartTutorial,
  stats, onRecordAI, isPremium,
}) {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const fileInputRef = useRef(null);
  const [aiProvider, setAiProvider] = useState(() => {
    try { return localStorage.getItem('infernix-ai-provider') || (isPremium ? 'kimi' : 'gemini'); } catch { return isPremium ? 'kimi' : 'gemini'; }
  });
  const [aiModel, setAiModel] = useState(() => {
    try { return localStorage.getItem('infernix-ai-model') || (isPremium ? 'kimi-k2-6' : 'gemini-2.5-flash'); } catch { return isPremium ? 'kimi-k2-6' : 'gemini-2.5-flash'; }
  });
  const bottomRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('infernix-ai-provider', aiProvider);
    localStorage.setItem('infernix-ai-model', aiModel);
  }, [aiProvider, aiModel]);

  useEffect(() => {
    try {
      // Strip image data before persisting to avoid localStorage quota errors
      const toStore = messages.filter(m => !m.streaming).map(m => {
        const { images, ...rest } = m;
        return rest;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const handleSendToEditor = useCallback((code) => {
    const targetTab = tabs?.[tabs.length - 1];
    if (!targetTab) return;
    onWriteToTab?.(targetTab.id, code);
    onSwitchToExecutor?.(targetTab.id);
    onNotify?.({ type: 'success', title: 'Code Sent', message: 'Script copied to editor' });
  }, [tabs, onWriteToTab, onSwitchToExecutor, onNotify]);

  const mdComponents = useMemo(() => ({
    p: ({ children, ...p }) => <p style={{ marginBottom: 8, lineHeight: 1.7, color: 'var(--text-secondary)' }} {...p}>{children}</p>,
    ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 8, color: 'var(--text-secondary)' }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 8, color: 'var(--text-secondary)' }}>{children}</ol>,
    li: ({ children }) => <li style={{ lineHeight: 1.6, marginBottom: 2 }}>{children}</li>,
    strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{children}</em>,
    pre: ({ children }) => <>{children}</>,
    code: ({ inline, className, children }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && (match || String(children).includes('\n'))) {
        return <CodeBlock language={match?.[1]} onSendToEditor={handleSendToEditor}>{children}</CodeBlock>;
      }
      return <code style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{children}</code>;
    },
    h1: ({ children }) => <h1 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 20, marginBottom: 12, marginTop: 16 }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 17, marginBottom: 8, marginTop: 12 }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8, marginTop: 8 }}>{children}</h3>,
    blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid var(--border)', paddingLeft: 16, margin: '8px 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>{children}</blockquote>,
    a: ({ children, href }) => <a href={href} style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">{children}</a>,
  }), [handleSendToEditor]);

  const renderAIContent = useCallback((msg) => {
    if (!msg.content && msg.streaming) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TypingDots />
          {aiProvider === 'kimi' && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Thinking…</span>}
        </div>
      );
    }
    if (msg.content && msg.streaming && aiProvider === 'kimi') {
      return (
        <div>
          <ReactMarkdown remarkPlugins={[]} components={mdComponents}>
            {msg.content}
          </ReactMarkdown>
          <span style={{ display: 'inline-block', width: 7, height: 14, background: 'var(--accent)', borderRadius: 1, animation: 'caret-blink 1s step-end infinite', verticalAlign: 'middle', marginLeft: 2 }} />
        </div>
      );
    }
    const segments = parseNavTags(msg.content || '');
    return (
      <>
        {segments.map((seg, i) => {
          if (seg.type === 'nav') return (
            <button key={i} onClick={() => onNavigate?.(seg.viewId)}
              style={chip('var(--bg-tertiary)', 'var(--border)', 'var(--text-secondary)')}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background='var(--bg-tertiary)'}>
              <ArrowRight size={11} /> Go to {seg.label}
            </button>
          );
          if (seg.type === 'tab') return (
            <button key={i} onClick={() => onNavigateToTab?.(seg.tabName)}
              style={chip('var(--bg-tertiary)', 'var(--border)', 'var(--text-secondary)')}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background='var(--bg-tertiary)'}>
              <ArrowRight size={11} /> Switch to "{seg.tabName}"
            </button>
          );
          if (seg.type === 'set') return (
            <button key={i} onClick={() => onApplySettings?.({ [seg.key]: seg.value === 'true' ? true : seg.value === 'false' ? false : seg.value })}
              style={chip('rgba(var(--accent-rgb),0.12)', 'rgba(var(--accent-rgb),0.25)', 'var(--text-secondary)')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(var(--accent-rgb),0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(var(--accent-rgb),0.12)'}>
              <Settings size={11} /> {seg.key} → {seg.value}
            </button>
          );
          if (seg.type === 'preset') return (
            <button key={i} onClick={() => onApplySettings?.({ __preset: seg.name })}
              style={chip('rgba(var(--accent-rgb),0.12)', 'rgba(var(--accent-rgb),0.25)', 'var(--text-secondary)')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(var(--accent-rgb),0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(var(--accent-rgb),0.12)'}>
              <Palette size={11} /> Preset: {seg.name}
            </button>
          );
          if (seg.type === 'clear-chat') return (
            <button key={i} onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); }}
              style={chip('rgba(255,80,80,0.12)', 'rgba(255,80,80,0.22)', '#ff8080')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,80,80,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,80,80,0.12)'}>
              <Trash2 size={11} /> Clear chat
            </button>
          );
          if (seg.type === 'scan') return (
            <button key={i} onClick={() => onScanTab?.(seg.tabName)}
              style={chip('rgba(250,204,21,0.12)', 'rgba(250,204,21,0.25)', '#fbbf24')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(250,204,21,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(250,204,21,0.12)'}>
              <Shield size={11} /> Scan "{seg.tabName}"
            </button>
          );
          if (seg.type === 'autoexec') return (
            <button key={i} onClick={() => onAddToAutoExec?.(seg.tabName)}
              style={chip('rgba(139,92,246,0.12)', 'rgba(139,92,246,0.25)', '#a78bfa')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(139,92,246,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(139,92,246,0.12)'}>
              <Play size={11} /> Add to Auto Execute: {seg.tabName}
            </button>
          );
          if (seg.type === 'save-preset') return (
            <button key={i} onClick={() => onSavePreset?.(seg.name)}
              style={chip('rgba(59,130,246,0.12)', 'rgba(59,130,246,0.25)', '#60a5fa')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(59,130,246,0.12)'}>
              <BookmarkPlus size={11} /> Save Preset: {seg.name}
            </button>
          );
          if (seg.type === 'open-website') return (
            <button key={i} onClick={() => window.electronAPI?.openExternal?.('https://infernix.vercel.app')}
              style={chip('rgba(99,102,241,0.12)', 'rgba(99,102,241,0.25)', '#818cf8')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.12)'}>
              <Link size={11} /> Open Infernix Website
            </button>
          );
          if (seg.type === 'open-discord') return (
            <button key={i} onClick={() => window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb')}
              style={chip('rgba(88,101,242,0.12)', 'rgba(88,101,242,0.28)', '#7289da')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(88,101,242,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(88,101,242,0.12)'}>
              <MessageSquare size={11} /> Open Discord Server
            </button>
          );
          if (seg.type === 'execute') return (
            <button key={i} onClick={() => onExecuteTab?.(seg.tabName)}
              style={chip('rgba(251,146,60,0.12)', 'rgba(251,146,60,0.28)', '#fb923c')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(251,146,60,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(251,146,60,0.12)'}>
              <Terminal size={11} /> Execute: {seg.tabName}
            </button>
          );
          if (seg.type === 'execute-all') return (
            <button key={i} onClick={() => onExecuteAll?.()}
              style={chip('rgba(251,146,60,0.15)', 'rgba(251,146,60,0.32)', '#f97316')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(251,146,60,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(251,146,60,0.15)'}>
              <Zap size={11} /> Execute All Tabs
            </button>
          );
          if (seg.type === 'new-tab') return (
            <button key={i} onClick={() => onNewTab?.()}
              style={chip('rgba(52,211,153,0.12)', 'rgba(52,211,153,0.28)', '#34d399')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.12)'}>
              <Plus size={11} /> New Script Tab
            </button>
          );
          if (seg.type === 'close-tab') return (
            <button key={i} onClick={() => onCloseTabByName?.(seg.tabName)}
              style={chip('rgba(248,113,113,0.12)', 'rgba(248,113,113,0.28)', '#f87171')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(248,113,113,0.12)'}>
              <XCircle size={11} /> Close Tab: {seg.tabName}
            </button>
          );
          if (seg.type === 'duplicate-tab') return (
            <button key={i} onClick={() => onDuplicateTab?.(seg.tabName)}
              style={chip('rgba(96,165,250,0.12)', 'rgba(96,165,250,0.28)', '#60a5fa')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(96,165,250,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(96,165,250,0.12)'}>
              <Copy size={11} /> Duplicate: {seg.tabName}
            </button>
          );
          if (seg.type === 'save-script') return (
            <button key={i} onClick={() => onSaveScript?.(seg.tabName)}
              style={chip('rgba(45,212,191,0.12)', 'rgba(45,212,191,0.28)', '#2dd4bf')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(45,212,191,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(45,212,191,0.12)'}>
              <Save size={11} /> Save Script: {seg.tabName}
            </button>
          );
          if (seg.type === 'clear-history') return (
            <button key={i} onClick={() => window.electronAPI?.clearExecutionHistory?.()}
              style={chip('rgba(248,113,113,0.12)', 'rgba(248,113,113,0.28)', '#f87171')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(248,113,113,0.12)'}>
              <Trash2 size={11} /> Clear History
            </button>
          );
          if (seg.type === 'refresh-clients') return (
            <button key={i} onClick={() => window.electronAPI?.refreshClients?.()}
              style={chip('rgba(52,211,153,0.12)', 'rgba(52,211,153,0.28)', '#34d399')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.12)'}>
              <RefreshCw size={11} /> Refresh Clients
            </button>
          );
          if (seg.type === 'open-autoexec-folder') return (
            <button key={i} onClick={() => window.electronAPI?.openAutoexecDir?.()}
              style={chip('rgba(167,139,250,0.12)', 'rgba(167,139,250,0.28)', '#a78bfa')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.12)'}>
              <FolderOpen size={11} /> Open AutoExec Folder
            </button>
          );
          if (seg.type === 'open-workspace-folder') return (
            <button key={i} onClick={() => window.electronAPI?.openWorkspaceDir?.()}
              style={chip('rgba(167,139,250,0.12)', 'rgba(167,139,250,0.28)', '#a78bfa')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.12)'}>
              <FolderOpen size={11} /> Open Workspace Folder
            </button>
          );
          if (seg.type === 'open-scripts-folder') return (
            <button key={i} onClick={() => window.electronAPI?.openScriptsDir?.()}
              style={chip('rgba(167,139,250,0.12)', 'rgba(167,139,250,0.28)', '#a78bfa')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.12)'}>
              <FolderOpen size={11} /> Open Scripts Folder
            </button>
          );
          if (seg.type === 'reset-settings') return (
            <button key={i} onClick={() => window.electronAPI?.resetSettings?.()}
              style={chip('rgba(251,146,60,0.12)', 'rgba(251,146,60,0.28)', '#fb923c')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(251,146,60,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(251,146,60,0.12)'}>
              <RotateCcw size={11} /> Reset All Settings
            </button>
          );
          if (seg.type === 'check-updates') return (
            <button key={i} onClick={() => window.electronAPI?.checkUpdates?.()}
              style={chip('rgba(45,212,191,0.12)', 'rgba(45,212,191,0.28)', '#2dd4bf')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(45,212,191,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(45,212,191,0.12)'}>
              <Download size={11} /> Check for Updates
            </button>
          );
          if (seg.type === 'start-tutorial') return (
            <button key={i} onClick={() => onStartTutorial?.()}
              style={chip('rgba(167,139,250,0.12)', 'rgba(167,139,250,0.28)', '#a78bfa')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.12)'}>
              <BookOpen size={11} /> Start Tutorial
            </button>
          );
          if (seg.type === 'show-chips') {
            const G = ({ label, children }) => (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{children}</div>
              </div>
            );
            const C = ({ color, bg, icon: Icon, label, onClick }) => (
              <button onClick={onClick}
                style={{ display:'inline-flex', alignItems:'center', gap:4, margin:'2px', padding:'4px 9px', background: bg, border:`1px solid ${color}22`, borderRadius:20, fontSize:11, color, cursor:'pointer', fontFamily:'inherit', transition:'background 0.15s, border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background=color+'22'; e.currentTarget.style.borderColor=color+'55'; }}
                onMouseLeave={e => { e.currentTarget.style.background=bg; e.currentTarget.style.borderColor=color+'22'; }}>
                <Icon size={10} /> {label}
              </button>
            );
            return (
              <div key={i} style={{ marginTop: 6, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <G label="Navigate">
                  <C color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Dashboard" onClick={() => onNavigate?.('dashboard')} />
                  <C color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Executor" onClick={() => onNavigate?.('executor')} />
                  <C color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Script Hub" onClick={() => onNavigate?.('scripthub')} />
                  <C color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Clients" onClick={() => onNavigate?.('clients')} />
                  <C color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Settings" onClick={() => onNavigate?.('settings')} />
                </G>
                <G label="Roblox">
                  <C color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={Link} label="Attach" onClick={() => onRobloxAction?.('attach')} />
                  <C color="#34d399" bg="rgba(52,211,153,0.10)" icon={RefreshCw} label="Rejoin" onClick={() => onRobloxAction?.('rejoin')} />
                  <C color="#f87171" bg="rgba(248,113,113,0.10)" icon={XCircle} label="Close Roblox" onClick={() => onRobloxAction?.('close-roblox')} />
                  <C color="#34d399" bg="rgba(52,211,153,0.10)" icon={RefreshCw} label="Refresh Clients" onClick={() => window.electronAPI?.refreshClients?.()} />
                </G>
                <G label="Links">
                  <C color="#818cf8" bg="rgba(99,102,241,0.10)" icon={Link} label="Infernix Website" onClick={() => window.electronAPI?.openExternal?.('https://infernix.vercel.app')} />
                  <C color="#7289da" bg="rgba(88,101,242,0.10)" icon={MessageSquare} label="Discord" onClick={() => window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb')} />
                </G>
                <G label="Folders">
                  <C color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={FolderOpen} label="AutoExec" onClick={() => window.electronAPI?.openAutoexecDir?.()} />
                  <C color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={FolderOpen} label="Workspace" onClick={() => window.electronAPI?.openWorkspaceDir?.()} />
                  <C color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={FolderOpen} label="Scripts" onClick={() => window.electronAPI?.openScriptsDir?.()} />
                </G>
                <G label="App">
                  <C color="#2dd4bf" bg="rgba(45,212,191,0.10)" icon={Download} label="Check Updates" onClick={() => window.electronAPI?.checkUpdates?.()} />
                  <C color="#60a5fa" bg="rgba(96,165,250,0.10)" icon={RotateCcw} label="Restart Infernix" onClick={() => onRobloxAction?.('restart-infernix')} />
                  <C color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={BookOpen} label="Start Tutorial" onClick={() => onStartTutorial?.()} />
                  <C color="#f87171" bg="rgba(248,113,113,0.10)" icon={Trash2} label="Clear History" onClick={() => window.electronAPI?.clearExecutionHistory?.()} />
                  <C color="#f87171" bg="rgba(248,113,113,0.10)" icon={XCircle} label="Close Infernix" onClick={() => onRobloxAction?.('close-infernix')} />
                </G>
              </div>
            );
          }
          if (seg.type === 'roblox-action') {
            const meta = {
              rejoin:            { label: 'Rejoin Server',     icon: RefreshCw, color: '#34d399', bg: 'rgba(52,211,153,0.12)',  bd: 'rgba(52,211,153,0.25)' },
              'close-roblox':    { label: 'Close Roblox',      icon: XCircle,   color: '#f87171', bg: 'rgba(248,113,113,0.12)', bd: 'rgba(248,113,113,0.25)' },
              'restart-infernix':{ label: 'Restart Infernix',  icon: RotateCcw, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  bd: 'rgba(96,165,250,0.25)' },
              'close-infernix':  { label: 'Close Infernix',    icon: XCircle,   color: '#f87171', bg: 'rgba(248,113,113,0.12)', bd: 'rgba(248,113,113,0.25)' },
              attach:            { label: 'Attach to Roblox',  icon: Link,      color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', bd: 'rgba(167,139,250,0.25)' },
            }[seg.action] || { label: seg.action, icon: Zap, color: 'var(--text-primary)', bg: 'var(--bg-tertiary)', bd: 'var(--border)' };
            const Icon = meta.icon;
            return (
              <button key={i} onClick={() => onRobloxAction?.(seg.action)}
                style={chip(meta.bg, meta.bd, meta.color)}
                onMouseEnter={e => e.currentTarget.style.background=meta.bd}
                onMouseLeave={e => e.currentTarget.style.background=meta.bg}>
                <Icon size={11} /> {meta.label}
              </button>
            );
          }
          return <ReactMarkdown key={i} components={mdComponents}>{seg.value}</ReactMarkdown>;
        })}
      </>
    );
  }, [mdComponents, onNavigate, onNavigateToTab, onApplySettings, onScanTab, onRobloxAction, onAddToAutoExec, onSavePreset, onExecuteTab, onExecuteAll, onNewTab, onCloseTabByName, onDuplicateTab, onSaveScript, onStartTutorial]);

  const doSend = useCallback(async (overrideInput) => {
    const text = (overrideInput ?? input).trim();
    if ((!text && pendingImages.length === 0) || busy) return;
    setInput('');
    setBusy(true);

    const userMsg = { id: ++msgId, role: 'user', content: text, images: pendingImages.length > 0 ? pendingImages.map(img => ({ mimeType: img.mimeType, data: img.data })) : undefined, timestamp: Date.now() };
    setPendingImages([]);
    const aiId = ++msgId;
    const aiMsg = { id: aiId, role: 'assistant', content: '', streaming: true, timestamp: Date.now(), provider: aiProvider };
    setMessages(prev => [...prev, userMsg, aiMsg]);

    const history = [...messages, userMsg];
    const robloxOpen = clients && clients.length > 0;
    const isAttached = clients?.some(c => (Array.isArray(c) ? c[3] : c.status) === 3);
    const statusLine = `\n\nRoblox clients: ${robloxOpen ? `${clients.length} detected` : 'Not yet scanned'}. Attachment: ${isAttached ? 'Attached.' : 'Not attached.'}`;
    const tabsLine = tabs && tabs.length > 0
      ? `\n\nOpen script tabs (${tabs.length}):\n` + tabs.map(t => {
          const lines = (t.content || '').split('\n').length;
          const preview = (t.content || '').slice(0, 800);
          const truncated = (t.content || '').length > 800 ? `\n... (truncated, ${lines} lines total)` : '';
          return `--- Tab: "${t.name}" (${lines} lines) ---\n${preview}${truncated}`;
        }).join('\n\n')
      : '\n\nNo script tabs are currently open.';
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT + statusLine + tabsLine },
      ...history.slice(-10).map(m => {
        const out = { role: m.role, content: m.content };
        if (m.images && m.images.length > 0) out.images = m.images;
        return out;
      }),
    ];

    const aiT0 = performance.now();
    try {
      let finalContent = '';
      let finalReasoning = '';

      if (aiProvider === 'kimi' && !window.electronAPI?.aiGenerate) {
        // Dev mode only: direct streaming fetch to Moonshot (CORS-safe in browser)
        const streamKimi = async (msgs, model, onChunk) => {
          const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer sk-kimi-Ooj7Zmy3x7ZVjQLrfsHyW158bOD01FvttAfYeLh7ygLC0Imate90IJiVgOylRegS', 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: msgs.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role, content: m.content || '(image attached)' })), temperature: 0.7, stream: true }),
          });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) throw new Error('401: Premium AI key invalid');
            if (res.status === 429) throw new Error('429: Rate limited');
            throw new Error(`HTTP ${res.status}`);
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta || {};
                onChunk(delta.reasoning_content || '', delta.content || '');
              } catch {}
            }
          }
        };

        await streamKimi(apiMessages, aiModel, (rChunk, cChunk) => {
          finalReasoning += rChunk;
          finalContent += cChunk;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: finalContent, reasoning_content: finalReasoning, streaming: true } : m));
        });
      } else {
        // Production (both providers) OR dev mode Gemini: use electron API or direct fetch
        let data;
        if (window.electronAPI?.aiGenerate) {
          data = await window.electronAPI.aiGenerate(apiMessages, aiProvider, aiModel);
        } else {
          // Direct fetch fallback (browser dev mode) — Gemini only
          const toGeminiBody = (msgs) => {
            let sys = null;
            const contents = [];
            for (const m of msgs) {
              if (m.role === 'system') sys = { parts: [{ text: m.content }] };
              else if (m.role === 'user') {
                const parts = [{ text: m.content || '' }];
                if (Array.isArray(m.images)) {
                  for (const img of m.images) {
                    parts.push({ inlineData: { mimeType: img.mimeType || 'image/png', data: img.data } });
                  }
                }
                contents.push({ role: 'user', parts });
              }
              else if (m.role === 'assistant') contents.push({ role: 'model', parts: [{ text: m.content || '' }] });
            }
            const b = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2000 } };
            if (sys) b.systemInstruction = sys;
            return b;
          };
          const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyAPie1yJnK1E0PQJ_2B1UQEjppMk2Uplws', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toGeminiBody(apiMessages)),
          });
          if (!res.ok) {
            if (res.status === 429) throw new Error('429: Rate limited');
            if (res.status === 503) throw new Error('503: Gemini is temporarily unavailable. Please try again in a moment.');
            if (res.status === 500) throw new Error('500: Gemini server error. Please try again.');
            throw new Error(`HTTP ${res.status}`);
          }
          const geminiJson = await res.json();
          if (geminiJson.error) throw new Error(geminiJson.error.message);
          const parts = geminiJson.candidates?.[0]?.content?.parts || [];
          let text = '';
          const images = [];
          for (const part of parts) {
            if (part.text) text += part.text;
            else if (part.inlineData) images.push({ mimeType: part.inlineData.mimeType || 'image/png', data: part.inlineData.data });
          }
          const msg = { content: text };
          if (images.length > 0) msg.images = images;
          data = { choices: [{ message: msg }] };
        }
        const choice = data.choices?.[0]?.message || {};
        finalContent = choice.content || 'Sorry, I could not generate a response.';
        finalReasoning = choice.reasoning_content || '';
        const aiImages = choice.images || [];

        if (aiProvider === 'kimi' && window.electronAPI?.aiGenerate) {
          // Simulate live thinking + typing for Kimi backend path (production)
          const rLen = finalReasoning.length;
          const cLen = finalContent.length;
          const totalSteps = Math.max(rLen, cLen, 1);
          const stepMs = Math.min(25, Math.max(5, 1000 / totalSteps));
          let rIdx = 0, cIdx = 0;
          const rStep = Math.max(1, Math.floor(rLen / 35));
          const cStep = Math.max(1, Math.floor(cLen / 45));
          while (rIdx < rLen || cIdx < cLen) {
            rIdx = Math.min(rLen, rIdx + rStep);
            cIdx = Math.min(cLen, cIdx + cStep);
            setMessages(prev => prev.map(m => m.id === aiId ? {
              ...m,
              content: finalContent.slice(0, cIdx),
              reasoning_content: finalReasoning.slice(0, rIdx),
              streaming: true,
            } : m));
            await new Promise(r => setTimeout(r, stepMs));
          }
        } else {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: finalContent, reasoning_content: finalReasoning, images: aiImages.length > 0 ? aiImages : undefined, streaming: true } : m));
        }
      }

      const aiElapsed = Math.round(performance.now() - aiT0);
      onRecordAI?.(aiElapsed);
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m));

      // Auto-execute action tags
      const navMatch = finalContent.match(/\[nav:(\w+)\]/);
      if (navMatch && NAV_VIEWS[navMatch[1].toLowerCase()]) setTimeout(() => onNavigate?.(navMatch[1].toLowerCase()), 420);
      const tabMatch = finalContent.match(/\[tab:([^\]]+)\]/);
      if (tabMatch) setTimeout(() => onNavigateToTab?.(tabMatch[1]), 520);
      const setMatches = [...finalContent.matchAll(/\[set:([\w]+)=([^\]]+)\]/g)];
      const presetMatch = finalContent.match(/\[preset:([^\]]+)\]/);
      if (setMatches.length > 0 || presetMatch) {
        const patch = {};
        for (const sm of setMatches) patch[sm[1]] = sm[2] === 'true' ? true : sm[2] === 'false' ? false : sm[2];
        if (presetMatch) patch.__preset = presetMatch[1];
        setTimeout(() => onApplySettings?.(patch), 300);
      }
      if (finalContent.includes('[clear-chat]')) setTimeout(() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); }, 600);
      const scanMatches = [...finalContent.matchAll(/\[scan:([^\]]+)\]/g)];
      for (const sm of scanMatches) setTimeout(() => onScanTab?.(sm[1]), 400);
      const autoexecMatches = [...finalContent.matchAll(/\[autoexec:([^\]]+)\]/g)];
      for (const am of autoexecMatches) setTimeout(() => onAddToAutoExec?.(am[1]), 400);
      const savePresetMatches = [...finalContent.matchAll(/\[save-preset:([^\]]+)\]/g)];
      for (const sm of savePresetMatches) setTimeout(() => onSavePreset?.(sm[1]), 400);
      const actionOrder = ['[attach]', '[rejoin]', '[close-roblox]', '[restart-infernix]', '[close-infernix]'];
      const actionMap = { '[attach]': 'attach', '[rejoin]': 'rejoin', '[close-roblox]': 'close-roblox', '[restart-infernix]': 'restart-infernix', '[close-infernix]': 'close-infernix' };
      let delay = 600;
      for (const tag of actionOrder) {
        if (finalContent.includes(tag)) { const d = delay; setTimeout(() => onRobloxAction?.(actionMap[tag]), d); delay += 1500; }
      }
      // Auto-execute URL/folder openers
      if (finalContent.includes('[open-website]')) window.electronAPI?.openExternal?.('https://infernix.vercel.app');
      if (finalContent.includes('[open-discord]')) window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb');
      if (finalContent.includes('[open-autoexec-folder]')) window.electronAPI?.openAutoexecDir?.();
      if (finalContent.includes('[open-workspace-folder]')) window.electronAPI?.openWorkspaceDir?.();
      if (finalContent.includes('[open-scripts-folder]')) window.electronAPI?.openScriptsDir?.();
      if (finalContent.includes('[check-updates]')) setTimeout(() => window.electronAPI?.checkUpdates?.(), 200);
      if (finalContent.includes('[refresh-clients]')) setTimeout(() => window.electronAPI?.refreshClients?.(), 200);
      if (finalContent.includes('[start-tutorial]')) setTimeout(() => onStartTutorial?.(), 400);
      if (finalContent.includes('[execute-all]')) setTimeout(() => onExecuteAll?.(), 500);
      if (finalContent.includes('[new-tab]')) setTimeout(() => onNewTab?.(), 300);
      if (finalContent.includes('[clear-history]')) setTimeout(() => window.electronAPI?.clearExecutionHistory?.(), 400);
      const executeAutoMatches = [...finalContent.matchAll(/\[execute:([^\]]+)\]/g)];
      for (const em of executeAutoMatches) setTimeout(() => onExecuteTab?.(em[1]), 500);
      const dupTabAutoMatches = [...finalContent.matchAll(/\[duplicate-tab:([^\]]+)\]/g)];
      for (const dm of dupTabAutoMatches) setTimeout(() => onDuplicateTab?.(dm[1]), 400);
      const saveScriptAutoMatches = [...finalContent.matchAll(/\[save-script:([^\]]+)\]/g)];
      for (const sm of saveScriptAutoMatches) setTimeout(() => onSaveScript?.(sm[1]), 400);
    } catch (err) {
      const aiElapsed = Math.round(performance.now() - aiT0);
      onRecordAI?.(aiElapsed);
      const msg = err?.message || 'Unknown error';
      console.error('[Assistant] AI error:', msg);
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: 'Error: ' + msg, streaming: false } : m));
    }

    setBusy(false);
  }, [messages, busy, input, pendingImages, clients, onNavigate, onNavigateToTab, onApplySettings, onScanTab, onRobloxAction, onAddToAutoExec, onSavePreset, onStartTutorial, onExecuteAll, onNewTab, onExecuteTab, onDuplicateTab, onSaveScript, onRecordAI]);

  const clearChat = useCallback(() => {
    setClearing(true);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(() => setClearing(false), 600);
  }, []);

  const handleImageSelect = useCallback((e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newImages = [];
    let loaded = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        newImages.push({ mimeType: file.type, data: base64, preview: ev.target.result });
        loaded++;
        if (loaded === files.length) setPendingImages(prev => [...prev, ...newImages]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, []);

  const removePendingImage = useCallback((idx) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent', minHeight: 0, overflow: 'hidden' }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px 16px', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent', minHeight: 0 }}>
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', maxWidth: 560, margin: '0 auto', textAlign: 'center', userSelect: 'none' }}
          >
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={28} style={{ color: 'var(--text-primary)' }} />
              </div>
              <span style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#34d399', border: '2px solid var(--bg-primary)', display: 'block' }} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>Infernix AI</h1>
            {stats && stats.ai.requests > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{formatMs(avgAIResponseTime(stats))}</span>
                  <span style={{ fontSize: 10 }}>avg</span>
                </span>
                <span style={{ width: 1, height: 10, background: 'var(--border)' }} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{stats.ai.requests}</span>
                  <span style={{ fontSize: 10 }}>reqs</span>
                </span>
                {stats.ai.lastTime > 0 && (
                  <>
                    <span style={{ width: 1, height: 10, background: 'var(--border)' }} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{formatMs(stats.ai.lastTime)}</span>
                      <span style={{ fontSize: 10 }}>last</span>
                    </span>
                  </>
                )}
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 36, maxWidth: 320 }}>
              Ask anything — features, Lua scripting, settings, or just explore.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 480 }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={s}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => doSend(s)}
                  style={{ textAlign: 'left', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}>
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 16 }}>
            <AnimatePresence initial={false}>
              {messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ display: 'flex', gap: 14, flexDirection: isUser ? 'row-reverse' : 'row' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                      {isUser
                        ? <User size={13} style={{ color: 'var(--text-muted)' }} />
                        : <Flame size={13} style={{ color: 'var(--text-primary)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexDirection: isUser ? 'row-reverse' : 'row' }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{isUser ? 'You' : 'Infernix AI'}</span>
                        {msg.timestamp && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {isUser ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', maxWidth: '78%' }}>
                          {msg.content && (
                            <div style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', fontSize: 14, padding: '10px 16px', borderRadius: '18px 18px 4px 18px', fontWeight: 500, lineHeight: 1.5 }}>
                              {msg.content}
                            </div>
                          )}
                          {msg.images && msg.images.map((img, i) => (
                            <img key={i} src={`data:${img.mimeType};base64,${img.data}`} alt="Uploaded" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 12, border: '1px solid var(--border)' }} />
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65, minWidth: 0, width: '100%' }}>
                          {msg.reasoning_content && (
                            <details open={msg.streaming} style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                              <summary style={{ cursor: 'pointer', fontStyle: 'italic', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Sparkles size={11} style={{ color: 'var(--accent)' }} />
                                {msg.streaming ? 'Thinking…' : "Kimi's reasoning"}
                              </summary>
                              <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {msg.reasoning_content}
                              </div>
                            </details>
                          )}
                          {msg.streaming && msg.provider === 'gemini' && !msg.content && <ImageGenPlaceholder />}
                          {renderAIContent(msg)}
                          {msg.images && msg.images.map((img, i) => (
                            <img key={i} src={`data:${img.mimeType};base64,${img.data}`} alt="Generated" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 12, border: '1px solid var(--border)', marginTop: 10 }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area — uses CSS vars, no hardcoded dark gradient */}
      <div style={{ background: 'linear-gradient(to top, var(--bg-primary) 60%, transparent)', padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {pendingImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {pendingImages.map((img, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', width: 72, height: 72 }}>
                  <img src={img.preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removePendingImage(i)}
                    style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', transition: 'border-color 0.15s' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.4)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
            <textarea
              ref={textRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } }}
              placeholder="Ask Infernix AI anything..."
              rows={1}
              disabled={busy}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', resize: 'none', maxHeight: 160, lineHeight: 1.5, padding: '2px 0', fontFamily: 'inherit', opacity: busy ? 0.4 : 1 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button onClick={() => fileInputRef.current?.click()} title="Attach image"
                disabled={busy || aiProvider === 'kimi'}
                style={{ width: 24, height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: (busy || aiProvider === 'kimi') ? 'var(--border)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: (busy || aiProvider === 'kimi') ? 'default' : 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => { if (!busy && aiProvider !== 'kimi') e.currentTarget.style.color='var(--text-primary)'; }}
                onMouseLeave={e => { if (!busy && aiProvider !== 'kimi') e.currentTarget.style.color='var(--text-muted)'; }}>
                <ImageIcon size={12} />
              </button>
              <ModelPicker
                provider={aiProvider}
                isPremium={isPremium}
                onChange={(prov, mod) => { setAiProvider(prov); setAiModel(mod); }}
              />
              <button onClick={clearChat} title="Clear chat"
                style={{ width: 24, height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                <RotateCcw size={12} style={clearing ? { animation: 'spin 0.5s linear' } : {}} />
              </button>
              <motion.button onClick={() => doSend()} disabled={(!input.trim() && pendingImages.length === 0) || busy} whileTap={{ scale: 0.88 }}
                style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-primary)', border: 'none', cursor: ((!input.trim() && pendingImages.length === 0) || busy) ? 'default' : 'pointer', opacity: ((!input.trim() && pendingImages.length === 0) || busy) ? 0.2 : 1 }}>
                <Send size={11} />
              </motion.button>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 6, opacity: 0.6 }}>Shift + Enter for new line · Images supported with Gemini</p>
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}