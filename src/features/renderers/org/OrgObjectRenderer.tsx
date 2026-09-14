import type { JSX } from "preact";
import type { OrgObject } from "../../parsers/org/index.ts";
import { LatexMathView } from "../../../views/common/LatexMathView.tsx";
import { InlineImageView } from "../../../views/common/InlineImageView.tsx";

export interface OrgObjectRendererProps {
    readonly objects?: readonly OrgObject[] | OrgObject | null;
    readonly onNavigateInternal?: (targetId: string) => void;
}

const IMAGE_EXT_REGEX = /\.(?:png|jpe?g|gif|svg|webp)(?:\?.*)?$/i;

function extractTextFromObjects(objects?: readonly OrgObject[] | OrgObject | null): string {
    if (!objects) return "";
    const items = Array.isArray(objects) ? objects : [objects];
    return items.map((o) => {
        if ("value" in o && typeof o.value === "string") return o.value;
        if ("children" in o && Array.isArray(o.children)) return extractTextFromObjects(o.children);
        return "";
    }).join("");
}

const ENTITY_MAP: Readonly<Record<string, string>> = {
    alpha: "α",
    beta: "β",
    gamma: "γ",
    delta: "δ",
    epsilon: "ε",
    zeta: "ζ",
    eta: "η",
    theta: "θ",
    iota: "ι",
    kappa: "κ",
    lambda: "λ",
    mu: "μ",
    nu: "ν",
    xi: "ξ",
    pi: "π",
    rho: "ρ",
    sigma: "σ",
    tau: "τ",
    upsilon: "υ",
    phi: "φ",
    chi: "χ",
    psi: "ψ",
    omega: "ω",
    Gamma: "Γ",
    Delta: "Δ",
    Theta: "Θ",
    Lambda: "Λ",
    Xi: "Ξ",
    Pi: "Π",
    Sigma: "Σ",
    Upsilon: "Υ",
    Phi: "Φ",
    Psi: "Ψ",
    Omega: "Ω",
    to: "→",
    rightarrow: "→",
    leftarrow: "←",
    Rightarrow: "⇒",
    Leftarrow: "⇐",
    le: "≤",
    ge: "≥",
    ne: "≠",
    pm: "±",
    times: "×",
    div: "÷",
    infty: "∞",
    sum: "∑",
    prod: "∏",
};

export function OrgObjectRenderer({ objects, onNavigateInternal }: OrgObjectRendererProps): JSX.Element | null {
    if (!objects) return null;
    const items = Array.isArray(objects) ? objects : [objects];

    return (
        <>
            {items.map((obj, idx) => {
                switch (obj.type) {
                    case "text":
                        return <span key={idx}>{obj.value}</span>;
                    case "bold":
                        return (
                            <strong key={idx} class="org-bold font-bold">
                                <OrgObjectRenderer objects={obj.children} onNavigateInternal={onNavigateInternal} />
                            </strong>
                        );
                    case "italic":
                        return (
                            <em key={idx} class="org-italic italic">
                                <OrgObjectRenderer objects={obj.children} onNavigateInternal={onNavigateInternal} />
                            </em>
                        );
                    case "underline":
                        return (
                            <u key={idx} class="org-underline underline">
                                <OrgObjectRenderer objects={obj.children} onNavigateInternal={onNavigateInternal} />
                            </u>
                        );
                    case "strike":
                        return (
                            <del key={idx} class="org-strike line-through text-neutral-400 dark:text-neutral-500">
                                <OrgObjectRenderer objects={obj.children} onNavigateInternal={onNavigateInternal} />
                            </del>
                        );
                    case "code":
                        return (
                            <code
                                key={idx}
                                class="org-inline-code font-mono text-xs px-1 py-0.5 rounded bg-neutral-100 text-rose-600 dark:bg-neutral-800 dark:text-rose-400"
                            >
                                {obj.value}
                            </code>
                        );
                    case "verbatim":
                        return (
                            <code
                                key={idx}
                                class="org-inline-verbatim font-mono text-xs px-1 py-0.5 rounded bg-neutral-100 text-teal-600 dark:bg-neutral-800 dark:text-teal-400"
                            >
                                {obj.value}
                            </code>
                        );
                    case "link": {
                        // Image preview detection
                        if (IMAGE_EXT_REGEX.test(obj.url)) {
                            const descText = extractTextFromObjects(obj.description) || undefined;
                            return <InlineImageView key={idx} src={obj.url} title={descText} alt={descText} />;
                        }
                        // Internal headline link
                        if (obj.url.startsWith("*") || obj.url.startsWith("#")) {
                            const target = obj.url.replace(/^[*#]/, "").trim();
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onNavigateInternal?.(target)}
                                    class="org-internal-link text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0 text-left font-inherit"
                                >
                                    {obj.description
                                        ? (
                                            <OrgObjectRenderer
                                                objects={obj.description}
                                                onNavigateInternal={onNavigateInternal}
                                            />
                                        )
                                        : obj.url}
                                </button>
                            );
                        }
                        // External standard URL
                        return (
                            <a
                                key={idx}
                                href={obj.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="org-link text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                            >
                                {obj.description
                                    ? (
                                        <OrgObjectRenderer
                                            objects={obj.description}
                                            onNavigateInternal={onNavigateInternal}
                                        />
                                    )
                                    : obj.url}
                            </a>
                        );
                    }
                    case "macro":
                        return (
                            <span
                                key={idx}
                                class="org-macro font-mono text-xs text-amber-600 dark:text-amber-400"
                                title={obj.raw}
                            >
                                {`{{{${obj.name}}}}`}
                            </span>
                        );
                    case "entity": {
                        const glyph = obj.unicode || ENTITY_MAP[obj.name] || `\\${obj.name}`;
                        return (
                            <span key={idx} class="org-entity font-serif text-base" title={`\\${obj.name}`}>
                                {glyph}
                            </span>
                        );
                    }
                    case "latex_fragment":
                        return <LatexMathView key={idx} value={obj.value} isDisplay={obj.isDisplay} />;
                    case "statistics_cookie":
                        return (
                            <span
                                key={idx}
                                class="org-cookie inline-block text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                                data-percent={obj.percent}
                            >
                                {obj.value}
                            </span>
                        );
                    case "line_break":
                        return <br key={idx} class="org-line-break" />;
                    case "subscript":
                        return (
                            <sub key={idx} class="text-[75%] align-sub">
                                {typeof obj.value === "string" ? obj.value : (
                                    <OrgObjectRenderer
                                        objects={obj.value}
                                        onNavigateInternal={onNavigateInternal}
                                    />
                                )}
                            </sub>
                        );
                    case "superscript":
                        return (
                            <sup key={idx} class="text-[75%] align-super">
                                {typeof obj.value === "string" ? obj.value : (
                                    <OrgObjectRenderer
                                        objects={obj.value}
                                        onNavigateInternal={onNavigateInternal}
                                    />
                                )}
                            </sup>
                        );
                    case "timestamp":
                        return (
                            <span
                                key={idx}
                                class="org-timestamp font-mono text-xs px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                            >
                                {obj.raw}
                            </span>
                        );
                    case "footnote_reference":
                        return (
                            <sup
                                key={idx}
                                class="org-footnote-ref text-[75%] font-mono text-blue-600 dark:text-blue-400"
                            >
                                [{obj.label}]
                            </sup>
                        );
                    case "inline_src_block":
                        return (
                            <code
                                key={idx}
                                class="org-inline-src font-mono text-xs px-1 py-0.5 rounded bg-neutral-900 text-neutral-100 dark:bg-neutral-950"
                            >
                                {obj.body}
                            </code>
                        );
                    default:
                        return null;
                }
            })}
        </>
    );
}
