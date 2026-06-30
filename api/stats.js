const { readRange, updateRange, findActivePromos } = require('./_common');

async function setPromoSelesai(kodePromo, promoRows) {
  for (let i = 1; i < promoRows.length; i++) {
    const rowKodePromo = String(promoRows[i][0] || '').trim();

    if (rowKodePromo === kodePromo) {
      const sheetRow = i + 1;
      await updateRange(`Promo!G${sheetRow}:G${sheetRow}`, [['SELESAI']]);
      return true;
    }
  }

  return false;
}

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
        total: 0,
        namaPromo: ''
      });
    }

    const promoAktif = activePromos[0];
    const kodePromoAktif = promoAktif.kodePromo;

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

    if (total > 0 && tersedia === 0) {
      await setPromoSelesai(kodePromoAktif, promoRows);
    }

    return res.status(200).json({
      ok: true,
      kodePromo: kodePromoAktif,
      namaPromo: promoAktif.namaPromo,
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