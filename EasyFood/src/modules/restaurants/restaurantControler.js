import {
  findAllRestaurants,
  listOwnedRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  updateRestaurantImage,
  removeRestaurantImage,
  getDashboard
} from './restaurantService.js';
import * as validate from '../../lib/validation.js';
import { handleError } from '../../lib/httpError.js';

export async function getRestaurants(req, res) {
  try {
    return res.json(await findAllRestaurants());
  } catch (error) {
    return handleError(res, error, 'Erro ao buscar restaurantes');
  }
}

export async function getMyRestaurants(req, res) {
  try {
    return res.json(await listOwnedRestaurants(req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao listar restaurantes do proprietário');
  }
}

export async function getMyDashboard(req, res) {
  try {
    return res.json(await getDashboard(req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao carregar o painel');
  }
}

export async function postRestaurant(req, res) {
  try {
    // "rating" no corpo é ignorado: o dono não define a própria nota (ADR-006)
    const data = {
      name: validate.text(req.body.name, 'Nome', { max: 150 }),
      category: validate.text(req.body.category, 'Categoria', { max: 100 }),
      description: validate.optionalText(req.body.description, 'Descrição', { max: 1000 }),
      address: validate.optionalText(req.body.address, 'Endereço', { max: 255 }),
      phone: validate.optionalText(req.body.phone, 'Telefone', { max: 30 })
    };

    const restaurant = await createRestaurant(data, req.user);
    return res.status(201).json(restaurant);
  } catch (error) {
    return handleError(res, error, 'Erro ao cadastrar restaurante');
  }
}

export async function putRestaurant(req, res) {
  try {
    // Só entra no update o que veio no corpo
    const data = {};
    const { body } = req;

    if (body.name !== undefined) data.name = validate.text(body.name, 'Nome', { max: 150 });
    if (body.category !== undefined) data.category = validate.text(body.category, 'Categoria', { max: 100 });
    if (body.description !== undefined) data.description = validate.optionalText(body.description, 'Descrição', { max: 1000 });
    if (body.address !== undefined) data.address = validate.optionalText(body.address, 'Endereço', { max: 255 });
    if (body.phone !== undefined) data.phone = validate.optionalText(body.phone, 'Telefone', { max: 30 });
    if (body.isActive !== undefined) data.isActive = validate.boolean(body.isActive, 'Situação');

    return res.json(await updateRestaurant(req.params.restaurantId, data, req.user));
  } catch (error) {
    return handleError(res, error, 'Erro ao atualizar restaurante');
  }
}

export async function removeRestaurant(req, res) {
  try {
    await deleteRestaurant(req.params.restaurantId, req.user.id);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, 'Erro ao excluir restaurante');
  }
}

export async function postRestaurantImage(req, res) {
  try {
    return res.json(await updateRestaurantImage(req.params.restaurantId, req.file.buffer, req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao salvar a capa do restaurante');
  }
}

export async function deleteRestaurantImage(req, res) {
  try {
    return res.json(await removeRestaurantImage(req.params.restaurantId, req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao remover a capa do restaurante');
  }
}
