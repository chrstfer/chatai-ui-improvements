/**
 * Reusable evaluation script for verifying generic layout and HUD settings dispatch across any host.
 */
(() => {
    const hudRoot = document.getElementById("ext-ai-chat-hud-root");
    if (!hudRoot) {
        return { success: false, error: "HUD root #ext-ai-chat-hud-root not found in document" };
    }

    const shadowRoot = hudRoot.shadowRoot;
    if (!shadowRoot) {
        return { success: false, error: "HUD root has no open shadow root" };
    }

    const hudCollapsed = shadowRoot.querySelector(".ext-hud-collapsed") !== null;
    const hudExpanded = shadowRoot.querySelector(".ext-hud-body") !== null;
    const currentTheme = hudRoot.getAttribute("data-theme") || "unknown";

    const widthBtn = shadowRoot.querySelector(".ext-hud-width-btn");
    const widthBtnText = widthBtn ? widthBtn.textContent.trim() : null;

    return {
        success: true,
        hudCollapsed,
        hudExpanded,
        currentTheme,
        widthBtnText,
    };
})();
