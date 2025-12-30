import type { PropertyMetadata } from "./types";

/**
 * A list of metadata properties that are common to both Anime and Manga media types.
 *
 * These definitions act as the source of truth for:
 * 1. The variable names used in templates (e.g., `{{title}}`).
 * 2. The default frontmatter keys (e.g., `title: ...`).
 * 3. The user-friendly labels shown in the settings UI.
 */
export const COMMON_PROPERTIES: PropertyMetadata[] = [
    { key: "title", label: "Title", defaultName: "title" },
    {
        key: "alternativeTitles",
        label: "Alternative Titles",
        defaultName: "aliases"
    },
    {
        key: "titleEnglish",
        label: "English Title",
        defaultName: "title_en"
    },
    {
        key: "titleJapanese",
        label: "Japanese Title",
        defaultName: "title_ja"
    },
    {
        key: "titleSynonyms",
        label: "Synonyms",
        defaultName: "synonyms"
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
    { key: "genres", label: "Genres & Themes", defaultName: "genres" },
    { key: "releasedStart", label: "Released Start", defaultName: "released" },
    { key: "releasedEnd", label: "Released End", defaultName: "ended" },
    { key: "source", label: "Source Material", defaultName: "origin" },
    { key: "userStatus", label: "User Status", defaultName: "status" },
    { key: "userScore", label: "User Rating", defaultName: "rating" },
    { key: "userStartDate", label: "Started Date", defaultName: "started" },
    { key: "userFinishDate", label: "Finished Date", defaultName: "finished" }
];

/**
 * The complete list of available properties for **Anime** templates.
 * Includes all common properties plus anime-specific fields like episodes and studios.
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
 * The complete list of available properties for **Manga** templates.
 * Includes all common properties plus manga-specific fields like volumes, chapters, and authors.
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
 * Retrieves the metadata definition for a specific property key.
 *
 * @param key - The template variable name (e.g., "numEpisodes").
 * @param category - The media category ("anime" or "manga").
 * @returns The metadata object if found, or undefined.
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
 * Returns the full list of available properties for a given category.
 * Used primarily by the suggestion UI to populate the autocomplete list.
 *
 * @param category - "anime" or "manga".
 * @returns An array of PropertyMetadata objects.
 */
export function getAvailableProperties(
    category: "anime" | "manga"
): PropertyMetadata[] {
    return category === "anime" ? ANIME_PROPERTIES : MANGA_PROPERTIES;
}
