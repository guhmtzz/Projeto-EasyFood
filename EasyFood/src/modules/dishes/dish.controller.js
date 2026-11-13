import * as dishService from './dish.service.js';
import { handleError } from '../../lib/httpError.js';

export async function create(req, res) {
  try {
    const dish = await dishService.createDish(req.params.restaurantId, req.body, req.user.id);
    return res.status(201).json(dish);
  } catch (error) {
    return handleError(res, error, 'Erro ao cadastrar prato');
  }
}

export async function list(req, res) {
  try {
    return res.json(await dishService.listDishes(req.params.restaurantId, req.user));
  } catch (error) {
    return handleError(res, error, 'Erro ao listar pratos');
  }
}

export async function getById(req, res) {
  try {
    return res.json(await dishService.getDish(req.params.dishId, req.user));
  } catch (error) {
    return handleError(res, error, 'Erro ao buscar prato');
  }
}

export async function update(req, res) {
  try {
    return res.json(await dishService.updateDish(req.params.dishId, req.body, req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao atualizar prato');
  }
}

export async function remove(req, res) {
  try {
    await dishService.deleteDish(req.params.dishId, req.user.id);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, 'Erro ao excluir prato');
  }
}

export async function uploadImage(req, res) {
  try {
    return res.json(await dishService.updateDishImage(req.params.dishId, req.file.buffer, req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao salvar a foto do prato');
  }
}

export async function removeImage(req, res) {
  try {
    return res.json(await dishService.removeDishImage(req.params.dishId, req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao remover a foto do prato');
  }
}
