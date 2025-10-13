// Token validation, refresh, and management

import { requestUrl } from 'obsidian';
import type CassettePlugin from '../../main';
import type { MALTokenResponse } from './types';
import { MAL_TOKEN_URL, TOKEN_EXPIRY_BUFFER } from './constants';
import { createDebugLogger } from '../../utils/debug';


/**
 * Checks if the current access token is valid
 * @param plugin Plugin instance
 * @returns True if token exists and hasn't expired
 */
export function isTokenValid(plugin: CassettePlugin): boolean {
  return !!(
    plugin.settings.malAccessToken && 
    plugin.settings.malTokenExpiry && 
    Date.now() < (plugin.settings.malTokenExpiry - TOKEN_EXPIRY_BUFFER)
  );
}

/**
 * Checks if user is authenticated (has valid token and auth flag is true)
 * @param plugin Plugin instance
 * @returns True if authenticated
 */
export function isAuthenticated(plugin: CassettePlugin): boolean {
  return plugin.settings.malAuthenticated && isTokenValid(plugin);
}

/**
 * Refreshes the access token using refresh token
 * @param plugin Plugin instance
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(plugin: CassettePlugin): Promise<void> {
  if (!plugin.settings.malRefreshToken) {
    throw new Error('No refresh token available');
  }
  
  const body = new URLSearchParams({
    client_id: plugin.settings.malClientId,
    refresh_token: plugin.settings.malRefreshToken,
    grant_type: 'refresh_token'
  });

  if (plugin.settings.malClientSecret?.trim()) {
    body.append('client_secret', plugin.settings.malClientSecret.trim());
  }

  const res = await requestUrl({
    url: MAL_TOKEN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    throw: false
  });

  if (res.status < 200 || res.status >= 300) {
    const errorText = res.text || JSON.stringify(res.json) || 'Unknown error';
    throw new Error(`Token refresh failed (HTTP ${res.status}): ${errorText}`);
  }

  const data: MALTokenResponse = res.json || JSON.parse(res.text);
  
  // Update tokens
  plugin.settings.malAccessToken = data.access_token;
  plugin.settings.malRefreshToken = data.refresh_token || plugin.settings.malRefreshToken;
  plugin.settings.malTokenExpiry = Date.now() + (data.expires_in * 1000);
  await plugin.saveSettings();
}

/**
 * Ensures the access token is valid, refreshing if necessary
 * @param plugin Plugin instance
 * @throws Error if not authenticated or refresh fails
 */
export async function ensureValidToken(plugin: CassettePlugin): Promise<void> {
  const debug = createDebugLogger(plugin, 'MAL Auth');
  if (!isTokenValid(plugin)) {
    if (!plugin.settings.malRefreshToken) {
      throw new Error('Token expired and no refresh token available. Please re-authenticate.');
    }
    
    try {
      await refreshAccessToken(plugin);
      debug.log('[MAL-AUTH] Token automatically refreshed');
    } catch (e) {
      console.error('[MAL-AUTH] Automatic token refresh failed', e);
      plugin.settings.malAuthenticated = false;
      await plugin.saveSettings();
      throw new Error('MAL authentication expired. Please re-authenticate.');
    }
  }
}

/**
 * Gets authorization headers for API requests
 * @param plugin Plugin instance
 * @returns Authorization headers or null if not authenticated
 */
export function getAuthHeaders(plugin: CassettePlugin): Record<string, string> | null {
  if (!isTokenValid(plugin)) return null;
  return { Authorization: `Bearer ${plugin.settings.malAccessToken}` };
}
