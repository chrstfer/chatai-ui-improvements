/**
 * Centralized Registries Barrel for AI Chat UI Improvements.
 * Exports all registry classes and pre-configured default singletons.
 */

export { ChatAdapterRegistry, defaultChatRegistry } from "./chatRegistry.ts";
export { defaultMatcherRegistry, MatcherRegistry } from "./matcherRegistry.ts";
export { defaultParserRegistry, ParserRegistry } from "./parserRegistry.ts";
export { defaultRendererRegistry, RendererRegistry } from "./rendererRegistry.ts";
export { defaultSerializerRegistry, SerializerRegistry } from "./serializerRegistry.ts";
