# Contributing to MyAnimeNotes

Thank you for your interest in contributing to MyAnimeNotes! This guide will help you understand the plugin architecture and get started with development.

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
## Contributing Guidelines

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/zara-kasi/obsidian-myanimenotes.git
cd obsidian-myanimenotes

# Install dependencies
npm install

# Start development build (watches for changes)
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

### Code Style

- **TypeScript Strict Mode**: All types must be explicit
- **Pure Functions**: Prefer stateless functions where possible
- **Error Handling**: Always wrap API calls in try-catch
- **Logging**: Use `logger` class with appropriate context
- **Comments**: Document complex logic and public APIs

### Adding a New Feature

1. **Identify the Layer**: Determine which module owns the feature
2. **Define Types**: Add interfaces to `types.ts` files
3. **Implement Logic**: Write pure functions first, then integrate
4. **Update UI**: Add settings controls if needed
5. **Test**: Manually test with real MAL data
6. **Document**: Update this guide with new concepts

### Common Tasks

#### Adding a New Template Variable

1. **Update MediaItem** (`src/models/types.ts`):
```typescript
export interface MediaItem {
  // ...existing fields
  newField?: string;  // Add your field
}
```

2. **Update Parser** (`src/models/media.ts` or `mappers.ts`):
```typescript
export function parseAnime(plugin, malItem) {
  return {
    // ...existing mappings
    newField: malItem.node.new_api_field
  };
}
```

3. **Register in Metadata** (`src/settings/template/metadata.ts`):
```typescript
export const ANIME_PROPERTIES: PropertyMetadata[] = [
  // ...existing
  { key: "newField", label: "New Field", defaultName: "new_field" }
];
```

4. **Update Template Resolver** (`src/settings/template/parser.ts`):
```typescript
function resolvePropertyValue(item, variableName) {
  const valueMap = {
    // ...existing
    newField: item.newField
  };
  return valueMap[variableName];
}
```

#### Adding a New Template Filter

1. **Create Filter** (`src/settings/template/filters/myfilter.ts`):
```typescript
export function myFilter(value: unknown, param?: string): unknown {
  // Transform value
  return transformedValue;
}
```

2. **Register Filter** (`src/settings/template/filters/index.ts`):
```typescript
import { myFilter } from './myfilter';

const filterRegistry: Record<string, FilterFunction> = {
  // ...existing
  myFilter,
};
```

3. **Document Usage** (README or docs):
```markdown
## myFilter
Transforms value in [specific way].

**Usage**: `{{variable|myFilter:"param"}}`
```

---

## Performance Considerations

### Optimization Strategies

1. **JIT Indexing**: Build index only when needed, discard after use
2. **MetadataCache**: Leverage Obsidian's cache instead of reading files
3. **Batch Processing**: Process items in batches with UI yielding
4. **Fast-Path Skipping**: Return immediately for unchanged items
5. **Throttled Requests**: Limit API concurrency to avoid rate limits

### Memory Management

- Index is ephemeral (garbage collected after sync)
- Lock manager releases locks on plugin unload
- No persistent state beyond plugin settings

### Bottlenecks to Watch

- **Vault Scanning**: Large vaults (10k+ files) may slow index builds
- **API Pagination**: Complete list fetches can take 10-30 seconds
- **Concurrent Updates**: Too many parallel file writes can freeze UI

---

## Testing Strategies

### Manual Testing Checklist

- [ ] **Authentication**: Login, refresh token, logout
- [ ] **Sync**: Full sync, partial sync, active-only sync
- [ ] **Templates**: Variable resolution, filters, property types
- [ ] **Duplicates**: Create duplicates manually, verify selection logic
- [ ] **Concurrency**: Trigger multiple syncs rapidly
- [ ] **Auto-Sync**: Enable scheduled sync, restart Obsidian
- [ ] **Edge Cases**: Empty lists, network errors, invalid tokens

### Mock Data

Create test files manually:
```yaml
---
myanimenotes: mal:anime:1
synced: "2024-01-01T00:00:00Z"
title: Test Anime
---
```

Trigger syncs and verify behavior with different timestamps.

---

## Debugging Tips

### Enable Debug Mode
Settings → Debug Mode → Toggle ON

Logs will appear in Developer Console (Ctrl+Shift+I / Cmd+Opt+I):
```
[12:34:56] [MyAnimeNotes] [SyncManager] Starting sync...
[12:34:57] [MyAnimeNotes] [StorageService] Batch save: 150 items
[12:34:58] [MyAnimeNotes] [FileIndex] Index built: 150 identifiers (42ms)
```

### Common Issues

**"Not authenticated"**:
- Check `settings.malAuthenticated` and `settings.malAccessToken`
- Verify token expiry hasn't passed
- Re-authenticate via settings

**"Sync already in progress"**:
- Plugin detected overlapping sync
- Wait for current sync to complete or restart Obsidian

**"Duplicates detected"**:
- Multiple files have same `myanimenotes` ID
- Check file frontmatter manually
- Plugin will update the most recently modified file

**"Rate limit exceeded"**:
- Too many API requests in short time
- Plugin automatically retries with backoff
- Enable "Efficient auto-sync" to reduce load

---

## Future Enhancement Ideas

- **Incremental Sync**: Only fetch updated items using `updated_since` parameter
- **Conflict Resolution UI**: Let users choose which duplicate to keep
- **Template Variables**: Support nested objects (e.g., `{{studio.name}}`)
- **Custom Filters**: Allow users to write custom JavaScript filters
- **Sync Profiles**: Save different sync configurations (e.g., "Watching Only", "Completed Only")
- **Progress Modal**: Show live sync progress with item names
- **Webhook Support**: Trigger syncs when MAL list changes

---

## Additional Resources

- [Obsidian Plugin API Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [MyAnimeList API Docs](https://myanimelist.net/apiconfig/references/api/v2)
- [OAuth 2.0 PKCE Spec (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [Plugin Repository](https://github.com/zara-kasi/obsidian-myanimenotes)
- [Issue Tracker](https://github.com/zara-kasi/obsidian-myanimenotes/issues)

---

## Contact & Support

For questions or contributions:
- **GitHub Issues**: Report bugs or request features
- **Pull Requests**: Submit code improvements
- **Discussions**: Ask questions or share ideas

---
