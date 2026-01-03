# Privacy Policy

**Effective Date:** January 3, 2026

**MyAnimeNotes** ("the Plugin") is an open-source plugin for Obsidian, developed by [zara-kasi](https://github.com/zara-kasi). This Privacy Policy explains how the Plugin handles your data.

We are committed to a **local-first** philosophy. The Plugin operates entirely on your device and communicates directly with MyAnimeList. The developer does not operate any servers and does not collect, store, or view your personal data.

## 1. Information Processing

The Plugin processes the following data types exclusively on your local device to function:

### A. Authentication Data
* **OAuth Tokens:** To authorize API requests, the Plugin securely stores an Access Token and a Refresh Token locally within your Obsidian vault.
* **PKCE Verifiers:** During authentication, temporary cryptographic keys are generated to secure the login session.
* **Client Identification:** By default, the Plugin utilizes a shared public Client ID to facilitate authentication. Users may optionally choose to use their own credentials by entering a custom Client ID in the settings, which is stored locally on the device.

### B. User Profile
* **Profile Data:** The Plugin retrieves your MyAnimeList User ID, Username, and Profile Picture.
* **Usage:** This is used solely to display your active session status within the Plugin settings.

### C. Media Content
* **List Data:** The Plugin fetches your anime and manga lists (titles, scores, status, images) from MyAnimeList.
* **Usage:** This data is processed to generate and update Markdown (`.md`) files in your specified Obsidian folders.

## 2. Data Storage and Transmission

### Local Storage
All data managed by the Plugin is stored locally on your device:
* **Configuration:** Tokens, Client IDs, and settings are stored in `data.json` inside your vault.
* **Content:** Anime and manga entries are stored as standard files in your vault.

### Data Transmission
* **Direct Connection:** The Plugin communicates directly with the MyAnimeList API (`api.myanimelist.net`) via secure HTTPS connections.
* **No Intermediaries:** Your data is never transmitted to, processed by, or stored on servers owned by the developer.

### Automated Synchronization
If you enable **"Sync on Load"** or **"Scheduled Sync"**, the Plugin will automatically initiate background network requests to MyAnimeList to keep your lists updated.

## 3. Third-Party Services

The Plugin relies on the **MyAnimeList API**. By using this Plugin, you acknowledge that your data interactions are also subject to MyAnimeList's policies.
* **MyAnimeList Privacy Policy:** [https://myanimelist.net/about/privacy_policy](https://myanimelist.net/about/privacy_policy)

## 4. Security

We employ industry-standard security measures to protect your account integration:
* **PKCE (Proof Key for Code Exchange):** We use this standard for OAuth 2.0 authentication to ensure your credentials remain secure without requiring a client secret.
* **Encryption:** All API communication is encrypted via HTTPS.

## 5. User Control

You retain full ownership and control of your data:
* **Logout:** You may log out via the Plugin settings, which immediately deletes all local authentication tokens.
* **Revocation:** You may revoke the Plugin's access to your account at any time via your MyAnimeList App Settings.
* **Data Deletion:** As data is stored as local files, you may delete them at any time using your file manager.

## 6. Contact Information

If you have questions regarding this Privacy Policy or the Plugin's source code, please contact the developer:

* **Email:** zarakasi.dev@gmail.com
* **GitHub:** [https://github.com/zara-kasi/MyAnimeNotes](https://github.com/zara-kasi/obsidian-myanimenotes)
