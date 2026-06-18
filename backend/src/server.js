require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const path      = require('path');

const authRoutes        = require('./routes/auth');
const candidateRoutes   = require('./routes/candidate');
const certificateRoutes = require('./routes/certificate');
const jobRoutes         = require('./routes/jobs');
const companyRoutes     = require('./routes/company');
const adminRoutes       = require('./routes/admin');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas
app.use('/api/auth',      authRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/candidate', certificateRoutes);
app.use('/api/jobs',      jobRoutes);
app.use('/api/company',   companyRoutes);
app.use('/api/admin',     adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date() } });
});

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada.' });
});

// Tratamento global de erros
app.use((err, req, res, _next) => {
  // Erros do multer (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'Arquivo muito grande. Verifique o limite de tamanho permitido.' });
  }
  if (err.message?.includes('Formato inválido')) {
    return res.status(400).json({ success: false, error: err.message });
  }
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
