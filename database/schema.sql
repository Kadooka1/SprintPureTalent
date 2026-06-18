-- =============================================================
--  PURE TALENT -- Schema MySQL v1.0
--  Projeto Educacional | Stack: Node.js + Express + MySQL
--  Gerado em: Maio de 2026
-- =============================================================

CREATE DATABASE IF NOT EXISTS puretalent
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE puretalent;

-- =============================================================
-- 1. AUTENTICAÇÃO & USUÁRIOS BASE
-- =============================================================

CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('candidate', 'company', 'admin') NOT NULL,
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    email_verified_at DATETIME  DEFAULT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    DATETIME      DEFAULT NULL  -- soft delete (LGPD)
);

CREATE TABLE refresh_tokens (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    token       VARCHAR(512) NOT NULL UNIQUE,
    expires_at  DATETIME     NOT NULL,
    revoked     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE email_verifications (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token      VARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE password_resets (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token      VARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Rate limiting para tentativas de login
CREATE TABLE login_attempts (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45)  NOT NULL,
    attempted_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_ip (email, ip_address),
    INDEX idx_attempted_at (attempted_at)
);

-- =============================================================
-- 2. CANDIDATOS
-- =============================================================

CREATE TABLE candidates (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id              INT UNSIGNED NOT NULL UNIQUE,
    full_name            VARCHAR(200) NOT NULL,
    cpf                  CHAR(14)     DEFAULT NULL UNIQUE,
    birth_date           DATE         NOT NULL,
    gender               ENUM('male', 'female', 'non_binary', 'prefer_not_to_say') DEFAULT NULL,
    phone                VARCHAR(20)  DEFAULT NULL,
    avatar_url           VARCHAR(512) DEFAULT NULL,

    -- Localização
    zip_code             CHAR(9)      DEFAULT NULL,
    street               VARCHAR(255) DEFAULT NULL,
    city                 VARCHAR(100) DEFAULT NULL,
    state                CHAR(2)      DEFAULT NULL,
    country              VARCHAR(100) NOT NULL DEFAULT 'Brasil',
    willing_to_relocate  ENUM('yes', 'no', 'negotiable') DEFAULT NULL,

    -- Preferências profissionais
    work_modality        ENUM('on_site', 'remote', 'hybrid') DEFAULT NULL,
    experience_level     ENUM('intern', 'junior', 'mid', 'senior', 'specialist') DEFAULT NULL,
    salary_min           DECIMAL(10,2) DEFAULT NULL,
    salary_max           DECIMAL(10,2) DEFAULT NULL,
    availability         ENUM('immediate', '15_days', '30_days', 'negotiable') DEFAULT NULL,

    -- Controle de preenchimento do perfil
    profile_completed    TINYINT(1)   NOT NULL DEFAULT 0,

    created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE educations (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT UNSIGNED NOT NULL,
    institution  VARCHAR(255) NOT NULL,
    course       VARCHAR(255) NOT NULL,
    degree       ENUM('technical', 'undergraduate', 'postgraduate', 'mba', 'masters', 'phd') NOT NULL,
    status       ENUM('studying', 'completed', 'interrupted') NOT NULL,
    start_year   YEAR         DEFAULT NULL,
    end_year     YEAR         DEFAULT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE TABLE experiences (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidate_id  INT UNSIGNED NOT NULL,
    company_name  VARCHAR(255) NOT NULL,
    job_title     VARCHAR(255) NOT NULL,
    started_at    DATE         NOT NULL,
    ended_at      DATE         DEFAULT NULL,  -- NULL = "atual"
    description   TEXT         DEFAULT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- =============================================================
-- 3. EMPRESAS
-- =============================================================

CREATE TABLE companies (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id          INT UNSIGNED NOT NULL UNIQUE,
    legal_name       VARCHAR(255) NOT NULL,
    trade_name       VARCHAR(255) NOT NULL,
    cnpj             CHAR(18)     NOT NULL UNIQUE,
    corporate_email  VARCHAR(255) NOT NULL,
    phone            VARCHAR(20)  DEFAULT NULL,
    website          VARCHAR(512) DEFAULT NULL,
    size             ENUM('micro', 'small', 'medium', 'large') NOT NULL,
    sector           VARCHAR(150) NOT NULL,
    logo_url         VARCHAR(512) DEFAULT NULL,
    description      TEXT         DEFAULT NULL,
    is_verified      TINYINT(1)   NOT NULL DEFAULT 0,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================
-- 4. CATÁLOGO DE SKILLS E INSTITUIÇÕES
-- =============================================================

CREATE TABLE skill_categories (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skills (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id  INT UNSIGNED NOT NULL,
    name         VARCHAR(100) NOT NULL UNIQUE,
    slug         VARCHAR(100) NOT NULL UNIQUE,
    is_active    TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES skill_categories(id)
);

-- Instituições emissoras de certificados com seu peso para a IA
CREATE TABLE institutions (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    weight_tier ENUM('A', 'B', 'C', 'D') NOT NULL,
    -- A = 90-100%, B = 70-89%, C = 50-69%, D = 20-49%
    weight_min  TINYINT UNSIGNED NOT NULL,
    weight_max  TINYINT UNSIGNED NOT NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================================
-- 5. CERTIFICADOS E PONTUAÇÃO POR IA
-- =============================================================

CREATE TABLE certificates (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidate_id      INT UNSIGNED NOT NULL,
    institution_id    INT UNSIGNED DEFAULT NULL,  -- NULL se a IA não reconhecer
    course_name       VARCHAR(255) NOT NULL,
    institution_name  VARCHAR(255) NOT NULL,      -- nome bruto digitado/extraído
    conclusion_date   DATE         DEFAULT NULL,
    workload_hours    SMALLINT UNSIGNED DEFAULT NULL,
    file_url          VARCHAR(512) NOT NULL,
    file_type         ENUM('pdf', 'jpg', 'png') NOT NULL,

    -- Controle de processamento pela IA
    status            ENUM('pending', 'processing', 'validated', 'rejected', 'manual_review') NOT NULL DEFAULT 'pending',
    ai_confidence     DECIMAL(5,2) DEFAULT NULL,  -- 0.00 a 100.00
    admin_override        TINYINT(1)       NOT NULL DEFAULT 0,
    admin_notes           TEXT             DEFAULT NULL,
    ai_institution_weight TINYINT UNSIGNED DEFAULT NULL,  -- peso TI avaliado pela IA quando instituição não está no banco
    processed_at          DATETIME         DEFAULT NULL,

    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id)   REFERENCES candidates(id)   ON DELETE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

-- Skills identificadas em cada certificado pela IA
CREATE TABLE certificate_skills (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certificate_id  INT UNSIGNED NOT NULL,
    skill_id        INT UNSIGNED NOT NULL,
    relevance_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- peso da relevância (0-100)
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cert_skill (certificate_id, skill_id),
    FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id)       REFERENCES skills(id)
);

-- Pontuação consolidada de skills do candidato (calculada após processar todos os certificados)
CREATE TABLE candidate_skills (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT UNSIGNED NOT NULL,
    skill_id     INT UNSIGNED NOT NULL,
    score        DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- 0.00 a 100.00
    level        ENUM('beginner', 'basic', 'intermediate', 'advanced', 'expert')
                 GENERATED ALWAYS AS (
                   CASE
                     WHEN score >= 80 THEN 'expert'
                     WHEN score >= 60 THEN 'advanced'
                     WHEN score >= 40 THEN 'intermediate'
                     WHEN score >= 20 THEN 'basic'
                     ELSE 'beginner'
                   END
                 ) STORED,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_candidate_skill (candidate_id, skill_id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id)     REFERENCES skills(id)
);

-- Log das decisões da IA para auditoria do admin
CREATE TABLE ai_logs (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certificate_id INT UNSIGNED NOT NULL,
    prompt_sent    TEXT         NOT NULL,
    response_raw   LONGTEXT     NOT NULL,
    tokens_used    INT UNSIGNED DEFAULT NULL,
    duration_ms    INT UNSIGNED DEFAULT NULL,
    error_message  TEXT         DEFAULT NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE
);

-- =============================================================
-- 6. VAGAS
-- =============================================================

CREATE TABLE jobs (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id       INT UNSIGNED NOT NULL,
    title            VARCHAR(255) NOT NULL,
    area             VARCHAR(150) NOT NULL,
    seniority_level  ENUM('intern', 'junior', 'mid', 'senior', 'specialist') NOT NULL,
    modality         ENUM('on_site', 'remote', 'hybrid') NOT NULL,
    address          VARCHAR(255) DEFAULT NULL,
    city             VARCHAR(100) DEFAULT NULL,
    state            CHAR(2)      DEFAULT NULL,
    workload         VARCHAR(50)  NOT NULL,  -- ex: "40h/semana", "PJ"
    contract_type    ENUM('clt', 'pj', 'internship', 'freelancer') NOT NULL,
    salary_min       DECIMAL(10,2) DEFAULT NULL,
    salary_max       DECIMAL(10,2) DEFAULT NULL,
    salary_disclosed TINYINT(1)   NOT NULL DEFAULT 1,
    benefits         TEXT         DEFAULT NULL,
    description      LONGTEXT     NOT NULL,
    external_link    VARCHAR(512) DEFAULT NULL,
    expires_at       DATE         DEFAULT NULL,
    status           ENUM('draft', 'pending_review', 'active', 'closed', 'rejected') NOT NULL DEFAULT 'draft',
    admin_notes      TEXT         DEFAULT NULL,
    views_count      INT UNSIGNED NOT NULL DEFAULT 0,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       DATETIME     DEFAULT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_modality (modality),
    INDEX idx_seniority (seniority_level)
);

-- Skills exigidas por vaga
CREATE TABLE job_skills (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id     INT UNSIGNED NOT NULL,
    skill_id   INT UNSIGNED NOT NULL,
    is_required TINYINT(1)  NOT NULL DEFAULT 1,  -- 1 = obrigatório, 0 = diferencial
    min_score  TINYINT UNSIGNED DEFAULT NULL,     -- pontuação mínima esperada (opcional)
    UNIQUE KEY uq_job_skill (job_id, skill_id),
    FOREIGN KEY (job_id)   REFERENCES jobs(id)   ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- =============================================================
-- 7. CANDIDATURAS
-- =============================================================

CREATE TABLE applications (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id        INT UNSIGNED NOT NULL,
    candidate_id  INT UNSIGNED NOT NULL,
    match_score   DECIMAL(5,2) DEFAULT NULL,  -- % de compatibilidade (calculado no momento da candidatura)
    status        ENUM('submitted', 'reviewing', 'approved', 'rejected') NOT NULL DEFAULT 'submitted',
    company_notes TEXT         DEFAULT NULL,
    applied_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_application (job_id, candidate_id),
    FOREIGN KEY (job_id)       REFERENCES jobs(id)       ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    INDEX idx_status (status)
);

-- =============================================================
-- 8. PAINEL ADMINISTRATIVO
-- =============================================================

CREATE TABLE admins (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL UNIQUE,
    full_name  VARCHAR(200) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id    INT UNSIGNED DEFAULT NULL,
    user_id     INT UNSIGNED DEFAULT NULL,  -- usuário afetado
    action      VARCHAR(100) NOT NULL,      -- ex: 'user.suspend', 'job.approve'
    entity_type VARCHAR(50)  NOT NULL,      -- ex: 'user', 'job', 'company'
    entity_id   INT UNSIGNED DEFAULT NULL,
    details     JSON         DEFAULT NULL,
    ip_address  VARCHAR(45)  DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
);

-- =============================================================
-- 9. SEEDS INICIAIS
-- =============================================================

-- Categorias de skills
INSERT INTO skill_categories (name) VALUES
  ('Linguagens de Programação'),
  ('Front-end'),
  ('Back-end'),
  ('Banco de Dados'),
  ('Cloud & DevOps'),
  ('Dados & BI'),
  ('Segurança');

-- Skills
INSERT INTO skills (category_id, name, slug) VALUES
  -- Linguagens
  (1, 'JavaScript', 'javascript'),
  (1, 'TypeScript', 'typescript'),
  (1, 'Python',     'python'),
  (1, 'Java',       'java'),
  (1, 'PHP',        'php'),
  (1, 'C#',         'csharp'),
  (1, 'Go',         'go'),
  (1, 'Rust',       'rust'),
  -- Front-end
  (2, 'React',      'react'),
  (2, 'Angular',    'angular'),
  (2, 'Vue.js',     'vuejs'),
  (2, 'HTML/CSS',   'html-css'),
  -- Back-end
  (3, 'Node.js',    'nodejs'),
  (3, 'Express.js', 'expressjs'),
  (3, 'NestJS',     'nestjs'),
  (3, 'Django',     'django'),
  (3, 'Spring',     'spring'),
  (3, 'Laravel',    'laravel'),
  -- Banco de Dados
  (4, 'SQL',        'sql'),
  (4, 'MySQL',      'mysql'),
  (4, 'PostgreSQL', 'postgresql'),
  (4, 'MongoDB',    'mongodb'),
  (4, 'Redis',      'redis'),
  -- Cloud & DevOps
  (5, 'AWS',        'aws'),
  (5, 'Azure',      'azure'),
  (5, 'GCP',        'gcp'),
  (5, 'Docker',     'docker'),
  (5, 'Kubernetes', 'kubernetes'),
  (5, 'Linux',      'linux'),
  (5, 'CI/CD',      'ci-cd'),
  -- Dados & BI
  (6, 'Machine Learning', 'machine-learning'),
  (6, 'Data Analysis',    'data-analysis'),
  (6, 'Power BI',         'power-bi'),
  (6, 'Tableau',          'tableau'),
  -- Segurança
  (7, 'Cybersecurity',    'cybersecurity'),
  (7, 'Pentest',          'pentest'),
  (7, 'LGPD',             'lgpd');

-- Instituições emissoras com pesos
INSERT INTO institutions (name, weight_tier, weight_min, weight_max) VALUES
  ('Microsoft Learn',  'A', 90, 100),
  ('AWS Training',     'A', 90, 100),
  ('Google Cloud',     'A', 90, 100),
  ('Oracle Academy',   'A', 90, 100),
  ('Cisco Networking', 'A', 90, 100),
  ('IBM Learning',     'A', 90, 100),
  ('Alura',            'B', 70, 89),
  ('Rocketseat',       'B', 70, 89),
  ('DIO',              'B', 70, 89),
  ('Coursera',         'B', 70, 89),
  ('Udemy',            'B', 70, 89),
  ('Outros Reconhecidos', 'C', 50, 69),
  ('Cursos Livres',    'D', 20, 49);

-- Admin padrão do sistema (senha: Admin@123 — trocar em produção)
-- hash bcrypt de 'Admin@123':
INSERT INTO users (email, password_hash, role, email_verified_at) VALUES
  ('admin@puretalent.com', '$2b$10$YourHashHere', 'admin', NOW());

INSERT INTO admins (user_id, full_name)
  SELECT id, 'Administrador' FROM users WHERE email = 'admin@puretalent.com';
