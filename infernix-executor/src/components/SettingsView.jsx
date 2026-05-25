import { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, Settings2, Wand2, XCircle, Package, 
  Download, RefreshCw, RotateCcw, Palette, Sun, Moon, Image, BookOpen
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './SettingsView.css';
import AutoExecManager from './AutoExecManager';
import WorkspaceEditor from './WorkspaceEditor';
import PresetManager from './PresetManager';


// Changelog data
const CHANGELOG = [
  {
    version: '1.4.0',
    date: 'May 1 2026',
    changes: [
      'Xeno DLL updated to v1.3.45 for latest Roblox support',
      'Premium Keys system — INFERNIX-PREMIUM-XXXX keys unlock permanent access',
      'Kimi K2.6 AI integration for premium users with live thinking UI',
      'Gemini image upload support in AI Assistant',
      'Update checker on loading screen — detects new versions from website',
      'AI model picker in Assistant tab and sidebar — switch between Kimi and Gemini',
      'Renderer crash auto-reload and Error Boundary for blank screen fixes',
      'Bug fixes and stability improvements',
    ]
  },
  {
    version: '1.3.7',
    date: 'April 30 2026',
    changes: [
      'TitleBar now fully theme-aware — changes with Dark, Light, and Midnight themes',
      'Executor tab bar, toolbar, and Monaco editor now follow theme settings',
      'Loading screen redesigned with real asset counts and smooth animations',
      'Skip button added to loading screen with Space key shortcut',
      'Execution history auto-records on all execution paths',
      'Discord logo updated with eyes in TitleBar',
      'Background effect presets removed for cleaner UI',
      'Bug fixes and stability improvements',
    ]
  },
  {
    version: '1.3.0',
    date: 'February 25 2026',
    changes: [
      'Discord & Website quick links added to Dashboard',
      'Theme-aware colors throughout UI — all accents now follow your chosen color',
      'AI Assistant reliability fix — responses now work correctly',
      'Notification system polish — notifications always visible above all overlays',
      'UI consistency and glow effect improvements',
      'Bug fixes and stability improvements',
    ]
  },
  {
    version: '1.2.9.5',
    date: 'February 24 2026',
    changes: [
      'UI polish and layout improvements across all views',
      'Improved client detection reliability and stability',
      'Notification system overhaul — now appears above all overlays',
      'Performance improvements to executor attachment loop',
      'Minor bug fixes and internal optimizations',
    ]
  },
  {
    version: '1.2.9',
    date: 'February 23 2026',
    changes: [
      'Hook Function - 3 templates (hookfunction, hookmetamethod namecall, hookmetamethod index)',
      'AutoExec quick-access button in executor toolbar',
      'Fixed Auto Attach - per-PID retry with warm-up, no more UI breakage in-game',
      'Fixed Auto Execute - stable 5s delay, retry on failure, removed duplicate settings re-read',
      'Fixed Close Roblox on Exit - actually kills Roblox on close now',
      'Fixed Executions counter on Dashboard - live updates',
      'Fixed GIF backgrounds - blur works on animated GIFs',
      'Removed Workspace from Settings (temporary)',
    ]
  },
  {
    version: '1.2.8',
    date: 'February 22 2026',
    changes: [
      'Custom Background - Set any image as the app background',
      'Live blur slider for background intensity control',
      'Monaco editor transparency when custom background is active',
      'Overview ruler & minimap blend with custom backgrounds',
      'Background persists across app restarts',
    ]
  },
  {
    version: '1.2.7',
    date: 'February 2026',
    changes: [
      'Fixed DLL - Executor DLL updated and working',
    ]
  },
  {
    version: '1.2.6',
    date: 'February 11 2026',
    changes: [
      'Fixed switcher/toggle UI (missing class) and removed stray corner knob',
      'Bumped app version to v1.2.6',
      'Minor UI polish and styling fixes'
    ]
  },
  {
    version: '1.1.5',
    date: 'February 2026',
    changes: [
      '?? Fixed Auto-Update Installer - Now properly launches after app closes',
      '? Uses spawn with detached process for reliable updates',
    ]
  },
  {
    version: '1.1.4',
    date: 'February 2026',
    changes: [
      '?? Fixed Premium Script Execution - Large scripts now execute properly',
      '?? Improved Script Hub Execution - Uses IPC for reliability',
      '?? Fixed Content-Length headers for script payloads',
    ]
  },
  {
    version: '1.1.3',
    date: 'February 2026',
    changes: [
      '?? Fixed Auto-Update - Updates now install correctly',
      '?? Drag & Drop Scripts - Drop .lua/.txt files onto editor',
      '?? Auto-Lint on file drop',
    ]
  },
  {
    version: '1.1.2',
    date: 'February 2026',
    changes: [
      '?? Drag & Drop Scripts - Drop .lua/.txt files directly onto editor',
      '?? Auto-Lint - Automatic syntax checking on file drop',
      '?? Fixed Debug Console setting not being respected',
    ]
  },
  {
    version: '1.1.1',
    date: 'February 2026',
    changes: [
      '?? Custom Update UI - Fire-themed in-app update modal',
      '?? In-App Updates - Downloads without opening browser',
      '?? Fixed GitHub API Redirect issue for updates',
    ]
  },
  {
    version: '1.0.9',
    date: 'February 2026',
    changes: [
      '?? Custom Themes - Dark, Light, Midnight modes',
      '?? Accent Color Picker with presets',
      '?? RGB Color Shift animation',
      '?? Fixed AutoExec to actually work on attach',
      '? Auto-Attach with AutoExec support',
    ]
  },
  {
    version: '1.0.8',
    date: 'February 2026',
    changes: [
      '?? A/ANS - Admin Notification System (alerts when game owner/admin joins)',
      '?? Automatic Update Checker - checks GitHub for new versions',
      '??? ABS - Anti Banwave System - monitors for banwaves',
      '? Emergency shutdown button for quick escape',
      '?? New security settings panel',
    ]
  },
  {
    version: '1.0.7',
    date: 'February 2026',
    changes: [
      '?? AutoExec now actually runs scripts on attach',
      '?? Kill Roblox button in Dashboard and Settings',
      '?? Fixed Workspace AI chat scrolling',
      '?? Fixed chat message bubbles display',
      '?? All settings buttons now functional',
    ]
  },
  {
    version: '1.0.6',
    date: 'February 2026',
    changes: [
      '? AutoExec Manager - Select tabs and add to autoexec',
      '? Workspace Script Editor with AI assistance',
      '?? AI Assistant now helps EDIT scripts',
      '??? Script Tools: Loop, Function, Event, GUI, ESP templates',
    ]
  },
];

function SettingsView({ tabs, onNewTab, onSwitchToExecutor, onStartTutorial, onNotify }) {
  const { 
    themeMode, setThemeMode, 
    accentColor, setAccentColor, 
    colorShift, setColorShift,
    accentPresets,
    customBackground, setCustomBackground,
    backgroundBlur, setBackgroundBlur
  } = useTheme();
  
  const bgFileInputRef = useRef(null);
  
  const [settings, setSettings] = useState({
    autoAttach: true,
    autoExecute: false,
    closeRoblox: false,
    autoCheckUpdates: true,
    debugConsole: false,
    topmost: false,
    theme: 'dark',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const saveNotifyTimerRef = useRef(null);
  const [showAutoExec, setShowAutoExec] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const [killing, setKilling] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.4.0');

  // Default to the new packaged version
  // (will be replaced by value returned from main process if available)
  
  

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await window.electronAPI?.loadSettings();
        if (saved) {
          setSettings(prev => ({ ...prev, ...saved }));
          if (saved.topmost) {
            await window.electronAPI?.setAlwaysOnTop?.(true);
          }
        }
        const version = await window.electronAPI?.getCurrentVersion?.();
        if (version) setCurrentVersion(version);
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
    
    // Check for updates on load
    checkForUpdates();
    

  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!settingsLoaded) return;
    window.electronAPI?.saveSettings({ ...settings, themeMode, accentColor, colorShift });
    
    // Debounced save notification — fires 1.5s after the last change
    clearTimeout(saveNotifyTimerRef.current);
    saveNotifyTimerRef.current = setTimeout(() => {
      onNotify?.({ type: 'success', title: 'Settings Saved', message: 'Your settings have been saved' });
    }, 1500);
  }, [settings, settingsLoaded, themeMode, accentColor, colorShift]);

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

  const checkForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const result = await window.electronAPI?.checkUpdates?.();
      setUpdateInfo(result);
    } catch (e) {
      console.error('Failed to check updates:', e);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleDownloadUpdate = async () => {
    // Open Linkvertise download page in browser
    await window.electronAPI?.openExternal?.('https://link-target.net/2362148/t1FxoExXLLZX');
  };

  const handleResetSettings = async () => {
    if (confirm('Reset all settings to defaults? This will restart the app.')) {
      await window.electronAPI?.resetSettings?.();
      window.electronAPI?.restartApp?.();
    }
  };

  const handleToggleDebugConsole = async () => {
    const newValue = !settings.debugConsole;
    setSettings(prev => ({ ...prev, debugConsole: newValue }));
    await window.electronAPI?.toggleDebugConsole?.(newValue);
  };

  const handleToggleTopmost = async () => {
    const newValue = !settings.topmost;
    setSettings(prev => ({ ...prev, topmost: newValue }));
    await window.electronAPI?.setAlwaysOnTop?.(newValue);
  };

  const handleBgFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomBackground(ev.target.result);
    };
    reader.readAsDataURL(file);
    // reset so the same file can be re-selected
    e.target.value = '';
  };

  const getToggleClass = (isActive) => {
    return 'toggle' + (isActive ? ' active' : '');
  };

  return (
    <div className="settings-view">
      <h2 className="settings-title">Settings</h2>

      {/* Update Banner */}
      {updateInfo?.hasUpdate && (
        <div className="update-banner">
          <div className="update-info">
            <Download size={18} />
            <div>
              <strong>Update Available!</strong>
              <span>v{updateInfo.latestVersion} is now available</span>
            </div>
          </div>
          <button className="folder-btn" onClick={handleDownloadUpdate}>
            Download Now
          </button>
        </div>
      )}

      <div className="settings-section">
        <h3 className="section-title">General</h3>

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

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Always on Top</span>
            <span className="setting-desc">Keep Infernix window above all others</span>
          </div>
          <button
            className={getToggleClass(settings.topmost)}
            onClick={handleToggleTopmost}
          >
            <span className="toggle-knob" />
          </button>
        </div>


      </div>

      {/* Theme Section */}
      <div className="settings-section">
        <h3 className="section-title">Appearance</h3>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Theme Mode</span>
            <span className="setting-desc">Choose your preferred theme</span>
          </div>
          <div className="theme-buttons">
            <button
              className={`theme-btn ${themeMode === 'dark'? 'active': ''}`}
              onClick={() => setThemeMode('dark')}
            >
              <Moon size={14} />
              Dark
            </button>
            <button
              className={`theme-btn ${themeMode === 'light'? 'active': ''}`}
              onClick={() => setThemeMode('light')}
            >
              <Sun size={14} />
              Light
            </button>
            <button
              className={`theme-btn ${themeMode === 'midnight'? 'active': ''}`}
              onClick={() => setThemeMode('midnight')}
            >
              <Moon size={14} />
              Midnight
            </button>
            <button
              className={`theme-btn ${themeMode === 'forest'? 'active': ''}`}
              onClick={() => setThemeMode('forest')}
            >
              <span style={{ fontSize: 14 }}>🌿</span>
              Forest
            </button>
          </div>
        </div>
      </div>

      {/* Custom Background Section */}
      <div className="settings-section">
        <h3 className="section-title">Custom Background</h3>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Custom Background</span>
            <span className="setting-desc">Set a background and choose your blur</span>
          </div>
        </div>
        <div className="bg-controls-row">
          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBgFileChange}
          />
          <button
            className="folder-btn"
            onClick={() => bgFileInputRef.current?.click()}
          >
            <Image size={14} />
            Add Background
          </button>
          <div className="blur-slider-row">
            <span className="blur-label">Blur</span>
            <input
              type="range"
              min={0}
              max={100}
              value={backgroundBlur}
              onChange={(e) => setBackgroundBlur(Number(e.target.value))}
              className="blur-slider"
            />
            <span className="blur-value">{backgroundBlur}%</span>
          </div>
        </div>
        {customBackground && (
          <div className="bg-thumbnails-row">
            <div className="bg-thumbnail-item">
              <img src={customBackground} alt="Custom background" className="bg-thumbnail" />
              <button
                className="bg-remove-btn"
                onClick={() => setCustomBackground(null)}
                title="Remove background"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3 className="section-title">Actions</h3>
        <div className="folders-row">
          <button className="folder-btn" onClick={handleKillRoblox} disabled={killing}>
            <XCircle size={14} />
            {killing ? 'Killing...': 'Kill Roblox'}
          </button>
          <button 
            className="folder-btn" 
            onClick={checkForUpdates} 
            disabled={checkingUpdates}
          >
            <RefreshCw size={14} className={checkingUpdates ? 'spinning': ''} />
            {checkingUpdates ? 'Checking...': 'Check Updates'}
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
            <button className="folder-btn" onClick={() => setShowPresets(true)}>
              <Package size={14} />
              Manage Presets
            </button>
          </div>
          <div className="folders-row" style={{ marginTop: '8px'}}>
          <button className="folder-btn" onClick={() => openFolder('autoexec')}>
            <FolderOpen size={14} />
            Autoexec
          </button>
          <button className="folder-btn" onClick={() => openFolder('scripts')}>
            <FolderOpen size={14} />
            Saved Scripts
          </button>
        </div>
      </div>

      
      <div className="settings-section">
        <h3 className="section-title">Developer</h3>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Debug Console</span>
            <span className="setting-desc">Open PowerShell window showing live logs</span>
          </div>
          <button
            className={getToggleClass(settings.debugConsole)}
            onClick={handleToggleDebugConsole}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <div className="folders-row" style={{ marginTop: '12px', gap: '8px' }}>
          <button className="folder-btn" onClick={handleResetSettings}>
            <RotateCcw size={14} />
            Reset All Settings
          </button>
          <button className="folder-btn" onClick={() => {
            localStorage.removeItem('infernix_access_key');
            localStorage.removeItem('infernix_key_expiry');
            window.location.reload();
          }}>
            <XCircle size={14} />
            Clear Access Key
          </button>
          <button className="folder-btn" onClick={() => onStartTutorial?.()}>
            <BookOpen size={14} />
            Start Tutorial
          </button>
        </div>
      </div>
      <div className="settings-section">
        <h3 className="section-title">About</h3>
        <div className="about-info">
          <p><strong>Infernix Executor</strong></p>
          <p>Version {currentVersion}</p>
          <p className="muted">&copy; 2026 Infernix Team</p>
        </div>
      </div>

      {showAutoExec && (
        <AutoExecManager
          tabs={tabs || []}
          onClose={() => setShowAutoExec(false)}
        />
      )}

      {/* WorkspaceEditor hidden until re-enabled */}

      {showPresets && (
        <PresetManager
          isOpen={showPresets}
          onClose={() => setShowPresets(false)}
          onLoad={(preset) => {
            if (preset.settings) setSettings(prev => ({ ...prev, ...preset.settings }));
            if (preset.theme) {
              if (preset.theme.themeMode) setThemeMode(preset.theme.themeMode);
              if (preset.theme.accentColor) setAccentColor(preset.theme.accentColor);
              if (preset.theme.colorShift !== undefined) setColorShift(preset.theme.colorShift);
            }
            alert('Preset loaded successfully!');
          }}
          currentSettings={settings}
          currentTheme={{ themeMode, accentColor, colorShift }}
          currentTabs={tabs || []}
        />
      )}
    </div>
  );
}

export default SettingsView;






