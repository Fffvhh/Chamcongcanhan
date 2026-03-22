import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  addWeeks,
  subWeeks,
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  parseISO, 
  startOfWeek, 
  endOfWeek,
  isWeekend
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Calendar as CalendarIcon, X, Moon, Wallet, Plus, Trash2, List, Activity } from 'lucide-react';
import { useAttendance, AttendanceStatus } from '../hooks/useAttendance';
import { cn } from '../utils/cn';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { collection, doc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

interface Category {
  id: string;
  category: string;
  amount: number;
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'expenses'>('calendar');
  const { records, updateRecord, getMonthlySummary, fetchMonthData, salarySettings, theme } = useAttendance();

  // Expenses State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthStr = format(currentDate, 'yyyy-MM');

  useEffect(() => {
    if (!auth.currentUser || activeSubTab !== 'expenses') return;
    
    let isMounted = true;
    setIsSyncing(true);
    setError(null);

    fetchMonthData(currentDate)
      .catch(err => {
        console.error("Error fetching month data:", err);
        if (isMounted) setError("Không thể tải dữ liệu chấm công.");
      })
      .finally(() => {
        if (isMounted) setIsSyncing(false);
      });

    const categoriesRef = collection(db, 'users', auth.currentUser.uid, 'spendingPlans', monthStr, 'categories');
    
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        if (isMounted) setCategories(data);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${auth.currentUser?.uid}/spendingPlans/${monthStr}/categories`);
        if (isMounted) setError("Lỗi kết nối dữ liệu chi tiêu.");
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${auth.currentUser?.uid}/spendingPlans/${monthStr}/categories`);
      if (isMounted) setError("Lỗi kết nối dữ liệu chi tiêu.");
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [monthStr, fetchMonthData, activeSubTab, currentDate]);

  const summary = useMemo(() => getMonthlySummary(currentDate), [currentDate, getMonthlySummary]);
  const totalIncome = summary?.totalSalary || 0;

  const addCategory = async () => {
    if (!auth.currentUser || !newCategory || !newAmount) return;
    try {
      const categoriesRef = collection(db, 'users', auth.currentUser.uid, 'spendingPlans', monthStr, 'categories');
      await addDoc(categoriesRef, {
        category: newCategory,
        amount: Number(newAmount.replace(/\./g, '')),
        uid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewCategory('');
      setNewAmount('');
      setError(null);
    } catch (err) {
      console.error("Error adding category:", err);
      setError("Không thể thêm mục chi tiêu.");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      const categoryRef = doc(db, 'users', auth.currentUser.uid, 'spendingPlans', monthStr, 'categories', id);
      await deleteDoc(categoryRef);
      setError(null);
    } catch (err) {
      console.error("Error deleting category:", err);
      setError("Không thể xóa mục chi tiêu.");
    }
  };

  const totalSpent = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const remainingBalance = totalIncome - totalSpent;

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const quickCategories = [
    { name: 'Tiền nhà', amount: 0 },
    { name: 'Ăn uống', amount: 0 },
    { name: 'Điện nước', amount: 0 },
    { name: 'Xăng xe', amount: 0 },
    { name: 'Giải trí', amount: 0 },
  ];

  const nextPeriod = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };
  const prevPeriod = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const startDate = viewMode === 'month' ? startOfWeek(monthStart, { weekStartsOn: 1 }) : weekStart;
  const endDate = viewMode === 'month' ? endOfWeek(monthEnd, { weekStartsOn: 1 }) : weekEnd;

  const dateFormat = viewMode === 'month' ? "MMMM yyyy" : "'Tuần' w, yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getStatusColor = (status: AttendanceStatus | undefined, isWknd: boolean) => {
    if (status === 'present') return cn(theme.secondary, theme.text, theme.border);
    if (status === 'absent') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (status === 'half-day') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (status === 'leave') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (isWknd) return 'bg-slate-50 text-slate-400 border-slate-100';
    return cn("bg-white text-slate-700 border-slate-100 hover:bg-slate-50", theme.hover.replace('hover:bg-', 'hover:bg-opacity-10 hover:bg-'));
  };

  const getStatusIcon = (status: AttendanceStatus | undefined) => {
    if (status === 'present') return <CheckCircle2 size={14} className={theme.accent} />;
    if (status === 'absent') return <XCircle size={14} className="text-rose-500" />;
    if (status === 'half-day') return <Clock size={14} className="text-amber-500" />;
    if (status === 'leave') return <CalendarIcon size={14} className="text-blue-500" />;
    return null;
  };

  const handleDayClick = (day: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isCurrentPeriod = viewMode === 'month' ? isSameMonth(day, monthStart) : true;
    
    if (isCurrentPeriod) {
      if (day > today) {
        console.warn("Không thể chấm công cho ngày trong tương lai.");
        return;
      }
      setSelectedDate(day);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {activeSubTab === 'calendar' ? 'Lịch chấm công' : 'Kế hoạch chi tiêu'}
            </h2>
            <p className="text-sm md:text-base text-slate-500 mt-1">
              {activeSubTab === 'calendar' ? 'Theo dõi quá trình làm việc của bạn' : 'Quản lý tài chính cá nhân hàng tháng'}
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
              <button 
                onClick={() => setActiveSubTab('calendar')}
                className={cn("flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2", activeSubTab === 'calendar' ? cn("bg-white shadow-sm", theme.text) : "text-slate-500 hover:text-slate-700")}
              >
                <CalendarIcon size={16} />
                <span>Chấm công</span>
              </button>
              <button 
                onClick={() => setActiveSubTab('expenses')}
                className={cn("flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2", activeSubTab === 'expenses' ? cn("bg-white shadow-sm", theme.text) : "text-slate-500 hover:text-slate-700")}
              >
                <Wallet size={16} />
                <span>Chi tiêu</span>
              </button>
            </div>
            
            <div className={cn("flex items-center justify-between w-full md:w-auto gap-2 md:gap-4 bg-white p-2 rounded-2xl shadow-sm border", theme.borderLight)}>
              <button onClick={prevPeriod} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <ChevronLeft size={20} className="text-slate-600" />
                </button>
                <span className="text-base md:text-lg font-semibold text-slate-800 min-w-[120px] md:min-w-[140px] text-center capitalize">
                  {format(currentDate, activeSubTab === 'calendar' ? dateFormat : 'MM/yyyy', { locale: vi })}
                </span>
                <button onClick={nextPeriod} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <ChevronRight size={20} className="text-slate-600" />
                </button>
              </div>
            </div>
          </div>

      {activeSubTab === 'calendar' ? (
        <>
          <div className="flex justify-end mb-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('week')}
                className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", viewMode === 'week' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >Tuần</button>
              <button 
                onClick={() => setViewMode('month')}
                className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", viewMode === 'month' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >Tháng</button>
            </div>
          </div>
          <div className={cn("bg-white rounded-2xl md:rounded-3xl shadow-sm border overflow-hidden", theme.borderLight)}>
            <div className={cn("grid grid-cols-7 border-b bg-white", theme.borderLight)}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                <div key={day} className="py-2 md:py-4 text-center text-xs md:text-sm font-semibold text-slate-500 tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[80px] md:auto-rows-[120px]">
              {days.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = records[dateStr];
                const isCurrentPeriod = viewMode === 'month' ? isSameMonth(day, monthStart) : true;
                const isTodayDate = isToday(day);
                const isWknd = isWeekend(day);

                return (
                  <div
                    key={day.toString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "border-r border-b p-1 md:p-2 transition-all relative group overflow-hidden",
                      theme.borderLight,
                      !isCurrentPeriod ? "bg-slate-50/50 text-slate-400 cursor-default" : cn("cursor-pointer hover:ring-2 hover:ring-inset hover:z-20", theme.ring.replace('ring-', 'hover:ring-')),
                      !isCurrentPeriod ? "" : getStatusColor(record?.status, isWknd),
                      isTodayDate && cn("ring-2 ring-inset z-10", theme.ring)
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full text-xs md:text-sm font-medium",
                        isTodayDate ? cn("text-white", theme.primary) : "text-slate-700"
                      )}>
                        {format(day, 'd')}
                      </span>
                      <div className="hidden md:block">{getStatusIcon(record?.status)}</div>
                      <div className="md:hidden mt-1 mr-1 scale-75 origin-top-right">{getStatusIcon(record?.status)}</div>
                    </div>

                    {record && isCurrentPeriod && (
                      <div className="mt-1 md:mt-2 space-y-0.5 md:space-y-1">
                        {record.checkIn && (
                          <div className="text-[9px] md:text-xs font-mono bg-white/50 px-1 md:px-2 py-0.5 md:py-1 rounded flex items-center gap-1 truncate">
                            <span className={cn("font-semibold hidden md:inline", theme.text)}>Vào:</span>
                            <span className={cn("font-semibold md:hidden", theme.text)}>V:</span>
                            {format(parseISO(record.checkIn), 'HH:mm')}
                          </div>
                        )}
                        {record.checkOut && (
                          <div className="text-[9px] md:text-xs font-mono bg-white/50 px-1 md:px-2 py-0.5 md:py-1 rounded flex items-center gap-1 truncate">
                            <span className="text-rose-600 font-semibold hidden md:inline">Ra:</span>
                            <span className="text-rose-600 font-semibold md:hidden">R:</span>
                            {format(parseISO(record.checkOut), 'HH:mm')}
                          </div>
                        )}
                        {record.overtimeCheckIn && (
                          <div className="text-[9px] md:text-xs font-mono bg-white/50 px-1 md:px-2 py-0.5 md:py-1 rounded flex items-center gap-1 truncate">
                            <Moon size={10} className="text-indigo-600 hidden md:inline" />
                            <span className="text-indigo-600 font-semibold md:hidden">C2:</span>
                            {format(parseISO(record.overtimeCheckIn), 'HH:mm')}
                          </div>
                        )}
                        {record.extraOvertimeCheckIn && (
                          <div className="text-[9px] md:text-xs font-mono bg-white/50 px-1 md:px-2 py-0.5 md:py-1 rounded flex items-center gap-1 truncate">
                            <Clock size={10} className="text-amber-600 hidden md:inline" />
                            <span className="text-amber-600 font-semibold md:hidden">TC:</span>
                            {format(parseISO(record.extraOvertimeCheckIn), 'HH:mm')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={cn("mt-6 md:mt-8 flex flex-wrap gap-3 md:gap-6 justify-center bg-white p-4 rounded-2xl shadow-sm border", theme.borderLight)}>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <div className={cn("w-4 h-4 rounded-full border", theme.secondary, theme.border)}></div> Có mặt
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <div className="w-4 h-4 rounded-full bg-rose-100 border border-rose-200"></div> Vắng mặt
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <div className="w-4 h-4 rounded-full bg-amber-100 border border-amber-200"></div> Nửa ngày
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <div className="w-4 h-4 rounded-full bg-blue-100 border border-blue-200"></div> Nghỉ phép
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className={cn("bg-white rounded-2xl p-4 border shadow-sm", theme.borderLight)}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thu nhập</p>
                <h3 className={cn("text-lg font-black mt-1", theme.text)}>
                  {isSyncing ? "..." : formatVND(totalIncome)}
                </h3>
              </div>
              <div className={cn("bg-white rounded-2xl p-4 border shadow-sm", theme.borderLight)}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đã chi</p>
                <h3 className="text-lg font-black text-rose-500 mt-1">
                  {isSyncing ? "..." : formatVND(totalSpent)}
                </h3>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Còn lại</p>
                <h3 className="text-lg font-black text-white mt-1">
                  {isSyncing ? "..." : formatVND(remainingBalance)}
                </h3>
              </div>
            </div>

            <div className={cn("bg-white rounded-3xl shadow-sm border overflow-hidden", theme.borderLight)}>
              <div className={cn("p-4 border-b flex items-center justify-between bg-slate-50/30", theme.borderLight)}>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <List size={16} className={theme.accent} /> 
                  Danh sách chi tiêu
                </h4>
                <span className={cn("text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border", theme.borderLight)}>
                  {categories.length} mục
                </span>
              </div>

              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                {categories.length > 0 ? (
                  categories.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 hover:bg-slate-50/50 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme.secondary, theme.text)}>
                          <Wallet size={14} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-slate-900">{item.amount.toLocaleString('vi-VN')} đ</span>
                        <button 
                          onClick={() => deleteCategory(item.id)} 
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Chưa có mục chi tiêu</div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className={cn("bg-white rounded-3xl shadow-sm border p-6 sticky top-6", theme.borderLight)}>
              <h4 className="font-bold text-slate-800 text-sm mb-6 uppercase tracking-wider">Thêm mục mới</h4>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Tên mục..." 
                  value={newCategory} 
                  onChange={e => setNewCategory(e.target.value)}
                  className={cn("w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-medium outline-none focus:bg-white transition-all", theme.borderLight, theme.focus.replace('ring-', 'border-'))}
                />
                <input 
                  type="text" 
                  placeholder="Số tiền (VNĐ)..." 
                  value={newAmount} 
                  onChange={e => setNewAmount(e.target.value.replace(/\./g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
                  className={cn("w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-black outline-none focus:bg-white transition-all", theme.text, theme.borderLight, theme.focus.replace('ring-', 'border-'))}
                />

                <button 
                  onClick={addCategory} 
                  disabled={!newCategory || !newAmount}
                  className={cn("w-full text-white py-3 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 font-bold text-sm shadow-md", theme.primary, theme.hover, theme.shadow)}
                >
                  <Plus size={16} />
                  <span>Thêm</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDate && (
        <EditModal 
          date={selectedDate} 
          onClose={() => setSelectedDate(null)} 
          record={records[format(selectedDate, 'yyyy-MM-dd')]}
          onSave={(data) => {
            updateRecord(format(selectedDate, 'yyyy-MM-dd'), data);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}

function EditModal({ date, onClose, record, onSave }: { date: Date, onClose: () => void, record: any, onSave: (data: any) => void }) {
  const { theme } = useAttendance();
  const [status, setStatus] = useState<AttendanceStatus>(record?.status || 'present');
  const [checkInTime, setCheckInTime] = useState(record?.checkIn ? format(parseISO(record.checkIn), 'HH:mm') : '');
  const [checkOutTime, setCheckOutTime] = useState(record?.checkOut ? format(parseISO(record.checkOut), 'HH:mm') : '');
  const [overtimeCheckInTime, setOvertimeCheckInTime] = useState(record?.overtimeCheckIn ? format(parseISO(record.overtimeCheckIn), 'HH:mm') : '');
  const [overtimeCheckOutTime, setOvertimeCheckOutTime] = useState(record?.overtimeCheckOut ? format(parseISO(record.overtimeCheckOut), 'HH:mm') : '');
  const [extraOvertimeCheckInTime, setExtraOvertimeCheckInTime] = useState(record?.extraOvertimeCheckIn ? format(parseISO(record.extraOvertimeCheckIn), 'HH:mm') : '');
  const [extraOvertimeCheckOutTime, setExtraOvertimeCheckOutTime] = useState(record?.extraOvertimeCheckOut ? format(parseISO(record.extraOvertimeCheckOut), 'HH:mm') : '');
  const [overtimeIncome, setOvertimeIncome] = useState(record?.overtimeIncome ? parseInt(record.overtimeIncome.toString(), 10).toLocaleString('vi-VN') : '');

  const handleOvertimeIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setOvertimeIncome('');
      return;
    }
    setOvertimeIncome(parseInt(rawValue, 10).toLocaleString('vi-VN'));
  };
  const [notes, setNotes] = useState(record?.notes || '');

  const handleSave = () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const createISO = (timeStr: string) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':');
      const d = new Date(date);
      d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return d.toISOString();
    };

    // Handle cross-day overtime (e.g., 23:00 to 03:00)
    const createOvertimeOutISO = (inStr: string, outStr: string) => {
      if (!outStr) return null;
      const [inHours] = inStr ? inStr.split(':') : ['0'];
      const [outHours, outMinutes] = outStr.split(':');
      
      const d = new Date(date);
      d.setHours(parseInt(outHours, 10), parseInt(outMinutes, 10), 0, 0);
      
      // If checkout hour is less than checkin hour, it's likely the next day
      if (inStr && parseInt(outHours, 10) < parseInt(inHours, 10)) {
        d.setDate(d.getDate() + 1);
      }
      
      return d.toISOString();
    };

    onSave({
      status,
      checkIn: status === 'absent' || status === 'leave' ? null : createISO(checkInTime),
      checkOut: status === 'absent' || status === 'leave' ? null : createISO(checkOutTime),
      overtimeCheckIn: status === 'absent' || status === 'leave' ? null : createISO(overtimeCheckInTime),
      overtimeCheckOut: status === 'absent' || status === 'leave' ? null : createOvertimeOutISO(overtimeCheckInTime, overtimeCheckOutTime),
      extraOvertimeCheckIn: createISO(extraOvertimeCheckInTime),
      extraOvertimeCheckOut: createOvertimeOutISO(extraOvertimeCheckInTime, extraOvertimeCheckOutTime),
      overtimeIncome: parseInt(overtimeIncome.replace(/\D/g, ''), 10) || 0,
      notes
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 shrink-0">
          <h3 className="text-lg md:text-xl font-bold text-slate-800">
            Cập nhật ngày {format(date, 'dd/MM/yyyy')}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className={cn("w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2", theme.focus)}
            >
              <option value="present">Có mặt</option>
              <option value="half-day">Nửa ngày</option>
              <option value="leave">Nghỉ phép</option>
              <option value="absent">Vắng mặt</option>
            </select>
          </div>

          {status !== 'absent' && status !== 'leave' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Clock size={16} className={theme.accent} />
                    Vào (Ca Sáng)
                  </label>
                  <input 
                    type="time" 
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className={cn("w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 font-mono shadow-sm", theme.focus)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-rose-500" />
                    Ra (Ca Sáng)
                  </label>
                  <input 
                    type="time" 
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className={cn("w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 font-mono shadow-sm", theme.focus)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Moon size={16} className="text-indigo-500" />
                    Vào (Ca Chiều)
                  </label>
                  <input 
                    type="time" 
                    value={overtimeCheckInTime} 
                    onChange={(e) => setOvertimeCheckInTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Moon size={16} className="text-purple-500" />
                    Ra (Ca Chiều)
                  </label>
                  <input 
                    type="time" 
                    value={overtimeCheckOutTime} 
                    onChange={(e) => setOvertimeCheckOutTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-sm"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                Vào (Làm thêm)
              </label>
              <input 
                type="time" 
                value={extraOvertimeCheckInTime} 
                onChange={(e) => setExtraOvertimeCheckInTime(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Clock size={16} className="text-orange-500" />
                Ra (Làm thêm)
              </label>
              <input 
                type="time" 
                value={extraOvertimeCheckOutTime} 
                onChange={(e) => setExtraOvertimeCheckOutTime(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <span className="text-yellow-500 font-bold">₫</span>
              Tiền làm thêm (VNĐ)
            </label>
            <input 
              type="text" 
              value={overtimeIncome} 
              onChange={handleOvertimeIncomeChange}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-lg shadow-sm"
              placeholder="Ví dụ: 150.000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn("w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 resize-none shadow-sm", theme.focus)}
              placeholder="Nhập ghi chú (nếu có)..."
            />
          </div>
        </div>

        <div className={cn("p-4 md:p-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0", theme.borderLight)}>
          <button 
            onClick={onClose}
            className="px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-colors text-sm md:text-base"
          >
            Hủy
          </button>
          <button 
            onClick={handleSave}
            className={cn("px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-medium text-white transition-colors shadow-sm text-sm md:text-base", theme.primary, theme.hover, theme.shadow)}
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
