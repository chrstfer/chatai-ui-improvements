import { type LogEntry, type Logger, LogLevel, type LogSink } from "./types.ts";
import { RunlevelManager } from "./runlevel.ts";
import { LogRingBuffer } from "./ringBuffer.ts";

export class CoreLogger implements Logger {
    private static globalRunlevel = new RunlevelManager();
    private static ringBuffer = new LogRingBuffer(100);
    private static sinks: Set<LogSink> = new Set();

    public readonly scope: string;

    constructor(scope = "Core") {
        this.scope = scope;
    }

    public static getRingBuffer(): LogRingBuffer {
        return this.ringBuffer;
    }

    public static getRunlevelManager(): RunlevelManager {
        return this.globalRunlevel;
    }

    public static addSink(sink: LogSink): () => void {
        this.sinks.add(sink);
        return () => this.sinks.delete(sink);
    }

    public static resetForTesting(runlevel?: "dev" | "test" | "prod"): void {
        this.ringBuffer.clear();
        this.sinks.clear();
        this.globalRunlevel = new RunlevelManager(runlevel);
    }

    public child(subScope: string): CoreLogger {
        const separator = this.scope ? " > " : "";
        return new CoreLogger(`${this.scope}${separator}${subScope}`);
    }

    private emit(level: LogLevel, message: string, error?: unknown, durationMs?: number, ...data: unknown[]): void {
        if (!CoreLogger.globalRunlevel.isLevelEnabled(level)) {
            return;
        }

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            scope: this.scope,
            message,
            data: data.length > 0 ? data : undefined,
            error,
            durationMs,
        };

        CoreLogger.ringBuffer.push(entry);

        for (const sink of CoreLogger.sinks) {
            try {
                sink(entry);
            } catch {
                // Sinks must never throw or disrupt execution
            }
        }

        this.writeToConsole(entry);
    }

    private writeToConsole(entry: LogEntry): void {
        const prefix = `[AI Chat UI] [${entry.scope}]`;
        const timing = entry.durationMs !== undefined ? ` (${entry.durationMs.toFixed(1)}ms)` : "";
        const args: unknown[] = [prefix, `${entry.message}${timing}`];
        if (entry.data && entry.data.length > 0) {
            args.push(...entry.data);
        }
        if (entry.error !== undefined) {
            args.push(entry.error);
        }

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(...args);
                break;
            case LogLevel.INFO:
                console.info(...args);
                break;
            case LogLevel.WARN:
                console.warn(...args);
                break;
            case LogLevel.ERROR:
                console.error(...args);
                break;
        }
    }

    public debug(message: string, ...data: unknown[]): void {
        this.emit(LogLevel.DEBUG, message, undefined, undefined, ...data);
    }

    public debugWithTiming(message: string, durationMs: number, ...data: unknown[]): void {
        this.emit(LogLevel.DEBUG, message, undefined, durationMs, ...data);
    }

    public info(message: string, ...data: unknown[]): void {
        this.emit(LogLevel.INFO, message, undefined, undefined, ...data);
    }

    public warn(message: string, ...data: unknown[]): void {
        this.emit(LogLevel.WARN, message, undefined, undefined, ...data);
    }

    public error(message: string, error?: unknown, ...data: unknown[]): void {
        this.emit(LogLevel.ERROR, message, error, undefined, ...data);
    }
}

export function createLogger(scope: string): CoreLogger {
    return new CoreLogger(scope);
}
