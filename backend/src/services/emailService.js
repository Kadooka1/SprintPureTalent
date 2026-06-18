const nodemailer = require('nodemailer');

function createTransport() {
  // Em desenvolvimento sem EMAIL_HOST configurado, apenas loga no console
  if (!process.env.EMAIL_HOST) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendMail(to, subject, html) {
  const transport = createTransport();

  if (!transport) {
    console.log('\n========== E-MAIL (MODO DEV) ==========');
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Conteúdo:\n${html}`);
    console.log('=======================================\n');
    return;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'Pure Talent <noreply@puretalent.com>',
    to,
    subject,
    html,
  });
}

async function sendVerificationEmail(email, name, token) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email/${token}`;
  await sendMail(
    email,
    'Pure Talent — Confirme seu e-mail',
    `<p>Olá, <strong>${name}</strong>!</p>
     <p>Clique no link abaixo para confirmar seu e-mail:</p>
     <a href="${url}">${url}</a>
     <p>O link expira em 24 horas.</p>`
  );
}

async function sendPasswordResetEmail(email, name, token) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password/${token}`;
  await sendMail(
    email,
    'Pure Talent — Redefinição de senha',
    `<p>Olá, <strong>${name}</strong>!</p>
     <p>Clique no link abaixo para redefinir sua senha:</p>
     <a href="${url}">${url}</a>
     <p>O link expira em 1 hora. Se não foi você, ignore este e-mail.</p>`
  );
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
