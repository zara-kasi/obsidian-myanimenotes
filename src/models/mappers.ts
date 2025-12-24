// Contains pure helper functions

import {
    MediaStatus,
    UserListStatus,
    Picture,
    AlternativeTitles,
    Genre,
    Author
} from "./types";
import type {
    MALPicture,
    MALAlternativeTitles,
    MALGenre,
    MALAuthor,
    MALStudio
} from "./types";

/**
 * Generates MyAnimeList URL for anime
 */
export function getAnimeUrl(id: number): string {
    return `https://myanimelist.net/anime/${id}`;
}

/**
 * Generates MyAnimeList URL for manga
 */
export function getMangaUrl(id: number): string {
    return `https://myanimelist.net/manga/${id}`;
}

/**
 * Maps MAL status to status
 */
export function mapStatus(malStatus: string): MediaStatus {
    switch (malStatus) {
        case "finished_airing":
        case "finished":
            return MediaStatus.FINISHED;
        case "currently_airing":
        case "currently_publishing":
            return MediaStatus.CURRENTLY_RELEASING;
        case "not_yet_aired":
        case "not_yet_published":
            return MediaStatus.NOT_YET_RELEASED;
        default:
            return MediaStatus.FINISHED;
    }
}

/**
 * Maps MAL user status to user list status
 */
export function mapUserStatus(malStatus: string): UserListStatus {
    switch (malStatus) {
        case "watching":
            return UserListStatus.WATCHING;
        case "reading":
            return UserListStatus.READING;
        case "completed":
            return UserListStatus.COMPLETED;
        case "on_hold":
            return UserListStatus.ON_HOLD;
        case "dropped":
            return UserListStatus.DROPPED;
        case "plan_to_watch":
            return UserListStatus.PLAN_TO_WATCH;
        case "plan_to_read":
            return UserListStatus.PLAN_TO_READ;
        default:
            return UserListStatus.PLAN_TO_WATCH;
    }
}

/**
 * parses MAL picture object
 */
export function parsePicture(
    malPicture: MALPicture | undefined
): Picture | undefined {
    if (!malPicture) return undefined;

    return {
        medium: malPicture.medium,
        large: malPicture.large
    };
}

/**
 * parses MAL alternative titles
 */
export function parseAlternativeTitles(
    malTitles: MALAlternativeTitles | undefined
): AlternativeTitles | undefined {
    if (!malTitles) return undefined;

    return {
        en: malTitles.en,
        ja: malTitles.ja,
        synonyms: malTitles.synonyms || []
    };
}

/**
 * parses MAL genres - with strict null filtering
 */
export function parseGenres(malGenres: MALGenre[] | undefined): Genre[] {
    if (!malGenres || !Array.isArray(malGenres)) return [];

    return malGenres
        .filter(
            genre => genre != null && genre.id != null && genre.name != null
        )
        .map(genre => ({
            id: genre.id,
            name: genre.name
        }));
}

/**
 * parses MAL authors (for manga) - with strict null filtering
 */
export function parseAuthors(malAuthors: MALAuthor[] | undefined): Author[] {
    if (!malAuthors || !Array.isArray(malAuthors)) return [];

    return malAuthors
        .filter(author => author != null && author.node != null)
        .map(author => ({
            firstName: author.node?.first_name || "",
            lastName: author.node?.last_name || "",
            role: author.role
        }))
        .filter(author => author.firstName || author.lastName);
}

/**
 * parses MAL studios array - keeps objects for wiki link formatting
 */
export function parseStudios(
    malStudios: MALStudio[] | undefined
): Array<{ name: string }> {
    if (!malStudios || !Array.isArray(malStudios)) return [];

    return malStudios
        .filter(
            studio =>
                studio != null && studio.name != null && studio.name !== ""
        )
        .map(studio => ({ name: studio.name }));
}

/**
 * Converts duration from seconds to minutes (rounded)
 */
export function convertDurationToMinutes(
    seconds: number | undefined
): number | undefined {
    if (!seconds) return undefined;
    return Math.round(seconds / 60);
}
