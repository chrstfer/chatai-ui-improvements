/**
 * Full Gemini Conversation to Org-Mode Exporter
 */

import { parseMarkdown } from "../../markdown/parser/markdown-parser.ts";
import { exportMarkdownToOrg } from "./markdown-to-org.ts";

export interface ChatConversationTurn {
    role: "user" | "model" | "assistant";
    content: string;
    messageIndex: number;
    turnIndex: number;
    timestamp?: string;
}

export interface ChatConversation {
    title?: string;
    date?: string;
    turns: ChatConversationTurn[];
}

function formatOrgTimestamp(isoOrDateStr?: string): string {
    const d = isoOrDateStr ? new Date(isoOrDateStr) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const dow = days[d.getDay()];
    const h = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `[${y}-${m}-${day} ${dow} ${h}:${min}]`;
}

export function exportChatToOrg(conversation: ChatConversation): string {
    const title = conversation.title || "Gemini Chat Export";
    const dateStr = conversation.date || new Date().toISOString().slice(0, 10);

    const docSections: string[] = [
        `#+TITLE: ${title}`,
        `#+DATE: ${dateStr}`,
        `#+OPTIONS: toc:nil num:nil\n`,
    ];

    conversation.turns.forEach((turn) => {
        const isUser = turn.role === "user";
        const headingTitle = isUser ? "User" : "Gemini";
        const ts = formatOrgTimestamp(turn.timestamp);

        const drawer = [
            ":PROPERTIES:",
            `:ROLE: ${turn.role}`,
            `:MESSAGE_INDEX: ${turn.messageIndex}`,
            `:TURN_INDEX: ${turn.turnIndex}`,
            `:TIMESTAMP: ${ts}`,
            ":END:",
        ].join("\n");

        let bodyText = "";
        if (isUser) {
            // Clean plain text representation for user prompts
            bodyText = turn.content.trim();
        } else {
            // Parse full markdown and convert to Org with heading level re-leveling
            const mdDoc = parseMarkdown(turn.content);
            bodyText = exportMarkdownToOrg(mdDoc, { parentDepth: 1, unwrapOrgBlocks: true });
        }

        docSections.push(`* ${headingTitle}\n${drawer}\n\n${bodyText}`);
    });

    return docSections.join("\n\n");
}
