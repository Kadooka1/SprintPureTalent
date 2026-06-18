import { useState } from 'react';
import { authService } from '../../services/authService';
import PasswordStrengthBar from '../../components/ui/PasswordStrengthBar';

export default function RegisterCandidateForm({ onSuccess }) {
  const [form, setForm]     = useState({
    full_name: '', email: '', birth_date: '', password: '', confirm_password: '', phone: '',
  });
  const [errors, setErrors]   = useState({});
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Nome é obrigatório.';
    else if (form.full_name.trim().length < 3) errs.full_name = 'Mínimo 3 caracteres.';

    if (!form.email.trim()) errs.email = 'E-mail é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido.';

    if (!form.birth_date) errs.birth_date = 'Data de nascimento é obrigatória.';
    else {
      const d = new Date(form.birth_date);
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 16);
      if (d > minDate) errs.birth_date = 'Você deve ter pelo menos 16 anos.';
    }

    if (!form.password) errs.password = 'Senha é obrigatória.';
    else if (form.password.length < 8) errs.password = 'Mínimo 8 caracteres.';
    else if (!/\d/.test(form.password)) errs.password = 'Inclua ao menos um número.';
    else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.password))
      errs.password = 'Inclua ao menos um caractere especial.';

    if (form.password !== form.confirm_password) errs.confirm_password = 'As senhas não coincidem.';

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { message } = await authService.registerCandidate({
        full_name:  form.full_name.trim(),
        email:      form.email.trim(),
        birth_date: form.birth_date,
        password:   form.password,
        phone:      form.phone.trim() || undefined,
      });
      onSuccess(message);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="rc-name">Nome completo</label>
        <input id="rc-name" name="full_name" type="text" className={`form-control${errors.full_name ? ' error' : ''}`}
          placeholder="Seu Nome Completo" value={form.full_name} onChange={handleChange} autoComplete="name" />
        {errors.full_name && <span className="field-error">{errors.full_name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="rc-email">E-mail</label>
        <input id="rc-email" name="email" type="email" className={`form-control${errors.email ? ' error' : ''}`}
          placeholder="seu@email.com" value={form.email} onChange={handleChange} autoComplete="email" />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label htmlFor="rc-birth">Data de nascimento</label>
          <input id="rc-birth" name="birth_date" type="date" className={`form-control${errors.birth_date ? ' error' : ''}`}
            value={form.birth_date} onChange={handleChange} />
          {errors.birth_date && <span className="field-error">{errors.birth_date}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="rc-phone">Telefone <span className="optional">(opcional)</span></label>
          <input id="rc-phone" name="phone" type="tel" className="form-control"
            placeholder="(11) 99999-9999" value={form.phone} onChange={handleChange} autoComplete="tel" />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="rc-pass">Senha</label>
        <div className="input-password-wrapper">
          <input id="rc-pass" name="password" type={showPass ? 'text' : 'password'}
            className={`form-control${errors.password ? ' error' : ''}`}
            placeholder="Mín. 8 chars, 1 número, 1 especial" value={form.password} onChange={handleChange} />
          <button type="button" className="btn-toggle-pass" onClick={() => setShowPass((v) => !v)}
            aria-label="Alternar visibilidade da senha">{showPass ? '🙈' : '👁️'}</button>
        </div>
        <PasswordStrengthBar password={form.password} />
        {errors.password && <span className="field-error">{errors.password}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="rc-confirm">Confirmar senha</label>
        <div className="input-password-wrapper">
          <input id="rc-confirm" name="confirm_password" type={showConfirm ? 'text' : 'password'}
            className={`form-control${errors.confirm_password ? ' error' : ''}`}
            placeholder="Repita a senha" value={form.confirm_password} onChange={handleChange} />
          <button type="button" className="btn-toggle-pass" onClick={() => setShowConfirm((v) => !v)}
            aria-label="Alternar visibilidade da confirmação">{showConfirm ? '🙈' : '👁️'}</button>
        </div>
        {errors.confirm_password && <span className="field-error">{errors.confirm_password}</span>}
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Criar Conta'}
      </button>
    </form>
  );
}
