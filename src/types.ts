export interface Student {
  nis: string;
  nama: string;
  kelas: string;
  tahunajaran: string;
  hportu?: string;
  nisn?: string;
}

export interface Subject {
  replid: number;
  kode: string;
  nama: string;
  aktif: number;
}

export interface Teacher {
  nip: string;
  nama: string;
  foto?: string;
  jabatan?: string;
  is_finance?: number;
  level?: number;
}

export interface Grade {
  replid?: number;
  nis: string;
  idpelajaran: number;
  nipguru: string;
  kkm: number;
  nilaiakhir: number;
  nilaihuruf: string;
  predikat: string;
  catatanguru: string;
  createdAt?: string;
}

export interface Personality {
  nis: string;
  idsemester: number;
  ibadah: 'A' | 'B' | 'C' | 'D';
  akhlak: 'A' | 'B' | 'C' | 'D';
  disiplin: 'A' | 'B' | 'C' | 'D';
  catatan: string;
  createdAt?: string;
}

export interface Attendance {
  replid?: number;
  nis: string;
  idsemester: number;
  tahunajaran: string;
  sakit: number;
  izin: number;
  alpa: number;
  catatan: string;
  nama_siswa?: string;
  idkelas?: string;
  createdAt?: string;
  updated_at?: string;
}

export interface RekapRapor {
  replid?: number;
  nis: string;
  idsemester: number;
  tahunajaran: string;
  jumlah_mapel: number;
  total_nilai: number;
  rata_rata: number;
  ibadah: string;
  akhlak: string;
  disiplin: string;
  nama_siswa?: string;
  idkelas?: string;
  last_update?: string;
}
