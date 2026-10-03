// ===================================================
//  Photo -> Link  (Simple image hosting website)
//  Chalane ke liye:  node server.js
//  Phir browser me kholo:  http://localhost:3000
// ===================================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) uploads folder (yahin photos save hongi)
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 2) File kahan aur kis naam se save ho
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const id = crypto.randomBytes(6).toString('hex'); // random naam = link
    cb(null, Date.now().toString(36) + '-' + id + ext);
  },
});

// 3) Sirf image allow karo, max 10 MB
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
    if (ok.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Sirf image file allowed hai (jpg, png, gif, webp)'));
  },
});

// 4) Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/i', express.static(UPLOAD_DIR, { maxAge: '365d' })); // yahan se image dikhegi

// 5) Upload API -- front-end yahan file bhejta hai
app.post('/upload', (req, res) => {
  upload.array('photos', 10)(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, error: err.message });
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ ok: false, error: 'Koi file nahi mili' });

    // Public base URL (hosting par apne-aap sahi domain lega)
    const base = (req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.get('host');

    const files = req.files.map((f) => ({
      name: f.originalname,
      size: f.size,
      url: base + '/i/' + f.filename,
    }));
    res.json({ ok: true, files });
  });
});

// 6) Saari uploaded photos ki list
app.get('/api/list', (req, res) => {
  const base = (req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.get('host');
  const files = fs
    .readdirSync(UPLOAD_DIR)
    .map((n) => ({ n, t: fs.statSync(path.join(UPLOAD_DIR, n)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .slice(0, 60)
    .map((f) => ({ url: base + '/i/' + f.n }));
  res.json({ ok: true, files });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server chal raha hai:  http://localhost:' + PORT);
});
