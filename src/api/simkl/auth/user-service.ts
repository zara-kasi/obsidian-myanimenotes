// SIMKL user information management
/*
import { requestUrl } from 'obsidian';
import type CassettePlugin from '../../../main';
import type { SimklUserInfo } from './types';
import { SIMKL_USER_URL } from './constants';
import { getAuthHeaders } from './token-manager';
*/

/**
 * Fetches user information from SIMKL API
 * @param plugin Plugin instance
 * @throws Error if fetch fails
 */
 
 /*
export async function fetchUserInfo(plugin: CassettePlugin): Promise<void> {
  const headers = getAuthHeaders(plugin);
  if (!headers) {
    throw new Error('Not authenticated with SIMKL');
  }

  const res = await requestUrl({
    url: SIMKL_USER_URL,
    method: 'GET',
    headers,
    throw: false
  });
  
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Could not fetch SIMKL user info (HTTP ${res.status})`);
  }
  
  const fullResponse = res.json || JSON.parse(res.text);
  
  // Extract only necessary fields in the same format as MAL
  plugin.settings.simklUserInfo = {
    id: fullResponse.user?.id || fullResponse.account?.id,
    name: fullResponse.user?.name,
    picture: fullResponse.user?.avatar || fullResponse.user?.avatar_url
  };
  
  await plugin.saveSettings();
}
*/

/**
 * Gets the current user info
 * @param plugin Plugin instance
 * @returns User info or null if not available
 */
 
 /*
export function getUserInfo(plugin: CassettePlugin): SimklUserInfo | null {
  return plugin.settings.simklUserInfo || null;
}
*/

/**
 * Gets the authenticated username
 * @param plugin Plugin instance
 * @returns Username
 * @throws Error if not authenticated or username not available
 */
 
 /*
export async function getAuthenticatedUsername(plugin: CassettePlugin): Promise<string> {
  if (!plugin.settings.simklAccessToken) {
    throw new Error('Not authenticated with SIMKL');
  }

  if (!plugin.settings.simklUserInfo) {
    await fetchUserInfo(plugin);
  }

  const name = plugin.settings.simklUserInfo?.name;
  if (!name) {
    throw new Error('Could not fetch SIMKL username');
  }
  
  return name;
}
*/