import { LucideIcon, User, Briefcase, Award, Crown, Zap, ShieldCheck } from 'lucide-react';

export interface Level {
  name: string;
  minHours: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const LEVELS: Level[] = [
  { 
    name: 'Tập sự', 
    minHours: 0, 
    icon: User, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200'
  },
  { 
    name: 'Thành viên', 
    minHours: 50, 
    icon: ShieldCheck, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  { 
    name: 'Chuyên nghiệp', 
    minHours: 200, 
    icon: Briefcase, 
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  { 
    name: 'Chuyên gia', 
    minHours: 600, 
    icon: Award, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  { 
    name: 'Bậc thầy', 
    minHours: 1500, 
    icon: Crown, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  { 
    name: 'Huyền thoại', 
    minHours: 3000, 
    icon: Zap, 
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
];

export function getLevel(totalHours: number): { current: Level, next: Level | null, progress: number } {
  let current = LEVELS[0];
  let next: Level | null = null;

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalHours >= LEVELS[i].minHours) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    } else {
      break;
    }
  }

  let progress = 100;
  if (next) {
    const range = next.minHours - current.minHours;
    const currentProgress = totalHours - current.minHours;
    progress = Math.min(100, Math.max(0, (currentProgress / range) * 100));
  }

  return { current, next, progress };
}
