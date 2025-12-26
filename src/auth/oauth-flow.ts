// OAuth 2.0 authorization flow

import { requestUrl } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import type { MALTokenResponse, OAuthParams } from "./types";
import { MAL_AUTH_URL, MAL_TOKEN_URL, REDIRECT_URI } from "./constants";
import { generateVerifier, generateChallenge, generateState } from "./pkce";
import { isTokenValid } from "./token-manager";
import { fetchUserInfo } from "./user-service";
import { showNotice } from "../utils/notice";
import { logger } from "../utils/logger";

const log = new logger("OAuthFlow");

/** * Auth state timeout: 10 minutes.
 * If the user doesn't complete the login within this time, the state expires
 * to prevent replay attacks or stale sessions.
 */
const AUTH_STATE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Initiates the OAuth 2.0 PKCE authorization flow.
 * * Steps:
 * 1. Validates prerequisites (Client ID, current auth status).
 * 2. Generates PKCE cryptographics (Verifier, Challenge) and State.
 * 3. Persists this state in plugin settings to survive the app reload/redirect.
 * 4. Constructs the MAL Authorization URL.
 * 5. Opens the system's default browser to let the user log in.
 *
 * @param plugin - The plugin instance.
 */
export async function startAuthFlow(plugin: MyAnimeNotesPlugin): Promise<void> {
    if (!plugin.settings.malClientId) {
        showNotice("Please enter your MAL Client ID first.", "warning", 5000);
        return;
    }

    if (isTokenValid(plugin)) {
        showNotice("Already authenticated with MyAnimeList", "success", 3000);
        return;
    }

    // Generate PKCE parameters
    // Verifier: Secret string used to verify the request later
    // Challenge: Hashed version of the verifier sent in the initial request
    const verifier = generateVerifier();
    const challenge = generateChallenge(verifier);
    const state = generateState();

    // Store in plugin settings (persisted across reloads)
    // This is crucial because Obsidian might reload or the protocol handler might trigger a new instance
    plugin.settings.malAuthState = {
        verifier,
        state,
        timestamp: Date.now()
    };
    await plugin.saveSettings();

    // Build authorization URL with required OAuth parameters
    const params = new URLSearchParams({
        response_type: "code",
        client_id: plugin.settings.malClientId,
        redirect_uri: REDIRECT_URI,
        code_challenge: challenge, // PKCE Challenge
        code_challenge_method: "plain", // MAL API specifies 'plain' usually, check docs if 'S256' is supported
        state: state
    });

    const authUrl = `${MAL_AUTH_URL}?${params.toString()}`;

    showNotice("Opening MyAnimeList login page…", 2000);

    // Open in external browser
    // Obsidian runs in Electron, so we use the shell API to open the default system browser
    if (window.require) {
        const { shell } = window.require("electron") as {
            shell: { openExternal: (url: string) => Promise<void> };
        };
        await shell.openExternal(authUrl);
    } else {
        // Fallback for mobile or standard web contexts
        window.open(authUrl, "_blank");
    }
}

/**
 * Handles the OAuth redirect callback.
 * Called when the custom protocol (obsidian://...) receives data from the browser.
 * * Steps:
 * 1. Extracts the authorization code and state from the URL.
 * 2. Validates the State against the stored session (CSRF protection).
 * 3. Checks for timeout expiration.
 * 4. Calls the token exchange function.
 *
 * @param plugin - The plugin instance.
 * @param params - The query parameters received from the redirect.
 */
export async function handleOAuthRedirect(
    plugin: MyAnimeNotesPlugin,
    params: OAuthParams
): Promise<void> {
    try {
        log.debug("Received OAuth redirect:", params);
        const { code, state } = extractOAuthParams(params);

        // Retrieve stored auth state
        const authState = plugin.settings.malAuthState;

        // Validate auth state exists
        if (!authState) {
            throw new Error(
                "No auth state found. Please restart the authentication process."
            );
        }

        // Check if auth state has expired (10 minutes timeout)
        const stateAge = Date.now() - authState.timestamp;
        if (stateAge > AUTH_STATE_TIMEOUT_MS) {
            // Clear expired state
            plugin.settings.malAuthState = null;
            await plugin.saveSettings();
            throw new Error(
                "Authentication session expired. Please try again."
            );
        }

        // Validate state to prevent CSRF (Cross-Site Request Forgery)
        // The state sent back by the server must match what we sent initially
        if (state !== authState.state) {
            throw new Error("State mismatch - possible CSRF attack");
        }

        if (!code) {
            const error = params.error || "Unknown error";
            const errorDesc =
                params.error_description || "No authorization code received";
            log.error("OAuth error:", { error, errorDesc });
            showNotice(
                `MAL Authentication failed: ${errorDesc}`,
                "warning",
                5000
            );
            return;
        }

        // Proceed to exchange the code for a real access token
        await exchangeCodeForToken(plugin, code, authState.verifier);
    } catch (error) {
        log.error("Failed to handle OAuth redirect:", error);
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        showNotice(
            `MAL Authentication failed: ${errorMessage}`,
            "warning",
            5000
        );
    }
}

/**
 * Exchanges the temporary authorization code for long-lived access/refresh tokens.
 * * @param plugin - The plugin instance.
 * @param code - The authorization code received from the redirect.
 * @param verifier - The PKCE verifier generated in startAuthFlow.
 */
async function exchangeCodeForToken(
    plugin: MyAnimeNotesPlugin,
    code: string,
    verifier: string
): Promise<void> {
    if (!code || code.length < 10) {
        throw new Error("Invalid authorization code");
    }

    showNotice("Exchanging authorization code for tokens…", 1500);

    const body = new URLSearchParams({
        client_id: plugin.settings.malClientId,
        code: code,
        code_verifier: verifier, // Prove we initiated the request
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI
    });

    // Add client secret if provided (MAL API officially requires it for web apps, 
    // but sometimes PKCE public clients don't. Including if user provided it.)
    if (plugin.settings.malClientSecret?.trim()) {
        body.append("client_secret", plugin.settings.malClientSecret.trim());
    }

    try {
        const res = await requestUrl({
            url: MAL_TOKEN_URL,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString(),
            throw: false // Handle status codes manually
        });

        if (res.status < 200 || res.status >= 300) {
            throw new Error(formatTokenError(res));
        }

        const data = (res.json || JSON.parse(res.text)) as MALTokenResponse;
        if (!data.access_token) {
            throw new Error("No access token received from MyAnimeList");
        }

        // Save tokens to settings
        plugin.settings.malAccessToken = data.access_token;
        plugin.settings.malRefreshToken = data.refresh_token;
        plugin.settings.malTokenExpiry = Date.now() + data.expires_in * 1000;
        plugin.settings.malAuthenticated = true;

        // Clear auth state (no longer needed after successful exchange)
        plugin.settings.malAuthState = null;

        await plugin.saveSettings();

        showNotice("✅ Authenticated successfully!", "success", 3000);

        // Fetch user info immediately to update UI (avatar, username)
        try {
            await fetchUserInfo(plugin);
        } catch (userError) {
            log.error(
                "Failed to fetch user info but auth succeeded",
                userError
            );
        }

        // Refresh settings UI after Authentication to show the logged-in state
        plugin.refreshSettingsUI();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        showNotice(`MAL Auth failed: ${errorMessage}`, "warning", 5000);
        throw err;
    }
}

// Helper functions

/**
 * Normalizes and extracts 'code' and 'state' from various input formats.
 * The Obsidian protocol handler might pass params as an object, a string, or a URL structure.
 *
 * @param params - The raw parameters from the protocol handler.
 */
function extractOAuthParams(params: OAuthParams): {
    code: string | null;
    state: string | null;
} {
    let code: string | null = null;
    let state: string | null = null;

    if (params.code) {
        // Direct object access
        code = params.code;
        state = params.state || null;
    } else if (typeof params === "string") {
        // Parse from query string
        const paramsStr = params as string;
        const urlParams = new URLSearchParams(
            paramsStr.startsWith("?") ? paramsStr.slice(1) : paramsStr
        );
        code = urlParams.get("code");
        state = urlParams.get("state");
    } else if (params.url) {
        // Parse from full URL object
        try {
            const url = new URL(params.url);
            code = url.searchParams.get("code");
            state = url.searchParams.get("state");
        } catch (e) {
            log.error("Failed to parse URL from params:", e);
        }
    }

    return { code, state };
}

/**
 * Formats token exchange errors into user-friendly messages.
 * Attempts to parse specific OAuth error codes (like invalid_client) to provide tips.
 *
 * @param res - The response object from the failed request.
 */
function formatTokenError(res: {
    status: number;
    text?: string;
    json?: unknown;
}): string {
    const errorText = res.text || JSON.stringify(res.json) || "Unknown error";
    let errorMsg = `Token exchange failed (HTTP ${res.status})`;

    try {
        const errorData = (res.json ||
            (res.text ? JSON.parse(res.text) : {})) as {
            error?: string;
            error_description?: string;
        };

        if (errorData.error) {
            errorMsg += `: ${errorData.error}`;
            if (errorData.error_description) {
                errorMsg += ` - ${errorData.error_description}`;
            }
        }

        // Add helpful troubleshooting tips for common errors
        if (errorData.error === "invalid_client") {
            errorMsg += "\n\nTip: Check your Client ID and Secret in settings.";
        } else if (errorData.error === "invalid_grant") {
            errorMsg +=
                "\n\nTip: The authorization code may have expired. Please try again.";
        }
    } catch {
        errorMsg += `: ${errorText}`;
    }

    return errorMsg;
}
