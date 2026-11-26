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
    const listener = (_event, idleSec) => callback(idleSec);
    ipcRenderer.on('system-idle-update', listener);
    return () => ipcRenderer.removeListener('system-idle-update', listener);
  },
  inactivityWarningShown: () => ipcRenderer.send('inactivity-warning-shown'),
  inactivityWarningCleared: () => ipcRenderer.send('inactivity-warning-cleared'),
  closeApp: () => ipcRenderer.send('close-app'),
  flashFrame: () => ipcRenderer.send('flash-frame'),
  showNotification: (data) => ipcRenderer.send('show-desktop-notification', data)
});
