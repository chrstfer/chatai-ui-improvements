/**
 * @file scripts/query_test_audit.ts
 * @description Query and inspection utility for analyzing, filtering, and iterating through
 * automated test pipeline audit JSON files.
 *
 * Capabilities:
 * - Filtering by issue type: missing-colon, missing-comp, multi-assert, zero-assert, category, quarantine, all
 * - Filtering by category: unit, integration, e2e, bench
 * - Filtering by subdirectory or file path
 * - Grouping by file, directory, or issue
 * - Minimal, token-efficient output formats: compact, summary, remediation, json
 * - Automated suggestion generation for Level 2 prefix refactoring
 */

import { parseArgs } from "@std/cli/parse-args";
import * as path from "node:path";
import type { AuditReport, TestCaseAudit, TestCategory } from "./audit_test_pipeline.ts";

export type IssueFilter =
    | "all"
    | "colon"
    | "missing-colon"
    | "missing-comp"
    | "missing-component"
    | "multi-assert"
    | "aaa"
    | "zero-assert"
    | "category"
    | "quarantine";

export type GroupByDimension = "file" | "dir" | "issue" | "flat";
export type OutputFormat = "compact" | "remediation" | "summary" | "json";

interface QueryOptions {
    auditJsonPath?: string;
    issue?: IssueFilter;
    category?: TestCategory;
    directory?: string;
    fileFilter?: string;
    groupBy?: GroupByDimension;
    format?: OutputFormat;
    suggest?: boolean;
    maxResults?: number;
}

import CANONICAL_COMPONENT_MAP from "./canonical_component_map.json" with { type: "json" };

/**
 * Generates an authoritative suggested test name adhering to `<category>: <Component>: <behavior>`.
 */
export function generateSuggestedName(tc: TestCaseAudit): string {
    const baseCat = tc.category !== "unknown" ? tc.category : "unit";

    if (tc.hasStrictLevel2Prefix) {
        return tc.name;
    }

    const relKey = tc.file.replace(/^\.?\/?tests\//, "");

    if (tc.hasComponentToken && tc.component) {
        // Form: <cat>: <Comp> <behavior> -> <cat>: <Comp>: <behavior>
        const remainder = tc.name.replace(new RegExp(`^${tc.category}:\\s*${tc.component}\\s*`), "").trim();
        return `${baseCat}: ${tc.component}: ${remainder}`;
    }

    // Missing component entirely: lookup by full path from tests/ root
    let inferredComponent = (CANONICAL_COMPONENT_MAP as Record<string, string>)[relKey];

    if (!inferredComponent) {
        // Fallback: derive PascalCase from filename
        const baseName = path.basename(tc.file);
        const cleanName = baseName.replace(/(_test)?\.(ts|tsx)$/, "");
        inferredComponent = cleanName
            .split(/[_-]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join("");
    }

    const remainder = tc.name.replace(new RegExp(`^${tc.category}:\\s*`), "").trim();
    return `${baseCat}: ${inferredComponent}: ${remainder}`;
}

/**
 * Finds the latest test pipeline audit JSON file in docs/audits.
 */
export async function findLatestAuditJson(projectRoot: string): Promise<string | null> {
    const auditsDir = path.join(projectRoot, "docs/audits");
    let latestPath: string | null = null;
    let latestMtime = 0;

    async function scanDir(dir: string) {
        try {
            for await (const entry of Deno.readDir(dir)) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory) {
                    await scanDir(fullPath);
                } else if (entry.isFile && entry.name.endsWith("_test-pipeline-audit.json")) {
                    const stat = await Deno.stat(fullPath);
                    const mtime = stat.mtime?.getTime() ?? 0;
                    if (mtime > latestMtime) {
                        latestMtime = mtime;
                        latestPath = fullPath;
                    }
                }
            }
        } catch {
            // Directory inaccessible
        }
    }

    await scanDir(auditsDir);
    return latestPath;
}

/**
 * Matches a test case against the requested issue filter.
 */
function matchesIssue(tc: TestCaseAudit, filter: IssueFilter): boolean {
    switch (filter) {
        case "all":
            return !tc.isCompliant || tc.complianceIssues.length > 0;
        case "colon":
        case "missing-colon":
            return tc.prefixQuality === "component_no_colon";
        case "missing-comp":
        case "missing-component":
            return tc.prefixQuality === "missing_component";
        case "multi-assert":
        case "aaa":
            return tc.type === "test" && tc.assertionCount > 1;
        case "zero-assert":
            return tc.type === "test" && tc.assertionCount === 0;
        case "category":
            return !tc.hasCategoryPrefix;
        case "quarantine":
            return tc.isIgnored;
        default:
            return true;
    }
}

/**
 * Filters the audit test collection based on user criteria.
 */
export function queryTests(
    report: AuditReport,
    opts: QueryOptions,
): TestCaseAudit[] {
    let results = report.allTests;

    if (opts.issue) {
        results = results.filter((tc) => matchesIssue(tc, opts.issue!));
    }

    if (opts.category) {
        results = results.filter((tc) => tc.category === opts.category);
    }

    if (opts.directory) {
        const normDir = opts.directory.replace(/^\.?\/?/, "");
        results = results.filter((tc) => tc.file.includes(normDir));
    }

    if (opts.fileFilter) {
        results = results.filter((tc) => tc.file.includes(opts.fileFilter!));
    }

    if (opts.maxResults && opts.maxResults > 0) {
        results = results.slice(0, opts.maxResults);
    }

    return results;
}

/**
 * Formats results into token-efficient CLI representations.
 */
export function formatQueryResults(
    tests: TestCaseAudit[],
    opts: QueryOptions,
    _report?: AuditReport,
): string {
    const fmt = opts.format ?? "compact";

    if (fmt === "json") {
        return JSON.stringify(tests, null, 2);
    }

    if (fmt === "summary") {
        const fileMap = new Map<string, { total: number; colon: number; missing: number; multi: number }>();
        for (const t of tests) {
            const entry = fileMap.get(t.file) ?? { total: 0, colon: 0, missing: 0, multi: 0 };
            entry.total++;
            if (t.prefixQuality === "component_no_colon") entry.colon++;
            if (t.prefixQuality === "missing_component") entry.missing++;
            if (t.assertionCount > 1) entry.multi++;
            fileMap.set(t.file, entry);
        }

        const lines: string[] = [
            `Audit Query Summary (${tests.length} tests matched across ${fileMap.size} files):`,
            "--------------------------------------------------------------------------------",
            "File                                           Total  No-Colon  Missing  Multi-Assert",
            "--------------------------------------------------------------------------------",
        ];

        for (const [file, stat] of fileMap.entries()) {
            const shortFile = file.replace(/^tests\//, "").padEnd(46, " ");
            lines.push(
                `${shortFile} ${stat.total.toString().padStart(5)} ${stat.colon.toString().padStart(9)} ${
                    stat.missing.toString().padStart(8)
                } ${stat.multi.toString().padStart(12)}`,
            );
        }
        lines.push("--------------------------------------------------------------------------------");
        return lines.join("\n");
    }

    if (fmt === "remediation") {
        const byFile = new Map<string, TestCaseAudit[]>();
        for (const t of tests) {
            const list = byFile.get(t.file) ?? [];
            list.push(t);
            byFile.set(t.file, list);
        }

        const lines: string[] = [
            `Targeted Remediation Punchlist (${tests.length} non-compliant tests in ${byFile.size} files):`,
            "================================================================================",
        ];

        for (const [file, fileTests] of byFile.entries()) {
            lines.push(`\n[${file}] (${fileTests.length} tests requiring edit)`);
            for (const t of fileTests) {
                const suggested = generateSuggestedName(t);
                lines.push(`  L${t.startLine}-L${t.endLine}: "${t.name}"`);
                if (suggested !== t.name) {
                    lines.push(`    -> "${suggested}"`);
                }
                for (const issue of t.complianceIssues) {
                    lines.push(`    ! ${issue}`);
                }
            }
        }
        return lines.join("\n");
    }

    // Default: compact (minimal output tokens)
    const lines: string[] = [
        `Matched ${tests.length} tests (issue: ${opts.issue ?? "any"}, cat: ${opts.category ?? "all"}, dir: ${
            opts.directory ?? "all"
        }):`,
    ];

    let currentFile = "";
    for (const t of tests) {
        if (t.file !== currentFile) {
            currentFile = t.file;
            lines.push(`\n# ${currentFile}:`);
        }

        const issueTag = t.prefixQuality === "component_no_colon"
            ? "missing-colon"
            : t.prefixQuality === "missing_component"
            ? "missing-comp"
            : t.assertionCount > 1
            ? `multi-assert(${t.assertionCount})`
            : "issue";

        if (opts.suggest) {
            const suggested = generateSuggestedName(t);
            lines.push(`  L${t.line} [${issueTag}] "${t.name}" -> "${suggested}"`);
        } else {
            lines.push(`  L${t.line} [${issueTag}] "${t.name}"`);
        }
    }

    return lines.join("\n");
}

/**
 * Applies suggested test names to files in-place, modifying each file at once.
 */
export async function applySuggestedFixes(
    tests: TestCaseAudit[],
    projectRoot: string,
): Promise<{ filesUpdated: number; testsRenamed: number }> {
    const byFile = new Map<string, TestCaseAudit[]>();
    for (const t of tests) {
        if (!t.hasStrictLevel2Prefix) {
            const list = byFile.get(t.file) ?? [];
            list.push(t);
            byFile.set(t.file, list);
        }
    }

    let filesUpdated = 0;
    let testsRenamed = 0;

    for (const [relPath, fileTests] of byFile.entries()) {
        const fullPath = path.join(projectRoot, relPath);
        let content = await Deno.readTextFile(fullPath);
        let fileChanged = false;

        for (const t of fileTests) {
            const suggested = generateSuggestedName(t);
            if (suggested !== t.name) {
                if (content.includes(`"${t.name}"`)) {
                    content = content.replace(`"${t.name}"`, `"${suggested}"`);
                    testsRenamed++;
                    fileChanged = true;
                } else if (content.includes(`'${t.name}'`)) {
                    content = content.replace(`'${t.name}'`, `'${suggested}'`);
                    testsRenamed++;
                    fileChanged = true;
                } else if (content.includes(`\`${t.name}\``)) {
                    content = content.replace(`\`${t.name}\``, `\`${suggested}\``);
                    testsRenamed++;
                    fileChanged = true;
                }
            }
        }

        if (fileChanged) {
            await Deno.writeTextFile(fullPath, content);
            filesUpdated++;
        }
    }

    return { filesUpdated, testsRenamed };
}

// ============================================================================
// CLI Execution
// ============================================================================

if (import.meta.main) {
    const args = parseArgs(Deno.args, {
        string: ["file", "i", "issue", "t", "cat", "c", "dir", "d", "file-filter", "f", "format", "group-by", "limit"],
        boolean: ["suggest", "s", "fix", "help", "h"],
        alias: {
            i: "file",
            t: "issue",
            c: "cat",
            d: "dir",
            f: "file-filter",
            s: "suggest",
            h: "help",
        },
        default: {
            format: "compact",
            issue: "all",
        },
    });

    if (args.help) {
        console.log(`
Usage: deno run -A scripts/query_test_audit.ts [options]

Options:
  -i, --file <path>        Path to test pipeline audit JSON (default: newest in docs/audits/)
  -t, --issue <type>       Filter by issue type:
                           all (default), colon / missing-colon, missing-comp,
                           multi-assert / aaa, zero-assert, category, quarantine
  -c, --cat <category>     Filter by test category: unit, integration, e2e, bench
  -d, --dir <subdir>       Filter tests by directory substring (e.g. 'languages/org')
  -f, --file-filter <str>  Filter tests by file name substring
  -s, --suggest            Print automated replacement name suggestions
  --fix                    Apply suggested test name replacements in-place
  --format <fmt>           Output format: 'compact' (default), 'remediation', 'summary', 'json'
  --limit <number>         Limit output to first N matching tests
  -h, --help               Show this help message

Examples:
  deno run -A scripts/query_test_audit.ts -t missing-colon --suggest
  deno run -A scripts/query_test_audit.ts -t multi-assert --format remediation
  deno run -A scripts/query_test_audit.ts -d languages/org --fix
        `);
        Deno.exit(0);
    }

    const projectRoot = Deno.cwd();
    let auditPath = args.file ? path.resolve(projectRoot, args.file) : null;

    if (!auditPath) {
        auditPath = await findLatestAuditJson(projectRoot);
        if (!auditPath) {
            console.error("Error: No test pipeline audit JSON found. Run 'deno task audit:tests' first.");
            Deno.exit(1);
        }
    }

    const rawJson = await Deno.readTextFile(auditPath);
    const report: AuditReport = JSON.parse(rawJson);

    const queryOpts: QueryOptions = {
        auditJsonPath: auditPath,
        issue: (args.issue as IssueFilter) || "all",
        category: args.cat as TestCategory | undefined,
        directory: args.dir,
        fileFilter: args["file-filter"],
        format: (args.format as OutputFormat) || "compact",
        suggest: args.suggest || false,
        maxResults: args.limit ? parseInt(String(args.limit), 10) : undefined,
    };

    const matchedTests = queryTests(report, queryOpts);

    if (args.fix) {
        const { filesUpdated, testsRenamed } = await applySuggestedFixes(matchedTests, projectRoot);
        console.log(`\n✓ Successfully updated ${testsRenamed} test names across ${filesUpdated} files.`);
        Deno.exit(0);
    }

    const output = formatQueryResults(matchedTests, queryOpts, report);
    console.log(output);
}
