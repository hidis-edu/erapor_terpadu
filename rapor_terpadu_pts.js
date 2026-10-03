// =============================================================================
// FILE: route/rapor_terpadu_pts.js
// ROUTE KHUSUS: RAPOR PENILAIAN TENGAH SEMESTER (PTS)
// Arsitektur Terpisah & Aman: Auto-Generate Tabel PTS & Rekap Tanpa Menimpa Nilai Akhir (PAS)
// =============================================================================

module.exports = async function (fastify, opts) {

  // ---------------------------------------------------------------------------
  // 0. AUTO-BOOTSTRAP SCHEMA SQL UNTUK PTS (Aman & Otomatis)
  // ---------------------------------------------------------------------------
  try {
    // 1. Tabel Nilai Per Mata Pelajaran PTS
    await fastify.mysql.kurikulum.query(`
      CREATE TABLE IF NOT EXISTS kurikulum.pts (
        replid INT AUTO_INCREMENT PRIMARY KEY,
        nis VARCHAR(25) NOT NULL,
        idpelajaran INT NOT NULL,
        nipguru VARCHAR(30) DEFAULT '',
        tahunajaran VARCHAR(20) NOT NULL DEFAULT '2025/2026',
        kkm INT DEFAULT 75,
        nilai_ph DECIMAL(5,2) DEFAULT 0.00,
        nilai_pts DECIMAL(5,2) DEFAULT 0.00,
        nilaiakhir DECIMAL(5,2) DEFAULT 0.00,
        nilaihuruf VARCHAR(5) DEFAULT '',
        predikat VARCHAR(5) DEFAULT '',
        catatanguru TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pts_siswa_mapel (nis, idpelajaran, tahunajaran)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Tabel Rekap Akumulasi Rapor PTS (Rata-rata, Jumlah Mapel, Catatan Wali Kelas & Absen)
    await fastify.mysql.kurikulum.query(`
      CREATE TABLE IF NOT EXISTS kurikulum.rekappts (
        replid INT AUTO_INCREMENT PRIMARY KEY,
        nis VARCHAR(25) NOT NULL,
        idsemester INT NOT NULL DEFAULT 34,
        tahunajaran VARCHAR(20) NOT NULL DEFAULT '2025/2026',
        jumlah_mapel INT DEFAULT 0,
        total_nilai DECIMAL(8,2) DEFAULT 0.00,
        rata_rata DECIMAL(5,2) DEFAULT 0.00,
        sakit INT DEFAULT 0,
        izin INT DEFAULT 0,
        alpa INT DEFAULT 0,
        catatan_walikelas TEXT,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_rekappts_siswa (nis, idsemester, tahunajaran)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    fastify.log.info('✅ Tabel kurikulum.pts dan kurikulum.rekappts siap digunakan.');
  } catch (bootErr) {
    fastify.log.warn('Notice tabel PTS:', bootErr.message);
  }

  // Helper kalkulasi Predikat berdasarkan Nilai & KKM
  function hitungPredikat(nilai, kkm = 75) {
    const n = Number(nilai);
    const k = Number(kkm);
    if (n >= 90) return 'A';
    if (n >= 80) return 'B';
    if (n >= k) return 'C';
    return 'D';
  }

  // Helper resolve Tahun Ajaran Siswa jika tidak dikirim client
  async function resolveTahunAjaran(nis, defaultTa = '2025/2026') {
    if (!nis) return defaultTa;
    try {
      const [rows] = await fastify.mysql.akad.query(
        `SELECT t.tahunajaran 
         FROM jbsakad.siswa s
         JOIN jbsakad.kelas k ON s.idkelas = k.replid
         JOIN jbsakad.tahunajaran t ON k.idtahunajaran = t.replid
         WHERE s.nis = ? LIMIT 1`,
        [nis]
      );
      if (rows && rows.length > 0 && rows[0].tahunajaran) {
        return rows[0].tahunajaran;
      }
    } catch (e) {
      fastify.log.warn(`Gagal resolve tahun ajaran siswa ${nis}: ${e.message}`);
    }
    return defaultTa;
  }

  // ===========================================================================
  // 1. CRUD NILAI PTS (kurikulum.pts)
  // ===========================================================================

  // --- GET /pts: Tampilkan data nilai PTS (bisa difilter NIS, Tahun Ajaran, Pelajaran, Kelas) ---
  fastify.get('/pts', { schema: { tags: ['Penilaian Rapor PTS'], summary: 'Tampilkan nilai PTS' } }, async (request, reply) => {
    try {
      const { nis, tahunajaran, idpelajaran, idkelas } = request.query;

      let sql = `
        SELECT 
          p.*,
          s.nama AS nama_siswa,
          s.idkelas,
          k.kelas,
          pel.nama AS nama_mapel,
          pel.kode AS kode_mapel
        FROM kurikulum.pts p
        LEFT JOIN jbsakad.siswa s ON p.nis = s.nis
        LEFT JOIN jbsakad.kelas k ON s.idkelas = k.replid
        LEFT JOIN jbsakad.pelajaran pel ON p.idpelajaran = pel.replid
        WHERE 1=1
      `;
      const params = [];

      if (nis) {
        sql += ' AND p.nis = ?';
        params.push(nis);
      }
      if (tahunajaran) {
        sql += ' AND (p.tahunajaran = ? OR p.tahunajaran IS NULL OR p.tahunajaran = "")';
        params.push(tahunajaran);
      }
      if (idpelajaran) {
        sql += ' AND p.idpelajaran = ?';
        params.push(idpelajaran);
      }
      if (idkelas) {
        sql += ' AND s.idkelas = ?';
        params.push(idkelas);
      }

      sql += ' ORDER BY p.nis ASC, pel.replid ASC';

      const [rows] = await fastify.mysql.kurikulum.query(sql, params);
      return { status: 'sukses', total: rows.length, data: rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

  // --- POST /pts: Simpan atau Update Nilai PTS 1 Siswa (UPSERT) ---
  // Rumus Standar: Nilai Akhir PTS = ( (2 * Rata2 PH) + Nilai Ujian PTS ) / 3
  fastify.post('/pts', { schema: { tags: ['Penilaian Rapor PTS'] } }, async (request, reply) => {
    try {
      const {
        nis,
        idpelajaran,
        nipguru = '',
        kkm = 75,
        nilai_ph = 0,
        nilai_pts = 0,
        nilaiakhir,
        nilaihuruf = '',
        predikat,
        catatanguru = '',
        tahunajaran
      } = request.body;

      if (!nis || !idpelajaran) {
        return reply.code(400).send({ status: 'gagal', pesan: 'NIS dan idpelajaran wajib diisi!' });
      }

      const targetTa = tahunajaran || await resolveTahunAjaran(nis, '2025/2026');

      // Kalkulasi nilai akhir jika tidak dikirim langsung dari client
      const phVal = Number(nilai_ph || 0);
      const ptsVal = Number(nilai_pts || 0);
      let akhirFinal = nilaiakhir !== undefined 
        ? Math.round(Number(nilaiakhir)) 
        : Math.round(((phVal * 2) + ptsVal) / 3);

      const kkmVal = Math.round(Number(kkm || 75));
      const predikatFinal = predikat || hitungPredikat(akhirFinal, kkmVal);

      const queryUpsert = `
        INSERT INTO kurikulum.pts 
          (nis, idpelajaran, nipguru, tahunajaran, kkm, nilai_ph, nilai_pts, nilaiakhir, nilaihuruf, predikat, catatanguru)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nipguru     = VALUES(nipguru),
          kkm         = VALUES(kkm),
          nilai_ph    = VALUES(nilai_ph),
          nilai_pts   = VALUES(nilai_pts),
          nilaiakhir  = VALUES(nilaiakhir),
          nilaihuruf  = VALUES(nilaihuruf),
          predikat    = VALUES(predikat),
          catatanguru = VALUES(catatanguru),
          updated_at  = NOW()
      `;

      const [result] = await fastify.mysql.kurikulum.query(queryUpsert, [
        nis,
        idpelajaran,
        nipguru,
        targetTa,
        kkmVal,
        phVal,
        ptsVal,
        akhirFinal,
        nilaihuruf,
        predikatFinal,
        catatanguru
      ]);

      return {
        status: 'sukses',
        pesan: 'Data nilai PTS kasil disimpen',
        replid: result.insertId || undefined,
        data: {
          nis,
          idpelajaran,
          tahunajaran: targetTa,
          nilai_ph: phVal,
          nilai_pts: ptsVal,
          nilaiakhir: akhirFinal,
          predikat: predikatFinal
        }
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

  // --- POST /pts/bulk: Input Nilai PTS Massal 1 Kelas Sekaligus ---
  fastify.post('/pts/bulk', async (request, reply) => {
    try {
      const { idpelajaran, nipguru = '', kkm = 75, tahunajaran = '2025/2026', items = [] } = request.body;

      if (!idpelajaran || !Array.isArray(items) || items.length === 0) {
        return reply.code(400).send({ status: 'gagal', pesan: 'Data input massal tidak valid!' });
      }

      let successCount = 0;

      for (const item of items) {
        const { nis, nilai_ph = 0, nilai_pts = 0, catatanguru = '' } = item;
        if (!nis) continue;

        const phVal = Number(nilai_ph || 0);
        const ptsVal = Number(nilai_pts || 0);
        const akhirFinal = Math.round(((phVal * 2) + ptsVal) / 3);
        const pred = hitungPredikat(akhirFinal, kkm);

        await fastify.mysql.kurikulum.query(`
          INSERT INTO kurikulum.pts 
            (nis, idpelajaran, nipguru, tahunajaran, kkm, nilai_ph, nilai_pts, nilaiakhir, predikat, catatanguru)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nilai_ph    = VALUES(nilai_ph),
            nilai_pts   = VALUES(nilai_pts),
            nilaiakhir  = VALUES(nilaiakhir),
            predikat    = VALUES(predikat),
            catatanguru = VALUES(catatanguru),
            updated_at  = NOW()
        `, [nis, idpelajaran, nipguru, tahunajaran, kkm, phVal, ptsVal, akhirFinal, pred, catatanguru]);

        successCount++;
      }

      return {
        status: 'sukses',
        pesan: `${successCount} nilai PTS siswa berhasil disimpan massal!`,
        total_terproses: successCount
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

  // --- PUT /pts/:replid: Update Nilai PTS Spesifik ---
  fastify.put('/pts/:replid', async (request, reply) => {
    const { replid } = request.params;
    const { kkm, nilai_ph, nilai_pts, nilaiakhir, predikat, catatanguru } = request.body;

    try {
      const phVal = Number(nilai_ph || 0);
      const ptsVal = Number(nilai_pts || 0);
      const akhirFinal = nilaiakhir !== undefined ? Math.round(Number(nilaiakhir)) : Math.round(((phVal * 2) + ptsVal) / 3);
      const kkmVal = Math.round(Number(kkm || 75));
      const pred = predikat || hitungPredikat(akhirFinal, kkmVal);

      const [result] = await fastify.mysql.kurikulum.query(`
        UPDATE kurikulum.pts 
        SET kkm = ?, nilai_ph = ?, nilai_pts = ?, nilaiakhir = ?, predikat = ?, catatanguru = ?, updated_at = NOW() 
        WHERE replid = ?
      `, [kkmVal, phVal, ptsVal, akhirFinal, pred, catatanguru, replid]);

      if (result.affectedRows === 0) {
        return reply.code(404).send({ status: 'gagal', pesan: 'Data nilai PTS tidak ditemukan' });
      }

      return { status: 'sukses', pesan: 'Nilai PTS berhasil diperbarui' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

  // --- DELETE /pts/:replid: Hapus Nilai PTS Berdasarkan ReplID ---
  fastify.delete('/pts/:replid', async (request, reply) => {
    const { replid } = request.params;

    try {
      const [result] = await fastify.mysql.kurikulum.query(
        'DELETE FROM kurikulum.pts WHERE replid = ?',
        [replid]
      );

      return result.affectedRows > 0
        ? { status: 'sukses', pesan: 'Data nilai PTS berhasil dihapus' }
        : reply.code(404).send({ status: 'gagal', pesan: 'Data tidak ditemukan atau sudah terhapus' });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

  // ===========================================================================
  // 2. REKAP RAPOR PTS (kurikulum.rekappts)
  // ===========================================================================

  // --- POST /pts/rekap/generate: Hitung Agregat Rapor PTS Siswa ---
  fastify.post('/pts/rekap/generate', async (request, reply) => {
    const { nis, idsemester = 34, tahunajaran, catatan_walikelas = '' } = request.body;

    if (!nis) {
      return reply.code(400).send({ status: 'gagal', pesan: 'NIS siswa wajib diisi!' });
    }

    try {
      const targetTa = tahunajaran || await resolveTahunAjaran(nis, '2025/2026');

      // 1. Ambil agregat nilai HANYA dari tabel kurikulum.pts untuk TA ini
      const [grades] = await fastify.mysql.kurikulum.query(`
        SELECT 
          COUNT(replid) AS jumlah_mapel, 
          SUM(nilaiakhir) AS total_nilai, 
          AVG(nilaiakhir) AS rata_rata 
        FROM kurikulum.pts 
        WHERE nis = ? AND (tahunajaran = ? OR tahunajaran IS NULL OR tahunajaran = '')
      `, [nis, targetTa]);

      const rekapNilai = grades[0] || {};
      const jumlahMapel = Number(rekapNilai.jumlah_mapel || 0);
      const totalNilai = Number(rekapNilai.total_nilai || 0);
      const rataRata = rekapNilai.rata_rata ? parseFloat(rekapNilai.rata_rata).toFixed(2) : '0.00';

      if (jumlahMapel === 0) {
        return reply.code(400).send({
          status: 'gagal',
          pesan: `Belum ada input nilai PTS untuk siswa NIS ${nis} di Tahun Ajaran ${targetTa}!`
        });
      }

      // 2. Ambil akumulasi absensi siswa (Sakit, Izin, Alpa)
      let sakit = 0, izin = 0, alpa = 0;
      try {
        const [absen] = await fastify.mysql.kurikulum.query(`
          SELECT sakit, izin, alpa 
          FROM kurikulum.kehadiran 
          WHERE nis = ? AND (tahunajaran = ? OR tahunajaran IS NULL OR tahunajaran = '')
          ORDER BY updated_at DESC LIMIT 1
        `, [nis, targetTa]);

        if (absen && absen.length > 0) {
          sakit = Number(absen[0].sakit || 0);
          izin = Number(absen[0].izin || 0);
          alpa = Number(absen[0].alpa || 0);
        }
      } catch (eAbsen) {
        // Fallback absensi 0
      }

      // 3. Simpan ke kurikulum.rekappts (UPSERT)
      const queryUpsert = `
        INSERT INTO kurikulum.rekappts 
          (nis, idsemester, tahunajaran, jumlah_mapel, total_nilai, rata_rata, sakit, izin, alpa, catatan_walikelas, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          jumlah_mapel       = VALUES(jumlah_mapel),
          total_nilai        = VALUES(total_nilai),
          rata_rata          = VALUES(rata_rata),
          sakit              = VALUES(sakit),
          izin               = VALUES(izin),
          alpa               = VALUES(alpa),
          catatan_walikelas  = VALUES(catatan_walikelas),
          last_update        = NOW()
      `;

      await fastify.mysql.kurikulum.query(queryUpsert, [
        nis,
        idsemester,
        targetTa,
        jumlahMapel,
        totalNilai,
        rataRata,
        sakit,
        izin,
        alpa,
        catatan_walikelas
      ]);

      return {
        status: 'sukses',
        pesan: `Rekap Rapor PTS TA ${targetTa} kasil di-generate!`,
        data: {
          nis,
          idsemester,
          tahunajaran: targetTa,
          jumlah_mapel: jumlahMapel,
          total_nilai: totalNilai,
          rata_rata: rataRata,
          absensi: { sakit, izin, alpa },
          catatan_walikelas
        }
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

  // --- GET /pts/rekap: Tampilkan Seluruh Arsip Rekap Rapor PTS ---
  fastify.get('/pts/rekap', async (request, reply) => {
    try {
      const { tahunajaran, nis, idsemester } = request.query;

      let sql = `
        SELECT 
          r.*, 
          s.nama AS nama_siswa, 
          s.idkelas,
          k.kelas
        FROM kurikulum.rekappts r
        LEFT JOIN jbsakad.siswa s ON r.nis = s.nis
        LEFT JOIN jbsakad.kelas k ON s.idkelas = k.replid
        WHERE 1=1
      `;
      const params = [];

      if (tahunajaran) {
        sql += ' AND (r.tahunajaran = ? OR r.tahunajaran IS NULL OR r.tahunajaran = "")';
        params.push(tahunajaran);
      }
      if (nis) {
        sql += ' AND r.nis = ?';
        params.push(nis);
      }
      if (idsemester) {
        sql += ' AND r.idsemester = ?';
        params.push(idsemester);
      }

      sql += ' ORDER BY r.last_update DESC';

      const [rows] = await fastify.mysql.kurikulum.query(sql, params);
      return { status: 'sukses', total_data: rows.length, data: rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

  // --- DELETE /pts/rekap/:replid: Hapus Rekap PTS ---
  fastify.delete('/pts/rekap/:replid', async (request, reply) => {
    const { replid } = request.params;
    try {
      const [result] = await fastify.mysql.kurikulum.query(
        'DELETE FROM kurikulum.rekappts WHERE replid = ?',
        [replid]
      );
      return result.affectedRows > 0
        ? { status: 'sukses', pesan: 'Data rekap PTS berhasil dihapus' }
        : reply.code(404).send({ status: 'gagal', pesan: 'Data tidak ditemukan' });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

  // ===========================================================================
  // 3. CETAK LEMBAR RAPOR SISIPAN PTS (Single-Page Clean Format)
  // ===========================================================================

  // --- GET /pts/print/:nis: Payload Lengkap untuk Cetak Rapor PTS 1 Halaman ---
  fastify.get('/pts/print/:nis', async (request, reply) => {
    const { nis } = request.params;
    const { tahunajaran } = request.query;

    try {
      const targetTa = tahunajaran || await resolveTahunAjaran(nis, '2025/2026');

      // 1. Data Siswa & Kelas
      const [siswa] = await fastify.mysql.akad.query(`
        SELECT 
          s.nis, 
          s.nisn, 
          s.nama, 
          s.idkelas,
          k.kelas,
          p.nama AS nama_wali_kelas,
          p.nip AS nip_wali_kelas
        FROM jbsakad.siswa s
        LEFT JOIN jbsakad.kelas k ON s.idkelas = k.replid
        LEFT JOIN jbsakad.pegawai p ON k.nipguru = p.nip
        WHERE s.nis = ? LIMIT 1
      `, [nis]);

      if (!siswa || siswa.length === 0) {
        return reply.code(404).send({ status: 'gagal', pesan: 'Data siswa tidak ditemukan' });
      }

      // 2. Daftar Nilai Mata Pelajaran PTS
      const [nilai] = await fastify.mysql.kurikulum.query(`
        SELECT 
          p.replid AS id_pelajaran,
          p.kode AS kode_mapel,
          p.nama AS nama_mapel,
          pts.kkm,
          pts.nilai_ph,
          pts.nilai_pts,
          pts.nilaiakhir,
          pts.predikat,
          pts.catatanguru
        FROM kurikulum.pts pts
        JOIN jbsakad.pelajaran p ON pts.idpelajaran = p.replid
        WHERE pts.nis = ? AND (pts.tahunajaran = ? OR pts.tahunajaran IS NULL OR pts.tahunajaran = '')
        ORDER BY p.replid ASC
      `, [nis, targetTa]);

      // 3. Rekap PTS & Absensi
      const [rekap] = await fastify.mysql.kurikulum.query(`
        SELECT * FROM kurikulum.rekappts 
        WHERE nis = ? AND (tahunajaran = ? OR tahunajaran IS NULL OR tahunajaran = '')
        ORDER BY last_update DESC LIMIT 1
      `, [nis, targetTa]);

      // 4. Data Kepala Sekolah
      let kepalaSekolah = { nama: 'H. Moh. Munir, M.Pd.I', nip: '-' };
      try {
        const [kepsek] = await fastify.mysql.akad.query(`
          SELECT nama, nip FROM jbsakad.pegawai 
          WHERE jabatan LIKE '%Kepala Sekolah%' OR jabatan LIKE '%Kepala%' LIMIT 1
        `);
        if (kepsek && kepsek.length > 0) {
          kepalaSekolah = kepsek[0];
        }
      } catch (eKepsek) {}

      return {
        status: 'sukses',
        jenis_rapor: 'Laporan Penilaian Tengah Semester (PTS)',
        sekolah: {
          nama: 'SD ISLAM HIDAYATUL ISLAMIYAH',
          alamat: 'Jl. Raya Nganjuk No. 45, Jawa Timur',
          telepon: '(0358) 321890',
          npsn: '20539120'
        },
        siswa: siswa[0],
        tahunajaran: targetTa,
        semester: 'Ganjil (Tengah Semester)',
        nilai,
        rekap: rekap && rekap.length > 0 ? rekap[0] : null,
        kepala_sekolah: kepalaSekolah,
        waktu_cetak: new Date().toISOString()
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ status: 'error', pesan: err.message });
    }
  });

};
