import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { jobService } from '../../services/jobService';
import { candidateService } from '../../services/candidateService';
import './Jobs.css';

const MODALITY_LABELS  = { on_site: 'Presencial', remote: 'Remoto', hybrid: 'Híbrido' };
const LEVEL_LABELS     = { intern: 'Estágio', junior: 'Júnior', mid: 'Pleno', senior: 'Sênior', specialist: 'Especialista' };
const CONTRACT_LABELS  = { clt: 'CLT', pj: 'PJ', internship: 'Estágio', freelancer: 'Freelancer' };
const SIZE_LABELS      = { micro: 'Micro', small: 'Pequeno', medium: 'Médio', large: 'Grande' };

function formatSalary(min, max) {
  const fmt = v => 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `A partir de ${fmt(min)}`;
  if (max) return `Até ${fmt(max)}`;
  return null;
}

function SkillRow({ skill, candidateSkills }) {
  if (!candidateSkills) {
    return (
      <div className="skill-row">
        <span className="skill-row-name">{skill.skill_name}</span>
        {skill.is_required
          ? <span className="badge badge-required">Obrigatória</span>
          : <span className="badge badge-optional">Diferencial</span>
        }
      </div>
    );
  }

  const cs   = candidateSkills.find(s => s.skill_id === skill.skill_id);
  const score = cs ? parseFloat(cs.score) : 0;
  const min   = skill.min_score ?? 0;
  const match = score >= min;

  return (
    <div className={`skill-row ${match ? 'skill-match' : 'skill-gap'}`}>
      <div className="skill-row-info">
        <span className="skill-row-name">{skill.skill_name}</span>
        {skill.is_required
          ? <span className="badge badge-required">Obrigatória</span>
          : <span className="badge badge-optional">Diferencial</span>
        }
      </div>
      <div className="skill-row-status">
        {match
          ? <span className="skill-check">✅ {score.toFixed(0)} pts</span>
          : <span className="skill-miss">❌ {score > 0 ? `${score.toFixed(0)} pts (mín. ${min})` : 'Não possuo'}</span>
        }
      </div>
    </div>
  );
}

export default function JobDetail() {
  const { id }           = useParams();
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [job,             setJob]             = useState(null);
  const [candidateSkills, setCandidateSkills] = useState(null);
  const [applied,         setApplied]         = useState(false);
  const [matchScore,      setMatchScore]      = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [applying,        setApplying]        = useState(false);
  const [error,           setError]           = useState('');
  const [profile,         setProfile]         = useState(null);
  const [showMenu,        setShowMenu]        = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'candidate') {
      candidateService.getProfile().then(setProfile).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLoading(true);
    jobService.get(id)
      .then(data => {
        setJob(data);
        if (user?.role === 'candidate') {
          return jobService.getApplications().then(apps => {
            const found = apps.find(a => a.job_id === data.id);
            if (found) {
              setApplied(true);
              setMatchScore(parseFloat(found.match_score));
            }
          }).catch(() => {});
        }
      })
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  // Buscar skills do candidato para exibir match por skill
  useEffect(() => {
    if (user?.role !== 'candidate') return;
    import('../../services/certificateService').then(({ certificateService }) => {
      certificateService.getSkills().then(categories => {
        const flat = categories.flatMap(cat =>
          cat.skills.map(s => ({ skill_id: s.skill_id, score: s.score }))
        );
        setCandidateSkills(flat);
      }).catch(() => {});
    });
  }, [user]);

  async function handleApply() {
    if (!user) return navigate('/auth');
    setApplying(true);
    setError('');
    try {
      const result = await jobService.apply(id);
      setApplied(true);
      setMatchScore(result.match_score);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar candidatura.');
    } finally {
      setApplying(false);
    }
  }

  const requiredSkills  = job?.skills?.filter(s => s.is_required) ?? [];
  const optionalSkills  = job?.skills?.filter(s => !s.is_required) ?? [];
  const salary          = job?.salary_disclosed ? formatSalary(job.salary_min, job.salary_max) : null;

  return (
    <div className="jobs-page">
      {/* Navbar */}
      <nav className="jobs-topbar">
        <Link to="/jobs" className="navbar-brand">
          <img src="/logo.png" alt="Pure Talent" className="navbar-logo" />
          <span className="navbar-brand-text">
            <span className="brand-pure">Pure</span><span className="brand-talent">Talent</span>
          </span>
        </Link>

        {user?.role === 'candidate' && (
          <div className="jobs-nav__links">
            <Link to="/candidato" className="jobs-nav__link">Dashboard</Link>
            <Link to="/jobs" className="jobs-nav__link jobs-nav__link--active">Vagas</Link>
          </div>
        )}

        <div className="jobs-topbar-actions">
          {user?.role === 'candidate' ? (
            <div className="jobs-user-menu" ref={menuRef}>
              <button className="jobs-user-btn" onClick={() => setShowMenu(v => !v)}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="Avatar" className="jobs-user-avatar" />
                  : <div className="jobs-user-avatar-ph">
                      {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
                    </div>
                }
                <span className="jobs-user-name">
                  {profile?.full_name?.split(' ')[0] || 'Minha conta'}
                </span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showMenu && (
                <div className="jobs-dropdown">
                  <div className="jobs-dropdown-header">
                    <p className="dropdown-user-name">{profile?.full_name || user?.email}</p>
                    <p className="dropdown-user-email">{profile?.email || user?.email}</p>
                  </div>
                  <hr className="dropdown-divider" />
                  <Link to="/candidato" className="dropdown-item" onClick={() => setShowMenu(false)}>
                    Meu dashboard
                  </Link>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item dropdown-item--danger"
                    onClick={() => { logout(); navigate('/auth'); }}>
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : user ? (
            <button className="jobs-topbar-btn jobs-topbar-btn--outline"
              onClick={() => { logout(); navigate('/auth'); }}>
              Sair
            </button>
          ) : (
            <Link to="/auth" className="jobs-topbar-btn jobs-topbar-btn--primary">
              Entrar
            </Link>
          )}
        </div>
      </nav>

      <div className="job-detail-layout">
        {loading ? (
          <div className="jobs-loading">
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : !job ? (
          <div className="jobs-empty">
            <p>Vaga não encontrada ou encerrada.</p>
            <Link to="/jobs" className="btn btn-outline">Ver todas as vagas</Link>
          </div>
        ) : (
          <>
            {/* Coluna principal */}
            <div className="job-detail-main">
              <Link to="/jobs" className="back-link">← Voltar às vagas</Link>

              <div className="job-detail-card">
                {/* Cabeçalho */}
                <div className="job-detail-header">
                  {job.company_logo
                    ? <img src={job.company_logo} alt={job.company_name} className="job-detail-logo" />
                    : <div className="job-detail-logo-ph">{job.company_name?.[0] ?? '?'}</div>
                  }
                  <div>
                    <h1 className="job-detail-title">{job.title}</h1>
                    <p className="job-detail-company">{job.company_name}</p>
                    {job.city && (
                      <p className="job-detail-location">
                        📍 {job.modality === 'remote' ? 'Remoto' : `${job.city}, ${job.state}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="job-card-badges" style={{ marginBottom: 20 }}>
                  <span className="badge badge-modality">{MODALITY_LABELS[job.modality]}</span>
                  <span className="badge badge-level">{LEVEL_LABELS[job.seniority_level]}</span>
                  <span className="badge badge-contract">{CONTRACT_LABELS[job.contract_type]}</span>
                  {job.workload && <span className="badge badge-info">{job.workload}</span>}
                </div>

                {salary && (
                  <p className="job-detail-salary">{salary}</p>
                )}

                {/* Descrição */}
                <div className="job-detail-section">
                  <h2>Descrição da vaga</h2>
                  <div className="job-detail-description">
                    {job.description.split('\n').map((line, i) => (
                      line.trim() ? <p key={i}>{line}</p> : <br key={i} />
                    ))}
                  </div>
                </div>

                {/* Benefícios */}
                {job.benefits && (
                  <div className="job-detail-section">
                    <h2>Benefícios</h2>
                    <p>{job.benefits}</p>
                  </div>
                )}

                {/* Skills */}
                {job.skills?.length > 0 && (
                  <div className="job-detail-section">
                    <h2>Competências</h2>

                    {user?.role === 'candidate' && matchScore != null && (
                      <div className={`match-banner ${matchScore >= 70 ? 'match-high' : matchScore >= 40 ? 'match-mid' : 'match-low'}`}>
                        <span className="match-score-big">{matchScore.toFixed(0)}%</span>
                        <span>de compatibilidade com seu perfil</span>
                      </div>
                    )}

                    {requiredSkills.length > 0 && (
                      <>
                        <p className="skills-section-label">Obrigatórias</p>
                        {requiredSkills.map(s => (
                          <SkillRow key={s.skill_id} skill={s} candidateSkills={candidateSkills} />
                        ))}
                      </>
                    )}

                    {optionalSkills.length > 0 && (
                      <>
                        <p className="skills-section-label" style={{ marginTop: 16 }}>Diferenciais</p>
                        {optionalSkills.map(s => (
                          <SkillRow key={s.skill_id} skill={s} candidateSkills={candidateSkills} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar direita — ação de candidatura */}
            <aside className="job-detail-sidebar">
              <div className="apply-card">
                <h3 className="apply-card-title">{job.title}</h3>
                <p className="apply-card-company">{job.company_name}</p>

                {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

                {applied ? (
                  <div className="applied-badge">
                    <span>✅ Candidatura enviada!</span>
                    {matchScore != null && (
                      <span className="applied-score">{matchScore.toFixed(0)}% de match</span>
                    )}
                  </div>
                ) : user?.role === 'candidate' ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={handleApply}
                    disabled={applying}
                  >
                    {applying ? 'Enviando...' : 'Candidatar-se'}
                  </button>
                ) : user ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Apenas candidatos podem se candidatar.
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center' }}>
                      Faça login para se candidatar
                    </p>
                    <Link to="/auth" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
                      Entrar
                    </Link>
                  </>
                )}

                {job.external_link && (
                  <a
                    href={job.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{ width: '100%', display: 'block', textAlign: 'center', marginTop: 8 }}
                  >
                    Ver vaga original ↗
                  </a>
                )}
              </div>

              {/* Info da empresa */}
              <div className="company-info-card">
                <h3>Sobre a empresa</h3>
                <p className="company-info-name">{job.company_name}</p>
                {job.company_sector && <p className="company-info-detail">{job.company_sector}</p>}
                {job.company_size   && <p className="company-info-detail">Porte: {SIZE_LABELS[job.company_size]}</p>}
                {job.company_description && (
                  <p className="company-info-desc">{job.company_description}</p>
                )}
                {job.company_website && (
                  <a
                    href={job.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="company-info-link"
                  >
                    {job.company_website} ↗
                  </a>
                )}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
