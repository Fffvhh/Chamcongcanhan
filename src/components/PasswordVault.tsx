import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  KeyRound, 
  Plus, 
  X, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  Facebook, 
  Youtube, 
  Smartphone, 
  Landmark, 
  Globe,
  ChevronRight,
  ShieldCheck,
  Search
} from 'lucide-react';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useAttendance } from '../hooks/useAttendance';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface PasswordItem {
  id: string;
  title: string;
  category: 'social' | 'banking' | 'other';
  username: string;
  password: string;
  note?: string;
  createdAt: string;
  uid: string;
}

export function PasswordVault() {
  const { user, theme } = useAttendance();
  const [items, setItems] = useState<PasswordItem[]>([]);
  const [showMainModal, setShowMainModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<PasswordItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  
  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'social' | 'banking' | 'other'>('social');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Basic obfuscation to prevent plain text in DB (not true encryption, but better than plain text)
  const obfuscate = (str: string) => {
    try {
      return btoa(encodeURIComponent(str));
    } catch {
      return str;
    }
  };

  const deobfuscate = (str: string) => {
    try {
      return decodeURIComponent(atob(str));
    } catch {
      return str;
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/passwords`),
      orderBy('createdAt', 'desc')
    );

    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedItems: PasswordItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as PasswordItem;
          fetchedItems.push({
            ...data,
            password: deobfuscate(data.password)
          });
        });
        setItems(fetchedItems);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/passwords`);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/passwords`);
    }

    return () => unsubscribe();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !username.trim() || !password.trim()) return;

    setIsSaving(true);
    try {
      const id = viewingItem ? viewingItem.id : Date.now().toString();
      const newItem: PasswordItem = {
        id,
        title: title.trim(),
        category,
        username: username.trim(),
        password: obfuscate(password.trim()),
        note: note.trim(),
        createdAt: viewingItem ? viewingItem.createdAt : new Date().toISOString(),
        uid: user.uid
      };

      await setDoc(doc(db, `users/${user.uid}/passwords`, id), newItem);
      
      setShowAddModal(false);
      setViewingItem(null);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/passwords`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/passwords`, id));
      if (viewingItem?.id === id) setViewingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/passwords/${id}`);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('social');
    setUsername('');
    setPassword('');
    setNote('');
  };

  const openEdit = (item: PasswordItem) => {
    setTitle(item.title);
    setCategory(item.category);
    setUsername(item.username);
    setPassword(item.password);
    setNote(item.note || '');
    setViewingItem(item);
    setShowAddModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => {
      const isShowing = !prev[id];
      if (isShowing) {
        // Auto-hide after 10 seconds
        setTimeout(() => {
          setShowPassword(current => ({ ...current, [id]: false }));
        }, 10000);
      }
      return { ...prev, [id]: isShowing };
    });
  };

  const renderIcon = (category: string, title: string) => {
    const t = title.toLowerCase();
    if (t.includes('facebook') || t.includes('fb')) return <Facebook className="w-5 h-5 text-blue-600" />;
    if (t.includes('youtube') || t.includes('yt')) return <Youtube className="w-5 h-5 text-red-600" />;
    if (t.includes('tiktok')) return <Smartphone className="w-5 h-5 text-slate-900" />;
    if (t.includes('mb') || t.includes('mbbank') || t.includes('hd') || t.includes('hdbank') || category === 'banking') return <Landmark className="w-5 h-5 text-emerald-600" />;
    if (category === 'social') return <Globe className="w-5 h-5 text-blue-500" />;
    return <KeyRound className="w-5 h-5 text-slate-500" />;
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <>
      {/* Compact Trigger Button */}
      <button 
        onClick={() => setShowMainModal(true)}
        className={cn(
          "w-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 overflow-hidden mb-4 transition-all duration-300 text-left group",
          theme.hover
        )}
      >
        <div className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", theme.bgLight, theme.accent)}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Kho Mật Khẩu</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {items.length} tài khoản đã lưu
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </button>

      {/* Main Vault Modal */}
      <AnimatePresence>
        {showMainModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowMainModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800/50"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", theme.bgLight, theme.accent)}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kho Mật Khẩu</h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                      Lưu trữ an toàn tài khoản MXH, Ngân hàng
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative hidden sm:block">
                    <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Tìm kiếm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn("pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm outline-none w-48 transition-all text-slate-800 dark:text-slate-200", theme.focus)}
                    />
                  </div>
                  <button
                    onClick={() => { resetForm(); setViewingItem(null); setShowAddModal(true); }}
                    className={cn("p-2 sm:px-4 sm:py-2.5 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95", theme.primary, theme.hover)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Thêm mới</span>
                  </button>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
                  <button
                    onClick={() => setShowMainModal(false)}
                    className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Search */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 sm:hidden bg-white dark:bg-slate-900">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="Tìm kiếm tài khoản..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn("w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm outline-none transition-all text-slate-800 dark:text-slate-200", theme.focus)}
                  />
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <KeyRound className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Chưa có tài khoản nào</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm">
                      Thêm mật khẩu Facebook, YouTube, TikTok hoặc tài khoản ngân hàng của bạn để quản lý dễ dàng.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredItems.map((item) => (
                      <div key={item.id} className="group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl shrink-0">
                              {renderIcon(item.category, item.title)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm" title={item.title}>
                                {item.title}
                              </h4>
                              <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 rounded-md text-[10px] font-bold uppercase tracking-wider mt-1">
                                {item.category === 'social' ? 'Mạng xã hội' : item.category === 'banking' ? 'Ngân hàng' : 'Khác'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors text-xs font-bold"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/30">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-20 shrink-0">Tài khoản</div>
                            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.username}</span>
                              <button 
                                onClick={() => copyToClipboard(item.username)}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-20 shrink-0">Mật khẩu</div>
                            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                              <span className="text-sm font-mono font-black text-slate-800 dark:text-slate-200 truncate tracking-wider">
                                {showPassword[item.id] ? item.password : '••••••••'}
                              </span>
                              <button 
                                onClick={() => togglePasswordVisibility(item.id)}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
                              >
                                {showPassword[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button 
                                onClick={() => copyToClipboard(item.password)}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {item.note && (
                          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-900/10 p-2.5 rounded-lg border border-amber-100/50 dark:border-amber-900/20">
                            <span className="font-bold text-amber-700/70 dark:text-amber-500/70 uppercase text-[9px] tracking-wider">Ghi chú: </span>
                            {item.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800/50"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-white dark:bg-slate-900">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-500" />
                  {viewingItem ? 'Sửa Tài Khoản' : 'Thêm Tài Khoản'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Tên dịch vụ / Ứng dụng
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Facebook, MB Bank..."
                    className={cn("w-full px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none transition-all font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600", theme.focus)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Phân loại
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategory('social')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${category === 'social' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      Mạng xã hội
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategory('banking')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${category === 'banking' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      Ngân hàng
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategory('other')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${category === 'other' ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      Khác
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Tên đăng nhập / Số điện thoại
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tài khoản đăng nhập"
                    className={cn("w-full px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none transition-all font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600", theme.focus)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Mật khẩu / Mã PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword['form'] ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu"
                      className={cn("w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none transition-all font-mono font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600", theme.focus)}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('form')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword['form'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Ghi chú (Không bắt buộc)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Thông tin thêm..."
                    className={cn("w-full px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none transition-all resize-none text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600", theme.focus)}
                  />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 bg-slate-100 dark:bg-slate-800/50 rounded-xl font-bold transition-all active:scale-95"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !title.trim() || !username.trim() || !password.trim()}
                    className={cn("px-6 py-2.5 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm active:scale-95", theme.primary, theme.hover, theme.shadow)}
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    Lưu
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
