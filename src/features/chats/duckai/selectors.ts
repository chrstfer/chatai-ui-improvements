/**
 * Centralized CSS selectors for the DuckDuckGo AI (duck.ai) web interface.
 * Strictly adheres to semantic attributes (data-streamdown, data-testid, aria-label)
 * and prohibits generated/ephemeral React hash classes.
 */
export const DUCKAI_SELECTORS = {
    /** Code block root container */
    CODE_BLOCK: 'div[data-streamdown="code-block"]',

    /** Code block language attribute on container */
    LANGUAGE_ATTR: "data-language",

    /** Header toolbar displaying language name */
    CODE_HEADER: 'div[data-streamdown="code-block-header"]',

    /** Action buttons container inside code block */
    CODE_ACTIONS: 'div[data-streamdown="code-block-actions"]',

    /** Native code block copy button */
    CODE_COPY_BUTTON: 'button[data-streamdown="code-block-copy-button"]',

    /** Native code block body wrapping pre and code elements */
    CODE_BODY: 'div[data-streamdown="code-block-body"]',

    /** Data-Island: Authenticated raw code element */
    CODE_CONTENT: "pre > code",

    /** User query container */
    USER_QUERY: 'div[data-testid="user-message"]',

    /** Assistant response message container (excluding inner heading anchor) */
    ASSISTANT_MESSAGE: 'div[id*="-assistant-message-"]:not([id^="heading-"])',

    /** Active response indicator on assistant message */
    ACTIVE_RESPONSE_ATTR: "data-activeresponse",

    /** Settlement signal: footer message actions mounted beneath assistant response */
    MESSAGE_ACTIONS: 'div[data-message-actions="true"]',

    /** In-flight streaming indicator: active (non-disabled) stop generating button */
    STOP_GENERATING_BUTTON: 'button[aria-label="Stop generating"]:not([disabled])',

    /** Left navigation sidebar */
    SIDEBAR: 'section[data-testid="duckai-sidebar"]',

    /** Sidebar chats list container */
    CHATS_LIST: 'div[data-testid="ChatsList"]',

    /** Main scrollable chat conversation viewport (strictly excludes sidebar and ChatsList) */
    MAIN_VIEWPORT:
        "main > section:not([data-testid='duckai-sidebar']):has([data-testid='duckai-top-toolbar']), main > section:not([data-testid='duckai-sidebar'])",

    /** Tables rendered in streamdown markdown */
    TABLE_REGION: 'div[role="region"][aria-label="Table"]',
    TABLE: "table",
    TABLE_HEADER: 'thead[data-streamdown="table-header"]',
    TABLE_BODY: 'tbody[data-streamdown="table-body"]',

    /** Mathematical equations (KaTeX with MathML annotation) */
    KATEX_MATH: ".katex",
    MATHML_TEX_ANNOTATION: 'annotation[encoding="application/x-tex"]',

    /** Theme attribute on documentElement (html) */
    THEME_ATTR: "data-theme",
} as const;

export const DUCKAI_EXTENSION_INJECTED = {
    /** Injected sibling container wrapping our open Shadow Root (aligned with manifest ID) */
    CONTAINER_CLASS: "chatai-rendered-container",
    /** Marker attribute signaling our injector has already processed this code-block */
    PROCESSED_ATTR: "data-ext-processed",
    /** Marker attribute signaling our custom container has successfully mounted */
    MOUNTED_ATTR: "data-ext-mounted",
    /** Layout override marker on parent conversation column */
    CHAT_COLUMN_ATTR: "data-ext-chat-column",
} as const;
