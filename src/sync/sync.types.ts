/**
 * Sync result for a single item
 */
export interface SyncItemResult {
  id: number;
  title: string;
  success: boolean;
  error?: string;
  action?: 'created' | 'updated' | 'skipped';
}

/**
 * Overall sync result
 */
export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  results: SyncItemResult[];
  errors: string[];
  startTime: number;
  endTime: number;
}
