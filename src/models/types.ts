// Data types for media synchronization
// This file separates the internal data model (MediaItem) from the external API shapes (MALItem).

/**
 * Standardized status for the media itself (Production Status).
 * Unifies terminology for Anime (Airing) and Manga (Publishing).
 */
export enum MediaStatus {
    // Anime/Manga production status
    FINISHED = "Finished",
    CURRENTLY_RELEASING = "Ongoing",
    NOT_YET_RELEASED = "Upcoming"
}

/**
 * Standardized status for the user's personal list.
 * Unifies "Watching" and "Reading" into equivalent states where possible.
 */
export enum UserListStatus {
    // For Anime
    WATCHING = "Watching",
    PLAN_TO_WATCH = "Plan to Watch",

    // For Manga
    READING = "Reading",
    PLAN_TO_READ = "Plan to Read",

    // Common
    COMPLETED = "Completed",
    ON_HOLD = "On-Hold",
    DROPPED = "Dropped"
}

/**
 * The primary categorization of media items.
 */
export enum MediaCategory {
    ANIME = "anime",
    MANGA = "manga"
}

/**
 * Common image structure used for covers and posters.
 */
export interface Picture {
    medium?: string;
    large?: string;
}

/**
 * Localized titles and aliases.
 */
export interface AlternativeTitles {
    en?: string;
    ja?: string;
    synonyms?: string[];
}

/**
 * Media genre tag (e.g., "Action", "Romance").
 */
export interface Genre {
    id: number;
    name: string;
}

/**
 * Author info (specifically for Manga).
 */
export interface Author {
    firstName: string;
    lastName: string;
    role?: string;
}

/**
 * The core internal data model representing a synchronized item.
 *
 * This interface normalizes differences between Anime and Manga, providing a
 * single consistent shape for templates and storage logic.
 */
export interface MediaItem {
    // Basic info
    id: number;
    title: string;
    category: MediaCategory;
    url?: string; // Platform link (e.g., https://myanimelist.net/anime/123)

    // Visual
    mainPicture?: Picture;
    pictures?: Picture[];

    // Alternative titles
    alternativeTitles?: AlternativeTitles;

    // Description
    synopsis?: string;

    // Metadata
    mediaType: string; // TV, Movie, manga, novel, etc.
    status: MediaStatus;
    mean?: number; // Average score

    // Genres
    genres?: Genre[];

    // Publication/Airing dates (UNIFIED - common to both anime and manga)
    releasedStart?: string; // When media started (YYYY-MM-DD)
    releasedEnd?: string; // When media ended (YYYY-MM-DD)

    // Anime-specific
    numEpisodes?: number;
    source?: string; // manga, light_novel, etc.
    studios?: Array<{ name: string }>; // production studios
    duration?: number;

    // Manga-specific
    numVolumes?: number;
    numChapters?: number;
    authors?: Author[];

    // User list data
    userStatus?: UserListStatus;
    userScore?: number; // 0-10
    userStartDate?: string; // when user started watching (YYYY-MM-DD)
    userFinishDate?: string; //  when user finished watching (YYYY-MM-DD)
    numEpisodesWatched?: number; // For anime
    numVolumesRead?: number; // For manga
    numChaptersRead?: number; // For manga

    // Sync metadata - timestamp from API (used for change detection)
    updatedAt?: string;

    // Platform metadata
    platform: "mal";
}

// ============================================================================
// RAW API TYPES
// Contains strictly the API response interfaces from MyAnimeList (MAL)
// ============================================================================

export interface MALPicture {
    medium?: string;
    large?: string;
}

export interface MALAlternativeTitles {
    en?: string;
    ja?: string;
    synonyms?: string[];
}

export interface MALGenre {
    id: number;
    name: string;
}

export interface MALAuthorNode {
    first_name?: string;
    last_name?: string;
}

export interface MALAuthor {
    node: MALAuthorNode;
    role?: string;
}

export interface MALStudio {
    name: string;
}

/**
 * Represents the user's interaction with the item (score, status, progress).
 */
export interface MALListStatus {
    status: string;
    score?: number;
    num_episodes_watched?: number;
    num_volumes_read?: number;
    num_chapters_read?: number;
    start_date?: string;
    finish_date?: string;
    updated_at?: string;
}

/**
 * Represents the media item details (title, synopsis, metadata).
 * MAL nests this under a `node` property in most list responses.
 */
export interface MALNode {
    id: number;
    title: string;
    main_picture?: MALPicture;
    pictures?: MALPicture[];
    alternative_titles?: MALAlternativeTitles;
    synopsis?: string;
    media_type?: string;
    status: string;
    mean?: number;
    genres?: MALGenre[];
    start_date?: string;
    end_date?: string;
    num_episodes?: number;
    source?: string;
    studios?: MALStudio[];
    average_episode_duration?: number;
    num_volumes?: number;
    num_chapters?: number;
    authors?: MALAuthor[];
}

/**
 * The top-level object returned by MAL list endpoints.
 * Combines the static node details with the user's dynamic list status.
 */
export interface MALItem {
    node: MALNode;
    list_status?: MALListStatus;
}
