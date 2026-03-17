/**
 * 凭证加密/解密 — AES-256-GCM
 *
 * 从 JWT_SECRET 派生 256-bit 密钥，每次加密随机 IV。
 * 存储格式: base64(iv + authTag + ciphertext)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

const key = deriveKey(process.env.JWT_SECRET || 'dev-secret');

/** 加密字符串，返回 base64 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv(12) + authTag(16) + ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/** 解密 base64 字符串 */
export function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** 加密凭证对象 { KEY: "value" } → { KEY: "encrypted..." } */
export function encryptCredentials(creds: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(creds)) {
    result[k] = v ? encrypt(v) : '';
  }
  return result;
}

/** 解密凭证对象 { KEY: "encrypted..." } → { KEY: "value" } */
export function decryptCredentials(creds: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(creds)) {
    try {
      result[k] = v ? decrypt(v) : '';
    } catch {
      result[k] = '';
    }
  }
  return result;
}
