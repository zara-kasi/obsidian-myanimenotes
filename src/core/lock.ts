/**
 * MyAnimeNotes Lock Manager - FIXED VERSION
 *
 * Provides in-memory concurrency control for myanimenotes operations.
 * Prevents race conditions when multiple operations target the same myanimenotes ID.
 *
 * FIXES:
 * 1. Separated wait timeout from lock hold timeout
 * 2. Check lock holder's acquiredAt, not waiter's startTime
 * 3. Removed polling loop - await lock promise directly
 * 4. No timer leaks - proper cleanup with finally block
 * 5. Force-release takes ownership instead of throwing
 *
 * KNOWN LIMITATIONS:
 *
 * A. Fairness (Starvation Risk):
 * - Uses "random winner" strategy (not FIFO queue)
 * - Multiple waiters wake simultaneously when lock is released
 * - No fairness guarantees (potential starvation under high contention)
 * - Acceptable for Obsidian plugin use case (low concurrent writes per note)
 * - For high-contention scenarios, consider FIFO queue implementation
 *
 * B. Passive Stale Detection:
 * - Stale lock check only happens at entry (acquireSyncLock)
 * - Once waiting, does not re-check if lock becomes stale during wait
 * - Example scenario:
 *   1. Lock is 0s old when waiter arrives (valid)
 *   2. Waiter enters 60s wait
 *   3. Lock becomes stale at 30s (holder crashed)
 *   4. Waiter continues waiting for full 60s
 * - Impact: Users wait longer before error (60s vs 30s)
 * - Trade-off: Fixing requires polling (inefficient) or complex timer math
 * - Acceptable because:
 *   * 30s+ lock holds are extremely rare in practice
 *   * Most operations complete in < 1s
 *   * Error recovery is automatic (retry succeeds)
 *   * Polling overhead worse than occasional extra wait time
 */

import { logger } from "../utils/logger";

interface LockEntry {
    promise: Promise<void>;
    resolve: () => void;
    acquiredAt: number;
}

const log = new logger("LockManager");

const LOCK_HOLD_TIMEOUT_MS = 30000; // 30 seconds max hold time for a lock
const WAIT_TIMEOUT_MS = 60000; // 60 seconds max wait time for acquiring a lock
const STALE_LOCK_THRESHOLD_MS = 30000; // Consider lock stale after 30 seconds

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
     * FIXED: No polling loop, no timer leaks, proper force-release handling
     * - Checks for stale lock ONCE before waiting
     * - Waits directly on lock promise with proper timeout
     * - If force-releasing stale lock, acquires it immediately (no throw)
     *
     * @param myanimenotesSync - The myanimenotes identifier (format: provider:category:id)
     * @throws {Error} Only if wait times out (not if we force-release a stale lock)
     */
    async acquireSyncLock(myanimenotesSync: string): Promise<void> {
        // Check if lock exists
        const existingLock = this.syncLocks.get(myanimenotesSync);

        if (existingLock) {
            const now = Date.now();
            const lockHoldDuration = now - existingLock.acquiredAt;

            // Check: Has the CURRENT LOCK HOLDER been holding the lock too long?
            if (lockHoldDuration > LOCK_HOLD_TIMEOUT_MS) {
                // Force release the stale lock
                log.error(
                    `Force-releasing stale lock for ${myanimenotesSync} ` +
                        `(held for ${lockHoldDuration}ms) - acquiring immediately`
                );
                this.releaseSyncLock(myanimenotesSync);
                // Lock is now free, WE will acquire it below (don't throw!)
                // The operation that detected the stale lock gets to proceed
            } else {
                // Lock is valid, wait for it with timeout
                await this.waitForLockWithTimeout(
                    existingLock,
                    myanimenotesSync,
                    WAIT_TIMEOUT_MS
                );

                // After waiting, check if lock is still held (shouldn't be, but be safe)
                // If somehow still locked after wait completes, recurse to try again
                if (this.syncLocks.has(myanimenotesSync)) {
                    return this.acquireSyncLock(myanimenotesSync);
                }
            }
        }

        // Create new lock
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
     * Waits for a lock to be released with timeout
     * NO POLLING - uses proper timeout with cleanup
     *
     * @param lockEntry - The lock entry to wait for
     * @param myanimenotesSync - Lock identifier (for error messages)
     * @param timeoutMs - Max time to wait
     * @throws {Error} If wait times out
     */
    private async waitForLockWithTimeout(
        lockEntry: LockEntry,
        myanimenotesSync: string,
        timeoutMs: number
    ): Promise<void> {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
            await Promise.race([
                lockEntry.promise,
                new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(
                            new Error(
                                `Lock acquisition timeout for ${myanimenotesSync} after waiting ${timeoutMs}ms`
                            )
                        );
                    }, timeoutMs);
                })
            ]);
        } finally {
            // CRITICAL: Always clear timeout to prevent leak
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        }
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
    getLockInfo(myanimenotesSync: string):
        | {
              heldFor: number;
              myanimenotesSync: string;
              isStale: boolean;
          }
        | undefined {
        const lockEntry = this.syncLocks.get(myanimenotesSync);

        if (lockEntry) {
            const heldFor = Date.now() - lockEntry.acquiredAt;
            return {
                myanimenotesSync,
                heldFor,
                isStale: heldFor > STALE_LOCK_THRESHOLD_MS
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

        // Resolve all lock promises before clearing
        this.syncLocks.forEach(lockEntry => {
            lockEntry.resolve();
        });

        this.syncLocks.clear();

        if (count > 0) {
            log.error(`Force-released ${count} locks`);
        }

        return count;
    }

    /**
     * Clears all locks and resets the manager
     * Called during plugin cleanup to prevent memory leaks
     */
    clear(): void {
        this.releaseAllLocks();
    }

    /**
     * Executes a function while holding a lock
     * Automatically acquires and releases the lock
     * GUARANTEED cleanup even if function throws
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
            // CRITICAL: Always release lock, even if fn() throws
            this.releaseSyncLock(myanimenotesSync);
        }
    }

    /**
     * Gets statistics about current locks
     * Useful for monitoring lock state and detecting issues
     */
    getStats(): {
        activeLocks: number;
        staleLocks: number;
        oldestLockAge: number;
    } {
        let staleLocks = 0;
        let oldestLockAge = 0;

        const now = Date.now();

        this.syncLocks.forEach(lockEntry => {
            const age = now - lockEntry.acquiredAt;

            if (age > STALE_LOCK_THRESHOLD_MS) {
                staleLocks++;
            }

            if (age > oldestLockAge) {
                oldestLockAge = age;
            }
        });

        return {
            activeLocks: this.syncLocks.size,
            staleLocks,
            oldestLockAge
        };
    }

    /**
     * Performs health check on all locks
     * Force-releases any stale locks that have been held too long
     *
     * @returns Number of stale locks that were released
     */
    cleanupStaleLocks(): number {
        const now = Date.now();
        const staleEntries: string[] = [];

        this.syncLocks.forEach((lockEntry, myanimenotesSync) => {
            const heldFor = now - lockEntry.acquiredAt;

            if (heldFor > STALE_LOCK_THRESHOLD_MS) {
                staleEntries.push(myanimenotesSync);
            }
        });

        staleEntries.forEach(myanimenotesSync => {
            log.error(
                `[MyAnimeNotesLock] Cleaning up stale lock: ${myanimenotesSync}`
            );
            this.releaseSyncLock(myanimenotesSync);
        });

        return staleEntries.length;
    }
}

/**
 * Creates a new MyAnimeNotes Lock Manager instance
 * @returns New MyAnimeNotesLockManager instance
 */
export function createMyAnimeNotesLockManager(): MyAnimeNotesLockManager {
    return new MyAnimeNotesLockManager();
}
