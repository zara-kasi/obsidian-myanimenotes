// User information management
// Handles retrieving and storing the authenticated user's profile details.

import { requestUrl } from 'obsidian';
import type MyAnimeNotesPlugin from '../main';
import type { MALUserInfo } from './types';
import { MAL_USER_URL } from './constants';

/**
 * Fetches the authenticated user's profile information from the MyAnimeList API.
 * Updates the plugin settings with the user's ID, name, and avatar.
 *
 * @param plugin - The plugin instance (contains access token and settings).
 * @throws {Error} If the API request fails (e.g., expired token or network error).
 */
export async function fetchUserInfo(plugin: MyAnimeNotesPlugin): Promise<void> {
  // Perform the API request using the stored access token
  const res = await requestUrl({
    url: MAL_USER_URL,
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${plugin.settings.malAccessToken}`
    },
    throw: false // Manual error handling
  });
  
  // Check for HTTP errors
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Could not fetch user info (HTTP ${res.status})`);
  }
  
  // Parse the response
  const fullResponse = (res.json || JSON.parse(res.text)) as {
    id: number;
    name: string;
    picture?: string;
  };

  // Only save necessary fields to keep settings file small
  // We map the raw API response to our internal MALUserInfo type
  plugin.settings.malUserInfo = {
    id: fullResponse.id,
    name: fullResponse.name,
    picture: fullResponse.picture
  };
  
  // Persist changes to disk
  await plugin.saveSettings();
}

/**
 * Retrieves the currently stored user information from settings.
 * valid only if the user has successfully authenticated previously.
 *
 * @param plugin - The plugin instance.
 * @returns The user info object (id, name, picture) or null if not set.
 */
export function getUserInfo(plugin: MyAnimeNotesPlugin): MALUserInfo | null {
  return plugin.settings.malUserInfo || null;
}
