const { readRange, findActivePromos } = require('./_common');

module.exports = async function handler(req, res) {
  try {
    const [promoRows, voucherRows] = await Promise.all([
      readRange('Promo!A:H'),
      readRange('Voucher!A:G')
    ]);

    const activePromos = findActivePromos(promoRows);

    if (!activePromos || activePromos.length === 0) {
      return res.status(200).json({
        ok: true,
        aktif: false,
        message: 'Belum ada promo aktif.'
      });
    }

    const promo = activePromos[0];
    const kodePromo = promo.kodePromo;

    let total = 0;
    let tersedia = 0;
    let diklaim = 0;
    let terpakai = 0;
    let klaimTerakhir = null;

    for (let i = 1; i < voucherRows.length; i++) {
      const row = voucherRows[i];
      const rowKodePromo = String(row[1] || '').trim();
      const status = String(row[2] || '').trim().toUpperCase();

      if (rowKodePromo !== kodePromo) continue;

      total++;

      if (status === 'TERSEDIA') tersedia++;
      if (status === 'DIKLAIM') diklaim++;
      if (status === 'TERPAKAI') terpakai++;

      if (status === 'DIKLAIM' || status === 'TERPAKAI') {
        klaimTerakhir = {
          kodeVoucher: row[0] || '',
          status,
          waktu: row[3] || '',
          nomorWA: row[4] || '',
          namaMember: row[5] || ''
        };
      }
    }

    return res.status(200).json({
      ok: true,
      aktif: true,
      promo,
      total,
      tersedia,
      diklaim,
      terpakai,
      klaimTerakhir
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
};