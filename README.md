---
updated: 2025-10-23 12:55:23.776
---
# Obsidian Cassette Plugin

Sync your anime and manga from MyAnimeList directly into your Obsidian vault. Build a private, offline media library that integrates with your notes.

---

## Getting Started

### MyAnimeList Authentication

1. Create a MAL API application: [Complete Setup Guide](https://github.com/zara-kasi/cassette/blob/main/docs/mal-authentication-guide.md)
2. Open Obsidian **Settings** → **Cassette**
3. Enter your **Client ID** and **Client Secret**
4. Click **Authenticate** and sign in via your browser

---

## Usage

### Manual Sync

Use the **Command Palette** (`Ctrl/Cmd + P`):

- **Sync all from MyAnimeList** – Syncs both anime and manga
- **Sync anime from MyAnimeList** – Anime only
- **Sync manga from MyAnimeList** – Manga only
- **Sync currently watching anime** – Only your "watching" list
- **Sync currently reading manga** – Only your "reading" list

Or click the **ribbon icon** (refresh symbol) in the left sidebar.

### File Structure

Synced items are saved as markdown notes with frontmatter:

```yaml
---
title: Jujutsu Kaisen
aliases:
  - Jujutsu Kaisen
  - 呪術廻戦
  - Sorcery Fight
  - JJK
status: completed
eps_seen: 24
rating: 9
media: tv
episodes: 24
state: finished
released: 2020-10-03
ended: 2021-03-27
studios:
  - MAPPA
origin: manga
genres:
  - action
  - award-winning
  - school
  - shounen
  - supernatural
duration: 24
score: 8.53
description: Idly indulging in baseless paranormal activities with the Occult Club, high schooler Yuji Itadori spends his days at either the clubroom or the hospital, where he visits his bedridden grandfather...
image: https://cdn.myanimelist.net/images/anime/1171/109222l.jpg
source: https://myanimelist.net/anime/40748
platform: mal
category: anime
id: 40748
cassette: mal:anime:40748
synced: 2025-10-23T00:54:38+00:00
---

[Your personal notes and thoughts go here—this content is never touched by sync]
```

### The Cassette System

Each note contains a **cassette** identifier in frontmatter (e.g., `mal:anime:40748`). This allows you to:

- Rename files freely – The filename doesn't matter
- Move notes anywhere – Organize across folders without breaking sync
- Avoid duplicates – Cassette prevents creating duplicate entries

Files are tracked by the cassette property, not by filename or location.

### Sync Optimization

Cassette compares timestamps to avoid unnecessary file updates:

- Only updates notes when the API data has actually changed
- Can be overridden with **Overwrite all** setting in plugin settings

---

## Configuration

### Property Customization

Enable **Property Customization** to rename frontmatter fields to match your workflow.

Example: Change `rating` → `my_score`, `status` → `watch_status`, etc.

### Using Genres as Tags

Genres are automatically sanitized to work as Obsidian tags:

```yaml
genres:
  - slice-of-life
  - supernatural
  - comedy
```

You can use these in tag queries or dataview:

```dataview
LIST
FROM #slice-of-life
WHERE rating > 8
SORT rating DESC
```


---

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/zara-kasi/cassette/issues)

---

## Acknowledgments

Built for the Obsidian community.

Special thanks to [MyAnimeList](https://myanimelist.net/) for their API.

---

## License

MIT License - see [LICENSE](https://github.com/zara-kasi/cassette/blob/main/LICENSE) for details.
