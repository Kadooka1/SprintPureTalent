const db = require('../config/db');
const { calculateSkillScore } = require('../utils/scoreCalculator');

// ── Certificados ──────────────────────────────────────────────

async function insert(candidateId, { fileUrl, fileType, courseName, institutionName }) {
  const [result] = await db.execute(
    `INSERT INTO certificates (candidate_id, file_url, file_type, course_name, institution_name, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [candidateId, fileUrl, fileType, courseName, institutionName]
  );
  return result.insertId;
}

async function findByCandidateId(candidateId) {
  const [certs] = await db.execute(
    `SELECT id, course_name, institution_name, conclusion_date, workload_hours,
            file_url, file_type, status, ai_confidence, admin_notes, created_at
     FROM certificates
     WHERE candidate_id = ?
     ORDER BY created_at DESC`,
    [candidateId]
  );
  if (certs.length === 0) return [];

  const certIds = certs.map(c => c.id);
  const placeholders = certIds.map(() => '?').join(',');
  const [skills] = await db.execute(
    `SELECT cs.certificate_id, cs.skill_id, s.name AS skill_name, cs.relevance_score
     FROM certificate_skills cs
     JOIN skills s ON s.id = cs.skill_id
     WHERE cs.certificate_id IN (${placeholders})`,
    certIds
  );

  const skillsMap = {};
  for (const s of skills) {
    if (!skillsMap[s.certificate_id]) skillsMap[s.certificate_id] = [];
    skillsMap[s.certificate_id].push({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      relevance_score: s.relevance_score,
    });
  }
  return certs.map(cert => ({ ...cert, skills: skillsMap[cert.id] || [] }));
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT * FROM certificates WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function updateStatus(id, status) {
  await db.execute(
    'UPDATE certificates SET status = ? WHERE id = ?',
    [status, id]
  );
}

async function updateProcessed(id, { status, courseName, institutionName, conclusionDate, workloadHours, institutionId, aiConfidence, aiInstitutionWeight }) {
  await db.execute(
    `UPDATE certificates
     SET status = ?, course_name = ?, institution_name = ?, conclusion_date = ?,
         workload_hours = ?, institution_id = ?, ai_confidence = ?,
         ai_institution_weight = ?, processed_at = NOW()
     WHERE id = ?`,
    [status, courseName, institutionName, conclusionDate || null,
     workloadHours || null, institutionId || null, aiConfidence || null,
     institutionId ? null : (aiInstitutionWeight ?? null), id]
  );
}

async function deleteById(id, candidateId) {
  const [rows] = await db.execute(
    'SELECT file_url FROM certificates WHERE id = ? AND candidate_id = ? LIMIT 1',
    [id, candidateId]
  );
  if (rows.length === 0) return null;
  await db.execute(
    'DELETE FROM certificates WHERE id = ? AND candidate_id = ?',
    [id, candidateId]
  );
  return rows[0].file_url;
}

// ── Skills do certificado ─────────────────────────────────────

async function insertCertificateSkill(certId, skillId, relevanceScore) {
  await db.execute(
    `INSERT INTO certificate_skills (certificate_id, skill_id, relevance_score)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE relevance_score = ?`,
    [certId, skillId, relevanceScore, relevanceScore]
  );
}

async function recalculateCandidateSkill(candidateId, skillId) {
  const [rows] = await db.execute(
    `SELECT cs.relevance_score, c.workload_hours, c.ai_institution_weight,
            COALESCE(i.weight_min, 20) AS weight_min,
            COALESCE(i.weight_max, 49) AS weight_max,
            c.institution_id
     FROM certificate_skills cs
     JOIN certificates c ON c.id = cs.certificate_id
     LEFT JOIN institutions i ON i.id = c.institution_id
     WHERE c.candidate_id = ? AND cs.skill_id = ? AND c.status = 'validated'`,
    [candidateId, skillId]
  );
  if (rows.length === 0) return;

  const scores = rows.map(r => {
    // Se há instituição no banco usa o peso dela; senão usa o peso avaliado pela IA
    const weightMid = r.institution_id
      ? (r.weight_min + r.weight_max) / 2
      : (r.ai_institution_weight ?? 34);
    return calculateSkillScore(r.relevance_score, weightMid, r.workload_hours);
  });
  const best = Math.max(...scores);

  await db.execute(
    `INSERT INTO candidate_skills (candidate_id, skill_id, score)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE score = ?`,
    [candidateId, skillId, best, best]
  );
}

async function getCandidateSkillsWithCategory(candidateId) {
  const [rows] = await db.execute(
    `SELECT cs.skill_id, s.name AS skill_name,
            sc.id AS category_id, sc.name AS category_name, cs.score
     FROM candidate_skills cs
     JOIN skills s ON s.id = cs.skill_id
     JOIN skill_categories sc ON sc.id = s.category_id
     WHERE cs.candidate_id = ?
     ORDER BY sc.name, cs.score DESC`,
    [candidateId]
  );
  return rows;
}

// ── Lookups ───────────────────────────────────────────────────

async function findInstitutionByName(name) {
  if (!name) return null;
  const [exact] = await db.execute(
    'SELECT id, name, weight_min, weight_max FROM institutions WHERE LOWER(name) = LOWER(?) AND is_active = 1 LIMIT 1',
    [name]
  );
  if (exact.length > 0) return exact[0];

  const [fuzzy] = await db.execute(
    'SELECT id, name, weight_min, weight_max FROM institutions WHERE LOWER(name) LIKE LOWER(?) AND is_active = 1 LIMIT 1',
    [`%${name}%`]
  );
  return fuzzy[0] || null;
}

// Mapeamento PT-BR → nome canônico do catálogo
const SKILL_ALIASES = {
  'cibersegurança':            'Cybersecurity',
  'ciberseguranca':            'Cybersecurity',
  'segurança da informação':   'Cybersecurity',
  'segurança de redes':        'Cybersecurity',
  'defesa cibernética':        'Cybersecurity',
  'segurança cibernética':     'Cybersecurity',
  'análise forense':           'Cybersecurity',
  'análise de segurança':        'Cybersecurity',
  'analise de seguranca':        'Cybersecurity',
  'segurança ofensiva':          'Pentest',
  'análise de vulnerabilidades': 'Pentest',
  'teste de intrusão':         'Pentest',
  'ethical hacking':           'Pentest',
  'banco de dados':            'SQL',
  'desenvolvimento web':       'HTML/CSS',
  'programação':               'JavaScript',
  'inteligência artificial':   'Machine Learning',
  'aprendizado de máquina':    'Machine Learning',
  'ciência de dados':          'Data Analysis',
  'análise de dados':          'Data Analysis',
  'computação em nuvem':       'AWS',
  'cloud computing':           'AWS',
  'administração de sistemas': 'Linux',
  'administração linux':       'Linux',
  'proteção de dados':         'LGPD',
};

async function findSkillByName(name) {
  if (!name) return null;
  const n = name.trim();

  // 0. Alias PT-BR → canônico
  const aliasKey = n.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const nNorm    = n.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    const aliasNorm = alias.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (nNorm === aliasNorm || nNorm.includes(aliasNorm)) {
      const [aliased] = await db.execute(
        'SELECT id, name FROM skills WHERE LOWER(name) = LOWER(?) AND is_active = 1 LIMIT 1',
        [canonical]
      );
      if (aliased.length > 0) return aliased[0];
    }
  }

  // 1. Exact (case-insensitive)
  const [exact] = await db.execute(
    'SELECT id, name FROM skills WHERE LOWER(name) = LOWER(?) AND is_active = 1 LIMIT 1',
    [n]
  );
  if (exact.length > 0) return exact[0];

  // 2. DB name contains AI name  — "HTML/CSS" matches AI: "HTML"
  const [fwd] = await db.execute(
    'SELECT id, name FROM skills WHERE LOWER(name) LIKE LOWER(?) AND is_active = 1 LIMIT 1',
    [`%${n}%`]
  );
  if (fwd.length > 0) return fwd[0];

  // 3. AI name contains DB name  — "React.js" matches DB: "React"
  const [rev] = await db.execute(
    'SELECT id, name FROM skills WHERE LOWER(?) LIKE CONCAT(\'%\', LOWER(name), \'%\') AND is_active = 1 ORDER BY LENGTH(name) DESC LIMIT 1',
    [n.toLowerCase()]
  );
  return rev[0] || null;
}

// ── AI Log ────────────────────────────────────────────────────

async function getAiLog(certId) {
  const [rows] = await db.execute(
    'SELECT * FROM ai_logs WHERE certificate_id = ? ORDER BY created_at DESC LIMIT 1',
    [certId]
  );
  return rows[0] || null;
}

async function insertAiLog(certId, { promptSent, responseRaw, tokensUsed, durationMs, errorMessage }) {
  await db.execute(
    `INSERT INTO ai_logs (certificate_id, prompt_sent, response_raw, tokens_used, duration_ms, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [certId, promptSent || '', responseRaw || '', tokensUsed || null, durationMs || null, errorMessage || null]
  );
}

module.exports = {
  insert, findByCandidateId, findById,
  updateStatus, updateProcessed, deleteById,
  insertCertificateSkill, recalculateCandidateSkill, getCandidateSkillsWithCategory,
  findInstitutionByName, findSkillByName,
  getAiLog, insertAiLog,
};
