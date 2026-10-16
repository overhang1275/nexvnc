import { app, BrowserWindow, session, ipcMain, Menu } from "electron";
import { fileURLToPath } from "node:url";
import { createAppServer } from "../server/app.js";
import { createStore } from "./store.js";

let localServer;
const profile = app.commandLine.getSwitchValue("user-data-dir");
if (profile) app.setPath("userData", profile);
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      localServer = await createAppServer();
      const store = createStore(app.getPath("userData"));
      const assertSender = (event) => {
        if (
          !event.senderFrame ||
          new URL(event.senderFrame.url).origin !== localServer.url
        )
          throw new Error("Origen no permitido.");
      };
      ipcMain.handle("nexvnc:read", (event) => {
        assertSender(event);
        return store.read();
      });
      ipcMain.handle("nexvnc:save", (event, key, value) => {
        assertSender(event);
        return store.save(key, value);
      });
      session.defaultSession.setPermissionRequestHandler(
        (_webContents, _permission, callback) => callback(false),
      );
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          ...(process.platform === "darwin"
            ? [{ role: "appMenu", label: "NexVNC" }]
            : []),
          { label: "Archivo", submenu: [{ role: "close" }, { role: "quit" }] },
          {
            label: "Editar",
            submenu: [
              { role: "undo" },
              { role: "redo" },
              { type: "separator" },
              { role: "cut" },
              { role: "copy" },
              { role: "paste" },
              { role: "selectAll" },
            ],
          },
          {
            label: "Ver",
            submenu: [
              { role: "resetZoom" },
              { role: "zoomIn" },
              { role: "zoomOut" },
              { type: "separator" },
              { role: "togglefullscreen" },
            ],
          },
          {
            label: "Ventana",
            submenu: [{ role: "minimize" }, { role: "zoom" }],
          },
        ]),
      );
      const openWindow = () => {
        const window = new BrowserWindow({
          width: 1380,
          height: 900,
          minWidth: 860,
          minHeight: 620,
          title: "NexVNC · Escritorio remoto",
          icon: fileURLToPath(new URL("../assets/icon.png", import.meta.url)),
          backgroundColor: "#f7f8fa",
          autoHideMenuBar: true,
          webPreferences: {
            preload: fileURLToPath(new URL("./preload.cjs", import.meta.url)),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        });
        window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
        window.webContents.on("will-navigate", (event, url) => {
          if (new URL(url).origin !== localServer.url) event.preventDefault();
        });
        window.loadURL(localServer.url);
      };
      openWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) openWindow();
      });
      app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
      });
      let quitting = false;
      app.on("before-quit", (event) => {
        if (quitting) return;
        event.preventDefault();
        quitting = true;
        Promise.allSettled([store.flush(), localServer.close()]).then(() =>
          app.quit(),
        );
      });
    })
    .catch((error) => {
      console.error("No se pudo iniciar NexVNC:", error);
      app.quit();
    });
}
