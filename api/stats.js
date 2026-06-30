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
        tersedia: 0,
        total: 0
      });
    }

    const kodePromoAktif = activePromos[0].kodePromo;

    let tersedia = 0;
    let total = 0;

    for (let i = 1; i < voucherRows.length; i++) {
      const rowKodePromo = String(voucherRows[i][1] || '').trim();
      const rowStatus = String(voucherRows[i][2] || '').trim().toUpperCase();

      if (rowKodePromo !== kodePromoAktif) continue;

      total++;

      if (rowStatus === 'TERSEDIA') {
        tersedia++;
      }
    }

    return res.status(200).json({
      ok: true,
      kodePromo: kodePromoAktif,
      tersedia,
      total
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
};