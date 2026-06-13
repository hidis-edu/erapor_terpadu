import { Student, Subject, Grade, Personality, Teacher } from './types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export const DEFAULT_SUBJECTS: Subject[] = [
  { replid: 56, kode: 'IA', nama: 'Iqra / Alqur`an', aktif: 1 },
  { replid: 57, kode: 'BTQ', nama: 'Baca Tulis Alqur`an', aktif: 1 },
  { replid: 58, kode: 'TK', nama: 'Tahsinul Kitabah', aktif: 1 },
  { replid: 59, kode: 'TH', nama: 'Tahfidz', aktif: 1 },
  { replid: 60, kode: 'SKI', nama: 'Dinul Islam / SKI', aktif: 1 },
  { replid: 61, kode: 'AA', nama: 'Akidah dan Akhlak', aktif: 1 },
  { replid: 62, kode: 'AH', nama: 'Al quran Hadis', aktif: 1 },
  { replid: 63, kode: 'FIQH', nama: 'Fiqih', aktif: 1 },
  { replid: 64, kode: 'BA', nama: 'Bahasa Arab', aktif: 1 },
  { replid: 65, kode: 'PS', nama: 'Praktek Sholat', aktif: 1 }
];

export const FALLBACK_STUDENTS: Student[] = [
  { nis: '10291', nama: 'Achmad Dani Yusuf', kelas: '1A', tahunajaran: '2025/2026', hportu: '6285749455111' },
  { nis: '10292', nama: 'Aisyah Putri Azzahra', kelas: '1A', tahunajaran: '2025/2026', hportu: '6285749455112' },
  { nis: '10293', nama: 'Bagus Setyo Prabowo', kelas: '1A', tahunajaran: '2025/2026', hportu: '6285749455113' },
  { nis: '10294', nama: 'Cahya Kamila', kelas: '1A', tahunajaran: '2025/2026', hportu: '6285749455114' },
  { nis: '10295', nama: 'Erwin Prasetya', kelas: '1A', tahunajaran: '2025/2026', hportu: '6285749455115' },
  { nis: '10296', nama: 'Fatimah Az-Zahra', kelas: '1B', tahunajaran: '2025/2026', hportu: '6285749455116' },
  { nis: '10297', nama: 'Gading Mahendra', kelas: '1B', tahunajaran: '2025/2026', hportu: '6285749455117' },
  { nis: '10298', nama: 'Hafizuddin Al-Ayub', kelas: '1B', tahunajaran: '2025/2026', hportu: '6285749455118' },
  { nis: '10299', nama: 'Indah Lestari', kelas: '2A', tahunajaran: '2025/2026', hportu: '6285749455119' },
  { nis: '10300', nama: 'Joko Susilo', kelas: '2A', tahunajaran: '2025/2026', hportu: '6285749455120' },
  { nis: '10301', nama: 'Kanza Khairunnisa', kelas: '2A', tahunajaran: '2025/2026', hportu: '6285749455121' },
  { nis: '10302', nama: 'Luqman Hakim', kelas: '2B', tahunajaran: '2025/2026', hportu: '6285749455122' },
  { nis: '10303', nama: 'Maulana Malik', kelas: '2B', tahunajaran: '2025/2026', hportu: '6285749455123' },
  { nis: '10304', nama: 'Nabila Syakieb', kelas: '3A', tahunajaran: '2025/2026', hportu: '6285749455124' },
  { nis: '10305', nama: 'Oky Syahputra', kelas: '3A', tahunajaran: '2025/2026', hportu: '6285749455125' }
];

export const INITIAL_GRADES: Grade[] = [];

export const INITIAL_PERSONALITIES: Personality[] = [];

// Helper to convert grade numeric values into letters (Indonesian words)
export function numberToWords(num: number): string {
  const words = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (num === 0) return "nol";
  if (num < 12) return words[num];
  if (num < 20) return words[num - 10] + " belas";
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const units = num % 10;
    return words[tens] + " puluh" + (units !== 0 ? " " + words[units] : "");
  }
  if (num === 100) return "seratus";
  return "";
}

// Convert score to predicate
export function calculatePredicate(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

// Export data as Excel (.xlsx) file
export function handleExportExcel(
  grades: Grade[],
  personalities: Personality[],
  students: Student[],
  subjects: Subject[]
) {
  const mapSubject: Record<number, string> = {};
  subjects.forEach(s => mapSubject[s.replid] = s.nama);

  const mapStudent: Record<string, Student> = {};
  students.forEach(s => mapStudent[s.nis] = s);

  // Prepare grades dataset
  const gradesRows = grades.map((g, idx) => {
    const stud = mapStudent[g.nis] || { nama: 'Tidak diketahui', kelas: '-' };
    return {
      'No': idx + 1,
      'NIS': g.nis,
      'Nama Siswa': stud.nama,
      'Kelas': stud.kelas,
      'Mata Pelajaran': mapSubject[g.idpelajaran] || `ID: ${g.idpelajaran}`,
      'NIP Guru': g.nipguru,
      'KKM': g.kkm,
      'Nilai Akhir': g.nilaiakhir,
      'Predikat': g.predikat,
      'Nilai Huruf': g.nilaihuruf,
      'Catatan Guru': g.catatanguru
    };
  });

  // Prepare personalities dataset
  const personalitiesRows = personalities.map((p, idx) => {
    const stud = mapStudent[p.nis] || { nama: 'Tidak diketahui', kelas: '-' };
    return {
      'No': idx + 1,
      'NIS': p.nis,
      'Nama Siswa': stud.nama,
      'Kelas': stud.kelas,
      'Semester': p.idsemester === 34 ? '1 (Ganjil)' : '2 (Genap)',
      'Nilai Ibadah': p.ibadah,
      'Nilai Akhlak': p.akhlak,
      'Nilai Disiplin': p.disiplin,
      'Catatan Wali Kelas': p.catatan
    };
  });

  const wb = XLSX.utils.book_new();
  
  const wsGrades = XLSX.utils.json_to_sheet(gradesRows);
  XLSX.utils.book_append_sheet(wb, wsGrades, 'Daftar Nilai Rapor');

  const wsPers = XLSX.utils.json_to_sheet(personalitiesRows);
  XLSX.utils.book_append_sheet(wb, wsPers, 'Daftar Kepribadian');

  // Generate Excel file and trigger download
  XLSX.writeFile(wb, `E-Rapor_SD_Islam_Hidayatul_Islamiyah_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Generate formatted PDF document
export function handleExportPDF(
  title: string,
  columns: string[],
  rows: any[][],
  filename: string
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text('SD ISLAM HIDAYATUL ISLAMIYAH', 105, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Laporan Ringkasan E-Rapor Terpadu', 105, 22, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 105, 27, { align: 'center' });
  
  // Separation line
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.5);
  doc.line(15, 30, 195, 30);
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, 15, 38);
  
  // Create beautiful text table representation
  let y = 46;
  doc.setFontSize(9);
  
  // Headers Background
  doc.setFillColor(240, 248, 240); // very soft green
  doc.rect(15, y - 5, 180, 7, 'F');
  
  // Headers text
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  
  // Distribute width
  const colWidth = 180 / columns.length;
  columns.forEach((col, idx) => {
    doc.text(col, 15 + idx * colWidth + 2, y);
  });
  
  y += 7;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  rows.forEach((row) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    
    row.forEach((cell, idx) => {
      const text = String(cell);
      doc.text(text, 15 + idx * colWidth + 2, y);
    });
    
    // Thin border line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.1);
    doc.line(15, y + 2, 195, y + 2);
    
    y += 7;
  });
  
  // Save PDF
  doc.save(`${filename}.pdf`);
}
