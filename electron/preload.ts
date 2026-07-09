import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

contextBridge.exposeInMainWorld('museAPI', {
  windowAction: (action: 'minimize' | 'maximize' | 'close' | 'resize', payload?: { width: number, height: number, center?: boolean }) => ipcRenderer.invoke('window-action', action, payload),
  
  state: {
    save: (data: any) => ipcRenderer.invoke('state:save', data),
    load: () => ipcRenderer.invoke('state:load')
  },
  
  auth: {
    google: (token: string) => ipcRenderer.invoke('auth:google', token)
  },
  
  file: {
    parse: (fileData: { name: string; type: string; buffer: ArrayBuffer }) => ipcRenderer.invoke('file:parse', fileData),
    exportDocument: (data: { filename: string; content: string }) => ipcRenderer.invoke('export:document', data)
  },
  
  ai: {
    fetchModels: (params: any) => ipcRenderer.invoke('ai:fetch-models', params),
    chat: (params: any) => ipcRenderer.invoke('ai:chat', params),
    generateImage: (params: any) => ipcRenderer.invoke('ai:generate-image', params),
    onChatStreamData: (callback: any) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('chat-stream-data', handler);
      return () => ipcRenderer.removeListener('chat-stream-data', handler);
    },
    onChatStreamDone: (callback: any) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('chat-stream-done', handler);
      return () => ipcRenderer.removeListener('chat-stream-done', handler);
    }
  },
  vault: {
    save: (key: string, value: string) => ipcRenderer.invoke('vault-save', key, value),
    load: (key: string) => ipcRenderer.invoke('vault-load', key),
    delete: (key: string) => ipcRenderer.invoke('vault-delete', key)
  },
  mcp: {
    status: () => ipcRenderer.invoke('mcp:status'),
    listTools: () => ipcRenderer.invoke('mcp:list-tools'),
    callTool: (name: string, args: any) => ipcRenderer.invoke('mcp:call-tool', { name, args })
  }
});
