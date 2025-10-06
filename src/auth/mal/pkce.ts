// PKCE (Proof Key for Code Exchange) utilities

/**
 * Generates a cryptographically random code verifier
 * @returns Base64 URL-encoded random string
 */
export function generateVerifier(): string {
  const arr = new Uint8Array(32);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    try {
      crypto.getRandomValues(arr);
    } catch (e) {
      console.warn('[MAL-AUTH] crypto.getRandomValues failed, using Math.random fallback', e);
      fillArrayWithMathRandom(arr);
    }
  } else {
    fillArrayWithMathRandom(arr);
  }
  
  return base64UrlEncode(arr);
}

/**
 * Generates code challenge from verifier using SHA-256
 * Implements S256 method as per RFC 7636
 * @param verifier The code verifier
 * @returns Promise resolving to the base64url-encoded SHA-256 hash
 */
export async function generateChallenge(verifier: string): Promise<string> {
  try {
    // Check if SubtleCrypto is available (browser/Electron)
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      // Convert verifier string to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      
      // Hash with SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Convert ArrayBuffer to Uint8Array and base64url encode
      const hashArray = new Uint8Array(hashBuffer);
      return base64UrlEncode(hashArray);
    } else {
      console.warn('[MAL-AUTH] crypto.subtle not available, falling back to plain verifier');
      // Fallback to plain method if crypto.subtle is not available
      // This should rarely happen in modern browsers/Electron
      return verifier;
    }
  } catch (error) {
    console.error('[MAL-AUTH] Failed to generate S256 challenge:', error);
    // Fallback to plain method on error
    return verifier;
  }
}

/**
 * Generates a random state parameter for CSRF protection
 * @returns Random state string
 */
export function generateState(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      console.warn('[MAL-AUTH] crypto.randomUUID failed, using fallback', e);
    }
  }
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper functions

function fillArrayWithMathRandom(arr: Uint8Array): void {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
}

function base64UrlEncode(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 128);
}