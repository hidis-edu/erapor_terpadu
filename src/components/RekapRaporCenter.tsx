import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, HelpCircle, RefreshCw, BarChart4, GraduationCap, 
  Calendar, Search, Printer, AlertCircle, Sparkles, BookOpen, User, Trash2,
  Check, X, MessageSquare, Send, CheckCircle2
} from 'lucide-react';
import { Student, RekapRapor } from '../types';
import { sendWhatsappMessage } from '../utils/whatsapp';

interface RekapRaporCenterProps {
  students: Student[];
  activeClasses?: any[];
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function RekapRaporCenter({
  students,
  activeClasses,
  addToast
}: RekapRaporCenterProps) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedNis, setSelectedNis] = useState('');
  const [idSemester, setIdSemester] = useState<number>(34); // Default is 34 (Semester Ganjil)
  const [tahunAjaran, setTahunAjaran] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingRekaps, setIsLoadingRekaps] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [rekapsList, setRekapsList] = useState<RekapRapor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Dropdown list holders
  const [classesList, setClassesList] = useState<string[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // States for sending via WhatsApp
  const [sendingItem, setSendingItem] = useState<RekapRapor | null>(null);
  const [destinationPhone, setDestinationPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);

  const handleOpenSendWa = (item: RekapRapor) => {
    const student = students.find(s => String(s.nis) === String(item.nis));
    setSendingItem(item);
    setDestinationPhone(student?.hportu || '');
    
    const studentName = student ? student.nama : item.nama_siswa || 'Siswa';
    const className = student ? student.kelas : item.idkelas || '-';
    const formattedRerata = Number(item.rata_rata).toFixed(2);
    
    const textMsg = `Assalamualaikum Wr. Wb.\n\n` +
      `Berikut kami sampaikan *Laporan Ringkas Hasil Belajar (E-Rapor)* untuk putra/putri Bapak/Ibu:\n\n` +
      `📌 *Nama Siswa:* ${studentName}\n` +
      `📌 *NIS:* ${item.nis}\n` +
      `🏫 *Kelas:* Kelas ${className} (${item.tahunajaran})\n` +
      `📅 *Semester:* ${item.idsemester === 34 ? '1 (Ganjil)' : '2 (Genap)'}\n\n` +
      `*Ringkasan Nilai & Sikap:*\n` +
      `📚 *Jumlah Mapel:* ${item.jumlah_mapel}\n` +
      `📈 *Total Nilai:* ${item.total_nilai}\n` +
      `📊 *Nilai Rata-Rata:* ${formattedRerata}\n` +
      `🙏 *Sikap Ibadah:* ${item.ibadah || 'B'}\n` +
      `🤝 *Sikap Akhlak:* ${item.akhlak || 'B'}\n` +
      `⏱️ *Disiplin:* ${item.disiplin || 'B'}\n\n` +
      `Semoga hasil ringkasan ini dapat memotivasi belajar siswa ke depan. Terima kasih.\n\n` +
      `-- *SD Islam Hidayatul Islamiyah* --`;
    setCustomMessage(textMsg);
  };

  const handleSendWaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationPhone.trim()) {
      addToast('Nomor HP Orang Tua / Wali tidak boleh kosong.', 'error');
      return;
    }
    
    setIsSendingWa(true);
    try {
      const success = await sendWhatsappMessage(destinationPhone, customMessage);
      if (success) {
        addToast('✔️ Laporan rekap rapor sukses dikirim via WhatsApp!', 'success');
        setSendingItem(null);
      } else {
        addToast('Gagal mengirim via WhatsApp. Periksa koneksi gateway system settings Anda.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Terjadi kesalahan internal saat mengirim pesan.', 'error');
    } finally {
      setIsSendingWa(false);
    }
  };

  // 1. Fetch all Rekap Rapor from backend on mounting & on demand
  const fetchAllRekaps = async (silent = false) => {
    if (!silent) setIsLoadingRekaps(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      const response = await fetch(`${apiBaseUrl}/api/rapor/rekap`);
      if (response.ok) {
        const result = await response.json();
        if (result && result.status === 'sukses' && Array.isArray(result.data)) {
          setRekapsList(result.data);
          localStorage.setItem('rekap_rapor_list', JSON.stringify(result.data));
        } else {
          setRekapsList([]);
        }
      } else {
        // Handle 404 gracefully (no data generated yet)
        setRekapsList([]);
      }
    } catch (e) {
      console.warn('API error loading Rekaps, reading fallback cache', e);
      const cached = localStorage.getItem('rekap_rapor_list');
      if (cached) {
        try {
          setRekapsList(JSON.parse(cached));
        } catch (_) {
          setRekapsList([]);
        }
      }
    } finally {
      if (!silent) setIsLoadingRekaps(false);
    }
  };

  useEffect(() => {
    fetchAllRekaps();
  }, []);

  // 2. Extract unique classes for student generation dropdown
  useEffect(() => {
    if (students && students.length > 0) {
      const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).sort();
      setClassesList(uniqueClasses);
    }
  }, [students]);

  // 3. Filter students dropdown when selected class changed
  useEffect(() => {
    if (selectedClass) {
      const filtered = students.filter(s => s.kelas === selectedClass);
      setFilteredStudents(filtered);
      setSelectedNis('');
      setTahunAjaran('');
    } else {
      setFilteredStudents([]);
    }
  }, [selectedClass, students]);

  // 4. Populate academic year automatically
  useEffect(() => {
    if (selectedNis) {
      const student = students.find(s => s.nis === selectedNis);
      if (student) {
        setTahunAjaran(student.tahunajaran || '2025/2026');
      }
    }
  }, [selectedNis, students]);

  // 5. Handle action to execute generate
  const handleGenerateRekap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNis) {
      addToast('Harap pilih siswa terlebih dahulu!', 'error');
      return;
    }
    
    setIsGenerating(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      const response = await fetch(`${apiBaseUrl}/api/rapor/rekap/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: selectedNis,
          idsemester: idSemester
        })
      });

      if (response.ok) {
        const result = await response.json();
        addToast(`✔️ Rekap Rapor berhasil di-generate! (Rata-rata: ${result.data?.rata_rata})`, 'success');
        // Refresh rekap logs table
        await fetchAllRekaps(true);
        // Clear selection to permit quick subsequent builds
        setSelectedNis('');
        setTahunAjaran('');
      } else {
        const errResult = await response.json().catch(() => ({}));
        addToast(`Gagal generate rekap: ${errResult.pesan || 'respon tidak valid'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Terjadi kesalahan koneksi saat generate rekap.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const executeDeleteRekap = async (replid: number) => {
    setIsDeletingId(replid);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      const response = await fetch(`${apiBaseUrl}/api/rapor/rekap/${replid}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        addToast(`✔️ Rekap Rapor berhasil dihapus!`, 'success');
        setRekapsList(prev => prev.filter(item => item.replid !== replid));
        setConfirmDeleteId(null);
        await fetchAllRekaps(true);
      } else {
        const errResult = await response.json().catch(() => ({}));
        addToast(`Gagal menghapus: ${errResult.pesan || 'respon tidak valid'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Terjadi kesalahan koneksi saat menghapus rekap.', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  // Helper mapping names in case LEFT API JOIN is loading
  const getOfflineStudentName = (item: RekapRapor) => {
    if (item.nama_siswa) return item.nama_siswa;
    const s = students.find(stud => stud.nis === item.nis);
    return s ? s.nama : 'Tidak diketahui';
  };

  const getOfflineStudentClass = (item: RekapRapor) => {
    const s = students.find(stud => stud.nis === item.nis);
    if (s && s.kelas) return s.kelas;
    
    // Fallback: If s is not found, try to resolve ID via activeClasses
    const classId = item.idkelas;
    if (classId && !isNaN(Number(classId))) {
      const found = (activeClasses || []).find((c: any) => c && String(c.replid) === String(classId));
      if (found && found.kelas) return String(found.kelas);
    }
    return item.idkelas || '-';
  };

  // Filter rekap logs representation table
  const filteredRekaps = rekapsList.filter(item => {
    const studentName = (getOfflineStudentName(item) || '').toLowerCase();
    const nis = (item.nis || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchSearch = studentName.includes(query) || nis.includes(query);

    const sClass = getOfflineStudentClass(item);
    const matchClass = filterClass ? sClass === filterClass : true;

    return matchSearch && matchClass;
  });

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'A': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'B': return 'text-sky-600 bg-sky-50 border-sky-100';
      case 'C': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-rose-600 bg-rose-50 border-rose-100';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: BUILDER UTILITY FORM PANEL */}
      <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <FileSpreadsheet className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">📋 Generate Rekap Rapor</h2>
            <p className="text-xs text-slate-400">Otomatisasi kalkulasi agregat nilai</p>
          </div>
        </div>

        <form onSubmit={handleGenerateRekap} className="space-y-4">
          
          {/* Class selection */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Pilih Kelas <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="block w-full bg-slate-50 border border-slate-200 text-slate-850 py-3 px-3.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold"
            >
              <option value="">-- Pilih Kelas --</option>
              {classesList.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
          </div>

          {/* Student selection */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Pilih Siswa <span className="text-rose-500">*</span>
            </label>
            <select
              required
              disabled={!selectedClass}
              value={selectedNis}
              onChange={(e) => setSelectedNis(e.target.value)}
              className="block w-full bg-slate-50 border border-slate-200 text-slate-850 py-3 px-3.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedClass ? '-- Pilih Kelas Dahulu --' : '-- Pilih Siswa --'}
              </option>
              {filteredStudents.map((s) => (
                <option key={s.nis} value={s.nis}>
                  {s.nama} ({s.nis})
                </option>
              ))}
            </select>
          </div>

          {/* Academic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                ID Semester
              </label>
              <select
                value={idSemester}
                onChange={(e) => setIdSemester(parseInt(e.target.value) || 34)}
                className="block w-full bg-white border border-slate-200 text-slate-800 py-1.5 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={34}>Semester 1 (34)</option>
                <option value={35}>Semester 2 (35)</option>
                <option value={36}>Semester 3 (36)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                Tahun Ajaran
              </label>
              <input
                type="text"
                readOnly
                value={tahunAjaran || '---'}
                className="block w-full bg-slate-100 border border-slate-200 text-slate-500 py-1.5 px-2.5 rounded-lg text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="text-[11px] text-amber-800 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/50 space-y-1">
            <p className="font-extrabold text-amber-950 flex items-center gap-1">⚡ Informasi Sistem Rekap:</p>
            <p className="text-[10.5px] leading-relaxed font-semibold">
              Fitur Rekap akan membaca seluruh entry akademik siswa terpilih di tabel, menghitung rata-rata serta total nilai, mengambil data sikap kepribadian (default jika belum di-generate), lalu menyimpannya dalam tabel <span className="font-bold underline">rekaprapor</span>.
            </p>
          </div>

          <button
            type="submit"
            disabled={isGenerating || !selectedNis}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wide mt-2 hover:scale-[1.01]"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
                <span>Menghitung Data...</span>
              </>
            ) : (
              <>
                <BarChart4 className="w-4 h-4 text-emerald-100" />
                <span>Hitung & Simpan Rekap</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: REKAP RECORDS LOGS TABLE */}
      <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        
        {/* Module Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-3.5">
          <div>
            <h3 className="font-black text-slate-800 text-base flex items-center gap-1.5">
              <span>🏅 Arsip Hasil Rekapan Rapor</span>
            </h3>
            <p className="text-[11px] text-slate-400">Database rekaprapor hasil kalkulasi aggregate akhir</p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchAllRekaps(false)}
              disabled={isLoadingRekaps}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02]"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRekaps ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="text-xs font-bold hidden sm:inline">Segarkan</span>
            </button>
            {rekapsList.length > 0 && (
              <span className="bg-emerald-55 bg-emerald-50 text-emerald-800 text-xs font-black min-h-10 px-3 py-1.5 rounded-xl flex items-center border border-emerald-100 select-none">
                {rekapsList.length} Rekap
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama siswa atau no induk (NIS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="w-full md:w-44">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Kelas</option>
              {classesList.map(c => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Records Listing */}
        {isLoadingRekaps ? (
          <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Menghubungkan ke server Fastify...</p>
          </div>
        ) : filteredRekaps.length > 0 ? (
          <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-inner">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-[#f8fafc] text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150">
                <tr>
                  <th className="py-3 px-4 w-[22%] text-slate-700">Nama Siswa</th>
                  <th className="py-3 px-3 text-center w-[11%] text-slate-700">Kelas / Sem</th>
                  <th className="py-3 px-3 text-center w-[11%] text-slate-700">Jml Mapel</th>
                  <th className="py-3 px-3 text-center w-[13%] text-slate-700">Agregat Nilai</th>
                  <th className="py-3 px-3 text-center w-[18%] text-slate-700">Sikap (Ibd / Akh / Dis)</th>
                  <th className="py-3 px-3 text-right w-[16%] text-slate-700">Terakhir Update</th>
                  <th className="py-3 px-3 text-center w-[9%] text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredRekaps.map((item, idx) => {
                  const studentName = getOfflineStudentName(item);
                  const className = getOfflineStudentClass(item);
                  return (
                    <tr key={`${item.nis}-${idx}`} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800">{studentName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5 font-mono">NIS: {item.nis}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Kls {className}
                        </span>
                        <div className="text-[9.5px] text-slate-400 font-bold mt-1">Smt {item.idsemester}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold font-mono text-slate-800 text-sm">
                        {item.jumlah_mapel}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold">
                        <div className="text-slate-850 font-mono text-sm">{item.total_nilai}</div>
                        <div className="text-[10px] text-emerald-600 font-extrabold mt-0.5">Rerata: {Number(item.rata_rata).toFixed(2)}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex gap-1 justify-center">
                          {['ibadah', 'akhlak', 'disiplin'].map((key) => {
                            const val = (item as any)[key] || 'B';
                            return (
                              <div
                                key={key}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-black border text-center ${getScoreColor(val)}`}
                                title={`${key.toUpperCase()}: ${val}`}
                              >
                                {val}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-[10px] text-slate-400 font-semibold leading-relaxed">
                        {item.last_update ? (
                          new Date(item.last_update).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).replace(/,/g, ' •')
                        ) : (
                          'Baru saja'
                        )}
                        <div className="text-[8.5px] text-slate-350 tracking-wider">TA: {item.tahunajaran}</div>
                      </td>
                       <td className="py-3.5 px-3 text-center">
                        {item.replid ? (
                          confirmDeleteId === item.replid ? (
                            <div className="flex items-center justify-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                              <button
                                onClick={() => executeDeleteRekap(item.replid!)}
                                disabled={isDeletingId === item.replid}
                                className="p-1 px-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-black tracking-wider uppercase flex items-center gap-0.5 shadow-sm cursor-pointer"
                                title="Yakin Hapus"
                              >
                                {isDeletingId === item.replid ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Ya</span>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={isDeletingId === item.replid}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded flex items-center justify-center cursor-pointer"
                                title="Batal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <a
                                href={`${import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net'}/api/rapor/print/terpadu/${item.nis}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-[#325c42] hover:text-[#254632] hover:bg-emerald-50 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer"
                                title="Cetak/Print Rapor Siswa Langsung (PDF)"
                              >
                                <Printer className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleOpenSendWa(item)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer"
                                title="Kirim Rekap WA ke Wali Murid"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmDeleteId(item.replid!);
                                }}
                                disabled={isDeletingId !== null}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer disabled:opacity-40"
                                title="Hapus Rekap Rapor"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-amber-500/80 mx-auto mb-2 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-650">Tidak ada data rekap ditemukan</h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || filterClass 
                ? 'Tidak ada rekapan yang cocok dengan filter pencarian Anda saat ini.' 
                : 'Belum ada data rekap rapor yang pernah dihitung soko database. Silakan jalankan generate di panel kiri.'}
            </p>
          </div>
        )}
      </div>

      {/* WhatsApp Dispatch Modal for Parents */}
      <AnimatePresence>
        {sendingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-150 max-w-lg w-full overflow-hidden flex flex-col z-50 text-slate-700 font-sans"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Kirim Ringkasan WA</h3>
                    <p className="text-[10px] text-emerald-700 font-medium leading-none mt-0.5">Langsung ke HP Orang Tua / Wali</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSendingItem(null)}
                  className="p-1 px-1.5 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSendWaSubmit} className="p-6 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nomor HP Wali Murid
                    </label>
                    {(() => {
                      const stud = students.find(s => String(s.nis) === String(sendingItem.nis));
                      return stud?.hportu ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Default NIS hportu: {stud.hportu}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          Input Manual (Kosong di NIS)
                        </span>
                      );
                    })()}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 6285749455xxx"
                    value={destinationPhone}
                    onChange={(e) => setDestinationPhone(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-450 mt-1">Gunakan kode negara (misal 62) di depan tanpa tanda hubung atau spasi.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Isi Pesan Rapor Terpadu
                  </label>
                  <textarea
                    required
                    rows={12}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium font-sans text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                    placeholder="Tuliskan format isi rapormu..."
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSendingItem(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingWa}
                    className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-80 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-50 hover:shadow-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSendingWa ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
