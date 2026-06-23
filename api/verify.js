const { readRange, normalizePhone } = require('./_common');

module.exports = async function handler(req, res) {
  try {
    const kode = String(req.query.kode || '').trim().toUpperCase();

    if (!kode) {
      return res.status(400).json({
        ok: false,
        message: 'Kode voucher wajib diisi.'
      });
    }

    const [voucherRows, promoRows] = await Promise.all([
      readRange('Voucher!A:F'),
      readRange('Promo!A:H')
    ]);

    let found = null;

    for (let i = 1; i < voucherRows.length; i++) {
      const row = voucherRows[i];
      const kodeVoucher = String(row[0] || '').trim().toUpperCase();

      if (kodeVoucher === kode) {
        found = {
          kodeVoucher: row[0],
          kodePromo: row[1],
          status: row[2],
          waktuKlaim: row[3],
          nomorWA: row[4],
          namaMember: row[5]
        };
        break;
      }
    }

    if (!found) {
      return res.status(200).json({
        ok: false,
        status: 'not_found',
        message: 'Voucher tidak ditemukan.'
      });
    }

    let promo = {};
    for (let i = 1; i < promoRows.length; i++) {
      if (String(promoRows[i][0] || '').trim() === String(found.kodePromo || '').trim()) {
        promo = {
          namaPromo: promoRows[i][1],
          diskon: promoRows[i][2],
          minimal: promoRows[i][3],
          mulai: promoRows[i][4],
          berakhir: promoRows[i][5],
          statusPromo: promoRows[i][6]
        };
        break;
      }
    }

    return res.status(200).json({
      ok: true,
      status: found.status,
      voucher: found,
      promo: promo
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
};