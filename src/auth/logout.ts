// Logout and session cleanup
import { showNotice } from '../utils/notice';
import type MyAnimeNotesPlugin from '../main';

/**
 * Clears all authentication data and credentials
 * @param plugin Plugin instance
 */
export async function logout(plugin: MyAnimeNotesPlugin): Promise<void> {
  // Clear credentials
  plugin.settings.malClientId = '';
  plugin.settings.malClientSecret = '';
  
  // Clear tokens and auth data
  plugin.settings.malAccessToken = '';
  plugin.settings.malRefreshToken = '';
  plugin.settings.malTokenExpiry = null;
  plugin.settings.malUserInfo = null;
  plugin.settings.malAuthenticated = false;
  
  await plugin.saveSettings();
  
  showNotice('✅ Cleared all MyAnimeList credentials', 'success', 3000);
}
