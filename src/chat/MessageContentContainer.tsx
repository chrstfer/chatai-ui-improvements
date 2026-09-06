import { Fragment, createPortal } from "preact";
import { OrgDocumentView, isOrgContent } from "../languages/org/index.ts"

export const MessageContentContainer = ({ blocks }: { blocks: HTMLElement[] }) => {
    return (
        <Fragment>
            {blocks.map((blockHost, index) => {
                const blockHostContent = blockHost.textContent || "";
                const isOrg = isOrgContent(blockHostContent);
        
                if (isOrg) {
                    // In-place replacement: Project the OrgDocumentView into the block
                    // CSS handles `display: none` on the raw code container without detaching it
                    return createPortal(<OrgDocumentView block={blockHostContent} />, blockHost);
                }
        
                // Non-renderable blocks get standard folding capabilities
                return createPortal(<CodeFoldingBadge block={blockHostContent} />, blockHost);
            })}
        </Fragment>
    );
};
