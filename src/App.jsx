import { useState, useEffect } from 'react';
import './index.css';
import ChecklistForm from './pages/ChecklistForm';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import { getMasterData } from './data/api';

const TABS = [
  { id: 'checklist', label: 'ฟอร์มตรวจ', icon: '📋' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'admin', label: 'Admin', icon: '⚙️' },
];

function App() {
  const [activeTab, setActiveTab] = useState('checklist');
  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMasterData() {
      const data = await getMasterData();
      setMasterData(data);
      setLoading(false);
    }
    loadMasterData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-thai">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h1 className="text-base font-bold text-gray-800 leading-tight">ประหยัดพลังงาน</h1>
            <p className="text-[10px] text-gray-400">Energy Saving Campaign 2569</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pt-4 pb-24">
        {loading ? (
          <div className="space-y-6 mt-4">
            <div className="bg-gray-200 animate-pulse h-48 rounded-4xl w-full"></div>
            <div className="bg-gray-200 animate-pulse h-12 rounded-2xl w-3/4 mx-auto"></div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-gray-200 animate-pulse h-40 rounded-4xl"></div>
              <div className="bg-gray-200 animate-pulse h-40 rounded-4xl"></div>
            </div>
          </div>
        ) : !masterData ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-500 font-bold">ไม่สามารถเชื่อมต่อฐานข้อมูลได้</p>
            <p className="text-sm text-gray-500 mt-2">โปรดตรวจสอบ URL และ Key ของ Supabase</p>
          </div>
        ) : activeTab === 'checklist' ? (
          <ChecklistForm masterData={masterData} onRefresh={() => getMasterData().then(setMasterData)} />
        ) : activeTab === 'dashboard' ? (
          <Dashboard key="dashboard" masterData={masterData} />
        ) : (
          <Admin masterData={masterData} onRefresh={() => getMasterData().then(setMasterData)} />
        )}
      </main>

      {/* Bottom Navigation — 2 tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-4xl mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3 transition-colors duration-200 relative ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span
                className={`text-[11px] mt-1 ${activeTab === tab.id ? 'font-semibold' : 'font-medium'
                  }`}
              >
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;
