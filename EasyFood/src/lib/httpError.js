// Erros de negócio carregam o status HTTP; os controllers só precisam repassá-los.

export function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Resposta padrão de erro: mostra a mensagem dos erros esperados (4xx)
// e esconde os detalhes dos inesperados (500), registrando-os no console.
export function handleError(res, error, context = 'Erro') {
  const status = error.statusCode || 500;
  if (status === 500) console.error(`${context}:`, error.message);

  return res.status(status).json({
    error: status === 500 ? 'Erro interno do servidor' : error.message
  });
}
