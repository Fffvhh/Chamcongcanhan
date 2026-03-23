/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';
import { AdminDashboard } from './components/AdminDashboard';
import { SplashScreen } from './components/SplashScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { db } from './firebase';
import { useAttendance } from './hooks/useAttendance';
import { UpdateNotification } from './components/UpdateNotification';
import { Memories } from './components/Memories';
import { Journey } from './components/Journey';
import { cn } from './utils/cn';

function AppContent() {
  const { userRole, salarySettings, isLoaded, themeColor } = useAttendance();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function incrementVisits() {
      if (sessionStorage.getItem('has_visited')) return;
      try {
        const { getDoc, doc, setDoc, updateDoc, increment } = await import('firebase/firestore');
        const visitsRef = doc(db, 'stats', 'visits');
        const snap = await getDoc(visitsRef);
        if (!snap.exists()) {
          await setDoc(visitsRef, { count: 1 });
        } else {
          await updateDoc(visitsRef, { count: increment(1) });
        }
        sessionStorage.setItem('has_visited', 'true');
      } catch (e) {
        console.error("Failed to increment visits", e);
      }
    }
    incrementVisits();
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      if (activeTab !== 'admin' && activeTab !== 'settings') setActiveTab('admin');
    } else {
      const validTabs = ['dashboard', 'calendar', 'statistics', 'memories', 'journey', 'settings'];
      if (!validTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [userRole]);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999]"
          >
            <SplashScreen onComplete={() => setShowSplash(false)} isLoaded={isLoaded} />
          </motion.div>
        )}
      </AnimatePresence>
      
      {salarySettings?.notificationEnabled && <UpdateNotification />}

      <div className={cn(
        "flex flex-col md:flex-row min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300",
        themeColor === 'slate' ? "selection:bg-slate-200 selection:text-slate-900" :
        themeColor === 'emerald' ? "selection:bg-emerald-200 selection:text-emerald-900" :
        "selection:bg-cyan-200 selection:text-cyan-900"
      )}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto pb-32 flex flex-col">
          <div className="flex-1">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'statistics' && <Statistics />}
            {activeTab === 'memories' && <Memories />}
            {activeTab === 'journey' && <Journey />}
            {activeTab === 'settings' && <Settings />}
            {activeTab === 'admin' && userRole === 'admin' && <AdminDashboard />}
          </div>
          <footer className="mt-auto py-4 px-4 flex flex-col items-center justify-center text-center border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm italic">
              "Mong con đường sắp tới bạn đi sẽ bằng phẳng hơn nếu có gồ ghề vẫn mong bạn đủ sức vượt qua"
            </p>
            <p className="mt-1 text-slate-400 dark:text-slate-500 text-[8px] font-medium tracking-widest uppercase">
              Phát triển bởi Trần Văn Thắng
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}

import { ToastProvider } from './components/Toast';
export default function App() {
  return (
    <ErrorBoundary>
      <AttendanceProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AttendanceProvider>
    </ErrorBoundary>
  );
}
