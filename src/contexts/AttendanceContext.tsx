import React, { createContext, useContext, useState, useEffect } from 'react';

// ID mặc định của Thắng để load dữ liệu từ Firestore
const MOCK_USER_ID = "user_thang_quynh_luu";

interface AttendanceContextType {
  user: any;
  userRole: string;
  isLoaded: boolean;
  salarySettings: any;
  themeColor: string;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [userRole, setUserRole] = useState('user'); // Mặc định là user

  useEffect(() => {
    // Giả lập trạng thái đã load xong dữ liệu
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AttendanceContext.Provider value={{ 
      user: { uid: MOCK_USER_ID }, 
      userRole, 
      isLoaded, 
      salarySettings: { notificationEnabled: true },
      themeColor: 'cyan'
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) throw new Error('useAttendance must be used within AttendanceProvider');
  return context;
};
