const { app, BrowserWindow, ipcMain, shell, powerMonitor, session, dialog, nativeImage } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

const CLOUD_APP_URL = 'https://alpha.hkdigiverse.com';
const CLOUD_HEALTH_URL = 'https://alpha.hkdigiverse.com/api/health';

let mainWindow = null;
let healthCheckInterval = null;
let isAppQuitting = false;

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

  // 4. Start system-wide idle activity broadcaster
  startSystemIdleBroadcaster();

  // 5. Intercept window close to prompt confirmation pop-up
  mainWindow.on('close', async (event) => {
    if (isAppQuitting) {
      return;
    }

    event.preventDefault();

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    let dialogIcon = undefined;
    if (fs.existsSync(iconPath)) {
      try {
        dialogIcon = nativeImage.createFromPath(iconPath);
      } catch {}
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Cancel', 'Yes, Close Application'],
      defaultId: 0,
      cancelId: 0,
      title: 'Exit Alpha Creative CRM',
      message: 'Are you sure you want to close the software?',
      detail: 'Please make sure any active shifts or jobs in progress are saved before exiting.',
      icon: dialogIcon,
      noLink: true
    });

    if (response === 1) {
      isAppQuitting = true;
      stopSystemIdleBroadcaster();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
      app.quit();
    }
  });

  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.flashFrame(false);
    }
  });

  mainWindow.on('closed', () => {
    stopSystemIdleBroadcaster();
    mainWindow = null;
  });
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

ipcMain.on('close-app', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.on('flash-frame', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(true);
  }
});

ipcMain.handle('get-system-idle-time', () => {
  try {
    return powerMonitor.getSystemIdleTime();
  } catch (err) {
    console.warn('[Electron] Failed to get system idle time:', err);
    return 0;
  }
});

// Inactivity warning notification handlers
ipcMain.on('inactivity-warning-shown', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.flashFrame(true);
  }
});

ipcMain.on('inactivity-warning-cleared', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(false);
  }
});

// Periodic system idle broadcaster to renderer (runs at Node.js level, immune to renderer throttling)
let systemIdleInterval = null;

function startSystemIdleBroadcaster() {
  if (systemIdleInterval) clearInterval(systemIdleInterval);
  systemIdleInterval = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      try {
        const idleSec = powerMonitor.getSystemIdleTime();
        mainWindow.webContents.send('system-idle-update', idleSec);
      } catch (err) {
        // powerMonitor may fail before fully ready or on unsupported desktop environments
      }
    }
  }, 1000);
}

function stopSystemIdleBroadcaster() {
  if (systemIdleInterval) {
    clearInterval(systemIdleInterval);
    systemIdleInterval = null;
  }
}

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

app.on('before-quit', (event) => {
  if (!isAppQuitting) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      event.preventDefault();
      mainWindow.close();
    }
  }
});

app.on('will-quit', () => {
  stopSystemIdleBroadcaster();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
