/**
 * Test fixtures and test environment harness barrel.
 */

export {
    MockMutationObserver,
    type MutationCallback,
    patchHasSelector,
    renderInShadow,
    type SetupDomOptions,
    type SetupDomResult,
    setupTestDom,
    type ShadowRenderResult,
    triggerClick,
} from "./dom_fixture.ts";

export { loadHtmlFixture } from "./fixture_loader.ts";
export { resetStyleSheetCache } from "./stylesheet_fixture.ts";
