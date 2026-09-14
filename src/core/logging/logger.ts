import {
    configureSync,
    defaultConsoleFormatter,
    getConsoleSink,
    getLogger,
    type Logger as LogTapeLogger,
    type LogLevel as LogTapeLogLevel,
    type LogRecord,
    resetSync,
} from "@logtape/logtape";
import { type LogEntry, type Logger, LogLevel, type LogSink } from "./types.ts";
import { RunlevelManager } from "./runlevel.ts";
import { LogRingBuffer } from "./ringBuffer.ts";

function toLogTapeLevel(level: LogLevel): LogTapeLogLevel | null {
    switch (level) {
        case LogLevel.DEBUG:
            return "debug";
        case LogLevel.INFO:
            return "info";
        case LogLevel.WARN:
            return "warning";
        case LogLevel.ERROR:
            return "error";
        case LogLevel.SILENT:
            return null;
    }
}

function toLegacyLogLevel(level: LogTapeLogLevel): LogLevel {
    switch (level) {
        case "debug":
            return LogLevel.DEBUG;
        case "info":
            return LogLevel.INFO;
        case "warning":
            return LogLevel.WARN;
        case "error":
        case "fatal":
            return LogLevel.ERROR;
        default:
            return LogLevel.INFO;
    }
}

function parseScopeToCategory(scope: string): readonly string[] {
    if (!scope) return ["ai-chat-ui"];
    const segments = scope.split(">").map((s) => s.trim()).filter(Boolean);
    return ["ai-chat-ui", ...segments];
}

function extensionConsoleFormatter(record: LogRecord): readonly unknown[] {
    const defaultOutput = defaultConsoleFormatter(record);
    const timing = typeof record.properties?.durationMs === "number"
        ? ` (${record.properties.durationMs.toFixed(1)}ms)`
        : "";
    const extraArgs: unknown[] = [];
    if (Array.isArray(record.properties?.data) && record.properties.data.length > 0) {
        extraArgs.push(...record.properties.data);
    }
    if (record.properties?.error !== undefined) {
        extraArgs.push(record.properties.error);
    }
    if (timing || extraArgs.length > 0) {
        if (typeof defaultOutput[0] === "string" && timing) {
            return [`${defaultOutput[0]}${timing}`, ...defaultOutput.slice(1), ...extraArgs];
        }
        return [...defaultOutput, ...extraArgs];
    }
    return defaultOutput;
}

export class CoreLogger implements Logger {
    private static globalRunlevel: RunlevelManager;
    private static ringBuffer = new LogRingBuffer(100);
    private static sinks: Set<LogSink> = new Set();
    private static isConfigured = false;

    private readonly logtape: LogTapeLogger;
    public readonly scope: string;

    static {
        this.globalRunlevel = new RunlevelManager(undefined, () => {
            CoreLogger.syncLogTapeConfig();
        });
        CoreLogger.syncLogTapeConfig();
    }

    constructor(scope = "Core", logtapeLogger?: LogTapeLogger) {
        this.scope = scope;
        if (logtapeLogger) {
            this.logtape = logtapeLogger;
        } else {
            const category = parseScopeToCategory(scope);
            this.logtape = getLogger(category);
        }
    }

    public static syncLogTapeConfig(): void {
        const effectiveLevel = this.globalRunlevel.getEffectiveLogLevel();
        const logTapeLevel = toLogTapeLevel(effectiveLevel);

        const sinks: Record<string, (record: LogRecord) => void> = {
            console: getConsoleSink({ formatter: extensionConsoleFormatter }),
            extension: (record: LogRecord) => {
                const scope = record.category.slice(1).join(" > ") || record.category[0] || "Core";
                const raw = record.rawMessage;
                const message = typeof raw === "string"
                    ? raw
                    : Array.isArray(raw)
                    ? raw.join("")
                    : record.message.map((m) => (typeof m === "string" ? m : String(m))).join("");

                const entry: LogEntry = {
                    timestamp: record.timestamp,
                    level: toLegacyLogLevel(record.level),
                    scope,
                    message,
                    data: Array.isArray(record.properties?.data) ? record.properties.data as unknown[] : undefined,
                    error: record.properties?.error,
                    durationMs: typeof record.properties?.durationMs === "number"
                        ? record.properties.durationMs
                        : undefined,
                };

                CoreLogger.ringBuffer.push(entry);

                for (const sink of CoreLogger.sinks) {
                    try {
                        sink(entry);
                    } catch {
                        // Sinks must never throw or disrupt execution
                    }
                }
            },
        };

        const activeSinks = logTapeLevel !== null ? ["console", "extension"] : [];

        configureSync({
            reset: true,
            sinks,
            loggers: [
                { category: ["logtape", "meta"], lowestLevel: "warning", sinks: ["console"] },
                {
                    category: ["ai-chat-ui"],
                    lowestLevel: logTapeLevel ?? "fatal",
                    sinks: activeSinks,
                },
            ],
        });

        this.isConfigured = true;
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
        resetSync();
        this.ringBuffer.clear();
        this.sinks.clear();
        this.globalRunlevel = new RunlevelManager(runlevel, () => {
            CoreLogger.syncLogTapeConfig();
        });
        CoreLogger.syncLogTapeConfig();
    }

    public child(subScope: string): CoreLogger {
        const separator = this.scope ? " > " : "";
        return new CoreLogger(`${this.scope}${separator}${subScope}`, this.logtape.getChild(subScope));
    }

    private buildProps(durationMs?: number, error?: unknown, data?: unknown[]): Record<string, unknown> | undefined {
        if (durationMs === undefined && error === undefined && (!data || data.length === 0)) {
            return undefined;
        }
        const props: Record<string, unknown> = {};
        if (durationMs !== undefined) props.durationMs = durationMs;
        if (error !== undefined) props.error = error;
        if (data && data.length > 0) props.data = data;
        return props;
    }

    public debug(message: string, ...data: unknown[]): void {
        if (!this.logtape.isEnabledFor("debug")) return;
        const props = this.buildProps(undefined, undefined, data);
        if (props) {
            this.logtape.debug(message, props);
        } else {
            this.logtape.debug(message);
        }
    }

    public debugWithTiming(message: string, durationMs: number, ...data: unknown[]): void {
        if (!this.logtape.isEnabledFor("debug")) return;
        const props = this.buildProps(durationMs, undefined, data);
        if (props) {
            this.logtape.debug(message, props);
        } else {
            this.logtape.debug(message);
        }
    }

    public info(message: string, ...data: unknown[]): void {
        if (!this.logtape.isEnabledFor("info")) return;
        const props = this.buildProps(undefined, undefined, data);
        if (props) {
            this.logtape.info(message, props);
        } else {
            this.logtape.info(message);
        }
    }

    public warn(message: string, ...data: unknown[]): void {
        if (!this.logtape.isEnabledFor("warning")) return;
        const props = this.buildProps(undefined, undefined, data);
        if (props) {
            this.logtape.warn(message, props);
        } else {
            this.logtape.warn(message);
        }
    }

    public error(message: string, error?: unknown, ...data: unknown[]): void {
        if (!this.logtape.isEnabledFor("error")) return;
        const props = this.buildProps(undefined, error, data);
        if (props) {
            this.logtape.error(message, props);
        } else {
            this.logtape.error(message);
        }
    }
}

export function createLogger(scope: string): CoreLogger {
    return new CoreLogger(scope);
}
