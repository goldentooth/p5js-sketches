# Per-Sketch Nuglib Pinning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each sketch to freeze its own copy of nuglib.min.js, isolating it from future nuglib changes.

**Architecture:** Hugo template checks for a local page resource before falling back to the global static library. A Node script copies the current build into a sketch's content directory on demand.

**Tech Stack:** Hugo templates, Node.js (fs), npm scripts

---

## File Structure

| File | Responsibility |
|------|---------------|
| `layouts/_default/single.html` (modify) | Library loading: check for local page resource, fall back to global |
| `scripts/pin-nuglib.js` (create) | CLI script: copy nuglib.min.js into sketch content directories |
| `package.json` (modify) | Add `pin-nuglib` npm script |

---

### Task 1: Update Hugo template to prefer local library resources

**Files:**
- Modify: `layouts/_default/single.html:19-22`

- [ ] **Step 1: Update the library loading loop**

In `layouts/_default/single.html`, replace lines 19-22:

```html
<!-- Loop through libraries and include them. -->
{{ range $libraries }}
<script src='{{ printf "libraries/%s" . | relURL }}'></script>
{{ end }}
```

with:

```html
<!-- Loop through libraries. Use local page resource if available, otherwise global. -->
{{ range $libraries }}
{{ $local := $.Resources.GetMatch . }}
{{ if $local }}
<script src='{{ $local.RelPermalink }}'></script>
{{ else }}
<script src='{{ printf "libraries/%s" . | relURL }}'></script>
{{ end }}
{{ end }}
```

- [ ] **Step 2: Verify existing sketches still work**

Start Hugo and spot-check that sketches still load (they should all use the global fallback since no sketch has a local nuglib.min.js yet):

```bash
hugo server --port 1316 &
sleep 2
curl -s http://localhost:1316/p5js-sketches/monsters/ | grep -o 'nuglib.min.js' | head -1
kill %1
```

Expected: `nuglib.min.js` appears in the page source. The `src` attribute should point to the global `libraries/nuglib.min.js` path.

- [ ] **Step 3: Commit**

```bash
git add layouts/_default/single.html
git commit -m "Prefer local page resource for libraries over global fallback"
```

---

### Task 2: Create the pin-nuglib script

**Files:**
- Create: `scripts/pin-nuglib.js`

- [ ] **Step 1: Create the scripts directory and pin-nuglib.js**

Create `scripts/pin-nuglib.js`:

```js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const sourceFile = path.join(rootDir, "static/libraries/nuglib.min.js");
const contentDir = path.join(rootDir, "content");

function usage() {
  console.log("Usage:");
  console.log("  npm run pin-nuglib -- <sketch-name>   Pin nuglib to a specific sketch");
  console.log("  npm run pin-nuglib -- --all            Pin nuglib to all sketches");
  process.exit(1);
}

function pinSketch(sketchName) {
  const sketchDir = path.join(contentDir, sketchName);
  const indexFile = path.join(sketchDir, "index.md");

  if (!fs.existsSync(indexFile)) {
    console.error(`Error: No sketch found at content/${sketchName}/index.md`);
    process.exit(1);
  }

  const dest = path.join(sketchDir, "nuglib.min.js");
  fs.copyFileSync(sourceFile, dest);
  console.log(`Pinned nuglib.min.js → content/${sketchName}/nuglib.min.js`);
}

function pinAll() {
  const entries = fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => fs.existsSync(path.join(contentDir, e.name, "index.md")));

  if (entries.length === 0) {
    console.error("Error: No sketches found in content/");
    process.exit(1);
  }

  for (const entry of entries) {
    pinSketch(entry.name);
  }
}

// Validate source exists
if (!fs.existsSync(sourceFile)) {
  console.error("Error: static/libraries/nuglib.min.js not found. Run 'npm run build' first.");
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);

if (args.length === 0) {
  usage();
} else if (args[0] === "--all") {
  pinAll();
} else {
  pinSketch(args[0]);
}
```

- [ ] **Step 2: Test the script manually**

```bash
node scripts/pin-nuglib.js monsters
```

Expected output: `Pinned nuglib.min.js → content/monsters/nuglib.min.js`

Verify the file was created:

```bash
ls -la content/monsters/nuglib.min.js
```

Expected: File exists, same size as `static/libraries/nuglib.min.js`.

Then clean up the test file (we'll pin for real in Task 4):

```bash
rm content/monsters/nuglib.min.js
```

- [ ] **Step 3: Test error cases**

```bash
node scripts/pin-nuglib.js nonexistent-sketch
```

Expected: `Error: No sketch found at content/nonexistent-sketch/index.md` and exit code 1.

```bash
node scripts/pin-nuglib.js
```

Expected: Usage message and exit code 1.

- [ ] **Step 4: Commit**

```bash
git add scripts/pin-nuglib.js
git commit -m "Add pin-nuglib script for freezing per-sketch nuglib copies"
```

---

### Task 3: Add npm script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add pin-nuglib script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"pin-nuglib": "node scripts/pin-nuglib.js"
```

- [ ] **Step 2: Verify it works via npm**

```bash
npm run pin-nuglib -- monsters
```

Expected: `Pinned nuglib.min.js → content/monsters/nuglib.min.js`

Clean up:

```bash
rm content/monsters/nuglib.min.js
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "Add pin-nuglib npm script"
```

---

### Task 4: Pin all existing sketches

**Files:**
- Create: `content/*/nuglib.min.js` (one per sketch)

- [ ] **Step 1: Pin nuglib to all sketches**

```bash
npm run pin-nuglib -- --all
```

Expected: One `Pinned nuglib.min.js → content/<name>/nuglib.min.js` line per sketch (10 sketches).

- [ ] **Step 2: Verify Hugo serves the local copies**

Start Hugo and check that a pinned sketch uses the local resource instead of the global:

```bash
hugo server --port 1316 &
sleep 2
curl -s http://localhost:1316/p5js-sketches/monsters/ | grep -o 'src="[^"]*nuglib[^"]*"'
kill %1
```

Expected: The `src` attribute should contain the sketch's local page resource path (something like `/p5js-sketches/monsters/nuglib.min.js`) rather than the global `/p5js-sketches/libraries/nuglib.min.js`.

- [ ] **Step 3: Run smoke tests to verify all sketches still work**

```bash
npm run smoke
```

Expected: All 9 non-draft sketches pass.

- [ ] **Step 4: Commit all pinned copies**

```bash
git add content/*/nuglib.min.js
git commit -m "Pin nuglib.min.js to all existing sketches"
```
