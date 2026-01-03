# Get Client ID from MyAnimeList

---

1. Go to [myanimelist.net/apiconfig/create](https://myanimelist.net/apiconfig/create)
2. Fill in the following details:

| Field                      | Value                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Name**               | MyAnimeNotes                                                                                                                                                                          |
| **App Type**               | other                                                                                                                                                                                 |
| **Description**            | MyAnimeNotes is an Obsidian plugin that syncs your anime and manga lists from MyAnimeList into structured Markdown notes, complete with metadata, cover image, and automatic updates. |
| **App Redirect URI**       | obsidian://myanimenotes-auth/mal                                                                                                                                                      |
| **Homepage URL**           | https://github.com/zara-kasi/obsidian-myanimenotes                                                                                                                                    |
| **Name /<br>Company Name** | MyAnimeNotes                                                                                                                                                                          |

> ⚠️ The Redirect URI must be exactly `obsidian://myanimenotes-auth/mal`, or authentication will fail.

3. Click **Save** and copy your **Client ID** and **Client Secret**.
4. Open Obsidian **Settings** → **MyAnimeNotes**
5. Enter your **Client ID** and **Client Secret**
6. Click **Authenticate** and sign in via your browser

# Screenshots

1. Go to App creation page

![Steps](../assets/Imagepipe_31.webp)

2. Fill the App information from the table

![Steps](../assets/Imagepipe_32.webp)

3. Open API page

![Steps](../assets/Imagepipe_34.webp)

4. Click Edit to view you application Client ID 

![Steps](../assets/Imagepipe_35.webp)

5. Copy the Client ID

![Steps](../assets/Imagepipe_33.webp)

