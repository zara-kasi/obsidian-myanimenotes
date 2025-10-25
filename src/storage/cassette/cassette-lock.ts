/**
 * Cassette Lock Manager
 * 
 * Provides in-memory concurrency control for cassette operations.
 * Prevents race conditions when multiple operations target the same cassette ID.
 */

interface LockEntry {
  promise: Promise<void>;
  resolve: () => void;
  acquiredAt: number;
}

const syncLocks = new Map<string, LockEntry>();
const LOCK_TIMEOUT_MS = 30000; // 30 seconds timeout
const LOCK_CHECK_INTERVAL_MS = 100; // Check every 100ms

/**
 * Acquires an in-memory lock for a cassette ID
 * Prevents concurrent save operations on the same item
 * 
 * @param cassetteSync - The cassette identifier (format: provider:category:id)
 * @throws {Error} If lock acquisition times out
 */
export async function acquireSyncLock(cassetteSync: string): Promise<void> {
  const startTime = Date.now();
  
  // Wait for any existing lock to release with timeout protection
  while (syncLocks.has(cassetteSync)) {
    // Check for timeout
    if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
      // Force release the stale lock
      const staleLock = syncLocks.get(cassetteSync);
      if (staleLock) {
        console.warn(
          `[CassetteLock] Force-releasing stale lock for ${cassetteSync} ` +
          `(held for ${Date.now() - staleLock.acquiredAt}ms)`
        );
        releaseSyncLock(cassetteSync);
      }
      throw new Error(
        `Lock acquisition timeout for ${cassetteSync} after ${LOCK_TIMEOUT_MS}ms`
      );
    }
    
    // Wait for the existing lock's promise to resolve
    const existingLock = syncLocks.get(cassetteSync);
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
  
  syncLocks.set(cassetteSync, lockEntry);
}

/**
 * Releases a lock for a cassette ID
 * Safe to call even if no lock exists
 * 
 * @param cassetteSync - The cassette identifier to release
 */
export function releaseSyncLock(cassetteSync: string): void {
  const lockEntry = syncLocks.get(cassetteSync);
  
  if (lockEntry) {
    // Resolve the promise to release any waiting operations
    lockEntry.resolve();
    
    // Remove the lock entry
    syncLocks.delete(cassetteSync);
  }
}

/**
 * Checks if a lock is currently held for a cassette ID
 * Useful for debugging or status checks
 * 
 * @param cassetteSync - The cassette identifier to check
 * @returns true if lock is held, false otherwise
 */
export function isLocked(cassetteSync: string): boolean {
  return syncLocks.has(cassetteSync);
}

/**
 * Gets information about a currently held lock
 * Useful for debugging lock contention issues
 * 
 * @param cassetteSync - The cassette identifier to check
 * @returns Lock info or undefined if not locked
 */
export function getLockInfo(cassetteSync: string): { 
  heldFor: number;
  cassetteSync: string;
} | undefined {
  const lockEntry = syncLocks.get(cassetteSync);
  
  if (lockEntry) {
    return {
      cassetteSync,
      heldFor: Date.now() - lockEntry.acquiredAt
    };
  }
  
  return undefined;
}

/**
 * Forces release of all locks
 * Should only be used in emergency situations or during cleanup
 * 
 * @returns Number of locks that were released
 */
export function releaseAllLocks(): number {
  const count = syncLocks.size;
  
  syncLocks.forEach((lockEntry, cassetteSync) => {
    lockEntry.resolve();
  });
  
  syncLocks.clear();
  
  if (count > 0) {
    console.warn(`[CassetteLock] Force-released ${count} locks`);
  }
  
  return count;
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
export async function withLock<T>(
  cassetteSync: string,
  fn: () => Promise<T>
): Promise<T> {
  await acquireSyncLock(cassetteSync);
  
  try {
    return await fn();
  } finally {
    releaseSyncLock(cassetteSync);
  }
}