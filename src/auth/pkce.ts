// PKCE (Proof Key for Code Exchange) utilities
// Implements RFC 7636 to secure the OAuth authorization code flow for public clients.

/**
 * Generates a cryptographically random code verifier.
 * The verifier is a high-entropy cryptographic random string that the client
 * creates and keeps secret until the token exchange step.
 *
 * @returns Base64 URL-encoded random string (128 chars max per MAL spec).
 * @throws {Error} If the Web Crypto API is unavailable in the current environment.
 */
export function generateVerifier(): string {
  // Validate crypto API availability to ensure security
  // In Obsidian (Electron), window.crypto is standard, but we guard just in case.
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error(
      '[MAL-AUTH] Crypto API unavailable. Cannot generate secure verifier. ' +
      'This should never happen in Obsidian (Electron environment).'
    );
  }
  
  // Generate 32 bytes of random entropy
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
 * Generates the code challenge derived from the verifier.
 * * Note: MyAnimeList's API currently uses the "plain" transformation method,
 * where the challenge is identical to the verifier.
 * (Standard PKCE usually prefers "S256" hashing, but we must adhere to MAL specs).
 *
 * @param verifier - The secret code verifier generated previously.
 * @returns The code challenge to be sent in the initial authorization request.
 */
export function generateChallenge(verifier: string): string {
  return verifier;
}

/**
 * Generates a random "state" parameter for CSRF protection.
 * This string is sent to the authorization server and verified upon return
 * to ensure the response belongs to the request we initiated.
 *
 * @returns Random state string (32 characters).
 * @throws {Error} If crypto API is unavailable.
 */
export function generateState(): string {
  // Try crypto.randomUUID first (most efficient and standard in modern JS)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // Fall through to getRandomValues approach if UUID generation fails
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
 * Encodes a Uint8Array to base64url format.
 * Adheres to RFC 7636 Section 3 (Base64url Encoding without Padding).
 * Replaces '+' with '-', '/' with '_', and strips trailing '='.
 * * @param arr - The input byte array.
 * @returns The URL-safe base64 string.
 */
function base64UrlEncode(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 128); // MAL spec: max 128 characters
}
