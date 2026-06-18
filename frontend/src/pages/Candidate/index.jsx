import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { candidateService } from '../../services/candidateService';
import { jobService } from '../../services/jobService';
import ProfileForm from './ProfileForm';
import Certificates from './Certificates';
import './Candidate.css';

const MODALITY_LABELS = {
  on_site: 'Presencial',
  remote:  'Remoto',
  hybrid:  'Híbrido',
};

const LEVEL_LABELS = {
  intern:     'Estagiário',
  junior:     'Júnior',
  mid:        'Pleno',
  senior:     'Sênior',
  specialist: 'Especialista',
};

const APPLICATION_STATUS = {
  submitted: { label: 'Candidatura enviada', color: 'app-status-submitted' },
  reviewing: { label: 'Em análise',          color: 'app-status-reviewing' },
  approved:  { label: 'Aprovado',            color: 'app-status-approved'  },
  rejected:  { label: 'Recusado',            color: 'app-status-rejected'  },
};

const DEGREE_LABELS = {
  technical: 'Técnico', undergraduate: 'Graduação', postgraduate: 'Pós-graduação',
  mba: 'MBA', masters: 'Mestrado', phd: 'Doutorado',
};

const STATUS_EDU_LABELS = { studying: 'Cursando', completed: 'Concluído', interrupted: 'Interrompido' };

const EMPTY_EDU = { institution: '', course: '', degree: '', status: '', start_year: '', end_year: '' };
const EMPTY_EXP = { company_name: '', job_title: '', started_at: '', ended_at: '', description: '' };

function calcCompletion(profile) {
  const fields = [
    profile.full_name, profile.gender, profile.phone,
    profile.city, profile.state,
    profile.work_modality, profile.experience_level, profile.availability,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export default function CandidatePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState(false);
  const [validatedCerts, setValidatedCerts]       = useState(0);
  const [applicationCount, setApplicationCount]   = useState(0);
  const [applications, setApplications]           = useState([]);
  const [activeTab, setActiveTab]                 = useState('applications');
  const [showMenu, setShowMenu]                   = useState(false);

  const [eduForm, setEduForm]           = useState(EMPTY_EDU);
  const [showEduForm, setShowEduForm]   = useState(false);
  const [editingEduId, setEditingEduId] = useState(null);
  const [eduSaving, setEduSaving]       = useState(false);
  const [eduError, setEduError]         = useState('');

  const [expForm, setExpForm]           = useState(EMPTY_EXP);
  const [showExpForm, setShowExpForm]   = useState(false);
  const [editingExpId, setEditingExpId] = useState(null);
  const [expSaving, setExpSaving]       = useState(false);
  const [expError, setExpError]         = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    candidateService.getProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
    jobService.getApplicationCount()
      .then(setApplicationCount)
      .catch(() => {});
    jobService.getApplications()
      .then(setApplications)
      .catch(() => {});
  }, []);

  function handleComplete() {
    candidateService.getProfile().then(p => {
      setProfile(p);
      setEditing(false);
    });
  }

  // ── Educação ──────────────────────────────────────────────────

  function openNewEdu() {
    setEduForm(EMPTY_EDU); setEditingEduId(null); setEduError(''); setShowEduForm(true);
  }
  function openEditEdu(edu) {
    setEduForm({ institution: edu.institution, course: edu.course, degree: edu.degree || '',
      status: edu.status || '', start_year: edu.start_year || '', end_year: edu.end_year || '' });
    setEditingEduId(edu.id); setEduError(''); setShowEduForm(true);
  }
  async function saveEdu() {
    if (!eduForm.institution || !eduForm.course || !eduForm.degree || !eduForm.status) {
      setEduError('Preencha os campos obrigatórios.'); return;
    }
    setEduSaving(true); setEduError('');
    try {
      if (editingEduId) {
        await candidateService.updateEducation(editingEduId, eduForm);
        setProfile(p => ({ ...p, educations: p.educations.map(e => e.id === editingEduId ? { ...e, ...eduForm } : e) }));
      } else {
        const saved = await candidateService.addEducation(eduForm);
        setProfile(p => ({ ...p, educations: [...(p.educations ?? []), saved] }));
      }
      setShowEduForm(false);
    } catch (err) {
      setEduError(err.response?.data?.error || 'Erro ao salvar.');
    } finally { setEduSaving(false); }
  }
  async function removeEdu(id) {
    if (!window.confirm('Remover esta formação?')) return;
    try {
      await candidateService.deleteEducation(id);
      setProfile(p => ({ ...p, educations: p.educations.filter(e => e.id !== id) }));
    } catch { /* ignore */ }
  }

  // ── Experiência ───────────────────────────────────────────────

  function openNewExp() {
    setExpForm(EMPTY_EXP); setEditingExpId(null); setExpError(''); setShowExpForm(true);
  }
  function openEditExp(exp) {
    setExpForm({ company_name: exp.company_name, job_title: exp.job_title,
      started_at: exp.started_at?.slice(0, 7) || '', ended_at: exp.ended_at?.slice(0, 7) || '',
      description: exp.description || '' });
    setEditingExpId(exp.id); setExpError(''); setShowExpForm(true);
  }
  async function saveExp() {
    if (!expForm.company_name || !expForm.job_title || !expForm.started_at) {
      setExpError('Preencha os campos obrigatórios.'); return;
    }
    setExpSaving(true); setExpError('');
    try {
      const payload = { ...expForm,
        started_at: expForm.started_at ? expForm.started_at + '-01' : null,
        ended_at:   expForm.ended_at   ? expForm.ended_at   + '-01' : null,
      };
      if (editingExpId) {
        await candidateService.updateExperience(editingExpId, payload);
        setProfile(p => ({ ...p, experiences: p.experiences.map(e => e.id === editingExpId ? { ...e, ...expForm } : e) }));
      } else {
        const saved = await candidateService.addExperience(payload);
        setProfile(p => ({ ...p, experiences: [...(p.experiences ?? []), saved] }));
      }
      setShowExpForm(false);
    } catch (err) {
      setExpError(err.response?.data?.error || 'Erro ao salvar.');
    } finally { setExpSaving(false); }
  }
  async function removeExp(id) {
    if (!window.confirm('Remover esta experiência?')) return;
    try {
      await candidateService.deleteExperience(id);
      setProfile(p => ({ ...p, experiences: p.experiences.filter(e => e.id !== id) }));
    } catch { /* ignore */ }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Tem certeza? Esta ação é irreversível e todos os seus dados serão excluídos permanentemente.')) return;
    try {
      await candidateService.deleteAccount();
      logout();
      navigate('/auth');
    } catch {
      alert('Erro ao excluir conta. Tente novamente.');
    }
  }

  const showWizard = !loading && (!profile?.profile_completed || editing);

  return (
    <div className="candidate-page">
      {/* Navbar */}
      <nav className="candidate-nav">
        <div className="candidate-nav__left">
          <Link to="/" className="candidate-nav__logo">
            <img src="/logo.png" alt="PureTalent" className="candidate-nav__logo-img" />
            <span className="candidate-nav__brand">
              <span className="nav-brand-pure">Pure</span><span className="nav-brand-talent">Talent</span>
            </span>
          </Link>
          <div className="candidate-nav__links">
            <span className="candidate-nav__link candidate-nav__link--active">Dashboard</span>
            <Link to="/jobs" className="candidate-nav__link">Vagas</Link>
          </div>
        </div>

        <div className="candidate-nav__right">
          <button className="candidate-nav__icon-btn" aria-label="Notificações">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>

          <div className="candidate-nav__user" ref={menuRef}>
            <button className="candidate-nav__user-btn" onClick={() => setShowMenu(v => !v)}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" className="candidate-nav__avatar" />
                : <div className="candidate-nav__avatar-ph">
                    {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
                  </div>
              }
              <span className="candidate-nav__user-name">
                {profile?.full_name?.split(' ')[0] || 'Minha conta'}
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showMenu && (
              <div className="candidate-nav__dropdown">
                <div className="candidate-nav__dropdown-header">
                  <p className="dropdown-user-name">{profile?.full_name || user?.email}</p>
                  <p className="dropdown-user-email">{profile?.email || user?.email}</p>
                </div>
                <hr className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { setEditing(true); setShowMenu(false); }}>
                  Editar perfil
                </button>
                <Link to="/jobs" className="dropdown-item" onClick={() => setShowMenu(false)}>
                  Explorar vagas
                </Link>
                <hr className="dropdown-divider" />
                <button className="dropdown-item dropdown-item--danger" onClick={() => { setShowMenu(false); handleDeleteAccount(); }}>
                  Excluir conta
                </button>
                <button className="dropdown-item dropdown-item--danger" onClick={logout}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      )}

      {/* Wizard de perfil */}
      {showWizard && profile && (
        <ProfileForm
          profile={profile}
          onComplete={handleComplete}
        />
      )}

      {/* Dashboard pós-conclusão */}
      {!loading && profile?.profile_completed && !editing && (
        <div className="candidate-layout">

          {/* ── Sidebar ── */}
          <aside className="candidate-sidebar">
            <div className="sidebar-profile">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" className="sidebar-avatar" />
                : <div className="sidebar-avatar-ph">{(profile.full_name || '?')[0]}</div>
              }
              <h2 className="sidebar-name">{profile.full_name}</h2>
              <p className="sidebar-email">{profile.email}</p>
              {profile.city && (
                <p className="sidebar-meta">
                  📍 {profile.city}, {profile.state}
                  {profile.work_modality && ` · ${MODALITY_LABELS[profile.work_modality]}`}
                  {profile.experience_level && ` · ${LEVEL_LABELS[profile.experience_level]}`}
                </p>
              )}
            </div>

            <div className="sidebar-completion">
              <div className="sidebar-completion-label">
                <span>Perfil completo</span>
                <span className="sidebar-completion-pct">{calcCompletion(profile)}%</span>
              </div>
              <div className="progress-bar-wrapper">
                <div className="progress-bar-fill" style={{ width: `${calcCompletion(profile)}%` }} />
              </div>
            </div>

            <div className="sidebar-stats">
              <div className="sidebar-stat">
                <span className="sidebar-stat-num">{profile.educations?.length ?? 0}</span>
                <span className="sidebar-stat-lbl">Formações</span>
              </div>
              <div className="sidebar-stat">
                <span className="sidebar-stat-num">{profile.experiences?.length ?? 0}</span>
                <span className="sidebar-stat-lbl">Experiências</span>
              </div>
              <div className="sidebar-stat">
                <span className="sidebar-stat-num">{validatedCerts}</span>
                <span className="sidebar-stat-lbl">Certificados</span>
              </div>
              <div className="sidebar-stat">
                <span className="sidebar-stat-num">{applicationCount}</span>
                <span className="sidebar-stat-lbl">Candidaturas</span>
              </div>
            </div>

            <div className="sidebar-actions">
              <button className="btn btn-outline btn-full" onClick={() => setEditing(true)}>
                Editar perfil
              </button>
              <Link to="/jobs" className="btn btn-primary btn-full">
                Ver vagas
              </Link>
              <button className="btn btn-danger-ghost btn-full" onClick={handleDeleteAccount}>
                Excluir conta
              </button>
            </div>
          </aside>

          {/* ── Área principal com abas ── */}
          <main className="candidate-main">
            <div className="profile-tabs">
              <button
                className={`profile-tab${activeTab === 'applications' ? ' active' : ''}`}
                onClick={() => setActiveTab('applications')}
              >
                Candidaturas
                {applications.length > 0 && (
                  <span className="profile-tab-badge">{applications.length}</span>
                )}
              </button>
              <button
                className={`profile-tab${activeTab === 'education' ? ' active' : ''}`}
                onClick={() => setActiveTab('education')}
              >
                Formação
              </button>
              <button
                className={`profile-tab${activeTab === 'experience' ? ' active' : ''}`}
                onClick={() => setActiveTab('experience')}
              >
                Experiência
              </button>
              <button
                className={`profile-tab${activeTab === 'certificates' ? ' active' : ''}`}
                onClick={() => setActiveTab('certificates')}
              >
                Certificados
              </button>
            </div>

            <div className="profile-tab-content">

              {activeTab === 'applications' && (
                <div className="tab-panel">
                  {applications.length === 0
                    ? <p className="list-empty">Nenhuma candidatura enviada ainda.</p>
                    : <div className="applications-list">
                        {applications.map(app => {
                          const st = APPLICATION_STATUS[app.status] ?? APPLICATION_STATUS.submitted;
                          return (
                            <Link key={app.id} to={`/jobs/${app.job_id}`} className="application-item">
                              <div className="application-item-main">
                                {app.company_logo
                                  ? <img src={app.company_logo} alt={app.company_name} className="application-logo" />
                                  : <div className="application-logo-ph">{app.company_name?.[0] ?? '?'}</div>
                                }
                                <div className="application-info">
                                  <p className="application-title">{app.job_title}</p>
                                  <p className="application-company">
                                    {app.company_name}
                                    {app.city && ` · ${app.city}`}
                                    {app.modality && ` · ${MODALITY_LABELS[app.modality]}`}
                                  </p>
                                  <p className="application-date">
                                    {new Date(app.applied_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              <div className="application-item-right">
                                {app.match_score != null && (
                                  <span className="application-match">{parseFloat(app.match_score).toFixed(0)}% match</span>
                                )}
                                <span className={`application-status-badge ${st.color}`}>{st.label}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                  }
                </div>
              )}

              {activeTab === 'education' && (
                <div className="tab-panel">
                  <div className="tab-panel-header">
                    <h4 className="tab-panel-title">Formação Acadêmica</h4>
                    {!showEduForm && (
                      <button className="btn btn-primary btn-sm" onClick={openNewEdu}>+ Adicionar</button>
                    )}
                  </div>

                  {showEduForm && (
                    <div className="inline-form-card" style={{ marginBottom: 16 }}>
                      <p className="inline-form-title">{editingEduId ? 'Editar formação' : 'Nova formação'}</p>
                      {eduError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{eduError}</div>}
                      <div className="form-row-2">
                        <div className="form-group">
                          <label>Instituição *</label>
                          <input className="form-control" value={eduForm.institution}
                            onChange={e => setEduForm(p => ({ ...p, institution: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label>Curso *</label>
                          <input className="form-control" value={eduForm.course}
                            onChange={e => setEduForm(p => ({ ...p, course: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-row-3">
                        <div className="form-group">
                          <label>Grau *</label>
                          <select className="form-control" value={eduForm.degree}
                            onChange={e => setEduForm(p => ({ ...p, degree: e.target.value }))}>
                            <option value="">Selecione</option>
                            {Object.entries(DEGREE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Status *</label>
                          <select className="form-control" value={eduForm.status}
                            onChange={e => setEduForm(p => ({ ...p, status: e.target.value }))}>
                            <option value="">Selecione</option>
                            {Object.entries(STATUS_EDU_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Ano início</label>
                          <input className="form-control" type="number" min="1980" max="2030"
                            value={eduForm.start_year}
                            onChange={e => setEduForm(p => ({ ...p, start_year: e.target.value }))} />
                        </div>
                      </div>
                      <div className="inline-form-actions">
                        <button className="btn btn-outline" onClick={() => setShowEduForm(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={saveEdu} disabled={eduSaving}>
                          {eduSaving ? <span className="spinner" /> : (editingEduId ? 'Salvar' : 'Adicionar')}
                        </button>
                      </div>
                    </div>
                  )}

                  {(profile.educations?.length ?? 0) === 0 && !showEduForm && (
                    <p className="list-empty">Nenhuma formação adicionada.</p>
                  )}
                  {profile.educations?.map(edu => (
                    <div key={edu.id} className="tab-item tab-item--row">
                      <div>
                        <p className="tab-item-title">{edu.course}</p>
                        <p className="tab-item-sub">
                          {edu.institution}
                          {edu.degree && ` · ${DEGREE_LABELS[edu.degree] ?? edu.degree}`}
                          {edu.start_year && ` · ${edu.start_year}${edu.end_year ? ' – ' + edu.end_year : ' – atual'}`}
                        </p>
                      </div>
                      <div className="tab-item-actions">
                        <button className="tab-icon-btn" onClick={() => openEditEdu(edu)} title="Editar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="tab-icon-btn tab-icon-btn--danger" onClick={() => removeEdu(edu.id)} title="Remover">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'experience' && (
                <div className="tab-panel">
                  <div className="tab-panel-header">
                    <h4 className="tab-panel-title">Experiência Profissional</h4>
                    {!showExpForm && (
                      <button className="btn btn-primary btn-sm" onClick={openNewExp}>+ Adicionar</button>
                    )}
                  </div>

                  {showExpForm && (
                    <div className="inline-form-card" style={{ marginBottom: 16 }}>
                      <p className="inline-form-title">{editingExpId ? 'Editar experiência' : 'Nova experiência'}</p>
                      {expError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{expError}</div>}
                      <div className="form-row-2">
                        <div className="form-group">
                          <label>Empresa *</label>
                          <input className="form-control" value={expForm.company_name}
                            onChange={e => setExpForm(p => ({ ...p, company_name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label>Cargo *</label>
                          <input className="form-control" value={expForm.job_title}
                            onChange={e => setExpForm(p => ({ ...p, job_title: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-row-2">
                        <div className="form-group">
                          <label>Início *</label>
                          <input className="form-control" type="month" value={expForm.started_at}
                            onChange={e => setExpForm(p => ({ ...p, started_at: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label>Fim <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(deixe em branco se atual)</span></label>
                          <input className="form-control" type="month" value={expForm.ended_at}
                            onChange={e => setExpForm(p => ({ ...p, ended_at: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Descrição</label>
                        <textarea className="form-control" rows={3} value={expForm.description}
                          onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                          style={{ resize: 'vertical', minHeight: 72 }} />
                      </div>
                      <div className="inline-form-actions">
                        <button className="btn btn-outline" onClick={() => setShowExpForm(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={saveExp} disabled={expSaving}>
                          {expSaving ? <span className="spinner" /> : (editingExpId ? 'Salvar' : 'Adicionar')}
                        </button>
                      </div>
                    </div>
                  )}

                  {(profile.experiences?.length ?? 0) === 0 && !showExpForm && (
                    <p className="list-empty">Nenhuma experiência adicionada.</p>
                  )}
                  {profile.experiences?.map(exp => (
                    <div key={exp.id} className="tab-item tab-item--row">
                      <div style={{ minWidth: 0 }}>
                        <p className="tab-item-title">{exp.job_title}</p>
                        <p className="tab-item-sub">
                          {exp.company_name} · {exp.started_at?.slice(0, 7)} – {exp.ended_at ? exp.ended_at.slice(0, 7) : 'atual'}
                        </p>
                        {exp.description && <p className="tab-item-desc">{exp.description}</p>}
                      </div>
                      <div className="tab-item-actions">
                        <button className="tab-icon-btn" onClick={() => openEditExp(exp)} title="Editar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="tab-icon-btn tab-icon-btn--danger" onClick={() => removeExp(exp.id)} title="Remover">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'certificates' && (
                <Certificates onValidatedCountChange={setValidatedCerts} />
              )}

            </div>
          </main>

        </div>
      )}
    </div>
  );
}
