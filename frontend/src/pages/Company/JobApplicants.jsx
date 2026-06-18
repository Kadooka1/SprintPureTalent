import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { companyService } from '../../services/companyService';
import './Company.css';

const LEVEL_LABELS      = { intern: 'Estagiário', junior: 'Júnior', mid: 'Pleno', senior: 'Sênior', specialist: 'Especialista' };
const MODALITY_LABELS   = { on_site: 'Presencial', remote: 'Remoto', hybrid: 'Híbrido' };
const AVAILABILITY_LABELS = { immediate: 'Imediata', '15_days': '15 dias', '30_days': '30 dias', negotiable: 'Negociável' };
const DEGREE_LABELS     = { technical: 'Técnico', undergraduate: 'Graduação', postgraduate: 'Pós-graduação', mba: 'MBA', masters: 'Mestrado', phd: 'Doutorado' };

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Recebida' },
  { value: 'reviewing', label: 'Em análise' },
  { value: 'approved',  label: 'Aprovado' },
  { value: 'rejected',  label: 'Recusado' },
];

const APP_STATUS_CLASS = {
  submitted: 'app-status-submitted',
  reviewing: 'app-status-reviewing',
  approved:  'app-status-approved',
  rejected:  'app-status-rejected',
};

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30)  return `${days} dias atrás`;
  const m = Math.floor(days / 30);
  return `${m} ${m === 1 ? 'mês' : 'meses'} atrás`;
}

function MatchBar({ score }) {
  const pct   = parseFloat(score ?? 0).toFixed(0);
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

function formatSalary(min, max) {
  const fmt = v => 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `A partir de ${fmt(min)}`;
  if (max) return `Até ${fmt(max)}`;
  return null;
}

// ── Modal de perfil do candidato ──────────────────────────────
function CandidateModal({ candidateId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyService.getCandidateProfile(candidateId)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [candidateId]);

  // Fechar com Esc
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Agrupar skills por categoria
  const skillsByCategory = profile?.skills?.reduce((acc, s) => {
    (acc[s.category_name] = acc[s.category_name] || []).push(s);
    return acc;
  }, {}) ?? {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : !profile ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
            Não foi possível carregar o perfil.
          </p>
        ) : (
          <div className="modal-content">
            {/* Cabeçalho */}
            <div className="modal-header">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="modal-avatar" />
                : <div className="modal-avatar-ph">{profile.full_name?.[0] ?? '?'}</div>
              }
              <div>
                <h2 className="modal-name">{profile.full_name}</h2>
                <p className="modal-email">{profile.email}</p>
                {profile.city && (
                  <p className="modal-location">📍 {profile.city}, {profile.state}</p>
                )}
              </div>
            </div>

            {/* Info rápida */}
            <div className="modal-info-grid">
              {profile.experience_level && (
                <div className="modal-info-item">
                  <span className="modal-info-label">Nível</span>
                  <span className="badge badge-level">{LEVEL_LABELS[profile.experience_level]}</span>
                </div>
              )}
              {profile.work_modality && (
                <div className="modal-info-item">
                  <span className="modal-info-label">Modalidade</span>
                  <span className="badge badge-modality">{MODALITY_LABELS[profile.work_modality]}</span>
                </div>
              )}
              {profile.availability && (
                <div className="modal-info-item">
                  <span className="modal-info-label">Disponibilidade</span>
                  <span>{AVAILABILITY_LABELS[profile.availability] ?? profile.availability}</span>
                </div>
              )}
              {(profile.salary_min || profile.salary_max) && (
                <div className="modal-info-item">
                  <span className="modal-info-label">Pretensão salarial</span>
                  <span>{formatSalary(profile.salary_min, profile.salary_max)}</span>
                </div>
              )}
            </div>

            {/* Skills */}
            {Object.keys(skillsByCategory).length > 0 && (
              <div className="modal-section">
                <h3 className="modal-section-title">Competências</h3>
                {Object.entries(skillsByCategory).map(([cat, skills]) => (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
                      {cat}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {skills.map(s => (
                        <div key={s.skill_name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, minWidth: 120 }}>{s.skill_name}</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${parseFloat(s.score)}%`, height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 30 }}>
                            {parseFloat(s.score).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formação */}
            {profile.educations?.length > 0 && (
              <div className="modal-section">
                <h3 className="modal-section-title">Formação Acadêmica</h3>
                {profile.educations.map((edu, i) => (
                  <div key={i} className="modal-list-item">
                    <p className="modal-list-title">{edu.course}</p>
                    <p className="modal-list-sub">
                      {edu.institution} · {DEGREE_LABELS[edu.degree] ?? edu.degree}
                      {edu.start_year && ` · ${edu.start_year}${edu.end_year ? ' – ' + edu.end_year : ' – atual'}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Experiência */}
            {profile.experiences?.length > 0 && (
              <div className="modal-section">
                <h3 className="modal-section-title">Experiência Profissional</h3>
                {profile.experiences.map((exp, i) => (
                  <div key={i} className="modal-list-item">
                    <p className="modal-list-title">{exp.job_title}</p>
                    <p className="modal-list-sub">
                      {exp.company_name} · {exp.started_at?.slice(0, 7)} – {exp.ended_at ? exp.ended_at.slice(0, 7) : 'atual'}
                    </p>
                    {exp.description && (
                      <p style={{ fontSize: 13, color: 'var(--dark)', marginTop: 4, lineHeight: 1.5 }}>
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function JobApplicants() {
  const { id }   = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    companyService.getProfile().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    companyService.getApplicants(id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(appId, newStatus) {
    setUpdating(appId);
    try {
      await companyService.updateApplicationStatus(appId, newStatus);
      setData(prev => ({
        ...prev,
        applicants: prev.applicants.map(a =>
          a.id === appId ? { ...a, status: newStatus } : a
        ),
      }));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="company-page">
      <nav className="company-nav">
        <div className="company-nav__left">
          <Link to="/" className="company-nav__brand">
            <img src="/logo.png" alt="PureTalent" className="company-nav__brand-img" />
            <span className="company-nav__brand-text">
              <span className="nav-brand-pure">Pure</span><span className="nav-brand-talent">Talent</span>
            </span>
          </Link>
        </div>

        <div className="company-nav__links">
          <Link to="/empresa" className="company-nav__link">Dashboard</Link>
          <span className="company-nav__link company-nav__link--active">Candidatos</span>
        </div>

        <div className="company-nav__right">
          <div className="company-nav__user" ref={menuRef}>
            <button className="company-nav__user-btn" onClick={() => setShowMenu(v => !v)}>
              {profile?.logo_url
                ? <img src={profile.logo_url} alt="Logo" className="company-nav__avatar" />
                : <div className="company-nav__avatar-ph">
                    {(profile?.trade_name || user?.email || '?')[0].toUpperCase()}
                  </div>
              }
              <span className="company-nav__user-name">
                {profile?.trade_name || 'Minha empresa'}
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showMenu && (
              <div className="company-nav__dropdown">
                <div className="company-nav__dropdown-header">
                  <p className="dropdown-user-name">{profile?.trade_name || user?.email}</p>
                  <p className="dropdown-user-email">{profile?.email || user?.email}</p>
                </div>
                <hr className="dropdown-divider" />
                <Link to="/empresa" className="dropdown-item" onClick={() => setShowMenu(false)}>
                  Dashboard
                </Link>
                <Link to="/jobs" className="dropdown-item" onClick={() => setShowMenu(false)}>
                  Ver vagas públicas
                </Link>
                <hr className="dropdown-divider" />
                <button className="dropdown-item dropdown-item--danger"
                  onClick={() => { logout(); navigate('/auth'); }}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="company-wrapper">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : !data ? (
          <div className="company-empty">
            <p>Vaga não encontrada.</p>
            <Link to="/empresa" className="btn btn-outline">Voltar</Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <Link to="/empresa" className="back-link">← Voltar ao painel</Link>
              <h1 className="company-section-title" style={{ marginTop: 8 }}>{data.job.title}</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {data.applicants.length} {data.applicants.length === 1 ? 'candidato' : 'candidatos'}
                {' · '}
                <span style={{ fontSize: 13 }}>Clique no nome para ver o perfil completo</span>
              </p>
            </div>

            {data.applicants.length === 0 ? (
              <div className="company-empty">
                <p>Nenhum candidato ainda.</p>
              </div>
            ) : (
              <div className="applicants-table-wrap">
                <table className="applicants-table">
                  <thead>
                    <tr>
                      <th>Candidato</th>
                      <th>Nível</th>
                      <th style={{ minWidth: 120 }}>Match</th>
                      <th>Status</th>
                      <th>Candidatou-se</th>
                      <th>Alterar status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.applicants.map(app => (
                      <tr key={app.id}>
                        <td>
                          <div
                            className="applicant-info applicant-info-clickable"
                            onClick={() => setSelectedCandidateId(app.candidate_id)}
                            title="Ver perfil completo"
                          >
                            {app.candidate_avatar
                              ? <img src={app.candidate_avatar} alt="" className="applicant-avatar" />
                              : <div className="applicant-avatar-ph">{app.candidate_name?.[0] ?? '?'}</div>
                            }
                            <div>
                              <p className="applicant-name applicant-name-link">{app.candidate_name}</p>
                              <p className="applicant-email">{app.candidate_email}</p>
                              {app.candidate_city && (
                                <p className="applicant-location">{app.candidate_city}, {app.candidate_state}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {app.candidate_level
                            ? <span className="badge badge-level">{LEVEL_LABELS[app.candidate_level]}</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                          }
                        </td>
                        <td><MatchBar score={app.match_score} /></td>
                        <td>
                          <span className={`app-status-badge ${APP_STATUS_CLASS[app.status] || ''}`}>
                            {STATUS_OPTIONS.find(o => o.value === app.status)?.label || app.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(app.applied_at)}
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{ fontSize: 13, padding: '4px 8px' }}
                            value={app.status}
                            disabled={updating === app.id}
                            onChange={e => handleStatusChange(app.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {selectedCandidateId && (
        <CandidateModal
          candidateId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
        />
      )}
    </div>
  );
}
