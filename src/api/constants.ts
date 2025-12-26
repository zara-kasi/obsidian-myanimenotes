/**
 * Base URL for the MyAnimeList v2 API.
 * All API requests are relative to this endpoint.
 */
export const MAL_API_BASE = "https://api.myanimelist.net/v2";

/**
 * Comma-separated list of fields to retrieve for Anime entries.
 * Optimized to request only the data used by the plugin to reduce payload size.
 *
 * Includes:
 * - Basic metadata (id, title, cover image)
 * - Statistics (score, episodes)
 * - Nested 'list_status' fields for user-specific data (watched count, score, etc.)
 */
export const ANIME_FIELDS = [
    // Basic info
    "id",
    "title",
    "main_picture",
    "alternative_titles",

    // Description
    "synopsis",

    // Scores
    "mean",

    // Categories
    "genres",
    "media_type",
    "status",

    // Anime-specific metadata
    "num_episodes",
    "start_season",
    "source",
    "start_date",
    "end_date",
    "average_episode_duration",
    "studios",
    
    // User list data - REQUIRED for user-specific fields
    // Syntax: parent_field{child_field1,child_field2}
    "list_status{status,score,num_episodes_watched,is_rewatching,updated_at,start_date,finish_date}"
].join(",");

/**
 * Comma-separated list of fields to retrieve for Manga entries.
 * Similar to ANIME_FIELDS but includes manga-specific attributes like volumes and authors.
 */
export const MANGA_FIELDS = [
    // Basic info
    "id",
    "title",
    "main_picture",
    "alternative_titles",

    // Description
    "synopsis",

    // Scores
    "mean",

    // Categories
    "genres",
    "media_type",
    "status",

    // Manga-specific metadata
    "num_volumes",
    "num_chapters",
    "authors{first_name,last_name}",
    "start_date",
    "end_date",

    // User list data - REQUIRED for user-specific fields
    "list_status{status,score,num_volumes_read,num_chapters_read,start_date,finish_date}"
].join(",");


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
