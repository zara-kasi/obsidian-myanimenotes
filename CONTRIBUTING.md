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
