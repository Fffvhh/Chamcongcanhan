import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, differenceInMinutes, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { db } from '../firebase'; // Đã gỡ bỏ auth
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDoc, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

// --- CẤU HÌNH USER MẶC ĐỊNH (Thay thế cho Firebase Auth) ---
const MOCK_USER_ID = "user_thang_quynh_luu"; 
const MOCK_USER = {
  uid: MOCK_USER_ID,
  displayName: "Trần Văn Thắng",
  email: "thang@chamcongcanhan.xyz",
  photoURL: "https://ui-avatars.com/api/?name=Thắng&background=10b981&color=fff"
};

export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave' | 'holiday';
export type ThemeColor = 'slate' | 'emerald' | 'blue' | 'orange' | 'rose' | 'violet' | 'indigo' | 'amber' | 'teal' | 'cyan';

// ... (Giữ nguyên các Interface ThemeClasses, ShiftSettings, AttendanceRecord, v.v. của bạn)
export interface ThemeClasses { primary: string; secondary: string; accent: string; text: string; bg: string; bgLight: string; border: string; borderLight: string; ring: string; shadow: string; hover: string; focus: string; hex: string; }
export interface ShiftSettings { morningStart: string; morningEnd: string; afternoonStart: string; afternoonEnd: string; }
export interface AttendanceRecord { date: string; checkIn: string | null; checkOut: string | null; overtimeCheckIn?: string | null; overtimeCheckOut?: string | null; extraOvertimeCheckIn?: string | null; extraOvertimeCheckOut?: string | null; status: AttendanceStatus; notes: string; uid?: string; }
export interface SalarySettings { userName: string; avatarUrl?: string; monthlyWage: number; workingDaysPerMonth: number; baseWage: number; shiftSettings: ShiftSettings; uid?: string; friendCode?: string; notificationEnabled?: boolean; accountLevel: 1 | 2 | 3; }
export interface DeviceHistory { id: string; userAgent: string; platform: string; timestamp: string; type: string; uid: string; }

interface AttendanceContextType {
  user: any | null;
  records: Record<string, AttendanceRecord>;
  salarySettings: SalarySettings;
  isLoaded: boolean;
  darkMode: boolean;
  userRole: 'user' | 'admin';
  themeColor: ThemeColor;
  theme: ThemeClasses;
  setThemeColor: (color: ThemeColor) => void;
  toggleDarkMode: () => void;
  // ... Thêm các hàm khác nếu bạn cần dùng trong UI
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

const DARK_MODE_KEY = 'thang_dark_mode';
const THEME_COLOR_KEY = 'thang_theme_color';

// Map màu sắc (Giữ nguyên THEME_MAP của bạn)
const THEME_MAP: Record<ThemeColor, ThemeClasses> = {
  slate: { primary: 'bg-slate-600', secondary: 'bg-slate-100', accent: 'text-slate-600', text: 'text-slate-700', bg: 'bg-slate-600', bgLight: 'bg-slate-50', border: 'border-slate-200', borderLight: 'border-slate-50', ring: 'ring-slate-500', shadow: 'shadow-slate-500/20', hover: 'hover:bg-slate-700', focus: 'focus:ring-slate-500', hex: '#475569' },
  emerald: { primary: 'bg-emerald-500', secondary: 'bg-emerald-100', accent: 'text-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', border: 'border-emerald-200', borderLight: 'border-emerald-50', ring: 'ring-emerald-500', shadow: 'shadow-emerald-500/20', hover: 'hover:bg-emerald-600', focus: 'focus:ring-emerald-500', hex: '#10b981' },
  blue: { primary: 'bg-blue-500', secondary: 'bg-blue-100', accent: 'text-blue-600', text: 'text-blue-700', bg: 'bg-blue-500', bgLight: 'bg-blue-50', border: 'border-blue-200', borderLight: 'border-blue-50', ring: 'ring-blue-500', shadow: 'shadow-blue-500/20', hover: 'hover:bg-blue-600', focus: 'focus:ring-blue-500', hex: '#3b82f6' },
  // ... Các màu khác giữ nguyên như code cũ của bạn
  orange: { primary: 'bg-orange-500', secondary: 'bg-orange-100', accent: 'text-orange-600', text: 'text-orange-700', bg: 'bg-orange-500', bgLight: 'bg-orange-50', border: 'border-orange-200', borderLight: 'border-orange-50', ring: 'ring-orange-500', shadow: 'shadow-orange-500/20', hover: 'hover:bg-orange-600', focus: 'focus:ring-orange-500', hex: '#f97316' },
  rose: { primary: 'bg-rose-500', secondary: 'bg-rose-100', accent: 'text-rose-600', text: 'text-rose-700', bg: 'bg-rose-500', bgLight: 'bg-rose-50', border: 'border-rose-200', borderLight: 'border-rose-50', ring: 'ring-rose-500', shadow: 'shadow-rose-500/20', hover: 'hover:bg-rose-600', focus: 'focus:ring-rose-500', hex: '#f43f5e' },
  violet: { primary: 'bg-violet-500', secondary: 'bg-violet-100', accent: 'text-violet-600', text: 'text-violet-700', bg: 'bg-violet-500', bgLight: 'bg-violet-50', border: 'border-violet-200', borderLight: 'border-violet-50', ring: 'ring-violet-500', shadow: 'shadow-violet-500/20', hover: 'hover:bg-violet-600', focus: 'focus:ring-violet-500', hex: '#8b5cf6' },
  indigo: { primary: 'bg-indigo-500', secondary: 'bg-indigo-100', accent: 'text-indigo-600', text: 'text-indigo-700', bg: 'bg-indigo-500', bgLight: 'bg-indigo-50', border: 'border-indigo-200', borderLight: 'border-indigo-50', ring: 'ring-indigo-500', shadow: 'shadow-indigo-500/20', hover: 'hover:bg-indigo-600', focus: 'focus:ring-indigo-500', hex: '#6366f1' },
  amber: { primary: 'bg-amber-500', secondary: 'bg-amber-100', accent: 'text-amber-600', text: 'text-amber-700', bg: 'bg-amber-500', bgLight: 'bg-amber-50', border: 'border-amber-200', borderLight: 'border-amber-50', ring: 'ring-amber-500', shadow: 'shadow-amber-500/20', hover: 'hover:bg-amber-600', focus: 'focus:ring-amber-500', hex: '#f59e0b' },
  teal: { primary: 'bg-teal-500', secondary: 'bg-teal-100', accent: 'text-teal-600', text: 'text-teal-700', bg: 'bg-teal-500', bgLight: 'bg-teal-50', border: 'border-teal-200', borderLight: 'border-teal-50', ring: 'ring-teal-500', shadow: 'shadow-teal-500/20', hover: 'hover:bg-teal-600', focus: 'focus:ring-teal-500', hex: '#14b8a6' },
  cyan: { primary: 'bg-cyan-500', secondary: 'bg-cyan-100', accent: 'text-cyan-600', text: 'text-cyan-700', bg: 'bg-cyan-500', bgLight: 'bg-cyan-50', border: 'border-cyan-200', borderLight: 'border-cyan-50', ring: 'ring-cyan-500', shadow: 'shadow-cyan-500/20', hover: 'hover:bg-cyan-600', focus: 'focus:ring-cyan-500', hex: '#06b6d4' }
};

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  // Luôn gán User cố định để bỏ qua Auth
  const [user] = useState<any>(MOCK_USER);
  const [userRole] = useState<'user' | 'admin'>('admin'); // Cho bạn quyền Admin luôn
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [salarySettings, setSalarySettings] = useState<SalarySettings>({ 
    userName: 'Trần Văn Thắng',
    monthlyWage: 0, workingDaysPerMonth: 26, baseWage: 0,
    shiftSettings: { morningStart: '09:00', morningEnd: '13:30', afternoonStart: '16:00', afternoonEnd: '22:30' },
    notificationEnabled: true, accountLevel: 3
  });

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_MODE_KEY) === 'true');
  const [themeColor, setThemeColorState] = useState<ThemeColor>((localStorage.getItem(THEME_COLOR_KEY) as ThemeColor) || 'emerald');

  const theme = useMemo(() => THEME_MAP[themeColor], [themeColor]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem(THEME_COLOR_KEY, color);
  };

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem(DARK_MODE_KEY, darkMode.toString());
  }, [darkMode]);

  // Đồng bộ Firestore theo User cố định
  useEffect(() => {
    const q = query(
      collection(db, `users/${MOCK_USER_ID}/attendance`),
      orderBy('date', 'desc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updated: Record<string, AttendanceRecord> = {};
      snapshot.forEach(doc => updated[doc.id] = doc.data() as AttendanceRecord);
      setRecords(updated);
      setIsLoaded(true);
    }, () => setIsLoaded(true));
    return () => unsubscribe();
  }, []);

  // Giá trị Context trả về cho toàn ứng dụng
  const value = {
    user,
    records,
    salarySettings,
    isLoaded,
    darkMode,
    userRole,
    themeColor,
    theme,
    setThemeColor,
    toggleDarkMode,
    // Bạn có thể thêm các hàm trống (empty functions) cho checkIn/checkOut nếu chưa viết kịp
    getTodayRecord: () => undefined,
    getActiveRecord: () => undefined,
    checkIn: () => {},
    checkOut: () => {},
  } as any;

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) throw new Error('useAttendance must be used within AttendanceProvider');
  return context;
};
                                                  
