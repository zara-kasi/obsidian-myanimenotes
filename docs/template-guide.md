## 1. Template Basics

MyAnimeNotes features a visual Template Builder to customize your notes without manual coding. Configuration is split into separate Anime and Manga templates found in the plugin settings.

### Frontmatter Configuration

Use the interactive builder to define your note's YAML properties:

-   **Reorder:** Drag the Handle Icon (☰) on the left to rearrange properties.
-   **Data Types:** Click the Type Icon (e.g., text, number, list) to enforce specific formats (prevents "Invalid property type" warnings in Obsidian).
-   **Mapping:** Enter the desired Property Name (Obsidian key) and the corresponding Template [Variables](#3-variables) (e.g., `{{score}}`).

> **Note:** You may notice some properties (like `myanimenotes` and `synced`) are locked. These are required for the plugin to track updates and cannot be removed.

### Content Body

Define the note layout using standard Markdown in the Note Content text area. Add [variables](#3-variables) for more customization.

## 2. Variables

[Variables](#3-variables) dynamically inject MyAnimeList data into your template. Type `{{` in the editor to trigger the auto-complete menu.

### Common [Variables](#3-variables)

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

### Anime Specific

| Variable                 | Description                     |
| :----------------------- | :------------------------------ |
| `{{numEpisodes}}`        | Total number of episodes.       |
| `{{numEpisodesWatched}}` | Episodes watched count.         |
| `{{studios}}`            | List of animation studios.      |
| `{{duration}}`           | Episode duration (e.g., "24m"). |

### Manga Specific

| Variable              | Description          |
| :-------------------- | :------------------- |
| `{{numVolumes}}`      | Total volumes.       |
| `{{numVolumesRead}}`  | Volumes read count.  |
| `{{numChapters}}`     | Total chapters.      |
| `{{numChaptersRead}}` | Chapters read count. |
| `{{authors}}`         | List of authors.     |

## 3. Filters

[Filters](#3-filters) transform data before it is rendered in your note. To apply a filter, add a pipe `|` after the [variables](#3-variables) name.

**Syntax:** `{{ variable | filter:argument }}`

-   **wikilink**
    -   **Description:** Wraps text in `[[brackets]]`. If applied to a list, wraps each item individually.
    -   **Example:** `{{studios | wikilink}}` → `[[MAPPA]]`
-   **date**
    -   **Description:** Formats dates using standard tokens (e.g., `YYYY`, `MM`). Defaults to `YYYY-MM-DD`.
    -   **Example:** `{{releasedStart | date:"YYYY"}}` → `2023`
-   **join**
    -   **Description:** Combines a list into a single string using a separator. Defaults to `, `.
    -   **Example:** `{{genres | join:" / "}}` → `Action / Fantasy`
-   **default**
    -   **Description:** Returns a fallback value if the [variables](#3-variables) is empty or undefined.
    -   **Example:** `{{mean | default:"N/A"}}` → `N/A`
-   **split**
    -   **Description:** Splits a string into a list based on a separator character.
    -   **Example:** `{{tags | split:","}}` → `['Tag A', 'Tag B']`
-   **lower / upper**
    -   **Description:** Converts text to lowercase or uppercase.
    -   **Example:** `{{status | lower}}` → `finished airing`

#### Chaining [Filters](#3-filters)

You can combine multiple [filters](#3-filters). They run in order from left to right.

-   **Example:** `{{genres | wikilink | join:", "}}`
    -   _Result:_ `[[Action]], [[Fantasy]]`

## 4. Current Limitations

This template engine is currently under active development. While it draws inspiration from the [Obsidian Web Clipper](https://help.obsidian.md/Extending+Obsidian/Obsidian+Web+Clipper), not all features are currently implemented.

-   **Static Body Content:** [Variables](#3-variables) used in the Note Content area are populated only when the note is **first created**. They will not be updated during future syncs. However, properties in the Frontmatter are fully dynamic and will update automatically whenever you sync.

-   **No Body Autocomplete:** The [variables](#3-variables) suggestion popup currently works only in the Properties builder. You must manually type [variables](#3-variables) (e.g., `{{synopsis}}`) into the Note Content area.

-   **Limited [Filters](#3-filters):** Currently, only essential [filters](#3-filters) are available (`wikilink`, `date`, `join`, `split`, `default`, `lower`, `upper`). More advanced [filters](#3-filters) found in the Web Clipper are planned for future updates.

### Feedback & Support

If you encounter any issues or notice missing features, please [open an issue on GitHub](https://github.com/zara-kasi/obsidian-myanimenotes/issues).
