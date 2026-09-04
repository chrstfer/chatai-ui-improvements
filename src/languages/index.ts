/**
 * Languages Subsystem Public Exports
 */

import { RECOGNIZED_LANGUAGES } from "./definitions.ts";
import { LanguageRegistry } from "./registry.ts";

export * from "./definitions.ts";
export * from "./registry.ts";
export * from "./types.ts";
export * as org from "./org/index.ts";
export * as markdown from "./markdown/index.ts";
export * from "./org/index.ts";
export * from "./markdown/index.ts";

/**
 * Global singleton Language Registry initialized with recognized languages
 */
export const globalLanguageRegistry = new LanguageRegistry(RECOGNIZED_LANGUAGES);
