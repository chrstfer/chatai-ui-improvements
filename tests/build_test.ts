import { assertEquals, assertNotEquals } from "@std/assert";

Deno.test("build.ts: Generates dist/dev with split chunks, bootloader, and manifest", async () => {
    const cmd = new Deno.Command("deno", {
        args: ["run", "-A", "build.ts", "--dev"],
    });
    const { code } = await cmd.output();
    assertEquals(code, 0, "build.ts --dev must exit with code 0");

    // Verify bootloader exists and contains dynamic import using browser.* namespace
    const contentJs = await Deno.readTextFile("dist/dev/content.js");
    assertEquals(contentJs.includes('browser.runtime.getURL("app.js")'), true);

    // Verify app.js entrypoint exists
    const appJs = await Deno.readTextFile("dist/dev/app.js");
    assertNotEquals(appJs.length, 0);

    // Verify split chunk was created for lazy-loaded Gemini adapter
    let hasSplitChunk = false;
    for await (const entry of Deno.readDir("dist/dev")) {
        if (entry.isFile && entry.name.endsWith(".js") && entry.name !== "content.js" && entry.name !== "app.js") {
            hasSplitChunk = true;
            break;
        }
    }
    assertEquals(hasSplitChunk, true, "Native deno bundle must emit split chunk for lazy Gemini adapter");

    // Verify manifest exists and has valid configuration
    const manifest = JSON.parse(await Deno.readTextFile("dist/dev/manifest.json"));
    assertEquals(manifest.manifest_version, 3);
    assertEquals(manifest.content_scripts[1].js[0], "content.js");

    // Verify web_accessible_resources includes app.js and explicitly enumerated chunks without wildcards
    const webResources = manifest.web_accessible_resources[0].resources;
    assertEquals(webResources.includes("app.js"), true);
    assertEquals(webResources.includes("*.js"), false, "Must not contain *.js wildcard");
    assertEquals(webResources.length >= 2, true, "Must enumerate generated bundle chunks explicitly");

    // Verify Tailwind CSS was compiled and inlined
    const tailwindGenerated = await Deno.readTextFile("src/styles/tailwind.generated.ts");
    assertEquals(tailwindGenerated.includes("export const TAILWIND_CSS: string ="), true);
    assertNotEquals(tailwindGenerated.length, 0);

    // Verify KaTeX CSS was compiled, inlined, and fonts bundled by default
    const katexGenerated = await Deno.readTextFile("src/styles/katex.generated.ts");
    assertEquals(katexGenerated.includes("export const KATEX_FONTS_BUNDLED: boolean = true;"), true);
    assertEquals(katexGenerated.includes("export const KATEX_CSS: string ="), true);
    assertEquals(
        webResources.includes("vendor/fonts/KaTeX_Main-Regular.woff2"),
        true,
        "Must enumerate bundled fonts in web_accessible_resources",
    );

    let fontCount = 0;
    for await (const entry of Deno.readDir("dist/dev/vendor/fonts")) {
        if (entry.isFile && entry.name.endsWith(".woff2")) {
            fontCount++;
        }
    }
    assertEquals(fontCount, 20, "Must copy all 20 KaTeX WOFF2 fonts into dist/dev/vendor/fonts");
});

Deno.test("build.ts: Honors --no-fonts flag by stripping @font-face and omitting font files", async () => {
    const cmd = new Deno.Command("deno", {
        args: ["run", "-A", "build.ts", "--dev", "--no-fonts"],
    });
    const { code } = await cmd.output();
    assertEquals(code, 0, "build.ts --dev --no-fonts must exit with code 0");

    const manifest = JSON.parse(await Deno.readTextFile("dist/dev/manifest.json"));
    const webResources = manifest.web_accessible_resources[0].resources as string[];
    const hasFonts = webResources.some((r) => r.startsWith("vendor/fonts/"));
    assertEquals(hasFonts, false, "Must not include vendor/fonts/ when --no-fonts is specified");

    const katexGenerated = await Deno.readTextFile("src/styles/katex.generated.ts");
    assertEquals(katexGenerated.includes("export const KATEX_FONTS_BUNDLED: boolean = false;"), true);
    assertEquals(
        katexGenerated.includes("@font-face"),
        false,
        "Must strip @font-face rules when --no-fonts is specified",
    );

    // Restore standard dev build with fonts bundled
    const restoreCmd = new Deno.Command("deno", {
        args: ["run", "-A", "build.ts", "--dev"],
    });
    const { code: restoreCode } = await restoreCmd.output();
    assertEquals(restoreCode, 0);
});
