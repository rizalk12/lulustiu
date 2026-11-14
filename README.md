# LulusTIU — Pelatih TIU Numerik Offline-First

Proyek untuk **#BuildHybridAI 2026** (Google × Devpost) — aplikasi web pelatih TIU numerik CPNS yang memadukan **AI on-device** (Gemini Nano) dan **AI cloud** (Gemini) lewat **Firebase AI Logic hybrid inference**.

**Masalahnya nyata:** jutaan peserta CPNS gagal SKD di TIU numerik (deret, aritmatika cerita, perbandingan kuantitatif). Pembuat app ini mengalaminya sendiri — skor tryout diagnostik TIU 75/175, di bawah passing grade 80, dengan 15 dari 20 kesalahan di soal numerik. Dan banyak peserta belajar di perjalanan atau daerah bersinyal buruk, saat app belajar biasa mati total.

**Pembagian hybrid-nya:**
- **Hint (on-device, `PREFER_ON_DEVICE`):** petunjuk langkah pertama — instan, privat, tetap jalan tanpa internet.
- **Pembahasan + generator soal baru (cloud, `PREFER_IN_CLOUD`):** penjelasan langkah demi langkah dan set soal baru per subtipe.
- **Fallback berlapis:** tanpa Chrome desktop (mis. di HP Android), SDK jatuh ke cloud; tanpa Firebase sama sekali, app tetap 100% berfungsi dari bank soal + pembahasan bawaan. Itu intinya hybrid: tidak ada titik mati.

## Isi app

- **Latihan** per subtipe (Deret, Aritmatika Cerita, Perbandingan Kuantitatif, Bilangan) — 18 soal seed original sesuai kisi-kisi KepmenPANRB 321/2024.
- **Diagnostik mini 10 soal** → peta subtipe terlemah + rekomendasi fokus.
- **Progres** per subtipe tersimpan lokal (localStorage).

## Menjalankan lokal

```bash
cd lulustiu
python3 -m http.server 8000
# buka http://localhost:8000
```

Untuk pratinjau satu file: `python3 build_single.py` → buka `dist/lulustiu-standalone.html`.

## Menyambungkan Firebase AI Logic (butuh akun pemilik proyek)

1. Buat proyek di [Firebase Console](https://console.firebase.google.com) → Add app → Web.
2. Salin `firebase-config.example.js` menjadi `firebase-config.js`, isi dari console.
3. Di console: **Build → AI Logic → Get started** → pilih **Gemini Developer API** (gratis untuk mulai). Sejak Juli 2026, alur ini otomatis mengaktifkan **Firebase App Check** untuk AI Logic — untuk localhost, daftarkan debug provider bila diminta console.
4. Muat ulang app → pill status menjadi "AI: hybrid aktif".
5. Deploy (opsional): `npx firebase-tools deploy --only hosting`.

**Syarat on-device:** Chrome **desktop** v139+ (Gemini Nano lewat Prompt API; inisialisasi model butuh interaksi pengguna). Di perangkat lain, inference jatuh ke cloud secara mulus — perilaku ini memang yang dinilai: penggunaan hybrid yang efektif.

## Status & catatan

- Scaffold v0.1 (8 Nov 2026): UI + mesin latihan/diagnostik/progres + bank soal + lapisan hybrid lengkap dengan fallback offline.
- Nama model cloud (`CLOUD_MODEL` di `firebase-ai.js`) diverifikasi ulang terhadap dokumentasi + aturan resmi hackathon yang rilis 9 Nov 2026.
- Deadline submission: **30 Nov 2026 14:00 PT (1 Des 2026 05:00 WIB)**. Target submit internal: 28–29 Nov 2026.
