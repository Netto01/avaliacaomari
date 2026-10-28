import fs from 'fs';
import path from 'path';

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const segments = resolvedParams?.path || [];
  const relativePath = segments.join('/');

  // Caminho absoluto para a pasta estimulos na raiz
  const rootEstimulos = path.join(process.cwd(), 'estimulos');
  let filePath = path.join(rootEstimulos, relativePath);

  // Proteção contra path traversal
  if (!filePath.startsWith(rootEstimulos)) {
    return new Response('Acesso negado', { status: 403 });
  }

  // Fallback de retrocompatibilidade para o TAC caso a rota antiga seja requisitada
  if (!fs.existsSync(filePath)) {
    const tacFallback = path.join(rootEstimulos, 'tac', relativePath);
    if (fs.existsSync(tacFallback)) {
      filePath = tacFallback;
    } else {
      return new Response('Arquivo não encontrado', { status: 404 });
    }
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    // Se for diretório, lista os arquivos de imagem disponíveis
    const files = fs.readdirSync(filePath).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.webp', '.png', '.jpg', '.jpeg', '.svg'].includes(ext);
    });
    return Response.json({ files });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
