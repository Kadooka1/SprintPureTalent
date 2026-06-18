-- =============================================================
--  PURE TALENT — Seed do Administrador Padrão
--  Senha: Admin@123  (trocar após primeiro login em produção)
--  Execute apenas uma vez no banco puretalent
-- =============================================================

USE puretalent;

INSERT INTO users (email, password_hash, role, email_verified_at)
VALUES ('admin@puretalent.com', '$2a$10$puhx8m3A14yi2Qkh.4P1R.WQw3DMva/tlcOrfov14ffsHDJ3lFPmG', 'admin', NOW())
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

INSERT INTO admins (user_id, full_name)
SELECT id, 'Administrador'
FROM users
WHERE email = 'admin@puretalent.com'
ON DUPLICATE KEY UPDATE full_name = 'Administrador';
