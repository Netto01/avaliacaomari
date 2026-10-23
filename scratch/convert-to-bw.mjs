import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const filesToConvert = [
  'estimulos/parte1/pocoyo1.png',
  'estimulos/parte2/pocoyo2.png',
  'estimulos/parte3/Fred_Pulpo_2025.webp',
  'estimulos/parte3/artpoin-pocoyo12.png',
  'estimulos/parte3/artpoin-pocoyo18.png',
  'estimulos/parte3/e67735e20862e796117eb10b68aaa0b0-removebg-preview.png',
  'estimulos/parte3/png-clipart-child-pocoyo-pocoyo-graphy-drawing-child-child-photography.png',
  'estimulos/parte3/pocoyo.png',
  'public/default-stimuli/duo.png'
];

async function convertFile(relPath) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping (not found): ${relPath}`);
    return;
  }

  const ext = path.extname(relPath).toLowerCase();
  let pipeline = sharp(fullPath).grayscale();

  let buf;
  if (ext === '.webp') {
    buf = await pipeline.webp().toBuffer();
  } else {
    buf = await pipeline.png().toBuffer();
  }

  fs.writeFileSync(fullPath, buf);
  console.log(`Converted to black & white: ${relPath}`);
}

async function run() {
  for (const f of filesToConvert) {
    try {
      await convertFile(f);
    } catch (err) {
      console.error(`Error converting ${f}:`, err);
    }
  }
  console.log('All stimuli converted to black and white successfully!');
}

run();
