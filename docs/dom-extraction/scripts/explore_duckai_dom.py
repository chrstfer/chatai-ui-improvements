#!/usr/bin/env python3
"""
Explore Duck.ai DOM structures across raw HTML captures.
Validates selectors, pristine text extraction, MathML equations, tables, and message turns.
Usage:
    cd docs/dom-extraction && uv run python scripts/explore_duckai_dom.py
"""

from pathlib import Path
from bs4 import BeautifulSoup

def inspect_file(filepath: Path):
    print(f"\n========================================================")
    print(f"Inspecting: {filepath.name} ({filepath.stat().st_size} bytes)")
    print(f"========================================================")
    
    html = filepath.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    
    # 1. Code Blocks
    code_blocks = soup.find_all("div", attrs={"data-streamdown": "code-block"})
    print(f"\n[1] Code Blocks found: {len(code_blocks)}")
    for i, cb in enumerate(code_blocks):
        lang = cb.get("data-language")
        header = cb.find("div", attrs={"data-streamdown": "code-block-header"})
        copy_btn = cb.find("button", attrs={"data-streamdown": "code-block-copy-button"})
        body = cb.find("div", attrs={"data-streamdown": "code-block-body"})
        code = cb.find("code")
        code_text = code.get_text() if code else ""
        print(f"  Block #{i+1}:")
        print(f"    - data-language: {repr(lang)}")
        print(f"    - header present: {header is not None}")
        print(f"    - copy button present: {copy_btn is not None}")
        print(f"    - body present: {body is not None}")
        print(f"    - code text lines: {len(code_text.splitlines())}")
        print(f"    - sample code preview: {repr(code_text[:60])}")

    # 2. Math Elements (MathML / KaTeX)
    math_annotations = soup.find_all("annotation", attrs={"encoding": "application/x-tex"})
    print(f"\n[2] MathML TeX annotations found: {len(math_annotations)}")
    for i, ann in enumerate(math_annotations[:3]):
        print(f"  Math #{i+1}: {repr(ann.get_text().strip())}")

    # 3. Tables
    tables = soup.find_all("table")
    print(f"\n[3] Tables found: {len(tables)}")
    for i, tbl in enumerate(tables):
        thead = tbl.find("thead", attrs={"data-streamdown": "table-header"})
        tbody = tbl.find("tbody", attrs={"data-streamdown": "table-body"})
        headers = [th.get_text().strip() for th in tbl.find_all("th")]
        print(f"  Table #{i+1}: headers={headers}, thead={thead is not None}, tbody={tbody is not None}")

    # 4. Message Turn Elements
    user_msgs = soup.find_all("div", attrs={"data-testid": "user-message"})
    assistant_msgs = soup.find_all("div", id=lambda x: x and "-assistant-message-" in x)
    actions = soup.find_all("div", attrs={"data-message-actions": "true"})
    print(f"\n[4] Message Turns:")
    print(f"  - user-message elements: {len(user_msgs)}")
    print(f"  - assistant-message elements: {len(assistant_msgs)}")
    print(f"  - message-actions containers: {len(actions)}")

    # 5. Stop Generating Button
    stop_btn = soup.find("button", attrs={"aria-label": "Stop generating"})
    print(f"\n[5] 'Stop generating' button present: {stop_btn is not None}")

def main():
    root = Path(__file__).resolve().parent.parent
    raw_dir = root / "raw-html"
    fixture_dir = root.parent.parent / "tests" / "features" / "chats" / "duckai" / "fixtures"
    
    files = list(raw_dir.glob("*.html"))
    if fixture_dir.exists():
        files.extend(fixture_dir.glob("*.html"))
        
    for f in sorted(set(files)):
        inspect_file(f)

if __name__ == "__main__":
    main()
