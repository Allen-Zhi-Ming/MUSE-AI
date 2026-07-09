import { ipcMain } from 'electron';

// A simple sandbox interceptor that checks for dangerous commands
export function setupInterceptor() {
  ipcMain.handle('execute-command', async (event, command: string) => {
    // Basic heuristics for dangerous commands
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
          message: `危險操作攔截：偵測到高風險系統指令，為保護資料安全已自動封鎖。\n指令：${command}`
        };
      }
    }

    // Since we don't have a real terminal execution backend yet, 
    // we just return simulated success for safe commands.
    // In the future, this would spawn a child process.
    return {
      success: true,
      intercepted: false,
      message: `(Simulated) Executed successfully: ${command}`
    };
  });
}
