import { requestUrl } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import { ensureValidToken, getAuthHeaders } from "../auth";
import { logger } from "../utils/logger";
import { MAL_API_BASE, RATE_LIMIT_CONFIG } from "./constants";
import type { MALApiResponse, RequestResponse } from "./types";

/**
 * Logger instance for the MalApiClient.
 * Used for tracking API request status, rate limits, and errors.
 */
const log = new logger("MalApiClient");

/**
 * Calculates the delay duration for exponential backoff with jitter.
 * Used to prevent thundering herd problems when retrying failed requests.
 *
 * @param attempt - The current retry attempt index (starts at 0).
 * @returns The calculated delay in milliseconds.
 */
function calculateBackoffDelay(attempt: number): number {
    const { INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS } = RATE_LIMIT_CONFIG;

    // Calculate exponential delay: Initial * 2^attempt, capped at Max Delay
    const exponentialDelay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt),
        MAX_RETRY_DELAY_MS
    );
    // Add jitter (±20%) to randomize the retry interval
    const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
    return Math.floor(exponentialDelay + jitter);
}

/**
 * Helper to parse error messages from a RequestResponse object.
 * Attempts to extract a meaningful message from JSON, falling back to text.
 *
 * @param response - The response object from requestUrl.
 * @returns A string representation of the error.
 */
function parseErrorMessage(response: RequestResponse): string {
    try {
        const data = (response.json ||
            (response.text ? JSON.parse(response.text) : {})) as {
            error?: string;
            message?: string;
        };
        // Return specific API error message if available
        if (data.error) return data.message || data.error;
    } catch {
        log.error("[MAL Auth] Failed to parse error response");
    }
    return response.text || "Unknown error";
}

/**
 * Core function to make authenticated HTTP GET requests to the MyAnimeList API.
 * Handles authentication token validation, request construction, and retry logic
 * for rate limits (429) or server errors (5xx).
 *
 * @param plugin - The plugin instance (for accessing settings and tokens).
 * @param endpoint - The API endpoint (e.g., `/users/@me/animelist`).
 * @param params - Optional query parameters.
 * @returns A Promise resolving to the parsed JSON response.
 * @throws Error if authentication fails or max retries are exceeded.
 */
export async function makeMALRequest(
    plugin: MyAnimeNotesPlugin,
    endpoint: string,
    params: Record<string, string> = {}
): Promise<MALApiResponse> {
    // Ensure we have a valid access token before making the request
    await ensureValidToken(plugin);

    const headers = getAuthHeaders(plugin);
    if (!headers) throw new Error("Not authenticated with MyAnimeList");

    // Construct the full URL with query parameters
    const url = new URL(`${MAL_API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) =>
        url.searchParams.append(key, value)
    );

    let lastError: Error | null = null;
    const { MAX_RETRIES } = RATE_LIMIT_CONFIG;

    // Retry loop
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Perform the request using Obsidian's requestUrl API
            // 'throw: false' allows us to manually handle status codes
            const response = await requestUrl({
                url: url.toString(),
                method: "GET",
                headers,
                throw: false
            });

            // Success: HTTP 2xx
            if (response.status >= 200 && response.status < 300) {
                const data: MALApiResponse = (response.json ||
                    JSON.parse(response.text)) as MALApiResponse;
                return data;
            }

            // Retryable Errors: Rate Limit (429) or Server Error (5xx)
            if (
                response.status === 429 ||
                (response.status >= 500 && response.status < 600)
            ) {
                if (attempt < MAX_RETRIES) {
                    const delay = calculateBackoffDelay(attempt);
                    const type =
                        response.status === 429 ? "Rate limit" : "Server error";

                    // Create a readable log message
                    const msg = `${type} (${
                        response.status
                    }). Retrying in ${Math.ceil(delay / 1000)}s...`;

                    log.error(msg);

                    // Wait for the calculated backoff period
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
            }

            // Client Error (4xx) - Fail immediately (except 429)
            if (
                response.status >= 400 &&
                response.status < 500 &&
                response.status !== 429
            ) {
                throw new Error(
                    `MAL API request failed (HTTP ${
                        response.status
                    }): ${parseErrorMessage(response)}`
                );
            }

            // Fallback for other status codes
            throw new Error(
                `MAL API request failed (HTTP ${response.status}): ${response.text}`
            );
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error));

            // Retry on Network Errors if attempts remain
            if (attempt < MAX_RETRIES) {
                const delay = calculateBackoffDelay(attempt);

                const msg = `Network error. Retrying in ${Math.ceil(
                    delay / 1000
                )}s...`;

                log.error(msg);

                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            break;
        }
    }

    // If loop completes without success, throw the last encountered error
    throw new Error(
        `MAL API request failed after ${MAX_RETRIES} retries: ${
            lastError?.message || "Unknown error"
        }`
    );
}

/**
 * Utility to execute a list of promises with throttling.
 * Processes promises in batches to avoid overwhelming the API or UI.
 *
 * @template T - The return type of the promises.
 * @param promises - The array of promises to execute.
 * @param batchSize - Number of promises to run concurrently (default: 2).
 * @param delayBetweenBatchesMs - Delay in ms between starting batches (default: 300).
 * @returns A Promise resolving to an array of all results.
 */
export async function throttlePromises<T>(
    promises: Promise<T>[],
    batchSize = 2,
    delayBetweenBatchesMs = 300
): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < promises.length; i += batchSize) {
        const batch = promises.slice(i, i + batchSize);
        results.push(...(await Promise.all(batch)));
        
        // Add delay if there are more batches to process
        if (i + batchSize < promises.length) {
            await new Promise(resolve =>
                setTimeout(resolve, delayBetweenBatchesMs)
            );
        }
    }
    return results;
}
