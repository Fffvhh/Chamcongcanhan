import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { X, RefreshCw, Info } from 'lucide-react';
import changelog from '../changelog.json';

export function UpdateNotification() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log(`SW Registered: ${r}`);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [showChangelog, setShowChangelog] = useState(false);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 z-[100] animate-in slide-in-from-bottom-10 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <RefreshCw size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900">Có bản cập nhật mới!</h4>
          <p className="text-sm text-slate-500 mt-1">Ứng dụng đã có phiên bản mới. Bạn có muốn cập nhật ngay?</p>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => setShowChangelog(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Info size={14} /> Xem thay đổi
            </button>
            <button 
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Cập nhật ngay
            </button>
          </div>
        </div>
        <button onClick={close} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>

      {showChangelog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Có gì mới?</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              {changelog.map((entry, index) => (
                <li key={index}>
                  <strong className="text-indigo-600">v{entry.version}:</strong>
                  <ul className="list-disc list-inside mt-1 ml-2">
                    {entry.changes.map((change, cIndex) => (
                      <li key={cIndex}>{change}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => setShowChangelog(false)}
              className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
