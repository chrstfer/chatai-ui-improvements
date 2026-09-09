import type { JSX } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ExtensionSettings } from "../../core/storage/settings.ts";

export interface FloatingHudProps {
    settings: ExtensionSettings;
    onUpdateSettings: (partial: Partial<ExtensionSettings>) => void;
    theme?: "light" | "dark";
}

const WIDTH_PRESETS = [80, 90, 94, 100];

export function FloatingHud({
    settings,
    onUpdateSettings,
    theme = "light",
}: FloatingHudProps): JSX.Element {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(settings.hudCollapsed);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(
        settings.hudPosition ?? null,
    );
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // Synchronize external settings changes
    useEffect(() => {
        setIsCollapsed(settings.hudCollapsed);
    }, [settings.hudCollapsed]);

    useEffect(() => {
        if (settings.hudPosition) {
            setPosition(settings.hudPosition);
        }
    }, [settings.hudPosition]);

    const dragStartRef = useRef<
        {
            pointerX: number;
            pointerY: number;
            startX: number;
            startY: number;
        } | null
    >(null);

    const hudRef = useRef<HTMLDivElement | null>(null);

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
        const rect = hudEl ? hudEl.getBoundingClientRect() : { left: 0, top: 0 };
        const currentX = position ? position.x : rect.left;
        const currentY = position ? position.y : rect.top;

        dragStartRef.current = {
            pointerX: e.clientX,
            pointerY: e.clientY,
            startX: currentX,
            startY: currentY,
        };
        setIsDragging(true);

        const target = e.currentTarget;
        target.setPointerCapture?.(e.pointerId);
    }, [position]);

    const handlePointerMove = useCallback((e: { clientX: number; clientY: number }) => {
        if (!dragStartRef.current) return;

        const deltaX = e.clientX - dragStartRef.current.pointerX;
        const deltaY = e.clientY - dragStartRef.current.pointerY;

        const rawX = dragStartRef.current.startX + deltaX;
        const rawY = dragStartRef.current.startY + deltaY;

        // Clamp to viewport boundaries
        const winWidth = typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 1200;
        const winHeight = typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 800;
        const hudWidth = hudRef.current?.offsetWidth ?? 220;
        const hudHeight = hudRef.current?.offsetHeight ?? 40;

        const clampedX = Math.max(10, Math.min(winWidth - hudWidth - 10, rawX));
        const clampedY = Math.max(10, Math.min(winHeight - hudHeight - 10, rawY));

        setPosition({ x: clampedX, y: clampedY });
    }, []);

    const handlePointerUp = useCallback((e: {
        pointerId?: number;
        currentTarget?: {
            releasePointerCapture?: (id: number) => void;
        };
    }) => {
        if (!dragStartRef.current) return;
        dragStartRef.current = null;
        setIsDragging(false);

        try {
            if (e.pointerId !== undefined) {
                e.currentTarget?.releasePointerCapture?.(e.pointerId);
            }
        } catch {
            /* ignore pointer capture release error */
        }

        if (position) {
            onUpdateSettings({ hudPosition: position });
        }
    }, [position, onUpdateSettings]);

    const handleToggleCollapse = useCallback((e: { stopPropagation(): void }) => {
        e.stopPropagation();
        const next = !isCollapsed;
        setIsCollapsed(next);
        onUpdateSettings({ hudCollapsed: next });
    }, [isCollapsed, onUpdateSettings]);

    const handleToggleWidth = useCallback(() => {
        const next = !settings.fullWidth;
        onUpdateSettings({ fullWidth: next });
    }, [settings.fullWidth, onUpdateSettings]);

    const handleSelectPreset = useCallback((preset: number) => {
        onUpdateSettings({ widthPercent: preset, fullWidth: true });
    }, [onUpdateSettings]);

    const styleObj: Record<string, string | number> = position
        ? {
            left: `${position.x}px`,
            top: `${position.y}px`,
            bottom: "auto",
            right: "auto",
        }
        : {
            bottom: "20px",
            right: "24px",
        };

    return (
        <div
            ref={hudRef}
            class={`ext-hud fixed z-[99999] flex flex-col font-mono text-xs select-none backdrop-blur-md rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-[#1e1f20]/95 shadow-2xl text-neutral-800 dark:text-neutral-200 transition-all duration-150 ${
                isCollapsed ? "w-auto" : "min-w-[210px]"
            }`}
            data-theme={theme}
            style={styleObj}
        >
            {/* Draggable Header */}
            <div
                class={`ext-hud-header flex items-center justify-between px-3 py-1.5 border-b border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-100/60 dark:bg-neutral-800/60 select-none rounded-t-xl ${
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div class="ext-hud-title font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 pointer-events-none">
                    <span>⚡ AI Chat UI</span>
                </div>
                <button
                    type="button"
                    class="ext-hud-collapse-btn p-0.5 px-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer text-xs font-bold transition-colors"
                    onClick={handleToggleCollapse}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label={isCollapsed ? "Expand HUD" : "Collapse HUD"}
                    title={isCollapsed ? "Expand HUD" : "Collapse HUD"}
                >
                    {isCollapsed ? "+" : "−"}
                </button>
            </div>

            {/* Expandable Controls Body */}
            {!isCollapsed && (
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
            )}
        </div>
    );
}
