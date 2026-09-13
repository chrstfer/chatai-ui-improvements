/**
 * Headless AST Parser and IR Translation contracts.
 */

/**
 * Base AST Node primitive.
 */
export interface AstNode {
    readonly type: string;
    readonly raw?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AstParentNode extends AstNode {
    readonly children: readonly AstNode[];
}

export interface AstLeafNode extends AstNode {
    readonly value: string;
}

export interface AstRootNode extends AstParentNode {
    readonly type: "document" | "root";
    readonly format: string;
}

/**
 * Canonical JSON IR Translator interface.
 */
export interface AstIrTranslator<TNode extends AstNode = AstNode, TIr = unknown> {
    toIr(node: TNode): TIr;
    fromIr(ir: TIr): TNode;
}

/**
 * Headless parser contract for transforming raw text into an AST.
 */
export interface Parser<T = unknown> {
    readonly id: string;
    readonly name: string;
    parse(rawText: string): T;
}

/**
 * Lazy definition for dynamic parser chunk loading.
 */
export interface LazyParserDefinition<T = unknown> {
    readonly formatId: string;
    load(): Promise<Parser<T>>;
}
