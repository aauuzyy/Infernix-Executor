import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Code2, Globe, Users, Settings, Sparkles,
  Zap, Shield, Terminal, RefreshCw, XCircle, Cpu, HardDrive,
  Activity, ChevronRight, Lock, Unlock, Send, Loader,
  Play, UserX, Radio, Clock, Hash, BarChart3,
  FileText, FolderOpen, MonitorPlay, Wifi, WifiOff, Eye,
  Megaphone, Trash2, Search, Ban, Plus, Check, X,
  AlertTriangle, Power, Unplug
} from 'lucide-react';
import DevTerminal from './DevTerminal';
import './DevPanel.css';

/* ── Dev user list (mirrored from main.cjs for client highlighting) ──── */
const DEV_USERNAMES = new Set([
  'FROSTYFLAKE799', 'my_alt429', 'Jayyseyko', 'Jayseyko',
  'brody8556', 'CN0IMU', 'bonquisha_bonna'
]);

/* ── Nav items ────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'admin',     label: 'Admin Panel',  icon: Shield          },
  { id: 'executor',  label: 'Executor',     icon: Code2           },
  { id: 'clients',   label: 'Clients',      icon: Users           },
  { id: 'assistant', label: 'AI Assistant',  icon: Sparkles        },
  { id: 'settings',  label: 'Settings',     icon: Settings        },
];

/* ── AI system prompt ─────────────────────────────────────────────────── */
const DEV_SYSTEM_PROMPT = `You are Infernix AI running in DEVELOPER MODE for a developer.
You output raw Lua code or, when asked to run a terminal command, output exactly:
/run: <powershell command>

Rules:
1. For Lua scripts: output ONLY valid Lua code, no markdown, no explanation.
2. For terminal commands: only output /run: <command> when the user explicitly asks you to run a system command.
3. Never run terminal commands autonomously — only when the user explicitly asks.
4. Prefix Lua scripts with "-- [Script] by Infernix DEV"
5. Use game:GetService() for Roblox services.`;

/* ── Helpers ──────────────────────────────────────────────────────────── */
function StatBadge({ label, value, accent }) {
  return (
    <div className="dp-stat-badge">
      <span className="dp-stat-label">{label}</span>
      <span className="dp-stat-value" style={accent ? { color: accent } : {}}>{value}</span>
    </div>
  );
}

function clientFields(c) {
  const isArr   = Array.isArray(c);
  const pid     = String(isArr ? c[0] : c.pid);
  const uname   = (isArr ? c[1] : c.username) || '';
  const player  = (isArr ? c[2] : c.playerName) || '';
  const status  = isArr ? c[3] : c.status;
  const placeId = isArr ? (c[5] || 0) : (c.placeId || 0);
  const attached = status === 3;
  const isDev    = DEV_USERNAMES.has(uname);
  return { pid, uname, player, status, placeId, attached, isDev };
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════════════════════════════════════ */
function DashboardTab({ clients, attachedClients, executionCount, uptime, tabs, owner, blacklistCount }) {
  const totalPids = clients.map(c => clientFields(c).pid);
  const devClients = clients.filter(c => clientFields(c).isDev);
  const places = new Set(clients.map(c => clientFields(c).placeId).filter(p => p > 0));

  return (
    <div className="dp-tab-content dp-dashboard">
      <div className="dp-col-header">
        <LayoutDashboard size={12} />
        <span>DASHBOARD OVERVIEW</span>
      </div>

      <div className="dp-dash-grid">
        <div className="dp-dash-card">
          <div className="dp-dash-card-icon"><Users size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{clients.length}</span>
            <span className="dp-dash-card-label">Total Clients</span>
          </div>
        </div>
        <div className="dp-dash-card dp-dash-card--success">
          <div className="dp-dash-card-icon"><Wifi size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{attachedClients.length}</span>
            <span className="dp-dash-card-label">Attached</span>
          </div>
        </div>
        <div className="dp-dash-card dp-dash-card--accent">
          <div className="dp-dash-card-icon"><Zap size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{executionCount || 0}</span>
            <span className="dp-dash-card-label">Executions</span>
          </div>
        </div>
        <div className="dp-dash-card">
          <div className="dp-dash-card-icon"><Clock size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{uptime}</span>
            <span className="dp-dash-card-label">Uptime</span>
          </div>
        </div>
        <div className="dp-dash-card">
          <div className="dp-dash-card-icon"><FileText size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{tabs?.length || 0}</span>
            <span className="dp-dash-card-label">Open Tabs</span>
          </div>
        </div>
        <div className="dp-dash-card">
          <div className="dp-dash-card-icon"><MonitorPlay size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{clients.length - attachedClients.length}</span>
            <span className="dp-dash-card-label">Idle</span>
          </div>
        </div>
        <div className="dp-dash-card dp-dash-card--dev">
          <div className="dp-dash-card-icon"><Shield size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{devClients.length}</span>
            <span className="dp-dash-card-label">Dev Clients</span>
          </div>
        </div>
        <div className="dp-dash-card">
          <div className="dp-dash-card-icon"><Globe size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{places.size}</span>
            <span className="dp-dash-card-label">Unique Places</span>
          </div>
        </div>
        <div className="dp-dash-card dp-dash-card--danger">
          <div className="dp-dash-card-icon"><Ban size={18} /></div>
          <div className="dp-dash-card-data">
            <span className="dp-dash-card-value">{blacklistCount}</span>
            <span className="dp-dash-card-label">Blacklisted</span>
          </div>
        </div>
      </div>

      <div className="dp-col-header" style={{ marginTop: 16 }}>
        <Activity size={12} />
        <span>SYSTEM INFO</span>
      </div>
      <div className="dp-info-rows">
        <div className="dp-info-row">
          <span className="dp-info-key">Owner</span>
          <span className="dp-info-val dp-info-val--accent">{owner}</span>
        </div>
        <div className="dp-info-row">
          <span className="dp-info-key">Electron</span>
          <span className="dp-info-val">{typeof process !== 'undefined' ? `v${process.versions?.electron}` : 'Electron'}</span>
        </div>
        <div className="dp-info-row">
          <span className="dp-info-key">Node</span>
          <span className="dp-info-val">{typeof process !== 'undefined' ? `v${process.versions?.node}` : '—'}</span>
        </div>
        <div className="dp-info-row">
          <span className="dp-info-key">Chrome</span>
          <span className="dp-info-val">{typeof process !== 'undefined' ? `v${process.versions?.chrome}` : '—'}</span>
        </div>
        <div className="dp-info-row">
          <span className="dp-info-key">Platform</span>
          <span className="dp-info-val">{navigator?.platform || 'Win32'}</span>
        </div>
        <div className="dp-info-row">
          <span className="dp-info-key">PIDs</span>
          <span className="dp-info-val">{totalPids.join(', ') || '—'}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN TAB — Blacklist, Announce, Actions
   ═══════════════════════════════════════════════════════════════════════ */
function AdminTab({ clients, attachedClients, executionCount, executeToAll, killAllRoblox,
  blacklist, onAddBlacklist, onRemoveBlacklist, onClearBlacklist, onNotify, owner }) {
  const [announceTitle, setAnnounceTitle] = useState('Infernix Dev');
  const [announceMsg, setAnnounceMsg]     = useState('');
  const [announceDur, setAnnounceDur]     = useState(5);
  const [announcing, setAnnouncing]       = useState(false);

  const [blQuery, setBlQuery]             = useState('');
  const [blReason, setBlReason]           = useState('');
  const [blLooking, setBlLooking]         = useState(false);
  const [blResult, setBlResult]           = useState(null);

  const handleAnnounce = async () => {
    if (!announceMsg.trim() || announcing) return;
    setAnnouncing(true);
    // Always show the announcement locally so the dev sees it too
    onNotify?.({ type: 'announce', title: announceTitle || 'Infernix', message: announceMsg, duration: (announceDur + 1) * 1000 });
    try {
      const res = await window.electronAPI?.devBroadcastAnnounce({
        title: announceTitle, message: announceMsg, duration: announceDur
      });
      if (res?.ok) {
        onNotify?.({ type: 'success', title: 'Broadcast sent', message: `→ ${res.clients} client(s)`, duration: 3000 });
        setAnnounceMsg('');
      } else {
        onNotify?.({ type: 'error', title: 'Broadcast failed', message: res?.error || 'No attached clients' });
      }
    } catch (e) {
      onNotify?.({ type: 'error', title: 'Error', message: e.message });
    }
    setAnnouncing(false);
  };

  const handleBlLookup = async () => {
    if (!blQuery.trim() || blLooking) return;
    setBlLooking(true);
    setBlResult(null);
    try {
      const res = await window.electronAPI?.devLookupUser({ query: blQuery.trim() });
      if (res?.ok) {
        setBlResult(res);
      } else {
        onNotify?.({ type: 'error', title: 'Lookup failed', message: res?.error || 'Not found' });
      }
    } catch (e) {
      onNotify?.({ type: 'error', title: 'Error', message: e.message });
    }
    setBlLooking(false);
  };

  const handleBlAdd = async () => {
    if (!blResult) return;
    await onAddBlacklist({
      username: blResult.username,
      userId: blResult.userId,
      reason: blReason || 'No reason',
      addedBy: owner
    });
    setBlQuery('');
    setBlResult(null);
    setBlReason('');
  };

  return (
    <div className="dp-tab-content dp-admin-tab">
      {/* Quick Actions */}
      <div className="dp-col-header">
        <Shield size={12} />
        <span>QUICK ACTIONS</span>
      </div>
      <div className="dp-admin-actions">
        <button className="dp-admin-btn danger" onClick={killAllRoblox}>
          <Power size={13} /> KILL ALL ROBLOX
        </button>
        <button className="dp-admin-btn primary" onClick={() => executeToAll('print("[Infernix Dev] Ping from owner")')}>
          <Zap size={13} /> PING ALL CLIENTS
        </button>
        <button className="dp-admin-btn secondary" onClick={() => window.electronAPI?.attach?.()}>
          <RefreshCw size={13} /> ATTACH ALL
        </button>
      </div>

      {/* Broadcast Announce */}
      <div className="dp-col-header" style={{ marginTop: 16 }}>
        <Megaphone size={12} />
        <span>BROADCAST ANNOUNCEMENT</span>
      </div>
      <div className="dp-announce-section">
        <div className="dp-announce-row">
          <input className="dp-input dp-announce-title" value={announceTitle}
            onChange={e => setAnnounceTitle(e.target.value)} placeholder="Title" />
          <input className="dp-input dp-announce-dur" type="number" min={1} max={30}
            value={announceDur} onChange={e => setAnnounceDur(Number(e.target.value))} />
          <span className="dp-announce-dur-label">sec</span>
        </div>
        <textarea className="dp-input dp-announce-msg" value={announceMsg}
          onChange={e => setAnnounceMsg(e.target.value)}
          placeholder="Message to broadcast to all attached clients..." rows={2} />
        <button className="dp-admin-btn accent full-width" onClick={handleAnnounce} disabled={announcing || !announceMsg.trim()}>
          {announcing ? <Loader size={13} className="dp-spin" /> : <Megaphone size={13} />}
          {announcing ? ' SENDING…' : ` ANNOUNCE TO ${attachedClients.length} CLIENT(S)`}
        </button>
      </div>

      {/* Broadcast Execute */}
      <div className="dp-col-header" style={{ marginTop: 16 }}>
        <Terminal size={12} />
        <span>BROADCAST EXECUTE</span>
      </div>
      <div className="dp-exec-section">
        <textarea className="dp-exec-textarea" placeholder="-- Lua script to send to all attached clients..."
          rows={3} id="dp-broadcast-script" />
        <button className="dp-admin-btn primary full-width" onClick={() => {
          const el = document.getElementById('dp-broadcast-script');
          if (el?.value) executeToAll(el.value);
        }}>
          <Zap size={13} /> EXECUTE TO ALL ATTACHED
        </button>
      </div>

      {/* Blacklist */}
      <div className="dp-col-header" style={{ marginTop: 16 }}>
        <Ban size={12} />
        <span>BLACKLIST ({blacklist.length})</span>
        {blacklist.length > 0 && (
          <button className="dp-mini-btn danger" onClick={onClearBlacklist} style={{ marginLeft: 'auto' }}>
            <Trash2 size={10} /> CLEAR ALL
          </button>
        )}
      </div>
      <div className="dp-blacklist-section">
        <div className="dp-bl-lookup">
          <input className="dp-input" value={blQuery} onChange={e => setBlQuery(e.target.value)}
            placeholder="Username or UserID…"
            onKeyDown={e => { if (e.key === 'Enter') handleBlLookup(); }} />
          <button className="dp-admin-btn secondary" onClick={handleBlLookup} disabled={blLooking || !blQuery.trim()}>
            {blLooking ? <Loader size={12} className="dp-spin" /> : <Search size={12} />} LOOKUP
          </button>
        </div>
        {blResult && (
          <div className="dp-bl-result">
            <div className="dp-bl-result-info">
              <span className="dp-bl-result-name">{blResult.displayName} <span className="dp-bl-result-uname">@{blResult.username}</span></span>
              <span className="dp-bl-result-id">ID: {blResult.userId}</span>
            </div>
            <input className="dp-input dp-bl-reason" value={blReason} onChange={e => setBlReason(e.target.value)}
              placeholder="Reason (optional)" />
            <button className="dp-admin-btn danger" onClick={handleBlAdd}>
              <Ban size={12} /> BLACKLIST
            </button>
            <button className="dp-mini-btn" onClick={() => { setBlResult(null); setBlQuery(''); }}>
              <X size={12} />
            </button>
          </div>
        )}
        {blacklist.length > 0 && (
          <div className="dp-bl-list">
            {blacklist.map((b, i) => (
              <div key={i} className="dp-bl-entry">
                <div className="dp-bl-entry-info">
                  <span className="dp-bl-entry-name">{b.username || `ID:${b.userId}`}</span>
                  {b.userId && <span className="dp-bl-entry-id">#{b.userId}</span>}
                  {b.reason && <span className="dp-bl-entry-reason">{b.reason}</span>}
                  {b.addedBy && <span className="dp-bl-entry-by">by {b.addedBy}</span>}
                  {b.addedAt && <span className="dp-bl-entry-time">{new Date(b.addedAt).toLocaleDateString()}</span>}
                </div>
                <button className="dp-mini-btn danger" onClick={() => onRemoveBlacklist({ username: b.username, userId: b.userId })}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EXECUTOR TAB
   ═══════════════════════════════════════════════════════════════════════ */
function ExecutorTab({ tabs, onWriteToTab, executeToAll }) {
  const [selectedTab, setSelectedTab] = useState(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (tabs?.length > 0 && !selectedTab) setSelectedTab(tabs[0].id);
  }, [tabs, selectedTab]);

  useEffect(() => {
    if (selectedTab && tabs) {
      const t = tabs.find(t => t.id === selectedTab);
      if (t) setCode(t.content || '');
    }
  }, [selectedTab, tabs]);

  return (
    <div className="dp-tab-content dp-executor-tab">
      <div className="dp-col-header">
        <Code2 size={12} />
        <span>QUICK EXECUTOR</span>
      </div>
      <div className="dp-exec-tabs">
        {(tabs || []).map(t => (
          <button key={t.id} className={`dp-exec-tab ${selectedTab === t.id ? 'active' : ''}`}
            onClick={() => setSelectedTab(t.id)}>
            <FileText size={11} />
            <span>{t.name || 'Untitled'}</span>
          </button>
        ))}
      </div>
      <textarea className="dp-exec-code" value={code}
        onChange={e => { setCode(e.target.value); if (selectedTab) onWriteToTab?.(selectedTab, e.target.value); }}
        placeholder="-- Write Lua script here..." spellCheck={false} />
      <div className="dp-exec-actions">
        <button className="dp-admin-btn primary" onClick={() => executeToAll(code)}>
          <Play size={13} /> EXECUTE TO ALL
        </button>
        <button className="dp-admin-btn secondary" onClick={() => { setCode(''); if (selectedTab) onWriteToTab?.(selectedTab, ''); }}>
          <XCircle size={13} /> CLEAR
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CLIENTS TAB — Full client manager
   ═══════════════════════════════════════════════════════════════════════ */
function ClientsTab({ clients, attachedClients, owner, onNotify }) {
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter]     = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await window.electronAPI?.getClients?.(); } catch {}
    setTimeout(() => setRefreshing(false), 1200);
  };

  const sortedClients = [...clients].sort((a, b) => {
    const fa = clientFields(a);
    const fb = clientFields(b);
    if (fa.uname === owner && fb.uname !== owner) return -1;
    if (fb.uname === owner && fa.uname !== owner) return 1;
    if (fa.isDev && !fb.isDev) return -1;
    if (fb.isDev && !fa.isDev) return 1;
    if (fa.attached && !fb.attached) return -1;
    if (fb.attached && !fa.attached) return 1;
    return 0;
  });

  const filtered = sortedClients.filter(c => {
    const f = clientFields(c);
    if (filter === 'attached') return f.attached;
    if (filter === 'idle') return !f.attached;
    if (filter === 'dev') return f.isDev;
    return true;
  });

  const toggleSelect = (pid) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(filtered.map(c => clientFields(c).pid)));
  const selectNone = () => setSelected(new Set());

  const executeToSelected = async (script) => {
    const pids = [...selected];
    if (pids.length === 0) return;
    try {
      await window.electronAPI?.execute(script, pids, 'DEV_EXEC');
      onNotify?.({ type: 'success', title: 'Executed', message: `Sent to ${pids.length} client(s)` });
    } catch (e) {
      onNotify?.({ type: 'error', title: 'Failed', message: e.message });
    }
  };

  const pingSelected = () => executeToSelected('print("[Infernix Dev] Ping")');

  const unattachSelected = async () => {
    for (const pid of selected) {
      await window.electronAPI?.unattach?.(pid);
    }
    onNotify?.({ type: 'success', title: 'Unattached', message: `${selected.size} client(s)` });
  };

  const killSelected = async () => {
    for (const pid of selected) {
      await window.electronAPI?.killProcess?.(Number(pid));
    }
    onNotify?.({ type: 'success', title: 'Killed', message: `${selected.size} process(es)` });
  };

  return (
    <div className="dp-tab-content dp-clients-tab">
      <div className="dp-col-header">
        <Users size={12} />
        <span>CLIENT MANAGER</span>
        <span className="dp-attached-tag" style={{ marginLeft: 'auto' }}>{attachedClients.length}/{clients.length} attached</span>
        <button className="dp-refresh-btn" onClick={handleRefresh} title="Refresh clients">
          <RefreshCw size={11} className={refreshing ? 'dp-spin' : ''} />
        </button>
      </div>

      <div className="dp-clients-toolbar">
        <div className="dp-filter-pills">
          {[['all', 'All'], ['attached', 'Attached'], ['idle', 'Idle'], ['dev', 'Dev Team']].map(([v, l]) => (
            <button key={v} className={`dp-pill ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <div className="dp-select-actions">
          <button className="dp-mini-btn" onClick={selectAll}>Select All</button>
          <button className="dp-mini-btn" onClick={selectNone}>Deselect</button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="dp-bulk-bar">
          <span className="dp-bulk-count">{selected.size} selected</span>
          <button className="dp-admin-btn primary sm" onClick={pingSelected}><Zap size={11} /> Ping</button>
          <button className="dp-admin-btn secondary sm" onClick={() => {
            const s = prompt('Lua script to execute on selected:');
            if (s) executeToSelected(s);
          }}><Play size={11} /> Execute</button>
          <button className="dp-admin-btn warning sm" onClick={unattachSelected}><Unplug size={11} /> Unattach</button>
          <button className="dp-admin-btn danger sm" onClick={killSelected}><Power size={11} /> Kill</button>
        </div>
      )}

      <div className="dp-client-grid">
        {filtered.length === 0 ? (
          <div className="dp-no-clients">
            <WifiOff size={28} />
            <p>No clients match filter</p>
          </div>
        ) : (
          filtered.map((c) => {
            const f = clientFields(c);
            const isOwner = f.uname === owner;
            const isSelected = selected.has(f.pid);

            return (
              <div key={f.pid} className={`dp-client-card ${f.attached ? 'attached' : ''} ${f.isDev ? 'dev-user' : ''} ${isOwner ? 'is-owner' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSelect(f.pid)}>
                <div className="dp-client-card-header">
                  <div className={`dp-client-check ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <Check size={10} />}
                  </div>
                  <span className="dp-client-name">
                    {f.uname || `PID ${f.pid}`}
                    {isOwner && <span className="dp-owner-tag">YOU</span>}
                    {f.isDev && !isOwner && <span className="dp-dev-tag">DEV</span>}
                  </span>
                  <span className={`dp-client-badge ${f.attached ? 'st-attached' : 'st-idle'}`}>
                    {f.attached ? 'ATTACHED' : 'IDLE'}
                  </span>
                </div>
                <div className="dp-client-card-body">
                  <div className="dp-client-meta"><Hash size={10} /> PID: {f.pid}</div>
                  {f.placeId > 0 && <div className="dp-client-meta"><Globe size={10} /> Place: {f.placeId}</div>}
                  {f.player && <div className="dp-client-meta"><Eye size={10} /> {f.player}</div>}
                </div>
                {f.attached && (
                  <div className="dp-client-card-actions" onClick={e => e.stopPropagation()}>
                    <button className="dp-client-action-btn" onClick={() => {
                      window.electronAPI?.execute('print("[Infernix Dev] Ping")', [f.pid], 'DEV_PING');
                      onNotify?.({ type: 'success', title: 'Pinged', message: f.uname || f.pid });
                    }}>
                      <Zap size={11} /> Ping
                    </button>
                    <button className="dp-client-action-btn" onClick={() => {
                      const s = prompt(`Lua script for ${f.uname || f.pid}:`);
                      if (s) window.electronAPI?.execute(s, [f.pid], 'DEV_EXEC');
                    }}>
                      <Play size={11} /> Execute
                    </button>
                    <button className="dp-client-action-btn warning" onClick={() => {
                      window.electronAPI?.unattach?.(f.pid);
                      onNotify?.({ type: 'success', title: 'Unattached', message: f.uname || f.pid });
                    }}>
                      <Unplug size={11} /> Unattach
                    </button>
                    <button className="dp-client-action-btn danger" onClick={() => {
                      window.electronAPI?.killProcess?.(Number(f.pid));
                      onNotify?.({ type: 'success', title: 'Killed', message: `PID ${f.pid}` });
                    }}>
                      <Power size={11} /> Kill
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AI ASSISTANT TAB
   ═══════════════════════════════════════════════════════════════════════ */
function AssistantTab({ assistantUnlocked, unlocking, triggerUnlock, aiPrompt, setAiPrompt,
  aiStatus, aiGenerating, handleAIGenerate, aiInputRef, owner }) {
  return (
    <div className="dp-tab-content">
      <div className="dp-col-header">
        <Sparkles size={12} />
        <span>AI ASSISTANT — DEV MODE</span>
      </div>

      {!assistantUnlocked ? (
        <div className={`dp-lock-screen ${unlocking ? 'unlocking' : ''}`}>
          <div className="dp-lock-icon-wrap">
            {unlocking ? <Unlock size={36} className="dp-unlock-anim" /> : <Lock size={36} />}
          </div>
          <p className="dp-lock-title">{unlocking ? 'UNLOCKING…' : 'DEVELOPER ACCESS REQUIRED'}</p>
          <p className="dp-lock-sub">{unlocking ? 'Verifying owner credentials' : `Only ${owner} can access this panel`}</p>
          {!unlocking && (
            <button className="dp-unlock-btn" onClick={triggerUnlock}>
              <Unlock size={14} /> UNLOCK ASSISTANT
            </button>
          )}
          {unlocking && (
            <div className="dp-unlock-progress">
              <div className="dp-unlock-bar" />
            </div>
          )}
        </div>
      ) : (
        <div className="dp-ai-panel">
          <div className="dp-ai-status">
            <span className={`dp-ai-dot ${aiGenerating ? 'busy' : 'idle'}`} />
            <span>{aiStatus}</span>
            {aiGenerating && <Loader size={12} className="dp-spin" />}
          </div>
          <p className="dp-ai-hint">
            Type a Lua script prompt, or <code>/run: powershell command</code> to run system commands.
          </p>
          <div className="dp-ai-input-row">
            <input ref={aiInputRef} className="dp-ai-input" value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIGenerate(); }}}
              placeholder="Describe script… or /run: Get-Process" disabled={!!aiGenerating} />
            <button className="dp-ai-send" onClick={handleAIGenerate} disabled={!aiPrompt.trim() || !!aiGenerating}>
              {aiGenerating ? <Loader size={14} className="dp-spin" /> : <Send size={14} />}
            </button>
          </div>
          <div className="dp-ai-quick-cmds">
            <span className="dp-ai-qc-label">Quick:</span>
            <button className="dp-ai-qc-btn" onClick={() => setAiPrompt('/run: Get-Process RobloxPlayerBeta')}>Roblox PIDs</button>
            <button className="dp-ai-qc-btn" onClick={() => setAiPrompt('/run: netstat -ano | findstr :3110')}>Port 3110</button>
            <button className="dp-ai-qc-btn" onClick={() => setAiPrompt('/run: Get-Date')}>Date/Time</button>
            <button className="dp-ai-qc-btn" onClick={() => setAiPrompt('/run: systeminfo | Select-String "OS"')}>OS Info</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════════════════════════════════════════ */
function SettingsTab({ owner, blacklistCount }) {
  return (
    <div className="dp-tab-content">
      <div className="dp-col-header">
        <Settings size={12} />
        <span>DEV SETTINGS</span>
      </div>

      <div className="dp-settings-list">
        <div className="dp-settings-group">
          <div className="dp-settings-group-title">Dev Panel</div>
          <div className="dp-info-row">
            <span className="dp-info-key">Panel Version</span>
            <span className="dp-info-val">2.0.0</span>
          </div>
          <div className="dp-info-row">
            <span className="dp-info-key">Active Owner</span>
            <span className="dp-info-val dp-info-val--accent">{owner}</span>
          </div>
          <div className="dp-info-row">
            <span className="dp-info-key">Dev Team Size</span>
            <span className="dp-info-val">{DEV_USERNAMES.size}</span>
          </div>
          <div className="dp-info-row">
            <span className="dp-info-key">Detection Mode</span>
            <span className="dp-info-val">Auto (200ms poll)</span>
          </div>
        </div>

        <div className="dp-settings-group">
          <div className="dp-settings-group-title">Blacklist</div>
          <div className="dp-info-row">
            <span className="dp-info-key">Entries</span>
            <span className="dp-info-val">{blacklistCount}</span>
          </div>
          <div className="dp-info-row">
            <span className="dp-info-key">Enforcement</span>
            <span className="dp-info-val dp-info-val--success">Active (200ms)</span>
          </div>
          <div className="dp-info-row">
            <span className="dp-info-key">Action</span>
            <span className="dp-info-val dp-info-val--danger">Auto-close Infernix</span>
          </div>
        </div>

        <div className="dp-settings-group">
          <div className="dp-settings-group-title">Terminal</div>
          <div className="dp-info-row">
            <span className="dp-info-key">Shell</span>
            <span className="dp-info-val">PowerShell 5.1</span>
          </div>
          <div className="dp-info-row">
            <span className="dp-info-key">CWD Tracking</span>
            <span className="dp-info-val dp-info-val--success">Active</span>
          </div>
        </div>

        <div className="dp-settings-group">
          <div className="dp-settings-group-title">AI Assistant</div>
          <div className="dp-info-row">
            <span className="dp-info-key">Model</span>
            <span className="dp-info-val">Infernix AI</span>
          </div>
          <div className="dp-info-row">
            <span className="dp-info-key">/run: Support</span>
            <span className="dp-info-val dp-info-val--success">Enabled</span>
          </div>
        </div>

        <div className="dp-settings-group">
          <div className="dp-settings-group-title">Dev Team</div>
          {[...DEV_USERNAMES].map(u => (
            <div className="dp-info-row" key={u}>
              <span className="dp-info-key">{u}</span>
              <span className="dp-info-val dp-info-val--success">Authorized</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN DEVPANEL
   ═══════════════════════════════════════════════════════════════════════ */
function DevPanel({ clients = [], executionCount, onViewChange, onClose, onNotify, tabs, onWriteToTab, onSwitchToExecutor, owner = 'DEV' }) {
  const [uptime, setUptime]       = useState('0m 0s');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [aiPrompt, setAiPrompt]   = useState('');
  const [aiStatus, setAiStatus]   = useState('Ready');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [assistantUnlocked, setAssistantUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [entered, setEntered]     = useState(false);
  const [blacklist, setBlacklist] = useState([]);
  const startRef   = useRef(Date.now());
  const aiInputRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    let raf1, raf2;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);

  // Load blacklist on mount
  useEffect(() => {
    window.electronAPI?.devGetBlacklist?.().then(bl => { if (bl) setBlacklist(bl); });
  }, []);

  // Uptime counter
  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      const m = Math.floor(s / 60);
      setUptime(`${m}m ${s % 60}s`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Assistant unlock
  const triggerUnlock = () => {
    if (assistantUnlocked || unlocking) return;
    setUnlocking(true);
    setTimeout(() => { setUnlocking(false); setAssistantUnlocked(true); }, 1800);
  };

  const handleNavClick = (viewId) => {
    setActiveSection(viewId);
    if (viewId === 'assistant') triggerUnlock();
  };

  const attachedClients = clients.filter(c => (Array.isArray(c) ? c[3] : c.status) === 3);

  const executeToAll = async (script) => {
    if (!script || attachedClients.length === 0) return;
    const pids = attachedClients.map(c => String(Array.isArray(c) ? c[0] : c.pid));
    try {
      await window.electronAPI?.execute(script, pids, 'DEV_EXEC');
      onNotify?.({ type: 'success', title: 'Executed', message: `Sent to ${pids.length} client(s)` });
    } catch (e) {
      onNotify?.({ type: 'error', title: 'Execute failed', message: e.message });
    }
  };

  const killAllRoblox = async () => {
    await window.electronAPI?.killRoblox?.();
    onNotify?.({ type: 'success', title: 'Roblox killed', message: 'All instances terminated' });
  };

  // Blacklist CRUD
  const handleAddBlacklist = async (data) => {
    const res = await window.electronAPI?.devAddBlacklist(data);
    if (res?.ok) {
      setBlacklist(prev => [...prev, res.entry]);
      onNotify?.({ type: 'success', title: 'Blacklisted', message: data.username || data.userId });
    } else {
      onNotify?.({ type: 'error', title: 'Failed', message: res?.error || 'Unknown' });
    }
  };
  const handleRemoveBlacklist = async (data) => {
    await window.electronAPI?.devRemoveBlacklist(data);
    setBlacklist(prev => prev.filter(b => {
      if (data.userId && b.userId && Number(b.userId) === Number(data.userId)) return false;
      if (data.username && b.username && b.username.toLowerCase() === data.username.toLowerCase()) return false;
      return true;
    }));
    onNotify?.({ type: 'success', title: 'Removed', message: data.username || data.userId });
  };
  const handleClearBlacklist = async () => {
    await window.electronAPI?.devClearBlacklist();
    setBlacklist([]);
    onNotify?.({ type: 'success', title: 'Blacklist cleared', message: 'All entries removed' });
  };

  // AI with /run
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || aiGenerating) return;
    setAiGenerating(true);
    setAiStatus('Connecting to Infernix AI…');

    try {
      if (/^\/run[:\s]/i.test(aiPrompt.trim())) {
        const cmd = aiPrompt.replace(/^\/run[:\s]*/i, '').trim();
        setAiStatus(`Running: ${cmd}`);
        window.electronAPI?.devTerminalInput?.(cmd);
        setAiPrompt('');
        setAiStatus('Complete — check terminal');
        setAiGenerating(false);
        return;
      }

      const messages = [
        { role: 'system', content: DEV_SYSTEM_PROMPT },
        { role: 'user',   content: aiPrompt }
      ];

      setAiStatus('AI is thinking…');
      const data = await window.electronAPI?.aiGenerate(messages);
      let code = data?.choices?.[0]?.message?.content || '';
      code = code.replace(/^```lua\n?/i,'').replace(/^```\n?/,'').replace(/\n?```$/g,'').trim();

      if (/^\/run[:\s]/i.test(code)) {
        const cmd = code.replace(/^\/run[:\s]*/i, '').trim();
        setAiStatus(`AI wants to run: ${cmd}`);
        window.electronAPI?.devTerminalInput?.(cmd);
      } else {
        const tid = tabs?.[tabs.length - 1]?.id;
        if (tid) {
          onWriteToTab?.(tid, code);
          onSwitchToExecutor?.(tid);
        }
        setAiStatus('Script written to tab');
      }
      setAiPrompt('');
    } catch (e) {
      setAiStatus(`Error: ${e.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  const renderCenterContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardTab clients={clients} attachedClients={attachedClients}
          executionCount={executionCount} uptime={uptime} tabs={tabs} owner={owner} blacklistCount={blacklist.length} />;
      case 'admin':
        return <AdminTab clients={clients} attachedClients={attachedClients}
          executionCount={executionCount} executeToAll={executeToAll} killAllRoblox={killAllRoblox}
          blacklist={blacklist} onAddBlacklist={handleAddBlacklist}
          onRemoveBlacklist={handleRemoveBlacklist} onClearBlacklist={handleClearBlacklist}
          onNotify={onNotify} owner={owner} />;
      case 'executor':
        return <ExecutorTab tabs={tabs} onWriteToTab={onWriteToTab} executeToAll={executeToAll} />;
      case 'clients':
        return <ClientsTab clients={clients} attachedClients={attachedClients}
          owner={owner} onNotify={onNotify} />;
      case 'assistant':
        return <AssistantTab assistantUnlocked={assistantUnlocked} unlocking={unlocking}
          triggerUnlock={triggerUnlock} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt}
          aiStatus={aiStatus} aiGenerating={aiGenerating} handleAIGenerate={handleAIGenerate}
          aiInputRef={aiInputRef} owner={owner} />;
      case 'settings':
        return <SettingsTab owner={owner} blacklistCount={blacklist.length} />;
      default:
        return <DashboardTab clients={clients} attachedClients={attachedClients}
          executionCount={executionCount} uptime={uptime} tabs={tabs} owner={owner} blacklistCount={blacklist.length} />;
    }
  };

  return (
    <div className={`dev-panel-overlay ${entered ? 'dp-entered' : ''}`}>
      <div className="dev-panel">
        <div className="dp-header">
          <div className="dp-header-left">
            <Zap size={18} className="dp-logo-icon" />
            <span className="dp-logo-text">INFERNIX</span>
            <span className="dp-mode-badge">DEV PANEL</span>
          </div>
          <div className="dp-header-center">
            <StatBadge label="OWNER"      value={owner}               accent="var(--accent)" />
            <StatBadge label="CLIENTS"    value={clients.length}      />
            <StatBadge label="ATTACHED"   value={attachedClients.length} accent="var(--success)" />
            <StatBadge label="EXECUTIONS" value={executionCount || 0} />
            <StatBadge label="UPTIME"     value={uptime}              />
            {blacklist.length > 0 && <StatBadge label="BLACKLIST" value={blacklist.length} accent="var(--danger)" />}
          </div>
          <div className="dp-header-right">
            <button className="dp-exit-btn" onClick={onClose}>
              <XCircle size={16} />
              <span>EXIT DEV MODE</span>
            </button>
          </div>
        </div>

        <div className="dp-body">
          <div className="dp-col dp-col-nav">
            <div className="dp-col-header">
              <Radio size={12} />
              <span>NAVIGATION</span>
            </div>
            <div className="dp-nav-list">
              {NAV_ITEMS.map(item => (
                <button key={item.id}
                  className={`dp-nav-btn ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}>
                  <item.icon size={15} />
                  <span>{item.label}</span>
                  <ChevronRight size={12} className="dp-nav-arrow" />
                </button>
              ))}
            </div>

            <div className="dp-col-header" style={{ marginTop: 'auto', paddingTop: 16 }}>
              <Shield size={12} />
              <span>SYSTEM</span>
            </div>
            <div className="dp-sys-stats">
              <div className="dp-sys-row"><Cpu size={12} /><span>Electron</span></div>
              <div className="dp-sys-row"><Activity size={12} /><span>Exec: {executionCount}</span></div>
              <div className="dp-sys-row"><HardDrive size={12} /><span>Tabs: {tabs?.length || 0}</span></div>
              <div className="dp-sys-row"><Ban size={12} /><span>BL: {blacklist.length}</span></div>
            </div>
          </div>

          <div className="dp-col dp-col-center">
            {renderCenterContent()}
          </div>

          <div className="dp-col dp-col-terminal">
            <div className="dp-col-header">
              <Terminal size={12} />
              <span>TERMINAL</span>
              <span className="dp-terminal-badge">POWERSHELL</span>
            </div>
            <DevTerminal className="dp-terminal-inner" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevPanel;
