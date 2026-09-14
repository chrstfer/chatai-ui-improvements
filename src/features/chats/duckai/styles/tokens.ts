import { registerHostTheme } from "../../../../styles/adoptedStyleSheets.ts";

/**
 * Host-specific styling and font inheritance tokens for DuckDuckGo AI.
 */
export const DUCKAI_THEME_CSS = `
:host {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
`;

registerHostTheme("duckai", DUCKAI_THEME_CSS);
