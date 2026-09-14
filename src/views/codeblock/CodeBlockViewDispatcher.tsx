import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { DocumentViewComponent } from "@internal/contracts/features/renderers";
import { defaultRendererRegistry, type RendererRegistry } from "@internal/registries";
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
    registry?: RendererRegistry;
    /** Opaque view state for the document view */
    documentViewState?: unknown;
    /** Callback to persist updated document view state */
    onSaveViewState?: (state: unknown) => void;
}

/** In-memory cache of resolved view components keyed by language ID */
const viewComponentCache = new Map<string, DocumentViewComponent>();

/**
 * Universal Preact Code Block View Dispatcher.
 * Dynamically resolves the appropriate RendererContract from RendererRegistry,
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
    registry = defaultRendererRegistry,
    documentViewState,
    onSaveViewState,
}: CodeBlockViewDispatcherProps): JSX.Element {
    const [viewComponent, setViewComponent] = useState<DocumentViewComponent | null>(
        () => viewComponentCache.get(language.toLowerCase()) ?? null,
    );

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        if (!viewComponent) {
            const loadPromise = registry.get(language).then((res) => {
                if (res) return res;
                const firstLines = rawText.split("\n").slice(0, 10);
                return registry.findAndLoad(language, firstLines);
            });

            loadPromise
                .then((renderer) => {
                    if (active && renderer) {
                        viewComponentCache.set(renderer.id.toLowerCase(), renderer.view);
                        setViewComponent(() => renderer.view);
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
    }, [language, rawText, registry, viewComponent]);

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
