import { getOverview, listAllRestaurants } from './admin.service.js';
import { handleError } from '../../lib/httpError.js';

export async function overview(req, res) {
  try {
    return res.json(await getOverview());
  } catch (error) {
    return handleError(res, error, 'Erro ao carregar a visão geral administrativa');
  }
}

export async function restaurants(req, res) {
  try {
    return res.json(await listAllRestaurants());
  } catch (error) {
    return handleError(res, error, 'Erro ao listar restaurantes administrativamente');
  }
}
