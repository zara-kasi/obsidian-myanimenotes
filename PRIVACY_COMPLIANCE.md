# Cassette: Privacy, Data Use & API Compliance

Cassette is an open-source Obsidian plugin that syncs anime and manga lists from [MyAnimeList.net](https://myanimelist.net) into local Markdown files.  
It runs entirely on the user’s device and does not use any external servers or services.

---

## Data Handling

- **Authentication:** Uses the official MyAnimeList OAuth 2.0 or a Client ID for public data. Tokens are stored locally in Obsidian and never shared.  
- **Requests:** Communicates directly with `api.myanimelist.net` over HTTPS.  
- **Storage:** Data retrieved from MAL is written to Markdown files inside the user’s Obsidian vault.  
- **Transmission:** No data is ever sent to any third party or stored remotely.

---

## Compliance with MyAnimeList Terms

Cassette's design and operation are guided by the requirements outlined in the [MyAnimeList API License & Developer Agreement](https://myanimelist.net/static/apiagreement.html).

The core of Cassette's compliance rests on the following clause regarding data storage:

> “You may not maintain, store or process any MyAnimeList Content that consists of personal information of MyAnimeList users... On the server-side of Your Applications, but Your Applications may... Store such information and content on the client-side.”

This clause makes a critical distinction: it forbids storing personal user data on a server but explicitly permits storing it on the client-side (the user's device). The agreement uses the broad term "store," which legally covers both temporary caching and the persistent local storage that Cassette requires to function as a personal knowledge base.

As Cassette's primary function is to create a durable, offline-first personal record of a user's media history within Obsidian, this persistent local storage is "reasonably necessary for the proper functioning" of the plugin, fully aligning with the terms.

- **Local Storage:** All operations are limited to the user’s device.
- **Personal Use:** Cassette is free, open-source, and intended for individual, non-commercial use, as defined in the agreement.
- **Redistribution:** The plugin has no features for uploading, publishing, or sharing MAL data.
- **Retention:** Data is stored locally on the user's device as a persistent, personal reference, which is the plugin's primary function.

> For more detail compliance analysis see this [MAL Compliance Analysis](./docs/mal-compliance-analysis.md)

## User Responsibilities

- Use Cassette only for personal, non-commercial purposes.  
- Do not share or publish Markdown files containing MAL data.  
- Avoid using the plugin for automated redistribution or public exposure of MAL content.

---

## Attribution

All anime and manga data are sourced from [MyAnimeList.net](https://myanimelist.net).  
Cassette is an independent project and is not affiliated with or endorsed by MyAnimeList Co., Ltd.  
All trademarks and content belong to their respective owners.

---

## References

- [MyAnimeList API License & Developer Agreement](https://myanimelist.net/static/apiagreement.html)  
- [Official MAL API Club Page](https://myanimelist.net/clubs.php?cid=13727)

