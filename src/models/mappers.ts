// Contains pure helper functions for transforming raw MAL API data into internal models.

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
    MALStudio,
    MALStartSeason
} from "./types";

/**
 * Generates the public MyAnimeList URL for a specific anime.
 * @param id - The MAL anime ID.
 * @returns Full URL string.
 */
export function getAnimeUrl(id: number): string {
    return `https://myanimelist.net/anime/${id}`;
}

/**
 * Generates the public MyAnimeList URL for a specific manga.
 * @param id - The MAL manga ID.
 * @returns Full URL string.
 */
export function getMangaUrl(id: number): string {
    return `https://myanimelist.net/manga/${id}`;
}

/**
 * Maps MAL's raw media status strings to the internal `MediaStatus` enum.
 * Normalizes differences between Anime (airing) and Manga (publishing) terminologies.
 *
 * @param malStatus - The status string from MAL API (e.g., "currently_airing").
 * @returns The standardized internal MediaStatus.
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
 * Maps MAL's user-specific list status strings to the internal `UserListStatus` enum.
 * Covers both watching (anime) and reading (manga) states.
 *
 * @param malStatus - The user status string from MAL API (e.g., "plan_to_watch").
 * @returns The standardized internal UserListStatus.
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
 * Parses the MAL picture object into a simplified internal structure.
 * Handles undefined inputs gracefully.
 *
 * @param malPicture - The raw picture object from MAL.
 * @returns Simplified Picture object or undefined.
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
 * Parses alternative titles (English, Japanese, Synonyms).
 * Ensures 'synonyms' is always an array, even if undefined in source.
 *
 * @param malTitles - The raw titles object from MAL.
 * @returns Structured AlternativeTitles object or undefined.
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
 * Parses the genres list, filtering out invalid or incomplete entries.
 *
 * @param malGenres - The raw array of genres from MAL.
 * @returns Array of clean Genre objects.
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
 * Parses the authors list (for Manga), filtering out invalid entries.
 * Flattens the nested `node` structure used by MAL API.
 *
 * @param malAuthors - The raw array of authors from MAL.
 * @returns Array of clean Author objects.
 */
export function parseAuthors(malAuthors: MALAuthor[] | undefined): Author[] {
    if (!malAuthors || !Array.isArray(malAuthors)) return [];

    return (
        malAuthors
            .filter(author => author != null && author.node != null)
            .map(author => ({
                firstName: author.node?.first_name || "",
                lastName: author.node?.last_name || "",
                role: author.role
            }))
            // Ensure author has at least a first or last name
            .filter(author => author.firstName || author.lastName)
    );
}

/**
 * Parses the studios list (for Anime).
 * Keeps objects ({ name: string }) to facilitate wiki link formatting later.
 *
 * @param malStudios - The raw array of studios from MAL.
 * @returns Array of objects containing studio names.
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
 * Parses the start season information (for Anime).
 * Returns a structured object with year and season.
 *
 * @param malSeason - The raw season object from MAL.
 * @returns Simplified season object or undefined.
 */
export function parseStartSeason(
    malSeason: MALStartSeason | undefined
): { year: number; season: string } | undefined {
    if (!malSeason || !malSeason.year || !malSeason.season) return undefined;

    return {
        year: malSeason.year,
        season: malSeason.season
    };
}
