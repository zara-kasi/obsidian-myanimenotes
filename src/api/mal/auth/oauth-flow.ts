// OAuth 2.0 authorization flow

import { Notice, requestUrl } from 'obsidian';
import type CassettePlugin from '../../../main';
import type { MALAuthState, MALTokenResponse, OAuthParams } from './types';
import { MAL_AUTH_URL, MAL_TOKEN_URL, REDIRECT_URI } from './constants';
import { generateVerifier, generateChallenge, generateState } from './pkce';
import { isTokenValid } from './token-manager';
import { fetchUserInfo } from './user-service';
import { createDebugLogger } from '../../../utils';

// Auth state timeout: 10 minutes
const AUTH_STATE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Initiates the OAuth authorization flow
 * Stores PKCE parameters in plugin settings for persistence
 */
export async function startAuthFlow(plugin: CassettePlugin): Promise<void> {
  if (!plugin.settings.malClientId) {
    new Notice('Please enter your MAL Client ID first.', 5000);
    return;
  }
  
  if (isTokenValid(plugin)) {
    new Notice('Already authenticated with MyAnimeList', 3000);
    return;
  }

  // Generate PKCE parameters
  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);
  const state = generateState();

  // Store in plugin settings (persisted across reloads)
  plugin.settings.malAuthState = {
    verifier,
    state,
    timestamp: Date.now()
  };
  await plugin.saveSettings();

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: plugin.settings.malClientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'plain',
    state: state
  });

  const authUrl = `${MAL_AUTH_URL}?${params.toString()}`;

  new Notice('Opening MyAnimeList login page…', 2000);
  
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
 * Retrieves PKCE parameters from plugin settings
 */
export async function handleOAuthRedirect(plugin: CassettePlugin, params: OAuthParams): Promise<void> {
  const debug = createDebugLogger(plugin, 'MAL Auth');
  try {
    debug.log('[MAL Auth] Received OAuth redirect:', params);
    
    const { code, state } = extractOAuthParams(params);
    
    // Retrieve stored auth state
    const authState = plugin.settings.malAuthState;
    
    // Validate auth state exists
    if (!authState) {
      throw new Error('No auth state found. Please restart the authentication process.');
    }
    
    // Check if auth state has expired (10 minutes timeout)
    const stateAge = Date.now() - authState.timestamp;
    if (stateAge > AUTH_STATE_TIMEOUT_MS) {
      // Clear expired state
      plugin.settings.malAuthState = null;
      await plugin.saveSettings();
      throw new Error('Authentication session expired. Please try again.');
    }
    
    // Validate state to prevent CSRF
    if (state !== authState.state) {
      throw new Error('State mismatch - possible CSRF attack');
    }
    
    if (!code) {
      const error = (params as any).error || 'Unknown error';
      const errorDesc = (params as any).error_description || 'No authorization code received';
      console.error('[MAL Auth] OAuth error:', { error, errorDesc });
      new Notice(`❌ MAL Authentication failed: ${errorDesc}`, 5000);
      return;
    }

    await exchangeCodeForToken(plugin, code, authState.verifier);
    
  } catch (error) {
    console.error('[MAL Auth] Failed to handle OAuth redirect:', error);
    new Notice(`❌ MAL Authentication failed: ${error.message}`, 5000);
  }
}

/**
 * Exchanges authorization code for access token
 */
async function exchangeCodeForToken(
  plugin: CassettePlugin, 
  code: string, 
  verifier: string
): Promise<void> {
  if (!code || code.length < 10) {
    throw new Error('Invalid authorization code');
  }

  new Notice('Exchanging authorization code for tokens…', 1500);

  const body = new URLSearchParams({
    client_id: plugin.settings.malClientId,
    code: code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  });

  // Add client secret if provided
  if (plugin.settings.malClientSecret?.trim()) {
    body.append('client_secret', plugin.settings.malClientSecret.trim());
  }

  try {
    const res = await requestUrl({
      url: MAL_TOKEN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString(),
      throw: false
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(formatTokenError(res));
    }

    const data: MALTokenResponse = res.json || JSON.parse(res.text);

    if (!data.access_token) {
      throw new Error('No access token received from MyAnimeList');
    }

    // Save tokens
    plugin.settings.malAccessToken = data.access_token;
    plugin.settings.malRefreshToken = data.refresh_token;
    plugin.settings.malTokenExpiry = Date.now() + (data.expires_in * 1000);
    plugin.settings.malAuthenticated = true;
    
    // Clear auth state (no longer needed)
    plugin.settings.malAuthState = null;
    
    // Enable auto-sync toggles by default after successful authentication
    plugin.settings.scheduledSync = true;
    
    await plugin.saveSettings();

    new Notice('✅ Authenticated successfully!', 3000);
    
    // Fetch user info
    try {
      await fetchUserInfo(plugin);
    } catch (userError) {
      console.warn('[MAL Auth] Failed to fetch user info but auth succeeded', userError);
    }
    
    // Refresh settings UI after Authentication
    plugin.refreshSettingsUI();
    
  } catch (err) {
    new Notice(`❌ MAL Auth failed: ${err.message}`, 5000);
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
      console.warn('[MAL Auth] Failed to parse URL from params:', e);
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