![MyAnimeNotes_image](assets/MyAnimeNotes_image.webp)

MyAnimeNotes is an [Obsidian](https://obsidian.md/) plugin that syncs your anime and manga lists from [MyAnimeList](https://myanimelist.net/) into structured Markdown notes, complete with metadata, cover image, and automatic updates.

### Get started

1. Open **Settings** > **MyAnimeNotes**.
2. Click **Login** to authenticate immediately via the browser.
3. Once logged in, use the **Command Palette** and run `MyAnimeNotes: Sync all from myanimelist` or click the **ribbon icon** (origami).

### Features 

- Runs entirely on your device with no external servers or services. All data is stored locally in your Obsidian vault.

> [!warning] 
> Your app credentials like access token and refresh tokens are saved locally in plugin data.json.

- Powerful template engine supporting 40+ variables for both anime and manga.

- 30+ filters including wikilink, date formatting, join, blockquote, callout, mathematical operations, and more.

> [!note] 
> The template feature is modeled after  [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-web-clipper). With some small addition like auto-complete menu for variables and filters.

- Extracts extensive data including titles, genres, studios, broadcast times, user scores, progress tracking, and more.

- Offers flexible sync options including sync all, sync anime only, sync manga only, and sync active statuses (currently watching/reading).

- **Auto-Sync Capabilities**: 
  - Sync on startup option. Start sync 2 mins after obsidian starts.
  - Scheduled sync at regular intervals (minimum 60 minutes). 
  - Efficient auto-sync mode to reduce API requests by only syncing watching/reading items.

> [!warning] 
> MAL API does not have an endpoint or parameter to sync only the latest changes to make sure those will be small data syncs. Due to this limitation we need to fetch all the items every time we use sync. That's way limiting the auto-sync to only fetch active list status, make sure we aren't abusing there API requests. 


- Secure authentication using OAuth 2.0 [PKCE](https://oauth.net/2/pkce/) flow for the official [MAL API](https://myanimelist.net/apiconfig).

> [!note] 
> There are two ways to authenticate MyAnimeNotes with MAL. 
> 
> 1. Default: Use the public OAuth. Here the plugin will use the Client ID provided by the developer to authenticate, which is public. 
> 2. If you prefer to use your own API credentials, you can enable "Custom App" in settings and enter your own Client ID. To get your own Client ID, you’ll need to create your own application on MAL. [You can follow the steps in this guide](https://github.com/zara-kasi/obsidian-myanimenotes/blob/main/docs/mal-authentication-guide.md)

- Builds index on-demand for O(1) lookups while avoiding stale data issues.

- Lock manager prevents race conditions when multiple operations target the same file.


> [!note] 
> Plugin builds index for files with `myanimenotes` property. The scope of the index is vault. 
> You can move files it creates to anywhere in the vault, plugin still be able to update that file.

- Skips unchanged items during sync to improve performance, with option to force full sync.

> [!note] 
> In case if you want to update all the files,  not only the ones that changed. You can turn on ignore timestamp toggle. But turning this on will create unnecessary changes. It could become a problem if you use any sync service like git plugin.
> 
### Documentation

- **[Privacy Policy](./PRIVACY.md)**: Explains how your data is handled locally.
- **[API Compliance](./COMPLIANCE.md)**: Details our adherence to the MyAnimeList Developer Agreement.
- **[Contributing](./CONTRIBUTING.md)**: Guidelines for setting up the development environment and submitting PRs.


> [!note] 
> The source code is extensively self-documented. For a broader understanding of the plugin's architecture, you can also see the third-party documentation.


[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/zara-kasi/obsidian-myanimenotes)

### Attribution

All anime and manga data are sourced from [MyAnimeList.net](https://myanimelist.net).
**MyAnimeNotes** is an independent project and is **not affiliated with MyAnimeList Co., Ltd.**

### License

This project is licensed under the [MIT License](./LICENSE).