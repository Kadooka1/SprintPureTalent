import { useState, useRef } from 'react';
import { candidateService } from '../../services/candidateService';
import { fetchAddressByCep } from '../../services/viaCep';

const STEPS = ['Dados Pessoais', 'Localização', 'Preferências', 'Formação', 'Experiência'];

const DEGREE_LABELS = {
  technical:     'Técnico',
  undergraduate: 'Graduação',
  postgraduate:  'Pós-graduação',
  mba:           'MBA',
  masters:       'Mestrado',
  phd:           'Doutorado',
};

const STATUS_LABELS = {
  studying:    'Cursando',
  completed:   'Concluído',
  interrupted: 'Interrompido',
};

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

const AVAILABILITY_LABELS = {
  immediate:  'Imediata',
  '15_days':  '15 dias',
  '30_days':  '30 dias',
  negotiable: 'Negociável',
};

function maskCPF(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCEP(v) {
  return v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

export default function ProfileForm({ profile, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Step 1: Dados Pessoais ─────────────────────────────────
  const [personal, setPersonal] = useState({
    full_name:  profile?.full_name  || '',
    cpf:        profile?.cpf        || '',
    birth_date: profile?.birth_date?.slice(0, 10) || '',
    gender:     profile?.gender     || '',
    phone:      profile?.phone      || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(
    profile?.avatar_url || null
  );
  const avatarInputRef = useRef();

  // ── Step 2: Localização ────────────────────────────────────
  const [location, setLocation] = useState({
    zip_code:            profile?.zip_code            || '',
    street:              profile?.street              || '',
    city:                profile?.city               || '',
    state:               profile?.state              || '',
    country:             profile?.country            || 'Brasil',
    willing_to_relocate: profile?.willing_to_relocate || '',
  });
  const [cepLoading, setCepLoading] = useState(false);

  // ── Step 3: Preferências ───────────────────────────────────
  const [prefs, setPrefs] = useState({
    work_modality:    profile?.work_modality    || '',
    experience_level: profile?.experience_level || '',
    salary_min:       profile?.salary_min       || '',
    salary_max:       profile?.salary_max       || '',
    availability:     profile?.availability     || '',
  });

  // ── Step 4: Formação ───────────────────────────────────────
  const [educations, setEducations] = useState(profile?.educations || []);
  const [showEduForm, setShowEduForm] = useState(false);
  const [editingEdu, setEditingEdu]   = useState(null);
  const emptyEdu = { institution: '', course: '', degree: '', status: '', start_year: '', end_year: '' };
  const [eduData, setEduData] = useState(emptyEdu);

  // ── Step 5: Experiência ────────────────────────────────────
  const [experiences, setExperiences] = useState(profile?.experiences || []);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp]   = useState(null);
  const emptyExp = { company_name: '', job_title: '', started_at: '', ended_at: '', description: '' };
  const [expData, setExpData] = useState(emptyExp);

  // ── Helpers ────────────────────────────────────────────────

  function p(setter) {
    return (e) => setter(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    try {
      await candidateService.uploadAvatar(file);
    } catch {
      setError('Erro ao enviar foto.');
    }
  }

  async function handleCepBlur() {
    const raw = location.zip_code.replace(/\D/g, '');
    if (raw.length !== 8) return;
    setCepLoading(true);
    try {
      const addr = await fetchAddressByCep(raw);
      setLocation(prev => ({ ...prev, ...addr }));
    } catch {
      setError('CEP não encontrado.');
    } finally {
      setCepLoading(false);
    }
  }

  // ── Salvar cada step ───────────────────────────────────────

  async function saveStep() {
    setError('');
    setSaving(true);
    try {
      if (step === 0) {
        if (!personal.full_name.trim()) throw new Error('Nome é obrigatório.');
        if (!personal.gender)          throw new Error('Selecione o gênero.');
        await candidateService.updateProfile({
          full_name:  personal.full_name.trim(),
          cpf:        personal.cpf.replace(/\D/g, '') || null,
          birth_date: personal.birth_date || null,
          gender:     personal.gender,
          phone:      personal.phone || null,
        });
      }
      if (step === 1) {
        if (!location.city || !location.state) throw new Error('Preencha cidade e estado.');
        await candidateService.updateProfile({
          zip_code:            location.zip_code || null,
          street:              location.street   || null,
          city:                location.city,
          state:               location.state,
          country:             location.country  || 'Brasil',
          willing_to_relocate: location.willing_to_relocate || null,
        });
      }
      if (step === 2) {
        if (!prefs.work_modality)    throw new Error('Selecione a modalidade de trabalho.');
        if (!prefs.experience_level) throw new Error('Selecione o nível de experiência.');
        if (!prefs.availability)     throw new Error('Selecione a disponibilidade.');
        await candidateService.updateProfile({
          work_modality:    prefs.work_modality,
          experience_level: prefs.experience_level,
          salary_min:       prefs.salary_min || null,
          salary_max:       prefs.salary_max || null,
          availability:     prefs.availability,
        });
      }
      setStep(s => s + 1);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    setError('');
    setSaving(true);
    try {
      await candidateService.updateProfile({ profile_completed: 1 });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao concluir perfil.');
    } finally {
      setSaving(false);
    }
  }

  // ── Educação CRUD ──────────────────────────────────────────

  function openEduEdit(edu) {
    setEditingEdu(edu.id);
    setEduData({
      institution: edu.institution,
      course:      edu.course,
      degree:      edu.degree,
      status:      edu.status,
      start_year:  edu.start_year || '',
      end_year:    edu.end_year   || '',
    });
    setShowEduForm(true);
  }

  function openEduNew() {
    setEditingEdu(null);
    setEduData(emptyEdu);
    setShowEduForm(true);
  }

  async function saveEducation() {
    setError('');
    if (!eduData.institution || !eduData.course || !eduData.degree || !eduData.status) {
      setError('Preencha os campos obrigatórios da formação.');
      return;
    }
    setSaving(true);
    try {
      if (editingEdu) {
        await candidateService.updateEducation(editingEdu, eduData);
        setEducations(prev => prev.map(e => e.id === editingEdu ? { ...e, ...eduData } : e));
      } else {
        const saved = await candidateService.addEducation(eduData);
        setEducations(prev => [...prev, saved]);
      }
      setShowEduForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar formação.');
    } finally {
      setSaving(false);
    }
  }

  async function removeEducation(id) {
    try {
      await candidateService.deleteEducation(id);
      setEducations(prev => prev.filter(e => e.id !== id));
    } catch {
      setError('Erro ao remover formação.');
    }
  }

  // ── Experiência CRUD ───────────────────────────────────────

  function openExpEdit(exp) {
    setEditingExp(exp.id);
    setExpData({
      company_name: exp.company_name,
      job_title:    exp.job_title,
      started_at:   exp.started_at?.slice(0, 10) || '',
      ended_at:     exp.ended_at?.slice(0, 10)   || '',
      description:  exp.description || '',
    });
    setShowExpForm(true);
  }

  function openExpNew() {
    setEditingExp(null);
    setExpData(emptyExp);
    setShowExpForm(true);
  }

  async function saveExperience() {
    setError('');
    if (!expData.company_name || !expData.job_title || !expData.started_at) {
      setError('Preencha os campos obrigatórios da experiência.');
      return;
    }
    setSaving(true);
    try {
      if (editingExp) {
        await candidateService.updateExperience(editingExp, expData);
        setExperiences(prev => prev.map(e => e.id === editingExp ? { ...e, ...expData } : e));
      } else {
        const saved = await candidateService.addExperience(expData);
        setExperiences(prev => [...prev, saved]);
      }
      setShowExpForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar experiência.');
    } finally {
      setSaving(false);
    }
  }

  async function removeExperience(id) {
    try {
      await candidateService.deleteExperience(id);
      setExperiences(prev => prev.filter(e => e.id !== id));
    } catch {
      setError('Erro ao remover experiência.');
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="wizard-wrapper">
      <div className="wizard-card">

        {/* Steps indicator */}
        <div className="wizard-steps">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={`step-item ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}
            >
              <div className="step-circle">
                {i < step ? '✓' : i + 1}
              </div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="wizard-body">
          <h2 className="wizard-title">{STEPS[step]}</h2>
          <p className="wizard-subtitle">
            {step === 0 && 'Confirme seus dados pessoais e adicione uma foto.'}
            {step === 1 && 'Onde você mora? Vamos preencher pelo CEP.'}
            {step === 2 && 'Suas preferências profissionais para o sistema de match.'}
            {step === 3 && 'Adicione sua formação acadêmica (opcional).'}
            {step === 4 && 'Adicione sua experiência profissional (opcional).'}
          </p>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* ── Step 1 ── */}
          {step === 0 && (
            <>
              <div className="avatar-upload-area">
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" className="avatar-preview" />
                  : <div className="avatar-placeholder">👤</div>
                }
                <div>
                  <button
                    type="button"
                    className="btn btn-outline avatar-upload-btn"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    JPEG, PNG ou WebP · Máx. 5MB
                  </p>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nome completo *</label>
                <input name="full_name" className="form-control" value={personal.full_name}
                  onChange={p(setPersonal)} placeholder="Seu nome completo" />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>CPF</label>
                  <input name="cpf" className="form-control" value={personal.cpf}
                    onChange={e => setPersonal(prev => ({ ...prev, cpf: maskCPF(e.target.value) }))}
                    placeholder="000.000.000-00" />
                </div>
                <div className="form-group">
                  <label>Gênero *</label>
                  <select name="gender" className="form-control" value={personal.gender}
                    onChange={p(setPersonal)}>
                    <option value="">Selecione</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="non_binary">Não-binário</option>
                    <option value="prefer_not_to_say">Prefiro não informar</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Data de nascimento</label>
                  <input name="birth_date" type="date" className="form-control"
                    value={personal.birth_date} onChange={p(setPersonal)} />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input name="phone" className="form-control" value={personal.phone}
                    onChange={e => setPersonal(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                    placeholder="(11) 99999-9999" />
                </div>
              </div>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 1 && (
            <>
              <div className="cep-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>CEP</label>
                  <input
                    name="zip_code"
                    className="form-control"
                    value={location.zip_code}
                    onChange={e => setLocation(prev => ({ ...prev, zip_code: maskCEP(e.target.value) }))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Logradouro</label>
                  <input name="street" className="form-control" value={location.street}
                    onChange={p(setLocation)} placeholder={cepLoading ? 'Buscando...' : 'Rua, Avenida...'} />
                </div>
              </div>

              <div className="form-row-3" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label>Cidade *</label>
                  <input name="city" className="form-control" value={location.city}
                    onChange={p(setLocation)} placeholder="Cidade" />
                </div>
                <div className="form-group">
                  <label>Estado *</label>
                  <input name="state" className="form-control" value={location.state}
                    onChange={p(setLocation)} placeholder="UF" maxLength={2}
                    style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label>País</label>
                  <input name="country" className="form-control" value={location.country}
                    onChange={p(setLocation)} />
                </div>
              </div>

              <div className="form-group">
                <label>Disponibilidade para mudança</label>
                <select name="willing_to_relocate" className="form-control"
                  value={location.willing_to_relocate} onChange={p(setLocation)}>
                  <option value="">Selecione</option>
                  <option value="yes">Sim, disponível para mudança</option>
                  <option value="no">Não, prefiro ficar na minha cidade</option>
                  <option value="negotiable">Negociável</option>
                </select>
              </div>
            </>
          )}

          {/* ── Step 3 ── */}
          {step === 2 && (
            <>
              <div className="form-group">
                <label>Modalidade de trabalho *</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.entries(MODALITY_LABELS).map(([val, label]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input type="radio" name="work_modality" value={val}
                        checked={prefs.work_modality === val}
                        onChange={p(setPrefs)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Nível de experiência *</label>
                <select name="experience_level" className="form-control"
                  value={prefs.experience_level} onChange={p(setPrefs)}>
                  <option value="">Selecione</option>
                  {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Pretensão salarial (R$)</label>
                <div className="salary-row">
                  <input name="salary_min" type="number" className="form-control"
                    value={prefs.salary_min} onChange={p(setPrefs)} placeholder="Mínimo" min={0} />
                  <span className="salary-sep">–</span>
                  <input name="salary_max" type="number" className="form-control"
                    value={prefs.salary_max} onChange={p(setPrefs)} placeholder="Máximo" min={0} />
                </div>
              </div>

              <div className="form-group">
                <label>Disponibilidade para início *</label>
                <select name="availability" className="form-control"
                  value={prefs.availability} onChange={p(setPrefs)}>
                  <option value="">Selecione</option>
                  {Object.entries(AVAILABILITY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── Step 4: Formação ── */}
          {step === 3 && (
            <div className="list-section">
              {educations.length === 0 && !showEduForm && (
                <div className="list-empty">Nenhuma formação adicionada ainda.</div>
              )}

              {educations.map(edu => (
                <div key={edu.id} className="item-card">
                  <div className="item-card-header">
                    <div>
                      <p className="item-card-title">{edu.course}</p>
                      <p className="item-card-sub">{edu.institution}</p>
                      <p className="item-card-sub">
                        {DEGREE_LABELS[edu.degree]} · <span className="item-card-badge">{STATUS_LABELS[edu.status]}</span>
                        {edu.start_year && ` · ${edu.start_year}${edu.end_year ? ' – ' + edu.end_year : ' – atual'}`}
                      </p>
                    </div>
                    <div className="item-card-actions">
                      <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 13 }}
                        onClick={() => openEduEdit(edu)}>Editar</button>
                      <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#fee', color: '#c00', border: '1px solid #fcc' }}
                        onClick={() => removeEducation(edu.id)}>Remover</button>
                    </div>
                  </div>
                </div>
              ))}

              {showEduForm && (
                <div className="inline-form-card">
                  <p className="inline-form-title">{editingEdu ? 'Editar formação' : 'Nova formação'}</p>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Instituição *</label>
                      <input name="institution" className="form-control" value={eduData.institution}
                        onChange={p(setEduData)} placeholder="Nome da instituição" />
                    </div>
                    <div className="form-group">
                      <label>Curso *</label>
                      <input name="course" className="form-control" value={eduData.course}
                        onChange={p(setEduData)} placeholder="Nome do curso" />
                    </div>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Grau *</label>
                      <select name="degree" className="form-control" value={eduData.degree}
                        onChange={p(setEduData)}>
                        <option value="">Selecione</option>
                        {Object.entries(DEGREE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status *</label>
                      <select name="status" className="form-control" value={eduData.status}
                        onChange={p(setEduData)}>
                        <option value="">Selecione</option>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Ano de início</label>
                      <input name="start_year" type="number" className="form-control" value={eduData.start_year}
                        onChange={p(setEduData)} placeholder="2020" min={1990} max={2100} />
                    </div>
                    <div className="form-group">
                      <label>Ano de conclusão</label>
                      <input name="end_year" type="number" className="form-control" value={eduData.end_year}
                        onChange={p(setEduData)} placeholder="Em curso = deixe vazio" min={1990} max={2100} />
                    </div>
                  </div>
                  <div className="inline-form-actions">
                    <button type="button" className="btn btn-outline" onClick={() => setShowEduForm(false)}>Cancelar</button>
                    <button type="button" className="btn btn-primary" onClick={saveEducation} disabled={saving}>
                      {saving ? <span className="spinner" /> : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {!showEduForm && (
                <button type="button" className="btn btn-outline" onClick={openEduNew}
                  style={{ alignSelf: 'flex-start' }}>
                  + Adicionar formação
                </button>
              )}
            </div>
          )}

          {/* ── Step 5: Experiência ── */}
          {step === 4 && (
            <div className="list-section">
              {experiences.length === 0 && !showExpForm && (
                <div className="list-empty">Nenhuma experiência adicionada ainda.</div>
              )}

              {experiences.map(exp => (
                <div key={exp.id} className="item-card">
                  <div className="item-card-header">
                    <div>
                      <p className="item-card-title">{exp.job_title}</p>
                      <p className="item-card-sub">{exp.company_name}</p>
                      <p className="item-card-sub">
                        {exp.started_at?.slice(0, 7)} – {exp.ended_at ? exp.ended_at.slice(0, 7) : 'atual'}
                      </p>
                      {exp.description && (
                        <p className="item-card-sub" style={{ marginTop: 4, maxWidth: 420 }}>{exp.description}</p>
                      )}
                    </div>
                    <div className="item-card-actions">
                      <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 13 }}
                        onClick={() => openExpEdit(exp)}>Editar</button>
                      <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#fee', color: '#c00', border: '1px solid #fcc' }}
                        onClick={() => removeExperience(exp.id)}>Remover</button>
                    </div>
                  </div>
                </div>
              ))}

              {showExpForm && (
                <div className="inline-form-card">
                  <p className="inline-form-title">{editingExp ? 'Editar experiência' : 'Nova experiência'}</p>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Empresa *</label>
                      <input name="company_name" className="form-control" value={expData.company_name}
                        onChange={p(setExpData)} placeholder="Nome da empresa" />
                    </div>
                    <div className="form-group">
                      <label>Cargo *</label>
                      <input name="job_title" className="form-control" value={expData.job_title}
                        onChange={p(setExpData)} placeholder="Desenvolvedor, Designer..." />
                    </div>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Data de início *</label>
                      <input name="started_at" type="date" className="form-control"
                        value={expData.started_at} onChange={p(setExpData)} />
                    </div>
                    <div className="form-group">
                      <label>Data de saída</label>
                      <input name="ended_at" type="date" className="form-control"
                        value={expData.ended_at} onChange={p(setExpData)}
                        placeholder="Vazio = emprego atual" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Descrição das atividades</label>
                    <textarea name="description" className="form-control" rows={3}
                      value={expData.description} onChange={p(setExpData)}
                      placeholder="Descreva brevemente suas responsabilidades..." />
                  </div>
                  <div className="inline-form-actions">
                    <button type="button" className="btn btn-outline" onClick={() => setShowExpForm(false)}>Cancelar</button>
                    <button type="button" className="btn btn-primary" onClick={saveExperience} disabled={saving}>
                      {saving ? <span className="spinner" /> : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {!showExpForm && (
                <button type="button" className="btn btn-outline" onClick={openExpNew}
                  style={{ alignSelf: 'flex-start' }}>
                  + Adicionar experiência
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="wizard-nav">
          <button type="button" className="btn btn-outline"
            onClick={() => { setError(''); setStep(s => s - 1); }}
            disabled={step === 0 || saving}>
            ← Anterior
          </button>

          {step < 4 ? (
            <button type="button" className="btn btn-primary"
              onClick={saveStep} disabled={saving}>
              {saving ? <span className="spinner" /> : 'Próximo →'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary"
              onClick={handleFinish} disabled={saving}>
              {saving ? <span className="spinner" /> : 'Concluir Perfil ✓'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
