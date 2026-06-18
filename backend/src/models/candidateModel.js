const db = require('../config/db');

// ── Perfil ────────────────────────────────────────────────────

async function getByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT c.*, u.email
     FROM candidates c
     JOIN users u ON u.id = c.user_id
     WHERE c.user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function updateByUserId(userId, fields) {
  const allowed = [
    'full_name', 'cpf', 'gender', 'phone',
    'zip_code', 'street', 'city', 'state', 'country', 'willing_to_relocate',
    'work_modality', 'experience_level', 'salary_min', 'salary_max',
    'availability', 'profile_completed',
  ];
  const sets   = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(fields[key] === '' ? null : fields[key]);
    }
  }
  if (sets.length === 0) return;
  values.push(userId);
  await db.execute(
    `UPDATE candidates SET ${sets.join(', ')} WHERE user_id = ?`,
    values
  );
}

async function updateAvatar(userId, avatarUrl) {
  await db.execute(
    'UPDATE candidates SET avatar_url = ? WHERE user_id = ?',
    [avatarUrl, userId]
  );
}

async function getCandidateIdByUserId(userId) {
  const [rows] = await db.execute(
    'SELECT id FROM candidates WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.id || null;
}

// ── Formação ──────────────────────────────────────────────────

async function getEducationsByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT e.* FROM educations e
     JOIN candidates c ON c.id = e.candidate_id
     WHERE c.user_id = ?
     ORDER BY COALESCE(e.end_year, 9999) DESC, e.start_year DESC`,
    [userId]
  );
  return rows;
}

async function addEducation(candidateId, data) {
  const { institution, course, degree, status, start_year, end_year } = data;
  const [result] = await db.execute(
    `INSERT INTO educations (candidate_id, institution, course, degree, status, start_year, end_year)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [candidateId, institution, course, degree, status,
     start_year || null, end_year || null]
  );
  return result.insertId;
}

async function updateEducation(id, candidateId, data) {
  const { institution, course, degree, status, start_year, end_year } = data;
  await db.execute(
    `UPDATE educations
     SET institution=?, course=?, degree=?, status=?, start_year=?, end_year=?
     WHERE id=? AND candidate_id=?`,
    [institution, course, degree, status,
     start_year || null, end_year || null,
     id, candidateId]
  );
}

async function deleteEducation(id, candidateId) {
  await db.execute(
    'DELETE FROM educations WHERE id = ? AND candidate_id = ?',
    [id, candidateId]
  );
}

// ── Experiência ───────────────────────────────────────────────

async function getExperiencesByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT e.* FROM experiences e
     JOIN candidates c ON c.id = e.candidate_id
     WHERE c.user_id = ?
     ORDER BY COALESCE(e.ended_at, '9999-12-31') DESC, e.started_at DESC`,
    [userId]
  );
  return rows;
}

async function addExperience(candidateId, data) {
  const { company_name, job_title, started_at, ended_at, description } = data;
  const [result] = await db.execute(
    `INSERT INTO experiences (candidate_id, company_name, job_title, started_at, ended_at, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [candidateId, company_name, job_title, started_at,
     ended_at || null, description || null]
  );
  return result.insertId;
}

async function updateExperience(id, candidateId, data) {
  const { company_name, job_title, started_at, ended_at, description } = data;
  await db.execute(
    `UPDATE experiences
     SET company_name=?, job_title=?, started_at=?, ended_at=?, description=?
     WHERE id=? AND candidate_id=?`,
    [company_name, job_title, started_at,
     ended_at || null, description || null,
     id, candidateId]
  );
}

async function deleteExperience(id, candidateId) {
  await db.execute(
    'DELETE FROM experiences WHERE id = ? AND candidate_id = ?',
    [id, candidateId]
  );
}

module.exports = {
  getByUserId, updateByUserId, updateAvatar, getCandidateIdByUserId,
  getEducationsByUserId, addEducation, updateEducation, deleteEducation,
  getExperiencesByUserId, addExperience, updateExperience, deleteExperience,
};
