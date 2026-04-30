import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

function BackgroundOverlay() {
  const { customBackground, backgroundBlur } = useTheme();
  if (!customBackground) return null;
  // Use an <img> so animated GIFs remain animated and blur works correctly
  const blurPx = (backgroundBlur / 100) * 20;
  return (
    <div className="custom-bg-overlay">
      <img
        src={customBackground}
        alt=""
        className="custom-bg-img"
        style={{ filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none' }}
      />
    </div>
  );
}

function CursorGlow() {
  const glowRef = useRef(null);
  const pos = useRef({ x: -999, y: -999 });
  const cur = useRef({ x: -999, y: -999 });
  const raf = useRef(null);
  useEffect(() => {
    const onMove = (e) => { pos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove);
    const tick = () => {
      cur.current.x = cur.current.x + (pos.current.x - cur.current.x) * 1.0;
      cur.current.y = cur.current.y + (pos.current.y - cur.current.y) * 1.0;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${cur.current.x}px, ${cur.current.y}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf.current); };
  }, []);
  return (
    <div ref={glowRef} aria-hidden="true" style={{
      position: 'fixed', top: -60, left: -60,
      width: 120, height: 120, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.045) 0%, transparent 70%)',
      pointerEvents: 'none', zIndex: 0, willChange: 'transform',
    }} />
  );
}
import TitleBar from './components/TitleBar';
import Dashboard from './components/Dashboard';
import EditorView from './components/EditorView';
import ScriptHub from './components/ScriptHub';
import ClientManager from './components/ClientManager';
import SettingsView from './components/SettingsView';
import Assistant from './components/Assistant';
import AssistantSidebar from './components/AssistantSidebar';
import Notification from './components/Notification';
import UpdateModal from './components/UpdateModal';
import LoadingScreen from './components/LoadingScreen';
import KeyGate, { hasSavedKey } from './components/KeyGate';
import TutorialOverlay from './components/TutorialOverlay';
import CollabView from './components/CollabView';
import { revalidateStoredSession, subscribeToSession, pushContent, fetchSessionSnapshot, clearStoredSession, openCursorChannel } from './services/collabService';
import './App.css';

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [executorVersion, setExecutorVersion] = useState('1.3.6');
  const [executionCount, setExecutionCount] = useState(0);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isBlockingUpdate, setIsBlockingUpdate] = useState(false);
  const { setThemeMode, setAccentColor, setColorShift, accentPresets, themeMode, accentColor } = useTheme();
  const [startTime] = useState(Date.now());
  const [scanFeedback, setScanFeedback] = useState(null);
  const [tutorialActive, setTutorialActive] = useState(false);

  // ── Collab state ──────────────────────────────────────────────────────────
  // collabSession: null | { sessionId, expiresAt, role } when a session is active
  const [collabSession, setCollabSession] = useState(null);
  const collabTabIdRef = useRef(null); // tab id of the Collaborate tab
  const collabUnsub = useRef(null);    // Realtime unsubscribe fn
  const collabPushTimer = useRef(null);
  const collabPollRef = useRef(null);
  const collabLastPushAtRef = useRef(0);
  const collabPendingContentRef = useRef(null);
  const collabPushErrorAtRef = useRef(0);
  const collabLastLocalEditAtRef = useRef(0);
  const lastRemoteContentRef = useRef('');
  const lastPushedContentRef = useRef('');
  const collabCursorChannel = useRef(null); // Broadcast channel for cursor positions
  // remoteWrite: signals EditorView to push content directly into the Monaco model
  const [remoteWrite, setRemoteWrite] = useState(null); // { tabId, content, seq }
  const remoteWriteSeq = useRef(0);
  // remoteCursors: map of userId -> { lineNumber, column }
  const [remoteCursors, setRemoteCursors] = useState({});
  const collabSessionRef = useRef(null);
  useEffect(() => { collabSessionRef.current = collabSession; }, [collabSession]);
  const lastCursorSendRef = useRef(0);

  // On app startup: check for a stored session and restore it if both sides are online
  useEffect(() => {
    (async () => {
      const session = await revalidateStoredSession();
      if (!session) return;
      // Only auto-reopen when both host and guest are registered
      if (!session.partnerOnline) return;
      startCollabSession(session);
    })();
  }, []); // eslint-disable-line

  const startCollabSession = (session) => {
    if (collabSession?.sessionId === session.sessionId && collabTabIdRef.current !== null) {
      setActiveView('executor');
      setActiveTab(collabTabIdRef.current);
      return;
    }

    let nextCollabId;
    // Keep exactly one Collaborate tab to prevent duplicates.
    setTabs(prev => {
      const existingCollab = prev.find(t => t.isCollab);
      nextCollabId = existingCollab?.id ?? tabCounter.current++;
      const withoutCollab = prev.filter(t => !t.isCollab);
      return [...withoutCollab, { id: nextCollabId, name: 'Collaborate', content: session.content || '', isCollab: true }];
    });

    collabTabIdRef.current = nextCollabId;
    setActiveTab(nextCollabId);
    setActiveView('executor');
    setCollabSession({ sessionId: session.sessionId, expiresAt: session.expiresAt, role: session.role });
    lastRemoteContentRef.current = session.content || '';

    const applyRemoteContent = (remoteContent) => {
      if (typeof remoteContent !== 'string') return;
      if (remoteContent === lastRemoteContentRef.current) return;
      // Echo suppression: ignore our own push coming back from Supabase
      if (remoteContent === lastPushedContentRef.current && Date.now() - collabLastPushAtRef.current < 600) return;
      // Don't overwrite tabs state while user is actively typing (prevents clobbering on tab switch)
      if (Date.now() - collabLastLocalEditAtRef.current < 600) return;
      lastRemoteContentRef.current = remoteContent;
      setTabs(prev => prev.map(t =>
        t.id === collabTabIdRef.current ? { ...t, content: remoteContent } : t
      ));
      setRemoteWrite({ tabId: collabTabIdRef.current, content: remoteContent, seq: ++remoteWriteSeq.current });
    };

    // Subscribe to Realtime content updates
    if (collabUnsub.current) collabUnsub.current();
    collabUnsub.current = subscribeToSession(
      session.sessionId,
      (remoteContent) => applyRemoteContent(remoteContent),
      () => {
        addNotification({ type: 'warning', title: 'Collaborate', message: 'Session expired. Generate a new friend code.' });
        endCollabSession();
      },
      (status) => {
        if (status === 'CHANNEL_ERROR') {
          addNotification({ type: 'warning', title: 'Collaborate', message: 'Realtime channel issue detected. Fallback sync is active.' });
        }
      }
    );

    // Polling fallback: keep content in sync even if Realtime fails.
    if (collabPollRef.current) clearInterval(collabPollRef.current);
    collabPollRef.current = setInterval(async () => {
      try {
        const snap = await fetchSessionSnapshot(session.sessionId);
        if (!snap) return;
        if (new Date(snap.expires_at) < new Date()) {
          addNotification({ type: 'warning', title: 'Collaborate', message: 'Session expired. Generate a new friend code.' });
          endCollabSession();
          return;
        }
        applyRemoteContent(snap.content ?? '');
      } catch {
        // Keep trying silently; realtime may still be working.
      }
    }, 200);

    // Open cursor presence channel
    if (collabCursorChannel.current) collabCursorChannel.current.close();
    collabCursorChannel.current = openCursorChannel(session.sessionId, session.role, ({ userId, lineNumber, column }) => {
      setRemoteCursors(prev => ({ ...prev, [userId]: { lineNumber, column } }));
    });

    addNotification({ type: 'success', title: 'Collaborate', message: 'Shared editor is live!' });
  };

  const endCollabSession = () => {
    if (collabUnsub.current) { collabUnsub.current(); collabUnsub.current = null; }
    if (collabPollRef.current) { clearInterval(collabPollRef.current); collabPollRef.current = null; }
    if (collabCursorChannel.current) { collabCursorChannel.current.close(); collabCursorChannel.current = null; }
    if (collabTabIdRef.current !== null) {
      setTabs(prev => prev.filter(t => t.id !== collabTabIdRef.current));
      collabTabIdRef.current = null;
    }
    clearTimeout(collabPushTimer.current);
    collabPushTimer.current = null;
    collabPendingContentRef.current = null;
    collabLastPushAtRef.current = 0;
    collabLastLocalEditAtRef.current = 0;
    setCollabSession(null);
    setRemoteCursors({});
    lastRemoteContentRef.current = '';
    clearStoredSession();
  };

  // When the Collaborate tab content changes, push to Supabase (throttled for live typing)
  const handleCollabCodeChange = (tabId, content) => {
    if (tabId !== collabTabIdRef.current || !collabSessionRef.current) return;
    collabLastLocalEditAtRef.current = Date.now();
    collabPendingContentRef.current = content;

    const PUSH_INTERVAL_MS = 60;
    const pushNow = (payload) => {
      if (typeof payload !== 'string') return;
      collabLastPushAtRef.current = Date.now();
      lastPushedContentRef.current = payload;
      pushContent(collabSessionRef.current.sessionId, payload).catch(() => {
        const now = Date.now();
        if (now - collabPushErrorAtRef.current > 4000) {
          collabPushErrorAtRef.current = now;
          addNotification({ type: 'warning', title: 'Collaborate', message: 'Failed to push latest content. Retrying...' });
        }
      });
    };

    const elapsed = Date.now() - collabLastPushAtRef.current;
    if (elapsed >= PUSH_INTERVAL_MS && !collabPushTimer.current) {
      const payload = collabPendingContentRef.current;
      collabPendingContentRef.current = null;
      pushNow(payload);
      return;
    }

    if (!collabPushTimer.current) {
      const wait = Math.max(15, PUSH_INTERVAL_MS - elapsed);
      collabPushTimer.current = setTimeout(() => {
        collabPushTimer.current = null;
        const payload = collabPendingContentRef.current;
        collabPendingContentRef.current = null;
        pushNow(payload);
      }, wait);
    }
  };

  // Broadcast local cursor position to partner
  const handleSendCursor = (lineNumber, column) => {
    if (!collabSessionRef.current || !collabCursorChannel.current) return;
    if (activeTab !== collabTabIdRef.current) return;
    const now = Date.now();
    if (now - lastCursorSendRef.current < 60) return;
    lastCursorSendRef.current = now;
    collabCursorChannel.current.send(lineNumber, column);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Assistant sidebar is always open — no toggle

  // Listen for client updates from main process
  useEffect(() => {
    // Add smoothing to avoid flicker when main briefly reports empty
    const lastNonEmptyRef = { clients: [], at: 0 };
    // Sticky placeId map: pid -> last known non-zero placeId
    const stickyPlaceId = new Map();

    const stabiliseClients = (list) => {
      return list.map(client => {
        const isArr = Array.isArray(client);
        const pid   = String(isArr ? client[0] : client.pid);
        const rawPlaceId = isArr ? client[5] : (client.placeId || client.PlaceId || 0);
        const status = isArr ? client[3] : client.status;

        // If attached and placeId is non-zero, remember it
        if (status === 3 && rawPlaceId && Number(rawPlaceId) > 0) {
          stickyPlaceId.set(pid, rawPlaceId);
        }

        // Substitute sticky placeId if current is 0/null
        const stablePlaceId = (rawPlaceId && Number(rawPlaceId) > 0)
          ? rawPlaceId
          : (stickyPlaceId.get(pid) || rawPlaceId);

        // Clean up sticky entry when client disconnects
        if (status !== 3) stickyPlaceId.delete(pid);

        if (isArr) {
          const copy = [...client];
          copy[5] = stablePlaceId;
          return copy;
        }
        return { ...client, placeId: stablePlaceId, PlaceId: stablePlaceId };
      });
    };

    const updateClients = (incoming) => {
      const list = incoming || [];
      const now = Date.now();
      if (Array.isArray(list) && list.length > 0) {
        const stable = stabiliseClients(list);
        lastNonEmptyRef.clients = stable;
        lastNonEmptyRef.at = now;
        setClients(stable);
        return;
      }

      // If we recently had clients, keep showing them for a short grace period
      if (now - lastNonEmptyRef.at < 1500 && Array.isArray(lastNonEmptyRef.clients) && lastNonEmptyRef.clients.length > 0) {
        setClients(lastNonEmptyRef.clients);
      } else {
        stickyPlaceId.clear();
        setClients([]);
      }
    };

    if (window.electronAPI?.onClientsUpdate) {
      window.electronAPI.onClientsUpdate((newClients) => {
        updateClients(newClients);
      });

      // Get initial version (prefer app package version for consistent UI/display)
      (async () => {
        const ver =
          (await window.electronAPI.getCurrentVersion?.()) ||
          (await window.electronAPI.getVersion?.()) ||
          '1.3.6';
        setExecutorVersion(String(ver).replace(/^v/, ''));
      })();
    }

    return () => {
      window.electronAPI?.removeClientsListener?.();
    };
  }, []);

  // NOTE: Removed fallback polling — it called getClients() which returns raw
  // addon data without placeId merge, causing the client list to flicker every 1s.

  // Auto-start tutorial on first run
  useEffect(() => {
    const seen = localStorage.getItem('infernix-tutorial-seen');
    if (!seen) {
      const t = setTimeout(() => setTutorialActive(true), 1800);
      return () => clearTimeout(t);
    }
  }, []);

  // Mark tutorial as seen when it closes
  const handleTutorialClose = useCallback(() => {
    localStorage.setItem('infernix-tutorial-seen', '1');
    setTutorialActive(false);
  }, []);

  // Drive Discord RPC state from client attachment status
  useEffect(() => {
    const hasAttached = clients.some(c => {
      const status = Array.isArray(c) ? c[3] : c.status;
      return status === 3;
    });
    window.electronAPI?.setRPCState?.(hasAttached ? 'attached' : 'idle');
  }, [clients]);

  // Auto-check for updates on startup
  useEffect(() => {
    const checkForUpdates = async () => {
      if (window.electronAPI?.checkUpdates) {
        try {
          const result = await window.electronAPI.checkUpdates();
          if (result.hasUpdate) {
            setUpdateInfo(result);
            setShowUpdateModal(true);
            setIsBlockingUpdate(true); // Block app usage until updated
          }
        } catch (e) {
          console.error('Update check failed:', e);
        }
      }
    };
    
    // Check after a short delay to let the app initialize
    const timer = setTimeout(checkForUpdates, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Live execution count — incremented when main process broadcasts a successful execution
  useEffect(() => {
    if (window.electronAPI?.onExecutionOccurred) {
      window.electronAPI.onExecutionOccurred((data) => {
        setExecutionCount(prev => prev + 1);
      });
    }
    return () => {
      window.electronAPI?.removeExecutionListener?.();
    };
  }, []);

  // Lifted tab state for cross-component access
  const [tabs, setTabs] = useState([
    { id: 1, name: 'Script 1', content: '-- Welcome to Infernix\nprint("Hello, World!")'}
  ]);
  const [activeTab, setActiveTab] = useState(1);
  const tabCounter = useRef(2);
  const [tabsLoaded, setTabsLoaded] = useState(false);

  // Load saved tabs on startup
  useEffect(() => {
    const loadSavedTabs = async () => {
      try {
        const savedTabs = await window.electronAPI?.loadTabs();
        if (savedTabs && savedTabs.tabs && savedTabs.tabs.length > 0) {
          setTabs(savedTabs.tabs);
          setActiveTab(savedTabs.activeTab || savedTabs.tabs[0].id);
          tabCounter.current = savedTabs.counter || (Math.max(...savedTabs.tabs.map(t => t.id)) + 1);
        }
      } catch (e) {
        console.error('Failed to load tabs:', e);
      } finally {
        setTabsLoaded(true);
      }
    };
    loadSavedTabs();
  }, []);


  // Save tabs whenever they change (debounced)
  useEffect(() => {
    if (!tabsLoaded) return; // Don't save until initial load is done
    
    const saveTimeout = setTimeout(() => {
      window.electronAPI?.saveTabs({
        tabs,
        activeTab,
        counter: tabCounter.current
      });
    }, 500);
    
    return () => clearTimeout(saveTimeout);
  }, [tabs, activeTab, tabsLoaded]);

  // Ctrl+T: open new tab and switch to executor from anywhere
  const handleNewTabRef = useRef(null);
  useEffect(() => { handleNewTabRef.current = handleNewTab; });
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        handleNewTabRef.current?.();
        setActiveView('executor');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const notificationId = useRef(0);

  const addNotification = useCallback((notif, typeArg) => {
    const id = ++notificationId.current;
    const normalized = typeof notif === 'string'
      ? { type: typeArg || 'info', title: notif, id }
      : { ...notif, id };
    setNotifications(prev => [...prev, normalized]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Tab operations
  const handleNewTab = (initialData = null) => {
    const newTab = {
      id: tabCounter.current++,
      name: initialData?.name || `Script ${tabCounter.current - 1}`,
      content: initialData?.content || '-- New Script\n'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
    return newTab.id;
  };

  const handleCloseTab = (tabId) => {
    if (tabs.length === 1) return;
    // Prevent manually closing the Collaborate tab while session is active
    if (tabId === collabTabIdRef.current && collabSession) return;
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  const handleRenameTab = (tabId, newName) => {
    setTabs(tabs.map(t => 
      t.id === tabId ? { ...t, name: newName } : t
    ));
  };

  const handleCodeChange = (tabId, content) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, content } : t
    ));
    // Push to Supabase if this is the collab tab
    if (tabId === collabTabIdRef.current && collabSession) {
      handleCollabCodeChange(tabId, content);
    }
  };

  // Alias used by Assistant to write generated code into a tab
  const handleWriteToTab = handleCodeChange;

  // Update tab scan status for safety badges
  const handleUpdateTabScan = (tabId, scanStatus, scanResult = null) => {
    setTabs(tabs.map(t =>
      t.id === tabId ? { ...t, scanStatus, scanResult } : t
    ));
  };

  const handleSwitchToExecutor = (tabId) => {
    setActiveView('executor');
    if (tabId) {
      setActiveTab(tabId);
    }
  };

  // Navigate to executor and switch to a tab by name (case-insensitive, partial match)
  const handleNavigateToTab = (tabName) => {
    setActiveView('executor');
    const needle = tabName.trim().toLowerCase();
    const match = tabs.find(t => t.name.toLowerCase() === needle)
      || tabs.find(t => t.name.toLowerCase().includes(needle));
    if (match) setActiveTab(match.id);
  };

  // Apply settings/theme changes from the AI assistant
  const ACCENT_PRESET_MAP = {
    fire: '#f97316', ruby: '#ef4444', emerald: '#22c55e', ocean: '#3b82f6',
    violet: '#8b5cf6', pink: '#ec4899', cyan: '#06b6d4', gold: '#eab308',
    white: '#ffffff',
  };
  const handleApplySettings = useCallback((patch) => {
    if (!patch) return;
    // Handle full presets
    if (patch.__preset) {
      const name = patch.__preset.toLowerCase();
      if (name === 'random') {
        const colors = Object.values(ACCENT_PRESET_MAP);
        setAccentColor(colors[Math.floor(Math.random() * colors.length)]);
      } else if (name === 'midnight') {
        setThemeMode('midnight');
      } else if (name === 'light') {
        setThemeMode('light');
      } else if (name === 'dark') {
        setThemeMode('dark');
      } else if (ACCENT_PRESET_MAP[name]) {
        setAccentColor(ACCENT_PRESET_MAP[name]);
      }
      return;
    }
    // Handle individual keys
    if (patch.themeMode) setThemeMode(patch.themeMode);
    if (patch.accentColor) setAccentColor(patch.accentColor);
    if (patch.colorShift !== undefined) setColorShift(patch.colorShift);
    // Boolean settings — persist via electronAPI
    const settingsKeys = ['autoAttach','autoExecute','closeRoblox','topmost','ansEnabled','ansAutoShutdown','absEnabled','absAutoShutdown','debugConsole'];
    const settingsPatch = {};
    for (const k of settingsKeys) {
      if (patch[k] !== undefined) settingsPatch[k] = patch[k];
    }
    if (Object.keys(settingsPatch).length > 0) {
      window.electronAPI?.loadSettings?.().then(current => {
        window.electronAPI?.saveSettings?.({ ...current, ...settingsPatch });
      });
    }
    addNotification?.({ type: 'success', title: 'Settings Updated', message: 'Settings applied by AI' });
  }, [setThemeMode, setAccentColor, setColorShift]);

  const handleScanTab = useCallback(async (tabName) => {
    const needle = tabName.trim().toLowerCase();
    const tab = tabs.find(t => t.name.toLowerCase() === needle) || tabs.find(t => t.name.toLowerCase().includes(needle));
    if (!tab) {
      addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` });
      return;
    }
    setActiveView('executor');
    setActiveTab(tab.id);
    const EXPECTED = ['hacktool','hack.tool','gamehack','game.hack','riskware','exploit','cheat','gamemod','tool.lua','not-a-virus'];
    const THREATS = ['trojan','stealer','keylogger','backdoor','ransomware','miner','worm','rootkit','spyware','banker','rat.','infostealer'];
    const SUSPICIOUS = ['grabify.link','iplogger.org','blasze.tk','2no.co','iplogger.com','iplogger.ru','yip.su','iplis.org','ipgrabber.ru','discord.com/api/webhooks'];
    handleUpdateTabScan(tab.id, 'scanning');
    addNotification({ type: 'info', title: 'Scanning', message: `Scanning "${tab.name}"...` });
    try {
      const content = tab.content || '';
      const hasSuspiciousDomain = SUSPICIOUS.some(d => content.toLowerCase().includes(d));
      const vtResult = await window.electronAPI?.virusTotalScan?.(content);
      if (!vtResult || vtResult.error) {
        handleUpdateTabScan(tab.id, 'unknown', { error: vtResult?.error || 'Scan failed' });
        addNotification({ type: 'warning', title: 'Scan Result', message: 'Scan failed or unavailable' });
        setScanFeedback({ tabName: tab.name, status: 'unknown', detections: [], error: vtResult?.error || 'Scan failed or unavailable', timestamp: Date.now() });
        return;
      }
      const detections = vtResult.detections || [];
      let hasRealThreat = false, hasExpected = false;
      for (const det of detections) {
        const r = det.result.toLowerCase();
        if (THREATS.some(t => r.includes(t))) { hasRealThreat = true; break; }
        if (EXPECTED.some(e => r.includes(e))) hasExpected = true;
      }
      if (hasRealThreat || hasSuspiciousDomain) {
        handleUpdateTabScan(tab.id, 'threat', { detections, hasSuspiciousDomain });
        addNotification({ type: 'error', title: 'Threat Detected', message: `"${tab.name}" contains a threat!` });
        setScanFeedback({ tabName: tab.name, status: 'threat', detections, hasSuspiciousDomain, timestamp: Date.now() });
      } else if (hasExpected) {
        handleUpdateTabScan(tab.id, 'expected', { detections });
        addNotification({ type: 'info', title: 'Scan Result', message: `"${tab.name}" looks like a game mod` });
        setScanFeedback({ tabName: tab.name, status: 'expected', detections, timestamp: Date.now() });
      } else if (detections.length > 0) {
        handleUpdateTabScan(tab.id, 'suspicious', { detections });
        addNotification({ type: 'warning', title: 'Scan Result', message: `"${tab.name}" has suspicious detections` });
        setScanFeedback({ tabName: tab.name, status: 'suspicious', detections, timestamp: Date.now() });
      } else {
        handleUpdateTabScan(tab.id, 'safe', { detections: [] });
        addNotification({ type: 'success', title: 'Scan Result', message: `"${tab.name}" is safe!` });
        setScanFeedback({ tabName: tab.name, status: 'safe', detections: [], timestamp: Date.now() });
      }
    } catch (err) {
      handleUpdateTabScan(tab.id, 'unknown', { error: err.message });
      addNotification({ type: 'error', title: 'Scan Error', message: err.message });
      setScanFeedback({ tabName: tab.name, status: 'unknown', detections: [], error: err.message, timestamp: Date.now() });
    }
  }, [tabs, handleUpdateTabScan, addNotification]);

  const handleRobloxAction = useCallback(async (action) => {
    switch (action) {
      case 'rejoin':
        await window.electronAPI?.aiRejoinServer?.();
        addNotification({ type: 'info', title: 'Rejoining', message: 'Rejoining server...' });
        break;
      case 'close-roblox':
        await window.electronAPI?.killRoblox?.();
        addNotification({ type: 'info', title: 'Roblox Closed', message: 'Roblox has been closed' });
        break;
      case 'restart-infernix':
        addNotification({ type: 'info', title: 'Restarting', message: 'Infernix is restarting...' });
        setTimeout(() => window.electronAPI?.restartApp?.(), 1200);
        break;
      case 'close-infernix':
        addNotification({ type: 'info', title: 'Closing', message: 'Closing Infernix...' });
        setTimeout(() => window.electronAPI?.quitApp?.(), 1200);
        break;
      case 'attach':
        await window.electronAPI?.attach?.();
        addNotification({ type: 'success', title: 'Attached', message: 'Attached to Roblox' });
        break;
    }
  }, [addNotification]);

  const handleAddToAutoExec = useCallback(async (tabName) => {
    const needle = (tabName || '').trim().toLowerCase();
    let matchTabs;
    if (needle === 'all') {
      matchTabs = tabs;
    } else {
      const found = tabs.find(t => t.name.toLowerCase() === needle)
        || tabs.find(t => t.name.toLowerCase().includes(needle));
      matchTabs = found ? [found] : [];
    }
    if (matchTabs.length === 0) {
      addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` });
      return;
    }
    for (const tab of matchTabs) {
      await window.electronAPI?.addToAutoExec?.({ name: tab.name, content: tab.content });
    }
    addNotification({ type: 'success', title: 'Auto Execute', message: `${matchTabs.length} script(s) added to Auto Execute` });
  }, [tabs, addNotification]);

  const handleSavePreset = useCallback(async (presetName) => {
    try {
      const settings = await window.electronAPI?.loadSettings?.();
      const presetData = {
        name: presetName || 'AI Preset',
        description: `Saved by Infernix AI — ${themeMode} theme`,
        settings: settings || null,
        theme: { themeMode, accentColor },
        tabs: null,
      };
      const result = await window.electronAPI?.savePreset?.(presetData);
      if (result?.ok) {
        addNotification({ type: 'success', title: 'Preset Saved', message: `"${presetData.name}" saved to Preset Manager` });
      }
    } catch {
      addNotification({ type: 'error', title: 'Preset Error', message: 'Failed to save preset' });
    }
  }, [themeMode, accentColor, addNotification]);

  const handleExecuteTab = useCallback(async (tabName) => {
    const needle = tabName.trim().toLowerCase();
    const tab = tabs.find(t => t.name.toLowerCase() === needle) || tabs.find(t => t.name.toLowerCase().includes(needle));
    if (!tab) { addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` }); return; }
    const attached = clients.filter(c => (Array.isArray(c) ? c[3] : c.status) === 3);
    if (attached.length === 0) { addNotification({ type: 'warning', title: 'Not Attached', message: 'Attach to Roblox first' }); return; }
    await window.electronAPI?.execute?.(tab.content, attached.map(c => Array.isArray(c) ? c[0] : c.pid), tab.name);
    addNotification({ type: 'success', title: 'Executed', message: `"${tab.name}" executed` });
  }, [tabs, clients, addNotification]);

  const handleExecuteAll = useCallback(async () => {
    const attached = clients.filter(c => (Array.isArray(c) ? c[3] : c.status) === 3);
    if (attached.length === 0) { addNotification({ type: 'warning', title: 'Not Attached', message: 'Attach to Roblox first' }); return; }
    const pids = attached.map(c => Array.isArray(c) ? c[0] : c.pid);
    for (const tab of tabs) await window.electronAPI?.execute?.(tab.content, pids, tab.name);
    addNotification({ type: 'success', title: 'Executed All', message: `${tabs.length} script(s) executed` });
  }, [tabs, clients, addNotification]);

  const handleNewTabAI = useCallback(() => {
    handleNewTab();
    setActiveView('executor');
    addNotification({ type: 'success', title: 'New Tab', message: 'New script tab created' });
  }, [addNotification]);

  const handleCloseTabByName = useCallback((tabName) => {
    const needle = tabName.trim().toLowerCase();
    const tab = tabs.find(t => t.name.toLowerCase() === needle) || tabs.find(t => t.name.toLowerCase().includes(needle));
    if (!tab) { addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` }); return; }
    handleCloseTab(tab.id);
    addNotification({ type: 'info', title: 'Tab Closed', message: `"${tab.name}" closed` });
  }, [tabs, addNotification]);

  const handleDuplicateTab = useCallback((tabName) => {
    const needle = tabName.trim().toLowerCase();
    const tab = tabs.find(t => t.name.toLowerCase() === needle) || tabs.find(t => t.name.toLowerCase().includes(needle));
    if (!tab) { addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` }); return; }
    handleNewTab({ name: `${tab.name} (copy)`, content: tab.content });
    setActiveView('executor');
    addNotification({ type: 'success', title: 'Duplicated', message: `"${tab.name}" duplicated` });
  }, [tabs, addNotification]);

  const handleSaveScript = useCallback(async (tabName) => {
    const needle = tabName.trim().toLowerCase();
    const tab = tabs.find(t => t.name.toLowerCase() === needle) || tabs.find(t => t.name.toLowerCase().includes(needle));
    if (!tab) { addNotification({ type: 'error', title: 'Tab Not Found', message: `No tab named "${tabName}"` }); return; }
    await window.electronAPI?.saveScript?.(tab.name, '', tab.content);
    addNotification({ type: 'success', title: 'Script Saved', message: `"${tab.name}" saved to library` });
  }, [tabs, addNotification]);

  const handleLoadScript = (scriptContent) => {
    const newTab = {
      id: tabCounter.current++,
      name: `Script ${tabCounter.current - 1}`,
      content: scriptContent
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
    setActiveView('executor');
    addNotification({
      type: 'success',
      title: 'Script Loaded',
      message: 'Script added to new tab'
    });
  };

  const renderView = () => {
    switch (activeView) {
      case 'collab':
        return (
          <CollabView
            onStartCollab={(session) => startCollabSession(session)}
            onNotify={addNotification}
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            clients={clients}
            executionCount={executionCount}
            scriptCount={tabs.length}
            startTime={startTime}
            onViewChange={setActiveView}
            executorVersion={executorVersion}
          />
        );
      case 'executor':
        return (
          <EditorView
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNewTab={handleNewTab}
            onCloseTab={handleCloseTab}
            onRenameTab={handleRenameTab}
            onCodeChange={handleCodeChange}
            onUpdateTabScan={handleUpdateTabScan}
            onNotify={addNotification}
            clients={clients}
            remoteWrite={remoteWrite}
            remoteCursors={remoteCursors}
            collabTabId={collabTabIdRef.current}
            onSendCursor={handleSendCursor}
          />
        );
      case 'scripthub':
        return <ScriptHub onLoadScript={handleLoadScript} clients={clients} />;
      case 'clients':
        return <ClientManager clients={clients} onNotify={addNotification} />;
      case 'settings':
        return (
          <SettingsView 
            tabs={tabs} 
            onNewTab={handleNewTab}
            onSwitchToExecutor={() => setActiveView('executor')}
            onStartTutorial={() => setTutorialActive(true)}
            onNotify={addNotification}
          />
        );
      case 'assistant':
        return (
          <Assistant 
            tabs={tabs}
            clients={clients}
            onWriteToTab={handleWriteToTab}
            onSwitchToExecutor={handleSwitchToExecutor}
            onNotify={addNotification}
            onNavigate={setActiveView}
            onNavigateToTab={handleNavigateToTab}
            onApplySettings={handleApplySettings}
            onRobloxAction={handleRobloxAction}
            onScanTab={handleScanTab}
            onAddToAutoExec={handleAddToAutoExec}
            onSavePreset={handleSavePreset}
            onExecuteTab={handleExecuteTab}
            onExecuteAll={handleExecuteAll}
            onNewTab={handleNewTabAI}
            onCloseTabByName={handleCloseTabByName}
            onDuplicateTab={handleDuplicateTab}
            onSaveScript={handleSaveScript}
            onStartTutorial={() => setTutorialActive(true)}
          />
        );
      default:
        return (
          <EditorView
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNewTab={handleNewTab}
            onCloseTab={handleCloseTab}
            onRenameTab={handleRenameTab}
            onCodeChange={handleCodeChange}
            onUpdateTabScan={handleUpdateTabScan}
            onNotify={addNotification}
            clients={clients}
            remoteWrite={remoteWrite}
            remoteCursors={remoteCursors}
            collabTabId={collabTabIdRef.current}
            onSendCursor={handleSendCursor}
          />
        );
    }
  };

  return (
    <>
      <BackgroundOverlay />
      <div className="app">
        {/* Grid background (matches website) */}
        <div className="grid-bg" aria-hidden="true" />
        {/* Cursor glow */}
        <CursorGlow />
        <TitleBar
          activeView={activeView}
          onViewChange={setActiveView}
          clientCount={clients.length}
        />
        <div className="app-body">
          <main className={`main-view${activeView !== 'assistant' ? ' sidebar-open' : ''}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                className="view-transition"
                initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.993 }}
                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(3px)', scale: 0.993 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Assistant right sidebar — absolutely positioned, never overlaps content */}
          <AnimatePresence initial={false}>
            {activeView !== 'assistant' && (
              <motion.aside
                className="assistant-sidebar"
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
            <AssistantSidebar
              tabs={tabs}
              clients={clients}
              onWriteToTab={handleWriteToTab}
              onSwitchToExecutor={handleSwitchToExecutor}
              onNavigate={setActiveView}
              onNavigateToTab={handleNavigateToTab}
              onApplySettings={handleApplySettings}
              onNotify={addNotification}
              onScanTab={handleScanTab}
              onRobloxAction={handleRobloxAction}
              onLoadScript={handleLoadScript}
              scanFeedback={scanFeedback}
              onAddToAutoExec={handleAddToAutoExec}
              onSavePreset={handleSavePreset}
              onExecuteTab={handleExecuteTab}
              onExecuteAll={handleExecuteAll}
              onNewTab={handleNewTabAI}
              onCloseTabByName={handleCloseTabByName}
              onDuplicateTab={handleDuplicateTab}
              onSaveScript={handleSaveScript}
              onStartTutorial={() => setTutorialActive(true)}
            />
            </motion.aside>
            )}
          </AnimatePresence>
        </div>
        {/* Update Modal - blocking when outdated */}
        {showUpdateModal && (
          <UpdateModal
            isOpen={showUpdateModal}
            onClose={() => {
              if (!isBlockingUpdate) {
                setShowUpdateModal(false);
              }
            }}
            updateInfo={updateInfo}
            isBlocking={isBlockingUpdate}
          />
        )}
      </div>

      {/* Notifications */}
      <Notification notifications={notifications} onRemove={removeNotification} />

      {/* Tutorial overlay */}
      <TutorialOverlay
        active={tutorialActive}
        onClose={handleTutorialClose}
        onNavigate={setActiveView}
        clients={clients}
        onRobloxAction={handleRobloxAction}
      />
    </>
  );
}

function App() {
  const [ready, setReady] = useState(false);   // loading screen done
  const [keyed, setKeyed] = useState(false);    // key validated

  // After loading finishes, check for a saved valid key
  const handleLoadingDone = () => {
    setReady(true);
    if (hasSavedKey()) setKeyed(true);
  };

  if (!ready) return <LoadingScreen onDone={handleLoadingDone} />;
  if (!keyed) return <KeyGate onUnlocked={() => setKeyed(true)} />;
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;


