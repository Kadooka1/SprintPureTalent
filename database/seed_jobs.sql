-- =============================================================
--  PURE TALENT — Seed de Vagas para Teste (Fase 4)
--  Execute DEPOIS de rodar schema.sql
--  Cria 1 empresa de teste + 5 vagas ativas
-- =============================================================

USE puretalent;

-- ── 1. Usuário da empresa de teste ───────────────────────────
-- Senha: Teste@123 (bcrypt já gerado)
INSERT INTO users (email, password_hash, role, is_active)
VALUES ('empresa@puretalent.test',
        '$2a$10$oB8/aR8oLz.sz3I70wUCG.E2RyPl4l33BY8sT83Tce/Blr6uHHNsu',
        'company', 1)
ON DUPLICATE KEY UPDATE id = id;

SET @company_user_id = (SELECT id FROM users WHERE email = 'empresa@puretalent.test');

-- ── 2. Empresa ────────────────────────────────────────────────
INSERT INTO companies (user_id, legal_name, trade_name, cnpj, corporate_email, phone, size, sector, description, is_verified)
VALUES (
  @company_user_id,
  'TechCorp Soluções em TI LTDA',
  'TechCorp',
  '12.345.678/0001-90',
  'empresa@puretalent.test',
  '(11) 99999-0001',
  'medium',
  'Tecnologia da Informação',
  'Empresa de tecnologia focada em soluções web, mobile e cloud para o mercado brasileiro.',
  1
)
ON DUPLICATE KEY UPDATE id = id;

SET @company_id = (SELECT id FROM companies WHERE user_id = @company_user_id);

-- ── 3. Vagas ──────────────────────────────────────────────────
INSERT INTO jobs
  (company_id, title, area, seniority_level, modality, city, state,
   workload, contract_type, salary_min, salary_max, salary_disclosed,
   description, benefits, status)
VALUES
(
  @company_id,
  'Desenvolvedor Front-end React',
  'Desenvolvimento Web',
  'mid', 'remote', 'São Paulo', 'SP',
  '40h/semana', 'clt', 5000.00, 8000.00, 1,
  'Buscamos um desenvolvedor React pleno para atuar em projetos de e-commerce e SaaS de alta escala.

Responsabilidades:
- Desenvolvimento de interfaces modernas com React e TypeScript
- Integração com APIs REST e GraphQL
- Code review e mentoria de desenvolvedores juniores
- Participação ativa em cerimônias ágeis (Scrum)

Requisitos:
- 2+ anos de experiência com React
- Boas práticas de acessibilidade e performance',
  'Vale refeição, Vale transporte, Plano de saúde, 13° salário, PLR',
  'active'
),
(
  @company_id,
  'Desenvolvedor Back-end Node.js',
  'Back-end',
  'junior', 'hybrid', 'São Paulo', 'SP',
  '40h/semana', 'clt', 3000.00, 5000.00, 1,
  'Vaga para desenvolvedor Node.js júnior para compor nosso time de back-end.

Responsabilidades:
- Desenvolvimento de APIs REST com Express e Fastify
- Manutenção e evolução de banco de dados MySQL
- Participação em cerimônias ágeis
- Escrita de testes automatizados

Pré-requisitos:
- Conhecimento de JavaScript / Node.js
- Noções de banco de dados relacional',
  'Vale refeição, Vale transporte, Plano de saúde, Auxílio home office',
  'active'
),
(
  @company_id,
  'Engenheiro DevOps Sênior',
  'Infraestrutura e Cloud',
  'senior', 'remote', 'Remoto', 'SP',
  '40h/semana', 'pj', 12000.00, 18000.00, 1,
  'Buscamos engenheiro DevOps sênior para liderar nossa infraestrutura em nuvem.

Responsabilidades:
- Gestão de infraestrutura AWS e GCP (IaC com Terraform)
- Implementação e manutenção de pipelines CI/CD (GitHub Actions, Jenkins)
- Monitoramento, observabilidade e alertas (Datadog, Grafana)
- Segurança de infraestrutura e gestão de credenciais

Requisitos:
- 4+ anos em DevOps / SRE
- Sólido conhecimento de Docker e Kubernetes',
  'Contrato PJ — sem benefícios CLT. Pagamento pontual.',
  'active'
),
(
  @company_id,
  'Estagiário em Desenvolvimento Web',
  'Desenvolvimento Web',
  'intern', 'hybrid', 'São Paulo', 'SP',
  '30h/semana', 'internship', 1500.00, 2000.00, 1,
  'Vaga de estágio para estudantes de TI interessados em desenvolvimento web fullstack.

O que você vai aprender e fazer:
- React e Node.js na prática, com projetos reais
- Metodologias ágeis (Scrum/Kanban)
- Boas práticas de código e versionamento (Git)
- Revisão de código e pair programming

Pré-requisitos:
- Estar cursando Ciência da Computação, Engenharia de Software ou área afim
- Conhecimento básico de HTML, CSS e JavaScript',
  'Bolsa auxílio, Vale transporte, Possibilidade de efetivação',
  'active'
),
(
  @company_id,
  'Analista de Cibersegurança Pleno',
  'Segurança da Informação',
  'mid', 'on_site', 'São Paulo', 'SP',
  '40h/semana', 'clt', 7000.00, 10000.00, 1,
  'Oportunidade para analista de cibersegurança pleno na proteção da infraestrutura corporativa.

Responsabilidades:
- Análise de vulnerabilidades e realização de pentests
- Resposta a incidentes de segurança
- Implementação e auditoria de políticas de segurança
- Monitoramento de SIEM e gerenciamento de alertas
- Elaboração de relatórios técnicos e executivos

Requisitos:
- 2+ anos em segurança da informação
- Conhecimento de frameworks (OWASP, ISO 27001, NIST)',
  'Vale refeição, Vale transporte, Plano de saúde e odontológico, Certificações custeadas pela empresa',
  'active'
);

-- ── 4. Skills por vaga (opcional — só insere se as skills existirem) ──
-- Job 1: Front-end React → React + JavaScript
INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Desenvolvedor Front-end React' AND company_id = @company_id LIMIT 1),
  id, 1, 40
FROM skills WHERE name = 'React'
AND (SELECT id FROM jobs WHERE title = 'Desenvolvedor Front-end React' AND company_id = @company_id LIMIT 1) IS NOT NULL;

INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Desenvolvedor Front-end React' AND company_id = @company_id LIMIT 1),
  id, 1, 30
FROM skills WHERE name = 'JavaScript'
AND (SELECT id FROM jobs WHERE title = 'Desenvolvedor Front-end React' AND company_id = @company_id LIMIT 1) IS NOT NULL;

INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Desenvolvedor Front-end React' AND company_id = @company_id LIMIT 1),
  id, 0, NULL
FROM skills WHERE name = 'TypeScript'
AND (SELECT id FROM jobs WHERE title = 'Desenvolvedor Front-end React' AND company_id = @company_id LIMIT 1) IS NOT NULL;

-- Job 2: Back-end Node.js → Node.js + JavaScript + MySQL
INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Desenvolvedor Back-end Node.js' AND company_id = @company_id LIMIT 1),
  id, 1, 25
FROM skills WHERE name = 'Node.js'
AND (SELECT id FROM jobs WHERE title = 'Desenvolvedor Back-end Node.js' AND company_id = @company_id LIMIT 1) IS NOT NULL;

INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Desenvolvedor Back-end Node.js' AND company_id = @company_id LIMIT 1),
  id, 1, 20
FROM skills WHERE name = 'JavaScript'
AND (SELECT id FROM jobs WHERE title = 'Desenvolvedor Back-end Node.js' AND company_id = @company_id LIMIT 1) IS NOT NULL;

-- Job 3: DevOps → AWS + Docker
INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Engenheiro DevOps Sênior' AND company_id = @company_id LIMIT 1),
  id, 1, 60
FROM skills WHERE name LIKE '%AWS%'
AND (SELECT id FROM jobs WHERE title = 'Engenheiro DevOps Sênior' AND company_id = @company_id LIMIT 1) IS NOT NULL
LIMIT 1;

INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Engenheiro DevOps Sênior' AND company_id = @company_id LIMIT 1),
  id, 1, 50
FROM skills WHERE name = 'Docker'
AND (SELECT id FROM jobs WHERE title = 'Engenheiro DevOps Sênior' AND company_id = @company_id LIMIT 1) IS NOT NULL;

-- Job 5: Cibersegurança → Cybersecurity
INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Analista de Cibersegurança Pleno' AND company_id = @company_id LIMIT 1),
  id, 1, 50
FROM skills WHERE name = 'Cybersecurity'
AND (SELECT id FROM jobs WHERE title = 'Analista de Cibersegurança Pleno' AND company_id = @company_id LIMIT 1) IS NOT NULL;

INSERT IGNORE INTO job_skills (job_id, skill_id, is_required, min_score)
SELECT
  (SELECT id FROM jobs WHERE title = 'Analista de Cibersegurança Pleno' AND company_id = @company_id LIMIT 1),
  id, 0, NULL
FROM skills WHERE name = 'Pentest'
AND (SELECT id FROM jobs WHERE title = 'Analista de Cibersegurança Pleno' AND company_id = @company_id LIMIT 1) IS NOT NULL;

-- ── VAGA DE TESTE RÁPIDO ─────────────────────────────────────
-- Sem skills obrigatórias → match_score = 100% garantido
INSERT INTO jobs
  (company_id, title, area, seniority_level, modality, city, state,
   workload, contract_type, salary_min, salary_max, salary_disclosed,
   description, benefits, status)
VALUES (
  @company_id,
  'Desenvolvedor TI — VAGA DE TESTE',
  'Tecnologia da Informação',
  'junior', 'remote', 'Remoto', 'SP',
  '40h/semana', 'clt', 3000.00, 5000.00, 1,
  'Esta vaga existe apenas para testar o fluxo de candidatura.

Clique em "Candidatar-se" e verifique se o match_score aparece corretamente no dashboard.',
  'Nenhum benefício — é só um teste :)',
  'active'
);

SELECT 'Seed concluído! 6 vagas criadas.' AS resultado;
