import { useState, useEffect, useMemo } from 'react';
import {
  CHECKLIST_ITEMS,
  CAMPAIGN_DATES,
  getTodayDateString,
  formatDateThai,
  getThaiDayOfWeek,
} from '../data/constants';
import { getAllData } from '../data/api';

export default function Dashboard({ masterData }) {
  const BUILDINGS = masterData?.buildings || [];
  const INSPECTION_SCHEDULE = masterData?.schedules || [];
  const [viewDate, setViewDate] = useState(getTodayDateString());
  const viewDayIndex = new Date(viewDate).getDay();

  const [activeSection, setActiveSection] = useState('today');
  const [todayStatusData, setTodayStatusData] = useState({});
  const [scoresData, setScoresData] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');

  // Fetch all data (Optimized: Single API call)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getAllData(viewDate);
        if (result.success) {
          setTodayStatusData(result.status || {});
          setScoresData(result.scores || []);
          setAllRecords(result.records || []);
        }
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [viewDate]);

  // Stats
  const totalRooms = BUILDINGS.reduce((sum, b) => {
    if (b.is_active === false) return sum;
    const activeRoomsCount = b.rooms.filter(r => r.is_active !== false).length;
    return sum + activeRoomsCount;
  }, 0);
  const checkedEntries = Object.values(todayStatusData);
  const checkedRooms = checkedEntries.filter((s) => s.allPassed).length;
  const partialRooms = checkedEntries.filter((s) => !s.allPassed).length;
  const uncheckedRooms = totalRooms - checkedRooms - partialRooms;
  const checkedCount = checkedRooms + partialRooms;
  const completionPercent = totalRooms > 0 ? Math.round((checkedCount / totalRooms) * 100) : 0;

  // Calculate CO2 and Energy Savings for all checked items
  const savings = checkedEntries.reduce((acc, s) => {
    let energy = 0;
    let co2 = 0;
    if (s.lights === true) { energy += 0.1; co2 += 0.05; }
    if (s.computer === true) { energy += 0.2; co2 += 0.1; }
    if (s.aircon === true) { energy += 1.5; co2 += 0.8; }
    if (s.fan === true) { energy += 0.1; co2 += 0.05; }
    return { energy: acc.energy + energy, co2: acc.co2 + co2 };
  }, { energy: 0, co2: 0 });

  const co2Saved = savings.co2.toFixed(1);
  const energySaved = savings.energy.toFixed(1);
  const todayTotalScore = checkedEntries.reduce((sum, s) => sum + (s.score || 0), 0);

  // Filtered records for sheet view
  const filteredRecords = useMemo(() => {
    let result = [...allRecords];
    if (filterDate) result = result.filter((r) => r.date === filterDate);
    if (filterBuilding) result = result.filter((r) => r.building === filterBuilding);
    return result.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.building.localeCompare(b.building);
    });
  }, [allRecords, filterDate, filterBuilding]);

  // Total scores
  const totalScore = scoresData.reduce((sum, s) => sum + (Number(s.totalScore) || 0), 0);

  const SECTIONS = [
    { id: 'today', label: 'วันนี้', icon: '📊' },
    { id: 'schedule', label: 'ตารางเวร', icon: '📅' },
    { id: 'scores', label: 'คะแนน', icon: '🏆' },
    { id: 'sheet', label: 'ตาราง', icon: '📃' },
  ];

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert('ไม่มีข้อมูลให้ Export');
    const headers = ['วันที่', 'ผู้ตรวจ', 'อาคาร', 'ห้อง', ...CHECKLIST_ITEMS.map(i => i.label), 'สถานะ', 'คะแนน', 'ประหยัดไฟ (kWh)', 'ลด CO2 (kg)', 'เวลาบันทึก'];
    const rows = filteredRecords.map(r => {
      let energy = 0;
      let co2 = 0;
      if (r.lights === true) { energy += 0.1; co2 += 0.05; }
      if (r.computer === true) { energy += 0.2; co2 += 0.1; }
      if (r.aircon === true) { energy += 1.5; co2 += 0.8; }
      if (r.fan === true) { energy += 0.1; co2 += 0.05; }

      return [
        r.date, // YYYY-MM-DD
        r.inspector,
        r.building,
        r.room,
        ...CHECKLIST_ITEMS.map(i => r[i.id] ? 'ผ่าน' : 'ไม่ผ่าน'),
        r.status,
        r.score,
        energy.toFixed(1),
        co2.toFixed(2),
        new Date(r.timestamp).toLocaleString('th-TH')
      ];
    });

    // Add BOM for Excel UTF-8 and create Blob
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `energy_saving_report_${filterDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">📊 Dashboard</h1>
          <p className="text-sm text-gray-500">
            สรุปผลแคมเปญประหยัดพลังงาน | {getThaiDayOfWeek(viewDate)} {formatDateThai(viewDate)}
          </p>
        </div>

        {/* Master Date Selector */}
        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 shadow-inner">
          <span className="text-sm text-blue-700 font-bold">📅 เลือกวันดูผล:</span>
          <input
            type="date"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
            className="bg-white border border-blue-200 text-blue-800 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-400 font-medium cursor-pointer shadow-sm"
          />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${activeSection === sec.id
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            <span>{sec.icon}</span> {sec.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-gray-200 animate-pulse h-24 rounded-2xl"></div>)}
          </div>
          <div className="bg-gray-200 animate-pulse h-32 rounded-2xl w-full"></div>
          <div className="bg-gray-200 animate-pulse h-64 rounded-2xl w-full"></div>
        </div>
      ) : (
        <>
          {/* ===== TODAY STATUS ===== */}
          {activeSection === 'today' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{checkedRooms}</div>
                  <div className="text-[10px] text-gray-500 mt-1">✅ ผ่าน</div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-500">{partialRooms}</div>
                  <div className="text-[10px] text-gray-500 mt-1">⚠️ ไม่ครบ</div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400">{uncheckedRooms}</div>
                  <div className="text-[10px] text-gray-500 mt-1">⬜ ยังไม่ตรวจ</div>
                </div>
              </div>

              {/* Progress Bar + CO2 Saved */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span className="text-lg">🌿</span> ความสำเร็จวันนี้
                  </div>
                  <span className="text-sm font-bold text-orange-500">{completionPercent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-4 relative z-10">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${completionPercent}%`,
                      background: 'linear-gradient(90deg, #34d399, #10b981)',
                    }}
                  />
                </div>
                
                {/* Eco Savings Sub Box */}
                <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between border border-green-100 relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🌱</span>
                        <div>
                            <div className="text-xs text-green-700 font-bold mb-0.5">CO₂ ที่ลดได้วันนี้ <span className="font-normal">(ช่วงพักเที่ยง)</span></div>
                            <div className="text-sm font-bold text-green-900">{co2Saved} <span className="text-xs font-normal">kg CO₂eq</span></div>
                        </div>
                    </div>
                </div>
              </div>

              {/* Advanced Eco Dashboard (Dark Green Box) */}
              <div className="bg-linear-to-br from-green-700 to-emerald-900 rounded-2xl p-5 mb-4 shadow-lg text-white grid grid-cols-3 gap-2 text-center border border-green-800">
                  <div className="bg-black/10 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                      <div className="text-xs text-green-200 mb-1">CO₂ ลดได้วันนี้</div>
                      <div className="text-xl font-bold flex items-baseline gap-1">
                          {co2Saved} <span className="text-xs font-normal opacity-80">kg</span>
                      </div>
                  </div>
                  <div className="bg-black/10 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                      <div className="text-xs text-green-200 mb-1">ประหยัดไฟ</div>
                      <div className="text-xl font-bold flex items-baseline gap-1">
                          {energySaved} <span className="text-xs font-normal opacity-80">kWh</span>
                      </div>
                  </div>
                  <div className="bg-black/10 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                      <div className="text-xs text-green-200 mb-1">คะแนนรวม</div>
                      <div className="text-xl font-bold flex items-baseline gap-1">
                          {todayTotalScore} <span className="text-xs font-normal opacity-80">pt</span>
                      </div>
                  </div>
              </div>

              {BUILDINGS.map((building) => {
                // Filter active rooms or rooms that have records today
                const visibleRooms = building.rooms.filter(room => {
                  const key = `${building.name}|${room.name}`;
                  const hasRecordToday = !!todayStatusData[key];
                  
                  // If building is inactive and it doesn't have a record today, don't show its rooms
                  if (building.is_active === false && !hasRecordToday) return false;
                  
                  return room.is_active !== false || hasRecordToday;
                });

                if (visibleRooms.length === 0) return null;

                return (
                  <div
                    key={building.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-3 overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-gray-800">
                        🏢 {building.name}
                        {building.is_active === false && <span className="text-[10px] text-red-500 ml-2 bg-red-100 px-2 py-0.5 rounded-full font-bold">ปิดใช้งาน</span>}
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {visibleRooms.map((room) => {
                        const key = `${building.name}|${room.name}`;
                        const record = todayStatusData[key];
                        const status = record ? (record.allPassed ? 'pass' : 'partial') : 'none';

                        return (
                          <div key={room.id} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${status === 'pass'
                                  ? 'bg-green-500'
                                  : status === 'partial'
                                    ? 'bg-yellow-400'
                                    : 'bg-gray-200'
                                  }`}
                              />
                              <span className="text-sm text-gray-700">
                                {room.name} {room.is_active === false && <span className="text-[10px] text-red-500 ml-1">(ปิด)</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {record ? (
                                <>
                                  {CHECKLIST_ITEMS.map((item) => (
                                    <span
                                      key={item.id}
                                      title={item.label}
                                      className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center ${record[item.id]
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-red-100 text-red-500'
                                        }`}
                                    >
                                      {item.icon}
                                    </span>
                                  ))}
                                  <span className="text-[10px] ml-1 text-gray-400">
                                    {record.inspector}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-gray-300">ยังไม่ตรวจ</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ===== SCHEDULE ===== */}
          {activeSection === 'schedule' && (
            <>
              {/* Campaign Info */}
              <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 mb-4">
                <h2 className="text-base font-bold text-blue-800 mb-3">🏆 แคมเปญประหยัดพลังงาน</h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">📌</span>
                    <div>
                      <span className="font-medium text-gray-700">เริ่มตรวจเวร:</span>{' '}
                      <span className="text-gray-600">{formatDateThai(CAMPAIGN_DATES.inspectionStart)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">🚀</span>
                    <div>
                      <span className="font-medium text-gray-700">เริ่มแคมเปญ:</span>{' '}
                      <span className="text-gray-600">{formatDateThai(CAMPAIGN_DATES.campaignStart)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">🎉</span>
                    <div>
                      <span className="font-medium text-gray-700">ประกาศผล:</span>{' '}
                      <span className="text-gray-600">{formatDateThai(CAMPAIGN_DATES.yearEnd)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-white/70 rounded-xl p-3 border border-blue-100">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    💡 <strong>คะแนนสะสม</strong> — แต่ละรายการ = 1 คะแนน (ปิดไฟ / ปิดคอม / ปิดแอร์ / ปิดพัดลม)
                    สูงสุด 4 คะแนน/ห้อง/วัน ประกาศผลวันสิ้นปี 2569
                  </p>
                </div>
              </div>

              {/* Duty Schedule */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-800">👤 ตารางเวรตรวจ</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">วัน</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">อาคาร 1</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">อาคาร 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INSPECTION_SCHEDULE.map((s) => {
                        const isToday = s.dayIndex === viewDayIndex;
                        const b1 = s.inspectors.find((i) => i.buildingId === 'building-1');
                        const b3 = s.inspectors.find((i) => i.buildingId === 'building-3');
                        return (
                          <tr
                            key={s.dayIndex}
                            className={`border-b border-gray-50 ${isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isToday && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                )}
                                <span className={`font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                  {s.day}
                                </span>
                              </div>
                            </td>
                            <td className={`px-4 py-3 ${isToday ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                              {b1?.name || '-'}
                            </td>
                            <td className={`px-4 py-3 ${isToday ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                              {b3?.name || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== SCORES ===== */}
          {activeSection === 'scores' && (
            <>
              {/* Total Score */}
              <div className="bg-linear-to-br from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200 p-5 mb-4 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <div className="text-3xl font-bold text-yellow-700">{totalScore}</div>
                <div className="text-xs text-yellow-600 mt-1">คะแนนรวมทั้งหมด</div>
              </div>

              {/* Score Ranking */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-800">🏅 อันดับคะแนนสะสม</h3>
                </div>
                {scoresData.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <p className="text-sm text-gray-400">ยังไม่มีข้อมูลคะแนน</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {scoresData.map((s, idx) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                      const passRate =
                        s.totalChecks > 0 ? Math.round((s.totalPassed / s.totalChecks) * 100) : 0;
                      return (
                        <div key={`${s.building}-${s.room}`} className="px-4 py-3 flex items-center gap-3">
                          <span className="text-lg w-8 text-center">{medal}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">
                              {s.building} — {s.room}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              ตรวจ {s.totalChecks} ครั้ง | ผ่าน {s.totalPassed} ครั้ง ({passRate}%)
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-600">{s.totalScore}</div>
                            <div className="text-[10px] text-gray-400">คะแนน</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===== SHEET VIEW ===== */}
          {activeSection === 'sheet' && (
            <>
              {/* Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 flex gap-2 min-w-[200px]">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
                    />
                    {filterDate && (
                      <button
                        onClick={() => setFilterDate('')}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-600 transition-colors"
                        title="แสดงทุกวัน"
                      >
                        ทุกวัน
                      </button>
                    )}
                  </div>
                  <select
                    value={filterBuilding}
                    onChange={(e) => setFilterBuilding(e.target.value)}
                    className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
                  >
                    <option value="">ทุกอาคาร</option>
                    {BUILDINGS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}{b.is_active === false ? ' (ปิดใช้งาน)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Export Button */}
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors active:scale-95"
                  >
                    <span>📥</span> Export CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          วันที่
                        </th>
                        <th className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          ผู้ตรวจ
                        </th>
                        <th className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          อาคาร
                        </th>
                        <th className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          ห้อง
                        </th>
                        {CHECKLIST_ITEMS.map((item) => (
                          <th
                            key={item.id}
                            className="text-center px-2 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap"
                          >
                            {item.icon}
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          สถานะ
                        </th>
                        <th className="text-center px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          คะแนน
                        </th>
                        <th className="text-center px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          ลด CO₂
                        </th>
                        <th className="text-center px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          ประหยัดไฟ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4 + CHECKLIST_ITEMS.length + 4}
                            className="text-center py-12 text-gray-400"
                          >
                            <div className="text-3xl mb-2">📭</div>
                            <div className="text-sm">ยังไม่มีข้อมูล</div>
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r, idx) => (
                          <tr
                            key={`${r.date}-${r.building}-${r.room}-${idx}`}
                            className={`border-b border-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                          >
                            <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-xs">
                              {r.day || getThaiDayOfWeek(r.date)}
                              <br />
                              <span className="text-gray-400">{formatDateThai(r.date)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs">{r.inspector}</td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs">{r.building}</td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs font-medium">{r.room}</td>
                            {CHECKLIST_ITEMS.map((item) => (
                              <td key={item.id} className="text-center px-2 py-2.5">
                                {r[item.id] ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-[10px]">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-500 text-[10px]">
                                    ✗
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="text-center px-3 py-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${r.status === 'ผ่านครบ'
                                  ? 'bg-green-100 text-green-700'
                                  : String(r.status).includes('ผ่าน')
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-600'
                                  }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="text-center px-3 py-2.5 font-bold text-yellow-600 text-xs">
                              {r.score}
                            </td>
                            {(() => {
                              let rowEnergy = 0;
                              let rowCO2 = 0;
                              if (r.lights === true) { rowEnergy += 0.1; rowCO2 += 0.05; }
                              if (r.computer === true) { rowEnergy += 0.2; rowCO2 += 0.1; }
                              if (r.aircon === true) { rowEnergy += 1.5; rowCO2 += 0.8; }
                              if (r.fan === true) { rowEnergy += 0.1; rowCO2 += 0.05; }

                              return (
                                <>
                                  <td className="text-center px-3 py-2.5 text-green-600 font-medium text-xs">
                                    {rowCO2 > 0 ? `${rowCO2.toFixed(2)} kg` : '-'}
                                  </td>
                                  <td className="text-center px-3 py-2.5 text-green-600 font-medium text-xs">
                                    {rowEnergy > 0 ? `${rowEnergy.toFixed(1)} kWh` : '-'}
                                  </td>
                                </>
                              );
                            })()}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredRecords.length > 0 && (
                  <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
                    แสดง {filteredRecords.length} รายการ | ผ่าน{' '}
                    {filteredRecords.filter((r) => r.status === 'ผ่าน').length} | ไม่ผ่าน{' '}
                    {filteredRecords.filter((r) => r.status !== 'ผ่าน').length}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
