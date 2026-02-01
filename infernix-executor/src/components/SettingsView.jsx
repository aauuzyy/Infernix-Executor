import { useState, useEffect } from 'react';
import { FolderOpen, History } from 'lucide-react';
import './SettingsView.css';

// Changelog data
const CHANGELOG = [
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

function SettingsView() {
  const [settings, setSettings] = useState({
    topmost: false,
    autoAttach: true,
    autoExecute: false,
    closeRoblox: false,
    theme: 'dark',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

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
            className={`toggle ${settings.topmost ? 'active' : ''}`}
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
            className={`toggle ${settings.autoAttach ? 'active' : ''}`}
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
            className={`toggle ${settings.autoExecute ? 'active' : ''}`}
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
            className={`toggle ${settings.closeRoblox ? 'active' : ''}`}
            onClick={() => toggleSetting('closeRoblox')}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Folders</h3>
        <div className="folders-row">
          <button className="folder-btn" onClick={() => openFolder('autoexec')}>
            <FolderOpen size={14} />
            Autoexec
          </button>
          <button className="folder-btn" onClick={() => openFolder('workspace')}>
            <FolderOpen size={14} />
            Workspace
          </button>
          <button className="folder-btn" onClick={() => openFolder('scripts')}>
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
          <p>Version 1.0.0</p>
          <p className="muted">© 2026 Infernix Team</p>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
