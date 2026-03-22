import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, differenceInMinutes, subDays, getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
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
import { Journey, getJourneys } from '../services/journeyService';

export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave' | 'holiday';
export type ThemeColor = 'slate' | 'emerald' | 'blue' | 'orange' | 'rose' | 'violet' | 'indigo' | 'amber' | 'teal' | 'cyan';

export interface ThemeClasses {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  bg: string;
  bgLight: string;
  border: string;
  borderLight: string;
  ring: string;
  shadow: string;
  hover: string;
  focus: string;
  hex: string;
}

export interface ShiftSettings {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
}

export interface AttendanceRecord {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  overtimeCheckIn?: string | null;
  overtimeCheckOut?: string | null;
  extraOvertimeCheckIn?: string | null;
  extraOvertimeCheckOut?: string | null;
  overtimeIncome?: number;
  status: AttendanceStatus;
  notes: string;
  uid?: string;
}

export interface DeviceHistory {
  id: string;
  userAgent: string;
  platform: string;
  timestamp: string;
  type: string;
  uid: string;
}

export interface SalarySettings {
  userName: string;
  avatarUrl?: string;
  monthlyWage: number;
  workingDaysPerMonth: number;
  baseWage: number;
  shiftSettings: ShiftSettings;
  uid?: string;
  friendCode?: string;
  notificationEnabled?: boolean;
  accountLevel: 1 | 2 | 3;
}

export interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
  lastActive?: string;
  isLocked?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  uid: string;
}

interface AttendanceContextType {
  user: User | null;
  records: Record<string, AttendanceRecord>;
  getTodayRecord: () => AttendanceRecord | undefined;
  getActiveRecord: () => AttendanceRecord | undefined;
  checkIn: () => void;
  checkOut: () => void;
  checkInOvertime: () => void;
  checkOutOvertime: () => void;
  checkInExtra: () => void;
  checkOutExtra: () => void;
  updateRecord: (date: string, data: Partial<AttendanceRecord>) => void;
  getWorkingHours: (record: AttendanceRecord) => { main: number, overtime: number, extra: number, total: number };
  getMonthlySummary: (monthDate: Date) => any;
  exportData: () => string;
  importData: (jsonData: string) => Promise<boolean>;
  clearData: () => Promise<void>;
  deviceHistory: DeviceHistory[];
  salarySettings: SalarySettings;
  updateSalarySettings: (settings: SalarySettings) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  isLoaded: boolean;
  darkMode: boolean;
  userRole: 'user' | 'admin';
  totalHours: number;
  history: AttendanceRecord[];
  hasMore: boolean;
  isLoadingHistory: boolean;
  loadMoreHistory: () => Promise<void>;
  fetchMonthData: (monthDate: Date) => Promise<void>;
  fetchYearData: (year: number) => Promise<void>;
  toggleDarkMode: () => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  theme: ThemeClasses;
  journeys: Journey[];
  refreshJourneys: (force?: boolean) => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

const STORAGE_KEY = 'thang_attendance_data';
const SETTINGS_KEY = 'thang_salary_settings';
const DARK_MODE_KEY = 'thang_dark_mode';
const THEME_COLOR_KEY = 'thang_theme_color';

const THEME_MAP: Record<ThemeColor, ThemeClasses> = {
  slate: {
    primary: 'bg-slate-600',
    secondary: 'bg-slate-100',
    accent: 'text-slate-600',
    text: 'text-slate-700',
    bg: 'bg-slate-600',
    bgLight: 'bg-slate-50',
    border: 'border-slate-200',
    borderLight: 'border-slate-50',
    ring: 'ring-slate-500',
    shadow: 'shadow-slate-500/20',
    hover: 'hover:bg-slate-700',
    focus: 'focus:ring-slate-500',
    hex: '#475569'
  },
  emerald: {
    primary: 'bg-emerald-500',
    secondary: 'bg-emerald-100',
    accent: 'text-emerald-600',
    text: 'text-emerald-700',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-200',
    borderLight: 'border-emerald-50',
    ring: 'ring-emerald-500',
    shadow: 'shadow-emerald-500/20',
    hover: 'hover:bg-emerald-600',
    focus: 'focus:ring-emerald-500',
    hex: '#10b981'
  },
  blue: {
    primary: 'bg-blue-500',
    secondary: 'bg-blue-100',
    accent: 'text-blue-600',
    text: 'text-blue-700',
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    borderLight: 'border-blue-50',
    ring: 'ring-blue-500',
    shadow: 'shadow-blue-500/20',
    hover: 'hover:bg-blue-600',
    focus: 'focus:ring-blue-500',
    hex: '#3b82f6'
  },
  orange: {
    primary: 'bg-orange-500',
    secondary: 'bg-orange-100',
    accent: 'text-orange-600',
    text: 'text-orange-700',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
    borderLight: 'border-orange-50',
    ring: 'ring-orange-500',
    shadow: 'shadow-orange-500/20',
    hover: 'hover:bg-orange-600',
    focus: 'focus:ring-orange-500',
    hex: '#f97316'
  },
  rose: {
    primary: 'bg-rose-500',
    secondary: 'bg-rose-100',
    accent: 'text-rose-600',
    text: 'text-rose-700',
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-50',
    border: 'border-rose-200',
    borderLight: 'border-rose-50',
    ring: 'ring-rose-500',
    shadow: 'shadow-rose-500/20',
    hover: 'hover:bg-rose-600',
    focus: 'focus:ring-rose-500',
    hex: '#f43f5e'
  },
  violet: {
    primary: 'bg-violet-500',
    secondary: 'bg-violet-100',
    accent: 'text-violet-600',
    text: 'text-violet-700',
    bg: 'bg-violet-500',
    bgLight: 'bg-violet-50',
    border: 'border-violet-200',
    borderLight: 'border-violet-50',
    ring: 'ring-violet-500',
    shadow: 'shadow-violet-500/20',
    hover: 'hover:bg-violet-600',
    focus: 'focus:ring-violet-500',
    hex: '#8b5cf6'
  },
  indigo: {
    primary: 'bg-indigo-500',
    secondary: 'bg-indigo-100',
    accent: 'text-indigo-600',
    text: 'text-indigo-700',
    bg: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    border: 'border-indigo-200',
    borderLight: 'border-indigo-50',
    ring: 'ring-indigo-500',
    shadow: 'shadow-indigo-500/20',
    hover: 'hover:bg-indigo-600',
    focus: 'focus:ring-indigo-500',
    hex: '#6366f1'
  },
  amber: {
    primary: 'bg-amber-500',
    secondary: 'bg-amber-100',
    accent: 'text-amber-600',
    text: 'text-amber-700',
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200',
    borderLight: 'border-amber-50',
    ring: 'ring-amber-500',
    shadow: 'shadow-amber-500/20',
    hover: 'hover:bg-amber-600',
    focus: 'focus:ring-amber-500',
    hex: '#f59e0b'
  },
  teal: {
    primary: 'bg-teal-500',
    secondary: 'bg-teal-100',
    accent: 'text-teal-600',
    text: 'text-teal-700',
    bg: 'bg-teal-500',
    bgLight: 'bg-teal-50',
    border: 'border-teal-200',
    borderLight: 'border-teal-50',
    ring: 'ring-teal-500',
    shadow: 'shadow-teal-500/20',
    hover: 'hover:bg-teal-600',
    focus: 'focus:ring-teal-500',
    hex: '#14b8a6'
  },
  cyan: {
    primary: 'bg-cyan-500',
    secondary: 'bg-cyan-100',
    accent: 'text-cyan-600',
    text: 'text-cyan-700',
    bg: 'bg-cyan-500',
    bgLight: 'bg-cyan-50',
    border: 'border-cyan-200',
    borderLight: 'border-cyan-50',
    ring: 'ring-cyan-500',
    shadow: 'shadow-cyan-500/20',
    hover: 'hover:bg-cyan-600',
    focus: 'focus:ring-cyan-500',
    hex: '#06b6d4'
  }
};

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [journeysLoadFailed, setJourneysLoadFailed] = useState(false);
  const [isJourneysLoaded, setIsJourneysLoaded] = useState(false);

  const fetchJourneys = useCallback(async (force = false) => {
    if (!user || (!force && (isJourneysLoaded || journeysLoadFailed))) return;
    try {
      const data = await getJourneys();
      setJourneys(data);
      setJourneysLoadFailed(false);
      setIsJourneysLoaded(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/journeys`);
      setJourneysLoadFailed(true);
      setIsJourneysLoaded(true);
    }
  }, [user, isJourneysLoaded, journeysLoadFailed]);

  useEffect(() => {
    if (user && !isJourneysLoaded && !journeysLoadFailed) fetchJourneys();
  }, [user, fetchJourneys, isJourneysLoaded, journeysLoadFailed]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [salarySettings, setSalarySettings] = useState<SalarySettings>({ 
    userName: 'Me',
    avatarUrl: '',
    monthlyWage: 0, 
    workingDaysPerMonth: 26, 
    baseWage: 0,
    shiftSettings: {
      morningStart: '09:00',
      morningEnd: '13:30',
      afternoonStart: '16:00',
      afternoonEnd: '22:30'
    },
    friendCode: '',
    notificationEnabled: true,
    accountLevel: 1
  });
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistory[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const isLoadedRef = useRef(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DARK_MODE_KEY) === 'true';
    }
    return false;
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(THEME_COLOR_KEY) as ThemeColor) || 'slate';
    }
    return 'slate';
  });

  const setThemeColor = useCallback(async (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem(THEME_COLOR_KEY, color);
    if (user) {
      try {
        await setDoc(doc(db, `users/${user.uid}`), { themeColor: color }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  }, [user]);

  const theme = useMemo(() => THEME_MAP[themeColor], [themeColor]);

  // Safety timeout for loading
  useEffect(() => {
    console.log("AttendanceProvider: Starting loading timeout...");
    const timer = setTimeout(() => {
      if (!isLoadedRef.current) {
        console.warn("AttendanceProvider: Loading timeout reached (15s). Forcing app to load.");
        setIsLoaded(true);
      }
    }, 15000); // Tăng lên 15 giây
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(DARK_MODE_KEY, darkMode.toString());
  }, [darkMode]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRecords({});
        setSalarySettings({ 
          userName: 'Me',
          avatarUrl: '',
          monthlyWage: 0, 
          workingDaysPerMonth: 26, 
          baseWage: 0,
          shiftSettings: {
            morningStart: '09:00',
            morningEnd: '13:30',
            afternoonStart: '16:00',
            afternoonEnd: '22:30'
          },
          accountLevel: 1
        });
        setDeviceHistory([]);
        setHistory([]);
        setLastVisible(null);
        setHasMore(true);
        setUserRole('user');
        setIsLoaded(true);
      } else {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, `users/${currentUser.uid}`);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.isLocked) {
              await auth.signOut();
              console.error("Tài khoản đã bị khóa.");
              return;
            }
            setUserRole(data.role || 'user');
            if (data.themeColor) {
              setThemeColorState(data.themeColor as ThemeColor);
              localStorage.setItem(THEME_COLOR_KEY, data.themeColor);
            }
          } else {
            const isDefaultAdmin = currentUser.email === "tranvanthang.idv1@gmail.com";
            const initialRole = isDefaultAdmin ? 'admin' : 'user';
            const staffId = `NV${Math.floor(1000 + Math.random() * 9000)}`;
            await setDoc(userDocRef, {
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: initialRole,
              staffId: staffId,
              createdAt: new Date().toISOString()
            }, { merge: true });
            setUserRole(initialRole);
          }

          const sessionKey = `login_recorded_${currentUser.uid}`;
          if (!sessionStorage.getItem(sessionKey)) {
            const { addDoc, collection } = await import('firebase/firestore');
            await addDoc(collection(db, `users/${currentUser.uid}/devices`), {
              userAgent: navigator.userAgent,
              platform: navigator.platform || 'Unknown',
              timestamp: new Date().toISOString(),
              type: 'login',
              uid: currentUser.uid
            });
            sessionStorage.setItem(sessionKey, 'true');
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `users/${currentUser.uid}/devices`);
          setIsLoaded(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Track online status
  useEffect(() => {
    if (!user) return;
    const updateLastActive = async () => {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, `users/${user.uid}`), {
          lastActive: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      }
    };
    updateLastActive();
    const interval = setInterval(updateLastActive, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Firestore Sync - Records
  useEffect(() => {
    if (!user) return;
    const threeMonthsAgo = subDays(new Date(), 90);
    const dateStr = format(threeMonthsAgo, 'yyyy-MM-dd');
    const q = query(
      collection(db, `users/${user.uid}/attendance`),
      where('date', '>=', dateStr),
      orderBy('date', 'desc')
    );
    getDocs(q).then((snapshot) => {
      const updatedRecords: Record<string, AttendanceRecord> = {};
      snapshot.forEach((doc) => {
        updatedRecords[doc.id] = doc.data() as AttendanceRecord;
      });
      setRecords(updatedRecords);
      setIsLoaded(true);
    }).catch((error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/attendance`);
      setIsLoaded(true);
    });
  }, [user]);

  // Calculate total hours
  useEffect(() => {
    if (!user || !isLoaded) return;
    let total = 0;
    Object.values(records).forEach(record => {
      let mainMinutes = 0, overtimeMinutes = 0, extraMinutes = 0;
      if (record.checkIn && record.checkOut) {
        mainMinutes = Math.max(0, differenceInMinutes(parseISO(record.checkOut), parseISO(record.checkIn)));
      }
      if (record.overtimeCheckIn && record.overtimeCheckOut) {
        overtimeMinutes = Math.max(0, differenceInMinutes(parseISO(record.overtimeCheckOut), parseISO(record.overtimeCheckIn)));
      }
      if (record.extraOvertimeCheckIn && record.extraOvertimeCheckOut) {
        extraMinutes = Math.max(0, differenceInMinutes(parseISO(record.extraOvertimeCheckOut), parseISO(record.extraOvertimeCheckIn)));
      }
      total += (mainMinutes + overtimeMinutes + extraMinutes) / 60;
    });
    setTotalHours(total);
  }, [user, records, isLoaded]);

  // Pagination for History
  const loadMoreHistory = useCallback(async () => {
    if (!user || !hasMore || isLoadingHistory || historyLoadFailed) return;
    setIsLoadingHistory(true);
    try {
      const attendanceRef = collection(db, `users/${user.uid}/attendance`);
      let q = query(attendanceRef, orderBy('date', 'desc'), limit(20));
      if (lastVisible) q = query(q, startAfter(lastVisible));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const newHistory: AttendanceRecord[] = [];
        snapshot.forEach((doc) => newHistory.push(doc.data() as AttendanceRecord));
        setHistory(prev => [...prev, ...newHistory]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        if (snapshot.docs.length < 20) setHasMore(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/attendance`);
      setHistoryLoadFailed(true);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, lastVisible, hasMore, isLoadingHistory, historyLoadFailed]);

  useEffect(() => {
    if (user && history.length === 0 && !historyLoadFailed) loadMoreHistory();
  }, [user, loadMoreHistory, history.length, historyLoadFailed]);

  // Firestore Sync - Settings
  useEffect(() => {
    if (!user) return;
    const settingsDoc = doc(db, `users/${user.uid}/settings/salary`);
    const userDocRef = doc(db, `users/${user.uid}`);
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(settingsDoc, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SalarySettings;
          if (!data.friendCode) {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const updatedSettings = { ...data, friendCode: newCode };
            setSalarySettings(updatedSettings);
            await setDoc(settingsDoc, { ...updatedSettings, uid: user.uid }, { merge: true });
            await setDoc(userDocRef, { friendCode: newCode }, { merge: true });
          } else {
            setSalarySettings(data);
            await setDoc(userDocRef, { friendCode: data.friendCode }, { merge: true });
          }
        } else {
          const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const defaultSettings = {
            userName: user.displayName || 'Me',
            avatarUrl: user.photoURL || '',
            monthlyWage: 0, 
            workingDaysPerMonth: 26, 
            baseWage: 0,
            shiftSettings: {
              morningStart: '09:00',
              morningEnd: '13:30',
              afternoonStart: '16:00',
              afternoonEnd: '22:30'
            },
            friendCode: newCode,
            uid: user.uid,
            accountLevel: 1
          };
          await setDoc(settingsDoc, defaultSettings);
          await setDoc(userDocRef, { friendCode: newCode }, { merge: true });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/salary`);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/salary`);
    }
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync - Devices
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/devices`));
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const devices: DeviceHistory[] = [];
        snapshot.forEach((doc) => devices.push({ id: doc.id, ...doc.data() } as DeviceHistory));
        devices.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setDeviceHistory(devices);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/devices`);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/devices`);
    }
    return () => unsubscribe();
  }, [user]);

  const addLog = useCallback(async (action: string, details: string) => {
    if (!user) return;
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, `users/${user.uid}/logs`), {
        action,
        details,
        timestamp: new Date().toISOString(),
        uid: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/logs`);
    }
  }, [user]);

  const fetchMonthData = useCallback(async (monthDate: Date) => {
    if (!user) return;
    const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const q = query(collection(db, `users/${user.uid}/attendance`), where('date', '>=', start), where('date', '<=', end));
    const snapshot = await getDocs(q);
    const newRecords: Record<string, AttendanceRecord> = {};
    snapshot.forEach(doc => { newRecords[doc.id] = doc.data() as AttendanceRecord; });
    setRecords(prev => ({ ...prev, ...newRecords }));
  }, [user]);

  const fetchYearData = useCallback(async (year: number) => {
    if (!user) return;
    const start = `${year}-01-01`, end = `${year}-12-31`;
    const q = query(collection(db, `users/${user.uid}/attendance`), where('date', '>=', start), where('date', '<=', end));
    const snapshot = await getDocs(q);
    const newRecords: Record<string, AttendanceRecord> = {};
    snapshot.forEach(doc => { newRecords[doc.id] = doc.data() as AttendanceRecord; });
    setRecords(prev => ({ ...prev, ...newRecords }));
  }, [user]);

  const value = useMemo(() => ({
    user,
    records,
    getTodayRecord: () => records[format(new Date(), 'yyyy-MM-dd')],
    getActiveRecord: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const todayRec = records[today];
      const yesterdayRec = records[yesterday];
      if (todayRec && ((todayRec.checkIn && !todayRec.checkOut) || (todayRec.overtimeCheckIn && !todayRec.overtimeCheckOut))) return todayRec;
      if (yesterdayRec && ((yesterdayRec.checkIn && !yesterdayRec.checkOut) || (yesterdayRec.overtimeCheckIn && !yesterdayRec.overtimeCheckOut))) return yesterdayRec;
      return todayRec;
    },
    checkIn: () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const existing = records[today];
      if (existing?.checkIn) return;
      const newRecord: AttendanceRecord = {
        ...(existing || { date: today, checkOut: null, overtimeCheckIn: null, overtimeCheckOut: null, overtimeIncome: 0, status: 'present', notes: '' }),
        checkIn: now.toISOString(),
        status: 'present',
      };
      const path = `users/${user?.uid}/attendance/${today}`;
      setDoc(doc(db, path), { ...newRecord, uid: user?.uid }).then(() => addLog('CREATE_RECORD', `Ngày ${today}: ${newRecord.status}`));
    },
    checkOut: () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
      if (records[todayStr]?.checkIn && !records[todayStr]?.checkOut) {
        setDoc(doc(db, `users/${user?.uid}/attendance/${todayStr}`), { ...records[todayStr], checkOut: now.toISOString() }, { merge: true });
      } else if (records[yesterdayStr]?.checkIn && !records[yesterdayStr]?.checkOut) {
        setDoc(doc(db, `users/${user?.uid}/attendance/${yesterdayStr}`), { ...records[yesterdayStr], checkOut: now.toISOString() }, { merge: true });
      }
    },
    checkInOvertime: () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const existing = records[today];
      if (existing?.overtimeCheckIn) return;
      const newRecord: AttendanceRecord = {
        ...(existing || { date: today, checkIn: null, checkOut: null, status: 'present', notes: '', overtimeIncome: 0 }),
        overtimeCheckIn: now.toISOString(),
        overtimeCheckOut: null,
      };
      setDoc(doc(db, `users/${user?.uid}/attendance/${today}`), { ...newRecord, uid: user?.uid });
    },
    checkOutOvertime: () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
      if (records[todayStr]?.overtimeCheckIn && !records[todayStr]?.overtimeCheckOut) {
        setDoc(doc(db, `users/${user?.uid}/attendance/${todayStr}`), { ...records[todayStr], overtimeCheckOut: now.toISOString() }, { merge: true });
      } else if (records[yesterdayStr]?.overtimeCheckIn && !records[yesterdayStr]?.overtimeCheckOut) {
        setDoc(doc(db, `users/${user?.uid}/attendance/${yesterdayStr}`), { ...records[yesterdayStr], overtimeCheckOut: now.toISOString() }, { merge: true });
      }
    },
    checkInExtra: () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const existing = records[today];
      if (existing?.extraOvertimeCheckIn) return;
      const newRecord: AttendanceRecord = {
        ...(existing || { date: today, checkIn: null, checkOut: null, status: 'present', notes: '', overtimeIncome: 0 }),
        extraOvertimeCheckIn: now.toISOString(),
        extraOvertimeCheckOut: null,
      };
      setDoc(doc(db, `users/${user?.uid}/attendance/${today}`), { ...newRecord, uid: user?.uid });
    },
    checkOutExtra: () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
      if (records[todayStr]?.extraOvertimeCheckIn && !records[todayStr]?.extraOvertimeCheckOut) {
        setDoc(doc(db, `users/${user?.uid}/attendance/${todayStr}`), { ...records[todayStr], extraOvertimeCheckOut: now.toISOString() }, { merge: true });
      } else if (records[yesterdayStr]?.extraOvertimeCheckIn && !records[yesterdayStr]?.extraOvertimeCheckOut) {
        setDoc(doc(db, `users/${user?.uid}/attendance/${yesterdayStr}`), { ...records[yesterdayStr], extraOvertimeCheckOut: now.toISOString() }, { merge: true });
      }
    },
    updateRecord: async (date: string, data: Partial<AttendanceRecord>) => {
      if (!user) return;
      const newRecord = { ...(records[date] || { date, checkIn: null, checkOut: null, status: 'absent', notes: '' }), ...data };
      await setDoc(doc(db, `users/${user.uid}/attendance/${date}`), { ...newRecord, uid: user.uid });
    },
    getWorkingHours: (record: AttendanceRecord) => {
      let main = 0, overtime = 0, extra = 0;
      if (record.checkIn && record.checkOut) main = Math.max(0, differenceInMinutes(parseISO(record.checkOut), parseISO(record.checkIn))) / 60;
      if (record.overtimeCheckIn && record.overtimeCheckOut) overtime = Math.max(0, differenceInMinutes(parseISO(record.overtimeCheckOut), parseISO(record.overtimeCheckIn))) / 60;
      if (record.extraOvertimeCheckIn && record.extraOvertimeCheckOut) extra = Math.max(0, differenceInMinutes(parseISO(record.extraOvertimeCheckOut), parseISO(record.extraOvertimeCheckIn))) / 60;
      return { main, overtime, extra, total: main + overtime + extra };
    },
    getMonthlySummary: (monthDate: Date) => {
      const monthStartStr = format(monthDate, 'yyyy-MM');
      const totalDaysInMonth = getDaysInMonth(monthDate);
      const maxPaidLeaves = totalDaysInMonth === 31 ? 3 : 2;
      let totalWorkDays = 0, totalOvertimeIncome = 0, totalHours = 0, leaveCount = 0, presentDays = 0, halfDays = 0, absentDays = 0;
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const dateStr = `${monthStartStr}-${day.toString().padStart(2, '0')}`;
        const record = records[dateStr];
        if (record) {
          if (record.status === 'present') { totalWorkDays += 1; presentDays += 1; }
          else if (record.status === 'half-day') { totalWorkDays += 0.5; halfDays += 1; }
          else if (record.status === 'leave') leaveCount += 1;
          else if (record.status === 'absent') absentDays += 1;
          const h = value.getWorkingHours(record);
          totalHours += h.total;
          totalOvertimeIncome += (record.overtimeIncome || 0);
        }
      }
      const paidLeaveCount = Math.min(leaveCount, maxPaidLeaves);
      totalWorkDays += paidLeaveCount;
      const totalSalary = (totalWorkDays * salarySettings.baseWage) + totalOvertimeIncome;
      return { totalWorkDays, totalHours, totalOvertimeIncome, totalSalary, leaveCount, paidLeaveCount, maxPaidLeaves, presentDays, halfDays, absentDays };
    },
    exportData: () => JSON.stringify(records),
    importData: async (jsonData: string) => {
      try {
        const parsed = JSON.parse(jsonData);
        if (user) {
          for (const [date, record] of Object.entries(parsed)) {
            await setDoc(doc(db, `users/${user.uid}/attendance/${date}`), { ...(record as any), uid: user.uid });
          }
        }
        return true;
      } catch (e) { return false; }
    },
    clearData: async () => { if (!user) { setRecords({}); localStorage.removeItem(STORAGE_KEY); } },
    deviceHistory,
    salarySettings,
    updateSalarySettings: async (settings: SalarySettings) => {
      setSalarySettings(settings);
      if (user) await setDoc(doc(db, `users/${user.uid}/settings/salary`), { ...settings, uid: user.uid });
    },
    updateUserProfile: async (data: Partial<UserProfile>) => {
      if (!user) return;
      await setDoc(doc(db, `users/${user.uid}`), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      if (data.role) setUserRole(data.role as 'user' | 'admin');
    },
    isLoaded,
    darkMode,
    userRole,
    totalHours,
    history,
    hasMore,
    isLoadingHistory,
    loadMoreHistory,
    fetchMonthData,
    fetchYearData,
    toggleDarkMode: () => setDarkMode(!darkMode),
    themeColor,
    setThemeColor,
    theme,
    journeys,
    refreshJourneys: fetchJourneys
  }), [user, records, userRole, isLoaded, darkMode, salarySettings, deviceHistory, totalHours, history, hasMore, isLoadingHistory, loadMoreHistory, fetchMonthData, fetchYearData, themeColor, setThemeColor, theme, journeys, fetchJourneys]);

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
