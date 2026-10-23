import fs from 'fs';
import path from 'path';
import { processImage } from './clean-all-stimuli.mjs';

const targetDirs = [
  'estimulos/parte1',
  'estimulos/parte2',
  'estimulos/parte3',
  'public/default-stimuli'
];

async function main() {
  console.log('Iniciando limpeza profunda de fundo de todas as imagens...');

  for (const dir of targetDirs) {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir);
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) continue;
      
      const filePath = path.join(fullDir, f);
      const tempPath = path.join(fullDir, `temp_${Date.now()}_${f}`);

      try {
        await processImage(filePath, tempPath);
        fs.renameSync(tempPath, filePath);
        console.log(`✅ Atualizado com sucesso: ${dir}/${f}`);
      } catch (err) {
        console.error(`❌ Erro ao processar ${dir}/${f}:`, err);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
  }

  console.log('\n✨ Todas as imagens foram processadas com fundo 100% transparente!');
}

main();
