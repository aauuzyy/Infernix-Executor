import { useState, useEffect } from 'react';
import { FolderOpen, History, Settings2, Wand2, XCircle } from 'lucide-react';
import AutoExecManager from './AutoExecManager';
import WorkspaceEditor from './WorkspaceEditor';
import './SettingsView.css';

// Changelog data
const CHANGELOG = [
  {
    version: '1.0.7',
    date: 'February 2026',
    changes: [
      '🔥 AutoExec now actually runs scripts on attach',
      '🔥 Kill Roblox button in Dashboard and Settings',
      '🔥 Fixed Workspace AI chat scrolling',
      '🔥 Fixed chat message bubbles display',
      '🔥 All settings buttons now functional',
      '🔥 Improved overall stability',
    ]
  },
  {
    version: '1.0.6',
    date: 'February 2026',
    changes: [
      '✨ NEW: AutoExec Manager - Select tabs and add to autoexec',
      '✨ NEW: Workspace Script Editor with AI assistance',
      '🤖 AI Assistant now helps EDIT scripts, not rewrite',
      '🛠️ Script Tools: Loop, Function, Event, GUI, ESP templates',
      '📋 One-click insert code snippets from AI',
      '📁 Enhanced folder management UI',
      '🎨 Improved fire theme throughout',
      '🐛 Fixed Roblox detection in packaged app',
    ]
  },
  {
    version: '1.0.0',
    date: 'February 2026',
    changes: [
      '🚀 Initial release of Infernix Executor',
      '🔥 Complete UI overhaul with fire theme',
      '💾 Script saving with custom names and descriptions',
      '📂 Open saved scripts with professional modal UI',
      '👤 Client Manager shows avatar, nickname, and game info',
      '🎮 ScriptHub with automatic game detection',
      '💬 AI Assistant for script generation',
      '📊 Dashboard with live stats and quick actions',
      '🔇 Silent operation - no executor branding',
      '💾 Persistent tabs - scripts saved between sessions',
      '⚙️ Settings persistence',
    ]
  }
];

function SettingsView({ tabs, onNewTab, onSwitchToExecutor }) {
  const [settings, setSettings] = useState({
    topmost: false,
    autoAttach: true,
    autoExecute: false,
    closeRoblox: false,
    theme: 'dark',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showAutoExec, setShowAutoExec] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [killing, setKilling] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await window.electronAPI?.loadSettings();
        if (saved) {
          setSettings(prev => ({ ...prev, ...saved }));
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!settingsLoaded) return;
    window.electronAPI?.saveSettings(settings);
  }, [settings, settingsLoaded]);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openFolder = async (type) => {
    if (type === 'autoexec') {
      await window.electronAPI?.openAutoexecDir();
    } else if (type === 'workspace') {
      await window.electronAPI?.openWorkspaceDir();
    } else if (type === 'scripts') {
      await window.electronAPI?.openScriptsDir();
    }
  };

  const handleWorkspaceDone = (scriptData) => {
    setShowWorkspace(false);
    if (onNewTab && scriptData) {
      onNewTab(scriptData);
      if (onSwitchToExecutor) {
        onSwitchToExecutor();
      }
    }
  };

  const handleKillRoblox = async () => {
    setKilling(true);
    try {
      await window.electronAPI?.killRoblox?.();
    } catch (e) {
      console.error('Failed to kill Roblox:', e);
    } finally {
      setTimeout(() => setKilling(false), 1000);
    }
  };

  const getToggleClass = (isActive) => {
    return 'toggle' + (isActive ? ' active' : '');
  };

  return (
    <div className="settings-view">
      <h2 className="settings-title">Settings</h2>

      <div className="settings-section">
        <h3 className="section-title">General</h3>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Always on Top</span>
            <span className="setting-desc">Keep Infernix above other windows</span>
          </div>
          <button
            className={getToggleClass(settings.topmost)}
            onClick={() => toggleSetting('topmost')}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Auto Attach</span>
            <span className="setting-desc">Automatically attach to new Roblox clients</span>
          </div>
          <button
            className={getToggleClass(settings.autoAttach)}
            onClick={() => toggleSetting('autoAttach')}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Auto Execute</span>
            <span className="setting-desc">Run autoexec scripts on attach</span>
          </div>
          <button
            className={getToggleClass(settings.autoExecute)}
            onClick={() => toggleSetting('autoExecute')}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Close Roblox on Exit</span>
            <span className="setting-desc">Terminate Roblox when closing Infernix</span>
          </div>
          <button
            className={getToggleClass(settings.closeRoblox)}
            onClick={() => toggleSetting('closeRoblox')}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Actions</h3>
        <div className="folders-row">
          <button className="folder-btn danger" onClick={handleKillRoblox} disabled={killing}>
            <XCircle size={14} />
            {killing ? 'Killing...' : 'Kill Roblox'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Folders & Tools</h3>
        <div className="folders-row">
          <button className="folder-btn" onClick={() => setShowAutoExec(true)}>
            <Settings2 size={14} />
            Manage AutoExec
          </button>
          <button className="folder-btn" onClick={() => setShowWorkspace(true)}>
            <Wand2 size={14} />
            Open Workspace
          </button>
        </div>
        <div className="folders-row" style={{ marginTop: '8px' }}>
          <button className="folder-btn secondary" onClick={() => openFolder('autoexec')}>
            <FolderOpen size={14} />
            Autoexec
          </button>
          <button className="folder-btn secondary" onClick={() => openFolder('workspace')}>
            <FolderOpen size={14} />
            Workspace
          </button>
          <button className="folder-btn secondary" onClick={() => openFolder('scripts')}>
            <FolderOpen size={14} />
            Saved Scripts
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">
          <History size={14} />
          Changelog
        </h3>
        {CHANGELOG.map((release, i) => (
          <div key={i} className="changelog-card">
            <div className="changelog-header">
              <span className="version-badge">v{release.version}</span>
              <span className="release-date">{release.date}</span>
            </div>
            <ul className="changelog-list">
              {release.changes.map((change, j) => (
                <li key={j}>{change}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <h3 className="section-title">About</h3>
        <div className="about-info">
          <p><strong>Infernix Executor</strong></p>
          <p>Version 1.0.7</p>
          <p className="muted">© 2026 Infernix Team</p>
        </div>
      </div>

      {showAutoExec && (
        <AutoExecManager
          tabs={tabs || []}
          onClose={() => setShowAutoExec(false)}
        />
      )}

      {showWorkspace && (
        <WorkspaceEditor
          onDone={handleWorkspaceDone}
          onClose={() => setShowWorkspace(false)}
        />
      )}
    </div>
  );
}

export default SettingsView;
