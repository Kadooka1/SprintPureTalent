const path           = require('path');
const fs             = require('fs');
const candidateModel = require('../models/candidateModel');
const { deleteUser } = require('../models/userModel');

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, error, status = 400) {
  return res.status(status).json({ success: false, error });
}

// ── GET /api/candidate/profile ────────────────────────────────

async function getProfile(req, res, next) {
  try {
    const profile = await candidateModel.getByUserId(req.user.userId);
    if (!profile) return fail(res, 'Perfil não encontrado.', 404);

    const [educations, experiences] = await Promise.all([
      candidateModel.getEducationsByUserId(req.user.userId),
      candidateModel.getExperiencesByUserId(req.user.userId),
    ]);

    // CPF nunca é retornado pela API
    const { cpf, ...safe } = profile;
    return ok(res, { ...safe, educations, experiences });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/candidate/profile ────────────────────────────────

async function updateProfile(req, res, next) {
  try {
    const allowed = [
      'full_name', 'cpf', 'gender', 'phone',
      'zip_code', 'street', 'city', 'state', 'country', 'willing_to_relocate',
      'work_modality', 'experience_level', 'salary_min', 'salary_max',
      'availability', 'profile_completed',
    ];
    const fields = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }

    if (fields.cpf) {
      const digits = String(fields.cpf).replace(/[^\d]/g, '');
      if (digits.length !== 11) return fail(res, 'CPF inválido.');
      fields.cpf = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
    }

    await candidateModel.updateByUserId(req.user.userId, fields);
    const updated = await candidateModel.getByUserId(req.user.userId);
    const { cpf, ...safe } = updated;
    return ok(res, safe);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/candidate/avatar ────────────────────────────────

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return fail(res, 'Nenhuma imagem enviada.');

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const profile = await candidateModel.getByUserId(req.user.userId);
    if (profile?.avatar_url) {
      const oldPath = path.join(__dirname, '..', '..', profile.avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await candidateModel.updateAvatar(req.user.userId, avatarUrl);
    return ok(res, { avatar_url: avatarUrl });
  } catch (err) {
    next(err);
  }
}

// ── Formação ──────────────────────────────────────────────────

async function addEducation(req, res, next) {
  try {
    const { institution, course, degree, status, start_year, end_year } = req.body;
    if (!institution || !course || !degree || !status)
      return fail(res, 'Preencha os campos obrigatórios da formação.');

    const validDegrees = ['technical', 'undergraduate', 'postgraduate', 'mba', 'masters', 'phd'];
    const validStatus  = ['studying', 'completed', 'interrupted'];
    if (!validDegrees.includes(degree)) return fail(res, 'Grau inválido.');
    if (!validStatus.includes(status))  return fail(res, 'Status inválido.');

    const candidateId = await candidateModel.getCandidateIdByUserId(req.user.userId);
    if (!candidateId) return fail(res, 'Candidato não encontrado.', 404);

    const id = await candidateModel.addEducation(candidateId, { institution, course, degree, status, start_year, end_year });
    return ok(res, { id, candidate_id: candidateId, institution, course, degree, status, start_year: start_year || null, end_year: end_year || null }, 201);
  } catch (err) {
    next(err);
  }
}

async function updateEducation(req, res, next) {
  try {
    const { institution, course, degree, status, start_year, end_year } = req.body;
    if (!institution || !course || !degree || !status)
      return fail(res, 'Preencha os campos obrigatórios da formação.');

    const candidateId = await candidateModel.getCandidateIdByUserId(req.user.userId);
    if (!candidateId) return fail(res, 'Candidato não encontrado.', 404);

    await candidateModel.updateEducation(req.params.id, candidateId, { institution, course, degree, status, start_year, end_year });
    return ok(res, { message: 'Formação atualizada.' });
  } catch (err) {
    next(err);
  }
}

async function deleteEducation(req, res, next) {
  try {
    const candidateId = await candidateModel.getCandidateIdByUserId(req.user.userId);
    if (!candidateId) return fail(res, 'Candidato não encontrado.', 404);
    await candidateModel.deleteEducation(req.params.id, candidateId);
    return ok(res, { message: 'Formação removida.' });
  } catch (err) {
    next(err);
  }
}

// ── Experiência ───────────────────────────────────────────────

async function addExperience(req, res, next) {
  try {
    const { company_name, job_title, started_at, ended_at, description } = req.body;
    if (!company_name || !job_title || !started_at)
      return fail(res, 'Preencha os campos obrigatórios da experiência.');

    const candidateId = await candidateModel.getCandidateIdByUserId(req.user.userId);
    if (!candidateId) return fail(res, 'Candidato não encontrado.', 404);

    const id = await candidateModel.addExperience(candidateId, { company_name, job_title, started_at, ended_at, description });
    return ok(res, { id, candidate_id: candidateId, company_name, job_title, started_at, ended_at: ended_at || null, description: description || null }, 201);
  } catch (err) {
    next(err);
  }
}

async function updateExperience(req, res, next) {
  try {
    const { company_name, job_title, started_at, ended_at, description } = req.body;
    if (!company_name || !job_title || !started_at)
      return fail(res, 'Preencha os campos obrigatórios da experiência.');

    const candidateId = await candidateModel.getCandidateIdByUserId(req.user.userId);
    if (!candidateId) return fail(res, 'Candidato não encontrado.', 404);

    await candidateModel.updateExperience(req.params.id, candidateId, { company_name, job_title, started_at, ended_at, description });
    return ok(res, { message: 'Experiência atualizada.' });
  } catch (err) {
    next(err);
  }
}

async function deleteExperience(req, res, next) {
  try {
    const candidateId = await candidateModel.getCandidateIdByUserId(req.user.userId);
    if (!candidateId) return fail(res, 'Candidato não encontrado.', 404);
    await candidateModel.deleteExperience(req.params.id, candidateId);
    return ok(res, { message: 'Experiência removida.' });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/candidate/account ────────────────────────────

async function deleteAccount(req, res, next) {
  try {
    const profile = await candidateModel.getByUserId(req.user.userId);

    // Remove avatar do disco
    if (profile?.avatar_url) {
      const avatarPath = path.join(__dirname, '..', '..', profile.avatar_url);
      if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
    }

    // Remove certificados do disco
    const candidateId = await candidateModel.getCandidateIdByUserId(req.user.userId);
    if (candidateId) {
      const [certs] = await require('../config/db').execute(
        'SELECT file_path FROM certificates WHERE candidate_id = ?',
        [candidateId]
      );
      for (const cert of certs) {
        if (cert.file_path) {
          const certPath = path.join(__dirname, '..', '..', cert.file_path);
          if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
        }
      }
    }

    // Hard delete — ON DELETE CASCADE remove candidates, educations, experiences, certificates, applications
    await deleteUser(req.user.userId);
    return ok(res, { message: 'Conta excluída com sucesso.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile, updateProfile, uploadAvatar, deleteAccount,
  addEducation, updateEducation, deleteEducation,
  addExperience, updateExperience, deleteExperience,
};
