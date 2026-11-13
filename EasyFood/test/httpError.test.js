import test from 'node:test';
import assert from 'node:assert/strict';
import { httpError, handleError } from '../src/lib/httpError.js';

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('erro esperado mostra a mensagem e o status', () => {
  const res = fakeRes();
  handleError(res, httpError(404, 'Não achei'), 'ctx');
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'Não achei' });
});

test('erro inesperado vira 500 sem vazar detalhes', () => {
  const res = fakeRes();
  const original = console.error;
  console.error = () => {};
  handleError(res, new Error('segredo do banco'), 'ctx');
  console.error = original;

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Erro interno do servidor' });
});
