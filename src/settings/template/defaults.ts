import type { TemplateConfig } from "./types";

/**
 * Generates a unique string ID for a property item.
 *
 * This is used to track properties in the drag-and-drop interface, ensuring
 * that reordering or modifying properties doesn't lose their reference.
 *
 * @returns A string in the format "prop-{timestamp}-{random}".
 */
export function generatePropertyId(): string {
    return `prop-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * The default configuration for **Anime** notes.
 *
 * This template defines the folder structure, note content (Markdown), and
 * the default frontmatter properties.
 *
 * @remarks
 * - **Permanent Properties**: The properties 'myanimenotes' and 'synced' are essential
 * for the plugin to identify which notes are managed by it. They should not be removed.
 * - **Template Syntax**: Uses `{{variable}}` syntax. Filters like `|wikilink` or
 * `|date:"YYYY-MM-DD"` are supported to format the output.
 */
export const DEFAULT_ANIME_TEMPLATE: TemplateConfig = {
    folderPath: "MyAnimeNotes/Anime",
    noteContent:
        "# {{title}}\n\n{{synopsis|callout:( summary, Synopsis, true)}}",
    properties: [
        // ========================================================================
        // Core User Data
        // ========================================================================
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

        // ========================================================================
        // Media Metadata (Anime Specific)
        // ========================================================================
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
            template: "{{duration|duration:H:mm:ss}}",
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

        // ========================================================================
        // Technical / External Links
        // ========================================================================
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

        // ========================================================================
        // Permanent System Properties (Do Not Edit IDs)
        // ========================================================================
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

/**
 * The default configuration for **Manga** notes.
 *
 * Distinct from the anime template, this includes manga-specific fields
 * such as `numChaptersRead`, `numVolumes`, and `authors`.
 */
export const DEFAULT_MANGA_TEMPLATE: TemplateConfig = {
    folderPath: "MyAnimeNotes/Manga",
    noteContent:
        "# {{title}}\n\n{{synopsis|callout:( summary, Synopsis, true)}}",
    properties: [
        // ========================================================================
        // Core User Data
        // ========================================================================
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

        // ========================================================================
        // Media Metadata (Manga Specific)
        // ========================================================================
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

        // ========================================================================
        // Technical / External Links
        // ========================================================================
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

        // ========================================================================
        // Permanent System Properties
        // ========================================================================
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
