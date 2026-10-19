// Renders a share card to PNG at build time: Satori lays it out as SVG with the brand fonts, sharp
// turns that into a PNG. The fonts are static instances of the site's variable fonts
// (src/assets/fonts/, made by scripts/build-og-fonts.py), because Satori can't read variable fonts.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { HEIGHT, WIDTH, cardElement, cloudsSvg, type Card } from './card';

// From the project root: the build bundles this file elsewhere, so a path relative to it breaks.
const font = (file: string) => readFile(resolve('src/assets/fonts', file));

let fonts: Promise<Parameters<typeof satori>[1]['fonts']> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([
    font('SchibstedGrotesk-Regular.ttf'),
    font('SchibstedGrotesk-SemiBold.ttf'),
    font('MartianMono-Medium.ttf'),
  ]).then(([regular, semibold, mono]) => [
    { name: 'Schibsted Grotesk', data: regular, weight: 400, style: 'normal' },
    { name: 'Schibsted Grotesk', data: semibold, weight: 600, style: 'normal' },
    { name: 'Martian Mono', data: mono, weight: 500, style: 'normal' },
  ]));

export async function renderCard(card: Card): Promise<Buffer> {
  const svg = await satori(cardElement(card) as unknown as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: await loadFonts(),
  });
  // The clouds go underneath as plain SVG gradients (Satori can't size an elliptical gradient).
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${cloudsSvg(card)}${svg}</svg>`;
  return sharp(Buffer.from(full)).png({ compressionLevel: 9 }).toBuffer();
}
