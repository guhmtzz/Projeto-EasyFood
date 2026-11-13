import prisma from './prisma.js';

// Registro de atividades (auditoria simples). Nunca derruba quem chamou:
// se a gravação falhar, o erro só vai para o console.
export async function logActivity(action, details) {
  try {
    await prisma.activity.create({ data: { action, details } });
  } catch (error) {
    console.error('Erro ao registrar atividade:', error.message);
  }
}
