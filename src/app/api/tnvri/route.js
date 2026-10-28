import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const tnvriDir = path.join(process.cwd(), 'estimulos', 'tnvri');

    if (!fs.existsSync(tnvriDir)) {
      return Response.json({ error: 'Diretório estimulos/tnvri não encontrado' }, { status: 404 });
    }

    // Carregar gabarito
    const gabaritoPath = path.join(tnvriDir, 'gabarito.json');
    let gabarito = {};
    if (fs.existsSync(gabaritoPath)) {
      try {
        gabarito = JSON.parse(fs.readFileSync(gabaritoPath, 'utf8'));
      } catch (e) {
        console.error('Erro ao ler gabarito.json:', e);
      }
    }

    // Listar subpastas pagina_XX
    const entries = fs.readdirSync(tnvriDir, { withFileTypes: true });
    const pageDirs = entries
      .filter(e => e.isDirectory() && e.name.startsWith('pagina_'))
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const pages = pageDirs.map((dirName, index) => {
      const pagePath = path.join(tnvriDir, dirName);
      const files = fs.readdirSync(pagePath).filter(f => !f.startsWith('.'));

      // Identificar imagem principal
      const principalFile = files.find(f => f.toLowerCase().includes('principal')) || files[0];

      // Mapeamento das 6 opções A até F
      const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
      const opcoes = letras.map(letra => {
        const file = files.find(f => {
          const lower = f.toLowerCase();
          return lower.includes(`opcao_${letra.toLowerCase()}`) || lower.endsWith(`_${letra.toLowerCase()}.png`);
        });

        return {
          letra,
          url: file ? `/api/estimulos/tnvri/${dirName}/${file}` : null
        };
      });

      const pageNumber = index + 1;
      const isTreino = dirName === 'pagina_01' || dirName === 'pagina_02';

      return {
        id: dirName,
        pageNumber,
        isTreino,
        titulo: isTreino ? `Exemplo ${dirName === 'pagina_01' ? '1' : '2'} (Treino)` : `Item ${pageNumber - 2} de ${pageDirs.length - 2}`,
        principalUrl: principalFile ? `/api/estimulos/tnvri/${dirName}/${principalFile}` : null,
        opcoes,
        correta: (gabarito[dirName] || 'A').toUpperCase()
      };
    });

    return Response.json({
      total: pages.length,
      treinoCount: pages.filter(p => p.isTreino).length,
      testCount: pages.filter(p => !p.isTreino).length,
      pages
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (err) {
    console.error('Erro ao carregar dados do TNVRI:', err);
    return Response.json({ error: 'Erro interno ao carregar TNVRI' }, { status: 500 });
  }
}
