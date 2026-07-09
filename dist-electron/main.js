import { Tray, nativeImage, Menu, app, globalShortcut, ipcMain, safeStorage, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
let tray = null;
function initTray(win2) {
  const iconPath = path.join(process.env.VITE_PUBLIC || "", "electron-vite.svg");
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    const emptyImage = nativeImage.createEmpty();
    tray = new Tray(emptyImage);
  }
  const contextMenu = Menu.buildFromTemplate([
    { label: "Muse AI", enabled: false },
    { type: "separator" },
    { label: "Show Window", click: () => win2 == null ? void 0 : win2.show() },
    { label: "MCP Status", click: () => {
    } },
    { type: "separator" },
    { label: "Pause AI Tasks", click: () => {
    } },
    { label: "Quit", click: () => {
      app.quit();
    } }
  ]);
  tray.setToolTip("Muse AI Desktop");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (!win2 || win2.isDestroyed()) return;
    if (win2.isVisible()) {
      win2.hide();
    } else {
      win2.show();
    }
  });
}
function initHotkeys(win2) {
  const ret = globalShortcut.register("Alt+Space", () => {
    if (win2) {
      if (win2.isVisible()) {
        if (win2.isFocused()) {
          win2.hide();
        } else {
          win2.focus();
        }
      } else {
        win2.show();
      }
    }
  });
  if (!ret) {
    console.warn("Alt+Space registration failed. It might be in use.");
  }
  globalShortcut.register("CommandOrControl+K", () => {
    if (win2) {
      win2.show();
      win2.webContents.send("focus-omnibar");
    }
  });
}
function cleanupHotkeys() {
  globalShortcut.unregisterAll();
}
const getVaultPath = () => path.join(app.getPath("userData"), "muse_vault.enc");
function loadVaultData() {
  const vaultPath = getVaultPath();
  if (!fs.existsSync(vaultPath)) return {};
  try {
    const encryptedRaw = fs.readFileSync(vaultPath);
    const decrypted = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(encryptedRaw) : encryptedRaw.toString("utf-8");
    return JSON.parse(decrypted);
  } catch (e) {
    console.error("Failed to read vault", e);
    return {};
  }
}
function saveVaultData(data) {
  const vaultPath = getVaultPath();
  try {
    const dataStr = JSON.stringify(data);
    const toSave = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(dataStr) : Buffer.from(dataStr, "utf-8");
    fs.writeFileSync(vaultPath, toSave);
  } catch (e) {
    console.error("Failed to write vault", e);
  }
}
function setupVaultHandlers() {
  ipcMain.handle("vault-save", async (event, key, value) => {
    try {
      const data = loadVaultData();
      data[key] = value;
      saveVaultData(data);
      return true;
    } catch (e) {
      console.error("vault-save error", e);
      return false;
    }
  });
  ipcMain.handle("vault-load", async (event, key) => {
    try {
      const data = loadVaultData();
      return data[key] || null;
    } catch (e) {
      console.error("vault-load error", e);
      return null;
    }
  });
  ipcMain.handle("vault-delete", async (event, key) => {
    try {
      const data = loadVaultData();
      delete data[key];
      saveVaultData(data);
      return true;
    } catch (e) {
      console.error("vault-delete error", e);
      return false;
    }
  });
}
function setupInterceptor() {
  ipcMain.handle("execute-command", async (event, command) => {
    const dangerousPatterns = [
      /\brm\s+-rf\b/,
      /\bmkfs\b/,
      /\bformat\b/,
      /\bdel\s+\/s\b/i,
      />\s*\/dev\/sd[a-z]\b/,
      /\bdd\s+if=/
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          success: false,
          intercepted: true,
          message: `危險操作攔截：偵測到高風險系統指令，為保護資料安全已自動封鎖。
指令：${command}`
        };
      }
    }
    return {
      success: true,
      intercepted: false,
      message: `(Simulated) Executed successfully: ${command}`
    };
  });
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
let omniWin;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createOmniWindow() {
  omniWin = new BrowserWindow({
    width: 600,
    height: 80,
    frame: false,
    transparent: true,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (VITE_DEV_SERVER_URL) {
    omniWin.loadURL(`${VITE_DEV_SERVER_URL}#/omnibar`);
  } else {
    omniWin.loadURL(`file://${path.join(process.env.DIST, "index.html")}#/omnibar`);
  }
  omniWin.on("blur", () => {
    omniWin == null ? void 0 : omniWin.hide();
  });
}
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    // frameless UI
    transparent: true,
    // transparent background for mica/acrylic
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
  win.on("close", (event) => {
    var _a;
    if (!((_a = app.locals) == null ? void 0 : _a.isQuiting)) {
      event.preventDefault();
      win == null ? void 0 : win.hide();
    }
  });
}
setupVaultHandlers();
setupInterceptor();
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
    omniWin = null;
  }
});
app.on("before-quit", () => {
  if (!app.locals) app.locals = {};
  app.locals.isQuiting = true;
  cleanupHotkeys();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createWindow();
  createOmniWindow();
  initTray(win);
  initHotkeys(omniWin);
});
ipcMain.handle("window-action", (event, action, payload) => {
  const currentWin = BrowserWindow.fromWebContents(event.sender);
  if (!currentWin) return;
  if (action === "minimize") currentWin.minimize();
  if (action === "maximize") {
    if (currentWin.isMaximized()) currentWin.unmaximize();
    else currentWin.maximize();
  }
  if (action === "close") currentWin.close();
  if (action === "resize" && payload) {
    const { width, height, center } = payload;
    currentWin.setSize(width, height, true);
    if (center) currentWin.center();
  }
});
