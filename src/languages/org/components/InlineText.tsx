/**
 * Inline Org Text Renderer
 * Renders bold, italic, underline, strike, code, verbatim, math, non-href links, timestamps.
 */

import { tokenizeInline } from "../parser/inline-lexer.ts";
import { Latex } from "./Latex.tsx";

interface InlineTextProps {
    text: string;
}

export function InlineText({ text }: InlineTextProps) {
    if (!text) return null;
    const tokens = tokenizeInline(text);

    return (
        <>
            {tokens.map((token, index) => {
                switch (token.type) {
                    case "bold":
                        return <strong key={index} className="org-bold">{token.value}</strong>;
                    case "italic":
                        return <em key={index} className="org-italic">{token.value}</em>;
                    case "underline":
                        return <span key={index} className="org-underline">{token.value}</span>;
                    case "strike":
                        return <span key={index} className="org-strike">{token.value}</span>;
                    case "verbatim":
                        return <code key={index} className="org-verbatim">{token.value}</code>;
                    case "code":
                        return <code key={index} className="org-code">{token.value}</code>;
                    case "latex_inline":
                        return <Latex key={index} math={token.value} display={false} />;
                    case "link":
                        return (
                            <span
                                key={index}
                                className="org-link-badge"
                                title={token.target ? `Org Link: ${token.target}` : undefined}
                            >
                                {token.value}
                            </span>
                        );
                    case "timestamp":
                        return (
                            <span
                                key={index}
                                className={token.extra?.active === "true"
                                    ? "org-timestamp org-timestamp-active"
                                    : "org-timestamp org-timestamp-inactive"}
                            >
                                {token.value}
                            </span>
                        );
                    case "planning":
                        return (
                            <span key={index} className={`org-planning org-${token.value.toLowerCase()}`}>
                                <strong className="org-kw">{token.value}:</strong> {token.target}
                            </span>
                        );
                    case "priority":
                        return (
                            <span key={index} className={`org-priority org-priority-${token.value}`}>
                                [#{token.value}]
                            </span>
                        );
                    case "stats_cookie":
                        return <span key={index} className="org-stats-cookie">[{token.value}]</span>;
                    case "footnote":
                        return <span key={index} className="org-footnote-badge">[{token.value}]</span>;
                    case "text":
                    default:
                        return token.value;
                }
            })}
        </>
    );
}
