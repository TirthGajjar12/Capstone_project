import { api } from '../services/api';

let cachedPublicKey: CryptoKey | null = null;

/**
 * Encrypts a password on the client using Asymmetric RSA-OAEP + SHA-256 WebCrypto.
 * Returns the ciphertext prefixed with 'RSA:<base64>'.
 * If WebCrypto is not supported, safely falls back to returning the raw password.
 */
export async function encryptPassword(password: string): Promise<string> {
  if (!password || typeof window === 'undefined' || !window.crypto?.subtle) {
    return password;
  }

  try {
    if (!cachedPublicKey) {
      // 1. Fetch the server's RSA public key in PEM format
      const { data } = await api.get<{ public_key: string }>('/auth/public-key');

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
  } catch (err) {
    console.warn('Asymmetric client-side encryption fallback:', err);
    return password;
  }
}
