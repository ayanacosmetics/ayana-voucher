AYANA VOUCHER ONLINE - VERSI ADMIN SETTING

PENTING:
Jangan buka file public/admin.html langsung. Kalau dibuka langsung, akan muncul error "Failed to fetch" karena halaman admin membutuhkan server API.

CARA JALANKAN DI LAPTOP/KOMPUTER:
1. Install Node.js dari https://nodejs.org
2. Extract ZIP ini.
3. Buka folder ayana_voucher_admin.
4. Klik kanan di folder, pilih Terminal / Command Prompt.
5. Jalankan:
   npm install
6. Setelah selesai, jalankan:
   npm start
7. Buka browser:
   http://localhost:3000
8. Untuk admin:
   http://localhost:3000/admin
9. PIN bawaan admin:
   123456

CARA PAKAI ONLINE UNTUK INSTAGRAM STORY:
File ini perlu dihosting di layanan yang mendukung Node.js + database SQLite, misalnya Render/Railway/VPS.
Kalau hanya diupload ke Google Drive, Canva, atau dibuka dari file HTML, fitur database dan admin tidak akan jalan.

YANG BISA DIEDIT DI ADMIN:
- Nama promo
- Jumlah voucher
- Nominal diskon
- Minimal belanja
- Batas waktu voucher
- Awalan kode voucher
- Syarat dan ketentuan
- Reset daftar klaim

CATATAN KEAMANAN:
Ganti PIN admin saat hosting dengan environment variable:
ADMIN_PIN=pin_baru_kamu
