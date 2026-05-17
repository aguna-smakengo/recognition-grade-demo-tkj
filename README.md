# 🌌 FaceGrade AI — Face Recognition & Gamified Grade Kiosk

Aplikasi pengenalan wajah cerdas dengan sistem grading gamifikasi premium dan visualisasi kosmik galaksi! Didukung penuh oleh **Amazon Rekognition** (Visi Komputer AI) dan **Amazon DynamoDB** (Database Skala Dunia).

Proyek ini mendukung **Tiga Metode Deployment** yang fleksibel: dari serverless awan skala industri hingga running lokal di laptop!

---

## ⚡ METODE 1: Arsitektur Serverless Split (Rekomendasi Utama Pameran 🌟)

Metode paling modern, andal, gratis (AWS Free Tier), dan tanpa server fisik! 
* **Backend:** Flask API di-deploy ke **AWS Lambda + API Gateway** (Serverless).
* **Frontend:** Aset HTML/CSS/JS di-deploy ke CDN global **AWS Amplify Hosting**.

### 🛠️ Langkah A: Deploy Backend (Terraform)
1. Pastikan **Terraform** dan **AWS CLI** sudah terkonfigurasi di laptop kamu.
2. Inisialisasi dan luncurkan infrastruktur backend:
   ```powershell
   terraform init
   terraform apply -auto-approve
   ```
3. Terraform otomatis akan menginstall library, membuat paket zip, mendaftarkan fungsi ke Lambda (menggunakan `LabRole` AWS Academy), dan memunculkan output URL API Gateway di terminal, contoh:
   ```
   api_gateway_url = "https://wohnyql2od.execute-api.us-east-1.amazonaws.com"
   ```

### 🌐 Langkah B: Sambungkan & Deploy Frontend
1. Buka [static/app.js](static/app.js) baris 89.
2. Ganti `'https://YOUR_API_GATEWAY_URL'` dengan URL output dari Terraform tadi.
3. Push perubahan ke GitHub kamu:
   ```powershell
   git add static/app.js
   git commit -m "Update API Gateway URL"
   git push origin main
   ```
4. Buka **AWS Amplify Console** di browser, hubungkan ke repositori GitHub kamu, pilih branch `main`, dan klik **Deploy**. 
5. Selesai! Kamu akan mendapatkan URL HTTPS publik yang aman dan kencang untuk kios pameran!

---

## 💻 METODE 2: Menjalankan Secara Lokal (Localhost Development)

Jika ingin mencoba atau mengembangkan aplikasi langsung di laptop kamu secara offline:

### 1. Persiapan Environment
```powershell
# Buat Virtual Environment (Opsional tapi direkomendasikan)
python -m venv venv
venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt
```

### 2. Jalankan Aplikasi
```powershell
python app.py
```
Aplikasi akan menyala secara lokal di `http://127.0.0.1:5000`. 
*Note: Karena global fetch interceptor kita pintar, frontend otomatis akan menembak server lokal ini saat dibuka di localhost!*

---

## 🖥️ METODE 3: Deployment Legacy (AWS EC2 + Cloudflare Tunnel)

Jika kamu ingin menjalankan server monolitik di VM AWS EC2 Linux dengan SSL HTTPS instan:

### 🚀 Cara Cepat Menjalankan (Copy-Paste)
Buka terminal EC2 kamu, lalu salin dan jalankan semua perintah di bawah ini sekaligus:
```bash
# 1. Install dependencies Python
pip3.12 install -r requirements.txt

# 2. Download dan Install Cloudflare Tunnel
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
sudo yum install -y ./cloudflared-linux-x86_64.rpm

# 3. Jalankan aplikasi Flask di background (port 5000)
nohup python3.12 app.py > flask.log 2>&1 &

# 4. Buka akses publik dengan Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5000
```

### 🛑 Cara Mematikan Aplikasi EC2
```bash
pkill -f "python3.12 app.py"
```

---

## 📁 Struktur Repositori
* `index.html` — File halaman utama (Frontend).
* `static/app.js` — Logika antarmuka, kamera, dan komunikasi API.
* `static/style.css` — Desain antarmuka premium bertema Kosmik Galaksi.
* `app.py` — Backend Flask API untuk pengolahan AI Rekognition & DynamoDB.
* `main.tf` — Script Terraform untuk deploy serverless backend otomatis.
* `.gitignore` — File konfigurasi untuk menyaring file sampah & sensitif agar tidak masuk git.
