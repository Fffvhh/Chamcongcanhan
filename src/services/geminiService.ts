import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, SalarySettings } from "../contexts/AttendanceContext";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getGeminiInsights(
  records: Record<string, AttendanceRecord>,
  settings: SalarySettings
) {
  try {
    // Prepare data for analysis
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthRecords = Object.values(records).filter(r => 
      isWithinInterval(new Date(r.date), { start: currentMonthStart, end: now })
    );

    const lastMonthRecords = Object.values(records).filter(r => 
      isWithinInterval(new Date(r.date), { start: lastMonthStart, end: lastMonthEnd })
    );

    const summary = {
      userName: settings.userName,
      currentMonth: {
        count: currentMonthRecords.length,
        totalHours: currentMonthRecords.reduce((acc, r) => acc + calculateHours(r), 0),
        overtimeDays: currentMonthRecords.filter(r => r.overtimeCheckIn).length,
      },
      lastMonth: {
        count: lastMonthRecords.length,
        totalHours: lastMonthRecords.reduce((acc, r) => acc + calculateHours(r), 0),
      }
    };

    const prompt = `
      Bạn là một trợ lý AI phân tích hiệu suất làm việc chuyên nghiệp. 
      Dưới đây là dữ liệu chấm công của người dùng ${summary.userName}:
      - Tháng này: ${summary.currentMonth.count} ngày làm việc, tổng ${summary.currentMonth.totalHours.toFixed(1)} giờ, ${summary.currentMonth.overtimeDays} ngày làm thêm.
      - Tháng trước: ${summary.lastMonth.count} ngày làm việc, tổng ${summary.lastMonth.totalHours.toFixed(1)} giờ.

      Hãy đưa ra 3 nhận xét ngắn gọn, tinh tế và hữu ích (tối đa 2 câu mỗi nhận xét):
      1. Một nhận xét về xu hướng làm việc (ví dụ: chăm chỉ hơn, hay làm thêm giờ vào ngày nào...).
      2. Một lời khuyên về sức khỏe hoặc cân bằng công việc (ví dụ: nghỉ ngơi nếu làm thêm quá nhiều).
      3. Một lời động viên hoặc mục tiêu cho tháng tới.

      Yêu cầu: Ngôn ngữ chuyên nghiệp, ấm áp, sử dụng icon phù hợp. Trả về dưới dạng JSON array các chuỗi.
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    const text = response.text || "";
    
    // Clean JSON if needed
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [
      "✨ Bạn đang duy trì phong độ làm việc rất ổn định. Hãy tiếp tục phát huy nhé!",
      "🌙 Gần đây bạn có khá nhiều giờ làm thêm. Đừng quên dành thời gian thư giãn cuối tuần.",
      "🚀 Mục tiêu tháng tới: Hãy thử tối ưu hóa thời gian nghỉ ngơi để đạt hiệu suất cao hơn nữa!"
    ];
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return [
      "✨ Chào mừng bạn quay trở lại! Hãy tiếp tục ghi nhận công việc mỗi ngày.",
      "📊 Dữ liệu của bạn đang được cập nhật để AI có thể phân tích chính xác hơn.",
      "💡 Mẹo: Chấm công đúng giờ giúp bạn theo dõi thu nhập chính xác nhất."
    ];
  }
}

function calculateHours(record: AttendanceRecord): number {
  let total = 0;
  if (record.checkIn && record.checkOut) {
    total += (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60);
  }
  if (record.overtimeCheckIn && record.overtimeCheckOut) {
    total += (new Date(record.overtimeCheckOut).getTime() - new Date(record.overtimeCheckIn).getTime()) / (1000 * 60 * 60);
  }
  return total;
}
