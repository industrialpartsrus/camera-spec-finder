#!/usr/bin/env node
// scripts/generate-contact-overlay.js
// Generate transparent PNG with contact info text overlay
// Run locally where font libraries are available: node scripts/generate-contact-overlay.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Contact info configuration
const PHONE = '1-800-380-4913';
const EMAIL = 'SALES@INDUSTRIALPARTSRUS.COM';

// Canvas size (will be scaled to fit target images)
// Using 2000x2000 for high resolution
const WIDTH = 2000;
const HEIGHT = 2000;

// Text positioning (bottom-right with 20px padding at this scale)
const PADDING = 20;
const PHONE_FONT_SIZE = Math.round(HEIGHT * 0.035); // 3.5% of height
const EMAIL_FONT_SIZE = Math.round(HEIGHT * 0.028); // 2.8% of height

console.log('Generating contact info overlay...');
console.log(`Canvas: ${WIDTH}x${HEIGHT}`);
console.log(`Phone font: ${PHONE_FONT_SIZE}px`);
console.log(`Email font: ${EMAIL_FONT_SIZE}px`);

// Create SVG with text and shadow
const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
  </defs>

  <!-- Phone number (bold, white with shadow) -->
  <text
    x="${WIDTH - PADDING}"
    y="${HEIGHT - 80}"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="bold"
    font-size="${PHONE_FONT_SIZE}px"
    fill="white"
    filter="url(#shadow)">
    ${PHONE}
  </text>

  <!-- Email (white with shadow) -->
  <text
    x="${WIDTH - PADDING}"
    y="${HEIGHT - 20}"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${EMAIL_FONT_SIZE}px"
    fill="white"
    filter="url(#shadow)">
    ${EMAIL}
  </text>
</svg>
`;

const outputPath = path.join(__dirname, '..', 'public', 'watermarks', 'contact-info.png');

// Generate PNG from SVG
sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath)
  .then(info => {
    console.log('\n✅ Contact overlay generated successfully!');
    console.log(`   Output: ${outputPath}`);
    console.log(`   Size: ${info.width}x${info.height}`);
    console.log(`   File size: ${Math.round(info.size / 1024)}KB`);
    console.log('\nNext steps:');
    console.log('1. git add public/watermarks/contact-info.png scripts/generate-contact-overlay.js');
    console.log('2. git commit -m "Add pre-rendered contact overlay for Vercel compatibility"');
    console.log('3. git push origin main');
  })
  .catch(err => {
    console.error('\n❌ Error generating overlay:', err.message);
    console.error('\nMake sure you run this script locally where font libraries are available.');
    process.exit(1);
  });
