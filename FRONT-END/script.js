// =====================================================
// SCRIPT UTAMA
// Sistem Pengendalian Pembelian Salon
// =====================================================


// =====================================================
// 1. DATA SEMENTARA
// =====================================================

let dataBahan = [];
let dataAnggaran = [];
let dataPembelian = [];
let dataSaldoAwal = [];
let dataPemakaian = [];
let periodeLaporanAktif = [];

let editingBahanId = null;
let editingAnggaranId = null;
let editingPembelianId = null;
let editingPemakaianId = null;

// =====================================================
// 2. SAAT HALAMAN DIBUKA
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {

    console.log("Script.js berhasil dijalankan.");

    setTanggalHariIni();
    setupHitungTotalPembelian();

    // Hubungkan submit form
    document.getElementById("form-bahan")
        .addEventListener("submit", simpanBahan);

    document.getElementById("form-anggaran")
        .addEventListener("submit", simpanAnggaran);

    document.getElementById("form-pembelian")
        .addEventListener("submit", simpanPembelian);

    document.getElementById("form-pemakaian")
        .addEventListener("submit", simpanPemakaian);

    await loadAllData();

    showPage("dashboard");
});


// =====================================================
// 3. LOAD SEMUA DATA
// =====================================================

async function loadAllData() {

    try {

        await loadBahan();
        await loadAnggaran();
        await loadPembelian();
        await loadSaldoAwal();
        await loadPemakaian();

        renderAll();

        console.log("Semua data berhasil dimuat.");

    } catch (error) {

        console.error("Gagal memuat data:", error);

        alert(
            "Data gagal dimuat dari Supabase.\n\n" +
            error.message
        );
    }
}

async function loadSaldoAwal() {
    const { data, error } = await supabaseClient
        .from("saldo_awal_persediaan")
        .select(`
            id_saldo_awal,
            id_bahan,
            tanggal_saldo,
            qty_awal,
            biaya_per_unit,
            keterangan,
            bahan (nama_bahan, satuan)
        `)
        .order("id_saldo_awal", { ascending: true });

    if (error) {
        console.error("Gagal memuat saldo awal:", error);
        dataSaldoAwal = [];
        return;
    }

    dataSaldoAwal = data || [];
}

async function loadPemakaian() {
    const { data, error } = await supabaseClient
        .from("pemakaian_bahan")
        .select(`
            id_pemakaian,
            id_bahan,
            tanggal,
            qty,
            keterangan,
            bahan (nama_bahan, satuan)
        `)
        .order("tanggal", { ascending: false });

    if (error) {
        console.error("Gagal memuat pemakaian:", error);
        dataPemakaian = [];
        return;
    }

    dataPemakaian = data || [];
}

// =====================================================
// 4. LOAD BAHAN
// =====================================================

async function loadBahan() {

    const { data, error } = await supabaseClient
        .from("bahan")
        .select("*")
        .order("id_bahan", {
            ascending: true
        });

    if (error) {
        throw error;
    }

    dataBahan = data || [];

    console.log("Data bahan:", dataBahan);
}


// =====================================================
// 5. LOAD ANGGARAN
// =====================================================

async function loadAnggaran() {

    const { data, error } = await supabaseClient
        .from("anggaran")
        .select(`
            *,
            bahan (
                nama_bahan,
                satuan
            )
        `)
        .order("periode", {
            ascending: false
        });

    if (error) {
        throw error;
    }

    dataAnggaran = data || [];

    console.log("Data anggaran:", dataAnggaran);
}


// =====================================================
// 6. LOAD PEMBELIAN
// =====================================================

async function loadPembelian() {

    const { data, error } = await supabaseClient
        .from("pembelian")
        .select(`
            *,
            bahan (
                nama_bahan,
                satuan
            )
        `)
        .order("tanggal", {
            ascending: false
        });

    if (error) {
        throw error;
    }

    dataPembelian = data || [];

    console.log("Data pembelian:", dataPembelian);
}


// =====================================================
// 7. RENDER SEMUA
// =====================================================

function renderAll() {

    renderDashboard();
    renderDropdownBahan();
    renderTabelBahan();
    renderTabelAnggaran();
    renderTabelPembelian();
    renderPengendalian();
    renderPersediaan();
    renderTabelPemakaian();
    renderLaporan();
}

function hitungStokBahan(idBahan) {
    const saldo = dataSaldoAwal.find(
        item => Number(item.id_bahan) === Number(idBahan)
    );

    const tanggalAwal = saldo?.tanggal_saldo || "2026-09-27";
    const stokAwal = Number(saldo?.qty_awal || 0);

    const totalPembelian = dataPembelian
        .filter(item =>
            Number(item.id_bahan) === Number(idBahan) &&
            item.tanggal >= tanggalAwal
        )
        .reduce(
            (total, item) => total + Number(item.qty || 0),
            0
        );

    const totalPemakaian = dataPemakaian
        .filter(item =>
            Number(item.id_bahan) === Number(idBahan) &&
            item.tanggal >= tanggalAwal
        )
        .reduce(
            (total, item) => total + Number(item.qty || 0),
            0
        );

    return stokAwal + totalPembelian - totalPemakaian;
}



function renderPersediaan() {
    const tbody = document.getElementById("persediaan-table");

    if (!tbody) return;

    const elemenTotalStok =
        document.getElementById("total-stok-akhir");
    const elemenNilai =
        document.getElementById("nilai-persediaan");
    const elemenMenipis =
        document.getElementById("bahan-stok-menipis");

    const rupiahBulat = (nilai) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(Math.round(Number(nilai) || 0));

    const angka = (nilai) => Number(nilai) || 0;
    const TANGGAL_AWAL_DEFAULT = "2026-09-27";
    const TOLERANSI = 0.000001;

    if (!Array.isArray(dataBahan) || dataBahan.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="empty-state">
                    Belum ada data bahan.
                </td>
            </tr>
        `;

        if (elemenTotalStok) elemenTotalStok.textContent = "0";
        if (elemenNilai) elemenNilai.textContent = rupiahBulat(0);
        if (elemenMenipis) elemenMenipis.textContent = "0";

        return;
    }

    let totalStok = 0;
    let totalNilaiPersediaan = 0;
    let jumlahBahanMenipis = 0;

    const bahanAktif = [...dataBahan].sort((a, b) =>
        String(a.nama_bahan || "").localeCompare(
            String(b.nama_bahan || ""),
            "id"
        )
    );

    const barisTabel = bahanAktif.map((bahan, index) => {
        const idBahan = Number(bahan.id_bahan);

        const saldo = Array.isArray(dataSaldoAwal)
            ? dataSaldoAwal.find(item =>
                Number(item.id_bahan) === idBahan
            )
            : null;

        const tanggalAwal =
            saldo?.tanggal_saldo || TANGGAL_AWAL_DEFAULT;

        const qtyAwal = angka(saldo?.qty_awal);
        const biayaAwal = angka(saldo?.biaya_per_unit);
        const nilaiSaldoAwal = qtyAwal * biayaAwal;

        const pembelian = (Array.isArray(dataPembelian)
            ? dataPembelian
            : [])
            .filter(item =>
                Number(item.id_bahan) === idBahan &&
                item.tanggal >= tanggalAwal
            )
            .map(item => ({
                jenis: "beli",
                tanggal: item.tanggal,
                qty: angka(item.qty),
                harga: angka(item.harga_satuan)
            }));

        const pemakaian = (Array.isArray(dataPemakaian)
            ? dataPemakaian
            : [])
            .filter(item =>
                Number(item.id_bahan) === idBahan &&
                item.tanggal >= tanggalAwal
            )
            .map(item => ({
                jenis: "pakai",
                tanggal: item.tanggal,
                qty: angka(item.qty)
            }));

        const transaksi = [...pembelian, ...pemakaian].sort(
            (a, b) =>
                a.tanggal.localeCompare(b.tanggal) ||
                (a.jenis === b.jenis
                    ? 0
                    : a.jenis === "beli" ? -1 : 1)
        );

        let stok = qtyAwal;
        let nilai = nilaiSaldoAwal;
        let transaksiBermasalah = false;

        for (const item of transaksi) {
            if (item.jenis === "beli") {
                if (item.qty < 0 || item.harga < 0) {
                    transaksiBermasalah = true;
                    continue;
                }

                stok += item.qty;
                nilai += item.qty * item.harga;
            } else {
                if (item.qty < 0) {
                    transaksiBermasalah = true;
                    continue;
                }

                if (item.qty > stok + TOLERANSI) {
                    // Data transaksi perlu diperiksa karena
                    // pemakaian melebihi stok yang tersedia.
                    transaksiBermasalah = true;
                }

                const biayaRataRata =
                    stok > TOLERANSI ? nilai / stok : 0;

                // Catat seluruh kuantitas transaksi untuk
                // mengungkap stok negatif, bukan menyembunyikannya.
                nilai -= item.qty * biayaRataRata;
                stok -= item.qty;
            }
        }

        if (Math.abs(stok) < TOLERANSI) stok = 0;
        if (Math.abs(nilai) < TOLERANSI) nilai = 0;

        const stokAkhir = stok;
        const biayaRataRataAkhir =
            stokAkhir > TOLERANSI ? nilai / stokAkhir : 0;

        const stokMinimum = angka(bahan.stok_minimum);

        let statusStok;
        let kelasStatus;

        if (transaksiBermasalah || stokAkhir < -TOLERANSI) {
            statusStok = "Periksa Transaksi";
            kelasStatus = "status-invalid";
        } else if (stokAkhir <= 0) {
            statusStok = "Stok Habis";
            kelasStatus = "status-habis";
        } else if (stokAkhir <= stokMinimum) {
            statusStok = "Stok Menipis";
            kelasStatus = "status-menipis";
        } else {
            statusStok = "Aman";
            kelasStatus = "status-aman";
        }

        totalStok += stokAkhir;
        totalNilaiPersediaan += nilai;

        if (
            statusStok === "Periksa Transaksi" ||
            statusStok === "Stok Habis" ||
            statusStok === "Stok Menipis"
        ) {
            jumlahBahanMenipis++;
        }

        const totalQtyPembelian = pembelian.reduce(
            (sum, item) => sum + item.qty,
            0
        );

        const totalQtyPemakaian = pemakaian.reduce(
            (sum, item) => sum + item.qty,
            0
        );

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(bahan.nama_bahan || "")}</td>
                <td>${escapeHtml(bahan.satuan || "")}</td>
                <td>${formatNumber(qtyAwal)}</td>
                <td>${rupiahBulat(biayaAwal)}</td>
                <td>${rupiahBulat(nilaiSaldoAwal)}</td>
                <td>${formatNumber(totalQtyPembelian)}</td>
                <td>${formatNumber(totalQtyPemakaian)}</td>
                <td>${formatNumber(stokAkhir)}</td>
                <td>${rupiahBulat(biayaRataRataAkhir)}</td>
                <td>${rupiahBulat(nilai)}</td>
                <td>
                    <span class="status-badge ${kelasStatus}">
                        ${statusStok}
                    </span>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = barisTabel.join("");

    if (elemenTotalStok) {
        elemenTotalStok.textContent = formatNumber(totalStok);
    }

    if (elemenNilai) {
        elemenNilai.textContent = rupiahBulat(totalNilaiPersediaan);
    }

    if (elemenMenipis) {
        elemenMenipis.textContent = jumlahBahanMenipis;
    }
}


function renderTabelPemakaian() {
    const tbody = document.getElementById("pemakaian-table");

    if (!tbody) return;

    if (!Array.isArray(dataPemakaian) || dataPemakaian.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Belum ada data pemakaian.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = dataPemakaian.map((item, index) => {
        const namaBahan = item.bahan?.nama_bahan || "-";
        const satuan = item.bahan?.satuan || "";
        const keterangan = item.keterangan || "-";
        const id = Number(item.id_pemakaian);

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${formatTanggal(item.tanggal)}</td>
                <td>${escapeHtml(namaBahan)}</td>
                <td>${formatNumber(item.qty)} ${escapeHtml(satuan)}</td>
                <td>${escapeHtml(keterangan)}</td>
                <td>
                    <div class="action-buttons">
                        <button
                            type="button"
                            class="action-button edit-button"
                            onclick="editPemakaian(${id})"
                            title="Edit pemakaian">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>
                            </svg>
                            <span>Edit</span>
                        </button>

                        <button
                            type="button"
                            class="action-button delete-button"
                            onclick="hapusPemakaian(${id})"
                            title="Hapus pemakaian">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M3 6h18"/>
                                <path d="M8 6V4h8v2"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v5"/>
                                <path d="M14 11v5"/>
                            </svg>
                            <span>Hapus</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}



function editPemakaian(id) {
    const item = dataPemakaian.find(
        data => Number(data.id_pemakaian) === Number(id)
    );

    if (!item) {
        alert("Data pemakaian tidak ditemukan.");
        return;
    }

    document.getElementById("pemakaian-bahan").value =
        String(item.id_bahan);

    document.getElementById("tanggal-pemakaian").value =
        item.tanggal;

    document.getElementById("qty-pemakaian").value =
        item.qty;

    document.getElementById("keterangan-pemakaian").value =
        item.keterangan || "";

    editingPemakaianId = Number(item.id_pemakaian);

    const judul = document.getElementById("pemakaian-form-title");

    if (judul) {
        judul.textContent = "Edit Pemakaian Bahan";
    }

    const formCard = document.getElementById("pemakaian-form");

    if (formCard) {
        formCard.classList.remove("hidden");
        formCard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

async function simpanPemakaian(event) {
    event.preventDefault();

    const idBahan = document.getElementById("pemakaian-bahan").value;
    const tanggal = document.getElementById("tanggal-pemakaian").value;
    const qty = Number(document.getElementById("qty-pemakaian").value);
    const keterangan = document.getElementById("keterangan-pemakaian").value.trim();

    if (!idBahan || !tanggal) {
        alert("Bahan dan tanggal wajib diisi.");
        return;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
        alert("Jumlah pemakaian harus lebih dari 0.");
        return;
    }

    if (tanggal < "2026-09-27") {
        alert("Tanggal pemakaian tidak boleh sebelum tanggal saldo awal.");
        return;
    }

    const bahan = dataBahan.find(
        item => Number(item.id_bahan) === Number(idBahan)
    );

    if (!bahan || bahan.status_aktif !== true) {
        alert("Bahan tidak ditemukan atau sudah tidak aktif.");
        return;
    }

    try {
        // Muat ulang data yang diperlukan untuk validasi stok.
        await Promise.all([
            loadSaldoAwal(),
            loadPembelian(),
            loadPemakaian()
        ]);

        const stokTersedia = hitungStokBahan(idBahan);

        const pemakaianLama = editingPemakaianId
            ? dataPemakaian.find(
                item => Number(item.id_pemakaian) === Number(editingPemakaianId)
            )
            : null;

        const stokUntukValidasi = stokTersedia +
            (pemakaianLama &&
             Number(pemakaianLama.id_bahan) === Number(idBahan) &&
             pemakaianLama.tanggal >= "2026-09-27"
                ? Number(pemakaianLama.qty || 0)
                : 0);

        if (qty > stokUntukValidasi) {
            alert(
                "Stok tidak mencukupi.\n" +
                "Stok tersedia: " + formatNumber(stokUntukValidasi) +
                " " + bahan.satuan
            );
            return;
        }

        const data = {
            id_bahan: Number(idBahan),
            tanggal: tanggal,
            qty: qty,
            keterangan: keterangan || null
        };

        let error;

        if (editingPemakaianId) {
            const result = await supabaseClient
                .from("pemakaian_bahan")
                .update(data)
                .eq("id_pemakaian", editingPemakaianId);

            error = result.error;
        } else {
            const result = await supabaseClient
                .from("pemakaian_bahan")
                .insert([data]);

            error = result.error;
        }

        if (error) throw error;

        alert(
            editingPemakaianId
                ? "Pemakaian berhasil diperbarui."
                : "Pemakaian berhasil disimpan."
        );

        closePemakaianForm();
        await loadAllData();

    } catch (error) {
        console.error("Gagal menyimpan pemakaian:", error);
        alert("Pemakaian gagal disimpan.\n\n" + error.message);
    }
}

async function hapusPemakaian(id) {
    const pemakaian = dataPemakaian.find(
        item => Number(item.id_pemakaian) === Number(id)
    );

    if (!pemakaian) {
        alert("Data pemakaian tidak ditemukan.");
        return;
    }

    const konfirmasi = confirm(
        "Hapus data pemakaian ini?\n" +
        "Stok persediaan akan dihitung ulang setelah penghapusan."
    );

    if (!konfirmasi) return;

    try {
        const { error } = await supabaseClient
            .from("pemakaian_bahan")
            .delete()
            .eq("id_pemakaian", id);

        if (error) throw error;

        alert("Data pemakaian berhasil dihapus.");

        await loadAllData();

    } catch (error) {
        console.error("Gagal menghapus pemakaian:", error);
        alert("Data gagal dihapus.\n\n" + error.message);
    }
}

// =====================================================
// 8. NAVIGASI
// =====================================================

function showPage(pageId) {

    document.querySelectorAll(".page").forEach(function (page) {

        page.classList.remove("active-page");

    });


    const selectedPage =
        document.getElementById(pageId);

    if (selectedPage) {

        selectedPage.classList.add("active-page");

    }


    document.querySelectorAll(".menu-item")
        .forEach(function (item) {

            item.classList.remove("active");

        });


    document.querySelectorAll(".menu-item")
        .forEach(function (item) {

            const onclickText =
                item.getAttribute("onclick");

            if (
                onclickText &&
                onclickText.includes(`showPage('${pageId}')`)
            ) {

                item.classList.add("active");

            }

        });


    const titleMap = {

        dashboard: "Dashboard",
        bahan: "Data Bahan",
        anggaran: "Anggaran",
        pembelian: "Pembelian",
        pengendalian: "Pengendalian Anggaran",
        persediaan: "Persediaan",
        pemakaian: "Pemakaian Bahan",
        laporan: "Laporan"

    };


    const pageTitle =
        document.getElementById("page-title");

    if (pageTitle) {

        pageTitle.textContent =
            titleMap[pageId] || "Dashboard";

    }
}


// =====================================================
// 9. FORMAT RUPIAH
// =====================================================


function formatRupiah(value) {
    const number = Number(value) || 0;

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}



// =====================================================
// 10. FORMAT ANGKA
// =====================================================

function formatNumber(value) {

    const number = Number(value) || 0;

    return new Intl.NumberFormat("id-ID", {

        maximumFractionDigits: 2

    }).format(number);
}


// =====================================================
// 11. FORMAT TANGGAL
// =====================================================

function formatTanggal(dateString) {

    if (!dateString) {

        return "-";

    }

    const date =
        new Date(dateString);

    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


// =====================================================
// 12. FORMAT PERIODE
// =====================================================

function formatPeriode(dateString) {

    if (!dateString) {

        return "-";

    }

    const date =
        new Date(dateString);

    return date.toLocaleDateString(
        "id-ID",
        {
            month: "long",
            year: "numeric"
        }
    );
}


// =====================================================
// 13. KEAMANAN HTML
// =====================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =====================================================
// 14. TANGGAL HARI INI
// =====================================================

function setTanggalHariIni() {

    const input =
        document.getElementById(
            "tanggal-pembelian"
        );

    if (!input) {

        return;

    }

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    input.value =
        `${year}-${month}-${day}`;
}


// =====================================================
// 15. DROPDOWN BAHAN
// =====================================================


function renderDropdownBahan() {
    const dropdownAnggaran =
        document.getElementById("anggaran-bahan");

    const dropdownPembelian =
        document.getElementById("pembelian-bahan");

    const dropdownPemakaian =
        document.getElementById("pemakaian-bahan");

    const bahanAktif = dataBahan.filter(
        bahan => bahan.status_aktif === true
    );

    function isiDropdown(dropdown) {
        if (!dropdown) return;

        dropdown.innerHTML =
            `<option value="">Pilih bahan</option>`;

        bahanAktif.forEach(function (bahan) {
            dropdown.innerHTML += `
                <option value="${bahan.id_bahan}">
                    ${escapeHtml(bahan.nama_bahan)}
                </option>
            `;
        });
    }

    isiDropdown(dropdownAnggaran);
    isiDropdown(dropdownPembelian);
    isiDropdown(dropdownPemakaian);
}


// =====================================================
// 16. BUKA FORM BAHAN
// =====================================================

function openBahanForm() {

    editingBahanId = null;


    const formContainer =
        document.getElementById(
            "bahan-form"
        );

    const form =
        document.getElementById(
            "form-bahan"
        );


    if (form) {

        form.reset();

    }


    if (formContainer) {

        formContainer.classList.remove("hidden");

    }


    const heading =
        formContainer.querySelector("h3");

    if (heading) {

        heading.textContent =
            "Tambah Bahan";

    }


    const button =
        form.querySelector(
            'button[type="submit"]'
        );

    if (button) {

        button.textContent =
            "Simpan";

    }
}


// =====================================================
// 17. TUTUP FORM BAHAN
// =====================================================

function closeBahanForm() {

    editingBahanId = null;


    const formContainer =
        document.getElementById(
            "bahan-form"
        );

    const form =
        document.getElementById(
            "form-bahan"
        );


    if (form) {

        form.reset();

    }


    if (formContainer) {

        formContainer.classList.add("hidden");

    }
}


// =====================================================
// 18. SIMPAN BAHAN
// =====================================================

async function simpanBahan(event) {

    event.preventDefault();


    const nama =
        document.getElementById(
            "nama-bahan"
        ).value.trim();


    const satuan =
        document.getElementById(
            "satuan-bahan"
        ).value.trim();


    const stokMinimum =
        Number(
            document.getElementById(
                "stok-minimum"
            ).value
        ) || 0;


    if (!nama || !satuan) {

        alert(
            "Nama bahan dan satuan wajib diisi."
        );

        return;

    }


    try {

        let error;


        if (editingBahanId) {

            const result =
                await supabaseClient
                    .from("bahan")
                    .update({

                        nama_bahan: nama,
                        satuan: satuan,
                        stok_minimum: stokMinimum

                    })
                    .eq(
                        "id_bahan",
                        editingBahanId
                    );

            error = result.error;


        } else {

            const result =
                await supabaseClient
                    .from("bahan")
                    .insert([{

                        nama_bahan: nama,
                        satuan: satuan,
                        stok_minimum: stokMinimum,
                        status_aktif: true

                    }]);

            error = result.error;

        }


        if (error) {

            throw error;

        }


        alert(
            editingBahanId
                ? "Data bahan berhasil diperbarui."
                : "Bahan berhasil ditambahkan."
        );


        closeBahanForm();

        await loadAllData();


    } catch (error) {

        console.error(
            "Gagal menyimpan bahan:",
            error
        );


        alert(
            "Bahan gagal disimpan.\n\n" +
            error.message
        );

    }
}


// =====================================================
// 19. EDIT BAHAN
// =====================================================

function editBahan(id) {

    const bahan =
        dataBahan.find(
            item =>
                Number(item.id_bahan) ===
                Number(id)
        );


    if (!bahan) {

        return;

    }


    editingBahanId =
        bahan.id_bahan;


    document.getElementById(
        "nama-bahan"
    ).value =
        bahan.nama_bahan;


    document.getElementById(
        "satuan-bahan"
    ).value =
        bahan.satuan;


    document.getElementById(
        "stok-minimum"
    ).value =
        bahan.stok_minimum;


    const formContainer =
        document.getElementById(
            "bahan-form"
        );

    formContainer.classList.remove(
        "hidden"
    );


    formContainer.querySelector(
        "h3"
    ).textContent =
        "Edit Bahan";


    formContainer.querySelector(
        'button[type="submit"]'
    ).textContent =
        "Update Bahan";


    showPage("bahan");
}


// =====================================================
// 20. HAPUS BAHAN
// =====================================================

async function deleteBahan(id) {

    const bahan =
        dataBahan.find(
            item =>
                Number(item.id_bahan) ===
                Number(id)
        );


    if (!bahan) {

        return;

    }


    const yakin =
        confirm(
            `Hapus bahan "${bahan.nama_bahan}"?`
        );


    if (!yakin) {

        return;

    }


    try {

        const { error } =
            await supabaseClient
                .from("bahan")
                .delete()
                .eq(
                    "id_bahan",
                    id
                );


        if (error) {

            throw error;

        }


        alert(
            "Bahan berhasil dihapus."
        );


        await loadAllData();


    } catch (error) {

        console.error(error);


        alert(
            "Bahan tidak dapat dihapus.\n\n" +
            "Kemungkinan bahan sudah digunakan " +
            "dalam anggaran atau pembelian."
        );

    }
}


// =====================================================
// 21. TABEL BAHAN
// =====================================================



function getGambarBahan(namaBahan) {
    const nama = String(namaBahan || "")
        .trim()
        .toLowerCase();

    const daftarGambar = [
        {
            kataKunci: ["shampoo anti ketombe", "shampoo anti-ketombe"],
            gambar: "images/shampoo-anti-ketombe.png"
        },
        {
            kataKunci: ["shampoo daily"],
            gambar: "images/shampoo-daily.png"
        },
        {
            kataKunci: ["shampoo"],
            gambar: "images/shampoo.png"
        },
        {
            kataKunci: ["leave-in conditioner"],
            gambar: "images/leave-in-conditioner.png"
        },
        {
            kataKunci: ["conditioner smoothing"],
            gambar: "images/conditioner-smoothing.png"
        },
        {
            kataKunci: ["conditioner volume"],
            gambar: "images/conditioner-volume.png"
        },
        {
            kataKunci: ["conditioner"],
            gambar: "images/conditioner.png"
        },
        {
            kataKunci: ["hair mask"],
            gambar: "images/hair-mask.png"
        },
        {
            kataKunci: ["cat rambut"],
            gambar: "images/cat-rambut.png"
        },
        {
            kataKunci: ["vitamin rambut"],
            gambar: "images/vitamin-rambut.png"
        },
        {
            kataKunci: ["hair tonic"],
            gambar: "images/hair-tonic.png"
        },
        {
            kataKunci: ["hair spray"],
            gambar: "images/hair-spray.png"
        },
        {
            kataKunci: ["hair wax"],
            gambar: "images/hair-wax.png"
        },
        {
            kataKunci: ["hair gel"],
            gambar: "images/hair-gel.png"
        },
        {
            kataKunci: ["hair cream"],
            gambar: "images/hair-cream.png"
        },
        {
            kataKunci: ["hair oil"],
            gambar: "images/hair-oil.png"
        },
        {
            kataKunci: ["hair mousse"],
            gambar: "images/hair-mousse.png"
        },
        {
            kataKunci: ["body lotion"],
            gambar: "images/body-lotion.png"
        },
        {
            kataKunci: ["body wash"],
            gambar: "images/body-wash.png"
        },
        {
            kataKunci: ["scalp scrub"],
            gambar: "images/scalp-scrub.png"
        },
        {
            kataKunci: ["treatment"],
            gambar: "images/treatment.png"
        },
        {
            kataKunci: ["kapas"],
            gambar: "images/kapas.png"
        },
        {
            kataKunci: ["sarung tangan latex"],
            gambar: "images/sarung-tangan-latex.png"
        },
        {
            kataKunci: ["sarung tangan"],
            gambar: "images/sarung-tangan.png"
        },
        {
            kataKunci: ["disinfektan"],
            gambar: "images/disinfektan.png"
        },
        {
            kataKunci: ["alkohol"],
            gambar: "images/alkohol.png"
        },
        {
            kataKunci: ["aluminium foil"],
            gambar: "images/aluminium-foil.png"
        },
        {
            kataKunci: ["apron"],
            gambar: "images/apron.png"
        },
        {
            kataKunci: ["alat timbang"],
            gambar: "images/alat-timbang.png"
        },
        {
            kataKunci: ["botol ukur"],
            gambar: "images/botol-ukur.png"
        },
        {
            kataKunci: ["catok rambut"],
            gambar: "images/catok-rambut.png"
        },
        {
            kataKunci: ["gunting rambut"],
            gambar: "images/gunting-rambut.png"
        },
        {
            kataKunci: ["hair cap"],
            gambar: "images/hair-cap.png"
        },
        {
            kataKunci: ["hair cap", "penutup kepala"],
            gambar: "images/hair-cap.png"
        },
        {
            kataKunci: ["handuk"],
            gambar: "images/handuk.png"
        },
        {
            kataKunci: ["jepit rambut"],
            gambar: "images/jepit-rambut.png"
        },
        {
            kataKunci: ["mangkuk kuas", "mangkuk-kuas"],
            gambar: "images/mangkuk-kuas.png"
        },
        {
            kataKunci: ["pembersih alat", "pembersih-alat"],
            gambar: "images/pembersih-alat.png"
        },
        {
            kataKunci: ["roll rambut"],
            gambar: "images/roll-rambut.png"
        },
        {
            kataKunci: ["sikat rambut"],
            gambar: "images/sikat-rambut.png"
        }
    ];

    const cocok = daftarGambar.find(item =>
        item.kataKunci.some(kata => nama.includes(kata))
    );

    return cocok ? cocok.gambar : null;
}


function renderTabelBahan() {

    const tbody =
        document.getElementById(
            "bahan-table"
        );


    if (!tbody) {

        return;

    }


    if (dataBahan.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="6"
                    class="empty-state">

                    Belum ada data bahan.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        dataBahan.map(
            function (bahan, index) {

                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        
<td>
    <div class="bahan-info">
        ${
            getGambarBahan(bahan.nama_bahan)
                ? `<img
                    src="${getGambarBahan(bahan.nama_bahan)}"
                    alt="${escapeHtml(bahan.nama_bahan)}"
                    class="foto-bahan"
                    onerror="this.style.display='none'"
                >`
                : ""
        }

        <span>${escapeHtml(bahan.nama_bahan)}</span>
    </div>
</td>


                        <td>
                            ${escapeHtml(
                                bahan.satuan
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                bahan.stok_minimum
                            )}
                        </td>

                        <td>

                            <span class="status-badge
                                         status-terkendali">

                                Aktif

                            </span>

                        </td>

                        <td>

                            <button
                                class="btn-edit"
                                onclick="editBahan(
                                    ${bahan.id_bahan}
                                )">

                               <span class="action-icon">✎</span> Edit

                            </button>

                            <button
                                class="btn-delete"
                                onclick="deleteBahan(
                                    ${bahan.id_bahan}
                                )">

                                <span class="action-icon">🗑</span> Hapus

                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");
}


// =====================================================
// 22. BUKA FORM ANGGARAN
// =====================================================

function openAnggaranForm() {

    editingAnggaranId = null;


    const container =
        document.getElementById(
            "anggaran-form"
        );

    const form =
        document.getElementById(
            "form-anggaran"
        );


    form.reset();

    container.classList.remove(
        "hidden"
    );


    container.querySelector(
        "h3"
    ).textContent =
        "Tambah Anggaran";


    container.querySelector(
        'button[type="submit"]'
    ).textContent =
        "Simpan";
}


// =====================================================
// 23. TUTUP FORM ANGGARAN
// =====================================================

function closeAnggaranForm() {

    editingAnggaranId = null;


    const container =
        document.getElementById(
            "anggaran-form"
        );


    const form =
        document.getElementById(
            "form-anggaran"
        );


    form.reset();

    container.classList.add(
        "hidden"
    );
}


// =====================================================
// 24. SIMPAN ANGGARAN
// =====================================================

async function simpanAnggaran(event) {

    event.preventDefault();


    const idBahan =
        document.getElementById(
            "anggaran-bahan"
        ).value;


    const periode =
        document.getElementById(
            "periode-anggaran"
        ).value;


    const nominal =
        Number(
            document.getElementById(
                "nominal-anggaran"
            ).value
        ) || 0;


    const keterangan =
        document.getElementById(
            "keterangan-anggaran"
        ).value.trim();


    if (!idBahan || !periode) {

        alert(
            "Bahan dan periode wajib diisi."
        );

        return;

    }


    try {

        // Ubah periode menjadi format PostgreSQL: YYYY-MM-DD
let periodeDate;

if (/^\d{4}-\d{2}$/.test(periode)) {

    // Jika nilai sudah seperti 2026-09
    periodeDate = `${periode}-01`;

} else {

    // Jika nilai seperti September 2026
    const namaBulan = {
        januari: "01",
        februari: "02",
        maret: "03",
        april: "04",
        mei: "05",
        juni: "06",
        juli: "07",
        agustus: "08",
        september: "09",
        oktober: "10",
        november: "11",
        desember: "12"
    };

    const bagian =
        periode
            .toLowerCase()
            .trim()
            .split(/\s+/);

    const bulan = namaBulan[bagian[0]];
    const tahun = bagian[1];

    if (!bulan || !tahun) {

        alert(
            "Format periode tidak dikenali."
        );

        return;

    }

    periodeDate =
        `${tahun}-${bulan}-01`;
}


const data = {

    id_bahan:
        Number(idBahan),

    periode:
        periodeDate,

    nominal_anggaran:
        nominal,

    keterangan:
        keterangan || null

};


        let error;


        if (editingAnggaranId) {

            const result =
                await supabaseClient
                    .from("anggaran")
                    .update(data)
                    .eq(
                        "id_anggaran",
                        editingAnggaranId
                    );

            error = result.error;


        } else {

            const result =
                await supabaseClient
                    .from("anggaran")
                    .insert([data]);

            error = result.error;

        }


        if (error) {

            throw error;

        }


        alert(
            editingAnggaranId
                ? "Anggaran berhasil diperbarui."
                : "Anggaran berhasil ditambahkan."
        );


        closeAnggaranForm();

        await loadAllData();


    } catch (error) {

        console.error(error);


        if (error.code === "23505") {

            alert(
                "Anggaran untuk bahan dan periode tersebut sudah ada."
            );

        } else {

            alert(
                "Anggaran gagal disimpan.\n\n" +
                error.message
            );

        }

    }
}


// =====================================================
// 25. EDIT ANGGARAN
// =====================================================

function editAnggaran(id) {

    const anggaran =
        dataAnggaran.find(
            item =>
                Number(item.id_anggaran) ===
                Number(id)
        );


    if (!anggaran) {

        return;

    }


    editingAnggaranId =
        anggaran.id_anggaran;


    document.getElementById(
        "anggaran-bahan"
    ).value =
        anggaran.id_bahan;


    document.getElementById(
        "periode-anggaran"
    ).value =
        String(
            anggaran.periode
        ).substring(0, 7);


    document.getElementById(
        "nominal-anggaran"
    ).value =
        anggaran.nominal_anggaran;


    document.getElementById(
        "keterangan-anggaran"
    ).value =
        anggaran.keterangan || "";


    const container =
        document.getElementById(
            "anggaran-form"
        );


    container.classList.remove(
        "hidden"
    );


    container.querySelector(
        "h3"
    ).textContent =
        "Edit Anggaran";


    container.querySelector(
        'button[type="submit"]'
    ).textContent =
        "Update Anggaran";


    showPage("anggaran");
}


// =====================================================
// 26. HAPUS ANGGARAN
// =====================================================

async function deleteAnggaran(id) {

    if (
        !confirm(
            "Hapus data anggaran ini?"
        )
    ) {

        return;

    }


    try {

        const { error } =
            await supabaseClient
                .from("anggaran")
                .delete()
                .eq(
                    "id_anggaran",
                    id
                );


        if (error) {

            throw error;

        }


        alert(
            "Anggaran berhasil dihapus."
        );


        await loadAllData();


    } catch (error) {

        console.error(error);


        alert(
            "Anggaran gagal dihapus.\n\n" +
            error.message
        );

    }
}


// =====================================================
// 27. TABEL ANGGARAN
// =====================================================

function renderTabelAnggaran() {

    const tbody =
        document.getElementById(
            "anggaran-table"
        );


    if (!tbody) {

        return;

    }


    if (dataAnggaran.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="6"
                    class="empty-state">

                    Belum ada data anggaran.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        dataAnggaran.map(
            function (item, index) {

                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.bahan?.nama_bahan || "-"
                            )}
                        </td>

                        <td>
                            ${formatPeriode(
                                item.periode
                            )}
                        </td>

                        <td>
                            ${formatRupiah(
                                item.nominal_anggaran
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.keterangan || "-"
                            )}
                        </td>

                        <td>

                            <button
                                class="btn-edit"
                                onclick="editAnggaran(
                                    ${item.id_anggaran}
                                )">

                                <span class="action-icon">✎</span> Edit

                            </button>

                            <button
                                class="btn-delete"
                                onclick="deleteAnggaran(
                                    ${item.id_anggaran}
                                )">

                                <span class="action-icon">🗑</span> Hapus

                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");
}


// =====================================================
// 28. HITUNG TOTAL PEMBELIAN
// =====================================================

function setupHitungTotalPembelian() {

    const qty =
        document.getElementById(
            "qty-pembelian"
        );


    const harga =
        document.getElementById(
            "harga-satuan"
        );


    const total =
        document.getElementById(
            "total-pembelian"
        );


    if (!qty || !harga || !total) {

        return;

    }


    function hitung() {

        const jumlah =
            Number(qty.value) || 0;


        const hargaSatuan =
            Number(harga.value) || 0;


        total.value =
            formatRupiah(
                jumlah * hargaSatuan
            );

    }


    qty.addEventListener(
        "input",
        hitung
    );


    harga.addEventListener(
        "input",
        hitung
    );
}


// =====================================================
// 29. BUKA FORM PEMBELIAN
// =====================================================

function openPembelianForm() {

    editingPembelianId = null;


    const container =
        document.getElementById(
            "pembelian-form"
        );


    const form =
        document.getElementById(
            "form-pembelian"
        );


    form.reset();


    container.classList.remove(
        "hidden"
    );


    setTanggalHariIni();


    document.getElementById(
        "total-pembelian"
    ).value =
        formatRupiah(0);


    container.querySelector(
        "h3"
    ).textContent =
        "Tambah Pembelian";


    container.querySelector(
        'button[type="submit"]'
    ).textContent =
        "Simpan Pembelian";
}


function openPemakaianForm() {
    editingPemakaianId = null;

    const container =
        document.getElementById("pemakaian-form");

    const form =
        document.getElementById("form-pemakaian");

    if (!container || !form) {
        alert("Formulir Pemakaian Bahan tidak ditemukan.");
        return;
    }

    form.reset();
    container.classList.remove("hidden");

    setTanggalHariIni();

    container.querySelector("h3").textContent =
        "Tambah Pemakaian Bahan";

    container.querySelector('button[type="submit"]')
        .textContent = "Simpan Pemakaian";
}

// =====================================================
// 30. TUTUP FORM PEMBELIAN
// =====================================================

function closePembelianForm() {

    editingPembelianId = null;


    const container =
        document.getElementById(
            "pembelian-form"
        );


    const form =
        document.getElementById(
            "form-pembelian"
        );


    form.reset();


    container.classList.add(
        "hidden"
    );


    setTanggalHariIni();


    document.getElementById(
        "total-pembelian"
    ).value =
        formatRupiah(0);
}


function closePemakaianForm() {
    editingPemakaianId = null;

    const container = document.getElementById("pemakaian-form");
    const form = document.getElementById("form-pemakaian");
    const judul = document.getElementById("pemakaian-form-title");

    if (!container || !form) return;

    form.reset();
    container.classList.add("hidden");

    if (judul) {
        judul.textContent = "Tambah Pemakaian Bahan";
    }

    setTanggalHariIni();
}


// =====================================================
// 31. SIMPAN PEMBELIAN
// =====================================================

async function simpanPembelian(event) {

    event.preventDefault();


    const idBahan =
        document.getElementById(
            "pembelian-bahan"
        ).value;


    const tanggal =
        document.getElementById(
            "tanggal-pembelian"
        ).value;


    const supplier =
        document.getElementById(
            "supplier"
        ).value.trim();


    const qty =
        Number(
            document.getElementById(
                "qty-pembelian"
            ).value
        );


    const hargaSatuan =
        Number(
            document.getElementById(
                "harga-satuan"
            ).value
        );


    const keterangan =
        document.getElementById(
            "keterangan-pembelian"
        ).value.trim();


    if (!idBahan || !tanggal) {

        alert(
            "Bahan dan tanggal wajib diisi."
        );

        return;

    }


    if (!qty || qty <= 0) {

        alert(
            "Qty harus lebih dari 0."
        );

        return;

    }


    if (
        isNaN(hargaSatuan) ||
        hargaSatuan < 0
    ) {

        alert(
            "Harga satuan tidak valid."
        );

        return;

    }


    try {

        const data = {

            id_bahan:
                Number(idBahan),

            tanggal:
                tanggal,

            supplier:
                supplier || null,

            qty:
                qty,

            harga_satuan:
                hargaSatuan,

            keterangan:
                keterangan || null

        };


        let error;


        if (editingPembelianId) {

            const result =
                await supabaseClient
                    .from("pembelian")
                    .update(data)
                    .eq(
                        "id_pembelian",
                        editingPembelianId
                    );

            error = result.error;


        } else {

            const result =
                await supabaseClient
                    .from("pembelian")
                    .insert([data]);

            error = result.error;

        }


        if (error) {

            throw error;

        }


        alert(
            editingPembelianId
                ? "Pembelian berhasil diperbarui."
                : "Pembelian berhasil disimpan."
        );


        closePembelianForm();

        await loadAllData();


    } catch (error) {

        console.error(error);


        alert(
            "Pembelian gagal disimpan.\n\n" +
            error.message
        );

    }
}


// =====================================================
// 32. EDIT PEMBELIAN
// =====================================================

function editPembelian(id) {

    const pembelian =
        dataPembelian.find(
            item =>
                Number(item.id_pembelian) ===
                Number(id)
        );


    if (!pembelian) {

        return;

    }


    editingPembelianId =
        pembelian.id_pembelian;


    document.getElementById(
        "pembelian-bahan"
    ).value =
        pembelian.id_bahan;


    document.getElementById(
        "tanggal-pembelian"
    ).value =
        pembelian.tanggal;


    document.getElementById(
        "supplier"
    ).value =
        pembelian.supplier || "";


    document.getElementById(
        "qty-pembelian"
    ).value =
        pembelian.qty;


    document.getElementById(
        "harga-satuan"
    ).value =
        pembelian.harga_satuan;


    document.getElementById(
        "keterangan-pembelian"
    ).value =
        pembelian.keterangan || "";


    document.getElementById(
        "total-pembelian"
    ).value =
        formatRupiah(
            pembelian.total_harga
        );


    const container =
        document.getElementById(
            "pembelian-form"
        );


    container.classList.remove(
        "hidden"
    );


    container.querySelector(
        "h3"
    ).textContent =
        "Edit Pembelian";


    container.querySelector(
        'button[type="submit"]'
    ).textContent =
        "Update Pembelian";


    showPage("pembelian");
}


// =====================================================
// 33. HAPUS PEMBELIAN
// =====================================================

async function deletePembelian(id) {

    if (
        !confirm(
            "Hapus data pembelian ini?"
        )
    ) {

        return;

    }


    try {

        const { error } =
            await supabaseClient
                .from("pembelian")
                .delete()
                .eq(
                    "id_pembelian",
                    id
                );


        if (error) {

            throw error;

        }


        alert(
            "Pembelian berhasil dihapus."
        );


        await loadAllData();


    } catch (error) {

        console.error(error);


        alert(
            "Pembelian gagal dihapus.\n\n" +
            error.message
        );

    }
}


// =====================================================
// 34. TABEL PEMBELIAN
// =====================================================

function renderTabelPembelian() {

    const tbody =
        document.getElementById(
            "pembelian-table"
        );


    if (!tbody) {

        return;

    }


    if (dataPembelian.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="8"
                    class="empty-state">

                    Belum ada transaksi pembelian.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        dataPembelian.map(
            function (item, index) {

                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${formatTanggal(
                                item.tanggal
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.bahan?.nama_bahan || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.supplier || "-"
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                item.qty
                            )}
                        </td>

                        <td>
                            ${formatRupiah(
                                item.harga_satuan
                            )}
                        </td>

                        <td>
                            ${formatRupiah(
                                item.total_harga
                            )}
                        </td>

                        <td>

                            <button
                                class="btn-edit"
                                onclick="editPembelian(
                                    ${item.id_pembelian}
                                )">

                                <span class="action-icon">✎</span> Edit

                            </button>

                            <button
                                class="btn-delete"
                                onclick="deletePembelian(
                                    ${item.id_pembelian}
                                )">

                                <span class="action-icon">🗑</span> Hapus

                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");
}


// =====================================================
// 35. HITUNG REALISASI
// =====================================================

function hitungRealisasi(
    idBahan,
    periode
) {

    if (!periode) {

        return 0;

    }


    const startDate =
        new Date(
            `${periode}T00:00:00`
        );


    const endDate =
        new Date(startDate);


    endDate.setMonth(
        endDate.getMonth() + 1
    );


    return dataPembelian
        .filter(function (item) {

            if (
                Number(item.id_bahan) !==
                Number(idBahan)
            ) {

                return false;

            }


            const tanggal =
                new Date(
                    `${item.tanggal}T00:00:00`
                );


            return (
                tanggal >= startDate &&
                tanggal < endDate
            );

        })
        .reduce(
            function (total, item) {

                return total +
                    (
                        Number(
                            item.total_harga
                        ) || 0
                    );

            },
            0
        );
}


// =====================================================
// 36. STATUS PENGENDALIAN
// =====================================================

function tentukanStatus(
    persentase
) {

    if (persentase <= 90) {

        return {
            label: "Terkendali",
            className: "status-terkendali"
        };

    }


    if (persentase <= 100) {

        return {
            label: "Mendekati Batas",
            className: "status-mendekati"
        };

    }


    return {
        label: "Melebihi Anggaran",
        className: "status-melebihi"
    };
}


// =====================================================
// 37. DATA PENGENDALIAN
// =====================================================


function getDataPengendalian() {
    const hasil = dataAnggaran.map(function (item) {
        const anggaran = Number(item.nominal_anggaran) || 0;

        const realisasi = hitungRealisasi(
            item.id_bahan,
            item.periode
        );

        const selisih = anggaran - realisasi;

        const persentase = anggaran > 0
            ? (realisasi / anggaran) * 100
            : (realisasi > 0 ? 101 : 0);

        return {
            id_anggaran: item.id_anggaran,
            id_bahan: item.id_bahan,
            nama_bahan: item.bahan?.nama_bahan || "-",
            periode: item.periode,
            anggaran,
            realisasi,
            selisih,
            persentase,
            status: tentukanStatus(persentase),
            jenis: "beranggaran"
        };
    });

    // Cari pembelian yang tidak memiliki anggaran
    // untuk bahan dan bulan transaksi yang sama.
    const pembelianTanpaAnggaran = dataPembelian.filter(function (pembelian) {
        const periodePembelian = ambilKunciPeriode(pembelian.tanggal);

        const adaAnggaran = dataAnggaran.some(function (anggaran) {
            return (
                Number(anggaran.id_bahan) === Number(pembelian.id_bahan) &&
                ambilKunciPeriode(anggaran.periode) === periodePembelian
            );
        });

        return periodePembelian !== "" && !adaAnggaran;
    });

    pembelianTanpaAnggaran.forEach(function (pembelian) {
        hasil.push({
            id_anggaran: null,
            id_bahan: pembelian.id_bahan,
            nama_bahan: pembelian.bahan?.nama_bahan || "-",
            periode: ambilKunciPeriode(pembelian.tanggal),
            anggaran: 0,
            realisasi: Number(pembelian.total_harga) || 0,
            selisih: -(Number(pembelian.total_harga) || 0),
            persentase: 0,
            status: {
                label: "Pembelian Tanpa Anggaran",
                className: "status-tanpa-anggaran"
            },
            jenis: "tanpa-anggaran",
            id_pembelian: pembelian.id_pembelian
        });
    });

    return hasil;
}



// =====================================================
// 38. RENDER PENGENDALIAN
// =====================================================


function renderPengendalian() {
    const tbody = document.getElementById("pengendalian-table");
    if (!tbody) return;

    const data = getDataPengendalian();

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    Belum ada data pengendalian.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(function (item, index) {
        const tanpaAnggaran = item.jenis === "tanpa-anggaran";

        const periodeTampil = tanpaAnggaran
            ? formatPeriode(item.periode + "-01")
            : formatPeriode(item.periode);

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(item.nama_bahan || "-")}</td>
                <td>${escapeHtml(periodeTampil)}</td>
                <td>${formatRupiah(item.anggaran)}</td>
                <td>${formatRupiah(item.realisasi)}</td>
                <td>${formatRupiah(item.selisih)}</td>
                <td>${tanpaAnggaran ? "-" : item.persentase.toFixed(1) + "%"}</td>
                <td>
                    <span class="status-badge ${item.status.className}">
                        ${escapeHtml(item.status.label)}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}


// =====================================================
// 39. DASHBOARD
// =====================================================



function renderDashboard() {
    // Tentukan periode bulan berjalan secara otomatis.
    const sekarang = new Date();
    const periodeBulanIni =
        `${sekarang.getFullYear()}-${String(
            sekarang.getMonth() + 1
        ).padStart(2, "0")}`;

    // Total seluruh bahan terdaftar, termasuk yang tidak aktif.
    const totalBahan = dataBahan.length;

    // Ambil data pengendalian untuk bulan berjalan saja.
    const semuaPengendalian = getDataPengendalian();

    const dataPengendalianBulanIni = semuaPengendalian.filter(
        item =>
            ambilKunciPeriode(item.periode) === periodeBulanIni
    );

    // Anggaran bulan berjalan.
    const dataBeranggaran = dataPengendalianBulanIni.filter(
        item => item.jenis === "beranggaran"
    );

    const totalAnggaran = dataBeranggaran.reduce(
        (total, item) =>
            total + (Number(item.anggaran) || 0),
        0
    );

    // Total pembelian bulan berjalan, termasuk tanpa anggaran.
    const totalRealisasi = dataPengendalianBulanIni.reduce(
        (total, item) =>
            total + (Number(item.realisasi) || 0),
        0
    );

    // Realisasi yang memiliki anggaran.
    const realisasiBeranggaran = dataBeranggaran.reduce(
        (total, item) =>
            total + (Number(item.realisasi) || 0),
        0
    );

    const sisaAnggaran = totalAnggaran - realisasiBeranggaran;

    // Perbarui kartu Dashboard.
    document.getElementById("total-bahan").textContent =
        formatNumber(totalBahan);

    document.getElementById("total-anggaran").textContent =
        formatRupiah(totalAnggaran);

    document.getElementById("total-realisasi").textContent =
        formatRupiah(totalRealisasi);

    document.getElementById("sisa-anggaran").textContent =
        formatRupiah(sisaAnggaran);

    // Perbarui label periode jika elemen tersedia.
    const labelPeriode = document.getElementById("dashboard-period");

    if (labelPeriode) {
        labelPeriode.textContent = sekarang.toLocaleDateString(
            "id-ID",
            {
                month: "long",
                year: "numeric"
            }
        );
    }

    // Tabel, ringkasan, dan peringatan tetap diperbarui.
    renderDashboardTable();
}


// =====================================================
// 40. TABEL DASHBOARD
// =====================================================


function renderDashboardTable() {
    const tbody = document.getElementById("dashboard-table");
    if (!tbody) return;

    // Tentukan bulan berjalan secara otomatis.
    const sekarang = new Date();
    const periodeBulanIni =
        `${sekarang.getFullYear()}-${String(
            sekarang.getMonth() + 1
        ).padStart(2, "0")}`;

    // Tampilkan hanya pengendalian pada bulan berjalan.
    const data = getDataPengendalian().filter(item =>
        ambilKunciPeriode(item.periode) === periodeBulanIni
    );

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Belum ada data pengendalian untuk bulan ini.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(function (item, index) {
        return `
            <tr>
                <td>${index + 1}</td>

                <td>
                    ${escapeHtml(item.nama_bahan)}
                </td>

                <td>
                    ${formatRupiah(item.anggaran)}
                </td>

                <td>
                    ${formatRupiah(item.realisasi)}
                </td>

                <td>
                    ${formatRupiah(item.selisih)}
                </td>

                <td>
                    ${item.persentase.toFixed(1)}%
                </td>

                <td>
                    <span class="status-badge ${item.status.className}">
                        ${escapeHtml(item.status.label)}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}


 // =====================================================
 // 41. GRAFIK DASHBOARD
 // =====================================================


function renderDashboardSummary() {
    const container = document.getElementById("dashboard-chart");
    if (!container) return;

    const data = getDataPengendalian();
    const beranggaran = data.filter(
        item => item.jenis === "beranggaran"
    );

    const anggaran = beranggaran.reduce(
        (total, item) => total + (Number(item.anggaran) || 0),
        0
    );

    const realisasi = beranggaran.reduce(
        (total, item) => total + (Number(item.realisasi) || 0),
        0
    );

    const tanpaAnggaran = data.filter(
        item => item.jenis === "tanpa-anggaran"
    );

    const nilaiTanpaAnggaran = tanpaAnggaran.reduce(
        (total, item) => total + (Number(item.realisasi) || 0),
        0
    );

    const persentase = anggaran > 0
        ? (realisasi / anggaran) * 100
        : 0;

    container.innerHTML = `
        <div class="dashboard-summary-list">
            <div class="dashboard-summary-row">
                <span>Total anggaran beranggaran</span>
                <strong>${formatRupiah(anggaran)}</strong>
            </div>
            <div class="dashboard-summary-row">
                <span>Realisasi beranggaran</span>
                <strong>${formatRupiah(realisasi)}</strong>
            </div>
            <div class="dashboard-summary-row">
                <span>Penggunaan anggaran</span>
                <strong>${persentase.toFixed(1)}%</strong>
            </div>
            <div class="dashboard-summary-row warning-summary">
                <span>Pembelian tanpa anggaran</span>
                <strong>${formatRupiah(nilaiTanpaAnggaran)}</strong>
            </div>
        </div>
    `;
}


 // =====================================================
 // 41. LAPORAN GRACESLAY SALON
 // =====================================================

function renderLaporan() {
    const section = document.getElementById("laporan");
    if (!section) return;

    const semuaPeriode = [
    ...(dataAnggaran || []).map(item =>
        ambilKunciPeriode(item.periode)
    ),
    ...(dataPembelian || []).map(item =>
        ambilKunciPeriode(item.tanggal)
    )
];

const periodeTersedia = [
    ...new Set(semuaPeriode.filter(Boolean))
].sort().reverse();

// Pertahankan periode yang sebelumnya dipilih.
const periodeSebelumnya =
    document.getElementById("laporan-periode")?.value || "";

const periodeDefault = periodeTersedia.includes(periodeSebelumnya)
    ? periodeSebelumnya
    : (periodeTersedia[0] || "");

    section.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Laporan Graceslay Salon</h2>
                <p>
                    Ringkasan pembelian dan pengendalian anggaran
                    berdasarkan periode yang dipilih.
                </p>
            </div>
        </div>

        <div class="content-card">
            <h3>Filter Periode Laporan</h3>

            <div class="form-grid">
                <div class="form-group">
                    <label for="laporan-periode">
                        Bulan dan Tahun
                    </label>

                    <select id="laporan-periode">
                        ${
                            periodeTersedia.length
                                ? periodeTersedia.map(periode => `
                                    <option
                                        value="${escapeHtml(periode)}"
                                        ${periode === periodeDefault ? "selected" : ""}>
                                        ${escapeHtml(formatPeriode(periode))}
                                    </option>
                                `).join("")
                                : `<option value="">Belum ada periode</option>`
                        }
                    </select>
                </div>

                <div class="form-group">
                    <label>&nbsp;</label>
                    <button
                        type="button"
                        class="primary-button"
                        onclick="tampilkanRingkasanLaporan()">
                        Tampilkan Laporan
                    </button>
                </div>
            </div>
        </div>

        <div id="laporan-ringkasan"></div>

        <div class="report-grid">
            <div class="content-card report-card">
                <div class="report-icon pink-icon">P</div>
                <div>
                    <h3>Laporan Pembelian</h3>
                    <p>
                        Rincian transaksi pembelian bahan
                        pada periode yang dipilih.
                    </p>
                    <button
                        type="button"
                        class="secondary-button"
                        onclick="tampilkanLaporanPembelian()">
                        Lihat Transaksi
                    </button>
                </div>
            </div>

            <div class="content-card report-card">
                <div class="report-icon purple-icon">A</div>
                <div>
                    <h3>Laporan Anggaran</h3>
                    <p>
                        Perbandingan anggaran dan realisasi
                        pembelian per bahan.
                    </p>
                    <button
                        type="button"
                        class="secondary-button"
                        onclick="tampilkanLaporanAnggaran()">
                        Lihat Analisis Anggaran
                    </button>
                </div>
            </div>
        </div>

        <div class="content-card">
            <h3>Cetak Laporan</h3>
            <p>
                Cetak ringkasan laporan yang sedang ditampilkan
                atau pilih Save as PDF pada dialog cetak browser.
            </p>
            <button
    type="button"
    class="secondary-button"
    onclick="cetakLaporanLengkap()">
    Cetak Laporan Lengkap / Simpan PDF
</button>
        </div>
    `;

    const pilihanPeriode =
    document.getElementById("laporan-periode");

if (pilihanPeriode) {
    pilihanPeriode.addEventListener("change", function () {
        periodeLaporanAktif = this.value;
    });

    if (periodeLaporanAktif) {
        pilihanPeriode.value = periodeLaporanAktif;
    } else {
        periodeLaporanAktif = pilihanPeriode.value;
    }
}

tampilkanRingkasanLaporan();
}


// =====================================================
// UTILITAS PERIODE LAPORAN
// =====================================================

function ambilKunciPeriode(nilai) {
    if (!nilai) return "";

    const teks = String(nilai);

    // Format periode anggaran YYYY-MM.
    if (/^\d{4}-\d{2}$/.test(teks)) {
        return teks;
    }

    // Format tanggal YYYY-MM-DD.
    if (/^\d{4}-\d{2}-\d{2}/.test(teks)) {
        return teks.slice(0, 7);
    }

    return "";
}

function ambilPembelianPeriode(periode) {
    return (dataPembelian || []).filter(item =>
        ambilKunciPeriode(item.tanggal) === periode
    );
}

function ambilAnggaranPeriode(periode) {
    return (dataAnggaran || []).filter(item =>
        ambilKunciPeriode(item.periode) === periode
    );
}


// =====================================================
// RINGKASAN LAPORAN PERIODIK
// =====================================================

function tampilkanRingkasanLaporan() {
    const container =
        document.getElementById("laporan-ringkasan");

    const pilihan =
        document.getElementById("laporan-periode");

    if (!container || !pilihan) return;

    const periode = pilihan.value;

    if (!periode) {
        container.innerHTML = `
            <div class="content-card">
                <p class="empty-state">
                    Belum ada data periode untuk dilaporkan.
                </p>
            </div>
        `;
        return;
    }

    
const anggaranPeriode = ambilAnggaranPeriode(periode);
const pembelianPeriode = ambilPembelianPeriode(periode);

// Hanya pembelian yang memiliki anggaran pada
// bahan dan periode yang sama yang menjadi realisasi anggaran.
const pembelianBeranggaran = pembelianPeriode.filter(
    function (pembelian) {
        const periodePembelian =
            ambilKunciPeriode(pembelian.tanggal);

        return anggaranPeriode.some(function (anggaran) {
            return (
                Number(anggaran.id_bahan) ===
                    Number(pembelian.id_bahan) &&
                ambilKunciPeriode(anggaran.periode) ===
                    periodePembelian
            );
        });
    }
);

const pembelianTanpaAnggaran = pembelianPeriode.filter(
    function (pembelian) {
        return !pembelianBeranggaran.some(function (item) {
            return Number(item.id_pembelian) ===
                Number(pembelian.id_pembelian);
        });
    }
);

const totalAnggaran = anggaranPeriode.reduce(
    (total, item) =>
        total + (Number(item.nominal_anggaran) || 0),
    0
);

const totalRealisasi = pembelianBeranggaran.reduce(
    (total, item) =>
        total + (Number(item.total_harga) || 0),
    0
);

const totalTanpaAnggaran = pembelianTanpaAnggaran.reduce(
    (total, item) =>
        total + (Number(item.total_harga) || 0),
    0
);

const selisih = totalAnggaran - totalRealisasi;

const persentase = totalAnggaran > 0
    ? (totalRealisasi / totalAnggaran) * 100
    : totalRealisasi > 0 ? 101 : 0;


    const bahanTerbesar = pembelianPeriode.reduce(
        (hasil, item) => {
            const nilai = Number(item.total_harga) || 0;

            if (!hasil || nilai > hasil.total) {
                return {
                    nama: item.bahan?.nama_bahan || "-",
                    total: nilai
                };
            }

            return hasil;
        },
        null
    );

    container.innerHTML = `
        <div class="content-card">
            <div class="page-header">
                <div>
                    <h3>
                        Ringkasan ${escapeHtml(formatPeriode(periode))}
                    </h3>
                    <p>
                        Berdasarkan anggaran dan transaksi pembelian
                        pada periode terpilih.
                    </p>
                </div>
            </div>

            <div class="report-grid">
                <div class="content-card">
                    <p>Total Anggaran</p>
                    <h3>${formatRupiah(totalAnggaran)}</h3>
                </div>

                <div class="content-card">
                    <p>Realisasi Pembelian</p>
                    <h3>${formatRupiah(totalRealisasi)}</h3>
                    <p>${pembelianPeriode.length} transaksi</p>
                </div>

                <div class="content-card">
                    <p>
                        ${selisih >= 0
                            ? "Sisa Anggaran"
                            : "Kelebihan Anggaran"}
                    </p>
                    <h3>${formatRupiah(Math.abs(selisih))}</h3>
                </div>

                <div class="content-card">
                    <p>Persentase Realisasi</p>
                    <h3>${persentase.toFixed(1)}%</h3>
                </div>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Indikator</th>
                            <th>Hasil</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Jumlah transaksi pembelian</td>
                            <td>${pembelianPeriode.length}</td>
                        </tr>
                        <tr>
                            <td>Jumlah bahan yang dianggarkan</td>
                            <td>${anggaranPeriode.length}</td>
                        </tr>
                        <tr>
                            <td>Bahan dengan nilai pembelian terbesar</td>
                            <td>
                                ${bahanTerbesar
                                    ? escapeHtml(bahanTerbesar.nama)
                                    : "-"}
                            </td>
                        </tr>
                        <tr>
                            <td>Nilai pembelian terbesar per transaksi</td>
                            <td>
                                ${formatRupiah(
                                    bahanTerbesar ? bahanTerbesar.total : 0
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p class="empty-state">
                Catatan: ringkasan ini membandingkan anggaran dengan
                pembelian pada periode yang sama. Angka tersebut
                bukan nilai biaya pemakaian bahan.
            </p>
        </div>
    `;
}


function kembaliKeLaporan() {
    const pilihanLama =
        document.getElementById("laporan-periode");

    if (pilihanLama && pilihanLama.value) {
        periodeLaporanAktif = pilihanLama.value;
    }

    renderLaporan();

    const pilihanBaru =
        document.getElementById("laporan-periode");

    if (pilihanBaru && periodeLaporanAktif) {
        pilihanBaru.value = periodeLaporanAktif;
    }

    tampilkanRingkasanLaporan();
}

// =====================================================
// LAPORAN PEMBELIAN
// =====================================================

function tampilkanLaporanPembelian() {
    const section = document.getElementById("laporan");
    const pilihan = document.getElementById("laporan-periode");

    if (!section || !pilihan) return;

    const periode = pilihan.value;
    const data = periode
        ? ambilPembelianPeriode(periode)
        : [];

    let isiTabel = "";

    if (data.length === 0) {
        isiTabel = `
            <tr>
                <td colspan="7" class="empty-state">
                    Tidak ada transaksi pembelian pada periode ini.
                </td>
            </tr>
        `;
    } else {
        isiTabel = data.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${formatTanggal(item.tanggal)}</td>
                <td>${escapeHtml(item.bahan?.nama_bahan || "-")}</td>
                <td>${escapeHtml(item.supplier || "-")}</td>
                <td>${item.qty}</td>
                <td>${formatRupiah(item.harga_satuan)}</td>
                <td>${formatRupiah(item.total_harga)}</td>
            </tr>
        `).join("");
    }

    section.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Laporan Pembelian</h2>
                <p>Periode: ${escapeHtml(formatPeriode(periode))}</p>
            </div>
        </div>

        <div class="content-card">
            <h3>Rincian Transaksi Pembelian</h3>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Tanggal</th>
                            <th>Bahan</th>
                            <th>Supplier</th>
                            <th>Qty</th>
                            <th>Harga Satuan</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>${isiTabel}</tbody>
                </table>
            </div>
        </div>

        <button type="button" class="primary-button"
    onclick="kembaliKeLaporan()">
    Kembali ke Laporan
</button>
    `;
}


// =====================================================
// LAPORAN ANGGARAN
// =====================================================

function tampilkanLaporanAnggaran() {
    const section = document.getElementById("laporan");
    const pilihan = document.getElementById("laporan-periode");

    if (!section || !pilihan) return;

    const periode = pilihan.value;
    const data = periode
        ? getDataPengendalian().filter(item =>
            ambilKunciPeriode(item.periode) === periode
        )
        : [];

    let isiTabel = "";

    if (data.length === 0) {
        isiTabel = `
            <tr>
                <td colspan="8" class="empty-state">
                    Tidak ada anggaran pada periode ini.
                </td>
            </tr>
        `;
    } else {
        isiTabel = data.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(item.nama_bahan || "-")}</td>
                <td>${escapeHtml(formatPeriode(item.periode))}</td>
                <td>${formatRupiah(item.anggaran)}</td>
                <td>${formatRupiah(item.realisasi)}</td>
                <td>${formatRupiah(item.selisih)}</td>
                <td>${Number(item.persentase || 0).toFixed(1)}%</td>
                <td>
                    <span class="status-badge ${item.status.className}">
                        ${item.status.label}
                    </span>
                </td>
            </tr>
        `).join("");
    }

    section.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Laporan Anggaran</h2>
                <p>Periode: ${escapeHtml(formatPeriode(periode))}</p>
            </div>
        </div>

        <div class="content-card">
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Bahan</th>
                            <th>Periode</th>
                            <th>Anggaran</th>
                            <th>Realisasi</th>
                            <th>Selisih</th>
                            <th>% Realisasi</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${isiTabel}</tbody>
                </table>
            </div>
        </div>

        <button type="button" class="primary-button"
    onclick="kembaliKeLaporan()">
    Kembali ke Laporan
</button>
    `;
}


function cetakLaporanLengkap() {
    const pilihan = document.getElementById("laporan-periode");
    const periode = pilihan?.value || periodeLaporanAktif;

    if (!periode) {
        alert("Pilih periode laporan terlebih dahulu.");
        return;
    }

    // Ambil transaksi dan analisis untuk periode terpilih.
    const transaksi = ambilPembelianPeriode(periode) || [];

    const analisis = getDataPengendalian().filter(item =>
        ambilKunciPeriode(item.periode) === periode
    );

    const totalAnggaran = analisis.reduce(
        (total, item) => total + Number(item.anggaran || 0), 0
    );

    const totalRealisasi = analisis.reduce(
        (total, item) => total + Number(item.realisasi || 0), 0
    );

    const totalSelisih = totalAnggaran - totalRealisasi;

    const barisTransaksi = transaksi.length
        ? transaksi.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(formatTanggal(item.tanggal))}</td>
                <td>${escapeHtml(item.bahan?.nama_bahan || "-")}</td>
                <td>${escapeHtml(item.supplier || "-")}</td>
                <td>${Number(item.qty || 0)}</td>
                <td>${escapeHtml(formatRupiah(item.harga_satuan))}</td>
                <td>${escapeHtml(formatRupiah(item.total_harga))}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">Tidak ada transaksi pembelian.</td></tr>`;

    const barisAnggaran = analisis.length
        ? analisis.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(item.nama_bahan || "-")}</td>
                <td>${escapeHtml(formatPeriode(item.periode))}</td>
                <td>${escapeHtml(formatRupiah(item.anggaran))}</td>
                <td>${escapeHtml(formatRupiah(item.realisasi))}</td>
                <td>${escapeHtml(formatRupiah(item.selisih))}</td>
                <td>${Number(item.persentase || 0).toFixed(1)}%</td>
                <td>${escapeHtml(item.status?.label || "-")}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="8">Tidak ada data anggaran.</td></tr>`;

    const jendelaCetak = window.open("", "_blank");

    if (!jendelaCetak) {
        alert(
            "Jendela cetak diblokir browser. Izinkan pop-up untuk aplikasi ini, lalu coba lagi."
        );
        return;
    }

    jendelaCetak.document.open();
    jendelaCetak.document.write(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Laporan Graceslay Salon</title>
            <style>
                @page {
                    size: A4 landscape;
                    margin: 12mm;
                }

                body {
                    font-family: Arial, sans-serif;
                    color: #222;
                    font-size: 10px;
                }

                h1 {
                    text-align: center;
                    font-size: 20px;
                    margin-bottom: 4px;
                }

                .periode {
                    text-align: center;
                    margin-bottom: 24px;
                }

                h2 {
                    font-size: 14px;
                    margin-top: 24px;
                    border-bottom: 1px solid #aaa;
                    padding-bottom: 6px;
                }

                .ringkasan {
                    display: flex;
                    gap: 12px;
                    margin: 16px 0;
                }

                .kartu {
                    flex: 1;
                    border: 1px solid #bbb;
                    padding: 10px;
                }

                .label {
                    display: block;
                    margin-bottom: 6px;
                    color: #555;
                }

                .nilai {
                    font-weight: bold;
                    font-size: 13px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }

                th, td {
                    border: 1px solid #999;
                    padding: 6px;
                    text-align: left;
                    overflow-wrap: anywhere;
                }

                th {
                    background: #f0f0f0;
                }

                thead {
                    display: table-header-group;
                }

                tr {
                    break-inside: avoid;
                }

                .catatan {
                    margin-top: 24px;
                    font-size: 9px;
                    color: #555;
                }

                @media screen {
                    body {
                        max-width: 1100px;
                        margin: 24px auto;
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Laporan Graceslay Salon</h1>
            <div class="periode">
                Periode: ${escapeHtml(formatPeriode(periode))}
            </div>

            <h2>1. Ringkasan Laporan</h2>
            <div class="ringkasan">
                <div class="kartu">
                    <span class="label">Total Anggaran</span>
                    <span class="nilai">${escapeHtml(formatRupiah(totalAnggaran))}</span>
                </div>
                <div class="kartu">
                    <span class="label">Realisasi Pembelian</span>
                    <span class="nilai">${escapeHtml(formatRupiah(totalRealisasi))}</span>
                </div>
                <div class="kartu">
                    <span class="label">Sisa Anggaran</span>
                    <span class="nilai">${escapeHtml(formatRupiah(totalSelisih))}</span>
                </div>
            </div>

            <h2>2. Rincian Transaksi Pembelian</h2>
            <table>
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Tanggal</th>
                        <th>Bahan</th>
                        <th>Supplier</th>
                        <th>Qty</th>
                        <th>Harga Satuan</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>${barisTransaksi}</tbody>
            </table>

            <h2>3. Analisis Pengendalian Anggaran</h2>
            <table>
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Bahan</th>
                        <th>Periode</th>
                        <th>Anggaran</th>
                        <th>Realisasi</th>
                        <th>Selisih</th>
                        <th>% Realisasi</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>${barisAnggaran}</tbody>
            </table>

            <div class="catatan">
                Laporan dibuat dari data Graceslay Salon untuk periode
                ${escapeHtml(formatPeriode(periode))}.
            </div>

            <script>
                window.onload = function () {
                    window.focus();
                    window.print();
                };
            <\/script>
        </body>
        </html>
    `);
    jendelaCetak.document.close();
}

// =====================================================
// 42. FUNGSI GLOBAL
// =====================================================

window.showPage =
    showPage;

window.openBahanForm =
    openBahanForm;

window.closeBahanForm =
    closeBahanForm;

window.editBahan =
    editBahan;

window.deleteBahan =
    deleteBahan;

window.openAnggaranForm =
    openAnggaranForm;

window.closeAnggaranForm =
    closeAnggaranForm;

window.editAnggaran =
    editAnggaran;

window.deleteAnggaran =
    deleteAnggaran;

window.openPembelianForm =
    openPembelianForm;

window.closePembelianForm =
    closePembelianForm;

window.editPembelian =
    editPembelian;

window.deletePembelian =
    deletePembelian;

window.renderLaporan =
    renderLaporan;

window.tampilkanLaporanPembelian =
    tampilkanLaporanPembelian;

window.tampilkanLaporanAnggaran =
    tampilkanLaporanAnggaran;

window.openPemakaianForm =
    openPemakaianForm;

window.closePemakaianForm =
    closePemakaianForm;

window.hapusPemakaian =
    hapusPemakaian;