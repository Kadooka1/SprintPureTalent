import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { jobService } from '../../services/jobService';
import { candidateService } from '../../services/candidateService';
import JobCard from '../../components/JobCard';
import './Jobs.css';

const MODALITY_OPTIONS = [
  { value: '',        label: 'Todas' },
  { value: 'remote',  label: 'Remoto' },
  { value: 'hybrid',  label: 'Híbrido' },
  { value: 'on_site', label: 'Presencial' },
];

const LEVEL_OPTIONS = [
  { value: '',           label: 'Todos' },
  { value: 'intern',     label: 'Estágio' },
  { value: 'junior',     label: 'Júnior' },
  { value: 'mid',        label: 'Pleno' },
  { value: 'senior',     label: 'Sênior' },
  { value: 'specialist', label: 'Especialista' },
];

const PAGE_SIZE = 12;

export default function JobsPage() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [jobs,    setJobs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ modality: '', seniority_level: '', city: '' });
  const [cityInput, setCityInput] = useState('');

  const [profile, setProfile]   = useState(null);
  const [showMenu, setShowMenu] = useState(false);
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

  const load = useCallback((pg, f) => {
    setLoading(true);
    const params = { page: pg, limit: PAGE_SIZE };
    if (f.modality)        params.modality        = f.modality;
    if (f.seniority_level) params.seniority_level  = f.seniority_level;
    if (f.city)            params.city             = f.city;

    jobService.list(params)
      .then(data => {
        setJobs(data.jobs);
        setTotal(data.total);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page, filters);
  }, [load, page, filters]);

  function applyFilter(key, value) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
  }

  function handleCitySearch(e) {
    e.preventDefault();
    applyFilter('city', cityInput.trim());
  }

  function clearCityFilter() {
    setCityInput('');
    applyFilter('city', '');
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeFiltersCount = [filters.modality, filters.seniority_level, filters.city].filter(Boolean).length;

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
            <span className="jobs-nav__link jobs-nav__link--active">Vagas</span>
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

      {/* Hero Banner */}
      <div className="jobs-hero">
        <div className="jobs-hero-inner">
          <p className="jobs-hero-label">Oportunidades em Tecnologia</p>
          <h1 className="jobs-hero-title">Encontre a vaga ideal<br />para sua carreira em TI</h1>
          <p className="jobs-hero-subtitle">
            Match inteligente com base nas suas competências certificadas
          </p>
          {!loading && total > 0 && (
            <div className="jobs-hero-stats">
              <span className="jobs-hero-stat">
                {total} {total === 1 ? 'vaga disponível' : 'vagas disponíveis'}
              </span>
              <span className="jobs-hero-stat">Remoto · Híbrido · Presencial</span>
            </div>
          )}
        </div>
      </div>

      <div className="jobs-layout">
        {/* Sidebar de filtros */}
        <aside className="jobs-sidebar">
          <h2 className="jobs-sidebar-title">
            Filtros
            {activeFiltersCount > 0 && (
              <span className="jobs-sidebar-badge">{activeFiltersCount}</span>
            )}
          </h2>

          <div className="filter-group">
            <label className="filter-label">Cidade</label>
            <form onSubmit={handleCitySearch} className="city-search-form">
              <input
                type="text"
                className="filter-input"
                placeholder="Ex: São Paulo"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary filter-btn">Buscar</button>
            </form>
            {filters.city && (
              <button className="clear-filter-btn" onClick={clearCityFilter}>
                ✕ Limpar filtro de cidade
              </button>
            )}
          </div>

          <div className="filter-group">
            <label className="filter-label">Modalidade</label>
            <div className="filter-options">
              {MODALITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`filter-chip ${filters.modality === opt.value ? 'active' : ''}`}
                  onClick={() => applyFilter('modality', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Nível</label>
            <div className="filter-options">
              {LEVEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`filter-chip ${filters.seniority_level === opt.value ? 'active' : ''}`}
                  onClick={() => applyFilter('seniority_level', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Feed de vagas */}
        <main className="jobs-feed">
          <div className="jobs-feed-header">
            <h2 className="jobs-feed-title">Vagas disponíveis</h2>
            {!loading && (
              <span className="jobs-feed-count">
                {total} {total === 1 ? 'vaga' : 'vagas'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="jobs-loading">
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : jobs.length === 0 ? (
            <div className="jobs-empty">
              <p>Nenhuma vaga encontrada com os filtros selecionados.</p>
              <button
                className="btn btn-outline"
                onClick={() => { setFilters({ modality: '', seniority_level: '', city: '' }); setCityInput(''); setPage(1); }}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="jobs-grid">
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && !loading && (
            <div className="jobs-pagination">
              <button
                className="btn btn-outline pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Anterior
              </button>
              <span className="pagination-info">
                Página {page} de {totalPages}
              </span>
              <button
                className="btn btn-outline pagination-btn"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próxima →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
