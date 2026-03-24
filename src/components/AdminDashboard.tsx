import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, getDocsFromCache, query, orderBy, limit, doc, getDoc, getDocFromCache, onSnapshot, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { useAttendance } from '../contexts/AttendanceContext';
import { Users, Activity, Shield, ChevronRight, Search, Calendar, DollarSign, Clock, MonitorSmartphone, Mail, Phone, Globe, ExternalLink, Award, Edit2, Check, X, Bell, Lock, Unlock, UserCog, MoreVertical, ChevronLeft } from 'lucide-react';
import { format, differenceInMinutes, parseISO, subMonths, addMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';

import { Loading } from './Loading';
import { useToast } from './Toast';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
  staffId?: string;
  createdAt: string;
  isLocked?: boolean;
}

interface UserStats {
  totalHours: number;
  totalSalary: number;
  lastActive: string;
  loginCount: number;
  totalRecords: number;
  workingDaysPerMonth: number;
  baseWage: number;
  monthlyWage: number;
  overtimeHours: number;
  overtimeIncome: number;
  presentDays: number;
}

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

function StatCard({ title, value, icon, color, trend, index = 0, theme }: { title: string; value: string | number; icon: React.ReactNode; color: string; trend?: string; index?: number; theme?: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "p-3 md:p-6 rounded-3xl border shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300", 
        theme ? `${theme.bgLight} ${theme.border} dark:bg-slate-900/50 dark:border-slate-800/50` : color
      )}
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 dark:bg-white/5 rounded-full blur-2xl group-hover:scale-110 transition-transform" />
      <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-xl w-fit mb-3 md:mb-4 relative z-10 group-hover:rotate-12 transition-transform">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{title}</p>
        <p className="text-lg md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5 md:mt-1 truncate">{value}</p>
        {trend && <p className="text-[8px] md:text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 md:mt-1 uppercase tracking-tight truncate">{trend}</p>}
      </div>
    </motion.div>
  );
}

export function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [totalOvertimeHours, setTotalOvertimeHours] = useState(0);
  const [totalOvertimeIncome, setTotalOvertimeIncome] = useState(0);
  const [totalPresentDays, setTotalPresentDays] = useState(0);
  const [selectedUserDevices, setSelectedUserDevices] = useState<any[]>([]);
  const [selectedUserRecords, setSelectedUserRecords] = useState<any[]>([]);
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const fetchingStatsRef = useRef(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [editingStaffId, setEditingStaffId] = useState(false);
  const [newStaffId, setNewStaffId] = useState('');
  const [staffIdSearch, setStaffIdSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'logs'>('overview');

  const { user, theme, themeColor } = useAttendance();
  const { showToast } = useToast();

  const monthStr = format(currentMonth, 'yyyy-MM');
  const startOfMonthStr = `${monthStr}-01`;
  const endOfMonthStr = `${monthStr}-31`;

  useEffect(() => {
    if (!user) return;
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    let unsubscribeUsers = () => {};
    try {
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersList: UserProfile[] = [];
        snapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() } as UserProfile);
        });
        setUsers(usersList);
        if (usersList.length === 0) {
          setLoading(false);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        setLoading(false);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    }

    return () => unsubscribeUsers();
  }, [user]);

  useEffect(() => {
    if (users.length === 0 || fetchingStatsRef.current) return;

    const fetchAllStats = async () => {
      fetchingStatsRef.current = true;
      setLoading(true);
      try {
        let recordsCount = 0;
        let totalPayout = 0;
        let totalHrs = 0;
        let totalOTHours = 0;
        let totalOTIncome = 0;
        let totalPresents = 0;
        const stats: Record<string, UserStats> = {};

        // Fetch stats in parallel for better performance
        await Promise.all(users.map(async (user) => {
          try {
            // Get last active device
            const deviceQ = query(collection(db, `users/${user.id}/devices`), orderBy('timestamp', 'desc'), limit(1));
            let deviceSnap;
            try {
              deviceSnap = await getDocs(deviceQ);
            } catch (error: any) {
              if (error.message?.includes('Quota limit exceeded') || error.message?.includes('resource-exhausted') || error.message?.includes('the client is offline') || error.message?.includes('Failed to get document')) {
                try {
                  deviceSnap = await getDocsFromCache(deviceQ);
                } catch (cacheError) {
                  deviceSnap = { empty: true, docs: [] } as any;
                }
              } else {
                handleFirestoreError(error, OperationType.LIST, `users/${user.id}/devices`);
                throw error;
              }
            }
            let lastActive = 'N/A';
            if (!deviceSnap.empty) {
              lastActive = deviceSnap.docs[0].data().timestamp;
            }
            
            // Get attendance (current month only) and settings
            const attendanceQ = query(
              collection(db, `users/${user.id}/attendance`),
              where('date', '>=', startOfMonthStr),
              where('date', '<=', endOfMonthStr)
            );

            let attendanceSnap;
            let settingsSnap;
            try {
              [attendanceSnap, settingsSnap] = await Promise.all([
                getDocs(attendanceQ).catch(async (error: any) => {
                  if (error.message?.includes('Quota limit exceeded') || error.message?.includes('resource-exhausted') || error.message?.includes('the client is offline') || error.message?.includes('Failed to get document')) {
                    try {
                      return await getDocsFromCache(attendanceQ);
                    } catch (cacheError) {
                      return { empty: true, forEach: () => {}, docs: [] } as any;
                    }
                  }
                  throw error;
                }),
                getDoc(doc(db, `users/${user.id}/settings/salary`)).catch(async (error: any) => {
                  if (error.message?.includes('Quota limit exceeded') || error.message?.includes('resource-exhausted') || error.message?.includes('the client is offline') || error.message?.includes('Failed to get document')) {
                    try {
                      return await getDocFromCache(doc(db, `users/${user.id}/settings/salary`));
                    } catch (cacheError) {
                      return { exists: () => false } as any;
                    }
                  }
                  throw error;
                })
              ]);
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, `users/${user.id}/attendance_or_settings`);
              throw error;
            }

            const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
            const baseWage = settingsData.baseWage || 0;
            const monthlyWage = settingsData.monthlyWage || 0;
            const workingDaysPerMonth = settingsData.workingDaysPerMonth || 26;
            
            let userSalary = 0;
            let userMinutes = 0;
            let userOTMinutes = 0;
            let userOTIncome = 0;
            let userPresents = 0;
            
            attendanceSnap.forEach(doc => {
              const data = doc.data();
              if (data.status === 'present') {
                userSalary += baseWage;
                userPresents++;
              }
              else if (data.status === 'half-day') {
                userSalary += (baseWage * 0.5);
                userPresents += 0.5;
              }
              userSalary += (data.overtimeIncome || 0);
              userOTIncome += (data.overtimeIncome || 0);

              if (data.checkIn && data.checkOut) {
                userMinutes += Math.max(0, differenceInMinutes(parseISO(data.checkOut), parseISO(data.checkIn)));
              }
              if (data.overtimeCheckIn && data.overtimeCheckOut) {
                const otMins = Math.max(0, differenceInMinutes(parseISO(data.overtimeCheckOut), parseISO(data.overtimeCheckIn)));
                userMinutes += otMins;
                userOTMinutes += otMins;
              }
              if (data.extraOvertimeCheckIn && data.extraOvertimeCheckOut) {
                const extraMins = Math.max(0, differenceInMinutes(parseISO(data.extraOvertimeCheckOut), parseISO(data.extraOvertimeCheckIn)));
                userMinutes += extraMins;
                userOTMinutes += extraMins;
              }
            });
            
            recordsCount += attendanceSnap.size;
            totalPayout += userSalary;
            totalHrs += (userMinutes / 60);
            totalOTHours += (userOTMinutes / 60);
            totalOTIncome += userOTIncome;
            totalPresents += userPresents;

            stats[user.id] = {
              totalHours: userMinutes / 60, 
              totalSalary: userSalary,
              lastActive,
              loginCount: deviceSnap.size,
              totalRecords: attendanceSnap.size,
              workingDaysPerMonth,
              baseWage,
              monthlyWage,
              overtimeHours: userOTMinutes / 60,
              overtimeIncome: userOTIncome,
              presentDays: userPresents
            };
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${user.id}/attendance`);
          }
        }));

        // Batch updates
        setUserStats(stats);
        setTotalRecords(recordsCount);
        setTotalAssets(totalPayout);
        setTotalHours(totalHrs);
        setTotalOvertimeHours(totalOTHours);
        setTotalOvertimeIncome(totalOTIncome);
        setTotalPresentDays(totalPresents);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users/*/attendance');
        setLoading(false);
      } finally {
        fetchingStatsRef.current = false;
      }
    };

    fetchAllStats();
  }, [users, monthStr]);

  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserDevices([]);
      setSelectedUserRecords([]);
      setSelectedUserLogs([]);
      setEditingStaffId(false);
      return;
    }

    setNewStaffId(selectedUser.staffId || '');
    setLoadingDetails(true);

    // Real-time devices
    const deviceQ = query(collection(db, `users/${selectedUser.id}/devices`), orderBy('timestamp', 'desc'), limit(20));
    let unsubscribeDevices = () => {};
    try {
      unsubscribeDevices = onSnapshot(deviceQ, (snapshot) => {
        setSelectedUserDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${selectedUser.id}/devices`);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${selectedUser.id}/devices`);
    }

    // Real-time records
    const recordQ = query(collection(db, `users/${selectedUser.id}/attendance`), orderBy('date', 'desc'), limit(30));
    let unsubscribeRecords = () => {};
    try {
      unsubscribeRecords = onSnapshot(recordQ, (snapshot) => {
        setSelectedUserRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${selectedUser.id}/attendance`);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${selectedUser.id}/attendance`);
    }

    // Real-time logs
    const logQ = query(collection(db, `users/${selectedUser.id}/logs`), orderBy('timestamp', 'desc'), limit(30));
    let unsubscribeLogs = () => {};
    try {
      unsubscribeLogs = onSnapshot(logQ, (snapshot) => {
        setSelectedUserLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingDetails(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${selectedUser.id}/logs`);
        setLoadingDetails(false);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${selectedUser.id}/logs`);
      setLoadingDetails(false);
    }

    return () => {
      unsubscribeDevices();
      unsubscribeRecords();
      unsubscribeLogs();
    };
  }, [selectedUser]);

  const handleUpdateStaffId = async () => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), { staffId: newStaffId });
      setSelectedUser({ ...selectedUser, staffId: newStaffId });
      setEditingStaffId(false);
      showToast("Đã cập nhật mã nhân viên", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${selectedUser.id}`);
    }
  };

  const handleSendNotification = (user: UserProfile) => {
    console.log(`Gửi thông báo đến ${user.displayName} (${user.email})`);
    // In a real app, this would open a dialog or call a backend function
  };

  const handleUpdateRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', user.id), { role: newRole });
      showToast(`Đã chuyển sang quyền ${newRole === 'admin' ? 'Quản trị viên' : 'Người dùng'}`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const handleLockAccount = async (user: UserProfile) => {
    const isLocked = user.isLocked || false;
    try {
      await updateDoc(doc(db, 'users', user.id), { isLocked: !isLocked });
      showToast(isLocked ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const handleCheckStaffId = () => {
    if (!staffIdSearch.trim()) return;
    const user = users.find(u => u.staffId?.toLowerCase() === staffIdSearch.toLowerCase().trim());
    if (user) {
      setSelectedUser(user);
      setStaffIdSearch('');
    } else {
      console.warn('Không tìm thấy nhân viên với mã này!');
    }
  };

  const filteredAndPaginatedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.staffId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      const lastActiveDate = userStats[user.id]?.lastActive;
      const isOnline = lastActiveDate && lastActiveDate.startsWith(format(new Date(), 'yyyy-MM-dd'));
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'online' ? isOnline : !isOnline);

      return matchesSearch && matchesRole && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    
    return { paginated, totalPages, totalFiltered: filtered.length };
  }, [users, searchTerm, roleFilter, statusFilter, currentPage, pageSize, userStats]);

  // Chart data: Top active users by records
  const chartData = useMemo(() => 
    users.map(u => ({
      name: u.displayName || 'User',
      records: userStats[u.id]?.totalRecords || 0,
      logins: userStats[u.id]?.loginCount || 0
    })).sort((a, b) => b.records - a.records).slice(0, 5)
  , [users, userStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loading message="Đang tải bảng điều khiển..." />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-2 md:p-6 max-w-7xl mx-auto space-y-3 md:space-y-6 pb-24"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 md:p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden transition-colors duration-300">
        <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl transition-colors duration-300", theme.primary.replace('bg-', 'bg-') + '/5')} />
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className={cn("p-2 rounded-2xl shadow-lg transition-colors duration-300", theme.primary, theme.shadow)}>
              <Shield className="text-white w-6 h-6 md:w-8 md:h-8" /> 
            </div>
            <span className="flex flex-col leading-none">
              <span className={cn("text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mb-1 transition-colors duration-300", theme.accent)}>Quản trị hệ thống</span>
              <span>ADMIN <span className={cn("transition-colors duration-300", theme.accent.replace('text-', 'text-'))}>DASHBOARD</span></span>
            </span>
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
          <div className="flex items-center bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-1 shadow-inner transition-colors duration-300">
            <button 
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-xl text-slate-500 dark:text-slate-400 transition-all active:scale-90"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 px-4 min-w-[100px] text-center uppercase tracking-tighter">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button 
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-xl text-slate-500 dark:text-slate-400 transition-all active:scale-90"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="relative group">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-300", `group-focus-within:${theme.accent}`)} size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nhân sự..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "pl-11 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none w-full sm:w-64 transition-all shadow-sm font-bold text-xs placeholder:text-slate-400 dark:text-slate-100",
                `focus:ring-4 ${theme.ring}/10 focus:${theme.border.replace('border-', 'border-')}`
              )}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button 
            onClick={() => {
              const data = users.map(u => ({
                'Họ tên': u.displayName || 'N/A',
                'Email': u.email,
                'Vai trò': u.role,
                'Lượt đăng nhập': userStats[u.id]?.loginCount || 0,
                'Tổng bản ghi': userStats[u.id]?.totalRecords || 0,
                'Hoạt động cuối': userStats[u.id]?.lastActive || 'N/A'
              }));
              import('xlsx').then(XLSX => {
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Bao_cao_nhan_su");
                XLSX.writeFile(wb, `Bao_cao_admin_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
              });
            }}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 text-white rounded-2xl font-black transition-all active:scale-95 text-[11px] uppercase tracking-widest",
              theme.primary, theme.hover, theme.shadow
            )}
          >
            <Globe size={14} className="animate-pulse" />
            Xuất Excel
          </button>
        </div>
      </header>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <StatCard 
          index={0}
          title="Nhân sự" 
          value={users.length} 
          icon={<Users size={20} className={theme.accent} />} 
          color="" 
          theme={theme}
          trend={`${users.filter(u => u.role === 'admin').length} Admin`}
        />
        <StatCard 
          index={1}
          title="Đang Online" 
          value={Object.values(userStats).filter(s => s.lastActive.startsWith(format(new Date(), 'yyyy-MM-dd'))).length} 
          icon={<Activity size={20} className="text-blue-600 dark:text-blue-400" />} 
          color="bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50" 
          trend="Hôm nay"
        />
        <StatCard 
          index={2}
          title="Tổng Công" 
          value={totalRecords} 
          icon={<Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />} 
          color="bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50" 
          trend={`${totalHours.toFixed(1)}h làm`}
        />
        <StatCard 
          index={3}
          title="Tổng Tài Sản" 
          value={formatVND(totalAssets)} 
          icon={<DollarSign size={20} className="text-amber-600 dark:text-amber-400" />} 
          color="bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/50" 
          trend="Dự kiến chi"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Main Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 transition-colors duration-300">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">Danh sách nhân sự</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", theme.primary)} />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", theme.accent)}>Live Update</span>
                  </div>
                  <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{filteredAndPaginatedUsers.totalFiltered} nhân viên</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                className={cn(
                  "hidden sm:block px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 outline-none uppercase tracking-wider transition-colors duration-300",
                  `focus:ring-4 ${theme.ring}/10 focus:${theme.border.replace('border-', 'border-')}`
                )}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Admin</option>
                <option value="user">Nhân viên</option>
              </select>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className={cn(
                  "hidden sm:block px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 outline-none uppercase tracking-wider transition-colors duration-300",
                  `focus:ring-4 ${theme.ring}/10 focus:${theme.border.replace('border-', 'border-')}`
                )}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="online">Đang Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead className="sticky top-0 z-20 bg-white dark:bg-slate-900 shadow-sm transition-colors duration-300">
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md transition-colors duration-300">
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Nhân viên</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Mã NV</th>
                  <th className="hidden md:table-cell px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Vai trò</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right whitespace-nowrap">Thu nhập</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right whitespace-nowrap">Giờ làm</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right whitespace-nowrap">Công</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right whitespace-nowrap">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                <AnimatePresence mode="popLayout">
                  {filteredAndPaginatedUsers.paginated.length > 0 ? (
                    filteredAndPaginatedUsers.paginated.map((user, index) => (
                      <motion.tr 
                        key={user.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all group cursor-pointer" 
                        onClick={() => setSelectedUser(user)}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform shrink-0 relative">
                              {user.photoURL && user.photoURL.trim() !== '' ? (
                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                                  <Users size={12} />
                                </div>
                              )}
                              <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                                userStats[user.id]?.lastActive?.startsWith(format(new Date(), 'yyyy-MM-dd')) ? theme.primary : "bg-slate-300"
                              )} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-bold text-slate-800 text-xs leading-tight truncate">
                                  {user.displayName || 'Người dùng mới'}
                                </p>
                                {(user as any).isLocked && (
                                  <Lock size={10} className="text-rose-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-2">
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg border border-blue-100/50 dark:border-blue-800/50 transition-colors duration-300">
                            {user.staffId || '---'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-colors duration-300",
                            user.role === 'admin' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : `${theme.bgLight} ${theme.text} dark:bg-slate-800 dark:text-slate-400`
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className={cn("px-4 py-2 text-right font-black text-xs whitespace-nowrap", theme.accent)}>
                          {formatVND(userStats[user.id]?.totalSalary || 0)}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-right font-bold text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap transition-colors duration-300">
                          {(userStats[user.id]?.totalHours || 0).toFixed(1)}h
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-indigo-600 dark:text-indigo-400 text-xs whitespace-nowrap transition-colors duration-300">
                          {(userStats[user.id]?.presentDays || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendNotification(user);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                              title="Gửi thông báo"
                            >
                              <Bell size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateRole(user);
                              }}
                              className={cn("p-1.5 text-slate-400 rounded-lg transition-all", `hover:${theme.accent} hover:${theme.bgLight} dark:hover:bg-slate-800`)}
                              title="Đổi vai trò"
                            >
                              <UserCog size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLockAccount(user);
                              }}
                              className={cn(
                                "p-1.5 rounded-lg transition-all",
                                user.isLocked 
                                  ? "text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50" 
                                  : "text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                              )}
                              title={user.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                            >
                              {user.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                            </button>
                            <div className="w-px h-4 bg-slate-100 dark:bg-slate-800 mx-1 transition-colors duration-300" />
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                              }}
                              className={cn("w-7 h-7 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 transition-all shadow-sm", `group-hover:${theme.primary} group-hover:text-white group-hover:rotate-90`)}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Search size={32} className="opacity-20" />
                          <p className="text-xs font-medium">Không tìm thấy nhân viên nào phù hợp</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[700px] overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30 transition-colors duration-300">
            <AnimatePresence mode="popLayout">
              {filteredAndPaginatedUsers.paginated.length > 0 ? (
                filteredAndPaginatedUsers.paginated.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="p-4 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-md shrink-0 relative group-hover:scale-105 transition-transform">
                          {user.photoURL && user.photoURL.trim() !== '' ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                              <Users size={20} />
                            </div>
                          )}
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm transition-colors duration-300",
                            userStats[user.id]?.lastActive?.startsWith(format(new Date(), 'yyyy-MM-dd')) ? theme.primary : "bg-slate-300 dark:bg-slate-700"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-black text-slate-900 dark:text-slate-100 text-sm leading-tight truncate transition-colors duration-300">
                              {user.displayName || 'Người dùng mới'}
                            </p>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest transition-colors duration-300",
                              user.role === 'admin' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : `${theme.bgLight} ${theme.text} dark:bg-slate-800 dark:text-slate-400`
                            )}>
                              {user.role}
                            </span>
                            {(user as any).isLocked && (
                              <Lock size={10} className="text-rose-500" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 truncate opacity-70 transition-colors duration-300">{user.email}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100/50 dark:border-blue-800/50 transition-colors duration-300">
                              {user.staffId || '---'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className={cn("text-sm font-black transition-colors duration-300", theme.accent)}>{formatVND(userStats[user.id]?.totalSalary || 0)}</p>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 transition-colors duration-300">Thu nhập</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 transition-colors duration-300">
                      <div className="flex items-center gap-4 px-2">
                        <div className="text-center">
                          <p className="text-xs font-black text-slate-700 dark:text-slate-300 transition-colors duration-300">{(userStats[user.id]?.totalHours || 0).toFixed(1)}h</p>
                          <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter transition-colors duration-300">Giờ làm</p>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 transition-colors duration-300" />
                        <div className="text-center">
                          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 transition-colors duration-300">{(userStats[user.id]?.presentDays || 0).toFixed(1)}</p>
                          <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter transition-colors duration-300">Công</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendNotification(user);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 active:scale-90 transition-all"
                        >
                          <Bell size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateRole(user);
                          }}
                          className={cn("p-2 text-slate-400 dark:text-slate-500 active:scale-90 transition-all", `hover:${theme.accent}`)}
                        >
                          <UserCog size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLockAccount(user);
                          }}
                          className={cn(
                            "p-2 active:scale-90 transition-all",
                            user.isLocked ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
                          )}
                        >
                          {user.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <ChevronRight size={16} className={cn("text-slate-300 transition-colors", `group-hover:${theme.accent}`)} />
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Search size={32} className="opacity-20" />
                    <p className="text-xs font-medium">Không tìm thấy nhân viên nào phù hợp</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Trang {currentPage} / {filteredAndPaginatedUsers.totalPages || 1}
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50 transition-all shadow-sm"
              >
                Trước
              </button>
              <button 
                disabled={currentPage >= filteredAndPaginatedUsers.totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, filteredAndPaginatedUsers.totalPages || 1))}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50 transition-all shadow-sm"
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-4 md:space-y-6">
          {/* Quick Check Card */}
          <div className={cn("bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 relative overflow-hidden group hover:shadow-2xl transition-all duration-500", `shadow-${themeColor}-500/5 border-${themeColor}-50 hover:shadow-${themeColor}-500/10`)}>
            <div className={cn("absolute top-0 right-0 w-40 h-40 rounded-full -mr-20 -mt-20 blur-3xl transition-colors duration-500", `bg-${themeColor}-500/5 group-hover:bg-${themeColor}-500/10`)} />
            <div className={cn("absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-12 -mb-12 blur-2xl transition-colors duration-500", theme.primary.replace('bg-', 'bg-') + '/5', `group-hover:${theme.primary.replace('bg-', 'bg-')}/10`)} />
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform", theme.primary, theme.shadow)}>
                <Search size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Kiểm tra nhanh</h3>
                <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", theme.accent)}>Tra cứu nhân sự</p>
              </div>
            </div>

            <div className="relative z-10 space-y-4">
              <div className="relative group/input">
                <input 
                  type="text" 
                  placeholder="Nhập mã NV (VD: NV001)..."
                  value={staffIdSearch}
                  onChange={(e) => setStaffIdSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckStaffId()}
                  className={cn(
                    "w-full pl-6 pr-14 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] outline-none transition-all shadow-inner font-black text-sm placeholder:text-slate-400 placeholder:font-bold dark:text-slate-100",
                    `focus:ring-4 ${theme.ring}/10 focus:${theme.border.replace('border-', 'border-')} ${theme.accent.replace('text-', 'text-')}`
                  )}
                />
                <button 
                  onClick={handleCheckStaffId}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all",
                    theme.primary, theme.hover, theme.shadow
                  )}
                >
                  <ChevronRight size={22} />
                </button>
              </div>
              <div className={cn("flex items-start gap-2 p-3 rounded-2xl border transition-colors duration-300", theme.bgLight.replace('bg-', 'bg-') + '/50', theme.border.replace('border-', 'border-') + '/50', "dark:bg-slate-800/50 dark:border-slate-700/50")}>
                <Activity size={14} className={cn("shrink-0 mt-0.5", theme.accent.replace('text-', 'text-') + '/70')} />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  Nhập mã nhân viên để truy xuất tức thì lịch sử chấm công, thiết bị và nhật ký hoạt động.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Activity className={theme.accent} size={16} /> Top Hoạt Động
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', backgroundColor: '#1e293b', color: '#f8fafc'}}
                    itemStyle={{fontSize: '12px', fontWeight: 700, color: '#f8fafc'}}
                  />
                  <Bar dataKey="records" radius={[6, 6, 0, 0]} barSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? theme.hex : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-4">Số lượng bản ghi chấm công</p>
          </div>

          <div className="bg-slate-900 p-4 md:p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl", theme.primary.replace('bg-', 'bg-') + '/10')} />
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 relative z-10">
              <Shield className={theme.accent.replace('text-', 'text-') + '/70'} size={16} /> Báo Cáo Tổng Hợp
            </h3>
            <div className="grid grid-cols-1 gap-2 relative z-10">
              <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tổng Chi Lương</span>
                <span className={cn("text-sm font-black", theme.accent.replace('text-', 'text-') + '/90')}>
                  {formatVND(totalAssets)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tổng Giờ Làm</span>
                <span className="text-sm font-black text-blue-400">
                  {totalHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tổng Tăng Ca</span>
                <span className="text-sm font-black text-amber-400">
                  {totalOvertimeHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tiền Tăng Ca</span>
                <span className="text-sm font-black text-rose-400">
                  {formatVND(totalOvertimeIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tổng Ngày Công</span>
                <span className="text-sm font-black text-indigo-400">
                  {totalPresentDays.toFixed(1)} ngày
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lương TB/Người</span>
                <span className="text-sm font-black text-slate-200">
                  {users.length > 0 ? formatVND(totalAssets / users.length) : '0đ'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tình trạng</span>
                <span className={cn("flex items-center gap-1.5 text-[10px] font-black", theme.accent.replace('text-', 'text-') + '/90')}>
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", theme.primary)} />
                  ỔN ĐỊNH
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[95vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 transition-colors duration-300"
            >
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md transition-colors duration-300">
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <img 
                    src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.displayName || 'User')}&background=random`} 
                    alt="" 
                    className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-800 shadow-lg group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white dark:border-slate-900 rounded-full shadow-sm transition-colors duration-300",
                    userStats[selectedUser.id]?.lastActive?.startsWith(format(new Date(), 'yyyy-MM-dd')) ? theme.primary : "bg-slate-300 dark:bg-slate-700"
                  )} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 truncate transition-colors duration-300">
                    {selectedUser.displayName}
                    <span className={cn(
                      "px-2 py-0.5 text-[8px] md:text-[10px] font-black rounded-lg uppercase tracking-wider shrink-0 transition-colors duration-300",
                      selectedUser.role === 'admin' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : `${theme.bgLight} ${theme.text} dark:bg-slate-800 dark:text-slate-400`
                    )}>
                      {selectedUser.role}
                    </span>
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-medium truncate transition-colors duration-300">
                      <Mail size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      {selectedUser.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm w-fit transition-colors duration-300">
                      <Award size={12} className="text-blue-500 dark:text-blue-400 shrink-0" />
                      ID: {editingStaffId ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="text"
                            value={newStaffId}
                            onChange={(e) => setNewStaffId(e.target.value)}
                            className={cn("w-20 px-1 py-0.5 border rounded outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100", `focus:ring-1 ${theme.focus}`)}
                            autoFocus
                          />
                          <button onClick={handleUpdateStaffId} className={cn("hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-0.5 rounded", theme.accent)}><Check size={12} /></button>
                          <button onClick={() => setEditingStaffId(false)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-0.5 rounded"><X size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group/id">
                          <span className="text-blue-600 dark:text-blue-400">{selectedUser.staffId || 'Chưa có'}</span>
                          <button onClick={() => setEditingStaffId(true)} className="opacity-0 group-hover/id:opacity-100 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all">
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-2xl text-slate-400 hover:text-rose-500 transition-all active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            {/* Mobile Tabs */}
            <div className="md:hidden flex p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-[80px] z-20 transition-colors duration-300">
              {(['overview', 'attendance', 'logs'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                    activeTab === tab 
                      ? `bg-white dark:bg-slate-900 ${theme.accent} shadow-sm border border-slate-200 dark:border-slate-700` 
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  {tab === 'overview' ? 'Tổng quan' : tab === 'attendance' ? 'Chấm công' : 'Nhật ký'}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(95vh-100px)] custom-scrollbar">
              <div className={cn("space-y-6", activeTab !== 'overview' && "hidden md:block")}>
                {/* Trend Charts (Sparklines) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} className={theme.accent} /> Xu hướng giờ làm
                    </h3>
                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500">30 ngày gần nhất</div>
                  </div>
                  <div className="h-24 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedUserRecords.slice().reverse().map(r => ({
                        date: format(parseISO(r.date), 'dd/MM'),
                        hours: (() => {
                          let main = 0, overtime = 0, extra = 0;
                          if (r.checkIn && r.checkOut) main = Math.max(0, differenceInMinutes(parseISO(r.checkOut), parseISO(r.checkIn))) / 60;
                          if (r.overtimeCheckIn && r.overtimeCheckOut) overtime = Math.max(0, differenceInMinutes(parseISO(r.overtimeCheckOut), parseISO(r.overtimeCheckIn))) / 60;
                          if (r.extraOvertimeCheckIn && r.extraOvertimeCheckOut) extra = Math.max(0, differenceInMinutes(parseISO(r.extraOvertimeCheckOut), parseISO(r.extraOvertimeCheckIn))) / 60;
                          return Number((main + overtime + extra).toFixed(1));
                        })()
                      }))}>
                        <defs>
                          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.hex} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={theme.hex} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={[0, 'auto']} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '9px', backgroundColor: '#1e293b', color: '#f8fafc'}}
                          labelStyle={{fontWeight: 700}}
                        />
                        <Area type="monotone" dataKey="hours" stroke={theme.hex} strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign size={14} className="text-blue-500 dark:text-blue-400" /> Xu hướng thu nhập
                    </h3>
                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Dự kiến theo ngày</div>
                  </div>
                  <div className="h-24 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedUserRecords.slice().reverse().map(r => {
                        const baseWage = userStats[selectedUser.id]?.baseWage || 0;
                        let income = 0;
                        if (r.status === 'present') income = baseWage;
                        else if (r.status === 'half-day') income = baseWage * 0.5;
                        income += (r.overtimeIncome || 0);
                        return {
                          date: format(parseISO(r.date), 'dd/MM'),
                          income
                        };
                      })}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={[0, 'auto']} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '9px', backgroundColor: '#1e293b', color: '#f8fafc'}}
                          labelStyle={{fontWeight: 700}}
                          formatter={(value: number) => formatVND(value)}
                        />
                        <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className={cn("grid grid-cols-2 md:grid-cols-5 gap-3 mb-8", activeTab !== 'overview' && "hidden md:grid")}>
                <div className={cn("p-4 rounded-2xl border hover:shadow-md transition-all duration-300", theme.bgLight, theme.border.replace('border-', 'border-') + '/50', "dark:bg-slate-800/50 dark:border-slate-700/50")}>
                  <div className={cn("flex items-center gap-2 mb-2", theme.accent)}>
                    <DollarSign size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tổng Thu Nhập</span>
                  </div>
                  <div className={cn("text-lg font-black", "text-slate-900 dark:text-white")}>
                    {formatVND(userStats[selectedUser.id]?.totalSalary || 0)}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100/50 dark:border-blue-800/50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tổng Giờ Làm</span>
                  </div>
                  <div className="text-lg font-black text-blue-900 dark:text-blue-100">
                    {(userStats[selectedUser.id]?.totalHours || 0).toFixed(1)}h
                  </div>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100/50 dark:border-amber-800/50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <Activity size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tổng Tăng Ca</span>
                  </div>
                  <div className="text-lg font-black text-amber-900 dark:text-amber-100">
                    {(userStats[selectedUser.id]?.overtimeHours || 0).toFixed(1)}h
                  </div>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100/50 dark:border-rose-800/50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-2">
                    <DollarSign size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tiền Tăng Ca</span>
                  </div>
                  <div className="text-lg font-black text-rose-900 dark:text-rose-100">
                    {formatVND(userStats[selectedUser.id]?.overtimeIncome || 0)}
                  </div>
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Calendar size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Ngày Công</span>
                  </div>
                  <div className="text-lg font-black text-indigo-900 dark:text-indigo-100">
                    {(userStats[selectedUser.id]?.presentDays || 0).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Details & Devices */}
                <div className={cn("space-y-6", activeTab !== 'overview' && "hidden md:block")}>
                  {/* Salary Configuration */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <DollarSign size={14} className={theme.accent} /> Cấu Hình Lương
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Lương cơ bản/ngày</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatVND(userStats[selectedUser.id]?.baseWage || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Lương tháng (dự kiến)</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatVND(userStats[selectedUser.id]?.monthlyWage || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Số ngày công chuẩn</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{userStats[selectedUser.id]?.workingDaysPerMonth || 26} ngày</span>
                      </div>
                    </div>
                  </div>

                  {/* Devices */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <MonitorSmartphone size={14} className="text-blue-500 dark:text-blue-400" /> Thiết Bị Truy Cập
                    </h3>
                    <div className="space-y-3">
                      {selectedUserDevices.length > 0 ? (
                        selectedUserDevices.map((device: any) => (
                          <div key={device.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <MonitorSmartphone size={14} className="text-slate-400 dark:text-slate-500" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 truncate">{device.userAgent}</p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{device.ip}</p>
                              </div>
                            </div>
                            <div className="text-[9px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap ml-2 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                              {format(parseISO(device.timestamp), 'HH:mm dd/MM')}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-4 font-medium italic">Chưa có dữ liệu thiết bị</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Attendance & Logs */}
                <div className="md:col-span-2 space-y-6">
                  {/* Attendance History */}
                  <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all duration-300", activeTab !== 'attendance' && "hidden md:block")}>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <Calendar size={14} className="text-indigo-500 dark:text-indigo-400" /> Lịch Sử Chấm Công
                    </h3>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                            <th className="text-left pb-3 font-black">Ngày</th>
                            <th className="text-left pb-3 font-black">Ca Chính</th>
                            <th className="text-left pb-3 font-black">Tăng Ca</th>
                            <th className="text-right pb-3 font-black">Tiền OT</th>
                            <th className="text-right pb-3 font-black">Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {selectedUserRecords.length > 0 ? (
                            selectedUserRecords.map((record: any) => (
                              <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="py-3 font-black text-slate-900 dark:text-slate-100">
                                  {format(parseISO(record.date), 'dd/MM/yyyy')}
                                </td>
                                <td className="py-3">
                                  {record.checkIn ? (
                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                                      <span className={cn("px-1.5 py-0.5 rounded-md", theme.accent, theme.bgLight, "dark:bg-slate-800 dark:text-slate-300")}>{format(parseISO(record.checkIn), 'HH:mm')}</span>
                                      <span className="text-slate-300 dark:text-slate-600">-</span>
                                      <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-md">{record.checkOut ? format(parseISO(record.checkOut), 'HH:mm') : '--:--'}</span>
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className="py-3">
                                  {record.overtimeCheckIn ? (
                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                                      <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md">{format(parseISO(record.overtimeCheckIn), 'HH:mm')}</span>
                                      <span className="text-slate-300 dark:text-slate-600">-</span>
                                      <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md">{record.overtimeCheckOut ? format(parseISO(record.overtimeCheckOut), 'HH:mm') : '--:--'}</span>
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className={cn("py-3 text-right font-black", theme.accent)}>
                                  {record.overtimeIncome > 0 ? formatVND(record.overtimeIncome) : '-'}
                                </td>
                                <td className="py-3 text-right">
                                  <span className={cn(
                                    "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                                    record.status === 'present' ? `${theme.bgLight} ${theme.text} ${theme.border.replace('border-', 'border-') + '/50'} dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700` :
                                    record.status === 'half-day' ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800" :
                                    "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800"
                                  )}>
                                    {record.status === 'present' ? 'Đủ công' : record.status === 'half-day' ? 'Nửa công' : 'Vắng'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest opacity-50">Chưa có dữ liệu chấm công</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Activity Logs */}
                  <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all duration-300", activeTab !== 'logs' && "hidden md:block")}>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <Activity size={14} className="text-rose-500 dark:text-rose-400" /> Nhật Ký Hoạt Động
                    </h3>
                    <div className="space-y-3">
                      {selectedUserLogs.length > 0 ? (
                        selectedUserLogs.map((log: any) => (
                          <div key={log.id} className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all group/log">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm mt-0.5 group-hover/log:scale-110 transition-transform">
                              <Activity size={12} className="text-slate-400 dark:text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-slate-900 dark:text-slate-100 leading-tight">{log.action}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">
                                  {format(parseISO(log.timestamp), 'HH:mm:ss dd/MM/yyyy')}
                                </span>
                                {log.details && (
                                  <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 font-bold truncate max-w-[150px]">
                                    {log.details}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-8 font-bold uppercase tracking-widest opacity-50">Chưa có hoạt động nào</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

