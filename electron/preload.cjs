const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("nexvncStorage", {
  read: () => ipcRenderer.invoke("nexvnc:read"),
  saveConnections: (value) =>
    ipcRenderer.invoke("nexvnc:save", "connections", value),
  savePreferences: (value) =>
    ipcRenderer.invoke("nexvnc:save", "preferences", value),
});
