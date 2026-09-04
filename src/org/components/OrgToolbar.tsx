/**
 * Preact Component for Code Block Org Action Toolbar
 * Supports dynamic, hotswappable tool items and extensible action registries.
 */

import { ComponentChildren, Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";

export interface ToolbarContext {
    blockId: string;
    isRendered: boolean;
    allFolded: boolean;
    onToggleRender: () => void;
    onToggleFold: () => void;
    [key: string]: unknown;
}

export interface ToolbarTool {
    id: string;
    order?: number;
    title?: string | ((ctx: ToolbarContext) => string);
    label?: string | ((ctx: ToolbarContext) => string);
    ariaLabel?: string;
    className?: string | ((ctx: ToolbarContext) => string);
    isActive?: (ctx: ToolbarContext) => boolean;
    isVisible?: (ctx: ToolbarContext) => boolean;
    render?: (ctx: ToolbarContext) => ComponentChildren;
    onClick?: (ctx: ToolbarContext, event: Event) => void | Promise<void>;
}

/**
 * Dynamic registry for toolbar tools enabling runtime registration and hotswapping.
 */
export class ToolbarToolRegistry {
    private tools = new Map<string, ToolbarTool>();
    private listeners = new Set<() => void>();

    constructor(initialTools?: ToolbarTool[]) {
        if (initialTools) {
            for (const tool of initialTools) {
                this.tools.set(tool.id, tool);
            }
        }
    }

    public register(tool: ToolbarTool): void {
        this.tools.set(tool.id, tool);
        this.notify();
    }

    public unregister(id: string): boolean {
        const deleted = this.tools.delete(id);
        if (deleted) this.notify();
        return deleted;
    }

    public get(id: string): ToolbarTool | undefined {
        return this.tools.get(id);
    }

    public has(id: string): boolean {
        return this.tools.has(id);
    }

    public getAll(): ToolbarTool[] {
        return Array.from(this.tools.values()).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

/**
 * Default built-in toolbar tools
 */
export const DEFAULT_TOOLBAR_TOOLS: ToolbarTool[] = [
    {
        id: "render-toggle",
        order: 10,
        title: (ctx) =>
            ctx.isRendered ? "Org rendered (click to view raw code)" : "Toggle Org-mode rendering",
        className: (ctx) => `org-block-btn org-toggle-btn ${ctx.isRendered ? "is-active" : ""}`,
        isActive: (ctx) => ctx.isRendered,
        onClick: (ctx) => ctx.onToggleRender(),
        render: (ctx) => (
            <>
                <svg className="org-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                <span>{ctx.isRendered ? "View Raw" : "View Org"}</span>
            </>
        ),
    },
    {
        id: "fold-toggle",
        order: 20,
        isVisible: (ctx) => ctx.isRendered,
        title: (ctx) => (ctx.allFolded ? "Expand all sections" : "Fold all sections"),
        className: () => "org-block-btn org-fold-all-btn",
        onClick: (ctx) => ctx.onToggleFold(),
        render: (ctx) => <span>{ctx.allFolded ? "Expand All" : "Fold All"}</span>,
    },
];

/**
 * Global default tool registry singleton
 */
export const globalToolbarRegistry = new ToolbarToolRegistry(DEFAULT_TOOLBAR_TOOLS);

export interface OrgToolbarProps {
    blockId: string;
    isRendered?: boolean;
    allFolded?: boolean;
    onToggleRender: () => void;
    onToggleFold: () => void;
    registry?: ToolbarToolRegistry;
    tools?: ToolbarTool[];
    extraContext?: Record<string, unknown>;
}

export function OrgToolbar({
    blockId,
    isRendered = false,
    allFolded = false,
    onToggleRender,
    onToggleFold,
    registry = globalToolbarRegistry,
    tools,
    extraContext = {},
}: OrgToolbarProps) {
    const [, setRevision] = useState(0);

    // Subscribe to registry updates for live hotswapping
    useEffect(() => {
        if (!tools && registry) {
            return registry.subscribe(() => setRevision((r) => r + 1));
        }
    }, [registry, tools]);

    const activeTools = tools || registry.getAll();

    const context: ToolbarContext = {
        blockId,
        isRendered,
        allFolded,
        onToggleRender,
        onToggleFold,
        ...extraContext,
    };

    return (
        <div
            className="org-block-toolbar"
            data-gemini-org="toolbar"
            data-gemini-org-block-id={blockId}
        >
            {activeTools.map((tool) => {
                if (tool.isVisible && !tool.isVisible(context)) {
                    return null;
                }

                const title = typeof tool.title === "function" ? tool.title(context) : tool.title;
                const className = typeof tool.className === "function"
                    ? tool.className(context)
                    : tool.className || "org-block-btn";

                return (
                    <button
                        key={tool.id}
                        type="button"
                        className={className}
                        title={title}
                        aria-label={tool.ariaLabel || title}
                        data-gemini-org={`tool-${tool.id}`}
                        data-gemini-org-block-id={blockId}
                        onClick={(e: Event) => {
                            e.stopPropagation();
                            if (tool.onClick) {
                                tool.onClick(context, e);
                            }
                        }}
                    >
                        {tool.render ? tool.render(context) : (
                            <span>{typeof tool.label === "function" ? tool.label(context) : (tool.label || tool.id)}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
