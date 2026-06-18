import { useState, useEffect, useRef } from 'react';
import { certificateService } from '../../services/certificateService';

const STATUS_LABELS = {
  pending:       'Aguardando',
  processing:    'Processando...',
  validated:     'Validado',
  manual_review: 'Revisão manual',
  rejected:      'Rejeitado',
};

const STATUS_COLORS = {
  pending:       '#6b7280',
  processing:    '#3b82f6',
  validated:     '#22c55e',
  manual_review: '#f97316',
  rejected:      '#ef4444',
};

function skillColor(score) {
  if (score >= 80) return '#1a7a1a';
  if (score >= 60) return '#4caf50';
  if (score >= 40) return '#ffc107';
  if (score >= 20) return '#ff9800';
  return '#f44336';
}

export default function Certificates({ onValidatedCountChange }) {
  const [certs, setCerts]           = useState([]);
  const [skillGroups, setSkillGroups] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [error, setError]           = useState(null);
  const pollingRef  = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAll();
    return () => clearInterval(pollingRef.current);
  }, []);

  async function loadAll() {
    try {
      const [certList, skillData] = await Promise.all([
        certificateService.list(),
        certificateService.getSkills(),
      ]);
      applyUpdate(certList, skillData);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  function applyUpdate(certList, newSkillGroups) {
    setCerts(certList);
    if (newSkillGroups !== undefined) setSkillGroups(newSkillGroups);
    onValidatedCountChange?.(certList.filter(c => c.status === 'validated').length);

    const hasPending = certList.some(c => ['pending', 'processing'].includes(c.status));
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(doPoll, 3000);
    }
    if (!hasPending && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function doPoll() {
    try {
      const fresh = await certificateService.list();
      setCerts(fresh);
      onValidatedCountChange?.(fresh.filter(c => c.status === 'validated').length);

      const hasPending = fresh.some(c => ['pending', 'processing'].includes(c.status));
      if (!hasPending) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        certificateService.getSkills().then(setSkillGroups);
      }
    } catch { /* ignore */ }
  }

  async function handleFile(file) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use PDF, JPG ou PNG.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 20MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await certificateService.upload(file);
      const fresh = await certificateService.list();
      applyUpdate(fresh);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar certificado.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  async function handleReprocess(id) {
    try {
      setError(null);
      await certificateService.reprocessSkills(id);
      const [fresh, freshSkills] = await Promise.all([
        certificateService.list(),
        certificateService.getSkills(),
      ]);
      applyUpdate(fresh, freshSkills);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao reprocessar skills.');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este certificado?')) return;
    try {
      await certificateService.remove(id);
      const [fresh, freshSkills] = await Promise.all([
        certificateService.list(),
        certificateService.getSkills(),
      ]);
      applyUpdate(fresh, freshSkills);
    } catch {
      setError('Erro ao remover certificado.');
    }
  }

  return (
    <div className="certs-split">

      {/* ── Coluna esquerda: upload + lista ── */}
      <div className="certs-col">
        <h4 className="certs-col-title">Meus Certificados</h4>

        <div
          className={`cert-upload-zone${dragOver ? ' drag-over' : ''}${uploading ? ' uploading' : ''}`}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && fileInputRef.current.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && !uploading && fileInputRef.current.click()}
        >
          {uploading ? (
            <span className="spinner" style={{ width: 28, height: 28 }} />
          ) : (
            <>
              <span style={{ fontSize: 24 }}>📎</span>
              <p style={{ margin: '6px 0 2px', fontWeight: 500, fontSize: 13 }}>
                Arraste ou <strong>clique para selecionar</strong>
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                PDF, JPG ou PNG · máx. 20MB
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : certs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 16 }}>
            Nenhum certificado enviado ainda.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {certs.map(cert => (
              <div key={cert.id} className="cert-card">
                <div className="cert-card-main">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="cert-name">{cert.course_name}</p>
                    {cert.institution_name && <p className="cert-institution">{cert.institution_name}</p>}
                    {cert.conclusion_date  && <p className="cert-date">{String(cert.conclusion_date).slice(0, 7)}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className="cert-status-badge" style={{
                      background: (STATUS_COLORS[cert.status] || '#6b7280') + '20',
                      color: STATUS_COLORS[cert.status] || '#6b7280',
                    }}>
                      {STATUS_LABELS[cert.status] || cert.status}
                    </span>
                    <button className="btn btn-outline" style={{ padding: '3px 10px', fontSize: 12 }}
                      onClick={() => handleDelete(cert.id)}>
                      Remover
                    </button>
                  </div>
                </div>

                {cert.status === 'processing' && (
                  <div className="cert-progress-bar"><div className="cert-progress-fill" /></div>
                )}
                {cert.status === 'validated' && cert.skills?.length > 0 && (
                  <div className="cert-skills">
                    {cert.skills.slice(0, 5).map(s => (
                      <span key={s.skill_id} className="cert-skill-tag">{s.skill_name}</span>
                    ))}
                  </div>
                )}
                {cert.status === 'validated' && cert.skills?.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    Nenhuma skill identificada.{' '}
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '2px 6px', color: 'var(--primary)' }}
                      onClick={() => handleReprocess(cert.id)}>
                      Recuperar skills
                    </button>
                  </p>
                )}
                {cert.status === 'manual_review' && (
                  <p style={{ fontSize: 12, color: '#f97316', margin: '6px 0 0' }}>
                    Aguardando revisão manual por um administrador.
                  </p>
                )}
                {cert.status === 'rejected' && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef2f2',
                    borderLeft: '3px solid #ef4444', borderRadius: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', margin: '0 0 2px' }}>
                      Motivo da rejeição:
                    </p>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                      {cert.admin_notes || 'Não informado.'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Coluna direita: competências ── */}
      <div className="certs-col certs-col--skills">
        <h4 className="certs-col-title">Competências Técnicas</h4>

        {skillGroups.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
            {certs.length === 0
              ? 'Envie um certificado para identificar suas competências.'
              : 'Nenhuma competência identificada ainda.'}
          </p>
        ) : (
          <div className="skills-section">
            {skillGroups.map(group => (
              <div key={group.category} className="skills-category">
                <p className="skills-category-title">{group.category}</p>
                {group.skills.map(skill => (
                  <div key={skill.skill_id} className="skill-bar-row">
                    <span className="skill-bar-label">{skill.name}</span>
                    <div className="skill-bar-track">
                      <div className="skill-bar-fill" style={{ width: `${skill.score}%`, background: skillColor(skill.score) }} />
                    </div>
                    <span className="skill-bar-score" style={{ color: skillColor(skill.score) }}>
                      {Math.round(skill.score)}/100
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
