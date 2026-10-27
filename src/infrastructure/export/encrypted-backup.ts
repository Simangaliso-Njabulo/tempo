import type { BackupFile } from '../../application/ports/backup-gateway';
import { MAX_IMPORT_BYTES, BackupValidationError, validateBackupFile } from './backup-file';

export const ENCRYPTED_BACKUP_FORMAT = 'tempo-encrypted-backup' as const;
export const ENCRYPTED_BACKUP_VERSION = 1 as const;
export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BITS = 128;

export interface EncryptedBackupEnvelope {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: typeof ENCRYPTED_BACKUP_VERSION;
  kdf: 'PBKDF2-SHA-256';
  iterations: typeof PBKDF2_ITERATIONS;
  cipher: 'AES-256-GCM';
  salt: string;
  iv: string;
  aad: string;
  ciphertext: string;
  createdAt: string;
}

export class EncryptedBackupError extends Error {
  constructor() {
    super('That file could not be opened. Check the passphrase and try again.');
    this.name = 'EncryptedBackupError';
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function headerOf(envelope: Omit<EncryptedBackupEnvelope, 'aad' | 'ciphertext'>): string {
  return JSON.stringify({
    format: envelope.format,
    version: envelope.version,
    kdf: envelope.kdf,
    iterations: envelope.iterations,
    cipher: envelope.cipher,
    salt: envelope.salt,
    iv: envelope.iv,
    createdAt: envelope.createdAt,
  });
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function isEncryptedBackup(raw: unknown): raw is EncryptedBackupEnvelope {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) && (raw as { format?: unknown }).format === ENCRYPTED_BACKUP_FORMAT;
}

export async function encryptBackup(file: BackupFile, passphrase: string): Promise<EncryptedBackupEnvelope> {
  if (passphrase.length < 12) throw new BackupValidationError('Use a passphrase of at least 12 characters.');
  const plaintext = encoder.encode(JSON.stringify(file));
  if (plaintext.byteLength > MAX_IMPORT_BYTES) throw new BackupValidationError('The backup is too large to encrypt.');

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const createdAt = new Date().toISOString();
  const header = headerOf({
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    createdAt,
  });
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(header), tagLength: TAG_BITS },
    key,
    plaintext,
  );

  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    aad: bytesToBase64(encoder.encode(header)),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    createdAt,
  };
}

export async function decryptBackup(raw: unknown, passphrase: string): Promise<BackupFile> {
  if (!isEncryptedBackup(raw)) throw new EncryptedBackupError();
  const envelope = raw;
  if (
    envelope.version !== ENCRYPTED_BACKUP_VERSION ||
    envelope.kdf !== 'PBKDF2-SHA-256' ||
    envelope.iterations !== PBKDF2_ITERATIONS ||
    envelope.cipher !== 'AES-256-GCM' ||
    typeof envelope.salt !== 'string' ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.aad !== 'string' ||
    typeof envelope.ciphertext !== 'string' ||
    typeof envelope.createdAt !== 'string'
  ) {
    throw new EncryptedBackupError();
  }

  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    if (salt.byteLength !== SALT_BYTES || iv.byteLength !== IV_BYTES) throw new Error('bad envelope');
    const header = headerOf(envelope);
    if (envelope.aad !== bytesToBase64(encoder.encode(header))) throw new Error('bad aad');
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(header), tagLength: TAG_BITS },
      key,
      base64ToBytes(envelope.ciphertext),
    );
    if (plaintext.byteLength > MAX_IMPORT_BYTES) throw new Error('too large');
    return validateBackupFile(JSON.parse(decoder.decode(plaintext)));
  } catch {
    throw new EncryptedBackupError();
  }
}
