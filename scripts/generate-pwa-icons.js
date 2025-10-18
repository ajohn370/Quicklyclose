const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icon for each size
sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background - white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Calculate dimensions for the house icon
    const padding = size * 0.15; // 15% padding
    const iconSize = size - (padding * 2);
    const lineWidth = Math.max(2, size * 0.025);
    
    // Set up drawing style
    ctx.strokeStyle = '#2563eb';
    ctx.fillStyle = '#2563eb';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw house shape
    const startX = padding;
    const startY = padding;
    
    // House shape path (diamond-like shape from logo)
    ctx.beginPath();
    ctx.moveTo(startX + iconSize * 0.5, startY);
    ctx.lineTo(startX, startY + iconSize * 0.3);
    ctx.lineTo(startX, startY + iconSize * 0.9);
    ctx.lineTo(startX + iconSize * 0.3, startY + iconSize);
    ctx.lineTo(startX + iconSize * 0.7, startY + iconSize);
    ctx.lineTo(startX + iconSize, startY + iconSize * 0.9);
    ctx.lineTo(startX + iconSize, startY + iconSize * 0.3);
    ctx.closePath();
    
    // Fill with gradient effect
    const gradient = ctx.createLinearGradient(startX, startY, startX + iconSize, startY + iconSize);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#2563eb');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw window (4 squares) in white
    ctx.fillStyle = '#ffffff';
    const windowSize = iconSize * 0.08;
    const windowGap = windowSize * 0.3;
    const windowStartX = startX + iconSize * 0.35;
    const windowStartY = startY + iconSize * 0.35;
    
    // Draw 4 window panes
    ctx.fillRect(windowStartX, windowStartY, windowSize, windowSize);
    ctx.fillRect(windowStartX + windowSize + windowGap, windowStartY, windowSize, windowSize);
    ctx.fillRect(windowStartX, windowStartY + windowSize + windowGap, windowSize, windowSize);
    ctx.fillRect(windowStartX + windowSize + windowGap, windowStartY + windowSize + windowGap, windowSize, windowSize);
    
    // Draw checkmark
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = lineWidth * 1.5;
    ctx.beginPath();
    const checkStartX = startX + iconSize * 0.15;
    const checkStartY = startY + iconSize * 0.65;
    ctx.moveTo(checkStartX, checkStartY);
    ctx.lineTo(checkStartX + iconSize * 0.15, checkStartY + iconSize * 0.15);
    ctx.lineTo(checkStartX + iconSize * 0.35, checkStartY - iconSize * 0.15);
    ctx.stroke();
    
    // Save the icon
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(iconsDir, `icon-${size}x${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`✅ Generated ${filename}`);
});

console.log('\n🎉 All PWA icons generated successfully!');
console.log('📱 Icons are optimized for mobile app display');