// In-memory lock to prevent concurrent operations on the same cassette ID
const syncLocks = new Map<string, Promise<void>>();


/**
 * Acquires an in-memory lock for a cassette ID
 * Prevents concurrent save operations on the same item
 */
export async function acquireSyncLock(cassetteSync: string): Promise<void> {
  // Wait for any existing lock to release
  while (syncLocks.has(cassetteSync)) {
    await syncLocks.get(cassetteSync);
  }
  
  // Create new lock
  let resolveLock: () => void;
  const lockPromise = new Promise<void>(resolve => { resolveLock = resolve; });
  
  // Store lock with its resolver
  syncLocks.set(cassetteSync, lockPromise);
  
  // Store resolver for later release
  (lockPromise as any).resolve = resolveLock!;
}

/**
 * Releases a lock for a cassette ID
 */
export function releaseSyncLock(cassetteSync: string): void {
  const lock = syncLocks.get(cassetteSync);
  if (lock) {
    // Call the resolver to release waiting promises
    (lock as any).resolve();
    syncLocks.delete(cassetteSync);
  }
}
