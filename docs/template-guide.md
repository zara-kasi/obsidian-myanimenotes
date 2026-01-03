# 1. Template Basics

This template engine is currently under active development. While it draws inspiration from the [Obsidian Web Clipper](https://help.obsidian.md/Extending+Obsidian/Obsidian+Web+Clipper), not all features are currently implemented.

## Frontmatter Configuration

Use the interactive builder to define your note's YAML properties:

-   **Reorder:** Drag the Handle Icon (☰) on the left to rearrange properties.
-   **Data Types:** Click the Type Icon (e.g., text, number, list) to enforce specific formats (prevents "Invalid property type" warnings in Obsidian).
-   **Mapping:** Enter the desired Property Name (Obsidian key) and the corresponding Template [variables](#2-variables) (e.g., `{{score}}`).

> **Note:** You may notice some properties (like `myanimenotes` and `synced`) are locked. These are required for the plugin to track updates and cannot be removed.

## Content Body

Define the note layout using standard Markdown in the Note Content text area. Add [variables](#2-variables) for more customization.

# 2. Variables

Variables dynamically inject MyAnimeList data into your template. Type `{{` in the editor to trigger the auto-complete menu.

## Common Variables

Available for both Anime and Manga notes.

| Variable                | Description                                                                 |
| :---------------------- | :-------------------------------------------------------------------------- |
| `{{title}}`             | The official main title of the media.                                       |
| `{{alternativeTitles}}` | Full list of alternative titles (includes English, Japanese, and synonyms). |
| `{{titleEnglish}}`      | The official English title.                                                 |
| `{{titleJapanese}}`     | The original Japanese title.                                                |
| `{{titleSynonyms}}`     | A list of other synonym titles.                                             |
| `{{id}}`                | The unique ID assigned by MyAnimeList.                                      |
| `{{category}}`          | The media category (e.g., 'anime' or 'manga').                              |
| `{{platform}}`          | The source platform (e.g., 'myanimelist').                                  |
| `{{url}}`               | The URL to the MyAnimeList entry.                                           |
| `{{mainPicture}}`       | The URL of the main cover image.                                            |
| `{{synopsis}}`          | The plot synopsis or description.                                           |
| `{{mediaType}}`         | The format of the media (e.g., TV, Movie, OVA).                             |
| `{{status}}`            | The current release status (e.g., Finished Airing, Publishing).             |
| `{{mean}}`              | The global average score on MyAnimeList.                                    |
| `{{genres}}`            | A list of associated genres and themes.                                     |
| `{{releasedStart}}`     | The date when airing or publishing started.                                 |
| `{{releasedEnd}}`       | The date when airing or publishing ended.                                   |
| `{{source}}`            | The original source material (e.g., Manga, Light Novel).                    |
| `{{userStatus}}`        | Your current status in the list (e.g., Watching, Completed).                |
| `{{userScore}}`         | The score you assigned (0-10).                                              |
| `{{userStartDate}}`     | The date you started watching or reading.                                   |
| `{{userFinishDate}}`    | The date you finished watching or reading.                                  |
| `{{time}}`              | The current system date and time.                                           |
| `{{userPriority}}`      | The priority level assigned to the entry (e.g., Low, High).                 |
| `{{userTags}}`          | A list of custom tags you assigned on MyAnimeList.                          |
| `{{userComments}}`      | Your personal comments or notes from MyAnimeList.                           |
| `{{rank}}`              | The ranking position on MyAnimeList (based on score).                       |
| `{{popularity}}`        | The popularity ranking on MyAnimeList.                                      |
| `{{numListUsers}}`      | Total number of users who have this in their list.                          |
| `{{numScoringUsers}}`   | Total number of users who have scored this.                                 |
| `{{nsfw}}`              | Content rating level (white, gray, or black).                               |
| `{{createdAt}}`         | The date this entry was created on MyAnimeList.                             |
| `{{updatedAt}}`         | The date this entry was last updated on MyAnimeList.                        |

## Anime Specific

| Variable                 | Description                                                |
| :----------------------- | :--------------------------------------------------------- |
| `{{numEpisodes}}`        | The total number of episodes.                              |
| `{{numEpisodesWatched}}` | The number of episodes you have watched.                   |
| `{{studios}}`            | A list of animation studios involved.                      |
| `{{duration}}`           | The average duration per episode (e.g., '24m').            |
| `{{startSeason}}`        | The season and year of the premiere (e.g., Spring 2024).   |
| `{{isRewatching}}`       | Boolean indicating if you are currently rewatching.        |
| `{{numTimesRewatched}}`  | The number of times you have rewatched this anime.         |
| `{{rewatchValue}}`       | The rewatch value rating you assigned.                     |
| `{{broadcast}}`          | The broadcast day and time (e.g., 'Fridays at 00:00 JST'). |
| `{{rating}}`             | The age rating (e.g., PG-13, R, R+).                       |

## Manga Specific

| Variable              | Description                                        |
| :-------------------- | :------------------------------------------------- |
| `{{numVolumes}}`      | The total number of volumes.                       |
| `{{numVolumesRead}}`  | The number of volumes you have read.               |
| `{{numChapters}}`     | The total number of chapters.                      |
| `{{numChaptersRead}}` | The number of chapters you have read.              |
| `{{authors}}`         | A list of authors and artists.                     |
| `{{isRereading}}`     | Boolean indicating if you are currently rereading. |
| `{{numTimesReread}}`  | The number of times you have reread this manga.    |
| `{{rereadValue}}`     | The reread value rating you assigned.              |

# 3. Filters

Filters transform data before it is rendered in your note. To apply a filter, add a pipe `|` after the [variables](#2-variables) name.

> **Syntax:** `{{ variable|filter:argument }}` > **Example:** `{{studios|wikilink}}` → `[[MAPPA]]`

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
| **last**          | Returns the last item of a list or array.                                                                          |
| **length**        | Returns the count of items in a list, characters in a string, or properties in an object.                          |
| **list**          | Converts arrays into Markdown lists (bullet, numbered, task, or numbered-task).                                    |
| **map**           | Transforms array elements using arrow function syntax (e.g., `x => x.name`).                                       |
| **merge**         | Combines arrays or adds items to an existing array.                                                                |
| **nth**           | Selects elements at specific positions using CSS-style nth expressions (e.g., `2n`, `n+5`).                        |
| **number_format** | Formats numbers with custom decimal places, decimal point, and thousands separator.                                |
| **object**        | Extracts keys, values, or entries from objects for iteration or display.                                           |
| **pascal**        | Converts text to `PascalCase` (similar to camelCase but first letter capitalized).                                 |
| **replace**       | Replaces text within strings. Supports regex patterns and multiple replacements.                                   |
| **reverse**       | Reverses the order of array elements, object entries, or string characters.                                        |
| **round**         | Rounds numeric values to specified decimal places. Works recursively on arrays and objects.                        |
| **safe_name**     | Sanitizes strings for use as file/folder names by removing invalid characters.                                     |
| **slice**         | Extracts a portion of an array or string using start and end indices.                                              |
| **snake**         | Converts text to `snake_case` (lowercase with underscores). Useful for variable names.                             |
| **unsnake**       | Replaces underscores and hyphens with spaces.                                                                      |
| **table**         | Converts JSON data into Markdown table format.                                                                     |
| **template**      | Formats data using custom template strings with `${variable}` placeholders.                                        |
| **title**         | Converts text to Title Case, capitalizing major words while keeping minor words lowercase.                         |
| **trim**          | Removes leading and trailing whitespace from strings.                                                              |
| **uncamel**       | Converts camelCase/PascalCase to space-separated lowercase text.                                                   |
| **unique**        | Removes duplicate values from arrays and objects.                                                                  |

### Chaining Filters

You can combine multiple [filters](#3-filters). They run in order from left to right.

> **Example:** `{{genres|wikilink|join:", "}}` > _Result:_ `[[Action]], [[Fantasy]]`
>
> For a more comprehensive guide, please refer to the official [Obsidian Web Clipper documentation on filters](https://help.obsidian.md/web-clipper/filters). Because this plugin's filter system is modeled directly after Web Clipper's, their documentation serves as an excellent reference for understanding advanced usage and syntax.

# 4. Current Limitations

-   **Static Body Content:** [Variables](#2-variables) used in the Note Content area are populated only when the note is **first created**. They will not be updated during future syncs. However, properties in the Frontmatter are fully dynamic and will update automatically whenever you sync.

-   **No Body Autocomplete:** The [variables](#2-variables) suggestion popup currently works only in the Properties builder. You must manually type [variables](#2-variables) (e.g., `{{synopsis}}`) into the Note Content area.

-   **No Variable in Note location:** The current folder path settings doesn't support [variables](#2-variables).

- **Limited Multi-Language Support:**  The title case filter is English-specific and doesn't support multi-language title casing.

## Feedback & Support

If you encounter any issues or notice missing features, please [open an issue on GitHub](https://github.com/zara-kasi/obsidian-myanimenotes/issues).
