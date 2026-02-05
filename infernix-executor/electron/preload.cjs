const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // AI Generation
  aiGenerate: (data) => ipcRenderer.invoke('ai-generate', data),

  // ScriptBlox API (for ScriptHub)
  scriptbloxFetch: (endpoint, query) => ipcRenderer.invoke('scriptblox-fetch', { endpoint, query }),

  // Executor functions
  attach: () => ipcRenderer.invoke('executor-attach'),
  unattach: (clientPid) => ipcRenderer.invoke('executor-unattach', clientPid),
  execute: (script, clients) => ipcRenderer.invoke('executor-execute', { script, clients }),
  getClients: () => ipcRenderer.invoke('executor-get-clients'),
  killRoblox: () => ipcRenderer.invoke('executor-kill-roblox'),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  getVersion: () => ipcRenderer.invoke('executor-version'),

  // Roblox API Proxy (to avoid CORS)
  robloxGetUserInfo: (username) => ipcRenderer.invoke('roblox-get-user-info', username),
  robloxGetAvatar: (userId) => ipcRenderer.invoke('roblox-get-avatar', userId),
  robloxGetGameInfo: (placeId) => ipcRenderer.invoke('roblox-get-game-info', placeId),
  fetchClientDetails: () => ipcRenderer.invoke('fetch-client-details'),

  // Directory access
  openAutoexecDir: () => ipcRenderer.invoke('open-autoexec-dir'),
  openWorkspaceDir: () => ipcRenderer.invoke('open-workspace-dir'),
  openScriptsDir: () => ipcRenderer.invoke('open-scripts-dir'),

  // AutoExec Management
  getAutoExecScripts: () => ipcRenderer.invoke('get-autoexec-scripts'),
  addToAutoExec: (data) => ipcRenderer.invoke('add-to-autoexec', data),
  removeFromAutoExec: (name) => ipcRenderer.invoke('remove-from-autoexec', name),

  // Script management
  saveScript: (name, description, content) => ipcRenderer.invoke('save-script', { name, description, content }),
  getSavedScripts: () => ipcRenderer.invoke('get-saved-scripts'),
  loadScript: (filePath) => ipcRenderer.invoke('load-script', filePath),
  deleteScript: (filePath) => ipcRenderer.invoke('delete-script', filePath),

  // Settings persistence
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  restartApp: () => ipcRenderer.invoke('restart-app'),

  // Tabs persistence
  saveTabs: (tabs) => ipcRenderer.invoke('save-tabs', tabs),
  loadTabs: () => ipcRenderer.invoke('load-tabs'),

  // Listen for client updates (broadcast from main every 200ms)
  onClientsUpdate: (callback) => {
    ipcRenderer.on('executor-clients', (event, clients) => callback(clients));
  },

  // Remove listeners
  removeClientsListener: () => {
    ipcRenderer.removeAllListeners('executor-clients');
  },

  // ==========================================
  // V1.0.8 FEATURES
  // ==========================================

  // A/ANS - Admin Notification System
  enableANS: () => ipcRenderer.invoke('enable-ans'),
  getAdminNotifications: () => ipcRenderer.invoke('get-admin-notifications'),
  clearAdminNotifications: () => ipcRenderer.invoke('clear-admin-notifications'),
  onAdminNotification: (callback) => {
    ipcRenderer.on('admin-notification', (event, data) => callback(data));
  },
  removeAdminNotificationListener: () => {
    ipcRenderer.removeAllListeners('admin-notification');
  },

  // Automatic Updates
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  getCurrentVersion: () => ipcRenderer.invoke('get-current-version'),
  downloadUpdate: (url) => ipcRenderer.invoke('download-update', url),

  // ABS - Anti Banwave System
  checkBanwave: () => ipcRenderer.invoke('check-banwave'),
  getBanwaveStatus: () => ipcRenderer.invoke('get-banwave-status'),
  setABSEnabled: (enabled) => ipcRenderer.invoke('set-abs-enabled', enabled),
  absEmergencyShutdown: () => ipcRenderer.invoke('abs-emergency-shutdown'),
  onBanwaveAlert: (callback) => {
    ipcRenderer.on('banwave-alert', (event, data) => callback(data));
  },
  removeBanwaveListener: () => {
    ipcRenderer.removeAllListeners('banwave-alert');
  },

  // ==========================================
  // V1.1.0 FEATURES - UPDATE SYSTEM
  // ==========================================
  
  // Update progress events
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, data) => callback(data));
  },
  onUpdateComplete: (callback) => {
    ipcRenderer.on('update-complete', () => callback());
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error));
  },
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-progress');
    ipcRenderer.removeAllListeners('update-complete');
    ipcRenderer.removeAllListeners('update-error');
  },
  
  // App control
  quitApp: () => ipcRenderer.invoke('quit-app'),
});


