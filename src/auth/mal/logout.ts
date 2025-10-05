// Logout and session cleanup

import { Notice } from 'obsidian';
import type CassettePlugin from '../../main';

/**
 * Logs out the user and clears all authentication data
 * @param plugin Plugin instance
 */
export async function logout(plugin: CassettePlugin): Promise<void> {
  plugin.settings.malAccessToken = '';
  plugin.settings.malRefreshToken = '';
  plugin.settings.malTokenExpiry = null;
  plugin.settings.malUserInfo = null;
  plugin.settings.malAuthenticated = false;
  await plugin.saveSettings();
  
  new Notice('✅ Logged out from MyAnimeList', 3000);
}
