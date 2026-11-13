import test from 'node:test';
import assert from 'node:assert/strict';
import * as validate from '../src/lib/validation.js';

test('normaliza e valida e-mail', () => {
  assert.equal(validate.email('  TESTE@EXEMPLO.COM '), 'teste@exemplo.com');
});

test('rejeita e-mail inválido', () => {
  assert.throws(() => validate.email('email-invalido'), { statusCode: 400 });
});

test('valida texto e remove espaços externos', () => {
  assert.equal(validate.text('  Restaurante  ', 'Nome', { min: 2, max: 30 }), 'Restaurante');
});

test('rejeita texto vazio, curto, longo ou que não é texto', () => {
  assert.throws(() => validate.text('   ', 'Nome'), { statusCode: 400 });
  assert.throws(() => validate.text('a', 'Nome', { min: 2 }), { statusCode: 400 });
  assert.throws(() => validate.text('a'.repeat(11), 'Nome', { max: 10 }), { statusCode: 400 });
  assert.throws(() => validate.text(123, 'Nome'), { statusCode: 400 });
});

test('texto opcional: ausente ou vazio vira null', () => {
  assert.equal(validate.optionalText(undefined, 'Endereço'), null);
  assert.equal(validate.optionalText('   ', 'Endereço'), null);
  assert.equal(validate.optionalText(' Rua A ', 'Endereço'), 'Rua A');
});

test('rejeita identificador não positivo', () => {
  assert.throws(() => validate.id('0'), { statusCode: 400 });
  assert.throws(() => validate.id('abc'), { statusCode: 400 });
  assert.equal(validate.id('7'), 7);
});

test('preço aceita número e texto, com 2 casas', () => {
  assert.equal(validate.price(42.9), '42.90');
  assert.equal(validate.price('42,90'), '42.90');
  assert.equal(validate.price('0'), '0.00');
});

test('preço rejeita negativo, vazio e fora do limite', () => {
  assert.throws(() => validate.price(-1), { statusCode: 400 });
  assert.throws(() => validate.price(''), { statusCode: 400 });
  assert.throws(() => validate.price(null), { statusCode: 400 });
  assert.throws(() => validate.price(100000000), { statusCode: 400 });
});

test('nota é um inteiro de 1 a 5', () => {
  assert.equal(validate.stars(5), 5);
  for (const invalid of [0, 6, 4.5, '5', null, undefined]) {
    assert.throws(() => validate.stars(invalid), { statusCode: 400 });
  }
});

test('boolean exige tipo boolean', () => {
  assert.equal(validate.boolean(false, 'Situação'), false);
  assert.throws(() => validate.boolean('true', 'Situação'), { statusCode: 400 });
});
