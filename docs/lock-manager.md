/**
 * Cassette Lock Manager
 * 
 * WHAT THIS IS:
 * In-memory mutex for cassette operations. Prevents race conditions when multiple
 * sync operations try to modify the same file simultaneously.
 * 
 * WHY WE NEED THIS:
 * Without locking, two parallel syncs could:
 * 1. Both read the same file
 * 2. Both generate new content
 * 3. Both write, with the second overwriting the first
 * Result: Lost data, corrupted frontmatter, user frustration.
 * 
 * HOW IT WORKS:
 * - Each cassette ID gets a promise-based lock
 * - Operations wait their turn using Promise.race() with timeouts
 * - Locks auto-expire after 30s to prevent deadlocks from crashes
 * - Everything is in-memory (doesn't survive restarts, which is fine)
 * 
 * DESIGN DECISIONS:
 * 
 * 1. Why not use a simple boolean flag?
 *    - Promises let waiters sleep efficiently instead of busy-looping
 *    - Natural async/await integration
 * 
 * 2. Why the LockEntry interface?
 *    - Original code stored resolver on the promise with `any` casting (fragile)
 *    - Proper typing prevents runtime surprises
 *    - Tracks acquisition time for timeout detection
 * 
 * 3. Why 30 second timeout?
 *    - File operations should be fast (< 1s typically)
 *    - 30s is generous but prevents infinite hangs
 *    - Logged warnings help debug if this ever triggers
 * 
 * 4. Why withLock() wrapper?
 *    - Reduces boilerplate in storage-service.ts
 *    - Guarantees lock release even on errors
 *    - Makes code review easier (obvious lock boundaries)
 * 
 * GOTCHAS:
 * - Locks are per-process only (multi-device sync needs server-side locking)
 * - If Obsidian crashes mid-operation, lock is lost (acceptable trade-off)
 * - Don't await anything after acquiring lock without try/finally or withLock()
 * 
 * DEBUGGING:
 * - Use getLockInfo() to see how long a lock has been held
 * - Check console for "Force-releasing stale lock" warnings
 * - If you see timeout errors, something's blocking the event loop
 * 
 * TODO/FUTURE:
 * - Consider adding metrics (lock wait times, contention counts)
 * - Maybe add a debug mode that logs all lock acquisitions
 * - Could make timeout configurable via settings if users report issues
 */