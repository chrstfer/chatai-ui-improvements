import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { DocumentViewComponent } from "../../core/contracts/documentView.ts";
import { defaultLanguageRegistry, type LanguageRegistry } from "../../languages/registry.ts";
import { RawSourceView } from "./RawSourceView.tsx";

export interface CodeBlockViewDispatcherProps {
    /** Raw code or markup content */
    rawText: string;
    /** Language hint or identifier */
    language: string;
    /** Whether content is actively streaming */
    isStreaming?: boolean;
    /** Optional turn or block metadata */
    metadata?: Readonly<Record<string, unknown>>;
    /** Optional registry override for dependency injection or testing */
    registry?: LanguageRegistry;
    /** Opaque view state for the document view */
    documentViewState?: unknown;
    /** Callback to persist updated document view state */
    onSaveViewState?: (state: unknown) => void;
}

/** In-memory cache of resolved view components keyed by language ID */
const viewComponentCache = new Map<string, DocumentViewComponent>();

/**
 * Universal Preact Code Block View Dispatcher.
 * Dynamically resolves the appropriate LanguageDefinition from the registry,
 * asynchronously loads its registered DocumentViewComponent on demand via outside-in lazy loading,
 * and renders it with standard DocumentViewProps.
 *
 * During the chunk loading window, synchronously renders the raw source view (0ms first paint).
 * Completely language-agnostic with zero coupling to specific language implementations.
 */
export function CodeBlockViewDispatcher({
    rawText,
    language,
    isStreaming = false,
    metadata,
    registry = defaultLanguageRegistry,
    documentViewState,
    onSaveViewState,
}: CodeBlockViewDispatcherProps): JSX.Element {
    const firstLines = useMemo(
        () => rawText.split("\n").slice(0, 10),
        [rawText],
    );

    const [viewComponent, setViewComponent] = useState<DocumentViewComponent | null>(
        () => {
            const syncDef = registry.resolve(language) ?? registry.matchContent(language, firstLines);
            if (syncDef) {
                return syncDef.view;
            }
            return viewComponentCache.get(language.toLowerCase()) ?? null;
        },
    );

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        if (!viewComponent) {
            registry
                .loadLanguage(language, firstLines)
                .then((def) => {
                    if (active && def) {
                        viewComponentCache.set(def.id.toLowerCase(), def.view);
                        setViewComponent(() => def.view);
                    }
                })
                .catch((err) => {
                    if (active) {
                        setError(
                            err instanceof Error ? err.message : "Failed to load document view",
                        );
                    }
                });
        }
        return () => {
            active = false;
        };
    }, [language, firstLines, registry, viewComponent]);

    if (error) {
        return (
            <div class="ext-rendered-error p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded m-2">
                <span class="ext-error-text font-mono">{error}</span>
            </div>
        );
    }

    // Instant Raw View during lazy chunk load window (0ms first paint)
    if (!viewComponent) {
        return <RawSourceView rawText={rawText} language={language} />;
    }

    const View = viewComponent;
    return (
        <View
            content={rawText}
            language={language}
            isStreaming={isStreaming}
            metadata={metadata}
            documentViewState={documentViewState}
            onSaveViewState={onSaveViewState}
        />
    );
}

// Backwards compatibility alias
export { CodeBlockViewDispatcher as DocumentViewDispatcher };
export type { CodeBlockViewDispatcherProps as DocumentViewDispatcherProps };
