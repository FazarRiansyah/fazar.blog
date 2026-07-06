# Aturan Pengembangan Website fazar.site

Dokumen ini berisi panduan dan aturan khusus untuk AI Agen yang membantu pengembangan website **fazar.site** agar semua perubahan tetap konsisten dengan konsep yang diinginkan pemilik proyek.

## Aturan Desain & Estetika
1. **Desain Minimalis & Bersih:** Gunakan gaya desain modern, bersih, dan minimalis. Hindari dekorasi yang terlalu ramai, neon-glow yang berlebihan, atau warna-warna mencolok (kecuali jika diminta secara eksplisit).
2. **Tema Warna:** Latar belakang utama harus berwarna putih bersih (`#ffffff` atau `#fcfcfc`) dengan teks gelap (`#111111` atau `#1a1a1a`) untuk kenyamanan membaca.
3. **Tipografi:** Gunakan font **Inter** sebagai font utama.

## Aturan Struktur Kode & Deploy
1. **Single-File Setup (Untuk Halaman Placeholder/Maintanance):** Jika sedang dalam mode pengembangan, gabungkan HTML, CSS, dan JS ke dalam satu file tunggal di `index.html` root agar proses pembaruan dan deploy sangat cepat dan mudah diuji.
2. **Pencegahan Ikon Tab (Favicon):** Gunakan baris `<link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">` untuk mencegah munculnya ikon default/perisai biru pada tab browser.
3. **Keutuhan Domain (CNAME):** Pastikan file `CNAME` yang berisi teks `fazar.site` selalu dipertahankan di root folder agar GitHub Pages tidak mengalami error 404 (Domain tidak terhubung).
4. **Git Push:** Setiap kali selesai mengedit, beritahukan pengguna untuk menjalankan perintah `git push origin main` secara lokal lewat Git Bash untuk memperbarui website di GitHub.
