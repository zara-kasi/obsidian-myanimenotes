/**
 * Notification Wrapper Utility
 * 
 * Provides a centralized way to show notifications that respects user settings
 * All notifications in the plugin should use this function instead of direct Notice() calls
 */

import { Notice } from 'obsidian';
import type MyAnimeNotesPlugin from '../main';

/**
 * Shows a notification if notifications are enabled in settings
 * @param plugin Plugin instance
 * @param message Notification message
 * @param duration Duration in milliseconds (0 = persistent)
 */
export function showNotice(
  plugin: MyAnimeNotesPlugin,
  message: string,
  duration?: number
): void {
  // Check if notifications are enabled
  if (plugin.settings.notificationsEnabled) {
    new Notice(message, duration);
  }
}

/**
 * Shows a success notification
 * @param plugin Plugin instance
 * @param message Notification message
 * @param duration Duration in milliseconds (default: 3000)
 */
export function showSuccessNotice(
  plugin: MyAnimeNotesPlugin,
  message: string,
  duration = 3000
): void {
  showNotice(plugin, message, duration);
}

/**
 * Shows an error notification
 * @param plugin Plugin instance
 * @param message Notification message
 * @param duration Duration in milliseconds (default: 5000)
 */
export function showErrorNotice(
  plugin: MyAnimeNotesPlugin,
  message: string,
  duration = 5000
): void {
  showNotice(plugin, message, duration);
}

/**
 * Shows an info notification
 * @param plugin Plugin instance
 * @param message Notification message
 * @param duration Duration in milliseconds (default: 3000)
 */
export function showInfoNotice(
  plugin: MyAnimeNotesPlugin,
  message: string,
  duration = 3000
): void {
  showNotice(plugin, message, duration);
}