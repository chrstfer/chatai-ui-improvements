/**
 * Chat Contracts Submodule Barrel.
 */

export type { ChatAdapterDefinition, ChatAdapterFactory, SiteAdapter } from "./adapter.ts";

export type {
    ChatColumnBounds,
    ClassListLike,
    DocumentLike,
    HostLayoutController,
    StyleDeclarationLike,
} from "./layout.ts";

export type { HostThemeAuthority, ThemeChangeCallback, ThemeMode } from "./theme.ts";

export type {
    DiscoveredBlockRef,
    DiscoveredResponseRef,
    SettlementObserver,
    SettlementObserverCallbacks,
    SettlementState,
} from "./settlement.ts";
