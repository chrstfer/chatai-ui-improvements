import type { LogEntry } from "./types.ts";

export class LogRingBuffer {
    private buffer: LogEntry[] = [];
    private capacity: number;

    constructor(capacity = 100) {
        this.capacity = capacity;
    }

    public push(entry: LogEntry): void {
        if (this.buffer.length >= this.capacity) {
            this.buffer.shift();
        }
        this.buffer.push(entry);
    }

    public getEntries(): readonly LogEntry[] {
        return [...this.buffer];
    }

    public get size(): number {
        return this.buffer.length;
    }

    public clear(): void {
        this.buffer = [];
    }
}
