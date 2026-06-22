const { readRange, findActivePromos } = require('./_common');
module.exports = async function handler(req, res) {
  try {
    const promoRows = await readRange('Promo!A:H');
    return res.status(200).json({ ok: true, promos: findActivePromos(promoRows) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
};
