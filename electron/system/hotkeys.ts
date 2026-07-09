import { globalShortcut, BrowserWindow } from 'electron';

export function initHotkeys(win: BrowserWindow | null) {
  // Register Alt+Space to toggle the omnibar/main window
  const ret = globalShortcut.register('Alt+Space', () => {
    if (win) {
      if (win.isVisible()) {
        if (win.isFocused()) {
          win.hide();
        } else {
          win.focus();
        }
      } else {
        win.show();
      }
    }
  });

  if (!ret) {
    console.warn('Alt+Space registration failed. It might be in use.');
  }

  // Register Ctrl+K as well
  globalShortcut.register('CommandOrControl+K', () => {
    if (win) {
      win.show();
      win.webContents.send('focus-omnibar');
    }
  });
}

export function cleanupHotkeys() {
  globalShortcut.unregisterAll();
}
