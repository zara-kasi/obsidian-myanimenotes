// It focuses solely on orchestrating the parsing logic by consuming the types and mappers

import type MyAnimeNotesPlugin from "../main";
import { log } from "../utils";
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

/**
 * parses a single MAL anime item to format
 */
export function parseAnime(
    plugin: MyAnimeNotesPlugin,
    malItem: MALItem
): MediaItem {
    const debug = log.createSub("MAL-Parser");
    const node = malItem.node || malItem;
    const listStatus = malItem.list_status;

    debug.info("Processing anime:", {
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

        // User list data
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
 * parses a single MAL manga item to format
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

        // User list data
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
 * parses an array of MAL anime items
 */
export function parseAnimeList(
    plugin: MyAnimeNotesPlugin,
    malItems: MALItem[]
): MediaItem[] {
    const debug = log.createSub("MAL-Parser");

    if (!Array.isArray(malItems)) {
        debug.warn("Expected array but got:", typeof malItems);
        return [];
    }

    return malItems.map(item => parseAnime(plugin, item));
}

/**
 * parses an array of MAL manga items
 */
export function parseMangaList(
    plugin: MyAnimeNotesPlugin,
    malItems: MALItem[]
): MediaItem[] {
    const debug = log.createSub("MAL-Parser");

    if (!Array.isArray(malItems)) {
        debug.warn("Expected array but got:", typeof malItems);
        return [];
    }

    return malItems.map(item => parseManga(plugin, item));
}
