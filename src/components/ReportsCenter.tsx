import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, FileSpreadsheet, FileText, Printer, Filter, X, 
  ArrowUpDown, CheckCircle, GraduationCap, Calendar, Settings
} from 'lucide-react';
import { Grade, Personality, Student, Subject, Attendance } from '../types';
import { handleExportExcel, handleExportPDF, numberToWords } from '../data';

interface ReportsCenterProps {
  grades: Grade[];
  personalities: Personality[];
  students: Student[];
  subjects: Subject[];
  attendances: Attendance[];
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function ReportsCenter({
  grades,
  personalities,
  students,
  subjects,
  attendances,
  addToast
}: ReportsCenterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  // Modal for direct printing of report cards
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printNis, setPrintNis] = useState('');
  const [printSelectedClass, setPrintSelectedClass] = useState('');

  // 1. Get list of classes and subjects for filtering
  const classesList = useMemo(() => {
    return Array.from(new Set(students.map(s => s.kelas))).sort();
  }, [students]);

  const activeSubjects = useMemo(() => {
    return subjects.filter(s => s.aktif === 1);
  }, [subjects]);

  const subjectMap = useMemo(() => {
    const map: Record<number, string> = {};
    subjects.forEach(s => { map[s.replid] = s.nama; });
    return map;
  }, [subjects]);

  const studentMap = useMemo(() => {
    const map: Record<string, Student> = {};
    students.forEach(s => { map[s.nis] = s; });
    return map;
  }, [students]);

  // 2. Filter grades based on user input
  const filteredGrades = useMemo(() => {
    return grades.filter(item => {
      const student = studentMap[item.nis];
      const studentName = student?.nama || '';
      const studentClass = student?.kelas || '';
      const subjectName = subjectMap[item.idpelajaran] || '';

      const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nis.includes(searchTerm) ||
        subjectName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = selectedClass === '' || studentClass === selectedClass;
      const matchesSubject = selectedSubjectId === '' || item.idpelajaran === parseInt(selectedSubjectId);

      return matchesSearch && matchesClass && matchesSubject;
    });
  }, [grades, searchTerm, selectedClass, selectedSubjectId, studentMap, subjectMap]);

  // Handle excel export
  const onExportExcel = () => {
    try {
      handleExportExcel(grades, personalities, students, subjects);
      addToast('✔️ Berkas Excel berhasil diunduh!', 'success');
    } catch (e) {
      addToast('Gagal mengekspor data ke Excel', 'error');
    }
  };

  // Handle PDF export
  const onExportPDF = () => {
    try {
      const cols = ['NIS', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Nilai', 'Predikat'];
      const rows = filteredGrades.map(g => {
        const stud = studentMap[g.nis];
        const sub = subjectMap[g.idpelajaran];
        return [
          g.nis,
          stud?.nama || 'N/A',
          stud?.kelas || 'N/A',
          sub || `ID: ${g.idpelajaran}`,
          String(g.nilaiakhir),
          g.predikat
        ];
      });

      handleExportPDF(
        `DAFTAR NILAI RAPOR TERPADU ${selectedClass ? `KELAS ${selectedClass}` : 'SEMUA KELAS'}`,
        cols,
        rows,
        `E-Rapor-SDIHI-Laporan`
      );
      addToast('✔️ Berkas PDF berhasil diunduh!', 'success');
    } catch (e) {
      addToast('Gagal mengekspor berkas PDF', 'error');
    }
  };

  // Student specific printing preparation
  const printableList = useMemo(() => {
    return students.filter(s => grades.some(g => g.nis === s.nis));
  }, [students, grades]);

  const printClassesList = useMemo(() => {
    return Array.from(new Set(printableList.map(s => s.kelas))).sort();
  }, [printableList]);

  const filteredPrintableStudents = useMemo(() => {
    if (!printSelectedClass) return [];
    return printableList.filter(s => s.kelas === printSelectedClass);
  }, [printableList, printSelectedClass]);

  const activePrintStudent = useMemo(() => {
    return students.find(s => s.nis === printNis);
  }, [printNis, students]);

  const activePrintGrades = useMemo(() => {
    return grades.filter(g => g.nis === printNis);
  }, [printNis, grades]);

  const activePrintPersonality = useMemo(() => {
    return personalities.find(p => p.nis === printNis);
  }, [printNis, personalities]);

  const activePrintAttendance = useMemo(() => {
    return attendances.find(a => a.nis === printNis);
  }, [printNis, attendances]);

  const totalNilai = useMemo(() => {
    return activePrintGrades.reduce((sum, g) => sum + g.nilaiakhir, 0);
  }, [activePrintGrades]);

  const averageNilai = useMemo(() => {
    if (activePrintGrades.length === 0) return 0;
    return totalNilai / activePrintGrades.length;
  }, [totalNilai, activePrintGrades]);

  const averageNilaiStr = useMemo(() => {
    return averageNilai.toFixed(1).replace('.', ',');
  }, [averageNilai]);

  const kualifikasiNilai = useMemo(() => {
    if (activePrintGrades.length === 0) return '-';
    if (averageNilai >= 89) return 'A (Sangat Baik)';
    if (averageNilai >= 77) return 'B (Baik)';
    if (averageNilai >= 65) return 'C (Cukup)';
    return 'D (Perlu Bimbingan)';
  }, [averageNilai]);

  const handleTriggerPrint = () => {
    if (!printNis) {
      addToast('Luncurkan siswa terlebih dahulu untuk dicetak!', 'error');
      return;
    }
    // Simple window action which lets them print cleanly
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6 select-none font-sans no-print">
      {/* Title with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">📊 Pusat Laporan Akademik (Export & Print)</h2>
          <p className="text-xs text-slate-400">Ekspor nilai terpadu ke format digital atau langsung cetak lembar prestasi</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor PDF</span>
          </button>
          <button
            onClick={() => setPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rapor Siswa</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa, NIS, atau pelajaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex gap-2.5 w-full md:w-auto self-stretch md:self-auto">
          {/* Class filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex-1 md:flex-initial bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Kelas</option>
            {classesList.map(k => (
              <option key={k} value={k}>Kelas {k}</option>
            ))}
          </select>

          {/* Subject filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="flex-1 md:flex-initial bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Mapel</option>
            {activeSubjects.map(sub => (
              <option key={sub.replid} value={sub.replid}>{sub.nama}</option>
            ))}
          </select>

          {(searchTerm || selectedClass || selectedSubjectId) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedClass('');
                setSelectedSubjectId('');
              }}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Reset Filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {filteredGrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6 text-slate-500">Siswa</th>
                  <th className="py-4 px-4 text-slate-500">Kelas</th>
                  <th className="py-4 px-4 text-slate-500">Mata Pelajaran</th>
                  <th className="py-4 px-4 text-center text-slate-500">KKM</th>
                  <th className="py-4 px-4 text-center text-slate-500">Nilai Akhir</th>
                  <th className="py-4 px-4 text-center text-slate-500">Predikat</th>
                  <th className="py-4 px-6 text-slate-500">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredGrades.map((g, idx) => {
                  const s = studentMap[g.nis];
                  return (
                    <tr key={`${g.nis}-${g.idpelajaran}`} className="hover:bg-slate-50/50 text-xs transition-all">
                      <td className="py-3 px-6">
                        <div className="font-bold text-slate-800">{s?.nama || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">NIS: {g.nis}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">Kelas {s?.kelas || '-'}</td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">
                        {subjectMap[g.idpelajaran] || `ID: ${g.idpelajaran}`}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 font-bold">{g.kkm}</td>
                      <td className="py-3 px-4 text-center font-black">
                        <span className={`px-2 py-0.5 rounded ${
                          g.nilaiakhir >= g.kkm ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        }`}>
                          {g.nilaiakhir}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-slate-700">{g.predikat}</td>
                      <td className="py-3 px-6 text-[11px] text-slate-400 italic max-w-xs truncate" title={g.catatanguru}>
                        {g.catatanguru ? `"${g.catatanguru}"` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Tidak ada nilai yang lolos filter</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Silakan coba sesuaikan kata pencarian Anda atau filter kelas dan mata pelajaran di atas.
            </p>
          </div>
        )}
      </div>

      {/* POPUP PRINT DIALOG BOX (WALI KELAS STYLE) */}
      {printModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className={`bg-white rounded-2xl w-full ${printNis && activePrintStudent ? 'max-w-5xl' : 'max-w-md'} p-6 shadow-2xl relative border border-slate-100 flex flex-col gap-4 transition-all duration-300`}>
            <button
              onClick={() => { setPrintModalOpen(false); setPrintNis(''); setPrintSelectedClass(''); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`grid grid-cols-1 ${printNis && activePrintStudent ? 'lg:grid-cols-12' : ''} gap-6 max-h-[80vh] overflow-y-auto pr-1`}>
              {/* Left Column / Control Panel */}
              <div className={printNis && activePrintStudent ? 'lg:col-span-4 space-y-4' : 'space-y-4'}>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">🖨️ Cetak Lembar Rapor Individu</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Pilih kelas lalu pilih siswa untuk dicetak</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Pilih Kelas
                    </label>
                    <select
                      value={printSelectedClass}
                      onChange={(e) => {
                        setPrintSelectedClass(e.target.value);
                        setPrintNis('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {printClassesList.map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Siswa Sasaran Cetak
                    </label>
                    <select
                      value={printNis}
                      onChange={(e) => setPrintNis(e.target.value)}
                      disabled={!printSelectedClass}
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed font-sans"
                    >
                      <option value="">
                        {printSelectedClass ? '-- Pilih Siswa --' : '-- Pilih Kelas Terlebih Dahulu --'}
                      </option>
                      {filteredPrintableStudents.map(s => (
                        <option key={s.nis} value={s.nis}>{s.nama} ({s.nis})</option>
                      ))}
                    </select>
                  </div>

                  {printNis && activePrintStudent ? (
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3 font-sans">
                      <div>
                        <h4 className="text-xs font-extrabold text-emerald-950">{activePrintStudent.nama}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                          NIS: {activePrintStudent.nis} • Kelas {activePrintStudent.kelas}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                        <div className="bg-white p-2 rounded border border-emerald-100/60">
                          📝 Total Mapel: <span className="text-emerald-700 font-extrabold">{activePrintGrades.length}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-emerald-100/60">
                          🌟 Rekap Sikap: <span className="text-sky-700 font-extrabold font-bold">
                            {activePrintPersonality ? 'Lengkap ✓' : 'Belum Diisi'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-emerald-800/85 leading-relaxed font-semibold space-y-1">
                        <p className="font-extrabold">Informasi Kertas Legal:</p>
                        <p>Lembar cetak pas di ukuran kertas <strong>Legal / F4 (21.5cm x 33cm)</strong>.</p>
                        <p>Pilih orientasi <strong>Portrait</strong> dan atur margin ke <strong>Minimum / Default</strong> di dialog print.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl text-xs text-slate-400 border border-dashed border-slate-200">
                      Pilih siswa untuk menayangkan ringkasan lembar evaluasi sebelum print
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => { setPrintModalOpen(false); setPrintNis(''); setPrintSelectedClass(''); }}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Tutup
                    </button>
                    <button
                      onClick={handleTriggerPrint}
                      disabled={!printNis}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-55 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all cursor-pointer font-semibold shadow-md inline-flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Mulai Cetak</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column / Live Paper Preview */}
              {printNis && activePrintStudent && (
                <div className="lg:col-span-8 flex flex-col gap-2 max-h-[75vh] overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 pb-2 border-b border-slate-200">
                    <span className="flex items-center gap-1.5">📄 PRATINJAU DRAF RAPOR UTUH (UKURAN LEGAL)</span>
                    <span className="text-emerald-600 font-bold">LIVE SERVER REAL-TIME</span>
                  </div>

                  {/* Document preview block wrapping actual printable layout */}
                  <div className="bg-white p-6 border-[3px] border-[#4a6b53] text-[10px] text-black font-sans shadow-lg mx-auto w-full max-w-[650px] flex flex-col justify-between" style={{ minHeight: '820px' }}>
                    <div>
                      {/* Heading */}
                      <div className="text-center font-bold tracking-normal mb-3 border-b-2 border-slate-300 pb-1.5">
                        <h1 className="text-xs font-extrabold text-slate-900 uppercase">
                          RAPOR PENILAIAN SUMATIF AKHIR SEMESTER II
                        </h1>
                        <h2 className="text-[10px] font-bold text-slate-900 uppercase mt-0.5">
                          TERPADU
                        </h2>
                        <h3 className="text-[10px] font-bold text-slate-900 uppercase mt-0.5">
                          SDI HIDAYATUL ISLAMIYAH
                        </h3>
                      </div>

                      {/* Header table */}
                      <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-900 pb-2 border-b border-slate-200 mb-3 block">
                        <div className="space-y-0.5">
                          <div className="flex">
                            <span className="w-16 shrink-0 font-medium">Nama Siswa</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-extrabold uppercase">{activePrintStudent.nama}</span>
                          </div>
                          <div className="flex">
                            <span className="w-16 shrink-0 font-medium">No. Induk</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-bold">{activePrintStudent.nis}</span>
                          </div>
                          <div className="flex">
                            <span className="w-16 shrink-0 font-medium">NISN</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-bold">
                              {activePrintStudent.nis === '1634' ? '3132430707' : '00' + activePrintStudent.nis + '5849'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex">
                            <span className="w-24 shrink-0 font-medium">Kelas</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-bold">{activePrintStudent.kelas}</span>
                          </div>
                          <div className="flex">
                            <span className="w-24 shrink-0 font-medium">Semester</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-bold">Genap</span>
                          </div>
                          <div className="flex">
                            <span className="w-24 shrink-0 font-medium">Tahun Pelajaran</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-bold">{activePrintStudent.tahunajaran}</span>
                          </div>
                        </div>
                      </div>

                      {/* Grades Table */}
                      <table className="w-full text-left border-collapse border border-slate-800 text-[9px] text-slate-900">
                        <thead className="bg-[#f8fafc] font-bold text-center">
                          <tr>
                            <th className="border border-slate-800 py-1 px-1 w-[5%]">NO</th>
                            <th className="border border-slate-800 py-1 px-2 text-left w-[35%]">MATA PELAJARAN</th>
                            <th className="border border-slate-800 py-1 px-1 w-[10%]">KKM</th>
                            <th className="border border-slate-800 py-1 px-1 w-[12%]">
                              <div>NILAI</div>
                              <div>ANGKA</div>
                            </th>
                            <th className="border border-slate-800 py-1 px-2 text-left w-[28%]">NILAI HURUF</th>
                            <th className="border border-slate-800 py-1 px-1 w-[10%]">PREDIKAT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activePrintGrades.map((g, idx) => (
                            <tr key={g.idpelajaran} className="text-center">
                              <td className="border border-slate-800 py-1 px-1 text-center">{idx + 1}</td>
                              <td className="border border-slate-800 py-1 px-2 text-left font-extrabold">{subjectMap[g.idpelajaran] || `ID: ${g.idpelajaran}`}</td>
                              <td className="border border-slate-800 py-1 px-1 text-center">{g.kkm}</td>
                              <td className="border border-slate-800 py-1 px-1 text-center font-bold">{g.nilaiakhir}</td>
                              <td className="border border-slate-800 py-1 px-2 text-left text-[8px] capitalize">{g.nilaihuruf || numberToWords(g.nilaiakhir)}</td>
                              <td className="border border-slate-800 py-1 px-1 text-center font-bold">{g.predikat}</td>
                            </tr>
                          ))}
                          {activePrintGrades.length === 0 && (
                            <tr>
                              <td colSpan={6} className="border border-slate-800 py-4 text-center text-slate-400 italic">
                                Belum ada nilai akademik terdata untuk siswa ini.
                              </td>
                            </tr>
                          )}
                          <tr className="bg-slate-50/20 font-bold">
                            <td colSpan={3} className="border border-slate-800 py-1 px-2 text-left uppercase text-[9px]">JUMLAH</td>
                            <td className="border border-slate-800 py-1 px-1 text-center text-[9px] font-extrabold">{totalNilai}</td>
                            <td colSpan={2} className="border border-slate-800 py-1 px-2"></td>
                          </tr>
                          <tr className="bg-slate-50/20 font-bold">
                            <td colSpan={3} className="border border-slate-800 py-1 px-2 text-left uppercase text-[9px]">RATA-RATA</td>
                            <td className="border border-slate-800 py-1 px-1 text-center text-[9px] font-extrabold">{averageNilaiStr}</td>
                            <td colSpan={2} className="border border-slate-800 py-1 px-2"></td>
                          </tr>
                          <tr className="bg-slate-100/50 font-extrabold">
                            <td colSpan={3} className="border border-slate-800 py-1 px-2 text-left uppercase text-[9px]">KUALIFIKASI NILAI</td>
                            <td colSpan={3} className="border border-slate-800 py-1 px-2 text-center text-[9px] font-black text-[#407655]">{kualifikasiNilai}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Catatan Area */}
                      <div className="border border-slate-800 p-2 mt-2.5 min-h-[3rem]">
                        <div className="font-bold text-[9px]">Catatan :</div>
                        <div className="italic text-[9px] mt-0.5 text-slate-850 font-medium">
                          {activePrintPersonality?.catatan || 'perhatikan untuk lebih berdisiplin'}
                        </div>
                      </div>

                      {/* Promotion line */}
                      <div className="mt-2 text-[9px]">
                        <span className="font-extrabold">Naik kelas / <span className="line-through">Tinggal kelas</span></span>
                      </div>

                      {/* Double charts box */}
                      <div className="flex justify-between items-stretch gap-4 mt-2.5">
                        {/* Attendance & Personality */}
                        <div className="w-[48%] space-y-2">
                          <div>
                            <div className="font-bold text-[9px] mb-0.5">Kehadiran :</div>
                            <table className="w-full text-center border-collapse border border-slate-800 text-[8px]">
                              <thead className="bg-[#407655] text-white">
                                <tr>
                                  <th className="border border-slate-800 py-0.5 px-0.5">Sakit</th>
                                  <th className="border border-slate-800 py-0.5 px-0.5">Ijin</th>
                                  <th className="border border-slate-800 py-0.5 px-0.5">Alpha</th>
                                </tr>
                              </thead>
                              <tbody className="font-bold">
                                <tr>
                                  <td className="border border-slate-800 py-0.5 px-0.5">
                                    {activePrintAttendance ? activePrintAttendance.sakit : 0}
                                  </td>
                                  <td className="border border-slate-800 py-0.5 px-0.5">
                                    {activePrintAttendance ? activePrintAttendance.izin : 0}
                                  </td>
                                  <td className="border border-slate-800 py-0.5 px-0.5">
                                    {activePrintAttendance ? activePrintAttendance.alpa : 0}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div>
                            <div className="font-bold text-[9px] mb-0.5">Kepribadian :</div>
                            <table className="w-full text-center border-collapse border border-slate-800 text-[8px]">
                              <thead className="bg-[#407655] text-white">
                                <tr>
                                  <th className="border border-slate-800 py-0.5 px-0.5">Ibadah</th>
                                  <th className="border border-slate-800 py-0.5 px-0.5 font-bold">Akhlak</th>
                                  <th className="border border-slate-800 py-0.5 px-0.5">Disiplin</th>
                                </tr>
                              </thead>
                              <tbody className="font-bold">
                                <tr>
                                  <td className="border border-slate-800 py-0.5 px-0.5">{activePrintPersonality?.ibadah || 'B'}</td>
                                  <td className="border border-slate-800 py-0.5 px-0.5">{activePrintPersonality?.akhlak || 'B'}</td>
                                  <td className="border border-slate-800 py-0.5 px-0.5">{activePrintPersonality?.disiplin || 'B'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Keterangan */}
                        <div className="w-[48%] border border-[#8db094] rounded p-2 text-[8px] bg-white text-slate-800 flex flex-col justify-between">
                          <div className="text-center font-bold text-[#407655] pb-0.5 border-b border-slate-100 uppercase">KETERANGAN</div>
                          <div className="space-y-0.5 font-semibold mt-1">
                            <div className="flex justify-between border-b border-dashed border-slate-50 pb-0.5">
                              <span>89 – 100</span> <span>= A (Sangat Baik)</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-50 pb-0.5">
                              <span>77 – 88</span> <span>= B (Baik)</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-50 pb-0.5">
                              <span>65 – 76</span> <span>= C (Cukup)</span>
                            </div>
                            <div className="flex justify-between">
                              <span>≤ 64</span> <span>= D (Perlu Bimbingan)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-4 text-[8px] pt-1.5 border-t border-dashed border-slate-200">
                      <div className="flex justify-between">
                        <div></div>
                        <div className="text-center w-40">
                          <p>Jakarta, 2 Juni 2026</p>
                          <p className="font-bold">Guru Terpadu {activePrintStudent.kelas}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 text-center mt-3 gap-2">
                        <div className="flex flex-col justify-between min-h-[45px]">
                          <div>
                            <p>Mengetahui,</p>
                            <p className="font-bold">Orang Tua Wali</p>
                          </div>
                          <p className="mt-5 text-slate-400">.......................................................</p>
                        </div>

                        <div className="flex flex-col justify-end min-h-[45px]">
                          <p className="font-bold mb-2">Mengetahui,</p>
                          <p className="font-bold">Kepala Sekolah</p>
                          <p className="font-extrabold underline mt-5 uppercase text-slate-800">SITI MUNIROH, S.Pd.I., M.M</p>
                        </div>

                        <div className="flex flex-col justify-end min-h-[45px]">
                          <div></div>
                          <p className="font-extrabold underline uppercase mt-5 text-slate-800">FATRA TSAURAH NISA, S.Pd</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OFFLINE EMBEDDED PRINT VIEW: RENDERED EXCLUSIVELY ON SYSTEM PRINT SESSION (@media print) */}
      {printNis && activePrintStudent && (
        <div className="print-only hidden p-8 bg-white text-black font-sans" style={{ width: '100%', maxWidth: '215mm', margin: '0 auto' }}>
          {/* Inject a raw style block to specify exact print page size and margin and hide scrollbars */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              html, body {
                height: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                font-family: Arial, sans-serif !important;
              }
              @page {
                size: legal portrait;
                margin: 1.0cm 1.2cm !important;
              }
              .no-print {
                display: none !important;
              }
              .print-only {
                display: block !important;
              }
            }
          `}} />

          {/* Elegant Outer Border framing the report sheet, matching the green look from PDF */}
          <div className="border-[3px] border-[#4a6b53] p-8 bg-white min-h-[1100px] flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
            <div>
              {/* Heading */}
              <div className="text-center tracking-normal mb-6 border-b-2 border-slate-300 pb-3">
                <h1 className="text-xl font-bold text-black uppercase leading-tight">
                  RAPOR PENILAIAN SUMATIF AKHIR SEMESTER II
                </h1>
                <h2 className="text-base font-bold text-black uppercase mt-1">
                  TERPADU
                </h2>
                <h3 className="text-base font-bold text-black uppercase mt-1">
                  SDI HIDAYATUL ISLAMIYAH
                </h3>
              </div>

              {/* Student info grid */}
              <div className="grid grid-cols-2 gap-8 text-[11px] text-black pb-4 border-b border-black mb-6">
                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-24 shrink-0 font-medium">Nama Siswa</span>
                    <span className="mr-2">:</span>
                    <span className="font-bold uppercase">{activePrintStudent.nama}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 shrink-0 font-medium">No. Induk</span>
                    <span className="mr-2">:</span>
                    <span className="font-bold">{activePrintStudent.nis}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 shrink-0 font-medium">NISN</span>
                    <span className="mr-2">:</span>
                    <span className="font-bold">
                      {activePrintStudent.nis === '1634' ? '3132430707' : '00' + activePrintStudent.nis + '5849'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-32 shrink-0 font-medium">Kelas</span>
                    <span className="mr-2">:</span>
                    <span className="font-bold">{activePrintStudent.kelas}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 shrink-0 font-medium">Semester</span>
                    <span className="mr-2">:</span>
                    <span className="font-bold">Genap</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 shrink-0 font-medium">Tahun Pelajaran</span>
                    <span className="mr-2">:</span>
                    <span className="font-bold">{activePrintStudent.tahunajaran}</span>
                  </div>
                </div>
              </div>

              {/* Grades Table */}
              <table className="w-full text-left border-collapse border-2 border-black text-[11px] text-black mb-4">
                <thead className="bg-[#f8fafc] font-bold text-center">
                  <tr>
                    <th className="border border-black py-2 px-1 w-[5%] font-bold">NO</th>
                    <th className="border border-black py-2 px-3 text-left w-[35%] font-bold">MATA PELAJARAN</th>
                    <th className="border border-black py-2 px-1 w-[10%] font-bold">KKM</th>
                    <th className="border border-black py-2 px-1 w-[12%] font-bold">
                      <div>NILAI</div>
                      <div>ANGKA</div>
                    </th>
                    <th className="border border-black py-2 px-3 text-left w-[28%] font-bold">NILAI HURUF</th>
                    <th className="border border-black py-2 px-1 w-[10%] font-bold">PREDIKAT</th>
                  </tr>
                </thead>
                <tbody>
                  {activePrintGrades.map((g, idx) => (
                    <tr key={g.idpelajaran} className="text-center">
                      <td className="border border-black py-2 px-1 text-center">{idx + 1}</td>
                      <td className="border border-black py-2 px-3 text-left font-bold">{subjectMap[g.idpelajaran] || `ID: ${g.idpelajaran}`}</td>
                      <td className="border border-black py-2 px-1 text-center">{g.kkm}</td>
                      <td className="border border-black py-2 px-1 text-center font-bold">{g.nilaiakhir}</td>
                      <td className="border border-black py-2 px-3 text-left text-[10px] capitalize font-medium">{g.nilaihuruf || numberToWords(g.nilaiakhir)}</td>
                      <td className="border border-black py-2 px-1 text-center font-bold">{g.predikat}</td>
                    </tr>
                  ))}
                  {activePrintGrades.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border border-black py-6 text-center text-slate-400 italic font-bold">
                        Belum ada nilai akademik terdata untuk siswa ini.
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="border-2 border-black py-2 px-3 font-bold text-left uppercase">JUMLAH</td>
                    <td className="border-2 border-black py-2 px-1 text-center font-bold">{totalNilai}</td>
                    <td colSpan={2} className="border-2 border-black py-2 px-3"></td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border-2 border-black py-2 px-3 font-bold text-left uppercase">RATA-RATA</td>
                    <td className="border-2 border-black py-2 px-1 text-center font-bold">{averageNilaiStr}</td>
                    <td colSpan={2} className="border-2 border-black py-2 px-3"></td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border-2 border-black py-2 px-3 font-bold text-left uppercase">KUALIFIKASI NILAI</td>
                    <td colSpan={3} className="border-2 border-black py-2 px-3 text-center font-extrabold">{kualifikasiNilai}</td>
                  </tr>
                </tbody>
              </table>

              {/* Catatan Area */}
              <div className="border-2 border-black p-3 mt-4 min-h-[4rem]">
                <div className="font-bold text-[11px]">Catatan :</div>
                <div className="italic text-[11px] mt-1 text-black font-semibold">
                  {activePrintPersonality?.catatan || 'perhatikan untuk lebih berdisiplin'}
                </div>
              </div>

              {/* Promotion status */}
              <div className="mt-4 font-bold text-[11px]">
                Naik kelas / <span className="line-through">Tinggal kelas</span>
              </div>

              {/* Double charts container */}
              <div className="flex justify-between items-stretch gap-6 mt-4">
                {/* Left Side: Attendance & Personality tables */}
                <div className="w-[48%] space-y-4">
                  <div>
                    <div className="font-bold text-[11px] mb-1.5 font-bold">Kehadiran :</div>
                    <table className="w-full text-center border-collapse border-2 border-black text-[10px]">
                      <thead className="bg-[#407655] text-white">
                        <tr>
                          <th className="border border-black py-1 px-1">Sakit</th>
                          <th className="border border-black py-1 px-1">Ijin</th>
                          <th className="border border-black py-1 px-1">Alpha</th>
                        </tr>
                      </thead>
                      <tbody className="font-bold">
                        <tr>
                          <td className="border border-black py-1 px-1">
                            {activePrintAttendance ? activePrintAttendance.sakit : 0}
                          </td>
                          <td className="border border-black py-1 px-1">
                            {activePrintAttendance ? activePrintAttendance.izin : 0}
                          </td>
                          <td className="border border-black py-1 px-1">
                            {activePrintAttendance ? activePrintAttendance.alpa : 0}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div className="font-bold text-[11px] mb-1.5 font-bold">Kepribadian :</div>
                    <table className="w-full text-center border-collapse border-2 border-black text-[10px]">
                      <thead className="bg-[#407655] text-white">
                        <tr>
                          <th className="border border-black py-1 px-1">Ibadah</th>
                          <th className="border border-black py-1 px-1 font-bold">Akhlak</th>
                          <th className="border border-black py-1 px-1">Disiplin</th>
                        </tr>
                      </thead>
                      <tbody className="font-bold">
                        <tr>
                          <td className="border border-black py-1.5 px-1">{activePrintPersonality?.ibadah || 'B'}</td>
                          <td className="border border-black py-1.5 px-1">{activePrintPersonality?.akhlak || 'B'}</td>
                          <td className="border border-black py-1.5 px-1">{activePrintPersonality?.disiplin || 'B'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side: Keterangan rounded-box list */}
                <div className="w-[48%] border-2 border-[#417555] rounded-lg p-4 text-[10px] bg-white text-black flex flex-col justify-between">
                  <div className="text-center font-bold text-[#407655] pb-1.5 border-b-2 border-slate-200 uppercase tracking-wide">KETERANGAN</div>
                  <div className="space-y-2 font-medium mt-2">
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                      <span>89 – 100</span> <span className="font-bold">= A (Sangat Baik)</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                      <span>77 – 88</span> <span className="font-bold">= B (Baik)</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                      <span>65 – 76</span> <span className="font-bold">= C (Cukup)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤ 64</span> <span className="font-bold">= D (Perlu Bimbingan)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Signatures */}
            <div className="mt-8 text-[11px] pt-6 border-t border-dashed border-slate-300">
              <div className="flex justify-between">
                <div></div>
                <div className="text-center w-64 pr-2">
                  <p>Jakarta, 2 Juni 2026</p>
                  <p className="font-bold">Guru Terpadu {activePrintStudent.kelas}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 text-center mt-12 gap-4">
                <div className="flex flex-col justify-between min-h-[80px]">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Orang Tua Wali</p>
                  </div>
                  <p className="mt-10 font-bold text-black">.......................................................</p>
                </div>

                <div className="flex flex-col justify-end min-h-[80px]">
                  <p className="font-bold mb-6 text-center">Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <p className="font-extrabold underline mt-10 uppercase">SITI MUNIROH, S.Pd.I., M.M</p>
                </div>

                <div className="flex flex-col justify-end min-h-[80px]">
                  <div></div>
                  <p className="font-extrabold underline uppercase mt-10">FATRA TSAURAH NISA, S.Pd</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
