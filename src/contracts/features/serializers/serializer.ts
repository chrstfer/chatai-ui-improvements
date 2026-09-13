/**
 * Conversation Serializer and Registry contracts.
 */

import type { ConversationTurnNode, ResponseSegment } from "../../core/conversation.ts";

export type { ConversationTurnNode, ResponseSegment };

export interface ConversationMetadata {
    readonly title: string;
    readonly exportedAt: number;
    readonly chatSlug: string;
}

/**
 * Standard contract implemented by conversation format serializers.
 */
export interface ConversationSerializer {
    readonly formatId: string; // "org" | "markdown" | "json"
    readonly label: string;
    readonly fileExtension: string;
    readonly outputMimetype: string;
    serializeTurn(node: ConversationTurnNode): string;
    serializeConversation(nodes: readonly ConversationTurnNode[], metadata?: ConversationMetadata): string;
}

export interface LazySerializerDefinition {
    readonly formatId: string;
    readonly label: string;
    load(): Promise<ConversationSerializer>;
}
