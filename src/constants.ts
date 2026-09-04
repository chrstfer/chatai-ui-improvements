/**
 * Global Constants & Canonical DOM Selectors for Gemini UI
 */

// canonical DOM selectors for Gemini UI
export const SELECTOR_ROOT = ".response-element code-block, response-element code-block, code-block";
export const SELECTOR_DECORATION = ".code-block-decoration, .code-block-decoration-header, header";
export const SELECTOR_LANG_SPAN = ".code-block-decoration-title, .language-label, :scope > span";
export const SELECTOR_CODE_CONTAINER = 'code.code-container[data-test-id="code-content"], code, pre';
export const SELECTOR_ACTIONS = ".buttons, .code-block-decoration-actions, .header-actions";
export const SELECTOR_NOT_PROCESSED = ":not([data-code-processed])";
