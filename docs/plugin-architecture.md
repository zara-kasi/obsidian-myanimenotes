# MyAnimeNotes Plugin - Developer Documentation

## Overview

MyAnimeNotes is an Obsidian plugin that synchronizes your anime and manga lists from MyAnimeList (MAL) into structured Markdown notes. The plugin handles OAuth authentication, real-time syncing, template-based note generation, and intelligent file management with duplicate detection and concurrency control.

## Architecture Overview

```mermaid
graph TB
    subgraph "Entry Point"
        Main[main.ts<br/>Plugin Core]
    end
    
    subgraph "Authentication Layer"
        Auth[auth/<br/>OAuth 2.0 PKCE]
    end
    
    subgraph "API Layer"
        API[api/<br/>MAL API Client]
    end
    
    subgraph "Sync Layer"
        SyncMgr[sync/manager.ts<br/>Sync Orchestration]
        SyncSvc[sync/service.ts<br/>Sync Logic]
        AutoSync[sync/auto/<br/>Background Sync]
        Fetchers[sync/fetchers.ts<br/>Data Fetching]
    end
    
    subgraph "Data Layer"
        Models[models/<br/>Data Transformation]
        Core[core/<br/>Indexing & Locking]
    end
    
    subgraph "Storage Layer"
        Storage[storage/<br/>File Operations]
        Builders[storage/builders/<br/>Content Generation]
    end
    
    subgraph "UI Layer"
        Settings[settings/<br/>Settings UI]
        Templates[settings/template/<br/>Template System]
    end
    
    Main --> Auth
    Main --> SyncMgr
    Main --> AutoSync
    Main --> Settings
    
    SyncMgr --> SyncSvc
    SyncSvc --> Fetchers
    Fetchers --> API
    API --> Auth
    
    Fetchers --> Models
    SyncSvc --> Storage
    
    Storage --> Core
    Storage --> Builders
    Storage --> Models
    
    Settings --> Templates
    Templates --> Models
    
    style Main fill:#e1f5ff
    style Auth fill:#fff3e0
    style API fill:#f3e5f5
    style Storage fill:#e8f5e9
    style Core fill:#fff9c4
```

## Core Concepts

### 1. **MyAnimeNotes Sync Identifier**
Every media item has a unique identifier: `provider:category:id` (e.g., `mal:anime:1234`). This identifier is stored in the note's frontmatter and serves as the source of truth for linking notes to MAL entries.

### 2. **JIT (Just-In-Time) Indexing**
Instead of maintaining a persistent database, the plugin builds an in-memory index on-demand by scanning Obsidian's MetadataCache. This provides O(1) lookups while avoiding stale data issues.

### 3. **Lock Manager**
A concurrency control system that prevents race conditions when multiple operations target the same file simultaneously.

### 4. **Template System**
A flexible, user-customizable template engine that supports variables, filters, and property type formatting.

## Module Breakdown

### 📁 `src/main.ts` - Plugin Entry Point

**Purpose**: Lifecycle management and initialization

**Key Responsibilities**:
- Plugin loading/unloading
- Manager initialization (Sync, AutoSync, Lock)
- Command registration
- OAuth protocol handler registration

**Important Classes**:
- `MyAnimeNotesPlugin` - Main plugin class extending Obsidian's Plugin

```typescript
// Initialization flow
onload() → 
  loadSettings() → 
  createManagers() → 
  registerHandlers() → 
  addCommands()
```

---

### 📁 `src/auth/` - Authentication Layer

**Purpose**: OAuth 2.0 PKCE flow implementation for MAL API

```mermaid
sequenceDiagram
    participant User
    participant Plugin
    participant Browser
    participant MAL
    
    User->>Plugin: Click "Authenticate"
    Plugin->>Plugin: Generate PKCE verifier/challenge
    Plugin->>Browser: Open MAL login page
    Browser->>MAL: User logs in
    MAL->>Browser: Redirect with auth code
    Browser->>Plugin: obsidian://myanimenotes-auth/mal?code=...
    Plugin->>MAL: Exchange code for tokens
    MAL->>Plugin: Access token + Refresh token
    Plugin->>Plugin: Save tokens to settings
```

**Key Files**:

| File | Purpose |
|------|---------|
| `oauth-flow.ts` | Manages the OAuth authorization flow |
| `pkce.ts` | Generates PKCE cryptographic parameters |
| `token-manager.ts` | Token validation, refresh, and expiry handling |
| `user-service.ts` | Fetches and stores user profile information |
| `logout.ts` | Clears authentication data |

**Critical Functions**:
```typescript
// Start OAuth flow
startAuthFlow(plugin) 
  → generateVerifier() 
  → openBrowser(authUrl)

// Handle redirect
handleOAuthRedirect(plugin, params) 
  → validateState() 
  → exchangeCodeForToken()

// Ensure valid token before API calls
ensureValidToken(plugin) 
  → isTokenValid() 
  → refreshAccessToken() (if expired)
```

---

### 📁 `src/api/` - MAL API Client

**Purpose**: HTTP communication with MyAnimeList API v2

**Architecture**:
```mermaid
graph LR
    A[endpoints.ts<br/>API Methods] --> B[client.ts<br/>HTTP Client]
    B --> C[constants.ts<br/>Config]
    B --> D[Retry Logic<br/>Exponential Backoff]
    A --> E[types.ts<br/>Response Types]
```

**Key Features**:
- **Rate Limiting**: Automatic retry with exponential backoff for 429/5xx errors
- **Pagination**: Auto-fetches all pages for complete lists
- **Field Optimization**: Requests only necessary fields to reduce payload
- **Throttling**: Batches concurrent requests to avoid overwhelming the API

**Example Flow**:
```typescript
// Complete list fetch with pagination
fetchCompleteMALAnimeList(plugin) {
  let offset = 0;
  const allItems = [];
  
  do {
    const response = await makeMALRequest(plugin, endpoint, { offset, limit: 100 });
    allItems.push(...response.data);
    offset += 100;
  } while (response.paging?.next);
  
  return allItems;
}
```

---

### 📁 `src/models/` - Data Models

**Purpose**: Transform raw MAL API data into internal representations

**Files**:
- `types.ts` - TypeScript interfaces (MediaItem, MALItem, etc.)
- `mappers.ts` - Pure functions for data transformation
- `media.ts` - Orchestrates parsing logic

**Transformation Pipeline**:
```mermaid
graph LR
    A[MAL API Response] --> B[MALItem<br/>Raw API Shape]
    B --> C[parseAnime/parseManga<br/>Transformation]
    C --> D[MediaItem<br/>Internal Model]
    D --> E[Template System]
    E --> F[Markdown Note]
```

**Key Normalizations**:
- **Status Mapping**: "currently_airing" → "Ongoing"
- **Alternative Titles**: Flattens nested structure into array
- **Genres**: Extracts clean genre names
- **Dates**: Standardizes to YYYY-MM-DD format

---

### 📁 `src/core/` - Core Utilities

**Purpose**: Fundamental sync infrastructure

#### `identifiers.ts` - ID Management
```typescript
// Generate identifier
generateMyAnimeNotesSync(item) → "mal:anime:1234"

// Validate format
validateMyAnimeNotesSyncFormat(id) → boolean

// Find files by ID
findFilesByMyAnimeNotesSync(index, id) → TFile[]
```

#### `indexing.ts` - JIT Index
```typescript
// Build snapshot of vault state
buildMyAnimeNotesIndex(plugin) {
  const index = new Map<string, TFile[]>();
  
  for (const file of vault.getMarkdownFiles()) {
    const cache = metadataCache.getFileCache(file);
    const id = cache?.frontmatter?.myanimenotes;
    
    if (id) index.set(id, [...(index.get(id) || []), file]);
  }
  
  return index; // O(1) lookups
}
```

**Performance**:
- Scans entire vault in ~50-200ms for typical vaults
- No disk I/O (uses MetadataCache)
- Detects duplicates automatically

#### `lock.ts` - Concurrency Control
```typescript
// Acquire lock (waits if locked)
await lockManager.acquireSyncLock("mal:anime:1234");

// Execute critical section
try {
  await updateFile();
} finally {
  lockManager.releaseSyncLock("mal:anime:1234");
}

// Or use HOF pattern
await lockManager.withLock("mal:anime:1234", async () => {
  await updateFile();
});
```

**Features**:
- Per-ID locking (fine-grained concurrency)
- Stale lock detection (30s timeout)
- Automatic cleanup on plugin unload

---

### 📁 `src/sync/` - Synchronization Engine

**Purpose**: Orchestrates the sync process from API → Storage

```mermaid
graph TD
    A[User Triggers Sync] --> B[SyncManager.syncFromMAL]
    B --> C{Check Guard}
    C -->|Failed| D[Show Notice<br/>Return Empty]
    C -->|Passed| E[SyncService.syncMAL]
    
    E --> F[Authenticate]
    F --> G[Fetch Anime<br/>fetchers.syncAnimeList]
    F --> H[Fetch Manga<br/>fetchers.syncMangaList]
    
    G --> I[Parse to MediaItems]
    H --> I
    
    I --> J[StorageService.saveMediaItemsByCategory]
    J --> K[Build JIT Index]
    K --> L[Prepare Batch<br/>Analysis Phase]
    L --> M{Skip?}
    M -->|Yes| N[Record Skip Result]
    M -->|No| O[Execute File Operation]
    
    O --> P{File Exists?}
    P -->|Yes| Q[Update Frontmatter]
    P -->|No| R[Create New File]
    
    Q --> S[Return Results]
    R --> S
    N --> S
    
    S --> T[Update Last Sync Time]
    T --> U[Show Completion Notice]
```

#### `manager.ts` - Sync Orchestration
**Responsibilities**:
- Enforces cooldown period (5 minutes)
- Prevents concurrent syncs (lock flag)
- Provides convenience wrappers (syncAnime, syncManga, syncActiveStatuses)
- Tracks last sync timestamp

#### `service.ts` - Sync Logic
**Responsibilities**:
- Validates authentication
- Executes fetch operations
- Aggregates results from multiple sources
- Handles partial failures gracefully

#### `fetchers.ts` - Data Retrieval
```typescript
// Status-based sync (optimized)
syncAnimeList(plugin, ["watching", "plan_to_watch"]) {
  const promises = statuses.map(status => 
    fetchMALAnimeByStatus(plugin, status)
  );
  
  // Throttle to avoid rate limits
  const results = await throttlePromises(promises, 2, 300);
  return results.flat();
}
```

#### `auto/manager.ts` - Background Sync
**Features**:
- **Sync on Load**: Delayed sync after Obsidian startup (2 minutes)
- **Scheduled Sync**: Recurring interval-based sync (minimum 60 minutes)
- **Smart Cooldown**: Prevents API spam during rapid restarts

---

### 📁 `src/storage/` - File System Layer

**Purpose**: Persist MediaItems as Markdown notes

**Architecture**:
```mermaid
graph TB
    A[saveMediaItems] --> B[prepareBatchItems<br/>Analysis Phase]
    B --> C{Build JIT Index}
    C --> D[Check Timestamps]
    D --> E{Should Skip?}
    
    E -->|Yes| F[Create Skip Result<br/>Fast Path]
    E -->|No| G[Execution Phase]
    
    G --> H{Lookup Result}
    H -->|Exact Match| I[handleExactMatch<br/>Update Frontmatter]
    H -->|Duplicates| J[handleDuplicates<br/>Select Best File]
    H -->|None| K[createNewFile<br/>Generate Content]
    
    I --> L[Return Results]
    J --> L
    K --> L
    F --> L
```

#### **Two-Phase Processing Strategy**

**Phase 1: Analysis (Synchronous)**
```typescript
prepareBatchItems(plugin, items, config, folderPath, index) {
  const batchItems = [];
  
  for (const item of items) {
    const id = generateMyAnimeNotesSync(item);
    const lookup = lookupExistingFiles(index, id);
    
    // Get cached timestamp (no disk I/O!)
    const cache = metadataCache.getFileCache(lookup.files[0]);
    const cachedTimestamp = cache?.frontmatter?.synced;
    
    // Decide: skip or update?
    const shouldSkip = shouldSkipByTimestamp(
      cachedTimestamp, 
      item.updatedAt, 
      forceFullSync
    );
    
    batchItems.push({ item, id, lookup, shouldSkip });
  }
  
  return batchItems;
}
```

**Phase 2: Execution (Asynchronous)**
```typescript
// Fast-path optimization: Record skips immediately
const skipResults = createSkipResults(itemsToSkip);

// Process updates with UI yielding
for (let i = 0; i < itemsToProcess.length; i++) {
  const result = await executeOperation(batch);
  results.push(result);
  
  // Yield to UI every 10 items
  if (i % 10 === 0) await yieldToUI();
}
```

**Benefits**:
- Skipped items return instantly (no I/O)
- UI remains responsive during large syncs
- Efficient timestamp comparisons using cache

#### `builders/` - Content Generation

| File | Purpose |
|------|---------|
| `frontmatter.ts` | Builds properties object from template |
| `content.ts` | Generates complete file content (YAML + body) |
| `updater.ts` | Updates existing file frontmatter safely |
| `file.ts` | File utilities (folder creation, unique naming) |

**Key Flow**:
```typescript
// Generate frontmatter
const props = buildFrontmatterFromTemplate(item, template, id);

// Generate body content
const content = generateInitialFileContent(props, template.noteContent, item);

// Create file
await vault.create(filePath, content);
```

---

### 📁 `src/settings/` - Settings UI

**Purpose**: Configuration interface for users

#### `tab.ts` - Settings Tab
**Sections**:
1. **Authentication** - MAL login/logout
2. **Templates** - Anime/Manga note configuration
3. **Sync Options** - Intervals, auto-sync, force full sync
4. **Debug** - Logging and notifications

#### `template/` - Template System

```mermaid
graph LR
    A[User Defines Template] --> B[Property Items<br/>order, name, template, type]
    B --> C[Resolve Variables<br/>parser.ts]
    C --> D[Apply Filters<br/>filters/]
    D --> E[Format by Type<br/>properties.ts]
    E --> F[Generate Frontmatter]
```

**Template Variable Resolution**:
```typescript
// Input: "{{numEpisodes}} episodes watched: {{numEpisodesWatched}}"
// Item: { numEpisodes: 24, numEpisodesWatched: 12 }

resolveTemplate(template, item) {
  // Extract variables
  const vars = extractVariables(template); // ["numEpisodes", "numEpisodesWatched"]
  
  // Replace each variable
  let result = template;
  for (const { varName, filters } of vars) {
    let value = item[varName]; // 24, 12
    
    if (filters) {
      value = applyFilters(value, filters, item);
    }
    
    result = result.replace(`{{${varName}}}`, value);
  }
  
  return result; // "24 episodes watched: 12"
}
```

**Available Filters**:
- `wikilink` - Wraps in `[[...]]`
- `join` - Combines arrays with separator
- `date` - Formats dates (YYYY-MM-DD)
- `default` - Provides fallback for empty values
- `upper` / `lower` - Case transformation
- `split` - Splits strings into arrays

**Property Types**:
- `text` - Plain string
- `number` - Numeric value
- `date` - Date only (YYYY-MM-DD)
- `datetime` - Full ISO timestamp
- `checkbox` - Boolean
- `multitext` - Array of strings (list)

**UI Components**:
- Drag-and-drop reordering
- Variable autocomplete
- Type selector modal
- Folder suggestions

---

### 📁 `src/utils/` - Utilities

#### `logger.ts` - Logging System
```typescript
const log = new logger("SyncManager");

log.debug("Syncing items...");  // Only shows if debug mode enabled
log.error("Auth failed", error);  // Always visible
```

**Features**:
- Timestamped logs: `[12:34:56] [MyAnimeNotes] [Context] Message`
- Global debug toggle (syncs with settings)
- Context-based filtering

#### `notice.ts` - User Notifications
```typescript
showNotice("Sync completed", "success", 3000);
showNotice("Error occurred", "warning", 5000);
```

**Features**:
- Type-based styling (`mod-success`, `mod-warning`)
- Global enable/disable toggle
- Flexible argument overloading

---

## Data Flow Examples

### Complete Sync Flow

```mermaid
sequenceDiagram
    participant U as User
    participant SM as SyncManager
    participant SS as SyncService
    participant API as MAL API
    participant M as Models
    participant ST as Storage
    participant V as Vault
    
    U->>SM: Click "Sync All"
    SM->>SM: Check cooldown & lock
    SM->>SS: syncMAL(options)
    
    SS->>API: fetchCompleteMALAnimeList()
    API-->>SS: Raw MALItem[]
    SS->>M: parseAnimeList(items)
    M-->>SS: MediaItem[]
    
    SS->>API: fetchCompleteMALMangaList()
    API-->>SS: Raw MALItem[]
    SS->>M: parseMangaList(items)
    M-->>SS: MediaItem[]
    
    SS->>ST: saveMediaItemsByCategory(items)
    ST->>ST: buildMyAnimeNotesIndex()
    ST->>ST: prepareBatchItems()<br/>(Analysis Phase)
    
    loop For each item to process
        ST->>V: Create or Update File
        V-->>ST: Success
        ST->>U: Update Progress (every 10 items)
    end
    
    ST-->>SS: Results
    SS-->>SM: {items, result}
    SM->>SM: Update lastSyncTime
    SM->>U: Show "Sync completed"
```

### Duplicate Resolution Flow

```mermaid
graph TD
    A[Lookup Files by ID] --> B{How many files?}
    B -->|0| C[Create New File]
    B -->|1| D[Update Exact Match]
    B -->|2+| E[Duplicates Detected]
    
    E --> F[Select Deterministic File<br/>Most Recent mtime]
    F --> G[Update Selected File]
    G --> H[Log Duplicate Paths]
    H --> I[Return 'duplicates-detected' Result]
    
    style E fill:#ffcccc
    style I fill:#ffcccc
```

---
