// It focuses solely on orchestrating the parsing logic by consuming the types and mappers

import type MyAnimeNotesPlugin from "../main";
import { logger } from "../utils/logger";
import { MediaItem, Picture, MediaCategory } from "./types";
import type { MALItem } from "./types";
import {
    getAnimeUrl,
    getMangaUrl,
    mapStatus,
    mapUserStatus,
    parsePicture,
    parseAlternativeTitles,
    parseGenres,
    parseAuthors,
    parseStudios,
    convertDurationToMinutes
} from "./mappers";

const log = new logger("ModelsMedia");

/**
 * Transforms a raw MAL Anime object into the internal `MediaItem` format.
 *
 * Handles differences in API response structures (e.g., "User List" vs "Details" endpoints)
 * via the `malItem.node || malItem` fallback.
 *
 * @param plugin - Plugin instance (unused in logic but kept for future extensibility).
 * @param malItem - The raw data object from MyAnimeList API.
 * @returns A normalized MediaItem object ready for storage.
 */
export function parseAnime(
    plugin: MyAnimeNotesPlugin,
    malItem: MALItem
): MediaItem {
    // API responses usually wrap details in a 'node' property, but sometimes it's flat.
    const node = malItem.node || malItem;
    const listStatus = malItem.list_status;

    log.debug("Processing anime:", {
        title: node.title,
        hasListStatus: !!listStatus,
        listStatus: listStatus
    });

    return {
        // Basic info
        id: node.id,
        title: node.title,
        category: MediaCategory.ANIME,
        url: getAnimeUrl(node.id),

        // Visual
        mainPicture: parsePicture(node.main_picture),
        pictures:
            (node.pictures?.map(parsePicture).filter(Boolean) as Picture[]) ||
            [],

        // Alternative titles
        alternativeTitles: parseAlternativeTitles(node.alternative_titles),

        // Description
        synopsis: node.synopsis,

        // Metadata
        mediaType: node.media_type || "unknown",
        status: mapStatus(node.status),
        mean: node.mean,

        // Genres
        genres: parseGenres(node.genres),
        // Airing dates
        releasedStart: node.start_date,
        releasedEnd: node.end_date,

        // Anime-specific
        numEpisodes: node.num_episodes,
        source: node.source,
        studios: parseStudios(node.studios),
        duration: convertDurationToMinutes(node.average_episode_duration),

        // User list data (Watch status, score, progress)
        userStatus: listStatus ? mapUserStatus(listStatus.status) : undefined,
        userScore: listStatus?.score || 0,
        numEpisodesWatched: listStatus?.num_episodes_watched || 0,
        userStartDate: listStatus?.start_date,
        userFinishDate: listStatus?.finish_date,

        // Sync metadata
        updatedAt: listStatus?.updated_at,
        // Platform metadata
        platform: "mal"
    };
}

/**
 * Transforms a raw MAL Manga object into the internal `MediaItem` format.
 *
 * similar to `parseAnime`, but maps specific fields for Manga (Volumes, Chapters, Authors).
 *
 * @param plugin - Plugin instance.
 * @param malItem - The raw data object from MyAnimeList API.
 * @returns A normalized MediaItem object ready for storage.
 */
export function parseManga(
    plugin: MyAnimeNotesPlugin,
    malItem: MALItem
): MediaItem {
    const node = malItem.node || malItem;
    const listStatus = malItem.list_status;

    return {
        // Basic info
        id: node.id,
        title: node.title,
        category: MediaCategory.MANGA,
        url: getMangaUrl(node.id),

        // Visual
        mainPicture: parsePicture(node.main_picture),
        pictures:
            (node.pictures?.map(parsePicture).filter(Boolean) as Picture[]) ||
            [],

        // Alternative titles
        alternativeTitles: parseAlternativeTitles(node.alternative_titles),

        // Description
        synopsis: node.synopsis,

        // Metadata
        mediaType: node.media_type || "unknown",
        status: mapStatus(node.status),
        mean: node.mean,

        // Genres
        genres: parseGenres(node.genres),
        // Publication dates
        releasedStart: node.start_date,
        releasedEnd: node.end_date,

        // Manga-specific
        numVolumes: node.num_volumes,
        numChapters: node.num_chapters,
        authors: parseAuthors(node.authors),

        // User list data (Read status, score, progress)
        userStatus: listStatus ? mapUserStatus(listStatus.status) : undefined,
        userScore: listStatus?.score || 0,
        numVolumesRead: listStatus?.num_volumes_read || 0,
        numChaptersRead: listStatus?.num_chapters_read || 0,
        userStartDate: listStatus?.start_date,
        userFinishDate: listStatus?.finish_date,

        // Sync metadata
        updatedAt: listStatus?.updated_at,
        // Platform metadata
        platform: "mal"
    };
}

/**
 * Batch processes an array of MAL Anime items.
 * Handles array validation and maps each item individually.
 *
 * @param plugin - Plugin instance.
 * @param malItems - Array of raw API items.
 * @returns Array of clean MediaItem objects.
 */
export function parseAnimeList(
    plugin: MyAnimeNotesPlugin,
    malItems: MALItem[]
): MediaItem[] {

    if (!Array.isArray(malItems)) {
        log.error("Expected array but got:", typeof malItems);
        return [];
    }

    return malItems.map(item => parseAnime(plugin, item));
}

/**
 * Batch processes an array of MAL Manga items.
 * Handles array validation and maps each item individually.
 *
 * @param plugin - Plugin instance.
 * @param malItems - Array of raw API items.
 * @returns Array of clean MediaItem objects.
 */
export function parseMangaList(
    plugin: MyAnimeNotesPlugin,
    malItems: MALItem[]
): MediaItem[] {
    if (!Array.isArray(malItems)) {
        log.error("Expected array but got:", typeof malItems);
        return [];
    }

    return malItems.map(item => parseManga(plugin, item));
}
