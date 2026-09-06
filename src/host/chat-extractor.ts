/**
 * Gemini DOM Conversation Extractor
 * Extracts conversational turns and authentic message contents for Org-mode export.
 */
import { ChatConversation, ChatConversationTurn } from "../languages/org/export/chat-exporter.ts";

export function extractChatConversation(
    rootNode?: ParentNode,
): ChatConversation {
    const root = (rootNode || (typeof document !== "undefined" ? document.body : null)) as ParentNode;
    if (!root) {
        return { turns: [] };
    }

    // Extract title
    let title = "Gemini Chat Export";
    if (typeof document !== "undefined" && document.title) {
        title = document.title
            .replace(/\s*[-–—|]\s*Gemini\s*$/i, "")
            .replace(/\s*[-–—|]\s*Google\s*$/i, "")
            .trim() || title;
    }

    const turns: ChatConversationTurn[] = [];
    let messageCounter = 0;
    let turnCounter = 0;

    // Find all message containers in DOM order
    const turnCandidates = root.querySelectorAll<HTMLElement>(
        "user-query, user-query-item, .user-query-container, div[class*='user-query'], response-element, model-response, .response-container, div[class*='response-container']",
    );

    const processedElements = new Set<HTMLElement>();

    for (const el of Array.from(turnCandidates)) {
        // Avoid duplicate nested matches
        if (processedElements.has(el)) continue;
        let isChildOfProcessed = false;
        for (const p of processedElements) {
            if (p.contains(el)) {
                isChildOfProcessed = true;
                break;
            }
        }
        if (isChildOfProcessed) continue;

        const tagName = el.tagName.toLowerCase();
        const className = el.className || "";

        const isUser = tagName.includes("user-query") ||
            className.includes("user-query") ||
            (el.hasAttribute("data-test-id") && el.getAttribute("data-test-id")?.includes("user-query"));

        const isAssistant = tagName.includes("response") ||
            className.includes("response") ||
            className.includes("model-response");

        if (!isUser && !isAssistant) continue;

        processedElements.add(el);
        messageCounter++;

        if (isUser) {
            turnCounter++;
            const textEl =
                el.querySelector<HTMLElement>(".query-content, .user-query-text, .text-content, .query-text") ||
                el;
            const content = (textEl.innerText || textEl.textContent || "").trim();

            turns.push({
                role: "user",
                content,
                messageIndex: messageCounter,
                turnIndex: turnCounter,
                timestamp: new Date().toISOString(),
            });
        } else {
            // Model Response: Extract content while preserving authentic code blocks
            const clone = el.cloneNode(true) as HTMLElement;

            // Remove non-content UI buttons, feedback controls, retry buttons
            const noise = clone.querySelectorAll(
                "button, gem-icon-button, .buttons, .header-actions, .response-feedback, mat-icon, [role='button'], .orgmod-version-overlay, #orgmod-hud",
            );
            noise.forEach((n) => n.remove());

            // Check for code blocks
            const codeBlocks = clone.querySelectorAll<HTMLElement>("code-block, .code-block, pre");
            if (codeBlocks.length > 0) {
                const originalBlocks = el.querySelectorAll<HTMLElement>("code-block, .code-block, pre");
                for (let b = 0; b < codeBlocks.length; b++) {
                    const blockClone = codeBlocks[b];
                    const origBlock = originalBlocks[b];
                    let codeText = "";
                    let lang = "";

                    if (origBlock && controller) {
                        const rec = controller.getRecordByElement(origBlock);
                        if (rec) {
                            codeText = rec.lastText || controller.extractCodeText(rec.codeEl);
                            lang = rec.lang || "";
                        }
                    }

                    if (!codeText) {
                        const codeEl = blockClone.querySelector<HTMLElement>("code") || blockClone;
                        codeText = (codeEl.textContent || codeEl.innerText || "").replace(/\r\n/g, "\n");
                    }

                    const langSpan = blockClone.querySelector<HTMLElement>(
                        ".code-block-decoration-title, .language-label",
                    );
                    if (!lang && langSpan) {
                        lang = langSpan.textContent?.trim() || "";
                    }

                    const langTag = lang ? ` ${lang}` : "";
                    const placeholder = `\n\n\`\`\`${langTag}\n${codeText}\n\`\`\`\n\n`;
                    blockClone.replaceWith(document.createTextNode(placeholder));
                }
            }

            const responseContent = (clone.innerText || clone.textContent || "")
                .replace(/\n{3,}/g, "\n\n")
                .trim();

            turns.push({
                role: "assistant",
                content: responseContent,
                messageIndex: messageCounter,
                turnIndex: turnCounter,
                timestamp: new Date().toISOString(),
            });
        }
    }

    return {
        title,
        date: new Date().toISOString().slice(0, 10),
        turns,
    };
}
