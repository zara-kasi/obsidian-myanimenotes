// PKCE (Proof Key for Code Exchange) utilities

/**
 * Generates a cryptographically random code verifier
 * @returns Base64 URL-encoded random string (128 chars max per MAL spec)
 * @throws {Error} If crypto API is unavailable
 */
export function generateVerifier(): string {
  // Validate crypto API availability
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error(
      '[MAL-AUTH] Crypto API unavailable. Cannot generate secure verifier. ' +
      'This should never happen in Obsidian (Electron environment).'
    );
  }
  
  const arr = new Uint8Array(32);
  
  try {
    crypto.getRandomValues(arr);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[MAL-AUTH] Failed to generate secure random values: ${errorMessage}`
    );
  }
  
  return base64UrlEncode(arr);
}

/**
 * Generates code challenge from verifier
 * MAL uses 'plain' method, so challenge = verifier
 * @param verifier The code verifier
 * @returns The code challenge (same as verifier for 'plain' method)
 */
export function generateChallenge(verifier: string): string {
  return verifier;
}

/**
 * Generates a random state parameter for CSRF protection
 * @returns Random state string (32 characters)
 * @throws {Error} If crypto API is unavailable
 */
export function generateState(): string {
  // Try crypto.randomUUID first (most efficient)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // Fall through to getRandomValues approach
      console.warn('[MAL-AUTH] crypto.randomUUID failed, using getRandomValues', error);
    }
  }
  
  // Fallback to crypto.getRandomValues (still cryptographically secure)
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error(
      '[MAL-AUTH] Crypto API unavailable. Cannot generate secure state. ' +
      'This should never happen in Obsidian (Electron environment).'
    );
  }
  
  try {
    // Generate 16 random bytes and convert to hex string (32 chars)
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[MAL-AUTH] Failed to generate secure state: ${errorMessage}`
    );
  }
}

// Helper functions

/**
 * Encodes Uint8Array to base64url format (URL-safe base64)
 * Per RFC 7636, removes padding and uses URL-safe characters
 */
function base64UrlEncode(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 128); // MAL spec: max 128 characters
}