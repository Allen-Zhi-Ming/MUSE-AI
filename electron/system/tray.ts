import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron';
import path from 'node:path';

let tray: Tray | null = null;

export function initTray(win: BrowserWindow | null) {
  // Use a simple icon for now. We can use an existing icon or a built-in one.
  const iconPath = path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg');
  
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    // Fallback if icon doesn't exist
    const emptyImage = nativeImage.createEmpty();
    tray = new Tray(emptyImage);
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Muse AI', enabled: false },
    { type: 'separator' },
    { label: 'Show Window', click: () => win?.show() },
    { label: 'MCP Status', click: () => { /* TODO */ } },
    { type: 'separator' },
    { label: 'Pause AI Tasks', click: () => { /* TODO */ } },
    { label: 'Quit', click: () => {
      app.quit();
    }}
  ]);

  tray.setToolTip('Muse AI Desktop');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });
}
