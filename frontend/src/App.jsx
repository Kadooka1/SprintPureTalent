import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './store/AuthContext';
import AuthPage from './pages/Auth/index.jsx';
import LandingPage from './pages/Landing/index.jsx';
import CandidatePage from './pages/Candidate/index.jsx';
import JobsPage from './pages/Jobs/index.jsx';
import JobDetail from './pages/Jobs/JobDetail.jsx';
import CompanyPage from './pages/Company/index.jsx';
import JobForm from './pages/Company/JobForm.jsx';
import JobApplicants from './pages/Company/JobApplicants.jsx';
import AdminPage from './pages/Admin/index.jsx';
import { authService } from './services/authService';

// ── Rota protegida ────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/auth" replace />;
  return children;
}

// ── Página de verificação de e-mail ──────────────────────────
function VerifyEmailPage() {
  const { token }     = useParams();
  const navigate      = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    authService.verifyEmail(token)
      .then(({ message }) => { setStatus('success'); setMessage(message); })
      .catch((err) => { setStatus('error'); setMessage(err.response?.data?.error || 'Link inválido ou expirado.'); });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--light)' }}>
      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '48px 40px', maxWidth: 420, textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
        {status === 'loading' && <p>Verificando seu e-mail...</p>}
        {status === 'success' && (
          <>
            <p style={{ fontSize: 40 }}>✅</p>
            <h2 style={{ marginTop: 12 }}>E-mail confirmado!</h2>
            <p style={{ color: 'var(--secondary-alt)', margin: '12px 0 24px' }}>{message}</p>
            <button className="btn btn-primary" onClick={() => navigate('/auth')}>Fazer login</button>
          </>
        )}
        {status === 'error' && (
          <>
            <p style={{ fontSize: 40 }}>❌</p>
            <h2 style={{ marginTop: 12 }}>Link inválido</h2>
            <p style={{ color: 'var(--secondary-alt)', margin: '12px 0 24px' }}>{message}</p>
            <button className="btn btn-outline" onClick={() => navigate('/auth')}>Voltar ao login</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Placeholder para dashboards (fases futuras) ───────────────
function Placeholder({ label }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <h1>{label}</h1>
      <p style={{ color: 'var(--secondary-alt)' }}>Esta página será implementada nas próximas fases.</p>
      <button className="btn btn-outline" onClick={() => { logout(); navigate('/auth'); }}>Sair</button>
    </div>
  );
}

// ── App com rotas ─────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'company' ? '/empresa' : '/candidato'} replace />
          : <LandingPage />
      } />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/auth/verify-email/:token" element={<VerifyEmailPage />} />

      <Route path="/candidato" element={
        <ProtectedRoute allowedRoles={['candidate']}>
          <CandidatePage />
        </ProtectedRoute>
      } />
      <Route path="/empresa" element={
        <ProtectedRoute allowedRoles={['company']}>
          <CompanyPage />
        </ProtectedRoute>
      } />
      <Route path="/empresa/vagas/nova" element={
        <ProtectedRoute allowedRoles={['company']}>
          <JobForm />
        </ProtectedRoute>
      } />
      <Route path="/empresa/vagas/:id/editar" element={
        <ProtectedRoute allowedRoles={['company']}>
          <JobForm />
        </ProtectedRoute>
      } />
      <Route path="/empresa/vagas/:id/candidatos" element={
        <ProtectedRoute allowedRoles={['company']}>
          <JobApplicants />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminPage />
        </ProtectedRoute>
      } />

      {/* Feed de vagas — público */}
      <Route path="/jobs"     element={<JobsPage />} />
      <Route path="/jobs/:id" element={<JobDetail />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
