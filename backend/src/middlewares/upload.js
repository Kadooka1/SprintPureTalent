const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Avatares ──────────────────────────────────────────────────

const avatarsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: avatarsDir,
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Formato inválido. Use JPEG, PNG ou WebP.'));
    }
    cb(null, true);
  },
});

// ── Certificados ──────────────────────────────────────────────

const certsDir = path.join(__dirname, '..', '..', 'uploads', 'certificates');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

const certStorage = multer.diskStorage({
  destination: certsDir,
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const certificateUpload = multer({
  storage: certStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Formato inválido. Use PDF, JPG ou PNG.'));
    }
    cb(null, true);
  },
});

// ── Logos de empresa ──────────────────────────────────────────

const logosDir = path.join(__dirname, '..', '..', 'uploads', 'logos');
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: logosDir,
  filename: (req, file, cb) => {
    cb(null, `company-${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Formato inválido. Use JPEG, PNG ou WebP.'));
    }
    cb(null, true);
  },
});

module.exports = { avatarUpload, certificateUpload, logoUpload };
