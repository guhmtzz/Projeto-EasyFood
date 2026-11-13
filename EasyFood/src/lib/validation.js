// Validações de entrada reaproveitadas pelos módulos. Cada função devolve o valor
// já limpo ou lança um erro 400, que os controllers transformam em resposta.

import { httpError } from './httpError.js';

export function text(value, label, { min = 1, max = 255 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw httpError(400, min > 1 ? `${label} deve ter pelo menos ${min} caracteres` : `${label} é obrigatório`);
  }

  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw httpError(400, `${label} deve ter no máximo ${max} caracteres`);
  }

  return trimmed;
}

// Campo opcional: ausente (undefined/null) vira null; texto vazio também.
export function optionalText(value, label, { max = 255 } = {}) {
  if (value === undefined || value === null) return null;
  return text(value, label, { min: 0, max }) || null;
}

export function email(value) {
  const normalized = text(value, 'E-mail', { max: 150 }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    throw httpError(400, 'E-mail inválido');
  }

  return normalized;
}

export function id(value) {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw httpError(400, 'Identificador inválido');
  }

  return parsed;
}

// Preço em reais (aceita número ou texto como "42.90" / "42,90"); devolve texto com 2 casas.
export function price(value) {
  const parsed = typeof value === 'string' && value.trim() !== ''
    ? Number(value.trim().replace(',', '.'))
    : value;

  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 0 || parsed > 99999999.99) {
    throw httpError(400, 'Preço inválido');
  }

  return parsed.toFixed(2);
}

// Nota de avaliação: inteiro de 1 a 5
export function stars(value) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw httpError(400, 'A nota deve ser um número inteiro de 1 a 5');
  }

  return value;
}

export function boolean(value, label) {
  if (typeof value !== 'boolean') {
    throw httpError(400, `${label} inválido`);
  }

  return value;
}
