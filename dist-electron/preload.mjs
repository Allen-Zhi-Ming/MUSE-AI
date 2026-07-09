"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
electron.contextBridge.exposeInMainWorld("museAPI", {
  windowAction: (action, payload) => electron.ipcRenderer.invoke("window-action", action, payload),
  state: {
    save: (data) => electron.ipcRenderer.invoke("state:save", data),
    load: () => electron.ipcRenderer.invoke("state:load")
  },
  auth: {
    google: (token) => electron.ipcRenderer.invoke("auth:google", token)
  },
  file: {
    parse: (fileData) => electron.ipcRenderer.invoke("file:parse", fileData),
    exportDocument: (data) => electron.ipcRenderer.invoke("export:document", data)
  },
  ai: {
    fetchModels: (params) => electron.ipcRenderer.invoke("ai:fetch-models", params),
    chat: (params) => electron.ipcRenderer.invoke("ai:chat", params),
    generateImage: (params) => electron.ipcRenderer.invoke("ai:generate-image", params),
    onChatStreamData: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("chat-stream-data", handler);
      return () => electron.ipcRenderer.removeListener("chat-stream-data", handler);
    },
    onChatStreamDone: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("chat-stream-done", handler);
      return () => electron.ipcRenderer.removeListener("chat-stream-done", handler);
    }
  },
  vault: {
    save: (key, value) => electron.ipcRenderer.invoke("vault-save", key, value),
    load: (key) => electron.ipcRenderer.invoke("vault-load", key),
    delete: (key) => electron.ipcRenderer.invoke("vault-delete", key)
  },
  mcp: {
    status: () => electron.ipcRenderer.invoke("mcp:status"),
    listTools: () => electron.ipcRenderer.invoke("mcp:list-tools"),
    callTool: (name, args) => electron.ipcRenderer.invoke("mcp:call-tool", { name, args })
  }
});
