import type MyAnimeNotesPlugin from "../main";
import { log } from "../utils";
import { ANIME_FIELDS, MANGA_FIELDS } from "./constants";
import { makeMALRequest } from "./client";
import type { MALApiResponse } from "./types";
import type { MALItem } from "../models";

/**
 * Internal helper for pagination
 */

async function fetchAllPages(
    plugin: MyAnimeNotesPlugin,
    endpoint: string,
    params: Record<string, string> = {}
): Promise<MALItem[]> {
    const debug = log.createSub("API");
    const allItems: MALItem[] = [];

    let nextUrl: string | null = null;
    let offset = 0;
    const limit = 100;

    do {
        const requestParams = {
            ...params,
            limit: limit.toString(),
            offset: offset.toString()
        };
        debug.info(`Fetching ${endpoint} (offset: ${offset})...`);

        const data = await makeMALRequest(plugin, endpoint, requestParams);

        if (data.data && Array.isArray(data.data)) {
            allItems.push(...(data.data as unknown as MALItem[]));
        }

        nextUrl = data.paging?.next || null;
        offset += limit;

        if (offset > 10000) {
            debug.warn("Safety limit reached (10000 items)");
            break;
        }

    } while (nextUrl);

    return allItems;
}

// --- Anime Endpoints ---

export async function fetchCompleteMALAnimeList(
    plugin: MyAnimeNotesPlugin
): Promise<MALItem[]> {
    return fetchAllPages(plugin, "/users/@me/animelist", {
        fields: ANIME_FIELDS,
        nsfw: "true"
    });
}

export async function fetchMALAnimeByStatus(
    plugin: MyAnimeNotesPlugin,
    status: "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch"
): Promise<MALItem[]> {
    return fetchAllPages(plugin, "/users/@me/animelist", {
        fields: ANIME_FIELDS,
        status,
        nsfw: "true"
    });
}

export async function fetchMALAnimeDetails(
    plugin: MyAnimeNotesPlugin,
    animeId: number
): Promise<MALApiResponse> {
    return makeMALRequest(plugin, `/anime/${animeId}`, {
        fields: ANIME_FIELDS
    });
}

// --- Manga Endpoints ---

export async function fetchCompleteMALMangaList(
    plugin: MyAnimeNotesPlugin
): Promise<MALItem[]> {
    return fetchAllPages(plugin, "/users/@me/mangalist", {
        fields: MANGA_FIELDS,
        nsfw: "true"
    });
}

export async function fetchMALMangaByStatus(
    plugin: MyAnimeNotesPlugin,
    status: "reading" | "completed" | "on_hold" | "dropped" | "plan_to_read"
): Promise<MALItem[]> {
    return fetchAllPages(plugin, "/users/@me/mangalist", {
        fields: MANGA_FIELDS,
        status,
        nsfw: "true"
    });
}

export async function fetchMALMangaDetails(
    plugin: MyAnimeNotesPlugin,
    mangaId: number
): Promise<MALApiResponse> {
    return makeMALRequest(plugin, `/manga/${mangaId}`, {
        fields: MANGA_FIELDS
    });
}
