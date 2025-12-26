/**
 * MyAnimeNotes Lock Manager
 *
 * Provides in-memory concurrency control for MyAnimeNotes operations.
 * Prevents race conditions when multiple operations (e.g., syncs, saves) target the same resource ID.
 *
 * Core Features:
 * - Mutex-style locking per resource ID.
 * - Automatic stale lock detection and force-release.
 * - Promise-based waiting queue (unblocked when lock is released).
 * - "Random Winner" strategy for waiters (no FIFO guarantee), which is sufficient for low-contention plugin logic.
 */

import { logger } from "../utils/logger";

/**
 * Represents a single active lock.
 */
interface LockEntry {
    /** The promise that waiters await. Resolves when the lock is released. */
    promise: Promise<void>;
    /** Function to resolve the promise, effectively releasing the lock. */
    resolve: () => void;
    /** Timestamp when the lock was originally acquired. */
    acquiredAt: number;
}

const log = new logger("LockManager");

/** Max time (30s) a lock can be held before it is considered "stale" and susceptible to force-release. */
const LOCK_HOLD_TIMEOUT_MS = 30000;

/** Max time (60s) a caller will wait to acquire a lock before throwing a timeout error. */
const WAIT_TIMEOUT_MS = 60000;

/** Threshold (30s) for reporting stale locks in stats/health checks. */
const STALE_LOCK_THRESHOLD_MS = 30000;

/**
 * MyAnimeNotes Lock Manager - Instance-based concurrency control.
 *
 * Manages locks to prevent concurrent modifications to the same MyAnimeNotes entity.
 * Each instance maintains its own lock state, preventing global state pollution.
 */
export class MyAnimeNotesLockManager {
    // Stores active locks keyed by the unique resource ID (e.g., "mal:anime:123").
    private syncLocks: Map<string, LockEntry> = new Map();

    /**
     * Acquires an in-memory lock for a specific ID.
     * Prevents concurrent save operations on the same item.
     *
     * Logic:
     * 1. Checks if a lock exists.
     * 2. If locked & stale (held > 30s): Force releases it immediately and takes ownership.
     * 3. If locked & valid: Waits for release (up to 60s).
     * 4. If free: Creates a new lock.
     *
     * @param myanimenotesSync - The unique identifier (format: provider:category:id).
     * @returns Promise that resolves when the lock is successfully acquired.
     * @throws {Error} If the wait times out (default 60s).
     */
    async acquireSyncLock(myanimenotesSync: string): Promise<void> {
        // Check if lock exists
        const existingLock = this.syncLocks.get(myanimenotesSync);

        if (existingLock) {
            const now = Date.now();
            const lockHoldDuration = now - existingLock.acquiredAt;

            // Check: Has the CURRENT LOCK HOLDER been holding the lock too long?
            if (lockHoldDuration > LOCK_HOLD_TIMEOUT_MS) {
                // Force release the stale lock to prevent deadlocks
                log.error(
                    `Force-releasing stale lock for ${myanimenotesSync} ` +
                        `(held for ${lockHoldDuration}ms) - acquiring immediately`
                );
                this.releaseSyncLock(myanimenotesSync);
                // Lock is now free, WE will acquire it below (don't throw!)
                // The operation that detected the stale lock gets to proceed immediately.
            } else {
                // Lock is valid, wait for it with timeout
                await this.waitForLockWithTimeout(
                    existingLock,
                    myanimenotesSync,
                    WAIT_TIMEOUT_MS
                );

                // After waiting, check if lock is still held (shouldn't be, but safe guard).
                // If somehow still locked after wait completes (race condition), recurse to try again.
                if (this.syncLocks.has(myanimenotesSync)) {
                    return this.acquireSyncLock(myanimenotesSync);
                }
            }
        }

        // Create new lock
        let resolveFunction: () => void = () => {};

        // Create a specialized promise that we can resolve externally via `resolveFunction`
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
     * Helper to wait for a lock's promise with a safety timeout.
     * Uses `Promise.race` to ensure we don't wait forever if the logic hangs.
     *
     * @param lockEntry - The active lock entry to wait for.
     * @param myanimenotesSync - Lock identifier (for error context).
     * @param timeoutMs - Max wait time in milliseconds.
     * @throws {Error} If the timeout is reached before the lock is released.
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
            // CRITICAL: Always clear timeout to prevent memory leaks/hanging timers
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        }
    }

    /**
     * Releases the lock for a specific ID.
     * Resolves the waiting promise, allowing the next waiter to proceed.
     *
     * @param myanimenotesSync - The identifier to unlock.
     */
    releaseSyncLock(myanimenotesSync: string): void {
        const lockEntry = this.syncLocks.get(myanimenotesSync);

        if (lockEntry) {
            // Resolve the promise to notify any waiting operations
            lockEntry.resolve();

            // Remove the lock entry from the map
            this.syncLocks.delete(myanimenotesSync);
        }
    }

    /**
     * Checks if a lock is currently held for a given ID.
     *
     * @param myanimenotesSync - The identifier to check.
     */
    isLocked(myanimenotesSync: string): boolean {
        return this.syncLocks.has(myanimenotesSync);
    }

    /**
     * Gets diagnostic information about a specific lock.
     * Useful for debugging contention or stuck processes.
     *
     * @param myanimenotesSync - The identifier to check.
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
     * Emergency cleanup: Releases ALL locks managed by this instance.
     * Should only be used during plugin unload or critical error recovery.
     *
     * @returns Number of locks that were force-released.
     */
    releaseAllLocks(): number {
        const count = this.syncLocks.size;

        // Resolve all lock promises before clearing to unblock any pending waiters
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
     * Standard cleanup method called when the plugin is disabled.
     */
    clear(): void {
        this.releaseAllLocks();
    }

    /**
     * HOF (Higher Order Function) wrapper to safely execute a function with a lock.
     * Guarantees that the lock is released (via `finally`) even if the function throws.
     *
     * Usage:
     * ```ts
     * await lockManager.withLock("id:123", async () => {
     * await saveToFile(data);
     * });
     * ```
     *
     * @param myanimenotesSync - The identifier to lock.
     * @param fn - The async function to execute.
     * @returns The result of the function `fn`.
     */
    async withLock<T>(
        myanimenotesSync: string,
        fn: () => Promise<T>
    ): Promise<T> {
        await this.acquireSyncLock(myanimenotesSync);

        try {
            return await fn();
        } finally {
            // CRITICAL: Always release lock, even if fn() throws an error.
            this.releaseSyncLock(myanimenotesSync);
        }
    }

    /**
     * Gets aggregate statistics about current locks.
     * Used for health monitoring.
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
     * Maintenance task: Scans for and force-releases any locks held longer than `STALE_LOCK_THRESHOLD_MS`.
     * Can be run periodically to clean up after crashed operations.
     *
     * @returns Number of stale locks released.
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
 * Factory function to create a new MyAnimeNotesLockManager.
 */
export function createMyAnimeNotesLockManager(): MyAnimeNotesLockManager {
    return new MyAnimeNotesLockManager();
}
