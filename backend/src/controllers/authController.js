const bcrypt       = require('bcryptjs');
const crypto       = require('crypto');
const db           = require('../config/db');
const userModel    = require('../models/userModel');
const emailService = require('../services/emailService');
const {
  generateAccessToken, generateRefreshToken, hashToken,
} = require('../utils/token');
const {
  validateEmail, validatePassword, validateName, validateBirthDate, validateCNPJ,
} = require('../utils/validators');

// ── Helpers ──────────────────────────────────────────────────────────────────

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, error, status = 400) {
  return res.status(status).json({ success: false, error });
}

function refreshTokenExpiresAt() {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function issueTokens(res, userId, role) {
  const accessToken        = generateAccessToken(userId, role);
  const rawRefreshToken    = generateRefreshToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);
  const expiresAt          = refreshTokenExpiresAt();

  await userModel.createRefreshToken(userId, hashedRefreshToken, expiresAt);

  return ok(res, {
    accessToken,
    refreshToken: rawRefreshToken,
    user: { id: userId, role },
  });
}

// ── Cadastro de Candidato ─────────────────────────────────────────────────────

async function registerCandidate(req, res, next) {
  try {
    const { full_name, email, password, birth_date, phone } = req.body;

    const nameError      = validateName(full_name);
    const emailError     = validateEmail(email);
    const passwordError  = validatePassword(password);
    const birthDateError = validateBirthDate(birth_date);

    if (nameError)      return fail(res, nameError);
    if (emailError)     return fail(res, emailError);
    if (passwordError)  return fail(res, passwordError);
    if (birthDateError) return fail(res, birthDateError);

    const existing = await userModel.findByEmail(email);
    if (existing) return fail(res, 'E-mail já cadastrado.', 409);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const passwordHash = await bcrypt.hash(password, 10);
      const [userResult] = await conn.execute(
        'INSERT INTO users (email, password_hash, role, email_verified_at) VALUES (?, ?, ?, NOW())',
        [email.toLowerCase().trim(), passwordHash, 'candidate']
      );
      const userId = userResult.insertId;

      await conn.execute(
        'INSERT INTO candidates (user_id, full_name, birth_date, phone) VALUES (?, ?, ?, ?)',
        [userId, full_name.trim(), birth_date, phone?.trim() || null]
      );

      await conn.commit();

      return ok(res, { message: 'Cadastro realizado com sucesso!' }, 201);
    } catch (err) {
      await conn.rollback();
      if (err.code === 'ER_DUP_ENTRY') return fail(res, 'E-mail já cadastrado.', 409);
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
}

// ── Cadastro de Empresa ───────────────────────────────────────────────────────

async function registerCompany(req, res, next) {
  try {
    const { legal_name, trade_name, cnpj, email, password, size, sector, phone, website } = req.body;

    if (!legal_name || !trade_name || !size || !sector)
      return fail(res, 'Preencha todos os campos obrigatórios.');

    const emailError    = validateEmail(email);
    const passwordError = validatePassword(password);
    const cnpjError     = validateCNPJ(cnpj);

    if (emailError)    return fail(res, emailError);
    if (passwordError) return fail(res, passwordError);
    if (cnpjError)     return fail(res, cnpjError);

    const validSizes = ['micro', 'small', 'medium', 'large'];
    if (!validSizes.includes(size)) return fail(res, 'Porte da empresa inválido.');

    const existing = await userModel.findByEmail(email);
    if (existing) return fail(res, 'E-mail já cadastrado.', 409);

    const cnpjDigits = cnpj.replace(/[^\d]/g, '');
    const [cnpjRows] = await db.execute(
      'SELECT id FROM companies WHERE cnpj = ? LIMIT 1',
      [cnpjDigits]
    );
    if (cnpjRows.length > 0) return fail(res, 'CNPJ já cadastrado.', 409);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const passwordHash = await bcrypt.hash(password, 10);
      const [userResult] = await conn.execute(
        'INSERT INTO users (email, password_hash, role, email_verified_at) VALUES (?, ?, ?, NOW())',
        [email.toLowerCase().trim(), passwordHash, 'company']
      );
      const userId = userResult.insertId;

      await conn.execute(
        `INSERT INTO companies (user_id, legal_name, trade_name, cnpj, corporate_email, size, sector, phone, website)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, legal_name.trim(), trade_name.trim(),
          cnpjDigits, email.toLowerCase().trim(),
          size, sector.trim(),
          phone?.trim() || null,
          website?.trim() || null,
        ]
      );

      await conn.commit();

      return ok(res, { message: 'Empresa cadastrada com sucesso!' }, 201);
    } catch (err) {
      await conn.rollback();
      if (err.code === 'ER_DUP_ENTRY') return fail(res, 'E-mail já cadastrado.', 409);
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return fail(res, 'E-mail e senha são obrigatórios.');

    const ip = req.ip || req.connection.remoteAddress || '';
    await userModel.logLoginAttempt(email, ip);

    const user = await userModel.findByEmail(email);

    // Mensagem genérica para não revelar se o e-mail existe
    const invalidCredentials = 'E-mail ou senha incorretos.';

    if (!user) return fail(res, invalidCredentials, 401);
    if (!user.is_active) return fail(res, 'Conta suspensa. Entre em contato com o suporte.', 403);

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return fail(res, invalidCredentials, 401);

    return issueTokens(res, user.id, user.role);
  } catch (err) {
    next(err);
  }
}

// ── Refresh Token ─────────────────────────────────────────────────────────────

async function refreshToken(req, res, next) {
  try {
    const { refreshToken: rawToken } = req.body;
    if (!rawToken) return fail(res, 'Refresh token não fornecido.', 401);

    const tokenHash   = hashToken(rawToken);
    const storedToken = await userModel.findRefreshToken(tokenHash);

    if (!storedToken) return fail(res, 'Refresh token inválido ou expirado.', 401);

    const user = await userModel.findById(storedToken.user_id);
    if (!user || !user.is_active) return fail(res, 'Usuário inativo.', 403);

    await userModel.revokeRefreshToken(tokenHash);
    return issueTokens(res, user.id, user.role);
  } catch (err) {
    next(err);
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    const { refreshToken: rawToken } = req.body;
    if (rawToken) {
      await userModel.revokeRefreshToken(hashToken(rawToken));
    }
    return ok(res, { message: 'Sessão encerrada.' });
  } catch (err) {
    next(err);
  }
}

// ── Verificação de e-mail ─────────────────────────────────────────────────────

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;
    const record = await userModel.findEmailVerification(token);

    if (!record) {
      return fail(res, 'Link de verificação inválido ou expirado.', 400);
    }

    await userModel.setEmailVerified(record.user_id);
    await userModel.markEmailVerificationUsed(record.id);

    return ok(res, { message: 'E-mail confirmado com sucesso! Você já pode fazer login.' });
  } catch (err) {
    next(err);
  }
}

// ── Esqueci a senha ───────────────────────────────────────────────────────────

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!validateEmail(email) === null) { /* continue */ }

    // Sempre retorna 200 para não revelar se o e-mail existe
    const user = await userModel.findByEmail(email);
    if (user && user.email_verified_at) {
      const token     = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await userModel.createPasswordReset(user.id, token, expiresAt);

      const [candidateRows] = await db.execute(
        'SELECT full_name FROM candidates WHERE user_id = ? LIMIT 1',
        [user.id]
      );
      const name = candidateRows[0]?.full_name || 'usuário';
      await emailService.sendPasswordResetEmail(email, name, token);
    }

    return ok(res, {
      message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.',
    });
  } catch (err) {
    next(err);
  }
}

// ── Redefinir senha ───────────────────────────────────────────────────────────

async function resetPassword(req, res, next) {
  try {
    const { token }    = req.params;
    const { password } = req.body;

    const passwordError = validatePassword(password);
    if (passwordError) return fail(res, passwordError);

    const record = await userModel.findPasswordReset(token);
    if (!record) return fail(res, 'Link de redefinição inválido ou expirado.', 400);

    const passwordHash = await bcrypt.hash(password, 10);
    await userModel.updatePassword(record.user_id, passwordHash);
    await userModel.markPasswordResetUsed(record.id);
    await userModel.revokeAllUserRefreshTokens(record.user_id);

    return ok(res, { message: 'Senha redefinida com sucesso! Faça login com a nova senha.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerCandidate, registerCompany,
  login, logout, refreshToken,
  verifyEmail, forgotPassword, resetPassword,
};
