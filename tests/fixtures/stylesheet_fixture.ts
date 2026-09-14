/**
 * Stylesheet Test Fixture and Lifecycle Management.
 * Resets stylesheet singleton caches to guarantee hermetic test isolation.
 */

import { defaultStyleSheetManager } from "@internal/styles";

/**
 * Resets stylesheet singleton caches between tests.
 */
export function resetStyleSheetCache(): void {
    defaultStyleSheetManager.clear();
}
