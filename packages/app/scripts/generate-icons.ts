import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const svgPath = resolve(process.cwd(), 'public/logo.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 32 },
  { name: 'maskable-icon.png', size: 512 },
];

for (const { name, size } of sizes) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  const outputPath = resolve(process.cwd(), 'public', name);
  writeFileSync(outputPath, pngBuffer);
  console.log(`✓ Generated ${name} (${size}x${size})`);
}

console.log('\n✅ All icons generated successfully!');
