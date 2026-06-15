// fastify-print-route.js
// Template endpoint Fastify untuk cetak PDF E-Rapor Terpadu
// Format HTML & CSS disesuaikan persis seperti tampilan cetak (print-only) di aplikasi React.

module.exports = function (fastify, opts, next) {
  fastify.get('/print/terpadu/:nis', async (request, reply) => {
    const { nis } = request.params;

    // Tambahkan mode debug instan untuk mendiagnosis kolom DB JBS yang sebenarnya
    if (request.query.debug) {
      try {
        const [siswaRow] = await fastify.mysql.akad.query(
          `SELECT * FROM jbsakad.siswa WHERE nis = ? LIMIT 1`,
          [nis]
        );
        let idkelas = null;
        if (siswaRow && siswaRow.length > 0) {
          idkelas = siswaRow[0].idkelas;
        }

        const [kelasCols] = await fastify.mysql.akad.query(`SHOW COLUMNS FROM jbsakad.kelas`);
        
        let kelasData = null;
        if (idkelas) {
          const [kelasRow] = await fastify.mysql.akad.query(
            `SELECT * FROM jbsakad.kelas WHERE replid = ? LIMIT 1`,
            [idkelas]
          );
          kelasData = kelasRow;
        } else {
          const [kelasRow] = await fastify.mysql.akad.query(
            `SELECT * FROM jbsakad.kelas LIMIT 3`
          );
          kelasData = kelasRow;
        }

        return reply.send({
          status: 'debug_info',
          nis,
          siswaRow,
          idkelas,
          jbsakad_kelas_columns: kelasCols,
          kelas_data_row: kelasData
        });
      } catch (err) {
        return reply.send({
          status: 'debug_error',
          pesan: err.message,
          stack: err.stack
        });
      }
    }

    try {
      // 1. Ambil data Siswa dengan relasi Kelas untuk mendapatkan kode kelas
      let siswa = { nama: '', nis: '', nisn: '', kelas: '-', tahunajaran: '2025/2026' };
      
      const [siswaResult] = await fastify.mysql.akad.query(
          `SELECT s.nama, s.nis, s.nisn, k.kelas 
           FROM jbsakad.siswa s 
           LEFT JOIN jbsakad.kelas k ON s.idkelas = k.replid 
           WHERE s.nis = ?`, 
          [nis]
      );

      if (!siswaResult || siswaResult.length === 0) {
          return reply.code(404).send({ status: 'error', pesan: 'Data siswa ora ketemu!' });
      }

      siswa.nama = siswaResult[0].nama;
      siswa.nis = siswaResult[0].nis;
      siswa.nisn = siswaResult[0].nisn;
      siswa.kelas = siswaResult[0].kelas || '-';

      // Ambil data tahun ajaran secara dinamis dan aman
      try {
          const [taResult] = await fastify.mysql.akad.query(
              `SELECT t.tahunajaran 
               FROM jbsakad.siswa s
               JOIN jbsakad.kelas k ON s.idkelas = k.replid
               JOIN jbsakad.tahunajaran t ON k.idtahunajaran = t.replid
               WHERE s.nis = ? LIMIT 1`,
              [nis]
          );
          if (taResult && taResult.length > 0 && taResult[0].tahunajaran) {
              siswa.tahunajaran = taResult[0].tahunajaran;
          }
      } catch (err) {
          console.warn('Gagal memuat tahun ajaran dari jbsakad.tahunajaran:', err.message);
      }

      // 2. Ambil data Rapor Terpadu untuk mata pelajaran
      const [raporResult] = await fastify.mysql.kurikulum.query(
          `SELECT t.*, p.nama AS mapel 
           FROM terpadu t 
           JOIN jbsakad.pelajaran p ON t.idpelajaran = p.replid 
           WHERE t.nis = ?`, 
          [nis]
      );

      // 3. Ambil data Kepribadian (Ibadah, Akhlak, Disiplin, Catatan Wali Kelas) secara aman
      let kepribadian = { ibadah: 'B', akhlak: 'B', disiplin: 'B', catatan: 'Tingkatkan terus semangat belajar dan kedisiplinanmu.' };
      try {
          const [kepResult] = await fastify.mysql.kurikulum.query(
              `SELECT ibadah, akhlak, disiplin, catatan 
               FROM kepribadian 
               WHERE nis = ? 
               ORDER BY replid DESC LIMIT 1`,
              [nis]
          );
          if (kepResult && kepResult.length > 0) {
              kepribadian = {
                  ibadah: kepResult[0].ibadah || 'B',
                  akhlak: kepResult[0].akhlak || 'B',
                  disiplin: kepResult[0].disiplin || 'B',
                  catatan: kepResult[0].catatan || 'Tingkatkan terus semangat belajar dan kedisiplinanmu.'
              };
          }
      } catch (err) {
          console.warn('Gagal memuat data kepribadian:', err.message);
      }

      // 4. Ambil data Kehadiran / Absensi (Sakit, Izin, Alpa) secara aman
      let kehadiran = { sakit: 0, izin: 0, alpa: 0 };
      try {
          const [kehResult] = await fastify.mysql.kurikulum.query(
              `SELECT sakit, izin, alpa 
               FROM kehadiran 
               WHERE nis = ? 
               ORDER BY replid DESC LIMIT 1`,
              [nis]
          );
          if (kehResult && kehResult.length > 0) {
              kehadiran = {
                  sakit: kehResult[0].sakit || 0,
                  izin: kehResult[0].izin || 0,
                  alpa: kehResult[0].alpa || 0
              };
          }
      } catch (err) {
          console.warn('Gagal memuat data kehadiran:', err.message);
      }

      // 5. Ambil data wali kelas berdasarkan kelas aktif siswa secara sangat aman & multi-schema dengan tracing detail
      let waliKelas = { nama: 'WALI KELAS', nip: '-' };
      let traceLogs = [];
      
      try {
          // A. Jelajahi database untuk menemukan skema yang tersedia
          try {
              const [schemas] = await fastify.mysql.akad.query(`SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA`);
              const schemaNames = schemas.map(s => s.SCHEMA_NAME || s.schema_name);
              traceLogs.push(`Skema DB Tersedia: ${schemaNames.join(', ')}`);
          } catch (eSchema) {
              traceLogs.push(`Gagal membaca INFORMATION_SCHEMA: ${eSchema.message}`);
          }

          let kelasRow = null;
          // Ambil kelasRow dengan join k.* yang sangat safe dari jbsakad.kelas
          try {
              const [kelasRes] = await fastify.mysql.akad.query(
                  `SELECT k.* 
                   FROM jbsakad.siswa s 
                   JOIN jbsakad.kelas k ON s.idkelas = k.replid 
                   WHERE s.nis = ? LIMIT 1`,
                  [nis]
              );
              if (kelasRes && kelasRes.length > 0) {
                  kelasRow = kelasRes[0];
                  traceLogs.push(`kelasRow ketemu via JOIN: ${JSON.stringify(kelasRow)}`);
              } else {
                  traceLogs.push(`kelasRow kosong via JOIN untuk NIS: ${nis}`);
              }
          } catch (errJoin) {
              traceLogs.push(`Gagal dengan query JOIN k.*: ${errJoin.message}`);
              // Fallback: ambil idkelas dari siswa, lalu cari kelas
              try {
                  const [siswaInfo] = await fastify.mysql.akad.query(
                      `SELECT idkelas FROM jbsakad.siswa WHERE nis = ? LIMIT 1`,
                      [nis]
                  );
                  if (siswaInfo && siswaInfo.length > 0 && siswaInfo[0].idkelas) {
                      const idKelas = siswaInfo[0].idkelas;
                      traceLogs.push(`Siswa idkelas: ${idKelas}`);
                      const [kelasResDirect] = await fastify.mysql.akad.query(
                          `SELECT * FROM jbsakad.kelas WHERE replid = ? LIMIT 1`,
                          [idKelas]
                      );
                      if (kelasResDirect && kelasResDirect.length > 0) {
                          kelasRow = kelasResDirect[0];
                          traceLogs.push(`kelasRow ketemu via Direct replid: ${JSON.stringify(kelasRow)}`);
                      } else {
                          traceLogs.push(`kelasRow kosong untuk replid: ${idKelas}`);
                      }
                  } else {
                      traceLogs.push(`Siswa info tidak ditemukan / idkelas kosong untuk NIS: ${nis}`);
                  }
              } catch (errFallback) {
                  traceLogs.push(`Gagal fallback idkelas: ${errFallback.message}`);
              }
          }

          if (kelasRow) {
              // Ambil NIP wali kelas secara multi-kolom
              const nipWali = kelasRow.nipwali || 
                              kelasRow.nipwalikelas || 
                              kelasRow.nip_walikelas || 
                              kelasRow.idwalikelas || 
                              kelasRow.idwali || 
                              kelasRow.nip_wali_kelas || 
                              kelasRow.idguru || 
                              kelasRow.guru_nip ||
                              kelasRow.wali_nip ||
                              kelasRow.nip ||
                              kelasRow.wali;
                              
              // Ambil nama wali kelas langsung jika tertulis di kolom kelasRow
              const namaWaliLangsung = kelasRow.walikelas || 
                                       kelasRow.nama_wali || 
                                       kelasRow.nama_walikelas || 
                                       kelasRow.wali || 
                                       kelasRow.nama_guru || 
                                       kelasRow.guru;
                                       
              traceLogs.push(`nipWali terdeteksi: "${nipWali}", namaWaliLangsung terdeteksi: "${namaWaliLangsung}"`);

              if (namaWaliLangsung) {
                  waliKelas.nama = String(namaWaliLangsung).trim().toUpperCase();
              }
              if (nipWali) {
                  waliKelas.nip = String(nipWali).trim();
              }
              
              if (nipWali) {
                  const nipStr = String(nipWali).trim();

                  // Cari nama pegawai/guru berdasarkan NIP pada beberapa skema DB JBS secara berurutan (jbssdm, jbsadm, jbsakad)
                  let pegawaiFound = false;
                  const targetSchemas = ['jbssdm', 'jbsadm', 'jbsakad', 'jikas_sdm', 'sdm', 'pegawai'];
                  
                  for (const schema of targetSchemas) {
                      try {
                          // Ambil * untuk menghindari error kolom gelarakhir yang tidak ada
                          let [pegRes] = await fastify.mysql.akad.query(
                              `SELECT * FROM ${schema}.pegawai WHERE nip = ? LIMIT 1`,
                              [nipStr]
                          );
                          
                          traceLogs.push(`Coba skema ${schema} dengan NIP "${nipStr}": ${pegRes ? pegRes.length : 0} baris.`);
                          
                          // Jika belum ketemu dengan nip = nipStr, coba cari dengan sql replid jika nipStr berupa angka/ID
                          if ((!pegRes || pegRes.length === 0) && /^\d+$/.test(nipStr)) {
                              [pegRes] = await fastify.mysql.akad.query(
                                  `SELECT * FROM ${schema}.pegawai WHERE replid = ? LIMIT 1`,
                                  [parseInt(nipStr, 10)]
                              );
                              traceLogs.push(`Coba skema ${schema} dengan replid "${nipStr}": ${pegRes ? pegRes.length : 0} baris.`);
                          }
                          if ((!pegRes || pegRes.length === 0) && /^\d+$/.test(nipStr)) {
                              [pegRes] = await fastify.mysql.akad.query(
                                  `SELECT * FROM ${schema}.pegawai WHERE id = ? LIMIT 1`,
                                  [parseInt(nipStr, 10)]
                              );
                              traceLogs.push(`Coba skema ${schema} dengan id "${nipStr}": ${pegRes ? pegRes.length : 0} baris.`);
                          }

                          if (pegRes && pegRes.length > 0 && pegRes[0].nama) {
                              const item = pegRes[0];
                              const gelar = item.gelarakhir || item.gelar || item.gelar_belakang || '';
                              const canGelar = gelar ? `, ${gelar}` : '';
                              waliKelas.nama = `${item.nama.trim()}${canGelar}`.toUpperCase();
                              
                              if (item.nip) {
                                  waliKelas.nip = String(item.nip).trim();
                              }
                              
                              pegawaiFound = true;
                              traceLogs.push(`Ketemu pegawai di ${schema}: ${waliKelas.nama} (NIP: ${waliKelas.nip})`);
                              break;
                          }
                      } catch (errSchema) {
                          traceLogs.push(`Gagal query skema ${schema}: ${errSchema.message}`);
                      }
                  }

                  // Jika pegawai tidak ditemukan di mana pun, mari kita coba jelajahi salah satu tabel pegawai untuk debugging dsb
                  if (!pegawaiFound) {
                      traceLogs.push(`Pegawai NIP "${nipStr}" tidak ditemukan di database dengan query standar.`);
                      // Coba Ambil data sampel pegawai jbssdm
                      try {
                          const [sampelPeg] = await fastify.mysql.akad.query(`SELECT * FROM jbssdm.pegawai LIMIT 2`);
                          traceLogs.push(`Sampel tabel jbssdm.pegawai: ${JSON.stringify(sampelPeg)}`);
                      } catch (errSampel) {
                          traceLogs.push(`Gagal mengambil sampel jbssdm.pegawai: ${errSampel.message}`);
                      }
                  }
              }
          }
      } catch (err) {
          traceLogs.push(`Sistem gagal memuat profil wali kelas secara total: ${err.message}`);
      }

      // Helper Fungsi untuk Terjemahan Nilai ke Kata Bahasa Indonesia (Nilai Huruf)
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

      // Hitung Total & Rata-rata Nilai
      let totalNilai = 0;
      raporResult.forEach(r => {
          totalNilai += Number(r.nilaiakhir || 0);
      });
      const rataRata = raporResult.length > 0 ? (totalNilai / raporResult.length) : 0;

      // Kualifikasi Nilai
      let kualifikasiNilai = 'D (PERLU BIMBINGAN)';
      if (rataRata >= 89) kualifikasiNilai = 'A (SANGAT BAIK)';
      else if (rataRata >= 77) kualifikasiNilai = 'B (BAIK)';
      else if (rataRata >= 65) kualifikasiNilai = 'C (CUKUP)';

      const s = {
          nama: "SD ISLAM HIDAYATUL ISLAMIYAH",
          alamat: "Jl. Sapi Perah Rt 003/02, PONDOK RANGGON",
          kontak: "Telp: 8440279"
      };

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>E-Rapor Terpadu - ${siswa.nama}</title>
    <style>
        @page { 
            size: 8.5in 13in; 
            margin: 0; 
        }
        @media print {
            .no-print {
                display: none !important;
            }
        }
        body { 
            font-family: Arial, sans-serif; 
            color: #000000; 
            background-color: #ffffff; 
            margin: 0; 
            padding: 0; 
            font-size: 11px;
            line-height: 1.35;
        }
        .print-container {
            padding: 0.4in 0.5in;
            box-sizing: border-box;
            width: 100%;
        }
        .outer-border {
            border: 3px solid #4a6b53; 
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
            width: 110px;
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
            font-size: 9.5px;
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
            background-color: #4a6b53;
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
            border: 1.5px solid #4a6b53;
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
            font-size: 10.5px;
            border-top: 1px dashed #cccccc;
            padding-top: 8px;
        }
        .sig-row {
            display: flex;
            justify-content: space-between;
        }
        .sig-col {
            text-align: center;
            width: 200px;
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
    <!-- Floating Action Bar / Menu Utama (Hanya terlihat di layar komputer/HP, otomatis tersembunyi saat diprint/save PDF) -->
    <div class="no-print" style="position: sticky; top: 0; left: 0; right: 0; background: #0f172a; color: #ffffff; padding: 10px 20px; box-shadow: 0 4px 12px rbg(0 0 0 / 0.15); z-index: 99999; display: flex; align-items: center; justify-between: space-between; justify-content: space-between; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #10b981; width: 8px; height: 8px; border-radius: 50%; animate: pulse 2s infinite;"></span>
            <span style="font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px; color: #f8fafc;">E-Rapor Terpadu - Mode Cetak & PDF</span>
        </div>
        <div style="display: flex; gap: 10px;">
            <button onclick="window.print()" style="background: #10b981; color: #ffffff; border: none; padding: 6px 14px; border-radius: 5px; font-size: 11.5px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2); transition: all 0.2s;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect><path d="M6 9V2h12v7"></path></svg>
                Cetak Rapor / Simpan PDF
            </button>
            <button onclick="window.close()" style="background: #334155; color: #e2e8f0; border: none; padding: 6px 12px; border-radius: 5px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
                Tutup Halaman
            </button>
        </div>
    </div>

    <div class="print-container">
      <div class="outer-border">
    <div>
        <!-- Kop Instansi Pendidikan -->
        <div class="kop">
            <h1>RAPOR PENILAIAN SUMATIF AKHIR SEMESTER II</h1>
            <h2>TERPADU</h2>
            <h3>${s.nama}</h3>
        </div>
        
        <!-- Informasi Identitas Siswa -->
        <div class="info-grid">
            <div class="info-col">
                <p><span class="label">Nama Siswa</span><span class="divider">:</span><span class="val" style="text-transform: uppercase;">${siswa.nama}</span></p>
                <p><span class="label">No. Induk (NIS)</span><span class="divider">:</span><span class="val">${siswa.nis}</span></p>
                <p><span class="label">NISN</span><span class="divider">:</span><span class="val">${siswa.nisn || '-'}</span></p>
            </div>
            <div class="info-col">
                <p><span class="label">Kelas</span><span class="divider">:</span><span class="val">${siswa.kelas || '-'}</span></p>
                <p><span class="label">Semester</span><span class="divider">:</span><span class="val">Genap</span></p>
                <p><span class="label">Tahun Pelajaran</span><span class="divider">:</span><span class="val">${siswa.tahunajaran || '2025/2026'}</span></p>
            </div>
        </div>
        
        <!-- Tabel Daftar Nilai Akademik -->
        <table class="table-rapor">
            <thead>
                <tr>
                    <th style="width: 5%;">NO</th>
                    <th style="width: 35%; text-align: left;">MATA PELAJARAN</th>
                    <th style="width: 10%;">KKM</th>
                    <th style="width: 12%;">NILAI ANGKA</th>
                    <th style="width: 28%; text-align: left;">NILAI HURUF</th>
                    <th style="width: 10%;">PREDIKAT</th>
                </tr>
            </thead>
            <tbody>
                ${raporResult.map((r, i) => `
                    <tr>
                        <td class="text-center">${i + 1}</td>
                        <td class="font-extrabold">${r.mapel}</td>
                        <td class="text-center">${r.kkm || 70}</td>
                        <td class="text-center font-extrabold">${r.nilaiakhir}</td>
                        <td class="text-left" style="text-transform: capitalize;">${r.nilaihuruf || numberToWords(r.nilaiakhir)}</td>
                        <td class="text-center font-bold">${r.predikat || 'B'}</td>
                    </tr>
                `).join('')}
                ${raporResult.length === 0 ? `
                    <tr>
                        <td colspan="6" class="text-center" style="padding: 15px; color: #64748b; font-style: italic;">
                            Belum ada nilai akademik terdata untuk siswa ini.
                        </td>
                    </tr>
                ` : ''}
                <tr class="font-bold">
                    <td colspan="3" style="font-size: 9px; text-transform: uppercase;">JUMLAH</td>
                    <td class="text-center font-extrabold">${totalNilai}</td>
                    <td colspan="2"></td>
                </tr>
                <tr class="font-bold">
                    <td colspan="3" style="font-size: 9px; text-transform: uppercase;">RATA-RATA</td>
                    <td class="text-center font-extrabold">${rataRata.toFixed(2)}</td>
                    <td colspan="2"></td>
                </tr>
                <tr class="font-bold">
                    <td colspan="3" style="font-size: 9px; text-transform: uppercase;">KUALIFIKASI NILAI</td>
                    <td colspan="3" class="text-center font-black" style="color: #4a6b53;">${kualifikasiNilai}</td>
                </tr>
            </tbody>
        </table>

        <!-- Catatan Wali Kelas -->
        <div class="catatan-box">
            <div class="font-bold">Catatan :</div>
            <div style="font-style: italic; margin-top: 3px; font-weight: bold;">
                ${kepribadian.catatan}
            </div>
        </div>

        <!-- Status Kenaikan Kelas -->
        <div class="promotion-status">
            Naik kelas / <span style="text-decoration: line-through;">Tinggal kelas</span>
        </div>

        <!-- Tabel kehadiran, kepribadian, & legenda nilai -->
        <div class="double-charts">
            <div class="chart-half" style="display: flex; flex-direction: column; gap: 8px;">
                <div>
                    <div class="font-bold" style="margin-bottom: 2px;">Kehadiran :</div>
                    <table class="chart-table">
                        <thead>
                            <tr>
                                <th>Sakit</th>
                                <th>Ijin</th>
                                <th>Alpha</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${kehadiran.sakit}</td>
                                <td>${kehadiran.izin}</td>
                                <td>${kehadiran.alpa}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <div class="font-bold" style="margin-bottom: 2px;">Kepribadian :</div>
                    <table class="chart-table">
                        <thead>
                            <tr>
                                <th>Ibadah</th>
                                <th>Akhlak</th>
                                <th>Disiplin</th>
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
            </div>

            <div class="keterangan-box">
                <div class="text-center font-bold" style="color: #4a6b53; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 3px; text-transform: uppercase;">KETERANGAN</div>
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

    <!-- Bagian Tanda Tangan Pengesahan -->
    <div class="signatures">
        <div class="sig-row">
            <div class="sig-col">
                <p>Mengetahui,</p>
                <p class="font-bold">Orang Tua Wali</p>
                <p style="margin-top: 40px; font-weight: bold;">.......................................................</p>
            </div>
            <div class="sig-col">
                <p>Jakarta, 2 Juni 2026</p>
                <p class="font-bold">Guru Terpadu ${siswa.kelas || '-'}</p>
                <p class="sig-name">${waliKelas.nama}</p>
            </div>
        </div>
        <div class="sig-kepsek">
            <p class="font-bold" style="margin-bottom: 2px;">Mengetahui,</p>
            <p class="font-bold">Kepala Sekolah</p>
            <p class="sig-name" style="margin-top: 35px;">SITI MUNIROH, S.Pd.I., M.M</p>
        </div>
    </div>
  </div>
</div>
  
  <script>
    // Otomatis memicu dialog cetak/PDF setelah seluruh halaman termuat sempurna (dengan jeda singkat)
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.print();
        }, 500);
    });
  </script>
</body>
</html>`;

      return reply.type('text/html').send(html);
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ status: 'error', pesan: error.message });
    }
  });

  next();
};
