import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  TrendingUp, 
  Camera, 
  Cloud, 
  CheckCircle2, 
  Loader2,
  Calendar,
  ShieldCheck
} from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <Clock className="w-12 h-12" />,
    title: "Chấm công thông minh",
    description: "Ghi nhận thời gian làm việc chính xác chỉ với một chạm.",
    color: "text-emerald-500"
  },
  {
    icon: <TrendingUp className="w-12 h-12" />,
    title: "Thống kê thu nhập",
    description: "Theo dõi lương và hiệu suất làm việc theo tháng, theo năm.",
    color: "text-indigo-500"
  },
  {
    icon: <Camera className="w-12 h-12" />,
    title: "Lưu giữ kỷ niệm",
    description: "Ghi lại những khoảnh khắc đáng nhớ trong quá trình làm việc.",
    color: "text-rose-500"
  },
  {
    icon: <Cloud className="w-12 h-12" />,
    title: "Đồng bộ đám mây",
    description: "Dữ liệu của bạn luôn an toàn và đồng bộ trên mọi thiết bị.",
    color: "text-blue-500"
  }
];

export function SplashScreen({ onComplete, isLoaded }: { onComplete: () => void, isLoaded: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    console.log("SplashScreen: isLoaded is", isLoaded);
    const totalDuration = 2000; // 2 seconds for a snappy feel
    const intervalTime = 20;
    const step = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99 && !isLoaded) {
          console.log("SplashScreen: Waiting for isLoaded...");
          return 99; // Wait if not loaded
        }
        if (prev >= 100) {
          console.log("SplashScreen: Loading complete, calling onComplete");
          clearInterval(timer);
          setTimeout(onComplete, 200);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete, isLoaded]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo Section */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 flex flex-col items-center"
        >
          <div className="relative">
            <motion.div 
              animate={{ rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-100"
            >
              <Clock className="text-white w-12 h-12" />
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-6"
          >
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              TimeTracker
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
              Chấm Công & Kỉ Niệm
            </p>
          </motion.div>
        </motion.div>

        {/* Progress Section */}
        <div className="w-48 space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Đang tải</span>
            <span className="text-xs font-mono font-black text-emerald-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-12 left-0 right-0 text-center">
          <p className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">
            Phát triển bởi Trần Văn Thắng
          </p>
        </div>
      </div>
    </div>
  );
}
