# Extra Chat AI Features & UI Improvements

## Key Features

- **Widescreen Utilization**: Eliminates artificial ~768px constraints while preserving natural user prompt bubble proportions.
- **Floating HUD & Controls**:
  - `Alt + W`: Toggle Full Width on/off.
  - `Alt + O`: Toggle Org rendering across all code blocks simultaneously.
  - Width presets (80%, 90%, 94%, 100%), HUD collapsible pill mode.
- **Custom Rendering**: Certain languages and markups don't display well, with no syntax highlighting or rendering. This extension aims to correct that.
  - Currently Supported: 
    - org-mode
---

## Testing in Firefox / Zen Browser

### Option A: Local Interactive Test Fixture
Open `test-fixture.html` directly in Firefox to inspect the layout, HUD, interactive checkboxes, and test live response streaming:
```bash
firefox test-fixture.html
```

### Option B: Load into Firefox as Temporary Add-on
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **"Load Temporary Add-on..."**.
3. Select `dist/manifest.json` inside this folder.
4. Navigate to [gemini.google.com](https://gemini.google.com) and test any Org-mode prompt output.
