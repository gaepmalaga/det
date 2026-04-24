import sharp from 'sharp'
import { mkdirSync } from 'fs'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

mkdirSync('./public/icons', { recursive: true })

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <text
    x="256"
    y="340"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="280"
    font-weight="700"
    fill="white"
    text-anchor="middle"
  >D</text>
</svg>
`

const svgBuffer = Buffer.from(svg)

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(`./public/icons/icon-${size}x${size}.png`)
  console.log(`✓ icon-${size}x${size}.png`)
}

await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile('./public/apple-touch-icon.png')
console.log('✓ apple-touch-icon.png')

console.log('Iconos generados correctamente.')