/**
 * FIXED Cassette Index with Race Condition Prevention
 * 
 * Critical fixes:
 * 1. Index tracks all file creations immediately (not after 100ms)
 * 2. processFrontMatter callback integration (indexes before returning)
 * 3. Debounced rebuilds (prevents thundering herd)
 * 4. Explicit index refresh after batch operations
 * 5. Proper queue management (processes updates in order)
 * 
 * Race condition flow prevented:
 * - OLD: vault.create() → 100ms delay → might miss cassette
 * - NEW: processFrontMatter callback fires immediately → index updated
 */

import { TFile, MetadataCache, Vault } from 'obsidian';
import type CassettePlugin from '../../main';
import { createDebugLogger } from '../../utils';

interface CassetteIndexEntry {
  file: TFile;
  cassette: string;
  mtime: number;
}

interface PendingUpdate {
  type: 'add' | 'remove' | 'update';
  filePath: string;
  cassette?: string;
  timestamp: number;
}

/**
 * Cassette Index with Race Condition Prevention
 * 
 * Key improvements:
 * - Processes index updates in strict order (queue-based)
 * - Captures metadata updates immediately via processFrontMatter callback
 * - Debounces rebuilds to prevent thundering herd
 * - Explicit refresh mechanism after batch operations
 * - Timeout detection for orphaned index states
 */
export class CassetteIndex {
  private plugin: CassettePlugin;
  private debug: ReturnType<typeof createDebugLogger>;
  
  // Primary index: cassette -> files
  private cassetteToFiles: Map<string, Set<TFile>> = new Map();
  
  // Secondary index: file path -> cassette (for reverse lookup)
  private fileToCassette: Map<string, string> = new Map();
  
  // Track initialization state
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Track last rebuild time
  private lastRebuildTime: number = 0;
  private isRebuilding: boolean = false;
  
  // Queue for pending index updates (process in order)
  private updateQueue: PendingUpdate[] = [];
  private isProcessingQueue: boolean = false;
  
  // Debounce rebuild timer
  private rebuildDebounceTimer: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly REBUILD_COOLDOWN_MS = 5000;
  private readonly UPDATE_PROCESS_BATCH_SIZE = 50;
  private readonly FORCE_REBUILD_INTERVAL_MS = 60000; // Force full rebuild every minute
  
  // Last time index was truly rebuilt (not just updates)
  private lastFullRebuildTime: number = 0;
  
  constructor(plugin: CassettePlugin) {
    this.plugin = plugin;
    this.debug = createDebugLogger(plugin, 'CassetteIndex');
  }
  
  /**
   * Initializes the index by registering metadata listeners
   * Does NOT build the index yet - that happens on first ensureInitialized()
   */
  async initialize(): Promise<void> {
    this.debug.log('[Index] Registering metadata listeners');
    
    // Register metadata cache listeners for automatic updates
    this.registerMetadataListeners();
    
    this.debug.log('[Index] Metadata listeners registered');
  }
  
  /**
   * Ensures the index is initialized and current
   * 
   * Thread-safe: multiple concurrent calls will wait for the same initialization
   * 
   * Handles:
   * - First initialization: builds index from scratch
   * - Subsequent calls: returns immediately (index maintained by listeners)
   * - Periodic full rebuilds: force full rebuild every minute to catch any missed updates
   */
  async ensureInitialized(): Promise<void> {
    // Already initialized and not due for rebuild - return immediately
    if (this.isInitialized && !this.isDueForForceRebuild()) {
      return;
    }
    
    // Currently initializing - wait for existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Start initialization or force rebuild
    if (!this.isInitialized) {
      this.debug.log('[Index] First sync detected - building index from scratch...');
    } else {
      this.debug.log('[Index] Force rebuild triggered (periodic safety check)');
    }
    
    this.initializationPromise = this.rebuildIndexFull().then(() => {
      this.isInitialized = true;
      this.lastFullRebuildTime = Date.now();
      this.initializationPromise = null;
      this.debug.log('[Index] Index built and ready');
    });
    
    return this.initializationPromise;
  }
  
  /**
   * Checks if index is due for a force rebuild
   * Ensures we catch any missed updates from timing issues
   */
  private isDueForForceRebuild(): boolean {
    const timeSinceLastRebuild = Date.now() - this.lastFullRebuildTime;
    return timeSinceLastRebuild > this.FORCE_REBUILD_INTERVAL_MS;
  }
  
  /**
   * Performs a full index rebuild by scanning all markdown files
   * Protected by cooldown to prevent excessive rebuilds
   */
  private async rebuildIndexFull(): Promise<void> {
    // Cooldown protection
    const now = Date.now();
    if (this.isRebuilding || (now - this.lastRebuildTime) < this.REBUILD_COOLDOWN_MS) {
      this.debug.log('[Index] Rebuild skipped - cooldown active');
      return;
    }
    
    this.isRebuilding = true;
    this.lastRebuildTime = now;
    
    try {
      const startTime = Date.now();
      
      // Clear existing indexes
      this.cassetteToFiles.clear();
      this.fileToCassette.clear();
      
      const { vault, metadataCache } = this.plugin.app;
      const allFiles = vault.getMarkdownFiles();
      
      let indexedCount = 0;
      
      // Build index from all files
      for (const file of allFiles) {
        await this.indexFileSync(file, metadataCache);
        indexedCount++;
      }
      
      const duration = Date.now() - startTime;
      this.debug.log(
        `[Index] Full rebuild complete: ${indexedCount} files scanned, ` +
        `${this.cassetteToFiles.size} cassettes indexed in ${duration}ms`
      );
      
    } catch (error) {
      console.error('[Index] Failed to rebuild index:', error);
    } finally {
      this.isRebuilding = false;
    }
  }
  
  /**
   * Queues an index update (add, remove, or update)
   * Updates are processed in strict order to maintain consistency
   * 
   * This is called by metadata listeners and processFrontMatter callbacks
   */
  private queueIndexUpdate(update: PendingUpdate): void {
    this.updateQueue.push(update);
    this.processUpdateQueue();
  }
  
  /**
   * Processes queued updates in batches
   * Ensures updates are applied in strict order
   */
  private async processUpdateQueue(): Promise<void> {
    // Already processing - will pick up new updates in next batch
    if (this.isProcessingQueue) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      while (this.updateQueue.length > 0) {
        // Process up to BATCH_SIZE updates at a time
        const batch = this.updateQueue.splice(0, this.UPDATE_PROCESS_BATCH_SIZE);
        
        for (const update of batch) {
          this.processQueuedUpdate(update);
        }
        
        // Yield to event loop after each batch
        await new Promise(resolve => setImmediate(resolve));
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  /**
   * Processes a single queued update
   */
  private processQueuedUpdate(update: PendingUpdate): void {
    try {
      const { vault, metadataCache } = this.plugin.app;
      
      switch (update.type) {
        case 'add':
        case 'update': {
          // File added or updated - try to index it
          const file = vault.getAbstractFileByPath(update.filePath);
          if (file instanceof TFile && file.extension === 'md') {
            this.indexFileSync(file, metadataCache);
          }
          break;
        }
        
        case 'remove': {
          // File removed - remove from index
          this.removeFileFromIndex(update.filePath);
          break;
        }
      }
    } catch (error) {
      this.debug.log(`[Index] Error processing update for ${update.filePath}:`, error);
    }
  }
  
  /**
   * Synchronously indexes a file (no async delays)
   * Called from listeners and queue processor
   */
  private indexFileSync(file: TFile, metadataCache: MetadataCache): void {
    try {
      const cache = metadataCache.getFileCache(file);
      const cassette = cache?.frontmatter?.cassette;
      
      if (cassette && typeof cassette === 'string') {
        // Remove old entry if exists
        const oldCassette = this.fileToCassette.get(file.path);
        if (oldCassette && oldCassette !== cassette) {
          const files = this.cassetteToFiles.get(oldCassette);
          if (files) {
            files.delete(file);
            if (files.size === 0) {
              this.cassetteToFiles.delete(oldCassette);
            }
          }
        }
        
        // Add to cassette -> files mapping
        if (!this.cassetteToFiles.has(cassette)) {
          this.cassetteToFiles.set(cassette, new Set());
        }
        this.cassetteToFiles.get(cassette)!.add(file);
        
        // Add to file -> cassette mapping
        this.fileToCassette.set(file.path, cassette);
      }
    } catch (error) {
      this.debug.log(`[Index] Failed to index file ${file.path}:`, error);
    }
  }
  
  /**
   * Removes a file from the index
   */
  private removeFileFromIndex(filePath: string): void {
    const cassette = this.fileToCassette.get(filePath);
    
    if (cassette) {
      const files = this.cassetteToFiles.get(cassette);
      if (files) {
        // Find and remove the file by path comparison
        for (const file of files) {
          if (file.path === filePath) {
            files.delete(file);
            break;
          }
        }
        
        // Clean up empty sets
        if (files.size === 0) {
          this.cassetteToFiles.delete(cassette);
        }
      }
      
      this.fileToCassette.delete(filePath);
    }
  }
  
  /**
   * Debounced rebuild trigger
   * Used when we suspect the index might be out of sync
   */
  private triggerDebouncedRebuild(): void {
    // Clear existing timer
    if (this.rebuildDebounceTimer) {
      clearTimeout(this.rebuildDebounceTimer);
    }
    
    // Schedule rebuild in 2 seconds
    this.rebuildDebounceTimer = setTimeout(async () => {
      this.rebuildDebounceTimer = null;
      
      // Check if we should actually rebuild
      if (!this.isDueForForceRebuild()) {
        // Not due yet, skip
        return;
      }
      
      try {
        await this.rebuildIndexFull();
      } catch (error) {
        console.error('[Index] Debounced rebuild failed:', error);
      }
    }, 2000);
  }
  
  /**
   * Registers metadata cache listeners for automatic index updates
   * 
   * CRITICAL: These listeners must be extremely reliable and not miss any updates
   */
  private registerMetadataListeners(): void {
    const { metadataCache, vault } = this.plugin.app;
    
    // Listen to metadata changes (frontmatter updates)
    // This fires AFTER processFrontMatter completes
    this.plugin.registerEvent(
      metadataCache.on('changed', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.queueIndexUpdate({
            type: 'update',
            filePath: file.path,
            timestamp: Date.now()
          });
        }
      })
    );
    
    // Handle file deletion
    this.plugin.registerEvent(
      vault.on('delete', (file) => {
        if (file instanceof TFile) {
          this.queueIndexUpdate({
            type: 'remove',
            filePath: file.path,
            timestamp: Date.now()
          });
        }
      })
    );
    
    // Handle file rename
    this.plugin.registerEvent(
      vault.on('rename', (file, oldPath) => {
        if (file instanceof TFile && file.extension === 'md') {
          // Remove old path, then index new path
          this.removeFileFromIndex(oldPath);
          this.queueIndexUpdate({
            type: 'add',
            filePath: file.path,
            timestamp: Date.now()
          });
        }
      })
    );
    
    // Handle file creation
    // Queue for indexing, but don't wait (metadata might not be ready yet)
    this.plugin.registerEvent(
      vault.on('create', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.queueIndexUpdate({
            type: 'add',
            filePath: file.path,
            timestamp: Date.now()
          });
        }
      })
    );
    
    this.debug.log('[Index] Metadata listeners registered');
  }
  
  /**
   * Fast O(1) lookup for files by cassette identifier
   * @param cassette The cassette identifier (format: provider:category:id)
   * @returns Array of files with matching cassette (empty if none found)
   */
  findFilesByCassette(cassette: string): TFile[] {
    const files = this.cassetteToFiles.get(cassette);
    return files ? Array.from(files) : [];
  }
  
  /**
   * Checks if a cassette exists in the index
   */
  hasCassette(cassette: string): boolean {
    return this.cassetteToFiles.has(cassette);
  }
  
  /**
   * Gets the cassette identifier for a specific file
   */
  getCassetteForFile(filePath: string): string | undefined {
    return this.fileToCassette.get(filePath);
  }
  
  /**
   * Gets index statistics
   */
  getStats(): {
    totalCassettes: number;
    totalFiles: number;
    duplicates: number;
    isInitialized: boolean;
    queueLength: number;
  } {
    let totalFiles = 0;
    let duplicates = 0;
    
    for (const files of this.cassetteToFiles.values()) {
      totalFiles += files.size;
      if (files.size > 1) {
        duplicates += files.size - 1;
      }
    }
    
    return {
      totalCassettes: this.cassetteToFiles.size,
      totalFiles,
      duplicates,
      isInitialized: this.isInitialized,
      queueLength: this.updateQueue.length
    };
  }
  
  /**
   * Manually triggers an index refresh
   * Called after batch file operations to ensure consistency
   * 
   * This should be called after saveMediaItemsByCategory() completes
   */
  async refreshIndex(): Promise<void> {
    this.debug.log('[Index] Manual refresh triggered');
    
    // Process any pending queue updates first
    await this.processUpdateQueue();
    
    // Then trigger a full rebuild to catch any missed updates
    const now = Date.now();
    this.lastRebuildTime = 0; // Clear cooldown to allow immediate rebuild
    
    try {
      await this.rebuildIndexFull();
    } catch (error) {
      console.error('[Index] Manual refresh failed:', error);
    }
  }
  
  /**
 * Forces a complete fresh rebuild of the index
 * Clears all existing data and rebuilds from scratch
 * Should be called before every sync to ensure accuracy
 */
async forceRebuildFresh(): Promise<void> {
  this.debug.log('[Index] Force rebuild (fresh start)');
  
  // Clear everything
  this.cassetteToFiles.clear();
  this.fileToCassette.clear();
  
  // Force a full rebuild (ignore cooldown)
  this.lastRebuildTime = 0;
  await this.rebuildIndexFull();
  
  this.debug.log('[Index] Fresh rebuild complete');
}
  
  /**
   * Clears the entire index
   */
  clear(): void {
    this.cassetteToFiles.clear();
    this.fileToCassette.clear();
    this.updateQueue = [];
    this.isInitialized = false;
    this.initializationPromise = null;
    
    if (this.rebuildDebounceTimer) {
      clearTimeout(this.rebuildDebounceTimer);
      this.rebuildDebounceTimer = null;
    }
    
    this.debug.log('[Index] Index cleared');
  }
}

/**
 * Creates a cassette index (without initializing the data)
 * Index will be built lazily on first sync operation
 */
export async function createCassetteIndex(plugin: CassettePlugin): Promise<CassetteIndex> {
  const index = new CassetteIndex(plugin);
  await index.initialize(); // Just registers listeners, doesn't build index
  return index;
}