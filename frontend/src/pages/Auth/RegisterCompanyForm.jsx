import { useState } from 'react';
import { authService } from '../../services/authService';
import PasswordStrengthBar from '../../components/ui/PasswordStrengthBar';

function validateCNPJ(cnpj) {
  const d = cnpj.replace(/[^\d]/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0, w = 5;
  for (let i = 0; i < 12; i++) { sum += d[i] * w; w = w === 2 ? 9 : w - 1; }
  const d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(d[12]) !== d1) return false;
  sum = 0; w = 6;
  for (let i = 0; i < 13; i++) { sum += d[i] * w; w = w === 2 ? 9 : w - 1; }
  const d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(d[13]) === d2;
}

function maskCNPJ(v) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
}

export default function RegisterCompanyForm({ onSuccess }) {
  const [form, setForm] = useState({
    legal_name: '', trade_name: '', cnpj: '', email: '', password: '',
    confirm_password: '', size: '', sector: '', phone: '', website: '',
  });
  const [errors, setErrors]   = useState({});
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handleChange(e) {
    let { name, value } = e.target;
    if (name === 'cnpj') value = maskCNPJ(value);
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.legal_name.trim())  errs.legal_name  = 'Razão social é obrigatória.';
    if (!form.trade_name.trim())  errs.trade_name  = 'Nome fantasia é obrigatório.';
    if (!form.cnpj.trim())        errs.cnpj        = 'CNPJ é obrigatório.';
    else if (!validateCNPJ(form.cnpj)) errs.cnpj   = 'CNPJ inválido.';
    if (!form.email.trim())       errs.email       = 'E-mail é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido.';
    if (!form.size)               errs.size        = 'Selecione o porte.';
    if (!form.sector.trim())      errs.sector      = 'Setor é obrigatório.';
    if (!form.password)           errs.password    = 'Senha é obrigatória.';
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
      const { message } = await authService.registerCompany({
        legal_name:  form.legal_name.trim(),
        trade_name:  form.trade_name.trim(),
        cnpj:        form.cnpj,
        email:       form.email.trim(),
        password:    form.password,
        size:        form.size,
        sector:      form.sector.trim(),
        phone:       form.phone.trim() || undefined,
        website:     form.website.trim() || undefined,
      });
      onSuccess(message);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao cadastrar empresa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row-2">
        <div className="form-group">
          <label htmlFor="co-legal">Razão social</label>
          <input id="co-legal" name="legal_name" type="text" className={`form-control${errors.legal_name ? ' error' : ''}`}
            placeholder="Empresa LTDA" value={form.legal_name} onChange={handleChange} />
          {errors.legal_name && <span className="field-error">{errors.legal_name}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="co-trade">Nome fantasia</label>
          <input id="co-trade" name="trade_name" type="text" className={`form-control${errors.trade_name ? ' error' : ''}`}
            placeholder="Minha Empresa" value={form.trade_name} onChange={handleChange} />
          {errors.trade_name && <span className="field-error">{errors.trade_name}</span>}
        </div>
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label htmlFor="co-cnpj">CNPJ</label>
          <input id="co-cnpj" name="cnpj" type="text" className={`form-control${errors.cnpj ? ' error' : ''}`}
            placeholder="00.000.000/0000-00" value={form.cnpj} onChange={handleChange} maxLength={18} />
          {errors.cnpj && <span className="field-error">{errors.cnpj}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="co-size">Porte</label>
          <select id="co-size" name="size" className={`form-control${errors.size ? ' error' : ''}`}
            value={form.size} onChange={handleChange}>
            <option value="">Selecione...</option>
            <option value="micro">Microempresa</option>
            <option value="small">Pequena</option>
            <option value="medium">Média</option>
            <option value="large">Grande</option>
          </select>
          {errors.size && <span className="field-error">{errors.size}</span>}
        </div>
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label htmlFor="co-email">E-mail corporativo</label>
          <input id="co-email" name="email" type="email" className={`form-control${errors.email ? ' error' : ''}`}
            placeholder="contato@empresa.com" value={form.email} onChange={handleChange} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="co-sector">Setor</label>
          <input id="co-sector" name="sector" type="text" className={`form-control${errors.sector ? ' error' : ''}`}
            placeholder="Ex: Tecnologia, Finanças..." value={form.sector} onChange={handleChange} />
          {errors.sector && <span className="field-error">{errors.sector}</span>}
        </div>
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label htmlFor="co-phone">Telefone <span className="optional">(opcional)</span></label>
          <input id="co-phone" name="phone" type="tel" className="form-control"
            placeholder="(11) 3000-0000" value={form.phone} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="co-site">Site <span className="optional">(opcional)</span></label>
          <input id="co-site" name="website" type="url" className="form-control"
            placeholder="https://empresa.com" value={form.website} onChange={handleChange} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="co-pass">Senha</label>
        <div className="input-password-wrapper">
          <input id="co-pass" name="password" type={showPass ? 'text' : 'password'}
            className={`form-control${errors.password ? ' error' : ''}`}
            placeholder="Mín. 8 chars, 1 número, 1 especial" value={form.password} onChange={handleChange} />
          <button type="button" className="btn-toggle-pass" onClick={() => setShowPass((v) => !v)}
            aria-label="Alternar senha">{showPass ? '🙈' : '👁️'}</button>
        </div>
        <PasswordStrengthBar password={form.password} />
        {errors.password && <span className="field-error">{errors.password}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="co-confirm">Confirmar senha</label>
        <input id="co-confirm" name="confirm_password" type="password"
          className={`form-control${errors.confirm_password ? ' error' : ''}`}
          placeholder="Repita a senha" value={form.confirm_password} onChange={handleChange} />
        {errors.confirm_password && <span className="field-error">{errors.confirm_password}</span>}
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Cadastrar Empresa'}
      </button>
    </form>
  );
}
