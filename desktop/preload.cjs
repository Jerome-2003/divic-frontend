// Intentionally empty. The app is a pure web front end talking to the backend
// over HTTPS/WebSocket, exactly as it does in the browser — it has no need to
// reach into Node or Electron APIs from the renderer, so nothing is exposed
// here. contextIsolation stays on and nodeIntegration stays off in main.cjs.
