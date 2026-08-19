import React from 'react';
import { 
  ShieldCheck, 
  UserCircle, 
  Search, 
  FileText, 
  Home, 
  PlusCircle, 
  RefreshCw, 
  Car, 
  HeartPulse, 
  Calculator, 
  Bell, 
  ScanLine 
} from 'lucide-react';

const MobileDashboard = () => {
  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 bg-gradient-to-br from-slate-900 via-[#0F172A] to-[#1E1B4B] text-white font-sans relative overflow-x-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 pt-8 sticky top-0 z-10 bg-gradient-to-b from-[#0F172A]/90 to-transparent backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">สำนักงานเปิ้ลประกันภัย</h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
              <span className="text-[11px] text-emerald-400 font-medium tracking-wide">AI OCR Gemini Ready</span>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-xs font-semibold text-gray-200">คุณ Jakkarin (Fong)</span>
          <span className="text-[10px] text-gray-400 mt-0.5">ตัวแทน A001</span>
        </div>
      </div>

      <div className="px-6 space-y-8 mt-2">
        {/* Quick Actions (Glassmorphism) */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            {/* Card 1 */}
            <button className="relative overflow-hidden group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 transition-all duration-300 active:scale-95 active:shadow-[0_0_20px_rgba(14,165,233,0.4)] active:border-cyan-400/40">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-active:opacity-100 transition-opacity"></div>
              <div className="p-3 bg-white/10 rounded-full group-active:bg-cyan-500/20 transition-colors">
                <PlusCircle className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-gray-100">ออกกรมธรรม์ใหม่</span>
                <p className="text-[10px] text-cyan-400 font-semibold mt-0.5">(AI 100%)</p>
              </div>
            </button>
            
            {/* Card 2 */}
            <button className="relative overflow-hidden group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 transition-all duration-300 active:scale-95 active:shadow-[0_0_20px_rgba(168,85,247,0.4)] active:border-purple-400/40">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-active:opacity-100 transition-opacity"></div>
              <div className="p-3 bg-white/10 rounded-full group-active:bg-purple-500/20 transition-colors">
                <RefreshCw className="w-8 h-8 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.7)]" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-gray-100">รายการงานต่ออายุ</span>
                <p className="text-[10px] text-transparent mt-0.5">.</p> {/* Spacer */}
              </div>
            </button>
          </div>
        </section>

        {/* Products & Services */}
        <section>
          <h2 className="text-base font-bold mb-5 text-white drop-shadow-md tracking-wide">หมวดหมู่ผลิตภัณฑ์และบริการ</h2>
          <div className="grid grid-cols-4 gap-y-6 gap-x-2">
            {/* Item 1 */}
            <div className="flex flex-col items-center space-y-2.5">
              <button className="relative w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 active:bg-white/10 transition-colors shadow-inner">
                <Car className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                {/* Badge */}
                <span className="absolute -top-2.5 -right-3 bg-emerald-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.9)] whitespace-nowrap z-10">
                  คอมฯ 25%
                </span>
              </button>
              <span className="text-[11px] text-gray-300 text-center font-medium leading-tight">Motor<br/>Insurance</span>
            </div>
            
            {/* Item 2 */}
            <div className="flex flex-col items-center space-y-2.5">
              <button className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 active:bg-white/10 transition-colors shadow-inner">
                <HeartPulse className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
              </button>
              <span className="text-[11px] text-gray-300 text-center font-medium leading-tight">Non-Motor</span>
            </div>
            
            {/* Item 3 */}
            <div className="flex flex-col items-center space-y-2.5">
              <button className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 active:bg-white/10 transition-colors shadow-inner">
                <Calculator className="w-6 h-6 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
              </button>
              <span className="text-[11px] text-gray-300 text-center font-medium leading-tight">เช็คเบี้ย</span>
            </div>
            
            {/* Item 4 */}
            <div className="flex flex-col items-center space-y-2.5">
              <button className="relative w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 active:bg-white/10 transition-colors shadow-inner">
                <Bell className="w-6 h-6 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#151D34] shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
              </button>
              <span className="text-[11px] text-gray-300 text-center font-medium leading-tight">แจ้งเตือน</span>
            </div>
          </div>
        </section>
      </div>

      {/* Dark Glass Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-[#0F172A]/85 backdrop-blur-xl border-t border-white/10 rounded-t-3xl pb-safe pt-2 px-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-center relative h-16">
          <button className="flex flex-col items-center justify-center w-12 space-y-1.5 text-cyan-400 transition-colors">
            <Home className="w-6 h-6 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
            <span className="text-[10px] font-medium">ภาพรวม</span>
          </button>
          
          <button className="flex flex-col items-center justify-center w-12 space-y-1.5 text-gray-400 hover:text-white transition-colors">
            <UserCircle className="w-6 h-6" />
            <span className="text-[10px] font-medium">ลูกค้า</span>
          </button>
          
          {/* Floating Action Button */}
          <div className="relative -top-7 flex justify-center w-16">
            <button className="absolute w-16 h-16 bg-gradient-to-tr from-cyan-500 via-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.7)] border-4 border-[#0F172A] transform transition-transform active:scale-90 z-20">
              <ScanLine className="w-7 h-7 text-white drop-shadow-md" />
            </button>
            {/* Glow ring behind FAB */}
            <div className="absolute w-16 h-16 bg-cyan-500/20 rounded-full animate-ping z-10"></div>
          </div>
          
          <button className="flex flex-col items-center justify-center w-12 space-y-1.5 text-gray-400 hover:text-white transition-colors">
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-medium">เอกสาร</span>
          </button>
          
          <button className="flex flex-col items-center justify-center w-12 space-y-1.5 text-gray-400 hover:text-white transition-colors">
            <Search className="w-6 h-6" />
            <span className="text-[10px] font-medium">ค้นหา</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;
