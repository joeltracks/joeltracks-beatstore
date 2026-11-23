const encoder = new TextEncoder();
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
}
export async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
export async function keyedHash(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
async function encryptionKey(secret: string) {
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', encoder.encode(secret)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(secret: string, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(secret), encoder.encode(JSON.stringify(value))));
  return btoa(String.fromCharCode(...iv)) + '.' + btoa(String.fromCharCode(...encrypted));
}
export async function unseal(secret: string, value: string) {
  const [iv, ciphertext] = value.split('.').map(part => Uint8Array.from(atob(part), char => char.charCodeAt(0)));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await encryptionKey(secret), ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}
export function validToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}
export function safeFilename(name: string) {
  return name.replace(/[\r\n\u0000-\u001f\u007f"\\/]/g, '_').slice(0, 180) || 'download';
}
