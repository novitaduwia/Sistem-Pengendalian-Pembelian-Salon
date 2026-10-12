# Sistem Pengendalian Pembelian Salon
Demo Web: https://novitaduwia.github.io/Sistem-Pengendalian-Pembelian-Salon/ 
## Deskripsi

Sistem Pengendalian Pembelian Salon merupakan sistem informasi sederhana yang digunakan untuk membantu usaha salon dalam mengelola pembelian bahan habis pakai serta memantau penggunaan anggaran.

Sistem ini menghubungkan data bahan, anggaran, dan pembelian untuk menghasilkan informasi realisasi pembelian, selisih anggaran, persentase realisasi, dan status pengendalian anggaran.

## Tujuan

Sistem ini bertujuan untuk:

1. Mengelola data bahan habis pakai.
2. Mencatat anggaran pembelian bahan.
3. Mencatat transaksi pembelian bahan.
4. Menghitung total realisasi pembelian.
5. Membandingkan anggaran dengan realisasi.
6. Menampilkan selisih dan persentase realisasi.
7. Menyediakan laporan pembelian dan anggaran.

## Modul Sistem

Sistem terdiri dari beberapa modul utama:

- Dashboard
- Data Bahan
- Anggaran
- Pembelian
- Pengendalian
- Laporan

## Entitas Database

Sistem menggunakan 3 entitas utama:

1. Bahan
2. Anggaran
3. Pembelian

### Bahan

Digunakan untuk menyimpan informasi bahan habis pakai yang digunakan oleh salon.

### Anggaran

Digunakan untuk menyimpan anggaran pembelian bahan berdasarkan periode.

### Pembelian

Digunakan untuk mencatat transaksi pembelian bahan dari supplier.

## Alur Sistem

Anggaran
↓
Pembelian
↓
Realisasi
↓
Anggaran vs Realisasi
↓
Selisih
↓
Status Pengendalian
↓
Laporan

## Perhitungan

### Total Pembelian

Total pembelian dihitung dengan:

`Total Harga = Qty × Harga Satuan`

### Realisasi

Realisasi anggaran dihitung berdasarkan total pembelian pada periode yang sesuai.

### Selisih Anggaran

`Selisih = Anggaran - Realisasi`

### Persentase Realisasi

`Persentase Realisasi = (Realisasi / Anggaran) × 100%`

### Status Pengendalian

- ≤ 90% : Terkendali
- > 90% sampai 100% : Mendekati Batas
- > 100% : Melebihi Anggaran

## Teknologi

Sistem dibuat menggunakan:

- HTML
- CSS
- JavaScript
- Supabase
- PostgreSQL

Sistem tidak menggunakan Node.js atau server backend tambahan.

## Struktur Folder

```text
SISTEM-PEMBELIAN-SALON/
│
├── README.md
│
├── BACK-END/
│   ├── app.js
│   └── database.sql
│
└── FRONT-END/
    ├── index.html
    ├── style.css
    └── script.js
