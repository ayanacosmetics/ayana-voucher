const { readRange, updateRange } = require('./_common');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        ok: false,
        message: 'Method not allowed'
      });
    }

    const kode = String(req.body.kode || '').trim().toUpperCase();

    if (!kode) {
      return res.status(400).json({
        ok: false,
        message: 'Kode voucher wajib diisi.'
      });
    }

    const voucherRows = await readRange('Voucher!A:F');

    let rowNumber = -1;
    let voucher = null;

    for (let i = 1; i < voucherRows.length; i++) {
      const row = voucherRows[i];
      const kodeVoucher = String(row[0] || '').trim().toUpperCase();

      if (kodeVoucher === kode) {
        rowNumber = i + 1;
        voucher = {
          kodeVoucher: row[0],
          kodePromo: row[1],
          status: String(row[2] || '').trim().toUpperCase(),
          waktuKlaim: row[3],
          nomorWA: row[4],
          namaMember: row[5]
        };
        break;
      }
    }

    if (!voucher) {
      return res.status(200).json({
        ok: false,
        message: 'Voucher tidak ditemukan.'
      });
    }

    if (voucher.status !== 'DIKLAIM') {
      return res.status(200).json({
        ok: false,
        message: 'Voucher belum diklaim atau tidak valid untuk digunakan.'
      });
    }

    const waktuPakai = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Makassar'
    });

    await updateRange(`Voucher!C${rowNumber}:D${rowNumber}`, [[
      'TERPAKAI',
      waktuPakai
    ]]);

    return res.status(200).json({
      ok: true,
      message: 'Voucher berhasil digunakan.',
      kodeVoucher: voucher.kodeVoucher,
      namaMember: voucher.namaMember,
      nomorWA: voucher.nomorWA,
      waktuPakai
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
};