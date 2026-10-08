import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import {
  hashPassword,
  verifyPassword,
  randomToken,
  sha256Hex,
  slugify,
  randomSuffix,
} from './auth';
import {
  getFileStore,
  sanitizeFilename,
  extensionOf,
  MODEL_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MAX_MODEL_FILE_BYTES,
  MAX_IMAGE_BYTES,
  contentTypeFor,
} from './storage';

type Variables = { user: AuthUser | null };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const SESSION_COOKIE = 'yp_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 24;
export const LICENSES = [
  'CC BY',
  'CC BY-SA',
  'CC BY-NC',
  'CC BY-NC-SA',
  'CC0',
  'Personal use only',
];

function adminEmails(env: Env): string[] {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(env: Env, email: string): boolean {
  return adminEmails(env).includes(email.toLowerCase());
}

// ---------- middleware ----------

// CSRF: mutating requests must send an Origin matching the request host.
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('Origin');
    if (!origin) return c.json({ error: 'Missing Origin header' }, 403);
    try {
      if (new URL(origin).host !== new URL(c.req.url).host) {
        return c.json({ error: 'Origin mismatch' }, 403);
      }
    } catch {
      return c.json({ error: 'Invalid Origin header' }, 403);
    }
  }
  await next();
});

// Session resolution.
app.use('/api/*', async (c, next) => {
  c.set('user', null);
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const id = await sha256Hex(token);
    const row = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.username, u.display_name, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`
    )
      .bind(id, Date.now())
      .first<AuthUser>();
    if (row) c.set('user', row);
  }
  await next();
});

function requireAuth(c: { get: (k: string) => AuthUser | null; json: (o: unknown, s: number) => Response }): AuthUser | Response {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  return user;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createSession(c: any, userId: string) {
  const token = randomToken();
  const id = await sha256Hex(token);
  const expires = Date.now() + SESSION_TTL_MS;
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(id, userId, expires)
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

async function parseBody<T>(c: { req: { json: () => Promise<unknown> } }): Promise<T> {
  try {
    return (await c.req.json()) as T;
  } catch {
    return {} as T;
  }
}

// ---------- auth routes ----------

app.post('/api/auth/register', async (c) => {
  const body = await parseBody<{ email?: string; password?: string; username?: string; display_name?: string }>(c);
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const username = (body.username ?? '').trim();
  const displayName = (body.display_name ?? '').trim() || username;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: 'Valid email required' }, 400);
  if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);
  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(username)) return c.json({ error: 'Username must be 2-32 chars of letters, numbers, _ or -' }, 400);
  // Admin emails are reserved — admins are provisioned out-of-band since
  // there is no email verification to prove ownership of the address.
  if (isAdminEmail(c.env, email)) return c.json({ error: 'This email is reserved' }, 403);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
    .bind(email, username)
    .first();
  if (existing) return c.json({ error: 'Email or username already taken' }, 409);

  const id = crypto.randomUUID();
  const role = isAdminEmail(c.env, email) ? 'admin' : 'user';
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(id, email, username, displayName, await hashPassword(password), role, Date.now())
    .run();
  await createSession(c, id);
  const user: AuthUser = { id, email, username, display_name: displayName, role };
  return c.json({ user }, 201);
});

app.post('/api/auth/login', async (c) => {
  const body = await parseBody<{ email?: string; password?: string }>(c);
  const email = (body.email ?? '').trim().toLowerCase();
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  if (!row || !(await verifyPassword(body.password ?? '', row.password_hash))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }
  // Re-check admin membership at login in case ADMIN_EMAILS changed.
  const role = isAdminEmail(c.env, row.email) ? 'admin' : row.role;
  if (role !== row.role) {
    await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, row.id).run();
  }
  await createSession(c, row.id);
  const user: AuthUser = { id: row.id, email: row.email, username: row.username, display_name: row.display_name, role };
  return c.json({ user });
});

app.post('/api/auth/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(token)).run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

app.get('/api/auth/me', (c) => {
  const user = c.get('user');
  return c.json({ user: user ?? null });
});

app.post('/api/auth/password', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const body = await parseBody<{ current_password?: string; new_password?: string }>(c);
  const next = body.new_password ?? '';
  if (next.length < 8) return c.json({ error: 'New password must be at least 8 characters' }, 400);
  const row = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<UserRow>();
  if (!row || !(await verifyPassword(body.current_password ?? '', row.password_hash))) {
    return c.json({ error: 'Current password is incorrect' }, 403);
  }
  const token = getCookie(c, SESSION_COOKIE);
  const currentSessionId = token ? await sha256Hex(token) : null;
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(next), user.id),
    // Invalidate every other session for this account.
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').bind(user.id, currentSessionId ?? ''),
  ]);
  return c.json({ ok: true });
});

// ---------- model helpers ----------

function modelSummary(m: ModelRow & { creator_username?: string; creator_display_name?: string }) {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    category_slug: m.category_slug,
    license: m.license,
    status: m.status,
    likes_count: m.likes_count,
    downloads_count: m.downloads_count,
    created_at: m.created_at,
    published_at: m.published_at,
    cover_url: m.cover_file_id ? `/api/files/${m.cover_file_id}` : null,
    creator_username: m.creator_username,
    creator_display_name: m.creator_display_name,
  };
}

async function getModelFiles(db: D1Database, modelId: string) {
  const { results } = await db
    .prepare('SELECT * FROM model_files WHERE model_id = ? ORDER BY kind, sort, created_at')
    .bind(modelId)
    .all<ModelFileRow>();
  return results;
}

// Any owner change to an approved/rejected model sends it back to pending.
async function touchPending(c: { env: Env }, model: ModelRow) {
  if (model.status === 'approved' || model.status === 'rejected') {
    await c.env.DB.prepare("UPDATE models SET status = 'pending', updated_at = ? WHERE id = ?")
      .bind(Date.now(), model.id)
      .run();
    model.status = 'pending';
  } else {
    await c.env.DB.prepare('UPDATE models SET updated_at = ? WHERE id = ?').bind(Date.now(), model.id).run();
  }
}

async function fetchModel(c: { env: Env }, where: 'id' | 'slug', value: string) {
  return c.env.DB.prepare(`SELECT * FROM models WHERE ${where} = ?`).bind(value).first<ModelRow>();
}

// ---------- model routes ----------

app.post('/api/models', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const body = await parseBody<{
    title?: string; description?: string; category_slug?: string;
    tags?: string[]; license?: string; print_settings?: Record<string, unknown>;
  }>(c);
  const title = (body.title ?? '').trim();
  if (!title || title.length > 120) return c.json({ error: 'Title required (max 120 chars)' }, 400);
  const cat = await c.env.DB.prepare('SELECT slug FROM categories WHERE slug = ?').bind(body.category_slug ?? '').first();
  if (!cat) return c.json({ error: 'Valid category required' }, 400);
  if (!LICENSES.includes(body.license ?? '')) return c.json({ error: 'Valid license required' }, 400);

  const id = crypto.randomUUID();
  const slug = `${slugify(title)}-${randomSuffix()}`;
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO models (id, slug, user_id, title, description, category_slug, tags, license, print_settings, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
  )
    .bind(
      id, slug, user.id, title, body.description ?? '', body.category_slug,
      JSON.stringify(body.tags ?? []), body.license,
      JSON.stringify(body.print_settings ?? {}), now, now
    )
    .run();
  const model = await fetchModel(c, 'id', id);
  return c.json({ model }, 201);
});

app.get('/api/models', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const category = c.req.query('category') ?? '';
  const sort = c.req.query('sort') === 'new' ? 'new' : 'popular';
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);

  const conds = ["m.status = 'approved'"];
  const params: unknown[] = [];
  if (category) {
    conds.push('m.category_slug = ?');
    params.push(category);
  }
  if (q) {
    conds.push('(m.title LIKE ? OR m.description LIKE ? OR m.tags LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  const where = conds.join(' AND ');
  const order = sort === 'new' ? 'm.published_at DESC' : 'm.downloads_count DESC, m.likes_count DESC';

  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM models m WHERE ${where}`)
    .bind(...params)
    .first<{ n: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT m.*, u.username AS creator_username, u.display_name AS creator_display_name
     FROM models m JOIN users u ON u.id = m.user_id
     WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
  )
    .bind(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE)
    .all<ModelRow & { creator_username: string; creator_display_name: string }>();

  return c.json({
    models: results.map(modelSummary),
    page,
    total: total?.n ?? 0,
    pages: Math.ceil((total?.n ?? 0) / PAGE_SIZE),
  });
});

app.get('/api/models/:slug', async (c) => {
  const slug = c.req.param('slug');
  // id-lookups are internal (/api/me/models list); public detail is by slug.
  const model = await fetchModel(c, 'slug', slug);
  if (!model) return c.json({ error: 'Not found' }, 404);
  const user = c.get('user');
  const privileged = user && (user.role === 'admin' || user.id === model.user_id);
  if (model.status !== 'approved' && !privileged) return c.json({ error: 'Not found' }, 404);

  const files = await getModelFiles(c.env.DB, model.id);
  const creator = await c.env.DB.prepare('SELECT id, username, display_name FROM users WHERE id = ?')
    .bind(model.user_id)
    .first();
  let liked = false;
  if (user) {
    liked = !!(await c.env.DB.prepare('SELECT 1 AS x FROM likes WHERE user_id = ? AND model_id = ?')
      .bind(user.id, model.id)
      .first());
  }
  return c.json({
    model: {
      ...model,
      tags: JSON.parse(model.tags),
      print_settings: JSON.parse(model.print_settings),
    },
    files: files.map((f) => ({
      id: f.id, kind: f.kind, filename: f.filename, size: f.size,
      content_type: f.content_type, url: `/api/files/${f.id}`,
      download_url: `/api/files/${f.id}/download`,
    })),
    creator,
    liked_by_me: liked,
  });
});

app.patch('/api/models/:id', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model || model.user_id !== user.id) return c.json({ error: 'Not found' }, 404);
  const body = await parseBody<Record<string, unknown>>(c);

  const fields: string[] = [];
  const params: unknown[] = [];
  if (typeof body.title === 'string' && body.title.trim()) { fields.push('title = ?'); params.push(body.title.trim()); }
  if (typeof body.description === 'string') { fields.push('description = ?'); params.push(body.description); }
  if (typeof body.category_slug === 'string') {
    const cat = await c.env.DB.prepare('SELECT slug FROM categories WHERE slug = ?').bind(body.category_slug).first();
    if (!cat) return c.json({ error: 'Valid category required' }, 400);
    fields.push('category_slug = ?'); params.push(body.category_slug);
  }
  if (Array.isArray(body.tags)) { fields.push('tags = ?'); params.push(JSON.stringify(body.tags)); }
  if (typeof body.license === 'string') {
    if (!LICENSES.includes(body.license)) return c.json({ error: 'Valid license required' }, 400);
    fields.push('license = ?'); params.push(body.license);
  }
  if (body.print_settings && typeof body.print_settings === 'object') {
    fields.push('print_settings = ?'); params.push(JSON.stringify(body.print_settings));
  }
  if (typeof body.cover_file_id === 'string' || body.cover_file_id === null) {
    if (body.cover_file_id) {
      const f = await c.env.DB.prepare("SELECT id FROM model_files WHERE id = ? AND model_id = ? AND kind = 'image'")
        .bind(body.cover_file_id, model.id).first();
      if (!f) return c.json({ error: 'cover_file_id must be an image of this model' }, 400);
    }
    fields.push('cover_file_id = ?'); params.push(body.cover_file_id ?? null);
  }
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400);

  await c.env.DB.prepare(`UPDATE models SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`)
    .bind(...params, Date.now(), model.id)
    .run();
  await touchPending(c, model);
  const updated = await fetchModel(c, 'id', model.id);
  return c.json({ model: updated });
});

app.delete('/api/models/:id', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model || (model.user_id !== user.id && user.role !== 'admin')) {
    return c.json({ error: 'Not found' }, 404);
  }
  const files = await getModelFiles(c.env.DB, model.id);
  const store = getFileStore(c.env);
  for (const f of files) {
    try { await store.delete(f.storage_key); } catch { /* continue */ }
  }
  await c.env.DB.prepare('DELETE FROM models WHERE id = ?').bind(model.id).run();
  return c.json({ ok: true });
});

app.post('/api/models/:id/submit', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model || model.user_id !== user.id) return c.json({ error: 'Not found' }, 404);
  const files = await getModelFiles(c.env.DB, model.id);
  if (!files.some((f) => f.kind === 'model')) return c.json({ error: 'At least one model file is required' }, 400);
  const images = files.filter((f) => f.kind === 'image');
  if (!images.length) return c.json({ error: 'At least one image is required' }, 400);
  const cover = model.cover_file_id ?? images[0].id;
  await c.env.DB.prepare("UPDATE models SET status = 'pending', cover_file_id = ?, updated_at = ? WHERE id = ?")
    .bind(cover, Date.now(), model.id)
    .run();
  return c.json({ ok: true });
});

// ---------- file upload/download ----------

app.post('/api/models/:id/files', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model || model.user_id !== user.id) return c.json({ error: 'Not found' }, 404);

  const kind = c.req.query('kind') === 'image' ? 'image' : 'model';
  const filename = sanitizeFilename(c.req.query('filename') ?? 'file');
  const ext = extensionOf(filename);
  const allowed = kind === 'image' ? IMAGE_EXTENSIONS : MODEL_EXTENSIONS;
  if (!allowed.includes(ext)) {
    return c.json({ error: `File type .${ext} not allowed (${allowed.join(', ')})` }, 400);
  }
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_MODEL_FILE_BYTES;
  const buf = await c.req.arrayBuffer();
  if (!buf.byteLength) return c.json({ error: 'Empty file' }, 400);
  if (buf.byteLength > max) return c.json({ error: `File exceeds ${max / 1024 / 1024} MiB limit` }, 413);

  const fileId = crypto.randomUUID();
  const key = `models/${model.id}/${fileId}-${filename}`;
  const contentType = contentTypeFor(filename);
  const store = getFileStore(c.env);
  await store.put(key, buf, contentType);
  const sortRow = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM model_files WHERE model_id = ? AND kind = ?'
  ).bind(model.id, kind).first<{ next: number }>();
  await c.env.DB.prepare(
    'INSERT INTO model_files (id, model_id, kind, filename, storage_key, size, content_type, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(fileId, model.id, kind, filename, key, buf.byteLength, contentType, sortRow?.next ?? 0, Date.now()).run();
  await touchPending(c, model);
  const file = await c.env.DB.prepare('SELECT * FROM model_files WHERE id = ?').bind(fileId).first<ModelFileRow>();
  return c.json({ file }, 201);
});

app.delete('/api/models/:id/files/:fileId', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model || model.user_id !== user.id) return c.json({ error: 'Not found' }, 404);
  const file = await c.env.DB.prepare('SELECT * FROM model_files WHERE id = ? AND model_id = ?')
    .bind(c.req.param('fileId'), model.id)
    .first<ModelFileRow>();
  if (!file) return c.json({ error: 'Not found' }, 404);
  const store = getFileStore(c.env);
  try { await store.delete(file.storage_key); } catch { /* continue */ }
  await c.env.DB.prepare('DELETE FROM model_files WHERE id = ?').bind(file.id).run();
  if (model.cover_file_id === file.id) {
    await c.env.DB.prepare('UPDATE models SET cover_file_id = NULL WHERE id = ?').bind(model.id).run();
  }
  await touchPending(c, model);
  return c.json({ ok: true });
});

async function serveFile(c: any, download: boolean) {
  const db = c.env.DB as D1Database;
  const file = await db.prepare('SELECT * FROM model_files WHERE id = ?')
    .bind(c.req.param('fileId'))
    .first<ModelFileRow>();
  if (!file) return c.json({ error: 'Not found' }, 404);
  const model = await fetchModel(c, 'id', file.model_id);
  if (!model) return c.json({ error: 'Not found' }, 404);
  const user = c.get('user');
  const privileged = user && (user.role === 'admin' || user.id === model.user_id);
  if (model.status !== 'approved' && !privileged) return c.json({ error: 'Not found' }, 404);

  const store = getFileStore(c.env);
  const obj = await store.get(file.storage_key);
  if (!obj) return c.json({ error: 'Not found' }, 404);

  if (download) {
    await c.env.DB.prepare('UPDATE models SET downloads_count = downloads_count + 1 WHERE id = ?')
      .bind(model.id)
      .run();
  }
  const headers: Record<string, string> = {
    'Content-Type': obj.contentType,
    'Content-Length': String(obj.size),
    'X-Content-Type-Options': 'nosniff',
    // Files are served on our origin; never let them execute as documents.
    'Content-Security-Policy': "default-src 'none'; sandbox",
  };
  if (model.status === 'approved') {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  }
  const safeName = file.filename.replace(/"/g, '');
  // Model files always download; only images render inline.
  if (download || file.kind === 'model') {
    headers['Content-Disposition'] = `attachment; filename="${safeName}"`;
  } else {
    headers['Content-Disposition'] = `inline; filename="${safeName}"`;
  }
  return new Response(obj.body, { headers });
}

app.get('/api/files/:fileId', (c) => serveFile(c, false));
app.get('/api/files/:fileId/download', (c) => serveFile(c, true));

// ---------- likes / reports ----------

app.post('/api/models/:id/like', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model || model.status !== 'approved') return c.json({ error: 'Not found' }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT OR IGNORE INTO likes (user_id, model_id) VALUES (?, ?)').bind(user.id, model.id),
    c.env.DB.prepare(
      'UPDATE models SET likes_count = (SELECT COUNT(*) FROM likes WHERE model_id = ?) WHERE id = ?'
    ).bind(model.id, model.id),
  ]);
  return c.json({ ok: true });
});

app.delete('/api/models/:id/like', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model) return c.json({ error: 'Not found' }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM likes WHERE user_id = ? AND model_id = ?').bind(user.id, model.id),
    c.env.DB.prepare(
      'UPDATE models SET likes_count = (SELECT COUNT(*) FROM likes WHERE model_id = ?) WHERE id = ?'
    ).bind(model.id, model.id),
  ]);
  return c.json({ ok: true });
});

app.post('/api/models/:id/report', async (c) => {
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model || model.status !== 'approved') return c.json({ error: 'Not found' }, 404);
  const body = await parseBody<{ reason?: string }>(c);
  const reason = (body.reason ?? '').trim();
  if (!reason) return c.json({ error: 'Reason required' }, 400);
  const user = c.get('user');
  await c.env.DB.prepare(
    'INSERT INTO reports (id, model_id, user_id, reason, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), model.id, user?.id ?? null, reason, Date.now()).run();
  return c.json({ ok: true }, 201);
});

// ---------- misc public ----------

app.get('/api/categories', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.slug, c.name, c.sort,
            (SELECT COUNT(*) FROM models m WHERE m.category_slug = c.slug AND m.status = 'approved') AS count
     FROM categories c ORDER BY c.sort`
  ).all();
  return c.json({ categories: results });
});

app.get('/api/users/:username', async (c) => {
  const u = await c.env.DB.prepare('SELECT id, username, display_name, created_at FROM users WHERE username = ?')
    .bind(c.req.param('username'))
    .first<{ id: string; username: string; display_name: string; created_at: number }>();
  if (!u) return c.json({ error: 'Not found' }, 404);
  const { results } = await c.env.DB.prepare(
    "SELECT m.*, u.username AS creator_username, u.display_name AS creator_display_name FROM models m JOIN users u ON u.id = m.user_id WHERE m.user_id = ? AND m.status = 'approved' ORDER BY m.published_at DESC"
  ).bind(u.id).all<ModelRow & { creator_username: string; creator_display_name: string }>();
  return c.json({ user: u, models: results.map(modelSummary) });
});

app.get('/api/stats', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT COUNT(*) AS models, COUNT(DISTINCT user_id) AS creators, COALESCE(SUM(downloads_count), 0) AS downloads
     FROM models WHERE status = 'approved'`
  ).first<{ models: number; creators: number; downloads: number }>();
  return c.json(row ?? { models: 0, creators: 0, downloads: 0 });
});

app.get('/api/me/models', async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM models WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all<ModelRow>();
  return c.json({ models: results.map((m) => ({ ...modelSummary(m), reject_reason: m.reject_reason })) });
});

// ---------- admin ----------

function requireAdmin(c: any): AuthUser | Response {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  if (user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);
  return user;
}

app.get('/api/admin/queue', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const { results } = await c.env.DB.prepare(
    `SELECT m.*, u.username AS creator_username, u.display_name AS creator_display_name
     FROM models m JOIN users u ON u.id = m.user_id
     WHERE m.status = 'pending' ORDER BY m.created_at ASC`
  ).all();
  return c.json({ models: results });
});

app.get('/api/admin/models/:id', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model) return c.json({ error: 'Not found' }, 404);
  const files = await getModelFiles(c.env.DB, model.id);
  const creator = await c.env.DB.prepare('SELECT id, username, display_name, email FROM users WHERE id = ?')
    .bind(model.user_id).first();
  return c.json({
    model: { ...model, tags: JSON.parse(model.tags), print_settings: JSON.parse(model.print_settings) },
    files: files.map((f) => ({
      id: f.id, kind: f.kind, filename: f.filename, size: f.size, content_type: f.content_type,
      url: `/api/files/${f.id}`, download_url: `/api/files/${f.id}/download`,
    })),
    creator,
  });
});

async function moderate(c: any, action: 'approve' | 'reject' | 'unpublish') {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const model = await fetchModel(c, 'id', c.req.param('id'));
  if (!model) return c.json({ error: 'Not found' }, 404);
  const body = await parseBody<{ reason?: string }>(c);
  const reason = (body.reason ?? '').trim() || null;

  if (action === 'approve') {
    await c.env.DB.prepare(
      "UPDATE models SET status = 'approved', reject_reason = NULL, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?"
    ).bind(Date.now(), Date.now(), model.id).run();
  } else {
    if (action === 'reject' && !reason) return c.json({ error: 'Reason required' }, 400);
    await c.env.DB.prepare(
      "UPDATE models SET status = 'rejected', reject_reason = ?, updated_at = ? WHERE id = ?"
    ).bind(reason, Date.now(), model.id).run();
  }
  await c.env.DB.prepare(
    'INSERT INTO moderation_log (id, model_id, admin_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), model.id, admin.id, action, reason, Date.now()).run();
  return c.json({ ok: true });
}

app.post('/api/admin/models/:id/approve', (c) => moderate(c, 'approve'));
app.post('/api/admin/models/:id/reject', (c) => moderate(c, 'reject'));
app.post('/api/admin/models/:id/unpublish', (c) => moderate(c, 'unpublish'));

app.get('/api/admin/reports', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const { results } = await c.env.DB.prepare(
    `SELECT r.*, m.title AS model_title, m.slug AS model_slug, u.username AS reporter_username
     FROM reports r
     JOIN models m ON m.id = r.model_id
     LEFT JOIN users u ON u.id = r.user_id
     ORDER BY r.resolved_at IS NOT NULL, r.created_at DESC`
  ).all();
  return c.json({ reports: results });
});

app.post('/api/admin/reports/:id/resolve', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const r = await c.env.DB.prepare('UPDATE reports SET resolved_at = ? WHERE id = ?')
    .bind(Date.now(), c.req.param('id'))
    .run();
  if (!r.meta.changes) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

export default app;
