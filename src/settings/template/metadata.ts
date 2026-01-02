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
    {
        key: "title",
        label: "The official main title of the media.",
        defaultName: "title"
    },
    {
        key: "alternativeTitles",
        label: "Full list of alternative titles (includes English, Japanese, and synonyms).",
        defaultName: "aliases"
    },
    {
        key: "titleEnglish",
        label: "The official English title.",
        defaultName: "title_en"
    },
    {
        key: "titleJapanese",
        label: "The original Japanese title.",
        defaultName: "title_ja"
    },
    {
        key: "titleSynonyms",
        label: "A list of other synonym titles.",
        defaultName: "synonyms"
    },
    {
        key: "id",
        label: "The unique ID assigned by MyAnimeList.",
        defaultName: "id"
    },
    {
        key: "category",
        label: "The media category (e.g., 'anime' or 'manga').",
        defaultName: "category"
    },
    {
        key: "platform",
        label: "The source platform (e.g., 'MyAnimeList').",
        defaultName: "platform"
    },
    {
        key: "url",
        label: "The URL to the MyAnimeList entry.",
        defaultName: "source"
    },
    {
        key: "mainPicture",
        label: "The URL of the main cover image.",
        defaultName: "image"
    },
    {
        key: "synopsis",
        label: "The plot synopsis or description.",
        defaultName: "description"
    },
    {
        key: "mediaType",
        label: "The format of the media (e.g., TV, Movie, OVA).",
        defaultName: "media"
    },
    {
        key: "status",
        label: "The current release status (e.g., Finished Airing, Publishing).",
        defaultName: "state"
    },
    {
        key: "mean",
        label: "The global average score on MyAnimeList.",
        defaultName: "score"
    },
    {
        key: "genres",
        label: "A list of associated genres and themes.",
        defaultName: "genres"
    },
    {
        key: "releasedStart",
        label: "The date when airing or publishing started.",
        defaultName: "released"
    },
    {
        key: "releasedEnd",
        label: "The date when airing or publishing ended.",
        defaultName: "ended"
    },
    {
        key: "source",
        label: "The original source material (e.g., Manga, Light Novel).",
        defaultName: "origin"
    },
    {
        key: "userStatus",
        label: "Your current status in the list (e.g., Watching, Completed).",
        defaultName: "status"
    },
    {
        key: "userScore",
        label: "The score you assigned (0-10).",
        defaultName: "rating"
    },
    {
        key: "userStartDate",
        label: "The date you started watching or reading.",
        defaultName: "started"
    },
    {
        key: "userFinishDate",
        label: "The date you finished watching or reading.",
        defaultName: "finished"
    },
    {
        key: "time",
        label: "The current system date and time.",
        defaultName: "updated"
    },
    {
        key: "userPriority",
        label: "The priority level assigned to the entry (e.g., Low, High).",
        defaultName: "priority"
    },
    {
        key: "userTags",
        label: "A list of custom tags you assigned on MyAnimeList.",
        defaultName: "tags"
    },
    {
        key: "userComments",
        label: "Your personal comments or notes from MyAnimeList.",
        defaultName: "comments"
    }
];

/**
 * The complete list of available properties for **Anime** templates.
 * Includes all common properties plus anime-specific fields like episodes and studios.
 */
export const ANIME_PROPERTIES: PropertyMetadata[] = [
    ...COMMON_PROPERTIES,
    {
        key: "numEpisodes",
        label: "The total number of episodes.",
        defaultName: "episodes"
    },
    {
        key: "numEpisodesWatched",
        label: "The number of episodes you have watched.",
        defaultName: "eps_seen"
    },
    {
        key: "studios",
        label: "A list of animation studios involved.",
        defaultName: "studios"
    },
    {
        key: "duration",
        label: "The average duration per episode (e.g., '24m').",
        defaultName: "duration"
    },
    {
        key: "startSeason",
        label: "The season and year of the premiere (e.g., Spring 2024).",
        defaultName: "season"
    },
    {
        key: "isRewatching",
        label: "Boolean indicating if you are currently rewatching.",
        defaultName: "rewatching"
    },
    {
        key: "numTimesRewatched",
        label: "The number of times you have rewatched this anime.",
        defaultName: "rewatches"
    },
    {
        key: "rewatchValue",
        label: "The rewatch value rating you assigned.",
        defaultName: "rewatch_value"
    }
];

/**
 * The complete list of available properties for **Manga** templates.
 * Includes all common properties plus manga-specific fields like volumes, chapters, and authors.
 */
export const MANGA_PROPERTIES: PropertyMetadata[] = [
    ...COMMON_PROPERTIES,
    {
        key: "numVolumes",
        label: "The total number of volumes.",
        defaultName: "volumes"
    },
    {
        key: "numVolumesRead",
        label: "The number of volumes you have read.",
        defaultName: "vol_read"
    },
    {
        key: "numChapters",
        label: "The total number of chapters.",
        defaultName: "chapters"
    },
    {
        key: "numChaptersRead",
        label: "The number of chapters you have read.",
        defaultName: "chap_read"
    },
    {
        key: "authors",
        label: "A list of authors and artists.",
        defaultName: "authors"
    },

    {
        key: "isRereading",
        label: "Boolean indicating if you are currently rereading.",
        defaultName: "rereading"
    },
    {
        key: "numTimesReread",
        label: "The number of times you have reread this manga.",
        defaultName: "rereads"
    },
    {
        key: "rereadValue",
        label: "The reread value rating you assigned.",
        defaultName: "reread_value"
    }
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
