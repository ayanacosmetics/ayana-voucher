const { normalizePhone, readRange, updateRange, findActivePromos } = require('./_common');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok:false, message:'Method not allowed' });
    }

    const { phone: rawPhone, kodePromo: rawKodePromo } = req.body || {};
    const phone = normalizePhone(rawPhone);
    const kodePromo = String(rawKodePromo || '').trim();

    if (!phone) return res.status(400).json({ ok:false, message:'Nomor WhatsApp wajib diisi.' });
    if (!phone.startsWith('62')) return res.status(400).json({ ok:false, message:'Gunakan nomor WhatsApp format 62 atau 08.' });
    if (!kodePromo) return res.status(400).json({ ok:false, message:'Pilih promo terlebih dahulu.' });

    const [memberRows, promoRows, voucherRows, logRows, logGagalRows] = await Promise.all([
      readRange('Member!A:B'),
      readRange('Promo!A:H'),
      readRange('Voucher!A:G'),
      readRange('Log Non Member!A:D'),
      readRange('Log Klaim Gagal!A:G')
    ]);

    let namaMember = '';

    for (let i = 1; i < memberRows.length; i++) {
      if (normalizePhone(memberRows[i][0]) === phone) {
        namaMember = memberRows[i][1] || '';
        break;
      }
    }

    if (!namaMember) {
      const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
      const nextRow = (logRows.length || 1) + 1;

      await updateRange(`Log Non Member!A${nextRow}:D${nextRow}`, [[
        now,
        phone,
        kodePromo,
        'Nomor belum terdaftar sebagai member'
      ]]);

      return res.status(200).json({
        ok:false,
        status:'notmember',
        message:'Nomor WhatsApp ini belum terdaftar sebagai Member Ayana Cosmetics.'
      });
    }

    const promo = findActivePromos(promoRows).find(p => p.kodePromo === kodePromo);

    if (!promo) {
      return res.status(200).json({
        ok:false,
        status:'inactive',
        message:'Promo tidak aktif, belum dimulai, atau sudah berakhir.'
      });
    }

    for (let i = 1; i < voucherRows.length; i++) {
      const rowKodePromo = String(voucherRows[i][1] || '').trim();
      const rowPhone = normalizePhone(voucherRows[i][4]);

      if (rowKodePromo === kodePromo && rowPhone === phone) {
        const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
        const nextLogGagalRow = (logGagalRows.length || 1) + 1;

        await updateRange(`Log Klaim Gagal!A${nextLogGagalRow}:G${nextLogGagalRow}`, [[
          now,
          phone,
          namaMember,
          kodePromo,
          promo.namaPromo,
          'DOUBLE KLAIM',
          'Nomor WhatsApp ini mencoba klaim voucher lebih dari satu kali'
        ]]);

        return res.status(200).json({
          ok:false,
          status:'duplicate',
          namaPromo: promo.namaPromo,
          message:'Nomor WhatsApp ini sudah pernah klaim voucher untuk promo ini.'
        });
      }
    }

    let sheetRow = -1;
    let kodeVoucher = '';
    let hadiahVoucher = '';

    for (let i = 1; i < voucherRows.length; i++) {
      const rowKodePromo = String(voucherRows[i][1] || '').trim();
      const rowStatus = String(voucherRows[i][2] || '').trim().toUpperCase();

      if (rowKodePromo === kodePromo && rowStatus === 'TERSEDIA') {
        sheetRow = i + 1;
        kodeVoucher = String(voucherRows[i][0] || '').trim();

        hadiahVoucher = voucherRows[i][6];

        if (hadiahVoucher === undefined || hadiahVoucher === null || String(hadiahVoucher).trim() === '') {
          hadiahVoucher = promo.diskon || 0;
        }

        hadiahVoucher = String(hadiahVoucher).replace(/[^\d]/g, '');

        if (!hadiahVoucher) hadiahVoucher = promo.diskon || 0;

        break;
      }
    }

    if (sheetRow < 0) {
      const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
      const nextLogGagalRow = (logGagalRows.length || 1) + 1;

      await updateRange(`Log Klaim Gagal!A${nextLogGagalRow}:G${nextLogGagalRow}`, [[
        now,
        phone,
        namaMember,
        kodePromo,
        promo.namaPromo,
        'VOUCHER HABIS',
        'Member mencoba klaim, tetapi voucher sudah habis'
      ]]);

      return res.status(200).json({
        ok:false,
        status:'habis',
        namaPromo: promo.namaPromo,
        message:`${promo.namaPromo} hari ini sudah habis.`
      });
    }

    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

    await updateRange(`Voucher!C${sheetRow}:F${sheetRow}`, [[
      'DIKLAIM',
      now,
      phone,
      namaMember
    ]]);

    return res.status(200).json({
      ok:true,
      status:'success',
      nama:namaMember,
      phone,
      kodeVoucher,
      hadiahVoucher,
      ...promo
    });

  } catch (err) {
    return res.status(500).json({
      ok:false,
      status:'error',
      message: err.message
    });
  }
};