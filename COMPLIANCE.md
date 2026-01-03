# MyAnimeNotes: API Compliance & Terms of Use

**MyAnimeNotes** is an open-source Obsidian plugin designed to synchronize anime and manga tracking lists. This document outlines the plugin's strict adherence to the [MyAnimeList API License & Developer Agreement](https://myanimelist.net/static/apiagreement.html).

For details regarding data handling and user privacy, please refer to our separate **[Privacy Policy](./PRIVACY.md)**.

---

## 1. Compliance with Data Storage Terms

The architecture of MyAnimeNotes is legally grounded in **Section 3(c)** of the MyAnimeList API Agreement, which distinguishes between prohibited server-side storage and permitted client-side storage.

### The "Client-Side" Distinction

The API Agreement states:

> “You may not maintain, store or process any MyAnimeList Content... On the server-side of Your Applications, but Your Applications may... **Store such information and content on the client-side.**”

**MyAnimeNotes operates exclusively on the client-side.**

-   The plugin runs inside **Obsidian**, a local desktop/mobile application.
-   Data retrieved from the API is stored directly onto the user's physical device (local file system) within their Obsidian Vault.
-   **No Intermediary Servers:** There is no "MyAnimeNotes Server." The developer maintains no backend infrastructure, database, or cache that stores user data.

This local storage is reasonably necessary for the proper functioning of the Application as a personal, offline-first knowledge base.

---

## 2. Non-Commercial Classification

MyAnimeNotes is classified as a **"Non-Commercial Application"** under **Section 1(i)** of the Agreement.

-   **Open Source:** The project is licensed under the **MIT License** and source code is publicly available.
-   **No Monetization:** The plugin contains no advertisements, subscription fees, premium unlocks, or "pay-to-win" features.
-   **Community Focused:** It is developed voluntarily for the Obsidian and Anime communities.

---

## 3. API Usage Standards

The plugin adheres to the operational restrictions outlined in **Section 4** and **Section 6** of the Agreement.

### A. No Scraping (Section 4.i)

MyAnimeNotes does not engage in "screen scraping," HTML parsing, or automated data harvesting of the MyAnimeList website. All data is retrieved strictly through the official **MyAnimeList API v2** endpoints.

### B. Rate Limiting (Section 6)

To prevent unreasonable burdens on MyAnimeList servers:

-   The plugin implements **exponential backoff** strategies for retries.
-   Automated sync features (if enabled by the user) enforce a **minimum interval** (defaulting to 60+ minutes) to respect API rate limits.
-   Batch processing is throttled to prevent "thundering herd" behavior.

### C. Direct Connection

All network requests are made directly from the user's device to `api.myanimelist.net` via HTTPS. No traffic is routed through proxy servers or VPNs controlled by the developer.

---

## 4. Attribution

In accordance with **Section 3(a)(xiii)**:

-   All anime and manga metadata, covers, and list information are sourced from [MyAnimeList.net](https://myanimelist.net).
-   **MyAnimeNotes** is an independent open-source project and is **not affiliated with, endorsed by, or sponsored by MyAnimeList Co., Ltd.**
-   All trademarks, logos, and content belong to their respective owners.

---

## 5. User Responsibilities

By using this plugin, users agree to the following:

1.  **Personal Use Only:** You may not use this plugin or the data retrieved by it for commercial purposes or public redistribution.
2.  **Credential Security:** You are responsible for maintaining the security of your MyAnimeList account credentials.
3.  **No Redistribution:** You should not publish raw Markdown files containing MyAnimeList data to public repositories or websites in a way that violates MyAnimeList's terms regarding data redistribution.

---

## References & Audits

-   [MyAnimeList API License & Developer Agreement](https://myanimelist.net/static/apiagreement.html)

