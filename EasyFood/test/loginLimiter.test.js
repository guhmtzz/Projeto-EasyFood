import test from 'node:test';
import assert from 'node:assert/strict';
import * as limiter from '../src/modules/auth/login.limiter.js';

test('bloqueia depois de 5 falhas e libera depois da janela', () => {
  const ip = '1.1.1.1';
  const email = 'a@a.com';
  const start = 1_000_000;

  for (let i = 0; i < limiter.MAX_FAILURES - 1; i++) limiter.registerFailure(ip, email, start);
  assert.equal(limiter.minutesBlocked(ip, email, start), 0);

  limiter.registerFailure(ip, email, start);
  assert.ok(limiter.minutesBlocked(ip, email, start) > 0);

  assert.equal(limiter.minutesBlocked(ip, email, start + limiter.WINDOW_MS + 1), 0);
});

test('login correto zera o contador', () => {
  const ip = '2.2.2.2';
  const email = 'b@b.com';

  for (let i = 0; i < limiter.MAX_FAILURES; i++) limiter.registerFailure(ip, email);
  assert.ok(limiter.minutesBlocked(ip, email) > 0);

  limiter.reset(ip, email);
  assert.equal(limiter.minutesBlocked(ip, email), 0);
});

test('o bloqueio é por IP e e-mail', () => {
  for (let i = 0; i < limiter.MAX_FAILURES; i++) limiter.registerFailure('3.3.3.3', 'c@c.com');
  assert.equal(limiter.minutesBlocked('4.4.4.4', 'c@c.com'), 0);
  assert.equal(limiter.minutesBlocked('3.3.3.3', 'outro@c.com'), 0);
});
