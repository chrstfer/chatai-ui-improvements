/**
 * Universal Structured Message Container Component
 * General wrapper providing unified folding, collapsed summary badges,
 * portal toolbars, and active rendered view projection for any message box in the DOM.
 */
import { SELECTOR_LANG_SPAN } from "../constants.ts";
import { ComponentChildren, createPortal } from "preact";
//import { useEffect, useMemo, useState } from "preact/hooks";
// import { BlockStore, computeContentFingerprint, globalBlockStore } from "../state/BlockStoreContext.tsx";


// import { OrgToolbar, ToolbarTool } from "./org/index.ts";

export interface StructuredMessageContainerProps {
    id: string;
    rawText?: string;
    rawElement?: HTMLElement | null;
    headerActionsEl?: HTMLElement | null;
    //    blockStore?: BlockStore;
    autoRender?: boolean;
    //    tools?: ToolbarTool[];
    summaryLabel?: string;
    lineCount?: number;
    extraContext?: Record<string, unknown>;
    children?: ComponentChildren | ((ctx: { allFolded: boolean; isRendered: boolean }) => ComponentChildren);
    onToggleFold?: (folded: boolean) => void;
    onToggleRender?: (rendered: boolean) => void;
}

export const StructuredMessageContainer = ({ type, hostElement }: { type: 'user' | 'model', hostElement: HTMLElement }) => {
    // Locate exactly where the toolbar and content should be injected safely
    const toolbarSlot = hostElement.querySelector('.message-actions-container');
    const messageContentElements = Array.from(
    // const codeBlocks = Array.from(hostElement.querySelectorAll('response-element.no-md > code-block')); 

    return (
        <Fragment>
            {/* 1. Portal the Toolbar into the existing actions container */}
            {toolbarSlot && createPortal(
                <MessageToolbar type={type} />, 
                toolbarSlot
            )}

            {/* 2. Portal the Content Container specifically for intercepting code blocks */}
            <MessageContentContainer blocks={codeBlocks} />
        </Fragment>
    );
};


export function getLanguageLabel(block: HTMLElement): string {
  // 1. Primary Strategy: Query INSIDE the specific code block.
  // This ensures we only get the span associated with THIS specific block.
  let langSpan = block.querySelector(SELECTOR_LANG_SPAN);

  // 2. Fallback Strategy: If not found inside, traverse up to the closest container
  // and query there. Adjust '.code-block-container' based on your constants.
  if (!langSpan) {
    const container = block.closest('response-element, .code-block-container');
    if (container) {
      langSpan = container.querySelector(SELECTOR_LANG_SPAN);
    }
  }

  // 3. Extract and normalize the text, falling back to a default
  return langSpan?.textContent?.trim() || "text";
}


