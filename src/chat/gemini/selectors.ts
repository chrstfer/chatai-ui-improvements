/**
 * Centralized CSS selectors for the Google Gemini web interface.
 */
export const GEMINI_SELECTORS = {
    /** Scroll container holding the conversation history */
    SCROLLER: "chat-window chat-window-content infinite-scroller, #chat-history",

    /** Discrete conversational turn container */
    TURN_CONTAINER: "div.conversation-container[id]",

    /** User query container and line elements */
    USER_QUERY: ".user-query-container, .query-text",
    USER_QUERY_LINE: ".query-text-line",

    /** Model turn container within the conversation turn */
    MODEL_TURN: ".model-turn, .response-container",

    /** Model response markdown element wrapper */
    RESPONSE_ELEMENT: "response-element",

    /** Native Gemini code block custom element */
    CODE_BLOCK: "code-block",

    /** Header toolbar containing copy button, export button, and language tag */
    CODE_HEADER: ".code-block-decoration, .header-formatted",

    /** Direct text node or element indicating code language or snippet type */
    LANGUAGE_TAG: ".code-block-decoration span, .header-formatted span, span.language-name",

    /** Data-Island: Read-only preformatted code element */
    CODE_CONTENT: "pre > code[data-test-id='code-content']",

    /** Completion signal: footer message actions element indicates turn is finished */
    RESPONSE_FOOTER_ACTIONS: ".response-container-footer message-actions[footer]",

    /** Action buttons within the turn (copy, thumbs up, etc.) */
    TURN_ACTIONS: "message-actions",

    /** Class/attribute indicating active dark mode */
    DARK_THEME_CLASS: "dark-theme",
} as const;

export const EXTENSION_INJECTED = {
    /** Injected sibling container wrapping our open Shadow Root */
    CONTAINER_CLASS: "orgmod-rendered-container",
    /** Marker attribute signaling our injector has already processed this code-block */
    PROCESSED_ATTR: "data-ext-processed",
    /** Marker attribute signaling our custom container has successfully mounted */
    MOUNTED_ATTR: "data-ext-mounted",
} as const;
