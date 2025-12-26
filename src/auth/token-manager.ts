// Token validation, refresh, and management

import { requestUrl } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import type { MALTokenResponse } from "./types";
import { MAL_TOKEN_URL, TOKEN_EXPIRY_BUFFER } from "./constants";
import { logger } from "../utils/logger";

const log = new logger("AuthTokenManager");

/**
 * Checks if the current access token is valid based on its expiry time.
 * Uses a safety buffer to consider a token "expired" slightly before the actual deadline
 * to avoid race conditions during network requests.
 *
 * @param plugin - Plugin instance containing settings.
 * @returns True if token exists and is within the valid time window.
 */
export function isTokenValid(plugin: MyAnimeNotesPlugin): boolean {
    return !!(
        plugin.settings.malAccessToken &&
        plugin.settings.malTokenExpiry &&
        Date.now() < plugin.settings.malTokenExpiry - TOKEN_EXPIRY_BUFFER
    );
}

/**
 * Comprehensive check for user authentication status.
 * Verifies both the internal authenticated flag and the token's validity.
 *
 * @param plugin - Plugin instance.
 * @returns True if the user is fully authenticated and ready to make requests.
 */
export function isAuthenticated(plugin: MyAnimeNotesPlugin): boolean {
    return plugin.settings.malAuthenticated && isTokenValid(plugin);
}

/**
 * Refreshes the access token using the stored refresh token.
 * This is crucial for maintaining long-term sessions without forcing the user to re-login.
 *
 * @param plugin - Plugin instance.
 * @throws Error if no refresh token exists or the API request fails.
 */
export async function refreshAccessToken(
    plugin: MyAnimeNotesPlugin
): Promise<void> {
    if (!plugin.settings.malRefreshToken) {
        throw new Error("No refresh token available");
    }

    const body = new URLSearchParams({
        client_id: plugin.settings.malClientId,
        refresh_token: plugin.settings.malRefreshToken,
        grant_type: "refresh_token"
    });

    // Add client secret if present (required by some API clients/configurations)
    if (plugin.settings.malClientSecret?.trim()) {
        body.append("client_secret", plugin.settings.malClientSecret.trim());
    }

    // Perform the refresh request
    const res = await requestUrl({
        url: MAL_TOKEN_URL,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        throw: false
    });

    if (res.status < 200 || res.status >= 300) {
        const errorText =
            res.text || JSON.stringify(res.json) || "Unknown error";
        throw new Error(
            `Token refresh failed (HTTP ${res.status}): ${errorText}`
        );
    }

    const data = (res.json || JSON.parse(res.text)) as MALTokenResponse;

    // Update tokens in settings
    plugin.settings.malAccessToken = data.access_token;
    // Some OAuth providers rotate refresh tokens; if new one provided, save it, else keep old
    plugin.settings.malRefreshToken =
        data.refresh_token || plugin.settings.malRefreshToken;
    plugin.settings.malTokenExpiry = Date.now() + data.expires_in * 1000;
    
    await plugin.saveSettings();
}

/**
 * Middleware-like function to ensure a valid token exists before operations.
 * If the token is expired, it automatically attempts to refresh it.
 *
 * @param plugin - Plugin instance.
 * @throws Error if the token is invalid and cannot be refreshed (requiring user re-login).
 */
export async function ensureValidToken(
    plugin: MyAnimeNotesPlugin
): Promise<void> {
    if (!isTokenValid(plugin)) {
        // If expired and no way to refresh, we must fail
        if (!plugin.settings.malRefreshToken) {
            throw new Error(
                "Token expired and no refresh token available. Please re-authenticate."
            );
        }

        try {
            await refreshAccessToken(plugin);
            log.debug("Token automatically refreshed");
        } catch (e) {
            // If refresh fails (e.g., refresh token revoked), mark as unauthenticated
            log.error("Automatic token refresh failed", e);
            plugin.settings.malAuthenticated = false;
            await plugin.saveSettings();
            throw new Error(
                "MAL authentication expired. Please re-authenticate."
            );
        }
    }
}

/**
 * Generates the Authorization header for HTTP requests.
 *
 * @param plugin - Plugin instance.
 * @returns An object containing the Authorization header, or null if invalid.
 */
export function getAuthHeaders(
    plugin: MyAnimeNotesPlugin
): Record<string, string> | null {
    if (!isTokenValid(plugin)) return null;
    return { Authorization: `Bearer ${plugin.settings.malAccessToken}` };
}
