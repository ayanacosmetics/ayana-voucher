const { google } = require('googleapis');
const SPREADSHEET_ID = process.env.SHEET_ID;

function normalizePhone(phone) {
  phone = String(phone || '').replace(/\D/g, '');
  if (phone.startsWith('08')) phone = '62' + phone.substring(1);
  return phone;
}
function parseSheetDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const months = {januari:0,februari:1,maret:2,april:3,mei:4,juni:5,juli:6,agustus:7,september:8,oktober:9,november:10,desember:11};
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  m = s.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (m && months[m[2]] !== undefined) return new Date(Number(m[3]), months[m[2]], Number(m[1]));
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function todayDate() { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
function rupiah(n) { return 'Rp' + Number(n || 0).toLocaleString('id-ID'); }
async function getSheets() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}
async function readRange(range) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  return res.data.values || [];
}
async function updateRange(range, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values }
  });
}
function findActivePromos(promoRows) {
  const today = todayDate();
  const promos = [];
  for (let i = 1; i < promoRows.length; i++) {
    const r = promoRows[i];
    const kodePromo = String(r[0] || '').trim();
    const namaPromo = String(r[1] || '').trim();
    const diskon = r[2] || '';
    const minimal = r[3] || '';
    const mulai = r[4] || '';
    const berakhir = r[5] || '';
    const status = String(r[6] || '').trim().toUpperCase();
    if (!kodePromo || status !== 'AKTIF') continue;
    const start = parseSheetDate(mulai);
    const end = parseSheetDate(berakhir);
    if (!start || !end) continue;
    if (today < start || today > end) continue;
    promos.push({ kodePromo, namaPromo, diskon, minimal, mulai, berakhir, label: `${namaPromo} - ${rupiah(diskon)}` });
  }
  return promos;
}
module.exports = { normalizePhone, readRange, updateRange, findActivePromos };
