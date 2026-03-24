import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, LogIn, ShieldCheck, Zap, Heart, Sparkles, Star, ArrowRight, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import { useToast } from './Toast';

export function LoginScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showToast } = useToast();

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
        showToast("Lỗi kết nối mạng. Vui lòng kiểm tra kết nối hoặc đảm bảo tên miền đã được cấp phép trong Firebase Console.", 'error');
      } else if (error.code !== 'auth/cancelled-popup-request') {
        showToast("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau.", 'error');
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-[#0a0502] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-emerald-500/30">
      {/* Atmospheric Background (Recipe 7 inspired) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-emerald-500/5 blur-[150px]" />
      </div>

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0.1, 0.3, 0.1], 
              scale: [1, 1.2, 1],
              y: [0, -20, 0],
              x: [0, 10, 0]
            }}
            transition={{ 
              duration: 5 + i, 
              repeat: Infinity, 
              delay: i * 0.5 
            }}
            className="absolute"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          >
            <Star className="text-emerald-500/20 w-4 h-4" />
          </motion.div>
        ))}
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md bg-white/80 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/40 p-8 md:p-12 relative z-10"
      >
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-12">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="relative mb-8"
          >
            <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
            <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 relative z-10">
              <Clock className="text-white w-12 h-12" />
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center z-20"
            >
              <Sparkles className="text-emerald-500 w-4 h-4" />
            </motion.div>
          </motion.div>
          
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            Time<span className="text-emerald-600">Tracker</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-4 bg-slate-200" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
              Chấm Công & Kỉ Niệm
            </p>
            <div className="h-[1px] w-4 bg-slate-200" />
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-8 mb-12">
          <motion.div variants={itemVariants} className="flex items-center gap-5 group cursor-default">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm">
              <Zap size={22} />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black text-slate-800 tracking-tight">Nhanh chóng</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Chấm công một chạm, tiết kiệm thời gian quý báu.</p>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex items-center gap-5 group cursor-default">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black text-slate-800 tracking-tight">Bảo mật</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Dữ liệu an toàn, đồng bộ tức thì trên mọi thiết bị.</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-center gap-5 group cursor-default">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-sm">
              <Heart size={22} />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black text-slate-800 tracking-tight">Kỉ niệm</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Lưu giữ khoảnh khắc đáng nhớ trong công việc.</p>
            </div>
          </motion.div>
        </div>

        {/* Login Button */}
        <motion.button 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-[2rem] font-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/20 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <LogIn className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Đăng nhập bằng Google</span>
          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all relative z-10" />
        </motion.button>

        {/* Footer Info */}
        <motion.div variants={itemVariants} className="mt-10 text-center">
          <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.25em]">
            Phát triển bởi <span className="text-slate-400">Trần Văn Thắng</span>
          </p>
        </motion.div>
      </motion.div>

      {/* Legal Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 text-center max-w-xs px-4"
      >
        <p className="text-slate-500 text-[10px] font-medium leading-relaxed opacity-60">
          Bằng cách đăng nhập, bạn đồng ý với <span className="underline cursor-pointer hover:text-emerald-500 transition-colors">Điều khoản sử dụng</span> và <span className="underline cursor-pointer hover:text-emerald-500 transition-colors">Chính sách bảo mật</span> của chúng tôi.
        </p>
      </motion.div>

      {/* Live Time Indicator */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2 }}
        className="fixed bottom-8 right-8 hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
      >
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-mono font-bold text-white/60 tracking-widest">
          {currentTime.toLocaleTimeString('vi-VN', { hour12: false })}
        </span>
      </motion.div>
    </div>
  );
}

