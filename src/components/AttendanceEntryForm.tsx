import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, Save, Calendar, GraduationCap, Clock, FileText, 
  Trash2, Edit3, UserX, HeartPulse, RefreshCw, Sparkles, Star
} from 'lucide-react';
import { Attendance, Student } from '../types';

interface AttendanceEntryFormProps {
  students: Student[];
  attendances: Attendance[];
  onSaveAttendance: (attendance: Attendance) => Promise<void>;
  onDeleteAttendance: (nis: string, replid?: number) => Promise<void>;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function AttendanceEntryForm({
  students,
  attendances,
  onSaveAttendance,
  onDeleteAttendance,
  addToast
}: AttendanceEntryFormProps) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedNis, setSelectedNis] = useState('');
  const [idSemester, setIdSemester] = useState<number>(34); // 34 for Semester 1 (Ganjil)
  const [tahunAjaran, setTahunAjaran] = useState('');
  const [sakit, setSakit] = useState<number>(0);
  const [izin, setIzin] = useState<number>(0);
  const [alpa, setAlpa] = useState<number>(0);
  const [catatan, setCatatan] = useState('');
  const [editingReplid, setEditingReplid] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown list states
  const [classesList, setClassesList] = useState<string[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // 1. Compile list of classes from students
  useEffect(() => {
    if (students && students.length > 0) {
      const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).sort();
      setClassesList(uniqueClasses);
    }
  }, [students]);

  // 2. Filter student dropdown on class selection
  useEffect(() => {
    if (selectedClass) {
      const filtered = students.filter(s => s.kelas === selectedClass);
      setFilteredStudents(filtered);
      // Reset selected student and corresponding states except we are in edit mode
      if (!editingReplid) {
        setSelectedNis('');
        setTahunAjaran('');
        setSakit(0);
        setIzin(0);
        setAlpa(0);
        setCatatan('');
      }
    } else {
      setFilteredStudents([]);
    }
  }, [selectedClass, students, editingReplid]);

  // 3. Pre-fill states for existing attendance records
  useEffect(() => {
    if (selectedNis && !editingReplid) {
      const student = students.find(s => s.nis === selectedNis);
      if (student) {
        setTahunAjaran(student.tahunajaran || '2025/2026');
        
        // Find existing attendance for this student and semester
        const existing = attendances.find(a => a.nis === selectedNis && a.idsemester === idSemester);
        if (existing) {
          setSakit(existing.sakit);
          setIzin(existing.izin);
          setAlpa(existing.alpa);
          setCatatan(existing.catatan);
          setEditingReplid(existing.replid);
        } else {
          setSakit(0);
          setIzin(0);
          setAlpa(0);
          setCatatan('');
          setEditingReplid(undefined);
        }
      }
    }
  }, [selectedNis, idSemester, students, attendances, editingReplid]);

  // Handle Edit Trigger from list
  const handleEditClick = (item: Attendance) => {
    const student = students.find(s => s.nis === item.nis);
    if (student) {
      setSelectedClass(student.kelas);
      setSelectedNis(item.nis);
      setIdSemester(item.idsemester);
      setTahunAjaran(item.tahunajaran);
      setSakit(item.sakit);
      setIzin(item.izin);
      setAlpa(item.alpa);
      setCatatan(item.catatan);
      setEditingReplid(item.replid);
      addToast(`✏️ Mode Edit: Mengedit kehadiran untuk ${student.nama}`, 'success');
    }
  };

  const handleIncrement = (type: 'sakit' | 'izin' | 'alpa') => {
    if (type === 'sakit') setSakit(prev => prev + 1);
    if (type === 'izin') setIzin(prev => prev + 1);
    if (type === 'alpa') setAlpa(prev => prev + 1);
  };

  const handleDecrement = (type: 'sakit' | 'izin' | 'alpa') => {
    if (type === 'sakit') setSakit(prev => Math.max(0, prev - 1));
    if (type === 'izin') setIzin(prev => Math.max(0, prev - 1));
    if (type === 'alpa') setAlpa(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNis) {
      addToast('Harap pilih siswa terlebih dahulu!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Attendance = {
        replid: editingReplid,
        nis: selectedNis,
        idsemester: idSemester,
        tahunajaran: tahunAjaran || '2025/2026',
        sakit,
        izin,
        alpa,
        catatan
      };

      await onSaveAttendance(payload);
      addToast(
        editingReplid 
          ? '✔️ Berhasil memperbarui data kehadiran siswa!' 
          : '✔️ Berhasil menyimpan data kehadiran siswa!', 
        'success'
      );
      
      // Clear values but keep class selection
      setSelectedNis('');
      setSakit(0);
      setIzin(0);
      setAlpa(0);
      setCatatan('');
      setEditingReplid(undefined);
    } catch (err) {
      addToast('Gagal memproses data kehadiran!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditingReplid(undefined);
    setSelectedNis('');
    setSakit(0);
    setIzin(0);
    setAlpa(0);
    setCatatan('');
  };

  const getStudentName = (nis: string) => {
    const s = students.find(stud => stud.nis === nis);
    return s ? s.nama : 'Siswa Tidak Diketahui';
  };

  const getStudentClass = (nis: string) => {
    const s = students.find(stud => stud.nis === nis);
    return s ? `Kelas ${s.kelas}` : '-';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      {/* Forms Section */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <UserCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold text-slate-800">📋 Absensi & Kehadiran</h2>
              {editingReplid && (
                <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  Mode Edit
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Isi rekap ketidakhadiran (Sakit, Izin, dan Alpa) per siswa</p>
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
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  if (editingReplid) cancelEdit();
                }}
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

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Pilih Siswa <span className="text-rose-500">*</span>
              </label>
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

          {/* Academic Semester Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Semester Akademik
              </label>
              <select
                value={idSemester}
                onChange={(e) => {
                  setIdSemester(parseInt(e.target.value) || 34);
                  if (selectedNis && editingReplid) setEditingReplid(undefined);
                }}
                className="block w-full bg-white border border-slate-200 text-slate-800 py-2 px-3 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

          {/* ATTENDANCE COUNTERS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>🏷️ Input Ketidakhadiran (Hari)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Sakit (Sick) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between items-center text-center gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm">
                    🤢
                  </div>
                  <span className="text-xs font-bold text-slate-700">Sakit (S)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecrement('sakit')}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center transition-all cursor-pointer text-sm shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={sakit}
                    onChange={(e) => setSakit(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-10 text-center text-sm font-extrabold border-b-2 border-slate-200 focus:outline-none focus:border-amber-500 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrement('sakit')}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center transition-all cursor-pointer text-sm shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Izin (Permits) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between items-center text-center gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center text-sm">
                    ✉️
                  </div>
                  <span className="text-xs font-bold text-slate-700">Izin (I)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecrement('izin')}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center transition-all cursor-pointer text-sm shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={izin}
                    onChange={(e) => setIzin(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-10 text-center text-sm font-extrabold border-b-2 border-slate-200 focus:outline-none focus:border-sky-500 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrement('izin')}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center transition-all cursor-pointer text-sm shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Alpa (Absent) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between items-center text-center gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-sm">
                    🚫
                  </div>
                  <span className="text-xs font-bold text-slate-700">Alpa (A)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecrement('alpa')}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center transition-all cursor-pointer text-sm shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={alpa}
                    onChange={(e) => setAlpa(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-10 text-center text-sm font-extrabold border-b-2 border-slate-200 focus:outline-none focus:border-rose-500 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrement('alpa')}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center transition-all cursor-pointer text-sm shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Description Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              Catatan atau Keterangan Absensi
            </label>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Siswa jarang masuk karena alasan keluarga, sakit cacar selama 5 hari..."
              className="block w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Bottom Actions Form */}
          <div className="flex gap-3">
            {editingReplid && (
              <button
                type="button"
                onClick={cancelEdit}
                className="py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                Batal Edit
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !selectedNis}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Menyimpan Absensi...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 text-emerald-100" />
                  <span>{editingReplid ? 'Simpan Perubahan Kehadiran' : 'Simpan Kehadiran Siswa'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Recap List Section */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm self-start">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">🏅 Rekap Kehadiran Siswa</h3>
              <p className="text-[10px] text-slate-400">Total data tercatat di database</p>
            </div>
          </div>
          {attendances.length > 0 && (
            <span className="bg-emerald-50 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full select-none border border-emerald-100">
              {attendances.length} Berkas
            </span>
          )}
        </div>

        {attendances.length > 0 ? (
          <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
            {attendances.map((item, idx) => (
              <div 
                key={`${item.replid || 'att'}-${idx}`} 
                className="border border-slate-100 rounded-xl p-3.5 hover:bg-slate-50/70 transition-all flex flex-col gap-2.5 bg-white shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {getStudentName(item.nis)}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">
                      NIS: {item.nis} • {getStudentClass(item.nis)}
                    </span>
                    <span className="inline-block mt-1 text-[8.5px] px-1.5 py-0.5 font-bold rounded bg-slate-100 text-slate-500 uppercase">
                      Semester {item.idsemester === 34 ? '1 (Ganjil)' : '2 (Genap)'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-all cursor-pointer"
                      title="Edit Kehadiran"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Hapus data kehadiran untuk murid ${getStudentName(item.nis)}?`)) {
                          try {
                            await onDeleteAttendance(item.nis, item.replid);
                            addToast('✔️ Data absensi sukses dibuang dari rekap!', 'success');
                          } catch (err) {
                            addToast('Gagal menghapus data absensi!', 'error');
                          }
                        }
                      }}
                      className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-all cursor-pointer"
                      title="Hapus Kehadiran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-black">
                  <div className="p-1.5 border border-amber-100 bg-amber-50/30 rounded-lg text-amber-800">
                    <p className="text-[8.5px] font-bold opacity-75 uppercase">Sakit</p>
                    <p className="text-sm mt-0.5">{item.sakit} hari</p>
                  </div>
                  <div className="p-1.5 border border-sky-100 bg-sky-50/30 rounded-lg text-sky-800">
                    <p className="text-[8.5px] font-bold opacity-75 uppercase">Izin</p>
                    <p className="text-sm mt-0.5">{item.izin} hari</p>
                  </div>
                  <div className="p-1.5 border border-rose-100 bg-rose-50/30 rounded-lg text-rose-800">
                    <p className="text-[8.5px] font-bold opacity-75 uppercase">Alpa</p>
                    <p className="text-sm mt-0.5">{item.alpa} hari</p>
                  </div>
                </div>

                {item.catatan && (
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-[10px] text-slate-500 leading-relaxed italic">
                    "{item.catatan}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-xl px-4 border border-dashed border-slate-200">
            <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-600">Absensi nihil</h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
              Belum ada siswa yang diinputkan data kehadirannya. Masukkan kelas dan nama siswa di sebelah kiri untuk merekap!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
