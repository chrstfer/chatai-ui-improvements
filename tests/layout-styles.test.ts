/**
 * Unit Tests for 3-Layer Style Architecture (Layer 1 Pure Computation & Layer 2 DOM Adapter)
 */

import { assertEquals } from "@std/assert";
import { applyLayoutDeclarations, computeLayoutStyles } from "../src/layout/layout-manager.ts";
import { ExtensionSettings } from "../src/types/settings.ts";

Deno.test("computeLayoutStyles (Layer 1 Pure Domain Mapping)", async (t) => {
    await t.step("computes default layout styles with fullWidth disabled", () => {
        const settings: ExtensionSettings = {
            fullWidth: false,
            autoRenderOrg: true,
            widthPercent: 86,
            hudCollapsed: false,
            responseFontSize: 100,
        };

        const decls = computeLayoutStyles(settings);
        assertEquals(decls.cssVars["--orgmod-max-width"], "86%");
        assertEquals(decls.cssVars["--orgmod-response-font-size"], "100%");
        assertEquals(decls.cssVars["--orgmod-response-font-size-multiplier"], "1");
        assertEquals(decls.classNames, []);
    });

    await t.step("computes layout styles with fullWidth active and custom dimensions", () => {
        const settings: ExtensionSettings = {
            fullWidth: true,
            autoRenderOrg: false,
            widthPercent: 94,
            hudCollapsed: true,
            responseFontSize: 120,
        };

        const decls = computeLayoutStyles(settings);
        assertEquals(decls.cssVars["--orgmod-max-width"], "94%");
        assertEquals(decls.cssVars["--orgmod-response-font-size"], "120%");
        assertEquals(decls.cssVars["--orgmod-response-font-size-multiplier"], "1.2");
        assertEquals(decls.classNames, ["orgmod-fullwidth-active"]);
    });

    await t.step("handles zero and fallback values deterministically", () => {
        const settings = {} as ExtensionSettings;
        const decls = computeLayoutStyles(settings);
        assertEquals(decls.cssVars["--orgmod-max-width"], "86%");
        assertEquals(decls.cssVars["--orgmod-response-font-size"], "100%");
        assertEquals(decls.cssVars["--orgmod-response-font-size-multiplier"], "1");
        assertEquals(decls.classNames, []);
    });
});

Deno.test("applyLayoutDeclarations (Layer 2 DOM Adapter)", async (t) => {
    await t.step("applies cssVars to synthetic style target and classNames to synthetic classList", () => {
        const styleMap = new Map<string, string>();
        const classSet = new Set<string>();

        const mockRoot = {
            style: {
                setProperty: (key: string, val: string) => styleMap.set(key, val),
            },
        } as unknown as HTMLElement;

        const mockBody = {
            classList: {
                add: (cls: string) => classSet.add(cls),
                remove: (cls: string) => classSet.delete(cls),
                contains: (cls: string) => classSet.has(cls),
            },
        } as unknown as HTMLElement;

        const decls = {
            cssVars: {
                "--orgmod-max-width": "90%",
                "--orgmod-response-font-size": "110%",
            },
            classNames: ["orgmod-fullwidth-active"],
        };

        applyLayoutDeclarations(decls, mockRoot, mockBody);

        assertEquals(styleMap.get("--orgmod-max-width"), "90%");
        assertEquals(styleMap.get("--orgmod-response-font-size"), "110%");
        assertEquals(classSet.has("orgmod-fullwidth-active"), true);

        // Remove active class
        applyLayoutDeclarations(
            { cssVars: {}, classNames: [] },
            mockRoot,
            mockBody,
        );
        assertEquals(classSet.has("orgmod-fullwidth-active"), false);
    });
});
