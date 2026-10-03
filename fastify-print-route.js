// =============================================================================
// FILE: fastify-print-route.js
// ROUTE CETAK E-RAPOR DINAMIS & FLEKSIBEL (PTS / PAS / TERPADU)
// Bebas Hardcode: Otomatis Menyesuaikan Mode PTS vs PAS, Tahun Ajaran, Semester,
// Identitas Sekolah, Kepala Sekolah, Wali Kelas, dan Tanggal Cetak Indonesia.
// =============================================================================

module.exports = function (fastify, opts, next) {

  // Helper: Format tanggal Indonesia dinamis (contoh: "26 Oktober 2026")
  function formatTanggalIndonesia(d = new Date()) {
    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Helper: Konversi Nilai Angka ke Terbilang Kata Bahasa Indonesia
  function numberToWords(num) {
    const val = Math.round(Number(num));
    if (isNaN(val) || val < 0 || val > 100) return '-';
    if (val === 0) return 'nol';
    if (val === 100) return 'seratus';
    
    const belasan = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
    const puluhan = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];
    const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
    
    if (val < 10) return satuan[val];
    if (val < 20) return belasan[val - 10];
    
    const puluhDigit = Math.floor(val / 10);
    const sisaDigit = val % 10;
    return (puluhan[puluhDigit] + ' ' + satuan[sisaDigit]).trim();
  }

  // Handler Utama Pencetakan Rapor
  const printHandler = async (request, reply) => {
    const { nis } = request.params;
    
    // -------------------------------------------------------------------------
    // 1. Tentukan Mode Rapor Dinamis: PTS (Tengah Semester) vs PAS (Akhir Semester)
    // -------------------------------------------------------------------------
    const routePath = request.raw.url || '';
    const queryJenis = request.query.jenis || request.query.tipe || request.params.jenis;
    
    let isPTS = false;
    if (queryJenis) {
      isPTS = String(queryJenis).trim().toUpperCase() === 'PTS';
    } else if (routePath.includes('/print/pts/')) {
      isPTS = true;
    }

    const modeLabel = isPTS ? 'PTS' : 'PAS';

    // Mode Diagnostik Cepat untuk Guru/Teknisi
    if (request.query.debug) {
      try {
        const [siswaRow] = await fastify.mysql.akad.query(`SELECT * FROM jbsakad.siswa WHERE nis = ? LIMIT 1`, [nis]);
        return reply.send({
          status: 'debug_info',
          nis,
          mode: modeLabel,
          siswaRow
        });
      } catch (err) {
        return reply.send({ status: 'debug_error', pesan: err.message });
      }
    }

    try {
      // -----------------------------------------------------------------------
      // 2. Ambil Data Profil Siswa & Kelas
      // -----------------------------------------------------------------------
      let siswa = { 
        nama: '', 
        nis: '', 
        nisn: '', 
        kelas: '-', 
        tahunajaran: request.query.tahunajaran || '2025/2026',
        idsemester: request.query.idsemester ? Number(request.query.idsemester) : 34
      };
      
      const [siswaResult] = await fastify.mysql.akad.query(
        `SELECT s.nama, s.nis, s.nisn, s.idkelas, k.kelas 
         FROM jbsakad.siswa s 
         LEFT JOIN jbsakad.kelas k ON s.idkelas = k.replid 
         WHERE s.nis = ? LIMIT 1`, 
        [nis]
      );

      if (!siswaResult || siswaResult.length === 0) {
        return reply.code(404).send({ status: 'error', pesan: 'Data siswa tidak ditemukan!' });
      }

      siswa.nama = siswaResult[0].nama;
      siswa.nis = String(siswaResult[0].nis);
      siswa.nisn = siswaResult[0].nisn || '-';
      siswa.kelas = siswaResult[0].kelas || '-';

      // Ambil Tahun Ajaran & ID Semester secara dinamis jika tidak diberikan di query
      if (!request.query.tahunajaran) {
        try {
          const [taResult] = await fastify.mysql.akad.query(
            `SELECT t.tahunajaran, t.replid AS idta, t.departemen
             FROM jbsakad.siswa s
             JOIN jbsakad.kelas k ON s.idkelas = k.replid
             JOIN jbsakad.tahunajaran t ON k.idtahunajaran = t.replid
             WHERE s.nis = ? LIMIT 1`,
            [nis]
          );
          if (taResult && taResult.length > 0 && taResult[0].tahunajaran) {
            siswa.tahunajaran = taResult[0].tahunajaran;
          }
        } catch (errTa) {
          console.warn('Fallback tahun ajaran:', errTa.message);
        }
      }

      // Deteksi Semester (Ganjil vs Genap)
      let semesterNama = 'Ganjil';
      let semesterAngka = '1';
      if (request.query.semester) {
        semesterAngka = String(request.query.semester).trim();
        semesterNama = (semesterAngka === '2' || semesterAngka.toLowerCase().includes('genap')) ? 'Genap' : 'Ganjil';
      } else if (siswa.idsemester === 35 || siswa.idsemester % 2 !== 0) {
        // Logika umum penomoran semester
        semesterNama = (siswa.idsemester === 34 || siswa.idsemester === 1) ? 'Ganjil' : 'Genap';
        semesterAngka = semesterNama === 'Ganjil' ? '1' : '2';
      }

      const isSemesterGenap = semesterNama.toLowerCase() === 'genap';

      // -----------------------------------------------------------------------
      // 3. Ambil Identitas Sekolah Secara Dinamis (Bebas Hardcode)
      // -----------------------------------------------------------------------
      let sekolah = {
        nama: "SD ISLAM HIDAYATUL ISLAMIYAH",
        alamat: "Jl. Sapi Perah Rt 003/02, Pondok Ranggon",
        kota: "Jakarta Timur",
        telepon: "Telp: 8440279",
        npsn: "20104149"
      };

      try {
        const [identitasRows] = await fastify.mysql.akad.query(`SELECT * FROM jbsadm.identitas LIMIT 1`);
        if (identitasRows && identitasRows.length > 0) {
          const row = identitasRows[0];
          if (row.nama || row.sekolah) sekolah.nama = String(row.nama || row.sekolah).trim();
          if (row.alamat) sekolah.alamat = String(row.alamat).trim();
          if (row.kota || row.kabupaten) sekolah.kota = String(row.kota || row.kabupaten).trim();
          if (row.telp || row.telepon) sekolah.telepon = String(row.telp || row.telepon).trim();
          if (row.npsn) sekolah.npsn = String(row.npsn).trim();
        }
      } catch (eIdentitas) {
        // Fallback: periksa tabel departemen
        try {
          const [depRows] = await fastify.mysql.akad.query(`SELECT nama, keterangan FROM jbsakad.departemen LIMIT 1`);
          if (depRows && depRows.length > 0 && depRows[0].nama) {
            sekolah.nama = depRows[0].nama.trim();
          }
        } catch (_) {}
      }

      if (request.query.sekolah) {
        sekolah.nama = String(request.query.sekolah).trim();
      }

      // -----------------------------------------------------------------------
      // 4. Ambil Data Nilai Sesuai Kebutuhan PTS vs PAS
      // -----------------------------------------------------------------------
      let raporResult = [];

      if (isPTS) {
        // --- MODE PTS: Tarik dari kurikulum.pts (Komponen PH, PTS, Nilai Akhir) ---
        try {
          const [ptsRows] = await fastify.mysql.kurikulum.query(
            `SELECT p.*, pel.nama AS mapel, pel.kode AS kodemapel
             FROM kurikulum.pts p
             JOIN jbsakad.pelajaran pel ON p.idpelajaran = pel.replid
             WHERE (p.nis = ? OR CAST(p.nis AS CHAR) = ?)
               AND (p.tahunajaran = ? OR REPLACE(p.tahunajaran, '-', '/') = REPLACE(?, '-', '/') OR p.tahunajaran IS NULL OR p.tahunajaran = "")
             ORDER BY pel.replid ASC`,
            [nis, nis, siswa.tahunajaran, siswa.tahunajaran]
          );

          if (ptsRows && ptsRows.length > 0) {
            raporResult = ptsRows;
          } else {
            // Fallback HANYA jika nilai di kurikulum.terpadu berjenis 'PTS'
            const [fallbackRows] = await fastify.mysql.kurikulum.query(
              `SELECT t.*, pel.nama AS mapel, pel.kode AS kodemapel 
               FROM kurikulum.terpadu t 
               JOIN jbsakad.pelajaran pel ON t.idpelajaran = pel.replid 
               WHERE (t.nis = ? OR CAST(t.nis AS CHAR) = ?)
                 AND t.jenis = 'PTS'
                 AND (t.tahunajaran = ? OR REPLACE(t.tahunajaran, '-', '/') = REPLACE(?, '-', '/') OR t.tahunajaran IS NULL OR t.tahunajaran = "")
               ORDER BY pel.replid ASC`,
              [nis, nis, siswa.tahunajaran, siswa.tahunajaran]
            );
            raporResult = fallbackRows || [];
          }
        } catch (ePts) {
          console.warn('Gagal memuat kurikulum.pts, mencoba fallback terpadu jenis PTS:', ePts.message);
          try {
            const [fallbackRows] = await fastify.mysql.kurikulum.query(
              `SELECT t.*, pel.nama AS mapel, pel.kode AS kodemapel 
               FROM kurikulum.terpadu t 
               JOIN jbsakad.pelajaran pel ON t.idpelajaran = pel.replid 
               WHERE (t.nis = ? OR CAST(t.nis AS CHAR) = ?)
                 AND t.jenis = 'PTS'
                 AND (t.tahunajaran = ? OR REPLACE(t.tahunajaran, '-', '/') = REPLACE(?, '-', '/') OR t.tahunajaran IS NULL OR t.tahunajaran = "")
               ORDER BY pel.replid ASC`,
              [nis, nis, siswa.tahunajaran, siswa.tahunajaran]
            );
            raporResult = fallbackRows || [];
          } catch (_) {
            raporResult = [];
          }
        }
      } else {
        // --- MODE PAS: Tarik dari kurikulum.terpadu (Nilai Akhir Terpadu Semester) ---
        const [terpaduRows] = await fastify.mysql.kurikulum.query(
          `SELECT t.*, p.nama AS mapel, p.kode AS kodemapel 
           FROM kurikulum.terpadu t 
           JOIN jbsakad.pelajaran p ON t.idpelajaran = p.replid 
           WHERE (t.nis = ? OR CAST(t.nis AS CHAR) = ?)
             AND (t.jenis = 'PAS' OR t.jenis IS NULL OR t.jenis = '')
             AND (t.tahunajaran = ? OR REPLACE(t.tahunajaran, '-', '/') = REPLACE(?, '-', '/') OR t.tahunajaran IS NULL OR t.tahunajaran = "")
           ORDER BY p.replid ASC`, 
          [nis, nis, siswa.tahunajaran, siswa.tahunajaran]
        );
        raporResult = terpaduRows || [];
      }

      // -----------------------------------------------------------------------
      // 5. Ambil Catatan & Kepribadian Siswa
      // -----------------------------------------------------------------------
      let kepribadian = { 
        ibadah: 'B', 
        akhlak: 'B', 
        disiplin: 'B', 
        catatan: isPTS 
          ? 'Tingkatkan keaktifan belajar dan persiapan materi menjelang akhir semester.'
          : 'Tingkatkan terus semangat belajar, ketekunan ibadah, dan kedisiplinanmu.' 
      };

      try {
        if (isPTS) {
          // Pada PTS, coba ambil catatan wali kelas dari kurikulum.rekappts
          const [ptsRekap] = await fastify.mysql.kurikulum.query(
            `SELECT catatan_walikelas FROM kurikulum.rekappts 
             WHERE nis = ? AND (tahunajaran = ? OR tahunajaran IS NULL OR tahunajaran = "") 
             ORDER BY replid DESC LIMIT 1`,
            [nis, siswa.tahunajaran]
          );
          if (ptsRekap && ptsRekap.length > 0 && ptsRekap[0].catatan_walikelas) {
            kepribadian.catatan = ptsRekap[0].catatan_walikelas;
          }
        }

        // Ambil nilai sikap dari kepribadian jika ada
        const [kepResult] = await fastify.mysql.kurikulum.query(
          `SELECT ibadah, akhlak, disiplin, catatan 
           FROM kurikulum.kepribadian 
           WHERE nis = ? AND (tahunajaran = ? OR tahunajaran IS NULL OR tahunajaran = "")
           ORDER BY replid DESC LIMIT 1`,
          [nis, siswa.tahunajaran]
        );
        if (kepResult && kepResult.length > 0) {
          kepribadian.ibadah = kepResult[0].ibadah || 'B';
          kepribadian.akhlak = kepResult[0].akhlak || 'B';
          kepribadian.disiplin = kepResult[0].disiplin || 'B';
          if (kepResult[0].catatan && !isPTS) {
            kepribadian.catatan = kepResult[0].catatan;
          }
        }
      } catch (errKep) {
        console.warn('Catatan/kepribadian note:', errKep.message);
      }

      // -----------------------------------------------------------------------
      // 6. Ambil Data Kehadiran / Absensi
      // -----------------------------------------------------------------------
      let kehadiran = { sakit: 0, izin: 0, alpa: 0 };
      try {
        const [kehResult] = await fastify.mysql.kurikulum.query(
          `SELECT sakit, izin, alpa 
           FROM kurikulum.kehadiran 
           WHERE nis = ? AND (tahunajaran = ? OR tahunajaran IS NULL OR tahunajaran = "")
           ORDER BY replid DESC LIMIT 1`,
          [nis, siswa.tahunajaran]
        );
        if (kehResult && kehResult.length > 0) {
          kehadiran = {
            sakit: Number(kehResult[0].sakit || 0),
            izin: Number(kehResult[0].izin || 0),
            alpa: Number(kehResult[0].alpa || 0)
          };
        }
      } catch (errKeh) {
        console.warn('Absensi note:', errKeh.message);
      }

      // -----------------------------------------------------------------------
      // 7. Ambil Data Wali Kelas Secara Dinamis & Multi-Schema
      // -----------------------------------------------------------------------
      let waliKelas = { nama: `WALI KELAS ${siswa.kelas}`, nip: '-' };
      
      try {
        const [kelasRes] = await fastify.mysql.akad.query(
          `SELECT k.* 
           FROM jbsakad.siswa s 
           JOIN jbsakad.kelas k ON s.idkelas = k.replid 
           WHERE s.nis = ? LIMIT 1`,
          [nis]
        );

        if (kelasRes && kelasRes.length > 0) {
          const kRow = kelasRes[0];
          const nipWali = kRow.nipwali || kRow.nipwalikelas || kRow.nipguru || kRow.nip;
          const namaLangsung = kRow.walikelas || kRow.nama_wali || kRow.nama_walikelas || kRow.nama_guru;

          if (namaLangsung) {
            waliKelas.nama = String(namaLangsung).trim().toUpperCase();
          }

          if (nipWali) {
            const nipStr = String(nipWali).trim();
            waliKelas.nip = nipStr;

            // Cari nama lengkap dan gelar dari master tabel pegawai
            const schemas = ['jbsakad', 'jbssdm', 'jbsadm'];
            for (const sch of schemas) {
              try {
                const [pegRes] = await fastify.mysql.akad.query(
                  `SELECT * FROM ${sch}.pegawai WHERE nip = ? LIMIT 1`,
                  [nipStr]
                );
                if (pegRes && pegRes.length > 0 && pegRes[0].nama) {
                  const pItem = pegRes[0];
                  const gDepan = pItem.gelardepan ? `${pItem.gelardepan.trim()} ` : '';
                  const gBelakang = pItem.gelarakhir || pItem.gelar ? `, ${pItem.gelarakhir || pItem.gelar}` : '';
                  waliKelas.nama = `${gDepan}${pItem.nama.trim()}${gBelakang}`.toUpperCase();
                  if (pItem.nip) waliKelas.nip = String(pItem.nip).trim();
                  break;
                }
              } catch (_) {}
            }
          }
        }
      } catch (errWali) {
        console.warn('Wali kelas note:', errWali.message);
      }

      // -----------------------------------------------------------------------
      // 8. Ambil Data Kepala Sekolah Secara Dinamis (Bebas Hardcode)
      // -----------------------------------------------------------------------
      let kepalaSekolah = {
        nama: "SITI MUNIROH, S.Pd.I., M.M",
        nip: "-"
      };

      try {
        const [kepsekRes] = await fastify.mysql.akad.query(`
          SELECT * FROM jbsakad.pegawai 
          WHERE jabatan LIKE '%Kepala Sekolah%' 
             OR jabatan LIKE '%Kepala SD%' 
             OR jabatan LIKE '%Kepala%' 
          ORDER BY replid ASC LIMIT 1
        `);

        if (kepsekRes && kepsekRes.length > 0) {
          const item = kepsekRes[0];
          const gDepan = item.gelardepan ? `${item.gelardepan.trim()} ` : '';
          const gBelakang = item.gelarakhir || item.gelar ? `, ${item.gelarakhir || item.gelar}` : '';
          kepalaSekolah.nama = `${gDepan}${item.nama.trim()}${gBelakang}`.toUpperCase();
          if (item.nip) kepalaSekolah.nip = String(item.nip).trim();
        }
      } catch (eKepsek) {
        console.warn('Kepala sekolah note:', eKepsek.message);
      }

      if (request.query.kepsek) {
        kepalaSekolah.nama = String(request.query.kepsek).trim().toUpperCase();
      }

      // -----------------------------------------------------------------------
      // 9. Tanggal & Lokasi Tanda Tangan Dinamis
      // -----------------------------------------------------------------------
      const kotaClean = sekolah.kota 
        ? sekolah.kota.replace(/kota\s+/i, '').replace(/kabupaten\s+/i, '').trim()
        : 'Jakarta';
      
      const tanggalCetakTeks = request.query.tanggal 
        ? String(request.query.tanggal).trim() 
        : `${kotaClean}, ${formatTanggalIndonesia()}`;

      // -----------------------------------------------------------------------
      // 10. Kalkulasi Total & Rata-rata Nilai
      // -----------------------------------------------------------------------
      let totalNilai = 0;
      raporResult.forEach(r => {
        totalNilai += Number(r.nilaiakhir || 0);
      });
      const rataRata = raporResult.length > 0 ? (totalNilai / raporResult.length) : 0;

      let kualifikasiNilai = 'D (PERLU BIMBINGAN)';
      if (rataRata >= 89) kualifikasiNilai = 'A (SANGAT BAIK)';
      else if (rataRata >= 77) kualifikasiNilai = 'B (BAIK)';
      else if (rataRata >= 65) kualifikasiNilai = 'C (CUKUP)';

      // Judul Kop Rapor
      const judulKop = isPTS 
        ? `RAPOR PENILAIAN TENGAH SEMESTER (${semesterNama.toUpperCase()})` 
        : (isSemesterGenap ? 'RAPOR PENILAIAN SUMATIF AKHIR SEMESTER II' : 'RAPOR PENILAIAN AKHIR SEMESTER I (GANJIL)');
      
      const subJudulKop = isPTS ? 'LAPORAN HASIL BELAJAR SISIPAN' : 'TERPADU';

      // -----------------------------------------------------------------------
      // 11. GENERATE HTML CETAK (Clean, Responsive, Standar Ukuran Folio / F4)
      // -----------------------------------------------------------------------
      const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>E-Rapor ${modeLabel} - ${siswa.nama} (${siswa.kelas})</title>
    <style>
        @page { 
            size: 8.5in 13in; /* Standar Ukuran Folio / F4 */
            margin: 0; 
        }
        @media print {
            .no-print {
                display: none !important;
            }
            body {
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
        body { 
            font-family: Arial, sans-serif; 
            color: #000000; 
            background-color: #f1f5f9; 
            margin: 0; 
            padding: 0; 
            font-size: 11px;
            line-height: 1.35;
        }
        .print-container {
            padding: 0.35in 0.45in;
            box-sizing: border-box;
            width: 100%;
            max-width: 8.5in;
            margin: 0 auto;
            background: #ffffff;
        }
        .outer-border {
            border: 3px solid ${isPTS ? '#d97706' : '#4a6b53'}; 
            padding: 16px; 
            box-sizing: border-box; 
            min-height: 285mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .kop { 
            text-align: center; 
            border-bottom: 2px solid #000000; 
            padding-bottom: 6px; 
            margin-bottom: 12px; 
        }
        .kop h1 { 
            margin: 0; 
            font-size: 13.5px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
        }
        .kop h2 { 
            margin: 2px 0 0 0; 
            font-size: 11px; 
            font-weight: bold; 
            text-transform: uppercase; 
            color: ${isPTS ? '#b45309' : '#1a4d2e'};
        }
        .kop h3 { 
            margin: 2px 0 0 0; 
            font-size: 12px; 
            font-weight: bold; 
            text-transform: uppercase; 
            color: #1a4d2e;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            border-bottom: 1px solid #000000;
            padding-bottom: 6px;
            margin-bottom: 12px;
            font-size: 10.5px;
        }
        .info-col p {
            margin: 3px 0;
            display: flex;
        }
        .info-col .label {
            width: 115px;
            font-weight: normal;
            flex-shrink: 0;
        }
        .info-col .divider {
            width: 15px;
            flex-shrink: 0;
        }
        .info-col .val {
            font-weight: bold;
        }
        .table-rapor { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 10px; 
            font-size: 10px;
        }
        .table-rapor th { 
            border: 1.5px solid #000000; 
            padding: 6px 4px; 
            background-color: #f8fafc;
            font-weight: bold;
            text-align: center;
            font-size: 9px;
        }
        .table-rapor td { 
            border: 1px solid #000000; 
            padding: 5px 6px; 
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .font-extrabold { font-weight: 800; }
        
        .catatan-box {
            border: 1.5px solid #000000;
            padding: 6px 10px;
            margin-top: 6px;
            font-size: 10px;
        }
        .promotion-status {
            margin-top: 6px;
            font-weight: bold;
            font-size: 10px;
            padding: 4px 8px;
            background: #f8fafc;
            border: 1px dashed #94a3b8;
        }
        .double-charts {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 8px;
        }
        .chart-half {
            width: 48%;
        }
        .chart-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
        }
        .chart-table th {
            border: 1px solid #000000;
            padding: 4px;
            background-color: ${isPTS ? '#d97706' : '#4a6b53'};
            color: #ffffff;
            font-weight: bold;
        }
        .chart-table td {
            border: 1px solid #000000;
            padding: 4px;
            font-weight: bold;
            text-align: center;
        }
        .keterangan-box {
            width: 48%;
            border: 1.5px solid ${isPTS ? '#d97706' : '#4a6b53'};
            border-radius: 6px;
            padding: 6px 10px;
            background-color: #ffffff;
            font-size: 8.5px;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            box-sizing: border-box;
        }
        .keterangan-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 2px;
            margin-bottom: 2px;
        }
        .keterangan-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
            margin-bottom: 0;
        }
        .signatures {
            margin-top: 14px;
            font-size: 10px;
            border-top: 1px dashed #cccccc;
            padding-top: 8px;
        }
        .sig-row {
            display: flex;
            justify-content: space-between;
        }
        .sig-col {
            text-align: center;
            width: 210px;
        }
        .sig-name {
            font-weight: 800;
            text-decoration: underline;
            text-transform: uppercase;
            margin-top: 35px;
        }
        .sig-kepsek {
            text-align: center;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <!-- Floating Action Bar / Menu Utama (Hanya terlihat di layar monitor/HP) -->
    <div class="no-print" style="position: sticky; top: 0; left: 0; right: 0; background: #0f172a; color: #ffffff; padding: 10px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99999; display: flex; align-items: center; justify-content: space-between; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: ${isPTS ? '#f59e0b' : '#10b981'}; width: 10px; height: 10px; border-radius: 50%;"></span>
            <div>
                <span style="font-size: 13px; font-weight: 700; color: #f8fafc;">
                    E-Rapor ${isPTS ? 'Tengah Semester (PTS)' : 'Akhir Semester (PAS)'} - Mode Cetak Folio (F4)
                </span>
                <span style="display: block; font-size: 10.5px; color: #94a3b8;">
                    ${siswa.nama} • Kelas ${siswa.kelas} • TA ${siswa.tahunajaran}
                </span>
            </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
            <button onclick="window.print()" style="background: ${isPTS ? '#d97706' : '#10b981'}; color: #ffffff; border: none; padding: 7px 16px; border-radius: 6px; font-size: 11.5px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                🖨️ Cetak / Simpan PDF
            </button>
            <button onclick="window.close()" style="background: #334155; color: #e2e8f0; border: none; padding: 7px 12px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer;">
                ✕ Tutup
            </button>
        </div>
    </div>

    <div class="print-container">
      <div class="outer-border">
        <div>
            <!-- Kop Instansi Pendidikan Dinamis -->
            <div class="kop">
                <h1>${judulKop}</h1>
                <h2>${subJudulKop}</h2>
                <h3>${sekolah.nama}</h3>
                <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">
                    ${sekolah.alamat} • ${sekolah.telepon}
                </div>
            </div>
            
            <!-- Informasi Identitas Siswa -->
            <div class="info-grid">
                <div class="info-col">
                    <p><span class="label">Nama Siswa</span><span class="divider">:</span><span class="val" style="text-transform: uppercase;">${siswa.nama}</span></p>
                    <p><span class="label">No. Induk (NIS)</span><span class="divider">:</span><span class="val">${siswa.nis}</span></p>
                    <p><span class="label">NISN</span><span class="divider">:</span><span class="val">${siswa.nisn}</span></p>
                </div>
                <div class="info-col">
                    <p><span class="label">Kelas</span><span class="divider">:</span><span class="val">Kelas ${siswa.kelas}</span></p>
                    <p><span class="label">Semester</span><span class="divider">:</span><span class="val">${semesterNama} (${semesterAngka})</span></p>
                    <p><span class="label">Tahun Pelajaran</span><span class="divider">:</span><span class="val">${siswa.tahunajaran}</span></p>
                </div>
            </div>
            
            <!-- Tabel Daftar Nilai Akademik Dinamis (Disesuaikan PTS / PAS) -->
            <table class="table-rapor">
                <thead>
                    ${isPTS ? `
                    <tr>
                        <th style="width: 5%;">NO</th>
                        <th style="width: 33%; text-align: left;">MATA PELAJARAN</th>
                        <th style="width: 8%;">KKM</th>
                        <th style="width: 12%;">NILAI HARIAN (PH)</th>
                        <th style="width: 12%;">TES PTS</th>
                        <th style="width: 10%;">AKHIR PTS</th>
                        <th style="width: 10%;">PREDIKAT</th>
                    </tr>
                    ` : `
                    <tr>
                        <th style="width: 5%;">NO</th>
                        <th style="width: 35%; text-align: left;">MATA PELAJARAN</th>
                        <th style="width: 10%;">KKM</th>
                        <th style="width: 12%;">NILAI ANGKA</th>
                        <th style="width: 28%; text-align: left;">NILAI HURUF</th>
                        <th style="width: 10%;">PREDIKAT</th>
                    </tr>
                    `}
                </thead>
                <tbody>
                    ${raporResult.map((r, i) => {
                      if (isPTS) {
                        return `
                        <tr>
                            <td class="text-center">${i + 1}</td>
                            <td class="font-extrabold">${r.mapel}</td>
                            <td class="text-center">${r.kkm || 75}</td>
                            <td class="text-center font-bold">${r.nilai_ph !== undefined ? r.nilai_ph : '-'}</td>
                            <td class="text-center font-bold">${r.nilai_pts !== undefined ? r.nilai_pts : '-'}</td>
                            <td class="text-center font-extrabold" style="color: #b45309;">${r.nilaiakhir}</td>
                            <td class="text-center font-bold">${r.predikat || 'B'}</td>
                        </tr>
                        `;
                      } else {
                        return `
                        <tr>
                            <td class="text-center">${i + 1}</td>
                            <td class="font-extrabold">${r.mapel}</td>
                            <td class="text-center">${r.kkm || 75}</td>
                            <td class="text-center font-extrabold">${r.nilaiakhir}</td>
                            <td class="text-left" style="text-transform: capitalize;">${r.nilaihuruf || numberToWords(r.nilaiakhir)}</td>
                            <td class="text-center font-bold">${r.predikat || 'B'}</td>
                        </tr>
                        `;
                      }
                    }).join('')}
                    ${raporResult.length === 0 ? `
                        <tr>
                            <td colspan="${isPTS ? '7' : '6'}" class="text-center" style="padding: 18px; color: #64748b; font-style: italic;">
                                Belum ada input data nilai ${modeLabel} untuk siswa ini di Tahun Ajaran ${siswa.tahunajaran}.
                            </td>
                        </tr>
                    ` : ''}
                    <tr class="font-bold">
                        <td colspan="3" style="font-size: 9px; text-transform: uppercase;">JUMLAH NILAI</td>
                        <td class="text-center font-extrabold">${totalNilai}</td>
                        <td colspan="${isPTS ? '3' : '2'}"></td>
                    </tr>
                    <tr class="font-bold">
                        <td colspan="3" style="font-size: 9px; text-transform: uppercase;">RATA-RATA</td>
                        <td class="text-center font-extrabold">${rataRata.toFixed(2)}</td>
                        <td colspan="${isPTS ? '3' : '2'}"></td>
                    </tr>
                    <tr class="font-bold">
                        <td colspan="3" style="font-size: 9px; text-transform: uppercase;">KUALIFIKASI PRESTASI</td>
                        <td colspan="${isPTS ? '4' : '3'}" class="text-center font-black" style="color: ${isPTS ? '#b45309' : '#4a6b53'}; font-size: 10.5px;">
                            ${kualifikasiNilai}
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Catatan Wali Kelas Dinamis -->
            <div class="catatan-box">
                <div class="font-bold">Catatan Wali Kelas :</div>
                <div style="font-style: italic; margin-top: 3px; font-weight: bold; color: #334155;">
                    "${kepribadian.catatan}"
                </div>
            </div>

            <!-- Status Kenaikan Kelas (Hanya tampil pada PAS Semester Genap, TIDAK TAMPIL di PTS atau Semester Ganjil) -->
            ${(!isPTS && isSemesterGenap) ? `
            <div class="promotion-status">
                Keterangan Akhir Tahun : Naik ke Kelas / <span style="text-decoration: line-through;">Tinggal di Kelas</span> ........................
            </div>
            ` : ''}

            <!-- Tabel Kehadiran, Kepribadian, & Legenda Nilai -->
            <div class="double-charts">
                <div class="chart-half" style="display: flex; flex-direction: column; gap: 8px;">
                    <div>
                        <div class="font-bold" style="margin-bottom: 2px;">Ketidakhadiran :</div>
                        <table class="chart-table">
                            <thead>
                                <tr>
                                    <th>Sakit</th>
                                    <th>Izin</th>
                                    <th>Tanpa Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${kehadiran.sakit} hari</td>
                                    <td>${kehadiran.izin} hari</td>
                                    <td>${kehadiran.alpa} hari</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    ${!isPTS ? `
                    <div>
                        <div class="font-bold" style="margin-bottom: 2px;">Sikap & Kepribadian :</div>
                        <table class="chart-table">
                            <thead>
                                <tr>
                                    <th>Ibadah</th>
                                    <th>Akhlak</th>
                                    <th>Kedisiplinan</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${kepribadian.ibadah}</td>
                                    <td>${kepribadian.akhlak}</td>
                                    <td>${kepribadian.disiplin}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    ` : `
                    <div style="font-size: 9px; color: #64748b; font-style: italic; border: 1px dashed #cbd5e1; padding: 4px 6px; border-radius: 4px;">
                        * Laporan PTS merupakan evaluasi progres capaian 3 bulan pertama. Seluruh kompetensi akan dituntaskan pada akhir semester.
                    </div>
                    `}
                </div>

                <div class="keterangan-box">
                    <div class="text-center font-bold" style="color: ${isPTS ? '#b45309' : '#4a6b53'}; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 3px; text-transform: uppercase;">
                        RENTANG NILAI & PREDIKAT
                    </div>
                    <div class="keterangan-row">
                        <span>89 – 100</span> <span class="font-bold">= A (Sangat Baik)</span>
                    </div>
                    <div class="keterangan-row">
                        <span>77 – 88</span> <span class="font-bold">= B (Baik)</span>
                    </div>
                    <div class="keterangan-row">
                        <span>65 – 76</span> <span class="font-bold">= C (Cukup)</span>
                    </div>
                    <div class="keterangan-row">
                        <span>&le; 64</span> <span class="font-bold">= D (Perlu Bimbingan)</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bagian Tanda Tangan Pengesahan Dinamis (Bebas Hardcode) -->
        <div class="signatures">
            <div class="sig-row">
                <div class="sig-col">
                    <p>Mengetahui,</p>
                    <p class="font-bold">Orang Tua / Wali Murid</p>
                    <p style="margin-top: 40px; font-weight: bold;">.......................................................</p>
                </div>
                <div class="sig-col">
                    <p>${tanggalCetakTeks}</p>
                    <p class="font-bold">Guru Kelas / Wali Kelas ${siswa.kelas}</p>
                    <p class="sig-name">${waliKelas.nama}</p>
                    <div style="font-size: 9px; color: #475569; margin-top: 1px;">
                        ${waliKelas.nip && waliKelas.nip !== '-' ? `NIP. ${waliKelas.nip}` : ''}
                    </div>
                </div>
            </div>
            <div class="sig-kepsek">
                <p class="font-bold" style="margin-bottom: 2px;">Mengetahui,</p>
                <p class="font-bold">Kepala ${sekolah.nama}</p>
                <p class="sig-name" style="margin-top: 35px;">${kepalaSekolah.nama}</p>
                <div style="font-size: 9px; color: #475569; margin-top: 1px;">
                    ${kepalaSekolah.nip && kepalaSekolah.nip !== '-' ? `NIP. ${kepalaSekolah.nip}` : ''}
                </div>
            </div>
        </div>
      </div>
    </div>
      
    <script>
      // Otomatis memicu dialog cetak printer / save PDF begitu halaman selesai dimuat
      window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
              window.print();
          }, 450);
      });
    </script>
</body>
</html>`;

      return reply.type('text/html').send(html);
    } catch (error) {
      console.error('Fatal print error:', error);
      return reply.code(500).send({ status: 'error', pesan: error.message });
    }
  };

  // ---------------------------------------------------------------------------
  // DAFTARKAN RUTE CETAK CEPAT (Dukung Berbagai Variasi Pemanggilan & Prefix)
  // ---------------------------------------------------------------------------
  
  // 1. Rute Standar Terpadu (PAS, atau kirim ?jenis=PTS untuk PTS)
  fastify.get('/print/terpadu/:nis', printHandler);
  fastify.get('/api/rapor/print/terpadu/:nis', printHandler);

  // 2. Rute Khusus PTS Langsung
  fastify.get('/print/pts/:nis', async (req, reply) => {
    req.params.jenis = 'PTS';
    return printHandler(req, reply);
  });
  fastify.get('/api/rapor/print/pts/:nis', async (req, reply) => {
    req.params.jenis = 'PTS';
    return printHandler(req, reply);
  });

  // 3. Rute Khusus PAS Langsung
  fastify.get('/print/pas/:nis', async (req, reply) => {
    req.params.jenis = 'PAS';
    return printHandler(req, reply);
  });
  fastify.get('/api/rapor/print/pas/:nis', async (req, reply) => {
    req.params.jenis = 'PAS';
    return printHandler(req, reply);
  });

  // 4. Rute Parameter Dinamis: /print/:jenis/:nis (contoh: /print/pts/10291)
  fastify.get('/print/:jenis/:nis', printHandler);
  fastify.get('/api/rapor/print/:jenis/:nis', printHandler);

  next();
};
