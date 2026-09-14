import { registerHostTheme } from "@internal/styles";

/**
 * Host-specific styling and font inheritance tokens for Google Gemini.
 */
export const GEMINI_THEME_CSS = `
:host {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
`;

registerHostTheme("gemini", GEMINI_THEME_CSS);
