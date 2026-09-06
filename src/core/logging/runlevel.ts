import { LogLevel, type Runlevel } from "./types.ts";
import { __DEV__ } from "../../env.ts";

export class RunlevelManager {
    private currentRunlevel: Runlevel;
    private customLogLevel: LogLevel | null = null;

    constructor(defaultRunlevel?: Runlevel) {
        this.currentRunlevel = defaultRunlevel ?? this.detectRunlevel();
    }

    private detectRunlevel(): Runlevel {
        if (typeof window !== "undefined") {
            const winOverride = (window as unknown as { __AI_CHAT_UI_RUNLEVEL__?: Runlevel }).__AI_CHAT_UI_RUNLEVEL__;
            if (winOverride && ["dev", "test", "prod"].includes(winOverride)) return winOverride;
            try {
                const storageOverride = localStorage.getItem("AI_CHAT_UI_RUNLEVEL") as Runlevel;
                if (storageOverride && ["dev", "test", "prod"].includes(storageOverride)) return storageOverride;
            } catch {
                // Ignore security / storage access restrictions
            }
        }
        return __DEV__ ? "dev" : "prod";
    }

    public getRunlevel(): Runlevel {
        return this.currentRunlevel;
    }

    public setRunlevel(runlevel: Runlevel): void {
        this.currentRunlevel = runlevel;
    }

    public setLogLevel(level: LogLevel | null): void {
        this.customLogLevel = level;
    }

    public getEffectiveLogLevel(): LogLevel {
        if (this.customLogLevel !== null) return this.customLogLevel;
        switch (this.currentRunlevel) {
            case "dev":
                return LogLevel.DEBUG;
            case "test":
                return LogLevel.WARN;
            case "prod":
            default:
                return LogLevel.WARN;
        }
    }

    public isLevelEnabled(level: LogLevel): boolean {
        return level >= this.getEffectiveLogLevel();
    }
}
