const adminModel       = require('../models/adminModel');
const certificateModel = require('../models/certificateModel');

// ── Dashboard ─────────────────────────────────────────────────

async function getDashboard(req, res) {
  try {
    const stats = await adminModel.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[ADMIN] getDashboard', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

// ── Usuários ──────────────────────────────────────────────────

async function listUsers(req, res) {
  try {
    const { role, is_active, search, page = 1, limit = 20 } = req.query;
    const result = await adminModel.getUsers({ role, is_active, search, page: +page, limit: +limit });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ADMIN] listUsers', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function deleteUser(req, res) {
  try {
    const user = await adminModel.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    if (user.id === req.user.userId) return res.status(400).json({ success: false, error: 'Não é possível excluir sua própria conta.' });

    await adminModel.deleteUser(req.params.id);

    const adminId = await adminModel.getAdminIdByUserId(req.user.userId);
    await adminModel.insertAuditLog(adminId, +req.params.id, 'user.delete', 'user', +req.params.id, { email: user.email }, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN] deleteUser', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function toggleUser(req, res) {
  try {
    const user = await adminModel.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    if (user.id === req.user.userId) return res.status(400).json({ success: false, error: 'Não é possível alterar sua própria conta.' });

    const newState = user.is_active ? 0 : 1;
    await adminModel.toggleUserActive(req.params.id, newState);

    const adminId = await adminModel.getAdminIdByUserId(req.user.userId);
    await adminModel.insertAuditLog(
      adminId, +req.params.id,
      newState ? 'user.activate' : 'user.suspend',
      'user', +req.params.id, { previous: user.is_active }, req.ip
    );

    res.json({ success: true, data: { is_active: newState } });
  } catch (err) {
    console.error('[ADMIN] toggleUser', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

// ── Empresas ──────────────────────────────────────────────────

async function listCompanies(req, res) {
  try {
    const { search, is_verified, page = 1, limit = 20 } = req.query;
    const result = await adminModel.getCompanies({ search, is_verified, page: +page, limit: +limit });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ADMIN] listCompanies', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function toggleCompanyVerified(req, res) {
  try {
    const company = await adminModel.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ success: false, error: 'Empresa não encontrada.' });

    const newState = company.is_verified ? 0 : 1;
    await adminModel.toggleCompanyVerified(req.params.id, newState);

    const adminId = await adminModel.getAdminIdByUserId(req.user.userId);
    await adminModel.insertAuditLog(
      adminId, null,
      newState ? 'company.verify' : 'company.unverify',
      'company', +req.params.id, {}, req.ip
    );

    res.json({ success: true, data: { is_verified: newState } });
  } catch (err) {
    console.error('[ADMIN] toggleCompanyVerified', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

// ── Vagas ─────────────────────────────────────────────────────

async function deleteJob(req, res) {
  try {
    await adminModel.deleteJob(req.params.id);

    const adminId = await adminModel.getAdminIdByUserId(req.user.userId);
    await adminModel.insertAuditLog(adminId, null, 'job.delete', 'job', +req.params.id, {}, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN] deleteJob', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function listJobs(req, res) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await adminModel.getJobs({ status, search, page: +page, limit: +limit });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ADMIN] listJobs', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function moderateJob(req, res) {
  try {
    const { status, admin_notes } = req.body;
    const allowed = ['active', 'rejected', 'closed', 'pending_review'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Status inválido.' });

    await adminModel.moderateJob(req.params.id, status, admin_notes);

    const adminId = await adminModel.getAdminIdByUserId(req.user.userId);
    await adminModel.insertAuditLog(adminId, null, `job.${status}`, 'job', +req.params.id, { admin_notes }, req.ip);

    res.json({ success: true, data: { status } });
  } catch (err) {
    console.error('[ADMIN] moderateJob', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

// ── Certificados ──────────────────────────────────────────────

async function listCerts(req, res) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await adminModel.getCertificates({ status, search, page: +page, limit: +limit });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ADMIN] listCerts', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function moderateCert(req, res) {
  try {
    const { status, admin_notes } = req.body;
    const allowed = ['validated', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Status inválido.' });
    if (status === 'rejected' && !admin_notes?.trim()) return res.status(400).json({ success: false, error: 'Motivo da rejeição é obrigatório.' });

    const cert = await adminModel.getCertificateById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: 'Certificado não encontrado.' });

    await adminModel.moderateCertificate(req.params.id, status, admin_notes);

    // Se validou, extrair skills via log da IA já salvo
    if (status === 'validated') {
      try {
        const log = await certificateModel.getAiLog(cert.id);
        if (log?.response_raw) {
          const aiData = JSON.parse(log.response_raw);
          for (const sk of (aiData.skills || [])) {
            if (!sk.name) continue;
            const skill = await certificateModel.findSkillByName(sk.name);
            if (skill) {
              await certificateModel.insertCertificateSkill(cert.id, skill.id, sk.relevance ?? 50);
              await certificateModel.recalculateCandidateSkill(cert.candidate_id, skill.id);
            }
          }
        }
      } catch (_) {}
    }

    const adminId = await adminModel.getAdminIdByUserId(req.user.userId);
    await adminModel.insertAuditLog(adminId, null, `certificate.${status}`, 'certificate', +req.params.id, { admin_notes }, req.ip);

    res.json({ success: true, data: { status } });
  } catch (err) {
    console.error('[ADMIN] moderateCert', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

// ── Logs de IA ────────────────────────────────────────────────

async function listAiLogs(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await adminModel.getAiLogs({ page: +page, limit: +limit });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ADMIN] listAiLogs', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getAiLog(req, res) {
  try {
    const log = await adminModel.getAiLogById(req.params.id);
    if (!log) return res.status(404).json({ success: false, error: 'Log não encontrado.' });
    res.json({ success: true, data: log });
  } catch (err) {
    console.error('[ADMIN] getAiLog', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

module.exports = {
  getDashboard,
  listUsers, toggleUser, deleteUser,
  listCompanies, toggleCompanyVerified,
  listJobs, moderateJob, deleteJob,
  listCerts, moderateCert,
  listAiLogs, getAiLog,
};
