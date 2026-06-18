const path             = require('path');
const fs               = require('fs');
const candidateModel   = require('../models/candidateModel');
const certificateModel = require('../models/certificateModel');
const aiService        = require('../services/aiService');

// ── Helper ────────────────────────────────────────────────────

async function getCandidateId(userId) {
  const id = await candidateModel.getCandidateIdByUserId(userId);
  if (!id) throw Object.assign(new Error('Candidato não encontrado.'), { status: 404 });
  return id;
}

// ── Pipeline assíncrono ───────────────────────────────────────

async function processCertificate(certId, filePath, fileType, candidateId) {
  let extractedText = '';
  try {
    await certificateModel.updateStatus(certId, 'processing');

    // 1. Extrair texto
    try {
      extractedText = await aiService.extractText(filePath, fileType);
    } catch (extractErr) {
      await certificateModel.insertAiLog(certId, {
        promptSent:   'EXTRACTION_ERROR',
        responseRaw:  '',
        errorMessage: extractErr.message,
      });
      await certificateModel.updateStatus(certId, 'manual_review');
      return;
    }

    if (extractedText.length < 30) {
      await certificateModel.insertAiLog(certId, {
        promptSent:   'TEXT_TOO_SHORT',
        responseRaw:  extractedText,
        errorMessage: 'Texto extraído insuficiente para análise.',
      });
      await certificateModel.updateStatus(certId, 'manual_review');
      return;
    }

    // 2. Analisar com IA
    let aiResult;
    try {
      aiResult = await aiService.analyzeCertificate(extractedText);
    } catch (aiErr) {
      await certificateModel.insertAiLog(certId, {
        promptSent:   extractedText.slice(0, 500),
        responseRaw:  '',
        errorMessage: aiErr.message,
      });
      await certificateModel.updateStatus(certId, 'manual_review');
      return;
    }

    // 3. Salvar log
    await certificateModel.insertAiLog(certId, {
      promptSent:   aiResult.promptSent,
      responseRaw:  aiResult.responseRaw,
      tokensUsed:   aiResult.tokensUsed,
      durationMs:   aiResult.durationMs,
    });

    // 4. Buscar instituição
    const institution = await certificateModel.findInstitutionByName(aiResult.institution);

    // 5. Determinar status final
    const finalStatus = aiResult.confidence >= 60 ? 'validated' : 'manual_review';

    await certificateModel.updateProcessed(certId, {
      status:               finalStatus,
      courseName:           aiResult.courseName,
      institutionName:      aiResult.institution,
      conclusionDate:       aiResult.conclusionDate,
      workloadHours:        aiResult.workloadHours,
      institutionId:        institution?.id || null,
      aiConfidence:         aiResult.confidence,
      aiInstitutionWeight:  aiResult.institutionWeight,
    });

    // 6. Processar skills apenas se validado
    if (finalStatus === 'validated') {
      for (const skill of aiResult.skills) {
        if (!skill.name || skill.relevance == null) continue;
        const dbSkill = await certificateModel.findSkillByName(skill.name);
        if (dbSkill) {
          await certificateModel.insertCertificateSkill(certId, dbSkill.id, skill.relevance);
          await certificateModel.recalculateCandidateSkill(candidateId, dbSkill.id);
        }
      }
    }

  } catch (err) {
    console.error('[CERT PROCESSING ERROR] certId=%d', certId, err.message);
    await certificateModel.updateStatus(certId, 'manual_review').catch(() => {});
  }
}

// ── Handlers ──────────────────────────────────────────────────

async function upload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Arquivo não enviado.' });
    }
    const candidateId = await getCandidateId(req.user.userId);
    const ext      = path.extname(req.file.originalname).slice(1).toLowerCase();
    const fileType = ext === 'jpeg' ? 'jpg' : ext;
    const fileUrl  = `/uploads/certificates/${req.file.filename}`;
    const courseName = path.basename(req.file.originalname, path.extname(req.file.originalname));

    const certId = await certificateModel.insert(candidateId, {
      fileUrl,
      fileType,
      courseName,
      institutionName: '',
    });

    res.status(202).json({ success: true, data: { id: certId, status: 'pending', file_url: fileUrl } });

    setImmediate(() => processCertificate(certId, req.file.path, fileType, candidateId));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('[UPLOAD ERROR]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function list(req, res) {
  try {
    const candidateId = await getCandidateId(req.user.userId);
    const certs = await certificateModel.findByCandidateId(candidateId);
    res.json({ success: true, data: certs });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function remove(req, res) {
  try {
    const candidateId = await getCandidateId(req.user.userId);
    const fileUrl = await certificateModel.deleteById(req.params.id, candidateId);
    if (!fileUrl) {
      return res.status(404).json({ success: false, error: 'Certificado não encontrado.' });
    }
    // Deletar arquivo do disco
    const filePath = path.join(__dirname, '..', '..', fileUrl);
    fs.unlink(filePath, () => {});
    res.json({ success: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function getSkills(req, res) {
  try {
    const candidateId = await getCandidateId(req.user.userId);
    const rows = await certificateModel.getCandidateSkillsWithCategory(candidateId);

    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.category_name]) grouped[row.category_name] = [];
      grouped[row.category_name].push({
        skill_id: row.skill_id,
        name: row.skill_name,
        score: parseFloat(row.score),
      });
    }

    const data = Object.entries(grouped).map(([category, skills]) => ({ category, skills }));
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

async function reprocessSkills(req, res) {
  try {
    const candidateId = await getCandidateId(req.user.userId);
    const cert = await certificateModel.findById(req.params.id);

    if (!cert)
      return res.status(404).json({ success: false, error: 'Certificado não encontrado.' });
    if (cert.candidate_id !== candidateId)
      return res.status(403).json({ success: false, error: 'Acesso negado.' });
    if (cert.status !== 'validated')
      return res.status(400).json({ success: false, error: 'Apenas certificados validados podem ser reprocessados.' });

    const aiLog = await certificateModel.getAiLog(cert.id);
    if (!aiLog?.response_raw)
      return res.status(400).json({ success: false, error: 'Log da IA não encontrado.' });

    let parsed;
    try { parsed = JSON.parse(aiLog.response_raw); } catch {
      return res.status(400).json({ success: false, error: 'Resposta da IA salva está inválida.' });
    }

    const matched = [];
    for (const skill of (parsed.skills || [])) {
      if (!skill.name) continue;
      const dbSkill = await certificateModel.findSkillByName(skill.name);
      if (dbSkill) {
        await certificateModel.insertCertificateSkill(cert.id, dbSkill.id, skill.relevance ?? 50);
        await certificateModel.recalculateCandidateSkill(candidateId, dbSkill.id);
        matched.push(dbSkill.name);
      }
    }

    res.json({ success: true, data: { matched, total_from_ai: (parsed.skills || []).length } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}

module.exports = { upload, list, remove, getSkills, reprocessSkills };
