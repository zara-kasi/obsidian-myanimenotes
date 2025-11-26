// Logout and session cleanup
import { showNotice } from '../../../utils';
import type CassettePlugin from '../../../main';

/**
 * Clears all authentication data and credentials
 * @param plugin Plugin instance
 */
export async function logout(plugin: CassettePlugin): Promise<void> {
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
  
  showNotice(plugin, '✅ Cleared all MyAnimeList credentials', 3000);
}
