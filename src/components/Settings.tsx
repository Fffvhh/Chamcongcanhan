import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, DownloadCloud, Trash2, AlertTriangle, CheckCircle2, DollarSign, Save, Cloud, LogIn, LogOut, User as UserIcon, Camera, Clock, CreditCard, Share2, ChevronRight, FileText, FileSpreadsheet, MonitorSmartphone, Info, BookOpen, ShieldCheck, RefreshCw, X, Users, Palette, Globe, Code } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import { signInWithGoogle, logout } from '../firebase';
import { cn } from '../utils/cn';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { vi } from 'date-fns/locale';

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { CloudStorage } from './CloudStorage';
import { PasswordVault } from './PasswordVault';
import { LevelShowcase } from './LevelShowcase';
import { generateWebsitePackage } from '../utils/zipGenerator';

export function Settings() {
  const { exportData, importData, clearData, salarySettings, updateSalarySettings, updateUserProfile, user, records, userRole, getWorkingHours, getMonthlySummary, totalHours, themeColor, setThemeColor, theme, darkMode, toggleDarkMode } = useAttendance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingImportContent, setPendingImportContent] = useState<string | null>(null);
  
  const [isEditingWorkSettings, setIsEditingWorkSettings] = useState(false);
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [joinDate, setJoinDate] = useState<string>('');

  useEffect(() => {
    if (user) {
      setJoinDate(user.metadata.creationTime ? format(new Date(user.metadata.creationTime), 'dd/MM/yyyy') : 'Không xác định');
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total visits
        const visitsDoc = await getDoc(doc(db, 'stats', 'visits'));
        if (visitsDoc.exists()) {
          setTotalVisits(visitsDoc.data().count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch stats (visits)", error);
      }

      try {
        // Fetch online users (active in last 5 minutes)
        // Only admins can list the users collection
        const isAdmin = userRole === 'admin' || user?.email === "tranvanthang.idv1@gmail.com";
        if (user && isAdmin) {
          const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const q = query(collection(db, 'users'), where('lastActive', '>=', fiveMinsAgo));
          const snapshot = await getDocs(q);
          setOnlineUsers(snapshot.size);
        } else if (user) {
          // For normal users, we could show a static number or just 1 (themselves)
          setOnlineUsers(1); 
        }
      } catch (error) {
        console.error(`Failed to fetch stats (online users). User: ${user?.email}, Role: ${userRole}`, error);
      }
    };

    fetchStats();
    // Refresh online users every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [user, userRole]);

  
  const [selectedMonth] = useState(new Date());
  const [userName, setUserName] = useState(salarySettings.userName || 'Me');
  const [avatarUrl, setAvatarUrl] = useState(salarySettings.avatarUrl || '');
  const [monthlyWage, setMonthlyWage] = useState(salarySettings.monthlyWage?.toLocaleString('vi-VN') || '0');
  const [workingDays, setWorkingDays] = useState(salarySettings.workingDaysPerMonth?.toString() || '26');
  
  const [morningStart, setMorningStart] = useState(salarySettings.shiftSettings?.morningStart || '09:00');
  const [morningEnd, setMorningEnd] = useState(salarySettings.shiftSettings?.morningEnd || '13:30');
  const [afternoonStart, setAfternoonStart] = useState(salarySettings.shiftSettings?.afternoonStart || '16:00');
  const [afternoonEnd, setAfternoonEnd] = useState(salarySettings.shiftSettings?.afternoonEnd || '22:30');

  useEffect(() => {
    const newUserName = salarySettings.userName || 'Me';
    const newAvatarUrl = salarySettings.avatarUrl || '';
    const newMonthlyWage = salarySettings.monthlyWage?.toLocaleString('vi-VN') || '0';
    const newWorkingDays = salarySettings.workingDaysPerMonth?.toString() || '26';
    const newMorningStart = salarySettings.shiftSettings?.morningStart || '09:00';
    const newMorningEnd = salarySettings.shiftSettings?.morningEnd || '13:30';
    const newAfternoonStart = salarySettings.shiftSettings?.afternoonStart || '16:00';
    const newAfternoonEnd = salarySettings.shiftSettings?.afternoonEnd || '22:30';

    if (userName !== newUserName) setUserName(newUserName);
    if (avatarUrl !== newAvatarUrl) setAvatarUrl(newAvatarUrl);
    if (monthlyWage !== newMonthlyWage) setMonthlyWage(newMonthlyWage);
    if (workingDays !== newWorkingDays) setWorkingDays(newWorkingDays);
    if (morningStart !== newMorningStart) setMorningStart(newMorningStart);
    if (morningEnd !== newMorningEnd) setMorningEnd(newMorningEnd);
    if (afternoonStart !== newAfternoonStart) setAfternoonStart(newAfternoonStart);
    if (afternoonEnd !== newAfternoonEnd) setAfternoonEnd(newAfternoonEnd);
  }, [salarySettings, user]);

  const handleMonthlyWageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setMonthlyWage('');
      return;
    }
    setMonthlyWage(parseInt(rawValue, 10).toLocaleString('vi-VN'));
  };

  const parsedMonthly = parseInt(monthlyWage.replace(/\D/g, ''), 10) || 0;
  const parsedDays = parseFloat(workingDays) || 26;
  const calculatedDaily = parsedDays > 0 ? parsedMonthly / parsedDays : 0;

  const handleSaveSalarySettings = async () => {
    updateSalarySettings({
      userName: userName.trim() || 'Me',
      avatarUrl,
      monthlyWage: parsedMonthly,
      workingDaysPerMonth: parsedDays,
      baseWage: calculatedDaily,
      shiftSettings: {
        morningStart,
        morningEnd,
        afternoonStart,
        afternoonEnd
      },
      accountLevel: salarySettings.accountLevel
    });

    // Also update user profile with extra info
    await updateUserProfile({
      displayName: userName.trim() || 'Me',
      photoURL: avatarUrl || user?.photoURL || '',
    });
    
    setStatusMessage({ type: 'success', text: 'Đã lưu cài đặt lương và thông tin cá nhân thành công!' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fileName = `TimeTracker_Backup_${userName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatusMessage({ type: 'success', text: 'Đã tải xuống bản sao lưu JSON thành công!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Lỗi khi tạo bản sao lưu.' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        // Basic validation
        JSON.parse(content);
        setPendingImportContent(content);
        setShowRestoreConfirm(true);
      } catch (e) {
        setStatusMessage({ type: 'error', text: 'File JSON không hợp lệ.' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!pendingImportContent) return;
    
    const success = await importData(pendingImportContent);
    if (success) {
      setStatusMessage({ type: 'success', text: 'Đã phục hồi dữ liệu thành công!' });
    } else {
      setStatusMessage({ type: 'error', text: 'Lỗi khi phục hồi dữ liệu.' });
    }
    
    setShowRestoreConfirm(false);
    setPendingImportContent(null);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setAvatarUrl(compressedBase64);
        
        updateSalarySettings({
          ...salarySettings,
          userName: userName.trim() || 'Me',
          avatarUrl: compressedBase64
        });
        
        setStatusMessage({ type: 'success', text: 'Đã cập nhật ảnh đại diện!' });
        setTimeout(() => setStatusMessage(null), 3000);
      };
    };
  };

  const handleExportExcel = () => {
    try {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      const days = eachDayOfInterval({ start, end });
      
      const data = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = records[dateStr];
        const hours = record ? getWorkingHours(record) : { total: 0 };
        
        return {
          'Ngày': format(day, 'dd/MM/yyyy'),
          'Thứ': format(day, 'EEEE', { locale: vi }),
          'Trạng thái': record ? (record.status === 'present' ? 'Đi làm' : record.status === 'half-day' ? 'Nửa ngày' : record.status === 'leave' ? 'Nghỉ phép' : record.status === 'holiday' ? 'Lễ/Tết' : 'Vắng mặt') : 'Chưa chấm',
          'Giờ vào': record?.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '',
          'Giờ ra': record?.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '',
          'Tăng ca vào': record?.overtimeCheckIn ? format(new Date(record.overtimeCheckIn), 'HH:mm') : '',
          'Tăng ca ra': record?.overtimeCheckOut ? format(new Date(record.overtimeCheckOut), 'HH:mm') : '',
          'Tổng giờ': hours.total.toFixed(2),
          'Thu nhập TC': record?.overtimeIncome || 0,
          'Ghi chú': record?.notes || ''
        };
      });

      const summary = getMonthlySummary(selectedMonth);
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Add summary rows at the bottom
      const summaryRows = [
        [],
        ['TỔNG HỢP THÁNG', format(selectedMonth, 'MM/yyyy')],
        ['Họ và tên', userName],
        ['Tổng ngày công', summary.totalWorkDays],
        ['Tổng giờ làm', summary.totalHours.toFixed(2)],
        ['Tổng thu nhập tăng ca', summary.totalOvertimeIncome.toLocaleString('vi-VN') + ' đ'],
        ['Tổng lương dự kiến', summary.totalSalary.toLocaleString('vi-VN') + ' đ'],
      ];
      
      XLSX.utils.sheet_add_aoa(ws, summaryRows, { origin: -1 });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
      
      // Auto-size columns
      const colWidths = [
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, 
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 25 }
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `Bao_cao_${userName.replace(/\s+/g, '_')}_${format(selectedMonth, 'MM_yyyy')}.xlsx`);
      
      setStatusMessage({ type: 'success', text: 'Đã xuất báo cáo Excel thành công!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: 'error', text: 'Lỗi khi xuất file Excel.' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    setStatusMessage({ type: 'info', text: 'Đang chuẩn bị bản in PDF...' });

    try {
      // Wait a bit for the hidden element to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Bao_cao_${userName.replace(/\s+/g, '_')}_${format(selectedMonth, 'MM_yyyy')}.pdf`);
      
      setStatusMessage({ type: 'success', text: 'Đã tải xuống báo cáo PDF chất lượng cao!' });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: 'error', text: 'Lỗi khi tạo file PDF.' });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleShare = async () => {
    const shareUrl = 'https://ais-pre-jivszlzmxmqthzsdn3vxhx-274813482743.asia-east1.run.app/';
    const shareData = {
      title: 'TimeTracker - Ứng dụng chấm công',
      text: 'Quản lý thời gian làm việc và tính lương dễ dàng với TimeTracker!',
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setStatusMessage({ type: 'success', text: 'Đã sao chép đường dẫn ứng dụng!' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      {statusMessage && (
        <div className={cn(
          "p-3.5 rounded-xl flex items-center gap-3 animate-in zoom-in duration-300 text-sm sticky top-4 z-50 shadow-lg",
          statusMessage.type === 'success' ? cn(theme.bgLight, theme.text, theme.border, "border") : 
          statusMessage.type === 'error' ? "bg-rose-50 text-rose-700 border border-rose-200" :
          "bg-blue-50 text-blue-700 border border-blue-200"
        )}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : 
           statusMessage.type === 'error' ? <AlertTriangle size={18} /> :
           <RefreshCw size={18} className="animate-spin" />}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Xác nhận phục hồi?</h3>
            <p className="text-slate-500 text-center text-sm mb-6">
              Hành động này sẽ ghi đè dữ liệu hiện tại bằng dữ liệu từ file sao lưu. Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowRestoreConfirm(false); setPendingImportContent(null); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmRestore}
                className={cn(
                  "flex-1 py-3 text-white rounded-xl font-semibold transition-colors shadow-lg",
                  theme.primary,
                  theme.hover,
                  theme.shadow
                )}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Profile Section */}
      {user ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800/50 overflow-hidden relative group transition-all duration-500 hover:shadow-2xl hover:shadow-slate-300/40 dark:hover:border-slate-700">
          {/* Decorative background - More subtle and elegant */}
          <div className={cn(
            "absolute top-0 left-0 right-0 h-32 opacity-80 transition-all duration-700 group-hover:h-36",
            themeColor === 'slate' ? "bg-gradient-to-br from-slate-400 to-slate-600" :
            themeColor === 'emerald' ? "bg-gradient-to-br from-emerald-400 to-teal-600" :
            themeColor === 'blue' ? "bg-gradient-to-br from-blue-400 to-indigo-600" :
            themeColor === 'orange' ? "bg-gradient-to-br from-orange-400 to-rose-600" :
            themeColor === 'rose' ? "bg-gradient-to-br from-rose-400 to-purple-600" :
            themeColor === 'violet' ? "bg-gradient-to-br from-violet-400 to-indigo-600" :
            themeColor === 'indigo' ? "bg-gradient-to-br from-indigo-400 to-violet-600" :
            themeColor === 'amber' ? "bg-gradient-to-br from-amber-400 to-orange-600" :
            themeColor === 'teal' ? "bg-gradient-to-br from-teal-400 to-cyan-600" :
            "bg-gradient-to-br from-cyan-400 to-indigo-600"
          )}></div>
          
          <div className="p-6 sm:p-8 pt-16 sm:pt-20 relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[1.75rem] border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2">
                {avatarUrl || user.photoURL ? (
                  <img src={avatarUrl || user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={40} className="text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <button 
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all hover:scale-110 z-20"
              >
                <Camera size={14} />
              </button>
              <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" />
            </div>
            
            <div className="flex-1 text-center sm:text-left pb-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{userName}</h3>
                <span className={cn(
                  "inline-flex self-center sm:self-auto px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg border shadow-sm",
                  theme.bgLight, theme.text, theme.border
                )}>
                  {userRole === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-3 font-medium flex items-center justify-center sm:justify-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {user.email}
              </p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Từ: {joinDate}</span>
                </div>
                <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex items-center gap-2">
                  <Cloud size={12} className="text-indigo-500" />
                  <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Đã đồng bộ</span>
                </div>
                <button 
                  onClick={generateWebsitePackage}
                  className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20 flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                >
                  <Globe size={12} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Tải Website</span>
                </button>
                <button 
                  onClick={() => window.open('https://github.com/your-username/your-repo', '_blank')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-200 transition-colors"
                >
                  <Code size={12} className="text-slate-500" />
                  <span className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Xem Mã Nguồn</span>
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap items-center justify-center sm:justify-start gap-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-slate-300 dark:text-slate-600" />
              <span className="text-slate-600 dark:text-slate-300">{totalVisits.toLocaleString('vi-VN')} truy cập</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("relative flex h-2 w-2", onlineUsers > 0 ? "opacity-100" : "opacity-50")}>
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", theme.primary)}></span>
                <span className={cn("relative inline-flex rounded-full h-2 w-2", theme.primary)}></span>
              </span>
              <span className="text-slate-600 dark:text-slate-300">{onlineUsers} trực tuyến</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 text-center sm:text-left">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-inner">
              <UserIcon size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Chưa đăng nhập</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Đăng nhập để đồng bộ và bảo vệ dữ liệu của bạn</p>
            </div>
          </div>
          <button 
            onClick={signInWithGoogle}
            className={cn(
              "w-full sm:w-auto px-8 py-4 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3 hover:scale-105 active:scale-95",
              theme.primary,
              theme.hover,
              theme.shadow
            )}
          >
            <LogIn size={20} /> Đăng nhập ngay
          </button>
        </div>
      )}

      {/* Level Showcase */}
      {user && <LevelShowcase totalHours={totalHours} />}

      {/* Theme Customization */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300", theme.bgLight, theme.accent)}>
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Giao diện</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Tùy chỉnh màu sắc & chế độ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setThemeColor('slate');
                if (darkMode) toggleDarkMode();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
              title="Khôi phục mặc định"
            >
              <RefreshCw size={14} />
            </button>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl transition-colors duration-300">
              <button 
                onClick={() => darkMode && toggleDarkMode()}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                  !darkMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Sáng
              </button>
              <button 
                onClick={() => !darkMode && toggleDarkMode()}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                  darkMode ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Tối
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 mb-6">
            {[
              { id: 'slate', color: 'bg-slate-500', label: 'Hiện đại', desc: 'Xám Slate tinh tế' },
              { id: 'emerald', color: 'bg-emerald-500', label: 'Cổ điển', desc: 'Xanh lá nguyên bản' },
              { id: 'blue', color: 'bg-blue-500', label: 'Thanh lịch', desc: 'Xanh dương dịu mát' },
              { id: 'orange', color: 'bg-orange-500', label: 'Năng động', desc: 'Cam rực rỡ' },
              { id: 'rose', color: 'bg-rose-500', label: 'Lãng mạn', desc: 'Hồng Rose ngọt ngào' },
              { id: 'violet', color: 'bg-violet-500', label: 'Huyền bí', desc: 'Tím Violet sang trọng' },
              { id: 'indigo', color: 'bg-indigo-500', label: 'Sâu lắng', desc: 'Xanh chàm cổ điển' },
              { id: 'amber', color: 'bg-amber-500', label: 'Ấm áp', desc: 'Vàng Amber rạng rỡ' },
              { id: 'teal', color: 'bg-teal-500', label: 'Tươi mới', desc: 'Xanh mòng két hiện đại' },
              { id: 'cyan', color: 'bg-cyan-500', label: 'Sáng tạo', desc: 'Xanh lơ trẻ trung' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeColor(t.id as any)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all duration-300 border-2 relative group",
                  themeColor === t.id 
                    ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 scale-105 shadow-sm" 
                    : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                title={t.label}
              >
                <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-inner relative overflow-hidden transition-transform duration-300 group-hover:scale-110", t.color)}>
                  {themeColor === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                  )}
                </div>
                
                {/* Tooltip for description on hover (desktop) */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 hidden sm:block">
                  {t.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Theme Preview Card */}
          <div className={cn("p-4 rounded-2xl border-2 border-dashed transition-all duration-500", theme.bgLight, theme.border)}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", theme.bg)}>
                <Clock size={16} />
              </div>
              <div>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest", theme.text)}>Xem trước giao diện</p>
                <h4 className="text-sm font-bold text-slate-800">TimeTracker Pro</h4>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={cn("h-8 rounded-lg", theme.bg)}></div>
              <div className={cn("h-8 rounded-lg opacity-40", theme.bg)}></div>
              <div className={cn("h-2 w-full rounded-full", theme.bg)}></div>
              <div className={cn("h-2 w-2/3 rounded-full", theme.bg)}></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-3 italic">
              "Giao diện sẽ được áp dụng ngay lập tức trên toàn bộ ứng dụng."
            </p>
          </div>
        </div>
      </div>

      {/* 2. Work Settings - Hidden for Admins */}
      {user && userRole !== 'admin' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", theme.bgLight, theme.accent)}>
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Cài đặt công việc</h3>
                <p className="text-slate-500 text-xs sm:text-sm">Lương và ca làm việc</p>
              </div>
            </div>
            <button 
              onClick={() => setIsEditingWorkSettings(!isEditingWorkSettings)}
              className={cn("font-semibold text-sm hover:underline", theme.accent)}
            >
              {isEditingWorkSettings ? 'Đóng' : 'Chỉnh sửa'}
            </button>
          </div>
          
          {!isEditingWorkSettings ? (
            <div className="p-4 sm:p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lương tháng</p>
                <p className="font-mono font-bold text-slate-800">{monthlyWage} đ</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ngày công</p>
                <p className="font-mono font-bold text-slate-800">{workingDays} ngày</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ca sáng</p>
                <p className="font-mono font-bold text-slate-800">{morningStart} - {morningEnd}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ca chiều</p>
                <p className="font-mono font-bold text-slate-800">{afternoonStart} - {afternoonEnd}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 space-y-5 bg-slate-50/50 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Tên hiển thị</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className={cn(
                      "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 transition-all font-medium text-sm",
                      theme.focus.replace('focus:', 'focus:ring-').concat('/20'),
                      theme.focus.replace('focus:ring-', 'focus:border-')
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Lương tháng (VNĐ)</label>
                  <input 
                    type="text" 
                    value={monthlyWage}
                    onChange={handleMonthlyWageChange}
                    className={cn(
                      "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 transition-all font-mono text-sm",
                      theme.focus.replace('focus:', 'focus:ring-').concat('/20'),
                      theme.focus.replace('focus:ring-', 'focus:border-')
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ngày công chuẩn</label>
                  <input 
                    type="number" 
                    value={workingDays}
                    onChange={(e) => setWorkingDays(e.target.value)}
                    className={cn(
                      "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 transition-all font-mono text-sm",
                      theme.focus.replace('focus:', 'focus:ring-').concat('/20'),
                      theme.focus.replace('focus:ring-', 'focus:border-')
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Lương ngày</label>
                  <div className={cn("w-full px-4 py-2.5 rounded-xl font-bold font-mono text-sm flex items-center h-[42px] border", theme.bgLight, theme.border, theme.text)}>
                    {calculatedDaily.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Giờ làm việc</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider">Ca Sáng</p>
                    <div className="flex items-center gap-2">
                      <input type="time" value={morningStart} onChange={(e) => setMorningStart(e.target.value)} className={cn("w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-opacity-20", theme.focus.replace('focus:ring-', 'focus:border-'), theme.ring.replace('ring-', 'focus:ring-'))} />
                      <span className="text-slate-400">-</span>
                      <input type="time" value={morningEnd} onChange={(e) => setMorningEnd(e.target.value)} className={cn("w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-opacity-20", theme.focus.replace('focus:ring-', 'focus:border-'), theme.ring.replace('ring-', 'focus:ring-'))} />
                    </div>
                  </div>
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider">Ca Chiều</p>
                    <div className="flex items-center gap-2">
                      <input type="time" value={afternoonStart} onChange={(e) => setAfternoonStart(e.target.value)} className={cn("w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-opacity-20", theme.focus.replace('focus:ring-', 'focus:border-'), theme.ring.replace('ring-', 'focus:ring-'))} />
                      <span className="text-slate-400">-</span>
                      <input type="time" value={afternoonEnd} onChange={(e) => setAfternoonEnd(e.target.value)} className={cn("w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-opacity-20", theme.focus.replace('focus:ring-', 'focus:border-'), theme.ring.replace('ring-', 'focus:ring-'))} />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  handleSaveSalarySettings();
                  setIsEditingWorkSettings(false);
                }}
                className={cn(
                  "w-full text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm text-sm",
                  theme.primary,
                  theme.hover
                )}
              >
                <Save size={18} /> Lưu cài đặt
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Utilities */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/30 transition-all duration-300">
        {isInstallable && (
          <button 
            onClick={handleInstallClick}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", theme.bgLight, theme.accent)}>
                <MonitorSmartphone size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Cài đặt ứng dụng</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Thêm TimeTracker vào màn hình chính</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
          </button>
        )}
        <button 
          onClick={handleShare}
          className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Chia sẻ ứng dụng</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Giới thiệu TimeTracker cho bạn bè</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
        </button>


        <div className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Info size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Thông báo cập nhật</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Nhận thông báo khi có bản mới</p>
            </div>
          </div>
          <button
            onClick={() => updateSalarySettings({ ...salarySettings, notificationEnabled: !salarySettings.notificationEnabled })}
            className={cn(
              "w-11 h-6 rounded-full transition-all relative",
              salarySettings.notificationEnabled ? theme.primary : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform duration-300",
              salarySettings.notificationEnabled ? "left-6" : "left-1"
            )} />
          </button>
        </div>
      </div>

      {/* 4. Cloud Storage */}
      <CloudStorage />

      {/* 6. Password Vault */}
      <PasswordVault />

      {/* 7. About & Guide */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 overflow-hidden transition-all duration-300">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Thông tin & Hướng dẫn</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Sử dụng ứng dụng hiệu quả</p>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex gap-4 items-start group">
            <div className="mt-1 text-emerald-500 dark:text-emerald-400 transition-transform group-hover:scale-110"><CheckCircle2 size={18} /></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Chấm công hàng ngày</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Sử dụng nút "Chấm công" ở trang chủ để ghi nhận giờ vào/ra. Bạn có thể chọn ca làm việc hoặc thêm ghi chú nhanh.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start group">
            <div className="mt-1 text-indigo-500 dark:text-indigo-400 transition-transform group-hover:scale-110"><BookOpen size={18} /></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Theo dõi báo cáo</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Xem tổng hợp giờ làm và thu nhập ước tính tại mục "Báo cáo". Hệ thống hỗ trợ xem theo tháng hoặc theo năm linh hoạt.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start group">
            <div className="mt-1 text-blue-500 dark:text-blue-400 transition-transform group-hover:scale-110"><ShieldCheck size={18} /></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Đồng bộ dữ liệu</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Đăng nhập bằng Google để tự động sao lưu dữ liệu lên đám mây, đảm bảo an toàn tuyệt đối và dễ dàng chuyển đổi thiết bị.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Data & Sync */}
      {user && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 overflow-hidden transition-all duration-300">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Cloud size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Dữ liệu & Đồng bộ</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Quản lý sao lưu & tài khoản</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
            >
              Đăng xuất
            </button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExport} className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all text-left group">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-3 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all">
                  <DownloadCloud size={18} />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Sao lưu JSON</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Lưu dữ liệu về máy</p>
              </button>
              
              <button onClick={handleImportClick} className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all text-left group">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-3 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all">
                  <UploadCloud size={18} />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Phục hồi dữ liệu</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Từ file JSON dự phòng</p>
              </button>
              <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800/50">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExportExcel} className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all text-left group">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-3 group-hover:bg-green-50 dark:group-hover:bg-green-900/30 group-hover:text-green-600 dark:group-hover:text-green-400 transition-all">
                  <FileSpreadsheet size={18} />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Báo cáo Excel</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Xuất bảng tính chi tiết</p>
              </button>
              
              <button 
                onClick={handleExportPDF} 
                disabled={isExporting}
                className={cn(
                  "p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all text-left group",
                  isExporting && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-3 group-hover:bg-red-50 dark:group-hover:bg-red-900/30 group-hover:text-red-600 dark:group-hover:text-red-400 transition-all">
                  {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <FileText size={18} />}
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Báo cáo PDF</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Xuất bản in chất lượng</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Report Template */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        <div 
          ref={reportRef}
          className="w-[210mm] min-h-[297mm] bg-white p-[20mm] text-slate-900 font-sans"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <div className="flex justify-between items-start border-b-2 border-emerald-500 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">BÁO CÁO CHẤM CÔNG</h1>
              <p className="text-emerald-600 font-bold tracking-widest text-sm mt-1">TIMETRACKER SYSTEM</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tháng báo cáo</p>
              <p className="text-xl font-black text-slate-900">{format(selectedMonth, 'MM / yyyy')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thông tin nhân sự</p>
              <p className="text-lg font-bold text-slate-800">{userName}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày xuất báo cáo</p>
              <p className="text-sm font-bold text-slate-800">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-10">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ngày</th>
                <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vào/Ra</th>
                <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tăng ca</th>
                <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Giờ</th>
                <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Thu nhập TC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eachDayOfInterval({
                start: startOfMonth(selectedMonth),
                end: endOfMonth(selectedMonth)
              }).map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = records[dateStr];
                const hours = record ? getWorkingHours(record) : { total: 0 };
                
                return (
                  <tr key={dateStr} className="text-sm">
                    <td className="py-2.5 px-2 font-medium text-slate-700">
                      {format(day, 'dd/MM')} <span className="text-[10px] text-slate-400 ml-1">{format(day, 'EEE', { locale: vi })}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight",
                        record?.status === 'present' ? "bg-emerald-50 text-emerald-600" :
                        record?.status === 'half-day' ? "bg-amber-50 text-amber-600" :
                        record?.status === 'leave' ? "bg-blue-50 text-blue-600" :
                        record?.status === 'holiday' ? "bg-purple-50 text-purple-600" :
                        "bg-slate-50 text-slate-400"
                      )}>
                        {record ? (record.status === 'present' ? 'Đi làm' : record.status === 'half-day' ? 'Nửa ngày' : record.status === 'leave' ? 'Nghỉ phép' : record.status === 'holiday' ? 'Lễ/Tết' : 'Vắng') : '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 font-mono">
                      {record?.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '--'} - {record?.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '--'}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 font-mono">
                      {record?.overtimeCheckIn ? format(new Date(record.overtimeCheckIn), 'HH:mm') : '--'} - {record?.overtimeCheckOut ? format(new Date(record.overtimeCheckOut), 'HH:mm') : '--'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs font-bold text-slate-700">
                      {hours.total > 0 ? hours.total.toFixed(1) + 'h' : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-600">
                      {record?.overtimeIncome ? record.overtimeIncome.toLocaleString('vi-VN') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="bg-slate-50 rounded-3xl p-8 grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng ngày công</p>
              <p className="text-2xl font-black text-slate-900">{getMonthlySummary(selectedMonth).totalWorkDays}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng thu nhập TC</p>
              <p className="text-2xl font-black text-emerald-600">{getMonthlySummary(selectedMonth).totalOvertimeIncome.toLocaleString('vi-VN')} <span className="text-xs">đ</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lương dự kiến</p>
              <p className="text-2xl font-black text-indigo-600">{getMonthlySummary(selectedMonth).totalSalary.toLocaleString('vi-VN')} <span className="text-xs">đ</span></p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-end">
            <div className="text-[10px] text-slate-400 font-medium">
              <p>© 2026 TimeTracker System</p>
              <p>Báo cáo được tạo tự động từ hệ thống</p>
            </div>
            <div className="text-center w-48">
              <p className="text-xs font-bold text-slate-800 mb-16">Người lập biểu</p>
              <p className="text-sm font-bold text-slate-900">{userName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
