// Prints a pbkdf2$100000$<saltB64>$<hashB64> password hash, same format as worker/auth.ts.
// Usage: node scripts/hash-password.mjs <password>
const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
const b64 = (bytes) => Buffer.from(bytes).toString('base64');
console.log(`pbkdf2$100000$${b64(salt)}$${b64(new Uint8Array(bits))}`);
