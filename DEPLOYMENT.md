# Panduan Deploy ke Server Biznet

Asumsi: server Biznet-nya Ubuntu/Debian (VPS Linux paling umum). Kalau ternyata
Windows Server, beri tahu saya - langkahnya beda di bagian reverse proxy dan
process manager.

## 1. Siapkan server

```bash
sudo apt update && sudo apt install -y nodejs npm nginx
node --version   # pastikan >= 22.5.0 (fitur node:sqlite butuh versi ini)
```

Kalau `apt` kasih Node versi lama, install lewat [NodeSource](https://github.com/nodesource/distributions)
atau [nvm](https://github.com/nvm-sh/nvm) supaya dapat versi 22+.

## 2. Upload kode & install dependency

Upload folder project ini ke server (misal via `git`, `scp`, atau `rsync`),
lalu di server:

```bash
cd /path/ke/pengukur-tensi
npm install --omit=dev
```

## 3. Environment variables (WAJIB sebelum jalan di production)

Buat file `.env` di root project (JANGAN pernah di-commit ke git):

```bash
NODE_ENV=production
PORT=8532
TRUST_PROXY=1
INVITE_CODE=T3NS1-L0S4R1-POSYANDU
```

- **`INVITE_CODE` wajib diisi.** Tanpa ini, siapapun yang tahu alamat server
  bisa bikin akun sendiri dan langsung lihat semua data pasien. Bagikan kode
  ini hanya ke petugas posyandu lewat WhatsApp/langsung, jangan ditulis di
  tempat publik.
- `TRUST_PROXY=1` membuat aplikasi percaya header dari nginx (langkah 5),
  supaya cookie sesi otomatis pakai flag `Secure` saat lewat HTTPS.

Karena project ini tidak pakai library `dotenv`, load env var ini lewat
systemd (langkah 4) atau jalankan dengan:
```bash
export $(cat .env | xargs) && npm start
```

## 4. Jalankan sebagai service (auto-restart)

Supaya aplikasi otomatis nyala lagi kalau server reboot atau crash, buat
systemd service. Buat file `/etc/systemd/system/pantau-tensi.service`:

```ini
[Unit]
Description=Pantau Tensi
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/ke/pengukur-tensi
EnvironmentFile=/path/ke/pengukur-tensi/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Lalu:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pantau-tensi
sudo systemctl status pantau-tensi   # pastikan "active (running)"
```
Cek log kalau ada masalah: `sudo journalctl -u pantau-tensi -f`

## 5. HTTPS lewat nginx + Let's Encrypt (WAJIB karena diakses dari internet)

Aplikasi Node-nya sendiri jalan di HTTP biasa di port 8532 (localhost saja,
tidak diekspos langsung ke internet). nginx yang jadi pintu depan HTTPS-nya.

Pastikan kamu sudah punya domain (misal `tensi.posyandu-xyz.my.id`) yang
DNS-nya diarahkan ke IP server Biznet ini.

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Buat `/etc/nginx/sites-available/pantau-tensi`:
```nginx
server {
    listen 80;
    server_name tensi.posyandu-xyz.my.id;

    location / {
        proxy_pass http://127.0.0.1:8532;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pantau-tensi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tensi.posyandu-xyz.my.id
```

Certbot otomatis mengubah config di atas jadi HTTPS dan mengatur perpanjangan
sertifikat otomatis. Setelah ini, akses harus lewat `https://tensi.posyandu-xyz.my.id`,
bukan `http://ip-server:8532` langsung.

## 6. Firewall

Tutup semua port kecuali yang benar-benar perlu:
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect ke HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```
Port 8532 (Node) **tidak perlu** dibuka ke publik - biarkan hanya bisa
diakses dari localhost lewat nginx.

## 7. Backup

- Aplikasi sudah otomatis bikin backup harian ke `data/backups/` (30 hari
  terakhir disimpan, yang lebih lama otomatis dihapus).
- **Unduh salinannya secara rutin** (misal tiap minggu) ke laptop/PC kamu
  sendiri lewat tombol "Backup" di aplikasi setelah login - supaya kalau
  server ini kenapa-kenapa, kamu masih punya salinan di luar server.
- Opsional tapi disarankan: tambahkan cron job di server untuk salin
  `data/backups/` ke penyimpanan lain (misal S3/object storage Biznet kalau
  ada) untuk lapis proteksi tambahan.

## 8. Update aplikasi di kemudian hari

```bash
cd /path/ke/pengukur-tensi
git pull   # atau upload ulang file yang berubah
npm install --omit=dev
sudo systemctl restart pantau-tensi
```
Folder `data/` tidak pernah ikut ter-overwrite oleh update kode (sudah di
`.gitignore`), jadi data pasien aman saat update.

## Checklist ringkas sebelum benar-benar dipakai

- [O] `INVITE_CODE` sudah di-set ke nilai rahasia (bukan default/kosong)
- [ ] Diakses lewat `https://` (bukan `http://`), sertifikat valid (gembok hijau di browser)
- [ ] `pantau-tensi.service` aktif dan `enabled` (auto-start saat reboot)
- [ ] Port 8532 tidak bisa diakses langsung dari luar (test: buka `http://IP-SERVER:8532` dari HP di jaringan lain, harus gagal/timeout)
- [ ] Sudah coba download backup lewat tombol "Backup" di aplikasi minimal sekali
- [ ] Semua petugas sudah daftar akun sendiri-sendiri (bukan sharing 1 akun)
