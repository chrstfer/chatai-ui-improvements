/**
 * In-Situ Code Block Preact Root Component
 * Encapsulates single-portal Preact root mounting adjacent to host Gemini pre element.
 */

import { FunctionComponent } from "preact";
import { BlockStore, globalBlockStore } from "../context/BlockStoreContext.tsx";
import { StructuredMessageContainer } from "../languages/StructuredMessageContainer.tsx";

export interface InSituCodeBlockProps {
    blockId: string;
    lang: string;
    codeText: string;
    preEl: HTMLElement;
    headerActionsEl?: HTMLElement | null;
    blockStore?: BlockStore;
    autoRender?: boolean;
}

export const InSituCodeBlock: FunctionComponent<InSituCodeBlockProps> = ({
    blockId,
    lang,
    codeText,
    preEl,
    headerActionsEl,
    blockStore = globalBlockStore,
    autoRender = false,
}) => {
    return (
        <StructuredMessageContainer
            blockId={blockId}
            lang={lang}
            codeText={codeText}
            preEl={preEl}
            headerActionsEl={headerActionsEl}
            blockStore={blockStore}
            autoRender={autoRender}
        />
    );
};
