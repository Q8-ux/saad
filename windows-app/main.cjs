const { app, BrowserWindow, shell, session } = require('electron');
const path = require('node:path');

const APP_URL = 'https://legal-contracts-translation-fixed.onrender.com/';
const APP_ORIGIN = new URL(APP_URL).origin;

function isAllowedInternalUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f4f7fb',
    title: 'منصة العقود والترجمة القانونية',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedInternalUrl(url)) return { action: 'allow' };
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (isAllowedInternalUrl(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  win.once('ready-to-show', () => win.show());
  void win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = details.requestingUrl || webContents.getURL();
    const trusted = isAllowedInternalUrl(requestingUrl);
    const allowed = trusted && ['media', 'microphone', 'clipboard-sanitized-write'].includes(permission);
    callback(allowed);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
