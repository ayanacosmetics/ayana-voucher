const { readRange, updateRange } = require('./_common');

module.exports = async function handler(req, res) {
  try {
    const halaman = String(req.body?.halaman || 'voucher');
    const browser = String(req.body?.browser || '');

    const rows = await readRange('Log Kunjungan!A:C');
    const nextRow = (rows.length || 1) + 1;

    const now = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Makassar'
    });

    await updateRange(`Log Kunjungan!A${nextRow}:C${nextRow}`, [[
      now,
      halaman,
      browser
    ]]);

    return res.status(200).json({ ok: true });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
};