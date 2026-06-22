const { normalizePhone, readRange, updateRange, findActivePromos } = require('./_common');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, message:'Method not allowed' });

    const { phone: rawPhone, kodePromo: rawKodePromo } = req.body || {};
    const phone = normalizePhone(rawPhone);
    const kodePromo = String(rawKodePromo || '').trim();

    if (!phone) return res.status(400).json({ ok:false, message:'Nomor WhatsApp wajib diisi.' });
    if (!phone.startsWith('62')) return res.status(400).json({ ok:false, message:'Gunakan nomor WhatsApp format 62 atau 08.' });
    if (!kodePromo) return res.status(400).json({ ok:false, message:'Pilih promo terlebih dahulu.' });

    const [memberRows, promoRows, voucherRows] = await Promise.all([
      readRange('Member!A:B'), readRange('Promo!A:H'), readRange('Voucher!A:F')
    ]);

    let namaMember = '';
    for (let i = 1; i < memberRows.length; i++) {
      if (normalizePhone(memberRows[i][0]) === phone) { namaMember = memberRows[i][1] || ''; break; }
    }
    if (!namaMember) return res.status(200).json({ ok:false, status:'notmember', message:'Nomor WhatsApp ini belum terdaftar sebagai Member Ayana Cosmetics.' });

    const promo = findActivePromos(promoRows).find(p => p.kodePromo === kodePromo);
    if (!promo) return res.status(200).json({ ok:false, status:'inactive', message:'Promo tidak aktif, belum dimulai, atau sudah berakhir.' });

    for (let i = 1; i < voucherRows.length; i++) {
      if (String(voucherRows[i][1] || '').trim() === kodePromo && normalizePhone(voucherRows[i][4]) === phone) {
        return res.status(200).json({ ok:false, status:'duplicate', message:'Nomor WhatsApp ini sudah pernah klaim voucher untuk promo ini.' });
      }
    }

    let sheetRow = -1, kodeVoucher = '';
    for (let i = 1; i < voucherRows.length; i++) {
      if (String(voucherRows[i][1] || '').trim() === kodePromo && String(voucherRows[i][2] || '').trim().toUpperCase() === 'TERSEDIA') {
        sheetRow = i + 1;
        kodeVoucher = String(voucherRows[i][0] || '').trim();
        break;
      }
    }
    if (sheetRow < 0) return res.status(200).json({ ok:false, status:'habis', message:'Yah, voucher untuk promo ini sudah habis.' });

    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    await updateRange(`Voucher!C${sheetRow}:F${sheetRow}`, [['TERPAKAI', now, phone, namaMember]]);

    return res.status(200).json({ ok:true, status:'success', nama:namaMember, phone, kodeVoucher, ...promo });
  } catch (err) {
    return res.status(500).json({ ok:false, status:'error', message: err.message });
  }
};
