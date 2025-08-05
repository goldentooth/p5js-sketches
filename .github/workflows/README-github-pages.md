# GitHub Pages Deployment

This repository includes automatic deployment to GitHub Pages for hosting the p5.js sketches gallery.

## Setup Instructions

To enable GitHub Pages deployment:

1. **Enable GitHub Pages in your repository settings:**
   - Go to `Settings` → `Pages`
   - Under "Source", select "GitHub Actions"
   - Save the settings

2. **The deployment workflow will automatically:**
   - Generate preview images for all sketches
   - Build the gallery HTML using the template
   - Deploy the `sketches/` directory to GitHub Pages

## Workflow Triggers

The deployment runs:
- ✅ On every push to the `main` branch
- ✅ Manual trigger via "Actions" → "Deploy to GitHub Pages" → "Run workflow"

## What Gets Deployed

The GitHub Pages site contains:
- **Gallery index** at `/` showing all sketches with previews
- **Individual sketches** at `/{sketch-name}/` with full interactive content
- **Preview images** automatically generated from the p5.js canvas
- **All sketch assets** (libraries, styles, scripts, etc.)

## URL Structure

Once deployed, your sketches will be available at:
```
https://[username].github.io/[repository-name]/
├── /                           # Gallery homepage
├── /linear-regression/         # Individual sketch
├── /robbie-the-robot/         # Individual sketch
└── ...                        # Additional sketches
```

## Adding New Sketches

1. Create a new directory under `sketches/your-sketch-name/`
2. Include required files: `index.html`, `sketch.js`
3. Optionally add `metadata.json` for custom title/description
4. Push to `main` branch - deployment happens automatically!

## Local Development

Test the build process locally:
```bash
npm install
npm run build        # Generate previews and gallery
```

Then serve the `sketches/` directory with any static file server to preview locally.