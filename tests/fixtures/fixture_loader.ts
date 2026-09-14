/**
 * Centralized test fixture loader utility for HTML turn snapshots and sample data.
 */

export function loadHtmlFixture(provider: "gemini" | "duckai", filename: string): string {
    const fixtureUrl = new URL(`./html/${provider}/${filename}`, import.meta.url);
    return Deno.readTextFileSync(fixtureUrl);
}

export function getFixturePath(subpath: string): string {
    return new URL(`./${subpath}`, import.meta.url).pathname;
}
