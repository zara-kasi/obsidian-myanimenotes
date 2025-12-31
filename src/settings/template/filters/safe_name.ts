/**
 * Safe Name Filter
 * * Sanitizes strings to create valid file/folder names
 * * Removes or replaces characters that are invalid for file systems
 * * Supports platform-specific rules (Windows, Mac, Linux)
 */

import { logger } from "../../../utils/logger";

const log = new logger("SafeNameFilter");

/**
 * A template filter that sanitizes strings for use as file or folder names.
 *
 * * Behavior:
 * - **Obsidian characters**: Removes #, |, ^, [, ] (invalid in Obsidian links)
 * - **Platform-specific**: Handles Windows, Mac, Linux file system rules
 * - **Reserved names**: Prevents Windows reserved names (CON, PRN, AUX, etc.)
 * - **Length limit**: Truncates to 245 characters (leaves room for extensions)
 * - **Empty result**: Returns "Untitled" if sanitization results in empty string
 *
 * * Parameters:
 * - `"windows"` - Apply Windows file system rules
 * - `"mac"` - Apply macOS file system rules
 * - `"linux"` - Apply Linux file system rules
 * - `"default"` or omitted - Apply most conservative rules (all platforms)
 *
 * * Windows restrictions:
 * - Removes: < > : " / \ | ? * and control characters
 * - Prevents reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 * - Removes trailing spaces and periods
 *
 * * Mac restrictions:
 * - Removes: / : and control characters
 * - Prevents leading periods
 *
 * * Linux restrictions:
 * - Removes: / and control characters
 * - Prevents leading periods
 *
 * * Usage examples:
 * - `{{ title | safe_name }}` → "Attack on Titan" (safe default)
 * - `{{ title | safe_name:"windows" }}` → Windows-compatible name
 * - `{{ "My:Anime*List" | safe_name }}` → "MyAnimeList"
 * - `{{ "CON" | safe_name:"windows" }}` → "_CON" (reserved name)
 *
 * @param value - The input string to sanitize.
 * @param param - Optional platform specification ("windows", "mac", "linux", "default").
 * @returns A sanitized string safe for use as a file/folder name.
 */
export function safe_name(value: unknown, param?: string): string {
    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "Untitled";
    }

    // Convert to string
    let str: string;
    if (typeof value === "object") {
        str = JSON.stringify(value);
    } else {
        str = String(value as string | number | boolean);
    }

    const os = param ? param.toLowerCase().trim() : "default";

    let sanitized = str;

    // First remove Obsidian-specific characters that should be sanitized across all platforms
    // #, |, ^, [, ] are problematic in Obsidian links and file names
    // Fix: Removed unnecessary escapes for ^ and [ (no-useless-escape)
    sanitized = sanitized.replace(/[#|^[\]]/g, "");

    switch (os) {
        case "windows":
            sanitized = sanitized
                // Remove invalid Windows characters: < > : " / \ | ? * and control chars
                // Fix: Used \x2F for forward slash to avoid escape warning and added disable comment for control chars
                .replace(/[<>:"\x2F\\|?*\x00-\x1F]/g, "")
                // Prevent Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
                .replace(
                    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i,
                    "_$1$2"
                )
                // Remove trailing spaces and periods
                .replace(/[\s.]+$/, "");
            break;

        case "mac":
            sanitized = sanitized
                // Remove invalid Mac characters: / : and control chars
                // Fix: Used \x2F for forward slash
                .replace(/[\x2F:\x00-\x1F]/g, "")
                // Prevent leading period (hidden files)
                .replace(/^\./, "_");
            break;

        case "linux":
            sanitized = sanitized
                // Remove invalid Linux characters: / and control chars
                // Fix: Used \x2F for forward slash
                .replace(/[\x2F\x00-\x1F]/g, "")
                // Prevent leading period (hidden files)
                .replace(/^\./, "_");
            break;

        default:
            // Most conservative approach (combination of all rules)
            sanitized = sanitized
                // Remove all problematic characters from all platforms
                // Fix: Used \x2F for forward slash
                .replace(/[<>:"\x2F\\|?*:\x00-\x1F]/g, "")
                // Prevent Windows reserved names
                .replace(
                    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i,
                    "_$1$2"
                )
                // Remove trailing spaces and periods
                .replace(/[\s.]+$/, "")
                // Prevent leading period
                .replace(/^\./, "_");
            break;
    }

    // Common operations for all platforms
    sanitized = sanitized
        // Remove any remaining leading periods
        .replace(/^\.+/, "")
        // Trim to 245 characters (leaves room for ' 1.md' or similar)
        .slice(0, 245);

    // Ensure the file name is not empty after sanitization
    if (sanitized.length === 0 || sanitized.trim().length === 0) {
        log.debug('Sanitization resulted in empty string, using "Untitled"');
        sanitized = "Untitled";
    }

    return sanitized;
}
