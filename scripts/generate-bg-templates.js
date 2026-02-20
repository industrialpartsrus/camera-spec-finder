// scripts/generate-bg-templates.js
// Generate placeholder background templates for Remove.bg integration
// Run: node scripts/generate-bg-templates.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'bg-templates');
const SIZE = 2000;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('Created directory:', OUTPUT_DIR);
}

// Helper: Create gradient SVG
function createGradientSvg(type, colors, size = SIZE) {
  if (type === 'linear') {
    // Linear gradient (top to bottom)
    return `
      <svg width="${size}" height="${size}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#grad)" />
      </svg>
    `;
  } else if (type === 'radial') {
    // Radial gradient (center to edges)
    return `
      <svg width="${size}" height="${size}">
        <defs>
          <radialGradient id="grad">
            <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
          </radialGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#grad)" />
      </svg>
    `;
  }
}

// 1. WAREHOUSE FLOOR - Dark concrete gray gradient (top lighter → bottom darker)
async function generateWarehouseFloor() {
  const svg = createGradientSvg('linear', ['#b0b0b0', '#4a4a4a']);

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toFile(path.join(OUTPUT_DIR, 'warehouse-floor.jpg'));

  const stats = fs.statSync(path.join(OUTPUT_DIR, 'warehouse-floor.jpg'));
  console.log('✅ Generated: warehouse-floor.jpg', `(${Math.round(stats.size / 1024)}KB)`);
}

// 2. STUDIO GRADIENT - Soft light gray center spotlight → medium gray edges (radial)
async function generateStudioGradient() {
  const svg = createGradientSvg('radial', ['#e8e8e8', '#a0a0a0']);

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toFile(path.join(OUTPUT_DIR, 'studio-gradient.jpg'));

  const stats = fs.statSync(path.join(OUTPUT_DIR, 'studio-gradient.jpg'));
  console.log('✅ Generated: studio-gradient.jpg', `(${Math.round(stats.size / 1024)}KB)`);
}

// 3. INDUSTRIAL - Blue-gray with vignette effect
async function generateIndustrial() {
  const svg = createGradientSvg('radial', ['#c5cdd4', '#7a8a96']);

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toFile(path.join(OUTPUT_DIR, 'industrial.jpg'));

  const stats = fs.statSync(path.join(OUTPUT_DIR, 'industrial.jpg'));
  console.log('✅ Generated: industrial.jpg', `(${Math.round(stats.size / 1024)}KB)`);
}

// Generate all templates
(async () => {
  console.log('Generating background templates (2000x2000)...\n');
  await generateWarehouseFloor();
  await generateStudioGradient();
  await generateIndustrial();
  console.log('\n✅ All templates generated successfully!');
  console.log('📁 Location:', OUTPUT_DIR);
})();
