import type MyAnimeNotesPlugin from "../main";
import type { MediaItem, MALItem } from "../models";
import {
    fetchCompleteMALAnimeList,
    fetchCompleteMALMangaList,
    fetchMALAnimeByStatus,
    fetchMALMangaByStatus,
    throttlePromises
} from "../api";
import { parseAnimeList, parseMangaList } from "../models";
import { logger } from "../utils/logger";

const log = new logger("Fetchers");

/**
 * Syncs the user's Anime list from MyAnimeList.
 *
 * Behavior:
 * - If `statuses` is provided: Fetches specific categories in parallel (e.g., only "watching" and "plan_to_watch").
 * Uses throttling to prevent hitting API rate limits during these parallel requests.
 * - If `statuses` is empty/undefined: Fetches the *entire* anime list in one go using paging.
 *
 * @param plugin - The main plugin instance.
 * @param statuses - (Optional) Array of specific statuses to filter by (e.g., ["watching"]).
 * @returns A promise resolving to an array of transformed `MediaItem` objects ready for storage.
 */
export async function syncAnimeList(
    plugin: MyAnimeNotesPlugin,
    statuses?: string[]
): Promise<MediaItem[]> {
    log.debug("Starting anime sync...");

    let rawItems: MALItem[] = [];

    // Strategy 1: Status-based Sync (Fetch specific tabs only)
    if (statuses && statuses.length > 0) {
        const animePromises = statuses.map(status =>
            fetchMALAnimeByStatus(
                plugin,
                status as
                    | "watching"
                    | "completed"
                    | "on_hold"
                    | "dropped"
                    | "plan_to_watch"
            )
        );

        // Execute requests with concurrency control (max 2 requests at a time, 300ms delay)
        // to avoid triggering MAL's aggressive rate limiting.
        const animeResults = await throttlePromises(animePromises, 2, 300);
        rawItems = animeResults.flat();
    } else {
        // Strategy 2: Complete Sync (Fetch everything)
        rawItems = await fetchCompleteMALAnimeList(plugin);
    }

    log.debug(`Fetched ${rawItems.length} anime items`);

    // Transform raw API responses into our internal MediaItem format
    // This handles mapping fields like 'main_picture' to 'coverImage', etc.
    const transformedItems = parseAnimeList(plugin, rawItems);

    return transformedItems;
}

/**
 * Syncs the user's Manga list from MyAnimeList.
 *
 * Behavior:
 * - If `statuses` is provided: Fetches specific categories in parallel (e.g., only "reading").
 * - If `statuses` is empty/undefined: Fetches the *entire* manga list.
 *
 * @param plugin - The main plugin instance.
 * @param statuses - (Optional) Array of specific statuses to filter by (e.g., ["reading"]).
 * @returns A promise resolving to an array of transformed `MediaItem` objects ready for storage.
 */
export async function syncMangaList(
    plugin: MyAnimeNotesPlugin,
    statuses?: string[]
): Promise<MediaItem[]> {
    log.debug("Starting manga sync...");

    let rawItems: MALItem[] = [];

    // Strategy 1: Status-based Sync (Fetch specific tabs only)
    if (statuses && statuses.length > 0) {
        const mangaPromises = statuses.map(status =>
            fetchMALMangaByStatus(
                plugin,
                status as
                    | "reading"
                    | "completed"
                    | "on_hold"
                    | "dropped"
                    | "plan_to_read"
            )
        );

        // Execute requests with concurrency control (max 2 requests at a time, 300ms delay)
        const mangaResults = await throttlePromises(mangaPromises, 2, 300);
        rawItems = mangaResults.flat();
    } else {
        // Strategy 2: Complete Sync (Fetch everything)
        rawItems = await fetchCompleteMALMangaList(plugin);
    }

    log.debug(`[MAL Sync] Fetched ${rawItems.length} manga items`);

    // Transform raw API responses into our internal MediaItem format
    const transformedItems = parseMangaList(plugin, rawItems);

    return transformedItems;
}
