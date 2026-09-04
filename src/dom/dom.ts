/**
 * DOM Management Types
 */

import { OrgDocument } from "../languages/org/types/ast.ts";

export interface CodeBlockRecord {
    id: string;
    blockEl: HTMLElement;
    preEl: HTMLElement;
    codeEl: HTMLElement;
    mountEl: HTMLElement;
    renderedEl?: HTMLElement;
    toolbarMountEl?: HTMLElement;
    isRendered: boolean;
    allFolded: boolean;
    lastText: string;
    lang?: string;
    cachedDoc?: OrgDocument;
}

export interface BlockDomStructure {
    decoration: HTMLElement | null;
    codeContainer: HTMLElement;
    preEl: HTMLElement;
}
