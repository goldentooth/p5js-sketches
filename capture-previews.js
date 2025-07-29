#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  sketches_dir: process.env.SKETCHES_DIR || './sketches',
  capture_delay: 2000,        // Wait 2s for sketch to initialize
  animation_duration: 3000,   // Record 3s of animation
  viewport: { width: 600, height: 600 },
  screenshot_options: {
    type: 'png',
    clip: { x: 0, y: 0, width: 400, height: 400 } // Crop to canvas size
  }
};

async function captureSketchPreviews() {
  console.log('Starting preview capture process...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-file-access-from-files'
      ]
    });
    console.log('✓ Browser launched successfully');

    const sketches = await getSketchDirectories();
    console.log(`Found ${sketches.length} sketches to process`);

    for (const sketchPath of sketches) {
      const sketchName = path.basename(sketchPath);
      console.log(`Processing sketch: ${sketchName}`);
      
      try {
        await captureSketchPreview(browser, sketchPath, sketchName);
        console.log(`✓ Captured preview for ${sketchName}`);
      } catch (error) {
        console.error(`✗ Failed to capture ${sketchName}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Failed to launch browser:', error.message);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('✓ Browser closed');
      } catch (error) {
        console.warn('Warning: Failed to close browser:', error.message);
      }
    }
  }

  console.log('Preview capture process completed');
}

async function getSketchDirectories() {
  const entries = await fs.readdir(CONFIG.sketches_dir, { withFileTypes: true });
  const sketches = [];
  
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'lost+found') {
      const sketchPath = path.join(CONFIG.sketches_dir, entry.name);
      const indexPath = path.join(sketchPath, 'index.html');
      
      try {
        await fs.access(indexPath);
        sketches.push(sketchPath);
      } catch {
        console.log(`Skipping ${entry.name} - no index.html found`);
      }
    }
  }
  
  return sketches;
}

async function captureSketchPreview(browser, sketchPath, sketchName) {
  const page = await browser.newPage();
  
  try {
    await page.setViewport(CONFIG.viewport);
    
    // Load the sketch
    const indexPath = path.join(sketchPath, 'index.html');
    const fileUrl = `file://${indexPath}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    // Wait for sketch to initialize
    await page.waitForTimeout(CONFIG.capture_delay);
    
    // Check if canvas exists
    const canvas = await page.$('canvas');
    if (!canvas) {
      throw new Error('No canvas element found');
    }
    
    // Get canvas position and dimensions
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas not visible');
    }
    
    // Capture static PNG screenshot
    const pngPath = path.join(sketchPath, 'preview.png');
    await page.screenshot({
      path: pngPath,
      type: 'png',
      clip: {
        x: canvasBox.x,
        y: canvasBox.y,
        width: canvasBox.width,
        height: canvasBox.height
      }
    });
    
    // Check if sketch is animated by monitoring canvas changes
    const isAnimated = await detectAnimation(page, canvas);
    
    if (isAnimated) {
      console.log(`  Detected animation in ${sketchName}, capturing GIF...`);
      await captureAnimatedGIF(page, canvas, path.join(sketchPath, 'preview.gif'));
    }
    
    // Set proper ownership for nginx
    await setFileOwnership(pngPath);
    if (isAnimated) {
      await setFileOwnership(path.join(sketchPath, 'preview.gif'));
    }
    
  } finally {
    await page.close();
  }
}

async function detectAnimation(page, canvas) {
  // Take two screenshots 500ms apart and compare
  const screenshot1 = await canvas.screenshot({ type: 'png' });
  await page.waitForTimeout(500);
  const screenshot2 = await canvas.screenshot({ type: 'png' });
  
  // Simple comparison - if bytes differ, likely animated
  return !screenshot1.equals(screenshot2);
}

async function captureAnimatedGIF(page, canvas, gifPath) {
  // Since Puppeteer doesn't directly support GIF recording,
  // we'll capture multiple frames and use a GIF creation library
  const frames = [];
  const frameCount = 30; // 30 frames over 3 seconds
  const frameDelay = CONFIG.animation_duration / frameCount;
  
  for (let i = 0; i < frameCount; i++) {
    const frame = await canvas.screenshot({ type: 'png' });
    frames.push(frame);
    await page.waitForTimeout(frameDelay);
  }
  
  // For now, we'll use the first frame as a fallback
  // In a full implementation, you'd use a library like 'gif-encoder' or 'gifencoder'
  await fs.writeFile(gifPath.replace('.gif', '_frame0.png'), frames[0]);
  console.log(`  Note: GIF creation not fully implemented, saved first frame instead`);
}

async function setFileOwnership(filePath) {
  // Set ownership to nginx user (101:101) as expected by the container
  // Skip in local development (when not running as root)
  if (process.getuid && process.getuid() !== 0) {
    console.log(`Skipping chown for ${filePath} (not running as root)`);
    return;
  }
  
  try {
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const chown = spawn('chown', ['101:101', filePath]);
      chown.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`chown failed with code ${code}`));
      });
    });
  } catch (error) {
    console.warn(`Warning: Could not set ownership for ${filePath}:`, error.message);
  }
}

// CLI handling
if (require.main === module) {
  captureSketchPreviews().catch(console.error);
}

module.exports = { captureSketchPreviews };