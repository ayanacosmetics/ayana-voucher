const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(path.join(__dirname, 'voucher.db'));

const defaultSettings = {
  promo_name: 'FLASH VOUCHER AYANA',
  voucher_limit: '3',
  discount_amount: '5000',
  minimum_purchase: '50000',
  expiry_datetime: '2026-06-30T22:00',
  terms: 'Tunjukkan kode voucher ke kasir saat belanja di Ayana Cosmetics. Berlaku untuk 1 kali transaksi dan tidak bisa digabung promo lain.',
  code_prefix: 'AYANA'
};

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT,
    phone TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  Object.entries(defaultSettings).forEach(([key, value]) => stmt.run(key, value));
  stmt.finalize();
});

function getSettings(callback) {
  db.all('SELECT key, value FROM settings', (err, rows) => {
    if (err) return callback(err);
    const s = { ...defaultSettings };
    rows.forEach(r => { s[r.key] = r.value; });
    s.voucher_limit = Number(s.voucher_limit || 3);
    s.discount_amount = Number(s.discount_amount || 5000);
    s.minimum_purchase = Number(s.minimum_purchase || 50000);
    callback(null, s);
  });
}

function rupiah(n) {
  return new Intl.NumberFormat('id-ID').format(Number(n || 0));
}

function isExpired(settings) {
  if (!settings.expiry_datetime) return false;
  return new Date() > new Date(settings.expiry_datetime);
}

function makeCode(prefix, number) {
  return `${prefix || 'AYANA'}${String(number).padStart(2, '0')}`;
}

function requireAdmin(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.query.pin || req.body.pin;
  if (String(pin) !== String(ADMIN_PIN)) {
    return res.status(401).json({ error: 'PIN admin salah.' });
  }
  next();
}

app.get('/api/settings', (req, res) => {
  getSettings((err, settings) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({
      promoName: settings.promo_name,
      voucherLimit: settings.voucher_limit,
      discountAmount: settings.discount_amount,
      discountText: `Rp${rupiah(settings.discount_amount)}`,
      minimumPurchase: settings.minimum_purchase,
      minimumText: `Rp${rupiah(settings.minimum_purchase)}`,
      expiryDatetime: settings.expiry_datetime,
      terms: settings.terms,
      codePrefix: settings.code_prefix,
      expired: isExpired(settings)
    });
  });
});

app.get('/api/status', (req, res) => {
  getSettings((err, settings) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    db.get('SELECT COUNT(*) AS total FROM claims', (err2, row) => {
      if (err2) return res.status(500).json({ error: 'Database error' });
      const claimed = row.total || 0;
      res.json({
        limit: settings.voucher_limit,
        claimed,
        remaining: Math.max(0, settings.voucher_limit - claimed),
        expired: isExpired(settings),
        expiryDatetime: settings.expiry_datetime
      });
    });
  });
});

app.post('/api/claim', (req, res) => {
  const name = (req.body.name || '').trim().slice(0, 80);
  const phone = (req.body.phone || '').trim().slice(0, 30);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';

  getSettings((err, settings) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    if (isExpired(settings)) {
      return res.json({ success: false, expired: true, message: 'Maaf, masa berlaku voucher sudah berakhir.' });
    }

    db.serialize(() => {
      db.get('SELECT COUNT(*) AS total FROM claims', (err2, row) => {
        if (err2) return res.status(500).json({ success: false, message: 'Database error.' });
        const claimed = row.total || 0;
        if (claimed >= settings.voucher_limit) {
          return res.json({ success: false, soldOut: true, message: 'Maaf, voucher sudah habis.' });
        }
        const code = makeCode(settings.code_prefix, claimed + 1);
        db.run(
          'INSERT INTO claims (code, name, phone, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
          [code, name, phone, ip, ua],
          function(insertErr) {
            if (insertErr) return res.status(500).json({ success: false, message: 'Voucher gagal diklaim. Coba lagi.' });
            res.json({
              success: true,
              code,
              remaining: settings.voucher_limit - claimed - 1,
              discountText: `Rp${rupiah(settings.discount_amount)}`,
              minimumText: `Rp${rupiah(settings.minimum_purchase)}`,
              expiryDatetime: settings.expiry_datetime
            });
          }
        );
      });
    });
  });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get('/api/admin/claims', requireAdmin, (req, res) => {
  db.all('SELECT id, code, name, phone, created_at FROM claims ORDER BY id ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  getSettings((err, settings) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(settings);
  });
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const allowed = ['promo_name','voucher_limit','discount_amount','minimum_purchase','expiry_datetime','terms','code_prefix'];
  const updates = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates.push([key, String(req.body[key]).trim()]);
  }
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  updates.forEach(([key, value]) => stmt.run(key, value));
  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: 'Gagal menyimpan pengaturan.' });
    res.json({ success: true });
  });
});

app.post('/api/admin/reset-claims', requireAdmin, (req, res) => {
  db.run('DELETE FROM claims', err => {
    if (err) return res.status(500).json({ error: 'Gagal reset klaim.' });
    res.json({ success: true });
  });
});

app.listen(PORT, () => console.log(`Ayana voucher app running on http://localhost:${PORT}`));
