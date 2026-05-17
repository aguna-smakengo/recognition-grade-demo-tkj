# FaceGrade AI

Aplikasi pengenalan wajah cerdas dengan sistem grading gamifikasi.

## 🚀 Cara Menjalankan dengan HTTPS di Amazon Linux (Copas Block Ini!)

Kamera pada web browser **WAJIB** menggunakan HTTPS agar tidak diblokir oleh browser. 
Untuk menjalankan aplikasi beserta URL HTTPS publik yang aman dan instan, **copy dan paste semua perintah di bawah ini sekaligus ke terminal EC2 kamu:**

```bash
# 1. Install dependencies Python
pip3.12 install -r requirements.txt

# 2. Download dan Install Cloudflare Tunnel (Khusus Amazon Linux / CentOS)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
sudo yum install -y ./cloudflared-linux-x86_64.rpm

# 3. Jalankan aplikasi Flask di background (port 5000)
nohup python3.12 app.py > flask.log 2>&1 &

# 4. Buka akses publik dengan Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5000
```

> **INFO PENTING:** 
> Setelah `cloudflared` jalan, perhatikan tulisan di terminal. Akan muncul link URL berakhiran `trycloudflare.com` (contoh: `https://contoh-link-acak.trycloudflare.com`).
> **Bagikan dan buka link tersebut di HP atau Laptop kamu.** Ajaib! Aplikasimu sudah berjalan dengan full HTTPS dan kamera otomatis bisa mendeteksi wajah!

---

## 🛑 Cara Mematikan Aplikasi (Jika Sudah Selesai)

Karena tadi kita menjalankan aplikasi Flask di background (`nohup`), untuk mematikannya cukup jalankan perintah ini:
```bash
pkill -f "python3.12 app.py"
```
