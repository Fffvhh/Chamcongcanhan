/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './ErrorBoundary';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { handleFirestoreError, OperationType } from './utils/firestoreError';
import { db } from './firebase';
import { doc, getDocFromServer, setDoc, increment, updateDoc } from 'firebase/firestore';
import { useAttendance } from './hooks/useAttendance';
import { Memories } from './components/Memories';
import { Journey } from './components/Journey';
import { cn } from './utils/cn';

function AppContent() {
  const { userRole, user, salarySettings, isLoaded, theme, themeColor } = useAttendance();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    console.log("AppContent: isLoaded changed to", isLoaded);
  }, [isLoaded]);

  // Initialization logic
  useEffect(() => {
    // Increment global visits counter
    async function incrementVisits() {
      if (sessionStorage.getItem('has_visited')) return;
      try {
        const { getDoc, getDocFromCache, doc, setDoc, updateDoc, increment } = await import('firebase/firestore');
        const visitsRef = doc(db, 'stats', 'visits');
        let snap;
        try {
          snap = await getDoc(visitsRef); // Use getDoc instead of getDocFromServer for speed
        } catch (error: any) {
          if (error.message?.includes('Quota limit exceeded') || error.message?.includes('resource-exhausted') || error.message?.includes('the client is offline') || error.message?.includes('Failed to get document')) {
            try {
              snap = await getDocFromCache(visitsRef);
            } catch (cacheError) {
              snap = { exists: () => false } as any;
            }
          } else {
            throw error;
          }
        }
        if (!snap.exists()) {
          await setDoc(visitsRef, { count: 1 });
        } else {
          await updateDoc(visitsRef, { count: increment(1) });
        }
        sessionStorage.setItem('has_visited', 'true');
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'stats/visits');
      }
    }

    // Test Firestore connection on boot
    async function testConnection() {
      try {
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }

    testConnection();
    incrementVisits();
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      if (activeTab !== 'admin' && activeTab !== 'settings') setActiveTab('admin');
    } else {
      if (activeTab !== 'dashboard' && activeTab !== 'history' && activeTab !== 'settings' && activeTab !== 'calendar' && activeTab !== 'statistics' && activeTab !== 'leaderboard' && activeTab !== 'memories' && activeTab !== 'journey') {
        setActiveTab('dashboard');
      }
    }
  }, [userRole]);

  // Removed login screen check to allow direct access
  return (
    <>
      <div 
        className={cn(
          "flex flex-col md:flex-row min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300",
          themeColor === 'slate' ? "selection:bg-slate-200 selection:text-slate-900" :
          themeColor === 'emerald' ? "selection:bg-emerald-200 selection:text-emerald-900" :
          themeColor === 'blue' ? "selection:bg-blue-200 selection:text-blue-900" :
          themeColor === 'orange' ? "selection:bg-orange-200 selection:text-orange-900" :
          themeColor === 'rose' ? "selection:bg-rose-200 selection:text-rose-900" :
          themeColor === 'violet' ? "selection:bg-violet-200 selection:text-violet-900" :
          themeColor === 'indigo' ? "selection:bg-indigo-200 selection:text-indigo-900" :
          themeColor === 'amber' ? "selection:bg-amber-200 selection:text-amber-900" :
          themeColor === 'teal' ? "selection:bg-teal-200 selection:text-teal-900" :
          "selection:bg-cyan-200 selection:text-cyan-900"
        )}
      >
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

          {/* Footer Section */}
          <footer className="mt-auto py-4 px-4 flex flex-col items-center justify-center text-center border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-colors duration-300">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm italic">
              "Mong con đường sắp tới bạn đi sẽ bằng phẳng hơn nếu có gồ ghề vẫn mong bạn đủ sức vượt qua"
            </p>
            <p className="mt-1 text-slate-400 dark:text-slate-500 text-[8px] font-medium tracking-widest uppercase">
              Phát triển bởi Trần Văn Thắng
            </p>
            
            {/* Bottom spacing for mobile nav */}
            <div className="h-10 md:h-2" />
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


