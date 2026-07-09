import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
let omniWin: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createOmniWindow() {
  omniWin = new BrowserWindow({
    width: 600,
    height: 80,
    frame: false,
    transparent: true,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    omniWin.loadURL(`${VITE_DEV_SERVER_URL}#/omnibar`);
  } else {
    omniWin.loadURL(`file://${path.join(process.env.DIST, 'index.html')}#/omnibar`);
  }

  omniWin.on('blur', () => {
    omniWin?.hide();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // frameless UI
    transparent: true, // transparent background for mica/acrylic
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }

  win.on('close', (event) => {
    // Only really close if the app is quitting
    if (!app.locals?.isQuiting) {
      event.preventDefault();
      win?.hide();
    }
  });
}

import { initTray } from './system/tray';
import { initHotkeys, cleanupHotkeys } from './system/hotkeys';
import { setupIpcHandlers } from './ipcHandlers';
import { setupVaultHandlers } from './security/vault';
import { setupInterceptor } from './security/interceptor';

setupVaultHandlers();
setupInterceptor();

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
    omniWin = null;
  }
});

app.on('before-quit', () => {
  if (!app.locals) app.locals = {};
  app.locals.isQuiting = true;
  cleanupHotkeys();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

import { mcpOrchestrator } from './mcp/Orchestrator';

app.whenReady().then(() => {
  createWindow();
  createOmniWindow();
  setupIpcHandlers(win);
  initTray(win);
  initHotkeys(omniWin);
  
  // Start the MCP local filesystem server for AI Agent
  mcpOrchestrator.startDefaultServer('c:/');
});

// Basic IPC handlers
ipcMain.handle('window-action', (event, action, payload) => {
  const currentWin = BrowserWindow.fromWebContents(event.sender);
  if (!currentWin) return;
  if (action === 'minimize') currentWin.minimize();
  if (action === 'maximize') {
    if (currentWin.isMaximized()) currentWin.unmaximize();
    else currentWin.maximize();
  }
  if (action === 'close') currentWin.close();
  if (action === 'resize' && payload) {
    const { width, height, center } = payload;
    currentWin.setSize(width, height, true);
    if (center) currentWin.center();
  }
});
