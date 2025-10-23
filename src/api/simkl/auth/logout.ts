// SIMKL logout and session cleanup

// import { Notice } from 'obsidian';
// import type CassettePlugin from '../../../main';

/**
 * Clears all SIMKL authentication data and credentials
 * @param plugin Plugin instance
 */
export async function logout(plugin: CassettePlugin): Promise<void> {
  // Clear credentials
  plugin.settings.simklClientId = '';
  plugin.settings.simklClientSecret = '';
  
  // Clear tokens and auth data
  plugin.settings.simklAccessToken = '';
  plugin.settings.simklUserInfo = null;
  plugin.settings.simklAuthenticated = false;
  
  await plugin.saveSettings();
  
  new Notice('✅ Cleared all SIMKL credentials', 3000);
}
