import type MyAnimeNotesPlugin from "../main";
import type { UniversalMediaItem, MALItem } from "../transformers";
import {
    fetchCompleteMALAnimeList,
    fetchCompleteMALMangaList,
    fetchMALAnimeByStatus,
    fetchMALMangaByStatus,
    throttlePromises
} from "../api";
import { transformMALAnimeList, transformMALMangaList } from "../transformers";
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
): Promise<UniversalMediaItem[]> {
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
        rawItems = animeResults.flat() as MALItem[];
    } else {
        rawItems = (await fetchCompleteMALAnimeList(plugin)) as MALItem[];
    }

    debug.info(`Fetched ${rawItems.length} anime items`);

    // Transform to universal format
    const transformedItems = transformMALAnimeList(plugin, rawItems);

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
): Promise<UniversalMediaItem[]> {
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
        rawItems = mangaResults.flat() as MALItem[];
    } else {
        rawItems = (await fetchCompleteMALMangaList(plugin)) as MALItem[];
    }

    debug.info(`[MAL Sync] Fetched ${rawItems.length} manga items`);

    // Transform to universal format
    const transformedItems = transformMALMangaList(plugin, rawItems);

    return transformedItems;
}
