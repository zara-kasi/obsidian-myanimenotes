## 1. Template Basics

MyAnimeNotes features a visual Template Builder to customize your notes without manual coding. Configuration is split into separate Anime and Manga templates found in the plugin settings.

### Frontmatter Configuration

Use the interactive builder to define your note's YAML properties:

-   **Reorder:** Drag the Handle Icon (☰) on the left to rearrange properties.
-   **Data Types:** Click the Type Icon (e.g., text, number, list) to enforce specific formats. This prevents "Invalid property type" warnings in Obsidian.
-   **Mapping:** Enter the desired Property Name (Obsidian key) and the corresponding Template Variable (e.g., [`{{score}}`](#2-variables)).

### Content Body

Define the note layout using standard Markdown in the Note Content text area. Add [variables](#2-variables) for more customisation.

## 2. Variables

Variables dynamically inject MyAnimeList data into your template. Type `{{` in the editor to trigger the auto-complete menu.

### Common Variables

Available for both Anime and Manga notes.

| Variable                | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `{{title}}`             | Main title.                                       |
| `{{alternativeTitles}}` | List of aliases (English, Japanese, Synonyms).    |
| `{{id}}`                | MyAnimeList ID.                                   |
| `{{url}}`               | Link to the MAL page.                             |
| `{{mainPicture}}`       | URL to the cover image.                           |
| `{{synopsis}}`          | Description/Summary.                              |
| `{{mean}}`              | Global average score.                             |
| `{{genres}}`            | List of genres.                                   |
| `{{status}}`            | Publication status (e.g., "Finished Airing").     |
| `{{userStatus}}`        | Your list status (e.g., "watching", "completed"). |
| `{{userScore}}`         | Your personal rating.                             |
| `{{userStartDate}}`     | Date you started.                                 |
| `{{userFinishDate}}`    | Date you finished.                                |

### Anime Specific

| Variable                 | Description                     |
| ------------------------ | ------------------------------- |
| `{{numEpisodes}}`        | Total number of episodes.       |
| `{{numEpisodesWatched}}` | Episodes watched count.         |
| `{{studios}}`            | List of animation studios.      |
| `{{duration}}`           | Episode duration (e.g., "24m"). |

### Manga Specific

| Variable              | Description          |
| --------------------- | -------------------- |
| `{{numVolumes}}`      | Total volumes.       |
| `{{numVolumesRead}}`  | Volumes read count.  |
| `{{numChapters}}`     | Total chapters.      |
| `{{numChaptersRead}}` | Chapters read count. |
| `{{authors}}`         | List of authors.     |

## 3. Filters

Filters transform data before it is rendered in your note. To apply a filter, add a pipe `|` after the variable name. Multiple filters can be chained together.

**Syntax:** `{{ variable | filter:argument }}`

| Filter          | Description                                                                       | Usage Example    |
| --------------- | --------------------------------------------------------------------------------- | ---------------- | --------------------------------- |
| `wikilink`      | Wraps text in `[[brackets]]`. If applied to a list, wraps each item individually. | `{{studios | wikilink}}`→`[[MAPPA]]` |
| `date`          | Formats dates using standard tokens (e.g., YYYY, MM). Defaults to YYYY-MM-DD.     | `{{releasedStart | date:"YYYY"}}`→`2023` |
| `join`          | Combines a list into a single string using a separator. Defaults to `, `.         | `{{genres | join:" / "}}`→`Action / Fantasy` |
| `default`       | Returns a fallback value if the variable is empty or undefined.                   | `{{mean | default:"N/A"}}`→`N/A` |
| `split`         | Splits a string into a list based on a separator character.                       | `{{tags | split:","}}`→`['Tag A', 'Tag B']` |
| `lower / upper` | Converts text to lowercase or uppercase.                                          | `{{status | lower}}`→`finished airing` |

## 4. Current Limitations

This template engine is currently under active development. While it draws inspiration from the [Obsidian Web Clipper](https://help.obsidian.md/web-clipper), not all features are currently implemented.

- **Static Body Content:** [Variables](#2-variables) used in the Note Content area are populated only when the note is first created. They will not be updated during future syncs. However, properties in the Frontmatter are fully dynamic and will update automatically whenever you sync.

- **No Body Autocomplete:** The variable suggestion popup currently works only in the Properties builder. You must manually type variables (e.g., [`{{synopsis}}`](#2-variables)) into the Note Content area.

- **Limited Filters:** Currently, only essential [filters](#3-filters) are available (`wikilink`, `date`, `join`, `split`, `default`, `lower`, `upper`). More advanced filters found in the Web Clipper are planned for future updates.

### Feedback & Support

If you encounter any issues or notice missing features, please [open an issue on GitHub](https://github.com/zara-kasi/obsidian-myanimenotes/issues). For general reference on how filtering works, you can refer to the [Obsidian Web Clipper documentation](https://help.obsidian.md/web-clipper/filters).