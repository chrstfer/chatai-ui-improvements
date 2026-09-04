/**
 * Preact Component for Top-Right Version Overlay Window
 */

import { FunctionComponent, h, render } from "preact";

declare const __BUILD_VERSION__: string | undefined;
declare const chrome: { runtime?: { getManifest?: () => { version?: string } } } | undefined;
declare const browser: { runtime?: { getManifest?: () => { version?: string } } } | undefined;

export interface VersionOverlayProps {
    version?: string;
}

export function getBuildVersion(): string {
    if (typeof __BUILD_VERSION__ !== "undefined" && __BUILD_VERSION__) {
        return __BUILD_VERSION__;
    }
    try {
        if (typeof chrome !== "undefined" && chrome?.runtime?.getManifest) {
            const manifest = chrome.runtime.getManifest();
            if (manifest?.version) return manifest.version;
        }
        if (typeof browser !== "undefined" && browser?.runtime?.getManifest) {
            const manifest = browser.runtime.getManifest();
            if (manifest?.version) return manifest.version;
        }
    } catch {
        // Fallback for test/local environments
    }
    return "0.1.0-dev";
}

export const VersionOverlay: FunctionComponent<VersionOverlayProps> = ({ version }) => {
    const displayVersion = version || getBuildVersion();

    return (
        <div
            id="orgmod-version-overlay"
            className="orgmod-version-overlay"
            data-gemini-org="version-overlay"
            title="Gemini Org UI Build Version"
        >
            <div className="orgmod-version-overlay-header">
                <span className="orgmod-version-dot"></span>
                <span className="orgmod-version-label">version number:</span>
                <span className="orgmod-version-value">{displayVersion}</span>
            </div>
        </div>
    );
};

export function mountVersionOverlay(): void {
    if (typeof document === "undefined") return;
    if (document.getElementById("orgmod-version-overlay-root")) return;

    const rootEl = document.createElement("div");
    rootEl.id = "orgmod-version-overlay-root";
    rootEl.setAttribute("data-gemini-org", "version-overlay-root");
    document.body.appendChild(rootEl);

    render(h(VersionOverlay, {}), rootEl);
}
