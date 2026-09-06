import { CoreLogger } from "./logger.ts";
import { type LogEntry, LogLevel, type Runlevel } from "./types.ts";

export interface AIChatUIConsoleAPI {
    logs: {
        getEntries(): readonly LogEntry[];
        dump(): void;
        clear(): void;
    };
    setLogLevel(level: keyof typeof LogLevel | LogLevel): void;
    setRunlevel(runlevel: Runlevel): void;
}

export function installConsoleApi(win?: unknown): AIChatUIConsoleAPI | null {
    const target = (win ?? (typeof window !== "undefined" ? window : undefined)) as {
        __AI_CHAT_UI__?: AIChatUIConsoleAPI;
    } | undefined;

    if (!target) return null;

    const api: AIChatUIConsoleAPI = {
        logs: {
            getEntries: () => CoreLogger.getRingBuffer().getEntries(),
            dump: () => {
                const entries = CoreLogger.getRingBuffer().getEntries().map((e) => ({
                    time: new Date(e.timestamp).toISOString().split("T")[1]?.slice(0, 12),
                    level: LogLevel[e.level],
                    scope: e.scope,
                    message: e.message,
                    duration: e.durationMs !== undefined ? `${e.durationMs.toFixed(1)}ms` : "",
                    hasError: !!e.error,
                }));
                console.table(entries);
            },
            clear: () => CoreLogger.getRingBuffer().clear(),
        },
        setLogLevel: (level) => {
            const parsed = typeof level === "string" ? LogLevel[level as keyof typeof LogLevel] : level;
            if (typeof parsed === "number" && LogLevel[parsed] !== undefined) {
                CoreLogger.getRunlevelManager().setLogLevel(parsed);
                console.info(`[AI Chat UI] LogLevel set to ${LogLevel[parsed]}`);
            }
        },
        setRunlevel: (runlevel) => {
            CoreLogger.getRunlevelManager().setRunlevel(runlevel);
            console.info(`[AI Chat UI] Runlevel set to ${runlevel}`);
        },
    };

    target.__AI_CHAT_UI__ = api;
    return api;
}
