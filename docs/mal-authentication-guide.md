# Get Client ID & Client Secret from MyAnimeList

---

1. Go to [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig/create) → **Create ID**.  
2. Fill in the following details:  


| Field                | Value                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Name**         | Cassette                                                                                                                                                                                                                                |
| **Description**      | Cassette — Make your media a part of your knowledge. Sync your media items from MyAnimeList and Simkl directly into your Obsidian vault. Build a private, offline library that stays updated and seamlessly integrates with your notes. |
| **App Redirect URI** | obsidian://cassette-auth/mal                                                                                                                                                                                                            |
| **Homepage URL**     | https://myanimelist.net/                                                                                                                                                                                                                |
| **Company Name**     | Cassette (or anything you like)                                                                                                                                                                                                         |


3. Click **Save** and copy your **Client ID** and **Client Secret**.  

> ⚠️ The Redirect URI must be exactly `obsidian://cassette-auth/mal`, or authentication will fail.
