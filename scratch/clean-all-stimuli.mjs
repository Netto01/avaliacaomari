import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function getSaturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : ((max - min) / max) * 100;
}

export async function processImage(inputPath, outputPath) {
  const filename = path.basename(inputPath);
  console.log(`\n========================================`);
  console.log(`Processando: ${filename}`);

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = 4;
  const totalPixels = width * height;

  const isFred = filename.toLowerCase().includes('fred');

  // 1. Flood fill das bordas externas
  const visited = new Uint8Array(totalPixels);
  const queue = [];

  function isBgColor(x, y) {
    const idx = (y * width + x) * channels;
    const a = data[idx + 3];
    if (a < 20) return true; // Já transparente
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const sat = getSaturation(r, g, b);

    // Branco ou quase branco (alta claridade, baixa saturação)
    if (r > 210 && g > 210 && b > 210 && sat < 25) return true;
    // Tons cinzentos claros
    if (r > 195 && g > 195 && b > 195 && sat < 12) return true;
    
    // Artefato de compressão escuro ou linha de moldura exatamente na margem (< 5px da borda)
    if ((x < 5 || x >= width - 5 || y < 5 || y >= height - 5) && (r < 40 && g < 40 && b < 40)) {
      return true;
    }

    return false;
  }

  // Adiciona pixels das bordas externas
  for (let x = 0; x < width; x++) {
    if (isBgColor(x, 0)) { visited[0 * width + x] = 1; queue.push([x, 0]); }
    if (isBgColor(x, height - 1)) { visited[(height - 1) * width + x] = 1; queue.push([x, height - 1]); }
  }
  for (let y = 0; y < height; y++) {
    if (isBgColor(0, y) && !visited[y * width + 0]) { visited[y * width + 0] = 1; queue.push([0, y]); }
    if (isBgColor(width - 1, y) && !visited[y * width + (width - 1)]) { visited[y * width + (width - 1)] = 1; queue.push([width - 1, y]); }
  }

  // BFS flood-fill
  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const cIdx = (cy * width + cx) * channels;
    data[cIdx + 3] = 0; // Torna transparente

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos] && isBgColor(nx, ny)) {
          visited[nPos] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }

  console.log(`  Bordas externas limpas: ${head} pixels tornados transparentes.`);

  // 2. Detecção e remoção de ilhas de fundo encurraladas (entre personagens, debaixo de braços, etc.)
  // Não remove os olhos do Fred
  const whiteVisited = new Uint8Array(totalPixels);
  let trappedBgCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      const idx = pos * channels;
      const a = data[idx + 3];
      if (a < 50 || whiteVisited[pos]) continue;

      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const sat = getSaturation(r, g, b);
      const isWhiteLike = (r > 210 && g > 210 && b > 210 && sat < 25) || (r > 195 && g > 195 && b > 195 && sat < 12);

      if (isWhiteLike) {
        // Encontra o componente conexo completo
        const comp = [];
        const q = [[x, y]];
        whiteVisited[pos] = 1;
        let cHead = 0;
        let sumX = 0, sumY = 0;

        while (cHead < q.length) {
          const [cx, cy] = q[cHead++];
          comp.push([cx, cy]);
          sumX += cx;
          sumY += cy;

          const nbrs = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
          for (const [nx, ny] of nbrs) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nPos = ny * width + nx;
              if (!whiteVisited[nPos]) {
                const nIdx = nPos * channels;
                const na = data[nIdx + 3];
                if (na >= 50) {
                  const nr = data[nIdx], ng = data[nIdx + 1], nb = data[nIdx + 2];
                  const nSat = getSaturation(nr, ng, nb);
                  const isNW = (nr > 210 && ng > 210 && nb > 210 && nSat < 25) || (nr > 195 && ng > 195 && nb > 195 && nSat < 12);
                  if (isNW) {
                    whiteVisited[nPos] = 1;
                    q.push([nx, ny]);
                  }
                }
              }
            }
          }
        }

        const size = comp.length;
        const centerX = Math.round(sumX / size);
        const centerY = Math.round(sumY / size);

        // Verifica se é o olho do Fred
        const isFredEye = isFred && (
          (Math.abs(centerX - 784) < 100 && Math.abs(centerY - 528) < 100) ||
          (Math.abs(centerX - 952) < 100 && Math.abs(centerY - 535) < 100)
        );

        if (isFredEye) {
          console.log(`  Preservando olho do Fred em (${centerX}, ${centerY}), tamanho: ${size}px`);
          continue;
        }

        // Se for uma ilha de fundo branco (tamanho significativo ou não é detalhe microscópico de olho)
        // No Pocoyo e amigos, não há corpos brancos.
        // Apenas reflexos < 40px no Pocoyo pequeno podem ser mantidos se cercados por azul/pele.
        const isTinyEyeReflection = size < 40 && !isFred;

        if (!isTinyEyeReflection) {
          // Torna toda a ilha de fundo transparente
          for (const [cx, cy] of comp) {
            const pIdx = (cy * width + cx) * channels;
            data[pIdx + 3] = 0;
            trappedBgCount++;
          }
          console.log(`  Removida ilha de fundo encurralada em (${centerX}, ${centerY}), tamanho: ${size}px`);
        }
      }
    }
  }

  console.log(`  Total de pixels em ilhas encurraladas removidos: ${trappedBgCount}`);

  // 3. Defringing / Remoção de halos brancos nas bordas dos personagens
  let defringedCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const a = data[idx + 3];
      if (a === 0) continue;

      // Verifica se está adjacente a um pixel transparente (distância de até 2 pixels)
      let hasTranspNeighbor = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            hasTranspNeighbor = true;
            break;
          }
          const nIdx = (ny * width + nx) * channels;
          if (data[nIdx + 3] === 0) {
            hasTranspNeighbor = true;
            break;
          }
        }
        if (hasTranspNeighbor) break;
      }

      if (hasTranspNeighbor) {
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const sat = getSaturation(r, g, b);
        
        // Se o pixel da borda for branco ou acinzentado esbranquiçado (fringe)
        if (r > 200 && g > 200 && b > 200 && sat < 30) {
          // Torna totalmente transparente se for quase puro branco
          if (r > 235 && g > 235 && b > 235) {
            data[idx + 3] = 0;
            defringedCount++;
          } else {
            // Suaviza a opacidade gradualmente
            const brightness = (r + g + b) / 3;
            const factor = Math.max(0, (235 - brightness) / 35);
            data[idx + 3] = Math.round(data[idx + 3] * factor);
            defringedCount++;
          }
        }
      }
    }
  }

  console.log(`  Defringing concluído: ${defringedCount} pixels de halo suavizados/removidos.`);

  // 4. Salva no formato correto
  const ext = path.extname(outputPath).toLowerCase();
  if (ext === '.webp') {
    await sharp(data, { raw: { width, height, channels: 4 } })
      .webp({ quality: 95, alphaQuality: 100, lossless: false })
      .toFile(outputPath);
  } else {
    await sharp(data, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outputPath);
  }

  console.log(`  Arquivo salvo com sucesso em: ${outputPath}`);
}
