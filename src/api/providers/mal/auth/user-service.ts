// User information management

import { requestUrl } from 'obsidian';
import type CassettePlugin from '../../main';
import type { MALUserInfo } from './types';
import { MAL_USER_URL } from './constants';

/**
 * Fetches user information from MAL API
 * @param plugin Plugin instance
 * @throws Error if fetch fails
 */
export async function fetchUserInfo(plugin: CassettePlugin): Promise<void> {
  const res = await requestUrl({
    url: MAL_USER_URL,
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${plugin.settings.malAccessToken}`
    },
    throw: false
  });
  
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Could not fetch user info (HTTP ${res.status})`);
  }
  
  const fullResponse = res.json || JSON.parse(res.text);
  
  // Only save necessary fields
  plugin.settings.malUserInfo = {
    id: fullResponse.id,
    name: fullResponse.name,
    picture: fullResponse.picture
  };
  
  await plugin.saveSettings();
}

/**
 * Gets the current user info
 * @param plugin Plugin instance
 * @returns User info or null if not available
 */
export function getUserInfo(plugin: CassettePlugin): MALUserInfo | null {
  return plugin.settings.malUserInfo || null;
}
