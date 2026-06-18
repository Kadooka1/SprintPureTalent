import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import './Admin.css';

// ── Helpers ───────────────────────────────────────────────────

const ROLE_LABELS = { candidate: 'Candidato', company: 'Empresa', admin: 'Admin' };
const JOB_STATUS_LABELS = {
  active: 'Ativa', pending_review: 'Aguardando revisão',
  closed: 'Encerrada', rejected: 'Rejeitada', draft: 'Rascunho',
};
const CERT_STATUS_LABELS = {
  pending: 'Pendente', processing: 'Processando',
  validated: 'Validado', manual_review: 'Revisão manual', rejected: 'Rejeitado',
};
const LEVEL_LABELS = { intern: 'Estágio', junior: 'Júnior', mid: 'Pleno', senior: 'Sênior', specialist: 'Especialista' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function Badge({ label, type }) {
  return <span className={`adm-badge adm-badge-${type}`}>{label}</span>;
}

function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="adm-pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      <span>{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}

// ── Gráficos SVG ──────────────────────────────────────────────

function BarChart({ title, bars, maxVal }) {
  const max = maxVal || Math.max(...bars.map(b => b.value), 1);
  return (
    <div className="adm-chart-card">
      <h4 className="adm-chart-title">{title}</h4>
      <div className="adm-bars">
        {bars.map(b => (
          <div key={b.label} className="adm-bar-row">
            <span className="adm-bar-label">{b.label}</span>
            <div className="adm-bar-track">
              <div
                className="adm-bar-fill"
                style={{ width: `${Math.round((b.value / max) * 100)}%`, background: b.color }}
              />
            </div>
            <span className="adm-bar-value">{b.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ title, slices }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  const R = 54, cx = 64, cy = 64, stroke = 20;
  const circumference = 2 * Math.PI * R;
  let offset = 0;

  const paths = slices.filter(s => s.value > 0).map(s => {
    const pct   = s.value / total;
    const dash  = pct * circumference;
    const el = (
      <circle
        key={s.label}
        cx={cx} cy={cy} r={R}
        fill="none"
        stroke={s.color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div className="adm-chart-card">
      <h4 className="adm-chart-title">{title}</h4>
      <div className="adm-donut-wrap">
        <svg viewBox="0 0 128 128" className="adm-donut-svg">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
          {paths}
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="#111">{total}</text>
        </svg>
        <div className="adm-donut-legend">
          {slices.map(s => (
            <div key={s.label} className="adm-legend-row">
              <span className="adm-legend-dot" style={{ background: s.color }} />
              <span className="adm-legend-label">{s.label}</span>
              <span className="adm-legend-val">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Aba: Dashboard ────────────────────────────────────────────

function TabDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminService.getDashboard().then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div className="adm-loading"><span className="spinner" /></div>;

  const topCards = [
    { label: 'Usuários cadastrados', value: stats.users.total,              sub: `${stats.users.candidates} candidatos · ${stats.users.companies} empresas`, color: 'blue' },
    { label: 'Vagas pendentes',      value: stats.jobs.pending_review,      sub: `${stats.jobs.active} ativas no feed público`,                             color: 'yellow' },
    { label: 'Revisão manual',       value: stats.certificates.manual_review, sub: 'certificados aguardando admin',                                         color: 'red' },
    { label: 'Candidaturas',         value: stats.applications.total,       sub: 'total no sistema',                                                        color: 'green' },
  ];

  return (
    <div>
      <h2 className="adm-section-title">Visão Geral</h2>

      {/* Stat cards topo */}
      <div className="adm-stats-grid" style={{ marginBottom: 28 }}>
        {topCards.map(c => (
          <div key={c.label} className={`adm-stat-card adm-stat-${c.color}`}>
            <div className="adm-stat-value">{c.value}</div>
            <div className="adm-stat-label">{c.label}</div>
            <div className="adm-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="adm-charts-grid">
        <DonutChart
          title="Vagas por status"
          slices={[
            { label: 'Ativas',       value: stats.jobs.active,         color: '#22C55E' },
            { label: 'Pendentes',    value: stats.jobs.pending_review,  color: '#EAB308' },
            { label: 'Encerradas',   value: stats.jobs.closed,         color: '#9CA3AF' },
            { label: 'Rejeitadas',   value: stats.jobs.rejected,       color: '#EF4444' },
            { label: 'Rascunho',     value: stats.jobs.draft,          color: '#D1D5DB' },
          ]}
        />

        <BarChart
          title="Certificados por status"
          bars={[
            { label: 'Validados',     value: stats.certificates.validated,    color: '#22C55E' },
            { label: 'Rev. manual',   value: stats.certificates.manual_review, color: '#EAB308' },
            { label: 'Rejeitados',    value: stats.certificates.rejected,     color: '#EF4444' },
            { label: 'Pendentes',     value: stats.certificates.pending,      color: '#9CA3AF' },
          ]}
        />

        <DonutChart
          title="Distribuição de usuários"
          slices={[
            { label: 'Candidatos', value: stats.users.candidates, color: '#3B82F6' },
            { label: 'Empresas',   value: stats.users.companies,  color: '#A855F7' },
          ]}
        />
      </div>

      {/* Linha extra: chamadas de IA */}
      <div className="adm-extra-stat">
        <span className="adm-extra-val">{stats.ai_logs.total}</span>
        <span className="adm-extra-label">chamadas de IA registradas no sistema</span>
      </div>
    </div>
  );
}

// ── Aba: Usuários ─────────────────────────────────────────────

function TabUsers() {
  const [data,       setData]       = useState(null);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [role,       setRole]       = useState('');
  const [loading,    setLoading]    = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // user object

  const load = useCallback(() => {
    setLoading(true);
    adminService.getUsers({ page, search, role, limit: 15 })
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [page, search, role]);

  useEffect(() => { load(); }, [load]);

  async function toggle(id) {
    const res = await adminService.toggleUser(id);
    setData(d => ({ ...d, users: d.users.map(u => u.id === id ? { ...u, is_active: res.is_active } : u) }));
  }

  async function confirmDelete() {
    await adminService.deleteUser(confirmDel.id);
    setData(d => ({ ...d, users: d.users.filter(u => u.id !== confirmDel.id), total: d.total - 1 }));
    setConfirmDel(null);
  }

  return (
    <div>
      <h2 className="adm-section-title">Usuários</h2>
      <div className="adm-filters">
        <input className="adm-input" placeholder="Buscar por e-mail..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="adm-select" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}>
          <option value="">Candidatos e Empresas</option>
          <option value="candidate">Candidatos</option>
          <option value="company">Empresas</option>
        </select>
      </div>

      {loading && <div className="adm-loading"><span className="spinner" /></div>}
      {!loading && data && (
        <>
          <table className="adm-table">
            <thead><tr>
              <th>Nome / E-mail</th><th>Papel</th><th>Cadastro</th><th>Status</th><th>Ações</th>
            </tr></thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="adm-cell-title">{u.display_name || '—'}</div>
                    <div className="adm-cell-sub">{u.email}</div>
                  </td>
                  <td><Badge label={ROLE_LABELS[u.role]} type={u.role} /></td>
                  <td className="adm-cell-muted">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>
                    {u.is_active ? <Badge label="Ativo" type="active" /> : <Badge label="Inativo" type="inactive" />}
                  </td>
                  <td>
                    <div className="adm-action-group">
                      <button
                        className={`adm-btn-sm ${u.is_active ? 'adm-btn-warning' : 'adm-btn-success'}`}
                        onClick={() => toggle(u.id)}
                      >
                        {u.is_active ? 'Suspender' : 'Reativar'}
                      </button>
                      <button className="adm-btn-sm adm-btn-danger" onClick={() => setConfirmDel(u)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.users.length === 0 && (
                <tr><td colSpan={5} className="adm-empty">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} total={data.total} limit={15} onChange={setPage} />
        </>
      )}

      {/* Confirmar exclusão */}
      {confirmDel && (
        <div className="adm-modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="adm-modal adm-modal-sm" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">Excluir usuário</h3>
            <p className="adm-modal-body">
              Tem certeza que deseja excluir <strong>{confirmDel.display_name || confirmDel.email}</strong>?
              <br />Esta ação não pode ser desfeita.
            </p>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-danger" onClick={confirmDelete}>Excluir</button>
              <button className="adm-btn adm-btn-outline" onClick={() => setConfirmDel(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba: Empresas ─────────────────────────────────────────────

function TabCompanies() {
  const [data,    setData]    = useState(null);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminService.getCompanies({ page, search, limit: 15 })
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function toggleVerify(id) {
    const res = await adminService.toggleCompanyVerified(id);
    setData(d => ({ ...d, companies: d.companies.map(c => c.id === id ? { ...c, is_verified: res.is_verified } : c) }));
  }

  return (
    <div>
      <h2 className="adm-section-title">Empresas</h2>
      <div className="adm-filters">
        <input className="adm-input" placeholder="Buscar por nome ou e-mail..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {loading && <div className="adm-loading"><span className="spinner" /></div>}
      {!loading && data && (
        <>
          <table className="adm-table">
            <thead><tr>
              <th>Empresa</th><th>Setor</th><th>Vagas</th><th>Conta</th><th>Verificada</th><th>Ação</th>
            </tr></thead>
            <tbody>
              {data.companies.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="adm-cell-title">{c.trade_name}</div>
                    <div className="adm-cell-sub">{c.email}</div>
                  </td>
                  <td className="adm-cell-muted">{c.sector}</td>
                  <td className="adm-cell-muted">{c.total_jobs}</td>
                  <td>{c.is_active ? <Badge label="Ativa" type="active" /> : <Badge label="Inativa" type="inactive" />}</td>
                  <td>{c.is_verified ? <Badge label="Verificada" type="active" /> : <Badge label="Não verificada" type="inactive" />}</td>
                  <td>
                    <button
                      className={`adm-btn-sm ${c.is_verified ? 'adm-btn-outline' : 'adm-btn-success'}`}
                      onClick={() => toggleVerify(c.id)}
                    >
                      {c.is_verified ? 'Desverificar' : 'Verificar'}
                    </button>
                  </td>
                </tr>
              ))}
              {data.companies.length === 0 && (
                <tr><td colSpan={6} className="adm-empty">Nenhuma empresa encontrada.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} total={data.total} limit={15} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Aba: Vagas ────────────────────────────────────────────────

function TabJobs() {
  const [data,       setData]       = useState(null);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [statusF,    setStatusF]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [moderating, setModerating] = useState(null);
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminService.getJobs({ page, search, status: statusF, limit: 15 })
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [page, search, statusF]);

  useEffect(() => { load(); }, [load]);

  function openModerate(job) { setModerating(job); setNotes(job.admin_notes || ''); }
  function closeModerate()   { setModerating(null); setNotes(''); }

  async function submitModerate(status) {
    setSaving(true);
    try {
      await adminService.moderateJob(moderating.id, status, notes);
      setData(d => ({ ...d, jobs: d.jobs.map(j => j.id === moderating.id ? { ...j, status, admin_notes: notes } : j) }));
      closeModerate();
    } finally { setSaving(false); }
  }

  async function confirmDelete() {
    await adminService.deleteJob(confirmDel.id);
    setData(d => ({ ...d, jobs: d.jobs.filter(j => j.id !== confirmDel.id), total: d.total - 1 }));
    setConfirmDel(null);
    closeModerate();
  }

  const jobStatusBadge = s => {
    const map = { active: 'active', pending_review: 'yellow', closed: 'inactive', rejected: 'danger', draft: 'muted' };
    return <Badge label={JOB_STATUS_LABELS[s] ?? s} type={map[s] ?? 'muted'} />;
  };

  return (
    <div>
      <h2 className="adm-section-title">Vagas</h2>
      <div className="adm-filters">
        <input className="adm-input" placeholder="Buscar por título..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="adm-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">Todos os status</option>
          <option value="pending_review">Aguardando revisão</option>
          <option value="active">Ativas</option>
          <option value="closed">Encerradas</option>
          <option value="rejected">Rejeitadas</option>
          <option value="draft">Rascunho</option>
        </select>
      </div>

      {loading && <div className="adm-loading"><span className="spinner" /></div>}
      {!loading && data && (
        <>
          <table className="adm-table">
            <thead><tr>
              <th>Vaga</th><th>Nível</th><th>Candidaturas</th><th>Status</th><th>Ações</th>
            </tr></thead>
            <tbody>
              {data.jobs.map(j => (
                <tr key={j.id} className={j.status === 'pending_review' ? 'adm-row-highlight' : ''}>
                  <td>
                    <div className="adm-cell-title">{j.title}</div>
                    <div className="adm-cell-sub">{j.company_name}{j.company_verified ? ' ✓' : ''}</div>
                  </td>
                  <td className="adm-cell-muted">{LEVEL_LABELS[j.seniority_level]}</td>
                  <td className="adm-cell-muted">{j.applicant_count}</td>
                  <td>{jobStatusBadge(j.status)}</td>
                  <td>
                    <div className="adm-action-group">
                      <button className="adm-btn-sm adm-btn-outline" onClick={() => openModerate(j)}>Moderar</button>
                      <button className="adm-btn-sm adm-btn-danger"  onClick={() => setConfirmDel(j)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.jobs.length === 0 && (
                <tr><td colSpan={5} className="adm-empty">Nenhuma vaga encontrada.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} total={data.total} limit={15} onChange={setPage} />
        </>
      )}

      {/* Modal de moderação */}
      {moderating && (
        <div className="adm-modal-overlay" onClick={closeModerate}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">Moderar vaga</h3>
            <p className="adm-modal-sub">{moderating.title} — {moderating.company_name}</p>
            <p className="adm-modal-sub">Status atual: <strong>{JOB_STATUS_LABELS[moderating.status]}</strong></p>
            <label className="adm-label">Observações (opcional)</label>
            <textarea
              className="adm-textarea" rows={3}
              placeholder="Motivo da decisão..." value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-success"  disabled={saving} onClick={() => submitModerate('active')}>
                Aprovar
              </button>
              <button className="adm-btn adm-btn-warning"  disabled={saving} onClick={() => submitModerate('closed')}>
                Suspender
              </button>
              <button className="adm-btn adm-btn-danger"   disabled={saving} onClick={() => submitModerate('rejected')}>
                Rejeitar
              </button>
              <button className="adm-btn adm-btn-outline"  onClick={closeModerate}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmDel && (
        <div className="adm-modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="adm-modal adm-modal-sm" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">Excluir vaga</h3>
            <p className="adm-modal-body">
              Tem certeza que deseja excluir <strong>{confirmDel.title}</strong>?
              <br />A vaga será removida do feed público e não poderá ser recuperada.
            </p>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-danger" onClick={confirmDelete}>Excluir</button>
              <button className="adm-btn adm-btn-outline" onClick={() => setConfirmDel(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba: Certificados ─────────────────────────────────────────

function TabCerts() {
  const [data,       setData]       = useState(null);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [statusF,    setStatusF]    = useState('manual_review');
  const [loading,    setLoading]    = useState(false);
  const [moderating, setModerating] = useState(null);
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminService.getCertificates({ page, search, status: statusF, limit: 15 })
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [page, search, statusF]);

  useEffect(() => { load(); }, [load]);

  function openModerate(cert) { setModerating(cert); setNotes(cert.admin_notes || ''); }
  function closeModerate()    { setModerating(null); setNotes(''); }

  async function submitModerate(status) {
    setSaving(true);
    try {
      await adminService.moderateCert(moderating.id, status, notes);
      setData(d => ({
        ...d,
        certificates: d.certificates.map(c =>
          c.id === moderating.id ? { ...c, status, admin_notes: notes, admin_override: 1 } : c
        ),
      }));
      closeModerate();
    } finally { setSaving(false); }
  }

  const certBadge = s => {
    const map = { validated: 'active', manual_review: 'yellow', rejected: 'danger', pending: 'muted', processing: 'blue' };
    return <Badge label={CERT_STATUS_LABELS[s] ?? s} type={map[s] ?? 'muted'} />;
  };

  return (
    <div>
      <h2 className="adm-section-title">Certificados</h2>
      <div className="adm-filters">
        <input className="adm-input" placeholder="Buscar por nome do curso..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="adm-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">Todos</option>
          <option value="manual_review">Revisão manual</option>
          <option value="validated">Validados</option>
          <option value="rejected">Rejeitados</option>
          <option value="pending">Pendentes</option>
        </select>
      </div>

      {loading && <div className="adm-loading"><span className="spinner" /></div>}
      {!loading && data && (
        <>
          <table className="adm-table">
            <thead><tr>
              <th>Certificado</th><th>Candidato</th><th>Confiança IA</th><th>Status</th><th>Ação</th>
            </tr></thead>
            <tbody>
              {data.certificates.map(c => (
                <tr key={c.id} className={c.status === 'manual_review' ? 'adm-row-highlight' : ''}>
                  <td>
                    <div className="adm-cell-title">{c.course_name}</div>
                    <div className="adm-cell-sub">{c.institution_name}</div>
                  </td>
                  <td className="adm-cell-muted">{c.candidate_name}</td>
                  <td className="adm-cell-muted">
                    {c.ai_confidence != null ? `${parseFloat(c.ai_confidence).toFixed(0)}%` : '—'}
                  </td>
                  <td>
                    {certBadge(c.status)}
                    {c.admin_override ? <span className="adm-override-tag">admin</span> : null}
                  </td>
                  <td>
                    {['manual_review', 'validated', 'rejected'].includes(c.status) && (
                      <button className="adm-btn-sm adm-btn-outline" onClick={() => openModerate(c)}>
                        Revisar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.certificates.length === 0 && (
                <tr><td colSpan={5} className="adm-empty">Nenhum certificado encontrado.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} total={data.total} limit={15} onChange={setPage} />
        </>
      )}

      {/* Modal de revisão de certificado */}
      {moderating && (
        <div className="adm-modal-overlay" onClick={closeModerate}>
          <div className="adm-modal adm-modal-cert" onClick={e => e.stopPropagation()}>
            <div className="adm-cert-modal-layout">

              {/* Preview do certificado */}
              <div className="adm-cert-preview">
                <p className="adm-cert-preview-label">Arquivo do certificado</p>
                {moderating.file_type === 'pdf' ? (
                  <div className="adm-cert-pdf">
                    <iframe
                      src={moderating.file_url}
                      title="Certificado"
                      className="adm-cert-iframe"
                    />
                    <a
                      href={moderating.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adm-cert-open-link"
                    >
                      Abrir PDF em nova aba ↗
                    </a>
                  </div>
                ) : (
                  <div className="adm-cert-image-wrap">
                    <img
                      src={moderating.file_url}
                      alt="Certificado"
                      className="adm-cert-image"
                    />
                    <a
                      href={moderating.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adm-cert-open-link"
                    >
                      Ver em tamanho completo ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Painel de decisão */}
              <div className="adm-cert-decision">
                <h3 className="adm-modal-title">{moderating.course_name}</h3>
                <p className="adm-modal-sub">{moderating.institution_name}</p>
                <p className="adm-modal-sub">Candidato: <strong>{moderating.candidate_name}</strong></p>
                {moderating.ai_confidence != null && (
                  <p className="adm-modal-sub">
                    Confiança IA: <strong>{parseFloat(moderating.ai_confidence).toFixed(0)}%</strong>
                    {parseFloat(moderating.ai_confidence) < 60 && (
                      <span className="adm-badge adm-badge-yellow" style={{ marginLeft: 6 }}>Abaixo do limiar</span>
                    )}
                  </p>
                )}

                <label className="adm-label" style={{ marginTop: 12 }}>
                  Observações <span style={{ color: '#ef4444', fontSize: 11 }}>(obrigatório ao rejeitar)</span>
                </label>
                <textarea
                  className="adm-textarea" rows={3}
                  placeholder="Justificativa para a decisão..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />

                <div className="adm-modal-actions" style={{ marginTop: 16 }}>
                  <button className="adm-btn adm-btn-success" disabled={saving} onClick={() => submitModerate('validated')}>
                    Validar
                  </button>
                  <button className="adm-btn adm-btn-danger"  disabled={saving || !notes.trim()} onClick={() => submitModerate('rejected')}>
                    Rejeitar
                  </button>
                  <button className="adm-btn adm-btn-outline" onClick={closeModerate}>Fechar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba: Logs de IA ───────────────────────────────────────────

function TabAiLogs() {
  const [data,     setData]     = useState(null);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminService.getAiLogs({ page, limit: 15 })
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function expandLog(id) {
    if (expanded?.id === id) { setExpanded(null); return; }
    const log = await adminService.getAiLog(id);
    setExpanded(log);
  }

  const certBadge = s => {
    const map = { validated: 'active', manual_review: 'yellow', rejected: 'danger', pending: 'muted', processing: 'blue' };
    return <Badge label={CERT_STATUS_LABELS[s] ?? s} type={map[s] ?? 'muted'} />;
  };

  return (
    <div>
      <h2 className="adm-section-title">Logs de IA</h2>
      {loading && <div className="adm-loading"><span className="spinner" /></div>}
      {!loading && data && (
        <>
          <table className="adm-table">
            <thead><tr>
              <th>Certificado</th><th>Candidato</th><th>Confiança</th><th>Tokens</th><th>Tempo</th><th>Status</th><th>Erro</th><th>Criado</th><th></th>
            </tr></thead>
            <tbody>
              {data.logs.map(l => (
                <>
                  <tr key={l.id} className={l.error_message ? 'adm-row-error' : ''}>
                    <td>
                      <div className="adm-cell-title">{l.course_name}</div>
                      <div className="adm-cell-sub">{l.institution_name}</div>
                    </td>
                    <td className="adm-cell-muted">{l.candidate_name}</td>
                    <td className="adm-cell-muted">
                      {l.ai_confidence != null ? `${parseFloat(l.ai_confidence).toFixed(0)}%` : '—'}
                    </td>
                    <td className="adm-cell-muted">{l.tokens_used ?? '—'}</td>
                    <td className="adm-cell-muted">{l.duration_ms ? `${l.duration_ms}ms` : '—'}</td>
                    <td>{certBadge(l.cert_status)}</td>
                    <td className="adm-cell-muted">{l.error_message ? '⚠️' : '—'}</td>
                    <td className="adm-cell-muted">{timeAgo(l.created_at)}</td>
                    <td>
                      <button className="adm-btn-sm adm-btn-outline" onClick={() => expandLog(l.id)}>
                        {expanded?.id === l.id ? 'Fechar' : 'Ver log'}
                      </button>
                    </td>
                  </tr>
                  {expanded?.id === l.id && (
                    <tr key={`${l.id}-exp`}>
                      <td colSpan={9} className="adm-log-expanded">
                        {expanded.error_message && (
                          <div className="adm-log-section">
                            <strong>Erro:</strong>
                            <pre>{expanded.error_message}</pre>
                          </div>
                        )}
                        <div className="adm-log-section">
                          <strong>Prompt enviado:</strong>
                          <pre>{expanded.prompt_sent}</pre>
                        </div>
                        <div className="adm-log-section">
                          <strong>Resposta da IA:</strong>
                          <pre>{(() => {
                            try { return JSON.stringify(JSON.parse(expanded.response_raw), null, 2); }
                            catch { return expanded.response_raw; }
                          })()}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {data.logs.length === 0 && (
                <tr><td colSpan={9} className="adm-empty">Nenhum log encontrado.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} total={data.total} limit={15} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Componente raiz ───────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard'    },
  { id: 'users',     label: 'Usuários'     },
  { id: 'companies', label: 'Empresas'     },
  { id: 'jobs',      label: 'Vagas'        },
  { id: 'certs',     label: 'Certificados' },
  { id: 'ai-logs',   label: 'Logs de IA'  },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMenu, setShowMenu]   = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="adm-page">
      <nav className="adm-navbar">
        <div className="adm-navbar__left">
          <Link to="/" className="adm-navbar__brand">
            <img src="/logo.png" alt="PureTalent" className="adm-navbar__logo" />
            <span className="adm-navbar__brand-text">
              <span className="nav-brand-pure">Pure</span><span className="nav-brand-talent">Talent</span>
            </span>
          </Link>
        </div>

        <div className="adm-navbar__tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`adm-navbar__tab${activeTab === t.id ? ' adm-navbar__tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="adm-navbar__right">
          <div className="adm-navbar__user" ref={menuRef}>
            <button className="adm-navbar__user-btn" onClick={() => setShowMenu(v => !v)}>
              <div className="adm-navbar__avatar-ph">
                {(user?.email || 'A')[0].toUpperCase()}
              </div>
              <span className="adm-navbar__user-name">
                {user?.email?.split('@')[0] || 'Admin'}
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showMenu && (
              <div className="adm-navbar__dropdown">
                <div className="adm-navbar__dropdown-header">
                  <p className="dropdown-user-name">Administrador</p>
                  <p className="dropdown-user-email">{user?.email}</p>
                </div>
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

      <main className="adm-content">
        {activeTab === 'dashboard' && <TabDashboard />}
        {activeTab === 'users'     && <TabUsers />}
        {activeTab === 'companies' && <TabCompanies />}
        {activeTab === 'jobs'      && <TabJobs />}
        {activeTab === 'certs'     && <TabCerts />}
        {activeTab === 'ai-logs'   && <TabAiLogs />}
      </main>
    </div>
  );
}
