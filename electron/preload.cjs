const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  retry: () => ipcRenderer.send('retry-backend-connection'),
  onStatus: (callback) => ipcRenderer.on('backend-status', (_event, value) => callback(value)),
  onError: (callback) => ipcRenderer.on('backend-error', (_event, value) => callback(value)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  getSystemIdleTime: () => ipcRenderer.invoke('get-system-idle-time')
});
