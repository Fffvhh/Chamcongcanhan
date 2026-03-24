import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LEVELS, getLevel } from '../constants/levels';
import { cn } from '../lib/utils';
import { Lock, CheckCircle2, ChevronRight, Award } from 'lucide-react';

interface LevelShowcaseProps {
  totalHours: number;
}

export function LevelShowcase({ totalHours }: LevelShowcaseProps) {
  const { current } = getLevel(totalHours);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Hệ thống Cấp độ</h3>
            <p className="text-slate-500 text-xs sm:text-sm">Tích lũy giờ làm để thăng cấp</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-slate-400"
          >
            <ChevronRight size={18} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 space-y-3">
              {LEVELS.map((level, index) => {
                const isUnlocked = totalHours >= level.minHours;
                const isCurrent = current.name === level.name;
                const Icon = level.icon;

                return (
                  <div 
                    key={level.name}
                    className={cn(
                      "relative flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300",
                      isUnlocked 
                        ? cn("bg-white shadow-sm", level.borderColor) 
                        : "bg-slate-50 border-slate-100 opacity-60 grayscale"
                    )}
                  >
                    {/* Status Indicator */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      isUnlocked ? level.bgColor : "bg-slate-200",
                      isUnlocked ? level.color : "text-slate-400"
                    )}>
                      {isUnlocked ? <Icon size={20} /> : <Lock size={18} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={cn(
                          "text-sm font-bold truncate",
                          isUnlocked ? "text-slate-800" : "text-slate-400"
                        )}>
                          {level.name}
                        </h4>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest rounded-md shadow-sm">
                            Hiện tại
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "text-[10px] font-medium",
                          isUnlocked ? "text-slate-500" : "text-slate-400"
                        )}>
                          Yêu cầu:
                        </span>
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                          isUnlocked ? "bg-slate-100 text-slate-700" : "bg-slate-100/50 text-slate-400"
                        )}>
                          {level.minHours}h
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnlocked ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                          <CheckCircle2 size={14} />
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-slate-400">
                          Khóa
                        </div>
                      )}
                    </div>

                    {/* Progress Bar for Locked Levels */}
                    {!isUnlocked && index > 0 && LEVELS[index-1].minHours <= totalHours && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 rounded-b-2xl overflow-hidden">
                        <div 
                          className="h-full bg-slate-300" 
                          style={{ width: `${((totalHours - LEVELS[index-1].minHours) / (level.minHours - LEVELS[index-1].minHours)) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center font-medium italic">
                "Cần cù bù thông minh - Mỗi giờ làm việc đều đưa bạn đến gần hơn với danh hiệu Huyền thoại"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
