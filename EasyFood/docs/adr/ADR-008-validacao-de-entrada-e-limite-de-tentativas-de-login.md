# ADR-008: Validação de entrada e limite de tentativas de login

## Contexto
O ADR-004 registrou duas limitações: a API não limitava tentativas de login e as validações eram mínimas (apenas campos obrigatórios). Com mais rotas de escrita, entradas inesperadas (textos enormes, números fora do limite, JSON malformado) podiam causar erros 500 ou gravar dados ruins.

## Alternativas Consideradas
1. **Biblioteca de validação (Zod, Joi):** padronizada, mas adiciona dependência para regras simples.
2. **Funções próprias de validação:** poucas regras, sem dependência.
3. **Limite de login com pacote externo (`express-rate-limit`) ou em banco:** mais robusto, porém mais peças.

## Decisão
* **Validação própria** em `src/lib/validation.js` (`text`, `email`, `id`, `price`, `stars`, `boolean`): cada função devolve o valor limpo ou lança erro 400. Os controllers validam antes de chamar o service.
* **Erros padronizados** em `src/lib/httpError.js`: erros esperados mostram a mensagem, os inesperados viram 500 sem detalhes, e o app responde JSON para corpo malformado (400), grande demais (413) e rota inexistente (404).
* **Cadastro e login:** nome de 2 a 150 caracteres, e-mail válido, senha de 6 a 72 bytes (limite do bcrypt). O e-mail é gravado em minúsculas, então `Ana@x.com` e `ana@x.com` são a mesma conta.
* **Limite de tentativas** (`login.limiter.js`): após 5 senhas erradas para o mesmo e-mail e IP, o login responde 429 por 15 minutos. O contador fica em memória e é zerado por um login correto.

## Justificativa
As regras são poucas e cabem em funções pequenas e testáveis (`npm test`). O limitador em memória resolve o caso didático sem infraestrutura nova.

## Consequências Positivas
* Entradas inválidas viram 400 com mensagem clara, em vez de 500.
* Força bruta de senha fica bem mais difícil.

## Consequências Negativas
* O limitador zera ao reiniciar o servidor e não é compartilhado entre instâncias.
* Atrás de um proxy, `req.ip` precisa estar configurado (`trust proxy`) para não bloquear todos os usuários juntos.
* As regras de validação precisam ser mantidas manualmente.

## Critérios de Revisão
Reavaliar ao rodar mais de uma instância (limite em banco ou Redis) ou quando as regras ficarem numerosas a ponto de justificar uma biblioteca de esquemas.
