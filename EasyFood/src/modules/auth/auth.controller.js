import {
  registerUser,
  loginUser,
  getUserById,
  updateProfileImage,
  removeProfileImage
} from './auth.service.js';
import * as limiter from './login.limiter.js';
import * as validate from '../../lib/validation.js';
import { handleError } from '../../lib/httpError.js';

export async function register(req, res) {
  try {
    const name = validate.text(req.body.name, 'Nome', { min: 2, max: 150 });
    const email = validate.email(req.body.email);
    const { password } = req.body;

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }
    // o bcrypt só considera os primeiros 72 bytes da senha
    if (Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'A senha deve ter no máximo 72 caracteres' });
    }

    const user = await registerUser({ name, email, password });
    return res.status(201).json(user);
  } catch (error) {
    // violação do @unique (duas requisições simultâneas com o mesmo e-mail)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    return handleError(res, error, 'Erro ao cadastrar usuário');
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  const normalized = email.trim().toLowerCase();
  const wait = limiter.minutesBlocked(req.ip, normalized);

  if (wait > 0) {
    return res.status(429).json({
      error: `Muitas tentativas de login. Tente novamente em ${wait} minuto${wait > 1 ? 's' : ''}.`
    });
  }

  try {
    const result = await loginUser({ email: normalized, password });

    if (!result) {
      limiter.registerFailure(req.ip, normalized);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    limiter.reset(req.ip, normalized);
    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'Erro no login');
  }
}

export async function me(req, res) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    return res.json({ message: 'Você está autenticado!', user });
  } catch (error) {
    return handleError(res, error, 'Erro ao buscar usuário');
  }
}

export async function uploadImage(req, res) {
  try {
    return res.json(await updateProfileImage(req.user.id, req.file.buffer));
  } catch (error) {
    return handleError(res, error, 'Erro ao salvar foto de perfil');
  }
}

export async function removeImage(req, res) {
  try {
    return res.json(await removeProfileImage(req.user.id));
  } catch (error) {
    return handleError(res, error, 'Erro ao remover foto de perfil');
  }
}
