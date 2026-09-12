/**
 * Builds the desktop app's Windows icon from the site's own logo.
 *
 *   node scripts/build-icon.mjs
 *
 * public/logo.png is 204x204 — under the 256x256 a tool like electron-builder
 * wants before it will auto-generate a .ico, and Windows icons are actually
 * several sizes bundled into one file (the taskbar, the title bar and a
 * jump-list tile are not the same pixel size). So this renders each size
 * explicitly with a real resample rather than leaving one tool to guess, and
 * writes the result straight into desktop/build/ — where desktop/package.json
 * already points electron-builder's `win.icon` at.
 *
 * Re-run this whenever public/logo.png changes; the .ico it writes is
 * committed like any other build asset (electron-builder and the app's own
 * runtime icon both read it directly from disk, not from a build step).
 */
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE = join(ROOT, 'public/logo.png');
const OUT_DIR = join(ROOT, 'desktop/build');
const OUT_FILE = join(OUT_DIR, 'icon.ico');

// Standard Windows icon sizes: 16/32/48 for the taskbar and title bar, 256 for
// the Start menu tile and jump list.
const SIZES = [16, 32, 48, 256];

mkdirSync(OUT_DIR, { recursive: true });

const pngBuffers = await Promise.all(
  SIZES.map((size) =>
    sharp(SOURCE)
      .resize({ width: size, height: size, kernel: 'lanczos3' })
      .png()
      .toBuffer(),
  ),
);

const ico = await pngToIco(pngBuffers);
writeFileSync(OUT_FILE, ico);

console.log(`Wrote ${OUT_FILE} (${SIZES.join('/')} px, ${(ico.length / 1024).toFixed(0)} kB)`);
