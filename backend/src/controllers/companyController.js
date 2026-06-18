const db           = require('../config/db');
const companyModel = require('../models/companyModel');
const jobModel     = require('../models/jobModel');

async function getCompanyId(userId) {
  const id = await companyModel.getCompanyIdByUserId(userId);
  if (!id) throw Object.assign(new Error('Empresa não encontrada.'), { status: 404 });
  return id;
}

async function getProfile(req, res) {
  try {
    const profile = await companyModel.getByUserId(req.user.userId);
    if (!profile) return res.status(404).json({ success: false, error: 'Empresa não encontrada.' });

    const companyId = profile.id;
    const [[{ active_jobs }]] = await db.execute(
      `SELECT COUNT(*) AS active_jobs FROM jobs WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL`,
      [companyId]
    );
    const [[{ total_applications }]] = await db.execute(
      `SELECT COUNT(*) AS total_applications FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id = ?`,
      [companyId]
    );

    // CNPJ nunca é retornado pela API
    const { cnpj, ...safe } = profile;
    res.json({
      success: true,
      data: {
        ...safe,
        active_jobs:        parseInt(active_jobs,        10),
        total_applications: parseInt(total_applications, 10),
      },
    });
  } catch (err) {
    console.error('[COMPANY PROFILE]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function updateProfile(req, res) {
  try {
    await companyModel.updateByUserId(req.user.userId, req.body);
    const profile = await companyModel.getByUserId(req.user.userId);
    const { cnpj, ...safe } = profile;
    res.json({ success: true, data: safe });
  } catch (err) {
    console.error('[COMPANY UPDATE]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function uploadLogo(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await companyModel.updateLogo(req.user.userId, logoUrl);
    res.json({ success: true, data: { logo_url: logoUrl } });
  } catch (err) {
    console.error('[COMPANY LOGO]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function listJobs(req, res) {
  try {
    const companyId = await getCompanyId(req.user.userId);
    const { status, page, limit } = req.query;
    const result = await jobModel.findByCompany(companyId, {
      status:  status || undefined,
      page:    Math.max(1, parseInt(page,  10) || 1),
      limit:   Math.min(50, Math.max(1, parseInt(limit, 10) || 20)),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[COMPANY LIST JOBS]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function createJob(req, res) {
  try {
    const companyId = await getCompanyId(req.user.userId);
    const { title, area, seniority_level, modality, workload, contract_type, description } = req.body;

    if (!title || !area || !seniority_level || !modality || !workload || !contract_type || !description) {
      return res.status(400).json({ success: false, error: 'Preencha todos os campos obrigatórios.' });
    }

    const id = await jobModel.createJob(companyId, req.body);
    if (req.body.skills?.length) await jobModel.replaceJobSkills(id, req.body.skills);
    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[COMPANY CREATE JOB]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getJobDetail(req, res) {
  try {
    const companyId = await getCompanyId(req.user.userId);
    const jobId     = parseInt(req.params.id, 10);

    const job = await jobModel.findByIdForCompany(jobId, companyId);
    if (!job) return res.status(404).json({ success: false, error: 'Vaga não encontrada.' });

    const skills = await jobModel.getJobSkills(jobId);
    res.json({ success: true, data: { ...job, skills } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[COMPANY JOB DETAIL]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function updateJob(req, res) {
  try {
    const companyId = await getCompanyId(req.user.userId);
    const jobId     = parseInt(req.params.id, 10);

    const job = await jobModel.findByIdForCompany(jobId, companyId);
    if (!job) return res.status(404).json({ success: false, error: 'Vaga não encontrada.' });

    await jobModel.updateJob(jobId, companyId, req.body);
    if (req.body.skills !== undefined) await jobModel.replaceJobSkills(jobId, req.body.skills);
    res.json({ success: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[COMPANY UPDATE JOB]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function deleteJob(req, res) {
  try {
    const companyId = await getCompanyId(req.user.userId);
    const jobId     = parseInt(req.params.id, 10);

    const job = await jobModel.findByIdForCompany(jobId, companyId);
    if (!job) return res.status(404).json({ success: false, error: 'Vaga não encontrada.' });

    await jobModel.softDeleteJob(jobId, companyId);
    res.json({ success: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[COMPANY DELETE JOB]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getApplicants(req, res) {
  try {
    const companyId = await getCompanyId(req.user.userId);
    const jobId     = parseInt(req.params.id, 10);

    const job = await jobModel.findByIdForCompany(jobId, companyId);
    if (!job) return res.status(404).json({ success: false, error: 'Vaga não encontrada.' });

    const applicants = await jobModel.getApplicationsByJob(jobId, companyId);
    res.json({ success: true, data: { job: { id: job.id, title: job.title }, applicants } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[COMPANY APPLICANTS]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function updateApplicationStatus(req, res) {
  try {
    const companyId  = await getCompanyId(req.user.userId);
    const appId      = parseInt(req.params.id, 10);
    const { status, company_notes } = req.body;

    const valid = ['submitted', 'reviewing', 'approved', 'rejected'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status inválido.' });
    }

    await jobModel.updateApplicationStatus(appId, companyId, status, company_notes);
    res.json({ success: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[COMPANY UPDATE APP STATUS]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getSkills(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT s.id, s.name, sc.name AS category
       FROM skills s
       JOIN skill_categories sc ON sc.id = s.category_id
       WHERE s.is_active = 1
       ORDER BY sc.name ASC, s.name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[COMPANY SKILLS]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getCandidateProfile(req, res) {
  try {
    const companyId   = await getCompanyId(req.user.userId);
    const candidateId = parseInt(req.params.candidateId, 10);

    // Só permite ver perfis de candidatos que aplicaram a vagas desta empresa
    const [rows] = await db.execute(
      `SELECT a.id FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = ? AND j.company_id = ? LIMIT 1`,
      [candidateId, companyId]
    );
    if (!rows.length) return res.status(403).json({ success: false, error: 'Acesso negado.' });

    const profile = await companyModel.getCandidateProfile(candidateId);
    if (!profile) return res.status(404).json({ success: false, error: 'Candidato não encontrado.' });

    res.json({ success: true, data: profile });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[COMPANY CANDIDATE PROFILE]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

module.exports = {
  getProfile, updateProfile, uploadLogo,
  listJobs, createJob, getJobDetail, updateJob, deleteJob,
  getApplicants, updateApplicationStatus,
  getSkills, getCandidateProfile,
};
