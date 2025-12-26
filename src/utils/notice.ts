import { Notice } from "obsidian";

// Internal switch to control whether notifications are displayed.
// This is toggled via `setNotificationsEnabled` based on user settings.
let isEnabled = true;

/**
 * Updates the global notification state.
 * This should be called from `main.ts` or `settings.ts` whenever the user
 * toggles the "Enable Notifications" setting.
 *
 * @param enabled - Whether notifications should be shown.
 */
export function setNotificationsEnabled(enabled: boolean): void {
    isEnabled = enabled;
}

/**
 * Displays a toast notification in Obsidian if notifications are enabled.
 *
 * This helper provides a flexible API that supports multiple usage patterns:
 * 1. Simple: `showNotice("Message")`
 * 2. With Duration: `showNotice("Message", 2000)`
 * 3. With Type: `showNotice("Message", "success")`
 * 4. With Type & Duration: `showNotice("Message", "warning", 5000)`
 *
 * @param message - The text to display in the notification.
 * @param typeOrDuration - Either a style type ("success" | "warning") or the duration in ms.
 * @param duration - (Optional) Duration in ms if the second argument was a type.
 */
export function showNotice(
    message: string,
    typeOrDuration?: "success" | "warning" | number,
    duration?: number
): void {
    // Exit immediately if the user has disabled notifications in settings.
    if (!isEnabled) return;

    let finalType: "success" | "warning" | undefined;
    let finalDuration: number | undefined;

    // MAGIC: Handle argument overloading manually.
    // Check if the 2nd argument is actually a number (meaning it's the duration).
    if (typeof typeOrDuration === "number") {
        finalDuration = typeOrDuration;
        finalType = undefined;
    } else {
        // Otherwise, it's a type string (or undefined), and duration might be the 3rd arg.
        finalType = typeOrDuration;
        finalDuration = duration;
    }

    // Set default durations based on the notification type if not explicitly provided.
    // Success messages fade faster (3s) than warnings (5s).
    if (finalDuration === undefined) {
        if (finalType === "success") finalDuration = 3000;
        else if (finalType === "warning") finalDuration = 5000;
    }

    // Create the Obsidian Notice instance.
    const notice = new Notice(message, finalDuration);

    // If a type was specified, add the corresponding CSS class to the notice element.
    // This allows for custom styling (e.g., green for success, yellow/red for warning).
    if (finalType) {
        notice.messageEl.addClass(`mod-${finalType}`);
    }
}
