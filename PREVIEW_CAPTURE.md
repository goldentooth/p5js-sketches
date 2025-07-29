# Automated Preview Image Capture

The p5js-sketches gallery includes automated preview image capture using GitHub Actions and headless browser automation.

## How It Works

1. **GitHub Actions Trigger**: Workflow runs when sketches are modified
2. **Headless Browser**: Uses Puppeteer/Chromium to load each sketch
3. **Canvas Capture**: Screenshots the p5.js canvas element specifically
4. **Auto-Commit**: Generated preview images are committed back to the repository
5. **Gallery Integration**: Kubernetes deployment serves sketches with previews

## Preview Generation Process

```
Sketch Changes → GitHub Actions → Browser Capture → Auto-Commit → Gallery Display
     ↓                ↓                  ↓              ↓              ↓
  Git push      Puppeteer launch    Canvas screenshot  Git push    Nginx serving
```

## Generated Files

For each sketch, the system generates:
- `preview.png` - Static screenshot of the sketch canvas (400x400px)

## Configuration

Key settings in `capture-previews.js`:
- **Capture Delay**: 2 seconds wait for sketch initialization
- **Viewport Size**: 600x600 pixels for browser rendering
- **Canvas Detection**: Automatically finds and captures p5.js canvas
- **Error Handling**: Gracefully handles sketches without canvas elements

## Gallery Display

The gallery template supports preview formats:
- **PNG Preview**: Shows static preview image
- **No Preview**: Shows artistic placeholder with sketch name initial

## GitHub Actions Workflow

The workflow (`generate-previews.yml`) automatically:
1. Triggers on changes to `sketches/**` files
2. Installs Node.js and dependencies
3. Runs preview capture script
4. Commits generated images back to repository
5. Uploads preview artifacts for debugging

## Deployment

The Kubernetes deployment is simplified:
1. Sketch sync retrieves sketches (including committed previews) from git
2. Gallery generator creates index.html with preview references
3. Nginx serves the complete gallery with visual previews

This approach keeps the cluster deployment lightweight while providing rich visual previews through CI/CD automation.