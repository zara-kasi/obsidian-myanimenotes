# Contributing to MyAnimeNotes

Thank you for your interest in contributing to MyAnimeNotes! This guide will help you understand the plugin architecture and get started with development.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Codebase Structure](#codebase-structure)
- [Key Systems](#key-systems)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Code Style & Conventions](#code-style--conventions)
- [Contribution Types](#contribution-types)
- [Pull Request Process](#pull-request-process)
- [Getting Help](#getting-help)

---

## Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Obsidian** (latest version)
- A test vault (don't use your personal vault!)
- Basic understanding of TypeScript and Obsidian plugin development

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/zara-kasi/obsidian-myanimenotes.git
   cd myanimenotes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run build
   ```

4. **Link to your test vault**
   ```bash
   # Create symlink to your test vault's plugins folder
   ln -s $(pwd) /path/to/your/test-vault/.obsidian/plugins/myanimenotes
   ```

5. **Enable the plugin in Obsidian**
   - Open your test vault
   - Go to Settings → Community Plugins
   - Enable "MyAnimeNotes"

6. **Set up MAL credentials**
   - Follow the [MAL Authentication Guide](./docs/mal-authentication-guide.md)
   - Get your Client ID and Secret
   - Authenticate in plugin settings

### Development Mode

```bash
# Watch mode for live reloading
npm run dev
```

After code changes, reload Obsidian (`Ctrl+R` or `Cmd+R`) to see updates.

---

## Architecture Overview

MyAnimeNotes is built on a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│                  (Settings, Commands)                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Sync Manager Layer                       │
│           (Orchestrates syncing & saving)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────┬──────────────────────────────────────┐
│   API Layer          │       Storage Layer                  │
│ (MAL authentication  │   (Vault file operations)            │
│  & data fetching)    │                                      │
└──────────────────────┴──────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Transformation Layer                  │
│            (API data → Universal format)                    │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Provider-Agnostic**: Uses `UniversalMediaItem` format to support multiple APIs (MAL, Simkl, etc.)
2. **Performance-First**: O(1) indexed lookups via `MyAnimeNotesIndex` instead of O(n) vault scans
3. **User Content Preservation**: Never destroys user notes or edits
4. **Graceful Degradation**: Falls back to legacy methods if optimizations fail
5. **Type Safety**: Comprehensive TypeScript types throughout

---

## Codebase Structure

```
myanimenotes/
├── src/
│   ├── main.ts                    # Plugin entry point
│   ├── api/                       # External API integrations
│   │   └── mal/
│   │       ├── auth/              # OAuth 2.0 flow
│   │       │   ├── oauth-flow.ts  # Authorization & token exchange
│   │       │   ├── token-manager.ts # Token validation & refresh
│   │       │   ├── pkce.ts        # PKCE security utilities
│   │       │   └── ...
│   │       └── mal-api-service.ts # MAL API requests with retry logic
│   │
│   ├── sync/                      # Sync orchestration
│   │   ├── sync-manager.ts        # High-level sync coordinator
│   │   ├── mal-sync-service.ts    # MAL-specific sync logic
│   │   └── auto-sync.ts           # Background sync timers
│   │
│   ├── storage/                   # Vault file operations
│   │   ├── storage-service.ts     # Main save orchestration
│   │   ├── file-utils.ts          # File operations & sanitization
│   │   ├── myanimenotes/              # MyAnimeNotes system (unique IDs)
│   │   │   ├── myanimenotes-index.ts  # O(1) lookup index
│   │   │   ├── myanimenotes-lock.ts   # Concurrency control
│   │   │   └── myanimenotes-sync-manager.ts # ID generation & lookup
│   │   └── markdown/              # Markdown generation
│   │       ├── frontmatter-builder.ts # YAML frontmatter
│   │       ├── markdown-generator.ts  # Complete file generation
│   │       └── property-mapping.ts    # Custom field names
│   │
│   ├── transformers/              # Data transformation
│   │   └── mal-transformer.ts     # MAL → UniversalMediaItem
│   │
│   ├── models/                    # Type definitions
│   │   ├── media.types.ts         # Universal data models
│   │   └── sync.types.ts          # Sync result types
│   │
│   ├── settings/                  # Plugin settings
│   │   ├── settings-tab.ts        # Settings UI
│   │   ├── settings-interface.ts  # Settings types
│   │   └── property-settings.ts   # Property customization UI
│   │
│   └── utils/                     # Utilities
│       └── debug.ts               # Debug logging
│
├── docs/                          # Documentation
│   ├── oauth-2.0-authentication-flow-for-mal.md
│   ├── storage-system.md
│   ├── sync-mechanism.md
│   ├── myanimenotes-index.md
│   └── ...
│
└── tests/                         # Tests (future)
```

---

## Key Systems

### 1. Authentication System (`src/api/mal/auth/`)

Implements **OAuth 2.0 with PKCE** for secure MAL authentication.

**Key Files:**
- `oauth-flow.ts` - Authorization flow & callback handling
- `token-manager.ts` - Token validation & automatic refresh
- `pkce.ts` - PKCE security (code verifier/challenge)

**Read More:** [OAuth 2.0 Authentication Flow](./docs/oauth-2.0-authentication-flow-for-mal.md)

### 2. MyAnimeNotes System (`src/storage/myanimenotes/`)

The **unique identifier system** that enables O(1) file lookups.

**What is a MyAnimeNotes?**
```
Format: provider:category:id
Example: mal:anime:1245
```

**Key Components:**
- `myanimenotes-index.ts` - In-memory index (O(1) lookups)
- `myanimenotes-sync-manager.ts` - ID generation & file lookup
- `myanimenotes-lock.ts` - Concurrency control (prevents race conditions)

**Read More:** [MyAnimeNotes Index System](./docs/myanimenotes-index.md)

### 3. Storage System (`src/storage/`)

Handles **saving media items to vault** as markdown files with frontmatter.

**Key Behaviors:**
- Creates new files or updates existing ones
- Preserves user content (notes, body text)
- Merges synced frontmatter with user properties
- Detects and handles duplicates

**Read More:** [Storage System Documentation](./docs/storage-system.md)

### 4. Sync System (`src/sync/`)

Orchestrates **fetching data from MAL** and saving to vault.

**Flow:**
```
User triggers sync
    ↓
Sync Manager
    ↓
MAL Sync Service (fetch & transform)
    ↓
Storage Service (save to vault)
    ↓
Success/Error notices
```

**Read More:** [Sync Mechanism Documentation](./docs/sync-mechanism.md)

### 5. Data Transformation (`src/transformers/`)

Converts **API-specific data to universal format**.

**Why?** Future-proofs the plugin for multiple providers (Simkl, AniList, etc.)

```typescript
MAL API Response → transformMALAnime() → UniversalMediaItem
```

---

## Development Workflow

### Branching Strategy

- `main` - Stable, released code
- `develop` - Active development (default branch)
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/doc-update` - Documentation updates

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the [Code Style](#code-style--conventions)
   - Add comments for complex logic
   - Update docs if needed

3. **Test thoroughly** (see [Testing Guidelines](#testing-guidelines))

4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add support for custom property mapping"
   ```

   **Commit Message Format:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `refactor:` Code refactoring
   - `perf:` Performance improvement
   - `test:` Tests
   - `chore:` Maintenance

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

---

## Testing Guidelines

### Manual Testing Checklist

**Before submitting any PR**, test these scenarios in your test vault:

#### Authentication
- ✅ Fresh authentication (new user)
- ✅ Token expiry and automatic refresh
- ✅ App restart mid-authentication
- ✅ Invalid credentials

#### Sync Operations
- ✅ Full sync (anime + manga)
- ✅ Category-specific sync (anime only, manga only)
- ✅ Status filter sync (e.g., only "watching")
- ✅ Auto-sync on load
- ✅ Scheduled sync
- ✅ Network failure handling

#### Storage Operations
- ✅ New file creation (empty vault)
- ✅ Existing file updates (preserve user content)
- ✅ Duplicate file detection
- ✅ Legacy file migration (files without myanimenotes)
- ✅ Concurrent saves (same item multiple times)
- ✅ Special characters in titles
- ✅ Filename collisions (auto-numbering)

#### Edge Cases
- ✅ Empty MAL list
- ✅ Large batch saves (500+ items)
- ✅ Index rebuild after vault changes
- ✅ Plugin reload mid-operation

### Debug Mode

Enable debug logging in plugin settings:
```typescript
plugin.settings.debugMode = true
```

Check browser console (Ctrl+Shift+I) for detailed logs:
```
[MAL Auth] Received OAuth redirect
[Storage] Processing item with myanimenotes: mal:anime:1245
[MyAnimeNotesIndex] Found 1 file(s) via index
```

### Test Vault Setup

**Never test on your personal vault!**

1. Create a new test vault
2. Install MyAnimeNotes (symlink method)
3. Use a test MAL account with limited data
4. Test with 10-20 items first, then scale up

---

## Code Style & Conventions

### TypeScript

- **Use interfaces over types** for object shapes
- **Explicit return types** on public functions
- **Avoid `any`** - use `unknown` and type guards
- **Prefer const** over let

```typescript
// ✅ Good
export async function saveMediaItem(
  plugin: MyAnimeNotesPlugin,
  item: UniversalMediaItem,
  config: StorageConfig
): Promise<SyncActionResult> {
  // ...
}

// ❌ Bad
export async function saveMediaItem(plugin, item, config) {
  // ...
}
```

### Naming Conventions

- **Functions**: camelCase, descriptive verbs
  - `generateMyAnimeNotesSync()`, `saveMediaItem()`, `fetchUserInfo()`
- **Classes**: PascalCase
  - `MyAnimeNotesIndex`, `SyncManager`, `AutoSyncManager`
- **Interfaces**: PascalCase with descriptive names
  - `UniversalMediaItem`, `StorageConfig`, `SyncActionResult`
- **Constants**: UPPER_SNAKE_CASE
  - `MAL_AUTH_URL`, `REDIRECT_URI`, `TOKEN_EXPIRY_BUFFER`

### File Organization

- **One primary export per file** (main class or function)
- **Barrel exports** in `index.ts` files
- **Group related functionality** in folders

```typescript
// src/storage/myanimenotes/index.ts
export * from './myanimenotes-sync-manager';
export * from './myanimenotes-lock';
export * from './myanimenotes-index';
```

### Comments & Documentation

- **JSDoc comments** for public APIs
- **Inline comments** for complex logic
- **WHY not WHAT** - explain reasoning, not obvious code

```typescript
/**
 * Generates MyAnimeNotes identifier from media item
 * Format: provider:category:id (e.g., mal:anime:1245)
 * 
 * @param item Media item from API
 * @returns MyAnimeNotes identifier
 * @throws {Error} If generated format is invalid
 */
export function generateMyAnimeNotesSync(item: UniversalMediaItem): string {
  // Use lowercase for consistency with vault file paths
  const provider = item.platform.toLowerCase();
  // ...
}
```

### Error Handling

- **Specific error messages** with actionable info
- **Never swallow errors** silently
- **User-facing vs developer errors**

```typescript
// ✅ Good - Specific, actionable
throw new Error(
  'Lock acquisition timeout for mal:anime:1245. ' +
  'Another operation may be stuck. Try again.'
);

// ❌ Bad - Vague, unhelpful
throw new Error('Something went wrong');
```

### Async/Await

- **Always use async/await** over raw promises
- **Handle rejections** with try/catch
- **Don't mix styles** (no `.then()` chains)

```typescript
// ✅ Good
async function syncFromMAL(): Promise<void> {
  try {
    const items = await fetchMALData();
    await saveToVault(items);
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
```

---

## Contribution Types

###  Bug Fixes

1. **Check existing issues** - Is it already reported?
2. **Create an issue first** - Describe the bug & reproduction steps
3. **Write a fix** - Include before/after behavior
4. **Test thoroughly** - Ensure no regressions
5. **Update docs** if behavior changes

**Example PR:** "fix: prevent race condition in concurrent saves"

###  New Features

1. **Discuss first** - Open an issue or discussion
2. **Design considerations**:
   - Does it fit the plugin's scope?
   - Is it provider-agnostic (if applicable)?
   - How does it affect performance?
3. **Implementation**:
   - Follow existing patterns
   - Add comprehensive tests
   - Update documentation
   - Add user-facing settings if needed

**Example PR:** "feat: add support for custom markdown templates"

###  New Provider Support

Want to add Simkl, AniList, or another API?

1. **Read existing implementation**: See `src/api/mal/` for reference
2. **Key requirements**:
   - Authentication flow (OAuth or API key)
   - API client with retry logic
   - Transformer to `UniversalMediaItem`
   - Update sync manager to support new provider
3. **Documentation**:
   - Authentication guide (like [MAL guide](./docs/mal-authentication-guide.md))
   - API specifics and limitations

**Example PR:** "feat: add Simkl provider support"

###  Documentation

Docs are **code too**! Improvements welcome:
- Fix typos or unclear explanations
- Add diagrams or examples
- Expand existing docs
- Translate to other languages (future)

**Example PR:** "docs: add troubleshooting guide for auth errors"

###  UI/UX Improvements

- Settings tab enhancements
- Better error messages
- Progress indicators
- Command palette additions

**Example PR:** "feat: add progress bar for large batch syncs"

---

## Pull Request Process

### Before Submitting

1. ✅ **Code compiles** without errors: `npm run build`
2. ✅ **Manual testing** completed (see checklist)
3. ✅ **Documentation updated** if needed
4. ✅ **Commit messages** follow format
5. ✅ **No debug/console.log** left in code (use `createDebugLogger`)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing Checklist
- [ ] Fresh authentication
- [ ] Full sync (anime + manga)
- [ ] File updates preserve user content
- [ ] [Add specific tests for your changes]

## Screenshots (if applicable)
[Add screenshots of UI changes]

## Related Issues
Closes #[issue number]
```

### Review Process

1. **Automated checks** run (build, lint)
2. **Maintainer review** (1-3 days typically)
3. **Address feedback** if requested
4. **Approval & merge**

### After Merge

- Your changes will be in the next release
- You'll be credited in release notes
- Thank you! 

---

## Getting Help

### Documentation

Start here for deep dives:
- [OAuth 2.0 Authentication Flow](./docs/oauth-2.0-authentication-flow-for-mal.md)
- [Storage System Documentation](./docs/storage-system.md)
- [Sync Mechanism Documentation](./docs/sync-mechanism.md)
- [MyAnimeNotes Index System](./docs/myanimenotes-index.md)
- [Lock Manager](./docs/lock-manager.md)

### Community

- **GitHub Issues** - Bug reports & feature requests
- **Discussions** - Questions & ideas
- **Discord** (if available) - Real-time chat

### Debugging Tips

**"Where do I start?"**
1. Set breakpoints in `src/main.ts` → `onload()`
2. Trace through a sync operation:
   - `sync-manager.ts` → `syncFromMAL()`
   - `mal-sync-service.ts` → `syncMAL()`
   - `storage-service.ts` → `saveMediaItem()`

**"How does X work?"**
- Check the file's header comments
- Look for links to documentation
- Search for usage examples in the codebase

**"Tests are failing"**
- Check console for error messages
- Enable debug mode: `plugin.settings.debugMode = true`
- Verify test vault is clean (no leftover files)

### Code Reading Guide

**If you want to understand...**

**Authentication:**
→ Start: `src/api/mal/auth/oauth-flow.ts`
→ Read: [OAuth 2.0 Authentication Flow](./docs/oauth-2.0-authentication-flow-for-mal.md)

**How items are synced:**
→ Start: `src/sync/sync-manager.ts` → `syncFromMAL()`
→ Read: [Sync Mechanism Documentation](./docs/sync-mechanism.md)

**How files are saved:**
→ Start: `src/storage/storage-service.ts` → `saveMediaItem()`
→ Read: [Storage System Documentation](./docs/storage-system.md)

**How the index works:**
→ Start: `src/storage/myanimenotes/myanimenotes-index.ts`
→ Read: [MyAnimeNotes Index System](./docs/myanimenotes-index.md)

---

## Recognition

All contributors will be:
- ✅ Listed in release notes
- ✅ Added to [Contributors](https://github.com/zara-kasi/obsidian-myanimenotes/graphs/contributors)
- ✅ Credited in the README (for significant contributions)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

## Thank You!

Your contributions make MyAnimeNotes better for everyone.

---