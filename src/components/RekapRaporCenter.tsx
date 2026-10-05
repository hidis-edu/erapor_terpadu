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
  activeTahunAjaran?: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function RekapRaporCenter({
  students,
  activeClasses,
  activeTahunAjaran,
  addToast
}: RekapRaporCenterProps) {
  const [modeRekap, setModeRekap] = useState<'PAS' | 'PTS'>('PAS');
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

  // Custom Print Date Toggle & Controls
  const [useCustomPrintDate, setUseCustomPrintDate] = useState(false);
  const [customPrintDate, setCustomPrintDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [customCity, setCustomCity] = useState('Jakarta');
  const [customDateTextOverride, setCustomDateTextOverride] = useState('');

  // Dropdown list holders
  const [classesList, setClassesList] = useState<string[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // Calculate formatted Indonesian dates
  const todayFormatted = React.useMemo(() => {
    const today = new Date();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  }, []);

  const effectivePrintDateText = React.useMemo(() => {
    if (!useCustomPrintDate) return '';
    if (customDateTextOverride.trim()) return customDateTextOverride.trim();
    if (!customPrintDate) return '';
    const parts = customPrintDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      if (!isNaN(year) && monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        const cityPrefix = customCity.trim() ? `${customCity.trim()}, ` : '';
        return `${cityPrefix}${day} ${months[monthIdx]} ${year}`;
      }
    }
    return customPrintDate;
  }, [useCustomPrintDate, customPrintDate, customCity, customDateTextOverride]);

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
    
    const isModePts = modeRekap === 'PTS';
    const textMsg = isModePts
      ? `Assalamualaikum Wr. Wb.\n\n` +
        `Berikut kami sampaikan *Laporan Hasil Belajar Penilaian Tengah Semester (PTS)* untuk ananda:\n\n` +
        `📌 *Nama Siswa:* ${studentName}\n` +
        `📌 *NIS:* ${item.nis}\n` +
        `🏫 *Kelas:* Kelas ${className} (${item.tahunajaran})\n` +
        `📅 *Semester:* ${item.idsemester === 34 ? '1 (Ganjil - PTS)' : '2 (Genap - PTS)'}\n\n` +
        `*Ringkasan Nilai PTS:*\n` +
        `📚 *Jumlah Mapel:* ${item.jumlah_mapel}\n` +
        `📈 *Total Nilai:* ${item.total_nilai}\n` +
        `📊 *Nilai Rata-Rata PTS:* ${formattedRerata}\n` +
        `🏥 *Absensi:* Sakit: ${item.sakit || 0} hr, Izin: ${item.izin || 0} hr, Alpa: ${item.alpa || 0} hr\n\n` +
        `Semoga hasil evaluasi tengah semester ini menjadi pemacu semangat belajar siswa. Terima kasih.\n\n` +
        `-- *SD Islam Hidayatul Islamiyah* --`
      : `Assalamualaikum Wr. Wb.\n\n` +
        `Berikut kami sampaikan *Laporan Ringkas Hasil Belajar (E-Rapor Akhir Semester)* untuk putra/putri Bapak/Ibu:\n\n` +
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

  // 1. Fetch all Rekap Rapor from backend on mounting & on demand (PAS or PTS)
  const fetchAllRekaps = async (silent = false, customTa?: string, targetMode?: 'PAS' | 'PTS') => {
    if (!silent) setIsLoadingRekaps(true);
    const activeMode = targetMode || modeRekap;
    const targetTa = customTa !== undefined ? customTa : activeTahunAjaran;
    const endpoint = activeMode === 'PTS' ? 'pts/rekap' : 'rekap';
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      const url = targetTa
        ? `${apiBaseUrl}/api/rapor/${endpoint}?tahunajaran=${encodeURIComponent(targetTa)}`
        : `${apiBaseUrl}/api/rapor/${endpoint}`;
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result && (result.status === 'sukses' || result.data) && Array.isArray(result.data)) {
          setRekapsList(result.data);
          localStorage.setItem(`rekap_rapor_list_${activeMode}_${targetTa || 'all'}`, JSON.stringify(result.data));
        } else {
          setRekapsList([]);
        }
      } else {
        // Handle 404 gracefully (no data generated yet)
        setRekapsList([]);
      }
    } catch (e) {
      console.warn('API error loading Rekaps, reading fallback cache', e);
      const cached = localStorage.getItem(`rekap_rapor_list_${activeMode}_${targetTa || 'all'}`);
      if (cached) {
        try {
          setRekapsList(JSON.parse(cached));
        } catch (_) {
          setRekapsList([]);
        }
      } else {
        setRekapsList([]);
      }
    } finally {
      if (!silent) setIsLoadingRekaps(false);
    }
  };

  useEffect(() => {
    fetchAllRekaps(false, activeTahunAjaran, modeRekap);
  }, [activeTahunAjaran, modeRekap]);

  // 2. Extract comprehensive classes for student generation dropdown & filter (all 6 grades)
  useEffect(() => {
    const classSet = new Set<string>();

    // From activeClasses (from JBS database)
    if (activeClasses && activeClasses.length > 0) {
      activeClasses.forEach((c: any) => {
        const clsName = c?.kelas || c?.nama;
        if (clsName && typeof clsName === 'string') {
          classSet.add(clsName.trim());
        }
      });
    }

    // From students
    if (students && students.length > 0) {
      students.forEach(s => {
        if (s.kelas) classSet.add(String(s.kelas).trim());
      });
    }

    // From rekapsList
    if (rekapsList && rekapsList.length > 0) {
      rekapsList.forEach(item => {
        const directKls = (item as any).kelas;
        if (directKls) classSet.add(String(directKls).trim());
      });
    }

    // Always guarantee all 6 elementary school levels (1A to 6B)
    const defaultSdClasses = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'];
    defaultSdClasses.forEach(cls => classSet.add(cls));

    // Sort naturally: 1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B, 5A, 5B, 6A, 6B
    const sorted = Array.from(classSet).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    setClassesList(sorted);
  }, [students, activeClasses, rekapsList]);

  // 3. Filter students dropdown when selected class changed
  useEffect(() => {
    if (selectedClass) {
      const cleanSelected = selectedClass.trim().toLowerCase().replace(/^kelas\s*/i, '');
      const filtered = students.filter(s => {
        const studentClass = (s.kelas || '').trim().toLowerCase().replace(/^kelas\s*/i, '');
        return studentClass === cleanSelected || s.kelas === selectedClass;
      });
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
    const endpoint = modeRekap === 'PTS' ? 'pts/rekap/generate' : 'rekap/generate';
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      const response = await fetch(`${apiBaseUrl}/api/rapor/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: selectedNis,
          idsemester: idSemester,
          tahunajaran: tahunAjaran || activeTahunAjaran || '2025/2026',
          catatan_walikelas: ''
        })
      });

      if (response.ok) {
        const result = await response.json();
        addToast(`✔️ Rekap Rapor ${modeRekap} berhasil di-generate! (Rata-rata: ${result.data?.rata_rata})`, 'success');
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
    const endpoint = modeRekap === 'PTS' ? 'pts/rekap' : 'rekap';
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      const response = await fetch(`${apiBaseUrl}/api/rapor/${endpoint}/${replid}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        addToast(`✔️ Rekap Rapor ${modeRekap} berhasil dihapus!`, 'success');
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
    const itemNis = String(item.nis || '').trim();
    const s = students.find(stud => String(stud.nis).trim() === itemNis);
    return s ? s.nama : `Siswa (${item.nis})`;
  };

  const getOfflineStudentClass = (item: RekapRapor) => {
    // 1. Direct from SQL JOIN if backend sends 'kelas' (from jbsakad.kelas.kelas)
    if ((item as any).kelas) {
      return String((item as any).kelas).trim();
    }

    const itemNis = String(item.nis || '').trim();

    // 2. From students array
    const s = students.find(stud => String(stud.nis).trim() === itemNis);
    if (s && s.kelas) {
      return String(s.kelas).trim();
    }
    
    // 3. Resolve via idkelas in activeClasses
    const classId = item.idkelas || (s as any)?.idkelas;
    if (classId) {
      const found = (activeClasses || []).find((c: any) => 
        c && (String(c.replid) === String(classId) || String(c.id) === String(classId))
      );
      if (found && found.kelas) return String(found.kelas).trim();
      if (found && found.nama) return String(found.nama).trim();
    }

    return item.idkelas ? String(item.idkelas).trim() : '-';
  };

  // Filter rekap logs representation table
  const filteredRekaps = rekapsList.filter(item => {
    const studentName = (getOfflineStudentName(item) || '').toLowerCase();
    const nis = String(item.nis || '').trim().toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchSearch = !query || studentName.includes(query) || nis.includes(query);

    const sClass = getOfflineStudentClass(item);
    const cleanSClass = (sClass || '').trim().toLowerCase().replace(/^kelas\s*/i, '');
    const cleanFilter = (filterClass || '').trim().toLowerCase().replace(/^kelas\s*/i, '');

    const matchClass = !filterClass || 
      cleanSClass === cleanFilter || 
      sClass === filterClass ||
      cleanSClass.startsWith(cleanFilter);

    // Filter strictly by active school year to prevent cross-year grade display
    const itemTa = (item.tahunajaran || '').trim().replace('-', '/');
    const activeTa = (activeTahunAjaran || '').trim().replace('-', '/');
    const matchYear = !activeTa || !itemTa || itemTa === activeTa;

    return matchSearch && matchClass && matchYear;
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
            <h3 className="font-black text-slate-800 text-base flex items-center gap-2 flex-wrap">
              <span>🏅 Arsip Hasil Rekapan Rapor</span>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                modeRekap === 'PTS' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {modeRekap === 'PTS' ? 'PTS (Tengah Semester)' : 'PAS (Akhir Semester)'}
              </span>
              {activeTahunAjaran && (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  {activeTahunAjaran}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Database rekapitulasi nilai terpadu {modeRekap === 'PTS' ? 'tengah semester (PTS)' : 'akhir semester (PAS)'}
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Mode Switcher Pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setModeRekap('PAS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modeRekap === 'PAS'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📘 PAS
              </button>
              <button
                type="button"
                onClick={() => setModeRekap('PTS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modeRekap === 'PTS'
                    ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📙 PTS
              </button>
            </div>

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
              <span className={`text-xs font-black min-h-10 px-3 py-1.5 rounded-xl flex items-center border select-none ${
                modeRekap === 'PTS' 
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-100'
              }`}>
                {rekapsList.length} Rekap {modeRekap}
              </span>
            )}
          </div>
        </div>

        {/* Bar Pengaturan & Toggle Custom Tanggal Print */}
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 mb-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Tanggal Titimangsa Lembar Rapor:</span>
              
              {/* Segmented Switcher Pill */}
              <div className="inline-flex items-center bg-slate-200/90 p-0.5 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setUseCustomPrintDate(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !useCustomPrintDate
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Otomatis (Hari Ini)
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomPrintDate(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    useCustomPrintDate
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✏️ Manual / Custom Tanggal
                </button>
              </div>
            </div>

            {/* Preview Status */}
            <div>
              {!useCustomPrintDate ? (
                <div className="text-[11px] text-slate-500 font-medium">
                  Default otomatis: <span className="font-bold text-slate-700">Jakarta, {todayFormatted}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-100/90 px-3 py-1 rounded-xl border border-amber-300">
                  <span>📅 Cetak Tertulis:</span>
                  <span className="font-extrabold underline">{effectivePrintDateText || 'Belum diatur'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form input ketika mode Custom Tanggal aktif */}
          {useCustomPrintDate && (
            <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  1. Pilih Kalender Tanggal
                </label>
                <input
                  type="date"
                  value={customPrintDate}
                  onChange={(e) => {
                    setCustomPrintDate(e.target.value);
                    setCustomDateTextOverride('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  2. Nama Kota Tempat Tanda Tangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jakarta / Jakarta Timur"
                  value={customCity}
                  onChange={(e) => {
                    setCustomCity(e.target.value);
                    setCustomDateTextOverride('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  3. Atau Ketik Manual Penuh
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jakarta, 28 Maret 2026"
                  value={customDateTextOverride}
                  onChange={(e) => setCustomDateTextOverride(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
              </div>
            </div>
          )}
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
          <div className="w-full md:w-52">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Semua Tingkat / Kelas</option>
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
                  <th className="py-3 px-3 text-center w-[14%] text-slate-700">
                    {modeRekap === 'PTS' ? 'Rata-rata PTS' : 'Agregat Nilai'}
                  </th>
                  <th className="py-3 px-3 text-center w-[18%] text-slate-700">
                    {modeRekap === 'PTS' ? 'Absensi (S / I / A)' : 'Sikap (Ibd / Akh / Dis)'}
                  </th>
                  <th className="py-3 px-3 text-right w-[15%] text-slate-700">Terakhir Update</th>
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
                        {modeRekap === 'PTS' ? (
                          <div className="inline-block bg-amber-50 text-amber-850 px-2.5 py-1 rounded-lg border border-amber-200">
                            <span className="text-xs font-black">Rerata: {Number(item.rata_rata).toFixed(2)}</span>
                            <div className="text-[9px] text-amber-700">Total: {item.total_nilai}</div>
                          </div>
                        ) : (
                          <>
                            <div className="text-slate-850 font-mono text-sm">{item.total_nilai}</div>
                            <div className="text-[10px] text-emerald-600 font-extrabold mt-0.5">Rerata: {Number(item.rata_rata).toFixed(2)}</div>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {modeRekap === 'PTS' ? (
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700">
                            <span className="text-amber-700" title="Sakit">S: {item.sakit || 0}</span>
                            <span>•</span>
                            <span className="text-blue-700" title="Izin">I: {item.izin || 0}</span>
                            <span>•</span>
                            <span className="text-rose-700" title="Alpa">A: {item.alpa || 0}</span>
                          </div>
                        ) : (
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
                        )}
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
                                href={`${import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net'}/api/rapor/print/${modeRekap === 'PTS' ? 'pts' : 'terpadu'}/${item.nis}?tahunajaran=${encodeURIComponent(item.tahunajaran || activeTahunAjaran || '2025/2026')}&jenis=${modeRekap}${useCustomPrintDate && effectivePrintDateText ? `&tanggal=${encodeURIComponent(effectivePrintDateText)}` : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-1.5 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer ${
                                  modeRekap === 'PTS'
                                    ? 'text-amber-700 hover:text-amber-900 hover:bg-amber-100/70'
                                    : 'text-[#325c42] hover:text-[#254632] hover:bg-emerald-50'
                                }`}
                                title={`Cetak/Print Rapor ${modeRekap} Siswa Langsung (PDF)`}
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
