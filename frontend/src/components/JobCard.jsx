import { Link } from 'react-router-dom';

const MODALITY_LABELS = { on_site: 'Presencial', remote: 'Remoto', hybrid: 'Híbrido' };
const LEVEL_LABELS    = { intern: 'Estágio', junior: 'Júnior', mid: 'Pleno', senior: 'Sênior', specialist: 'Especialista' };
const CONTRACT_LABELS = { clt: 'CLT', pj: 'PJ', internship: 'Estágio', freelancer: 'Freelancer' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `${days} dias atrás`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
}

function formatSalary(min, max) {
  const fmt = v => 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `A partir de ${fmt(min)}`;
  if (max) return `Até ${fmt(max)}`;
  return null;
}

export default function JobCard({ job }) {
  const salary = job.salary_disclosed ? formatSalary(job.salary_min, job.salary_max) : null;

  return (
    <Link to={`/jobs/${job.id}`} className="job-card">
      <div className="job-card-header">
        {job.company_logo
          ? <img src={job.company_logo} alt={job.company_name} className="job-card-logo" />
          : <div className="job-card-logo-ph">{job.company_name?.[0] ?? '?'}</div>
        }
        <div className="job-card-meta">
          <span className="job-card-company">{job.company_name}</span>
          {job.city && (
            <span className="job-card-location">
              {job.modality === 'remote' ? 'Remoto' : `${job.city}, ${job.state}`}
            </span>
          )}
        </div>
        <span className="job-card-age">{timeAgo(job.created_at)}</span>
      </div>

      <h3 className="job-card-title">{job.title}</h3>

      <div className="job-card-badges">
        <span className="badge badge-modality">{MODALITY_LABELS[job.modality]}</span>
        <span className="badge badge-level">{LEVEL_LABELS[job.seniority_level]}</span>
        <span className="badge badge-contract">{CONTRACT_LABELS[job.contract_type]}</span>
      </div>

      {salary && <p className="job-card-salary">{salary}</p>}
    </Link>
  );
}
