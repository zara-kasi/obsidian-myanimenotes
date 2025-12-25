import { requestUrl } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import { ensureValidToken, getAuthHeaders } from "../auth";
import { showNotice } from "../utils/notice";
import { logger } from "../utils/logger";
import { MAL_API_BASE, RATE_LIMIT_CONFIG } from "./constants";
import type { MALApiResponse, RequestResponse } from "./types";

const log = new logger("MalApiClient");

/**
 * Calculates exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number): number {
    const { INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS } = RATE_LIMIT_CONFIG;

    const exponentialDelay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt),
        MAX_RETRY_DELAY_MS
    );
    // Add jitter (±20%)
    const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
    return Math.floor(exponentialDelay + jitter);
}

function parseErrorMessage(response: RequestResponse): string {
    try {
        const data = (response.json ||
            (response.text ? JSON.parse(response.text) : {})) as {
            error?: string;
            message?: string;
        };
        if (data.error) return data.message || data.error;
    } catch {
        log.error("[MAL Auth] Failed to parse error response");
    }
    return response.text || "Unknown error";
}

/**
 * Core function to make authenticated requests with retry logic
 */
export async function makeMALRequest(
    plugin: MyAnimeNotesPlugin,
    endpoint: string,
    params: Record<string, string> = {}
): Promise<MALApiResponse> {
    await ensureValidToken(plugin);

    const headers = getAuthHeaders(plugin);
    if (!headers) throw new Error("Not authenticated with MyAnimeList");

    const url = new URL(`${MAL_API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) =>
        url.searchParams.append(key, value)
    );

    let lastError: Error | null = null;
    const { MAX_RETRIES } = RATE_LIMIT_CONFIG;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await requestUrl({
                url: url.toString(),
                method: "GET",
                headers,
                throw: false
            });

            // Success
            if (response.status >= 200 && response.status < 300) {
                const data: MALApiResponse = (response.json ||
                    JSON.parse(response.text)) as MALApiResponse;
                return data;
            }

            // Rate Limit (429) or Server Error (5xx)
            if (
                response.status === 429 ||
                (response.status >= 500 && response.status < 600)
            ) {
                if (attempt < MAX_RETRIES) {
                    const delay = calculateBackoffDelay(attempt);
                    const type =
                        response.status === 429 ? "Rate limit" : "Server error";

                    // Create a readable message
                    const msg = `${type} (${
                        response.status
                    }). Retrying in ${Math.ceil(delay / 1000)}s...`;

                    log.error(msg);

                    // Notify the user so they know the plugin is waiting
                    showNotice(msg, "warning");

                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
            }

            // Client Error (4xx) - Fail immediately
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

            throw new Error(
                `MAL API request failed (HTTP ${response.status}): ${response.text}`
            );
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error));

            // Only retry network errors if we have attempts left
            if (attempt < MAX_RETRIES) {
                const delay = calculateBackoffDelay(attempt);

                const msg = `Network error. Retrying in ${Math.ceil(
                    delay / 1000
                )}s...`;

                log.error(msg);

                // Notify the user
                showNotice(msg, "warning");

                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            break;
        }
    }

    throw new Error(
        `MAL API request failed after ${MAX_RETRIES} retries: ${
            lastError?.message || "Unknown error"
        }`
    );
}

/**
 * Utility to throttle parallel promises
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
        if (i + batchSize < promises.length) {
            await new Promise(resolve =>
                setTimeout(resolve, delayBetweenBatchesMs)
            );
        }
    }
    return results;
}
