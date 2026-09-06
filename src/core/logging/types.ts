export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4,
}

export type Runlevel = "dev" | "test" | "prod";

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    scope: string;
    message: string;
    data?: unknown[];
    error?: Error | unknown;
    durationMs?: number;
}

export type LogSink = (entry: LogEntry) => void;

export interface Logger {
    readonly scope: string;
    debug(message: string, ...data: unknown[]): void;
    debugWithTiming(message: string, durationMs: number, ...data: unknown[]): void;
    info(message: string, ...data: unknown[]): void;
    warn(message: string, ...data: unknown[]): void;
    error(message: string, error?: unknown, ...data: unknown[]): void;
    child(scope: string): Logger;
}
