const db = require('../config/db');

// ── Usuários ─────────────────────────────────────────────────────────────────

async function findByEmail(email) {
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id, email, role, is_active, email_verified_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function updatePassword(userId, passwordHash) {
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}

// ── Verificação de e-mail ─────────────────────────────────────────────────────

async function createEmailVerification(conn, userId, token, expiresAt) {
  await conn.execute(
    'INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
}

async function findEmailVerification(token) {
  const [rows] = await db.execute(
    `SELECT ev.*, u.email, c.full_name
     FROM email_verifications ev
     JOIN users u ON u.id = ev.user_id
     LEFT JOIN candidates c ON c.user_id = ev.user_id
     WHERE ev.token = ? AND ev.used_at IS NULL AND ev.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function markEmailVerificationUsed(id) {
  await db.execute('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [id]);
}

async function setEmailVerified(userId) {
  await db.execute('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [userId]);
}

// ── Refresh tokens ────────────────────────────────────────────────────────────

async function createRefreshToken(userId, tokenHash, expiresAt) {
  await db.execute(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );
}

async function findRefreshToken(tokenHash) {
  const [rows] = await db.execute(
    `SELECT * FROM refresh_tokens
     WHERE token = ? AND revoked = 0 AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function revokeRefreshToken(tokenHash) {
  await db.execute('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [tokenHash]);
}

async function revokeAllUserRefreshTokens(userId) {
  await db.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [userId]);
}

// ── Recuperação de senha ──────────────────────────────────────────────────────

async function createPasswordReset(userId, token, expiresAt) {
  // Invalida resets anteriores antes de criar um novo
  await db.execute(
    'UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [userId]
  );
  await db.execute(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
}

async function findPasswordReset(token) {
  const [rows] = await db.execute(
    `SELECT pr.*, u.email, c.full_name
     FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     LEFT JOIN candidates c ON c.user_id = pr.user_id
     WHERE pr.token = ? AND pr.used_at IS NULL AND pr.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function markPasswordResetUsed(id) {
  await db.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [id]);
}

// ── Rate limiting de login ────────────────────────────────────────────────────

async function logLoginAttempt(email, ip) {
  await db.execute(
    'INSERT INTO login_attempts (email, ip_address) VALUES (?, ?)',
    [email.toLowerCase().trim(), ip]
  );
}

async function countRecentLoginAttempts(email, ip, windowSeconds = 30) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) as total FROM login_attempts
     WHERE (email = ? OR ip_address = ?)
       AND attempted_at > DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [email.toLowerCase().trim(), ip, windowSeconds]
  );
  return rows[0].total;
}

async function deleteUser(userId) {
  await db.execute('DELETE FROM users WHERE id = ?', [userId]);
}

module.exports = {
  findByEmail, findById, updatePassword, deleteUser,
  createEmailVerification, findEmailVerification, markEmailVerificationUsed, setEmailVerified,
  createRefreshToken, findRefreshToken, revokeRefreshToken, revokeAllUserRefreshTokens,
  createPasswordReset, findPasswordReset, markPasswordResetUsed,
  logLoginAttempt, countRecentLoginAttempts,
};
