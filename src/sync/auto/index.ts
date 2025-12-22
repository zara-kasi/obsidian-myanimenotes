import type MyAnimeNotesPlugin from "../../main";
import { AutoSyncManager } from "./manager";

/**
 * Factory function to create and start the manager
 */
export function createAutoSyncManager(plugin: MyAnimeNotesPlugin): AutoSyncManager {
    const manager = new AutoSyncManager(plugin);
    manager.start();
    return manager;
}

export { AutoSyncManager };
