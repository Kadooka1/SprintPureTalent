const db = require('../config/db');

async function findAll({ modality, seniority_level, city, page = 1, limit = 12 }) {
  const offset = (page - 1) * limit;
  const conditions = ["j.status = 'active'", 'j.deleted_at IS NULL'];
  const params = [];

  if (modality)       { conditions.push('j.modality = ?');        params.push(modality); }
  if (seniority_level){ conditions.push('j.seniority_level = ?'); params.push(seniority_level); }
  if (city)           { conditions.push('j.city LIKE ?');         params.push(`%${city}%`); }

  const where = conditions.join(' AND ');

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM jobs j WHERE ${where}`,
    params
  );

  const [rows] = await db.execute(
    `SELECT j.id, j.title, j.area, j.seniority_level, j.modality,
            j.city, j.state, j.contract_type,
            j.salary_min, j.salary_max, j.salary_disclosed,
            j.workload, j.expires_at, j.created_at,
            c.trade_name AS company_name, c.logo_url AS company_logo
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     WHERE ${where}
     ORDER BY j.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { jobs: rows, total: parseInt(total, 10), page, limit };
}

async function findById(id) {
  const [rows] = await db.execute(
    `SELECT j.*,
            c.trade_name AS company_name, c.logo_url AS company_logo,
            c.sector AS company_sector, c.size AS company_size,
            c.description AS company_description, c.website AS company_website
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     WHERE j.id = ? AND j.status = 'active' AND j.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getJobSkills(jobId) {
  const [rows] = await db.execute(
    `SELECT js.skill_id, js.is_required, js.min_score,
            s.name AS skill_name, sc.name AS category_name
     FROM job_skills js
     JOIN skills s  ON s.id  = js.skill_id
     JOIN skill_categories sc ON sc.id = s.category_id
     WHERE js.job_id = ?
     ORDER BY js.is_required DESC, s.name ASC`,
    [jobId]
  );
  return rows;
}

async function incrementViews(jobId) {
  await db.execute(
    'UPDATE jobs SET views_count = views_count + 1 WHERE id = ?',
    [jobId]
  );
}

async function findApplication(jobId, candidateId) {
  const [rows] = await db.execute(
    'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ? LIMIT 1',
    [jobId, candidateId]
  );
  return rows[0] || null;
}

async function createApplication(jobId, candidateId, matchScore) {
  const [result] = await db.execute(
    'INSERT INTO applications (job_id, candidate_id, match_score) VALUES (?, ?, ?)',
    [jobId, candidateId, matchScore]
  );
  return result.insertId;
}

async function getApplicationsByCandidate(candidateId) {
  const [rows] = await db.execute(
    `SELECT a.id, a.job_id, a.match_score, a.status, a.applied_at,
            j.title AS job_title, j.modality, j.city, j.state, j.seniority_level,
            c.trade_name AS company_name, c.logo_url AS company_logo
     FROM applications a
     JOIN jobs      j ON j.id = a.job_id
     JOIN companies c ON c.id = j.company_id
     WHERE a.candidate_id = ?
     ORDER BY a.applied_at DESC`,
    [candidateId]
  );
  return rows;
}

async function countApplicationsByCandidate(candidateId) {
  const [[{ total }]] = await db.execute(
    'SELECT COUNT(*) AS total FROM applications WHERE candidate_id = ?',
    [candidateId]
  );
  return parseInt(total, 10);
}

// ── Company-side functions ────────────────────────────────────

async function createJob(companyId, data) {
  const {
    title, area, seniority_level, modality, city, state,
    workload, contract_type, salary_min, salary_max, salary_disclosed,
    description, benefits, expires_at, status,
  } = data;

  const [result] = await db.execute(
    `INSERT INTO jobs
       (company_id, title, area, seniority_level, modality, city, state,
        workload, contract_type, salary_min, salary_max, salary_disclosed,
        description, benefits, expires_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId, title, area, seniority_level, modality,
      city || null, state || null,
      workload, contract_type,
      salary_min || null, salary_max || null,
      salary_disclosed ? 1 : 0,
      description, benefits || null,
      expires_at || null, status || 'active',
    ]
  );
  return result.insertId;
}

async function updateJob(id, companyId, data) {
  const allowed = [
    'title', 'area', 'seniority_level', 'modality', 'city', 'state',
    'workload', 'contract_type', 'salary_min', 'salary_max', 'salary_disclosed',
    'description', 'benefits', 'expires_at', 'status',
  ];
  const sets   = [];
  const values = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(data[key] === '' ? null : data[key]);
    }
  }
  if (sets.length === 0) return;
  values.push(id, companyId);
  await db.execute(
    `UPDATE jobs SET ${sets.join(', ')} WHERE id = ? AND company_id = ? AND deleted_at IS NULL`,
    values
  );
}

async function softDeleteJob(id, companyId) {
  await db.execute(
    `UPDATE jobs SET status = 'closed', deleted_at = NOW() WHERE id = ? AND company_id = ?`,
    [id, companyId]
  );
}

async function findByCompany(companyId, { status, page = 1, limit = 20 }) {
  const offset     = (page - 1) * limit;
  const conditions = ['j.company_id = ?', 'j.deleted_at IS NULL'];
  const params     = [companyId];

  if (status) { conditions.push('j.status = ?'); params.push(status); }

  const where = conditions.join(' AND ');

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM jobs j WHERE ${where}`,
    params
  );

  const [rows] = await db.execute(
    `SELECT j.id, j.title, j.area, j.seniority_level, j.modality,
            j.city, j.state, j.contract_type, j.status,
            j.salary_min, j.salary_max, j.salary_disclosed,
            j.views_count, j.expires_at, j.created_at,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
     FROM jobs j
     WHERE ${where}
     ORDER BY j.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { jobs: rows, total: parseInt(total, 10), page, limit };
}

async function findByIdForCompany(id, companyId) {
  const [rows] = await db.execute(
    `SELECT * FROM jobs WHERE id = ? AND company_id = ? AND deleted_at IS NULL LIMIT 1`,
    [id, companyId]
  );
  return rows[0] || null;
}

async function getApplicationsByJob(jobId, companyId) {
  const [rows] = await db.execute(
    `SELECT a.id, a.candidate_id, a.match_score, a.status, a.company_notes, a.applied_at,
            c.full_name AS candidate_name, c.avatar_url AS candidate_avatar,
            c.city AS candidate_city, c.state AS candidate_state,
            c.experience_level AS candidate_level,
            u.email AS candidate_email
     FROM applications a
     JOIN candidates c ON c.id = a.candidate_id
     JOIN users u ON u.id = c.user_id
     JOIN jobs j ON j.id = a.job_id
     WHERE a.job_id = ? AND j.company_id = ?
     ORDER BY a.match_score DESC, a.applied_at ASC`,
    [jobId, companyId]
  );
  return rows;
}

async function replaceJobSkills(jobId, skills) {
  await db.execute('DELETE FROM job_skills WHERE job_id = ?', [jobId]);
  for (const s of skills) {
    await db.execute(
      'INSERT INTO job_skills (job_id, skill_id, is_required, min_score) VALUES (?, ?, ?, ?)',
      [jobId, s.skill_id, s.is_required ? 1 : 0, s.min_score || null]
    );
  }
}

async function updateApplicationStatus(appId, companyId, status, notes) {
  await db.execute(
    `UPDATE applications a
     JOIN jobs j ON j.id = a.job_id
     SET a.status = ?, a.company_notes = ?
     WHERE a.id = ? AND j.company_id = ?`,
    [status, notes ?? null, appId, companyId]
  );
}

module.exports = {
  findAll,
  findById,
  getJobSkills,
  incrementViews,
  findApplication,
  createApplication,
  getApplicationsByCandidate,
  countApplicationsByCandidate,
  // company-side
  replaceJobSkills,
  createJob,
  updateJob,
  softDeleteJob,
  findByCompany,
  findByIdForCompany,
  getApplicationsByJob,
  updateApplicationStatus,
};
