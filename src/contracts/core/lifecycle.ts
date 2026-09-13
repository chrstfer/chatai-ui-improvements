/**
 * System lifecycle and runtime operational modes.
 */

export type Runlevel = "dev" | "test" | "prod";

export type SystemLifecycleState = "uninitialized" | "booting" | "ready" | "destroyed";

export interface ExtensionRuntimeEnvironment {
    readonly runlevel: Runlevel;
    readonly isDev: boolean;
    readonly buildVersion: string;
    readonly lifecycleState: SystemLifecycleState;
}
