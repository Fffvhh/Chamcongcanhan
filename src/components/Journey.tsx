import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Plus, Map as MapIcon, Calendar, Trash2, X, Loader2, Compass, Share2, Edit2, Copy, Clock, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAttendance } from '../hooks/useAttendance';
import { useToast } from './Toast';
import { cn } from '../utils/cn';
import { getJourneys, addJourney, deleteJourney, updateJourney, Journey as JourneyType } from '../services/journeyService';

export const Journey = () => {
  const { theme, themeColor } = useAttendance();
  const { showToast } = useToast();
  const [journeys, setJourneys] = useState<JourneyType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [note, setNote] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [distance, setDistance] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  
  // Autocomplete state
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingEnd, setIsSearchingEnd] = useState(false);

  useEffect(() => {
    fetchJourneys();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (startLocation && endLocation && startLocation.length > 3 && endLocation.length > 3) {
        calculateDistance();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [startLocation, endLocation]);

  const calculateDistance = async () => {
    if (!startLocation || !endLocation) return;
    setIsCalculatingDistance(true);
    try {
      // 1. Geocode start
      const startRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(startLocation)}&limit=1`);
      const startData = await startRes.json();
      
      // 2. Geocode end
      const endRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(endLocation)}&limit=1`);
      const endData = await endRes.json();

      if (startData.features?.length && endData.features?.length) {
        const [lon1, lat1] = startData.features[0].geometry.coordinates;
        const [lon2, lat2] = endData.features[0].geometry.coordinates;

        // 3. Get route from OSRM
        const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
        const routeData = await routeRes.json();

        if (routeData.routes?.length) {
          const distInMeters = routeData.routes[0].distance;
          const distInKm = (distInMeters / 1000).toFixed(1);
          setDistance(`${distInKm} km`);
        }
      }
    } catch (error) {
      console.error("Distance calculation error:", error);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const fetchSuggestions = async (query: string, type: 'start' | 'end') => {
    if (query.length < 3) {
      if (type === 'start') setStartSuggestions([]);
      else setEndSuggestions([]);
      return;
    }

    if (type === 'start') setIsSearchingStart(true);
    else setIsSearchingEnd(true);

    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=vi`);
      if (response.ok) {
        const data = await response.json();
        const results = data.features.map((f: any) => {
          const { name, street, city, state, country } = f.properties;
          const parts = [name, street, city, state, country].filter(Boolean);
          return parts.join(', ');
        });
        if (type === 'start') setStartSuggestions(results);
        else setEndSuggestions(results);
      }
    } catch (error) {
      console.error("Autocomplete error:", error);
    } finally {
      if (type === 'start') setIsSearchingStart(false);
      else setIsSearchingEnd(false);
    }
  };

  const fetchJourneys = async () => {
    setIsLoading(true);
    try {
      const data = await getJourneys();
      setJourneys(data);
    } catch (error) {
      console.error("Error fetching journeys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetCurrentTime = () => {
    setTime(format(new Date(), 'HH:mm'));
    showToast("Đã lấy giờ hiện tại!", "info");
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("Trình duyệt của bạn không hỗ trợ lấy vị trí.", "error");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use Nominatim (OpenStreetMap) for free reverse geocoding
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: {
              'Accept-Language': 'vi,en-US,en;q=0.9'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setStartLocation(address);
            showToast("Đã lấy địa chỉ hiện tại!", "success");
          } else {
            setStartLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            showToast("Đã lấy tọa độ vị trí!", "success");
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          setStartLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          showToast("Đã lấy tọa độ vị trí!", "success");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        showToast("Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập vị trí.", "error");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!title || !startLocation || !endLocation || !date) {
      showToast("Vui lòng điền đầy đủ thông tin bắt buộc.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const journeyData = {
        title,
        startLocation,
        endLocation,
        date,
        time,
        distance,
        note,
        imageUrl
      };

      if (editingId) {
        await updateJourney(editingId, journeyData);
        showToast("Đã cập nhật hành trình!", "success");
      } else {
        await addJourney(journeyData);
        showToast("Đã lưu hành trình mới!", "success");
      }
      
      setEditingId(null);
      setTitle('');
      setStartLocation('');
      setEndLocation('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime(format(new Date(), 'HH:mm'));
      setDistance('');
      setNote('');
      setImageUrl('');
      setIsExpanded(false);
      
      await fetchJourneys();
    } catch (error) {
      console.error("Error saving journey:", error);
      showToast("Có lỗi xảy ra khi lưu hành trình.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (journey: JourneyType) => {
    setEditingId(journey.id);
    setTitle(journey.title);
    setStartLocation(journey.startLocation);
    setEndLocation(journey.endLocation);
    setDate(journey.date);
    setTime(journey.time || format(new Date(), 'HH:mm'));
    setDistance(journey.distance || '');
    setNote(journey.note || '');
    setImageUrl(journey.imageUrl || '');
    setIsExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension
          const MAX_DIM = 1200;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setImageUrl(compressedBase64);
          showToast("Đã nén và tải ảnh lên!", "success");
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = (journey: JourneyType) => {
    const text = `Hành trình: ${journey.title}\nNgày: ${journey.date}\nTừ: ${journey.startLocation}\nĐến: ${journey.endLocation}${journey.note ? `\nGhi chú: ${journey.note}` : ''}`;
    navigator.clipboard.writeText(text);
    showToast("Đã sao chép thông tin hành trình!", "success");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hành trình này?")) return;
    try {
      await deleteJourney(id);
      setJourneys(journeys.filter(j => j.id !== id));
      showToast("Đã xóa hành trình!", "success");
    } catch (error) {
      console.error("Error deleting journey:", error);
      showToast("Có lỗi xảy ra khi xóa hành trình.", "error");
    }
  };

  const isGoogleMapsLink = (text: string) => {
    return text.includes('google.com/maps') || text.includes('goo.gl/maps');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredJourneys = journeys.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.startLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.endLocation.toLowerCase().includes(searchQuery.toLowerCase());
    
    const journeyDate = parseISO(j.date);
    const matchesMonth = selectedMonth === 'all' || format(journeyDate, 'MM') === selectedMonth;
    const matchesYear = selectedYear === 'all' || format(journeyDate, 'yyyy') === selectedYear;
    
    return matchesSearch && matchesMonth && matchesYear;
  });

  const availableYears = Array.from(new Set(journeys.map(j => format(parseISO(j.date), 'yyyy')))).sort((a, b) => b.localeCompare(a));
  const availableMonths = [
    { value: '01', label: 'Tháng 1' },
    { value: '02', label: 'Tháng 2' },
    { value: '03', label: 'Tháng 3' },
    { value: '04', label: 'Tháng 4' },
    { value: '05', label: 'Tháng 5' },
    { value: '06', label: 'Tháng 6' },
    { value: '07', label: 'Tháng 7' },
    { value: '08', label: 'Tháng 8' },
    { value: '09', label: 'Tháng 9' },
    { value: '10', label: 'Tháng 10' },
    { value: '11', label: 'Tháng 11' },
    { value: '12', label: 'Tháng 12' },
  ];

  const renderLocation = (location: string, label: string, journeyId: string, type: 'start' | 'end') => {
    const copyId = `${journeyId}-${type}`;
    const isCopied = copiedId === copyId;

    if (isGoogleMapsLink(location)) {
      return (
        <a 
          href={location} 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn("group/loc flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800")}
        >
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", theme.bg, "bg-opacity-10")}>
            <MapPin size={14} className={theme.text} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
            <p className={cn("text-xs font-medium truncate", theme.text)}>Xem vị trí trên bản đồ</p>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCopy(location, copyId);
            }}
            className={cn(
              "p-1.5 rounded-md transition-all",
              isCopied ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 opacity-0 group-hover/loc:opacity-100"
            )}
            title="Sao chép liên kết"
          >
            {isCopied ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
          </button>
        </a>
      );
    }
    return (
      <div className="group/loc flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 shrink-0">
          <MapPin size={14} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{location}</p>
        </div>
        <button 
          onClick={() => handleCopy(location, copyId)}
          className={cn(
            "p-1.5 rounded-md transition-all",
            isCopied ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 opacity-0 group-hover/loc:opacity-100"
          )}
          title="Sao chép địa chỉ"
        >
          {isCopied ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg rotate-3", theme.bg, theme.shadow)}>
              <Compass className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Hành trình</h2>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{journeys.length} chuyến đi đã lưu</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Journey Input Form - Collapsible */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
        <div 
          className="relative p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme.bg, "bg-opacity-10")}>
              {editingId ? <Edit2 className={theme.text} size={16} /> : <Navigation className={theme.text} size={16} />}
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {editingId ? 'Sửa hành trình' : 'Thêm hành trình'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {(editingId || title || startLocation || endLocation || note || imageUrl) && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(null);
                  setTitle('');
                  setStartLocation('');
                  setEndLocation('');
                  setDate(format(new Date(), 'yyyy-MM-dd'));
                  setTime(format(new Date(), 'HH:mm'));
                  setNote('');
                  setImageUrl('');
                  setIsExpanded(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            )}
            <div className={cn("p-1.5 rounded-full transition-transform duration-300", isExpanded ? "rotate-180" : "rotate-0")}>
              <Plus size={18} className={cn(isExpanded ? "rotate-45" : "rotate-0", "text-slate-400 transition-transform")} />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 block ml-1">Tên chuyến đi</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={cn("w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all font-medium placeholder:text-slate-400", theme.ring)}
                    placeholder="VD: Đi Đà Lạt..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 block ml-1">Điểm xuất phát</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        value={startLocation}
                        onChange={(e) => {
                          setStartLocation(e.target.value);
                          fetchSuggestions(e.target.value, 'start');
                        }}
                        className={cn("w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 transition-all font-medium placeholder:text-slate-400", theme.ring)}
                        placeholder="Vị trí hiện tại..."
                      />
                      {startSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          {startSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setStartLocation(suggestion);
                                setStartSuggestions([]);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors flex items-center gap-2"
                            >
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate text-slate-700 dark:text-slate-300">{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetCurrentLocation();
                        }}
                        disabled={isLocating}
                        className={cn("absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-50", isLocating ? "bg-slate-200 dark:bg-slate-700" : "bg-[#00bfa5] text-white shadow-sm hover:scale-105")}
                        title="Lấy vị trí"
                      >
                        {isLocating ? <Loader2 size={14} className="animate-spin text-slate-500" /> : <Navigation size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 block ml-1">Điểm đến</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        value={endLocation}
                        onChange={(e) => {
                          setEndLocation(e.target.value);
                          fetchSuggestions(e.target.value, 'end');
                        }}
                        className={cn("w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all font-medium placeholder:text-slate-400", theme.ring)}
                        placeholder="Nơi đến..."
                      />
                      {endSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          {endSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setEndLocation(suggestion);
                                setEndSuggestions([]);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors flex items-center gap-2"
                            >
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate text-slate-700 dark:text-slate-300">{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 block ml-1">Ngày đi</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input 
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className={cn("w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-8 pr-2 py-2 text-[11px] focus:outline-none focus:ring-2 transition-all font-medium", theme.ring)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 block ml-1">Giờ đi</label>
                      <div className="relative group">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input 
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className={cn("w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-8 pr-8 py-2 text-[11px] focus:outline-none focus:ring-2 transition-all font-medium", theme.ring)}
                        />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGetCurrentTime();
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                          title="Lấy giờ hiện tại"
                        >
                          <Navigation size={10} className="rotate-45" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 block ml-1">Ảnh kỷ niệm</label>
                    <div className="flex items-center gap-3">
                      <label className={cn("flex-1 flex items-center justify-center gap-2 border border-dashed rounded-xl p-2 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50", theme.border.replace('border-', 'border-opacity-30 border-'))}>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        <Plus size={16} className="text-slate-400" />
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tải ảnh</span>
                      </label>
                      {imageUrl && (
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm group">
                          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageUrl('');
                            }}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} className="text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 block ml-1">Ghi chú</label>
                  <div className="relative">
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className={cn("w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all font-medium resize-none placeholder:text-slate-400", theme.ring)}
                      placeholder="Ghi lại cảm xúc..."
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        calculateDistance();
                      }}
                      disabled={isCalculatingDistance || !startLocation || !endLocation}
                      className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-emerald-500 transition-all disabled:opacity-50"
                      title="Tính lại quãng đường"
                    >
                      {isCalculatingDistance ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    </button>
                  </div>
                </div>

                {(distance || isCalculatingDistance) && (
                  <div className={cn(
                    "flex items-center justify-between p-3 border rounded-2xl transition-all",
                    distance ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                  )}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        distance ? "bg-emerald-500/20" : "bg-slate-200 dark:bg-slate-700"
                      )}>
                        <Navigation size={14} className={distance ? "text-emerald-500" : "text-slate-400"} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quãng đường dự tính</p>
                        <p className={cn(
                          "text-sm font-black",
                          distance ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 italic"
                        )}>
                          {isCalculatingDistance ? 'Đang tính toán...' : (distance || 'Chưa xác định')}
                        </p>
                      </div>
                    </div>
                    {isCalculatingDistance && (
                      <Loader2 size={14} className="animate-spin text-emerald-500" />
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-end gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(null);
                    setTitle('');
                    setStartLocation('');
                    setEndLocation('');
                    setDate(format(new Date(), 'yyyy-MM-dd'));
                    setTime(format(new Date(), 'HH:mm'));
                    setDistance('');
                    setNote('');
                    setImageUrl('');
                    setIsExpanded(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  disabled={isSaving}
                  className={cn("px-8 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2", "bg-[#00bfa5] hover:bg-[#00a693]")}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : (editingId ? 'Cập nhật' : 'Lưu lại')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Compass size={14} className="text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          </div>
          <input 
            type="text"
            placeholder="Tìm hành trình..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 transition-all shadow-sm",
              theme.ring.replace('ring-', 'ring-offset-1 ring-')
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 transition-all shadow-sm text-slate-600 dark:text-slate-400 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả tháng</option>
              {availableMonths.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Plus size={10} className="rotate-45" />
            </div>
          </div>

          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 transition-all shadow-sm text-slate-600 dark:text-slate-400 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả năm</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Plus size={10} className="rotate-45" />
            </div>
          </div>

          {distance && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg">
              <Navigation size={12} className="text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{distance}</span>
            </div>
          )}

          {(selectedMonth !== 'all' || selectedYear !== 'all' || searchQuery) && (
            <button 
              onClick={() => {
                setSelectedMonth('all');
                setSelectedYear('all');
                setSearchQuery('');
              }}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
              title="Đặt lại bộ lọc"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-32 space-y-4">
          <div className="relative">
            <div className={cn("w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-transparent animate-spin", theme.primary.replace('bg-', 'border-'))}></div>
            <Compass className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", theme.text)} size={24} />
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Đang tải hành trình của bạn...</p>
        </div>
      ) : filteredJourneys.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-16 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className={cn("w-24 h-24 mx-auto rounded-[2rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 rotate-6", theme.text)}>
            <MapIcon size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
            {(searchQuery || selectedMonth !== 'all' || selectedYear !== 'all') ? 'Không tìm thấy kết quả' : 'Chưa có hành trình nào'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {(searchQuery || selectedMonth !== 'all' || selectedYear !== 'all')
              ? 'Không tìm thấy hành trình nào khớp với bộ lọc hiện tại. Thử thay đổi bộ lọc nhé!'
              : 'Mỗi bước chân là một câu chuyện. Hãy bắt đầu ghi lại hành trình đầu tiên của bạn ngay hôm nay!'}
          </p>
          {(searchQuery || selectedMonth !== 'all' || selectedYear !== 'all') && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedMonth('all');
                setSelectedYear('all');
              }}
              className={cn("mt-6 px-6 py-2 rounded-xl font-bold transition-all", theme.accent, "bg-opacity-10 hover:bg-opacity-20")}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredJourneys.map((journey) => (
            <div key={journey.id} className="group bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col overflow-hidden">
              {journey.imageUrl && (
                <div className="h-24 w-full overflow-hidden relative">
                  <img src={journey.imageUrl} alt={journey.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-2 left-3">
                    <div className="flex items-center gap-2 text-white/90 text-[9px] font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{format(parseISO(journey.date), 'dd/MM/yyyy')}</span>
                      </div>
                      {journey.time && (
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>{journey.time}</span>
                        </div>
                      )}
                      {journey.distance && (
                        <div className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-md">
                          <Navigation size={10} />
                          <span>{journey.distance}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-1 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r transition-all duration-300" style={{ backgroundImage: themeColor === 'slate' ? 'linear-gradient(to right, #0f172a, #334155)' : undefined }}>
                      {journey.title}
                    </h3>
                    {!journey.imageUrl && (
                      <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                          <Calendar size={10} />
                          <span>{format(parseISO(journey.date), 'dd/MM/yyyy')}</span>
                        </div>
                        {journey.time && (
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>{journey.time}</span>
                          </div>
                        )}
                        {journey.distance && (
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                            <Navigation size={10} />
                            <span>{journey.distance}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => handleShare(journey)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                      title="Chia sẻ"
                    >
                      <Share2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleEdit(journey)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                      title="Sửa"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(journey.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 mb-3">
                  <div className="relative pl-3 space-y-2">
                    <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-slate-100 dark:bg-slate-800">
                      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full", theme.bg)}></div>
                      <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full border bg-white dark:bg-slate-900", theme.border)}></div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2 min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 shrink-0 w-6 mt-0.5">Từ:</p>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{journey.startLocation}</p>
                      </div>
                      <div className="flex items-start gap-2 min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 shrink-0 w-6 mt-0.5">Đến:</p>
                        <p className={cn("text-[11px] font-bold leading-relaxed", theme.text)}>{journey.endLocation}</p>
                      </div>
                    </div>
                  </div>

                  {journey.note && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                      "{journey.note}"
                    </p>
                  )}
                </div>
                
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center text-[7px] font-black text-white", theme.bg)}>
                      {journey.title.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Trip Log</span>
                  </div>
                  <div className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-opacity-10", theme.bg, theme.text)}>
                    Saved
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

