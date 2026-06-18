function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'E-mail é obrigatório.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Formato de e-mail inválido.';
  return null;
}

function validatePassword(password) {
  if (!password) return 'Senha é obrigatória.';
  if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if (!/\d/.test(password)) return 'A senha deve conter ao menos um número.';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
    return 'A senha deve conter ao menos um caractere especial.';
  return null;
}

function validateName(name) {
  if (!name || typeof name !== 'string') return 'Nome é obrigatório.';
  if (name.trim().length < 3) return 'O nome deve ter no mínimo 3 caracteres.';
  if (/[^a-zA-ZÀ-ÿ\s]/.test(name.trim())) return 'O nome não deve conter caracteres especiais.';
  return null;
}

function validateBirthDate(dateStr) {
  if (!dateStr) return 'Data de nascimento é obrigatória.';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Data de nascimento inválida.';

  const today   = new Date();
  const minDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
  if (date > minDate) return 'O candidato deve ter pelo menos 16 anos.';
  return null;
}

function validateCNPJ(cnpj) {
  if (!cnpj) return 'CNPJ é obrigatório.';
  const digits = cnpj.replace(/[^\d]/g, '');
  if (digits.length !== 14) return 'CNPJ deve ter 14 dígitos.';
  if (/^(\d)\1+$/.test(digits)) return 'CNPJ inválido.';

  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(digits[12]) !== d1) return 'CNPJ inválido.';

  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(digits[13]) !== d2) return 'CNPJ inválido.';

  return null;
}

module.exports = { validateEmail, validatePassword, validateName, validateBirthDate, validateCNPJ };
