/**
 * Cassette Lock Manager
 * 
 * Provides in-memory concurrency control for cassette operations.
 * Prevents race conditions when multiple operations target the same cassette ID.
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
 * Cassette Lock Manager - Instance-based concurrency control
 * 
 * Manages file locks to prevent concurrent modifications to the same cassette.
 * Each instance maintains its own lock state, avoiding global mutable state issues.
 */
export class CassetteLockManager {
  // Instance-level state - not global
  private syncLocks: Map<string, LockEntry> = new Map();
  
  /**
   * Acquires an in-memory lock for a cassette ID
   * Prevents concurrent save operations on the same item
   * 
   * @param cassetteSync - The cassette identifier (format: provider:category:id)
   * @throws {Error} If lock acquisition times out
   */
  async acquireSyncLock(cassetteSync: string): Promise<void> {
    const startTime = Date.now();
    
    // Wait for any existing lock to release with timeout protection
    while (this.syncLocks.has(cassetteSync)) {
      // Check for timeout
      if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
        // Force release the stale lock
        const staleLock = this.syncLocks.get(cassetteSync);
        if (staleLock) {
          console.warn(
            `[CassetteLock] Force-releasing stale lock for ${cassetteSync} ` +
            `(held for ${Date.now() - staleLock.acquiredAt}ms)`
          );
          this.releaseSyncLock(cassetteSync);
        }
        throw new Error(
          `Lock acquisition timeout for ${cassetteSync} after ${LOCK_TIMEOUT_MS}ms`
        );
      }
      
      // Wait for the existing lock's promise to resolve
      const existingLock = this.syncLocks.get(cassetteSync);
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
    
    this.syncLocks.set(cassetteSync, lockEntry);
  }

  /**
   * Releases a lock for a cassette ID
   * Safe to call even if no lock exists
   * 
   * @param cassetteSync - The cassette identifier to release
   */
  releaseSyncLock(cassetteSync: string): void {
    const lockEntry = this.syncLocks.get(cassetteSync);
    
    if (lockEntry) {
      // Resolve the promise to release any waiting operations
      lockEntry.resolve();
      
      // Remove the lock entry
      this.syncLocks.delete(cassetteSync);
    }
  }

  /**
   * Checks if a lock is currently held for a cassette ID
   * Useful for debugging or status checks
   * 
   * @param cassetteSync - The cassette identifier to check
   * @returns true if lock is held, false otherwise
   */
  isLocked(cassetteSync: string): boolean {
    return this.syncLocks.has(cassetteSync);
  }

  /**
   * Gets information about a currently held lock
   * Useful for debugging lock contention issues
   * 
   * @param cassetteSync - The cassette identifier to check
   * @returns Lock info or undefined if not locked
   */
  getLockInfo(cassetteSync: string): { 
    heldFor: number;
    cassetteSync: string;
  } | undefined {
    const lockEntry = this.syncLocks.get(cassetteSync);
    
    if (lockEntry) {
      return {
        cassetteSync,
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
      console.warn(`[CassetteLock] Force-released ${count} locks`);
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
   * @param cassetteSync - The cassette identifier to lock
   * @param fn - The function to execute while holding the lock
   * @returns The result of the function
   * @throws {Error} If lock acquisition fails or function throws
   */
  async withLock<T>(
    cassetteSync: string,
    fn: () => Promise<T>
  ): Promise<T> {
    await this.acquireSyncLock(cassetteSync);
    
    try {
      return await fn();
    } finally {
      this.releaseSyncLock(cassetteSync);
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
 * Creates a new Cassette Lock Manager instance
 * @returns New CassetteLockManager instance
 */
export function createCassetteLockManager(): CassetteLockManager {
  return new CassetteLockManager();
}