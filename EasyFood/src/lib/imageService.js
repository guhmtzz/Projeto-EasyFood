import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { httpError } from './httpError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
export const PUBLIC_PREFIX = '/uploads';

/**
 * Otimiza e armazena uma imagem. Não sabe se ela é de um usuário, restaurante ou prato:
 * quem chama informa a pasta e o tamanho desejado.
 *
 * @returns {Promise<string>} caminho público, ex.: /uploads/dishes/abc.webp
 */
export async function saveImage(buffer, { folder, width, height }) {
  let optimized;

  try {
    optimized = await sharp(buffer)
      .rotate() // respeita a orientação EXIF de fotos tiradas no celular
      .resize(width, height, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    // O mimetype vem do cliente e pode mentir; o Sharp é quem confirma se é imagem de verdade.
    throw httpError(422, 'Arquivo de imagem inválido ou corrompido');
  }

  const dir = path.join(UPLOADS_DIR, folder);
  const fileName = `${crypto.randomUUID()}.webp`;

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), optimized);

  return `${PUBLIC_PREFIX}/${folder}/${fileName}`;
}

// Apaga uma imagem salva por este serviço. Caminhos fora de /uploads são ignorados.
export async function removeImage(publicPath) {
  if (!publicPath || !publicPath.startsWith(`${PUBLIC_PREFIX}/`)) return;

  const filePath = path.resolve(UPLOADS_DIR, publicPath.slice(PUBLIC_PREFIX.length + 1));
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return;

  await fs.rm(filePath, { force: true });
}

/**
 * Troca a imagem de um registro: salva a nova, deixa o módulo gravar o caminho no banco
 * (persist) e só então apaga a antiga. Se o banco falhar, a imagem nova é descartada.
 */
export async function replaceImage(buffer, options, oldPath, persist) {
  const newPath = await saveImage(buffer, options);

  let result;
  try {
    result = await persist(newPath);
  } catch (error) {
    await removeImage(newPath).catch(() => {});
    throw error;
  }

  try {
    await removeImage(oldPath);
  } catch (error) {
    console.error('Não foi possível remover a imagem antiga:', error.message);
  }

  return result;
}

/**
 * Remove a imagem de um registro: o módulo limpa o caminho no banco (persist) e só
 * depois o arquivo é apagado, para nunca deixar o banco apontando para um arquivo inexistente.
 */
export async function clearImage(oldPath, persist) {
  const result = await persist();

  try {
    await removeImage(oldPath);
  } catch (error) {
    console.error('Não foi possível remover o arquivo da imagem:', error.message);
  }

  return result;
}
