/**
 * MyAnimeNotes Index Cache
 *
 * Maintains an in-memory index of myanimenotes -> file mappings
 * to avoid expensive vault-wide searches on every sync operation.
 *
 * Performance: O(1) lookup instead of O(n) vault scan
 *
 * UPDATED: Lazy initialization - index is built on first sync, not on plugin load
 * FIXED: Replaced setTimeout with proper metadata listener for file creation
 */

import { TFile, MetadataCache, EventRef } from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import { createDebugLogger } from "../../utils";

/**
 * MyAnimeNotes Index Manager
 * Provides fast O(1) lookups for myanimenotes identifiers
 */
export class MyAnimeNotesIndex {
    private plugin: MyAnimeNotesPlugin;
    private debug: ReturnType<typeof createDebugLogger>;

    // Primary index: myanimenotes -> files
    private myanimenotesToFiles: Map<string, Set<TFile>> = new Map();

    // Secondary index: file path -> myanimenotes (for reverse lookup)
    private fileToMyAnimeNotes: Map<string, string> = new Map();

    // Track initialization state
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    // Track last rebuild time
    private lastRebuildTime = 0;
    private isRebuilding = false;

    // Configuration
    private readonly REBUILD_COOLDOWN_MS = 5000; // Minimum 5s between rebuilds
    private readonly METADATA_TIMEOUT_MS = 5000; // 5s timeout for metadata availability

    constructor(plugin: MyAnimeNotesPlugin) {
        this.plugin = plugin;
        this.debug = createDebugLogger(plugin, "MyAnimeNotesIndex");
    }

    /**
     * Initializes the index by registering metadata listeners
     * Does NOT build the index - that happens lazily on first sync
     */
    initialize(): void {
        this.debug.log(
            "[Index] Registering metadata listeners (index will build on first sync)"
        );

        // Register metadata cache listeners for automatic updates
        this.registerMetadataListeners();

        this.debug.log("[Index] Metadata listeners registered");
    }

    /**
     * Ensures the index is initialized before use
     * Builds the index on first call, then returns immediately on subsequent calls
     * Thread-safe: multiple concurrent calls will wait for the same initialization
     */
    async ensureInitialized(): Promise<void> {
        // Already initialized - return immediately
        if (this.isInitialized) {
            return;
        }

        // Currently initializing - wait for existing promise
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Start initialization
        this.debug.log("[Index] First sync detected - building index...");

        this.initializationPromise = this.rebuildIndex().then(() => {
            this.isInitialized = true;
            this.initializationPromise = null;
            this.debug.log("[Index] Index built and ready");
        });

        return this.initializationPromise;
    }

    /**
     * Rebuilds the entire index by scanning all markdown files
     * Protected by cooldown to prevent excessive rebuilds
     */
    async rebuildIndex(): Promise<void> {
        // Cooldown protection
        const now = Date.now();
        if (
            this.isRebuilding ||
            now - this.lastRebuildTime < this.REBUILD_COOLDOWN_MS
        ) {
            this.debug.log("[Index] Rebuild skipped - cooldown active");
            return;
        }

        this.isRebuilding = true;
        this.lastRebuildTime = now;

        try {
            const startTime = Date.now();

            // Clear existing indexes
            this.myanimenotesToFiles.clear();
            this.fileToMyAnimeNotes.clear();

            const { vault, metadataCache } = this.plugin.app;
            const allFiles = vault.getMarkdownFiles();

            let indexedCount = 0;

            // Build index from all files
            for (const file of allFiles) {
                this.indexFile(file, metadataCache);
                indexedCount++;
            }

            const duration = Date.now() - startTime;
            this.debug.log(
                `[Index] Built index: ${indexedCount} files scanned, ` +
                    `${this.myanimenotesToFiles.size} myanimenotes indexed in ${duration}ms`
            );
        } catch (error) {
            console.error("[Index] Failed to rebuild index:", error);
        } finally {
            this.isRebuilding = false;
        }
    }

    /**
     * Indexes a single file
     * Extracts myanimenotes from frontmatter and updates indexes
     */
    private indexFile(file: TFile, metadataCache: MetadataCache): void {
        try {
            const cache = metadataCache.getFileCache(file);
            const myanimenotes = cache?.frontmatter?.myanimenotes;

            if (myanimenotes && typeof myanimenotes === "string") {
                // Add to myanimenotes -> files mapping
                if (!this.myanimenotesToFiles.has(myanimenotes)) {
                    this.myanimenotesToFiles.set(myanimenotes, new Set());
                }
                const filesSet = this.myanimenotesToFiles.get(myanimenotes);
                if (filesSet) {
                    filesSet.add(file);
                }

                // Add to file -> myanimenotes mapping
                this.fileToMyAnimeNotes.set(file.path, myanimenotes);
            }
        } catch (error) {
            // Silently skip files that can't be indexed
            this.debug.log(`[Index] Failed to index file ${file.path}:`, error);
        }
    }

    /**
     * Waits for a file's metadata to become available
     * Uses proper metadata cache listener instead of unreliable setTimeout
     * 
     * @param file The file to wait for
     * @param metadataCache The metadata cache to listen to
     * @returns Promise that resolves when metadata is available or times out
     */
    private async waitForMetadata(
        file: TFile,
        metadataCache: MetadataCache
    ): Promise<void> {
        // Check if metadata is already available
        const cache = metadataCache.getFileCache(file);
        if (cache) {
            return Promise.resolve();
        }

        // Wait for metadata to become available
        return new Promise<void>((resolve) => {
            let listener: EventRef | null = null;
            let timeoutId: number | null = null;

            const cleanup = () => {
                if (listener) {
                    metadataCache.offref(listener);
                    listener = null;
                }
                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                    timeoutId = null;
                }
            };

            // Set up timeout
            timeoutId = window.setTimeout(() => {
                cleanup();
                this.debug.log(
                    `[Index] Metadata timeout for ${file.path} after ${this.METADATA_TIMEOUT_MS}ms`
                );
                resolve(); // Resolve anyway to prevent hanging
            }, this.METADATA_TIMEOUT_MS);

            // Set up metadata listener
            listener = metadataCache.on("changed", (changedFile) => {
                if (changedFile.path === file.path) {
                    cleanup();
                    this.debug.log(
                        `[Index] Metadata available for ${file.path}`
                    );
                    resolve();
                }
            });
        });
    }

    /**
     * Removes a file from the index
     */
    private removeFileFromIndex(file: TFile): void {
        const myanimenotes = this.fileToMyAnimeNotes.get(file.path);

        if (myanimenotes) {
            // Remove from myanimenotes -> files mapping
            const files = this.myanimenotesToFiles.get(myanimenotes);
            if (files) {
                files.delete(file);

                // Clean up empty sets
                if (files.size === 0) {
                    this.myanimenotesToFiles.delete(myanimenotes);
                }
            }

            // Remove from file -> myanimenotes mapping
            this.fileToMyAnimeNotes.delete(file.path);
        }
    }

    /**
     * Fast O(1) lookup for files by myanimenotes identifier
     * @param myanimenotes The myanimenotes identifier (format: provider:category:id)
     * @returns Array of files with matching myanimenotes (empty if none found)
     */
    findFilesByMyAnimeNotes(myanimenotes: string): TFile[] {
        const files = this.myanimenotesToFiles.get(myanimenotes);
        return files ? Array.from(files) : [];
    }

    /**
     * Checks if a myanimenotes exists in the index
     */
    hasMyAnimeNotes(myanimenotes: string): boolean {
        return this.myanimenotesToFiles.has(myanimenotes);
    }

    /**
     * Gets the myanimenotes identifier for a specific file
     */
    getMyAnimeNotesForFile(filePath: string): string | undefined {
        return this.fileToMyAnimeNotes.get(filePath);
    }

    /**
     * Gets index statistics
     */
    getStats(): {
        totalMyAnimeNotes: number;
        totalFiles: number;
        duplicates: number;
        isInitialized: boolean;
    } {
        let totalFiles = 0;
        let duplicates = 0;

        for (const files of this.myanimenotesToFiles.values()) {
            totalFiles += files.size;
            if (files.size > 1) {
                duplicates += files.size - 1;
            }
        }

        return {
            totalMyAnimeNotes: this.myanimenotesToFiles.size,
            totalFiles,
            duplicates,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Registers metadata cache listeners for automatic index updates
     * FIXED: File creation now uses proper metadata waiting instead of setTimeout
     */
    private registerMetadataListeners(): void {
        const { metadataCache, vault } = this.plugin.app;

        // Update index when file metadata changes
        this.plugin.registerEvent(
            metadataCache.on("changed", (file) => {
                if (file instanceof TFile && file.extension === "md") {
                    // Remove old entry
                    this.removeFileFromIndex(file);

                    // Re-index file
                    this.indexFile(file, metadataCache);
                }
            })
        );

        // Handle file deletion
        this.plugin.registerEvent(
            vault.on("delete", (file) => {
                if (file instanceof TFile) {
                    this.removeFileFromIndex(file);
                }
            })
        );

        // Handle file rename
        this.plugin.registerEvent(
            vault.on("rename", (file, oldPath) => {
                if (file instanceof TFile && file.extension === "md") {
                    // Update file path in indexes
                    const myanimenotes = this.fileToMyAnimeNotes.get(oldPath);
                    if (myanimenotes) {
                        this.fileToMyAnimeNotes.delete(oldPath);
                        this.fileToMyAnimeNotes.set(file.path, myanimenotes);

                        // File reference in Set is already correct (same TFile object)
                    }
                }
            })
        );

        // Handle file creation - FIXED: Use proper metadata waiting
        this.plugin.registerEvent(
            vault.on("create", (file) => {
                if (file instanceof TFile && file.extension === "md") {
                    // Wait for metadata to become available, then index
                    void this.waitForMetadata(file, metadataCache).then(() => {
                        this.indexFile(file, metadataCache);
                    });
                }
            })
        );

        this.debug.log("[Index] Registered metadata cache listeners");
    }

    /**
     * Clears the entire index
     */
    clear(): void {
        this.myanimenotesToFiles.clear();
        this.fileToMyAnimeNotes.clear();
        this.isInitialized = false;
        this.initializationPromise = null;
        this.debug.log("[Index] Index cleared");
    }
}

/**
 * Creates a myanimenotes index (without initializing the data)
 * Index will be built lazily on first sync operation
 */
export async function createMyAnimeNotesIndex(
    plugin: MyAnimeNotesPlugin
): Promise<MyAnimeNotesIndex> {
    const index = new MyAnimeNotesIndex(plugin);
    index.initialize(); // Just registers listeners, doesn't build index
    return index;
}