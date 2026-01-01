import { extractVariables } from "../settings/template/parser";
import type { TemplateConfig } from "../settings/template/types";

// 1. SAFETY NET: The bare minimum fields required for the plugin's internal logic.
const MANDATORY_FIELDS = [
    "id", // Required to generate the 'myanimenotes' ID
    "title", // Required for fallback filenames if naming fails
    "list_status{updated_at}" // CRITICAL: Required for 'batching.ts' to skip unchanged files
];

// 2. TRANSLATOR: Maps your Template Variables -> MAL API Fields
const API_FIELD_MAP: Record<string, string> = {
    // Core Data
    alternativeTitles: "alternative_titles",
    synopsis: "synopsis",
    mean: "mean",
    mediaType: "media_type",
    status: "status",
    genres: "genres",
    source: "source",

    // Anime Specifics
    numEpisodes: "num_episodes",
    startSeason: "start_season",
    duration: "average_episode_duration",
    studios: "studios",

    // Manga Specifics
    numVolumes: "num_volumes",
    numChapters: "num_chapters",
    authors: "authors{first_name,last_name}",

    // Dates
    releasedStart: "start_date",
    releasedEnd: "end_date",

    // User Data (Nested in list_status)
    userScore: "list_status{score}",
    userStatus: "list_status{status}",
    userStartDate: "list_status{start_date}",
    userFinishDate: "list_status{finish_date}",

    // Progress & History
    numEpisodesWatched: "list_status{num_episodes_watched}",
    isRewatching: "list_status{is_rewatching}",
    numVolumesRead: "list_status{num_volumes_read}",
    numChaptersRead: "list_status{num_chapters_read}"
};

/**
 * Scans the user's template and returns the exact API fields string needed.
 * Falls back to mandatory fields if template is undefined.
 */
export function getDynamicFields(template: TemplateConfig | undefined): string {
    // Fallback: If template is undefined, return only mandatory fields
    if (!template) {
        return MANDATORY_FIELDS.join(",");
    }

    // 1. Combine all template strings to scan them at once
    const fullTemplateText = [
        template.fileName,
        template.noteContent,
        ...template.properties.map(p => p.template)
    ].join(" ");

    // 2. Extract variable names (e.g. "userScore")
    const vars = extractVariables(fullTemplateText);

    // 3. Start with Mandatory fields
    const fields = new Set<string>(MANDATORY_FIELDS);

    // 4. Add User requested fields
    vars.forEach(v => {
        const apiField = API_FIELD_MAP[v.varName];
        if (apiField) fields.add(apiField);
    });

    // 5. Smart Merge (Combine list_status{score} + list_status{tags} -> list_status{score,tags})
    const simple = new Set<string>();
    const nested: Record<string, Set<string>> = {};

    fields.forEach(f => {
        const match = f.match(/^([a-z_]+)\{(.+)\}$/);
        if (match) {
            // Destructure to skip the full match, just get root and children
            const [, root, children] = match;
            if (!nested[root]) nested[root] = new Set();
            children.split(",").forEach(c => nested[root].add(c.trim()));
        } else {
            simple.add(f);
        }
    });

    const result = Array.from(simple).sort();
    Object.entries(nested).forEach(([root, children]) => {
        if (children.size > 0) {
            result.push(`${root}{${Array.from(children).sort().join(",")}}`);
        }
    });

    return result.join(",");
}

/**
 * Base URL for the MyAnimeList v2 API.
 * All API requests are relative to this endpoint.
 */
export const MAL_API_BASE = "https://api.myanimelist.net/v2";

/**
 * Configuration for the API rate limiting and retry mechanism.
 * Used by the client to calculate exponential backoff delays.
 */
export const RATE_LIMIT_CONFIG = {
    /** Maximum number of retry attempts for failed requests */
    MAX_RETRIES: 3,
    /** Base delay in milliseconds for the first retry */
    INITIAL_RETRY_DELAY_MS: 1000,
    /** Maximum delay cap in milliseconds to prevent excessive waiting */
    MAX_RETRY_DELAY_MS: 10000
};
