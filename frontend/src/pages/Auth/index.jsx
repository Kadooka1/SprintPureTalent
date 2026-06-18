import { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterCandidateForm from './RegisterCandidateForm';
import RegisterCompanyForm from './RegisterCompanyForm';
import './Auth.css';

export default function AuthPage() {
  const [isLogin, setIsLogin]         = useState(true);
  const [registerTab, setRegisterTab] = useState('candidate');
  const [successMsg, setSuccessMsg]   = useState('');

  function switchView(toLogin) {
    setIsLogin(toLogin);
    setSuccessMsg('');
  }

  function handleRegisterSuccess(message) {
    setSuccessMsg(message);
    switchView(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-main">

        {/* ── Formulário de Cadastro ── */}
        <div className={`auth-container auth-a-container${isLogin ? ' is-txl' : ''}`}>
          <div className="auth-form auth-reg-form">
            <h2 className="auth-form_title">Criar conta</h2>
            <p className="auth-form__subtitle">Escolha o tipo de acesso</p>

            <div className="reg-tabs">
              <button
                type="button"
                className={`reg-tab${registerTab === 'candidate' ? ' active' : ''}`}
                onClick={() => setRegisterTab('candidate')}
              >
                Candidato
              </button>
              <button
                type="button"
                className={`reg-tab${registerTab === 'company' ? ' active' : ''}`}
                onClick={() => setRegisterTab('company')}
              >
                Empresa
              </button>
            </div>

            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            {registerTab === 'candidate'
              ? <RegisterCandidateForm onSuccess={handleRegisterSuccess} />
              : <RegisterCompanyForm  onSuccess={handleRegisterSuccess} />
            }
          </div>
        </div>

        {/* ── Formulário de Login ── */}
        <div className={`auth-container auth-b-container${isLogin ? ' is-txl is-z200' : ''}`}>
          <LoginForm onSwitchToRegister={() => switchView(false)} />
        </div>

        {/* ── Painel de Alternância ── */}
        <div className={`auth-switch${isLogin ? ' is-txr' : ''}`}>
          <div className="auth-switch__circle" />
          <div className="auth-switch__circle auth-switch__circle--t" />

          <div className={`auth-switch__container${isLogin ? ' is-hidden' : ''}`}>
            <div className="auth-switch__brand">
              <img src="/logo.png" alt="PureTalent" className="auth-switch__logo" />
              <span className="brand-name">
                <span className="brand-pure">Pure</span><span className="brand-talent">Talent</span>
              </span>
            </div>
            <h2 className="auth-switch__title">Bem-vindo de volta!</h2>
            <p className="auth-switch__desc">Para continuar, entre com suas informações pessoais</p>
            <button type="button" className="auth-switch__btn" onClick={() => switchView(true)}>
              ENTRAR
            </button>
          </div>

          <div className={`auth-switch__container${!isLogin ? ' is-hidden' : ''}`}>
            <div className="auth-switch__brand">
              <img src="/logo.png" alt="PureTalent" className="auth-switch__logo" />
              <span className="brand-name">
                <span className="brand-pure">Pure</span><span className="brand-talent">Talent</span>
              </span>
            </div>
            <h2 className="auth-switch__title">Olá!</h2>
            <p className="auth-switch__desc">Insira seus dados pessoais e comece sua jornada conosco</p>
            <button type="button" className="auth-switch__btn" onClick={() => switchView(false)}>
              CADASTRAR
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
