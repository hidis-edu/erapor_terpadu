export interface Student {
  nis: string;
  nama: string;
  kelas: string;
  tahunajaran: string;
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
