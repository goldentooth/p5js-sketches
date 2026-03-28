# Per-Sketch Nuglib Pinning — Design Spec

## Overview

Each sketch can freeze its own copy of `nuglib.min.js`, isolating it from future nuglib changes. Sketches without a pinned copy fall back to the global latest build. An npm script handles pinning.

## Problem

All 10 sketches share a single `static/libraries/nuglib.min.js`. When nuglib's API changes, sketches that depend on removed or renamed functions break silently. Maintaining backward compatibility constrains nuglib's evolution, and updating older sketches on every change is tedious.

## Design

### Hugo Template Change

The library loading loop in `layouts/_default/single.html` currently loads all libraries from `static/libraries/`:

```html
{{ range $libraries }}
<script src='{{ printf "libraries/%s" . | relURL }}'></script>
{{ end }}
```

The new behavior: for each library in the list, check if the sketch has a local page resource with the same filename. If so, use the local copy. Otherwise, fall back to the global `static/libraries/` path.

```html
{{ range $libraries }}
{{ $local := $.Resources.GetMatch . }}
{{ if $local }}
<script src='{{ $local.RelPermalink }}'></script>
{{ else }}
<script src='{{ printf "libraries/%s" . | relURL }}'></script>
{{ end }}
{{ end }}
```

This approach is generic — it works for any library, not just nuglib. A sketch could also pin a specific version of p5.js if needed. But the primary use case is nuglib.

### Pin Script

`scripts/pin-nuglib.js` — a Node script invoked via `npm run pin-nuglib`:

- `npm run pin-nuglib -- <sketch-name>` — copies `static/libraries/nuglib.min.js` to `content/<sketch-name>/nuglib.min.js`. Fails if the sketch directory or `index.md` doesn't exist. Prints what it did.
- `npm run pin-nuglib -- --all` — copies to every sketch directory that has an `index.md`.

The script verifies `static/libraries/nuglib.min.js` exists (i.e., you've run `npm run build` first).

### npm Script

Add to `package.json`:

```json
"pin-nuglib": "node scripts/pin-nuglib.js"
```

### Development Workflow

1. Work on nuglib source (`src/`), run `npm run build` — outputs to `static/libraries/nuglib.min.js`
2. New sketches automatically use the global latest (no pinned copy yet)
3. When a sketch is finished: `npm run pin-nuglib -- <sketch-name>`
4. Future nuglib changes don't affect pinned sketches
5. To upgrade a sketch: `npm run pin-nuglib -- <sketch-name>` again, test, commit

### What Doesn't Change

- `npm run build` still outputs to `static/libraries/nuglib.min.js`
- `npm test` (vitest unit tests) unchanged
- `npm run smoke` (Playwright smoke tests) unchanged — tests whatever each sketch loads
- p5.js and p5.sound.js continue loading from `static/libraries/` (no per-sketch copies needed)
- No versioning scheme, git tags, or version numbers to maintain
