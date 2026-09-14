/**
 * Fails if an action a manager has to justify cannot actually be justified.
 *
 *   node scripts/check-overrides.mjs
 *
 * The server lets a receptionist check a guest in freely and asks a manager or
 * the owner for a reason first — it answers `requiresOverride`, the UI shows a
 * dialog, and the same call goes again carrying `{ override, overrideReason }`.
 *
 * There are two ways for that to break and neither of them is visible. A call
 * with no dialog at all refuses the manager outright; a callback written
 * `() => api.doThing(id)` instead of `(extra) => api.doThing(id, extra)` shows
 * the dialog and then retries the identical request that was just refused, so
 * the override appears to do nothing. Both shipped. Neither is a crash, a
 * warning, or a failing render — they are only ever found by an owner standing
 * at a counter unable to work.
 *
 * So this reads the two sides and compares them: every route the server guards
 * with requireOperational, against every place the app calls it.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const API = '../divic-backend/routes';
const SRC = 'src';

function filesIn(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) filesIn(join(dir, e.name), out);
    else if (/\.jsx?$/.test(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

let failures = 0;
const fail = (msg) => { failures++; console.log('  FAIL  ' + msg); };
const pass = (msg) => console.log('  ok    ' + msg);

/* ---- 1. Which api.js methods reach a route that demands an override? ---- */

/** Reduces a concrete path and a route pattern to the same shape, so
 *  `/api/bookings/${id}/check-in` and `/:id/check-in` can be compared. */
const shape = (path) => path.replace(/\$\{[^}]*\}/g, '*').replace(/:[A-Za-z]\w*/g, '*');

const guarded = new Set();
if (existsSync(API)) {
  // Each router is mounted under a prefix in server.js; a route's real path is
  // the two joined, and matching on the tail alone would confuse routes that
  // differ only by which router they live in.
  const server = existsSync('../divic-backend/server.js')
    ? readFileSync('../divic-backend/server.js', 'utf8') : '';
  const mounts = {};
  for (const [, prefix, file] of server.matchAll(/app\.use\(\s*"([^"]+)"\s*,\s*require\("\.\/routes\/([^"]+)"\)/g)) {
    mounts[file.replace(/\.js$/, '') + '.js'] = prefix;
  }

  for (const file of readdirSync(API).filter((f) => f.endsWith('.js'))) {
    const prefix = mounts[file];
    if (!prefix) continue;
    for (const line of readFileSync(join(API, file), 'utf8').split('\n')) {
      const m = line.match(/^router\.(get|post|patch|put|delete)\(\s*"([^"]+)"/);
      if (m && line.includes('requireOperational')) {
        guarded.add(m[1].toUpperCase() + ' ' + shape(prefix + (m[2] === '/' ? '' : m[2])));
      }
    }
  }
}

if (guarded.size === 0) {
  console.log('  skip  backend not checked out beside this repo; route check skipped');
} else {
  pass(guarded.size + ' route(s) require an override');

  /* Which api.js methods call them, by name.
     Split into one block per method first. A single regex sweeping the file
     runs past the end of a definition and pairs a method's name with a later
     method's URL, which reported half the read-only calls in the app as
     broken — the failure mode of a checker nobody can trust. */
  const apiSrc = readFileSync('src/lib/api.js', 'utf8');
  const starts = [...apiSrc.matchAll(/^ {2}(\w+):/gm)];
  const needsOverride = [];

  starts.forEach((m, i) => {
    const block = apiSrc.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : apiSrc.length);
    // A path is written either as a template literal or a plain quoted string,
    // and matching only the first quietly skipped every endpoint whose URL has
    // no interpolation in it — which is most of the ones that take no id.
    const call = block.match(/request\(\s*[`'"]([^`'",]+)[`'"]\s*,\s*\{([^}]*)\}/);
    if (!call) return;
    const method = (call[2].match(/method:\s*"(\w+)"/) || [, 'GET'])[1];
    if (guarded.has(method.toUpperCase() + ' ' + shape(call[1].trim()))) needsOverride.push(m[1]);
  });

  if (needsOverride.length === 0) {
    fail('no api.js method maps to a guarded route — the matcher has drifted from the code');
  } else {
    pass(needsOverride.length + ' api method(s) need one: ' + needsOverride.join(', '));
  }

  /* And every call to them must sit inside a runWithOverride. A call without
     one refuses the manager outright, with no dialog and nothing to press. */
  for (const file of filesIn(SRC)) {
    const src = readFileSync(file, 'utf8');
    for (const name of needsOverride) {
      for (const m of src.matchAll(new RegExp('api\\.' + name + '\\s*\\(', 'g'))) {
        const before = src.slice(Math.max(0, m.index - 240), m.index);
        if (!before.includes('runWithOverride(')) {
          const line = src.slice(0, m.index).split('\n').length;
          fail(`${file}:${line} — api.${name}() is called outside runWithOverride, so a ` +
            `manager or the owner is refused with no way to say why.`);
        }
      }
    }
  }
}

/* ---- 2. Every runWithOverride callback must take and use its argument ---- */

const files = filesIn(SRC);

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes('runWithOverride(')) continue;

  for (const m of src.matchAll(/runWithOverride\(\s*(?:async\s*)?\(([^)]*)\)\s*=>/g)) {
    const param = m[1].trim();
    if (!param) {
      const line = src.slice(0, m.index).split('\n').length;
      fail(`${file}:${line} — runWithOverride callback takes no argument, so the ` +
        `retry cannot carry the override. Write it as (extra) => api.thing({ ...body, ...extra }).`);
    }
  }

  // A callback that names the argument but never mentions it again is the same
  // bug wearing a disguise: it looks correct at a glance and retries the
  // refused request unchanged. Scanned over a window after the arrow rather
  // than to a closing delimiter, because the argument is passed both by
  // spreading it into a body and positionally, and a delimiter search swallows
  // the very character the earlier version of this check was looking for.
  for (const m of src.matchAll(/runWithOverride\(\s*(?:async\s*)?\((\w+)\)\s*=>/g)) {
    const param = m[1];
    const window = src.slice(m.index + m[0].length, m.index + m[0].length + 400);
    if (!new RegExp('\\b' + param + '\\b').test(window)) {
      const line = src.slice(0, m.index).split('\n').length;
      fail(`${file}:${line} — the callback names "${param}" but never passes it on, ` +
        `so the retry is the request that was just refused.`);
    }
  }
}

/* ---- 3. A component that renders no dialog can never ask ---- */

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (src.includes('runWithOverride') && !src.includes('{overrideDialog}')) {
    fail(`${file} — uses runWithOverride but never renders {overrideDialog}, so the ` +
      `confirmation can never appear.`);
  }
}

if (failures === 0) {
  console.log('\nEvery override path is wired end to end.');
} else {
  console.log(`\n${failures} override path(s) broken.`);
  process.exit(1);
}
