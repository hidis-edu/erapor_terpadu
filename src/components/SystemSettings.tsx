import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Cpu, Smartphone, Key, RefreshCw, PlusCircle, Save, CheckCircle, XCircle, ArrowRight, QrCode, HelpCircle
} from 'lucide-react';

interface SystemSettingsProps {
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function SystemSettings({ addToast }: SystemSettingsProps) {
  // Hardcoded values requested by user
  const EVO_BASE_URL = 'https://evo.nganjuk.net';
  const EVO_GLOBAL_KEY = 'nganjuk123';

  // State with LocalStorage persistence
  const [instanceName, setInstanceName] = useState(() => {
    return localStorage.getItem('evo_instance_name') || 'hidis';
  });
  const [waAdmin, setWaAdmin] = useState(() => {
    return localStorage.getItem('whatsapp_admin_number') || '';
  });

  // Action states
  const [newInstanceInput, setNewInstanceInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'open' | 'close' | 'connecting' | 'unknown'>('unknown');
  const [qrCodeString, setQrCodeString] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // Load status on load
  useEffect(() => {
    checkInstanceStatus(instanceName);
  }, [instanceName]);

  const checkInstanceStatus = async (targetInstance: string) => {
    if (!targetInstance) return;
    setIsCheckingStatus(true);
    try {
      const response = await fetch(`${EVO_BASE_URL}/instance/connectionState/${targetInstance}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVO_GLOBAL_KEY
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Structure: { instance: { instanceName: "...", state: "..." } }
        const state = data?.instance?.state || data?.state;
        if (state === 'open') {
          setConnectionStatus('open');
          setQrCodeString(null); // connected, clear QR
        } else if (state === 'connecting') {
          setConnectionStatus('connecting');
        } else {
          setConnectionStatus('close');
        }
      } else {
        setConnectionStatus('close');
      }
    } catch (err) {
      console.warn('Gagal mengecek status instance', err);
      setConnectionStatus('unknown');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedName = newInstanceInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!formattedName) {
      addToast('Nama instance tidak valid. Gunakan huruf kecil, angka, atau strip.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${EVO_BASE_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVO_GLOBAL_KEY
        },
        body: JSON.stringify({
          instanceName: formattedName,
          token: '',
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });

      if (response.ok) {
        const result = await response.json();
        addToast(`✔️ Instance "${formattedName}" berhasil dibuat!`, 'success');
        
        // Auto-set as active instance
        setInstanceName(formattedName);
        localStorage.setItem('evo_instance_name', formattedName);
        setNewInstanceInput('');
        
        // Immediately load QR for connection
        await loadQrCode(formattedName);
      } else {
        const errResult = await response.json().catch(() => ({}));
        addToast(`Gagal membuat: ${errResult.message || 'Error Server'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Terjadi kesalahan koneksi saat membuat instance.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const loadQrCode = async (targetInstance: string) => {
    setIsLoadingQr(true);
    setQrCodeString(null);
    try {
      const response = await fetch(`${EVO_BASE_URL}/instance/connect/${targetInstance}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVO_GLOBAL_KEY
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Typically returns: { code: "data:image/png;base64,..." } or { base64: "..." }
        const qr = data.base64 || data.code;
        if (qr) {
          setQrCodeString(qr);
          addToast('QR Code berhasil di-generate. Silakan scan dengan WA Anda.', 'success');
        } else {
          addToast('Gagal memuat format QR Code dari Evolution API.', 'error');
        }
      } else {
        addToast('Gagal melakukan handshake koneksi dengan server Evolution API.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Koneksi terputus saat mengambil QR Code.', 'error');
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleSaveWaAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    let num = waAdmin.trim().replace(/[^0-9]/g, '');
    
    // Normalize Indonesian format: e.g. 0812 -> 62812 or 812 -> 62812
    if (num.startsWith('0')) {
      num = '62' + num.slice(1);
    } else if (num.startsWith('8')) {
      num = '62' + num;
    }
    
    if (num && num.length < 10) {
      addToast('Nomor WhatsApp terlalu pendek.', 'error');
      return;
    }

    localStorage.setItem('whatsapp_admin_number', num);
    setWaAdmin(num);
    addToast('✔️ Nomor Whatsapp Admin berhasil disimpan!', 'success');
  };

  const handleResetInstance = () => {
    setInstanceName('hidis');
    localStorage.setItem('evo_instance_name', 'hidis');
    addToast('Instance direset kembali ke "hidis".', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Information Header card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-md border border-slate-800">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-6 translate-x-6">
          <Settings className="w-56 h-56 text-white" />
        </div>
        <div className="max-w-xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
            🔧 Pengaturan JIBAS Terpadu
          </div>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Pengaturan Sistem</h2>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            Kelola integrasi dengan Evolution API untuk pengiriman notifikasi/laporan otomatis via WhatsApp &amp; setting admin penerima utama.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Evolution API Section */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Evolution API Instance</h3>
                <p className="text-[10px] text-slate-400">Hubungkan sistem rapor ke server gateway WhatsApp</p>
              </div>
            </div>

            {/* Credentials hidden as requested */}

            {/* Current status display and manual checkers */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-150 bg-white">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Status Integrasi</span>
                <div className="flex items-center gap-2">
                  {connectionStatus === 'open' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <CheckCircle className="w-4 h-4 fill-emerald-50 text-emerald-500" />
                      Terhubung (ONLINE)
                    </span>
                  )}
                  {connectionStatus === 'close' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                      <XCircle className="w-4 h-4 fill-rose-50 text-rose-500" />
                      Terputus / Unverified
                    </span>
                  )}
                  {connectionStatus === 'connecting' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Yen nyambung...
                    </span>
                  )}
                  {connectionStatus === 'unknown' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <HelpCircle className="w-4 h-4" />
                      Belum Diperiksa
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => checkInstanceStatus(instanceName)}
                  disabled={isCheckingStatus}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  Cek Status
                </button>

                {connectionStatus !== 'open' && (
                  <button
                    type="button"
                    onClick={() => loadQrCode(instanceName)}
                    disabled={isLoadingQr}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Hubungkan (Scan QR)
                  </button>
                )}
                
                {instanceName !== 'hidis' && (
                  <button
                    type="button"
                    onClick={handleResetInstance}
                    className="px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[10px] uppercase font-bold rounded-md transition-colors"
                    title="Kembalikan ke 'hidis'"
                  >
                    Reset 'hidis'
                  </button>
                )}
              </div>
            </div>

            {/* Form to create a brand new custom instance name */}
            <form onSubmit={handleCreateInstance} className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900">Buat Instance Baru</h4>
              <p className="text-[10px] text-slate-400">
                Punya nomor WA baru? Daftarkan nama instance kustom ke Evolution API untuk membuat kanal webhook mandiri.
              </p>
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                    NAME
                  </span>
                  <input
                    type="text"
                    value={newInstanceInput}
                    onChange={(e) => setNewInstanceInput(e.target.value)}
                    placeholder="Contoh: dsi_baru, sdihid_rapor"
                    disabled={isCreating}
                    className="w-full text-xs pl-16 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreating || !newInstanceInput.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Buat</span>
                </button>
              </div>
            </form>

          </div>

        </div>

        {/* Right Column: QR Code scanning container & Admin number settings */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Settings Section: Admin phone number */}
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">WhatsApp Admin JIBAS</h3>
                <p className="text-[10px] text-slate-400">Kontak utama Kepala Sekolah atau Admin Yayasan</p>
              </div>
            </div>

            <form onSubmit={handleSaveWaAdmin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Nomor HP WhatsApp (Indonesia format)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black font-mono text-slate-400">
                    +62
                  </span>
                  <input
                    type="text"
                    value={waAdmin}
                    onChange={(e) => setWaAdmin(e.target.value)}
                    placeholder="81234567890 (Tanpa nol di depan)"
                    className="w-full text-xs font-mono pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-bold text-slate-800 transition-colors"
                  />
                </div>
                <p className="text-[9.5px] text-slate-400 leading-relaxed">
                  Laporan rekapitulasi nilai, agregat mutu siswa, dan rilis rapor digital dapat dikirimkan secara otomatis menuju nomor target yang Anda tentukan di atas.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan WhatsApp Admin</span>
              </button>
            </form>
          </div>

          {/* QR Connection Container */}
          {qrCodeString && (
            <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 shadow-md border border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Hubungkan WhatsApp Gateway</h4>
                <p className="text-[9.5px] text-slate-400">Pindai kode QR menggunakan perangkat WhatsApp Anda</p>
              </div>

              <div className="bg-white p-4 rounded-xl flex items-center justify-center mx-auto w-fit border border-slate-800 shadow-inner">
                {qrCodeString.startsWith('data:') ? (
                  <img src={qrCodeString} alt="Evolution QR Code" className="w-[180px] h-[180px]" />
                ) : (
                  <div className="text-slate-800 font-mono text-[9px] bg-slate-50 p-2 border rounded overflow-x-auto max-w-[200px] break-all">
                    {qrCodeString}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-[10px] text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 font-medium">
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 bg-slate-800 text-slate-200 rounded-full flex items-center justify-center shrink-0 font-bold text-[9px]">1</span>
                  <span>Buka aplikasi WhatsApp di telepon Anda.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 bg-slate-800 text-slate-200 rounded-full flex items-center justify-center shrink-0 font-bold text-[9px]">2</span>
                  <span>Pilih <b>Perangkat Tertaut</b> &gt; <b>Tautkan Perangkat</b>.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 bg-slate-800 text-slate-200 rounded-full flex items-center justify-center shrink-0 font-bold text-[9px]">3</span>
                  <span>Arahkan kamera ke layar untuk memindai QR Code di atas.</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => checkInstanceStatus(instanceName)}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Koneksi Selesai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrCodeString(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
