import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { AttendanceRecord, SalarySettings } from '../contexts/AttendanceContext';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const exportToExcel = (records: any[], settings: SalarySettings, monthYear: string) => {
  const data = records.map(r => {
    if (r.date) {
      // Daily record
      return {
        'Ngày': r.date,
        'Vào ca': r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : '-',
        'Tan ca': r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : '-',
        'Vào tăng ca': r.overtimeCheckIn ? format(new Date(r.overtimeCheckIn), 'HH:mm') : '-',
        'Tan tăng ca': r.overtimeCheckOut ? format(new Date(r.overtimeCheckOut), 'HH:mm') : '-',
        'Trạng thái': r.status === 'present' ? 'Có mặt' : r.status === 'half-day' ? 'Nửa ngày' : r.status === 'leave' ? 'Nghỉ phép' : 'Nghỉ',
        'Ghi chú': r.notes || ''
      };
    } else {
      // Monthly summary (for yearly view)
      return {
        'Tháng': r.fullName || r.name,
        'Có mặt': r.present || 0,
        'Nửa ngày': r.halfDay || 0,
        'Vắng': r.absent || 0,
        'Nghỉ phép': r.leave || 0,
        'Giờ chính': r.mainHours || 0,
        'Tăng ca': r.overtimeHours || 0,
        'Tổng giờ': r.totalHours || 0,
        'Lương': (r.salary || 0).toLocaleString() + ' VND'
      };
    }
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bảng công");
  
  XLSX.utils.sheet_add_aoa(ws, [
    [],
    ["Nhân viên:", settings.userName],
    ["Kỳ báo cáo:", monthYear],
    ["Xuất ngày:", format(new Date(), 'dd/MM/yyyy HH:mm')]
  ], { origin: -1 });

  XLSX.writeFile(wb, `BangCong_${settings.userName}_${monthYear.replace('/', '-')}.xlsx`);
};

export const exportToPDF = (records: any[], settings: SalarySettings, monthYear: string, summary: any) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(16, 185, 129);
  doc.text('BANG CONG & LUONG CHI TIET', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Nhan vien: ${settings.userName}`, 20, 35);
  doc.text(`Ky bao cao: ${monthYear}`, 20, 42);
  doc.text(`Xuat ngay: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 49);

  doc.setDrawColor(240);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, 55, 170, 30, 3, 3, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(50);
  
  const isYearly = monthYear.length === 4;
  
  if (isYearly) {
    doc.text(`Tong ngay co mat: ${summary.present}`, 30, 65);
    doc.text(`Tong gio lam: ${summary.totalHours.toFixed(1)}h`, 30, 75);
    doc.text(`Tong luong nam: ${summary.totalSalary.toLocaleString()} VND`, 110, 65);
    doc.text(`Tong ngay nghi: ${summary.absent + summary.leave}`, 110, 75);
  } else {
    doc.text(`Tong ngay cong: ${summary.totalWorkDays || summary.present}`, 30, 65);
    doc.text(`Tong gio lam: ${summary.totalHours.toFixed(1)}h`, 30, 75);
    doc.text(`Luong tam tinh: ${summary.totalSalary.toLocaleString()} VND`, 110, 65);
    doc.text(`Tien tang ca: ${(summary.totalOvertimeIncome || 0).toLocaleString()} VND`, 110, 75);
  }

  const isDaily = records.length > 0 && records[0].date;
  
  let head, body;
  if (isDaily) {
    head = [['Ngay', 'Vao', 'Ra', 'Vao TC', 'Ra TC', 'Trang thai']];
    body = records.map(r => [
      r.date,
      r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : '-',
      r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : '-',
      r.overtimeCheckIn ? format(new Date(r.overtimeCheckIn), 'HH:mm') : '-',
      r.overtimeCheckOut ? format(new Date(r.overtimeCheckOut), 'HH:mm') : '-',
      r.status === 'present' ? 'Co mat' : r.status === 'half-day' ? 'Nua ngay' : 'Nghi'
    ]);
  } else {
    head = [['Thang', 'Co mat', 'Nghi', 'Gio lam', 'Luong']];
    body = records.map(r => [
      r.fullName || r.name,
      r.present || 0,
      (r.absent || 0) + (r.leave || 0),
      (r.totalHours || 0).toFixed(1) + 'h',
      (r.salary || 0).toLocaleString()
    ]);
  }

  doc.autoTable({
    startY: 95,
    head: head,
    body: body,
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 95 }
  });

  doc.save(`BangCong_${settings.userName}_${monthYear.replace('/', '-')}.pdf`);
};
