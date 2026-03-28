# Playwright Smoke Tests — Design Spec

## Overview

On-demand smoke tests using Playwright that verify every p5.js sketch loads without errors in a real browser. Catches runtime issues (missing globals, DOM selector bugs, script loading failures) that unit tests can't detect.

This is a development tool, not a CI gate. Run it manually when you want confidence that sketches still work after changes.

## Setup

### Dependencies

- `@playwright/test` as a devDependency
- Chromium browser (installed via `npx playwright install chromium`)

### Configuration

`playwright.config.js` at project root:

- **Browser:** Chromium only (no need for cross-browser — these are smoke tests)
- **Base URL:** `http://localhost:1315/p5js-sketches/` (port 1315 to avoid conflicts with dev server on 1313)
- **Web server:** Auto-starts `hugo server --port 1315` before tests, kills it after. If port is already in use, reuses the existing server.
- **Timeout:** 30 seconds per test (p5.js sketches need time to initialize)
- **Retries:** 0 (smoke tests should be deterministic)

### Scripts

- `npm run smoke` — runs `npx playwright test`

### File Layout

```
playwright.config.js
tests/smoke/
  sketches.spec.js
```

Separate from the existing `tests/*.test.js` unit tests (which use vitest).

## Test Design

### Discovery

The test file dynamically discovers sketches by reading `content/` subdirectories and filtering for those containing an `index.md` file. No hardcoded sketch list to maintain.

### Per-Sketch Checks

For each discovered sketch, one test runs that:

1. **Navigates** to `/<sketch-name>/`
2. **Collects** all `console.error` and page error events
3. **Waits** for a `<canvas>` element to appear in the DOM (p5.js creates this during `setup()`)
4. **Asserts** zero uncaught JavaScript errors

### What It Does NOT Test

- Visual correctness (no screenshots or pixel comparison)
- User interaction (no clicking, hovering, or keyboard input)
- Specific DOM structure beyond the canvas element
- Performance or load time

## Integration

- Does not affect the existing vitest unit test setup
- Does not run in CI (can be added later if desired)
- Hugo server lifecycle is fully managed by Playwright's `webServer` config
