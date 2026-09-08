import { createLogger } from "../logging/index.ts";

export interface ClipboardCopyOptions {
    /**
     * Whether to attempt clicking the host's native copy button if navigator.clipboard fails.
     * Defaults to true. Set to false to disable host fallback entirely.
     */
    enableHostFallback?: boolean;
    /**
     * Reference to the native host element (e.g. Gemini <code-block>) containing native copy controls.
     */
    hostFallbackElement?: HTMLElement | null;
}

const logger = createLogger("Clipboard");

/**
 * Copies text to the system clipboard using the standard Async Clipboard API (navigator.clipboard.writeText),
 * with an isolated, optional fallback to trigger the host's native copy button if permissions reject.
 *
 * @param text - The pristine raw text from the data island
 * @param options - Optional configuration controlling fallback behavior
 * @returns Promise resolving to true if copy succeeded, false otherwise
 */
export async function copyTextToClipboard(
    text: string,
    options: ClipboardCopyOptions = {},
): Promise<boolean> {
    const { enableHostFallback = true, hostFallbackElement } = options;
    let returnSuccess = false;

    // 1. Primary path: Modern Async Clipboard API
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            logger.debug(`Successfully copied ${text.length} character(s) via navigator.clipboard`);
            returnSuccess = true;
        } catch (err) {
            logger.warn("navigator.clipboard.writeText rejected, evaluating fallback", err);
        }
    } else {
        logger.debug("navigator.clipboard.writeText is not available in current environment");
    }

    // 2. Isolated fallback path: Click native host copy button
    if (!returnSuccess && enableHostFallback && hostFallbackElement) {
        try {
            const nativeCopyBtn = hostFallbackElement.querySelector<HTMLElement>(
                "copy-button button, [data-test-id='copy-button'], button[aria-label*='Copy' i], button[aria-label*='copy' i], button[title*='Copy' i], button[title*='copy' i]",
            );
            if (nativeCopyBtn) {
                logger.debug("Triggering native host copy button fallback");
                nativeCopyBtn.click();
                returnSuccess = true;
            } else {
                logger.warn("Native copy button not found in host element for fallback");
            }
        } catch (fallbackErr) {
            logger.error("Failed to trigger native host copy button fallback", fallbackErr);
        }
    }

    return returnSuccess;
}
