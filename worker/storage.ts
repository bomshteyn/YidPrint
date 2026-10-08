export interface FileStore {
  put(key: string, body: ArrayBuffer | ReadableStream, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType: string; size: number } | null>;
  delete(key: string): Promise<void>;
}

export const MAX_MODEL_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const MODEL_EXTENSIONS = ['stl', '3mf', 'obj', 'step', 'stp'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

interface KVNamespaceLike {
  put(key: string, value: ArrayBuffer | ReadableStream, opts?: { metadata?: unknown }): Promise<void>;
  get(key: string, opts: { type: 'stream' }): Promise<ReadableStream | null>;
  getWithMetadata?(key: string, opts: { type: 'stream' }): Promise<{ value: ReadableStream | null; metadata: unknown }>;
  get(key: string, opts: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
  getWithMetadata?(key: string, opts: { type: 'arrayBuffer' }): Promise<{ value: ArrayBuffer | null; metadata: unknown }>;
  delete(key: string): Promise<void>;
}

class KVStore implements FileStore {
  constructor(private kv: KVNamespaceLike) {}

  async put(key: string, body: ArrayBuffer | ReadableStream, contentType: string) {
    // KV needs to know the size up front; buffer streams.
    let data: ArrayBuffer;
    if (body instanceof ArrayBuffer) {
      data = body;
    } else {
      data = await new Response(body).arrayBuffer();
    }
    await this.kv.put(key, data, { metadata: { contentType, size: data.byteLength } });
  }

  async get(key: string) {
    const res = await this.kv.getWithMetadata!(key, { type: 'arrayBuffer' });
    if (res.value === null) return null;
    const meta = (res.metadata ?? {}) as { contentType?: string; size?: number };
    return {
      body: new Response(res.value).body!,
      contentType: meta.contentType ?? 'application/octet-stream',
      size: meta.size ?? res.value.byteLength,
    };
  }

  async delete(key: string) {
    await this.kv.delete(key);
  }
}

class R2Store implements FileStore {
  constructor(private bucket: R2Bucket) {}

  async put(key: string, body: ArrayBuffer | ReadableStream, contentType: string) {
    await this.bucket.put(key, body as never, { httpMetadata: { contentType } });
  }

  async get(key: string) {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return {
      body: obj.body,
      contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream',
      size: obj.size,
    };
  }

  async delete(key: string) {
    await this.bucket.delete(key);
  }
}

export function getFileStore(env: Env): FileStore {
  const files = (env as unknown as { FILES?: R2Bucket }).FILES;
  if (files) return new R2Store(files);
  return new KVStore(env.FILES_KV as unknown as KVNamespaceLike);
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  return base.replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'file';
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}
