# 1. Template Basics

MyAnimeNotes features a visual Template Builder to customize your notes without manual coding. Configuration is split into separate Anime and Manga templates found in the plugin settings.

## Frontmatter Configuration

Use the interactive builder to define your note's YAML properties:

-   **Reorder:** Drag the Handle Icon (☰) on the left to rearrange properties.
-   **Data Types:** Click the Type Icon (e.g., text, number, list) to enforce specific formats (prevents "Invalid property type" warnings in Obsidian).
-   **Mapping:** Enter the desired Property Name (Obsidian key) and the corresponding Template [variables](#2-variables) (e.g., `{{score}}`).

> **Note:** You may notice some properties (like `myanimenotes` and `synced`) are locked. These are required for the plugin to track updates and cannot be removed.

## Content Body

Define the note layout using standard Markdown in the Note Content text area. Add [variables](#2-variables) for more customization.

# 2. Variables

[Variables](#2-variables) dynamically inject MyAnimeList data into your template. Type `{{` in the editor to trigger the auto-complete menu.

## Common [Variables](#2-variables)

Available for both Anime and Manga notes.

| Variable                | Description                                       |
| :---------------------- | :------------------------------------------------ |
| `{{title}}`             | Main title.                                       |
| `{{alternativeTitles}}` | List of aliases (English, Japanese, Synonyms).    |
| `{{id}}`                | MyAnimeList ID.                                   |
| `{{url}}`               | Link to the MAL page.                             |
| `{{mainPicture}}`       | URL to the cover image.                           |
| `{{synopsis}}`          | Description/Summary.                              |
| `{{mean}}`              | Global average score.                             |
| `{{genres}}`            | List of genres.                                   |
| `{{mediaType}}`         | Media format (e.g., TV, Movie, OVA).              |
| `{{source}}`            | Source material (e.g., Manga, Light Novel).       |
| `{{status}}`            | Publication status (e.g., "Finished Airing").     |
| `{{userStatus}}`        | Your list status (e.g., "watching", "completed"). |
| `{{userScore}}`         | Your personal rating.                             |
| `{{userStartDate}}`     | Date you started.                                 |
| `{{userFinishDate}}`    | Date you finished.                                |

## Anime Specific

| Variable                 | Description                     |
| :----------------------- | :------------------------------ |
| `{{numEpisodes}}`        | Total number of episodes.       |
| `{{numEpisodesWatched}}` | Episodes watched count.         |
| `{{studios}}`            | List of animation studios.      |
| `{{duration}}`           | Episode duration (e.g., "24m"). |

## Manga Specific

| Variable              | Description          |
| :-------------------- | :------------------- |
| `{{numVolumes}}`      | Total volumes.       |
| `{{numVolumesRead}}`  | Volumes read count.  |
| `{{numChapters}}`     | Total chapters.      |
| `{{numChaptersRead}}` | Chapters read count. |
| `{{authors}}`         | List of authors.     |

# 3. Filters

Filters transform data before it is rendered in your note. To apply a filter, add a pipe `|` after the [variables](#2-variables) name.

**Syntax:** `{{ variable | filter:argument }}`
**Example:** `{{studios | wikilink}}` → `[[MAPPA]]`

## Available Filters

| Filter            | Description                                                                                                        |
| :---------------- | :----------------------------------------------------------------------------------------------------------------- |
| **wikilink**      | Wraps text in `[[brackets]]`. If applied to a list, wraps each item individually.                                  |
| **date**          | Formats dates using standard tokens (e.g., `YYYY`, `MM`). Defaults to `YYYY-MM-DD`.                                |
| **join**          | Combines a list into a single string using a separator. Defaults to `, `.                                          |
| **default**       | Returns a fallback value if the variable is empty or undefined.                                                    |
| **split**         | Splits a string into a list based on a separator character.                                                        |
| **lower / upper** | Converts text to lowercase or uppercase.                                                                           |
| **blockquote**    | Prefixes text with `> ` to create Markdown blockquotes. Automatically handles multi-line strings and nested lists. |
| **callout**       | Wraps text in an Obsidian callout block. Accepts parameters for type, title, and fold state.                       |
| **camel**         | Converts text to `camelCase`. Removes spaces, hyphens, and underscores.                                            |
| **kebab**         | Converts text to `kebab-case` (lowercase with hyphens). Useful for file names or tags.                             |
| **capitalize**    | Capitalizes the first letter of a string and lowers the rest. Works recursively on lists.                          |
| **footnote**      | Converts a list or object into Markdown footnotes.                                                                 |
| **calc**          | Performs basic mathematical operations (`+`, `-`, `*`, `/`, `^`) on numeric values.                                |
| **first**         | Returns the first item of a list or array.                                                                         |
| **date_modify**   | Adds or subtracts time from a date using units like years, months, weeks, days, or hours.                          |
| **duration**      | Formats durations (from seconds or ISO 8601 strings) into readable time strings.                                   |

### Chaining [Filters](#3-filters)

You can combine multiple [filters](#3-filters). They run in order from left to right.

-   **Example:** `{{genres | wikilink | join:", "}}`
    -   _Result:_ `[[Action]], [[Fantasy]]`

> For a more comprehensive guide, please refer to the official [Obsidian Web Clipper documentation on filters](https://help.obsidian.md/web-clipper/filters). Because this plugin's filter system is modeled directly after Web Clipper's, their documentation serves as an excellent reference for understanding advanced usage and syntax.

# 4. Current Limitations

This template engine is currently under active development. While it draws inspiration from the [Obsidian Web Clipper](https://help.obsidian.md/Extending+Obsidian/Obsidian+Web+Clipper), not all features are currently implemented.

-   **Static Body Content:** [Variables](#2-variables) used in the Note Content area are populated only when the note is **first created**. They will not be updated during future syncs. However, properties in the Frontmatter are fully dynamic and will update automatically whenever you sync.

-   **No Body Autocomplete:** The [variables](#2-variables) suggestion popup currently works only in the Properties builder. You must manually type [variables](#2-variables) (e.g., `{{synopsis}}`) into the Note Content area.

-   **Limited [Filters](#3-filters):** Currently, only essential [filters](#3-filters) are available (`wikilink`, `date`, `join`, `split`, `default`, `lower`, `upper`). More advanced [filters](#3-filters) found in the Web Clipper are planned for future updates.

## Feedback & Support

If you encounter any issues or notice missing features, please [open an issue on GitHub](https://github.com/zara-kasi/obsidian-myanimenotes/issues).
