/**
 * Preact Component for Floating HUD Status & Control Panel
 * Consumes SettingsContext and BlockStoreContext for purely reactive control.
 */

import { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { useBlockStore } from "../context/BlockStoreContext.tsx";
import { useSettings } from "../context/SettingsContext.tsx";

export interface HudProps {
    onExportChat?: () => void;
}

export const Hud: FunctionComponent<HudProps> = ({ onExportChat }) => {
    const { settings, updateSettings } = useSettings();
    const blockStore = useBlockStore();
    const [exportStatus, setExportStatus] = useState<string>("📥 Export .org");

    const toggleCollapsed = (e?: MouseEvent) => {
        if (e) e.stopPropagation();
        updateSettings({ hudCollapsed: !settings.hudCollapsed });
    };

    const toggleFullWidth = (e: MouseEvent) => {
        e.stopPropagation();
        updateSettings({ fullWidth: !settings.fullWidth });
    };

    const setWidthPreset = (val: number, e: MouseEvent) => {
        e.stopPropagation();
        updateSettings({ widthPercent: val, fullWidth: true });
    };

    const toggleAutoOrg = (e: MouseEvent) => {
        e.stopPropagation();
        updateSettings({ autoRenderOrg: !settings.autoRenderOrg });
    };

    const handleFontSizeStep = (delta: number, e: MouseEvent) => {
        e.stopPropagation();
        const current = settings.responseFontSize || 100;
        const next = Math.max(75, Math.min(200, current + delta));
        updateSettings({ responseFontSize: next });
    };

    const resetFontSize = (e: MouseEvent) => {
        e.stopPropagation();
        updateSettings({ responseFontSize: 100 });
    };

    const handleExport = (e: MouseEvent) => {
        e.stopPropagation();
        if (onExportChat) {
            onExportChat();
            setExportStatus("✓ Exported!");
            setTimeout(() => setExportStatus("📥 Export .org"), 1500);
        }
    };

    if (settings.hudCollapsed) {
        return (
            <div
                id="orgmod-hud"
                className="minimized"
                data-gemini-org="hud"
                title="OrgUI Settings (Click to expand)"
                onClick={() => updateSettings({ hudCollapsed: false })}
            >
                <div className="orgmod-hud-header" data-gemini-org="hud-header">
                    <span className="orgmod-hud-title">
                        <span className="orgmod-hud-icon">⚡</span>
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div id="orgmod-hud" data-gemini-org="hud">
            {/* Header */}
            <div
                className="orgmod-hud-header"
                id="orgmod-hud-toggle"
                data-gemini-org="hud-header"
                onClick={toggleCollapsed}
            >
                <span className="orgmod-hud-title" data-gemini-org="hud-title">
                    <span className="orgmod-hud-icon">⚡</span>
                    <span className="orgmod-hud-title-text">OrgUI</span>
                </span>
                <span
                    className="orgmod-hud-collapse-icon"
                    id="orgmod-hud-collapse-btn"
                    data-gemini-org="hud-collapse-btn"
                    title="Minimize HUD"
                    onClick={toggleCollapsed}
                >
                    −
                </span>
            </div>

            {/* Body */}
            <div className="orgmod-hud-body" id="orgmod-hud-body" data-gemini-org="hud-body">
                {/* Row 1: Width & Presets */}
                <div className="orgmod-hud-row">
                    <button
                        type="button"
                        className={`orgmod-hud-btn ${settings.fullWidth ? "active" : ""}`}
                        id="orgmod-hud-width"
                        data-gemini-org="hud-width"
                        title="Toggle Full-Screen Width (Alt+W)"
                        onClick={toggleFullWidth}
                    >
                        Width: {settings.fullWidth ? `${settings.widthPercent}%` : "Off"}
                    </button>
                    <div className="orgmod-hud-presets" data-gemini-org="hud-presets">
                        {[80, 90, 94, 100].map((val) => (
                            <button
                                key={val}
                                type="button"
                                className={`orgmod-hud-preset ${
                                    settings.widthPercent === val && settings.fullWidth ? "active" : ""
                                }`}
                                data-gemini-org="hud-preset"
                                onClick={(e) => setWidthPreset(val, e)}
                            >
                                {val}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Auto-Org, Render All, Fold/Unfold All */}
                <div className="orgmod-hud-row">
                    <button
                        type="button"
                        className={`orgmod-hud-btn ${settings.autoRenderOrg ? "active" : ""}`}
                        id="orgmod-hud-auto"
                        data-gemini-org="hud-auto"
                        title="Auto-render Org Mode Blocks"
                        onClick={toggleAutoOrg}
                    >
                        Auto-Org: {settings.autoRenderOrg ? "ON" : "OFF"}
                    </button>
                    <button
                        type="button"
                        className="orgmod-hud-btn"
                        id="orgmod-hud-renderall"
                        data-gemini-org="hud-renderall"
                        title="Toggle Render All Blocks (Alt+O)"
                        onClick={(e) => {
                            e.stopPropagation();
                            blockStore.toggleRenderAll();
                        }}
                    >
                        Render All
                    </button>
                    <button
                        type="button"
                        className="orgmod-hud-btn"
                        id="orgmod-hud-foldall"
                        data-gemini-org="hud-foldall"
                        title="Toggle Fold/Unfold All Rendered Blocks (Alt+F)"
                        onClick={(e) => {
                            e.stopPropagation();
                            blockStore.toggleFoldAll();
                        }}
                    >
                        Fold/Unfold All
                    </button>
                </div>

                {/* Row 3: Response Font Size & Export Chat */}
                <div className="orgmod-hud-row">
                    <span style={{ fontSize: "11px", color: "var(--orgmod-text-muted)" }}>Font:</span>
                    <div className="orgmod-hud-font-stepper">
                        <button
                            type="button"
                            className="orgmod-hud-preset"
                            id="orgmod-hud-font-dec"
                            title="Decrease Response Font Size"
                            onClick={(e) => handleFontSizeStep(-5, e)}
                        >
                            −
                        </button>
                        <span
                            className="orgmod-hud-font-display"
                            id="orgmod-hud-font-val"
                            title="Click to reset font size to 100%"
                            onClick={resetFontSize}
                        >
                            {settings.responseFontSize || 100}%
                        </span>
                        <button
                            type="button"
                            className="orgmod-hud-preset"
                            id="orgmod-hud-font-inc"
                            title="Increase Response Font Size"
                            onClick={(e) => handleFontSizeStep(5, e)}
                        >
                            +
                        </button>
                    </div>
                    <button
                        type="button"
                        className="orgmod-hud-btn"
                        id="orgmod-hud-export"
                        title="Download entire conversation in Org-mode format"
                        onClick={handleExport}
                    >
                        {exportStatus}
                    </button>
                </div>
            </div>
        </div>
    );
};
