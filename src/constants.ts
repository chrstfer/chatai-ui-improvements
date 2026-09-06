/**
 * Global Constants & Canonical DOM Selectors for Gemini UI
 */

// canonical DOM selectors for Gemini UI
export const SELECTOR_ROOT = "code-block, .code-block, div[class*='code-block'], response-element code-block, .response-element code-block";
export const SELECTOR_DECORATION = ".code-block-decoration, .code-block-decoration-header, header, [class*='code-block-decoration'], .header-formatted";
export const SELECTOR_LANG_SPAN = ".code-block-decoration-title, .language-label, [class*='code-block-decoration-title'], :scope > span, span";
export const SELECTOR_CODE_CONTAINER = 'code.code-container[data-test-id="code-content"], code, pre';
export const SELECTOR_ACTIONS = ".buttons, .code-block-decoration-actions, .header-actions, [class*='code-block-decoration-actions'], [class*='header-actions']";
export const SELECTOR_NOT_PROCESSED = ":not([data-code-processed])";
