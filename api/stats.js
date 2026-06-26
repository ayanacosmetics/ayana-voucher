const { readRange } = require('./_common');

module.exports = async function handler(req, res) {
  try {

    const voucherRows = await readRange('Voucher!A:G');

    let tersedia = 0;
    let total = 0;

    for(let i=1;i<voucherRows.length;i++){

      if(String(voucherRows[i][1]||'').trim()!=="FLASH5K") continue;

      total++;

      if(String(voucherRows[i][2]||'').trim().toUpperCase()==="TERSEDIA"){
        tersedia++;
      }

    }

    res.status(200).json({
      ok:true,
      tersedia,
      total
    });

  } catch(err){

    res.status(500).json({
      ok:false,
      message:err.message
    });

  }
}