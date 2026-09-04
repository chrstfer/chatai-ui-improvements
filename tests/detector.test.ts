import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isOrgContent } from "../src/languages/org/parser/detector.ts";

describe("isOrgContent", () => {
    it("detects valid Org mode headlines, drawers, tables, directives, latex", () => {
        const sample1 = `* Project Roadmap :DEV:\n** Subtask\n- [ ] Do something`;
        assert.equal(isOrgContent(sample1), true);

        const sample2 = `#+TITLE: Diagnostic Note\n#+AUTHOR: Antigravity\n\n* Header`;
        assert.equal(isOrgContent(sample2), true);

        const sample3 = `:PROPERTIES:\n:DATE: [2026-08-28 Fri]\n:END:`;
        assert.equal(isOrgContent(sample3), true);

        const sample4 = `| Name | Value |\n|---+---|\n| CPU | 85% |`;
        assert.equal(isOrgContent(sample4), true);

        const sample5 = `DEADLINE: <2026-08-28 Fri 15:00>`;
        assert.equal(isOrgContent(sample5), true);

        const sample6 = `#+BEGIN_SRC python\nprint("hello")\n#+END_SRC`;
        assert.equal(isOrgContent(sample6), true);

        const sample7 = `* TODO [#A] Urgent fix`;
        assert.equal(isOrgContent(sample7), true);

        const sample8 = `- Item :: Description of the term`;
        assert.equal(isOrgContent(sample8), true);

        const sample9 = `\\begin{equation}\nE = mc^2\n\\end{equation}`;
        assert.equal(isOrgContent(sample9), true);
    });

    it("rejects plain non-Org text and standard code snippets", () => {
        const plain = "Hello world, this is a standard chat message about nothing in particular.";
        assert.equal(isOrgContent(plain), false);

        const jsCode = `function add(a, b) {\n  return a + b;\n}`;
        assert.equal(isOrgContent(jsCode), false);

        const jsonSnippet = `{\n  "name": "test",\n  "version": "1.0.0"\n}`;
        assert.equal(isOrgContent(jsonSnippet), false);

        const pythonWithOrgStrings = `from datetime import datetime

def generate_org_report(
    title: str,
    author: str,
    target_host: str,
    metrics: list[tuple[str, int, float]],
    notes: str,
) -> str:
    """Renders a structured Org-mode document containing task management,
    properties, and a calculated table from input telemetry.
    """
    now_ts = datetime.now().strftime("%Y-%m-%d %a %H:%M")
    today_date = datetime.now().strftime("%Y-%m-%d")

    table_rows = "\\n".join(
        f"| {iface:<10} | {q:>5} | {rate:>12.2f} |" for iface, q, rate in metrics
    )

    org_template = f"""* {title} [{now_ts}]
#+TITLE: {title}
#+AUTHOR: {author}
#+DATE: {today_date}
#+OPTIONS: toc:nil ^:nil

** Task Metadata & Tracking
*** TODO [#A] Deploy telemetry ingestion agent :infra:metrics:
DEADLINE: <{today_date} 23:59>
:PROPERTIES:
:TARGET_HOST: {target_host}
:DRIVER:      af_xdp
:EXPORT_TYPE: prometheus
:END:
:LOGBOOK:
- State "TODO"       from "HOLD"       [{now_ts}] \\\\
  Upstream kernel verified for zero-copy descriptor ring support.
:END:

** Diagnostic Summary
#+begin_quote
{notes}
#+end_quote

** Interface Throughput Benchmarks
| Interface  | Queue | Rate (kpps)  |
|------------+-------+--------------|
| <l>        |   <r> |          <r> |
{table_rows}
|------------+-------+--------------|
| Mean       |       |              |
#+TBLFM: @>$3=vmean(@2$3..@-1$3);%.2f

** Execution Verification
#+begin_src bash :exports both :results output
ip -details link show dev eth0
#+end_src

* End Gemini Output
"""
    return org_template

if __name__ == "__main__":
    pass`;

        assert.equal(isOrgContent(pythonWithOrgStrings), false);
    });
});
