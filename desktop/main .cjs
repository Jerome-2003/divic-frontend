const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const DIST_DIR = path.join(__dirname, "dist");
// Fixed on purpose — a random port (listen(0, ...)) would give the app a
// different origin on every launch, which CORS on the backend has no way to
// allow. Pinning it means this one origin (http://localhost:PORT) can be
// added to the backend's CLIENT_ORIGIN once and it just keeps working.
const PORT = 47521;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/**
 * The React app uses BrowserRouter, which needs a real server that falls back
 * to index.html for any route it doesn't recognise as a static file — the
 * same job Render's server does for the web deploy. Loading dist/index.html
 * straight off disk via file:// would break that fallback and every absolute
 * asset path Vite emits, so instead we spin up a tiny local HTTP server and
 * point the window at it, exactly like the production deploy already works.
 */
function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(req.url.split("?")[0]);
      let filePath = path.join(DIST_DIR, reqPath);

      // Anything that isn't a real file on disk is a client-side route —
      // hand it index.html and let React Router take over.
      if (!filePath.startsWith(DIST_DIR)) filePath = path.join(DIST_DIR, "index.html");
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, "index.html");
      }

      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });

    // Bound to a fixed port (see PORT above) instead of an OS-assigned one,
    // so this app's origin never changes between launches.
    server.listen(PORT, "127.0.0.1", () => resolve(PORT));
  });
}

async function createWindow() {
  const port = await startStaticServer();

  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "Divic Exclusive Hotels",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(`http://localhost:${port}/`);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
