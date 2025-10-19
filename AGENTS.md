# Cassette - Agent Guide

## Project Overview

**Cassette** is an Obsidian plugin that syncs anime, manga, movies, and TV shows from MyAnimeList (MAL) and SIMKL directly into your Obsidian vault. It creates markdown notes with frontmatter properties for each media item, enabling users to build a private, offline media library integrated with their knowledge base.

**Core Philosophy**: Media items should be treated as knowledge entities that can be linked, tagged, and referenced alongside other notes.

---

## Architecture Overview

```
src/
├── main.ts                    # Plugin entry point, lifecycle management
├── api/                       # External API integrations
│   ├── mal/                   # MyAnimeList API (OAuth 2.0 + PKCE)
│   └── simkl/                 # SIMKL API (OAuth 2.0)
├── sync/                      # Sync orchestration and scheduling
├── transformers/              # Raw API → Universal format conversion
├── storage/                   # File creation, cassette system, frontmatter
├── models/                    # TypeScript types and interfaces
├── settings/                  # Settings UI and configuration
└── utils/                     # Shared utilities (debug logging, etc.)
```

---

## Key Concepts

### 1. **Universal Media Format**

All media items from different platforms (MAL, SIMKL) are transformed into a unified `UniversalMediaItem` structure defined in `src/models/media.types.ts`. This enables platform-agnostic storage and future extensibility.

**Key fields**:
- `id` - Platform-specific ID
- `title` - Main title
- `category` - `anime` or `manga`
- `platform` - `mal` or `simkl`
- `userStatus` - User's watching/reading status
- `userScore` - User's rating
- `syncedAt` - Timestamp from API (used for sync optimization)

### 2. **Cassette System** (Primary Key for Sync)

**Location**: `src/storage/cassette/`

The cassette is a unique identifier stored in frontmatter that enables robust file tracking:

**Format**: `provider:category:id`  
**Example**: `mal:anime:1245`

**Why Cassette?**
- Allows users to rename files without breaking sync
- Enables moving files across folders
- Prevents duplicate detection issues
- Works as a stable primary key

**Cassette Functions**:
- `generateCassetteSync()` - Creates cassette ID from media item
- `findFilesByCassetteSync()` - Searches ENTIRE vault for files with matching cassette
- `findLegacyFiles()` - Migrates old files without cassettes
- `acquireSyncLock()` / `releaseSyncLock()` - Prevents concurrent operations on same item

### 3. **Sync Optimization**

**Location**: `src/storage/storage-service.ts`

The plugin uses timestamp comparison to avoid unnecessary file updates:

```typescript
// Only updates if timestamps differ or forceFullSync is enabled
if (!forceFullSync && areTimestampsEqual(localSynced, remoteSynced)) {
  return { action: 'skipped' };
}
```

This dramatically reduces disk I/O during sync operations.

### 4. **Frontmatter Property Mapping**

**Location**: `src/storage/markdown/property-mapping.ts`

Users can customize property names in settings. The mapping system translates between internal field names and user-defined property names:

**Default Mapping**:
```yaml
title: title
status: status
rating: rating
episodes: episodes
# ... etc
```

**Custom Mapping** (if user changes it):
```yaml
title: anime_title
status: watch_status
rating: my_score
# ... etc
```

The `buildSyncedFrontmatterProperties()` function uses this mapping when generating frontmatter.

---

## Authentication Flow

### MAL Authentication (OAuth 2.0 + PKCE)

**Location**: `src/api/mal/auth/`

**Flow**:
1. User enters Client ID/Secret in settings
2. Plugin generates PKCE verifier/challenge
3. Opens browser to MAL authorization page
4. MAL redirects to `obsidian://cassette-auth/mal?code=...`
5. Plugin exchanges code for access/refresh tokens
6. Tokens stored in plugin settings (encrypted by Obsidian)

**Key Files**:
- `oauth-flow.ts` - Authorization code flow
- `token-manager.ts` - Token validation, refresh, expiry checking
- `pkce.ts` - PKCE parameter generation

### SIMKL Authentication (OAuth 2.0)

**Location**: `src/api/simkl/auth/`

Similar to MAL but simpler (no PKCE required).

---

## Sync Process

### High-Level Flow

```
User triggers sync
    ↓
Fetch data from API (paginated)
    ↓
Transform to UniversalMediaItem[]
    ↓
For each item:
    - Generate cassette ID
    - Check if file exists (by cassette)
    - Compare timestamps
    - Update/Create/Skip based on logic
    ↓
Save to vault as markdown files
```

### Detailed Sync Logic

**Location**: `src/storage/storage-service.ts` → `saveMediaItem()`

```
1. Generate cassette ID (e.g., mal:anime:1245)
2. Acquire lock (prevent concurrent operations)
3. Search vault for files with this cassette
4. If found:
   - Check timestamp (skip if unchanged unless forceFullSync)
   - Merge frontmatter (preserve user properties)
   - Update file
5. If not found:
   - Try legacy detection (old files without cassette)
   - If legacy found: migrate (add cassette)
   - Otherwise: create new file
6. Release lock
```

**Duplicate Handling**: If multiple files have the same cassette, the most recently modified file is selected.

---

## File Structure

### Markdown Generation

**Location**: `src/storage/markdown/markdown-generator.ts`

Generated files follow this structure:

```yaml
---
title: Death Note
status: completed
rating: 10
episodes: 37
# ... other properties
cassette: mal:anime:1535
synced: "2025-01-15T10:30:00Z"
---

[User-written content preserved here]
```

**Key Behavior**:
- **New files**: Create frontmatter, empty body
- **Existing files with frontmatter**: Merge properties, preserve body
- **Existing files without frontmatter**: Add frontmatter, preserve entire content as body

### Frontmatter Merging

**Location**: `src/storage/markdown/frontmatter-builder.ts`

```typescript
mergeFrontmatter(existing, synced) {
  // Start with existing (preserves user properties)
  const merged = { ...existing };
  
  // Overlay synced properties (controlled fields)
  Object.entries(synced).forEach(([key, value]) => {
    merged[key] = value;
  });
  
  return merged;
}
```

This ensures user-added properties (like custom tags, notes) are never deleted.

---

## Settings System

**Location**: `src/settings/`

### Settings Interface

**File**: `settings-interface.ts`

Defines all plugin settings:
- MAL/SIMKL credentials and tokens
- Storage paths (anime/manga folders)
- Property mapping customization
- Auto-sync configuration
- Debug mode

### Settings UI

**File**: `settings-tab.ts`

- Conditional rendering based on authentication state
- User info display (avatar + username) when authenticated
- Property mapping editor (expandable section)
- Auto-sync interval configuration

---

## Auto-Sync

**Location**: `src/sync/auto-sync-manager.ts`

Background sync system that runs at user-defined intervals:

```typescript
// Starts on plugin load if enabled
autoSyncManager.start();

// Runs every X minutes
setInterval(() => performAutoSync(), intervalMs);

// Stops on plugin unload
autoSyncManager.stop();
```

**Settings**:
- `autoSync` - Enable/disable
- `syncInterval` - Minutes between syncs (default: 60)

---

## Debug System

**Location**: `src/utils/debug.ts`

Centralized logging system that respects `debugMode` setting:

```typescript
const debug = createDebugLogger(plugin, 'Sync Manager');
debug.log('Starting sync...', { itemCount: 123 });
```

**Only logs when** `plugin.settings.debugMode === true`

This prevents console spam in production while enabling detailed logging for troubleshooting.

---

## Commands

**Location**: `src/main.ts` → `addCommands()`

Registered commands:
- `sync-mal-all` - Sync all anime + manga
- `sync-mal-anime` - Sync anime only
- `sync-mal-manga` - Sync manga only
- `sync-mal-watching` - Sync currently watching anime
- `sync-mal-reading` - Sync currently reading manga

---

## Important Constraints

### 1. **No localStorage/sessionStorage**

Obsidian's artifact environment doesn't support browser storage APIs. All state must be stored via:
- Plugin settings (`this.loadData()` / `this.saveData()`)
- In-memory variables
- Vault files

### 2. **Obsidian Protocol Handlers**

Custom URI scheme for OAuth callbacks:
```typescript
registerObsidianProtocolHandler('cassette-auth/mal', handleMALRedirect);
```

This enables `obsidian://cassette-auth/mal?code=...` redirects.

### 3. **Token Expiry**

MAL tokens expire. The plugin automatically refreshes tokens before API calls using `ensureValidToken()`.

### 4. **Rate Limiting**

MAL API has rate limits. The plugin uses:
- Pagination (100 items per request)
- Sequential requests (not parallel)
- Safety limit (max 10,000 items)

---

## Common Tasks

### Add a New Property to Frontmatter

1. Add field to `UniversalMediaItem` in `src/models/media.types.ts`
2. Add mapping to `PropertyMapping` interface in `src/storage/markdown/property-mapping.ts`
3. Add to `DEFAULT_PROPERTY_MAPPING`
4. Update `buildSyncedFrontmatterProperties()` in `frontmatter-builder.ts`
5. Add UI control in `property-settings.ts` (if user-customizable)
6. Update transformer in `src/transformers/mal-transformer.ts`

### Add a New Platform (e.g., AniList)

1. Create `src/api/anilist/` directory
2. Implement authentication module (follow MAL structure)
3. Implement API service (fetching lists)
4. Create transformer in `src/transformers/anilist-transformer.ts`
5. Add settings UI section
6. Register OAuth handler in `main.ts`
7. Add to sync manager

### Modify Sync Behavior

**Location**: `src/storage/storage-service.ts`

- Adjust duplicate handling logic
- Modify timestamp comparison
- Change file naming conventions
- Add additional validation

---

## Testing Considerations

### Manual Testing Checklist

- [ ] Authentication flow (MAL + SIMKL)
- [ ] Initial sync (new vault)
- [ ] Incremental sync (existing files)
- [ ] File renaming (cassette should track)
- [ ] Folder moving (cassette should track)
- [ ] Duplicate detection
- [ ] Legacy file migration
- [ ] Auto-sync intervals
- [ ] Property customization
- [ ] Mobile compatibility (if not `isDesktopOnly`)

### Debug Mode Testing

Enable `debugMode` in settings to see:
- API request/response details
- Cassette lookup results
- Timestamp comparisons
- File creation/update decisions

---

## Data Flow Example

### Syncing a Single Anime

```
1. User clicks "Sync anime from MyAnimeList"
   ↓
2. SyncManager.syncAnime()
   ↓
3. fetchCompleteMALAnimeList() → API paginated requests
   ↓
4. transformMALAnimeList() → UniversalMediaItem[]
   ↓
5. saveMediaItems() → For each item:
      - generateCassetteSync() → "mal:anime:1535"
      - findFilesByCassetteSync() → Search vault
      - If found: compare timestamps, update if needed
      - If not found: create new file
      - generateMarkdownWithCassetteSync() → Full content
      - vault.create() or vault.modify()
   ↓
6. Show notice: "✅ Synced 150 anime items"
```

---

## Error Handling

### Authentication Errors

- Token expired → Automatic refresh via `refreshAccessToken()`
- Refresh failed → Clear tokens, show notice to re-authenticate
- Invalid credentials → Show error, prevent API calls

### Sync Errors

- API rate limit → Log warning, continue with received items
- Invalid data → Skip item, log error, continue
- File system error → Show notice, rollback if possible

### Network Errors

- Timeout → Retry with exponential backoff (not implemented yet)
- Connection lost → Show error notice, preserve partial sync

---

## Future Enhancements (Not Implemented)

- Custom templates (mentioned in settings but not implemented)
- SIMKL sync service (API module exists, sync not implemented)
- Retry logic for failed API calls
- Incremental sync by date range
- Conflict resolution UI for duplicates
- Export/import settings

---

## Quick Reference

### Key Files to Modify

| Task | File |
|------|------|
| Add new property | `models/media.types.ts` → `property-mapping.ts` → `frontmatter-builder.ts` |
| Change sync logic | `storage/storage-service.ts` |
| Modify API calls | `api/mal/mal-api-service.ts` |
| Adjust file format | `storage/markdown/markdown-generator.ts` |
| Update UI | `settings/settings-tab.ts` |
| Add command | `main.ts` → `addCommands()` |

### Debug Commands (Console)

```javascript
// Check plugin settings
app.plugins.plugins['cassette'].settings

// Force sync
app.plugins.plugins['cassette'].syncManager.syncFromMAL()

// Check authentication
app.plugins.plugins['cassette'].settings.malAuthenticated
```

---

## Dependencies

- `obsidian` - Core API (provided by Obsidian)
- `js-yaml` - YAML frontmatter parsing/serialization
- `esbuild` - Bundler
- `typescript` - Type checking

---

## Contributing Guidelines

When working on this plugin:

1. **Preserve user data**: Never delete user-added frontmatter properties or file content
2. **Respect cassette system**: Always use cassette for file lookup, never rely on filename
3. **Handle timestamps**: Implement sync optimization via timestamp comparison
4. **Debug logging**: Use `createDebugLogger()` instead of `console.log()`
5. **Error recovery**: Fail gracefully, show user-friendly notices
6. **Mobile support**: Avoid desktop-only APIs unless `isDesktopOnly: true`

---

## Summary

**Cassette** is a media tracking plugin built on three core principles:

1. **Stable Identity** (cassette system) - Files tracked by ID, not name/location
2. **Data Preservation** (merge frontmatter) - User content never deleted
3. **Efficiency** (timestamp optimization) - Only update what changed

The architecture separates concerns cleanly: API layer fetches data, transformers normalize it, storage layer persists it, and sync manager orchestrates everything.

For AI assistants: This plugin follows Obsidian's community plugin conventions (see `AGENTS.md` in project root) and uses TypeScript with strict typing throughout.