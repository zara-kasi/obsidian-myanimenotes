# Get Client ID & Client Secret from Simkl

---

1. Go to [simkl.com/settings/developer/new](https://simkl.com/settings/developer/new) → **Create App**.  
2. Fill in the following details:  

| Field                | Value                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Name**         | Cassette                                                                                                                                                                                                                                |
| **Description**      | Cassette — Make your media a part of your knowledge. Sync your media items from MyAnimeList and Simkl directly into your Obsidian vault. Build a private, offline library that stays updated and seamlessly integrates with your notes. |
| **Redirect URL**     | obsidian://cassette-auth/simkl                                                                                                                                                                                                          |

3. Click **Create App** and copy your **Client ID** and **Client Secret**.  

> ⚠️ The Redirect URL must be exactly `obsidian://cassette-auth/simkl`, or authentication will fail.
