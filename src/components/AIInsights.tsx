import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, ChevronRight, BrainCircuit } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import { getGeminiInsights } from '../services/geminiService';
import { cn } from '../lib/utils';

export function AIInsights() {
  const { records, salarySettings, theme } = useAttendance();
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    const result = await getGeminiInsights(records, salarySettings);
    setInsights(result);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    if (Object.keys(records).length > 0 && insights.length === 0) {
      fetchInsights();
    }
  }, [records]);

  return (
    <div className={cn("bg-white rounded-3xl p-6 shadow-sm border overflow-hidden relative group", theme.borderLight)}>
      {/* Background Glow */}
      <div className={cn("absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity", theme.bgLight)} />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-lg", theme.primary, theme.shadow)}>
            <BrainCircuit size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Gemini Insights</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trợ lý AI phân tích</p>
          </div>
        </div>
        
        <button 
          onClick={fetchInsights}
          disabled={isLoading}
          className={cn("p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-all disabled:opacity-50", theme.accent.replace('text-', 'hover:text-'))}
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 flex flex-col items-center justify-center gap-3"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className={cn("w-2 h-2 rounded-full", theme.primary)}
                  />
                ))}
              </div>
              <p className="text-xs font-medium text-slate-400 italic">Đang phân tích dữ liệu của bạn...</p>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn("flex gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white transition-all group/item", theme.accent.replace('text-', 'hover:border-').replace('600', '100'))}
                >
                  <div className="mt-1">
                    <Sparkles size={14} className={theme.accent} />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {insight}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isLoading && lastUpdate && (
        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            Cập nhật lần cuối: {lastUpdate.toLocaleTimeString()}
          </span>
          <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest", theme.accent)}>
            Chi tiết <ChevronRight size={12} />
          </div>
        </div>
      )}
    </div>
  );
}
