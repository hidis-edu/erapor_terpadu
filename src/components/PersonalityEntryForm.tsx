import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HeartHandshake, HelpCircle, Save, Award, Calendar, BookOpen, 
  Smile, Heart, ShieldCheck, Activity, GraduationCap
} from 'lucide-react';
import { Personality, Student } from '../types';

interface PersonalityEntryFormProps {
  students: Student[];
  personalities: Personality[];
  onSavePersonality: (personality: Personality) => void;
  onDeletePersonality?: (nis: string) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function PersonalityEntryForm({
  students,
  personalities,
  onSavePersonality,
  onDeletePersonality,
  addToast
}: PersonalityEntryFormProps) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedNis, setSelectedNis] = useState('');
  const [idSemester, setIdSemester] = useState<number>(34); // 34 for Semester 1 (Ganjil)
  const [tahunAjaran, setTahunAjaran] = useState('');
  const [ibadah, setIbadah] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [akhlak, setAkhlak] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [disiplin, setDisiplin] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic dropdown utilities
  const [classesList, setClassesList] = useState<string[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

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
      setSelectedNis('');
      setTahunAjaran('');
    } else {
      setFilteredStudents([]);
    }
  }, [selectedClass, students]);

  // 3. Populate academic year automatically
  useEffect(() => {
    if (selectedNis) {
      const student = students.find(s => s.nis === selectedNis);
      if (student) {
        setTahunAjaran(student.tahunajaran || '2025/2026');
        
        // If they already have saved personality, load it to prefill form for updates
        const existing = personalities.find(p => p.nis === selectedNis);
        if (existing) {
          setIbadah(existing.ibadah);
          setAkhlak(existing.akhlak);
          setDisiplin(existing.disiplin);
          setCatatan(existing.catatan);
        } else {
          setIbadah('B');
          setAkhlak('B');
          setDisiplin('B');
          setCatatan('');
        }
      }
    }
  }, [selectedNis, students, personalities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNis) {
      addToast('Harap pilih siswa terlebih dahulu!', 'error');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate server post save
    setTimeout(() => {
      try {
        const payload: Personality = {
          nis: selectedNis,
          idsemester: idSemester,
          ibadah,
          akhlak,
          disiplin,
          catatan
        };

        // Call parent update
        onSavePersonality(payload);

        setIsSubmitting(false);
        addToast('✔️ Data Penilaian Kepribadian / Sikap sukses disimpan!', 'success');
        
        // Reset only scores not layout selections
        setCatatan('');
      } catch (err) {
        setIsSubmitting(false);
        addToast('Gagal memproses pengisian sikap!', 'error');
      }
    }, 1000);
  };

  // Map student name for evaluations already handled
  const getStudentName = (nis: string) => {
    const s = students.find(stud => stud.nis === nis);
    return s ? s.nama : 'Tidak diketahui';
  };

  const getStudentClass = (nis: string) => {
    const s = students.find(stud => stud.nis === nis);
    return s ? `Kelas ${s.kelas}` : '-';
  };

  const scoreBadge = (score: string) => {
    switch (score) {
      case 'A': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'B': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'C': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Forms Section */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
            <HeartHandshake className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">🌟 Form Kepribadian (Sikap)</h2>
            <p className="text-xs text-slate-400">Khusus Wali Kelas / Kepala Pembelajaran</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Class and Student selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Pilih Kelas <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-medium"
              >
                <option value="">-- Pilih Kelas --</option>
                {classesList.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Pilih Siswa <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={!selectedClass}
                value={selectedNis}
                onChange={(e) => setSelectedNis(e.target.value)}
                className="block w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-medium disabled:opacity-55 disabled:cursor-not-allowed"
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

          {/* Academic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Semester Akademik
              </label>
              <select
                value={idSemester}
                onChange={(e) => setIdSemester(parseInt(e.target.value) || 34)}
                className="block w-full bg-white border border-slate-200 text-slate-800 py-2 px-3 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={34}>1 (Ganjil)</option>
                <option value={35}>2 (Genap)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                Tahun Ajaran
              </label>
              <input
                type="text"
                readOnly
                value={tahunAjaran || '---'}
                className="block w-full bg-slate-100 border border-slate-200 text-slate-500 py-2 px-3 rounded-lg text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* SIKAP GRADINGS CARDS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              🏷️ Penilaian Sikap Spiritual & Sosial
            </h3>

            {/* Ibadah */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/60 rounded-xl border border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                  🕌
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Ibadah Keagamaan</h4>
                  <p className="text-[10px] text-slate-400">Kedisiplinan ibadah harian & hafalan doa</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {['A', 'B', 'C', 'D'].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setIbadah(score as any)}
                    className={`w-9 h-9 text-xs font-black rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      ibadah === score 
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* Akhlak */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/60 rounded-xl border border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center font-bold">
                  🌸
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Perilaku (Akhlakul Karimah)</h4>
                  <p className="text-[10px] text-slate-400">Sopan santun kepada guru dan menyayangi sesama</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {['A', 'B', 'C', 'D'].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setAkhlak(score as any)}
                    className={`w-9 h-9 text-xs font-black rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      akhlak === score 
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* Disiplin */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/60 rounded-xl border border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                  ⏰
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tingkat Kedisplinan</h4>
                  <p className="text-[10px] text-slate-400">Ketepatan waktu masuk kelas & kerapihan berpakaian</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {['A', 'B', 'C', 'D'].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setDisiplin(score as any)}
                    className={`w-9 h-9 text-xs font-black rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      disiplin === score 
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Catatan Wali Kelas */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              Catatan Wali Kelas
            </label>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Sangat baik dalam keaktifan sekolah, pertahankan prestasimu dan rajinlah beribadah..."
              className="block w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-medium placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedNis}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-md cursor-pointer shadow-sky-100 hover:shadow-sky-200 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Menyimpan Kepribadian...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 text-sky-100" />
                <span>Simpan Kepribadian Siswa</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recap List Section */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm self-start">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
              <Smile className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">🏅 Rekap Sikap Siswa</h3>
              <p className="text-[10px] text-slate-400">Kumpulan penilaian yang telah dimasukkan</p>
            </div>
          </div>
          {personalities.length > 0 && (
            <span className="bg-sky-50 text-sky-800 text-xs font-black px-2.5 py-0.5 rounded-full select-none border border-sky-100">
              {personalities.length} Siswa
            </span>
          )}
        </div>

        {personalities.length > 0 ? (
          <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
            {personalities.map((item) => (
              <div 
                key={item.nis} 
                className="border border-slate-100 rounded-xl p-3.5 hover:bg-slate-50 transition-all flex flex-col gap-2.5 bg-white"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {getStudentName(item.nis)}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">
                      NIS: {item.nis} • {getStudentClass(item.nis)}
                    </span>
                  </div>
                  {onDeletePersonality && (
                    <button
                      onClick={() => {
                        onDeletePersonality(item.nis);
                        addToast('✔️ Penilaian sikap berhasil dihapus.', 'success');
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black">
                  <div className={`p-1.5 border rounded-lg ${scoreBadge(item.ibadah)}`}>
                    <p className="text-[9px] font-bold opacity-60 uppercase">Ibadah</p>
                    <p className="text-sm mt-0.5">{item.ibadah}</p>
                  </div>
                  <div className={`p-1.5 border rounded-lg ${scoreBadge(item.akhlak)}`}>
                    <p className="text-[9px] font-bold opacity-60 uppercase">Akhlak</p>
                    <p className="text-sm mt-0.5">{item.akhlak}</p>
                  </div>
                  <div className={`p-1.5 border rounded-lg ${scoreBadge(item.disiplin)}`}>
                    <p className="text-[9px] font-bold opacity-60 uppercase">Disiplin</p>
                    <p className="text-sm mt-0.5">{item.disiplin}</p>
                  </div>
                </div>

                {item.catatan && (
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-[10.5px] text-slate-500 leading-relaxed italic">
                    "{item.catatan}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-xl px-4 border border-dashed border-slate-200">
            <Heart className="w-8 h-8 text-rose-200 mx-auto mb-2 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-600">Alangkah sepi rasa hati...</h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
              Belum ada siswa yang diberikan penilaian kepribadian sikap sejauh ini. Silakan mulai menilai di sebelah kiri!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
