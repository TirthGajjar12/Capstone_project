import { api } from '../services/api';

let cachedPublicKey: CryptoKey | null = null;

/**
 * Encrypts a password on the client using Asymmetric RSA-OAEP + SHA-256 WebCrypto.
 * Returns the ciphertext prefixed with 'RSA:<base64>'.
 * Fails closed: throws an explicit error if Web Crypto is unavailable or if encryption fails,
 * preventing any silent transmission of plaintext credentials.
 */
export async function encryptPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password credential is required.');
  }

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error(
      'Web Crypto API is unavailable. Secure authentication requires a modern browser running in a secure context (HTTPS or localhost).'
    );
  }

  try {
    if (!cachedPublicKey) {
      // 1. Fetch the server's RSA public key in PEM format
      const { data } = await api.get<{ public_key: string }>('/auth/public-key');
      if (!data?.public_key) {
        throw new Error('Failed to retrieve the server encryption public key.');
      }

      // 2. Strip PEM header/footer and whitespaces to get raw base64
      const cleanB64 = data.public_key
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '');

      // 3. Convert base64 to binary ArrayBuffer (SPKI DER format)
      const binaryString = window.atob(cleanB64);
      const binaryDer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryDer[i] = binaryString.charCodeAt(i);
      }

      // 4. Import the key into browser WebCrypto
      cachedPublicKey = await window.crypto.subtle.importKey(
        'spki',
        binaryDer.buffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );
    }

    // 5. Encrypt the password using RSA-OAEP + SHA-256
    const encodedPassword = new TextEncoder().encode(password);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      cachedPublicKey,
      encodedPassword
    );

    // 6. Convert encrypted ArrayBuffer to base64
    const bytes = new Uint8Array(encryptedBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return `RSA:${window.btoa(binary)}`;
  } catch (err: any) {
    // Invalidate cached key in case server rotated or restarted
    cachedPublicKey = null;
    throw new Error(
      err?.message || 'Secure credential encryption failed. Operation aborted to protect credentials.'
    );
  }
}
