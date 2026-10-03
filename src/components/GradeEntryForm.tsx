import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, User, BookOpen, Calculator, Award, 
  MessageSquare, Save, History, BookMarked, Sparkles, CheckCircle2, ShieldEllipsis, 
  AlertCircle, Layers, FileText, CheckCircle
} from 'lucide-react';
import { Grade, Student, Subject, Teacher, PenilaianType } from '../types';
import { numberToWords, calculatePredicate } from '../data';

interface GradeEntryFormProps {
  students: Student[];
  subjects: Subject[];
  currentTeacher: Teacher;
  grades: Grade[];
  tahunAjaran?: string;
  onSaveGrade: (grade: Grade) => void;
  onDeleteGrade?: (nis: string, idpelajaran: number) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function GradeEntryForm({
  students,
  subjects,
  currentTeacher,
  grades,
  tahunAjaran,
  onSaveGrade,
  onDeleteGrade,
  addToast
}: GradeEntryFormProps) {
  // Jenis Penilaian: PAS (Akhir Semester) atau PTS (Tengah Semester)
  const [jenisPenilaian, setJenisPenilaian] = useState<PenilaianType>('PAS');

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedNis, setSelectedNis] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [kkm, setKkm] = useState<number>(75);
  
  // Specific PTS components
  const [nilaiPh, setNilaiPh] = useState<string>(''); // Nilai Formatif / Harian
  const [nilaiPts, setNilaiPts] = useState<string>(''); // Nilai Ujian Tengah Semester

  const [nilaiAkhir, setNilaiAkhir] = useState<string>('');
  const [nilaiHuruf, setNilaiHuruf] = useState('');
  const [predikat, setPredikat] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic lists
  const [classesList, setClassesList] = useState<string[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [studentGradesHistory, setStudentGradesHistory] = useState<Grade[]>([]);

  // 1. Load classes from students
  useEffect(() => {
    if (students && students.length > 0) {
      const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      setClassesList(uniqueClasses);
    }
  }, [students]);

  // 2. Filter students when class changes
  useEffect(() => {
    if (selectedClass) {
      const filtered = students.filter(s => s.kelas === selectedClass);
      setFilteredStudents(filtered);
      setSelectedNis(''); // Reset student selection
    } else {
      setFilteredStudents([]);
    }
  }, [selectedClass, students]);

  const currentStudentObj = students.find(s => String(s.nis).trim() === String(selectedNis).trim());

  // 3. Filter student's existing grades when selected NIP/NIS changes
  useEffect(() => {
    if (filteredStudents && selectedNis) {
      const activeTa = currentStudentObj?.tahunajaran || tahunAjaran;
      const history = grades.filter(g => 
        String(g.nis).trim() === String(selectedNis).trim() && 
        (!g.tahunajaran || !activeTa || g.tahunajaran === activeTa)
      );
      setStudentGradesHistory(history);
    } else {
      setStudentGradesHistory([]);
    }
  }, [selectedNis, grades, filteredStudents, tahunAjaran, currentStudentObj]);

  // 4. Load existing grade when subject is selected or jenisPenilaian changes
  useEffect(() => {
    if (selectedNis && selectedSubjectId) {
      const subjId = parseInt(selectedSubjectId);
      const existing = studentGradesHistory.find(g => 
        g.idpelajaran === subjId && 
        (jenisPenilaian === 'PTS' ? g.jenis === 'PTS' : (g.jenis === 'PAS' || !g.jenis))
      );

      if (existing) {
        setKkm(existing.kkm || 75);
        setNilaiAkhir(String(existing.nilaiakhir));
        setNilaiHuruf(existing.nilaihuruf || numberToWords(existing.nilaiakhir));
        setPredikat(existing.predikat || calculatePredicate(existing.nilaiakhir));
        setCatatan(existing.catatanguru || '');
        if (jenisPenilaian === 'PTS') {
          setNilaiPh(existing.nilai_ph !== undefined ? String(existing.nilai_ph) : '');
          setNilaiPts(existing.nilai_pts !== undefined ? String(existing.nilai_pts) : '');
        }
      } else {
        setNilaiAkhir('');
        setNilaiHuruf('');
        setPredikat('');
        setCatatan('');
        setNilaiPh('');
        setNilaiPts('');
      }
    }
  }, [selectedSubjectId, selectedNis, studentGradesHistory, jenisPenilaian]);

  // 5. Calculate auto properties for PAS
  const handleScoreChange = (val: string) => {
    setNilaiAkhir(val);
    const score = parseInt(val) || 0;
    if (score >= 0 && score <= 100) {
      setNilaiHuruf(numberToWords(score));
      setPredikat(calculatePredicate(score));
    } else {
      setNilaiHuruf('');
      setPredikat('');
    }
  };

  // 6. Calculate auto properties for PTS: (2 * PH + PTS) / 3
  const handlePhChange = (val: string) => {
    setNilaiPh(val);
    const phNum = parseInt(val) || 0;
    const ptsNum = parseInt(nilaiPts) || 0;
    if (val !== '' || nilaiPts !== '') {
      const calculatedAkhir = Math.round(((phNum * 2) + ptsNum) / 3);
      setNilaiAkhir(String(calculatedAkhir));
      setNilaiHuruf(numberToWords(calculatedAkhir));
      setPredikat(calculatePredicate(calculatedAkhir));
    } else {
      setNilaiAkhir('');
      setNilaiHuruf('');
      setPredikat('');
    }
  };

  const handlePtsChange = (val: string) => {
    setNilaiPts(val);
    const phNum = parseInt(nilaiPh) || 0;
    const ptsNum = parseInt(val) || 0;
    if (nilaiPh !== '' || val !== '') {
      const calculatedAkhir = Math.round(((phNum * 2) + ptsNum) / 3);
      setNilaiAkhir(String(calculatedAkhir));
      setNilaiHuruf(numberToWords(calculatedAkhir));
      setPredikat(calculatePredicate(calculatedAkhir));
    } else {
      setNilaiAkhir('');
      setNilaiHuruf('');
      setPredikat('');
    }
  };

  const subjectNameMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    subjects.forEach(s => { map[s.replid] = s.nama; });
    return map;
  }, [subjects]);

  // History filtered by active assessment mode
  const currentGradesForMode = studentGradesHistory.filter(g => 
    jenisPenilaian === 'PTS' ? g.jenis === 'PTS' : (g.jenis === 'PAS' || !g.jenis)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNis || !selectedSubjectId || nilaiAkhir === '') {
      addToast('Harap lengkapi semua isian wajib!', 'error');
      return;
    }

    const numericScore = parseInt(nilaiAkhir);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      addToast('Nilai akhir harus berupa angka antara 0 dan 100!', 'error');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      try {
        const itemPayload: Grade = {
          nis: selectedNis,
          idpelajaran: parseInt(selectedSubjectId),
          nipguru: currentTeacher.nip,
          kkm: kkm,
          nilai_ph: jenisPenilaian === 'PTS' ? (parseInt(nilaiPh) || 0) : undefined,
          nilai_pts: jenisPenilaian === 'PTS' ? (parseInt(nilaiPts) || 0) : undefined,
          nilaiakhir: numericScore,
          nilaihuruf: nilaiHuruf,
          predikat: predikat,
          catatanguru: catatan,
          jenis: jenisPenilaian,
          tahunajaran: currentStudentObj?.tahunajaran || tahunAjaran || '2025/2026'
        };

        // Invoke callback to persist locally & mock database sync
        onSaveGrade(itemPayload);
        
        setIsSubmitting(false);
        addToast(`✔️ Nilai rapor ${jenisPenilaian} siswa sukses disimpan!`, 'success');
        
        // Clear fields keeping select filters
        setNilaiAkhir('');
        setNilaiHuruf('');
        setPredikat('');
        setCatatan('');
        setNilaiPh('');
        setNilaiPts('');
      } catch (err) {
        setIsSubmitting(false);
        addToast('Gagal memproses penyimpanan rapor!', 'error');
      }
    }, 600);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Input Section */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        
        {/* Header with Mode Switcher (PAS vs PTS) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              jenisPenilaian === 'PTS' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <ClipboardCheck className="w-5.5 h-5.5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>📋 Form Input Nilai Rapor</span>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  jenisPenilaian === 'PTS' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {jenisPenilaian === 'PTS' ? 'Tengah Semester (PTS)' : 'Akhir Semester (PAS)'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Pilih mode penilaian, kelas, siswa, dan masukkan nilai</p>
            </div>
          </div>

          {/* Segmented Switcher Pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setJenisPenilaian('PAS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                jenisPenilaian === 'PAS'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PAS (Akhir)</span>
            </button>

            <button
              type="button"
              onClick={() => setJenisPenilaian('PTS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                jenisPenilaian === 'PTS'
                  ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>PTS (Tengah)</span>
            </button>
          </div>
        </div>

        {/* PTS Mode Info Banner */}
        {jenisPenilaian === 'PTS' && (
          <div className="mb-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block">Mode Input Rapor Sisipan (PTS) Aktif</span>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                Nilai Akhir PTS dihitung otomatis dengan bobot: <b>(2 × Nilai Harian/PH + Nilai Ujian PTS) ÷ 3</b>. 
                Data tersimpan di tabel khusus <i>kurikulum.pts</i> tanpa mengganggu nilai akhir semester.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Kelas & Siswa Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                1. Pilih Kelas <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium cursor-pointer"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classesList.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                2. Pilih Siswa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  disabled={!selectedClass}
                  value={selectedNis}
                  onChange={(e) => setSelectedNis(e.target.value)}
                  className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
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
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Mata Pelajaran */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              3. Pilih Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium cursor-pointer"
              >
                <option value="">-- Pilih Mapel --</option>
                {subjects.filter(sub => sub.aktif === 1).map((sub) => (
                  <option key={sub.replid} value={sub.replid}>
                    {sub.nama} ({sub.kode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teacher Info Auto Filled badge / label */}
          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldEllipsis className="w-4.5 h-4.5 text-slate-500" />
              <span className="text-slate-500">Guru Penguji:</span>
              <span className="font-bold text-slate-700">{currentTeacher.nama}</span>
            </div>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
              NIP {currentTeacher.nip}
            </span>
          </div>

          {/* KKM Kelulusan */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              KKM Kelulusan
            </label>
            <input
              type="number"
              value={kkm}
              onChange={(e) => setKkm(parseInt(e.target.value) || 75)}
              className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold"
              min="50"
              max="100"
            />
          </div>

          {/* KHUSUS PTS: INPUT NILAI PH & NILAI PTS */}
          {jenisPenilaian === 'PTS' ? (
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                  Komponen Nilai Tengah Semester (PTS)
                </span>
                <span className="text-[10px] bg-amber-200/60 text-amber-800 font-bold px-2 py-0.5 rounded">
                  Bobot 2:1
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Rata-rata Harian / Formatif (PH) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0 - 100"
                    value={nilaiPh}
                    onChange={(e) => handlePhChange(e.target.value)}
                    className="block w-full bg-white border border-amber-200 text-slate-850 py-2.5 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Tugas, kuis, & penilaian harian (Bobot 2x)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. Nilai Tes Ujian PTS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0 - 100"
                    value={nilaiPts}
                    onChange={(e) => handlePtsChange(e.target.value)}
                    className="block w-full bg-white border border-amber-200 text-slate-850 py-2.5 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Skor tes ujian tertulis PTS (Bobot 1x)</span>
                </div>
              </div>

              {/* Nilai Akhir Hasil Kalkulasi PTS */}
              <div className="pt-2 border-t border-amber-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-amber-950">Nilai Akhir Rapor PTS:</span>
                  <span className="text-[10px] text-amber-700 block">Kalkulasi otomatis dari pembobotan</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="0 - 100"
                    value={nilaiAkhir}
                    onChange={(e) => handleScoreChange(e.target.value)}
                    className="w-24 text-center bg-white border-2 border-amber-500 text-amber-900 py-1.5 px-2 rounded-xl text-lg font-black focus:outline-none"
                  />
                  {nilaiAkhir !== '' && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                      Predikat: {predikat}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* MODE PAS: INPUT NILAI AKHIR STANDAR */
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Nilai Akhir Rapor Terpadu (PAS) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="0 - 100"
                  value={nilaiAkhir}
                  onChange={(e) => handleScoreChange(e.target.value)}
                  className="block w-full bg-white border border-slate-200 text-slate-800 py-3 px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-extrabold text-lg placeholder:text-slate-300"
                />
              </div>
            </div>
          )}

          {/* Auto Properties Outputs (Predikat & Nilai Huruf) */}
          <AnimatePresence>
            {nilaiAkhir !== '' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`grid grid-cols-2 gap-4 p-4 rounded-xl border overflow-hidden ${
                  jenisPenilaian === 'PTS' ? 'bg-amber-50/40 border-amber-100' : 'bg-emerald-50/50 border-emerald-100'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Predikat Nilai</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Award className={`w-5 h-5 ${jenisPenilaian === 'PTS' ? 'text-amber-600' : 'text-emerald-600'}`} />
                    <span className={`text-xl font-extrabold ${jenisPenilaian === 'PTS' ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {predikat}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({parseInt(nilaiAkhir) >= kkm ? 'Lulus KKM' : 'Perlu Bimbingan'})
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nilai Huruf</span>
                  <span className="block text-xs font-semibold text-slate-700 mt-1 capitalize leading-relaxed">
                    "{nilaiHuruf}"
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Catatan Guru */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              Catatan Guru Pengampu (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Sangat aktif dalam kegiatan pembelajaran dan hafalan..."
              className="block w-full bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedNis || !selectedSubjectId || nilaiAkhir === ''}
            className={`w-full text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 ${
              jenisPenilaian === 'PTS'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100 disabled:opacity-50'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 disabled:opacity-50'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Menyimpan Nilai {jenisPenilaian}...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 text-white" />
                <span>Simpan Nilai {jenisPenilaian === 'PTS' ? 'Tengah Semester (PTS)' : 'Akhir Semester (PAS)'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* History Checklist Section (Kaca Spion / Riwayat Nilai) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm self-start">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">🔍 Riwayat Nilai Masuk</h3>
              <p className="text-[11px] text-slate-400">
                Arsip nilai siswa mode <span className="font-bold text-slate-700">{jenisPenilaian}</span>
              </p>
            </div>
          </div>
          {currentGradesForMode.length > 0 && (
            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full select-none ${
              jenisPenilaian === 'PTS' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
            }`}>
              {currentGradesForMode.length} Mapel ({jenisPenilaian})
            </span>
          )}
        </div>

        {selectedNis ? (
          <div>
            {/* Student profile snippet */}
            {currentStudentObj && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center justify-between border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Siswa Terpilih</span>
                  <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
                    {currentStudentObj.nama}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    NIS: {currentStudentObj.nis} • Kelas {currentStudentObj.kelas}
                  </span>
                </div>
                <div className={`p-2 rounded-lg shrink-0 ${jenisPenilaian === 'PTS' ? 'bg-amber-100/60' : 'bg-emerald-100/60'}`}>
                  <User className={`w-4 h-4 ${jenisPenilaian === 'PTS' ? 'text-amber-600' : 'text-emerald-600'}`} />
                </div>
              </div>
            )}

            {currentGradesForMode.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {currentGradesForMode.map((item, idx) => {
                  const mapelNama = subjectNameMap[item.idpelajaran] || `Mata Pelajaran ID: ${item.idpelajaran}`;
                  const pass = item.nilaiakhir >= item.kkm;
                  return (
                    <div 
                      key={`${item.idpelajaran}-${idx}`} 
                      className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-all flex flex-col gap-2 bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-700 block">
                              {mapelNama}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              item.jenis === 'PTS' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.jenis || 'PAS'}
                            </span>
                          </div>
                          
                          {item.jenis === 'PTS' && (item.nilai_ph !== undefined || item.nilai_pts !== undefined) ? (
                            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                              PH: <b className="text-slate-700">{item.nilai_ph || 0}</b> • PTS: <b className="text-slate-700">{item.nilai_pts || 0}</b> (KKM: {item.kkm})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              KKM Minimal: {item.kkm}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg block ${
                            pass 
                              ? (item.jenis === 'PTS' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700')
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {item.nilaiakhir} ({item.predikat})
                          </span>
                        </div>
                      </div>
                      
                      {item.catatanguru && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50/50 p-2 rounded border border-slate-50">
                          "{item.catatanguru}"
                        </p>
                      )}

                      {onDeleteGrade && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteGrade(item.nis, item.idpelajaran);
                              addToast(`✔️ Nilai ${item.jenis || 'PAS'} berhasil dihapus`, 'success');
                            }}
                            className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 cursor-pointer self-end"
                          >
                            Hapus entry
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl px-4 border border-dashed border-slate-200">
                <BookMarked className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-600">
                  Belum ada nilai {jenisPenilaian} terdata
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Siswa ini belum memiliki nilai untuk mode {jenisPenilaian} di tahun ajaran aktif. Silakan isi form di sebelah kiri.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-xl px-4 border border-dashed border-slate-200">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h4 className="text-xs font-bold text-slate-700">Silakan Pilih Siswa</h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
              Pilih kelas dan siswa terlebih dahulu untuk menayangkan rekam riwayat nilai masuk.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
