import { Notice } from "obsidian";

// Internal switch to control notifications
let isEnabled = true;

/**
 * Update this from main.ts and tab.ts to sync with settings.
 */
export function setNotificationsEnabled(enabled: boolean): void {
    isEnabled = enabled;
}

/**
 * Shows a notice if enabled.
 * Supports:
 * - showNotice("Message")
 * - showNotice("Message", 2000)
 * - showNotice("Message", "success")
 * - showNotice("Message", "warning", 5000)
 */
export function showNotice(
    message: string,
    typeOrDuration?: "success" | "warning" | number,
    duration?: number
): void {
    if (!isEnabled) return;

    let finalType: "success" | "warning" | undefined;
    let finalDuration: number | undefined;

    // MAGIC: Check if the 2nd argument is actually a number (duration)
    if (typeof typeOrDuration === "number") {
        finalDuration = typeOrDuration;
        finalType = undefined;
    } else {
        finalType = typeOrDuration;
        finalDuration = duration;
    }

    // Set defaults if duration is still missing
    if (finalDuration === undefined) {
        if (finalType === "success") finalDuration = 3000;
        else if (finalType === "warning") finalDuration = 5000;
    }

    const notice = new Notice(message, finalDuration);

    if (finalType) {
        notice.messageEl.addClass(`mod-${finalType}`);
    }
}
