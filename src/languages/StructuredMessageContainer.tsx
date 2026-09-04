/**
 * Universal Structured Message Container Component
 * Provides unified folding, collapsed summary badges, portal toolbars, and active renderer management.
 */

import { FunctionComponent } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useMemo, useState } from "preact/hooks";
import { BlockStore, computeContentFingerprint, globalBlockStore } from "../context/BlockStoreContext.tsx";
import { globalLanguageRegistry } from "./index.ts";
import { globalToolbarRegistry, OrgDocumentView, OrgToolbar, parseOrgDocument, ToolbarTool } from "./org/index.ts";
import { OrgDocument } from "./org/types/ast.ts";

export interface StructuredMessageContainerProps {
    blockId: string;
    lang: string;
    codeText: string;
    preEl: HTMLElement;
    headerActionsEl?: HTMLElement | null;
    blockStore?: BlockStore;
    autoRender?: boolean;
    tools?: ToolbarTool[];
}

export const StructuredMessageContainer: FunctionComponent<StructuredMessageContainerProps> = ({
    blockId,
    lang,
    codeText,
    preEl,
    headerActionsEl,
    blockStore = globalBlockStore,
    autoRender = false,
    tools,
}) => {
    const isOrg = lang.toLowerCase() === "org";
    const lineCount = useMemo(() => codeText.split("\n").length, [codeText]);
    const fingerprint = useMemo(() => computeContentFingerprint(codeText, lang), [codeText, lang]);

    // Restore cached state or initialize
    const cached = blockStore.getCached(fingerprint);
    const [isRendered, setIsRendered] = useState<boolean>(
        cached?.isRendered ?? (isOrg ? autoRender : false),
    );
    const [isFolded, setIsFolded] = useState<boolean>(cached?.isFolded ?? false);
    const [allFolded, setAllFolded] = useState<boolean>(false);
    const [doc, setDoc] = useState<OrgDocument | undefined>(cached?.ast);

    // Parse Org AST when rendered
    useEffect(() => {
        if (isOrg && isRendered) {
            if (!doc || cached?.fingerprint !== fingerprint) {
                const parsed = parseOrgDocument(codeText);
                setDoc(parsed);
                blockStore.setCached(fingerprint, {
                    fingerprint,
                    ast: parsed,
                    isRendered: true,
                    isFolded,
                    lang,
                    lineCount,
                });
            }
        }
    }, [isOrg, isRendered, codeText, fingerprint]);

    // Update block store cache on state mutations
    useEffect(() => {
        blockStore.setCached(fingerprint, {
            fingerprint,
            isRendered,
            isFolded,
            lang,
            lineCount,
            ast: doc,
        });
    }, [isRendered, isFolded, fingerprint, doc, lang, lineCount]);

    // Register runtime block handlers with BlockStore for global HUD commands
    useEffect(() => {
        blockStore.register({
            id: blockId,
            fingerprint,
            lang,
            isRendered,
            isFolded,
            allFolded,
            isConnected: true,
            setRenderedState: (state) => setIsRendered(state),
            setFoldedState: (state) => setIsFolded(state),
            setAllFoldedState: (state) => setAllFolded(state),
        });

        return () => {
            blockStore.unregister(blockId);
        };
    }, [blockId, fingerprint, lang, isRendered, isFolded, allFolded]);

    // Synchronize host <pre> visibility declaratively
    useEffect(() => {
        if (preEl) {
            if (isFolded || (isOrg && isRendered)) {
                preEl.style.display = "none";
            } else {
                preEl.style.display = "";
            }
        }
    }, [preEl, isFolded, isOrg, isRendered]);

    const handleToggleRender = () => {
        setIsRendered((prev) => !prev);
    };

    const handleToggleFold = () => {
        if (isOrg && isRendered) {
            setAllFolded((prev) => !prev);
        } else {
            setIsFolded((prev) => !prev);
        }
    };

    // Construct active tools
    const activeTools = useMemo(() => {
        if (tools) return tools;

        const baseTools = isOrg ? globalToolbarRegistry.getAll() : [
            {
                id: "fold-toggle",
                order: 20,
                title: isFolded ? `Expand ${lang} snippet` : `Fold ${lang} snippet`,
                className: () => "org-block-btn org-fold-all-btn",
                onClick: handleToggleFold,
                render: () => <span>{isFolded ? "Expand" : "Fold"}</span>,
            },
        ];

        const langTools = globalLanguageRegistry.getToolsForLanguage(lang);
        const map = new Map<string, ToolbarTool>();
        for (const t of baseTools) map.set(t.id, t);
        for (const t of langTools) map.set(t.id, t);
        return Array.from(map.values()).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    }, [tools, isOrg, isFolded, lang, isRendered, allFolded]);

    const toolbarElement = (
        <OrgToolbar
            blockId={blockId}
            isRendered={isRendered}
            allFolded={isOrg && isRendered ? allFolded : isFolded}
            onToggleRender={handleToggleRender}
            onToggleFold={handleToggleFold}
            tools={activeTools}
            extraContext={{
                blockId,
                lang,
                isFolded,
                lineCount,
            }}
        />
    );

    return (
        <div className="org-structured-container" data-gemini-org="structured-container" data-gemini-org-id={blockId}>
            {/* Toolbar rendered into host header via Portal or inlined */}
            {headerActionsEl
                ? createPortal(toolbarElement, headerActionsEl)
                : <div className="org-toolbar-floating">{toolbarElement}</div>}

            {/* Collapsed Badge View */}
            {isFolded && (
                <div
                    className="org-collapsed-badge"
                    data-gemini-org="collapsed-badge"
                    title={`Click to expand ${lang.toUpperCase()} code block (${lineCount} lines)`}
                    onClick={() => setIsFolded(false)}
                >
                    <span className="org-collapsed-icon">📦</span>
                    <span className="org-collapsed-lang">{lang.toUpperCase()}</span>
                    <span className="org-collapsed-lines">({lineCount} lines)</span>
                    <span className="org-collapsed-hint">— Click to expand</span>
                </div>
            )}

            {/* Org Rendered View */}
            {!isFolded && isOrg && isRendered && doc && (
                <div className="org-rendered-view" data-gemini-org="rendered-view">
                    <OrgDocumentView doc={doc} forceFoldAll={allFolded} />
                </div>
            )}
        </div>
    );
};
