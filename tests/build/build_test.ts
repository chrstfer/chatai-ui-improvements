import { assertEquals, assertNotEquals } from "@std/assert";

let buildRan = false;
async function ensureDevBuild() {
    if (!buildRan) {
        const cmd = new Deno.Command("deno", {
            args: ["run", "-A", "build.ts", "--dev"],
        });
        const { code } = await cmd.output();
        assertEquals(code, 0, "build.ts --dev must exit with code 0");
        buildRan = true;
    }
}

Deno.test("e2e: build.ts exits with code 0 on development build", async () => {
    await ensureDevBuild();
    assertEquals(buildRan, true);
});

Deno.test("e2e: build.ts generates content bootloader with dynamic import", async () => {
    await ensureDevBuild();
    const contentJs = await Deno.readTextFile("dist/dev/content.js");
    assertEquals(contentJs.includes('browser.runtime.getURL("app.js")'), true);
});

Deno.test("e2e: build.ts generates non-empty app.js entrypoint", async () => {
    await ensureDevBuild();
    const appJs = await Deno.readTextFile("dist/dev/app.js");
    assertNotEquals(appJs.length, 0);
});

Deno.test("e2e: build.ts generates split chunk for lazy Gemini adapter", async () => {
    await ensureDevBuild();
    let hasGeminiChunk = false;
    for await (const entry of Deno.readDir("dist/dev")) {
        if (entry.isFile && entry.name.endsWith(".js") && entry.name.startsWith("gemini-")) {
            hasGeminiChunk = true;
            break;
        }
    }
    assertEquals(hasGeminiChunk, true);
});

Deno.test("e2e: build.ts generates split chunk for lazy Duck.ai adapter", async () => {
    await ensureDevBuild();
    let hasDuckAiChunk = false;
    for await (const entry of Deno.readDir("dist/dev")) {
        if (entry.isFile && entry.name.endsWith(".js") && entry.name.startsWith("duckai-")) {
            hasDuckAiChunk = true;
            break;
        }
    }
    assertEquals(hasDuckAiChunk, true);
});

Deno.test("e2e: build.ts generates manifest version 3", async () => {
    await ensureDevBuild();
    const manifest = JSON.parse(await Deno.readTextFile("dist/dev/manifest.json"));
    assertEquals(manifest.manifest_version, 3);
});

Deno.test("e2e: build.ts registers content scripts in manifest", async () => {
    await ensureDevBuild();
    const manifest = JSON.parse(await Deno.readTextFile("dist/dev/manifest.json"));
    assertEquals(manifest.content_scripts.length >= 3, true);
});

Deno.test("e2e: build.ts includes app.js in manifest web_accessible_resources", async () => {
    await ensureDevBuild();
    const manifest = JSON.parse(await Deno.readTextFile("dist/dev/manifest.json"));
    const webResources = manifest.web_accessible_resources[0].resources as string[];
    assertEquals(webResources.includes("app.js"), true);
});

Deno.test("e2e: build.ts excludes wildcard scripts from web_accessible_resources", async () => {
    await ensureDevBuild();
    const manifest = JSON.parse(await Deno.readTextFile("dist/dev/manifest.json"));
    const webResources = manifest.web_accessible_resources[0].resources as string[];
    assertEquals(webResources.includes("*.js"), false);
});

Deno.test("e2e: build.ts enumerates bundled adapter chunks in web_accessible_resources", async () => {
    await ensureDevBuild();
    const manifest = JSON.parse(await Deno.readTextFile("dist/dev/manifest.json"));
    const webResources = manifest.web_accessible_resources[0].resources as string[];
    assertEquals(webResources.length >= 2, true);
});

Deno.test("e2e: build.ts generates compiled inlined Tailwind stylesheet", async () => {
    await ensureDevBuild();
    const tailwindGenerated = await Deno.readTextFile("src/styles/tailwind.generated.ts");
    assertEquals(tailwindGenerated.includes("export const TAILWIND_CSS: string ="), true);
});

Deno.test("e2e: build.ts bundles 20 KaTeX WOFF2 fonts into vendor directory", async () => {
    await ensureDevBuild();
    let fontCount = 0;
    for await (const entry of Deno.readDir("dist/dev/vendor/fonts")) {
        if (entry.isFile && entry.name.endsWith(".woff2")) {
            fontCount++;
        }
    }
    assertEquals(fontCount, 20);
});

Deno.test("e2e: build.ts omits font files when --no-fonts flag is passed", async () => {
    const cmd = new Deno.Command("deno", {
        args: ["run", "-A", "build.ts", "--dev", "--no-fonts"],
    });
    const { code } = await cmd.output();
    assertEquals(code, 0);

    const manifest = JSON.parse(await Deno.readTextFile("dist/dev/manifest.json"));
    const webResources = manifest.web_accessible_resources[0].resources as string[];
    const hasFonts = webResources.some((r) => r.startsWith("vendor/fonts/"));

    // Restore standard dev build with fonts bundled
    await new Deno.Command("deno", {
        args: ["run", "-A", "build.ts", "--dev"],
    }).output();

    assertEquals(hasFonts, false);
});

Deno.test("e2e: build.ts strips @font-face declarations when --no-fonts flag is passed", async () => {
    await new Deno.Command("deno", {
        args: ["run", "-A", "build.ts", "--dev", "--no-fonts"],
    }).output();

    const katexGenerated = await Deno.readTextFile("src/styles/katex.generated.ts");
    const hasFontFace = katexGenerated.includes("@font-face");

    // Restore standard dev build with fonts bundled
    await new Deno.Command("deno", {
        args: ["run", "-A", "build.ts", "--dev"],
    }).output();

    assertEquals(hasFontFace, false);
});
