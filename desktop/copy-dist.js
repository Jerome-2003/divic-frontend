// Keeps the desktop packaging project fully separate from the web project's
// package.json (so Render's web deploy never installs Electron), while still
// reusing the exact same build output. Run `npm run build` in ../frontend
// first, then this copies the result in here before Electron packages it.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "dist");
const DEST = path.join(__dirname, "dist");

if (!fs.existsSync(SRC)) {
  console.error(
    "No ../dist folder found. Run `npm run build` in the frontend project first, " +
    "then re-run this."
  );
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });
console.log("Copied ../dist -> ./dist");
