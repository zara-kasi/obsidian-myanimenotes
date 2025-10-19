// SIMKL utility functions

/**
 * Generates a random state parameter for CSRF protection
 * @returns Random state string
 */
export function generateState(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      console.warn('[SIMKL Auth] crypto.randomUUID failed, using fallback', e);
    }
  }
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
