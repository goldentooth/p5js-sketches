#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

async function generateGallery() {
  console.log('Generating gallery HTML...');

  // Read the template
  const templateHtml = await fs.readFile('gallery-template.html', 'utf8');
  const dom = new JSDOM(templateHtml);
  const document = dom.window.document;

  // Find the gallery container
  const galleryContainer = document.querySelector('.gallery');
  if (!galleryContainer) {
    throw new Error('Gallery container not found in template');
  }

  // Clear existing content
  galleryContainer.innerHTML = '';

  // Find all sketch directories
  const sketchesDir = './sketches';
  const entries = await fs.readdir(sketchesDir, { withFileTypes: true });
  
  let sketchCount = 0;
  
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'lost+found') continue;
    
    const sketchDir = path.join(sketchesDir, entry.name);
    const indexPath = path.join(sketchDir, 'index.html');
    
    try {
      await fs.access(indexPath);
    } catch {
      console.log(`Skipping ${entry.name} - no index.html found`);
      continue;
    }
    
    sketchCount++;
    const sketchName = entry.name;
    
    // Create sketch card element
    const card = document.createElement('div');
    card.className = 'sketch-card';
    
    // Create preview
    const preview = document.createElement('div');
    preview.className = 'sketch-preview';
    
    const pngPath = path.join(sketchDir, 'preview.png');
    const gifPath = path.join(sketchDir, 'preview.gif');
    
    try {
      await fs.access(pngPath);
      const pngImg = document.createElement('img');
      pngImg.src = `/${sketchName}/preview.png`;
      pngImg.alt = `${sketchName} preview`;
      pngImg.className = 'preview-png';
      preview.appendChild(pngImg);
      
      try {
        await fs.access(gifPath);
        const gifImg = document.createElement('img');
        gifImg.src = `/${sketchName}/preview.gif`;
        gifImg.alt = `${sketchName} animation`;
        gifImg.className = 'preview-gif';
        preview.appendChild(gifImg);
      } catch {
        // Only PNG exists
      }
    } catch {
      try {
        await fs.access(gifPath);
        const gifImg = document.createElement('img');
        gifImg.src = `/${sketchName}/preview.gif`;
        gifImg.alt = `${sketchName} animation`;
        preview.appendChild(gifImg);
      } catch {
        // No preview images - create placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'preview-placeholder';
        placeholder.textContent = sketchName.charAt(0).toUpperCase();
        preview.appendChild(placeholder);
      }
    }
    
    // Create content section
    const content = document.createElement('div');
    content.className = 'sketch-content';
    
    // Load metadata from HTML meta tags
    let sketchTitle = sketchName;
    let sketchDescription = '';
    
    try {
      const htmlContent = await fs.readFile(indexPath, 'utf8');
      const htmlDom = new JSDOM(htmlContent);
      const htmlDoc = htmlDom.window.document;
      
      // Get title from <title> tag or fallback to directory name
      const titleElement = htmlDoc.querySelector('title');
      if (titleElement && titleElement.textContent.trim()) {
        sketchTitle = titleElement.textContent.trim();
      }
      
      // Get description from meta tag
      const descElement = htmlDoc.querySelector('meta[name="description"]');
      if (descElement && descElement.content) {
        sketchDescription = descElement.content;
      }
    } catch (error) {
      console.warn(`Could not read metadata from ${indexPath}:`, error.message);
    }
    
    // Create title
    const title = document.createElement('div');
    title.className = 'sketch-title';
    title.textContent = sketchTitle;
    content.appendChild(title);
    
    // Create description if available
    if (sketchDescription) {
      const description = document.createElement('div');
      description.className = 'sketch-description';
      description.textContent = sketchDescription;
      content.appendChild(description);
    }
    
    // Create link
    const link = document.createElement('a');
    link.href = `/${sketchName}/`;
    link.className = 'sketch-link';
    link.textContent = 'View Sketch';
    content.appendChild(link);
    
    // Assemble card
    card.appendChild(preview);
    card.appendChild(content);
    galleryContainer.appendChild(card);
  }
  
  // Show message if no sketches
  if (sketchCount === 0) {
    const noSketches = document.createElement('div');
    noSketches.className = 'no-sketches';
    noSketches.textContent = 'No sketches available yet.';
    galleryContainer.appendChild(noSketches);
  }
  
  // Write the generated HTML
  const outputPath = path.join(sketchesDir, 'index.html');
  await fs.writeFile(outputPath, dom.serialize());
  
  console.log(`Gallery generated with ${sketchCount} sketches`);
}

// Run if called directly
if (require.main === module) {
  generateGallery().catch(console.error);
}

module.exports = { generateGallery };