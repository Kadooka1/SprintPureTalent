const { verifyAccessToken } = require('../utils/token');

function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token de acesso não fornecido.' });
  }

  const token = header.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado.' });
  }
}

// Verifica se o usuário tem o role esperado
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Acesso não autorizado.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
