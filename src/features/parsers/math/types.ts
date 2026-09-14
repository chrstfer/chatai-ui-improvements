/**
 * Headless LaTeX Math Tokenizer types.
 *
 * Implements two-phase math tokenization per ADR 0001: KaTeX Math and LaTeX Greek
 * Rendering Pipeline and Phase 3 Stage 3 specification.
 */

export type MathDelimiterType =
    | "$"
    | "$$"
    | "\\("
    | "\\["
    | "equation"
    | "align";

export interface MathSpanSlice {
    readonly type: "math";
    readonly raw: string;
    readonly formula: string;
    readonly isDisplay: boolean;
    readonly delimiter: MathDelimiterType;
    readonly start: number;
    readonly end: number;
}

export interface ProseSlice {
    readonly type: "prose";
    readonly text: string;
    readonly start: number;
    readonly end: number;
}

export type MathSlice = MathSpanSlice | ProseSlice;

export interface MathTokenizerOptions {
    readonly allowSingleDollar?: boolean;
    readonly allowParentheses?: boolean;
    readonly allowDoubleDollar?: boolean;
    readonly allowBrackets?: boolean;
    readonly allowEnvironments?: boolean;
}
