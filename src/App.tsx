import React, { useState, useEffect } from 'react';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { useAttendance } from './hooks/useAttendance';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { Statistics } from './components/Statistics';
import { Memories } from './components/Memories';
import { Settings } from './components/Settings';
import { LoginScreen } from './components/LoginScreen';
import { Loading } from './components/Loading';
import { AdminDashboard } from './components/AdminDashboard';
import { Journey } from './components/Journey';
import { SplashScreen } from './components/SplashScreen';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './ErrorBoundary';
import { AnimatePresence, motion } from 'motion/react';

function AppContent() {
  const { user, isLoaded, userRole } = useAttendance();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} isLoaded={isLoaded} />;
  }

  if (!isLoaded) {
    return <Loading />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    if (userRole === 'admin') {
      switch (activeTab) {
        case 'admin': return <AdminDashboard />;
        case 'settings': return <Settings />;
        default: return <AdminDashboard />;
      }
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'calendar': return <CalendarView />;
      case 'statistics': return <Statistics />;
      case 'memories': return <Memories />;
      case 'journey': return <Journey />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0a0502] transition-colors duration-300">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 pb-24 md:pb-0 md:pl-0 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AttendanceProvider>
          <AppContent />
        </AttendanceProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
