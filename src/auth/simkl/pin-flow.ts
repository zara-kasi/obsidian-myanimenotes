// SIMKL PIN-based authentication flow

import { Notice, requestUrl } from 'obsidian';
import type CassettePlugin from '../../main';
import type { SimklPinResponse, SimklTokenResponse } from './types';
import { 
  SIMKL_PIN_URL, 
  SIMKL_PIN_CHECK_URL, 
  REDIRECT_URI,
  DEFAULT_POLL_INTERVAL,
  DEFAULT_EXPIRY 
} from './constants';
import { fetchUserInfo } from './user-service';

// Store polling interval ID
let pollInterval: NodeJS.Timeout | null = null;

/**
 * Initiates the SIMKL PIN authentication flow
 * @param plugin Plugin instance
 */
export async function startPinFlow(plugin: CassettePlugin): Promise<void> {
  if (!plugin.settings.simklClientId) {
    new Notice('❌ Please enter your SIMKL Client ID first.', 5000);
    return;
  }

  if (!plugin.settings.simklClientSecret) {
    new Notice('❌ Please enter your SIMKL Client Secret first.', 5000);
    return;
  }

  if (plugin.settings.simklAccessToken) {
    new Notice('Already authenticated with SIMKL', 3000);
    return;
  }

  try {
    // Step 1: Request PIN code
    const pinUrl = `${SIMKL_PIN_URL}?client_id=${encodeURIComponent(plugin.settings.simklClientId)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    
    const pinResponse = await requestUrl({
      url: pinUrl,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'simkl-api-key': plugin.settings.simklClientId
      },
      throw: false
    });

    if (pinResponse.status < 200 || pinResponse.status >= 300) {
      throw new Error(`PIN request failed: HTTP ${pinResponse.status}`);
    }

    const pinData: SimklPinResponse = pinResponse.json;
    
    if (!pinData.user_code) {
      throw new Error('Invalid response: missing user_code');
    }

    // Step 2: Open browser to PIN page
    new Notice('🔐 Opening SIMKL PIN page…', 3000);
    const pinPageUrl = pinData.verification_url || 'https://simkl.com/pin';
    
    if (window.require) {
      const { shell } = window.require('electron');
      await shell.openExternal(pinPageUrl);
    } else {
      window.open(pinPageUrl, '_blank');
    }
   
    // Step 3: Start polling for authentication
    startPolling(plugin, pinData);

  } catch (error) {
    console.error('[SIMKL Auth] Authentication failed:', error);
    new Notice(`❌ SIMKL Authentication failed: ${error.message}`, 8000);
  }
}

/**
 * Starts polling for user authentication
 * @param plugin Plugin instance
 * @param pinData PIN response data
 */
function startPolling(plugin: CassettePlugin, pinData: SimklPinResponse): void {
  const { user_code, interval = DEFAULT_POLL_INTERVAL, expires_in = DEFAULT_EXPIRY } = pinData;
  const maxAttempts = Math.floor(expires_in / interval);
  let attempts = 0;

  const poll = async () => {
    attempts++;
    
    if (attempts > maxAttempts) {
      stopPolling();
      new Notice('❌ SIMKL Authentication timeout. Please try again.', 8000);
      return;
    }

    try {
      const pollUrl = `${SIMKL_PIN_CHECK_URL}${encodeURIComponent(user_code)}?client_id=${encodeURIComponent(plugin.settings.simklClientId)}`;

      const response = await requestUrl({
        url: pollUrl,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'simkl-api-key': plugin.settings.simklClientId
        },
        throw: false
      });

      const data: SimklTokenResponse | null = response.json || null;

      if (data?.access_token) {
        // Success!
        plugin.settings.simklAccessToken = data.access_token;
        plugin.settings.simklAuthenticated = true;
        await plugin.saveSettings();
        
        stopPolling();
        
        new Notice('✅ SIMKL authenticated successfully!', 4000);
        
        // Fetch user info
        try {
          await fetchUserInfo(plugin);
        } catch (userError) {
          console.warn('[SIMKL Auth] Failed to fetch user info but auth succeeded', userError);
        }
        
        // Refresh settings UI
        plugin.refreshSettingsUI();
        
        return;
      }

      // Continue polling if no token yet (404 or empty response)
      if (response.status === 404 || !data || Object.keys(data).length === 0) {
        // User hasn't entered code yet, continue polling
      }

    } catch (error) {
      console.error('[SIMKL Auth] Polling error:', error);
    }
  };

  // Start polling
  pollInterval = setInterval(poll, interval * 1000);
  
  // Do first poll after interval
  setTimeout(poll, interval * 1000);
}

/**
 * Stops the polling process
 */
export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}