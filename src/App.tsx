import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, LayoutDashboard, ClipboardCopy, HeartHandshake, 
  FolderDown, LogOut, Loader2, BellRing, Sparkles, Star, UserCheck
} from 'lucide-react';
import { Grade, Personality, Student, Subject, Teacher } from './types';
import { 
  DEFAULT_SUBJECTS, FALLBACK_STUDENTS, INITIAL_GRADES, INITIAL_PERSONALITIES 
} from './data';
import LoginScreen from './components/LoginScreen';
import DashboardOverview from './components/DashboardOverview';
import GradeEntryForm from './components/GradeEntryForm';
import PersonalityEntryForm from './components/PersonalityEntryForm';
import ReportsCenter from './components/ReportsCenter';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isLoadingPersonalities, setIsLoadingPersonalities] = useState(false);
  const [subjects] = useState<Subject[]>(DEFAULT_SUBJECTS);

  // Persistence collections
  const [grades, setGrades] = useState<Grade[]>([]);
  const [personalities, setPersonalities] = useState<Personality[]>([]);

  // Notification Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add toast helper
  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // 1. Initial mounting checks & LocalStorage loaders
  useEffect(() => {
    // Acknowledge cached teacher session
    const storedTeacher = localStorage.getItem('dataGuru');
    if (storedTeacher) {
      try {
        setCurrentTeacher(JSON.parse(storedTeacher));
      } catch (e) {
        console.error('Failed to parse cached teacher credentials', e);
      }
    }

    // Load Grades list
    const storedGrades = localStorage.getItem('grades');
    if (storedGrades) {
      try {
        const parsedGrades: Grade[] = JSON.parse(storedGrades);
        setGrades(parsedGrades);
      } catch (e) {
        setGrades([]);
      }
    } else {
      setGrades([]);
    }

    // Load Personalities list
    const storedPersonalities = localStorage.getItem('personalities');
    if (storedPersonalities) {
      try {
        const parsedPers: Personality[] = JSON.parse(storedPersonalities);
        setPersonalities(parsedPers);
      } catch (e) {
        setPersonalities([]);
      }
    } else {
      setPersonalities([]);
    }

    setIsLoading(false);
  }, []);

  // 2. Load API resources (Siswa & Grades) asynchronously
  useEffect(() => {
    async function loadStudentsApi() {
      setIsLoadingStudents(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
        const response = await fetch(`${apiBaseUrl}/api/jbsakad/siswa?tahunajaran=2025/2026`);
        if (response.ok) {
          const list = await response.json();
          if (Array.isArray(list) && list.length > 0) {
            setStudents(list);
            setIsLoadingStudents(false);
            return;
          }
        }
      } catch (e) {
        console.warn('API down/cors issue. Using robust local fallback students dataset.', e);
      }
      setStudents(FALLBACK_STUDENTS);
      setIsLoadingStudents(false);
    }

    async function loadGradesApi() {
      setIsLoadingGrades(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
        const response = await fetch(`${apiBaseUrl}/api/rapor/terpadu`);
        if (response.ok) {
          const result = await response.json();
          if (result && result.status === 'sukses' && Array.isArray(result.data)) {
            const apiGrades: Grade[] = result.data.map((item: any) => ({
              nis: String(item.nis),
              idpelajaran: Number(item.idpelajaran),
              nipguru: String(item.nipguru),
              kkm: Number(item.kkm),
              nilaiakhir: Number(item.nilaiakhir),
              nilaihuruf: String(item.nilaihuruf),
              predikat: String(item.predikat),
              catatanguru: String(item.catatanguru || '')
            }));

            // Overwrite state and local storage with the real-time server dataset
            setGrades(apiGrades);
            localStorage.setItem('grades', JSON.stringify(apiGrades));
            setIsLoadingGrades(false);
            return;
          }
        }
      } catch (e) {
        console.warn('API down/cors issue for Grades. Using local fallbacks.', e);
      }
      setIsLoadingGrades(false);
    }

    async function loadPersonalitiesApi() {
      setIsLoadingPersonalities(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
        const response = await fetch(`${apiBaseUrl}/api/rapor/kepribadian`);
        if (response.ok) {
          const result = await response.json();
          if (result && result.success === true && Array.isArray(result.data)) {
            const apiPersonalities: Personality[] = result.data.map((item: any) => ({
              nis: String(item.nis),
              idsemester: Number(item.idsemester || 34),
              ibadah: item.ibadah || 'B',
              akhlak: item.akhlak || 'B',
              disiplin: item.disiplin || 'B',
              catatan: String(item.catatan || ''),
              createdAt: item.ts || ''
            }));

            // Overwrite state and local storage with the real-time server dataset
            setPersonalities(apiPersonalities);
            localStorage.setItem('personalities', JSON.stringify(apiPersonalities));
            setIsLoadingPersonalities(false);
            return;
          }
        }
      } catch (e) {
        console.warn('API down/cors issue for Personalities. Using local fallbacks.', e);
      }
      setIsLoadingPersonalities(false);
    }

    loadStudentsApi();
    loadGradesApi();
    loadPersonalitiesApi();
  }, []);

  // 3. Database operations
  const handleSaveGrade = async (newGrade: Grade) => {
    // Check if grade for this specific subject and student already exists to update it
    setGrades((prev) => {
      const idx = prev.findIndex(g => g.nis === newGrade.nis && g.idpelajaran === newGrade.idpelajaran);
      let updated = [...prev];
      if (idx !== -1) {
        updated[idx] = newGrade;
      } else {
        updated.push(newGrade);
      }
      localStorage.setItem('grades', JSON.stringify(updated));
      return updated;
    });

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      await fetch(`${apiBaseUrl}/api/rapor/terpadu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: newGrade.nis,
          idpelajaran: newGrade.idpelajaran,
          nipguru: newGrade.nipguru,
          kkm: newGrade.kkm,
          nilaiakhir: newGrade.nilaiakhir,
          nilaihuruf: newGrade.nilaihuruf,
          predikat: newGrade.predikat,
          catatanguru: newGrade.catatanguru
        })
      });
    } catch (e) {
      console.warn('API error synchronising grade save', e);
    }
  };

  const handleDeleteGrade = async (nis: string, idpelajaran: number) => {
    setGrades((prev) => {
      const filtered = prev.filter(g => !(g.nis === nis && g.idpelajaran === idpelajaran));
      localStorage.setItem('grades', JSON.stringify(filtered));
      return filtered;
    });

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      await fetch(`${apiBaseUrl}/api/rapor/terpadu?nis=${nis}&idpelajaran=${idpelajaran}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('API error synchronising grade deletion', e);
    }
  };

  const handleSavePersonality = async (newPersonality: Personality) => {
    setPersonalities((prev) => {
      const idx = prev.findIndex(p => p.nis === newPersonality.nis);
      let updated = [...prev];
      if (idx !== -1) {
        updated[idx] = newPersonality;
      } else {
        updated.push(newPersonality);
      }
      localStorage.setItem('personalities', JSON.stringify(updated));
      return updated;
    });

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      await fetch(`${apiBaseUrl}/api/rapor/kepribadian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: newPersonality.nis,
          idsemester: newPersonality.idsemester,
          ibadah: newPersonality.ibadah,
          akhlak: newPersonality.akhlak,
          disiplin: newPersonality.disiplin,
          catatan: newPersonality.catatan
        })
      });
    } catch (e) {
      console.warn('API error synchronising personality save', e);
    }
  };

  const handleDeletePersonality = async (nis: string) => {
    setPersonalities((prev) => {
      const filtered = prev.filter(p => p.nis !== nis);
      localStorage.setItem('personalities', JSON.stringify(filtered));
      return filtered;
    });

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fastify.nganjuk.net';
      await fetch(`${apiBaseUrl}/api/rapor/kepribadian?nis=${nis}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('API error synchronising personality deletion', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dataGuru');
    setCurrentTeacher(null);
    addToast('Sampun medal! Anda telah keluar dari sistem.', 'success');
  };

  const handleLoginSuccess = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    addToast(`Sugeng rawuh! Login sukses sebagai ${teacher.nama}`, 'success');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold">Memuat portal akademik...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show portal entryway
  if (!currentTeacher) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        {/* Floating notifications */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className={`p-4 rounded-xl shadow-lg pointer-events-auto border flex items-start gap-3 bg-white ${
                  toast.type === 'success' ? 'border-emerald-100 text-slate-800' : 'border-rose-100 text-slate-800'
                }`}
              >
                <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {toast.type === 'success' ? <UserCheck className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
                </div>
                <div className="text-xs font-semibold">{toast.message}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR MAIN MENU (no-print guarantees pure outputs on printouts) */}
      <aside className="no-print w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-emerald-500 text-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <School className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm leading-tight text-white tracking-tight">SD ISLAM</h2>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                Hidayatul Islamiyah
              </span>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* MENU LIST NAVIGATION */}
          <div className="space-y-2">
            <div className="text-slate-500 text-[10px] font-bold uppercase px-3 mb-2 tracking-widest">
              Menu Utama
            </div>
            <nav className="space-y-1.5">
              {[
                { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
                { id: 'grade', label: 'Input Nilai Rapor', icon: ClipboardCopy },
                { id: 'personality', label: 'Kepribadian Siswa', icon: HeartHandshake },
                { id: 'reports', label: 'Laporan & Cetak', icon: FolderDown }
              ].map((menuItem) => {
                const IconComp = menuItem.icon;
                const isActive = currentTab === menuItem.id;
                return (
                  <button
                    key={menuItem.id}
                    onClick={() => setCurrentTab(menuItem.id)}
                    className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isActive 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-450'}`} />
                    <span>{menuItem.label}</span>
                    {isActive && (
                      <motion.span 
                        layoutId="activeIndicator" 
                        className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" 
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Logged in Teacher Card Profile */}
        <div className="mt-8 pt-5 border-t border-slate-800 space-y-4">
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-850 space-y-3">
            <div className="flex items-center gap-3">
              {currentTeacher.foto && (
                <img 
                  src={currentTeacher.foto} 
                  alt={currentTeacher.nama} 
                  className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500/40" 
                />
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">
                  {currentTeacher.nama}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  NIP: {currentTeacher.nip}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2 bg-slate-800 hover:bg-rose-950/30 text-slate-300 hover:text-rose-450 border border-slate-700/80 hover:border-rose-900/30 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Akun</span>
            </button>
          </div>

          <div className="text-center px-1">
            <span className="text-[9px] font-mono text-slate-500">v2.0.4-stable JIBAS</span>
          </div>
        </div>
      </aside>

      {/* WORKSPACE AREA with top white header navigation */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header - No Print layout */}
        <header className="no-print h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-3 text-xs md:text-sm text-slate-500">
            <span className="font-bold text-slate-450 uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded">SDI HI</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-950 font-bold capitalize">
              {currentTab === 'dashboard' && 'Dashboard Overview'}
              {currentTab === 'grade' && 'Input Nilai Rapor'}
              {currentTab === 'personality' && 'Kepribadian Sikap'}
              {currentTab === 'reports' && 'Laporan & Cetak'}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative p-1 px-2.5 py-1 text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg shrink-0">
              ● Aktif Ganjil
            </div>
            
            <div className="flex items-center gap-2.5 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">{currentTeacher.nama}</p>
                <p className="text-[9px] text-slate-400 font-semibold uppercase">{currentTeacher.jabatan || 'Guru Pengajar'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-extrabold text-xs text-emerald-800">
                {currentTeacher.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Workspace dynamic context */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
          {/* Printable notification headers, shown only during hardcopy actions */}
          <div className="print-only hidden text-center border-b pb-4 mb-4">
            <h2 className="text-xl font-bold">SD ISLAM HIDAYATUL ISLAMIYAH</h2>
            <p className="text-xs text-slate-400 mt-1">Laporan Ringkasan Akademik Terpadu</p>
          </div>

          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="no-print"
          >
            {currentTab === 'dashboard' && (
              <DashboardOverview
                grades={grades}
                personalities={personalities}
                students={students}
                subjects={subjects}
                onNavigate={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'grade' && (
              <GradeEntryForm
                students={students}
                subjects={subjects}
                currentTeacher={currentTeacher}
                grades={grades}
                onSaveGrade={handleSaveGrade}
                onDeleteGrade={handleDeleteGrade}
                addToast={addToast}
              />
            )}

            {currentTab === 'personality' && (
              <PersonalityEntryForm
                students={students}
                personalities={personalities}
                onSavePersonality={handleSavePersonality}
                onDeletePersonality={handleDeletePersonality}
                addToast={addToast}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsCenter
                grades={grades}
                personalities={personalities}
                students={students}
                subjects={subjects}
                addToast={addToast}
              />
            )}
          </motion.div>

          {/* Global Print View Trigger Area (only renders on native browser print dialog) */}
          {currentTab === 'reports' && (
            <div className="print-only hidden">
              <span className="text-slate-400 italic text-[11px]">Sistem Rapor Sekolah Islam Terpadu</span>
            </div>
          )}
        </main>
      </div>

      {/* Floating System-wide Notification overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none no-print">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl shadow-lg border pointer-events-auto flex items-start gap-3 bg-white ${
                toast.type === 'success' ? 'border-emerald-200 text-slate-800' : 'border-rose-200 text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {toast.type === 'success' ? <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" /> : <BellRing className="w-4 h-4" />}
              </div>
              <div className="text-xs font-semibold">{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
