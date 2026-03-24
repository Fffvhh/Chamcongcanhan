import { useState, useRef, useMemo, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ImagePlus, Trash2, X, Calendar, Camera, ChevronLeft, ChevronRight, SwitchCamera, Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useMemories } from '../hooks/useMemories';
import { cn } from '../lib/utils';

import { useAttendance } from '../hooks/useAttendance';

export const Memories = () => {
  const { theme } = useAttendance();
  const { memories, addMemory, deleteMemory } = useMemories();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9');
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingMemories, setViewingMemories] = useState<any[] | null>(null);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const startCamera = async (mode = facingMode) => {
    setIsCameraOpen(true);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatusMessage({ type: 'error', text: "Trình duyệt của bạn không hỗ trợ truy cập camera hoặc đang chạy trong môi trường không an toàn (không phải HTTPS)." });
      setTimeout(() => setStatusMessage(null), 5000);
      setIsCameraOpen(false);
      return;
    }

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Request HD resolution (1080p ideal, fallback to basic)
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatusMessage({ type: 'error', text: "Quyền truy cập camera bị từ chối. Vui lòng kiểm tra cài đặt trình duyệt." });
        setTimeout(() => setStatusMessage(null), 5000);
        setIsCameraOpen(false);
        return;
      }

      // Fallback to basic constraints if high-res fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (fallbackErr: any) {
        console.error("Fallback camera error:", fallbackErr);
        setStatusMessage({ type: 'error', text: "Không thể truy cập camera. Vui lòng kiểm tra thiết bị của bạn." });
        setTimeout(() => setStatusMessage(null), 5000);
        setIsCameraOpen(false);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      let targetRatio = 16 / 9;
      if (aspectRatio === '4:3') targetRatio = 4 / 3;
      if (aspectRatio === '1:1') targetRatio = 1 / 1;

      // Use screen orientation to match the preview container's aspect ratio
      if (isPortrait) {
        targetRatio = 1 / targetRatio;
      }

      let cropWidth = videoWidth;
      let cropHeight = videoHeight;
      const currentRatio = videoWidth / videoHeight;

      if (currentRatio > targetRatio) {
        cropWidth = videoHeight * targetRatio;
      } else {
        cropHeight = videoWidth / targetRatio;
      }

      const startX = (videoWidth - cropWidth) / 2;
      const startY = (videoHeight - cropHeight) / 2;

      // Cap resolution to ensure it stays under Firestore 1MB limit
      const MAX_RES = 1280;
      let scale = 1;
      if (cropWidth > MAX_RES || cropHeight > MAX_RES) {
        scale = MAX_RES / Math.max(cropWidth, cropHeight);
      }

      canvas.width = cropWidth * scale;
      canvas.height = cropHeight * scale;

      // Draw video frame
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      if (facingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      }

      // Add timestamp with high quality rendering
      const now = new Date();
      const timeString = format(now, 'HH:mm - dd/MM/yyyy');
      
      // Scale font size based on resolution
      const fontSize = Math.max(16, Math.floor(canvas.width * 0.03));
      ctx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      
      const textMetrics = ctx.measureText(timeString);
      const textWidth = textMetrics.width;
      const paddingX = fontSize * 0.8;
      const paddingY = fontSize * 0.4;
      
      const x = canvas.width - textWidth - paddingX * 2 - (canvas.width * 0.03);
      const y = canvas.height - fontSize - paddingY * 2 - (canvas.height * 0.03);
      const w = textWidth + paddingX * 2;
      const h = fontSize + paddingY * 2;

      // Draw background pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, h / 2);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, w, h);
      }
      
      // Draw text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeString, x + w / 2, y + h / 2);

      // High quality JPEG output (0.8 is a good balance for Firestore)
      setImagePreview(canvas.toDataURL('image/jpeg', 0.8));
      stopCamera();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Cap resolution to ensure it stays under Firestore 1MB limit
        const MAX_WIDTH = 1280; 
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        setImagePreview(canvas.toDataURL('image/jpeg', 0.8));
        setIsCompressing(false);
      };
      img.onerror = () => setIsCompressing(false);
    };
    reader.onerror = () => setIsCompressing(false);
  };

  const handleSave = async () => {
    if (!imagePreview || isSaving) return;
    
    // Check size (Firestore limit is 1MB for the whole document)
    // Base64 is ~33% larger than binary. 800KB base64 is safe.
    if (imagePreview.length > 900000) {
      setStatusMessage({ type: 'error', text: 'Ảnh quá lớn. Vui lòng chọn ảnh khác hoặc chụp lại.' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsSaving(true);
    
    const memoryData = {
      date: selectedDate,
      imageUrl: imagePreview,
      note
    };

    try {
      await addMemory(memoryData);
      
      // Reset form on success
      setIsAdding(false);
      setImagePreview(null);
      setNote('');
      
      // If we just added a memory for a different month, navigate to that month
      const addedDate = parseISO(selectedDate);
      if (!isSameMonth(addedDate, currentMonth)) {
        setCurrentMonth(startOfMonth(addedDate));
      }
      
      setStatusMessage({ type: 'success', text: 'Đã lưu kỉ niệm thành công!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Error saving memory:", error);
      setStatusMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu kỉ niệm. Vui lòng thử lại.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  // Group memories by date for the calendar
  const memoriesByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    memories.forEach(m => {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    });
    return map;
  }, [memories]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {statusMessage && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 min-w-[300px]",
          statusMessage.type === 'success' ? "bg-emerald-500 text-white" : 
          statusMessage.type === 'error' ? "bg-rose-500 text-white" :
          "bg-blue-500 text-white"
        )}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : 
           statusMessage.type === 'error' ? <AlertTriangle size={20} /> :
           <RefreshCw size={20} className="animate-spin" />}
          <span className="font-bold">{statusMessage.text}</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Kỉ niệm</h2>
          <p className="text-slate-500 mt-1 text-sm md:text-lg">Lưu giữ khoảnh khắc theo lịch tháng</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className={cn("flex items-center justify-between w-full sm:w-auto gap-2 md:gap-4 bg-white p-2 rounded-2xl shadow-sm border", theme.borderLight)}>
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <span className="text-base md:text-lg font-semibold text-slate-800 min-w-[140px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: vi })}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
          
          <button 
            onClick={() => {
              setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
              setIsAdding(true);
            }}
            className={cn("flex items-center justify-center gap-2 text-white px-5 py-3 rounded-2xl font-medium transition-all shadow-sm w-full sm:w-auto", theme.primary, theme.hover, theme.shadow)}
          >
            <ImagePlus size={20} />
            <span>Thêm kỉ niệm</span>
          </button>
        </div>
      </header>

      {/* Calendar Grid */}
      <div className={cn("bg-white rounded-2xl md:rounded-3xl shadow-sm border overflow-hidden", theme.borderLight)}>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
            <div key={day} className="py-2 md:py-4 text-center text-xs md:text-sm font-semibold text-slate-500 tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[80px] sm:auto-rows-[100px] md:auto-rows-[140px]">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayMemories = memoriesByDate[dateStr] || [];
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toString()}
                onClick={() => {
                  if (dayMemories.length > 0) {
                    setViewingMemories(dayMemories);
                  } else if (isTodayDate) {
                    setSelectedDate(dateStr);
                    setIsAdding(true);
                  }
                }}
                className={cn(
                  "border-r border-b border-slate-100 p-1 md:p-2 transition-all relative group overflow-hidden cursor-pointer",
                  !isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "hover:bg-slate-50",
                  isTodayDate && cn("ring-2 ring-inset z-10", theme.ring),
                  !isTodayDate && dayMemories.length === 0 && "cursor-default hover:bg-transparent"
                )}
              >
                <span className={cn(
                  "absolute top-1 left-1 md:top-2 md:left-2 w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full text-[10px] md:text-sm font-medium z-10",
                  isTodayDate ? cn(theme.primary, "text-white") : (dayMemories.length > 0 ? "bg-white/80 backdrop-blur-sm text-slate-800 shadow-sm" : "text-slate-500")
                )}>
                  {format(day, 'd')}
                </span>

                      {dayMemories.length > 0 && (
                        <div className="w-full h-full pt-5 md:pt-8 pb-0 md:pb-1 px-0 md:px-1">
                          <div className="w-full h-full relative rounded-md md:rounded-xl overflow-hidden shadow-sm border border-slate-200 group-hover:shadow-md transition-shadow group-hover:scale-[1.02] duration-200">
                            {dayMemories[0].imageUrl && <img src={dayMemories[0].imageUrl} className="w-full h-full object-cover" alt="Memory thumbnail" referrerPolicy="no-referrer" />}
                            {dayMemories.length > 1 && (
                              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] md:text-xs px-1.5 py-0.5 rounded-md backdrop-blur-md font-medium">
                                +{dayMemories.length - 1}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                
                {dayMemories.length === 0 && isTodayDate && (
                  <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImagePlus size={20} className="text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* View Memory Modal */}
      {viewingMemories && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className={theme.accent} />
                Kỉ niệm ngày {format(parseISO(viewingMemories[0].date), 'dd/MM/yyyy')}
              </h3>
              <button onClick={() => {
                setViewingMemories(null);
                setExpandedImageId(null);
              }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50">
              {viewingMemories.map(memory => {
                const isExpanded = expandedImageId === memory.id;
                return (
                  <div key={memory.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="relative group">
                      <img 
                        src={memory.imageUrl} 
                        alt="Memory" 
                        onClick={() => setExpandedImageId(isExpanded ? null : memory.id)}
                        className={cn(
                          "w-full rounded-xl cursor-pointer transition-all duration-300 bg-slate-50",
                          isExpanded ? "h-auto object-contain max-h-[85vh]" : "aspect-video object-cover"
                        )}
                        referrerPolicy="no-referrer"
                      />
                      {!isExpanded && (
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm">
                          Bấm để xem toàn ảnh
                        </div>
                      )}
                    </div>
                    {memory.note && (
                      <p className="mt-4 text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {memory.note}
                      </p>
                    )}
                    <div className="mt-4 flex justify-end items-center">
                      <button 
                        onClick={() => setDeleteConfirmation(memory.id)}
                        className="text-rose-500 flex items-center gap-2 text-sm font-medium hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} /> Xóa ảnh này
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 md:p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <button 
                onClick={() => {
                  setSelectedDate(viewingMemories[0].date);
                  setIsAdding(true);
                  setViewingMemories(null);
                  setExpandedImageId(null);
                }}
                className={cn("w-full sm:w-auto flex items-center justify-center gap-2 font-medium px-4 py-2.5 rounded-xl transition-colors", theme.accent, theme.bgLight.replace('bg-', 'hover:bg-'))}
              >
                <ImagePlus size={18} /> Thêm ảnh khác vào ngày này
              </button>
              <button 
                onClick={() => {
                  setViewingMemories(null);
                  setExpandedImageId(null);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-white bg-slate-800 hover:bg-slate-900 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Memory Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-slate-800">Thêm kỉ niệm mới</h3>
              <button onClick={() => { setIsAdding(false); setImagePreview(null); setNote(''); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-5 md:p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ngày</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  readOnly
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-3 focus:outline-none font-mono cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-slate-400 italic">* Chỉ cho phép thêm kỉ niệm cho ngày hôm nay</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hình ảnh</label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 group">
                    <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-64 object-contain bg-slate-50" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-full shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("w-full border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer", theme.accent.replace('text-', 'hover:border-').replace('600', '400'), theme.accent.replace('text-', 'hover:text-'))}
                    >
                      {isCompressing ? (
                        <div className={cn("w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-2", theme.accent.replace('text-', 'border-').replace('600', '500'), theme.accent.replace('text-', 'border-t-'))} />
                      ) : (
                        <ImagePlus size={28} className="mb-2" />
                      )}
                      <span className="font-medium text-sm text-center">{isCompressing ? 'Đang xử lý...' : 'Tải ảnh lên'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleImageChange}
                      />
                    </div>
                    <div 
                      onClick={() => startCamera()}
                      className={cn("w-full border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer", theme.accent.replace('text-', 'hover:border-').replace('600', '400'), theme.accent.replace('text-', 'hover:text-'))}
                    >
                      <Camera size={28} className="mb-2" />
                      <span className="font-medium text-sm text-center">Chụp ảnh ngay</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú kỉ niệm</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className={cn("w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none resize-none", theme.focus)}
                  placeholder="Viết vài dòng về khoảnh khắc này..."
                />
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => { setIsAdding(false); setImagePreview(null); setNote(''); }}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                disabled={!imagePreview || isSaving}
                className={cn("px-5 py-2.5 rounded-xl font-medium text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", theme.primary, theme.hover, theme.shadow)}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Lưu kỉ niệm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Xóa kỉ niệm?</h3>
                <p className="text-slate-500">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa kỉ niệm này?</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 px-4 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={async () => {
                  try {
                    await deleteMemory(deleteConfirmation);
                    if (viewingMemories) {
                      if (viewingMemories.length === 1) {
                        setViewingMemories(null);
                        setExpandedImageId(null);
                      } else {
                        setViewingMemories(viewingMemories.filter(m => m.id !== deleteConfirmation));
                      }
                    }
                    setDeleteConfirmation(null);
                    setStatusMessage({ type: 'success', text: 'Đã xóa kỉ niệm thành công!' });
                    setTimeout(() => setStatusMessage(null), 3000);
                  } catch (error) {
                    setStatusMessage({ type: 'error', text: 'Có lỗi xảy ra khi xóa kỉ niệm.' });
                    setTimeout(() => setStatusMessage(null), 3000);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-2xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
            <button onClick={stopCamera} className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md">
              <X size={24} />
            </button>
            <div className="flex bg-black/50 backdrop-blur-md rounded-full p-1">
              {(['16:9', '4:3', '1:1'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-full transition-colors",
                    aspectRatio === ratio ? "bg-white text-black" : "text-white hover:bg-white/20"
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>
            <button onClick={toggleCamera} className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md">
              <SwitchCamera size={24} />
            </button>
          </div>
          
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <div 
              className="relative overflow-hidden transition-all duration-300 flex items-center justify-center"
              style={{ 
                aspectRatio: isPortrait 
                  ? aspectRatio.split(':').reverse().join('/') 
                  : aspectRatio.split(':').join('/'),
                width: '100%',
                maxHeight: '100%'
              }}
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={cn("absolute inset-0 w-full h-full object-cover", facingMode === 'user' && "scale-x-[-1]")}
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay Timestamp Preview */}
            <div className="absolute bottom-32 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-bold tracking-wider flex items-center gap-2">
              <Clock size={14} />
              {format(new Date(), 'HH:mm - dd/MM/yyyy')}
            </div>
          </div>

          <div className="h-32 bg-black flex items-center justify-center pb-8 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent">
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center p-1 active:scale-95 transition-transform"
            >
              <div className="w-full h-full bg-white rounded-full"></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
