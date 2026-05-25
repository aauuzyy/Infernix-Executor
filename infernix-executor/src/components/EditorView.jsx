import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { Play, Trash2, Power, Save, FolderOpen, Plus, X, Check, Upload, FileCode, History, Copy, ExternalLink, Clock, ChevronDown, ChevronUp, Shield, ShieldCheck, ShieldAlert, AlertTriangle, Loader, Zap, Link2, ChevronRight, Scissors, Clipboard, Wand2, Users } from 'lucide-react';
import SaveScriptModal from './SaveScriptModal';
import OpenScriptModal from './OpenScriptModal';
import ScanModal from './ScanModal';
import AutoExecManager from './AutoExecManager';
import './EditorView.css';
import { avgExecutionTime, formatMs } from '../utils/stats';

// ============================================================
// Hook Function Templates
// ============================================================
const HOOK_TEMPLATES = [
  {
    id: 'hookfunction',
    label: 'hookfunction',
    description: 'Replace a function, run code before/after',
    code:
`-- hookfunction: replaces TargetFunction with your version
-- The original is saved so you can still call it
local old_TargetFunction
old_TargetFunction = hookfunction(TargetFunction, newcclosure(function(...)
    -- Your custom code here
    print("[Infernix] Function hooked!")
    return old_TargetFunction(...) -- call the original
end))
`,
  },
  {
    id: 'hookmetamethod-namecall',
    label: 'hookmetamethod (__namecall)',
    description: 'Intercept method calls (FireServer, InvokeServer, etc.)',
    code:
`-- hookmetamethod __namecall: intercepts all method calls on game instances
local old_NameCall
old_NameCall = hookmetamethod(game, "__namecall", newcclosure(function(self, ...)
    local method = getnamecallmethod()

    -- Example: silently block FireServer on a specific remote
    if method == "FireServer" and self.Name == "TargetRemote" then
        return nil -- block the call
    end

    -- Example: intercept InvokeServer
    if method == "InvokeServer" then
        print("[Infernix] InvokeServer called on:", self.Name)
    end

    return old_NameCall(self, ...) -- call the original
end))
`,
  },
  {
    id: 'hookmetamethod-index',
    label: 'hookmetamethod (__index)',
    description: 'Intercept and spoof property reads',
    code:
`-- hookmetamethod __index: intercepts property accesses on game instances
local old_Index
old_Index = hookmetamethod(game, "__index", newcclosure(function(self, key)
    -- Example: spoof a player's display name
    if key == "DisplayName" and self:IsA("Player") then
        return "SpoofedName"
    end

    return old_Index(self, key) -- read the real property
end))
`,
  },
];

// Helper to convert hex to HSL
function hexToHSL(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Helper to convert HSL to hex
function hslToHex(h, s, l) {
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Generate syntax highlighting colors from a base accent color
function generateSyntaxColors(accentHex, isDark = true) {
  const hsl = hexToHSL(accentHex);
  const { h, s } = hsl;
  
  // Generate a palette of colors based on the accent
  // We create variations by shifting hue and adjusting lightness
  const baseLightness = isDark ? 60 : 45;
  const brightLightness = isDark ? 70 : 55;
  const dimLightness = isDark ? 50 : 35;
  
  return {
    // Primary accent (for cursor, active line numbers, brackets)
    accent: accentHex,
    accentDim: hslToHex(h, s, dimLightness),
    accentBright: hslToHex(h, s, brightLightness),
    
    // Keywords - slightly shifted hue for variety
    keyword: hslToHex((h + 10) % 360, Math.min(s + 10, 100), baseLightness),
    keywordControl: hslToHex((h + 10) % 360, Math.min(s + 10, 100), dimLightness),
    
    // Strings - complementary shift
    string: hslToHex((h + 40) % 360, Math.min(s + 5, 100), brightLightness),
    stringEscape: hslToHex((h + 40) % 360, Math.min(s + 5, 100), Math.min(brightLightness + 10, 90)),
    
    // Numbers - opposite shift
    number: hslToHex((h + 180) % 360, Math.max(s - 10, 30), baseLightness),
    numberFloat: hslToHex((h + 180) % 360, Math.max(s - 10, 30), brightLightness),
    
    // Functions - triadic color
    function: hslToHex((h + 120) % 360, Math.min(s, 90), baseLightness),
    
    // Types - analogous color
    type: hslToHex((h + 30) % 360, Math.min(s, 85), baseLightness),
    typeIdentifier: hslToHex((h + 30) % 360, Math.min(s, 85), brightLightness),
    
    // Operators and constants
    operator: hslToHex(h, s, baseLightness),
    constant: hslToHex((h - 20 + 360) % 360, Math.min(s + 5, 100), dimLightness),
    constantLanguage: hslToHex((h - 20 + 360) % 360, Math.min(s + 5, 100), baseLightness),
    
    // Tags and attributes
    tag: hslToHex((h + 10) % 360, Math.min(s + 10, 100), baseLightness),
    attributeName: hslToHex((h + 60) % 360, s, baseLightness),
    attributeValue: hslToHex((h + 40) % 360, Math.min(s + 5, 100), brightLightness),
    
    // Predefined and global
    predefined: hslToHex((h + 120) % 360, Math.min(s, 90), brightLightness),
    global: hslToHex((h + 30) % 360, Math.min(s, 85), baseLightness),
    variablePredefined: hslToHex(h, s, baseLightness),
    
    // Selection and highlights (with alpha)
    selectionBg: accentHex + '44',
    wordHighlightBg: accentHex + '22',
    bracketMatchBg: accentHex + '33',
  };
}

function EditorView({ tabs, activeTab, onTabChange, onNewTab, onCloseTab, onRenameTab, onCodeChange, onUpdateTabScan, onNotify, clients = [], remoteWrite = null, remoteCursors = {}, collabTabId = null, onSendCursor = null, stats, onRecordExecution }) {
  const { themeMode, accentColor, customBackground } = useTheme();
  const monacoRef = useRef(null);
  const editorInstanceRef = useRef(null); // actual editor instance for cursor insertion
  
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const renameInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Tab bar horizontal scroll via wheel
  const tabsRef = useRef(null);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const handler = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 0.8, behavior: 'smooth' });
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Hook Function state
  const [showHookMenu, setShowHookMenu] = useState(false);
  const hookMenuRef = useRef(null);

  // AutoExec quick-access state
  const [showAutoExecModal, setShowAutoExecModal] = useState(false);
  
  // Execution History state
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);
  
  // Scan Modal state
  const [showScanModal, setShowScanModal] = useState(false);

  // Custom context menu state
  const [ctxMenu, setCtxMenu] = useState(null); // null | { x, y, hasSelection }
  const ctxMenuRef = useRef(null);

  // Typing animation state
  const isAnimatingRef = useRef(false);
  const animRafRef = useRef(null);
  const remoteAnimTimerRef = useRef(null);
  const remoteTargetContentRef = useRef('');
  const remoteEditRef = useRef(false);
  const remoteEditClearRef = useRef(null);
  const lastLocalTypeRef = useRef(0);
  const themeModeRef = useRef(themeMode);
  themeModeRef.current = themeMode;

  // Remote cursor absolute-positioned DOM elements
  const remoteCursorElsRef = useRef(new Map());
  // Track last pushed remoteWrite seq to avoid re-applying the same write
  const lastRemoteSeqRef = useRef(-1);

  // Close hook menu when clicking outside
  useEffect(() => {
    if (!showHookMenu) return;
    const handler = (e) => {
      if (hookMenuRef.current && !hookMenuRef.current.contains(e.target)) {
        setShowHookMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHookMenu]);

  // Close custom context menu on outside click or Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const onDown = (e) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target)) setCtxMenu(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setCtxMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  // Handle right-click on editor container — REPLACED by native listener in handleEditorMount

  // Execute selected text (or fall back to full script)
  const handleExecuteSelection = async () => {
    const editor = editorInstanceRef.current;
    const model = editor?.getModel();
    const sel = editor?.getSelection();
    const selectedText = sel && !sel.isEmpty() ? model?.getValueInRange(sel) : null;
    if (!selectedText?.trim()) return handleExecute();

    const attachedClients = clients.map(parseClient).filter(c => c.status === 3).map(c => c.pid);
    if (attachedClients.length === 0) {
      onNotify({ type: 'warning', title: 'No Clients', message: 'No attached Roblox clients found' });
      return;
    }
    const result = await executeScript(selectedText, attachedClients, `${activeScript?.name} (selection)`);
    refreshHistoryAfterExecution();
    if (result?.ok) {
      onNotify({ type: 'fire', title: 'Selection Executed', message: `Running on ${attachedClients.length} client(s)...` });
    } else {
      onNotify({ type: 'warning', title: 'Execution Warning', message: result?.error || 'May have failed' });
    }
  };

  // Insert text at cursor (or append if no editor instance)
  const insertAtCursor = (text) => {
    const editor = editorInstanceRef.current;
    if (!editor) {
      const current = activeScript?.content || '';
      onCodeChange(activeTab, current + '\n' + text);
      return;
    }
    const selection = editor.getSelection();
    editor.executeEdits('hook-insert', [{ range: selection, text, forceMoveMarkers: true }]);
    editor.focus();
  };

  const handleInsertHook = (template) => {
    insertAtCursor(template.code);
    setShowHookMenu(false);
  };

  const activeScript = tabs.find(t => t.id === activeTab);

  // Detection classification arrays for auto-scan
  const EXPECTED_DETECTIONS = ['hacktool', 'hack.tool', 'gamehack', 'game.hack', 'riskware', 'exploit', 'cheat', 'gamemod', 'tool.lua', 'not-a-virus'];
  const REAL_THREATS = ['trojan', 'stealer', 'keylogger', 'backdoor', 'ransomware', 'miner', 'worm', 'rootkit', 'spyware', 'banker', 'rat.', 'infostealer'];
  const SUSPICIOUS_DOMAINS = ['grabify.link', 'iplogger.org', 'blasze.tk', '2no.co', 'iplogger.com', 'iplogger.ru', 'yip.su', 'iplis.org', 'ipgrabber.ru', 'discord.com/api/webhooks'];

  // Auto-scan a script in the background and return status
  const performAutoScan = async (tabId, content) => {
    if (!onUpdateTabScan) return;

    onUpdateTabScan(tabId, 'scanning');

    try {
      // Quick local check for suspicious domains
      let hasSuspiciousDomain = false;
      for (const domain of SUSPICIOUS_DOMAINS) {
        if (content.toLowerCase().includes(domain)) {
          hasSuspiciousDomain = true;
          break;
        }
      }

      // VirusTotal scan
      const scriptName = tabs.find(t => t.id === tabId)?.name || 'script.lua';
      const vtResult = await window.electronAPI?.virusTotalScan?.(content, scriptName);

      if (!vtResult || vtResult.error) {
        onUpdateTabScan(tabId, 'unknown', { error: vtResult?.error || 'Scan failed' });
        return;
      }

      const detections = vtResult.detections || [];
      let hasRealThreat = false;
      let hasExpected = false;

      for (const det of detections) {
        const resultLower = det.result.toLowerCase();
        if (REAL_THREATS.some(threat => resultLower.includes(threat))) {
          hasRealThreat = true;
          break;
        }
        if (EXPECTED_DETECTIONS.some(expected => resultLower.includes(expected))) {
          hasExpected = true;
        }
      }

      if (hasRealThreat || hasSuspiciousDomain) {
        onUpdateTabScan(tabId, 'threat', { detections, hasSuspiciousDomain });
      } else if (hasExpected) {
        onUpdateTabScan(tabId, 'expected', { detections });
      } else if (detections.length > 0) {
        onUpdateTabScan(tabId, 'suspicious', { detections });
      } else {
        onUpdateTabScan(tabId, 'safe', { detections: [] });
      }
    } catch (err) {
      console.error('Auto-scan error:', err);
      onUpdateTabScan(tabId, 'unknown', { error: err.message });
    }
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    onCloseTab(tabId);
  };

  const handleCodeChange = (value) => {
    if (isAnimatingRef.current) return; // suppress onChange during local typing animation
    if (remoteEditRef.current) return;  // suppress echo from remote edits
    lastLocalTypeRef.current = Date.now();
    onCodeChange(activeTab, value || '');
  };

  // Execute script directly via HTTP (like Xeno does)
  const executeScript = async (script, targetClients, scriptName) => {
    // Primary: IPC execute — records history automatically inside main.obf.cjs
    try {
      const result = await window.electronAPI?.execute(script, targetClients, scriptName || 'Untitled');
      if (result?.ok) return result;
    } catch (_) {}

    // Fallback: HTTP POST directly to port 3110 (Xeno DLL HTTP server)
    // Then manually record via record-execution IPC (added in main-wrapper.cjs)
    try {
      const response = await fetch('http://localhost:3110/o', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'clients': JSON.stringify(targetClients)
        },
        body: script
      });

      if (response.ok) {
        try {
          await window.electronAPI?.recordExecution?.(scriptName || 'Untitled', script || '');
        } catch (_) {}
        return { ok: true };
      }
      return { ok: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  // Parse client helper - PIDs must be strings like Xeno does
  const parseClient = (client) => {
    if (Array.isArray(client)) {
      return {
        pid: String(client[0] ?? ''),
        username: client[1],
        playerName: client[2],
        status: client[3],
        version: client[4],
        placeId: client[5]
      };
    }
    return {
      ...client,
      pid: String(client.pid ?? '')
    };
  };

  const handleExecute = async () => {
    if (!activeScript?.content) {
      onNotify({
        type: 'error',
        title: 'No Script',
        message: 'Nothing to execute'
      });
      return;
    }
    
    try {
      // Get all clients with status attached (3)
      const attachedClients = clients
        .map(parseClient)
        .filter(c => c.status === 3)
        .map(c => c.pid);
      
      if (attachedClients.length === 0) {
        onNotify({
          type: 'warning',
          title: 'No Clients',
          message: 'No attached Roblox clients found'
        });
        return;
      }
      
      // Execute via direct HTTP (like Xeno)
      const t0 = performance.now();
      const result = await executeScript(activeScript.content, attachedClients, activeScript.name);
      const elapsed = Math.round(performance.now() - t0);
      onRecordExecution?.(elapsed);

      // Refresh history after execution
      refreshHistoryAfterExecution();
      
      if (result?.ok) {
        onNotify({
          type: 'fire',
          title: 'Script Executed',
          message: `Running on ${attachedClients.length} client(s)...`
        });
      } else {
        onNotify({
          type: 'warning',
          title: 'Execution Warning',
          message: result?.error || 'Execution may have failed'
        });
      }
    } catch (e) {
      onNotify({
        type: 'error',
        title: 'Execution Failed',
        message: e.message || 'Unknown error'
      });
    }
  };

  const handleClear = () => {
    onCodeChange(activeTab, '');
  };

  const handleSaveScript = async (name, description) => {
    if (!activeScript?.content) {
      onNotify({
        type: 'warning',
        title: 'Nothing to Save',
        message: 'Script is empty'
      });
      return;
    }
    
    try {
      const result = await window.electronAPI?.saveScript(name, description, activeScript.content);
      if (result?.ok) {
        onNotify({
          type: 'success',
          title: 'Script Saved',
          message: `"${name}" saved successfully`
        });
        // Update the tab name to match
        onRenameTab(activeTab, name);
      } else {
        throw new Error(result?.error || 'Failed to save');
      }
    } catch (e) {
      onNotify({
        type: 'error',
        title: 'Save Failed',
        message: e.message
      });
    }
  };

  const handleOpenScript = (name, content) => {
    // Create a new tab with the loaded script name and content
    onNewTab({ name, content });
    
    onNotify({
      type: 'success',
      title: 'Script Loaded',
      message: `"${name}" opened in new tab`
    });
  };

  const handleKillRoblox = async () => {
    try {
      const result = await window.electronAPI?.killRoblox();
      if (result?.killed) {
        onNotify({
          type: 'success',
          title: 'Roblox Killed',
          message: 'All Roblox processes terminated'
        });
      } else {
        onNotify({
          type: 'warning',
          title: 'Kill Roblox',
          message: 'No Roblox processes found'
        });
      }
    } catch (e) {
      onNotify({
        type: 'error',
        title: 'Kill Failed',
        message: e.message
      });
    }
  };

  const handleDoubleClick = (e, tab) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingName(tab.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const handleRenameSubmit = (tabId) => {
    if (editingName.trim()) {
      onRenameTab(tabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  const handleRenameKeyDown = (e, tabId) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };
  // Basic Lua linting - checks for common syntax issues
  const lintLuaCode = (code) => {
    const issues = [];
    const lines = code.split('\n');
    
    let openBlocks = 0;
    let openParens = 0;
    let openBrackets = 0;
    let openBraces = 0;
    
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      
      // Skip comments
      if (trimmed.startsWith('--')) return;
      
      // Count block openers/closers
      const blockOpeners = (trimmed.match(/\b(function|if|for|while|repeat|do)\b/g) || []).length;
      const blockClosers = (trimmed.match(/\bend\b/g) || []).length;
      const untilClosers = (trimmed.match(/\buntil\b/g) || []).length;
      
      openBlocks += blockOpeners - blockClosers - untilClosers;
      
      // Count brackets
      openParens += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      openBrackets += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      openBraces += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      
      // Check for common issues
      if (trimmed.match(/\bthen\s*$/)) {
        // Valid: if condition then
      }
      if (trimmed.match(/=\s*$/)) {
        issues.push({ line: lineNum, message: 'Incomplete assignment'});
      }
    });
    
    if (openBlocks > 0) {
      issues.push({ line: lines.length, message: `Missing ${openBlocks} 'end'statement(s)` });
    } else if (openBlocks < 0) {
      issues.push({ line: lines.length, message: `Extra 'end'statement(s)` });
    }
    
    if (openParens !== 0) {
      issues.push({ line: lines.length, message: `Unbalanced parentheses` });
    }
    if (openBrackets !== 0) {
      issues.push({ line: lines.length, message: `Unbalanced square brackets` });
    }
    if (openBraces !== 0) {
      issues.push({ line: lines.length, message: `Unbalanced curly braces` });
    }
    
    return issues;
  };

  // Handle file drop
  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(f => 
      f.name.endsWith('.lua') || f.name.endsWith('.txt') || f.name.endsWith('.luau')
    );
    
    if (validFiles.length === 0) {
      onNotify({
        type: 'warning',
        title: 'Invalid File',
        message: 'Please drop .lua, .luau, or .txt files'
      });
      return;
    }
    
    for (const file of validFiles) {
      try {
        const content = await file.text();
        const fileName = file.name.replace(/\.(lua|luau|txt)$/i, '');
        
        // Lint the code
        const issues = lintLuaCode(content);
        
        // Create new tab with the content and get the new tab ID
        const newTabId = onNewTab({ name: fileName, content });

        // Auto-scan the file for security threats
        if (newTabId && onUpdateTabScan) {
          performAutoScan(newTabId, content);
        }

        if (issues.length > 0) {
          onNotify({
            type: 'warning',
            title: 'Lint Warnings',
            message: `${issues.length} issue(s): ${issues[0].message}`
          });
        } else {
          onNotify({
            type: 'success',
            title: 'File Loaded',
            message: `"${file.name}" - Scanning for threats...`
          });
        }
      } catch (err) {
        onNotify({
          type: 'error',
          title: 'Read Error',
          message: `Failed to read ${file.name}`
        });
      }
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleEditorMount = (editor, monaco) => {
    monacoRef.current = monaco;
    editorInstanceRef.current = editor;

    // Define all syntax themes
    defineThemesWithAccent(monaco, accentColor, customBackground);

    // Start typing animation for initial load (uses real theme — colored from frame 1)
    animateTyping(activeScript?.content || '');

    // Native context menu on Monaco's DOM node — more accurate coordinates than React synthetic events
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sel = editor.getSelection();
        const hasSelection = sel && !sel.isEmpty();
        const MENU_W = 210, MENU_H = 290;
        const x = Math.min(e.clientX, window.innerWidth - MENU_W - 8);
        const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);
        setCtxMenu({ x, y, hasSelection: !!hasSelection });
      });
    }

    // Broadcast cursor position to collab partner
    editor.onDidChangeCursorPosition((e) => {
      onSendCursor?.(e.position.lineNumber, e.position.column);
    });

    // Explicit paste handler — ensures collab sync even if onChange debounces large inserts
    editor.onDidPaste((e) => {
      // Small delay to let Monaco finish applying the paste
      setTimeout(() => {
        const value = editor.getValue();
        onCodeChange(activeTab, value);
      }, 10);
    });
  };

  // Typing animation — types content with live syntax colors visible from frame 1
  const animateTyping = (content) => {
    const editor = editorInstanceRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    // Cancel any in-progress animation
    if (animRafRef.current) { cancelAnimationFrame(animRafRef.current); animRafRef.current = null; }
    if (remoteAnimTimerRef.current) { clearInterval(remoteAnimTimerRef.current); remoteAnimTimerRef.current = null; }

    isAnimatingRef.current = true;

    // Apply the real syntax theme FIRST so colored highlighting is live during animation
    const n = themeModeRef.current;
    monaco.editor.setTheme(n === 'light' ? 'infernix-light' : n === 'midnight' ? 'infernix-midnight' : 'infernix-dark');

    const model = editor.getModel();
    if (model) model.setValue('');
    editor.updateOptions({ readOnly: true });

    const finish = () => {
      isAnimatingRef.current = false;
      if (model) model.setValue(content || '');
      editor.updateOptions({ readOnly: false });
      animRafRef.current = null;
    };

    if (!content) { finish(); return; }

    const len = content.length;
    // Target ~120 rAF frames (~2s at 60fps). Short scripts type char-by-char,
    // long scripts batch enough chars-per-frame to still finish in ~2s.
    const charsPerFrame = Math.max(1, Math.ceil(len / 120));
    let pos = 0;

    const frame = () => {
      if (!isAnimatingRef.current) return;
      pos = Math.min(pos + charsPerFrame, len);
      if (model) {
        model.setValue(content.slice(0, pos));
        // Scroll to the last line so the user sees the animation play out
        editor.revealLine(model.getLineCount(), 1 /* Immediate */);
      }
      if (pos < len) { animRafRef.current = requestAnimationFrame(frame); }
      else { finish(); }
    };
    animRafRef.current = requestAnimationFrame(frame);
  };

  // Apply remote content instantly — no animation interval that clobbers typing
  const applyRemoteContentInstant = (nextContent) => {
    const editor = editorInstanceRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    if (model.getValue() === nextContent) return;

    remoteEditRef.current = true;
    if (remoteEditClearRef.current) {
      clearTimeout(remoteEditClearRef.current);
      remoteEditClearRef.current = null;
    }

    model.setValue(nextContent);

    remoteEditClearRef.current = setTimeout(() => {
      remoteEditRef.current = false;
      remoteEditClearRef.current = null;
    }, 30);
  };

  // Play typing animation whenever the active tab changes
  useEffect(() => {
    if (!editorInstanceRef.current || !monacoRef.current) return;
    const content = tabs.find(t => t.id === activeTab)?.content || '';
    const model = editorInstanceRef.current.getModel();
    // Skip animation if model already has correct content (prevents lock-up on collab tab switches)
    if (model && model.getValue() === content) return;
    // For collab tab: only populate if empty; never overwrite live edits on switch
    if (activeTab === collabTabId) {
      if (model && !model.getValue() && content) {
        remoteEditRef.current = true;
        model.setValue(content);
        remoteEditClearRef.current = setTimeout(() => { remoteEditRef.current = false; }, 30);
      }
      return;
    }
    animateTyping(content);
  }, [activeTab, collabTabId]); // eslint-disable-line

  // Remote collab: push content directly into Monaco model when partner edits
  useEffect(() => {
    if (!remoteWrite || remoteWrite.seq === lastRemoteSeqRef.current) return;
    if (remoteWrite.tabId !== activeTab) return;
    const editor = editorInstanceRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    // Don't clobber the user while they're actively typing
    if (Date.now() - lastLocalTypeRef.current < 600) {
      lastRemoteSeqRef.current = remoteWrite.seq;
      return;
    }

    lastRemoteSeqRef.current = remoteWrite.seq;
    if (model.getValue() !== remoteWrite.content) {
      applyRemoteContentInstant(remoteWrite.content);
    }
  }, [remoteWrite]); // eslint-disable-line

  // Remote collab: render partner cursors as absolutely-positioned DOM elements
  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (!editor) return;
    const container = editor.getDomNode();
    if (!container) return;

    const els = remoteCursorElsRef.current;

    // Remove all cursors if not on collab tab or no cursors
    if (activeTab !== collabTabId || !Object.keys(remoteCursors).length) {
      for (const [, el] of els) {
        el.remove();
      }
      els.clear();
      return;
    }

    // Position helper — converts model position to pixel coords inside editor
    const positionCursor = (el, lineNumber, column) => {
      try {
        const coords = editor.getScrolledVisiblePosition({ lineNumber, column });
        if (!coords) return;
        el.style.top = `${coords.top}px`;
        el.style.left = `${coords.left}px`;
      } catch { /* ignore positioning errors */ }
    };

    // Update / add cursor elements for each remote cursor
    for (const [userId, pos] of Object.entries(remoteCursors)) {
      let el = els.get(userId);
      if (!el) {
        el = document.createElement('div');
        el.className = 'remote-collab-cursor-el';
        el.innerHTML = `<div class="remote-collab-cursor-bar"></div><div class="remote-collab-cursor-label">Partner</div>`;
        const overflowGuard = container.querySelector('.overflow-guard');
        if (overflowGuard) overflowGuard.appendChild(el);
        else container.appendChild(el);
        els.set(userId, el);
      }
      positionCursor(el, pos.lineNumber, pos.column);
    }

    // Remove elements for cursors that no longer exist
    for (const [userId, el] of els) {
      if (!remoteCursors[userId]) {
        el.remove();
        els.delete(userId);
      }
    }

    // Reposition on scroll
    const onScroll = () => {
      for (const [userId, el] of els) {
        const pos = remoteCursors[userId];
        if (pos) positionCursor(el, pos.lineNumber, pos.column);
      }
    };
    const disposable = editor.onDidScrollChange(onScroll);
    return () => disposable.dispose();
  }, [remoteCursors, activeTab, collabTabId]); // eslint-disable-line

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      if (remoteAnimTimerRef.current) clearInterval(remoteAnimTimerRef.current);
      if (remoteEditClearRef.current) clearTimeout(remoteEditClearRef.current);
      // Clean up remote cursor elements
      for (const [, el] of remoteCursorElsRef.current) {
        el.remove();
      }
      remoteCursorElsRef.current.clear();
    };
  }, []);

  // Helper function to define themes with dynamic accent colors
  const defineThemesWithAccent = (monaco, accent, hasBg) => {
    const darkColors = generateSyntaxColors(accent, true);
    const lightColors = generateSyntaxColors(accent, false);

    // Remove # from hex colors for Monaco token rules
    const strip = (hex) => hex.replace('#', '');

    // Transparency for the main editor area is handled purely by CSS on the outer
    // Monaco containers. Keep real bg colors here so Monaco's text rendering pipeline
    // and minimap canvas layout stay intact. Do NOT set minimap.background to #00000000 —
    // Monaco uses the bg color in its canvas coordinate math; a fully-transparent value
    // breaks the minimap rendering (code appears tiny / mispositioned).
    const darkBg    = '#000000';
    const darkLine  = '#0d0d0d';
    const midBg     = '#0d1117';
    const midLine   = '#161b22';
    const forestBg  = '#0a120a';
    const forestLine= '#131f13';
    const lightBg   = '#fafaf9';
    const lightLine = '#f5f5f4';
    const overviewRulerBg = hasBg ? '#00000000' : undefined;

    // Dark theme (default)
    monaco.editor.defineTheme('infernix-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic'},
        { token: 'keyword', foreground: strip(darkColors.keyword), fontStyle: 'bold'},
        { token: 'keyword.control', foreground: strip(darkColors.keywordControl) },
        { token: 'string', foreground: strip(darkColors.string) },
        { token: 'string.escape', foreground: strip(darkColors.stringEscape) },
        { token: 'number', foreground: strip(darkColors.number) },
        { token: 'number.float', foreground: strip(darkColors.numberFloat) },
        { token: 'variable', foreground: 'e5e7eb'},
        { token: 'variable.predefined', foreground: strip(darkColors.variablePredefined) },
        { token: 'function', foreground: strip(darkColors.function) },
        { token: 'type', foreground: strip(darkColors.type) },
        { token: 'type.identifier', foreground: strip(darkColors.typeIdentifier) },
        { token: 'tag', foreground: strip(darkColors.tag) },
        { token: 'attribute.name', foreground: strip(darkColors.attributeName) },
        { token: 'attribute.value', foreground: strip(darkColors.attributeValue) },
        { token: 'delimiter', foreground: strip(darkColors.accentDim) },
        { token: 'delimiter.bracket', foreground: strip(darkColors.accent) },
        { token: 'operator', foreground: strip(darkColors.operator) },
        { token: 'constant', foreground: strip(darkColors.constant) },
        { token: 'constant.language', foreground: strip(darkColors.constantLanguage) },
        { token: 'global', foreground: strip(darkColors.global) },
        { token: 'identifier', foreground: 'e5e7eb'},
        { token: 'predefined', foreground: strip(darkColors.predefined) },
      ],
      colors: {
        'editor.background': darkBg,
        'editor.foreground': '#e5e7eb',
        'editor.lineHighlightBackground': darkLine,
        'editor.lineHighlightBorder': '#00000000',
        'editorGutter.background': darkBg,
        'minimap.background': '#000000',
        'minimapSlider.background': '#3a3a3a40',
        'minimapSlider.hoverBackground': '#3a3a3a60',
        'editor.selectionBackground': darkColors.selectionBg,
        'editorCursor.foreground': accent,
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': accent,
        'editor.wordHighlightBackground': darkColors.wordHighlightBg,
        'editorBracketMatch.background': darkColors.bracketMatchBg,
        'editorBracketMatch.border': accent,
        ...(overviewRulerBg && { 'editorOverviewRuler.background': overviewRulerBg }),
      },
    });

    // Light theme
    monaco.editor.defineTheme('infernix-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic'},
        { token: 'keyword', foreground: strip(lightColors.keyword), fontStyle: 'bold'},
        { token: 'keyword.control', foreground: strip(lightColors.keywordControl) },
        { token: 'string', foreground: strip(lightColors.string) },
        { token: 'string.escape', foreground: strip(lightColors.stringEscape) },
        { token: 'number', foreground: strip(lightColors.number) },
        { token: 'number.float', foreground: strip(lightColors.numberFloat) },
        { token: 'variable', foreground: '1f2937'},
        { token: 'variable.predefined', foreground: strip(lightColors.variablePredefined) },
        { token: 'function', foreground: strip(lightColors.function) },
        { token: 'type', foreground: strip(lightColors.type) },
        { token: 'type.identifier', foreground: strip(lightColors.typeIdentifier) },
        { token: 'tag', foreground: strip(lightColors.tag) },
        { token: 'attribute.name', foreground: strip(lightColors.attributeName) },
        { token: 'attribute.value', foreground: strip(lightColors.attributeValue) },
        { token: 'delimiter', foreground: strip(lightColors.accentDim) },
        { token: 'delimiter.bracket', foreground: strip(lightColors.accent) },
        { token: 'operator', foreground: strip(lightColors.operator) },
        { token: 'constant', foreground: strip(lightColors.constant) },
        { token: 'constant.language', foreground: strip(lightColors.constantLanguage) },
        { token: 'global', foreground: strip(lightColors.global) },
        { token: 'identifier', foreground: '1f2937'},
        { token: 'predefined', foreground: strip(lightColors.predefined) },
      ],
      colors: {
        'editor.background': lightBg,
        'editor.foreground': '#1f2937',
        'editor.lineHighlightBackground': lightLine,
        'editor.lineHighlightBorder': '#00000000',
        'editorGutter.background': lightBg,
        'minimap.background': lightBg,
        'minimapSlider.background': '#d0d0d040',
        'minimapSlider.hoverBackground': '#d0d0d060',
        'editor.selectionBackground': lightColors.selectionBg,
        'editorCursor.foreground': accent,
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': accent,
        'editor.wordHighlightBackground': lightColors.wordHighlightBg,
        'editorBracketMatch.background': lightColors.bracketMatchBg,
        'editorBracketMatch.border': accent,
        ...(overviewRulerBg && { 'editorOverviewRuler.background': overviewRulerBg }),
      },
    });

    // Midnight theme (deep blue)
    monaco.editor.defineTheme('infernix-midnight', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6e7681', fontStyle: 'italic'},
        { token: 'keyword', foreground: strip(darkColors.keyword), fontStyle: 'bold'},
        { token: 'keyword.control', foreground: strip(darkColors.keywordControl) },
        { token: 'string', foreground: strip(darkColors.string) },
        { token: 'string.escape', foreground: strip(darkColors.stringEscape) },
        { token: 'number', foreground: strip(darkColors.number) },
        { token: 'number.float', foreground: strip(darkColors.numberFloat) },
        { token: 'variable', foreground: 'e2e8f0'},
        { token: 'variable.predefined', foreground: strip(darkColors.variablePredefined) },
        { token: 'function', foreground: strip(darkColors.function) },
        { token: 'type', foreground: strip(darkColors.type) },
        { token: 'type.identifier', foreground: strip(darkColors.typeIdentifier) },
        { token: 'tag', foreground: strip(darkColors.tag) },
        { token: 'attribute.name', foreground: strip(darkColors.attributeName) },
        { token: 'attribute.value', foreground: strip(darkColors.attributeValue) },
        { token: 'delimiter', foreground: strip(darkColors.accentDim) },
        { token: 'delimiter.bracket', foreground: strip(darkColors.accent) },
        { token: 'operator', foreground: strip(darkColors.operator) },
        { token: 'constant', foreground: strip(darkColors.constant) },
        { token: 'constant.language', foreground: strip(darkColors.constantLanguage) },
        { token: 'global', foreground: strip(darkColors.global) },
        { token: 'identifier', foreground: 'e2e8f0'},
        { token: 'predefined', foreground: strip(darkColors.predefined) },
      ],
      colors: {
        'editor.background': midBg,
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': midLine,
        'editor.lineHighlightBorder': '#00000000',
        'editorGutter.background': midBg,
        'minimap.background': midBg,
        'minimapSlider.background': '#3a3a3a40',
        'minimapSlider.hoverBackground': '#3a3a3a60',
        'editor.selectionBackground': darkColors.selectionBg,
        'editorCursor.foreground': accent,
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': accent,
        'editor.wordHighlightBackground': darkColors.wordHighlightBg,
        'editorBracketMatch.background': darkColors.bracketMatchBg,
        'editorBracketMatch.border': accent,
        'editorLink.activeForeground': accent,
        ...(overviewRulerBg && { 'editorOverviewRuler.background': overviewRulerBg }),
      },
    });

    // Forest theme (dark green)
    monaco.editor.defineTheme('infernix-forest', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5a7a5a', fontStyle: 'italic'},
        { token: 'keyword', foreground: strip(darkColors.keyword), fontStyle: 'bold'},
        { token: 'keyword.control', foreground: strip(darkColors.keywordControl) },
        { token: 'string', foreground: strip(darkColors.string) },
        { token: 'string.escape', foreground: strip(darkColors.stringEscape) },
        { token: 'number', foreground: strip(darkColors.number) },
        { token: 'number.float', foreground: strip(darkColors.numberFloat) },
        { token: 'variable', foreground: 'e8f5e8'},
        { token: 'variable.predefined', foreground: strip(darkColors.variablePredefined) },
        { token: 'function', foreground: strip(darkColors.function) },
        { token: 'type', foreground: strip(darkColors.type) },
        { token: 'type.identifier', foreground: strip(darkColors.typeIdentifier) },
        { token: 'tag', foreground: strip(darkColors.tag) },
        { token: 'attribute.name', foreground: strip(darkColors.attributeName) },
        { token: 'attribute.value', foreground: strip(darkColors.attributeValue) },
        { token: 'delimiter', foreground: strip(darkColors.accentDim) },
        { token: 'delimiter.bracket', foreground: strip(darkColors.accent) },
        { token: 'operator', foreground: strip(darkColors.operator) },
        { token: 'constant', foreground: strip(darkColors.constant) },
        { token: 'constant.language', foreground: strip(darkColors.constantLanguage) },
        { token: 'global', foreground: strip(darkColors.global) },
        { token: 'identifier', foreground: 'e8f5e8'},
        { token: 'predefined', foreground: strip(darkColors.predefined) },
      ],
      colors: {
        'editor.background': forestBg,
        'editor.foreground': '#e8f5e8',
        'editor.lineHighlightBackground': forestLine,
        'editor.lineHighlightBorder': '#00000000',
        'editorGutter.background': forestBg,
        'minimap.background': forestBg,
        'minimapSlider.background': '#3a3a3a40',
        'minimapSlider.hoverBackground': '#3a3a3a60',
        'editor.selectionBackground': darkColors.selectionBg,
        'editorCursor.foreground': accent,
        'editorLineNumber.foreground': '#5a7a5a',
        'editorLineNumber.activeForeground': accent,
        'editor.wordHighlightBackground': darkColors.wordHighlightBg,
        'editorBracketMatch.background': darkColors.bracketMatchBg,
        'editorBracketMatch.border': accent,
        'editorLink.activeForeground': accent,
        ...(overviewRulerBg && { 'editorOverviewRuler.background': overviewRulerBg }),
      },
    });
  };

  // Update Monaco theme when themeMode, accentColor, or customBackground changes
  useEffect(() => {
    if (monacoRef.current) {
      defineThemesWithAccent(monacoRef.current, accentColor, customBackground);
      if (!isAnimatingRef.current) {
        const themeName = themeMode === 'light'? 'infernix-light': themeMode === 'midnight'? 'infernix-midnight': themeMode === 'forest'? 'infernix-forest': 'infernix-dark';
        monacoRef.current.editor.setTheme(themeName);
      }
    }
  }, [themeMode, accentColor, customBackground]);

  // Load execution history
  useEffect(() => {
    loadExecutionHistory();
  }, []);

  const loadExecutionHistory = async () => {
    try {
      const data = await window.electronAPI?.getExecutionHistory?.();
      setExecutionHistory(data || []);
    } catch (e) {
      console.error('Failed to load history:', e);
      setExecutionHistory([]);
    }
  };

  // Reload history after execution
  const refreshHistoryAfterExecution = () => {
    // Load immediately and again after a short delay to catch async writes
    loadExecutionHistory();
    setTimeout(() => loadExecutionHistory(), 800);
  };

  const handleHistoryRerun = async (item) => {
    const targetClients = clients.filter(c => c.connected);
    if (targetClients.length === 0) {
      onNotify?.('No clients connected', 'error');
      return;
    }
    await executeScript(item.script, targetClients, item.scriptName);
    refreshHistoryAfterExecution();
  };

  const handleHistoryCopy = (item) => {
    navigator.clipboard.writeText(item.script);
    onNotify?.('Copied to clipboard', 'success');
  };

  const handleHistoryOpenInTab = (item) => {
    // Pass the script content directly to create a new tab with it
    onNewTab?.({ name: item.scriptName || 'History', content: item.script });
  };

  const formatHistoryTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };


  return (
    <div 
      className={`editor-view ${isDragOver ? 'drag-over': ''}`}
      onDrop={handleFileDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="drop-overlay">
          <div className="drop-zone">
            <div className="drop-icon">
              <FileCode size={48} />
            </div>
            <h3>Drop Script File</h3>
            <p>Release to load .lua, .luau, or .txt file</p>
            <div className="drop-features">
              <span><Check size={14} /> Auto-lint</span>
              <span><Check size={14} /> New tab</span>
            </div>
          </div>
        </div>
      )}
      {/* Tab Bar */}
      <div className="tab-bar">
        <div className="tabs" ref={tabsRef}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active': ''}`}
              onClick={() => onTabChange(tab.id)}
              onDoubleClick={(e) => handleDoubleClick(e, tab)}
            >
              <span className="tab-dot" />
              {/* Collab badge */}
              {tab.isCollab && (
                <span className="tab-collab-badge" title="Live shared session">
                  <Users size={11} />
                </span>
              )}
              {/* Safety Badge */}
              {tab.scanStatus && (
                <span className={`tab-safety-badge ${tab.scanStatus}`} title={
                  tab.scanStatus === 'safe' ? 'Verified Safe' :
                  tab.scanStatus === 'expected' ? 'HackTool (Expected for executor scripts)' :
                  tab.scanStatus === 'threat' ? 'Threat Detected!' :
                  tab.scanStatus === 'suspicious' ? 'Suspicious Patterns' :
                  tab.scanStatus === 'scanning' ? 'Scanning...' :
                  'Scan status unknown'
                }>
                  {tab.scanStatus === 'safe' && <ShieldCheck size={12} />}
                  {tab.scanStatus === 'expected' && <ShieldCheck size={12} />}
                  {tab.scanStatus === 'threat' && <ShieldAlert size={12} />}
                  {tab.scanStatus === 'suspicious' && <AlertTriangle size={12} />}
                  {tab.scanStatus === 'scanning' && <Loader size={12} className="spinning" />}
                  {tab.scanStatus === 'unknown' && <Shield size={12} />}
                </span>
              )}
              {editingTabId === tab.id ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  className="tab-rename-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRenameSubmit(tab.id)}
                  onKeyDown={(e) => handleRenameKeyDown(e, tab.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="tab-name">{tab.name}</span>
              )}
              <button
                className="tab-close"
                onClick={(e) => handleCloseTab(e, tab.id)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button className="tab-new" onClick={onNewTab}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        {/* Left: scrollable action buttons */}
        <div className="toolbar-left">
          <button className="tool-btn primary" onClick={handleExecute}>
            <Play size={14} />
            <span>Execute</span>
          </button>
          <button className="tool-btn" onClick={handleClear}>
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
          <div className="toolbar-divider" />
          <button className="tool-btn danger" onClick={handleKillRoblox}>
            <Power size={14} />
            <span>Kill Roblox</span>
          </button>
          <div className="toolbar-divider" />

          {/* Hook Function button with dropdown */}
          <div className="hook-menu-wrapper" ref={hookMenuRef}>
            <button
              className={`tool-btn hook-btn ${showHookMenu ? 'active' : ''}`}
              onClick={() => setShowHookMenu(v => !v)}
              title="Insert a hook function template"
            >
              <Link2 size={14} />
              <span>Hook</span>
              <ChevronRight size={11} className={`hook-chevron ${showHookMenu ? 'open' : ''}`} />
            </button>
            {showHookMenu && (
              <div className="hook-dropdown">
                <div className="hook-dropdown-header">Hook Function Templates</div>
                {HOOK_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    className="hook-option"
                    onClick={() => handleInsertHook(tpl)}
                  >
                    <div className="hook-option-label">{tpl.label}</div>
                    <div className="hook-option-desc">{tpl.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AutoExec quick-access */}
          <button
            className="tool-btn autoexec-btn"
            onClick={() => setShowAutoExecModal(true)}
            title="Manage AutoExec scripts"
          >
            <Zap size={14} />
            <span>AutoExec</span>
          </button>
        </div>

        {/* Right: always-visible utility buttons + exec stats */}
        <div className="toolbar-right">
          {stats && stats.execution.count > 0 && (
            <div className="toolbar-stat" title="Total scripts executed">
              <span className="toolbar-stat-val">{stats.execution.count}</span>
              <span className="toolbar-stat-label">execs</span>
            </div>
          )}
          {stats && stats.execution.count > 0 && (
            <div className="toolbar-stat" title="Average execution time">
              <span className="toolbar-stat-val">{formatMs(avgExecutionTime(stats))}</span>
              <span className="toolbar-stat-label">avg</span>
            </div>
          )}
          <button className="tool-btn security-scan" onClick={() => setShowScanModal(true)}>
            <Shield size={14} />
            <span>Scan</span>
          </button>
          <button className="tool-btn" onClick={() => setShowSaveModal(true)}>
            <Save size={14} />
            <span>Save</span>
          </button>
          <button className="tool-btn" onClick={() => setShowOpenModal(true)}>
            <FolderOpen size={14} />
            <span>Open</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="editor-container">
        <MonacoEditor
          height="100%"
          defaultLanguage="lua"
          theme="vs-dark"
          defaultValue=""
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true, scale: 1, showSlider: 'always', size: 'fill', maxColumn: 80 },
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
            fontLigatures: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12 },
            lineNumbers: 'on',
            renderLineHighlight: customBackground ? 'none' : 'line',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            contextmenu: false,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>

      {/* Execution History Panel */}
      <div className={`history-panel ${historyExpanded ? 'expanded': 'collapsed'}`}>
        <div className="history-header" onClick={() => setHistoryExpanded(!historyExpanded)}>
          <div className="history-title">
            <History size={14} />
            <span>Execution History</span>
            <span className="history-count">{executionHistory.length}</span>
          </div>
          <button className="history-toggle">
            {historyExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
        
        {historyExpanded && (
          <div className="history-content">
            {executionHistory.length === 0 ? (
              <div className="history-empty">
                <Clock size={20} />
                <span>No execution history yet</span>
              </div>
            ) : (
              <div className="history-list">
                {executionHistory.slice(0, 50).map((item, index) => (
                  <div key={item.id || index} className="history-item">
                    <div className="history-item-info">
                      <span className="history-item-name">{item.scriptName || 'Untitled'}</span>
                      {item.description && (
                        <span className="history-item-desc">{item.description}</span>
                      )}
                      <span className="history-item-time">
                        <Clock size={10} />
                        {formatHistoryTime(item.timestamp)}
                      </span>
                    </div>
                    <div className="history-item-actions">
                      <button 
                        className="history-action-btn execute"
                        onClick={() => handleHistoryRerun(item)}
                        title="Execute"
                      >
                        <Play size={12} />
                      </button>
                      <button 
                        className="history-action-btn copy"
                        onClick={() => handleHistoryCopy(item)}
                        title="Copy"
                      >
                        <Copy size={12} />
                      </button>
                      <button 
                        className="history-action-btn open"
                        onClick={() => handleHistoryOpenInTab(item)}
                        title="Open in new tab"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <SaveScriptModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveScript}
        defaultName={activeScript?.name || 'Untitled'}
      />
      
      <OpenScriptModal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        onOpen={handleOpenScript}
      />

      <ScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        script={activeScript?.content || ''}
        scriptName={activeScript?.name || 'Untitled'}
        onScanComplete={(status, result) => {
          if (activeTab && onUpdateTabScan) {
            onUpdateTabScan(activeTab, status, result);
          }
        }}
      />

      {/* AutoExec quick-access modal */}
      {showAutoExecModal && (
        <AutoExecManager
          tabs={tabs || []}
          onClose={() => setShowAutoExecModal(false)}
        />
      )}

      {/* Custom Editor Context Menu — rendered into body via portal so
          position:fixed and backdrop-filter work correctly outside any
          CSS-transform / overflow:hidden ancestor */}
      {ctxMenu && createPortal(
        <div
          ref={ctxMenuRef}
          className="editor-ctx-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button className="ctx-item ctx-accent" onClick={() => { setCtxMenu(null); ctxMenu.hasSelection ? handleExecuteSelection() : handleExecute(); }}>
            <Play size={13} className="ctx-icon" />
            <span className="ctx-label">{ctxMenu.hasSelection ? 'Execute Selection' : 'Execute'}</span>
            <span className="ctx-shortcut">F5</span>
          </button>

          <div className="ctx-divider" />

          <button className="ctx-item" onClick={() => { editorInstanceRef.current?.getAction('editor.action.clipboardCutAction')?.run(); setCtxMenu(null); }}>
            <Scissors size={13} className="ctx-icon" />
            <span className="ctx-label">Cut</span>
            <span className="ctx-shortcut">Ctrl+X</span>
          </button>
          <button className="ctx-item" onClick={() => { editorInstanceRef.current?.getAction('editor.action.clipboardCopyAction')?.run(); setCtxMenu(null); }}>
            <Copy size={13} className="ctx-icon" />
            <span className="ctx-label">Copy</span>
            <span className="ctx-shortcut">Ctrl+C</span>
          </button>
          <button className="ctx-item" onClick={() => { editorInstanceRef.current?.getAction('editor.action.clipboardPasteAction')?.run(); setCtxMenu(null); }}>
            <Clipboard size={13} className="ctx-icon" />
            <span className="ctx-label">Paste</span>
            <span className="ctx-shortcut">Ctrl+V</span>
          </button>
          <button className="ctx-item" onClick={() => { editorInstanceRef.current?.getAction('editor.action.selectAll')?.run(); setCtxMenu(null); }}>
            <span className="ctx-icon" />
            <span className="ctx-label">Select All</span>
            <span className="ctx-shortcut">Ctrl+A</span>
          </button>

          <div className="ctx-divider" />

          <button className="ctx-item" onClick={() => { editorInstanceRef.current?.getAction('editor.action.formatDocument')?.run(); setCtxMenu(null); }}>
            <Wand2 size={13} className="ctx-icon" />
            <span className="ctx-label">Format Document</span>
            <span className="ctx-shortcut">Alt+Shift+F</span>
          </button>
          <button className="ctx-item ctx-danger" onClick={() => { handleClear(); setCtxMenu(null); }}>
            <Trash2 size={13} className="ctx-icon" />
            <span className="ctx-label">Clear Editor</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

export default EditorView;








