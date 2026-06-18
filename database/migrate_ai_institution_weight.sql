-- Adiciona coluna para armazenar o peso TI avaliado pela IA em instituições desconhecidas
ALTER TABLE certificates
  ADD COLUMN ai_institution_weight TINYINT UNSIGNED DEFAULT NULL
    COMMENT 'Peso TI (0-100) avaliado pela IA quando a instituição não está cadastrada no banco'
  AFTER admin_notes;
