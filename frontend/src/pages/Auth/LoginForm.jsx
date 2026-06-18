import { useState } from 'react';
import { useAuth } from '../../store/AuthContext';

export default function LoginForm({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form auth-login-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-form_title">Entrar</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <span className="form__span">entre com sua conta de e-mail</span>

      <input
        className="form__input"
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
      />

      <div className="form__pass-wrapper">
        <input
          className="form__input"
          type={showPass ? 'text' : 'password'}
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="button"
          className="form__pass-toggle"
          onClick={() => setShowPass(v => !v)}
          aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPass ? '🙈' : '👁️'}
        </button>
      </div>

      <a className="form__link">Esqueceu sua senha?</a>

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? <span className="spinner" /> : 'ENTRAR'}
      </button>
    </form>
  );
}
