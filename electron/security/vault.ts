import { ipcMain, safeStorage, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const getVaultPath = () => path.join(app.getPath('userData'), 'muse_vault.enc');

function loadVaultData(): Record<string, string> {
  const vaultPath = getVaultPath();
  if (!fs.existsSync(vaultPath)) return {};
  
  try {
    const encryptedRaw = fs.readFileSync(vaultPath);
    const decrypted = safeStorage.isEncryptionAvailable() 
      ? safeStorage.decryptString(encryptedRaw) 
      : encryptedRaw.toString('utf-8');
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Failed to read vault', e);
    return {};
  }
}

function saveVaultData(data: Record<string, string>) {
  const vaultPath = getVaultPath();
  try {
    const dataStr = JSON.stringify(data);
    const toSave = safeStorage.isEncryptionAvailable() 
      ? safeStorage.encryptString(dataStr) 
      : Buffer.from(dataStr, 'utf-8');
    fs.writeFileSync(vaultPath, toSave);
  } catch (e) {
    console.error('Failed to write vault', e);
  }
}

export function setupVaultHandlers() {
  ipcMain.handle('vault-save', async (event, key: string, value: string) => {
    try {
      const data = loadVaultData();
      data[key] = value;
      saveVaultData(data);
      return true;
    } catch (e) {
      console.error('vault-save error', e);
      return false;
    }
  });

  ipcMain.handle('vault-load', async (event, key: string) => {
    try {
      const data = loadVaultData();
      return data[key] || null;
    } catch (e) {
      console.error('vault-load error', e);
      return null;
    }
  });

  ipcMain.handle('vault-delete', async (event, key: string) => {
    try {
      const data = loadVaultData();
      delete data[key];
      saveVaultData(data);
      return true;
    } catch (e) {
      console.error('vault-delete error', e);
      return false;
    }
  });
}
