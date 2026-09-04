/**
 * Recognized Languages Index and Default Tool Mappings
 * Pure TypeScript data module without JSX syntax.
 */

import { DEFAULT_TOOLBAR_TOOLS } from "./org/components/OrgToolbar.tsx";
import { LanguageDefinition } from "./types.ts";

export const RECOGNIZED_LANGUAGES: LanguageDefinition[] = [
    // 1. Emacs Org-Mode
    {
        id: "org",
        name: "Org Mode",
        aliases: ["org", "org-mode", "orgmode", "text/org"],
        category: "markup",
        fileExtension: ".org",
        description: "Emacs Org-mode structured document format",
        tools: [...DEFAULT_TOOLBAR_TOOLS],
    },

    // 2. Python
    {
        id: "python",
        name: "Python",
        aliases: ["python", "py", "python3", "py3"],
        category: "programming",
        fileExtension: ".py",
        description: "Python programming language",
        tools: [
            {
                id: "copy-clean-python",
                order: 30,
                title: "Copy clean Python source without prompt markers",
                label: "Clean Copy",
                className: () => "org-block-btn",
                onClick: async (ctx) => {
                    const record = ctx.record as { lastText?: string } | undefined;
                    const text = record?.lastText || "";
                    const cleaned = text
                        .split("\n")
                        .map((line) => line.replace(/^(?:>>>|\.\.\.)\s?/, ""))
                        .join("\n");
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                        await navigator.clipboard.writeText(cleaned);
                    }
                },
            },
        ],
    },

    // 3. TypeScript
    {
        id: "typescript",
        name: "TypeScript",
        aliases: ["typescript", "ts", "tsx", "mts", "cts"],
        category: "programming",
        fileExtension: ".ts",
        description: "Typed superset of JavaScript",
        tools: [
            {
                id: "open-ts-playground",
                order: 35,
                title: "Copy TypeScript snippet for playground",
                label: "TS Copy",
                className: () => "org-block-btn",
                onClick: async (ctx) => {
                    const record = ctx.record as { lastText?: string } | undefined;
                    const text = record?.lastText || "";
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                        await navigator.clipboard.writeText(text);
                    }
                },
            },
        ],
    },

    // 4. JavaScript
    {
        id: "javascript",
        name: "JavaScript",
        aliases: ["javascript", "js", "jsx", "mjs", "cjs"],
        category: "programming",
        fileExtension: ".js",
        description: "JavaScript ECMAScript",
    },

    // 5. Rust
    {
        id: "rust",
        name: "Rust",
        aliases: ["rust", "rs"],
        category: "programming",
        fileExtension: ".rs",
        description: "Rust systems programming language",
        tools: [
            {
                id: "copy-rust-snippet",
                order: 30,
                title: "Copy Rust snippet",
                label: "Rust Copy",
                className: () => "org-block-btn",
                onClick: async (ctx) => {
                    const record = ctx.record as { lastText?: string } | undefined;
                    const text = record?.lastText || "";
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                        await navigator.clipboard.writeText(text);
                    }
                },
            },
        ],
    },

    // 6. LaTeX / TeX
    {
        id: "latex",
        name: "LaTeX",
        aliases: ["latex", "tex"],
        category: "math",
        fileExtension: ".tex",
        description: "LaTeX mathematical typesetting and document markup",
        tools: [
            {
                id: "copy-latex-eq",
                order: 30,
                title: "Copy LaTeX equation markup",
                label: "LaTeX Eq",
                className: () => "org-block-btn",
                onClick: async (ctx) => {
                    const record = ctx.record as { lastText?: string } | undefined;
                    const text = record?.lastText || "";
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                        await navigator.clipboard.writeText(text);
                    }
                },
            },
        ],
    },

    // 7. SQL
    {
        id: "sql",
        name: "SQL",
        aliases: ["sql", "mysql", "pgsql", "postgres", "plsql", "sqlite"],
        category: "query",
        fileExtension: ".sql",
        description: "Structured Query Language",
    },

    // 8. Shell / Bash
    {
        id: "bash",
        name: "Bash",
        aliases: ["bash", "sh", "shell", "zsh", "fish"],
        category: "shell",
        fileExtension: ".sh",
        description: "Unix shell script",
        tools: [
            {
                id: "copy-sh-commands",
                order: 30,
                title: "Copy shell commands (stripping $ prompt prefixes)",
                label: "Copy Script",
                className: () => "org-block-btn",
                onClick: async (ctx) => {
                    const record = ctx.record as { lastText?: string } | undefined;
                    const text = record?.lastText || "";
                    const cleaned = text
                        .split("\n")
                        .map((line) => line.replace(/^\$\s+/, ""))
                        .join("\n");
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                        await navigator.clipboard.writeText(cleaned);
                    }
                },
            },
        ],
    },

    // 9. JSON
    {
        id: "json",
        name: "JSON",
        aliases: ["json", "json5", "jsonc"],
        category: "data",
        fileExtension: ".json",
        description: "JavaScript Object Notation",
    },

    // 10. YAML
    {
        id: "yaml",
        name: "YAML",
        aliases: ["yaml", "yml"],
        category: "config",
        fileExtension: ".yaml",
        description: "YAML data serialization format",
    },

    // 11. HTML
    {
        id: "html",
        name: "HTML",
        aliases: ["html", "htm"],
        category: "markup",
        fileExtension: ".html",
        description: "HyperText Markup Language",
    },

    // 12. CSS
    {
        id: "css",
        name: "CSS",
        aliases: ["css", "scss", "sass", "less"],
        category: "markup",
        fileExtension: ".css",
        description: "Cascading Style Sheets",
    },

    // 13. C / C++
    {
        id: "c",
        name: "C",
        aliases: ["c", "h"],
        category: "programming",
        fileExtension: ".c",
        description: "C programming language",
    },
    {
        id: "cpp",
        name: "C++",
        aliases: ["cpp", "c++", "cc", "cxx", "hpp"],
        category: "programming",
        fileExtension: ".cpp",
        description: "C++ programming language",
    },

    // 14. C#
    {
        id: "csharp",
        name: "C#",
        aliases: ["csharp", "c#", "cs"],
        category: "programming",
        fileExtension: ".cs",
        description: "C# .NET language",
    },

    // 15. Java
    {
        id: "java",
        name: "Java",
        aliases: ["java"],
        category: "programming",
        fileExtension: ".java",
        description: "Java language",
    },

    // 16. Go
    {
        id: "go",
        name: "Go",
        aliases: ["go", "golang"],
        category: "programming",
        fileExtension: ".go",
        description: "Go programming language",
    },

    // 17. Ruby
    {
        id: "ruby",
        name: "Ruby",
        aliases: ["ruby", "rb"],
        category: "programming",
        fileExtension: ".rb",
        description: "Ruby programming language",
    },

    // 18. PHP
    {
        id: "php",
        name: "PHP",
        aliases: ["php"],
        category: "programming",
        fileExtension: ".php",
        description: "PHP scripting language",
    },

    // 19. Swift
    {
        id: "swift",
        name: "Swift",
        aliases: ["swift"],
        category: "programming",
        fileExtension: ".swift",
        description: "Swift programming language",
    },

    // 20. Kotlin
    {
        id: "kotlin",
        name: "Kotlin",
        aliases: ["kotlin", "kt"],
        category: "programming",
        fileExtension: ".kt",
        description: "Kotlin programming language",
    },

    // 21. Scala
    {
        id: "scala",
        name: "Scala",
        aliases: ["scala"],
        category: "programming",
        fileExtension: ".scala",
        description: "Scala language",
    },

    // 22. TOML
    {
        id: "toml",
        name: "TOML",
        aliases: ["toml"],
        category: "config",
        fileExtension: ".toml",
        description: "Tom's Obvious Minimal Language",
    },

    // 23. XML / SVG
    {
        id: "xml",
        name: "XML",
        aliases: ["xml", "svg"],
        category: "markup",
        fileExtension: ".xml",
        description: "Extensible Markup Language",
    },

    // 24. Markdown
    {
        id: "markdown",
        name: "Markdown",
        aliases: ["markdown", "md"],
        category: "markup",
        fileExtension: ".md",
        description: "Markdown documentation syntax",
    },

    // 25. GraphQL
    {
        id: "graphql",
        name: "GraphQL",
        aliases: ["graphql", "gql"],
        category: "query",
        fileExtension: ".graphql",
        description: "GraphQL query language",
    },

    // 26. Dockerfile
    {
        id: "dockerfile",
        name: "Dockerfile",
        aliases: ["dockerfile", "docker"],
        category: "config",
        fileExtension: "Dockerfile",
        description: "Docker container specification",
    },

    // 27. Makefile
    {
        id: "makefile",
        name: "Makefile",
        aliases: ["makefile", "make", "cmake"],
        category: "config",
        fileExtension: "Makefile",
        description: "Build automation scripts",
    },

    // 28. R
    {
        id: "r",
        name: "R",
        aliases: ["r"],
        category: "math",
        fileExtension: ".r",
        description: "R statistical computing language",
    },

    // 29. Julia
    {
        id: "julia",
        name: "Julia",
        aliases: ["julia", "jl"],
        category: "math",
        fileExtension: ".jl",
        description: "Julia technical computing language",
    },

    // 30. Lua
    {
        id: "lua",
        name: "Lua",
        aliases: ["lua"],
        category: "programming",
        fileExtension: ".lua",
        description: "Lua scripting language",
    },

    // 31. Perl
    {
        id: "perl",
        name: "Perl",
        aliases: ["perl", "pl"],
        category: "programming",
        fileExtension: ".pl",
        description: "Perl language",
    },

    // 32. Haskell
    {
        id: "haskell",
        name: "Haskell",
        aliases: ["haskell", "hs"],
        category: "programming",
        fileExtension: ".hs",
        description: "Haskell purely functional language",
    },

    // 33. Elixir / Erlang
    {
        id: "elixir",
        name: "Elixir",
        aliases: ["elixir", "ex", "erlang", "erl"],
        category: "programming",
        fileExtension: ".ex",
        description: "Elixir & Erlang concurrent languages",
    },

    // 34. Dart
    {
        id: "dart",
        name: "Dart",
        aliases: ["dart"],
        category: "programming",
        fileExtension: ".dart",
        description: "Dart language",
    },

    // 35. WebAssembly & Assembly
    {
        id: "wasm",
        name: "WebAssembly",
        aliases: ["wasm", "assembly", "asm"],
        category: "programming",
        fileExtension: ".wasm",
        description: "Binary and text assembly formats",
    },

    // 36. Diff / Patch
    {
        id: "diff",
        name: "Diff",
        aliases: ["diff", "patch"],
        category: "other",
        fileExtension: ".diff",
        description: "Unified diff / patch format",
    },

    // 37. Protocol Buffers
    {
        id: "protobuf",
        name: "Protobuf",
        aliases: ["proto", "protobuf"],
        category: "data",
        fileExtension: ".proto",
        description: "Google Protocol Buffers",
    },
];
