/**
 * @file scripts/audit_test_pipeline.ts
 * @description Automated audit engine evaluating the automated test pipeline against
 * standards in CONTEXT.org, AGENTS.md, and docs/test-design.org.
 *
 * Scope Constraint:
 * Audits exclusively the `tests/` directory (or a target directory passed via CLI parameter).
 * Does not inspect or mutate `src/` or any directories outside the audit scope.
 *
 * Capabilities:
 * 1. Test AST & Scope Isolation:
 *    - Discovers all test and benchmark modules within the target directory.
 *    - Balanced-brace scope parser (`findMatchingBraceEnd`) isolates each individual test callback.
 *    - Extracts startLine and endLine numbers for every test declaration.
 *    - Scans assertion counts per test to evaluate Arrange-Act-Assert (AAA) single-assertion compliance.
 *    - Classifies test names against the two-level prefix convention:
 *      * Level 1 Category: `unit:`, `integration:`, `e2e:`, `bench:`
 *      * Level 2 Component: `<Component>: <behavior>` vs `<Component> <behavior>` vs missing component.
 *    - Audits quarantine lifecycle for any `ignore: true` tests against `.scratch/technical-debt/issues/`.
 *    - Flags each test with `isCompliant` and detailed `complianceIssues`.
 * 2. Setup & Harness Architecture Scanner:
 *    - Audits Preact UI component tests for `@testing-library/preact` and explicit `cleanup()` lifecycles.
 *    - Audits host DOM tests for centralized routing through `tests/fixtures/dom_fixture.ts`.
 *    - Flags any bespoke DOM shims or mocks declared outside `dom_fixture.ts`.
 *    - Detects inlined HTML string literals for recommended extraction to `tests/fixtures/html/`.
 *    - Detects repeated identical setup patterns or setup helper functions >15 lines for shared fixture extraction.
 * 3. Scoped Telemetry & Console Call Scanner:
 *    - Scans all files within the target test directory for unmanaged `console.log|warn|error|info|debug` calls.
 * 4. Hierarchical Directory & File Aggregation:
 *    - Recursively groups test metrics by directory and file.
 *    - Every directory and file node contains summed counts and compliance percentages.
 * 5. Datestamped JSON Emission:
 *    - Emits structured JSON to `docs/audits/20260914_test-audit/<timestamp>_test-pipeline-audit.json`.
 *    - Includes complete `allTests` array with line numbers and compliance flags.
 *    - Renders a clean terminal summary table.
 */

import { parseArgs } from "@std/cli/parse-args";
import * as path from "node:path";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type TestCategory = "unit" | "integration" | "e2e" | "bench" | "unknown";

export type PrefixQuality =
    | "strict_two_level" // Matches `<category>: <Component>: <behavior>`
    | "component_no_colon" // Matches `<category>: <Component> <behavior>`
    | "missing_component" // Has valid category, but lacks component identifier
    | "invalid_category"; // Missing or unrecognized category prefix

export interface TestCaseAudit {
    file: string;
    line: number;
    startLine: number;
    endLine: number;
    name: string;
    type: "test" | "bench";
    category: TestCategory;
    hasCategoryPrefix: boolean;
    component: string | null;
    hasStrictLevel2Prefix: boolean;
    hasComponentToken: boolean;
    prefixQuality: PrefixQuality;
    assertionCount: number;
    isSingleAssertion: boolean;
    isIgnored: boolean;
    hasQuarantineComment: boolean;
    quarantineTicket: string | null;
    ticketExists: boolean | null;
    isCompliant: boolean;
    complianceIssues: string[];
}

export interface InlinedHtmlSnippet {
    file: string;
    line: number;
    lineCount: number;
    preview: string;
}

export interface RepeatedSetupBlock {
    file: string;
    line: number;
    name: string;
    lineCount: number;
    details: string;
}

export interface CustomDomShim {
    file: string;
    line: number;
    description: string;
}

export interface FileAudit {
    file: string;
    testCount: number;
    tests: TestCaseAudit[];
    usesPreactTestingLibrary: boolean;
    usesCleanup: boolean;
    usesDomFixture: boolean;
    usesFixtureLoader: boolean;
    customShims: CustomDomShim[];
    repeatedSetups: RepeatedSetupBlock[];
    inlinedHtmlStrings: InlinedHtmlSnippet[];
}

export type ConsoleScope = "test" | "fixture" | "script" | "unknown";

export interface ConsoleCall {
    file: string;
    line: number;
    method: "log" | "warn" | "error" | "info" | "debug" | "trace";
    lineContent: string;
    scope: ConsoleScope;
    hasCoreLogger: boolean;
}

/**
 * Aggregated test counts and compliance percentages for a file or directory node in the hierarchy.
 */
export interface TestCounts {
    totalTests: number;
    functionalTestsCount: number;
    compliantTestsCount: number;
    compliantTestsRate: number;
    nonCompliantTestsCount: number;
    nonCompliantTestsRate: number;
    testsByCategory: Record<TestCategory, number>;
    strictLevel2PrefixCount: number;
    componentTokenCount: number;
    missingComponentCount: number;
    invalidCategoryCount: number;
    singleAssertionCount: number;
    multiAssertionCount: number;
    zeroAssertionCount: number;
    quarantinedTestsCount: number;
}

/**
 * File node in the hierarchical audit tree.
 */
export interface FileNode {
    type: "file";
    name: string;
    path: string;
    counts: TestCounts;
    harness: {
        usesPreactTestingLibrary: boolean;
        usesCleanup: boolean;
        usesDomFixture: boolean;
        usesFixtureLoader: boolean;
        customShimsCount: number;
        repeatedSetupsCount: number;
        inlinedHtmlStringsCount: number;
    };
    customShims: CustomDomShim[];
    repeatedSetups: RepeatedSetupBlock[];
    inlinedHtmlStrings: InlinedHtmlSnippet[];
    tests: TestCaseAudit[];
}

/**
 * Directory node in the hierarchical audit tree, recursively grouping subdirectories and files.
 */
export interface DirectoryNode {
    type: "directory";
    name: string;
    path: string;
    counts: TestCounts;
    subdirectories: DirectoryNode[];
    files: FileNode[];
}

export interface AuditSummary {
    targetDirectory: string;
    totalTestFiles: number;
    totalTests: number;
    functionalTestsCount: number;
    compliantTestsCount: number;
    compliantTestsRate: number;
    nonCompliantTestsCount: number;
    nonCompliantTestsRate: number;
    testsByCategory: Record<TestCategory, number>;
    categoryPrefixComplianceRate: number;
    strictLevel2PrefixCount: number;
    strictLevel2PrefixRate: number;
    componentTokenCount: number;
    componentTokenRate: number;
    missingComponentCount: number;
    missingComponentRate: number;
    singleAssertionCount: number;
    singleAssertionRate: number;
    multiAssertionCount: number;
    multiAssertionRate: number;
    zeroAssertionCount: number;
    zeroAssertionRate: number;
    quarantinedTestsCount: number;
    quarantineTicketComplianceCount: number;
    consoleCalls: {
        total: number;
        test: number;
        fixture: number;
        script: number;
    };
}

export interface AuditReport {
    metadata: {
        generatedAt: string;
        denoVersion: string;
        rootPath: string;
        targetDirectory: string;
    };
    summary: AuditSummary;
    hierarchy: DirectoryNode;
    allTests: TestCaseAudit[];
    nonCompliantTests: TestCaseAudit[];
    files: FileAudit[];
    consoleCalls: ConsoleCall[];
    repeatedSetups: RepeatedSetupBlock[];
    inlinedHtmlSnippets: InlinedHtmlSnippet[];
}

// ============================================================================
// Core Scanning & Analysis Engine
// ============================================================================

/**
 * Standardized assertion function identifiers recognized in AAA analysis.
 */
const ASSERTION_IDENTIFIERS = [
    "assertEquals",
    "assertNotEquals",
    "assertStrictEquals",
    "assertNotStrictEquals",
    "assertAlmostEquals",
    "assertInstanceOf",
    "assertStringIncludes",
    "assertMatch",
    "assertNotMatch",
    "assertArrayIncludes",
    "assertObjectMatch",
    "assertThrows",
    "assertRejects",
    "assertExists",
    "assertFalse",
    "assert",
];

const ASSERTION_REGEX = new RegExp(`\\b(${ASSERTION_IDENTIFIERS.join("|")})\\s*\\(`, "g");

/**
 * Finds character offset of closing matching brace `{ ... }` starting from the opening brace index.
 * Safely skips string literals, template literals, and single-line/multi-line comments.
 */
function findMatchingBraceEnd(source: string, openBraceIdx: number): number {
    let depth = 0;
    let i = openBraceIdx;
    let inString: false | "'" | '"' | "`" = false;
    let inLineComment = false;
    let inBlockComment = false;

    while (i < source.length) {
        const ch = source[i];
        const next = source[i + 1];

        // Handle string literals and escapes
        if (inString) {
            if (ch === "\\" && i + 1 < source.length) {
                i += 2;
                continue;
            }
            if (ch === inString) {
                inString = false;
            }
            i++;
            continue;
        }

        // Handle single-line comments
        if (inLineComment) {
            if (ch === "\n") {
                inLineComment = false;
            }
            i++;
            continue;
        }

        // Handle block comments
        if (inBlockComment) {
            if (ch === "*" && next === "/") {
                inBlockComment = false;
                i += 2;
                continue;
            }
            i++;
            continue;
        }

        // Check comment entry
        if (ch === "/" && next === "/") {
            inLineComment = true;
            i += 2;
            continue;
        }
        if (ch === "/" && next === "*") {
            inBlockComment = true;
            i += 2;
            continue;
        }

        // Check string entry
        if (ch === '"' || ch === "'" || ch === "`") {
            inString = ch;
            i++;
            continue;
        }

        // Track curly braces
        if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
            if (depth === 0) {
                return i;
            }
        }

        i++;
    }

    return source.length;
}

/**
 * Computes 1-based line number for a character index within the source text.
 */
function getLineNumber(source: string, charIdx: number): number {
    let line = 1;
    for (let i = 0; i < charIdx && i < source.length; i++) {
        if (source[i] === "\n") line++;
    }
    return line;
}

/**
 * Analyzes a test name for Level 1 Category and Level 2 Component prefix adherence.
 *
 * Specifications (docs/test-design.org):
 * - Level 1 Category: `unit: `, `integration: `, `e2e: `, `bench: `
 * - Level 2 Component: `<Component>: <behavior>` or `<Component> <behavior>`
 */
function analyzeTestNomenclature(testName: string): {
    category: TestCategory;
    hasCategoryPrefix: boolean;
    component: string | null;
    hasStrictLevel2Prefix: boolean;
    hasComponentToken: boolean;
    prefixQuality: PrefixQuality;
} {
    const categoryMatch = testName.match(/^(unit|integration|e2e|bench):\s*(.*)$/);

    if (!categoryMatch) {
        return {
            category: "unknown",
            hasCategoryPrefix: false,
            component: null,
            hasStrictLevel2Prefix: false,
            hasComponentToken: false,
            prefixQuality: "invalid_category",
        };
    }

    const category = categoryMatch[1] as TestCategory;
    const remainder = categoryMatch[2].trim();

    // Check strict Level 2 syntax: `[category]: [ComponentUnderTest]: [behavior]`
    const strictMatch = remainder.match(/^([A-Za-z0-9_.-]+):\s*(.+)$/);
    if (strictMatch) {
        return {
            category,
            hasCategoryPrefix: true,
            component: strictMatch[1],
            hasStrictLevel2Prefix: true,
            hasComponentToken: true,
            prefixQuality: "strict_two_level",
        };
    }

    // Check relaxed component token without colon: `[category]: [ComponentUnderTest] [behavior]`
    // Matches PascalCase tokens (e.g. FloatingHud), file tokens (build.ts), or known module acronyms
    const componentTokenMatch = remainder.match(
        /^([A-Z][A-Za-z0-9_.-]*|[a-z0-9_.-]+\.ts|KaTeX|CoreLogger|DOM|SPA|AST|Preact)\b\s+(.+)$/,
    );
    if (componentTokenMatch) {
        return {
            category,
            hasCategoryPrefix: true,
            component: componentTokenMatch[1],
            hasStrictLevel2Prefix: false,
            hasComponentToken: true,
            prefixQuality: "component_no_colon",
        };
    }

    // Remainder does not start with an identifiable component token
    return {
        category,
        hasCategoryPrefix: true,
        component: null,
        hasStrictLevel2Prefix: false,
        hasComponentToken: false,
        prefixQuality: "missing_component",
    };
}

/**
 * Counts assertions inside a test function body.
 */
function countAssertions(bodySource: string): number {
    const matches = bodySource.match(ASSERTION_REGEX);
    return matches ? matches.length : 0;
}

/**
 * Checks quarantine status and verifies tracking ticket presence for `ignore: true` tests.
 */
async function inspectQuarantine(
    source: string,
    testDeclIndex: number,
    isIgnored: boolean,
    projectRoot: string,
): Promise<{
    hasQuarantineComment: boolean;
    quarantineTicket: string | null;
    ticketExists: boolean | null;
}> {
    if (!isIgnored) {
        return {
            hasQuarantineComment: false,
            quarantineTicket: null,
            ticketExists: null,
        };
    }

    // Examine preceding 5 lines for quarantine annotation
    const precedingChunk = source.slice(Math.max(0, testDeclIndex - 400), testDeclIndex);
    const lines = precedingChunk.split("\n").map((l) => l.trim());

    let ticketPath: string | null = null;
    let hasComment = false;

    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 6); i--) {
        const line = lines[i];
        if (line.includes("Quarantined:") || line.includes(".scratch/technical-debt/")) {
            hasComment = true;
            const match = line.match(/\.scratch\/technical-debt\/issues\/[a-zA-Z0-9_-]+\.org/);
            if (match) {
                ticketPath = match[0];
                break;
            }
        }
    }

    let ticketExists: boolean | null = null;
    if (ticketPath) {
        try {
            const stat = await Deno.stat(path.join(projectRoot, ticketPath));
            ticketExists = stat.isFile;
        } catch {
            ticketExists = false;
        }
    }

    return {
        hasQuarantineComment: hasComment,
        quarantineTicket: ticketPath,
        ticketExists,
    };
}

/**
 * Evaluates whether a test case meets all repository test standards.
 */
function evaluateTestCompliance(tc: {
    hasCategoryPrefix: boolean;
    hasStrictLevel2Prefix: boolean;
    hasComponentToken: boolean;
    assertionCount: number;
    type: "test" | "bench";
    isIgnored: boolean;
    hasQuarantineComment: boolean;
    ticketExists: boolean | null;
}): { isCompliant: boolean; complianceIssues: string[] } {
    const complianceIssues: string[] = [];

    if (!tc.hasCategoryPrefix) {
        complianceIssues.push(
            "Missing authorized Level 1 category prefix (unit:, integration:, e2e:, bench:)",
        );
    }

    if (!tc.hasStrictLevel2Prefix) {
        if (tc.hasComponentToken) {
            complianceIssues.push(
                "Missing colon separator after Level 2 component prefix (<category>: <Component>: <behavior>)",
            );
        } else {
            complianceIssues.push(
                "Missing Level 2 target component prefix (<category>: <Component>: <behavior>)",
            );
        }
    }

    // Benchmark tests measure throughput (b.start / b.end) and are excluded from AAA single-assertion counts
    if (tc.type === "test") {
        if (tc.assertionCount > 1) {
            complianceIssues.push(
                `Arrange-Act-Assert violation: multiple assertions detected (${tc.assertionCount})`,
            );
        } else if (tc.assertionCount === 0) {
            complianceIssues.push("Zero assertions detected in test body");
        }
    }

    if (tc.isIgnored) {
        if (!tc.hasQuarantineComment) {
            complianceIssues.push(
                "Ignored test missing mandatory quarantine comment citing .scratch/technical-debt/issues/",
            );
        }
        if (tc.ticketExists === false) {
            complianceIssues.push("Referenced technical debt ticket file does not exist on disk");
        }
    }

    return {
        isCompliant: complianceIssues.length === 0,
        complianceIssues,
    };
}

/**
 * Scans an individual test file for test cases, harness imports, inlined HTML, and setup architecture.
 */
export async function auditTestFile(filePath: string, projectRoot: string): Promise<FileAudit> {
    const content = await Deno.readTextFile(filePath);
    const relativePath = path.relative(projectRoot, filePath);

    const testCases: TestCaseAudit[] = [];
    const customShims: CustomDomShim[] = [];
    const repeatedSetups: RepeatedSetupBlock[] = [];
    const inlinedHtmlStrings: InlinedHtmlSnippet[] = [];

    // 1. Harness and Fixture imports
    const usesPreactTestingLibrary = content.includes("@testing-library/preact");
    const usesCleanup = content.includes("cleanup()") || content.includes("cleanup();");
    const usesDomFixture = content.includes("fixtures/dom_fixture.ts") || content.includes("setupTestDom");
    const usesFixtureLoader = content.includes("fixtures/fixture_loader.ts") || content.includes("loadHtmlFixture");

    // 2. Custom DOM Shims check (flags manual shimming outside dom_fixture.ts)
    if (!filePath.endsWith("dom_fixture.ts")) {
        const shimRegex =
            /\b(class\s+Mock[A-Za-z0-9_]+|document\.createElement\s*=|Element\.prototype\.[A-Za-z0-9_]+\s*=)\b/g;
        let shimMatch: RegExpExecArray | null;
        while ((shimMatch = shimRegex.exec(content)) !== null) {
            customShims.push({
                file: relativePath,
                line: getLineNumber(content, shimMatch.index),
                description: shimMatch[0],
            });
        }
    }

    // 3. Inlined HTML templates and strings check
    const htmlRegex =
        /(?:html\s*:\s*|["'`])((?:<!DOCTYPE\s+html|<html\b|<div\b|<body\b|<math\b|<code-block\b|<table\b|<pre\b)[^"'`]*)(?:["'`])/gi;
    let htmlMatch: RegExpExecArray | null;
    while ((htmlMatch = htmlRegex.exec(content)) !== null) {
        const matchedStr = htmlMatch[1];
        if (matchedStr.length > 15) {
            const line = getLineNumber(content, htmlMatch.index);
            const preview = matchedStr.replace(/\s+/g, " ").trim().slice(0, 80);
            inlinedHtmlStrings.push({
                file: relativePath,
                line,
                lineCount: matchedStr.split("\n").length,
                preview: preview + (preview.length >= 80 ? "..." : ""),
            });
        }
    }

    // 4. Repeated or Complex Setup Helper Detection
    const setupFnRegex = /(?:function\s+(setup[A-Za-z0-9_]*|init[A-Za-z0-9_]*)|const\s+(setup[A-Za-z0-9_]*)\s*=\s*)/g;
    let setupMatch: RegExpExecArray | null;
    while ((setupMatch = setupFnRegex.exec(content)) !== null) {
        const fnName = setupMatch[1] || setupMatch[2];
        const openBraceIdx = content.indexOf("{", setupMatch.index);
        if (openBraceIdx !== -1 && openBraceIdx - setupMatch.index < 80) {
            const endBraceIdx = findMatchingBraceEnd(content, openBraceIdx);
            const fnBody = content.slice(openBraceIdx, endBraceIdx + 1);
            const lines = fnBody.split("\n");
            if (lines.length > 15) {
                repeatedSetups.push({
                    file: relativePath,
                    line: getLineNumber(content, setupMatch.index),
                    name: fnName,
                    lineCount: lines.length,
                    details: `Setup routine exceeding 15 lines (${lines.length} lines) - target for shared fixture`,
                });
            }
        }
    }

    // Check for repeated identical setupTestDom calls (3+ occurrences in file)
    const setupDomCalls = content.match(/setupTestDom\(\s*\{[^}]+\}\s*\)/g);
    if (setupDomCalls && setupDomCalls.length >= 3) {
        const firstCall = setupDomCalls[0];
        const identicalCount = setupDomCalls.filter((c) => c === firstCall).length;
        if (identicalCount >= 3) {
            repeatedSetups.push({
                file: relativePath,
                line: getLineNumber(content, content.indexOf(firstCall)),
                name: "setupTestDom(identicalOptions)",
                lineCount: identicalCount,
                details:
                    `Identical setupTestDom options repeated ${identicalCount} times - target for shared fixture helper`,
            });
        }
    }

    // 5. Test Declaration Parsing: Deno.test(...) and Deno.bench(...)
    const testDeclRegex = /\bDeno\.(test|bench)\s*\(\s*(?:({|"[^"]*"|'[^']*'|`[^`]*`))/g;
    let match: RegExpExecArray | null;

    while ((match = testDeclRegex.exec(content)) !== null) {
        const testType = match[1] as "test" | "bench";
        const firstArgToken = match[2];
        const declStart = match.index;
        const line = getLineNumber(content, declStart);

        let testName = "";
        let isIgnored = false;
        let fnBodyStart = -1;

        if (firstArgToken === "{") {
            // Object options syntax: Deno.test({ name: "...", ignore: true }, ...)
            const endBrace = findMatchingBraceEnd(content, match.index + match[0].lastIndexOf("{"));
            const objContent = content.slice(match.index + match[0].lastIndexOf("{"), endBrace + 1);

            const nameMatch = objContent.match(/name\s*:\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/);
            if (nameMatch) {
                testName = nameMatch[1] ?? nameMatch[2] ?? nameMatch[3] ?? "";
            }

            if (/ignore\s*:\s*true/.test(objContent)) {
                isIgnored = true;
            }

            const callbackOpenBrace = content.indexOf("{", endBrace + 1);
            if (callbackOpenBrace !== -1) {
                fnBodyStart = callbackOpenBrace;
            }
        } else {
            // String literal syntax: Deno.test("...", ...)
            testName = firstArgToken.slice(1, -1);

            // Check second argument options: Deno.test("...", { ignore: true }, ...)
            const afterNameIdx = match.index + match[0].length;
            const nextPunctuation = content.slice(afterNameIdx, afterNameIdx + 100);
            const optMatch = nextPunctuation.match(/^\s*,\s*\{\s*([^}]+)\}/);
            if (optMatch && /ignore\s*:\s*true/.test(optMatch[1])) {
                isIgnored = true;
            }

            const openBrace = content.indexOf("{", afterNameIdx);
            if (openBrace !== -1) {
                fnBodyStart = openBrace;
            }
        }

        // Extract body, calculate endLine, and count assertions
        let assertionCount = 0;
        let endLine = line;
        if (fnBodyStart !== -1) {
            const bodyEnd = findMatchingBraceEnd(content, fnBodyStart);
            const bodySource = content.slice(fnBodyStart, bodyEnd + 1);
            assertionCount = countAssertions(bodySource);

            // Locate closing parenthesis of Deno.test/bench invocation
            const closeParenIdx = content.indexOf(")", bodyEnd);
            const declEndIdx = closeParenIdx !== -1 ? closeParenIdx : bodyEnd;
            endLine = getLineNumber(content, declEndIdx);
        } else {
            const closeParenIdx = content.indexOf(")", declStart);
            if (closeParenIdx !== -1) {
                endLine = getLineNumber(content, closeParenIdx);
            }
        }

        const nomenclature = analyzeTestNomenclature(testName);
        const quarantine = await inspectQuarantine(content, declStart, isIgnored, projectRoot);

        const compliance = evaluateTestCompliance({
            hasCategoryPrefix: nomenclature.hasCategoryPrefix,
            hasStrictLevel2Prefix: nomenclature.hasStrictLevel2Prefix,
            hasComponentToken: nomenclature.hasComponentToken,
            assertionCount,
            type: testType,
            isIgnored,
            hasQuarantineComment: quarantine.hasQuarantineComment,
            ticketExists: quarantine.ticketExists,
        });

        testCases.push({
            file: relativePath,
            line,
            startLine: line,
            endLine,
            name: testName,
            type: testType,
            category: nomenclature.category,
            hasCategoryPrefix: nomenclature.hasCategoryPrefix,
            component: nomenclature.component,
            hasStrictLevel2Prefix: nomenclature.hasStrictLevel2Prefix,
            hasComponentToken: nomenclature.hasComponentToken,
            prefixQuality: nomenclature.prefixQuality,
            assertionCount,
            isSingleAssertion: assertionCount === 1,
            isIgnored,
            hasQuarantineComment: quarantine.hasQuarantineComment,
            quarantineTicket: quarantine.quarantineTicket,
            ticketExists: quarantine.ticketExists,
            isCompliant: compliance.isCompliant,
            complianceIssues: compliance.complianceIssues,
        });
    }

    return {
        file: relativePath,
        testCount: testCases.length,
        tests: testCases,
        usesPreactTestingLibrary,
        usesCleanup,
        usesDomFixture,
        usesFixtureLoader,
        customShims,
        repeatedSetups,
        inlinedHtmlStrings,
    };
}

/**
 * Scans a file within the test directory for `console.*` invocations.
 */
export async function auditConsoleCalls(filePath: string, projectRoot: string): Promise<ConsoleCall[]> {
    const content = await Deno.readTextFile(filePath);
    const relativePath = path.relative(projectRoot, filePath);

    let scope: ConsoleScope = "test";
    if (relativePath.includes("/fixtures/")) {
        scope = "fixture";
    } else if (relativePath.includes("/scripts/")) {
        scope = "script";
    }

    const hasCoreLogger = content.includes("CoreLogger") || content.includes("@/core/logging");

    const consoleCalls: ConsoleCall[] = [];
    const lines = content.split("\n");

    for (let idx = 0; idx < lines.length; idx++) {
        const lineContent = lines[idx];
        const consoleMatch = lineContent.match(/\bconsole\.(log|warn|error|info|debug|trace)\s*\(/);
        if (consoleMatch) {
            const trimmed = lineContent.trim();
            if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
                continue;
            }

            consoleCalls.push({
                file: relativePath,
                line: idx + 1,
                method: consoleMatch[1] as ConsoleCall["method"],
                lineContent: trimmed,
                scope,
                hasCoreLogger,
            });
        }
    }

    return consoleCalls;
}

/**
 * Recursively walks a directory and collects file paths matching a filter predicate.
 */
async function walkFiles(
    dir: string,
    filter: (entryName: string, fullPath: string) => boolean,
): Promise<string[]> {
    const results: string[] = [];

    async function walk(currentDir: string) {
        for await (const entry of Deno.readDir(currentDir)) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory) {
                if (entry.name === "node_modules" || entry.name === ".git") {
                    continue;
                }
                await walk(fullPath);
            } else if (entry.isFile) {
                if (filter(entry.name, fullPath)) {
                    results.push(fullPath);
                }
            }
        }
    }

    try {
        await walk(dir);
    } catch {
        // Directory does not exist or is inaccessible
    }

    return results.sort();
}

/**
 * Creates an empty test counts object.
 */
function createEmptyCounts(): TestCounts {
    return {
        totalTests: 0,
        functionalTestsCount: 0,
        compliantTestsCount: 0,
        compliantTestsRate: 0,
        nonCompliantTestsCount: 0,
        nonCompliantTestsRate: 0,
        testsByCategory: {
            unit: 0,
            integration: 0,
            e2e: 0,
            bench: 0,
            unknown: 0,
        },
        strictLevel2PrefixCount: 0,
        componentTokenCount: 0,
        missingComponentCount: 0,
        invalidCategoryCount: 0,
        singleAssertionCount: 0,
        multiAssertionCount: 0,
        zeroAssertionCount: 0,
        quarantinedTestsCount: 0,
    };
}

/**
 * Computes summed test counts and compliance rates for an individual file's test suite.
 */
function computeFileCounts(tests: TestCaseAudit[]): TestCounts {
    const c = createEmptyCounts();
    for (const t of tests) {
        c.totalTests++;
        if (t.isCompliant) {
            c.compliantTestsCount++;
        } else {
            c.nonCompliantTestsCount++;
        }

        c.testsByCategory[t.category]++;
        if (t.prefixQuality === "strict_two_level") c.strictLevel2PrefixCount++;
        else if (t.prefixQuality === "component_no_colon") c.componentTokenCount++;
        else if (t.prefixQuality === "missing_component") c.missingComponentCount++;
        else if (t.prefixQuality === "invalid_category") c.invalidCategoryCount++;

        // Benchmark tests measure throughput and are excluded from AAA single-assertion counts
        if (t.type === "test") {
            c.functionalTestsCount++;
            if (t.assertionCount === 1) c.singleAssertionCount++;
            else if (t.assertionCount > 1) c.multiAssertionCount++;
            else c.zeroAssertionCount++;
        }

        if (t.isIgnored) c.quarantinedTestsCount++;
    }

    c.compliantTestsRate = c.totalTests > 0 ? (c.compliantTestsCount / c.totalTests) * 100 : 0;
    c.nonCompliantTestsRate = c.totalTests > 0 ? (c.nonCompliantTestsCount / c.totalTests) * 100 : 0;

    return c;
}

/**
 * Adds source counts into target counts in-place, updating percentage rates.
 */
function addCounts(target: TestCounts, source: TestCounts): void {
    target.totalTests += source.totalTests;
    target.functionalTestsCount += source.functionalTestsCount;
    target.compliantTestsCount += source.compliantTestsCount;
    target.nonCompliantTestsCount += source.nonCompliantTestsCount;

    for (const cat of Object.keys(source.testsByCategory) as TestCategory[]) {
        target.testsByCategory[cat] += source.testsByCategory[cat];
    }
    target.strictLevel2PrefixCount += source.strictLevel2PrefixCount;
    target.componentTokenCount += source.componentTokenCount;
    target.missingComponentCount += source.missingComponentCount;
    target.invalidCategoryCount += source.invalidCategoryCount;
    target.singleAssertionCount += source.singleAssertionCount;
    target.multiAssertionCount += source.multiAssertionCount;
    target.zeroAssertionCount += source.zeroAssertionCount;
    target.quarantinedTestsCount += source.quarantinedTestsCount;

    target.compliantTestsRate = target.totalTests > 0 ? (target.compliantTestsCount / target.totalTests) * 100 : 0;
    target.nonCompliantTestsRate = target.totalTests > 0
        ? (target.nonCompliantTestsCount / target.totalTests) * 100
        : 0;
}

/**
 * Builds a hierarchical directory and file tree from flat file audits.
 * Recursively groups tests by directory and file, summing all metrics
 * bottom-up so that every directory and file contains exact summed counts and rates.
 */
export function buildHierarchicalTree(fileAudits: FileAudit[], rootPath = "tests"): DirectoryNode {
    const rootNode: DirectoryNode = {
        type: "directory",
        name: path.basename(rootPath) || "tests",
        path: rootPath,
        counts: createEmptyCounts(),
        subdirectories: [],
        files: [],
    };

    for (const fileAudit of fileAudits) {
        const counts = computeFileCounts(fileAudit.tests);
        const fileNode: FileNode = {
            type: "file",
            name: path.basename(fileAudit.file),
            path: fileAudit.file,
            counts,
            harness: {
                usesPreactTestingLibrary: fileAudit.usesPreactTestingLibrary,
                usesCleanup: fileAudit.usesCleanup,
                usesDomFixture: fileAudit.usesDomFixture,
                usesFixtureLoader: fileAudit.usesFixtureLoader,
                customShimsCount: fileAudit.customShims.length,
                repeatedSetupsCount: fileAudit.repeatedSetups.length,
                inlinedHtmlStringsCount: fileAudit.inlinedHtmlStrings.length,
            },
            customShims: fileAudit.customShims,
            repeatedSetups: fileAudit.repeatedSetups,
            inlinedHtmlStrings: fileAudit.inlinedHtmlStrings,
            tests: fileAudit.tests,
        };

        // Determine directory segments relative to rootPath
        let rel = fileAudit.file;
        if (rel.startsWith(rootPath + "/")) {
            rel = rel.slice(rootPath.length + 1);
        } else if (rel.startsWith(rootPath)) {
            rel = rel.slice(rootPath.length);
            if (rel.startsWith("/")) rel = rel.slice(1);
        }

        const dirParts = path.dirname(rel).split("/").filter((p) => p && p !== ".");

        let currentDir = rootNode;
        let runningPath = rootPath;

        for (const part of dirParts) {
            runningPath = `${runningPath}/${part}`;
            let childDir = currentDir.subdirectories.find((d) => d.name === part);
            if (!childDir) {
                childDir = {
                    type: "directory",
                    name: part,
                    path: runningPath,
                    counts: createEmptyCounts(),
                    subdirectories: [],
                    files: [],
                };
                currentDir.subdirectories.push(childDir);
            }
            currentDir = childDir;
        }

        currentDir.files.push(fileNode);
    }

    // Post-order bottom-up aggregation: sum counts for each directory
    function aggregateDirCounts(dir: DirectoryNode): TestCounts {
        const total = createEmptyCounts();
        for (const f of dir.files) {
            addCounts(total, f.counts);
        }
        for (const sub of dir.subdirectories) {
            const subCounts = aggregateDirCounts(sub);
            addCounts(total, subCounts);
        }
        dir.counts = total;
        return total;
    }

    aggregateDirCounts(rootNode);

    // Sort subdirectories and files alphabetically for deterministic output
    function sortTree(dir: DirectoryNode) {
        dir.subdirectories.sort((a, b) => a.name.localeCompare(b.name));
        dir.files.sort((a, b) => a.name.localeCompare(b.name));
        for (const sub of dir.subdirectories) {
            sortTree(sub);
        }
    }
    sortTree(rootNode);

    return rootNode;
}

/**
 * Executes full pipeline audit strictly within the specified target directory.
 */
export async function runPipelineAudit(options: {
    projectRoot: string;
    targetDir?: string;
}): Promise<AuditReport> {
    const root = options.projectRoot;
    const targetDir = path.join(root, options.targetDir ?? "tests");
    const relTarget = path.relative(root, targetDir) || options.targetDir || "tests";

    // 1. Discover test and bench files strictly within target directory
    const testFiles = await walkFiles(
        targetDir,
        (name) =>
            (name.endsWith("_test.ts") ||
                name.endsWith("_test.tsx") ||
                name.endsWith("_bench.ts") ||
                name.endsWith(".test.ts") ||
                name.endsWith(".test.tsx") ||
                name.endsWith(".bench.ts")) &&
            !name.endsWith(".d.ts"),
    );

    // 2. Discover code and script files strictly within target directory for console call analysis
    const codeFiles = await walkFiles(
        targetDir,
        (name) =>
            (name.endsWith(".ts") ||
                name.endsWith(".tsx") ||
                name.endsWith(".js") ||
                name.endsWith(".jsx") ||
                name.endsWith(".html")) &&
            !name.endsWith(".d.ts"),
    );

    // 3. Run test file audits
    const fileAudits: FileAudit[] = [];
    for (const tf of testFiles) {
        fileAudits.push(await auditTestFile(tf, root));
    }

    // 4. Run console call audit strictly within target directory
    const consoleCalls: ConsoleCall[] = [];
    for (const cf of codeFiles) {
        const calls = await auditConsoleCalls(cf, root);
        consoleCalls.push(...calls);
    }

    // 5. Aggregate summary statistics and collect all tests
    let totalTests = 0;
    let functionalTestsCount = 0;
    let compliantTestsCount = 0;
    let nonCompliantTestsCount = 0;

    const testsByCategory: Record<TestCategory, number> = {
        unit: 0,
        integration: 0,
        e2e: 0,
        bench: 0,
        unknown: 0,
    };

    let strictLevel2PrefixCount = 0;
    let componentTokenCount = 0;
    let missingComponentCount = 0;
    let categoryPrefixCount = 0;

    let singleAssertionCount = 0;
    let multiAssertionCount = 0;
    let zeroAssertionCount = 0;

    let quarantinedTestsCount = 0;
    let quarantineTicketComplianceCount = 0;

    const allTests: TestCaseAudit[] = [];
    const nonCompliantTests: TestCaseAudit[] = [];
    const repeatedSetups: RepeatedSetupBlock[] = [];
    const inlinedHtmlSnippets: InlinedHtmlSnippet[] = [];

    for (const fa of fileAudits) {
        repeatedSetups.push(...fa.repeatedSetups);
        inlinedHtmlSnippets.push(...fa.inlinedHtmlStrings);

        for (const tc of fa.tests) {
            totalTests++;
            allTests.push(tc);

            if (tc.isCompliant) {
                compliantTestsCount++;
            } else {
                nonCompliantTestsCount++;
                nonCompliantTests.push(tc);
            }

            testsByCategory[tc.category]++;

            if (tc.hasCategoryPrefix) {
                categoryPrefixCount++;
            }

            if (tc.hasStrictLevel2Prefix) {
                strictLevel2PrefixCount++;
            } else if (tc.hasComponentToken) {
                componentTokenCount++;
            } else {
                missingComponentCount++;
            }

            // Benchmark tests measure throughput and are excluded from AAA single-assertion counts
            if (tc.type === "test") {
                functionalTestsCount++;
                if (tc.assertionCount === 1) {
                    singleAssertionCount++;
                } else if (tc.assertionCount > 1) {
                    multiAssertionCount++;
                } else {
                    zeroAssertionCount++;
                }
            }

            if (tc.isIgnored) {
                quarantinedTestsCount++;
                if (tc.hasQuarantineComment && tc.quarantineTicket && tc.ticketExists) {
                    quarantineTicketComplianceCount++;
                }
            }
        }
    }

    const consoleSummary = {
        total: consoleCalls.length,
        test: consoleCalls.filter((c) => c.scope === "test").length,
        fixture: consoleCalls.filter((c) => c.scope === "fixture").length,
        script: consoleCalls.filter((c) => c.scope === "script").length,
    };

    const summary: AuditSummary = {
        targetDirectory: relTarget,
        totalTestFiles: fileAudits.length,
        totalTests,
        functionalTestsCount,
        compliantTestsCount,
        compliantTestsRate: totalTests > 0 ? (compliantTestsCount / totalTests) * 100 : 0,
        nonCompliantTestsCount,
        nonCompliantTestsRate: totalTests > 0 ? (nonCompliantTestsCount / totalTests) * 100 : 0,
        testsByCategory,
        categoryPrefixComplianceRate: totalTests > 0 ? (categoryPrefixCount / totalTests) * 100 : 0,
        strictLevel2PrefixCount,
        strictLevel2PrefixRate: totalTests > 0 ? (strictLevel2PrefixCount / totalTests) * 100 : 0,
        componentTokenCount,
        componentTokenRate: totalTests > 0 ? (componentTokenCount / totalTests) * 100 : 0,
        missingComponentCount,
        missingComponentRate: totalTests > 0 ? (missingComponentCount / totalTests) * 100 : 0,
        singleAssertionCount,
        singleAssertionRate: functionalTestsCount > 0 ? (singleAssertionCount / functionalTestsCount) * 100 : 0,
        multiAssertionCount,
        multiAssertionRate: functionalTestsCount > 0 ? (multiAssertionCount / functionalTestsCount) * 100 : 0,
        zeroAssertionCount,
        zeroAssertionRate: functionalTestsCount > 0 ? (zeroAssertionCount / functionalTestsCount) * 100 : 0,
        quarantinedTestsCount,
        quarantineTicketComplianceCount,
        consoleCalls: consoleSummary,
    };

    const hierarchy = buildHierarchicalTree(fileAudits, relTarget);

    return {
        metadata: {
            generatedAt: new Date().toISOString(),
            denoVersion: Deno.version.deno,
            rootPath: root,
            targetDirectory: relTarget,
        },
        summary,
        hierarchy,
        allTests,
        nonCompliantTests,
        files: fileAudits,
        consoleCalls,
        repeatedSetups,
        inlinedHtmlSnippets,
    };
}

// ============================================================================
// CLI Presentation & Formatter
// ============================================================================

/**
 * Renders an informative terminal dashboard for interactive execution.
 */
function renderTerminalDashboard(report: AuditReport): void {
    const s = report.summary;

    console.log("================================================================================");
    console.log("             AUTOMATED TEST PIPELINE AUDIT REPORT - STEP 2                      ");
    console.log("================================================================================");
    console.log(`Target Scope:     ${s.targetDirectory}`);
    console.log(`Generated At:     ${report.metadata.generatedAt}`);
    console.log(`Deno Runtime:     v${report.metadata.denoVersion}`);
    console.log(`Total Test Files: ${s.totalTestFiles}`);
    console.log(`Total Tests:      ${s.totalTests}`);
    console.log("--------------------------------------------------------------------------------");
    console.log("1. OVERALL COMPLIANCE (All Tests)");
    console.log(
        `   - Compliant Tests:     ${s.compliantTestsCount.toString().padStart(4)} (${
            s.compliantTestsRate.toFixed(1)
        }%)`,
    );
    console.log(
        `   - Non-Compliant Tests: ${s.nonCompliantTestsCount.toString().padStart(4)} (${
            s.nonCompliantTestsRate.toFixed(1)
        }%)`,
    );
    console.log("--------------------------------------------------------------------------------");
    console.log("2. TEST PYRAMID & CATEGORY DISTRIBUTION (Level 1)");
    console.log(
        `   - Unit Tests:         ${s.testsByCategory.unit.toString().padStart(4)} (${
            ((s.testsByCategory.unit / s.totalTests) * 100).toFixed(1)
        }%)`,
    );
    console.log(
        `   - Integration Tests:  ${s.testsByCategory.integration.toString().padStart(4)} (${
            ((s.testsByCategory.integration / s.totalTests) * 100).toFixed(1)
        }%)`,
    );
    console.log(
        `   - End-to-End Tests:   ${s.testsByCategory.e2e.toString().padStart(4)} (${
            ((s.testsByCategory.e2e / s.totalTests) * 100).toFixed(1)
        }%)`,
    );
    console.log(
        `   - Benchmarks:         ${s.testsByCategory.bench.toString().padStart(4)} (${
            ((s.testsByCategory.bench / s.totalTests) * 100).toFixed(1)
        }%)`,
    );
    console.log(`   - Category Prefix Compliance: ${s.categoryPrefixComplianceRate.toFixed(1)}%`);
    console.log("--------------------------------------------------------------------------------");
    console.log("3. TWO-LEVEL TEST PREFIX AUDIT (docs/test-design.org)");
    console.log(
        `   - Strict Two-Level (<cat>: <Comp>: <desc>): ${s.strictLevel2PrefixCount.toString().padStart(4)} (${
            s.strictLevel2PrefixRate.toFixed(1)
        }%)`,
    );
    console.log(
        `   - Component Token No Colon (<cat>: <Comp>):  ${s.componentTokenCount.toString().padStart(4)} (${
            s.componentTokenRate.toFixed(1)
        }%)`,
    );
    console.log(
        `   - Missing Target Component:                  ${s.missingComponentCount.toString().padStart(4)} (${
            s.missingComponentRate.toFixed(1)
        }%)`,
    );
    console.log("--------------------------------------------------------------------------------");
    console.log("4. ARRANGE-ACT-ASSERT (AAA) SINGLE-ASSERTION DISCIPLINE");
    console.log(
        `   - Functional Tests Evaluated:       ${
            s.functionalTestsCount.toString().padStart(4)
        } (Excludes ${s.testsByCategory.bench} benchmark${s.testsByCategory.bench === 1 ? "" : "s"})`,
    );
    console.log(
        `   - Exactly 1 Assertion (Compliant):  ${s.singleAssertionCount.toString().padStart(4)} (${
            s.singleAssertionRate.toFixed(1)
        }%)`,
    );
    console.log(
        `   - Multi-Assertion Invocations:      ${s.multiAssertionCount.toString().padStart(4)} (${
            s.multiAssertionRate.toFixed(1)
        }%)`,
    );
    console.log(
        `   - Zero Assertions / Pure Throws:    ${s.zeroAssertionCount.toString().padStart(4)} (${
            s.zeroAssertionRate.toFixed(1)
        }%)`,
    );
    console.log("--------------------------------------------------------------------------------");
    console.log("5. TELEMETRY & CONSOLE CALL AUDIT (Within Test Scope)");
    console.log(`   - Total Unmanaged console.* calls: ${s.consoleCalls.total}`);
    console.log(`     * In Test Suites:                ${s.consoleCalls.test}`);
    console.log(`     * In Test Fixtures:              ${s.consoleCalls.fixture}`);
    console.log(`     * In Test Scripts:               ${s.consoleCalls.script}`);
    console.log("--------------------------------------------------------------------------------");
    console.log("6. TEST ENVIRONMENT SETUP & FIXTURES");
    console.log(`   - Inlined HTML Snippets:             ${report.inlinedHtmlSnippets.length}`);
    console.log(`   - Repeated / Large Setup Routines:   ${report.repeatedSetups.length}`);
    console.log(`   - Quarantined Tests (ignore: true):  ${s.quarantinedTestsCount}`);
    console.log("================================================================================");
}

// ============================================================================
// Main Execution Entrypoint
// ============================================================================

if (import.meta.main) {
    const args = parseArgs(Deno.args, {
        string: ["output", "o", "dir", "d", "format", "f"],
        boolean: ["help", "h"],
        alias: { o: "output", d: "dir", h: "help", f: "format" },
        default: {
            format: "summary",
        },
    });

    if (args.help) {
        console.log(`
Usage: deno run -A scripts/audit_test_pipeline.ts [dir] [options]

Arguments:
  [dir]                  Target directory to audit (default: 'tests')

Options:
  -d, --dir <dir>        Explicit target directory to audit (default: 'tests').
  -o, --output <file>    Destination path for JSON audit metrics artifact.
                         (Default: docs/audits/20260914_test-audit/<timestamp>_test-pipeline-audit.json)
  -f, --format <format>  Output format: 'summary' (default), 'detailed', or 'json'.
  -h, --help             Show this help message.
        `);
        Deno.exit(0);
    }

    const projectRoot = Deno.cwd();
    const targetDir = args.dir || (args._[0] ? String(args._[0]) : "tests");

    // Generate formatted timestamp: YYYYMMDD-HHMMSS
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${
        pad(now.getMinutes())
    }${pad(now.getSeconds())}`;

    const defaultOutputDir = path.join(projectRoot, "docs/audits/20260914_test-audit");
    const defaultOutputFile = path.join(defaultOutputDir, `${timestamp}_test-pipeline-audit.json`);
    const outputPath = args.output ? path.resolve(projectRoot, args.output) : defaultOutputFile;

    const report = await runPipelineAudit({
        projectRoot,
        targetDir,
    });

    if (args.format === "json") {
        console.log(JSON.stringify(report, null, 2));
    } else {
        renderTerminalDashboard(report);
    }

    // Ensure output directory exists and write JSON artifact
    const outDir = path.dirname(outputPath);
    await Deno.mkdir(outDir, { recursive: true });
    await Deno.writeTextFile(outputPath, JSON.stringify(report, null, 2) + "\n");
    console.log(`\n✓ Structured JSON metrics saved to: ${path.relative(projectRoot, outputPath)}`);
}
