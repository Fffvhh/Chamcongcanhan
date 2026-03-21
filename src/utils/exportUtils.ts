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

export const exportToExcel = (records: AttendanceRecord[], settings: SalarySettings, monthYear: string) => {
  const data = records.map(r => ({
    'Ngày': r.date,
    'Vào ca': r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : '-',
    'Tan ca': r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : '-',
    'Vào tăng ca': r.overtimeCheckIn ? format(new Date(r.overtimeCheckIn), 'HH:mm') : '-',
    'Tan tăng ca': r.overtimeCheckOut ? format(new Date(r.overtimeCheckOut), 'HH:mm') : '-',
    'Trạng thái': r.status === 'present' ? 'Có mặt' : r.status === 'half-day' ? 'Nửa ngày' : 'Nghỉ',
    'Ghi chú': r.notes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bảng công");
  
  // Add summary info
  XLSX.utils.sheet_add_aoa(ws, [
    [],
    ["Nhân viên:", settings.userName],
    ["Tháng:", monthYear],
    ["Xuất ngày:", format(new Date(), 'dd/MM/yyyy HH:mm')]
  ], { origin: -1 });

  XLSX.writeFile(wb, `BangCong_${settings.userName}_${monthYear}.xlsx`);
};

export const exportToPDF = (records: AttendanceRecord[], settings: SalarySettings, monthYear: string, summary: any) => {
  const doc = new jsPDF();
  
  // Add Title
  doc.setFontSize(20);
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text('BANG CONG & LUONG CHI TIET', 105, 20, { align: 'center' });
  
  // Add Info
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Nhan vien: ${settings.userName}`, 20, 35);
  doc.text(`Thang: ${monthYear}`, 20, 42);
  doc.text(`Xuat ngay: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 49);

  // Add Summary Box
  doc.setDrawColor(240);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, 55, 170, 30, 3, 3, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(`Tong ngay cong: ${summary.totalWorkDays}`, 30, 65);
  doc.text(`Tong gio lam: ${summary.totalHours.toFixed(1)}h`, 30, 75);
  doc.text(`Luong tam tinh: ${summary.totalSalary.toLocaleString()} VND`, 110, 65);
  doc.text(`Tien tang ca: ${summary.totalOvertimeIncome.toLocaleString()} VND`, 110, 75);

  // Add Table
  const tableData = records.map(r => [
    r.date,
    r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : '-',
    r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : '-',
    r.overtimeCheckIn ? format(new Date(r.overtimeCheckIn), 'HH:mm') : '-',
    r.overtimeCheckOut ? format(new Date(r.overtimeCheckOut), 'HH:mm') : '-',
    r.status === 'present' ? 'Co mat' : 'Nghi'
  ]);

  doc.autoTable({
    startY: 95,
    head: [['Ngay', 'Vao', 'Ra', 'Vao TC', 'Ra TC', 'Trang thai']],
    body: tableData,
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 95 }
  });

  doc.save(`BangCong_${settings.userName}_${monthYear}.pdf`);
};
