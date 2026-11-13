// Envio de e-mail via MailerSend. É opcional: sem MAILER_API e DOMAIN_MAIL no .env
// nada é enviado e o restante do sistema funciona normalmente.

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function isEmailConfigured() {
  return Boolean(process.env.MAILER_API && process.env.DOMAIN_MAIL);
}

// "header" e "body" recebem texto puro: o escape para HTML é feito aqui.
export async function sendEmail({ to, toName, subject, header, body, footer }) {
  if (!isEmailConfigured()) return false;

  // Import dinâmico: o servidor sobe mesmo se o pacote não estiver instalado.
  const { MailerSend, EmailParams, Sender, Recipient } = await import('mailersend');

  const mailerSend = new MailerSend({ apiKey: process.env.MAILER_API });
  const sender = new Sender(`no-reply@${process.env.DOMAIN_MAIL}`, 'EasyFood');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${escapeHtml(header)}</h2>
      <div>${escapeHtml(body)}</div>
      <hr />
      <p style="color: #888; font-size: 12px;">${escapeHtml(footer)}</p>
    </div>`;

  const params = new EmailParams()
    .setFrom(sender)
    .setTo([new Recipient(to, toName || to)])
    .setReplyTo(sender)
    .setSubject(subject)
    .setHtml(html)
    .setText(`${header}\n\n${body}\n\n${footer}`);

  await mailerSend.email.send(params);
  console.log(`[EMAIL] Enviado para ${to}: "${subject}"`);
  return true;
}
