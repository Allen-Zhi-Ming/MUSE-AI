import { ipcMain, BrowserWindow } from 'electron';
import { mcpOrchestrator } from '../mcp/Orchestrator.js';

export function registerMcpHandlers(win: BrowserWindow | null) {
  ipcMain.handle('mcp:status', () => {
    return mcpOrchestrator.getStatus();
  });

  ipcMain.handle('mcp:list-tools', () => {
    return mcpOrchestrator.getTools();
  });

  ipcMain.handle('mcp:call-tool', async (_, { name, args }: { name: string, args: any }) => {
    // Note: In real scenarios, AI will call this, but having an IPC endpoint helps UI testing
    return await mcpOrchestrator.callTool(name, args);
  });
}
