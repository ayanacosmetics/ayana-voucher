const stockEl = document.getElementById('stock');
const btn = document.getElementById('claimBtn');
const result = document.getElementById('result');
const formArea = document.getElementById('formArea');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
let currentLimit = 3;

function formatDateLocal(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadSettings() {
  const res = await fetch('/api/settings');
  const s = await res.json();
  currentLimit = s.voucherLimit;
  document.getElementById('promoName').textContent = s.promoName || 'FLASH VOUCHER';
  document.getElementById('discountText').textContent = s.discountText;
  document.getElementById('minimumText').textContent = `Minimal belanja ${s.minimumText}`;
  document.getElementById('deadline').textContent = `Batas waktu: ${formatDateLocal(s.expiryDatetime)}`;
  document.getElementById('terms').textContent = s.terms;
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    stockEl.textContent = `Sisa voucher: ${data.remaining} dari ${data.limit}`;
    if (data.expired) {
      btn.disabled = true;
      formArea.classList.add('hidden');
      showMessage('Maaf, masa berlaku voucher sudah berakhir.', false);
    } else if (data.remaining <= 0) {
      btn.disabled = true;
      formArea.classList.add('hidden');
      showMessage('Maaf, voucher sudah habis.', false);
    }
  } catch (err) {
    stockEl.textContent = 'Gagal mengecek sisa voucher.';
  }
}

function showMessage(message, success, code = '', data = {}) {
  result.classList.remove('hidden');
  if (success) {
    result.innerHTML = `<strong>Selamat! Voucher kamu berhasil diklaim.</strong><span class="code">${code}</span><p>Potongan ${data.discountText || ''}, minimal belanja ${data.minimumText || ''}.</p><p>Berlaku sampai ${formatDateLocal(data.expiryDatetime)}.</p><p>Screenshot halaman ini dan tunjukkan ke kasir.</p>`;
  } else {
    result.innerHTML = `<strong>${message}</strong>`;
  }
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  btn.textContent = 'Memproses...';
  try {
    const res = await fetch('/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.value, phone: phoneInput.value })
    });
    const data = await res.json();
    if (data.success) {
      formArea.classList.add('hidden');
      stockEl.textContent = `Sisa voucher: ${data.remaining} dari ${currentLimit}`;
      showMessage('', true, data.code, data);
    } else {
      showMessage(data.message || 'Voucher gagal diklaim.', false);
      if (!data.soldOut && !data.expired) btn.disabled = false;
    }
  } catch (err) {
    showMessage('Koneksi bermasalah. Coba lagi.', false);
    btn.disabled = false;
  }
  btn.textContent = 'Klaim Voucher Sekarang';
});

loadSettings().then(loadStatus);
