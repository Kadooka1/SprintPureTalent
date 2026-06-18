const db = require('../config/db');

async function getDashboardStats() {
  const [[users]] = await db.execute(`
    SELECT COUNT(*) AS total,
           SUM(role = 'candidate') AS candidates,
           SUM(role = 'company')   AS companies,
           SUM(is_active = 0)      AS inactive
    FROM users WHERE deleted_at IS NULL`);

  const [[jobs]] = await db.execute(`
    SELECT COUNT(*) AS total,
           SUM(status = 'active')         AS active,
           SUM(status = 'pending_review') AS pending_review,
           SUM(status = 'closed')         AS closed,
           SUM(status = 'rejected')       AS rejected,
           SUM(status = 'draft')          AS draft
    FROM jobs WHERE deleted_at IS NULL`);

  const [[certs]] = await db.execute(`
    SELECT COUNT(*) AS total,
           SUM(status = 'manual_review') AS manual_review,
           SUM(status = 'validated')     AS validated,
           SUM(status = 'rejected')      AS rejected,
           SUM(status = 'pending')       AS pending,
           SUM(status = 'processing')    AS processing
    FROM certificates`);

  const [[apps]]   = await db.execute('SELECT COUNT(*) AS total FROM applications');
  const [[aiLogs]] = await db.execute('SELECT COUNT(*) AS total FROM ai_logs');

  return {
    users:        { total: +users.total, candidates: +users.candidates, companies: +users.companies, inactive: +users.inactive },
    jobs:         { total: +jobs.total,  active: +jobs.active, pending_review: +jobs.pending_review, closed: +jobs.closed, rejected: +jobs.rejected, draft: +jobs.draft },
    certificates: { total: +certs.total, manual_review: +certs.manual_review, validated: +certs.validated, rejected: +certs.rejected, pending: +certs.pending, processing: +certs.processing },
    applications: { total: +apps.total },
    ai_logs:      { total: +aiLogs.total },
  };
}

// ── Usuários ──────────────────────────────────────────────────

async function deleteUser(id) {
  await db.execute('DELETE FROM users WHERE id = ?', [id]);
}

async function getUsers({ role, is_active, search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conds  = ['u.deleted_at IS NULL', "u.role != 'admin'"];
  const params = [];

  if (role) { conds.push('u.role = ?'); params.push(role); }
  if (is_active !== undefined && is_active !== '') { conds.push('u.is_active = ?'); params.push(Number(is_active)); }
  if (search) { conds.push('u.email LIKE ?'); params.push(`%${search}%`); }

  const where = conds.join(' AND ');

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM users u WHERE ${where}`, params
  );
  const [rows] = await db.execute(
    `SELECT u.id, u.email, u.role, u.is_active, u.created_at,
            COALESCE(c.full_name, co.trade_name, a.full_name) AS display_name
     FROM users u
     LEFT JOIN candidates c  ON c.user_id  = u.id
     LEFT JOIN companies  co ON co.user_id = u.id
     LEFT JOIN admins     a  ON a.user_id  = u.id
     WHERE ${where}
     ORDER BY u.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { users: rows, total: parseInt(total, 10), page, limit };
}

async function getUserById(id) {
  const [rows] = await db.execute(
    `SELECT u.id, u.email, u.role, u.is_active, u.created_at,
            COALESCE(c.full_name, co.trade_name, a.full_name) AS display_name
     FROM users u
     LEFT JOIN candidates c  ON c.user_id  = u.id
     LEFT JOIN companies  co ON co.user_id = u.id
     LEFT JOIN admins     a  ON a.user_id  = u.id
     WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function toggleUserActive(id, is_active) {
  await db.execute('UPDATE users SET is_active = ? WHERE id = ? AND deleted_at IS NULL', [is_active ? 1 : 0, id]);
}

// ── Empresas ──────────────────────────────────────────────────

async function getCompanies({ search, is_verified, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conds  = ['u.deleted_at IS NULL'];
  const params = [];

  if (search) {
    conds.push('(co.trade_name LIKE ? OR co.legal_name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (is_verified !== undefined && is_verified !== '') { conds.push('co.is_verified = ?'); params.push(Number(is_verified)); }

  const where = conds.join(' AND ');

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM companies co JOIN users u ON u.id = co.user_id WHERE ${where}`, params
  );
  const [rows] = await db.execute(
    `SELECT co.id, co.trade_name, co.legal_name, co.cnpj, co.sector, co.size,
            co.is_verified, co.created_at, u.email, u.is_active,
            (SELECT COUNT(*) FROM jobs j WHERE j.company_id = co.id AND j.deleted_at IS NULL) AS total_jobs
     FROM companies co
     JOIN users u ON u.id = co.user_id
     WHERE ${where}
     ORDER BY co.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { companies: rows, total: parseInt(total, 10), page, limit };
}

async function getCompanyById(id) {
  const [rows] = await db.execute(
    'SELECT co.id, co.is_verified FROM companies co WHERE co.id = ? LIMIT 1', [id]
  );
  return rows[0] || null;
}

async function toggleCompanyVerified(id, is_verified) {
  await db.execute('UPDATE companies SET is_verified = ? WHERE id = ?', [is_verified ? 1 : 0, id]);
}

// ── Vagas ─────────────────────────────────────────────────────

async function getJobs({ status, search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conds  = ['j.deleted_at IS NULL'];
  const params = [];

  if (status) { conds.push('j.status = ?');    params.push(status); }
  if (search) { conds.push('j.title LIKE ?');  params.push(`%${search}%`); }

  const where = conds.join(' AND ');

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM jobs j WHERE ${where}`, params
  );
  const [rows] = await db.execute(
    `SELECT j.id, j.title, j.status, j.seniority_level, j.modality, j.city, j.created_at, j.admin_notes,
            c.trade_name AS company_name, c.is_verified AS company_verified,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     WHERE ${where}
     ORDER BY FIELD(j.status,'pending_review','active','closed','rejected','draft'), j.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { jobs: rows, total: parseInt(total, 10), page, limit };
}

async function moderateJob(id, status, adminNotes) {
  await db.execute(
    'UPDATE jobs SET status = ?, admin_notes = ? WHERE id = ?',
    [status, adminNotes || null, id]
  );
}

async function deleteJob(id) {
  await db.execute(
    "UPDATE jobs SET deleted_at = NOW(), status = 'closed' WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
}

// ── Certificados ──────────────────────────────────────────────

async function getCertificates({ status, search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conds  = [];
  const params = [];

  if (status) { conds.push('cert.status = ?');          params.push(status); }
  if (search) { conds.push('cert.course_name LIKE ?');  params.push(`%${search}%`); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM certificates cert ${where}`, params
  );
  const [rows] = await db.execute(
    `SELECT cert.id, cert.course_name, cert.institution_name, cert.status,
            cert.ai_confidence, cert.admin_override, cert.admin_notes,
            cert.file_url, cert.file_type, cert.created_at, cert.processed_at,
            cand.full_name AS candidate_name
     FROM certificates cert
     JOIN candidates cand ON cand.id = cert.candidate_id
     ${where}
     ORDER BY FIELD(cert.status,'manual_review','pending','processing','validated','rejected'), cert.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { certificates: rows, total: parseInt(total, 10), page, limit };
}

async function getCertificateById(id) {
  const [rows] = await db.execute(
    `SELECT cert.*, cand.full_name AS candidate_name, cand.id AS candidate_id
     FROM certificates cert
     JOIN candidates cand ON cand.id = cert.candidate_id
     WHERE cert.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function moderateCertificate(id, status, adminNotes) {
  await db.execute(
    'UPDATE certificates SET status = ?, admin_notes = ?, admin_override = 1, processed_at = NOW() WHERE id = ?',
    [status, adminNotes || null, id]
  );
}

// ── Logs de IA ────────────────────────────────────────────────

async function getAiLogs({ page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM ai_logs');
  const [rows] = await db.execute(
    `SELECT al.id, al.certificate_id, al.tokens_used, al.duration_ms, al.error_message, al.created_at,
            cert.course_name, cert.institution_name, cert.status AS cert_status, cert.ai_confidence,
            cand.full_name AS candidate_name
     FROM ai_logs al
     JOIN certificates cert ON cert.id = al.certificate_id
     JOIN candidates   cand ON cand.id = cert.candidate_id
     ORDER BY al.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    []
  );

  return { logs: rows, total: parseInt(total, 10), page, limit };
}

async function getAiLogById(id) {
  const [rows] = await db.execute(
    `SELECT al.*, cert.course_name, cert.institution_name, cert.status AS cert_status,
            cert.ai_confidence, cand.full_name AS candidate_name
     FROM ai_logs al
     JOIN certificates cert ON cert.id = al.certificate_id
     JOIN candidates   cand ON cand.id = cert.candidate_id
     WHERE al.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// ── Auditoria ─────────────────────────────────────────────────

async function getAdminIdByUserId(userId) {
  const [[row]] = await db.execute('SELECT id FROM admins WHERE user_id = ? LIMIT 1', [userId]);
  return row?.id || null;
}

async function insertAuditLog(adminId, userId, action, entityType, entityId, details, ip) {
  await db.execute(
    `INSERT INTO audit_logs (admin_id, user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [adminId || null, userId || null, action, entityType, entityId || null,
     details ? JSON.stringify(details) : null, ip || null]
  );
}

module.exports = {
  getDashboardStats,
  getUsers, getUserById, toggleUserActive, deleteUser,
  getCompanies, getCompanyById, toggleCompanyVerified,
  getJobs, moderateJob, deleteJob,
  getCertificates, getCertificateById, moderateCertificate,
  getAiLogs, getAiLogById,
  getAdminIdByUserId, insertAuditLog,
};
