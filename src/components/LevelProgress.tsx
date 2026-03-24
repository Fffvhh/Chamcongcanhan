import * as React from 'react';
import { motion } from 'motion/react';
import { getLevel } from '../constants/levels';
import { cn } from '../lib/utils';
import { Info } from 'lucide-react';

interface LevelProgressProps {
  totalHours: number;
}

export function LevelProgress({ totalHours }: LevelProgressProps) {
  const { current, next, progress } = getLevel(totalHours);
  const Icon = current.icon;

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 mb-4 overflow-hidden relative group">
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
        <Icon size={60} />
      </div>

      <div className="flex items-center gap-3 mb-2 relative z-10">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
          current.bgColor,
          current.color
        )}>
          <Icon size={20} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cấp độ hiện tại</h4>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Info size={10} />
              <span className="font-mono">{totalHours.toFixed(1)}</span>h làm việc
            </span>
          </div>
          <p className={cn("text-base font-black tracking-tight", current.color)}>
            {current.name}
          </p>
        </div>
      </div>

      {next && (
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Tiến trình lên {next.name}
            </span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {progress.toFixed(0)}%
            </span>
          </div>
          
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn("h-full rounded-full", current.color.replace('text-', 'bg-'))}
            />
          </div>
          
          <p className="mt-1.5 text-[10px] text-slate-400 font-medium">
            Còn <span className="font-bold text-slate-600 font-mono">{(next.minHours - totalHours).toFixed(1)}h</span> nữa để đạt cấp độ tiếp theo
          </p>
        </div>
      )}

      {!next && (
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
            Bạn đã đạt cấp độ cao nhất! 🏆
          </p>
        </div>
      )}
    </div>
  );
}
