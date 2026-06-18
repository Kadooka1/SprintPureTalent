const { countRecentLoginAttempts } = require('../models/userModel');

const MAX_ATTEMPTS   = 5;
const WINDOW_SECONDS = 30;

async function rateLimitLogin(req, res, next) {
  const email = req.body?.email || '';
  const ip    = req.ip || req.connection.remoteAddress || '';

  try {
    const attempts = await countRecentLoginAttempts(email, ip, WINDOW_SECONDS);
    if (attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: `Muitas tentativas de login. Tente novamente em ${WINDOW_SECONDS} segundos.`,
      });
    }
    next();
  } catch (err) {
    console.warn('[RATE LIMIT] Erro ao verificar tentativas, permitindo passagem:', err.message);
    next();
  }
}

module.exports = rateLimitLogin;
