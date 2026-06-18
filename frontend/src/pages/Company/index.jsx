import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { companyService } from '../../services/companyService';
import './Company.css';

const LEVEL_LABELS    = { intern: 'Estágio', junior: 'Júnior', mid: 'Pleno', senior: 'Sênior', specialist: 'Especialista' };
const MODALITY_LABELS = { on_site: 'Presencial', remote: 'Remoto', hybrid: 'Híbrido' };
const STATUS_LABELS   = { draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada', pending_review: 'Em revisão', rejected: 'Rejeitada' };
const STATUS_CLASS    = { draft: 'status-draft', active: 'status-active', closed: 'status-closed', pending_review: 'status-pending', rejected: 'status-rejected' };

export default function CompanyPage() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [profile,  setProfile]  = useState(null);
  const [jobs,     setJobs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const logoRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [prof, jobData] = await Promise.all([
        companyService.getProfile(),
        companyService.listJobs(),
      ]);
      setProfile(prof);
      setJobs(jobData.jobs);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    setEditForm({
      trade_name:  profile.trade_name  || '',
      phone:       profile.phone       || '',
      website:     profile.website     || '',
      sector:      profile.sector      || '',
      description: profile.description || '',
    });
    setEditing(true);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await companyService.updateProfile(editForm);
      setProfile(prev => ({ ...prev, ...updated }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { logo_url } = await companyService.uploadLogo(file);
      setProfile(prev => ({ ...prev, logo_url }));
    } catch {
      alert('Erro ao enviar logo.');
    }
  }

  async function handleDeleteJob(jobId) {
    if (!confirm('Encerrar esta vaga? Ela não aparecerá mais no feed público.')) return;
    setDeleting(jobId);
    try {
      await companyService.deleteJob(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setProfile(prev => ({ ...prev, active_jobs: Math.max(0, (prev.active_jobs || 1) - 1) }));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
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
          <div className="company-nav__right" />
        </nav>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="company-page">
      {/* Navbar */}
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
          <span className="company-nav__link company-nav__link--active">Dashboard</span>
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
                <button className="dropdown-item" onClick={() => { startEdit(); setShowMenu(false); }}>
                  Editar empresa
                </button>
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

        {/* Perfil da empresa */}
        <div className="company-profile-card">
          <div className="company-profile-logo-wrap">
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="Logo" className="company-profile-logo" />
              : <div className="company-profile-logo-ph">{profile?.trade_name?.[0] ?? '?'}</div>
            }
            <button
              className="company-logo-btn"
              onClick={() => logoRef.current?.click()}
              title="Trocar logo"
            >
              +
            </button>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoChange}
            />
          </div>

          {!editing ? (
            <div className="company-profile-info">
              <h2 className="company-profile-name">{profile?.trade_name}</h2>
              <p className="company-profile-sector">{profile?.sector}</p>
              {profile?.email && <p className="company-profile-email">{profile.email}</p>}
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="company-profile-site">
                  {profile.website} ↗
                </a>
              )}
              {profile?.description && (
                <p className="company-profile-desc">{profile.description}</p>
              )}
            </div>
          ) : (
            <form className="company-edit-form" onSubmit={saveProfile}>
              <div className="company-edit-row">
                <div className="form-field">
                  <label className="form-label">Nome comercial</label>
                  <input
                    className="form-input"
                    value={editForm.trade_name}
                    onChange={e => setEditForm(p => ({ ...p, trade_name: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Telefone</label>
                  <input
                    className="form-input"
                    value={editForm.phone}
                    onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="company-edit-row">
                <div className="form-field">
                  <label className="form-label">Setor</label>
                  <input
                    className="form-input"
                    value={editForm.sector}
                    onChange={e => setEditForm(p => ({ ...p, sector: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Website</label>
                  <input
                    className="form-input"
                    value={editForm.website}
                    onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Descrição</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="company-edit-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

          {!editing && (
            <button className="btn btn-outline company-edit-btn" onClick={startEdit}>
              Editar perfil
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="company-stats">
          <div className="stat-card">
            <div className="stat-number">{profile?.active_jobs ?? 0}</div>
            <div className="stat-label">Vagas ativas</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{profile?.total_applications ?? 0}</div>
            <div className="stat-label">Candidaturas recebidas</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{jobs.length}</div>
            <div className="stat-label">Vagas cadastradas</div>
          </div>
        </div>

        {/* Jobs */}
        <div className="company-jobs-section">
          <div className="company-jobs-header">
            <h2 className="company-section-title">Minhas Vagas</h2>
            <Link to="/empresa/vagas/nova" className="btn btn-primary company-new-job-btn">
              + Nova Vaga
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="company-empty">
              <p>Nenhuma vaga cadastrada ainda.</p>
              <Link to="/empresa/vagas/nova" className="btn btn-primary">Criar primeira vaga</Link>
            </div>
          ) : (
            <div className="company-jobs-table-wrap">
              <table className="company-jobs-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Nível</th>
                    <th>Modalidade</th>
                    <th>Status</th>
                    <th className="text-center">Candidatos</th>
                    <th className="text-center">Visualizações</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id}>
                      <td className="job-title-cell">{job.title}</td>
                      <td><span className="badge badge-level">{LEVEL_LABELS[job.seniority_level]}</span></td>
                      <td><span className="badge badge-modality">{MODALITY_LABELS[job.modality]}</span></td>
                      <td>
                        <span className={`job-status-badge ${STATUS_CLASS[job.status] || ''}`}>
                          {STATUS_LABELS[job.status] || job.status}
                        </span>
                      </td>
                      <td className="text-center">{job.applicant_count}</td>
                      <td className="text-center">{job.views_count}</td>
                      <td>
                        <div className="job-actions">
                          <Link
                            to={`/empresa/vagas/${job.id}/candidatos`}
                            className="btn btn-outline job-action-btn"
                          >
                            Candidatos
                          </Link>
                          <Link
                            to={`/empresa/vagas/${job.id}/editar`}
                            className="btn btn-outline job-action-btn"
                          >
                            Editar
                          </Link>
                          {job.status !== 'closed' && (
                            <button
                              className="btn job-action-btn job-delete-btn"
                              onClick={() => handleDeleteJob(job.id)}
                              disabled={deleting === job.id}
                            >
                              {deleting === job.id ? '...' : 'Encerrar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
