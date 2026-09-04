import { bundle } from "@deno/emit";

const isDev = Deno.args.includes("--dev") || Deno.args.includes("-d");
const outDir = isDev ? "dist/dev" : "dist/release";

// 1. Clean and create output directory
try {
    await Deno.remove(outDir, { recursive: true });
} catch {
    // directory might not exist yet
}
await Deno.mkdir(`${outDir}/vendor`, { recursive: true });

// 2. Copy Vendor Assets (KaTeX Standalone Distribution)
try {
    await Deno.copyFile("vendor/katex.min.js", `${outDir}/vendor/katex.min.js`);
    await Deno.copyFile("vendor/katex.min.css", `${outDir}/vendor/katex.min.css`);
} catch (e) {
    console.warn("Could not copy local vendor assets, checking vendor directory:", e);
}

// 3. Copy Modular Stylesheets (general.css and gemini.css)
await Deno.copyFile("src/styles/general.css", `${outDir}/general.css`);
await Deno.copyFile("src/styles/gemini.css", `${outDir}/gemini.css`);

// 4. Load manifest to determine base version
const manifestRaw = await Deno.readTextFile("manifest.json");
const manifest = JSON.parse(manifestRaw);
const baseVersion = manifest.version || "0.1.0";

// Generate unique build suffix for dev builds that changes every build
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const buildTimestamp = `${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const buildVersion = isDev ? `${baseVersion}-dev.${buildTimestamp}` : baseVersion;

await Deno.copyFile("manifest.json", `${outDir}/manifest.json`);

// 5. Bundle src/content.ts into dist/(dev|release)/content.js with comments and human readability preserved
console.log(`Bundling with Deno emit (${isDev ? `DEV: ${buildVersion}` : `PROD: ${buildVersion}`})...`);
const entryUrl = new URL("./src/content.ts", import.meta.url);
const denoJson = JSON.parse(await Deno.readTextFile("deno.json"));
const preactImportSource = denoJson.imports?.["preact"] || "https://esm.sh/preact@10.25.4";

const result = await bundle(entryUrl, {
    importMap: {
        imports: denoJson.imports,
    },
    compilerOptions: {
        jsx: "react-jsx",
        jsxImportSource: preactImportSource,
    },
});
const { code } = result;

// Wrap in IIFE with __DEV__ flag constant and __BUILD_VERSION__
const iifeCode = `(function() {\nconst __DEV__ = ${isDev};\nconst __BUILD_VERSION__ = ${JSON.stringify(buildVersion)};\n${code}\n})();\n`;
await Deno.writeTextFile(`${outDir}/content.js`, iifeCode);

console.log(
    `✓ Build complete (${isDev ? "DEV" : "PROD"}): ${outDir}/content.js (${buildVersion}), ${outDir}/general.css, ${outDir}/gemini.css, ${outDir}/vendor/*, ${outDir}/manifest.json`,
);

// 6. Package into a zip archive for AMO / Firefox deployment
const zipFileName = isDev ? `gemini-org-ui-${buildVersion}.zip` : `gemini-org-ui-${baseVersion}.zip`;

try {
    const p7zCmd = new Deno.Command("7z", {
        args: [
            "a",
            "-tzip",
            "-mx=9",
            "-aoa",
            "-bd",
            zipFileName,
            "manifest.json",
            "content.js",
            "general.css",
            "gemini.css",
            "vendor",
        ],
        cwd: outDir,
    });
    const { code: p7zCode, stderr } = await p7zCmd.output();
    if (p7zCode === 0) {
        console.log(`✓ Zip package created via 7z: ${outDir}/${zipFileName}`);
    } else {
        const errText = new TextDecoder().decode(stderr);
        console.warn(`Warning: Could not create zip archive with 7z: ${errText}`);
    }
} catch (e) {
    console.warn("Warning: Failed to execute 7z command:", e);
}
