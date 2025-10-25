/**
 * Cassette Index Cache
 * 
 * Maintains an in-memory index of cassette -> file mappings
 * to avoid expensive vault-wide searches on every sync operation.
 * 
 * Performance: O(1) lookup instead of O(n) vault scan
 */

import { TFile, MetadataCache, Vault } from 'obsidian';
import type CassettePlugin from '../../main';
import { createDebugLogger } from '../../utils';

interface CassetteIndexEntry {
  file: TFile;
  cassette: string;
  mtime: number; // Track modification time for staleness detection
}

/**
 * Cassette Index Manager
 * Provides fast O(1) lookups for cassette identifiers
 */
export class CassetteIndex {
  private plugin: CassettePlugin;
  private debug: ReturnType<typeof createDebugLogger>;
  
  // Primary index: cassette -> files
  private cassetteToFiles: Map<string, Set<TFile>> = new Map();
  
  // Secondary index: file path -> cassette (for reverse lookup)
  private fileToCassette: Map<string, string> = new Map();
  
  // Track last rebuild time
  private lastRebuildTime: number = 0;
  private isRebuilding: boolean = false;
  
  // Configuration
  private readonly REBUILD_COOLDOWN_MS = 5000; // Minimum 5s between rebuilds
  
  constructor(plugin: CassettePlugin) {
    this.plugin = plugin;
    this.debug = createDebugLogger(plugin, 'CassetteIndex');
  }
  
  /**
   * Initializes the index by scanning the vault
   * Should be called once on plugin load
   */
  async initialize(): Promise<void> {
    this.debug.log('[Index] Initializing cassette index...');
    await this.rebuildIndex();
    
    // Register metadata cache listeners for automatic updates
    this.registerMetadataListeners();
    
    this.debug.log('[Index] Index initialized successfully');
  }
  
  /**
   * Rebuilds the entire index by scanning all markdown files
   * Protected by cooldown to prevent excessive rebuilds
   */
  async rebuildIndex(): Promise<void> {
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
        await this.indexFile(file, metadataCache);
        indexedCount++;
      }
      
      const duration = Date.now() - startTime;
      this.debug.log(
        `[Index] Rebuilt index: ${indexedCount} files scanned, ` +
        `${this.cassetteToFiles.size} cassettes indexed in ${duration}ms`
      );
      
    } catch (error) {
      console.error('[Index] Failed to rebuild index:', error);
    } finally {
      this.isRebuilding = false;
    }
  }
  
  /**
   * Indexes a single file
   * Extracts cassette from frontmatter and updates indexes
   */
  private async indexFile(file: TFile, metadataCache: MetadataCache): Promise<void> {
    try {
      const cache = metadataCache.getFileCache(file);
      const cassette = cache?.frontmatter?.cassette;
      
      if (cassette && typeof cassette === 'string') {
        // Add to cassette -> files mapping
        if (!this.cassetteToFiles.has(cassette)) {
          this.cassetteToFiles.set(cassette, new Set());
        }
        this.cassetteToFiles.get(cassette)!.add(file);
        
        // Add to file -> cassette mapping
        this.fileToCassette.set(file.path, cassette);
      }
    } catch (error) {
      // Silently skip files that can't be indexed
      this.debug.log(`[Index] Failed to index file ${file.path}:`, error);
    }
  }
  
  /**
   * Removes a file from the index
   */
  private removeFileFromIndex(file: TFile): void {
    const cassette = this.fileToCassette.get(file.path);
    
    if (cassette) {
      // Remove from cassette -> files mapping
      const files = this.cassetteToFiles.get(cassette);
      if (files) {
        files.delete(file);
        
        // Clean up empty sets
        if (files.size === 0) {
          this.cassetteToFiles.delete(cassette);
        }
      }
      
      // Remove from file -> cassette mapping
      this.fileToCassette.delete(file.path);
    }
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
    };
  }
  
  /**
   * Registers metadata cache listeners for automatic index updates
   */
  private registerMetadataListeners(): void {
    const { metadataCache, vault } = this.plugin.app;
    
    // Update index when file metadata changes
    this.plugin.registerEvent(
      metadataCache.on('changed', async (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          // Remove old entry
          this.removeFileFromIndex(file);
          
          // Re-index file
          await this.indexFile(file, metadataCache);
        }
      })
    );
    
    // Handle file deletion
    this.plugin.registerEvent(
      vault.on('delete', (file) => {
        if (file instanceof TFile) {
          this.removeFileFromIndex(file);
        }
      })
    );
    
    // Handle file rename
    this.plugin.registerEvent(
      vault.on('rename', (file, oldPath) => {
        if (file instanceof TFile && file.extension === 'md') {
          // Update file path in indexes
          const cassette = this.fileToCassette.get(oldPath);
          if (cassette) {
            this.fileToCassette.delete(oldPath);
            this.fileToCassette.set(file.path, cassette);
            
            // File reference in Set is already correct (same TFile object)
          }
        }
      })
    );
    
    // Handle file creation
    this.plugin.registerEvent(
      vault.on('create', async (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          // Wait a bit for metadata to be available
          setTimeout(async () => {
            await this.indexFile(file, metadataCache);
          }, 100);
        }
      })
    );
    
    this.debug.log('[Index] Registered metadata cache listeners');
  }
  
  /**
   * Clears the entire index
   */
  clear(): void {
    this.cassetteToFiles.clear();
    this.fileToCassette.clear();
    this.debug.log('[Index] Index cleared');
  }
}

/**
 * Creates and initializes a cassette index
 */
export async function createCassetteIndex(plugin: CassettePlugin): Promise<CassetteIndex> {
  const index = new CassetteIndex(plugin);
  await index.initialize();
  return index;
}