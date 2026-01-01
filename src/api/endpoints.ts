import type MyAnimeNotesPlugin from "../main";
import { logger } from "../utils/logger";
import { makeMALRequest } from "./client";
import { getDynamicFields } from "./constants";
import type { MALApiResponse } from "./types";
import type { MALItem } from "../models";

const log = new logger("ApiEndpoints");

/**
 * Internal helper to handle MAL API pagination automatically.
 * Repeatedly fetches pages until no 'next' link is provided or a safety limit is reached.
 *
 * @param plugin - The plugin instance for authentication.
 * @param endpoint - The API endpoint to fetch (e.g., "/users/@me/animelist").
 * @param params - Query parameters for the request.
 * @returns A Promise resolving to a flattened array of all items across all pages.
 */
async function fetchAllPages(
    plugin: MyAnimeNotesPlugin,
    endpoint: string,
    params: Record<string, string> = {}
): Promise<MALItem[]> {
    const allItems: MALItem[] = [];

    let nextUrl: string | null = null;
    let offset = 0;
    const limit = 100; // MAL API typically defaults to 10 or 100

    // Loop through pages
    do {
        const requestParams = {
            ...params,
            limit: limit.toString(),
            offset: offset.toString()
        };
        log.debug(`Fetching ${endpoint} (offset: ${offset})...`);

        // Perform the API request
        const data = await makeMALRequest(plugin, endpoint, requestParams);

        // Aggregate results
        if (data.data && Array.isArray(data.data)) {
            allItems.push(...(data.data as unknown as MALItem[]));
        }

        // Check for next page in pagination object
        nextUrl = data.paging?.next || null;
        offset += limit;

        // Safety break to prevent infinite loops or excessive memory usage
        if (offset > 10000) {
            log.error("Safety limit reached (10000 items)");
            break;
        }
    } while (nextUrl);

    return allItems;
}

// --- Anime Endpoints ---

/**
 * Fetches the authenticated user's entire anime list.
 * Includes NSFW entries to ensure list completeness.
 *
 * @param plugin - The plugin instance.
 * @returns Array of all anime items on the user's list.
 */
export async function fetchCompleteMALAnimeList(
    plugin: MyAnimeNotesPlugin
): Promise<MALItem[]> {
    const fields = getDynamicFields(plugin.settings.animeTemplate);

    return fetchAllPages(plugin, "/users/@me/animelist", {
        fields: fields, 
        nsfw: "true" 
    });
}

/**
 * Fetches anime items filtered by a specific watch status.
 * Useful for partial syncs or categorized views.
 *
 * @param plugin - The plugin instance.
 * @param status - The watch status (e.g., "watching", "completed").
 */
export async function fetchMALAnimeByStatus(
    plugin: MyAnimeNotesPlugin,
    status: "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch"
): Promise<MALItem[]> {
    const fields = getDynamicFields(plugin.settings.animeTemplate);

    return fetchAllPages(plugin, "/users/@me/animelist", {
        fields: fields,
        status,
        nsfw: "true"
    });
}

/**
 * Fetches detailed metadata for a single anime by its ID.
 * Used when updating a specific note or resolving a specific ID.
 *
 * @param plugin - The plugin instance.
 * @param animeId - The MyAnimeList ID of the anime.
 */
export async function fetchMALAnimeDetails(
    plugin: MyAnimeNotesPlugin,
    animeId: number
): Promise<MALApiResponse> {
    const fields = getDynamicFields(plugin.settings.animeTemplate);

    return makeMALRequest(plugin, `/anime/${animeId}`, {
        fields: fields
    });
}

// --- Manga Endpoints ---

/**
 * Fetches the authenticated user's entire manga list.
 *
 * @param plugin - The plugin instance.
 * @returns Array of all manga items on the user's list.
 */
export async function fetchCompleteMALMangaList(
    plugin: MyAnimeNotesPlugin
): Promise<MALItem[]> {
    const fields = getDynamicFields(plugin.settings.mangaTemplate);

    return fetchAllPages(plugin, "/users/@me/mangalist", {
        fields: fields,
        nsfw: "true"
    });
}

/**
 * Fetches manga items filtered by a specific read status.
 *
 * @param plugin - The plugin instance.
 * @param status - The read status (e.g., "reading", "completed").
 */
export async function fetchMALMangaByStatus(
    plugin: MyAnimeNotesPlugin,
    status: "reading" | "completed" | "on_hold" | "dropped" | "plan_to_read"
): Promise<MALItem[]> {
    const fields = getDynamicFields(plugin.settings.mangaTemplate);

    return fetchAllPages(plugin, "/users/@me/mangalist", {
        fields: fields,
        status,
        nsfw: "true"
    });
}

/**
 * Fetches detailed metadata for a single manga by its ID.
 *
 * @param plugin - The plugin instance.
 * @param mangaId - The MyAnimeList ID of the manga.
 */
export async function fetchMALMangaDetails(
    plugin: MyAnimeNotesPlugin,
    mangaId: number
): Promise<MALApiResponse> {
    const fields = getDynamicFields(plugin.settings.mangaTemplate);

    return makeMALRequest(plugin, `/manga/${mangaId}`, {
        fields: fields
    });
}
