# Get Client ID & Client Secret from MyAnimeList

---

1. Go to [myanimelist.net/apiconfig/create](https://myanimelist.net/apiconfig/create)
2. Fill in the following details:  


| Field                | Value                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Name**         | Cassette                                                                                                                                                                                                                                |
| **Description**      | Make your media a part of your knowledge. Sync your media items from MyAnimeList directly into your Obsidian vault. Build a private, offline library that stays updated and seamlessly integrates with your notes. |
| **App Redirect URI** | obsidian://cassette-auth/mal                                                                                                                                                                                                            |
| **Homepage URL**     | https://myanimelist.net/                                                                                                                                                                                                                |
| **Company Name**     | Cassette                                                                                                                                                                                                          |


> ⚠️ The Redirect URI must be exactly `obsidian://cassette-auth/mal`, or authentication will fail.

3. Click **Save** and copy your **Client ID** and **Client Secret**.  
4. Open Obsidian **Settings** → **Cassette**
5. Enter your **Client ID** and **Client Secret**
6. Click **Authenticate** and sign in via your browser

# Screenshots

1. Fill the application details

![Step1](./assets/step-1)