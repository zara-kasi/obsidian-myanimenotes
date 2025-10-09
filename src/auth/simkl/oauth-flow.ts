// SIMKL OAuth 2.0 authorization flow

import { Notice, requestUrl } from 'obsidian';
import type CassettePlugin from '../../main';
import type { SimklAuthState, SimklTokenResponse, OAuthParams } from './types';
import { SIMKL_AUTH_URL, SIMKL_TOKEN_URL, REDIRECT_URI } from './constants';
import { generateState } from './utils';
import { isTokenValid } from './token-manager';
import { fetchUserInfo } from './user-service';
import { createDebugLogger } from '../../utils/debug';


// Store state temporarily during auth flow
let authState: SimklAuthState | null = null;

/**
 * Initiates the OAuth authorization flow
 * @param plugin Plugin instance
 */
export async function startAuthFlow(plugin: CassettePlugin): Promise<void> {
  if (!plugin.settings.simklClientId) {
    new Notice('❌ Please enter your SIMKL Client ID first.', 5000);
    return;
  }

  if (!plugin.settings.simklClientSecret) {
    new Notice('❌ Please enter your SIMKL Client Secret first.', 5000);
    return;
  }
  
  if (isTokenValid(plugin)) {
    new Notice('Already authenticated with SIMKL', 3000);
    return;
  }

  // Generate state parameter for CSRF protection
  const state = generateState();

  // Store for later validation
  authState = { state };

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: plugin.settings.simklClientId,
    redirect_uri: REDIRECT_URI,
    state: state
  });

  const authUrl = `${SIMKL_AUTH_URL}?${params.toString()}`;

  new Notice('🔐 Opening SIMKL login page…', 3000);
  
  // Open in external browser
  if (window.require) {
    const { shell } = window.require('electron');
    await shell.openExternal(authUrl);
  } else {
    window.open(authUrl, '_blank');
  }
}

/**
 * Handles the OAuth redirect callback
 * @param plugin Plugin instance
 * @param params Redirect parameters
 */
export async function handleOAuthRedirect(plugin: CassettePlugin, params: OAuthParams): Promise<void> {
  const debug = createDebugLogger(plugin, 'SIMKL Auth');
  try {
    debug.log('[SIMKL Auth] Received OAuth redirect:', params);
    
    const { code, state } = extractOAuthParams(params);
    
    // Validate state to prevent CSRF
    if (!authState || state !== authState.state) {
      throw new Error('State mismatch - possible CSRF attack');
    }
    
    if (!code) {
      const error = (params as any).error || 'Unknown error';
      const errorDesc = (params as any).error_description || 'No authorization code received';
      console.error('[SIMKL Auth] OAuth error:', { error, errorDesc });
      new Notice(`❌ SIMKL Authentication failed: ${errorDesc}`, 5000);
      return;
    }

    await exchangeCodeForToken(plugin, code);
    
  } catch (error) {
    console.error('[SIMKL Auth] Failed to handle OAuth redirect:', error);
    new Notice(`❌ SIMKL Authentication failed: ${error.message}`, 5000);
  }
}

/**
 * Exchanges authorization code for access token
 * @param plugin Plugin instance
 * @param code Authorization code
 */
async function exchangeCodeForToken(
  plugin: CassettePlugin, 
  code: string
): Promise<void> {
  if (!code || code.length < 10) {
    throw new Error('Invalid authorization code');
  }

  new Notice('Exchanging authorization code for tokens…', 2000);

  const body = {
    code: code,
    client_id: plugin.settings.simklClientId,
    client_secret: plugin.settings.simklClientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  };

  try {
    const res = await requestUrl({
      url: SIMKL_TOKEN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      throw: false
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(formatTokenError(res));
    }

    const data: SimklTokenResponse = res.json || JSON.parse(res.text);

    if (!data.access_token) {
      throw new Error('No access token received from SIMKL');
    }

    // Save tokens
    plugin.settings.simklAccessToken = data.access_token;
    plugin.settings.simklAuthenticated = true;
    await plugin.saveSettings();

    // Clear temporary state
    authState = null;

    new Notice('✅ Authenticated successfully!', 4000);
    
    // Fetch user info
    try {
      await fetchUserInfo(plugin);
    } catch (userError) {
      console.warn('[SIMKL Auth] Failed to fetch user info but auth succeeded', userError);
    }
    
    // Refresh settings UI after Authentication
    plugin.refreshSettingsUI();
    
  } catch (err) {
    new Notice(`❌ SIMKL Auth failed: ${err.message}`, 5000);
    throw err;
  }
}

// Helper functions

/**
 * Extracts code and state from various OAuth redirect formats
 */
function extractOAuthParams(params: OAuthParams): { code: string | null; state: string | null } {
  let code: string | null = null;
  let state: string | null = null;
  
  if (params.code) {
    code = params.code;
    state = params.state || null;
  } else if (typeof params === 'string') {
    const paramsStr = params as string;
    const urlParams = new URLSearchParams(paramsStr.startsWith('?') ? paramsStr.slice(1) : paramsStr);
    code = urlParams.get('code');
    state = urlParams.get('state');
  } else if ((params as any).url) {
    try {
      const url = new URL((params as any).url);
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
    } catch (e) {
      console.warn('[SIMKL Auth] Failed to parse URL from params:', e);
    }
  }
  
  return { code, state };
}

/**
 * Formats token exchange error with helpful messages
 */
function formatTokenError(res: any): string {
  const errorText = res.text || JSON.stringify(res.json) || 'Unknown error';
  let errorMsg = `Token exchange failed (HTTP ${res.status})`;
  
  try {
    const errorData = res.json || (res.text ? JSON.parse(res.text) : {});
    
    if (errorData.error) {
      errorMsg += `: ${errorData.error}`;
      if (errorData.error_description) {
        errorMsg += ` - ${errorData.error_description}`;
      }
    }
    
    // Add helpful tips
    if (errorData.error === 'invalid_client') {
      errorMsg += '\n\nTip: Check your Client ID and Secret in settings.';
    } else if (errorData.error === 'invalid_grant') {
      errorMsg += '\n\nTip: The authorization code may have expired. Please try again.';
    }
  } catch (parseError) {
    errorMsg += `: ${errorText}`;
  }
  
  return errorMsg;
}
