import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  File as FileIcon,
  Trash2,
  Download,
  ExternalLink,
  X,
  Plus,
  HardDrive,
  ChevronRight,
  Eye
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useAttendance } from '../hooks/useAttendance';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface StorageItem {
  id: string;
  type: 'text' | 'image' | 'file' | 'link';
  name: string;
  content: string;
  size: number;
  createdAt: string;
  uid: string;
}

const MAX_STORAGE_BYTES = 1024 * 1024 * 1024; // 1GB
const MAX_FILE_BYTES = 800 * 1024; // 800KB per file due to Firestore limits

export function CloudStorage() {
  const { user, theme } = useAttendance();
  const [items, setItems] = useState<StorageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMainModal, setShowMainModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'text' | 'link' | 'file'>('text');
  const [viewingItem, setViewingItem] = useState<StorageItem | null>(null);
  
  // Form states
  const [itemName, setItemName] = useState('');
  const [itemContent, setItemContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/cloudStorage`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems: StorageItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push(doc.data() as StorageItem);
      });
      setItems(fetchedItems);
    });

    return () => unsubscribe();
  }, [user]);

  const totalUsedBytes = items.reduce((acc, item) => acc + item.size, 0);
  const exactPercentage = (totalUsedBytes / MAX_STORAGE_BYTES) * 100;
  const visualPercentage = totalUsedBytes > 0 ? Math.max(exactPercentage, 1) : 0; // At least 1% visually
  const displayPercentage = totalUsedBytes === 0 ? "0" : exactPercentage < 0.01 ? "<0.01" : exactPercentage.toFixed(2);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIMENSION = 1200;

          if (width > height && width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          while (dataUrl.length * 0.75 > MAX_FILE_BYTES && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');

    if (!isImage && file.size > MAX_FILE_BYTES) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);

    try {
      let base64 = '';
      let finalSize = file.size;

      if (isImage) {
        base64 = await compressImage(file);
        finalSize = Math.round(base64.length * 0.75);
      } else {
        base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      }

      if (totalUsedBytes + finalSize > MAX_STORAGE_BYTES) {
        setIsUploading(false);
        return;
      }

      await handleSaveItem({
        type: isImage ? 'image' : 'file',
        name: file.name,
        content: base64,
        size: finalSize
      });
    } catch (error) {
      console.error("Error processing file:", error);
      setIsUploading(false);
    }
  };

  const handleSaveItem = async (data: { type: StorageItem['type'], name: string, content: string, size: number }) => {
    if (!user) return;
    setIsUploading(true);
    try {
      const id = Date.now().toString();
      const newItem: StorageItem = {
        id,
        ...data,
        createdAt: new Date().toISOString(),
        uid: user.uid
      };

      await setDoc(doc(db, `users/${user.uid}/cloudStorage`, id), newItem);
      
      setShowAddModal(false);
      setItemName('');
      setItemContent('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/cloudStorage`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/cloudStorage`, id));
      if (viewingItem?.id === id) setViewingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/cloudStorage/${id}`);
    }
  };

  const handleTextLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemContent.trim()) return;

    const size = new Blob([itemContent]).size;
    if (totalUsedBytes + size > MAX_STORAGE_BYTES) {
      return;
    }

    handleSaveItem({
      type: addType as 'text' | 'link',
      name: itemName.trim(),
      content: itemContent.trim(),
      size
    });
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'text': return <FileText className="w-5 h-5 text-emerald-500" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-purple-500" />;
      default: return <FileIcon className="w-5 h-5 text-slate-500" />;
    }
  };

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
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Lưu Trữ Đám Mây</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {items.length} mục • Đã dùng {formatBytes(totalUsedBytes)} / 1 GB
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </button>

      {/* Main Storage Modal */}
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
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Lưu Trữ Đám Mây</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", exactPercentage > 90 ? 'bg-red-500' : exactPercentage > 70 ? 'bg-amber-500' : theme.primary.replace('text-', 'bg-'))}
                          style={{ width: `${visualPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {formatBytes(totalUsedBytes)} / 1 GB ({displayPercentage}%)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      * Ảnh tự động nén. File khác tối đa 800KB.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setAddType('text'); setShowAddModal(true); }}
                    className="p-2 sm:px-4 sm:py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95"
                    title="Thêm văn bản"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Văn bản</span>
                  </button>
                  <button
                    onClick={() => { setAddType('link'); setShowAddModal(true); }}
                    className="p-2 sm:px-4 sm:py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95"
                    title="Thêm liên kết"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Liên kết</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn("p-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95 shadow-sm", theme.bgLight, theme.accent)}
                    title="Tải lên file/ảnh"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Tải lên</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
                  <button
                    onClick={() => setShowMainModal(false)}
                    className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
                {items.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <Cloud className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Chưa có dữ liệu</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm">
                      Tải lên tài liệu, hình ảnh hoặc lưu trữ các liên kết và ghi chú quan trọng của bạn tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <div key={item.id} className="group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all flex flex-col">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl shrink-0">
                            {renderIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm" title={item.name}>
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              <span>{format(new Date(item.createdAt), 'dd/MM/yyyy')}</span>
                              <span>•</span>
                              <span>{formatBytes(item.size)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-700/30 flex items-center justify-between">
                          {item.type === 'link' ? (
                            <a 
                              href={item.content} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5"
                            >
                              Mở liên kết <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : item.type === 'text' || item.type === 'image' ? (
                            <button 
                              onClick={() => setViewingItem(item)}
                              className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5", theme.bgLight, theme.accent)}
                            >
                              Xem chi tiết <Eye className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <a 
                              href={item.content} 
                              download={item.name}
                              className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5", theme.bgLight, theme.accent)}
                            >
                              Tải xuống <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Item Modal */}
      <AnimatePresence>
        {viewingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-sm"
              onClick={() => setViewingItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800/50"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    {renderIcon(viewingItem.type)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                    {viewingItem.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleDelete(viewingItem.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewingItem(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/50">
                {viewingItem.type === 'image' ? (
                  <img 
                    src={viewingItem.content} 
                    alt={viewingItem.name} 
                    className="max-w-full h-auto rounded-2xl mx-auto shadow-md border border-white/10"
                  />
                ) : viewingItem.type === 'text' ? (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed font-medium text-sm">
                    {viewingItem.content}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Item Modal */}
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
                  {addType === 'text' ? <FileText className="w-5 h-5 text-emerald-500" /> : <LinkIcon className="w-5 h-5 text-purple-500" />}
                  {addType === 'text' ? 'Thêm Văn Bản' : 'Thêm Liên Kết'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTextLinkSubmit} className="p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder={addType === 'text' ? "VD: Ghi chú cuộc họp" : "VD: Tài liệu tham khảo"}
                    className={cn("w-full px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none transition-all font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600", theme.focus)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    {addType === 'text' ? 'Nội dung' : 'URL Liên kết'}
                  </label>
                  {addType === 'text' ? (
                    <textarea
                      required
                      value={itemContent}
                      onChange={(e) => setItemContent(e.target.value)}
                      rows={5}
                      placeholder="Nhập nội dung văn bản..."
                      className={cn("w-full px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none transition-all resize-none font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600", theme.focus)}
                    />
                  ) : (
                    <input
                      type="url"
                      required
                      value={itemContent}
                      onChange={(e) => setItemContent(e.target.value)}
                      placeholder="https://..."
                      className={cn("w-full px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none transition-all font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600", theme.focus)}
                    />
                  )}
                </div>
                
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 bg-slate-100 dark:bg-slate-800/50 rounded-xl font-bold transition-all active:scale-95"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !itemName.trim() || !itemContent.trim()}
                    className={cn("px-6 py-2.5 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm active:scale-95", theme.primary, theme.hover, theme.shadow)}
                  >
                    {isUploading ? (
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
