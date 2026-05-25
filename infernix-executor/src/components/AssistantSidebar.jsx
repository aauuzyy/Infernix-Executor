import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  Send, Flame, RotateCcw, Copy, Check, User, ArrowRight, Settings, Palette, Trash2,
  Shield, Zap, RefreshCw, XCircle, Link, Search, Play, BookmarkPlus,
  Plus, FolderOpen, Save, Download, MessageSquare, Terminal, BookOpen,
  Sparkles, ImageIcon, X,
} from 'lucide-react';
import './AssistantSidebar.css';
import { avgAIResponseTime, formatMs } from '../utils/stats';
import ModelPicker from './ModelPicker';

const STORAGE_KEY = 'infernix-chat-executor-v1';

const NAV_VIEWS = {
  dashboard: 'Dashboard',
  executor: 'Executor',
  scripthub: 'Script Hub',
  clients: 'Clients',
  settings: 'Settings',
};

const SYSTEM_PROMPT = `You are Infernix AI, a helpful assistant for the Infernix Roblox executor app.

You can help users:
- Generate and explain Roblox Lua scripts
- Navigate to sections of the app (Dashboard, Executor, Script Hub, Clients, Settings)
- Explain executor features like Auto Attach, Script Hub, Execution History
- Answer questions about Infernix
- Perform Roblox and app actions on their behalf

Navigation: When a user asks to go somewhere or you want to direct them to a section, ALWAYS include a nav tag like [nav:executor] or [nav:dashboard] or [nav:scripthub] or [nav:clients] or [nav:settings] in your reply. This AUTOMATICALLY navigates them there AND creates a button. Use it freely whenever navigation makes sense.

Tab navigation: If a user wants to go to a specific script tab by name (e.g. "take me to my Infernix tab" or "go to Script 55"), include BOTH [nav:executor] AND [tab:TabName] in your reply (using the exact tab name they mentioned). This will navigate to the Executor AND switch to that specific tab automatically.

Tutorial: When a user asks "how do I use Infernix?", "how do I get started?", "I'm new", "what does this do", "what can you do", "show me around", "help me use this", or any general how-to/overview/getting-started question about the app itself — ALWAYS include [start-tutorial] in your reply. This automatically launches an interactive guided tour. Also use [start-tutorial] when a user seems confused or lost. These execute automatically so you don't need to tell them to click.

Settings control: You can directly change the user's app settings by including special tags in your reply. These apply instantly:
- Theme mode: [set:themeMode=dark] or [set:themeMode=light] or [set:themeMode=midnight]
- Accent color (hex): [set:accentColor=#f97316]
- Color shift animation: [set:colorShift=true] or [set:colorShift=false]
- Toggle booleans: [set:autoAttach=true], [set:autoExecute=true], [set:closeRoblox=true/false], [set:debugConsole=true/false], [set:topmost=true/false]
- Apply a full theme preset: [preset:Fire] [preset:Ruby] [preset:Emerald] [preset:Ocean] [preset:Violet] [preset:Pink] [preset:Cyan] [preset:Gold] [preset:Midnight] [preset:Light] [preset:Random]
- Clear the chat history: [clear-chat]

When a user asks to change a setting, theme, or color — DO IT using these tags, don't just describe how.

Script search: When a user asks for scripts for their current game or wants to browse scripts, include [search-scripts] in your reply. This fetches relevant scripts from ScriptHub automatically.

Tab scanning: To scan a script tab with VirusTotal, include [scan:TabName] using the exact tab name. This triggers a security scan immediately.

Auto-Execute: To add a script tab to Auto Execute (scripts that run on every game join), include [autoexec:TabName] using the exact tab name. Use [autoexec:all] to add ALL open tabs at once. Do this immediately when asked — do NOT ask for confirmation first, just do it and confirm what you added in your reply.

Chip gallery: When a user asks "what can you do?", "show me all actions", "what chips are there", "show me everything", or wants to browse all available actions — include [show-chips] in your reply. This displays a full interactive menu of every available action chip. These are shown for the user to click manually — they do NOT auto-execute.

Preset saving: To save the user's current settings as a named preset in the Preset Manager, include [save-preset:Name]. Analyze the user's current theme mode, accent color, and visible settings to generate a descriptive name like "Dark Ocean", "Fire Shift", "Light Minimal", "Violet Night", etc. Always briefly describe what settings are being saved.

Roblox actions (execute automatically — confirm what you're doing in your reply):
- [attach] — attaches Infernix to Roblox
- [rejoin] — rejoins the current Roblox server (requires attachment)
- [close-roblox] — closes Roblox

Infernix app actions (all execute automatically):
- [restart-infernix] — restarts the Infernix app
- [close-infernix] — closes the Infernix app
- [open-website] — opens the official Infernix website in the user's browser. Executes immediately.
- [open-discord] — opens the Infernix Discord server in the user's browser. Executes immediately.
- [check-updates] — checks if a new Infernix version is available. Executes immediately.
- [reset-settings] — resets all Infernix settings to their defaults. Confirm with user first.
- [start-tutorial] — launches the interactive Infernix tutorial. Executes immediately — use whenever user asks how to use the app.
- [refresh-clients] — rescans for active Roblox clients. Executes immediately.
- [clear-history] — clears all script execution history.

Script contents: You have FULL READ ACCESS to the contents of every open script tab (provided below in this message). When a user asks you to fix, review, improve, or explain code in a specific tab, READ the code from the tab content below and provide the fixed or improved code directly in your reply. Do NOT ask the user to paste the code — you already have it.

Script execution (requires Roblox to be attached):
- [execute:TabName] — executes a specific script tab against all attached Roblox clients. You are provided with the list of open tabs below — ALWAYS use an exact tab name from that list. Never guess or hallucinate tab names. Always confirm what you're running.
- [execute-all] — executes every open script tab at once. Use only when the user explicitly asks.

Tab management:
- [new-tab] — creates a new empty script tab in the Executor.
- [close-tab:TabName] — closes a script tab by name. Use an exact tab name from the open tabs list below. Confirm before closing.
- [duplicate-tab:TabName] — duplicates a tab (copies its content into a new tab with "(copy)" appended).
- [save-script:TabName] — saves a tab's script to the Infernix script library permanently.

Folder shortcuts (opens in Windows Explorer):
- [open-autoexec-folder] — opens the Auto Execute scripts folder.
- [open-workspace-folder] — opens the Workspace scripts folder.
- [open-scripts-folder] — opens the saved Scripts library folder.

Safety rules (IMPORTANT):
- [attach] can ALWAYS be used — it is how Roblox clients get detected. Even if clients shows "Not yet scanned", always use [attach] when the user wants to attach. Never refuse [attach].
- [rejoin] and [close-roblox] require Roblox to be open (clients count > 0). If clients is 0, warn the user and suggest they open Roblox first, but still offer [attach] to try.
- Before using [restart-infernix] or [close-infernix], make sure the user explicitly wants this.
- Always briefly explain what action tags you are including.

When generating scripts, wrap them in code blocks using \`\`\`lua. Be conversational and helpful.

Image generation: You do NOT generate images in the sidebar. If a user asks for an image, diagram, or visualization, politely explain that image generation is only available in the main Assistant tab.`;

const SUGGESTIONS = [
  'Generate a simple ESP script',
  'Take me to the Executor',
  "How do I use Auto Attach?",
  'Write a speed hack script',
];

// Catppuccin code theme
const codeTheme = {
  'code[class*="language-"]': { color: '#cdd6f4', background: 'none', fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '11px', lineHeight: '1.65' },
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

function CodeBlock({ language, children, onCopyToEditor }) {
  const [copied, setCopied] = useState(false);
  const [copyHovered, setCopyHovered] = useState(false);
  const [sendHovered, setSendHovered] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const lang = language || 'lua';

  const copy = useCallback(() => {
    const doCopy = (text) => {
      try {
        navigator.clipboard.writeText(text).catch(() => {
          const el = document.createElement('textarea');
          el.value = text;
          el.style.position = 'fixed';
          el.style.opacity = '0';
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        });
      } catch {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
    };
    doCopy(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [code]);

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', marginTop: 6, marginBottom: 6, border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{lang}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {onCopyToEditor && (
            <button onClick={() => onCopyToEditor(code)} style={{ fontSize: 10, color: sendHovered ? 'var(--text-primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', borderRadius: 4, transition: 'color 0.12s' }}
              onMouseEnter={() => setSendHovered(true)}
              onMouseLeave={() => setSendHovered(false)}
            >
              Send to Editor
            </button>
          )}
          <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: copied ? '#34d399' : copyHovered ? 'var(--text-primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', borderRadius: 4, transition: 'color 0.12s', fontFamily: 'inherit' }}
            onMouseEnter={() => setCopyHovered(true)}
            onMouseLeave={() => setCopyHovered(false)}
          >
            {copied ? <Check size={9} /> : <Copy size={9} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <SyntaxHighlighter language={lang} style={codeTheme} customStyle={{ margin: 0, padding: '10px 12px', background: 'transparent' }}
          codeTagProps={{ style: { fontFamily: '"JetBrains Mono","Fira Code",monospace' } }}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function AIAvatar() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Flame size={12} color="var(--text-primary)" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <User size={13} color="var(--text-muted)" />
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '2px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: 'bounce 0.8s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function ImageGenPlaceholder() {
  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <div style={{
        position: 'relative',
        borderRadius: 14,
        padding: 2,
        background: 'linear-gradient(135deg, rgba(var(--accent-rgb),0.5), rgba(var(--accent-rgb),0.15), rgba(var(--accent-rgb),0.5))',
        backgroundSize: '200% 200%',
        animation: 'gradient-shift 3s ease infinite',
      }}>
        <div style={{
          borderRadius: 12,
          background: 'var(--bg-tertiary)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', minHeight: 100 }}>
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
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(var(--accent-rgb),0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>Generating image...</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Gemini 2.5 Flash is rendering</div>
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
    if (m[1] !== undefined) {
      const viewId = m[1].toLowerCase();
      if (NAV_VIEWS[viewId]) parts.push({ type: 'nav', viewId, label: NAV_VIEWS[viewId] });
    } else if (m[2] !== undefined) {
      parts.push({ type: 'tab', tabName: m[2] });
    } else if (m[3] !== undefined) {
      parts.push({ type: 'set', key: m[3], value: m[4] });
    } else if (m[5] !== undefined) {
      parts.push({ type: 'preset', name: m[5] });
    } else if (m[0] === '[clear-chat]') {
      parts.push({ type: 'clear-chat' });
    } else if (m[0] === '[search-scripts]') {
      parts.push({ type: 'search-scripts' });
    } else if (m[6] !== undefined) {
      parts.push({ type: 'scan', tabName: m[6] });
    } else if (m[0] === '[rejoin]') {
      parts.push({ type: 'roblox-action', action: 'rejoin' });
    } else if (m[0] === '[close-roblox]') {
      parts.push({ type: 'roblox-action', action: 'close-roblox' });
    } else if (m[0] === '[restart-infernix]') {
      parts.push({ type: 'roblox-action', action: 'restart-infernix' });
    } else if (m[0] === '[close-infernix]') {
      parts.push({ type: 'roblox-action', action: 'close-infernix' });
    } else if (m[0] === '[attach]') {
      parts.push({ type: 'roblox-action', action: 'attach' });
    } else if (m[7] !== undefined) {
      parts.push({ type: 'autoexec', tabName: m[7] });
    } else if (m[8] !== undefined) {
      parts.push({ type: 'save-preset', name: m[8] });
    } else if (m[0] === '[open-website]') {
      parts.push({ type: 'open-website' });
    } else if (m[9] !== undefined) {
      parts.push({ type: 'execute', tabName: m[9] });
    } else if (m[0] === '[execute-all]') {
      parts.push({ type: 'execute-all' });
    } else if (m[0] === '[new-tab]') {
      parts.push({ type: 'new-tab' });
    } else if (m[10] !== undefined) {
      parts.push({ type: 'close-tab', tabName: m[10] });
    } else if (m[11] !== undefined) {
      parts.push({ type: 'duplicate-tab', tabName: m[11] });
    } else if (m[12] !== undefined) {
      parts.push({ type: 'save-script', tabName: m[12] });
    } else if (m[0] === '[clear-history]') {
      parts.push({ type: 'clear-history' });
    } else if (m[0] === '[refresh-clients]') {
      parts.push({ type: 'refresh-clients' });
    } else if (m[0] === '[open-discord]') {
      parts.push({ type: 'open-discord' });
    } else if (m[0] === '[open-autoexec-folder]') {
      parts.push({ type: 'open-autoexec-folder' });
    } else if (m[0] === '[open-workspace-folder]') {
      parts.push({ type: 'open-workspace-folder' });
    } else if (m[0] === '[open-scripts-folder]') {
      parts.push({ type: 'open-scripts-folder' });
    } else if (m[0] === '[reset-settings]') {
      parts.push({ type: 'reset-settings' });
    } else if (m[0] === '[check-updates]') {
      parts.push({ type: 'check-updates' });
    } else if (m[0] === '[start-tutorial]') {
      parts.push({ type: 'start-tutorial' });
    } else if (m[0] === '[show-chips]') {
      parts.push({ type: 'show-chips' });
    }
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: 'text', value: content.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: content }];
}

// Script search results inline in AI messages
function ScriptSearchResults({ placeId, gameName, onLoadScript, onExecuteScript }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const doFetch = async () => {
      try {
        const query = placeId
          ? { page: 1, max: 6, placeId, sortBy: 'views', order: 'desc' }
          : { page: 1, max: 6, sortBy: 'views', order: 'desc' };
        const data = await window.electronAPI?.scriptbloxFetch('script/fetch', query);
        const scripts = data?.result?.scripts || data?.scripts || [];
        setResults(scripts);
      } catch {
        setError('Failed to load scripts');
      }
    };
    doFetch();
  }, [placeId]);

  if (error) return <div style={{ color: '#f87171', fontSize: 11, marginTop: 6 }}>{error}</div>;
  if (!results) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
      <Search size={11} />
      Searching scripts...
    </div>
  );
  if (results.length === 0) return <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>No scripts found for this game.</div>;

  return (
    <div style={{ marginTop: 8 }}>
      {gameName && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>Scripts for: <strong style={{ color: 'var(--text-secondary)' }}>{gameName}</strong></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {results.map((script, i) => (
          <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.3 }}>
              {script.title || script.name || 'Untitled'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 7 }}>
              {script.views ? `${Number(script.views).toLocaleString()} views` : ''}
              {script.game?.name ? ` • ${script.game.name}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={() => onLoadScript?.(script.script || '')}
                disabled={!script.script}
                style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: 'var(--bg-hover)', border: '1px solid var(--border)', fontSize: 11, color: script.script ? 'var(--text-secondary)' : 'var(--text-muted)', cursor: script.script ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'background 0.15s' }}
                onMouseEnter={e => script.script && (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              >Load</button>
              <button
                onClick={() => onExecuteScript?.(script.script || '')}
                disabled={!script.script}
                style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.2)', fontSize: 11, color: script.script ? 'var(--text-primary)' : 'var(--text-muted)', cursor: script.script ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'background 0.15s' }}
                onMouseEnter={e => script.script && (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.1)')}
              ><Zap size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />Execute</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Shared chip button style for inline action buttons
function chipStyle(bg, bgHover, color = 'var(--text-secondary)') {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    margin: '4px 2px', padding: '4px 10px',
    background: bg, border: `1px solid ${bgHover}`,
    borderRadius: 20, fontSize: 11, color, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'background 0.15s',
  };
}

function MsgBubble({ msg, onCopyToEditor, onNavigate, onNavigateToTab, onApplySettings, onClearChat, currentGame, onScanTab, onRobloxAction, onLoadScript, onExecuteScript, onAddToAutoExec, onSavePreset, onExecuteTab, onExecuteAll, onNewTab, onCloseTabByName, onDuplicateTab, onSaveScript, onStartTutorial, aiProvider }) {
  const isUser = msg.role === 'user';
  const isEmpty = !msg.content && msg.streaming;

  const mdComponents = useMemo(() => ({
    p: ({ children, ...props }) => <p style={{ margin: '0 0 6px', lineHeight: 1.55 }} {...props}>{children}</p>,
    ul: ({ children, ...props }) => <ul style={{ paddingLeft: 16, marginBottom: 6 }} {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol style={{ paddingLeft: 16, marginBottom: 6 }} {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li style={{ lineHeight: 1.5 }} {...props}>{children}</li>,
    strong: ({ children, ...props }) => <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }} {...props}>{children}</strong>,
    em: ({ children, ...props }) => <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }} {...props}>{children}</em>,
    pre: ({ children }) => <>{children}</>,
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && (match || String(children).includes('\n'))) {
        return <CodeBlock language={match?.[1]} onCopyToEditor={onCopyToEditor}>{children}</CodeBlock>;
      }
      return <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-primary)' }} {...props}>{children}</code>;
    },
    h1: ({ children, ...props }) => <h1 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, marginBottom: 4 }} {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, marginBottom: 4 }} {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12, marginBottom: 4 }} {...props}>{children}</h3>,
    a: ({ children, href, ...props }) => <a href={href} style={{ textDecoration: 'underline', color: 'var(--text-secondary)' }} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>,
  }), [onCopyToEditor]);

  // Render AI message: split nav tags out and show nav buttons inline
  const renderAIContent = useCallback(() => {
    if (isEmpty) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TypingDots />
          {aiProvider === 'kimi' && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Thinking…</span>}
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
    const hasOnlyNavs = segments.every(s => s.type === 'nav' || (s.type === 'text' && s.value.trim() === ''));
    return (
      <>
        {segments.map((seg, i) => {
          if (seg.type === 'nav') {
            return (
              <button
                key={i}
                onClick={() => onNavigate?.(seg.viewId)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  margin: '4px 2px', padding: '4px 10px',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                  borderRadius: 20, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                <ArrowRight size={10} />
                Go to {seg.label}
              </button>
            );
          }
          if (seg.type === 'tab') {
            return (
              <button key={i} onClick={() => onNavigateToTab?.(seg.tabName)} style={chipStyle('var(--bg-tertiary)', 'var(--bg-hover)')}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background='var(--bg-tertiary)'}>
                <ArrowRight size={10} /> Switch to "{seg.tabName}"
              </button>
            );
          }
          if (seg.type === 'set') {
            const label = `${seg.key} → ${seg.value}`;
            return (
              <button key={i} onClick={() => onApplySettings?.({ [seg.key]: seg.value === 'true' ? true : seg.value === 'false' ? false : seg.value })} style={chipStyle('rgba(var(--accent-rgb),0.12)', 'rgba(var(--accent-rgb),0.22)')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(var(--accent-rgb),0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(var(--accent-rgb),0.12)'}>
                <Settings size={10} /> {label}
              </button>
            );
          }
          if (seg.type === 'preset') {
            return (
              <button key={i} onClick={() => onApplySettings?.({ __preset: seg.name })} style={chipStyle('rgba(var(--accent-rgb),0.12)', 'rgba(var(--accent-rgb),0.22)')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(var(--accent-rgb),0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(var(--accent-rgb),0.12)'}>
                <Palette size={10} /> Preset: {seg.name}
              </button>
            );
          }
          if (seg.type === 'clear-chat') {
            return (
              <button key={i} onClick={() => onClearChat?.()} style={chipStyle('rgba(255,80,80,0.12)', 'rgba(255,80,80,0.22)', '#ff8080')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,80,80,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,80,80,0.12)'}>
                <Trash2 size={10} /> Clear chat
              </button>
            );
          }
          if (seg.type === 'search-scripts') {
            return (
              <ScriptSearchResults
                key={i}
                placeId={currentGame?.placeId}
                gameName={currentGame?.name}
                onLoadScript={onLoadScript}
                onExecuteScript={onExecuteScript}
              />
            );
          }
          if (seg.type === 'scan') {
            return (
              <button key={i} onClick={() => onScanTab?.(seg.tabName)}
                style={chipStyle('rgba(250,204,21,0.12)', 'rgba(250,204,21,0.22)', '#fbbf24')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(250,204,21,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(250,204,21,0.12)'}>
                <Shield size={10} /> Scan &quot;{seg.tabName}&quot;
              </button>
            );
          }
          if (seg.type === 'autoexec') {
            return (
              <button key={i} onClick={() => onAddToAutoExec?.(seg.tabName)}
                style={chipStyle('rgba(139,92,246,0.12)', 'rgba(139,92,246,0.25)', '#a78bfa')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(139,92,246,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(139,92,246,0.12)'}>
                <Play size={10} /> Add to Auto Execute: {seg.tabName}
              </button>
            );
          }
          if (seg.type === 'save-preset') {
            return (
              <button key={i} onClick={() => onSavePreset?.(seg.name)}
                style={chipStyle('rgba(59,130,246,0.12)', 'rgba(59,130,246,0.25)', '#60a5fa')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(59,130,246,0.12)'}>
                <BookmarkPlus size={10} /> Save Preset: {seg.name}
              </button>
            );
          }
          if (seg.type === 'open-website') {
            return (
              <button key={i} onClick={() => window.electronAPI?.openExternal?.('https://infernix.vercel.app')}
                style={chipStyle('rgba(99,102,241,0.12)', 'rgba(99,102,241,0.25)', '#818cf8')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.12)'}>
                <Link size={10} /> Open Infernix Website
              </button>
            );
          }
          if (seg.type === 'open-discord') {
            return (
              <button key={i} onClick={() => window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb')}
                style={chipStyle('rgba(88,101,242,0.12)', 'rgba(88,101,242,0.28)', '#7289da')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(88,101,242,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(88,101,242,0.12)'}>
                <MessageSquare size={10} /> Open Discord Server
              </button>
            );
          }
          if (seg.type === 'execute') {
            return (
              <button key={i} onClick={() => onExecuteTab?.(seg.tabName)}
                style={chipStyle('rgba(251,146,60,0.12)', 'rgba(251,146,60,0.28)', '#fb923c')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(251,146,60,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(251,146,60,0.12)'}>
                <Terminal size={10} /> Execute: {seg.tabName}
              </button>
            );
          }
          if (seg.type === 'execute-all') {
            return (
              <button key={i} onClick={() => onExecuteAll?.()}
                style={chipStyle('rgba(251,146,60,0.15)', 'rgba(251,146,60,0.32)', '#f97316')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(251,146,60,0.28)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(251,146,60,0.15)'}>
                <Zap size={10} /> Execute All Tabs
              </button>
            );
          }
          if (seg.type === 'new-tab') {
            return (
              <button key={i} onClick={() => onNewTab?.()}
                style={chipStyle('rgba(52,211,153,0.12)', 'rgba(52,211,153,0.28)', '#34d399')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.12)'}>
                <Plus size={10} /> New Script Tab
              </button>
            );
          }
          if (seg.type === 'close-tab') {
            return (
              <button key={i} onClick={() => onCloseTabByName?.(seg.tabName)}
                style={chipStyle('rgba(248,113,113,0.12)', 'rgba(248,113,113,0.28)', '#f87171')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(248,113,113,0.12)'}>
                <XCircle size={10} /> Close Tab: {seg.tabName}
              </button>
            );
          }
          if (seg.type === 'duplicate-tab') {
            return (
              <button key={i} onClick={() => onDuplicateTab?.(seg.tabName)}
                style={chipStyle('rgba(96,165,250,0.12)', 'rgba(96,165,250,0.28)', '#60a5fa')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(96,165,250,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(96,165,250,0.12)'}>
                <Copy size={10} /> Duplicate: {seg.tabName}
              </button>
            );
          }
          if (seg.type === 'save-script') {
            return (
              <button key={i} onClick={() => onSaveScript?.(seg.tabName)}
                style={chipStyle('rgba(45,212,191,0.12)', 'rgba(45,212,191,0.28)', '#2dd4bf')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(45,212,191,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(45,212,191,0.12)'}>
                <Save size={10} /> Save Script: {seg.tabName}
              </button>
            );
          }
          if (seg.type === 'clear-history') {
            return (
              <button key={i} onClick={() => window.electronAPI?.clearExecutionHistory?.()}
                style={chipStyle('rgba(248,113,113,0.12)', 'rgba(248,113,113,0.28)', '#f87171')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(248,113,113,0.12)'}>
                <Trash2 size={10} /> Clear History
              </button>
            );
          }
          if (seg.type === 'refresh-clients') {
            return (
              <button key={i} onClick={() => window.electronAPI?.refreshClients?.()}
                style={chipStyle('rgba(52,211,153,0.12)', 'rgba(52,211,153,0.28)', '#34d399')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.12)'}>
                <RefreshCw size={10} /> Refresh Clients
              </button>
            );
          }
          if (seg.type === 'open-autoexec-folder') {
            return (
              <button key={i} onClick={() => window.electronAPI?.openAutoexecDir?.()}
                style={chipStyle('rgba(167,139,250,0.12)', 'rgba(167,139,250,0.28)', '#a78bfa')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.12)'}>
                <FolderOpen size={10} /> Open AutoExec Folder
              </button>
            );
          }
          if (seg.type === 'open-workspace-folder') {
            return (
              <button key={i} onClick={() => window.electronAPI?.openWorkspaceDir?.()}
                style={chipStyle('rgba(167,139,250,0.12)', 'rgba(167,139,250,0.28)', '#a78bfa')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.12)'}>
                <FolderOpen size={10} /> Open Workspace Folder
              </button>
            );
          }
          if (seg.type === 'open-scripts-folder') {
            return (
              <button key={i} onClick={() => window.electronAPI?.openScriptsDir?.()}
                style={chipStyle('rgba(167,139,250,0.12)', 'rgba(167,139,250,0.28)', '#a78bfa')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.12)'}>
                <FolderOpen size={10} /> Open Scripts Folder
              </button>
            );
          }
          if (seg.type === 'reset-settings') {
            return (
              <button key={i} onClick={() => window.electronAPI?.resetSettings?.()}
                style={chipStyle('rgba(251,146,60,0.12)', 'rgba(251,146,60,0.28)', '#fb923c')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(251,146,60,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(251,146,60,0.12)'}>
                <RotateCcw size={10} /> Reset All Settings
              </button>
            );
          }
          if (seg.type === 'check-updates') {
            return (
              <button key={i} onClick={() => window.electronAPI?.checkUpdates?.()}
                style={chipStyle('rgba(45,212,191,0.12)', 'rgba(45,212,191,0.28)', '#2dd4bf')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(45,212,191,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(45,212,191,0.12)'}>
                <Download size={10} /> Check for Updates
              </button>
            );
          }
          if (seg.type === 'start-tutorial') {
            return (
              <button key={i} onClick={() => onStartTutorial?.()}
                style={chipStyle('rgba(167,139,250,0.12)', 'rgba(167,139,250,0.28)', '#a78bfa')}
                onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.12)'}>
                <BookOpen size={10} /> Start Tutorial
              </button>
            );
          }
          if (seg.type === 'show-chips') {
            const G = ({ label, children }) => (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{children}</div>
              </div>
            );
            const Chip = ({ color, bg, icon: Icon, label, onClick }) => (
              <button onClick={onClick}
                style={{ ...chipStyle(bg, bg), color, border: `1px solid ${color}22`, fontSize: 11 }}
                onMouseEnter={e => { e.currentTarget.style.background = color + '22'; e.currentTarget.style.borderColor = color + '55'; }}
                onMouseLeave={e => { e.currentTarget.style.background = bg; e.currentTarget.style.borderColor = color + '22'; }}>
                <Icon size={10} /> {label}
              </button>
            );
            return (
              <div key={i} style={{ marginTop: 6, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <G label="Navigate">
                  <Chip color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Dashboard" onClick={() => onNavigate?.('dashboard')} />
                  <Chip color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Executor" onClick={() => onNavigate?.('executor')} />
                  <Chip color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Script Hub" onClick={() => onNavigate?.('scripthub')} />
                  <Chip color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Clients" onClick={() => onNavigate?.('clients')} />
                  <Chip color="#818cf8" bg="rgba(99,102,241,0.10)" icon={ArrowRight} label="Settings" onClick={() => onNavigate?.('settings')} />
                </G>
                <G label="Roblox">
                  <Chip color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={Link} label="Attach" onClick={() => onRobloxAction?.('attach')} />
                  <Chip color="#34d399" bg="rgba(52,211,153,0.10)" icon={RefreshCw} label="Rejoin" onClick={() => onRobloxAction?.('rejoin')} />
                  <Chip color="#f87171" bg="rgba(248,113,113,0.10)" icon={XCircle} label="Close Roblox" onClick={() => onRobloxAction?.('close-roblox')} />
                  <Chip color="#34d399" bg="rgba(52,211,153,0.10)" icon={RefreshCw} label="Refresh Clients" onClick={() => window.electronAPI?.refreshClients?.()} />
                </G>
                <G label="Links">
                  <Chip color="#818cf8" bg="rgba(99,102,241,0.10)" icon={Link} label="Infernix Website" onClick={() => window.electronAPI?.openExternal?.('https://infernix.vercel.app')} />
                  <Chip color="#7289da" bg="rgba(88,101,242,0.10)" icon={MessageSquare} label="Discord" onClick={() => window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb')} />
                </G>
                <G label="Folders">
                  <Chip color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={FolderOpen} label="AutoExec" onClick={() => window.electronAPI?.openAutoexecDir?.()} />
                  <Chip color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={FolderOpen} label="Workspace" onClick={() => window.electronAPI?.openWorkspaceDir?.()} />
                  <Chip color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={FolderOpen} label="Scripts" onClick={() => window.electronAPI?.openScriptsDir?.()} />
                </G>
                <G label="App">
                  <Chip color="#2dd4bf" bg="rgba(45,212,191,0.10)" icon={Download} label="Check Updates" onClick={() => window.electronAPI?.checkUpdates?.()} />
                  <Chip color="#60a5fa" bg="rgba(96,165,250,0.10)" icon={RotateCcw} label="Restart Infernix" onClick={() => onRobloxAction?.('restart-infernix')} />
                  <Chip color="#a78bfa" bg="rgba(167,139,250,0.10)" icon={BookOpen} label="Start Tutorial" onClick={() => onStartTutorial?.()} />
                  <Chip color="#f87171" bg="rgba(248,113,113,0.10)" icon={Trash2} label="Clear History" onClick={() => window.electronAPI?.clearExecutionHistory?.()} />
                  <Chip color="#f87171" bg="rgba(248,113,113,0.10)" icon={XCircle} label="Close Infernix" onClick={() => onRobloxAction?.('close-infernix')} />
                </G>
              </div>
            );
          }
          if (seg.type === 'roblox-action') {
            const actionMeta = {
              rejoin: { label: 'Rejoin Server', icon: RefreshCw, color: '#34d399', bg: 'rgba(52,211,153,0.12)', bgHover: 'rgba(52,211,153,0.22)' },
              'close-roblox': { label: 'Close Roblox', icon: XCircle, color: '#f87171', bg: 'rgba(248,113,113,0.12)', bgHover: 'rgba(248,113,113,0.22)' },
              'restart-infernix': { label: 'Restart Infernix', icon: RotateCcw, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', bgHover: 'rgba(96,165,250,0.22)' },
              'close-infernix': { label: 'Close Infernix', icon: XCircle, color: '#f87171', bg: 'rgba(248,113,113,0.12)', bgHover: 'rgba(248,113,113,0.22)' },
              attach: { label: 'Attach to Roblox', icon: Link, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', bgHover: 'rgba(167,139,250,0.22)' },
            };
            const meta = actionMeta[seg.action] || { label: seg.action, icon: Zap, color: '#fff', bg: 'rgba(255,255,255,0.1)', bgHover: 'rgba(255,255,255,0.18)' };
            const Icon = meta.icon;
            return (
              <button key={i} onClick={() => onRobloxAction?.(seg.action)}
                style={chipStyle(meta.bg, meta.bgHover, meta.color)}
                onMouseEnter={e => e.currentTarget.style.background=meta.bgHover}
                onMouseLeave={e => e.currentTarget.style.background=meta.bg}>
                <Icon size={10} /> {meta.label}
              </button>
            );
          }
          return <ReactMarkdown key={i} components={mdComponents}>{seg.value}</ReactMarkdown>;
        })}
      </>
    );
  }, [msg.content, msg.streaming, isEmpty, mdComponents, onNavigate, onNavigateToTab, onApplySettings, onClearChat, onExecuteTab, onExecuteAll, onNewTab, onCloseTabByName, onDuplicateTab, onSaveScript]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: isUser ? 'flex-end' : 'flex-start' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isUser ? 'row-reverse' : 'row' }}>
        {isUser ? <UserAvatar /> : <AIAvatar />}
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{isUser ? 'You' : 'Infernix AI'}</span>
        {msg.timestamp && (
          <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6 }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className={isUser ? 'asb-msg-user' : 'asb-msg-ai'} style={{
        maxWidth: '92%',
        padding: '10px 12px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        fontSize: 13,
        lineHeight: 1.55,
        userSelect: 'text',
        cursor: 'default',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
        minWidth: 0,
      }}>
        {isUser ? (
          <>
            {msg.content || ''}
            {msg.images && msg.images.map((img, i) => (
              <img key={i} src={`data:${img.mimeType};base64,${img.data}`} alt="Uploaded" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, border: '1px solid var(--border)', marginTop: 6 }} />
            ))}
          </>
        ) : (
        <>
          {msg.reasoning_content && (
            <details open={msg.streaming} style={{ marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <summary style={{ cursor: 'pointer', fontStyle: 'italic', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={10} style={{ color: 'var(--accent)' }} />
                {msg.streaming ? 'Thinking…' : "Kimi's reasoning"}
              </summary>
              <div style={{ marginTop: 4, padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--border)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {msg.reasoning_content}
              </div>
            </details>
          )}
          {msg.streaming && msg.provider === 'gemini' && !msg.content && <ImageGenPlaceholder />}
          {renderAIContent()}
          {msg.images && msg.images.map((img, i) => (
            <img key={i} src={`data:${img.mimeType};base64,${img.data}`} alt="Generated" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 10, border: '1px solid var(--border)', marginTop: 8 }} />
          ))}
        </>
      )}
      </div>
    </motion.div>
  );
}

export default function AssistantSidebar({ tabs, clients = [], onWriteToTab, onSwitchToExecutor, onNavigate, onNavigateToTab, onApplySettings, onNotify, onScanTab, onRobloxAction, onLoadScript, scanFeedback, onAddToAutoExec, onSavePreset, onExecuteTab, onExecuteAll, onNewTab, onCloseTabByName, onDuplicateTab, onSaveScript, onStartTutorial, stats, onRecordAI, isPremium }) {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [aiProvider, setAiProvider] = useState(() => {
    try { return localStorage.getItem('infernix-ai-provider') || (isPremium ? 'kimi' : 'gemini'); } catch { return isPremium ? 'kimi' : 'gemini'; }
  });
  const [aiModel, setAiModel] = useState(() => {
    try { return localStorage.getItem('infernix-ai-model') || (isPremium ? 'kimi-k2-6' : 'gemini-2.5-flash'); } catch { return isPremium ? 'kimi-k2-6' : 'gemini-2.5-flash'; }
  });
  const msgIdRef = useRef(Date.now());
  const bottomRef = useRef(null);
  const textRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('infernix-ai-provider', aiProvider);
    localStorage.setItem('infernix-ai-model', aiModel);
  }, [aiProvider, aiModel]);
  // Game detection
  const currentGameRef = useRef(null);
  const gameInfoCache = useRef(new Map());
  useEffect(() => {
    const parseClient = (c) => Array.isArray(c) ? { placeId: c[5] } : { placeId: c.placeId || c.PlaceId || c.place_id };
    const withGame = (clients || []).map(parseClient).filter(c => c.placeId && Number(c.placeId) > 0);
    if (withGame.length === 0) { currentGameRef.current = null; return; }
    const placeId = String(withGame[0].placeId);
    if (gameInfoCache.current.has(placeId)) { currentGameRef.current = gameInfoCache.current.get(placeId); return; }
    window.electronAPI?.robloxGetGameInfo?.(placeId).then(info => {
      if (info) {
        const entry = { placeId, name: info.name || info.Name || 'Unknown Game', creator: info.creator || '' };
        gameInfoCache.current.set(placeId, entry);
        currentGameRef.current = entry;
      }
    }).catch(() => {});
  }, [clients]);

  // Persist messages
  useEffect(() => {
    try {
      const toStore = messages.slice(-40).map(m => {
        const { images, ...rest } = m;
        return rest;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {}
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearChat = useCallback(() => {
    setClearing(true);
    setTimeout(() => {
      setMessages([]);
      setClearing(false);
      localStorage.removeItem(STORAGE_KEY);
    }, 400);
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

  // Receive scan results and queue them for AI to explain
  const [pendingScan, setPendingScan] = useState(null);
  const lastScanTs = useRef(null);
  useEffect(() => {
    if (!scanFeedback || !scanFeedback.timestamp) return;
    if (lastScanTs.current === scanFeedback.timestamp) return;
    lastScanTs.current = scanFeedback.timestamp;
    const { tabName, status, detections = [], hasSuspiciousDomain, error } = scanFeedback;
    let msg = '';
    if (error) {
      msg = `The VirusTotal scan of my "${tabName}" script failed with error: ${error}. What should I do?`;
    } else if (status === 'safe') {
      msg = `The VirusTotal scan of my "${tabName}" script came back clean — 0 detections. Can you confirm it's safe?`;
    } else if (status === 'threat') {
      const dets = detections.slice(0, 8).map(d => d.result).join(', ');
      msg = `The VirusTotal scan of my "${tabName}" script detected threats! Detections: ${dets}${hasSuspiciousDomain ? '. It also contains a suspicious domain.' : ''}. What does this mean and what should I do?`;
    } else if (status === 'suspicious') {
      const dets = detections.slice(0, 8).map(d => d.result).join(', ');
      msg = `The VirusTotal scan of my "${tabName}" script has ${detections.length} suspicious detection(s): ${dets}. Can you explain what these mean?`;
    } else if (status === 'expected') {
      const dets = detections.slice(0, 5).map(d => d.result).join(', ');
      msg = `The VirusTotal scan of my "${tabName}" script flagged it as a game mod (expected). Detections: ${dets}. Is this normal?`;
    } else {
      msg = `The VirusTotal scan of my "${tabName}" script finished with status: ${status}. Can you explain what this means?`;
    }
    setPendingScan(msg);
  }, [scanFeedback]);

  const doSend = useCallback(async (overrideInput) => {
    const text = (overrideInput ?? input).trim();
    if ((!text && pendingImages.length === 0) || busy) return;
    setInput('');
    setBusy(true);

    const userMsg = { id: ++msgIdRef.current, role: 'user', content: text, images: pendingImages.length > 0 ? pendingImages.map(img => ({ mimeType: img.mimeType, data: img.data })) : undefined, timestamp: Date.now() };
    setPendingImages([]);
    const aiId = ++msgIdRef.current;
    const aiMsg = { id: aiId, role: 'assistant', content: '', streaming: true, timestamp: Date.now(), provider: aiProvider };

    setMessages(prev => [...prev, userMsg, aiMsg]);

    const history = [...messages, userMsg];
    const robloxOpen = clients && clients.length > 0;
    const isAttached = clients && clients.some(c => (Array.isArray(c) ? c[3] : c.status) === 3);
    const statusLine = `\n\nRoblox clients: ${robloxOpen ? `${clients.length} detected` : 'Not yet scanned (use [attach] to find Roblox)'}. Attachment: ${isAttached ? 'Attached.' : 'Not attached — use [attach] to attach.'}`;
    const gameCtx = currentGameRef.current
      ? `\nCurrent game: "${currentGameRef.current.name}" (PlaceId: ${currentGameRef.current.placeId}).`
      : '';
    // Include open tabs so the AI knows what scripts exist and can reference them correctly
    const tabsLine = tabs && tabs.length > 0
      ? `\n\nOpen script tabs (${tabs.length}):\n` + tabs.map(t => {
          const lines = (t.content || '').split('\n').length;
          const preview = (t.content || '').slice(0, 800);
          const truncated = (t.content || '').length > 800 ? `\n... (truncated, ${lines} lines total)` : '';
          return `--- Tab: "${t.name}" (${lines} lines) ---\n${preview}${truncated}`;
        }).join('\n\n')
      : '\n\nNo script tabs are currently open.';
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT + statusLine + gameCtx + tabsLine },
      ...history.slice(-10).map(m => {
        const out = { role: m.role, content: m.content };
        if (m.images && m.images.length > 0) out.images = m.images;
        return out;
      }),
    ];

    const aiT0 = performance.now();
    try {
      let data;
      if (window.electronAPI?.aiGenerate) {
        data = await window.electronAPI.aiGenerate(apiMessages, aiProvider, aiModel);
      } else {
        // Direct fetch fallback (browser dev mode)
        if (aiProvider === 'kimi') {
          const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer sk-kimi-Ooj7Zmy3x7ZVjQLrfsHyW158bOD01FvttAfYeLh7ygLC0Imate90IJiVgOylRegS', 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: aiModel, messages: apiMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role, content: m.content || '(image attached)' })), temperature: 0.7 }),
          });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) throw new Error('401: Premium AI key invalid');
            if (res.status === 429) throw new Error('429: Rate limited');
            throw new Error(`HTTP ${res.status}`);
          }
          const kimiJson = await res.json();
          if (kimiJson.error) throw new Error(kimiJson.error.message);
          const msg = kimiJson.choices?.[0]?.message || {};
          data = { choices: [{ message: { content: msg.content || '', reasoning_content: msg.reasoning_content || '' } }] };
        } else {
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
          if (geminiJson.error) throw new Error(geminiJson.error.message || 'API Error');
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
      }
      const choice = data.choices?.[0]?.message || {};
      const content = choice.content || 'Sorry, I could not generate a response.';
      const reasoning = choice.reasoning_content || '';
      const aiImages = choice.images || [];

      if (aiProvider === 'kimi' && window.electronAPI?.aiGenerate) {
        // Simulate live thinking + typing for Kimi backend path (production)
        const rLen = reasoning.length;
        const cLen = content.length;
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
            content: content.slice(0, cIdx),
            reasoning_content: reasoning.slice(0, rIdx),
            streaming: true,
          } : m));
          await new Promise(r => setTimeout(r, stepMs));
        }
      }

      const aiElapsed = Math.round(performance.now() - aiT0);
      onRecordAI?.(aiElapsed);
      setRateLimited(false);
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content, reasoning_content: reasoning, images: aiImages.length > 0 ? aiImages : undefined, streaming: false } : m
      ));
      // Auto-navigate: if AI included a [nav:x] tag, trigger it automatically
      const navMatch = content.match(/\[nav:(\w+)\]/);
      if (navMatch) {
        const viewId = navMatch[1].toLowerCase();
        if (NAV_VIEWS[viewId]) {
          setTimeout(() => onNavigate?.(viewId), 420);
        }
      }
      // Auto-switch tab
      const tabMatch = content.match(/\[tab:([^\]]+)\]/);
      if (tabMatch) setTimeout(() => onNavigateToTab?.(tabMatch[1]), 520);
      // Auto-apply settings tags
      const setMatches = [...content.matchAll(/\[set:([\w]+)=([^\]]+)\]/g)];
      const presetMatch = content.match(/\[preset:([^\]]+)\]/);
      const clearMatch = content.match(/\[clear-chat\]/);
      if (setMatches.length > 0 || presetMatch) {
        const patch = {};
        for (const sm of setMatches) patch[sm[1]] = sm[2] === 'true' ? true : sm[2] === 'false' ? false : sm[2];
        if (presetMatch) patch.__preset = presetMatch[1];
        setTimeout(() => onApplySettings?.(patch), 300);
      }
      if (clearMatch) setTimeout(() => {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
      }, 600);
      // Auto-trigger scan tags
      const scanMatches = [...content.matchAll(/\[scan:([^\]]+)\]/g)];
      for (const sm of scanMatches) {
        setTimeout(() => onScanTab?.(sm[1]), 400);
      }
      // Auto-trigger autoexec tags
      const autoexecMatches = [...content.matchAll(/\[autoexec:([^\]]+)\]/g)];
      for (const am of autoexecMatches) setTimeout(() => onAddToAutoExec?.(am[1]), 400);
      // Auto-trigger save-preset tags
      const savePresetMatches = [...content.matchAll(/\[save-preset:([^\]]+)\]/g)];
      for (const sm of savePresetMatches) setTimeout(() => onSavePreset?.(sm[1]), 400);
      // Auto-trigger roblox/app action tags
      const actionOrder = ['[attach]', '[rejoin]', '[close-roblox]', '[restart-infernix]', '[close-infernix]'];
      const actionMap = { '[attach]': 'attach', '[rejoin]': 'rejoin', '[close-roblox]': 'close-roblox', '[restart-infernix]': 'restart-infernix', '[close-infernix]': 'close-infernix' };
      let delay = 600;
      for (const tag of actionOrder) {
        if (content.includes(tag)) {
          const action = actionMap[tag];
          const d = delay;
          setTimeout(() => onRobloxAction?.(action), d);
          delay += 1500; // stagger consecutive actions
        }
      }
      // Auto-execute URL/folder openers
      if (content.includes('[open-website]')) window.electronAPI?.openExternal?.('https://infernix.vercel.app');
      if (content.includes('[open-discord]')) window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb');
      if (content.includes('[open-autoexec-folder]')) window.electronAPI?.openAutoexecDir?.();
      if (content.includes('[open-workspace-folder]')) window.electronAPI?.openWorkspaceDir?.();
      if (content.includes('[open-scripts-folder]')) window.electronAPI?.openScriptsDir?.();
      if (content.includes('[check-updates]')) setTimeout(() => window.electronAPI?.checkUpdates?.(), 200);
      if (content.includes('[refresh-clients]')) setTimeout(() => window.electronAPI?.refreshClients?.(), 200);
      if (content.includes('[start-tutorial]')) setTimeout(() => onStartTutorial?.(), 400);
      if (content.includes('[execute-all]')) setTimeout(() => onExecuteAll?.(), 500);
      if (content.includes('[new-tab]')) setTimeout(() => onNewTab?.(), 300);
      if (content.includes('[clear-history]')) setTimeout(() => window.electronAPI?.clearExecutionHistory?.(), 400);
      const executeAutoMatches = [...content.matchAll(/\[execute:([^\]]+)\]/g)];
      window.electronAPI?.logToMain?.('log', '[AssistantSidebar] execute matches:', executeAutoMatches.map(m => m[1]));
      for (const em of executeAutoMatches) setTimeout(() => {
        window.electronAPI?.logToMain?.('log', '[AssistantSidebar] Auto-executing tab:', em[1]);
        onExecuteTab?.(em[1]);
      }, 500);
      const dupTabAutoMatches = [...content.matchAll(/\[duplicate-tab:([^\]]+)\]/g)];
      for (const dm of dupTabAutoMatches) setTimeout(() => onDuplicateTab?.(dm[1]), 400);
      const saveScriptAutoMatches = [...content.matchAll(/\[save-script:([^\]]+)\]/g)];
      for (const sm of saveScriptAutoMatches) setTimeout(() => onSaveScript?.(sm[1]), 400);
    } catch (err) {
      const aiElapsed = Math.round(performance.now() - aiT0);
      onRecordAI?.(aiElapsed);
      const msg = err?.message || 'Unknown error';
      console.error('[AssistantSidebar] AI error:', msg);
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: 'Error: ' + msg, streaming: false } : m
      ));
    }

    setBusy(false);
  }, [messages, busy, input, pendingImages, clients, onNavigate, onNavigateToTab, onApplySettings, onScanTab, onRobloxAction, onAddToAutoExec, onSavePreset, onStartTutorial, onExecuteAll, onNewTab, onExecuteTab, onDuplicateTab, onSaveScript, onRecordAI]);

  // Fire pending scan message once AI is free
  useEffect(() => {
    if (!pendingScan || busy) return;
    const msg = pendingScan;
    setPendingScan(null);
    setTimeout(() => doSend(msg), 200);
  }, [pendingScan, busy, doSend]);

  const handleCopyToEditor = useCallback((code) => {
    const targetTab = tabs?.[tabs.length - 1];
    if (!targetTab) return;
    onWriteToTab?.(targetTab.id, code);
    onSwitchToExecutor?.(targetTab.id);
    onNotify?.({ type: 'success', title: 'Code Sent', message: 'Script copied to editor' });
  }, [tabs, onWriteToTab, onSwitchToExecutor, onNotify]);

  const handleLoadFromSearch = useCallback((content) => {
    if (!content) { onNotify?.({ type: 'error', title: 'No Script', message: 'Script content unavailable' }); return; }
    onLoadScript?.(content);
  }, [onLoadScript, onNotify]);

  const handleExecuteFromSearch = useCallback(async (content) => {
    if (!content) { onNotify?.({ type: 'error', title: 'No Script', message: 'Script content unavailable' }); return; }
    const attached = (clients || []).filter(c => (Array.isArray(c) ? c[3] : c.status) === 3);
    if (attached.length === 0) { onNotify?.({ type: 'error', title: 'Not Attached', message: 'No Roblox clients attached' }); return; }
    const pids = attached.map(c => Array.isArray(c) ? c[0] : c.pid);
    await window.electronAPI?.execute?.(content, pids, 'AI Script');
    onNotify?.({ type: 'success', title: 'Executed', message: 'Script executed' });
  }, [clients, onNotify]);

  return (
    <div className="asb-root">
      {/* Header */}
      <div className="asb-header">
        <div className="asb-avatar-wrap">
          <div className="asb-avatar">
            <Flame size={16} color="var(--text-primary)" />
          </div>
          <span className="asb-avatar-dot" />
        </div>
        <div className="asb-header-info">
          <div className="asb-header-name">Infernix AI</div>
          <div className={`asb-header-sub${rateLimited ? ' rate-limited' : ''}`}>
            {rateLimited ? 'Rate Limited — please wait' : 'Ask me anything'}
          </div>
          {stats && stats.ai.requests > 0 && (
            <div className="asb-header-stats">
              <span className="asb-header-stat" title="Average AI response time">
                <span className="asb-header-stat-val">{formatMs(avgAIResponseTime(stats))}</span>
                <span className="asb-header-stat-label">avg</span>
              </span>
              <span className="asb-header-stat-divider" />
              <span className="asb-header-stat" title="Total AI requests">
                <span className="asb-header-stat-val">{stats.ai.requests}</span>
                <span className="asb-header-stat-label">reqs</span>
              </span>
              {stats.ai.lastTime > 0 && (
                <>
                  <span className="asb-header-stat-divider" />
                  <span className="asb-header-stat" title="Last response time">
                    <span className="asb-header-stat-val">{formatMs(stats.ai.lastTime)}</span>
                    <span className="asb-header-stat-label">last</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <button className="asb-clear-btn" onClick={clearChat} title="Clear chat">
          <RotateCcw size={13} style={clearing ? { animation: 'spin 0.5s linear' } : {}} />
        </button>
      </div>

      {/* Messages */}
      <div className="asb-messages-outer">
        <div className="asb-messages-inner">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="asb-empty"
            >
              <div className="asb-empty-icon">
                <Flame size={20} color="var(--text-muted)" />
              </div>
              <p className="asb-empty-text">
                Hi! I'm Infernix AI.<br />Ask me anything or pick a suggestion.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => doSend(s)} className="asb-suggestion">{s}</button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map(msg => (
            <MsgBubble key={msg.id} msg={msg}
              onCopyToEditor={handleCopyToEditor}
              onNavigate={onNavigate}
              onNavigateToTab={onNavigateToTab}
              onApplySettings={onApplySettings}
              onClearChat={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); }}
              currentGame={currentGameRef.current}
              onScanTab={onScanTab}
              onRobloxAction={onRobloxAction}
              onLoadScript={handleLoadFromSearch}
              onExecuteScript={handleExecuteFromSearch}
              onAddToAutoExec={onAddToAutoExec}
              onSavePreset={onSavePreset}
              onExecuteTab={onExecuteTab}
              onExecuteAll={onExecuteAll}
              onNewTab={onNewTab}
              onCloseTabByName={onCloseTabByName}
              onDuplicateTab={onDuplicateTab}
              onSaveScript={onSaveScript}
              onStartTutorial={onStartTutorial}
              aiProvider={aiProvider}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="asb-input-wrap">
        {pendingImages.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', padding: '0 4px' }}>
            {pendingImages.map((img, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', width: 56, height: 56 }}>
                <img src={img.preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => removePendingImage(i)}
                  style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                  <X size={8} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="asb-input-row">
          <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
            }}
            placeholder="Ask anything…"
            rows={1}
            disabled={busy}
            className="asb-textarea"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={() => fileInputRef.current?.click()} title="Attach image"
              disabled={busy || aiProvider === 'kimi'}
              style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: (busy || aiProvider === 'kimi') ? 'var(--border)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: (busy || aiProvider === 'kimi') ? 'default' : 'pointer', transition: 'color 0.15s', padding: 0 }}
              onMouseEnter={e => { if (!busy && aiProvider !== 'kimi') e.currentTarget.style.color='var(--text-primary)'; }}
              onMouseLeave={e => { if (!busy && aiProvider !== 'kimi') e.currentTarget.style.color='var(--text-muted)'; }}>
              <ImageIcon size={11} />
            </button>
            <ModelPicker
              provider={aiProvider}
              isPremium={isPremium}
              onChange={(prov, mod) => { setAiProvider(prov); setAiModel(mod); }}
            />
            <motion.button
              onClick={() => doSend()}
              disabled={(!input.trim() && pendingImages.length === 0) || busy}
              whileTap={{ scale: 0.9 }}
              className="asb-send-btn"
              style={{ cursor: ((!input.trim() && pendingImages.length === 0) || busy) ? 'default' : 'pointer', opacity: ((!input.trim() && pendingImages.length === 0) || busy) ? 0.2 : 1 }}
            >
              <Send size={11} />
            </motion.button>
          </div>
        </div>
        <p className="asb-send-hint">Shift + Enter for new line</p>
      </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)} } @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}