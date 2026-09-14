import type { JSX } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ExtensionSettings } from "@internal/contracts/core";
import type { ChatColumnBounds } from "@internal/contracts/chats";
import { createLogger } from "@internal/core/logging";

export interface FloatingHudProps {
    settings: ExtensionSettings;
    onUpdateSettings: (partial: Partial<ExtensionSettings>) => void;
    theme?: "light" | "dark";
    getChatColumnBounds?: () => ChatColumnBounds | null;
}

const WIDTH_PRESETS = [80, 90, 94, 100];
const logger = createLogger("FloatingHUD");

export function FloatingHud({
    settings,
    onUpdateSettings,
    theme = "light",
    getChatColumnBounds,
}: FloatingHudProps): JSX.Element {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(settings.hudCollapsed);
    const [position, setPosition] = useState<
        { x: number; y: number; anchor?: "left" | "right"; rightOffset?: number } | null
    >(
        settings.hudPosition ?? null,
    );
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const justDraggedRef = useRef<boolean>(false);
    const hudRef = useRef<HTMLDivElement | null>(null);

    // Synchronize external settings changes
    useEffect(() => {
        setIsCollapsed(settings.hudCollapsed);
    }, [settings.hudCollapsed]);

    useEffect(() => {
        if (settings.hudPosition) {
            setPosition(settings.hudPosition);
        }
    }, [settings.hudPosition]);

    const [, setRenderTrigger] = useState(0);

    useEffect(() => {
        logger.info("FloatingHud mounted: registering layout listeners and observers");

        const handleLayoutChange = (reason?: string) => {
            logger.debug(`FloatingHud layout update triggered (source: ${reason ?? "unknown"})`);
            setRenderTrigger((prev) => prev + 1);
        };

        const onResize = () => handleLayoutChange("window:resize");
        const onTransitionEnd = () => handleLayoutChange("window:transitionend");
        const onAnimationEnd = () => handleLayoutChange("window:animationend");

        globalThis.addEventListener?.("resize", onResize);
        globalThis.addEventListener?.("transitionend", onTransitionEnd);
        globalThis.addEventListener?.("animationend", onAnimationEnd);

        // Capture clicks on navigation/drawer/menu buttons to trigger immediate layout updates
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as Element | null;
            if (
                target?.closest?.(
                    "button, [role='button'], a, [aria-expanded], [aria-label*='menu' i], [aria-label*='nav' i], [aria-label*='side' i]",
                )
            ) {
                logger.debug("Sidebar/navigation click detected, scheduling layout update");
                handleLayoutChange("nav-button-click");
            }
        };
        if (typeof document !== "undefined") {
            document.addEventListener?.("click", onDocClick, { capture: true, passive: true });
        }

        // Native MutationObserver listening for sidebar expand/collapse attribute toggles
        let mutationObserver: MutationObserver | null = null;
        if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
            const sidebarTarget = document.querySelector("bard-sidenav");
            if (sidebarTarget) {
                mutationObserver = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        if (m.type === "attributes") {
                            logger.debug(
                                `MutationObserver attribute '${m.attributeName}' changed on <${sidebarTarget.nodeName.toLowerCase()}>`,
                            );
                            handleLayoutChange(`mutation:sidebar:${m.attributeName}`);
                            break;
                        }
                    }
                });

                mutationObserver.observe(sidebarTarget, {
                    attributes: true,
                    attributeFilter: ["class", "style", "aria-expanded"],
                });
            }
        }

        // Native ResizeObserver listening for content container size changes
        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined" && typeof document !== "undefined") {
            const contentTarget = document.querySelector("bard-sidenav-content, .conversation-container");
            if (contentTarget) {
                resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        const tag = entry.target?.nodeName?.toLowerCase();
                        logger.debug(`ResizeObserver detected size change on <${tag}>`);
                    }
                    handleLayoutChange("resize-observer");
                });

                try {
                    resizeObserver.observe(contentTarget);
                } catch {
                    // ignore
                }
            }
        }

        return () => {
            logger.info("FloatingHud unmounting: disconnecting listeners and observers");
            globalThis.removeEventListener?.("resize", onResize);
            globalThis.removeEventListener?.("transitionend", onTransitionEnd);
            globalThis.removeEventListener?.("animationend", onAnimationEnd);
            if (typeof document !== "undefined") {
                document.removeEventListener?.("click", onDocClick, { capture: true });
            }
            mutationObserver?.disconnect();
            resizeObserver?.disconnect();
        };
    }, []);

    const computeDefaultPosition = useCallback((): {
        x: number;
        y: number;
        anchor: "left" | "right";
        rightOffset?: number;
    } => {
        const col = getChatColumnBounds?.();
        const winWidth = typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 1200;
        const winHeight = typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 800;
        const hudWidth = isCollapsed ? 36 : (hudRef.current?.offsetWidth ?? 220);
        const hudHeight = isCollapsed ? 36 : (hudRef.current?.offsetHeight ?? 40);

        if (col && col.right > col.left) {
            const promptEl = typeof document !== "undefined"
                ? document.querySelector(
                    ".bottom-container, .input-area-container, .chat-input-container, rich-textarea, form",
                )
                : null;
            const promptTop = promptEl ? promptEl.getBoundingClientRect().top : (col.bottom - 100);
            const x = Math.max(col.left + 16, col.right - hudWidth - 16);
            const y = Math.max(col.top + 16, Math.min(col.bottom - hudHeight - 16, promptTop - hudHeight - 32));
            const rightOffset = Math.max(16, winWidth - (col.right - 16));
            return { x, y, anchor: "right", rightOffset };
        }

        return {
            x: winWidth - hudWidth - 24,
            y: winHeight - hudHeight - 80,
            anchor: "right",
            rightOffset: 24,
        };
    }, [getChatColumnBounds, isCollapsed]);

    const effectivePos = position ?? computeDefaultPosition();

    const dragStartRef = useRef<
        {
            pointerX: number;
            pointerY: number;
            startX: number;
            startY: number;
            hasMoved: boolean;
        } | null
    >(null);

    const handlePointerDown = useCallback((e: {
        button: number;
        clientX: number;
        clientY: number;
        pointerId: number;
        currentTarget: {
            setPointerCapture?: (id: number) => void;
        };
    }) => {
        // Only drag on primary click
        if (e.button !== 0) return;

        const hudEl = hudRef.current;
        const rect = hudEl ? hudEl.getBoundingClientRect() : { left: effectivePos.x, top: effectivePos.y };

        dragStartRef.current = {
            pointerX: e.clientX,
            pointerY: e.clientY,
            startX: rect.left,
            startY: rect.top,
            hasMoved: false,
        };
        setIsDragging(true);

        const target = e.currentTarget;
        target.setPointerCapture?.(e.pointerId);
    }, [effectivePos]);

    const handlePointerMove = useCallback((e: { clientX: number; clientY: number }) => {
        if (!dragStartRef.current) return;

        const deltaX = e.clientX - dragStartRef.current.pointerX;
        const deltaY = e.clientY - dragStartRef.current.pointerY;

        if (Math.hypot(deltaX, deltaY) > 3) {
            dragStartRef.current.hasMoved = true;
        }

        const rawX = dragStartRef.current.startX + deltaX;
        const rawY = dragStartRef.current.startY + deltaY;

        const winWidth = typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 1200;
        const winHeight = typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 800;
        const hudWidth = isCollapsed ? 36 : (hudRef.current?.offsetWidth ?? 220);
        const hudHeight = isCollapsed ? 36 : (hudRef.current?.offsetHeight ?? 40);

        const col = getChatColumnBounds?.();
        const minX = col ? col.left + 16 : 16;
        const maxX = col ? Math.max(minX, col.right - hudWidth - 16) : (winWidth - hudWidth - 16);
        const minY = col ? col.top + 16 : 16;
        const maxY = col ? Math.max(minY, col.bottom - hudHeight - 16) : (winHeight - hudHeight - 16);

        const clampedX = Math.max(minX, Math.min(maxX, rawX));
        const clampedY = Math.max(minY, Math.min(maxY, rawY));

        setPosition({ x: clampedX, y: clampedY, anchor: effectivePos.anchor });
    }, [isCollapsed, getChatColumnBounds, effectivePos.anchor]);

    const handleToggleCollapse = useCallback(() => {
        setIsCollapsed((prev) => {
            const next = !prev;
            logger.info(`FloatingHud toggle collapse: ${prev} -> ${next}`);
            onUpdateSettings({ hudCollapsed: next });
            return next;
        });
    }, [onUpdateSettings]);

    const handlePointerUp = useCallback((e: {
        pointerId?: number;
        currentTarget?: {
            releasePointerCapture?: (id: number) => void;
        };
    }) => {
        if (!dragStartRef.current) return;
        const wasClick = !dragStartRef.current.hasMoved;
        const moved = dragStartRef.current.hasMoved;
        dragStartRef.current = null;
        setIsDragging(false);

        try {
            if (e.pointerId !== undefined) {
                e.currentTarget?.releasePointerCapture?.(e.pointerId);
            }
        } catch {
            /* ignore pointer capture release error */
        }

        if (moved) {
            justDraggedRef.current = true;
            setTimeout(() => {
                justDraggedRef.current = false;
            }, 100);

            const winWidth = typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 1200;
            const hudWidth = isCollapsed ? 36 : (hudRef.current?.offsetWidth ?? 220);
            const col = getChatColumnBounds?.();

            let finalX = effectivePos.x;
            let anchor: "left" | "right" = "right";

            if (col && col.right > col.left) {
                const distToRight = col.right - (effectivePos.x + hudWidth);
                const distToLeft = effectivePos.x - col.left;

                if (distToRight <= 32) {
                    finalX = col.right - hudWidth - 16;
                } else if (distToLeft <= 32) {
                    finalX = col.left + 16;
                }

                const colMid = (col.left + col.right) / 2;
                anchor = (finalX + hudWidth / 2 >= colMid) ? "right" : "left";
            } else {
                const mid = winWidth / 2;
                anchor = (finalX + hudWidth / 2 >= mid) ? "right" : "left";
            }

            const currentRight = finalX + hudWidth;
            const rightOffset = Math.max(16, winWidth - currentRight);
            const nextPos = { x: finalX, y: effectivePos.y, anchor, rightOffset };
            logger.info(
                `FloatingHud drag settled at x=${finalX}, y=${effectivePos.y}, anchor=${anchor}, rightOffset=${rightOffset}`,
            );
            setPosition(nextPos);
            onUpdateSettings({ hudPosition: nextPos });
        } else if (wasClick) {
            // Click will be handled by onClick handler
        }
    }, [effectivePos, isCollapsed, onUpdateSettings, getChatColumnBounds]);

    const handleToggleWidth = useCallback(() => {
        const next = !settings.fullWidth;
        logger.info(`FloatingHud toggle width: ${settings.fullWidth} -> ${next}`);
        onUpdateSettings({ fullWidth: next });
    }, [settings.fullWidth, onUpdateSettings]);

    const handleSelectPreset = useCallback((preset: number) => {
        logger.info(`FloatingHud select width preset: ${preset}%`);
        onUpdateSettings({ widthPercent: preset, fullWidth: true });
    }, [onUpdateSettings]);

    const winWidth = typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 1200;
    const hudWidth = isCollapsed ? 36 : (hudRef.current?.offsetWidth ?? 220);
    const currentAnchor = effectivePos.anchor ?? "right";

    const col = getChatColumnBounds?.();
    const minX = col ? col.left + 16 : 16;
    const maxX = col ? Math.max(minX, col.right - hudWidth - 16) : (winWidth - hudWidth - 16);

    let styleObj: Record<string, string | number>;
    if (isDragging) {
        const renderedX = Math.max(minX, Math.min(maxX, effectivePos.x));
        styleObj = {
            left: `${renderedX}px`,
            top: `${effectivePos.y}px`,
            right: "auto",
            bottom: "auto",
            zIndex: 999999,
        };
    } else if (currentAnchor === "right") {
        // Pinned to the right: HUD collapses toward the right edge (right offset remains constant)
        const colRightBoundary = col ? col.right : winWidth;
        const minRightOffset = Math.max(16, winWidth - colRightBoundary + 16);
        const savedRightOffset = effectivePos.rightOffset ??
            (winWidth - (effectivePos.x + (isCollapsed ? 36 : 220)));
        const finalRightOffset = Math.max(minRightOffset, savedRightOffset);

        styleObj = {
            right: `${finalRightOffset}px`,
            top: `${effectivePos.y}px`,
            left: "auto",
            bottom: "auto",
            zIndex: 999999,
        };
    } else {
        // Pinned to the left: HUD collapses toward the left edge (left offset remains constant)
        const renderedX = Math.max(minX, Math.min(maxX, effectivePos.x));
        const finalLeft = col ? Math.max(col.left + 16, renderedX) : renderedX;
        styleObj = {
            left: `${finalLeft}px`,
            top: `${effectivePos.y}px`,
            right: "auto",
            bottom: "auto",
            zIndex: 999999,
        };
    }

    const isDark = theme === "dark";
    styleObj.outline = isDark ? "1.5px solid rgba(255, 255, 255, 0.25)" : "1.5px solid rgba(0, 0, 0, 0.15)";
    styleObj.boxShadow = isDark
        ? "0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)"
        : "0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.1)";

    // 1. Collapsed State: Compact 36x36px Square Button with Icon
    if (isCollapsed) {
        return (
            <div
                ref={hudRef}
                class={`ext-hud ext-hud-collapsed fixed z-[999999] flex items-center justify-center w-9 h-9 font-mono text-xs select-none backdrop-blur-md rounded-xl border border-neutral-300 dark:border-neutral-600 outline outline-black/15 dark:outline-white/25 bg-white/95 dark:bg-[#1e1f20]/95 shadow-xl text-neutral-800 dark:text-neutral-200 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-105 transition-transform ${
                    isDragging ? "transition-none cursor-grabbing" : ""
                } ${isDark ? "dark" : ""}`}
                data-theme={theme}
                style={styleObj}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onClick={() => {
                    if (!justDraggedRef.current) {
                        handleToggleCollapse();
                    }
                }}
                title="AI Chat UI (Click to expand)"
                aria-label="Expand AI Chat HUD"
            >
                <span class="text-sm font-bold text-sky-600 dark:text-sky-400 pointer-events-none select-none">
                    ⚡
                </span>
            </div>
        );
    }

    // 2. Expanded State: Full Floating Control Panel
    return (
        <div
            ref={hudRef}
            class={`ext-hud fixed z-[999999] flex flex-col font-mono text-xs select-none backdrop-blur-md rounded-xl border border-neutral-300 dark:border-neutral-600 outline outline-black/15 dark:outline-white/25 bg-white/95 dark:bg-[#1e1f20]/95 shadow-2xl text-neutral-800 dark:text-neutral-200 min-w-[210px] ${
                isDragging ? "transition-none" : "transition-colors duration-150"
            } ${isDark ? "dark" : ""}`}
            data-theme={theme}
            style={styleObj}
        >
            {/* Draggable & Clickable Header to collapse */}
            <div
                class={`ext-hud-header flex items-center justify-between px-3 py-1.5 border-b border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-100/60 dark:bg-neutral-800/60 select-none rounded-t-xl cursor-pointer hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors ${
                    isDragging ? "cursor-grabbing" : ""
                }`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onClick={(e) => {
                    if (justDraggedRef.current) return;
                    const target = e.target as HTMLElement | null;
                    if (target?.closest?.(".ext-hud-collapse-btn")) return;
                    handleToggleCollapse();
                }}
                title="AI Chat UI (Click header to collapse)"
            >
                <div class="ext-hud-title font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 pointer-events-none">
                    <span>⚡ AI Chat UI</span>
                </div>
                <button
                    type="button"
                    class="ext-hud-collapse-btn p-0.5 px-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer text-xs font-bold transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCollapse();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    aria-label="Collapse HUD"
                    title="Collapse HUD"
                >
                    −
                </button>
            </div>

            {/* Expandable Controls Body */}
            <div class="ext-hud-body flex flex-col gap-2 p-2.5">
                <div class="ext-hud-row flex items-center justify-between gap-2">
                    <button
                        type="button"
                        class={`ext-hud-width-btn px-2.5 py-1 rounded text-[11px] font-medium transition-colors border cursor-pointer inline-flex items-center gap-1 ${
                            settings.fullWidth
                                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/40 font-semibold"
                                : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        }`}
                        onClick={handleToggleWidth}
                        title="Toggle Full-Screen Chat Width"
                    >
                        {settings.fullWidth ? `Width: ${settings.widthPercent}%` : "Width: Off"}
                    </button>

                    <div class="ext-hud-presets inline-flex gap-0.5 p-0.5 bg-neutral-100 dark:bg-neutral-800/80 rounded border border-neutral-200 dark:border-neutral-700/60">
                        {WIDTH_PRESETS.map((val) => {
                            const isActive = settings.fullWidth && settings.widthPercent === val;
                            return (
                                <button
                                    key={val}
                                    type="button"
                                    class={`ext-hud-preset-btn px-1.5 py-0.5 text-[10px] rounded cursor-pointer transition-colors ${
                                        isActive
                                            ? "bg-sky-500 text-white dark:bg-sky-600 font-bold shadow-xs"
                                            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                                    }`}
                                    onClick={() => handleSelectPreset(val)}
                                    title={`Set Chat Width to ${val}%`}
                                    data-val={val}
                                >
                                    {val}%
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
