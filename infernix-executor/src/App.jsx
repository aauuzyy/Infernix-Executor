import { useState, useRef, useCallback, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import DevPanel from './components/DevPanel';
import BlacklistOverlay from './components/BlacklistOverlay';

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
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EditorView from './components/EditorView';
import ScriptHub from './components/ScriptHub';
import ClientManager from './components/ClientManager';
import SettingsView from './components/SettingsView';
import Assistant from './components/Assistant';
import Notification from './components/Notification';
import UpdateModal from './components/UpdateModal';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('executor');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clients, setClients] = useState([]);
  const [executorVersion, setExecutorVersion] = useState('1.0.0');
  const [executionCount, setExecutionCount] = useState(0);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isBlockingUpdate, setIsBlockingUpdate] = useState(false);
  const [startTime] = useState(Date.now());

  // Dev Mode state
  const [devMode, setDevMode]               = useState(false);
  const [devTransitioning, setDevTransitioning] = useState(false);
  const [devOwner, setDevOwner]             = useState('');
  const [isDevUser, setIsDevUser]           = useState(false); // persists after closing panel
  const [blacklistData, setBlacklistData]   = useState(null); // blacklist enforcement overlay
  // Use a ref so the latest devMode value is always accessible in callbacks
  const devModeRef = useRef(false);

  // Listen for dev mode changes — broadcast every 200ms with clients update
  useEffect(() => {
    const handler = (data) => {
      const wasActive = devModeRef.current;
      devModeRef.current = data.active;
      if (data.active) {
        // Mark this session as dev-eligible (persists when panel is closed)
        setIsDevUser(true);
        setDevOwner(data.owner || '');
        if (!wasActive) {
          // First time: glitch transition then show panel
          setDevTransitioning(true);
          setTimeout(() => {
            setDevTransitioning(false);
            setDevMode(true);
          }, 700);
        }
      } else if (!data.active) {
        setIsDevUser(false);
        if (wasActive) {
          setDevMode(false);
        }
      }
    };
    window.electronAPI?.onDevModeChange?.(handler);
    return () => window.electronAPI?.removeDevModeListener?.();
  }, []); // mount once — ref tracks latest value so no stale closure

  // Listen for blacklist enforcement — show scary overlay before app quits
  useEffect(() => {
    window.electronAPI?.onBlacklistTriggered?.((data) => {
      setBlacklistData(data);
    });
    return () => window.electronAPI?.removeBlacklistListener?.();
  }, []);

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

      // Get initial version
      window.electronAPI.getVersion?.().then((ver) => {
        setExecutorVersion(ver || '1.0.0');
      });
    }

    return () => {
      window.electronAPI?.removeClientsListener?.();
    };
  }, []);

  // NOTE: Removed fallback polling — it called getClients() which returns raw
  // addon data without placeId merge, causing the client list to flicker every 1s.

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

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const notificationId = useRef(0);

  const addNotification = useCallback((notif) => {
    const id = ++notificationId.current;
    setNotifications(prev => [...prev, { ...notif, id }]);
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
    setTabs(tabs.map(t => 
      t.id === tabId ? { ...t, content } : t
    ));
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
      case 'dashboard':
        return (
          <Dashboard 
            clients={clients}
            executionCount={executionCount}
            scriptCount={tabs.length}
            startTime={startTime}
            onViewChange={setActiveView}
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
          />
        );
      case 'assistant':
        return (
          <Assistant 
            tabs={tabs}
            onWriteToTab={handleWriteToTab}
            onSwitchToExecutor={handleSwitchToExecutor}
            onNotify={addNotification}
            devMode={devMode}
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
          />
        );
    }
  };

  return (
    <ThemeProvider>
      <BackgroundOverlay />
      <div className={`app ${devTransitioning ? 'dev-mode-transition' : ''}`}>
        <TitleBar />
        <div className="app-body">
          <Sidebar
            activeView={activeView}
            onViewChange={setActiveView}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            clientCount={clients.length}
          />
          <main className="main-view">
            {renderView()}
          </main>
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

      {/* Dev Panel — rendered outside .app so it overlays everything */}
      {devMode && (
        <DevPanel
          clients={clients}
          executionCount={executionCount}
          onViewChange={setActiveView}
          onClose={() => setDevMode(false)}
          onNotify={addNotification}
          tabs={tabs}
          onWriteToTab={handleWriteToTab}
          onSwitchToExecutor={handleSwitchToExecutor}
          owner={devOwner}
        />
      )}

      {/* Notifications — rendered outside .app so they appear above DevPanel overlay */}
      <Notification notifications={notifications} onRemove={removeNotification} />

      {/* Blacklist enforcement overlay — covers everything */}
      {blacklistData && <BlacklistOverlay data={blacklistData} />}

      {/* Floating re-enter button — visible only for dev users when panel is closed */}
      {isDevUser && !devMode && !devTransitioning && (
        <button
          className="dev-reenter-btn"
          title="Re-enter Dev Mode"
          onClick={() => setDevMode(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </button>
      )}
    </ThemeProvider>
  );
}

export default App;


