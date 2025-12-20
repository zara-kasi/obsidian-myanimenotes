/**
 * Default anime template
 * NOTE: Properties with template='myanimenotes' and template='synced' are permanent and cannot be removed
 * Contains only common + anime-specific properties
 */

import type { PropertyType } from "./type";

/**
 * Single property in a template
 */

export interface PropertyItem {
    id: string; // Unique ID for drag-drop (e.g., 'prop-1', 'prop-2')
    template: string; // Template string with {{variables}} and custom text
    customName: string; // User's custom property name (e.g., 'episodes')
    order: number; // Sort order for display
    type?: PropertyType; // Format type for this property
}

/**
 * Template configuration for anime or manga
 */
export interface TemplateConfig {
    folderPath: string;
    properties: PropertyItem[];
    noteContent: string;
}

/**
 * Property metadata for available properties
 */
export interface PropertyMetadata {
    key: string; // Template variable (e.g., 'title')
    label: string; // Display name in dropdown (e.g., 'Title')
    defaultName: string; // Default property name (e.g., 'title')
}

/**
 * Common properties (shared by both anime and manga)
 */
const COMMON_PROPERTIES: PropertyMetadata[] = [
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

// Update the DEFAULT_ANIME_TEMPLATE to showcase filters
export const DEFAULT_ANIME_TEMPLATE: TemplateConfig = {
    folderPath: "MyAnimeNotes/Anime",
    noteContent: "# {{title}}\n\n{{synopsis}}",
    properties: [
        // Core properties
        {
            id: "prop-1",
            template: "{{title}}",
            customName: "title",
            order: 1,
            type: "text"
        },
        {
            id: "prop-2",
            template: "{{alternativeTitles}}",
            customName: "aliases",
            order: 2,
            type: "multitext"
        },
        {
            id: "prop-20",
            template: "{{userStatus}}",
            customName: "status",
            order: 3,
            type: "text"
        },
        {
            id: "prop-17",
            template: "{{numEpisodesWatched}}",
            customName: "eps_seen",
            order: 4,
            type: "number"
        },
        {
            id: "prop-21",
            template: "{{userScore}}",
            customName: "rating",
            order: 5,
            type: "number"
        },
        {
            id: "prop-22",
            template: '{{userStartDate|date:"YYYY-MM-DD"}}',
            customName: "started",
            order: 6,
            type: "date"
        },
        {
            id: "prop-23",
            template: '{{userFinishDate|date:"YYYY-MM-DD"}}',
            customName: "finished",
            order: 7,
            type: "date"
        },

        // Media details
        {
            id: "prop-9",
            template: "{{mediaType}}",
            customName: "media",
            order: 8,
            type: "text"
        },
        {
            id: "prop-16",
            template: "{{numEpisodes}}",
            customName: "episodes",
            order: 9,
            type: "number"
        },
        {
            id: "prop-10",
            template: "{{status}}",
            customName: "state",
            order: 10,
            type: "text"
        },
        {
            id: "prop-14",
            template: '{{releasedStart|date:"YYYY-MM-DD"}}',
            customName: "released",
            order: 11,
            type: "date"
        },
        {
            id: "prop-15",
            template: '{{releasedEnd|date:"YYYY-MM-DD"}}',
            customName: "ended",
            order: 12,
            type: "date"
        },
        {
            id: "prop-18",
            template: "{{studios|wikilink}}",
            customName: "studios",
            order: 13,
            type: "multitext"
        },
        {
            id: "prop-13",
            template: "{{source}}",
            customName: "origin",
            order: 14,
            type: "text"
        },
        {
            id: "prop-12",
            template: "{{genres|wikilink}}",
            customName: "genres",
            order: 15,
            type: "multitext"
        },
        {
            id: "prop-19",
            template: "{{duration}}",
            customName: "duration",
            order: 16,
            type: "text"
        },
        {
            id: "prop-11",
            template: '{{mean|default:"Not Rated"}}',
            customName: "score",
            order: 17,
            type: "number"
        },

        // Additional
        {
            id: "prop-7",
            template: "{{mainPicture}}",
            customName: "image",
            order: 18,
            type: "text"
        },
        {
            id: "prop-6",
            template: "{{url}}",
            customName: "source",
            order: 19,
            type: "text"
        },
        {
            id: "prop-5",
            template: "{{platform}}",
            customName: "platform",
            order: 20,
            type: "text"
        },
        {
            id: "prop-4",
            template: "{{category}}",
            customName: "category",
            order: 21,
            type: "text"
        },
        {
            id: "prop-3",
            template: "{{id}}",
            customName: "id",
            order: 22,
            type: "number"
        },

        // Permanent
        {
            id: "prop-permanent-1",
            template: "myanimenotes",
            customName: "myanimenotes",
            order: 23,
            type: "text"
        },
        {
            id: "prop-permanent-2",
            template: "synced",
            customName: "synced",
            order: 24,
            type: "datetime"
        }
    ]
};

export const DEFAULT_MANGA_TEMPLATE: TemplateConfig = {
    folderPath: "MyAnimeNotes/Manga",
    noteContent: "# {{title}}\n\n{{synopsis}}",
    properties: [
        {
            id: "prop-1",
            template: "{{title}}",
            customName: "title",
            order: 1,
            type: "text"
        },
        {
            id: "prop-2",
            template: "{{alternativeTitles}}",
            customName: "aliases",
            order: 2,
            type: "multitext"
        },
        {
            id: "prop-21",
            template: "{{userStatus}}",
            customName: "status",
            order: 3,
            type: "text"
        },
        {
            id: "prop-19",
            template: "{{numChaptersRead}}",
            customName: "chap_read",
            order: 4,
            type: "number"
        },
        {
            id: "prop-17",
            template: "{{numVolumesRead}}",
            customName: "vol_read",
            order: 5,
            type: "number"
        },
        {
            id: "prop-22",
            template: "{{userScore}}",
            customName: "rating",
            order: 6,
            type: "number"
        },
        {
            id: "prop-23",
            template: '{{userStartDate|date:"YYYY-MM-DD"}}',
            customName: "started",
            order: 7,
            type: "date"
        },
        {
            id: "prop-24",
            template: '{{userFinishDate|date:"YYYY-MM-DD"}}',
            customName: "finished",
            order: 8,
            type: "date"
        },

        {
            id: "prop-9",
            template: "{{mediaType}}",
            customName: "media",
            order: 9,
            type: "text"
        },
        {
            id: "prop-18",
            template: "{{numChapters}}",
            customName: "chapters",
            order: 10,
            type: "number"
        },
        {
            id: "prop-16",
            template: "{{numVolumes}}",
            customName: "volumes",
            order: 11,
            type: "number"
        },
        {
            id: "prop-10",
            template: "{{status}}",
            customName: "state",
            order: 12,
            type: "text"
        },
        {
            id: "prop-14",
            template: '{{releasedStart|date:"YYYY-MM-DD"}}',
            customName: "released",
            order: 13,
            type: "date"
        },
        {
            id: "prop-15",
            template: '{{releasedEnd|date:"YYYY-MM-DD"}}',
            customName: "ended",
            order: 14,
            type: "date"
        },
        {
            id: "prop-13",
            template: "{{source}}",
            customName: "origin",
            order: 15,
            type: "text"
        },
        {
            id: "prop-12",
            template: "{{genres|wikilink}}",
            customName: "genres",
            order: 16,
            type: "multitext"
        },
        {
            id: "prop-20",
            template: "{{authors}}",
            customName: "authors",
            order: 17,
            type: "text"
        },
        {
            id: "prop-11",
            template: '{{mean|default:"Not Rated"}}',
            customName: "score",
            order: 18,
            type: "number"
        },

        {
            id: "prop-7",
            template: "{{mainPicture}}",
            customName: "image",
            order: 19,
            type: "text"
        },
        {
            id: "prop-6",
            template: "{{url}}",
            customName: "source",
            order: 20,
            type: "text"
        },
        {
            id: "prop-5",
            template: "{{platform}}",
            customName: "platform",
            order: 21,
            type: "text"
        },
        {
            id: "prop-4",
            template: "{{category}}",
            customName: "category",
            order: 22,
            type: "text"
        },
        {
            id: "prop-3",
            template: "{{id}}",
            customName: "id",
            order: 23,
            type: "number"
        },

        {
            id: "prop-permanent-1",
            template: "myanimenotes",
            customName: "myanimenotes",
            order: 24,
            type: "text"
        },
        {
            id: "prop-permanent-2",
            template: "synced",
            customName: "synced",
            order: 25,
            type: "datetime"
        }
    ]
};

/**
 * Generates a unique property ID
 */
export function generatePropertyId(): string {
    return `prop-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
