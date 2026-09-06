import { options, type VNode } from "preact";
import type { Logger } from "./types.ts";

interface PreactInternalOptions {
    vnode?: (vnode: VNode) => void;
    diffed?: (vnode: VNode) => void;
    unmount?: (vnode: VNode) => void;
    _catchError?: (error: unknown, vnode: VNode, oldVNode?: VNode) => void;
}

function getComponentName(type: unknown): string {
    if (typeof type === "string") return `<${type}>`;
    if (typeof type === "function") {
        const fn = type as { displayName?: string; name?: string };
        return `<${fn.displayName || fn.name || "AnonymousComponent"}>`;
    }
    return "<Unknown>";
}

export interface PreactHooksSubscription {
    uninstall(): void;
}

export function installPreactHooks(logger: Logger): PreactHooksSubscription {
    const preactLogger = logger.child("Preact");
    const preactOptions = options as unknown as PreactInternalOptions;

    const originalVNode = options.vnode;
    const originalDiffed = options.diffed;
    const originalUnmount = options.unmount;
    const originalCatchError = preactOptions._catchError;

    const mountStartTimes = new WeakMap<VNode, number>();

    // 1. Component Instantiation: when component VNodes are generated
    options.vnode = (vnode: VNode) => {
        if (typeof vnode.type === "function") {
            mountStartTimes.set(vnode, performance.now());
            const name = getComponentName(vnode.type);
            preactLogger.debug(`Component instantiated: ${name}`);
        }
        if (originalVNode) originalVNode(vnode);
    };

    // 2. Component Mounting / Diffing: when component finishes rendering, measure duration
    options.diffed = (vnode: VNode) => {
        if (typeof vnode.type === "function") {
            const start = mountStartTimes.get(vnode);
            const duration = start !== undefined ? performance.now() - start : 0;
            const name = getComponentName(vnode.type);
            preactLogger.debugWithTiming(`Component mounted/diffed: ${name}`, duration);
        }
        if (originalDiffed) originalDiffed(vnode);
    };

    // 3. Component Destruction: when component is unmounted from DOM
    options.unmount = (vnode: VNode) => {
        if (typeof vnode.type === "function") {
            const name = getComponentName(vnode.type);
            preactLogger.debug(`Component destroyed: ${name}`);
        }
        if (originalUnmount) originalUnmount(vnode);
    };

    // 4. Error Boundaries: when a component throws during render
    preactOptions._catchError = (error: unknown, vnode: VNode, oldVNode?: VNode) => {
        const name = vnode?.type ? getComponentName(vnode.type) : "Unknown";
        preactLogger.error(`Error caught in ${name}`, error, { vnode, oldVNode });
        if (originalCatchError) {
            originalCatchError(error, vnode, oldVNode);
        }
    };

    return {
        uninstall: () => {
            options.vnode = originalVNode;
            options.diffed = originalDiffed;
            options.unmount = originalUnmount;
            preactOptions._catchError = originalCatchError;
        },
    };
}
