// Bloqueia temporariamente um e-mail (vindo do mesmo IP) depois de várias senhas erradas.
// Fica em memória: reiniciar o servidor zera os contadores, o que é aceitável nesta fase (ADR-008).

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

const failures = new Map();

function key(ip, email) {
  return `${ip}|${email}`;
}

// Devolve quantos minutos faltam para liberar, ou 0 se o login pode ser tentado
export function minutesBlocked(ip, email, now = Date.now()) {
  const entry = failures.get(key(ip, email));
  if (!entry) return 0;

  const elapsed = now - entry.since;
  if (elapsed > WINDOW_MS) {
    failures.delete(key(ip, email));
    return 0;
  }

  return entry.count >= MAX_FAILURES ? Math.ceil((WINDOW_MS - elapsed) / 60000) : 0;
}

export function registerFailure(ip, email, now = Date.now()) {
  const k = key(ip, email);
  const entry = failures.get(k);

  if (!entry || now - entry.since > WINDOW_MS) {
    failures.set(k, { count: 1, since: now });
  } else {
    entry.count++;
  }
}

export function reset(ip, email) {
  failures.delete(key(ip, email));
}
