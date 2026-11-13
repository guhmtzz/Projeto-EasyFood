import { rate, getMyRating } from './review.service.js';
import { handleError } from '../../lib/httpError.js';

export async function postReview(req, res) {
  try {
    return res.json(await rate(req.params.restaurantId, req.user.id, req.body.rating));
  } catch (error) {
    return handleError(res, error, 'Erro ao avaliar restaurante');
  }
}

export async function getMyReview(req, res) {
  try {
    return res.json(await getMyRating(req.params.restaurantId, req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao buscar a avaliação');
  }
}
