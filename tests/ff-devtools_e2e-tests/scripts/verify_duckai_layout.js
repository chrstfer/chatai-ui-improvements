/**
 * Reusable evaluation script for Firefox DevTools MCP E2E verification of Duck.ai.
 * Evaluates host widening, CSS variable injection, and HUD / codeblock injection state.
 */
(() => {
    const errors = [];
    const layoutStyle = document.getElementById("ext-duckai-layout");
    const hasLayoutStyle = layoutStyle !== null;
    if (!hasLayoutStyle) errors.push("Missing #ext-duckai-layout style element in head");

    const maxWidthVar = getComputedStyle(document.documentElement).getPropertyValue("--ext-chat-max-width").trim();
    const isFullWidthClass = document.body.classList.contains("ext-fullwidth-active");

    const hudRoot = document.getElementById("ext-ai-chat-hud-root");
    const hasHud = hudRoot !== null;
    const hasHudShadow = hudRoot ? !!hudRoot.shadowRoot : false;

    const injectedContainers = document.querySelectorAll(".ext-chat-container-injected");
    const injectedCount = injectedContainers.length;

    const dataTheme = document.documentElement.getAttribute("data-theme") ||
        (document.body.classList.contains("dark") ? "dark" : "light");

    return {
        success: errors.length === 0,
        host: "duckai",
        hasLayoutStyle,
        maxWidthVar,
        isFullWidthClass,
        hasHud,
        hasHudShadow,
        injectedCount,
        dataTheme,
        errors,
    };
})();
