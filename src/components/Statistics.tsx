import React, { useMemo, useState, useRef, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, addYears, subYears, differenceInMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAttendance, AttendanceStatus } from '../hooks/useAttendance';
import { cn } from '../lib/utils';
import { Clock, CalendarCheck, CalendarX, ChevronLeft, ChevronRight, Download, FileText, Moon, FileSpreadsheet, DollarSign, Activity, Sun, Zap, TrendingUp, Award, Calendar, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { exportToExcel, exportToPDF as exportToProfessionalPDF } from '../utils/exportUtils';

export function Statistics() {
  const { records, getWorkingHours, salarySettings, getMonthlySummary, history, hasMore, isLoadingHistory, loadMoreHistory, fetchMonthData, fetchYearData, theme } = useAttendance();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'history'>('month');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch data for the selected period
  useEffect(() => {
    if (viewMode === 'month') {
      fetchMonthData(currentMonth);
    } else if (viewMode === 'year') {
      fetchYearData(currentMonth.getFullYear());
    }
  }, [currentMonth, viewMode, fetchMonthData, fetchYearData]);

  const nextPeriod = () => {
    if (viewMode === 'month') setCurrentMonth(addMonths(currentMonth, 1));
    else if (viewMode === 'year') setCurrentMonth(addYears(currentMonth, 1));
  };
  const prevPeriod = () => {
    if (viewMode === 'month') setCurrentMonth(subMonths(currentMonth, 1));
    else if (viewMode === 'year') setCurrentMonth(subYears(currentMonth, 1));
  };

  const stats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const summary = getMonthlySummary(currentMonth);
    const expectedSalary = (salarySettings.workingDaysPerMonth * salarySettings.baseWage) + summary.totalOvertimeIncome;
    const remainingSalary = Math.max(0, expectedSalary - summary.totalSalary);

    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;
    let totalMainHours = 0;
    let totalOvertimeHours = 0;
    let totalExtraOvertimeHours = 0;

    const chartData = daysInMonth.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = records[dateStr];
      const isWknd = isWeekend(day);
      let mainHours = 0;
      let overtimeHours = 0;
      let extraOvertimeHours = 0;
      let dailyIncome = 0;

      if (record) {
        if (record.status === 'present') present++;
        else if (record.status === 'absent') absent++;
        else if (record.status === 'half-day') halfDay++;
        else if (record.status === 'leave') leave++;
        
        const hours = getWorkingHours(record);
        mainHours = hours.main;
        overtimeHours = hours.overtime;
        extraOvertimeHours = hours.extra;

        totalMainHours += mainHours;
        totalOvertimeHours += overtimeHours;
        totalExtraOvertimeHours += extraOvertimeHours;
        
        // Calculate daily income more accurately based on record data
        // If the record has overtimeIncome, use it. 
        // Base wage is calculated per day.
        let multiplier = 0;
        if (record.status === 'present') multiplier = 1;
        else if (record.status === 'half-day') multiplier = 0.5;
        // Paid leave logic is handled in getMonthlySummary, but for daily view:
        // We'll just show the income if it's a working day or paid leave
        
        // Simplified for chart:
        dailyIncome = (multiplier * salarySettings.baseWage) + (record.overtimeIncome || 0);
      }

      return {
        name: format(day, 'dd/MM'),
        date: day,
        record,
        mainHours: Number(mainHours.toFixed(1)),
        overtimeHours: Number(overtimeHours.toFixed(1)),
        extraOvertimeHours: Number(extraOvertimeHours.toFixed(1)),
        totalHours: Number((mainHours + overtimeHours + extraOvertimeHours).toFixed(1)),
        dailyIncome,
        isWeekend: isWknd
      };
    });

    return { 
      present, 
      absent, 
      halfDay, 
      leave, 
      totalMainHours, 
      totalOvertimeHours, 
      totalExtraOvertimeHours,
      totalHours: summary.totalHours,
      totalSalary: summary.totalSalary,
      expectedSalary,
      remainingSalary,
      paidLeaveCount: summary.paidLeaveCount,
      chartData 
    };
  }, [records, currentMonth, salarySettings.baseWage, getWorkingHours, getMonthlySummary]);

  const yearlyStats = useMemo(() => {
    if (viewMode !== 'year') return null;
    
    const year = currentMonth.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
    
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalLeave = 0;
    let totalMainHours = 0;
    let totalOvertimeHours = 0;
    let totalExtraOvertimeHours = 0;
    let totalSalaryYear = 0;

    const chartData = months.map(month => {
      const summary = getMonthlySummary(month);
      
      let mPresent = 0;
      let mAbsent = 0;
      let mHalfDay = 0;
      let mLeave = 0;
      let mMainHours = 0;
      let mOvertimeHours = 0;
      let mExtraOvertimeHours = 0;

      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = records[dateStr];
        if (record) {
          if (record.status === 'present') mPresent++;
          else if (record.status === 'absent') mAbsent++;
          else if (record.status === 'half-day') mHalfDay++;
          else if (record.status === 'leave') mLeave++;
          
          const hours = getWorkingHours(record);
          mMainHours += hours.main;
          mOvertimeHours += hours.overtime;
          mExtraOvertimeHours += hours.extra;
        }
      });

      totalPresent += mPresent;
      totalAbsent += mAbsent;
      totalHalfDay += mHalfDay;
      totalLeave += mLeave;
      totalMainHours += mMainHours;
      totalOvertimeHours += mOvertimeHours;
      totalExtraOvertimeHours += mExtraOvertimeHours;
      totalSalaryYear += summary.totalSalary;

      return {
        name: `T${format(month, 'M')}`,
        fullName: `Tháng ${format(month, 'M')}`,
        month,
        present: mPresent,
        absent: mAbsent,
        halfDay: mHalfDay,
        leave: mLeave,
        mainHours: Number(mMainHours.toFixed(1)),
        overtimeHours: Number(mOvertimeHours.toFixed(1)),
        extraOvertimeHours: Number(mExtraOvertimeHours.toFixed(1)),
        totalHours: Number(summary.totalHours.toFixed(1)),
        salary: summary.totalSalary
      };
    });

    return {
      present: totalPresent,
      absent: totalAbsent,
      halfDay: totalHalfDay,
      leave: totalLeave,
      totalMainHours,
      totalOvertimeHours,
      totalExtraOvertimeHours,
      totalHours: totalMainHours + totalOvertimeHours + totalExtraOvertimeHours,
      totalSalary: totalSalaryYear,
      chartData
    };
  }, [records, currentMonth, viewMode, getWorkingHours, getMonthlySummary]);

  const handleProfessionalExportPDF = () => {
    const monthYear = viewMode === 'month' ? format(currentMonth, 'MM/yyyy') : format(currentMonth, 'yyyy');
    const monthRecords = stats.chartData.map(d => d.record).filter(Boolean) as any[];
    exportToProfessionalPDF(monthRecords, salarySettings, monthYear, stats);
  };

  const handleProfessionalExportExcel = () => {
    const monthYear = viewMode === 'month' ? format(currentMonth, 'MM/yyyy') : format(currentMonth, 'yyyy');
    const monthRecords = stats.chartData.map(d => d.record).filter(Boolean) as any[];
    exportToExcel(monthRecords, salarySettings, monthYear);
  };

  const getStatusText = (status: AttendanceStatus | undefined) => {
    if (status === 'present') return 'Có mặt';
    if (status === 'absent') return 'Vắng mặt';
    if (status === 'half-day') return 'Nửa ngày';
    if (status === 'leave') return 'Nghỉ phép';
    return 'Chưa có dữ liệu';
  };

  const getStatusColor = (status: AttendanceStatus | undefined) => {
    if (status === 'present') return cn(theme.text, theme.bgLight);
    if (status === 'absent') return 'text-rose-600 bg-rose-50';
    if (status === 'half-day') return 'text-amber-600 bg-amber-50';
    if (status === 'leave') return 'text-blue-600 bg-blue-50';
    return 'text-slate-500 bg-slate-50';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Báo cáo & Thống kê</h2>
          <p className="text-slate-500 text-sm font-medium">Theo dõi hiệu suất và thu nhập của bạn</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setViewMode('month')}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                viewMode === 'month' ? cn("bg-white shadow-sm", theme.text) : "text-slate-500 hover:text-slate-700"
              )}
            >
              Tháng
            </button>
            <button 
              onClick={() => setViewMode('year')}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                viewMode === 'year' ? cn("bg-white shadow-sm", theme.text) : "text-slate-500 hover:text-slate-700"
              )}
            >
              Năm
            </button>
            <button 
              onClick={() => setViewMode('history')}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                viewMode === 'history' ? cn("bg-white shadow-sm", theme.text) : "text-slate-500 hover:text-slate-700"
              )}
            >
              Lịch sử
            </button>
          </div>

          {viewMode !== 'history' && (
            <div className={cn("flex items-center justify-between flex-1 md:flex-none gap-2 bg-white p-1.5 rounded-xl shadow-sm border w-full md:w-auto", theme.borderLight)}>
              <button onClick={prevPeriod} className={cn("p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400", theme.accent.replace('text-', 'hover:text-'))}>
                <ChevronLeft size={18} />
              </button>
              <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-xs font-bold text-slate-800">
                  {viewMode === 'month' ? format(currentMonth, "MM/yyyy") : format(currentMonth, "yyyy")}
                </span>
              </div>
              <button onClick={nextPeriod} className={cn("p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400", theme.accent.replace('text-', 'hover:text-'))}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={handleProfessionalExportExcel}
              className={cn("flex items-center justify-center gap-2 text-white p-3 md:px-4 md:py-3 rounded-2xl font-medium transition-all shadow-sm", theme.primary, theme.hover, theme.shadow)}
              title="Xuất Excel Chuyên nghiệp"
            >
              <FileSpreadsheet size={20} />
              <span className="hidden md:inline">Xuất Excel</span>
            </button>
            <button 
              onClick={handleProfessionalExportPDF}
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white p-3 md:px-4 md:py-3 rounded-2xl font-medium transition-all shadow-sm"
              title="Xuất PDF Chuyên nghiệp"
            >
              <Download size={20} />
              <span className="hidden md:inline">Xuất PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* The content to be exported to PDF */}
      <div ref={reportRef} className="space-y-6 md:space-y-8 bg-white p-1 md:p-0">
        {/* PDF Header - Only visible in PDF or when rendering */}
        <div className="hidden print-header bg-white p-8 rounded-3xl border border-slate-100 mb-8">
          <div className="flex justify-between items-center border-b border-slate-100 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Báo Cáo Chấm Công</h1>
              <p className="text-slate-500 mt-2 text-lg">
                {viewMode === 'month' ? `Tháng ${format(currentMonth, 'MM/yyyy')}` : `Năm ${format(currentMonth, 'yyyy')}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Nhân viên</p>
              <p className={cn("text-xl font-bold", theme.accent)}>{salarySettings.userName}</p>
            </div>
          </div>
        </div>

        {viewMode === 'month' ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 print-hide">
              <StatCard 
                title="Lương hiện tại" 
                value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalSalary)} 
                icon={<DollarSign size={20} className={cn(theme.accent, "md:w-6 md:h-6")} />} 
                color={cn(theme.bgLight, theme.border)} 
                trend={{ value: 'Thu nhập', isUp: true }}
              />
              <StatCard 
                title="Dự kiến tháng" 
                value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.expectedSalary)} 
                icon={<TrendingUp size={20} className="text-blue-500 md:w-6 md:h-6" />} 
                color="bg-blue-50 border-blue-100" 
                trend={{ value: 'Mục tiêu', isUp: true }}
              />
              <StatCard 
                title="Còn lại" 
                value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.remainingSalary)} 
                icon={<Activity size={20} className="text-orange-500 md:w-6 md:h-6" />} 
                color="bg-orange-50 border-orange-100" 
                trend={{ value: 'Cần đạt', isUp: false }}
              />
              <StatCard 
                title="Tổng giờ làm" 
                value={`${stats.totalHours.toFixed(1)}h`} 
                icon={<Clock size={20} className={cn(theme.accent, "md:w-6 md:h-6")} />} 
                color={cn(theme.bgLight, theme.border)} 
                trend={{ value: 'Hiệu suất', isUp: true }}
              />
              <StatCard 
                title="Ngày công" 
                value={`${(stats.present + (stats.halfDay * 0.5)).toFixed(1)}/${stats.chartData.length}`} 
                icon={<CalendarCheck size={20} className="text-blue-500 md:w-6 md:h-6" />} 
                color="bg-blue-50 border-blue-100" 
              />
              <StatCard 
                title="Nghỉ/Vắng" 
                value={`${stats.absent + stats.leave}`} 
                icon={<CalendarX size={20} className="text-rose-500 md:w-6 md:h-6" />} 
                color="bg-rose-50 border-rose-100" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 print-hide">
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                    <Sun size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Ca Sáng</p>
                    <p className="text-lg font-bold text-slate-800">{stats.totalMainHours.toFixed(1)}h</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Moon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Ca Chiều</p>
                    <p className="text-lg font-bold text-slate-800">{stats.totalOvertimeHours.toFixed(1)}h</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Làm thêm</p>
                    <p className="text-lg font-bold text-slate-800">{stats.totalExtraOvertimeHours.toFixed(1)}h</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 print-hide">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <Activity size={20} className={theme.accent} />
                <h3 className="text-lg md:text-xl font-semibold text-slate-800">Biểu đồ giờ làm việc</h3>
              </div>
              <div className="h-[250px] md:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.hex} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={theme.hex} stopOpacity={0.7}/>
                      </linearGradient>
                      <linearGradient id="colorOvertime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.7}/>
                      </linearGradient>
                      <linearGradient id="colorExtra" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.7}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#ffffff', color: '#0f172a', padding: '12px' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 600, padding: '2px 0' }}
                      labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500, color: '#64748b' }} />
                    <Bar 
                      name="Ca Sáng"
                      dataKey="mainHours" 
                      stackId="a"
                      fill="url(#colorMain)" 
                      radius={[0, 0, 4, 4]} 
                      barSize={24}
                    />
                    <Bar 
                      name="Ca Chiều"
                      dataKey="overtimeHours" 
                      stackId="a"
                      fill="url(#colorOvertime)" 
                      radius={[0, 0, 0, 0]} 
                      barSize={24}
                    />
                    <Bar 
                      name="Làm thêm"
                      dataKey="extraOvertimeHours" 
                      stackId="a"
                      fill="url(#colorExtra)" 
                      radius={[4, 4, 0, 0]} 
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed History Table */}
            <div className={cn("bg-white rounded-2xl md:rounded-3xl shadow-sm border overflow-hidden", theme.borderLight)}>
              <div className={cn("p-4 md:p-6 border-b flex items-center gap-3", theme.borderLight)}>
                <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-slate-800">Chi tiết lịch sử chấm công</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={cn("bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase tracking-wider", theme.borderLight)}>
                      <th className={cn("p-3 font-medium border-b", theme.borderLight)}>Ngày</th>
                      <th className={cn("p-3 font-medium border-b", theme.borderLight)}>Ca Sáng</th>
                      <th className={cn("p-3 font-medium border-b", theme.borderLight)}>Ca Chiều</th>
                      <th className={cn("p-3 font-medium border-b", theme.borderLight)}>Tăng ca</th>
                      <th className={cn("p-3 font-medium border-b", theme.borderLight)}>Tổng kết</th>
                      <th className={cn("p-3 font-medium border-b", theme.borderLight)}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {stats.chartData.map((day, idx) => {
                      const hours = getWorkingHours(day.record || { date: '', checkIn: null, checkOut: null, status: 'absent', notes: '' });
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{format(day.date, 'dd/MM')}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{format(day.date, 'EEEE', { locale: vi })}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            <div className="flex items-center gap-2 text-[11px] md:text-xs">
                              <div className="flex flex-col text-slate-400">
                                <span>{day.record?.checkIn ? format(parseISO(day.record.checkIn), 'HH:mm') : '--:--'}</span>
                                <span>{day.record?.checkOut ? format(parseISO(day.record.checkOut), 'HH:mm') : '--:--'}</span>
                              </div>
                              {hours.main > 0 && <span className={cn("font-bold px-1.5 py-0.5 rounded", theme.text, theme.bgLight)}>{hours.main.toFixed(1)}h</span>}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            <div className="flex items-center gap-2 text-[11px] md:text-xs">
                              <div className="flex flex-col text-slate-400">
                                <span>{day.record?.overtimeCheckIn ? format(parseISO(day.record.overtimeCheckIn), 'HH:mm') : '--:--'}</span>
                                <span>{day.record?.overtimeCheckOut ? format(parseISO(day.record.overtimeCheckOut), 'HH:mm') : '--:--'}</span>
                              </div>
                              {hours.overtime > 0 && <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{hours.overtime.toFixed(1)}h</span>}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            <div className="flex items-center gap-2 text-[11px] md:text-xs">
                              <div className="flex flex-col text-slate-400">
                                <span>{day.record?.extraOvertimeCheckIn ? format(parseISO(day.record.extraOvertimeCheckIn), 'HH:mm') : '--:--'}</span>
                                <span>{day.record?.extraOvertimeCheckOut ? format(parseISO(day.record.extraOvertimeCheckOut), 'HH:mm') : '--:--'}</span>
                              </div>
                              {hours.extra > 0 && <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{hours.extra.toFixed(1)}h</span>}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col text-xs md:text-sm">
                              <span className="font-bold text-slate-800">{day.totalHours > 0 ? `${day.totalHours}h` : '--'}</span>
                              <span className={cn("font-bold", theme.text)}>{day.dailyIncome > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(day.dailyIncome) : '--'}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(day.record?.status)}`}>
                                {getStatusText(day.record?.status)}
                              </span>
                              {day.record?.notes && (
                                <span className="text-[10px] text-slate-500 max-w-[120px] truncate" title={day.record.notes}>
                                  {day.record.notes}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : viewMode === 'year' ? (
          yearlyStats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 print-hide">
                <StatCard 
                  title="Tổng thu nhập năm" 
                  value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(yearlyStats.totalSalary)} 
                  icon={<DollarSign size={20} className={cn("md:w-6 md:h-6", theme.accent)} />} 
                  color={cn("border-opacity-20", theme.bgLight, theme.border)} 
                  trend={{ value: 'Cả năm', isUp: true }}
                />
                <StatCard 
                  title="Tổng giờ làm năm" 
                  value={`${yearlyStats.totalHours.toFixed(1)}h`} 
                  icon={<Clock size={20} className="text-blue-500 md:w-6 md:h-6" />} 
                  color="bg-blue-50 border-blue-100" 
                />
                <StatCard 
                  title="Trung bình/tháng" 
                  value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(yearlyStats.totalSalary / 12)} 
                  icon={<TrendingUp size={20} className="text-indigo-500 md:w-6 md:h-6" />} 
                  color="bg-indigo-50 border-indigo-100" 
                />
                <StatCard 
                  title="Ngày công năm" 
                  value={`${(yearlyStats.present + (yearlyStats.halfDay * 0.5)).toFixed(0)} ngày`} 
                  icon={<CalendarCheck size={20} className="text-amber-500 md:w-6 md:h-6" />} 
                  color="bg-amber-50 border-amber-100" 
                />
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 print-hide">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={20} className="text-indigo-500" />
                    <h3 className="text-lg md:text-xl font-semibold text-slate-800">Phân tích thu nhập {format(currentMonth, 'yyyy')}</h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="md:col-span-2">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearlyStats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSalaryYear" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
                            dx={-10}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#ffffff', color: '#0f172a', padding: '12px' }}
                            itemStyle={{ fontSize: '13px', fontWeight: 600, padding: '2px 0' }}
                            labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}
                            formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                          />
                          <Bar 
                            name="Thu nhập"
                            dataKey="salary" 
                            fill="url(#colorSalaryYear)" 
                            radius={[6, 6, 0, 0]} 
                            barSize={24}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-3">Phân bổ giờ làm</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 flex items-center gap-2"><Sun size={14} className="text-amber-500"/> Ca sáng</span>
                          <span className="font-bold text-slate-800">{yearlyStats.totalMainHours.toFixed(1)}h</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(yearlyStats.totalMainHours / yearlyStats.totalHours) * 100}%` }}></div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 flex items-center gap-2"><Moon size={14} className="text-indigo-400"/> Ca tối</span>
                          <span className="font-bold text-slate-800">{yearlyStats.totalOvertimeHours.toFixed(1)}h</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${(yearlyStats.totalOvertimeHours / yearlyStats.totalHours) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 flex items-center gap-2"><Zap size={14} className="text-rose-400"/> Tăng ca</span>
                          <span className="font-bold text-slate-800">{yearlyStats.totalExtraOvertimeHours.toFixed(1)}h</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-rose-400 h-1.5 rounded-full" style={{ width: `${(yearlyStats.totalExtraOvertimeHours / yearlyStats.totalHours) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl text-white", theme.primary)}>
                      <p className="text-xs font-bold text-white/70 uppercase mb-1">Tháng cao nhất</p>
                      {(() => {
                        const maxMonth = [...yearlyStats.chartData].sort((a, b) => b.salary - a.salary)[0];
                        return (
                          <>
                            <p className="text-lg font-bold">{maxMonth.fullName}</p>
                            <p className="text-2xl font-black mt-1">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(maxMonth.salary)}</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed History Table for Year */}
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-slate-800">Chi tiết tổng kết 12 tháng</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs md:text-sm uppercase tracking-wider">
                        <th className="p-4 font-medium border-b border-slate-100">Tháng</th>
                        <th className="p-4 font-medium border-b border-slate-100">Có mặt</th>
                        <th className="p-4 font-medium border-b border-slate-100">Vắng/Nghỉ</th>
                        <th className="p-4 font-medium border-b border-slate-100">Giờ Ca Sáng</th>
                        <th className="p-4 font-medium border-b border-slate-100">Giờ Ca Chiều</th>
                        <th className="p-4 font-medium border-b border-slate-100">Giờ Làm thêm</th>
                        <th className="p-4 font-medium border-b border-slate-100">Tổng thu nhập</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm md:text-base divide-y divide-slate-100">
                      {yearlyStats.chartData.map((month, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-medium text-slate-700 whitespace-nowrap">
                            Tháng {format(month.month, 'MM/yyyy')}
                          </td>
                          <td className="p-4 text-slate-600">
                            {month.present} ngày {month.halfDay > 0 ? `(+${month.halfDay} nửa ngày)` : ''}
                          </td>
                          <td className="p-4 text-rose-600">
                            {month.absent + month.leave} ngày
                          </td>
                          <td className="p-4 font-mono text-slate-600">
                            {month.mainHours}h
                          </td>
                          <td className="p-4 font-mono text-indigo-600">
                            {month.overtimeHours > 0 ? `${month.overtimeHours}h` : '-'}
                          </td>
                          <td className="p-4 font-mono text-amber-600">
                            {month.extraOvertimeHours > 0 ? `${month.extraOvertimeHours}h` : '-'}
                          </td>
                          <td className={cn("p-4 font-medium", theme.text)}>
                            {month.salary > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(month.salary) : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity className={theme.accent} size={20} />
                  Lịch sử chi tiết
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                  {history.length} bản ghi
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sáng</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chiều</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng giờ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((record, idx) => {
                      const workingHours = getWorkingHours(record);
                      const totalHours = workingHours.total.toFixed(1);
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{format(parseISO(record.date), 'dd/MM/yyyy')}</div>
                            <div className="text-xs text-slate-400 capitalize">{format(parseISO(record.date), 'EEEE', { locale: vi })}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'present' ? cn('bg-opacity-10', theme.bg, theme.text) :
                              record.status === 'half-day' ? 'bg-amber-50 text-amber-600' :
                              record.status === 'leave' ? 'bg-rose-50 text-rose-600' :
                              record.status === 'holiday' ? 'bg-blue-50 text-blue-600' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {record.status === 'present' ? 'Đủ công' :
                               record.status === 'half-day' ? 'Nửa công' :
                               record.status === 'leave' ? 'Nghỉ phép' :
                               record.status === 'holiday' ? 'Ngày lễ' :
                               'Vắng mặt'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-slate-600">
                              {record.checkIn ? format(parseISO(record.checkIn), 'HH:mm') : '--:--'} - {record.checkOut ? format(parseISO(record.checkOut), 'HH:mm') : '--:--'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-slate-600">
                              {record.overtimeCheckIn ? format(parseISO(record.overtimeCheckIn), 'HH:mm') : '--:--'} - {record.overtimeCheckOut ? format(parseISO(record.overtimeCheckOut), 'HH:mm') : '--:--'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{totalHours}h</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {hasMore && (
                <div className="p-6 border-t border-slate-50 flex justify-center">
                  <button 
                    onClick={loadMoreHistory}
                    disabled={isLoadingHistory}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    {isLoadingHistory ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Đang tải...
                      </>
                    ) : (
                      'Tải thêm dữ liệu'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* CSS to make the header visible only during PDF export */}
      <style dangerouslySetInnerHTML={{__html: `
        .print-header { display: none; }
        [data-html2canvas-ignore="true"] + .print-header, 
        .print-header:not(.hidden) { display: block !important; }
        .exporting .print-hide { display: none !important; }
      `}} />
    </div>
  );
}

function StatCard({ title, value, icon, color, trend }: { title: string, value: string, icon: React.ReactNode, color: string, trend?: { value: string, isUp: boolean } }) {
  const { theme } = useAttendance();
  return (
    <div className={cn(
      "p-4 md:p-6 rounded-2xl md:rounded-3xl border flex flex-col gap-3 md:gap-4 transition-all hover:shadow-md duration-300",
      color
    )}>
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
            trend.isUp ? cn("bg-opacity-20", theme.bg, theme.text) : "bg-rose-100 text-rose-600"
          )}>
            {trend.isUp ? <TrendingUp size={12} /> : <Activity size={12} />}
            {trend.value}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider opacity-70">{title}</p>
        <p className="text-xl md:text-2xl font-black text-slate-800 mt-1">{value}</p>
      </div>
    </div>
  );
}
