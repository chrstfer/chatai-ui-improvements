import { assertEquals } from "@std/assert";
import { DuckAiThemeAuthority } from "../../../../src/features/chats/duckai/theme.ts";
import { MockMutationObserver, setupTestDom } from "@internal/tests/fixtures";

Deno.test("unit: DuckAiThemeAuthority: resolves theme from data-theme attribute on documentElement", () => {
    const { cleanup } = setupTestDom({
        html: "<!DOCTYPE html><html data-theme='dark'><body></body></html>",
    });
    try {
        const themeAuth = new DuckAiThemeAuthority();
        assertEquals(themeAuth.getTheme(), "dark");
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("unit: DuckAiThemeAuthority: resolves theme from body class", () => {
    const { cleanup } = setupTestDom({
        html: "<!DOCTYPE html><html><body class='dark'></body></html>",
    });
    try {
        const themeAuth = new DuckAiThemeAuthority();
        assertEquals(themeAuth.getTheme(), "dark");
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("unit: DuckAiThemeAuthority: falls back to matchMedia dark preference when no attributes present", () => {
    const { setMediaMatches, cleanup } = setupTestDom();
    try {
        setMediaMatches(true);
        const themeAuth = new DuckAiThemeAuthority();
        assertEquals(themeAuth.getTheme(), "dark");
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("unit: DuckAiThemeAuthority: falls back to matchMedia light preference when no attributes present", () => {
    const { setMediaMatches, cleanup } = setupTestDom();
    try {
        setMediaMatches(false);
        const themeAuth = new DuckAiThemeAuthority();
        assertEquals(themeAuth.getTheme(), "light");
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("unit: DuckAiThemeAuthority: dispatches theme change notification on data-theme attribute mutation", () => {
    const { doc, cleanup } = setupTestDom({
        html: "<!DOCTYPE html><html data-theme='light'><body></body></html>",
    });
    try {
        const themeAuth = new DuckAiThemeAuthority();
        const receivedThemes: string[] = [];
        const unsubscribe = themeAuth.onThemeChange((theme) => {
            receivedThemes.push(theme);
        });

        doc.documentElement?.setAttribute("data-theme", "dark");
        const mo = MockMutationObserver.instances[0];
        mo.trigger([{
            type: "attributes",
            attributeName: "data-theme",
            target: doc.documentElement as unknown as Node,
        }]);

        assertEquals(receivedThemes, ["dark"]);
        unsubscribe();
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});
