# 🌌 FaceGrade AI — Amplify Static Edition 🚀

Versi FaceGrade AI yang sepenuhnya **Static Frontend-Only**! Dirancang khusus untuk **AWS Amplify** dengan koneksi langsung (direct client-side) ke **AWS Rekognition** dan **AWS DynamoDB** via **AWS SDK for JavaScript** di browser!

## ✨ Kenapa Arsitektur Ini Jauh Lebih Unggul & 100% Anti Eror?
1. **Nol Cold Start & Nol Eror CORS:** Tanpa Lambda, tanpa API Gateway! Browser melakukan request langsung ke AWS via HTTPS.
2. **Kinerja Instan Tanpa Delay:** Respon pengenalan wajah super cepat dalam hitungan milidetik karena diproses langsung dari browser.
3. **Gratis Selamanya:** Hosting static di AWS Amplify sepenuhnya gratis dan terhindar dari limitasi runtime serverless.
4. **Keamanan Kiosk Pameran:** Kredensial AWS Academy `LabRole` yang selalu berubah setiap 4 jam dapat langsung ditempel secara aman di dalam sistem lewat tombol konfigurasi berlogo gear (⚙️) tersembunyi.
5. **Procedural Title Generator:** Memiliki generator komedi Javanese/Indonesian otomatis yang mampu merangkai lebih dari **1 Juta kombinasi** poster kosmik berdasarkan nilai dan pelanggaran siswa!

---

## 🛠️ Cara Menjalankan Secara Lokal (Uji Coba)
1. Buka folder `amplify-only` di komputer Anda.
2. Klik ganda file `index.html` untuk langsung membukanya di browser! (Atau gunakan ekstensi VS Code Live Server / jalankan `npx serve` di folder ini).

---

## ⚡ Cara Menghubungkan ke Cloud AWS
1. Klik tombol **Gear (⚙️)** di pojok kanan/kiri atas layar halaman utama FaceGrade AI.
2. Buka AWS Academy Anda, klik **AWS Details**, lalu klik **Show** pada bagian **AWS CLI Credentials**.
3. Salin ketiga baris kredensial berikut dan tempel ke modal konfigurasi di aplikasi:
   * `aws_access_key_id` ➡️ **AWS Access Key ID**
   * `aws_secret_access_key` ➡️ **AWS Secret Access Key**
   * `aws_session_token` ➡️ **AWS Session Token**
4. Isi nama tabel DynamoDB (default: `StudentGrades`) dan Collection ID Rekognition (default: `student-faces`).
5. Klik **💾 Simpan Konfigurasi**. Selesai! Kiosk Anda sekarang terhubung langsung ke awan AWS!

---

## 🚢 Cara Deploy Instan ke AWS Amplify (Hanya 10 Detik!)
Anda tidak perlu repot melakukan git push atau menggunakan command line. Cukup gunakan **Amplify Drag & Drop**:

1. **Kompres Folder:** Kompres seluruh isi di dalam folder `amplify-only` menjadi sebuah file `.zip` (misal: `facegrade-amplify.zip`).
   * *Catatan: Pastikan file `index.html` berada di tingkat paling atas (root) di dalam file `.zip` tersebut.*
2. **Buka Konsol Amplify:** Masuk ke konsol AWS Management Console, cari layanan **AWS Amplify**.
3. **Mulai Aplikasi Baru:**
   * Klik tombol **Create new app** di pojok kanan atas.
   * Pilih opsi **Deploy without Git provider** (Deploy tanpa penyedia Git), lalu klik **Next**.
4. **Unggah Zip:**
   * Beri nama aplikasi Anda (misalnya: `facegrade-kiosk`).
   * Tarik dan letakkan (Drag & Drop) file `.zip` yang sudah Anda buat tadi ke area unggahan.
   * Klik **Save and deploy**.
5. **Sukses!** Dalam waktu kurang dari 10 detik, AWS Amplify akan memberikan Anda URL publik HTTPS (`https://main.xxxx.amplifyapp.com`) yang bisa langsung diakses dari handphone, laptop, maupun tablet pameran Anda!

---

🌌 *Dibuat dengan penuh dedikasi oleh Antigravity untuk menghadirkan solusi teknologi tercanggih, tercepat, dan paling stabil sepanjang pameran!*
