const db             = require('../config/db');
const candidateModel = require('../models/candidateModel');
const jobModel       = require('../models/jobModel');

async function getCandidateId(userId) {
  const id = await candidateModel.getCandidateIdByUserId(userId);
  if (!id) throw Object.assign(new Error('Candidato não encontrado.'), { status: 404 });
  return id;
}

async function listJobs(req, res) {
  try {
    const { modality, seniority_level, city, page, limit } = req.query;
    const result = await jobModel.findAll({
      modality,
      seniority_level,
      city: city?.trim() || undefined,
      page:  Math.max(1, parseInt(page,  10) || 1),
      limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 12)),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[JOBS LIST]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getJob(req, res) {
  try {
    const job = await jobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Vaga não encontrada.' });

    const skills = await jobModel.getJobSkills(job.id);
    jobModel.incrementViews(job.id); // fire-and-forget

    res.json({ success: true, data: { ...job, skills } });
  } catch (err) {
    console.error('[JOB DETAIL]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function applyJob(req, res) {
  try {
    const candidateId = await getCandidateId(req.user.userId);
    const jobId       = parseInt(req.params.id, 10);

    const job = await jobModel.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Vaga não encontrada.' });

    const existing = await jobModel.findApplication(jobId, candidateId);
    if (existing) return res.status(409).json({ success: false, error: 'Você já se candidatou a esta vaga.' });

    // Calcular match_score com base nas skills obrigatórias
    const jobSkills      = await jobModel.getJobSkills(jobId);
    const requiredSkills = jobSkills.filter(s => s.is_required === 1);

    let matchScore = 100; // sem skills obrigatórias = match perfeito

    if (requiredSkills.length > 0) {
      const [candidateSkillRows] = await db.execute(
        'SELECT skill_id, score FROM candidate_skills WHERE candidate_id = ?',
        [candidateId]
      );
      const skillMap = new Map(candidateSkillRows.map(cs => [cs.skill_id, parseFloat(cs.score)]));

      let matched = 0;
      for (const jobSkill of requiredSkills) {
        const score      = skillMap.get(jobSkill.skill_id) ?? 0;
        const minRequired = jobSkill.min_score ?? 0;
        if (score >= minRequired) matched++;
      }
      matchScore = (matched / requiredSkills.length) * 100;
    }

    const appId = await jobModel.createApplication(jobId, candidateId, matchScore.toFixed(2));
    res.status(201).json({
      success: true,
      data: { id: appId, match_score: parseFloat(matchScore.toFixed(2)) },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[APPLY JOB]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getApplications(req, res) {
  try {
    const candidateId = await getCandidateId(req.user.userId);
    const applications = await jobModel.getApplicationsByCandidate(candidateId);
    res.json({ success: true, data: applications });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[GET APPLICATIONS]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getApplicationCount(req, res) {
  try {
    const candidateId = await getCandidateId(req.user.userId);
    const total = await jobModel.countApplicationsByCandidate(candidateId);
    res.json({ success: true, data: { total } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

module.exports = { listJobs, getJob, applyJob, getApplications, getApplicationCount };
