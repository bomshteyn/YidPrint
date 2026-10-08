// Dev seed: loads demo data into the LOCAL environment by exercising the API
// on the running dev server, then adjusts counts via wrangler d1 --local.
// Usage: node scripts/seed-dev.mjs [baseUrl]
import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'scripts', 'seed-assets');
const MOCKUP_IMG = process.env.MOCKUP_IMG ?? join(process.env.HOME, 'yidprint-mockup', 'img');
const BASE = process.argv[2] ?? 'http://localhost:5173';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'mordybstudios@gmail.com';

mkdirSync(ASSETS, { recursive: true });
if (existsSync(MOCKUP_IMG)) {
  for (const f of readdirSync(MOCKUP_IMG).filter((f) => f.endsWith('.webp'))) {
    copyFileSync(join(MOCKUP_IMG, f), join(ASSETS, f));
  }
}
const webps = readdirSync(ASSETS).filter((f) => f.endsWith('.webp'));
const stls = readdirSync(ASSETS).filter((f) => f.endsWith('.stl'));
if (!webps.length) throw new Error('No webp images found (check ~/yidprint-mockup/img)');
if (!stls.length) throw new Error('No STL files — run scripts/generate-stls.py first');

// ---------- tiny API client ----------
const jars = new Map();
async function req(who, path, { method = 'GET', body, raw, contentType } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (raw !== undefined && contentType) headers['Content-Type'] = contentType;
  if (method !== 'GET') headers['Origin'] = BASE;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) jars.set(who, setCookie.split(';')[0]);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return data;
}
function authed(who, path, opts = {}) {
  // fetch doesn't persist cookies, so pass the jar manually.
  const headers = opts.headers ?? {};
  return fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: { ...headers, Cookie: jars.get(who) ?? '', ...(opts.method && opts.method !== 'GET' ? { Origin: BASE } : {}) },
    body: opts.body,
  }).then(async (res) => {
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) throw new Error(`${opts.method ?? 'GET'} ${path} -> ${res.status}: ${text}`);
    return data;
  });
}

async function register(who, email, username, display_name, role) {
  const res = await fetch(BASE + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ email, password: 'devpassword123', username, display_name }),
  });
  const sc = res.headers.get('set-cookie');
  if (sc) jars.set(who, sc.split(';')[0]);
  const text = await res.text();
  if (!res.ok && res.status !== 409) throw new Error(`register ${who}: ${res.status} ${text}`);
  // If the user already exists, log in instead.
  if (res.status === 409) {
    const res2 = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: JSON.stringify({ email, password: 'devpassword123' }),
    });
    const sc2 = res2.headers.get('set-cookie');
    if (sc2) jars.set(who, sc2.split(';')[0]);
    if (!res2.ok) throw new Error(`login ${who}: ${res2.status} ${await res2.text()}`);
  }
}

const pick = (arr, i) => arr[i % arr.length];

const MODELS = [
  { title: 'Shabbos Lamp', cat: 'shabbos', img: ['shabbos-lamp.webp', 'shabbos-lamp-alt.webp', 'shabbos-lamp-lifestyle.webp'], stl: 'cup.stl', tags: ['shabbos', 'lamp', 'light'], license: 'CC BY' },
  { title: 'Meridian Netilas Yadayim Cup', cat: 'netilas-yadayim', img: ['netila-cup-meridian-styled.webp'], stl: 'cup.stl', tags: ['netilas yadayim', 'washing cup'], license: 'CC BY-SA' },
  { title: 'Orbit Netilas Yadayim Cup', cat: 'netilas-yadayim', img: ['netila-cup-orbit-styled.webp'], stl: 'cup.stl', tags: ['netilas yadayim'], license: 'CC BY' },
  { title: 'Quad Netilas Yadayim Cup', cat: 'netilas-yadayim', img: ['netila-cup-quad-styled.webp'], stl: 'cup.stl', tags: ['washing cup', 'negel vasser'], license: 'CC BY-NC' },
  { title: 'Apex Mezuzah Case', cat: 'mezuzah', img: ['mezuzah-apex.webp'], stl: 'mezuzah-tube.stl', tags: ['mezuzah'], license: 'CC BY' },
  { title: 'Bisect Mezuzah Case', cat: 'mezuzah', img: ['mezuzah-bisect.webp'], stl: 'mezuzah-tube.stl', tags: ['mezuzah', 'modern'], license: 'CC BY-SA' },
  { title: 'Oblique Mezuzah Case', cat: 'mezuzah', img: ['mezuzah-oblique.webp'], stl: 'mezuzah-tube.stl', tags: ['mezuzah'], license: 'CC0' },
  { title: 'Esrog Holder', cat: 'yom-tov', img: ['esrog-holder-cover.webp'], stl: 'box-with-lid.stl', tags: ['esrog', 'sukkos'], license: 'CC BY' },
  { title: 'Esrog Case', cat: 'yom-tov', img: ['esrog-case.webp'], stl: 'box.stl', tags: ['esrog', 'sukkos', 'case'], license: 'CC BY-NC' },
  { title: 'Megillah Case', cat: 'yom-tov', img: ['megillah-case-cover.webp'], stl: 'mezuzah-tube.stl', tags: ['megillah', 'purim'], license: 'CC BY' },
  { title: 'Tzedakah Box', cat: 'tzedakah', img: ['tzedakah-box.webp', 'tzedakah-box-alt.webp'], stl: 'box-with-lid.stl', tags: ['tzedakah', 'pushka'], license: 'CC BY-SA' },
  { title: 'Challah & Salt Holder', cat: 'shabbos', img: ['challah-salt-holder.webp'], stl: 'box.stl', tags: ['challah', 'salt', 'shabbos'], license: 'CC BY' },
  { title: 'Radial Wall Clock', cat: 'home', img: ['radial-wall-clock-lifestyle.webp'], stl: 'cylinder-hole.stl', tags: ['clock', 'wall'], license: 'CC BY-NC-SA' },
  { title: 'Comb Card', cat: 'tools', img: ['comb-card.webp'], stl: 'box.stl', tags: ['comb', 'card', 'pocket'], license: 'CC0' },
  { title: 'Shtender Book Stand', cat: 'shul-seforim', img: ['shtender.webp'], stl: 'box.stl', tags: ['shtender', 'seforim', 'learning'], license: 'CC BY' },
  { title: 'Dreidel Spinning Top', cat: 'chanukah', img: [webps[0]], stl: 'cube.stl', tags: ['dreidel', 'chanukah', 'toy'], license: 'CC BY' },
  { title: 'Afikoman Bag Clip', cat: 'pesach', img: [webps[1]], stl: 'box.stl', tags: ['pesach', 'afikoman'], license: 'Personal use only' },
  { title: 'Alef-Bais Puzzle Tiles', cat: 'chinuch-kids', img: [webps[2]], stl: 'cube.stl', tags: ['alef bais', 'kids', 'chinuch'], license: 'CC BY-NC' },
];
const PENDING = [
  { title: 'Menorah Oil Cup Inserts', cat: 'chanukah', img: [webps[3] ?? webps[0]], stl: 'cylinder-hole.stl', tags: ['menorah', 'chanukah'], license: 'CC BY' },
  { title: 'Shabbos Candle Drip Tray', cat: 'shabbos', img: [webps[4] ?? webps[0]], stl: 'cylinder-hole.stl', tags: ['candles', 'shabbos'], license: 'CC BY-SA' },
];

function filePayload(path, contentType) {
  return { body: readFileSync(path), contentType };
}

async function upload(who, modelId, kind, path, filename, contentType) {
  const res = await fetch(
    `${BASE}/api/models/${modelId}/files?kind=${kind}&filename=${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': contentType, Cookie: jars.get(who) ?? '', Origin: BASE },
      body: readFileSync(path),
    }
  );
  if (!res.ok) throw new Error(`upload ${filename}: ${res.status} ${await res.text()}`);
}

async function makeModel(who, spec) {
  const { model } = await authed(who, '/api/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: spec.title,
      description: `${spec.title} — a printable design for the frum home. Printed in PLA, 0.2mm layers, 15% infill.`,
      category_slug: spec.cat,
      tags: spec.tags,
      license: spec.license,
      print_settings: { material: 'PLA', layer_height: '0.2mm', infill: '15%', supports: 'No', print_time: '3-5 hours' },
    }),
  });
  for (const img of spec.img) {
    await upload(who, model.id, 'image', join(ASSETS, img), img, 'image/webp');
  }
  await upload(who, model.id, 'model', join(ASSETS, spec.stl), spec.stl, 'application/octet-stream');
  await authed(who, `/api/models/${model.id}/submit`, { method: 'POST' });
  return model;
}

console.log('Registering users…');
await register('admin', ADMIN_EMAIL, 'mordyb', 'Mordy B');
await register('creator', 'creator@yidprint.dev', 'printyid', 'Print Yid');

console.log('Creating approved models…');
const approvedIds = [];
for (const spec of MODELS) {
  const m = await makeModel('creator', spec);
  await authed('admin', `/api/admin/models/${m.id}/approve`, { method: 'POST' });
  approvedIds.push(m.id);
  console.log(' approved:', spec.title);
}
console.log('Creating pending models…');
for (const spec of PENDING) {
  await makeModel('creator', spec);
  console.log(' pending:', spec.title);
}

// Vary likes/downloads counts directly in local D1.
console.log('Setting likes/downloads counts…');
const updates = approvedIds
  .map((id, i) => `UPDATE models SET likes_count=${(i * 7) % 40 + 3}, downloads_count=${(i * 37) % 300 + 20} WHERE id='${id}';`)
  .join('\n');
execSync(`npx wrangler d1 execute yidprint --local --command "${updates.replace(/"/g, '\\"')}"`, {
  cwd: ROOT,
  stdio: 'inherit',
});

console.log('Seed complete.');
