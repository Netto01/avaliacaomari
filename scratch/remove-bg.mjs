import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

async function removeBackground(inputPath, outputPath) {
  console.log(`Processando: ${inputPath}...`);
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = 4;

  // Verifica as cores dos 4 cantos para estimar o fundo
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  for (const [x, y] of corners) {
    const idx = (y * width + x) * channels;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / corners.length);
  bgG = Math.round(bgG / corners.length);
  bgB = Math.round(bgB / corners.length);

  console.log(`  Cor média do fundo nos cantos: rgb(${bgR}, ${bgG}, ${bgB})`);

  // Flood fill a partir de todas as bordas externas
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Adiciona pixels das bordas que coincidem com a cor do fundo
  const tolerance = 45; // tolerância para artefatos de compressão jpeg/png

  function isBgMatch(x, y) {
    const idx = (y * width + x) * channels;
    const alpha = data[idx + 3];
    if (alpha === 0) return true; // Já transparente
    const d = colorDist(data[idx], data[idx + 1], data[idx + 2], bgR, bgG, bgB);
    // Também considera qualquer pixel quase branco puro (> 245 em todos os canais)
    const isAlmostWhite = data[idx] > 240 && data[idx + 1] > 240 && data[idx + 2] > 240;
    return d <= tolerance || isAlmostWhite;
  }

  // Borda superior e inferior
  for (let x = 0; x < width; x++) {
    if (isBgMatch(x, 0)) {
      visited[0 * width + x] = 1;
      queue.push([x, 0]);
    }
    if (isBgMatch(x, height - 1)) {
      visited[(height - 1) * width + x] = 1;
      queue.push([x, height - 1]);
    }
  }

  // Borda esquerda e direita
  for (let y = 0; y < height; y++) {
    if (isBgMatch(0, y) && !visited[y * width + 0]) {
      visited[y * width + 0] = 1;
      queue.push([0, y]);
    }
    if (isBgMatch(width - 1, y) && !visited[y * width + (width - 1)]) {
      visited[y * width + (width - 1)] = 1;
      queue.push([width - 1, y]);
    }
  }

  // BFS para preencher o fundo contínuo
  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const cIdx = (cy * width + cx) * channels;

    // Torna transparente
    data[cIdx + 3] = 0;

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos] && isBgMatch(nx, ny)) {
          visited[nPos] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }

  // Suavização das bordas para evitar serrilhado
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pos = y * width + x;
      const idx = pos * channels;
      if (data[idx + 3] > 0) {
        // Se vizinho for transparente e este pixel for muito claro, reduz opacidade
        const hasTransparentNeighbor =
          visited[pos - 1] || visited[pos + 1] || visited[pos - width] || visited[pos + width];
        if (hasTransparentNeighbor) {
          const d = colorDist(data[idx], data[idx + 1], data[idx + 2], bgR, bgG, bgB);
          if (d <= tolerance + 25) {
            data[idx + 3] = Math.max(0, Math.min(255, Math.round(((d - tolerance) / 25) * 255)));
          }
        }
      }
    }
  }

  // Salva no formato adequado (PNG para suportar transparência garantida)
  let finalOutput = outputPath;
  const isWebp = outputPath.endsWith('.webp');
  const isPng = outputPath.endsWith('.png');

  if (isWebp) {
    await sharp(data, { raw: { width, height, channels: 4 } })
      .webp({ quality: 95, alphaQuality: 100, lossless: false })
      .toFile(outputPath);
  } else {
    // Para PNG ou JPEG, salva como PNG transparente
    if (outputPath.endsWith('.jpeg') || outputPath.endsWith('.jpg')) {
      finalOutput = outputPath.replace(/\.jpe?g$/, '.png');
    }
    await sharp(data, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(finalOutput);
  }

  console.log(`  Salvo com fundo transparente em: ${finalOutput}`);
  return finalOutput;
}

async function run() {
  const filesToProcess = [
    'estimulos/parte1/Pocoyo1.webp',
    'estimulos/parte2/pocoyo2.png',
    'estimulos/parte3/Fred_Pulpo_2025.webp',
    'estimulos/parte3/artpoin-pocoyo12.png',
    'estimulos/parte3/artpoin-pocoyo18.png',
    'estimulos/parte3/pocoyo.png',
    'estimulos/parte3/png-clipart-child-pocoyo-pocoyo-graphy-drawing-child-child-photography.png',
    'estimulos/parte3/e67735e20862e796117eb10b68aaa0b0-removebg-preview.png',
    'public/default-stimuli/duo.jpeg'
  ];

  for (const relPath of filesToProcess) {
    const fullPath = path.join(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      const tempOutput = fullPath + '.tmp';
      try {
        const resPath = await removeBackground(fullPath, tempOutput);
        if (relPath.endsWith('.jpeg') || relPath.endsWith('.jpg')) {
          const newTarget = fullPath.replace(/\.jpe?g$/, '.png');
          fs.renameSync(resPath, newTarget);
          console.log(`  Substituído ${fullPath} por ${newTarget}`);
        } else {
          fs.renameSync(tempOutput, fullPath);
          console.log(`  Atualizado: ${fullPath}`);
        }
      } catch (err) {
        console.error(`Erro ao processar ${relPath}:`, err.message);
      }
    }
  }

  console.log('\n✅ Remoção de fundo concluída em todas as imagens!');
}

run();
