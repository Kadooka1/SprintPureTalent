const db = require('../config/db');

async function getByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT c.*, u.email
     FROM companies c
     JOIN users u ON u.id = c.user_id
     WHERE c.user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getCompanyIdByUserId(userId) {
  const [rows] = await db.execute(
    'SELECT id FROM companies WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.id || null;
}

async function updateByUserId(userId, fields) {
  const allowed = ['trade_name', 'legal_name', 'phone', 'website', 'size', 'sector', 'description'];
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
    `UPDATE companies SET ${sets.join(', ')} WHERE user_id = ?`,
    values
  );
}

async function updateLogo(userId, logoUrl) {
  await db.execute(
    'UPDATE companies SET logo_url = ? WHERE user_id = ?',
    [logoUrl, userId]
  );
}

async function getCandidateProfile(candidateId) {
  const [rows] = await db.execute(
    `SELECT c.id, c.full_name, c.avatar_url,
            c.city, c.state,
            c.work_modality, c.experience_level,
            c.salary_min, c.salary_max,
            c.availability, c.willing_to_relocate,
            u.email
     FROM candidates c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ? LIMIT 1`,
    [candidateId]
  );
  if (!rows[0]) return null;

  const profile = rows[0];

  const [educations] = await db.execute(
    `SELECT institution, course, degree, status, start_year, end_year
     FROM educations WHERE candidate_id = ?
     ORDER BY COALESCE(end_year, 9999) DESC, start_year DESC`,
    [candidateId]
  );

  const [experiences] = await db.execute(
    `SELECT company_name, job_title, started_at, ended_at, description
     FROM experiences WHERE candidate_id = ?
     ORDER BY COALESCE(ended_at, '9999-12-31') DESC, started_at DESC`,
    [candidateId]
  );

  const [skills] = await db.execute(
    `SELECT cs.score, cs.level, s.name AS skill_name, sc.name AS category_name
     FROM candidate_skills cs
     JOIN skills s  ON s.id  = cs.skill_id
     JOIN skill_categories sc ON sc.id = s.category_id
     WHERE cs.candidate_id = ?
     ORDER BY sc.name ASC, cs.score DESC`,
    [candidateId]
  );

  return { ...profile, educations, experiences, skills };
}

module.exports = { getByUserId, getCompanyIdByUserId, updateByUserId, updateLogo, getCandidateProfile };
