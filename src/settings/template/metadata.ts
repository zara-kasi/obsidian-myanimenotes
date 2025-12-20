import type { PropertyMetadata } from "./types";

/**
 * Common properties (shared by both anime and manga)
 */
export const COMMON_PROPERTIES: PropertyMetadata[] = [
    { key: "title", label: "Title", defaultName: "title" },
    {
        key: "alternativeTitles",
        label: "Alternative Titles",
        defaultName: "aliases"
    },
    { key: "id", label: "Media ID", defaultName: "id" },
    { key: "category", label: "Category", defaultName: "category" },
    { key: "platform", label: "Platform", defaultName: "platform" },
    { key: "url", label: "Source URL", defaultName: "source" },
    { key: "mainPicture", label: "Cover Image", defaultName: "image" },
    { key: "synopsis", label: "Synopsis", defaultName: "description" },
    { key: "mediaType", label: "Media Type", defaultName: "media" },
    { key: "status", label: "Status", defaultName: "state" },
    { key: "mean", label: "Average Score", defaultName: "score" },
    { key: "genres", label: "Genres", defaultName: "genres" },
    { key: "releasedStart", label: "Released Start", defaultName: "released" },
    { key: "releasedEnd", label: "Released End", defaultName: "ended" },
    { key: "source", label: "Source Material", defaultName: "origin" },
    { key: "userStatus", label: "User Status", defaultName: "status" },
    { key: "userScore", label: "User Rating", defaultName: "rating" },
    { key: "userStartDate", label: "Started Date", defaultName: "started" },
    { key: "userFinishDate", label: "Finished Date", defaultName: "finished" }
];

/**
 * Anime-specific properties (including common)
 */
export const ANIME_PROPERTIES: PropertyMetadata[] = [
    ...COMMON_PROPERTIES,
    { key: "numEpisodes", label: "Total Episodes", defaultName: "episodes" },
    {
        key: "numEpisodesWatched",
        label: "Episodes Watched",
        defaultName: "eps_seen"
    },
    { key: "studios", label: "Studios", defaultName: "studios" },
    { key: "duration", label: "Duration", defaultName: "duration" }
];

/**
 * Manga-specific properties (including common)
 */
export const MANGA_PROPERTIES: PropertyMetadata[] = [
    ...COMMON_PROPERTIES,
    { key: "numVolumes", label: "Total Volumes", defaultName: "volumes" },
    { key: "numVolumesRead", label: "Volumes Read", defaultName: "vol_read" },
    { key: "numChapters", label: "Total Chapters", defaultName: "chapters" },
    {
        key: "numChaptersRead",
        label: "Chapters Read",
        defaultName: "chap_read"
    },
    { key: "authors", label: "Authors", defaultName: "authors" }
];

/**
 * Gets property metadata by key
 */
export function getPropertyMetadata(
    key: string,
    category: "anime" | "manga"
): PropertyMetadata | undefined {
    const properties =
        category === "anime" ? ANIME_PROPERTIES : MANGA_PROPERTIES;
    return properties.find(p => p.key === key);
}

/**
 * Gets available properties for a category
 */
export function getAvailableProperties(
    category: "anime" | "manga"
): PropertyMetadata[] {
    return category === "anime" ? ANIME_PROPERTIES : MANGA_PROPERTIES;
}
