# Cassette Obsidian Plugin

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
title: One Punch Man
aliases:
  - One-Punch Man
  - ワンパンマン
  - One Punch-Man
  - OPM
status: Completed
eps_seen: 12
rating: 9
media: "[[TV]]"
episodes: 12
state: Finished
released: 2015-10-05
ended: 2015-12-21
studios:
  - "[[Madhouse]]"
origin: "[[Web Manga]]"
genres:
  - "[[Action]]"
  - "[[Adult cast]]"
  - "[[Comedy]]"
  - "[[Parody]]"
  - "[[Seinen]]"
  - "[[Super power]]"
duration: 24m
score: 8.48
description: "The seemingly unimpressive Saitama has a rather unique hobby: being a hero. In order to pursue his childhood dream, Saitama relentlessly trained for three years, losing all of his hair in the process. Now, Saitama is so powerful, he can defeat any enemy with just one punch. However, having no one capable of matching his strength has led Saitama to an unexpected problem—he is no longer able to enjoy the thrill of battling and has become quite bored. One day, Saitama catches the attention of 19-year-old cyborg Genos, who witnesses his power and wishes to become Saitama's disciple. Genos proposes that the two join the Hero Association in order to become certified heroes that will be recognized for their positive contributions to society. Saitama, who is shocked that no one knows who he is, quickly agrees. Meeting new allies and taking on new foes, Saitama embarks on a new journey as a member of the Hero Association to experience the excitement of battle he once felt. [Written by MAL Rewrite]"
image: https://cdn.myanimelist.net/images/anime/12/76049l.jpg
source: https://myanimelist.net/anime/30276
platform: "[[MyAnimeList]]"
category: "[[Anime]]"
id: 30276
cassette: mal:anime:30276
synced: 2025-10-23T00:56:20+00:00
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

For example, change `status` → `watch_status` to match your note style.  


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
