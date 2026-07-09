import { BrowserWindow } from 'electron';
import { registerStateHandlers } from './ipc/state';
import { registerAuthHandlers } from './ipc/auth';
import { registerFileHandlers } from './ipc/files';
import { registerAiHandlers } from './ipc/ai';
import { registerMcpHandlers } from './ipc/mcp';

export function setupIpcHandlers(win: BrowserWindow | null) {
  registerStateHandlers();
  registerAuthHandlers();
  registerFileHandlers(win);
  registerAiHandlers(win);
  registerMcpHandlers(win);
  console.log("✅ All Main Process IPC handlers registered successfully.");
}
