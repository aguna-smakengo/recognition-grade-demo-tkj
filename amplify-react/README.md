# 🌌 FaceGrade AI — React Cosmic Kiosk (Amplify Edition) 🚀

Versi FaceGrade AI premium menggunakan **React & Vite** yang terintegrasi langsung dengan **AWS SDK v3 for Browser**! Dirancang khusus agar Anda dapat menyimpan kredensial AWS secara aman dan profesional langsung di **AWS Amplify Console** sebagai Environment Variables!

## ✨ Fitur Unggulan Arsitektur React
1. **Keamanan Maksimal (Amplify Environment Variables):** Anda tidak perlu lagi mengetik kredensial AWS Academy di browser setiap kali refresh. Cukup simpan di Amplify Console, dan aplikasi akan otomatis mengambilnya saat proses build!
2. **Kios Pintar Pameran:** Tetap dilengkapi dengan tombol **Gear Tersembunyi (⚙️)** di pojok kanan atas untuk mengganti kredensial secara dinamis apabila LabRole Anda kedaluwarsa di tengah pameran tanpa harus melakukan build ulang!
3. **Procedural Title & Tagline Generator:** Lebih dari **1 Juta kombinasi** komedi kosmik khas sekolah Indonesia/Jawa berbasis kondisi akademis, keagamaan, dan catatan pelanggaran (ML, tidur, uang kas, dll).
4. **Pemberitahuan Interaktif (Toasts):** UI modern dengan notifikasi mengambang untuk setiap status pemindaian, perubahan data, dan penyimpanan database.
5. **Zero CORS & Zero Latency:** Bebas hambatan API Gateway & Lambda! Pemindaian wajah diproses instan melalui koneksi langsung ke AWS.

---

## 🛠️ Menjalankan Secara Lokal (Local Development)
1. Masuk ke folder `amplify-react`:
   ```bash
   cd amplify-react
   ```
2. Jalankan server lokal:
   ```bash
   npm run dev
   ```
3. Buka URL lokal (`http://localhost:5173`) di browser Anda!

---

## 🔒 Konfigurasi Kredensial di AWS Amplify Console

Untuk menyimpan kredensial agar otomatis dimuat tanpa input manual:

1. Buka **AWS Amplify Console** dan pilih aplikasi Anda.
2. Di menu navigasi sebelah kiri, klik **Hosting** ➡️ **Environment variables** (Variabel lingkungan).
3. Klik **Manage variables** (Kelola variabel) dan tambahkan variabel berikut:
   * `VITE_AWS_ACCESS_KEY_ID` ➡️ *(Isi dengan Access Key ID dari AWS Academy)*
   * `VITE_AWS_SECRET_ACCESS_KEY` ➡️ *(Isi dengan Secret Access Key dari AWS Academy)*
   * `VITE_AWS_SESSION_TOKEN` ➡️ *(Isi dengan Session Token dari AWS Academy)*
   * `VITE_DYNAMODB_TABLE` ➡️ `StudentGrades` *(atau nama tabel Anda)*
   * `VITE_REKOGNITION_COLLECTION` ➡️ `student-faces` *(atau Collection ID Anda)*
4. Klik **Save**.
5. *Catatan: Karena AWS Academy LabRole kedaluwarsa setiap 4 jam, jika Anda ingin memperbarui kredensial selama pameran berlangsung tanpa build ulang, Anda cukup klik tombol Gear (⚙️) di pojok kanan atas aplikasi, tempel kredensial baru, lalu simpan! Kiosk akan langsung bekerja dengan kredensial baru.*

---

## 🚢 Cara Deploy ke AWS Amplify

### Opsi A: Hubungkan ke GitHub (Sangat Direkomendasikan & Otomatis)
1. Hubungkan repositori GitHub ini ke **AWS Amplify**.
2. Amplify akan membaca file `amplify.yml` secara otomatis untuk melakukan instalasi dan build dengan satu klik!

### Opsi B: Drag & Drop Instan (Hanya 10 Detik!)
1. Jalankan perintah kompilasi lokal untuk membuat folder produksi:
   ```bash
   npm run build
   ```
2. Masuk ke folder `amplify-react` dan kompres folder bernama **`dist`** menjadi file `.zip` (misalnya: `dist.zip`).
   * *Catatan: Pastikan file `index.html` berada di tingkat paling atas (root) di dalam file `.zip`.*
3. Buka **AWS Amplify**, pilih **Deploy without Git provider**, lalu tarik (Drag & Drop) file `dist.zip` Anda.
4. Klik **Save and deploy**! Kiosk Anda langsung online di URL publik Amplify!

---

🌌 *Dibuat dengan penuh dedikasi oleh Antigravity untuk menghadirkan keandalan teknologi tingkat tinggi sepanjang pameran berlangsung!*
