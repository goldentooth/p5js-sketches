# Playwright Smoke Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On-demand Playwright smoke tests that verify every p5.js sketch loads without JS errors in a real browser.

**Architecture:** Playwright with Chromium auto-starts a Hugo dev server, dynamically discovers all sketches under `content/`, and runs a smoke test per sketch (navigate, wait for canvas, assert no errors). Separate from the existing vitest unit tests.

**Tech Stack:** @playwright/test, Chromium, Hugo dev server

---

## File Structure

| File | Responsibility |
|------|---------------|
| `playwright.config.js` (create) | Playwright config: Chromium only, webServer for Hugo, base URL |
| `tests/smoke/sketches.spec.js` (create) | Dynamic sketch discovery + per-sketch smoke test |
| `package.json` (modify) | Add `smoke` script |
| `vitest.config.js` (modify) | Exclude `tests/smoke/` from vitest |

---

### Task 1: Install Playwright and configure

**Files:**
- Modify: `package.json`
- Create: `playwright.config.js`

- [ ] **Step 1: Install Playwright**

```bash
npm install --save-dev @playwright/test
```

- [ ] **Step 2: Install Chromium browser**

```bash
npx playwright install chromium
```

- [ ] **Step 3: Add smoke script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"smoke": "npx playwright test"
```

- [ ] **Step 4: Create playwright.config.js**

Create `playwright.config.js` at project root:

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/smoke",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:1315/p5js-sketches/",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "hugo server --port 1315",
    url: "http://localhost:1315/p5js-sketches/",
    reuseExistingServer: true,
    timeout: 15000,
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.js
git commit -m "Add Playwright config and smoke test script"
```

---

### Task 2: Exclude smoke tests from vitest

**Files:**
- Modify: `vitest.config.js`

Vitest's `include: ['**/*.spec.js']` pattern would pick up Playwright's `.spec.js` files. Exclude them.

- [ ] **Step 1: Add tests/smoke to vitest exclude list**

In `vitest.config.js`, change the `exclude` array from:

```js
exclude: ['node_modules', 'public', 'static']
```

to:

```js
exclude: ['node_modules', 'public', 'static', 'tests/smoke']
```

- [ ] **Step 2: Verify existing unit tests still pass**

```bash
npm test
```

Expected: All existing tests pass. No smoke tests appear in the output.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.js
git commit -m "Exclude smoke test directory from vitest"
```

---

### Task 3: Write the smoke test

**Files:**
- Create: `tests/smoke/sketches.spec.js`

- [ ] **Step 1: Create the smoke test file**

Create `tests/smoke/sketches.spec.js`:

```js
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Discover all sketch directories that have an index.md
const contentDir = path.join(process.cwd(), "content");
const sketches = fs
  .readdirSync(contentDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter((entry) =>
    fs.existsSync(path.join(contentDir, entry.name, "index.md"))
  )
  .map((entry) => entry.name);

for (const sketch of sketches) {
  test(`${sketch} loads without errors`, async ({ page }) => {
    const errors = [];

    // Collect console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`console.error: ${msg.text()}`);
      }
    });

    // Collect uncaught page errors
    page.on("pageerror", (err) => {
      errors.push(`pageerror: ${err.message}`);
    });

    await page.goto(`${sketch}/`);

    // Wait for p5.js to create the canvas
    await page.waitForSelector("canvas", { timeout: 10000 });

    // Assert no errors occurred
    expect(errors, `Errors on ${sketch}:\n${errors.join("\n")}`).toHaveLength(
      0
    );
  });
}
```

- [ ] **Step 2: Run the smoke tests**

```bash
npm run smoke
```

Expected: All 10 sketches pass — each navigates, finds a canvas, and has zero JS errors.

- [ ] **Step 3: Commit**

```bash
git add tests/smoke/sketches.spec.js
git commit -m "Add Playwright smoke tests for all sketches"
```

---

### Task 4: Add Playwright artifacts to .gitignore

**Files:**
- Modify: `.gitignore`

Playwright generates `test-results/` and `playwright-report/` directories on failure. Keep them out of git.

- [ ] **Step 1: Check current .gitignore**

```bash
cat .gitignore
```

- [ ] **Step 2: Add Playwright entries to .gitignore**

Append to `.gitignore`:

```
# Playwright
test-results/
playwright-report/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "Add Playwright artifacts to gitignore"
```
