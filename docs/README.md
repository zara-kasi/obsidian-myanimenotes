# 🗺️ Code Structure Map

This directory contains an automatically generated visual map of the codebase.

## Files

- **code-map.canvas** - Obsidian Canvas file showing code structure and dependencies

## How to Use

1. **Download** `code-map.canvas` 
2. **Place it** in your Obsidian vault
3. **Open it** with Obsidian's Canvas plugin

You'll see:
- 🚀 **Red node** = Entry point (main.ts)
- 📄 **Blue nodes** = Other TypeScript files
- ➡️ **Arrows** = Import dependencies

## Features

- Shows which files import from which
- Starts from main.ts and follows all imports
- Only includes files actually used in your project
- Color-coded for easy navigation

## Automatic Updates

This map is automatically regenerated:
- ✅ On every push to main branch (when .ts files change)
- ✅ Daily at midnight UTC
- ✅ On pull requests
- ✅ Manually from GitHub Actions tab

---

**Last updated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

**Entry point:** src/main.ts
