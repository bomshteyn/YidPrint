export interface SessionUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: 'user' | 'admin';
}

export interface ModelSummary {
  id: string;
  slug: string;
  title: string;
  category_slug: string;
  license: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  reject_reason?: string | null;
  likes_count: number;
  downloads_count: number;
  created_at: number;
  published_at: number | null;
  cover_url: string | null;
  creator_username?: string;
  creator_display_name?: string;
}

export interface ModelDetail {
  id: string;
  slug: string;
  user_id: string;
  title: string;
  description: string;
  category_slug: string;
  tags: string[];
  license: string;
  print_settings: Record<string, unknown>;
  status: string;
  reject_reason: string | null;
  cover_file_id: string | null;
  likes_count: number;
  downloads_count: number;
  created_at: number;
  updated_at: number;
  published_at: number | null;
}

export interface ModelFile {
  id: string;
  kind: 'model' | 'image';
  filename: string;
  size: number;
  content_type: string;
  url: string;
  download_url: string;
}

export interface Category {
  slug: string;
  name: string;
  sort: number;
  count: number;
}

export const LICENSES = [
  'CC BY',
  'CC BY-SA',
  'CC BY-NC',
  'CC BY-NC-SA',
  'CC0',
  'Personal use only',
];

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json<T>(path: string, method: string, body: unknown): Promise<T> {
  return req<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const api = {
  me: () => req<{ user: SessionUser | null }>('/api/auth/me'),
  register: (b: { email: string; password: string; username: string; display_name: string }) =>
    json<{ user: SessionUser }>('/api/auth/register', 'POST', b),
  login: (b: { email: string; password: string }) =>
    json<{ user: SessionUser }>('/api/auth/login', 'POST', b),
  logout: () => json<{ ok: true }>('/api/auth/logout', 'POST', {}),
  changePassword: (b: { current_password: string; new_password: string }) =>
    json<{ ok: true }>('/api/auth/password', 'POST', b),
  stats: () => req<{ models: number; creators: number; downloads: number }>('/api/stats'),

  listModels: (params: { q?: string; category?: string; sort?: string; page?: number }) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
    return req<{ models: ModelSummary[]; page: number; pages: number; total: number }>(`/api/models?${sp}`);
  },
  getModel: (slug: string) =>
    req<{ model: ModelDetail; files: ModelFile[]; creator: { id: string; username: string; display_name: string }; liked_by_me: boolean }>(
      `/api/models/${slug}`
    ),
  createModel: (b: Record<string, unknown>) => json<{ model: ModelDetail }>('/api/models', 'POST', b),
  patchModel: (id: string, b: Record<string, unknown>) => json<{ model: ModelDetail }>(`/api/models/${id}`, 'PATCH', b),
  deleteModel: (id: string) => req<{ ok: true }>(`/api/models/${id}`, { method: 'DELETE' }),
  submitModel: (id: string) => json<{ ok: true }>(`/api/models/${id}/submit`, 'POST', {}),

  uploadFile: (modelId: string, kind: 'model' | 'image', file: Blob, filename: string, onProgress?: (pct: number) => void) =>
    new Promise<ModelFile>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/models/${modelId}/files?kind=${kind}&filename=${encodeURIComponent(filename)}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data.file);
          else reject(new ApiError(xhr.status, data.error ?? 'Upload failed'));
        } catch {
          reject(new ApiError(xhr.status, 'Upload failed'));
        }
      };
      xhr.onerror = () => reject(new ApiError(0, 'Network error'));
      xhr.send(file);
    }),
  deleteFile: (modelId: string, fileId: string) =>
    req<{ ok: true }>(`/api/models/${modelId}/files/${fileId}`, { method: 'DELETE' }),

  like: (id: string) => json<{ ok: true }>(`/api/models/${id}/like`, 'POST', {}),
  unlike: (id: string) => req<{ ok: true }>(`/api/models/${id}/like`, { method: 'DELETE' }),
  report: (id: string, reason: string) => json<{ ok: true }>(`/api/models/${id}/report`, 'POST', { reason }),

  categories: () => req<{ categories: Category[] }>('/api/categories'),
  userProfile: (username: string) =>
    req<{ user: { id: string; username: string; display_name: string; created_at: number }; models: ModelSummary[] }>(
      `/api/users/${username}`
    ),
  myModels: () => req<{ models: ModelSummary[] }>('/api/me/models'),

  adminQueue: () => req<{ models: ModelSummary[] }>('/api/admin/queue'),
  adminGetModel: (id: string) =>
    req<{ model: ModelDetail; files: ModelFile[]; creator: { id: string; username: string; display_name: string; email: string } }>(
      `/api/admin/models/${id}`
    ),
  adminApprove: (id: string) => json<{ ok: true }>(`/api/admin/models/${id}/approve`, 'POST', {}),
  adminReject: (id: string, reason: string) => json<{ ok: true }>(`/api/admin/models/${id}/reject`, 'POST', { reason }),
  adminUnpublish: (id: string, reason: string) =>
    json<{ ok: true }>(`/api/admin/models/${id}/unpublish`, 'POST', { reason }),
  adminReports: () =>
    req<{ reports: { id: string; model_id: string; model_title: string; model_slug: string; reason: string; reporter_username: string | null; created_at: number; resolved_at: number | null }[] }>(
      '/api/admin/reports'
    ),
  adminResolveReport: (id: string) => json<{ ok: true }>(`/api/admin/reports/${id}/resolve`, 'POST', {}),
};

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export const LICENSE_DESCRIPTIONS: Record<string, string> = {
  'CC BY': 'Anyone can use it, including commercially, with credit to you.',
  'CC BY-SA': 'Like CC BY, but remixes must use the same license.',
  'CC BY-NC': 'Anyone can use it non-commercially, with credit to you.',
  'CC BY-NC-SA': 'Non-commercial use only, remixes keep the same license.',
  CC0: 'Public domain — anyone can use it for anything, no credit needed.',
  'Personal use only': 'People may print it for themselves; no commercial use or resharing.',
};
