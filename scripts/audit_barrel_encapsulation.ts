/**
 * @file scripts/audit_barrel_encapsulation.ts
 * @description Automated barrel encapsulation linter enforcing module boundary purity,
 * explicit named exports, zero wildcards, and isolation of private implementation details.
 */

import { parseArgs } from "@std/cli/parse-args";
import * as path from "node:path";

export interface ExportedSymbol {
    name: string;
    isType: boolean;
    sourceFile: string;
    line: number;
}

export interface BarrelAuditResult {
    file: string;
    totalExports: number;
    wildcards: string[];
    exportedSymbols: ExportedSymbol[];
    violations: string[];
    warnings: string[];
    isCompliant: boolean;
}

export interface AuditSummary {
    totalBarrels: number;
    totalExports: number;
    compliantBarrels: number;
    wildcardViolations: number;
    privateLeakViolations: number;
    complianceRate: number;
}

/**
 * Parses a single barrel file to extract all export clauses and evaluate encapsulation rules.
 */
export function auditBarrelFile(filePath: string, content: string): BarrelAuditResult {
    const lines = content.split("\n");
    const wildcards: string[] = [];
    const exportedSymbols: ExportedSymbol[] = [];
    const violations: string[] = [];
    const warnings: string[] = [];

    const dir = path.dirname(filePath);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Check for wildcard exports: `export * from "..."`
        const wildcardMatch = line.match(/^export\s+\*\s+(?:as\s+\w+\s+)?from\s+["']([^"']+)["']/);
        if (wildcardMatch) {
            wildcards.push(`Line ${lineNum}: ${line.trim()}`);
            violations.push(`Wildcard export prohibited: "${line.trim()}" (must use explicit named exports)`);
        }

        // Check for test-specific symbols in src/ barrels
        if (filePath.startsWith("src/")) {
            if (/ForTesting|_reset|Mock[A-Z]/.test(line)) {
                violations.push(`Line ${lineNum}: Test-specific symbol exported in production barrel: "${line.trim()}"`);
            }
        }

        // Check for private naming conventions (_foo)
        const privateMatch = line.match(/(?:^|\s|,)(_\w+)/);
        if (privateMatch && !line.includes("export type") && !line.includes("//")) {
            violations.push(`Line ${lineNum}: Private symbol starting with underscore exported: "${privateMatch[1]}"`);
        }
    }

    // Match multi-line and single-line named export blocks:
    // export (type)? { A, B as C } from "./foo.ts";
    const exportBlockRegex = /export\s+(type\s+)?\{([^}]+)\}\s*(?:from\s+["']([^"']+)["'])?/g;
    let match: RegExpExecArray | null;

    while ((match = exportBlockRegex.exec(content)) !== null) {
        const isTypeBlock = Boolean(match[1]);
        const specifiers = match[2];
        const sourcePath = match[3] ?? "";

        // Check if re-exporting from outside the barrel directory (except @internal aliases or local subpaths)
        if (sourcePath && sourcePath.startsWith("../") && filePath.startsWith("src/")) {
            // Check if traversing up outside the module scope
            const resolved = path.resolve(dir, sourcePath);
            const barrelDir = path.resolve(dir);
            if (!resolved.startsWith(barrelDir)) {
                warnings.push(`Re-exporting symbol from outside module boundary: "${sourcePath}"`);
            }
        }

        const items = specifiers.split(",");
        for (const rawItem of items) {
            const item = rawItem.trim();
            if (!item || item.startsWith("//")) continue;

            const isItemType = isTypeBlock || item.startsWith("type ");
            const cleanName = item.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();

            exportedSymbols.push({
                name: cleanName,
                isType: isItemType,
                sourceFile: sourcePath,
                line: 0,
            });
        }
    }

    // Also match standalone export statements:
    // export { Foo };
    // export default Foo;
    const defaultMatch = content.match(/export\s+default\s+(\w+)/);
    if (defaultMatch) {
        exportedSymbols.push({
            name: "default (" + defaultMatch[1] + ")",
            isType: false,
            sourceFile: "",
            line: 0,
        });
    }

    const isCompliant = violations.length === 0;

    return {
        file: filePath,
        totalExports: exportedSymbols.length,
        wildcards,
        exportedSymbols,
        violations,
        warnings,
        isCompliant,
    };
}

/**
 * Recursively discovers all barrel (index.ts) files in target directories.
 */
export async function discoverBarrels(rootDirs: string[]): Promise<string[]> {
    const barrels: string[] = [];

    async function walk(dir: string) {
        try {
            for await (const entry of Deno.readDir(dir)) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory) {
                    if (entry.name !== "dist" && entry.name !== "node_modules" && entry.name !== ".git") {
                        await walk(fullPath);
                    }
                } else if (entry.isFile && entry.name === "index.ts") {
                    barrels.push(fullPath);
                }
            }
        } catch {
            // Directory might not exist
        }
    }

    for (const root of rootDirs) {
        await walk(root);
    }

    return barrels.sort();
}

/**
 * Main CLI execution.
 */
export async function main() {
    const args = parseArgs(Deno.args, {
        string: ["scope"],
        boolean: ["verbose", "help"],
        default: {
            scope: "src,tests/fixtures",
            verbose: false,
        },
    });

    if (args.help) {
        console.log(`
Usage: deno run -A scripts/audit_barrel_encapsulation.ts [options]

Options:
  --scope <dirs>    Comma-separated directories to audit (default: "src,tests/fixtures")
  --verbose         Print detailed symbol breakdown for every barrel
  --help            Show this help message
        `.trim());
        Deno.exit(0);
    }

    const targetDirs = args.scope.split(",").map((s) => s.trim());
    const barrelFiles = await discoverBarrels(targetDirs);

    console.log("================================================================================");
    console.log("             AUTOMATED BARREL ENCAPSULATION AUDIT REPORT                        ");
    console.log("================================================================================");
    console.log(`Target Scope:     ${args.scope}`);
    console.log(`Total Barrels:    ${barrelFiles.length}`);
    console.log("--------------------------------------------------------------------------------");

    const results: BarrelAuditResult[] = [];
    let totalExports = 0;
    let compliantCount = 0;
    let totalWildcards = 0;
    let totalViolations = 0;

    for (const file of barrelFiles) {
        const content = await Deno.readTextFile(file);
        const result = auditBarrelFile(file, content);
        results.push(result);

        totalExports += result.totalExports;
        totalWildcards += result.wildcards.length;
        totalViolations += result.violations.length;
        if (result.isCompliant) compliantCount++;

        const statusMark = result.isCompliant ? "✓ PASS" : "✗ FAIL";
        console.log(`${statusMark.padEnd(8)} ${file} (${result.totalExports} exports)`);

        if (result.violations.length > 0) {
            for (const v of result.violations) {
                console.log(`         - VIOLATION: ${v}`);
            }
        }
        if (args.verbose && result.exportedSymbols.length > 0) {
            for (const s of result.exportedSymbols) {
                const tag = s.isType ? "[type]" : "[val] ";
                console.log(`           ${tag} ${s.name}`);
            }
        }
    }

    const complianceRate = barrelFiles.length > 0 ? (compliantCount / barrelFiles.length) * 100 : 100;

    console.log("--------------------------------------------------------------------------------");
    console.log("AUDIT SUMMARY:");
    console.log(`  - Total Barrels Audited:   ${barrelFiles.length}`);
    console.log(`  - Compliant Barrels:       ${compliantCount} (${complianceRate.toFixed(1)}%)`);
    console.log(`  - Non-Compliant Barrels:   ${barrelFiles.length - compliantCount}`);
    console.log(`  - Wildcard (export *) Count: ${totalWildcards}`);
    console.log(`  - Total Violations:        ${totalViolations}`);
    console.log(`  - Total Exported Symbols:  ${totalExports}`);
    console.log("================================================================================");

    if (totalViolations > 0) {
        console.error(`\nAudit failed with ${totalViolations} encapsulation violation(s).`);
        Deno.exit(1);
    } else {
        console.log("\n✓ All barrel files strictly conform to encapsulation standards.");
    }
}

if (import.meta.main) {
    await main();
}
