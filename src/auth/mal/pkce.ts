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
 * Generates code challenge from verifier
 * MAL uses 'plain' method, so challenge = verifier
 * @param verifier The code verifier
 * @returns The code challenge
 */
export function generateChallenge(verifier: string): string {
  return verifier;
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