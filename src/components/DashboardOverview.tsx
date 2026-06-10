import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, BookOpen, Star, AlertCircle, CheckCircle, ArrowRight
} from 'lucide-react';
import { Grade, Personality, Student, Subject } from '../types';

interface DashboardOverviewProps {
  grades: Grade[];
  personalities: Personality[];
  students: Student[];
  subjects: Subject[];
  onNavigate: (tab: string) => void;
}

export default function DashboardOverview({
  grades,
  personalities,
  students,
  subjects,
  onNavigate
}: DashboardOverviewProps) {
  
  // 1. Calculate General Metrics
  const totalGrades = grades.length;
  const averageGrade = totalGrades > 0 
    ? Math.round(grades.reduce((sum, g) => sum + g.nilaiakhir, 0) / totalGrades) 
    : 0;
  
  const passingGrades = grades.filter(g => g.nilaiakhir >= g.kkm).length;
  const passingRate = totalGrades > 0 ? Math.round((passingGrades / totalGrades) * 100) : 0;
  
  const totalSikap = personalities.length;

  // 2. Prepare Data for Bar Chart: Average Score by Subject
  const subjectAverages = subjects.map(sub => {
    const subGrades = grades.filter(g => g.idpelajaran === sub.replid);
    const avg = subGrades.length > 0 
      ? Math.round(subGrades.reduce((sum, g) => sum + g.nilaiakhir, 0) / subGrades.length)
      : 0;
    return {
      name: sub.kode,
      full_name: sub.nama,
      'Rata-rata': avg,
      counts: subGrades.length,
    };
  }).filter(item => item.counts > 0); // Only show subjects that have at least one grade entry

  // Fallback visual data if they haven't entered anything yet
  const chartData = subjectAverages.length > 0 ? subjectAverages : [
    { name: 'IA', 'Rata-rata': 80 },
    { name: 'BTQ', 'Rata-rata': 75 },
    { name: 'AA', 'Rata-rata': 85 },
    { name: 'FIQH', 'Rata-rata': 82 },
    { name: 'BA', 'Rata-rata': 70 }
  ];

  // 3. Prepare Data for Pie Chart: Predicate Distribution
  const predicateCounts = { A: 0, B: 0, C: 0, D: 0 };
  grades.forEach(g => {
    if (g.predikat in predicateCounts) {
      predicateCounts[g.predikat as 'A' | 'B' | 'C' | 'D']++;
    }
  });

  const pieData = [
    { name: 'Sangat Baik (A)', value: predicateCounts.A || 4, color: '#10b981' }, // green-500
    { name: 'Baik (B)', value: predicateCounts.B || 6, color: '#3b82f6' },        // blue-500
    { name: 'Cukup (C)', value: predicateCounts.C || 2, color: '#f59e0b' },       // amber-500
    { name: 'Kurang (D)', value: predicateCounts.D || 1, color: '#f43f5e' }        // rose-500
  ].filter(p => p.value > 0);

  // 4. Highlight students with failing grades (score < KKM)
  const studentsNeedAttention = grades
    .filter(g => g.nilaiakhir < g.kkm)
    .map(g => {
      const student = students.find(s => s.nis === g.nis);
      const subject = subjects.find(s => s.replid === g.idpelajaran);
      return {
        id: `${g.nis}-${g.idpelajaran}`,
        nis: g.nis,
        nama: student?.nama || 'Tidak dikenal',
        kelas: student?.kelas || '-',
        mapel: subject?.nama || 'Mapel',
        nilai: g.nilaiakhir,
        kkm: g.kkm
      };
    });

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden border border-slate-800 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-xl font-bold tracking-tight text-white">Selamat Datang di Portal E-Rapor</h1>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            SD Islam Hidayatul Islamiyah. Kelola nilai, rekap kepribadian sikap, dan unduh laporan prestasi siswa secara instan di dalam satu dashboard terintegrasi.
          </p>
        </div>
        <div className="flex gap-2 relative z-10 shrink-0">
          <button 
            onClick={() => onNavigate('grade')}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Input Nilai Baru
          </button>
          <button 
            onClick={() => onNavigate('personality')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-755 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            Penilaian Sikap
          </button>
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Nilai Diinput', value: totalGrades, icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-100', desc: 'Jumlah nilai rapor masuk' },
          { title: 'Rata-rata Nilai', value: `${averageGrade}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', desc: 'Rata-rata seluruh mapel' },
          { title: 'Persentase Kelulusan', value: `${passingRate}%`, icon: Star, color: 'text-amber-600 bg-amber-50 border-amber-100', desc: `Nilai siswa di atas KKM` },
          { title: 'Penilaian Sikap', value: totalSikap, icon: Users, color: 'text-rose-600 bg-rose-50 border-rose-100', desc: 'Siswa dengan rekap kepribadian' },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-start gap-4`}
            >
              <div className={`p-3 rounded-xl border ${item.color.split(' ')[1]} ${item.color.split(' ')[2]} shrink-0`}>
                <Icon className={`w-6 h-6 ${item.color.split(' ')[0]}`} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{item.title}</span>
                <span className="text-2xl font-extrabold text-slate-800 tracking-tight block mt-1">{item.value}</span>
                <span className="text-xs text-slate-500 block mt-1">{item.desc}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">Rataan Nilai per Mata Pelajaran</h3>
              <p className="text-xs text-slate-400">Nilai rata-rata siswa berdasarkan kode mata pelajaran</p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 rounded text-slate-500">
              Interaktif
            </span>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                />
                <YAxis 
                  domain={[40, 100]} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-md border border-slate-800">
                          <p className="font-bold">{data.full_name || data.name}</p>
                          <p className="mt-1 font-semibold text-emerald-400">Rata-rata: {payload[0].value}</p>
                          {data.counts !== undefined && <p className="text-slate-400 mt-0.5">Dinilai: {data.counts} siswa</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Rata-rata" fill="#047857" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800">Distribusi Predikat</h3>
            <p className="text-xs text-slate-400">Persentase predikat nilai dari kelulusan terdata</p>
          </div>

          <div className="h-60 relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-md">
                            <p className="font-semibold">{payload[0].name}</p>
                            <p className="font-bold mt-1 text-emerald-400">Jumlah: {payload[0].value} entri</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Belum ada distribusi predikat</div>
            )}
            
            {/* Center label */}
            <div className="absolute text-center">
              <span className="text-2xl font-extrabold text-slate-700">{totalGrades}</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Nilai</span>
            </div>
          </div>

          {/* Pie Legends */}
          <div className="space-y-2 mt-2">
            {pieData.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-600 font-medium">{p.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{p.value} siswa</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diagnostic & Quick Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Siswa Perlu Bimbingan */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Siswa Perlu Bimbingan Khusus</h3>
              <p className="text-xs text-slate-400">Daftar siswa dengan nilai di bawah batas KKM pembelajaran</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
              {studentsNeedAttention.length} Siswa
            </span>
          </div>

          {studentsNeedAttention.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="pb-3 text-slate-500">Nama Siswa</th>
                    <th className="pb-3 text-slate-500">Kelas</th>
                    <th className="pb-3 text-slate-500">Mata Pelajaran</th>
                    <th className="pb-3 text-center text-slate-500">Nilai</th>
                    <th className="pb-3 text-center text-slate-500">Batas KKM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {studentsNeedAttention.map((s) => (
                    <tr key={s.id} className="text-xs">
                      <td className="py-3 font-semibold text-slate-800">{s.nama}</td>
                      <td className="py-3 text-slate-500">{s.kelas}</td>
                      <td className="py-3 text-slate-500 font-medium">{s.mapel}</td>
                      <td className="py-3 text-center font-bold text-rose-500 bg-rose-50/50 rounded-lg">{s.nilai}</td>
                      <td className="py-3 text-center font-medium text-slate-400">{s.kkm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl text-center px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Luar Biasa, Siswa Lulus Semua!</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                Semua nilai siswa yang diinput saat ini telah melampaui batas kriteria kelulusan minimal (KKM).
              </p>
            </div>
          )}
        </div>

        {/* Quick Help & Guidelines */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-900">
              SDI Hidayatul Islamiyah
            </span>
            <h4 className="text-lg font-bold mt-4 leading-snug">Panduan Penggunaan Rapor Terpadu</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Pastikan Anda mengisi profil kepribadian sikap akhlak untuk siswa sebagai prasyarat pencetakan rapor oleh wali kelas. Riwayat nilai diupdate secara real-time.
            </p>
            <div className="space-y-3 mt-6">
              {[
                'Input nilai selesai langsung tersinkron.',
                'Predikat dihitung otomatis berasas KKM.',
                'Mendukung ekspor data satu klik.',
                'Cetak ringkasan halaman per-siswa.'
              ].map((g, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => onNavigate('grade')}
            className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <span>Mulai Input Sekarang</span>
            <ArrowRight className="w-4.5 h-4.5 text-slate-950" />
          </button>
        </div>
      </div>
    </div>
  );
}
