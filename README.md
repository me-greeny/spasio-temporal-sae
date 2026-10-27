# Spasio-Temporal Small Area Estimation Jawa Timur

## Visualisasi Estimasi Rata-Rata Pengeluaran per Kapita Tingkat Kecamatan

Website interaktif untuk menyajikan hasil penelitian **Spasio-Temporal Small Area Estimation (ST-SAE)** dalam mengestimasi rata-rata pengeluaran per kapita per bulan tingkat kecamatan di Provinsi Jawa Timur.

Website dikembangkan sebagai media penyajian hasil penelitian, evaluasi ketelitian estimasi, dan eksplorasi spasial-temporal.

## 1. Identitas Penelitian

| Komponen | Keterangan |
|---|---|
| Judul | Pendekatan Spasio-Temporal Small Area Estimation untuk Estimasi Rata-Rata Pengeluaran Per Kapita Tingkat Kecamatan (Studi Kasus: Provinsi Jawa Timur) |
| Jenis | Penelitian akademik / Skripsi |
| Tahun | 2026 |
| Wilayah | Provinsi Jawa Timur |
| Unit analisis | Kecamatan |
| Periode penelitian | 2018–2025 |
| Metode | Area-Level Fay-Herriot Spasio-Temporal |
| Penduga | Empirical Best Linear Unbiased Prediction (EBLUP) |
| Kerangka penelitian | CRISP-DM |
| Peneliti | [Isi nama peneliti] |
| Institusi | [Isi institusi] |
| Repositori | [Isi URL GitHub] |
| Website | [Isi URL GitHub Pages] |

Cakupan aktual kecamatan dan tahun pada visualisasi dihitung dari dataset yang dimuat.

## 2. Tujuan Website

Website dikembangkan untuk:

1. Menampilkan perkembangan rata-rata pengeluaran per kapita tingkat kecamatan.
2. Membandingkan estimasi langsung dengan hasil estimasi model spasio-temporal.
3. Menyajikan evaluasi ketelitian menggunakan MSE dan RRMSE.
4. Memvisualisasikan distribusi estimasi pada peta kecamatan.
5. Menyediakan eksplorasi hasil berdasarkan tahun dan kecamatan.
6. Menyampaikan metodologi serta interpretasi hasil penelitian.

## 3. Struktur Repositori

```text
stsae-jatim/
│
├── index.html
├── style.css
├── script.js
├── README.md
│
└── data/
    ├── hasil_olah_data_all.csv
    └── kecamatan_jatim.geojson
```

### Keterangan berkas

| Berkas | Fungsi |
|---|---|
| index.html | Struktur halaman dan konten web story |
| style.css | Desain visual dan tata letak responsif |
| script.js | Pembacaan data, grafik, filter, tabel, dan peta |
| README.md | Dokumentasi proyek |
| hasil_olah_data_all.csv | Satu-satunya sumber data statistik |
| kecamatan_jatim.geojson | Geometri batas kecamatan untuk visualisasi spasial |

GeoJSON bukan sumber nilai estimasi.

## 4. Struktur Data Utama

File `hasil_olah_data_all.csv` merupakan dataset panel tingkat kecamatan dan tahun.

### Identifikasi wilayah dan waktu

`X`, `kode_kecamatan_bps`, `tahun`, `kode_clean`, `kecamatan_clean`, `nama_kecamatan_bps`, `nama_kecamatan_kemendagri`, `kode_kecamatan_kemendagri`.

### Data survei dan estimasi langsung

`jumlah_rt`, `Jumlah.Sampel.Rumah.Tangga.Tertimbang`, `jumlah_individu`, `Jumlah.Sampel.Individu.Tertimbang`, `pengeluaran_mean`, `SE...7`, `VAR...8`, `CI_LOWER`, `CI_UPPER`, `CV...11`, `RSE...12`, `DEFF...13`, `Median.Pengeluaran.per.Kapita`, `SE...15`, `VAR...16`, `CV...17`, `RSE...18`, `DEFF...19`, `kategori_rse`.

### Variabel Potensi Desa

`listrik`, `pendidikan`, `kesehatan`, `ekonomi`, `lingkungan`, `jumlah_desa`.

### Variabel citra satelit

`CO`, `LST`, `NDBI`, `NDVI`, `NTL`.

### Hasil estimasi spasio-temporal

`EBLUP_STFH`, `selisih_eblup_direct`, `efek_spasial`, `efek_temporal`, `EBLUP_Selected`, `selisih_selected`.

### Evaluasi ketelitian

`CV_direct`, `MSE_direct`, `RMSE_direct`, `RRMSE_direct`, `CV_STFH_pbmse`, `MSE_STFH_pbmse`, `RMSE_STFH_pbmse`, `RRMSE_STFH`.

## 5. Aturan Penggunaan Data

- `pengeluaran_mean` digunakan sebagai estimasi langsung.
- `EBLUP_Selected` diprioritaskan sebagai estimasi model terpilih.
- `EBLUP_STFH` digunakan untuk perbandingan model penuh dan sebagai cadangan bila estimasi terpilih tidak tersedia.
- `RRMSE_direct` dan `MSE_direct` digunakan untuk evaluasi estimasi langsung.
- `RRMSE_STFH` dan `MSE_STFH_pbmse` digunakan untuk evaluasi STFH sesuai definisi kolom.
- Kode wilayah dibaca sebagai teks agar format kode tidak berubah.
- Data yang tidak tersedia tidak diganti dengan angka nol.

Metrik STFH tidak otomatis diinterpretasikan sebagai metrik khusus `EBLUP_Selected`.

## 6. Teknologi

Website menggunakan:

- HTML5
- CSS3
- JavaScript
- PapaParse untuk membaca CSV
- Plotly.js untuk grafik
- Leaflet.js untuk peta interaktif
- OpenStreetMap sebagai basemap

Website tidak membutuhkan backend atau database server.

## 7. Fitur Website

**Beranda:** pengantar penelitian dan ringkasan cakupan data.

**Latar Belakang:** alasan penggunaan estimasi wilayah kecil.

**Metodologi:** sumber data, kerangka CRISP-DM, dan pendekatan ST-SAE.

**Hasil Estimasi:** grafik perkembangan tahunan dan tabel hasil kecamatan.

**Evaluasi:** perbandingan ketelitian estimasi langsung dan STFH.

**Eksplorasi Wilayah:** filter tahun, kabupaten/kota jika atribut tersedia, kecamatan, peta tematik, profil wilayah, dan grafik perkembangan.

**Kesimpulan:** interpretasi hasil serta batasan penggunaannya.

### GitHub Pages

1. Unggah seluruh berkas sesuai struktur repositori.
2. Buka Settings → Pages pada repositori GitHub.
3. Pilih Deploy from a branch.
4. Pilih branch `main` dan folder `/ (root)`.
5. Simpan konfigurasi.
6. Akses URL GitHub Pages setelah deployment selesai.

Pastikan nama berkas dan kapitalisasi huruf sesuai dengan referensi di JavaScript.

## 10. Keterbatasan

Website merupakan media visualisasi hasil penelitian, bukan aplikasi untuk melakukan estimasi ulang model.

Rata-rata estimasi antarkecamatan yang ditampilkan pada grafik tahunan tidak otomatis mewakili rata-rata pengeluaran provinsi berbobot penduduk.

## 11. Sumber dan Atribusi

Sumber data penelitian mencakup Susenas, Potensi Desa, dan produk citra satelit sebagaimana digunakan dalam penelitian.

Atribusi data, ketentuan penggunaan, dan sitasi ilmiah perlu mengikuti sumber asli masing-masing.

Basemap: © OpenStreetMap contributors.

## 12. Kontak

**Peneliti:** Meuthia Nazhifah Muthmainnah  
**Institusi:** Politeknik Statistika STIS
**Email:** 222212729@stis.ac.id 
**Repositori:** https://github.com/me-greeny/spasio-temporal-sae

---

Dokumentasi penelitian, 2026.
