/**
 * Centralized Serializer Registry.
 * Manages conversation format serializers and dynamic export loading.
 */

import type { ConversationSerializer, LazySerializerDefinition } from "../contracts/features/serializers/index.ts";

export class SerializerRegistry {
    private serializers = new Map<string, ConversationSerializer>();
    private lazyDefinitions = new Map<string, LazySerializerDefinition>();

    public register(serializer: ConversationSerializer): void {
        this.serializers.set(serializer.formatId.toLowerCase(), serializer);
        this.lazyDefinitions.delete(serializer.formatId.toLowerCase());
    }

    public registerLazy(definition: LazySerializerDefinition): void {
        const key = definition.formatId.toLowerCase();
        if (!this.serializers.has(key)) {
            this.lazyDefinitions.set(key, definition);
        }
    }

    public unregister(formatId: string): boolean {
        const key = formatId.toLowerCase();
        const d1 = this.serializers.delete(key);
        const d2 = this.lazyDefinitions.delete(key);
        return d1 || d2;
    }

    public async get(formatId: string): Promise<ConversationSerializer | undefined> {
        const key = formatId.toLowerCase();
        if (this.serializers.has(key)) return this.serializers.get(key);
        const lazy = this.lazyDefinitions.get(key);
        if (lazy) {
            const loaded = await lazy.load();
            this.serializers.set(key, loaded);
            return loaded;
        }
        return undefined;
    }

    public async getAll(): Promise<ConversationSerializer[]> {
        for (const formatId of this.lazyDefinitions.keys()) {
            await this.get(formatId);
        }
        return Array.from(this.serializers.values());
    }

    public clear(): void {
        this.serializers.clear();
        this.lazyDefinitions.clear();
    }
}

export const defaultSerializerRegistry = new SerializerRegistry();
