export const MAL_API_BASE = "https://api.myanimelist.net/v2";

// Optimized field sets - only fields we actually use from the reference document
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

    // Anime-specific
    "num_episodes",
    "start_season",
    "source",
    "start_date",
    "end_date",
    "average_episode_duration",
    "studios",
    // User list data - REQUIRED for user-specific fields
    "list_status{status,score,num_episodes_watched,is_rewatching,updated_at,start_date,finish_date}"
].join(",");

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

    // Manga-specific
    "num_volumes",
    "num_chapters",
    "authors{first_name,last_name}",
    "start_date",
    "end_date",

    // User list data - REQUIRED for user-specific fields
    "list_status{status,score,num_volumes_read,num_chapters_read,start_date,finish_date}"
].join(",");


// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY_MS: 1000,
    MAX_RETRY_DELAY_MS: 10000
};
