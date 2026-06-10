import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, User, BookOpen, Calculator, Award, 
  MessageSquare, Save, History, BookMarked, Sparkles, CheckCircle2, ShieldEllipsis, AlertCircle
} from 'lucide-react';
import { Grade, Student, Subject, Teacher } from '../types';
import { numberToWords, calculatePredicate } from '../data';

interface GradeEntryFormProps {
  students: Student[];
  subjects: Subject[];
  currentTeacher: Teacher;
  grades: Grade[];
  onSaveGrade: (grade: Grade) => void;
  onDeleteGrade?: (nis: string, idpelajaran: number) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function GradeEntryForm({
  students,
  subjects,
  currentTeacher,
  grades,
  onSaveGrade,
  onDeleteGrade,
  addToast
}: GradeEntryFormProps) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedNis, setSelectedNis] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [kkm, setKkm] = useState<number>(75);
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
      const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).sort();
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

  // 3. Filter student's existing grades when selected NIP/NIS changes
  useEffect(() => {
    if (filteredStudents && selectedNis) {
      const history = grades.filter(g => g.nis === selectedNis);
      setStudentGradesHistory(history);
    } else {
      setStudentGradesHistory([]);
    }
  }, [selectedNis, grades, filteredStudents]);

  // 4. Calculate auto properties
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

  const currentStudentObj = students.find(s => s.nis === selectedNis);
  const subjectNameMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    subjects.forEach(s => { map[s.replid] = s.nama; });
    return map;
  }, [subjects]);

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

    // Simulate API save post request delay
    setTimeout(() => {
      try {
        const itemPayload: Grade = {
          nis: selectedNis,
          idpelajaran: parseInt(selectedSubjectId),
          nipguru: currentTeacher.nip,
          kkm: kkm,
          nilaiakhir: numericScore,
          nilaihuruf: nilaiHuruf,
          predikat: predikat,
          catatanguru: catatan
        };

        // Invoke callback to persist locally & mock database sync
        onSaveGrade(itemPayload);
        
        setIsSubmitting(false);
        addToast('✔️ Nilai raport siswa sukses disimpan!', 'success');
        
        // Clear fields keeping select filters
        setNilaiAkhir('');
        setNilaiHuruf('');
        setPredikat('');
        setCatatan('');
      } catch (err) {
        setIsSubmitting(false);
        addToast('Gagal memproses penyimpanan rapor!', 'error');
      }
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Input Section */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <ClipboardCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">📋 Form Input Nilai Rapor</h2>
            <p className="text-xs text-slate-400">Silakan pilih kelas, siswa, dan masukkan nilai mata pelajaran</p>
          </div>
        </div>

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
                  className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
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
                  className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium disabled:opacity-55 disabled:cursor-not-allowed"
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
                className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
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
              NIP AUTOFILLED
            </span>
          </div>

          {/* Score Calculation Section with KKM and Nilai Akhir */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                KKM Kelulusan
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={kkm}
                  onChange={(e) => setKkm(parseInt(e.target.value) || 75)}
                  className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold"
                  min="50"
                  max="100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Nilai Akhir <span className="text-rose-500">*</span>
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
          </div>

          {/* Auto Properties Outputs */}
          <AnimatePresence>
            {nilaiAkhir !== '' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 overflow-hidden"
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Predikat</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <span className="text-xl font-extrabold text-emerald-800">
                      {predikat}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({parseInt(nilaiAkhir) >= kkm ? 'Lulus KKM' : 'Perlu Remedial'})
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
              Catatan Guru (Opsional)
            </label>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Siswa sangat aktif, perlu bimbingan di tajwid..."
              className="block w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedNis || !selectedSubjectId || nilaiAkhir === ''}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-100 hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Menyimpan Nilai...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 text-emerald-100" />
                <span>Simpan Nilai Siswa</span>
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
              <p className="text-[11px] text-slate-400">Arsip input rapor terpadu kelas terpilih</p>
            </div>
          </div>
          {studentGradesHistory.length > 0 && (
            <span className="bg-emerald-50 text-emerald-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full select-none">
              {studentGradesHistory.length} Mapel
            </span>
          )}
        </div>

        {selectedNis ? (
          <div>
            {/* Student profile snippet */}
            {currentStudentObj && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center justify-between border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ditinjau</span>
                  <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
                    {currentStudentObj.nama}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">NIS: {currentStudentObj.nis}</span>
                </div>
                <div className="bg-emerald-100/60 p-2 rounded-lg shrink-0">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
            )}

            {studentGradesHistory.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {studentGradesHistory.map((item) => {
                  const mapelNama = subjectNameMap[item.idpelajaran] || `Mata Pelajaran ID: ${item.idpelajaran}`;
                  const pass = item.nilaiakhir >= item.kkm;
                  return (
                    <div 
                      key={item.idpelajaran} 
                      className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-all flex flex-col gap-2 bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 block">
                            {mapelNama}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Kriteria Minimal: {item.kkm}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg block ${
                            pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
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
                            onClick={() => {
                              onDeleteGrade(item.nis, item.idpelajaran);
                              addToast('✔️ Nilai berhasil dinonaktifkan / dihapus', 'success');
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
                <h4 className="text-xs font-bold text-slate-600">Belum ada nilai terdata</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Siswa ini belum memiliki nilai untuk mata pelajaran apa pun di database lokal Anda.
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
