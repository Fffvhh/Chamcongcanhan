import React, { useState } from 'react';
import { LayoutGrid, Calendar, BarChart3, Settings, LogOut, Image as ImageIcon, Menu, Moon, Sun, LogIn, User as UserIcon, Shield, Clock, ShieldCheck, Wallet, Camera, Download, Compass } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAttendance } from '../hooks/useAttendance';
import { signInWithGoogle, logout } from '../firebase';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { darkMode, toggleDarkMode, user, userRole, theme } = useAttendance();

  const navItems = userRole === 'admin' 
    ? [
        { id: 'admin', label: 'Quản trị', icon: Shield },
        { id: 'settings', label: 'Tôi', icon: UserIcon },
      ]
    : [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutGrid },
        { id: 'calendar', label: 'Chấm công', icon: Calendar },
        { id: 'statistics', label: 'Báo cáo', icon: BarChart3 },
        { id: 'memories', label: 'Kỉ niệm', icon: ImageIcon },
        { id: 'journey', label: 'Hành trình', icon: Compass },
        { id: 'settings', label: 'Tôi', icon: UserIcon },
      ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden bg-slate-900 text-slate-300 flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out z-40",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn(
          "p-6 border-b border-slate-800 flex items-center gap-4",
          isCollapsed && "px-4 justify-center"
        )}>
          <div className="relative shrink-0">
            <div className={cn("w-10 h-10 rounded-xl rotate-12 flex items-center justify-center shadow-lg transition-all duration-300", theme.bg, theme.shadow)}>
              <Clock className="text-white w-6 h-6 -rotate-12" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
              <ShieldCheck className={cn("w-3 h-3", theme.accent)} />
            </div>
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="text-lg font-black text-white tracking-tight leading-none">
                Time<span className={theme.accent}>Tracker</span>
              </h1>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mt-1">Premium Edition</p>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white ml-auto",
              isCollapsed && "hidden"
            )}
          >
            <Menu size={18} />
          </button>
        </div>
        
        {isCollapsed && (
          <div className="flex justify-center p-4 border-b border-slate-800">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <Menu size={18} />
            </button>
          </div>
        )}
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? cn("bg-opacity-10 font-medium", theme.bg, theme.accent) 
                    : "hover:bg-slate-800 hover:text-white",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon size={20} className={isActive ? theme.accent : "text-slate-400 group-hover:text-white"} />
                {!isCollapsed && (
                  <span className="animate-in slide-in-from-left-2 duration-200">{item.label}</span>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <PWAInstallButton />
          {/* Auth Button */}
          {user ? (
            <div className={cn("flex flex-col gap-2", isCollapsed && "items-center")}>
              {!isCollapsed && (
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-slate-500 truncate">
                  <UserIcon size={14} />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              <button 
                onClick={logout}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer rounded-xl hover:bg-rose-500/10 group relative",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <LogOut size={20} />
                {!isCollapsed && <span className="animate-in slide-in-from-left-2 duration-200">Đăng xuất</span>}
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer rounded-xl group relative",
                theme.accent,
                "hover:bg-opacity-10",
                theme.secondary,
                isCollapsed && "justify-center px-2"
              )}
            >
              <LogIn size={20} />
              {!isCollapsed && <span className="animate-in slide-in-from-left-2 duration-200">Đăng nhập Google</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Bottom Navigation (Mobile & Web) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-around items-center p-1 z-50 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)] transition-colors duration-300">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center py-1 px-1 rounded-xl min-w-[64px] transition-all duration-200",
                isActive ? theme.text : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full mb-0.5 transition-all duration-200", 
                isActive ? cn("bg-opacity-10", theme.bg) : "bg-transparent"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive ? cn(theme.text, "font-bold") : "text-slate-500 dark:text-slate-400"
              )}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
