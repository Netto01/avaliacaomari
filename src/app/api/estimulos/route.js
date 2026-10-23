import fs from 'fs';
import path from 'path';

export async function GET() {
  const rootEstimulos = path.join(process.cwd(), 'estimulos');
  const defaultStimuliDir = path.join(process.cwd(), 'public', 'default-stimuli');
  
  const result = {
    parte1: [],
    parte2: [],
    parte3: [],
    duoDistractor: '/default-stimuli/duo.png',
    characterDistractors: []
  };

  const imageExtensions = ['.webp', '.png', '.jpg', '.jpeg'];

  // 1. Arquivos nas subpastas estimulos/
  ['parte1', 'parte2', 'parte3'].forEach(part => {
    const dirPath = path.join(rootEstimulos, part);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext) && !file.startsWith('.');
      });
      result[part] = files.map(f => {
        const filePath = path.join(dirPath, f);
        const mtime = fs.statSync(filePath).mtimeMs;
        return {
          filename: f,
          url: `/api/estimulos/${part}/${f}?v=${Math.round(mtime)}`
        };
      });
    }
  });

  // 2. Localiza o distrator duo em public/default-stimuli
  if (fs.existsSync(defaultStimuliDir)) {
    const defaultFiles = fs.readdirSync(defaultStimuliDir);
    const duoFile = defaultFiles.find(f => f.toLowerCase().startsWith('duo'));
    if (duoFile) {
      const duoPath = path.join(defaultStimuliDir, duoFile);
      const duoMtime = fs.statSync(duoPath).mtimeMs;
      result.duoDistractor = `/default-stimuli/${duoFile}?v=${Math.round(duoMtime)}`;
    }
  }

  // 3. Distratores de personagens (as figuras de parte3)
  result.characterDistractors = result.parte3.map(f => f.url);

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
