/**
 * Unit Tests for Full Chat Conversation Org-Mode Exporter
 */

import { assertEquals } from "@std/assert";
import { ChatConversation, exportChatToOrg } from "../src/languages/org/export/chat-exporter.ts";

Deno.test("exportChatToOrg", async (t) => {
    await t.step("generates document top-matter, turn headings, and property drawers", () => {
        const conversation: ChatConversation = {
            title: "Distributed Query Planner Discussion",
            date: "2026-09-04",
            turns: [
                {
                    role: "user",
                    content: "How do we partition the execution graph?",
                    messageIndex: 1,
                    turnIndex: 1,
                    timestamp: "2026-09-04T08:30:00.000Z",
                },
                {
                    role: "model",
                    content: `# Execution Graph Partitioning
We divide into two stages:
\`\`\`org
* Stage 1: Map
** Task Allocation
* Stage 2: Reduce
\`\`\`
And execute via:
\`\`\`bash
cargo run --release
\`\`\``,
                    messageIndex: 2,
                    turnIndex: 1,
                    timestamp: "2026-09-04T08:31:00.000Z",
                },
            ],
        };

        const orgDoc = exportChatToOrg(conversation);

        // Top-matter
        assertEquals(orgDoc.includes("#+TITLE: Distributed Query Planner Discussion"), true);
        assertEquals(orgDoc.includes("#+DATE: 2026-09-04"), true);
        assertEquals(orgDoc.includes("#+OPTIONS: toc:nil num:nil"), true);

        // Turn 1: User
        assertEquals(orgDoc.includes("* User"), true);
        assertEquals(orgDoc.includes(":ROLE: user"), true);
        assertEquals(orgDoc.includes(":MESSAGE_INDEX: 1"), true);
        assertEquals(orgDoc.includes(":TURN_INDEX: 1"), true);
        assertEquals(orgDoc.includes("How do we partition the execution graph?"), true);

        // Turn 2: Gemini
        assertEquals(orgDoc.includes("* Gemini"), true);
        assertEquals(orgDoc.includes(":ROLE: model"), true);
        assertEquals(orgDoc.includes(":MESSAGE_INDEX: 2"), true);
        assertEquals(orgDoc.includes(":TURN_INDEX: 1"), true);

        // Markdown headings & unwrapped Org subtrees
        assertEquals(orgDoc.includes("** Execution Graph Partitioning"), true);
        assertEquals(orgDoc.includes("*** Stage 1: Map"), true);
        assertEquals(orgDoc.includes("**** Task Allocation"), true);
        assertEquals(orgDoc.includes("*** Stage 2: Reduce"), true);

        // Non-org code block
        assertEquals(orgDoc.includes("#+BEGIN_SRC bash"), true);
        assertEquals(orgDoc.includes("cargo run --release"), true);
        assertEquals(orgDoc.includes("#+END_SRC"), true);
    });
});
