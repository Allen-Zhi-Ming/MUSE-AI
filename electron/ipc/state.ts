import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';

const STATE_FILE_PATH = path.join(process.cwd(), "workspace_data.json");

export function registerStateHandlers() {
  ipcMain.handle('state:save', async (_, stateData) => {
    try {
      await fs.writeFile(STATE_FILE_PATH, JSON.stringify(stateData, null, 2), "utf-8");
      return { success: true };
    } catch (err: any) {
      console.error("Save state error:", err);
      throw new Error("Failed to save state: " + err.message);
    }
  });

  ipcMain.handle('state:load', async () => {
    try {
      const data = await fs.readFile(STATE_FILE_PATH, "utf-8");
      return JSON.parse(data);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return null;
      }
      console.error("Load state error:", err);
      throw new Error("Failed to load state: " + err.message);
    }
  });
}
