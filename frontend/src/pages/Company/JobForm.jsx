import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { companyService } from '../../services/companyService';
import './Company.css';

const EMPTY = {
  title:            '',
  area:             '',
  seniority_level:  'junior',
  modality:         'remote',
  city:             '',
  state:            '',
  workload:         '40h/semana',
  contract_type:    'clt',
  salary_min:       '',
  salary_max:       '',
  salary_disclosed: true,
  description:      '',
  benefits:         '',
  expires_at:       '',
  status:           'active',
};

export default function JobForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isEdit   = Boolean(id);

  const [form,    setForm]    = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
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

  // Skills
  const [allSkills,      setAllSkills]      = useState([]);   // catálogo completo [{id, name, category}]
  const [skills,         setSkills]         = useState([]);   // skills adicionadas [{skill_id, skill_name, is_required, min_score}]
  const [selectedSkillId, setSelectedSkillId] = useState('');

  // Carrega catálogo de skills
  useEffect(() => {
    companyService.getSkills().then(setAllSkills).catch(() => {});
  }, []);

  // Carrega dados da vaga (modo edição)
  useEffect(() => {
    if (!isEdit) return;
    companyService.getJob(id)
      .then(job => {
        setForm({
          title:            job.title            || '',
          area:             job.area             || '',
          seniority_level:  job.seniority_level  || 'junior',
          modality:         job.modality         || 'remote',
          city:             job.city             || '',
          state:            job.state            || '',
          workload:         job.workload         || '40h/semana',
          contract_type:    job.contract_type    || 'clt',
          salary_min:       job.salary_min       || '',
          salary_max:       job.salary_max       || '',
          salary_disclosed: Boolean(job.salary_disclosed),
          description:      job.description      || '',
          benefits:         job.benefits         || '',
          expires_at:       job.expires_at       ? job.expires_at.slice(0, 10) : '',
          status:           job.status           || 'active',
        });
        setSkills((job.skills ?? []).map(s => ({
          skill_id:    s.skill_id,
          skill_name:  s.skill_name,
          is_required: Boolean(s.is_required),
          min_score:   s.min_score ?? '',
        })));
      })
      .catch(() => navigate('/empresa'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Skills helpers
  function addSkill() {
    if (!selectedSkillId) return;
    const skill = allSkills.find(s => s.id === parseInt(selectedSkillId, 10));
    if (!skill || skills.some(s => s.skill_id === skill.id)) return;
    setSkills(prev => [...prev, { skill_id: skill.id, skill_name: skill.name, is_required: true, min_score: '' }]);
    setSelectedSkillId('');
  }

  function removeSkill(skillId) {
    setSkills(prev => prev.filter(s => s.skill_id !== skillId));
  }

  function updateSkill(skillId, key, value) {
    setSkills(prev => prev.map(s => s.skill_id === skillId ? { ...s, [key]: value } : s));
  }

  // Skills disponíveis para adicionar (exclui as já adicionadas)
  const availableSkills = allSkills.filter(s => !skills.some(added => added.skill_id === s.id));

  // Agrupar availableSkills por categoria para o <optgroup>
  const skillsByCategory = availableSkills.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const payload = {
      ...form,
      salary_min:       form.salary_min  ? parseFloat(form.salary_min)  : null,
      salary_max:       form.salary_max  ? parseFloat(form.salary_max)  : null,
      salary_disclosed: form.salary_disclosed ? 1 : 0,
      expires_at:       form.expires_at  || null,
      skills: skills.map(s => ({
        skill_id:    s.skill_id,
        is_required: s.is_required,
        min_score:   s.min_score !== '' ? parseInt(s.min_score, 10) : null,
      })),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await companyService.updateJob(id, payload);
      } else {
        await companyService.createJob(payload);
      }
      navigate('/empresa');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar vaga.');
    } finally {
      setSaving(false);
    }
  }

  const navbar = (
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
        <span className="company-nav__link company-nav__link--active">
          {isEdit ? 'Editar Vaga' : 'Nova Vaga'}
        </span>
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
  );

  if (loading) {
    return (
      <div className="company-page">
        {navbar}
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="company-page">
      {navbar}

      <div className="company-wrapper" style={{ maxWidth: 760 }}>
        <h1 className="company-section-title" style={{ marginBottom: 24 }}>
          {isEdit ? 'Editar Vaga' : 'Nova Vaga'}
        </h1>

        <form className="job-form-card" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          {/* Informações básicas */}
          <div className="job-form-section-title">Informações básicas</div>

          <div className="job-form-row">
            <div className="form-field flex-2">
              <label className="form-label">Título da vaga *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Ex: Desenvolvedor Front-end React"
                required
              />
            </div>
            <div className="form-field flex-1">
              <label className="form-label">Área *</label>
              <input
                className="form-input"
                value={form.area}
                onChange={e => set('area', e.target.value)}
                placeholder="Ex: Desenvolvimento Web"
                required
              />
            </div>
          </div>

          <div className="job-form-row">
            <div className="form-field">
              <label className="form-label">Nível *</label>
              <select className="form-select" value={form.seniority_level} onChange={e => set('seniority_level', e.target.value)}>
                <option value="intern">Estágio</option>
                <option value="junior">Júnior</option>
                <option value="mid">Pleno</option>
                <option value="senior">Sênior</option>
                <option value="specialist">Especialista</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Modalidade *</label>
              <select className="form-select" value={form.modality} onChange={e => set('modality', e.target.value)}>
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="on_site">Presencial</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Contrato *</label>
              <select className="form-select" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                <option value="clt">CLT</option>
                <option value="pj">PJ</option>
                <option value="internship">Estágio</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
          </div>

          <div className="job-form-row">
            <div className="form-field">
              <label className="form-label">Carga horária *</label>
              <input
                className="form-input"
                value={form.workload}
                onChange={e => set('workload', e.target.value)}
                placeholder="Ex: 40h/semana"
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">Cidade</label>
              <input
                className="form-input"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Ex: São Paulo"
              />
            </div>
            <div className="form-field" style={{ maxWidth: 100 }}>
              <label className="form-label">Estado</label>
              <input
                className="form-input"
                value={form.state}
                onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>

          {/* Remuneração */}
          <div className="job-form-section-title">Remuneração</div>

          <div className="job-form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-field">
              <label className="form-label">Salário mínimo (R$)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="100"
                value={form.salary_min}
                onChange={e => set('salary_min', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Salário máximo (R$)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="100"
                value={form.salary_max}
                onChange={e => set('salary_max', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-field" style={{ justifyContent: 'flex-end' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.salary_disclosed}
                  onChange={e => set('salary_disclosed', e.target.checked)}
                />
                <span>Exibir salário na vaga</span>
              </label>
            </div>
          </div>

          {/* Competências */}
          <div className="job-form-section-title">Competências</div>

          <div className="skills-picker-row">
            <select
              className="form-select"
              value={selectedSkillId}
              onChange={e => setSelectedSkillId(e.target.value)}
            >
              <option value="">Selecione uma competência...</option>
              {Object.entries(skillsByCategory).map(([cat, catSkills]) => (
                <optgroup key={cat} label={cat}>
                  {catSkills.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-outline"
              onClick={addSkill}
              disabled={!selectedSkillId}
              style={{ flexShrink: 0 }}
            >
              + Adicionar
            </button>
          </div>

          {skills.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Nenhuma competência adicionada. Vagas sem competências obrigatórias geram 100% de match para todos os candidatos.
            </p>
          ) : (
            <div className="skills-list">
              {skills.map(s => (
                <div key={s.skill_id} className="skill-form-row">
                  <span className="skill-form-name">{s.skill_name}</span>

                  <div className="skill-form-controls">
                    <label className="skill-toggle">
                      <input
                        type="radio"
                        name={`req-${s.skill_id}`}
                        checked={s.is_required}
                        onChange={() => updateSkill(s.skill_id, 'is_required', true)}
                      />
                      <span className={s.is_required ? 'badge badge-required' : 'badge badge-info'}>
                        Obrigatória
                      </span>
                    </label>
                    <label className="skill-toggle">
                      <input
                        type="radio"
                        name={`req-${s.skill_id}`}
                        checked={!s.is_required}
                        onChange={() => updateSkill(s.skill_id, 'is_required', false)}
                      />
                      <span className={!s.is_required ? 'badge badge-optional' : 'badge badge-info'}>
                        Diferencial
                      </span>
                    </label>
                  </div>

                  {s.is_required && (
                    <div className="skill-min-score">
                      <label className="skill-min-score-label">Pontuação mínima</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max="100"
                        value={s.min_score}
                        onChange={e => updateSkill(s.skill_id, 'min_score', e.target.value)}
                        placeholder="0–100"
                        style={{ width: 90 }}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="skill-remove-btn"
                    onClick={() => removeSkill(s.skill_id)}
                    aria-label="Remover"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Descrição */}
          <div className="job-form-section-title">Descrição e Benefícios</div>

          <div className="form-field">
            <label className="form-label">Descrição da vaga *</label>
            <textarea
              className="form-textarea"
              rows={8}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Descreva as responsabilidades, requisitos e diferenciais da vaga..."
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Benefícios</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.benefits}
              onChange={e => set('benefits', e.target.value)}
              placeholder="Ex: Vale refeição, Plano de saúde, Home office..."
            />
          </div>

          {/* Publicação */}
          <div className="job-form-section-title">Publicação</div>

          <div className="job-form-row">
            <div className="form-field">
              <label className="form-label">Expira em</label>
              <input
                className="form-input"
                type="date"
                value={form.expires_at}
                onChange={e => set('expires_at', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Publicar agora</option>
                <option value="draft">Salvar como rascunho</option>
              </select>
            </div>
          </div>

          <div className="job-form-actions">
            <Link to="/empresa" className="btn btn-outline">Cancelar</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Publicar vaga'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
