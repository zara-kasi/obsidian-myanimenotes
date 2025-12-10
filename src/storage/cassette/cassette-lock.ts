/**
 * MyAnimeNotes Lock Manager
 * 
 * Provides in-memory concurrency control for myanimenotes operations.
 * Prevents race conditions when multiple operations target the same myanimenotes ID.
 * 
 * REFACTORED: No longer uses module-level global state.
 * Now uses class-based instance to avoid global mutable state issues.
 */

interface LockEntry {
  promise: Promise<void>;
  resolve: () => void;
  acquiredAt: number;
}

const LOCK_TIMEOUT_MS = 30000; // 30 seconds timeout
const LOCK_CHECK_INTERVAL_MS = 100; // Check every 100ms

/**
 * MyAnimeNotes Lock Manager - Instance-based concurrency control
 * 
 * Manages file locks to prevent concurrent modifications to the same myanimenotes.
 * Each instance maintains its own lock state, avoiding global mutable state issues.
 */
export class MyAnimeNotesLockManager {
  // Instance-level state - not global
  private syncLocks: Map<string, LockEntry> = new Map();
  
  /**
   * Acquires an in-memory lock for a myanimenotes ID
   * Prevents concurrent save operations on the same item
   * 
   * @param myanimenotesSync - The myanimenotes identifier (format: provider:category:id)
   * @throws {Error} If lock acquisition times out
   */
  async acquireSyncLock(myanimenotesSync: string): Promise<void> {
    const startTime = Date.now();
    
    // Wait for any existing lock to release with timeout protection
    while (this.syncLocks.has(myanimenotesSync)) {
      // Check for timeout
      if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
        // Force release the stale lock
        const staleLock = this.syncLocks.get(myanimenotesSync);
        if (staleLock) {
          console.warn(
            `[MyAnimeNotesLock] Force-releasing stale lock for ${myanimenotesSync} ` +
            `(held for ${Date.now() - staleLock.acquiredAt}ms)`
          );
          this.releaseSyncLock(myanimenotesSync);
        }
        throw new Error(
          `Lock acquisition timeout for ${myanimenotesSync} after ${LOCK_TIMEOUT_MS}ms`
        );
      }
      
      // Wait for the existing lock's promise to resolve
      const existingLock = this.syncLocks.get(myanimenotesSync);
      if (existingLock) {
        try {
          await Promise.race([
            existingLock.promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Lock wait timeout')), LOCK_CHECK_INTERVAL_MS)
            )
          ]);
        } catch {
          // Timeout on this iteration, will check again in next loop
        }
      }
    }
    
    // Create new lock with properly typed resolver
    let resolveFunction: () => void = () => {};
    
    const lockPromise = new Promise<void>(resolve => {
      resolveFunction = resolve;
    });
    
    const lockEntry: LockEntry = {
      promise: lockPromise,
      resolve: resolveFunction,
      acquiredAt: Date.now()
    };
    
    this.syncLocks.set(myanimenotesSync, lockEntry);
  }

  /**
   * Releases a lock for a myanimenotes ID
   * Safe to call even if no lock exists
   * 
   * @param myanimenotesSync - The myanimenotes identifier to release
   */
  releaseSyncLock(myanimenotesSync: string): void {
    const lockEntry = this.syncLocks.get(myanimenotesSync);
    
    if (lockEntry) {
      // Resolve the promise to release any waiting operations
      lockEntry.resolve();
      
      // Remove the lock entry
      this.syncLocks.delete(myanimenotesSync);
    }
  }

  /**
   * Checks if a lock is currently held for a myanimenotes ID
   * Useful for debugging or status checks
   * 
   * @param myanimenotesSync - The myanimenotes identifier to check
   * @returns true if lock is held, false otherwise
   */
  isLocked(myanimenotesSync: string): boolean {
    return this.syncLocks.has(myanimenotesSync);
  }

  /**
   * Gets information about a currently held lock
   * Useful for debugging lock contention issues
   * 
   * @param myanimenotesSync - The myanimenotes identifier to check
   * @returns Lock info or undefined if not locked
   */
  getLockInfo(myanimenotesSync: string): { 
    heldFor: number;
    myanimenotesSync: string;
  } | undefined {
    const lockEntry = this.syncLocks.get(myanimenotesSync);
    
    if (lockEntry) {
      return {
        myanimenotesSync,
        heldFor: Date.now() - lockEntry.acquiredAt
      };
    }
    
    return undefined;
  }

  /**
   * Releases all locks managed by this instance
   * Should only be used during cleanup or emergency situations
   * 
   * @returns Number of locks that were released
   */
  releaseAllLocks(): number {
    const count = this.syncLocks.size;
    
    this.syncLocks.forEach((lockEntry) => {
      lockEntry.resolve();
    });
    
    this.syncLocks.clear();
    
    if (count > 0) {
      console.warn(`[MyAnimeNotesLock] Force-released ${count} locks`);
    }
    
    return count;
  }

  /**
   * Clears all locks and resets the manager
   * Called during plugin cleanup to prevent memory leaks
   */
  clear(): void {
    this.releaseAllLocks();
    this.syncLocks.clear();
  }

  /**
   * Executes a function while holding a lock
   * Automatically acquires and releases the lock
   * 
   * @param myanimenotesSync - The myanimenotes identifier to lock
   * @param fn - The function to execute while holding the lock
   * @returns The result of the function
   * @throws {Error} If lock acquisition fails or function throws
   */
  async withLock<T>(
    myanimenotesSync: string,
    fn: () => Promise<T>
  ): Promise<T> {
    await this.acquireSyncLock(myanimenotesSync);
    
    try {
      return await fn();
    } finally {
      this.releaseSyncLock(myanimenotesSync);
    }
  }

  /**
   * Gets statistics about current locks
   * Useful for monitoring lock state
   */
  getStats(): {
    activeLocks: number;
    totalLocks: number;
  } {
    return {
      activeLocks: this.syncLocks.size,
      totalLocks: this.syncLocks.size
    };
  }
}

/**
 * Creates a new MyAnimeNotes Lock Manager instance
 * @returns New MyAnimeNotesLockManager instance
 */
export function createMyAnimeNotesLockManager(): MyAnimeNotesLockManager {
  return new MyAnimeNotesLockManager();
}