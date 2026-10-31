const { app, BrowserWindow, ipcMain, shell, powerMonitor, session } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

const CLOUD_APP_URL = 'https://alpha.hkdigiverse.com';
const CLOUD_HEALTH_URL = 'https://alpha.hkdigiverse.com/api/health';

let mainWindow = null;
let healthCheckInterval = null;

// Ensure only one instance of the app runs at a time
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Check if the cloud server is reachable
function checkCloudHealth() {
  return new Promise((resolve) => {
    const client = CLOUD_HEALTH_URL.startsWith('https') ? https : http;
    const req = client.get(CLOUD_HEALTH_URL, { timeout: 4000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'icon.ico')
    : path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Alpha Creative CRM',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false, // Don't show until ready to prevent white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false // Keep timers, shift tracking & inactivity guards 100% active when minimized
    }
  });

  // 1. Show splash screen while verifying connection
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 2. Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('https://alpha.hkdigiverse.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 3. Navigate to Cloud CRM when ready
  connectToCloud();
}

function connectToCloud() {
  let attempts = 0;
  const maxAttempts = 15;

  if (healthCheckInterval) clearInterval(healthCheckInterval);

  const testConnection = async () => {
    attempts++;
    const isHealthy = await checkCloudHealth();

    if (isHealthy) {
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      healthCheckInterval = null;

      console.log(`[Electron] Cloud server online. Loading ${CLOUD_APP_URL}...`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(CLOUD_APP_URL);
      }
    } else if (attempts >= maxAttempts) {
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      healthCheckInterval = null;

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(
          'backend-error',
          'Could not reach https://alpha.hkdigiverse.com. Please check your internet connection or firewall.'
        );
      }
    } else {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(
          'backend-status',
          'Connecting to Alpha Creative Cloud...'
        );
      }
    }
  };

  // Run immediately then poll every 1s
  testConnection();
  healthCheckInterval = setInterval(testConnection, 1200);
}

// IPC Handlers
ipcMain.on('retry-backend-connection', () => {
  connectToCloud();
});

ipcMain.on('open-external', (_event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('get-system-idle-time', () => {
  return powerMonitor.getSystemIdleTime();
});

// App Lifecycle
app.whenReady().then(() => {
  // Automatically grant notifications, clipboard, and audio without annoying browser prompts
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['notifications', 'fullscreen', 'clipboard-read', 'clipboard-write', 'media'];
    callback(allowed.includes(permission));
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
