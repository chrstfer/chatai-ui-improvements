import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, tokenizeInline } from "../src/languages/org/parser/inline-lexer.ts";

describe("inline-lexer", () => {
    it("escapeHtml safely escapes XML/HTML characters", () => {
        assert.equal(
            escapeHtml(`<div>"Hello" & 'World'</div>`),
            `&lt;div&gt;&quot;Hello&quot; &amp; &#039;World&#039;&lt;/div&gt;`,
        );
    });

    it("parses links as link tokens with target and description without href anchors", () => {
        const input = "Visit [[https://example.com/api/v1/user_profile][User Profile API]] for details.";
        const tokens = tokenizeInline(input);

        const linkToken = tokens.find((t) => t.type === "link");
        assert.ok(linkToken);
        assert.equal(linkToken.value, "User Profile API");
        assert.equal(linkToken.target, "https://example.com/api/v1/user_profile");
    });

    it("parses inline LaTeX math ($...$ and \\(...\\))", () => {
        const input = "Probability $P(k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}$ and \\(\\sqrt{x^2 + y^2}\\)";
        const tokens = tokenizeInline(input);

        const mathTokens = tokens.filter((t) => t.type === "latex_inline");
        assert.equal(mathTokens.length, 2);
        assert.equal(mathTokens[0].value, "P(k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}");
        assert.equal(mathTokens[1].value, "\\sqrt{x^2 + y^2}");
    });

    it("formatting tokens (bold, italic, underline, strike, code, verbatim)", () => {
        const input = "This is *bold*, /italic/, _underline_, +strike+, ~const x = 1~ and =verbatim=";
        const tokens = tokenizeInline(input);

        assert.ok(tokens.some((t) => t.type === "bold" && t.value === "bold"));
        assert.ok(tokens.some((t) => t.type === "italic" && t.value === "italic"));
        assert.ok(tokens.some((t) => t.type === "underline" && t.value === "underline"));
        assert.ok(tokens.some((t) => t.type === "strike" && t.value === "strike"));
        assert.ok(tokens.some((t) => t.type === "code" && t.value === "const x = 1"));
        assert.ok(tokens.some((t) => t.type === "verbatim" && t.value === "verbatim"));
    });

    it("timestamps, planning, priorities, stats cookies, footnotes", () => {
        const input = "DEADLINE: <2026-08-28 Fri 15:00> SCHEDULED: <2026-08-27> CLOSED: [2026-08-26] [#A] [2/5] [fn:1]";
        const tokens = tokenizeInline(input);

        assert.ok(tokens.some((t) => t.type === "planning" && t.value === "DEADLINE"));
        assert.ok(tokens.some((t) => t.type === "planning" && t.value === "SCHEDULED"));
        assert.ok(tokens.some((t) => t.type === "planning" && t.value === "CLOSED"));
        assert.ok(tokens.some((t) => t.type === "priority" && t.value === "A"));
        assert.ok(tokens.some((t) => t.type === "stats_cookie" && t.value === "2/5"));
        assert.ok(tokens.some((t) => t.type === "footnote" && t.value === "1"));
    });
});
