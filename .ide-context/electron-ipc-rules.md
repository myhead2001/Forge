# Electron IPC Actionable Development Rules

## 1. Architectural Rules & Security

* **Context Isolation**: Renderer processes must run with `contextIsolation: true` and `nodeIntegration: false` in `webPreferences`.
* **APIs Exposure (Preload Script)**: Never expose the entire `ipcRenderer` object directly to the renderer. Instead, expose specific, thin wrapper functions via `contextBridge.exposeInMainWorld`.
  - *Correct Approach*:
    ```javascript
    // preload.js
    const { contextBridge, ipcRenderer } = require('electron');
    contextBridge.exposeInMainWorld('electronAPI', {
      sendMessage: (data) => ipcRenderer.send('channel-name', data)
    });
    ```
  - *Incorrect Approach (Security Risk)*:
    ```javascript
    // DO NOT DO THIS
    contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
    ```

---

## 2. IPC Message Patterns

### Pattern 1: Renderer-to-Main (One-Way)
Use this pattern when the renderer triggers an action in the main process but does not require a reply.

* **Renderer / Preload Script**:
  ```javascript
  // preload.js
  setTitle: (title) => ipcRenderer.send('set-title', title)
  ```
  ```javascript
  // renderer.js
  window.electronAPI.setTitle('New Title');
  ```
* **Main Process**:
  ```javascript
  // main.js
  ipcMain.on('set-title', (event, title) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    win.setTitle(title);
  });
  ```

### Pattern 2: Renderer-to-Main (Two-Way / Request-Response)
Use this pattern to call a main-process utility (e.g., native dialogs, database queries) and await the result.

* **Renderer / Preload Script**:
  ```javascript
  // preload.js
  openFile: () => ipcRenderer.invoke('dialog:openFile')
  ```
  ```javascript
  // renderer.js
  const filePath = await window.electronAPI.openFile();
  ```
* **Main Process**:
  ```javascript
  // main.js
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog();
    if (!canceled) {
      return filePaths[0];
    }
  });
  ```
* **Legacy Warning**: Avoid using synchronous IPC (`ipcRenderer.sendSync` / `event.returnValue`) as it blocks the renderer UI thread. Avoid using two-way communication via asynchronous `ipcRenderer.send` and a separate `event.reply` + `ipcRenderer.on` combo unless there is a specific stream-like use case.

### Pattern 3: Main-to-Renderer
Use this pattern to trigger UI updates or actions in the renderer process from the main process (e.g., native menu clicks, system tray actions).

* **Main Process**:
  ```javascript
  // main.js
  mainWindow.webContents.send('update-counter', 1);
  ```
* **Renderer / Preload Script**:
  ```javascript
  // preload.js
  onUpdateCounter: (callback) => ipcRenderer.on('update-counter', (_event, value) => callback(value))
  ```
  ```javascript
  // renderer.js
  window.electronAPI.onUpdateCounter((value) => {
    counter += value;
    document.getElementById('counter-val').innerText = counter;
  });
  ```
* **Cleanup Rule**: When renderer views unmount or change context, clean up listener subscriptions to prevent memory leaks:
  ```javascript
  // preload.js
  removeCounterListener: () => ipcRenderer.removeAllListeners('update-counter')
  ```

---

## 3. Serialization Rules

* All data sent through Electron IPC channels is serialized using the **Structured Clone Algorithm** (similar to `JSON.stringify` but supporting cyclic references, RegExps, Blobs, ArrayBuffers, Map, Set, etc.).
* **Forbidden Objects**: Prototype chains, functions, and DOM nodes cannot be sent over IPC. Attempting to send them will throw an error or result in silently dropped values.
