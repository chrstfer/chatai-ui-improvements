/**
 * Math Parser and Tokenizer barrel.
 * Exposes explicit named public types and tokenizer facade.
 */

export type { MathDelimiterType, MathSlice, MathSpanSlice, MathTokenizerOptions, ProseSlice } from "./types.ts";
export { tokenizeMathSpans } from "./mathTokenizer.ts";
