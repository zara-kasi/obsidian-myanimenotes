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
import { log } from "../utils";

/**
 * Syncs anime list from MAL
 * @param plugin Plugin instance
 * @param statuses Optional array of statuses to sync
 * @returns Array of transformed anime items
 */
export async function syncAnimeList(
    plugin: MyAnimeNotesPlugin,
    statuses?: string[]
): Promise<MediaItem[]> {
    const debug = log.createSub("MALSync");

    debug.info("Starting anime sync...");

    let rawItems: MALItem[] = [];

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

        const animeResults = await throttlePromises(animePromises, 2, 300);
        rawItems = animeResults.flat();
    } else {
        rawItems = await fetchCompleteMALAnimeList(plugin);
    }

    debug.info(`Fetched ${rawItems.length} anime items`);

    // Parse item
    const transformedItems = parseAnimeList(plugin, rawItems);

    return transformedItems;
}

/**
 * Syncs manga list from MAL
 * @param plugin Plugin instance
 * @param statuses Optional array of statuses to sync
 * @returns Array of transformed manga items
 */
export async function syncMangaList(
    plugin: MyAnimeNotesPlugin,
    statuses?: string[]
): Promise<MediaItem[]> {
    const debug = log.createSub("MALSync");

    debug.info("Starting manga sync...");

    let rawItems: MALItem[] = [];

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

        const mangaResults = await throttlePromises(mangaPromises, 2, 300);
        rawItems = mangaResults.flat();
    } else {
        rawItems = await fetchCompleteMALMangaList(plugin);
    }

    debug.info(`[MAL Sync] Fetched ${rawItems.length} manga items`);

    // Parse item
    const transformedItems = parseMangaList(plugin, rawItems);

    return transformedItems;
}
