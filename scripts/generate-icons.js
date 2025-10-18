const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG for each size (optimized for that specific size)
function createSVG(size) {
    // Adjust stroke width and element sizes based on icon size
    const strokeWidth = Math.max(2, size * 0.03);
    const cornerRadius = size * 0.1;
    
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <!-- White background with rounded corners for iOS -->
        <rect width="${size}" height="${size}" fill="#ffffff" rx="${cornerRadius}"/>
        
        <!-- Main container with padding (15% on each side) -->
        <g transform="translate(${size * 0.15}, ${size * 0.15})">
            <!-- House shape (70% of icon size) -->
            <path d="M ${size * 0.35} ${size * 0.05}
                   L ${size * 0.05} ${size * 0.2}
                   L ${size * 0.05} ${size * 0.55}
                   L ${size * 0.15} ${size * 0.65}
                   L ${size * 0.55} ${size * 0.65}
                   L ${size * 0.65} ${size * 0.55}
                   L ${size * 0.65} ${size * 0.2}
                   Z" 
                  fill="#2563eb" />
            
            <!-- Window panes (adjust size for visibility) -->
            ${size >= 96 ? `
                <rect x="${size * 0.24}" y="${size * 0.24}" 
                      width="${size * 0.05}" height="${size * 0.05}" 
                      fill="white" rx="${size * 0.005}"/>
                <rect x="${size * 0.31}" y="${size * 0.24}" 
                      width="${size * 0.05}" height="${size * 0.05}" 
                      fill="white" rx="${size * 0.005}"/>
                <rect x="${size * 0.24}" y="${size * 0.31}" 
                      width="${size * 0.05}" height="${size * 0.05}" 
                      fill="white" rx="${size * 0.005}"/>
                <rect x="${size * 0.31}" y="${size * 0.31}" 
                      width="${size * 0.05}" height="${size * 0.05}" 
                      fill="white" rx="${size * 0.005}"/>
            ` : `
                <!-- Single window for small icons -->
                <rect x="${size * 0.275}" y="${size * 0.275}" 
                      width="${size * 0.08}" height="${size * 0.08}" 
                      fill="white" rx="${size * 0.005}"/>
            `}
            
            <!-- Checkmark (visible at all sizes) -->
            <path d="M ${size * 0.12} ${size * 0.42}
                   L ${size * 0.22} ${size * 0.52}
                   L ${size * 0.37} ${size * 0.32}" 
                  stroke="#22c55e" 
                  stroke-width="${strokeWidth}" 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  fill="none"/>
        </g>
    </svg>
    `;
}

// Generate icons
async function generateIcons() {
    console.log('🎨 Generating optimized PWA icons...\n');
    
    for (const size of sizes) {
        const svg = createSVG(size);
        const filename = `icon-${size}x${size}.png`;
        const filepath = path.join(iconsDir, filename);
        
        try {
            await sharp(Buffer.from(svg))
                .png()
                .toFile(filepath);
            
            console.log(`✅ Generated ${filename}`);
        } catch (error) {
            console.error(`❌ Error generating ${filename}:`, error);
        }
    }
    
    // Also create Apple Touch Icon (180x180)
    const appleSize = 180;
    const appleSvg = createSVG(appleSize);
    const appleFilepath = path.join(iconsDir, `apple-touch-icon.png`);
    
    try {
        await sharp(Buffer.from(appleSvg))
            .png()
            .toFile(appleFilepath);
        
        console.log(`✅ Generated apple-touch-icon.png`);
    } catch (error) {
        console.error(`❌ Error generating apple-touch-icon.png:`, error);
    }
    
    console.log('\n🎉 All icons generated successfully!');
    console.log('📱 Icons are optimized for crisp display on mobile devices');
}

generateIcons().catch(console.error);