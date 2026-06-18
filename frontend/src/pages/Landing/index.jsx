import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './Landing.css';

const STATS = [
  { value: '2.400+', label: 'Vagas Ativas' },
  { value: '340+',   label: 'Empresas Parceiras' },
  { value: '18.000+', label: 'Candidatos' },
  { value: '94%',    label: 'Taxa de Match' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Crie seu perfil',
    desc: 'Cadastre suas informações, experiências e formação em minutos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Envie certificados',
    desc: 'Nossa IA lê e valida seus certificados automaticamente, extraindo competências.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Receba matches',
    desc: 'O algoritmo cruza seu perfil com as vagas e calcula um score de compatibilidade.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        <path d="M16 3v4M8 3v4M3 11h18"/>
        <path d="M9 16l2 2 4-4"/>
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: 'Validação por IA',
    desc: 'OCR + OpenAI extraem habilidades reais dos seus certificados, sem digitação manual.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/>
        <path d="M18 2v6h-6"/>
      </svg>
    ),
  },
  {
    title: 'Match Inteligente',
    desc: 'Score calculado por competências reais, não por palavras-chave no currículo.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        <path d="M8 11h6M11 8v6"/>
      </svg>
    ),
  },
  {
    title: 'Painel Completo',
    desc: 'Acompanhe candidaturas, status e feedback de cada vaga em tempo real.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    title: 'Perfil por Competências',
    desc: 'Visualize suas habilidades organizadas por categoria e identifique gaps de carreira.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-8"/>
      </svg>
    ),
  },
];

const COMPANY_BENEFITS = [
  { title: 'Publique vagas em minutos', desc: 'Interface simples para criar e gerenciar vagas com requisitos de skills.' },
  { title: 'Candidatos pré-qualificados', desc: 'Receba apenas candidatos com score de match acima do seu critério mínimo.' },
  { title: 'Gestão de candidaturas', desc: 'Pipeline visual para acompanhar todos os candidatos por vaga.' },
  { title: 'Dados confiáveis', desc: 'Certificados validados por IA — não apenas autodeclarados pelo candidato.' },
];

const TESTIMONIALS = [
  {
    name: 'Fernanda Costa',
    role: 'Dev Front-end · Contratada via PureTalent',
    text: 'Em 3 semanas recebi 4 entrevistas com match acima de 80%. A IA entendeu meu perfil melhor do que eu esperava.',
    avatar: 'F',
  },
  {
    name: 'Rafael Souza',
    role: 'Tech Lead · Startup SaaS',
    text: 'Publicamos uma vaga de React Sênior e em 48h tínhamos 12 candidatos qualificados. Zero tempo perdido com triagem.',
    avatar: 'R',
  },
  {
    name: 'Mariana Lima',
    role: 'Engenheira de Dados · Remoto',
    text: 'Nunca tinha pensado em enviar certificados assim, mas o processo é rápido e a diferença nos matches é visível.',
    avatar: 'M',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="lp-root">

      {/* ── NAVBAR ── */}
      <header className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <Link to="/" className="lp-nav__brand">
            <img src="/logo.png" alt="PureTalent" className="lp-nav__logo" />
            <span className="lp-nav__brand-text">
              <span className="lp-brand-pure">Pure</span><span className="lp-brand-talent">Talent</span>
            </span>
          </Link>

          <nav className="lp-nav__links">
            <a href="#como-funciona" className="lp-nav__link">Como funciona</a>
            <a href="#diferenciais" className="lp-nav__link">Diferenciais</a>
            <a href="#empresas" className="lp-nav__link">Para empresas</a>
            <Link to="/jobs" className="lp-nav__link">Vagas</Link>
          </nav>

          <div className="lp-nav__ctas">
            <button className="lp-btn lp-btn--ghost" onClick={() => navigate('/auth')}>Entrar</button>
            <button className="lp-btn lp-btn--primary" onClick={() => navigate('/auth')}>Cadastrar grátis</button>
          </div>

          <button className="lp-nav__hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>

        {menuOpen && (
          <div className="lp-nav__mobile" ref={menuRef}>
            <a href="#como-funciona" className="lp-nav__mobile-link" onClick={() => setMenuOpen(false)}>Como funciona</a>
            <a href="#diferenciais" className="lp-nav__mobile-link" onClick={() => setMenuOpen(false)}>Diferenciais</a>
            <a href="#empresas" className="lp-nav__mobile-link" onClick={() => setMenuOpen(false)}>Para empresas</a>
            <Link to="/jobs" className="lp-nav__mobile-link" onClick={() => setMenuOpen(false)}>Vagas</Link>
            <hr className="lp-nav__mobile-divider" />
            <button className="lp-btn lp-btn--ghost lp-btn--full" onClick={() => navigate('/auth')}>Entrar</button>
            <button className="lp-btn lp-btn--primary lp-btn--full" onClick={() => navigate('/auth')}>Cadastrar grátis</button>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero__bg-orb lp-hero__bg-orb--1" />
        <div className="lp-hero__bg-orb lp-hero__bg-orb--2" />
        <div className="lp-hero__bg-orb lp-hero__bg-orb--3" />

        <div className="lp-hero__content">
          <div className="lp-hero__badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
            </svg>
            IA para validação de certificados
          </div>

          <h1 className="lp-hero__title">
            Encontre talentos de TI<br />
            <span className="lp-hero__title-accent">com precisão real</span>
          </h1>

          <p className="lp-hero__subtitle">
            A plataforma que usa inteligência artificial para cruzar as competências reais dos candidatos com as exigências das vagas — gerando um score de match transparente para ambos os lados.
          </p>

          <div className="lp-hero__actions">
            <button className="lp-btn lp-btn--cta" onClick={() => navigate('/auth')}>
              Comece agora — é grátis
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <Link to="/jobs" className="lp-btn lp-btn--outline-white">
              Ver vagas disponíveis
            </Link>
          </div>

          <div className="lp-hero__trust">
            <div className="lp-hero__trust-avatars">
              {['A','B','C','D'].map((l, i) => (
                <div key={i} className="lp-hero__trust-avatar" style={{ '--i': i }}>{l}</div>
              ))}
            </div>
            <span className="lp-hero__trust-text">+18.000 profissionais já cadastrados</span>
          </div>
        </div>

        <div className="lp-hero__visual">
          <div className="lp-hero__card lp-hero__card--main">
            <div className="lp-hero__card-header">
              <div className="lp-hero__card-avatar">G</div>
              <div>
                <p className="lp-hero__card-name">Gustavo B.</p>
                <p className="lp-hero__card-role">React Developer</p>
              </div>
              <div className="lp-hero__card-badge">Disponível</div>
            </div>
            <div className="lp-hero__card-skills">
              {['React','TypeScript','Node.js','AWS'].map(s => (
                <span key={s} className="lp-hero__skill-tag">{s}</span>
              ))}
            </div>
            <div className="lp-hero__card-match">
              <span className="lp-hero__match-label">Match Score</span>
              <div className="lp-hero__match-bar">
                <div className="lp-hero__match-fill" style={{ '--pct': '87%' }} />
              </div>
              <span className="lp-hero__match-pct">87%</span>
            </div>
          </div>

          <div className="lp-hero__card lp-hero__card--job">
            <div className="lp-hero__job-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div>
              <p className="lp-hero__job-title">Full Stack Engineer</p>
              <p className="lp-hero__job-company">TechCorp · Remoto</p>
            </div>
          </div>

          <div className="lp-hero__card lp-hero__card--cert">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" width="18" height="18">
              <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
            </svg>
            <span>Certificado validado por IA</span>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats">
        <div className="lp-stats__inner">
          {STATS.map((s, i) => (
            <div key={i} className="lp-stats__item">
              <span className="lp-stats__value">{s.value}</span>
              <span className="lp-stats__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="lp-section" id="como-funciona">
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-section__tag">Processo simples</span>
            <h2 className="lp-section__title">Como funciona para candidatos</h2>
            <p className="lp-section__subtitle">Três passos para começar a receber oportunidades que realmente combinam com você.</p>
          </div>

          <div className="lp-steps">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="lp-step">
                <div className="lp-step__number">{item.step}</div>
                <div className="lp-step__icon">{item.icon}</div>
                <h3 className="lp-step__title">{item.title}</h3>
                <p className="lp-step__desc">{item.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && <div className="lp-step__arrow" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIAIS ── */}
      <section className="lp-section lp-section--alt" id="diferenciais">
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-section__tag">Por que PureTalent</span>
            <h2 className="lp-section__title">O que nos diferencia</h2>
            <p className="lp-section__subtitle">Tecnologia que vai além do currículo e entende o que você realmente sabe fazer.</p>
          </div>

          <div className="lp-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feature-card__icon">{f.icon}</div>
                <h3 className="lp-feature-card__title">{f.title}</h3>
                <p className="lp-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA EMPRESAS ── */}
      <section className="lp-companies" id="empresas">
        <div className="lp-companies__inner">
          <div className="lp-companies__text">
            <span className="lp-section__tag lp-section__tag--light">Para empresas</span>
            <h2 className="lp-companies__title">Contrate com<br />mais inteligência</h2>
            <p className="lp-companies__subtitle">
              Reduza o tempo de triagem e encontre candidatos com as competências certas — validadas, não autodeclaradas.
            </p>
            <ul className="lp-companies__list">
              {COMPANY_BENEFITS.map((b, i) => (
                <li key={i} className="lp-companies__item">
                  <div className="lp-companies__item-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <div>
                    <strong>{b.title}</strong>
                    <p>{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={() => navigate('/auth')}>
              Criar conta empresarial
            </button>
          </div>

          <div className="lp-companies__visual">
            <div className="lp-companies__mockup">
              <div className="lp-mockup__header">
                <span>Vaga: Engenheiro Back-end</span>
                <span className="lp-mockup__badge">12 candidatos</span>
              </div>
              {[
                { name: 'Ana C.', score: 94, skills: ['Node.js', 'AWS'] },
                { name: 'João P.', score: 88, skills: ['Python', 'Docker'] },
                { name: 'Laura M.', score: 81, skills: ['Go', 'Kubernetes'] },
              ].map((c, i) => (
                <div key={i} className="lp-mockup__row">
                  <div className="lp-mockup__avatar">{c.name[0]}</div>
                  <div className="lp-mockup__info">
                    <span className="lp-mockup__name">{c.name}</span>
                    <div className="lp-mockup__skills">
                      {c.skills.map(s => <span key={s}>{s}</span>)}
                    </div>
                  </div>
                  <div className="lp-mockup__score" style={{ '--s': c.score }}>
                    {c.score}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="lp-section" id="depoimentos">
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-section__tag">Depoimentos</span>
            <h2 className="lp-section__title">O que dizem sobre nós</h2>
          </div>
          <div className="lp-testimonials">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="lp-testimonial">
                <div className="lp-testimonial__stars">
                  {Array(5).fill(0).map((_, j) => (
                    <svg key={j} viewBox="0 0 24 24" fill="#C9A84C" width="16" height="16">
                      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
                    </svg>
                  ))}
                </div>
                <p className="lp-testimonial__text">"{t.text}"</p>
                <div className="lp-testimonial__author">
                  <div className="lp-testimonial__avatar">{t.avatar}</div>
                  <div>
                    <p className="lp-testimonial__name">{t.name}</p>
                    <p className="lp-testimonial__role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-cta">
        <div className="lp-cta__orb lp-cta__orb--1" />
        <div className="lp-cta__orb lp-cta__orb--2" />
        <div className="lp-cta__inner">
          <h2 className="lp-cta__title">Pronto para encontrar<br />seu próximo passo?</h2>
          <p className="lp-cta__subtitle">Cadastre-se agora e deixe a IA trabalhar por você.</p>
          <div className="lp-cta__actions">
            <button className="lp-btn lp-btn--cta" onClick={() => navigate('/auth')}>
              Criar conta grátis
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <Link to="/jobs" className="lp-btn lp-btn--outline-white">Explorar vagas</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <Link to="/" className="lp-nav__brand">
              <img src="/logo.png" alt="PureTalent" className="lp-nav__logo" />
              <span className="lp-nav__brand-text">
                <span className="lp-brand-pure">Pure</span><span className="lp-brand-talent">Talent</span>
              </span>
            </Link>
            <p className="lp-footer__tagline">Conectando talentos de TI com oportunidades reais através de inteligência artificial.</p>
          </div>

          <div className="lp-footer__cols">
            <div className="lp-footer__col">
              <p className="lp-footer__col-title">Produto</p>
              <a href="#como-funciona">Como funciona</a>
              <a href="#diferenciais">Diferenciais</a>
              <Link to="/jobs">Vagas</Link>
            </div>
            <div className="lp-footer__col">
              <p className="lp-footer__col-title">Empresa</p>
              <a href="#empresas">Para empresas</a>
              <Link to="/auth">Entrar</Link>
              <Link to="/auth">Cadastrar</Link>
            </div>
            <div className="lp-footer__col">
              <p className="lp-footer__col-title">Contato</p>
              <a href="mailto:contato@puretalent.com.br">contato@puretalent.com.br</a>
            </div>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <span>© {new Date().getFullYear()} PureTalent. Todos os direitos reservados.</span>
        </div>
      </footer>

    </div>
  );
}
