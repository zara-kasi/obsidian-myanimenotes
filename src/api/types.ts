import type { MALItem } from "../models";

/**
 * Standard response structure from the MyAnimeList API (v2).
 * Handles both successful list retrieval (data + paging) and error states.
 */
export interface MALApiResponse {
    /** * The array of anime or manga items returned by the API.
     * Present on successful list requests.
     */
    data?: MALItem[];

    /**
     * Pagination details provided by MAL.
     * Used to traverse large lists via 'next' or 'previous' URLs.
     */
    paging?: {
        next?: string;
        previous?: string;
    };

    /** Error code string returned by MAL in case of failure. */
    error?: string;

    /** Human-readable error message returned by MAL. */
    message?: string;
}

/**
 * A standardized wrapper for HTTP responses within the API client.
 * Abstracts the specific response format (e.g., from Obsidian's requestUrl).
 */
export interface RequestResponse {
    /** HTTP status code (e.g., 200, 429, 404). */
    status: number;

    /** * The parsed JSON body of the response, if applicable.
     * May be undefined if the response body was empty or not JSON.
     */
    json?: Record<string, unknown>;

    /** The raw text body of the response. */
    text: string;
}
