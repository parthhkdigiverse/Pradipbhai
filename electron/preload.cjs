const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
  retry: () => ipcRenderer.send('retry-backend-connection'),
  onStatus: (callback) => ipcRenderer.on('backend-status', (_event, value) => callback(value)),
  onError: (callback) => ipcRenderer.on('backend-error', (_event, value) => callback(value)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  getSystemIdleTime: () => ipcRenderer.invoke('get-system-idle-time'),
  onSystemIdle: (callback) => {
    ipcRenderer.on('system-idle-update', (_event, idleSec) => callback(idleSec));
  },
  inactivityWarningShown: () => ipcRenderer.send('inactivity-warning-shown'),
  inactivityWarningCleared: () => ipcRenderer.send('inactivity-warning-cleared')
});
