import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { DocumentViewComponent } from "../../core/contracts/documentView.ts";
import { defaultLanguageRegistry, type LanguageRegistry } from "../../languages/registry.ts";

export interface DocumentViewDispatcherProps {
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
}

/** In-memory cache of resolved view components keyed by language ID */
const viewComponentCache = new Map<string, DocumentViewComponent>();

/**
 * Universal Preact Document View Dispatcher.
 * Dynamically resolves the appropriate LanguageDefinition from the registry,
 * asynchronously loads its registered DocumentViewComponent on demand,
 * and renders it with standard DocumentViewProps.
 *
 * Completely language-agnostic with zero coupling to specific language implementations.
 */
export function DocumentViewDispatcher({
    rawText,
    language,
    isStreaming = false,
    metadata,
    registry = defaultLanguageRegistry,
}: DocumentViewDispatcherProps): JSX.Element {
    const firstLines = useMemo(
        () => rawText.split("\n").slice(0, 10),
        [rawText],
    );

    const langDef = useMemo(
        () => registry.resolve(language) ?? registry.matchContent(language, firstLines),
        [registry, language, firstLines],
    );

    const [ViewComponent, setViewComponent] = useState<DocumentViewComponent | null>(
        () => {
            if (!langDef) return null;
            return viewComponentCache.get(langDef.id) ?? null;
        },
    );

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!langDef) {
            setViewComponent(null);
            return;
        }

        const cached = viewComponentCache.get(langDef.id);
        if (cached) {
            setViewComponent(() => cached);
            return;
        }

        let isMounted = true;
        langDef.loadView()
            .then((Component) => {
                if (!isMounted) return;
                viewComponentCache.set(langDef.id, Component);
                setViewComponent(() => Component);
            })
            .catch((err) => {
                if (!isMounted) return;
                setError(
                    err instanceof Error ? err.message : "Failed to load document view",
                );
            });

        return () => {
            isMounted = false;
        };
    }, [langDef]);

    if (!langDef) {
        return (
            <div class="ext-rendered-placeholder">
                <span class="ext-placeholder-text">
                    No rendered view available for language &quot;{language}&quot;.
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div class="ext-rendered-error">
                <span class="ext-error-text">{error}</span>
            </div>
        );
    }

    if (!ViewComponent) {
        return (
            <div class="ext-rendered-loading">
                <span class="ext-placeholder-text">
                    Loading {langDef.name} view...
                </span>
            </div>
        );
    }

    return (
        <ViewComponent
            content={rawText}
            language={langDef.id}
            isStreaming={isStreaming}
            metadata={metadata}
        />
    );
}
