import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, CheckCircle2, LogOut, LogIn, ArrowRight, Activity, Moon, Sun, Flame, Award, CloudSun, MapPin, Cloud, HardDrive, Camera, ChevronLeft, ChevronRight, Share2, MessageCircle, Facebook, Bell, Info, Download, TrendingUp, Wallet, X, Maximize2, Compass, Navigation, Cake, PartyPopper, Mail, Sparkles } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import { useMemories, Memory } from '../hooks/useMemories';
import { getJourneys, Journey } from '../services/journeyService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query } from 'firebase/firestore';
import { db, signInWithGoogle } from '../firebase';
import { domToPng } from 'modern-screenshot';

const AI_QUOTES = [
  "Đừng để quá khứ đánh cắp hiện tại của bạn.",
  "Hãy sống như thể hôm nay là ngày cuối cùng.",
  "Sự lạc quan là niềm tin dẫn tới thành tựu.",
  "Hãy là người mang lại ánh sáng cho người khác.",
  "Thay vì than vãn về bóng tối, hãy thắp lên một ngọn nến.",
  "Bình yên đến từ bên trong, đừng tìm nó ở bên ngoài.",
  "Một tâm hồn tích cực sẽ thu hút những điều tích cực.",
  "Hãy bao dung với lỗi lầm của bản thân.",
  "Cuộc sống rất ngắn ngủi, đừng lãng phí nó vào những điều tiêu cực.",
  "Ước mơ mà không hành động thì chỉ là ảo tưởng.",
  "Đừng nói, hãy làm. Đừng hứa, hãy chứng minh.",
  "Tương lai thuộc về những ai tin vào vẻ đẹp của những giấc mơ.",
  "Đừng chờ đợi cơ hội, hãy tự tạo ra nó.",
  "Hành trình vạn dặm bắt đầu từ một bước chân.",
  "Đầu tư vào bản thân là khoản đầu tư có lãi nhất.",
  "Kỷ luật là cầu nối giữa mục tiêu và thành tựu.",
  "Sự chuẩn bị cộng với cơ hội sẽ tạo nên may mắn.",
  "Đừng sợ thất bại, hãy sợ việc không dám thử.",
  "Mục tiêu lớn cần những hành động nhỏ và liên tục.",
  "Hãy sống cuộc đời mà khi nhìn lại, bạn không phải hối tiếc.",
  "Sáng tạo là khi trí thông minh được vui chơi.",
  "Đừng chỉ mơ về thành công, hãy thức dậy và làm việc vì nó.",
  "Thành công thường đến với những ai quá bận rộn để tìm kiếm nó.",
  "Những gì bạn làm hôm nay sẽ quyết định ngày mai của bạn.",
  "Học từ hôm qua, sống cho hôm nay, hy vọng cho ngày mai.",
  "Kiến thức là sức mạnh, nhưng áp dụng nó mới là quyền năng.",
  "Sự trưởng thành không tính bằng tuổi tác, mà bằng những trải nghiệm.",
  "Thất bại là người thầy nghiêm khắc nhưng tuyệt vời nhất.",
  "Hãy khiêm tốn khi thành công và kiên cường khi thất bại.",
  "Đọc một cuốn sách là sống thêm một cuộc đời.",
  "Lắng nghe nhiều hơn nói để thấu hiểu thế giới.",
  "Đừng sợ thay đổi, vì đó là cách để bạn lớn lên.",
  "Sự thật đôi khi đau lòng nhưng nó giúp bạn tự do.",
  "Hãy chọn bạn mà chơi, vì họ sẽ phản chiếu con người bạn.",
  "Giữ cho tâm trí luôn cởi mở như một chiếc dù.",
  "Đừng để cái tôi ngăn cản sự tiến bộ của bạn.",
  "Sự đơn giản là đỉnh cao của sự tinh tế.",
  "Biết người là thông minh, biết mình là trí tuệ.",
  "Đừng vội vàng, những thứ tốt đẹp cần thời gian để chín muồi.",
  "Hãy là người giải quyết vấn đề, không phải người tạo ra nó.",
  "Cuộc sống là một ngôi trường mà bạn không bao giờ tốt nghiệp."
];

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; desc: string; city: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState<Memory | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [isJourneysLoading, setIsJourneysLoading] = useState(true);
  const [currentQuote, setCurrentQuote] = useState(AI_QUOTES[0]);

  useEffect(() => {
    let availableQuotes = [...AI_QUOTES];
    
    const getNextQuote = () => {
      if (availableQuotes.length === 0) {
        availableQuotes = [...AI_QUOTES];
      }
      const randomIndex = Math.floor(Math.random() * availableQuotes.length);
      const quote = availableQuotes[randomIndex];
      availableQuotes.splice(randomIndex, 1);
      return quote;
    };

    const rotateQuote = () => {
      setCurrentQuote(getNextQuote());
    };

    setCurrentQuote(getNextQuote());

    const interval = setInterval(rotateQuote, 10000);
    return () => clearInterval(interval);
  }, []);

  const rotateQuoteManually = () => {
    // Find next quote logic
    const currentIndex = AI_QUOTES.indexOf(currentQuote);
    const nextIndex = (currentIndex + 1) % AI_QUOTES.length;
    setCurrentQuote(AI_QUOTES[nextIndex]);
  };

  const { 
    records, 
    getTodayRecord, 
    getActiveRecord, 
    checkIn, 
    checkOut, 
    checkInOvertime, 
    checkOutOvertime, 
    checkInExtra,
    checkOutExtra,
    updateRecord,
    getWorkingHours, 
    getMonthlySummary,
    salarySettings,
    totalHours,
    user,
    theme,
    journeys,
    refreshJourneys,
    savingsGoal
  } = useAttendance();

  const todayRecord = getTodayRecord();
  const activeRecord = getActiveRecord();

  useEffect(() => {
    if (todayRecord?.mood === '😭' || todayRecord?.mood === '😥') {
      const supportiveQuotes = [
        "Đừng buồn nhé, ngày mai sẽ tốt đẹp hơn!",
        "Mọi chuyện rồi sẽ ổn, hãy tin vào bản thân mình.",
        "Bạn đã cố gắng rất nhiều rồi, hãy nghỉ ngơi một chút nhé.",
        "Cố lên bạn ơi, mình luôn ở đây cổ vũ bạn!",
        "Một nụ cười bằng mười thang thuốc bổ, cười lên nào!"
      ];
      const randomSupportive = supportiveQuotes[Math.floor(Math.random() * supportiveQuotes.length)];
      setCurrentQuote(randomSupportive);
    }
  }, [todayRecord?.mood]);

  useEffect(() => {
    if (user) {
      refreshJourneys().finally(() => setIsJourneysLoading(false));
    }
  }, [user, refreshJourneys]);

  const journeyStats = useMemo(() => {
    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');
    
    const monthJourneys = journeys.filter(j => j.date.startsWith(currentMonthStr));
    
    const uniqueDestinations = new Set(monthJourneys.map(j => j.endLocation.trim().toLowerCase())).size;
    
    // Get journeys from the most recent day that has data
    const latestDate = journeys.length > 0 ? journeys[0].date : null;
    const recentDayJourneys = latestDate 
      ? journeys.filter(j => j.date === latestDate)
      : [];

    return {
      count: monthJourneys.length,
      uniqueDestinations,
      latest: journeys[0] || null,
      recentDayJourneys
    };
  }, [journeys]);

  const streak = useMemo(() => {
    let count = 0;
    let date = new Date();
    
    // Check if today is worked, if not check yesterday
    let dateStr = format(date, 'yyyy-MM-dd');
    let record = records[dateStr];
    
    if (!record || (record.status !== 'present' && record.status !== 'half-day')) {
        date.setDate(date.getDate() - 1);
    }
    
    while (true) {
        dateStr = format(date, 'yyyy-MM-dd');
        record = records[dateStr];
        if (record && (record.status === 'present' || record.status === 'half-day')) {
            count++;
            date.setDate(date.getDate() - 1);
        } else {
            break;
        }
    }
    return count;
  }, [records]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        setWeatherLoading(true);
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=vi`);
        const geoData = await geoRes.json();
        
        const city = geoData.address?.city || geoData.address?.town || geoData.address?.state || 'Vị trí của bạn';
        const temp = Math.round(weatherData.current_weather.temperature);
        const code = weatherData.current_weather.weathercode;
        
        let desc = 'Trời đẹp';
        if (code === 0) desc = 'Trời quang đãng';
        else if (code >= 1 && code <= 3) desc = 'Có mây';
        else if (code >= 45 && code <= 48) desc = 'Có sương mù';
        else if (code >= 51 && code <= 67) desc = 'Có mưa';
        else if (code >= 71 && code <= 77) desc = 'Có tuyết';
        else if (code >= 80 && code <= 82) desc = 'Mưa rào';
        else if (code >= 95) desc = 'Có sấm sét';

        setWeather({ temp, desc, city });
      } catch (error) {
        console.error("Error fetching weather:", error);
      } finally {
        setWeatherLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermissionDenied(true);
          }
        }
      );
    }
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return "Chào buổi sáng, chúc bạn một ngày làm việc hiệu quả!";
    if (hour >= 12 && hour < 18) return "Chào buổi chiều, tiếp tục phát huy nhé!";
    if (hour >= 18 && hour < 22) return "Chào buổi tối, một ngày vất vả rồi!";
    return "Đã muộn rồi, nhớ nghỉ ngơi nhé!";
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const isMorningActive = activeRecord?.checkIn && !activeRecord?.checkOut;
  const isAfternoonActive = activeRecord?.overtimeCheckIn && !activeRecord?.overtimeCheckOut;
  const isExtraActive = activeRecord?.extraOvertimeCheckIn && !activeRecord?.extraOvertimeCheckOut;

  const stats = useMemo(() => {
    const summary = getMonthlySummary(currentTime);
    const expectedSalary = (salarySettings.workingDaysPerMonth * salarySettings.baseWage) + summary.totalOvertimeIncome;
    const remainingSalary = Math.max(0, expectedSalary - summary.totalSalary);
    
    return { 
      totalMonthlyHours: summary.totalHours, 
      totalDays: summary.totalWorkDays, 
      totalOvertimeHours: 0,
      totalOvertimeIncome: summary.totalOvertimeIncome, 
      totalSalary: summary.totalSalary, 
      expectedSalary,
      remainingSalary,
      formattedSalary: formatVND(summary.totalSalary),
      formattedExpectedSalary: formatVND(expectedSalary),
      formattedRemainingSalary: formatVND(remainingSalary),
      formattedOvertimeIncome: formatVND(summary.totalOvertimeIncome),
      paidLeaveCount: summary.paidLeaveCount,
      presentDays: summary.presentDays,
      halfDays: summary.halfDays,
      absentDays: summary.absentDays,
      leaveCount: summary.leaveCount
    };
  }, [records, salarySettings, currentTime.getMonth(), currentTime.getFullYear()]);

  const { totalMonthlyHours, totalDays, formattedSalary, formattedOvertimeIncome, paidLeaveCount, presentDays, halfDays, absentDays, leaveCount } = stats;

  const isBirthday = useMemo(() => {
    if (salarySettings.birthday) {
      const [year, month, day] = salarySettings.birthday.split('-').map(Number);
      return currentTime.getMonth() === month - 1 && currentTime.getDate() === day;
    }
    return currentTime.getMonth() === 3 && currentTime.getDate() === 8; // Default April 8th
  }, [currentTime, salarySettings.birthday]);

  const [showBirthdayBanner, setShowBirthdayBanner] = useState(false);

  useEffect(() => {
    if (isBirthday) {
      setShowBirthdayBanner(true);
      const timer = setTimeout(() => {
        setShowBirthdayBanner(false);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isBirthday]);

  const { memories } = useMemories();
  const recentMemories = useMemo(() => {
    // Show the 5 most recent memories regardless of date to ensure the carousel isn't empty
    return [...memories]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [memories]);

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<'streak'>('streak');
  const [showMoodStats, setShowMoodStats] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Future Mailbox State
  const [futureMail, setFutureMail] = useState<{message: string, unlockDate: string, isLocked: boolean, aiResponse?: string} | null>(null);
  const [mailInput, setMailInput] = useState('');
  const [isWritingMail, setIsWritingMail] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`future_mail_${user.uid}`);
      if (saved) {
        setFutureMail(JSON.parse(saved));
      }
    }
  }, [user]);

  const handleSaveFutureMail = () => {
    if (!user || !mailInput.trim()) return;
    
    let nextYear = currentTime.getFullYear() + 1;
    let month = 3;
    let day = 8;
    if (salarySettings.birthday) {
      const [y, m, d] = salarySettings.birthday.split('-').map(Number);
      month = m - 1;
      day = d;
    }
    const nextBirthday = new Date(nextYear, month, day);
    const unlockDate = format(nextBirthday, 'yyyy-MM-dd');

    const newMail = { message: mailInput, unlockDate, isLocked: true };
    setFutureMail(newMail);
    localStorage.setItem(`future_mail_${user.uid}`, JSON.stringify(newMail));
    setIsWritingMail(false);
  };

  const handleUnlockFutureMail = async () => {
    if (!user || !futureMail) return;
    const today = format(currentTime, 'yyyy-MM-dd');
    if (today >= futureMail.unlockDate) {
      setIsUnlocking(true);
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-preview",
          contents: `Người dùng đã viết một bức thư cho chính mình vào 1 năm trước với nội dung: "${futureMail.message}". 
          Hãy đóng vai một người bạn đồng hành AI thấu hiểu. Dựa vào nội dung thư (có thể chứa mục tiêu, ước mơ, hoặc cảm xúc), hãy viết một lời phản hồi ngắn gọn (khoảng 2-3 câu), tinh tế và ấm áp. 
          Nếu họ có đặt mục tiêu, hãy hỏi thăm xem họ đã đạt được chưa và động viên họ. Nếu chỉ là lời nhắn nhủ, hãy chia sẻ niềm vui với họ khi đọc lại.`,
        });
        
        const aiResponse = response.text;
        const newMail = { ...futureMail, isLocked: false, aiResponse };
        setFutureMail(newMail);
        localStorage.setItem(`future_mail_${user.uid}`, JSON.stringify(newMail));
      } catch (error) {
        console.error("Error generating AI response:", error);
        // Fallback if AI fails
        const newMail = { ...futureMail, isLocked: false, aiResponse: "Chúc mừng sinh nhật! Hy vọng bạn đã có một năm tuyệt vời và đạt được những gì mình mong muốn." };
        setFutureMail(newMail);
        localStorage.setItem(`future_mail_${user.uid}`, JSON.stringify(newMail));
      } finally {
        setIsUnlocking(false);
      }
    }
  };

  const todayStr = format(currentTime, 'yyyy-MM-dd');
  const showFutureMailbox = isBirthday || (futureMail && futureMail.isLocked && todayStr >= futureMail.unlockDate) || (futureMail && !futureMail.isLocked);

  const moodStats = useMemo(() => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, i));
    
    const counts = { '😭': 0, '😥': 0, '🔥': 0, '🥰': 0 };
    const history = last7Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = records[dateStr];
      if (record?.mood && counts.hasOwnProperty(record.mood)) {
        counts[record.mood as keyof typeof counts]++;
      }
      return {
        date: day,
        mood: record?.mood || null
      };
    }).reverse();

    return { counts, history };
  }, [records]);

  const handleMoodSelect = (emoji: string) => {
    updateRecord(format(new Date(), 'yyyy-MM-dd'), { mood: emoji });
    setShowMoodStats(true);
  };

  const handleImageClick = (memory: Memory) => {
    setExpandedMemory(memory);
    setImageDimensions(null);
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = memory.imageUrl;
  };

  const handleShareStreak = () => {
    setShareType('streak');
    setShowShareModal(true);
  };

  const shareToFacebook = () => {
    const url = window.location.origin;
    const text = `Tôi vừa đạt chuỗi ${streak} ngày làm việc chăm chỉ trên TimeTracker! 🚀`;
    
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
  };

  const handleDownloadCard = async () => {
    if (!shareCardRef.current) return;
    try {
      const dataUrl = await domToPng(shareCardRef.current, {
        scale: 2,
        backgroundColor: '#0f172a'
      });
      const link = document.createElement('a');
      link.download = `timetracker-${shareType}-${format(new Date(), 'yyyyMMdd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error downloading card:", error);
    }
  };

  useEffect(() => {
    if (recentMemories.length <= 1 || isCarouselPaused) return;

    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % recentMemories.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [recentMemories.length, isCarouselPaused]);

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-3 md:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      {!user && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("p-4 border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm", theme.bgLight, theme.border)}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0", theme.bg)}>
              <LogIn size={20} />
            </div>
            <div className="text-left">
              <h4 className={cn("text-sm font-bold", theme.text)}>Đăng nhập để đồng bộ dữ liệu</h4>
              <p className={cn("text-xs opacity-70", theme.text)}>Lưu trữ kỉ niệm và lịch sử chấm công của bạn an toàn.</p>
            </div>
          </div>
          <button 
            onClick={signInWithGoogle}
            className={cn("w-full md:w-auto px-6 py-2 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md", theme.bg, theme.hover, theme.shadow)}
          >
            Đăng nhập ngay
          </button>
        </motion.div>
      )}
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-1 transition-colors duration-300">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {getGreeting()}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-medium">
              {format(currentTime, "EEEE, dd/MM/yyyy", { locale: vi })}
            </p>
            {weather && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className={cn("flex items-center gap-1 text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full transition-colors duration-300", theme.bgLight, theme.accent)}>
                  <CloudSun size={12} className="text-amber-500" />
                  <span>{weather.city}: {weather.temp}°C, {weather.desc}</span>
                </div>
              </>
            )}
            {locationPermissionDenied && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1 text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-medium" title="Cho phép truy cập vị trí để xem thời tiết">
                  <MapPin size={12} />
                  <span>Chưa cấp quyền vị trí</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Birthday Banner */}
      <AnimatePresence>
        {showBirthdayBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 text-white shadow-xl mb-4"
          >
            {/* Decorative elements */}
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-2 right-4 opacity-20"
            >
              <PartyPopper size={80} />
            </motion.div>
            <motion.div 
              animate={{ rotate: [0, -10, 10, 0], y: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              className="absolute bottom-2 left-4 opacity-20"
            >
              <Cake size={60} />
            </motion.div>

            <div className="relative z-10 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                <Cake size={32} className="text-yellow-300" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">Chúc Mừng Sinh Nhật! 🎂</h3>
                <p className="text-sm font-medium opacity-90 mt-1">
                  Chúc bạn một ngày sinh nhật thật ý nghĩa, hạnh phúc và gặt hái được nhiều thành công mới!
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">8 Tháng 4</span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">Special Day</span>
              </div>
            </div>

            {/* Confetti-like particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0 }}
                animate={{ 
                  opacity: [0, 1, 0], 
                  y: [-20, 100], 
                  x: Math.random() * 400 - 200,
                  rotate: Math.random() * 360 
                }}
                transition={{ 
                  duration: 3 + Math.random() * 2, 
                  repeat: Infinity, 
                  delay: Math.random() * 5 
                }}
                className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-white/40"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Savings Goal Section */}
      <div className={cn("bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border flex items-center justify-between gap-3 transition-colors duration-300 mb-4", theme.border, "dark:border-slate-800")}>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", theme.bgLight, theme.accent, "dark:bg-slate-800")}>
            <Wallet size={18} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tiền tiết kiệm</h4>
            <p className="text-base font-black text-slate-800 dark:text-slate-200">
              {savingsGoal.targetAmount.toLocaleString('vi-VN')} <span className="text-xs font-bold text-slate-500">VNĐ</span>
            </p>
          </div>
        </div>
        
        {/* AI Assistant */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="block bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 rounded-2xl rounded-tr-sm px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-medium text-amber-800 dark:text-amber-200 relative max-w-[130px] sm:max-w-[200px] shadow-sm">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentQuote}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="block"
              >
                {currentQuote}
              </motion.span>
            </AnimatePresence>
            <div className="absolute -right-1.5 sm:-right-2 top-2 w-2 h-2 bg-amber-50 dark:bg-amber-900/30 border-r border-t border-amber-100 dark:border-amber-800 rotate-45"></div>
          </div>
          <motion.div 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={rotateQuoteManually}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-200 to-orange-400 rounded-full flex items-center justify-center shadow-md relative shrink-0 cursor-pointer"
          >
            <span className="text-lg sm:text-xl">🐔</span>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></div>
          </motion.div>
        </div>
      </div>

      {/* Total Monthly Hours & Salary Card */}
      <div className={cn("rounded-3xl p-4 md:p-6 shadow-xl text-white overflow-hidden relative group transition-all duration-300", theme.bg, theme.shadow, "dark:shadow-none")}>
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        
        <div className="grid grid-cols-3 gap-2 md:gap-4 relative z-10 divide-x divide-white/20">
          <div className="flex flex-col justify-center pr-2">
            <h3 className="text-white/70 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] mb-1">Lương hiện tại</h3>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg md:text-2xl font-black tracking-tighter leading-none text-white">{formattedSalary}</span>
            </div>
          </div>
          
          <div className="flex flex-col justify-center px-2 md:px-4">
            <h3 className="text-white/70 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] mb-1">Dự kiến tháng</h3>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg md:text-2xl font-black tracking-tighter leading-none text-yellow-300">{stats.formattedExpectedSalary}</span>
            </div>
          </div>

          <div className="flex flex-col justify-center pl-2 md:pl-4">
            <h3 className="text-white/70 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] mb-1">Tổng giờ làm</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-lg md:text-2xl font-black tracking-tighter leading-none text-white">{totalMonthlyHours.toFixed(1)}</span>
              <span className="text-[8px] md:text-[10px] font-bold text-white/60 uppercase">giờ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {(!todayRecord?.checkIn || (isMorningActive && !todayRecord?.checkOut)) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("rounded-2xl p-3 flex items-center gap-3 border transition-colors duration-300", theme.bgLight, theme.border, "dark:bg-slate-900/50 dark:border-slate-800")}
        >
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300", theme.secondary, theme.accent, "dark:bg-slate-800")}>
            <Bell size={16} className="animate-bounce" />
          </div>
          <div className="flex-1">
            <p className={cn("text-xs font-bold transition-colors duration-300", theme.text, "dark:text-slate-300")}>
              {!todayRecord?.checkIn 
                ? "Bạn chưa vào ca sáng! Đừng quên chấm công nhé." 
                : "Bạn đang trong ca làm việc. Chúc bạn một ngày tốt lành!"}
            </p>
          </div>
        </motion.div>
      )}

      {/* Streak Card */}
      <div className={cn("bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border flex items-center gap-4 relative group transition-colors duration-300", theme.border, "dark:border-slate-800")}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300",
          streak >= 20 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : cn(theme.bgLight, theme.accent, "dark:bg-slate-800")
        )}>
          {streak >= 20 ? <Award size={24} /> : <Flame size={24} />}
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Chuỗi ngày làm việc</h4>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Bạn đang có chuỗi <span className={cn("transition-colors duration-300", theme.accent)}>{streak} ngày</span> liên tục!
          </p>
          {streak >= 20 && (
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
              🏆 Chúc mừng! Bạn là "Siêu nhân công sở"!
            </p>
          )}
        </div>
        <button 
          onClick={handleShareStreak}
          className={cn("p-2 rounded-xl transition-all md:opacity-0 group-hover:opacity-100", theme.accent, theme.bgLight, "dark:bg-slate-800")}
          title="Chia sẻ thành tích"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Compact Mood Section */}
      <AnimatePresence mode="wait">
        {!todayRecord?.mood ? (
          <motion.div 
            key="mood-selector"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn("bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border flex items-center justify-between gap-4 transition-colors duration-300", theme.border, "dark:border-slate-800")}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", theme.bgLight, theme.accent, "dark:bg-slate-800")}>
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Cảm xúc hôm nay</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">Bạn đang cảm thấy thế nào?</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[
                { emoji: '😭', label: 'Tệ' },
                { emoji: '😥', label: 'Buồn' },
                { emoji: '🔥', label: 'Cháy' },
                { emoji: '🥰', label: 'Vui' }
              ].map((m) => (
                <button
                  key={m.emoji}
                  onClick={() => handleMoodSelect(m.emoji)}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-lg sm:text-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full border border-slate-100 dark:border-slate-700 transition-all active:scale-90 hover:scale-110"
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="mood-summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border flex items-center justify-between gap-4 transition-colors duration-300", theme.border, "dark:border-slate-800")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                <span className="text-xl animate-bounce-slow">{todayRecord.mood}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Cảm xúc hôm nay</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">Tuyệt vời! Hãy giữ năng lượng này nhé.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              {moodStats.history.slice(-5, -1).map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-0.5">
                  <div className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm transition-all duration-300",
                    day.mood ? "bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700" : "opacity-30 grayscale"
                  )}>
                    {day.mood || "—"}
                  </div>
                  <span className="text-[7px] font-medium text-slate-400">
                    {format(day.date, 'dd/MM')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Future Mailbox Section */}
      <AnimatePresence>
        {showFutureMailbox && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 overflow-hidden transition-all duration-300"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", theme.bgLight, theme.accent)}>
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Hộp thư tương lai</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Lời nhắn gửi cho chính mình</p>
                </div>
              </div>
              {futureMail ? (
                futureMail.isLocked ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/20 rounded-full border border-rose-100 dark:border-rose-800/30">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Đã khóa</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800/30">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Đã mở</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chưa có thư</span>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5">
              {!futureMail || !futureMail.isLocked ? (
                isWritingMail ? (
                  <div className="flex flex-col gap-3">
                    <textarea 
                      value={mailInput}
                      onChange={(e) => setMailInput(e.target.value)}
                      placeholder="Gửi lời nhắn cho chính mình ở tương lai (mục tiêu, ước mơ, cảm xúc)..."
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24 dark:text-white transition-all"
                    />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thư sẽ được mở vào sinh nhật năm sau.</p>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => setIsWritingMail(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex-1 sm:flex-none transition-colors">Hủy</button>
                        <button onClick={handleSaveFutureMail} className={cn("px-4 py-2 text-sm font-bold text-white rounded-xl flex-1 sm:flex-none transition-transform active:scale-95 shadow-md", theme.bg, theme.hover)}>Khóa lại</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-4">
                    {futureMail && !futureMail.isLocked && (
                      <div className="w-full space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Thư bạn đã viết:</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">"{futureMail.message}"</p>
                        </div>
                        {futureMail.aiResponse && (
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center shrink-0">
                              <span className="text-lg">✨</span>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">AI Đồng hành:</p>
                              <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">{futureMail.aiResponse}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        setMailInput(futureMail?.message || '');
                        setIsWritingMail(true);
                      }}
                      className={cn("text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95", theme.bgLight, theme.accent)}
                    >
                      {futureMail ? 'Viết thư mới cho năm sau' : 'Viết thư cho tương lai'}
                    </button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner mb-2">
                    <span className="text-3xl">🔒</span>
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Mở khóa vào: <span className="font-bold text-slate-800 dark:text-white text-base ml-1">{format(new Date(futureMail.unlockDate), 'dd/MM/yyyy')}</span>
                  </p>
                  {todayStr >= futureMail.unlockDate && (
                    <button 
                      onClick={handleUnlockFutureMail}
                      disabled={isUnlocking}
                      className={cn("mt-4 text-sm font-bold px-6 py-2.5 rounded-xl text-white transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2", theme.bg, theme.hover, isUnlocking && "opacity-70 cursor-not-allowed")}
                    >
                      {isUnlocking ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Đang mở khóa...
                        </>
                      ) : (
                        'Mở khóa ngay'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latest Journey Section */}
      <div className="space-y-3">
        {journeyStats.latest ? (
          <div className="relative h-[110px] sm:h-[120px]">
            <div
              className={cn("absolute inset-0 bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border flex items-start gap-3", theme.border, "dark:border-slate-800/50")}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", theme.bg, "text-white")}>
                <Navigation size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-black text-slate-800 dark:text-slate-200 truncate leading-tight">
                        {journeyStats.latest.title}
                      </h5>
                      <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md">
                        {journeyStats.latest.time || '--:--'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                      {format(parseISO(journeyStats.latest.date), 'eeee, dd/MM', { locale: vi })}
                    </p>
                  </div>
                </div>
                
                <div className="relative pl-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {journeyStats.latest.startLocation}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold truncate">
                      {journeyStats.latest.endLocation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          !isJourneysLoading && (
            <div className={cn("bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-dashed flex flex-col items-center justify-center gap-2", theme.border, "dark:border-slate-800/50")}>
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                <Compass size={20} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">Chưa có hành trình nào được ghi lại.</p>
            </div>
          )
        )}
      </div>

      {/* Recent Memories Carousel Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Camera size={14} className={cn("transition-colors duration-300", theme.accent)} />
            Kỉ niệm 3 ngày qua
          </h3>
          {recentMemories.length > 1 && (
            <div className="flex items-center gap-1">
              {recentMemories.map((_, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    idx === carouselIndex ? cn("w-4", theme.bg) : "w-1 bg-slate-200 dark:bg-slate-800"
                  )}
                />
              ))}
            </div>
          )}
        </div>
        
        {recentMemories.length > 0 ? (
          <div 
            className="relative w-full group"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
            onTouchStart={() => setIsCarouselPaused(true)}
            onTouchEnd={() => setIsCarouselPaused(false)}
          >
            <div className="relative aspect-video rounded-2xl overflow-hidden border shadow-sm bg-slate-50 dark:bg-slate-950 transition-colors duration-300" style={{ borderColor: theme.hex + '20' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={recentMemories[carouselIndex].id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <img 
                    src={recentMemories[carouselIndex].imageUrl && recentMemories[carouselIndex].imageUrl.trim() !== '' ? recentMemories[carouselIndex].imageUrl : 'https://picsum.photos/seed/memory/1920/1080'} 
                    alt="Memory" 
                    className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                    onClick={() => handleImageClick(recentMemories[carouselIndex])}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                  
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-md text-white p-2 rounded-full">
                      <Maximize2 size={16} />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 text-white pointer-events-none">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-[1px] w-6", theme.bg)} />
                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white">
                          {format(parseISO(recentMemories[carouselIndex].date), 'dd MMMM, yyyy', { locale: vi })}
                        </p>
                      </div>
                    </div>
                    {recentMemories[carouselIndex].note && (
                      <div className="relative">
                        <div className="max-h-24 md:max-h-32 overflow-y-auto pr-4 custom-scrollbar mask-fade-bottom">
                          <p className="text-sm md:text-base font-medium leading-relaxed opacity-95 text-white italic">
                            "{recentMemories[carouselIndex].note}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {recentMemories.length > 1 && (
                <>
                  <button 
                    onClick={() => setCarouselIndex((prev) => (prev - 1 + recentMemories.length) % recentMemories.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCarouselIndex((prev) => (prev + 1) % recentMemories.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs font-medium transition-colors duration-300">
            Chưa có kỉ niệm nào được lưu lại.
          </div>
        )}
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
        {/* Ca Sáng Actions */}
        <div className={cn("bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border flex flex-col gap-2 transition-colors duration-300", theme.border, "dark:border-slate-800")}>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300", theme.secondary, theme.accent, "dark:bg-slate-800")}>
              <Sun size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">Ca Sáng</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                {salarySettings.shiftSettings?.morningStart} - {salarySettings.shiftSettings?.morningEnd}
              </p>
            </div>
            <div className={cn(
              "px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors duration-300",
              isMorningActive ? cn(theme.secondary, theme.accent, "dark:bg-slate-800") : todayRecord?.checkOut ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            )}>
              {isMorningActive ? "Đang làm" : todayRecord?.checkOut ? "Xong" : "Chờ"}
            </div>
          </div>
          <div className="w-full">
            {!todayRecord?.checkIn && !isMorningActive ? (
              <button onClick={checkIn} className={cn("w-full text-white py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm", theme.bg, theme.hover)}>
                <Clock size={14} /> Vào ca
              </button>
            ) : isMorningActive ? (
              <button onClick={checkOut} className="w-full bg-rose-500 hover:bg-rose-600 text-white py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm">
                <LogOut size={14} /> Tan ca
              </button>
            ) : (
              <div className="w-full bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <CheckCircle2 size={14} className={cn("transition-colors duration-300", theme.accent)} /> Hoàn tất
              </div>
            )}
          </div>
        </div>

        {/* Ca Chiều Actions */}
        <div className={cn("bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border flex flex-col gap-2 transition-colors duration-300", theme.border, "dark:border-slate-800")}>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300", theme.secondary, theme.accent, "dark:bg-slate-800")}>
              <Moon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">Ca Chiều</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                {salarySettings.shiftSettings?.afternoonStart} - {salarySettings.shiftSettings?.afternoonEnd}
              </p>
            </div>
            <div className={cn(
              "px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors duration-300",
              isAfternoonActive ? cn(theme.secondary, theme.accent, "dark:bg-slate-800") : todayRecord?.overtimeCheckOut ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            )}>
              {isAfternoonActive ? "Đang làm" : todayRecord?.overtimeCheckOut ? "Xong" : "Chờ"}
            </div>
          </div>
          <div className="w-full">
            {!todayRecord?.overtimeCheckIn && !isAfternoonActive ? (
              <button onClick={checkInOvertime} className={cn("w-full text-white py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm", theme.bg, theme.hover)}>
                <Clock size={14} /> Vào ca
              </button>
            ) : isAfternoonActive ? (
              <button onClick={checkOutOvertime} className="w-full bg-purple-500 hover:bg-purple-600 text-white py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm">
                <LogOut size={14} /> Tan ca
              </button>
            ) : (
              <div className="w-full bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <CheckCircle2 size={14} className={cn("transition-colors duration-300", theme.accent)} /> Hoàn tất
              </div>
            )}
          </div>
        </div>

        {/* Làm thêm Actions */}
        <div className={cn("bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border flex flex-col gap-2 transition-colors duration-300", theme.border, "dark:border-slate-800")}>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300", theme.secondary, theme.accent, "dark:bg-slate-800")}>
              <Clock size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">Làm thêm</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Ngoài giờ</p>
            </div>
            <div className={cn(
              "px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors duration-300",
              isExtraActive ? cn(theme.secondary, theme.accent, "dark:bg-slate-800") : todayRecord?.extraOvertimeCheckOut ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            )}>
              {isExtraActive ? "Đang làm" : todayRecord?.extraOvertimeCheckOut ? "Xong" : "Chờ"}
            </div>
          </div>
          <div className="w-full">
            {!todayRecord?.extraOvertimeCheckIn && !isExtraActive ? (
              <button onClick={checkInExtra} className={cn("w-full text-white py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm", theme.bg, theme.hover)}>
                <Clock size={14} /> Vào ca
              </button>
            ) : isExtraActive ? (
              <button onClick={checkOutExtra} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm">
                <LogOut size={14} /> Tan ca
              </button>
            ) : (
              <div className="w-full bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <CheckCircle2 size={14} className={cn("transition-colors duration-300", theme.accent)} /> Hoàn tất
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("p-4 md:p-6 rounded-2xl border shadow-sm group hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900", theme.border, "dark:border-slate-800/50")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("p-2 rounded-xl transition-transform duration-300 bg-slate-50 dark:bg-slate-800", theme.text)}>
              <TrendingUp size={18} />
            </div>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Lương dự kiến</p>
          </div>
          <p className={cn("text-2xl md:text-3xl font-black tracking-tight transition-colors duration-300", theme.text, "dark:text-slate-100")}>
            {stats.formattedExpectedSalary}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full uppercase tracking-tighter">
              {salarySettings.workingDaysPerMonth} ngày chuẩn
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn("p-4 md:p-6 rounded-2xl border shadow-sm group hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900", theme.border, "dark:border-slate-800/50")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("p-2 rounded-xl transition-transform duration-300 bg-slate-50 dark:bg-slate-800", theme.text)}>
              <Wallet size={18} />
            </div>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Còn lại</p>
          </div>
          <p className={cn("text-2xl md:text-3xl font-black tracking-tight transition-colors duration-300", theme.text, "dark:text-slate-100")}>
            {stats.formattedRemainingSalary}
          </p>
          <p className="text-[10px] font-medium mt-2 text-slate-400 dark:text-slate-500 italic">Số tiền cần kiếm thêm</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn("p-4 md:p-6 rounded-2xl border shadow-sm group hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900", theme.border, "dark:border-slate-800/50")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("p-2 rounded-xl transition-transform duration-300 bg-slate-50 dark:bg-slate-800", theme.text)}>
              <Activity size={18} />
            </div>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Ngày công</p>
          </div>
          <div className="flex items-end justify-between mb-2">
            <p className={cn("text-2xl md:text-3xl font-black tracking-tight transition-colors duration-300", theme.text, "dark:text-slate-100")}>
              {stats.totalDays} <span className="text-sm font-bold text-slate-400">/ {salarySettings.workingDaysPerMonth}</span>
            </p>
            <span className="text-[10px] font-bold text-slate-400 mb-1">{Math.round((stats.totalDays / salarySettings.workingDaysPerMonth) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (stats.totalDays / salarySettings.workingDaysPerMonth) * 100)}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className={cn("h-full rounded-full", theme.bg)}
            />
          </div>
        </motion.div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowShareModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white dark:bg-slate-900 rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden transition-colors duration-300"
            >
              {/* Achievement Card Preview */}
              <div ref={shareCardRef} className="p-6 md:p-8 bg-[#0f172a] text-[#ffffff] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                  <Award size={140} />
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={cn("w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 shadow-lg", theme.bg)} style={{ boxShadow: `0 10px 15px -3px ${theme.hex}33` }}>
                    <Award size={32} className="text-[#ffffff]" />
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 tracking-tight">
                    Thành Tích Mới!
                  </h3>
                  
                  <div className={cn("h-[2px] w-10 mb-4 md:mb-6 opacity-50", theme.bg)} />
                  
                  <div className="space-y-1">
                    <p className="text-[#94a3b8] text-[10px] font-medium uppercase tracking-widest">Chuỗi ngày làm việc</p>
                    <p className={cn("text-4xl md:text-5xl font-black tracking-tighter", theme.accent)}>{streak}</p>
                    <p className="text-base md:text-lg font-bold">Ngày Liên Tiếp</p>
                  </div>
                  
                  <div className="mt-8 md:mt-10 pt-4 md:pt-6 border-t border-[rgba(255,255,255,0.1)] w-full flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[8px] md:text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Ứng dụng</p>
                      <p className={cn("text-[10px] md:text-xs font-bold", theme.accent)}>TimeTracker Pro</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] md:text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Ngày</p>
                      <p className="text-[10px] md:text-xs font-bold">{format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Options */}
              <div className="p-4 md:p-6 bg-white dark:bg-slate-900 pb-10 md:pb-6 transition-colors duration-300">
                <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Chia sẻ lên mạng xã hội</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={shareToFacebook}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-2xl transition-all group"
                  >
                    <Facebook size={18} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">Facebook</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      const url = window.location.origin;
                      window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=123456789&redirect_uri=${encodeURIComponent(url)}`, '_blank');
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-2xl transition-all group"
                  >
                    <MessageCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">Messenger</span>
                  </button>
                </div>
                
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="w-full mt-4 py-2 text-slate-400 dark:text-slate-500 font-bold text-[10px] hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Expanded Memory Modal */}
      <AnimatePresence>
        {expandedMemory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-8"
            onClick={() => setExpandedMemory(null)}
          >
            <button 
              onClick={() => setExpandedMemory(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all z-10"
            >
              <X size={20} />
            </button>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-start pt-12 md:pt-16"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                <img 
                  src={expandedMemory.imageUrl} 
                  alt="Memory Full" 
                  className="max-w-full max-h-[55vh] md:max-h-[65vh] object-contain rounded-2xl shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="w-full max-w-lg mt-4 md:mt-6 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 text-left text-white shadow-2xl mb-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm md:text-base font-bold text-white/90">
                      {format(parseISO(expandedMemory.date), 'dd MMMM, yyyy', { locale: vi })}
                    </p>
                    {imageDimensions && (
                      <p className="text-[10px] md:text-xs text-white/50 mt-1 font-mono flex items-center gap-1.5">
                        <Maximize2 size={10} />
                        {imageDimensions.width} × {imageDimensions.height} px
                      </p>
                    )}
                  </div>
                  <div className="p-2 bg-white/10 rounded-xl shrink-0">
                    <Camera size={16} className="text-white/80" />
                  </div>
                </div>
                
                {expandedMemory.note && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm md:text-base text-white/80 leading-relaxed italic">
                      "{expandedMemory.note}"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
