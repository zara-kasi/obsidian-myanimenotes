# Obsidian Cassette Plugin

Cassette is an Obsidian plugin that syncs your anime and manga lists from MyAnimeList (MAL) into structured Markdown notes, complete with metadata, cover image, and automatic updates.

## Getting Started

### Installation

You can install Cassette via:
- **BRAT:** Add `https://github.com/zara-kasi/cassette` to your BRAT list.
- **Manual:** Download the latest release from [Releases](https://github.com/zara-kasi/cassette/releases) and extract it into your `.obsidian/plugins/cassette` folder.

### MyAnimeList Authentication

1. Create a MAL API application: [Complete Setup Guide](https://github.com/zara-kasi/cassette/blob/main/docs/mal-authentication-guide.md)
2. Open Obsidian **Settings** → **Cassette**
3. Enter your **Client ID** and **Client Secret**
4. Click **Authenticate** and sign in via your browser

> Cassette connects securely to your MyAnimeList account using their official API. You only need to create an API app once to link your account.

---

## Usage

After authenticating, use the Command Palette and run `Cassette: Sync all from MyAnimeList` or use the ribbon icon (Cassette symbol). Synced anime and manga appear in your chosen folder (set in plugin settings).

### Example synced note

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

> Fields like title, status, rating, and score are fetched from MAL. You can freely edit or add your own fields below the frontmatter — Cassette won’t overwrite your custom notes.

### How Sync Works

Each synced note includes a `cassette` property in the frontmatter (e.g., `mal:anime:40748`).  
This value uniquely identifies the item by combining its platform, media type, and ID, allowing Cassette to identify and update notes based on their MyAnimeList entries.

Cassette uses this identifier — not the file name or location — to track synced notes. You can safely rename or move files anywhere in your vault without breaking sync.

Cassette compares the synced timestamp to skip unnecessary updates. If you prefer to refresh all data, enable **Overwrite all** in the plugin settings.

### Property Customization

Cassette lets you rename synced frontmatter fields to fit your personal workflow. You can configure this under **Settings → Cassette → Property Customization**.

For example, change `status` → `watch_status` or `genres` → `tags` to match your note style.  

> Genres are formatted to match Obsidian’s tag syntax.


---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development instructions.  
Report bugs or suggest new features [here](https://github.com/zara-kasi/cassette/issues).

> For information about data usage and privacy, see [PRIVACY](./PRIVACY.md).

## License

Cassette is released under the MIT License.  [MIT License](./LICENSE).  
You are free to use, modify, and distribute Cassette in accordance with the license terms.  
© 2025 [Zara Kasi](https://github.com/zara-kasi)

---