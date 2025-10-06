# Get client id & client secret from MyAnimeList

🎥 **Watch Tutorial:**  
[![Watch the YouTube Short](https://img.youtube.com/vi/SIOmZo6MSh4/0.jpg)](https://youtube.com/shorts/SIOmZo6MSh4)

---

1. Go to [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig) → **Create App**.  
2. Fill in the following details:  
   - **App Name:** `Cassette`    
   - **Redirect URI:** `obsidian://cassette-auth/mal`  
   - **Description:** `Cassette — Make your media a part of your knowledge. Sync your media items from MyAnimeList and Simkl directly into your Obsidian vault. Build a private, offline library that stays updated and seamlessly integrates with your notes.`  
   - **Company Name:** `Cassette` or anything you like. 
3. Click **Save** and copy your **Client ID** and **Client Secret**.  

> ⚠️ The Redirect URI must be exactly `obsidian://cassette-auth/mal`, or authentication will fail.