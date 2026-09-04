/**
 * Unit Tests for BlockStore, Content Fingerprint Hashing, and Virtual Scroll Caching
 */

import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import { BlockStore, computeContentFingerprint } from "../src/context/BlockStoreContext.tsx";
import { parseOrgDocument } from "../src/languages/org/index.ts";

Deno.test("computeContentFingerprint", async (t) => {
    await t.step("produces deterministic fingerprints for identical text and language", () => {
        const text = "* Heading\n** Sub-heading\nContent here";
        const fp1 = computeContentFingerprint(text, "org");
        const fp2 = computeContentFingerprint(text, "org");
        assertEquals(fp1, fp2);
        assertExists(fp1);
    });

    await t.step("produces distinct fingerprints when language or text varies", () => {
        const text1 = "* Heading 1";
        const text2 = "* Heading 2";
        const fpOrg = computeContentFingerprint(text1, "org");
        const fpPy = computeContentFingerprint(text1, "python");
        const fpDifferentText = computeContentFingerprint(text2, "org");

        assertNotEquals(fpOrg, fpPy);
        assertNotEquals(fpOrg, fpDifferentText);
    });

    await t.step("handles large text blocks efficiently without crashing", () => {
        const largeText = "x".repeat(100_000);
        const fp = computeContentFingerprint(largeText, "rust");
        assertExists(fp);
    });
});

Deno.test("BlockStore AST Caching & Global State Orchestration", async (t) => {
    await t.step("persists AST across cache lookups", () => {
        const store = new BlockStore();
        const rawOrg = "* Task Title\n:PROPERTIES:\n:STATUS: TODO\n:END:";
        const doc = parseOrgDocument(rawOrg);
        const fp = computeContentFingerprint(rawOrg, "org");

        store.setCached(fp, {
            fingerprint: fp,
            ast: doc,
            isRendered: true,
            isFolded: false,
            lang: "org",
            lineCount: 4,
        });

        const cached = store.getCached(fp);
        assertExists(cached);
        assertEquals(cached.isRendered, true);
        assertEquals(cached.lineCount, 4);
        assertEquals(cached.ast?.sections[0].heading.title, "Task Title");
    });

    await t.step("orchestrates toggleRenderAll across registered active blocks", () => {
        const store = new BlockStore();
        let renderedState1 = false;
        let renderedState2 = false;

        store.register({
            id: "block-1",
            fingerprint: "fp-1",
            lang: "org",
            isRendered: false,
            isFolded: false,
            allFolded: false,
            isConnected: true,
            setRenderedState: (state) => {
                renderedState1 = state;
            },
        });

        store.register({
            id: "block-2",
            fingerprint: "fp-2",
            lang: "org",
            isRendered: false,
            isFolded: false,
            allFolded: false,
            isConnected: true,
            setRenderedState: (state) => {
                renderedState2 = state;
            },
        });

        // Trigger render all
        store.toggleRenderAll(true);
        assertEquals(renderedState1, true);
        assertEquals(renderedState2, true);

        // Toggle off
        store.toggleRenderAll(false);
        assertEquals(renderedState1, false);
        assertEquals(renderedState2, false);
    });

    await t.step("orchestrates toggleFoldAll across both Org and non-Org blocks", () => {
        const store = new BlockStore();
        let foldedStateOrg = false;
        let foldedStatePy = false;

        store.register({
            id: "block-org",
            fingerprint: "fp-org",
            lang: "org",
            isRendered: true,
            isFolded: false,
            allFolded: false,
            isConnected: true,
            setAllFoldedState: (state) => {
                foldedStateOrg = state;
            },
        });

        store.register({
            id: "block-py",
            fingerprint: "fp-py",
            lang: "python",
            isRendered: false,
            isFolded: false,
            allFolded: false,
            isConnected: true,
            setFoldedState: (state) => {
                foldedStatePy = state;
            },
        });

        // Trigger fold all
        store.toggleFoldAll(true);
        assertEquals(foldedStateOrg, true);
        assertEquals(foldedStatePy, true);

        // Toggle unfold all
        store.toggleFoldAll(false);
        assertEquals(foldedStateOrg, false);
        assertEquals(foldedStatePy, false);
    });

    await t.step("handles detachment signals without clearing persistent AST cache", () => {
        const store = new BlockStore();
        const fp = "fp-detachable";
        store.setCached(fp, {
            fingerprint: fp,
            lang: "org",
            isRendered: true,
            lineCount: 10,
        });

        store.register({
            id: "block-detach",
            fingerprint: fp,
            lang: "org",
            isRendered: true,
            isFolded: false,
            allFolded: false,
            isConnected: true,
        });

        assertEquals(store.getActive("block-detach")?.isConnected, true);

        // Signal DOM detachment
        store.markDetached("block-detach");
        assertEquals(store.getActive("block-detach")?.isConnected, false);

        // Cache remains fully intact
        assertExists(store.getCached(fp));
        assertEquals(store.getCached(fp)?.lineCount, 10);
    });
});
