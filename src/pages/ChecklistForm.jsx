import { useState, useCallback, useEffect } from 'react';
import {
  CHECKLIST_ITEMS,
  getTodayDateString,
  formatDateThai,
  getThaiDayOfWeek,
} from '../data/constants';
import { submitChecklist, isConfigured, getRecords } from '../data/api';
import Avatar from '../components/Avatar';

export default function ChecklistForm({ masterData }) {
  const todayStr = getTodayDateString();
  const dayIndex = new Date(todayStr).getDay();

  const todaySchedule = masterData?.schedules?.find(s => s.dayIndex === dayIndex);
  const todayInspectorsRaw = todaySchedule ? todaySchedule.inspectors : [];

  const groupedInspectorsObj = todayInspectorsRaw.reduce((acc, curr) => {
    const insp = masterData.inspectors.find(i => i.name === curr.name);
    if (!acc[curr.name]) {
      acc[curr.name] = {
        name: curr.name,
        image: insp?.image_url,
        default_building: insp?.default_building,
        buildingIds: [curr.buildingId],
        buildingNames: [curr.buildingName]
      };
    } else {
      if (!acc[curr.name].buildingIds.includes(curr.buildingId)) {
        acc[curr.name].buildingIds.push(curr.buildingId);
        acc[curr.name].buildingNames.push(curr.buildingName);
      }
    }
    return acc;
  }, {});
  const todayInspectors = Object.values(groupedInspectorsObj);

  const ALL_INSPECTORS = masterData?.inspectors || [];

  // Step state
  const [selectedInspector, setSelectedInspector] = useState(null);
  const [isSubstituting, setIsSubstituting] = useState(false);
  const [substituteBuildingId, setSubstituteBuildingId] = useState(null);
  const [checkStates, setCheckStates] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [savedRooms, setSavedRooms] = useState({});
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Get assignment for selected inspector
  const assignmentInfo = todayInspectors.find(i => i.name === selectedInspector);
  
  let assignment = null;
  if (assignmentInfo) {
    assignment = {
      inspectorName: assignmentInfo.name,
      buildings: assignmentInfo.buildingIds
        .map(id => masterData.buildings.find(b => b.id === id))
        .filter(b => b && b.is_active !== false)
    };
  } else if (selectedInspector && isSubstituting && substituteBuildingId) {
    // Substitution mode
    const building = masterData.buildings.find(b => b.id === substituteBuildingId);
    assignment = {
      inspectorName: selectedInspector,
      buildings: building ? [building] : []
    };
  }

  // Fetch existing records when inspector is selected
  useEffect(() => {
    if (!assignment || assignment.buildings.length === 0) return;

    async function loadExisting() {
      setLoadingExisting(true);
      try {
        const res = await getRecords(todayStr);
        if (res.success && res.records.length > 0) {
          const newCheckStates = {};
          const newSavedRooms = {};

          assignment.buildings.forEach(building => {
            building.rooms.forEach((room) => {
              const record = res.records.find(
                (r) => r.date === todayStr && r.building === building.name && r.room === room.name
              );
              if (record) {
                newCheckStates[room.id] = {
                  lights: record.lights,
                  computer: record.computer,
                  aircon: record.aircon,
                  fan: record.fan,
                };
                newSavedRooms[room.id] = true;
              }
            });
          });

          setCheckStates(newCheckStates);
          setSavedRooms(newSavedRooms);
        }
      } catch (e) {
        console.error('Load existing records error:', e);
      } finally {
        setLoadingExisting(false);
      }
    }

    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInspector, substituteBuildingId, todayStr]);

  const getRoomChecks = useCallback(
    (roomId) => {
      if (checkStates[roomId]) return checkStates[roomId];
      const defaults = {};
      CHECKLIST_ITEMS.forEach((item) => {
        defaults[item.id] = false;
      });
      return defaults;
    },
    [checkStates]
  );

  const handleToggle = (roomId, checkId) => {
    setCheckStates((prev) => {
      const roomChecks = getRoomChecks(roomId);
      return {
        ...prev,
        [roomId]: {
          ...roomChecks,
          [checkId]: !roomChecks[checkId],
        },
      };
    });
  };

  const handleSelectOtherInspector = (name) => {
    const confirmSub = window.confirm(`คุณ "${name}" ไม่ได้มีเวรวันนี้ ต้องการตรวจแทน (เปลี่ยนเวร) ใช่หรือไม่?`);
    if (confirmSub) {
      setSelectedInspector(name);
      setIsSubstituting(true);
    }
  };

  const handleSelectSubstituteBuilding = (buildingId) => {
    setSubstituteBuildingId(buildingId);
  };

  const handleSubmitRoom = async (room, building) => {
    if (!assignment) return;

    // Seamless update without window.confirm to prevent browser blocking

    setSubmitting(true);

    const checks = getRoomChecks(room.id);
    const data = {
      date: todayStr,
      dayName: getThaiDayOfWeek(todayStr),
      inspector: selectedInspector,
      buildingId: building.id,
      buildingName: building.name,
      items: [
        {
          roomId: room.id,
          roomName: room.name,
          lights: checks.lights || false,
          computer: checks.computer || false,
          aircon: checks.aircon || false,
          fan: checks.fan || false,
        },
      ],
    };

    try {
      setSubmitError(null);
      await submitChecklist(data);
      setSavedRooms((prev) => ({ ...prev, [room.id]: true }));
      setSubmitResult({ roomId: room.id, success: true });
      setTimeout(() => setSubmitResult(null), 2500);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitResult({ roomId: room.id, success: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAll = async () => {
    if (!assignment) return;


    // Find rooms that have at least one toggle checked
    const roomsToAutoSave = [];
    assignment.buildings.forEach(b => {
      b.rooms.forEach(r => {
        // Only consider rooms that haven't been saved yet OR have at least one toggle checked
        // This allows re-saving rooms that were previously saved but now have changes
        const checks = getRoomChecks(r.id);
        const hasAnySet = CHECKLIST_ITEMS.some(item => checks[item.id]);

        // If the room is not saved, and has any checks, add it
        // OR if the room is already saved, but has any checks, add it (to allow updates)
        if (!savedRooms[r.id] && hasAnySet) {
          roomsToAutoSave.push({ room: r, building: b });
        } else if (savedRooms[r.id] && hasAnySet) {
          // If already saved, but has checks, we'll include it for potential update
          roomsToAutoSave.push({ room: r, building: b });
        }
      });
    });

    if (roomsToAutoSave.length === 0) {
      return alert('ไม่มีห้องที่ถูกติ๊กตรวจสอบเพิ่มครับ (ข้ามห้องที่ไม่ได้กดสวิตช์อะไรเลย)');
    }

    const confirmSave = window.confirm(`ยืนยันบันทึกข้อมูล ${roomsToAutoSave.length} ห้อง ที่มีการติ๊กตรวจแล้วใช่หรือไม่?\n(ห้องที่ไม่ได้กดอะไรเลยจะถูกข้ามไว้ก่อน)`);
    if (!confirmSave) return;

    setSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const { room, building } of roomsToAutoSave) {
      const checks = getRoomChecks(room.id);
      const data = {
        date: todayStr,
        dayName: getThaiDayOfWeek(todayStr),
        inspector: selectedInspector,
        buildingId: building.id,
        buildingName: building.name,
        items: [
          {
            roomId: room.id,
            roomName: room.name,
            lights: checks.lights || false,
            computer: checks.computer || false,
            aircon: checks.aircon || false,
            fan: checks.fan || false,
          },
        ],
      };

      try {
        await submitChecklist(data);
        setSavedRooms((prev) => ({ ...prev, [room.id]: true }));
        successCount++;
      } catch (err) {
        console.error('Save all record error:', err);
        errorCount++;
      }
    }

    setSubmitting(false);
    if (successCount > 0) {
      alert(`บันทึกสำเร็จ ${successCount} ห้อง` + (errorCount > 0 ? ` (ไม่สำเร็จ ${errorCount} ห้อง)` : ''));
    } else if (errorCount > 0) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่');
    }
  };

  const handleReset = () => {
    setSelectedInspector(null);
    setIsSubstituting(false);
    setSubstituteBuildingId(null);
    setCheckStates({});
    setSavedRooms({});
    setSubmitResult(null);
    setSubmitError(null);
  };

  // ===== WEEKEND =====
  const isWeekend = todayInspectors.length === 0;

  if (isWeekend) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">วันหยุดสุดสัปดาห์</h2>
          <p className="text-sm text-gray-500">ไม่มีตารางตรวจในวัน{getThaiDayOfWeek(todayStr)}</p>
          <div className="mt-4 bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">📅 {formatDateThai(todayStr)}</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 1.5: SELECT BUILDING (For Substitution) =====
  if (selectedInspector && isSubstituting && !substituteBuildingId) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <div className="bg-white rounded-4xl shadow-sm border border-gray-100 p-8 text-center mb-6">
          <div className="text-4xl mb-4">🏢</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">เลือกอาคารที่จะตรวจ</h2>
          <p className="text-sm text-gray-500 mb-6">คุณ "{selectedInspector}" กำลังมาตรวจแทนเวรวันนี้</p>
          
          <div className="grid grid-cols-1 gap-3">
            {masterData.buildings.filter(b => b.is_active !== false).map(building => (
              <button
                key={building.id}
                onClick={() => handleSelectSubstituteBuilding(building.id)}
                className="flex items-center justify-between p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🏢</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-800">{building.name}</div>
                    <div className="text-xs text-gray-500">{building.rooms.length} ห้อง</div>
                  </div>
                </div>
                <span className="text-blue-500 font-bold">เลือก →</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={handleReset}
            className="mt-8 text-sm text-gray-400 hover:text-red-500 underline"
          >
            ยกเลิกและย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  // ===== STEP 1: SELECT INSPECTOR =====
  if (!selectedInspector) {
    const todayNames = todayInspectors.map((i) => i.name);
    const otherInspectors = ALL_INSPECTORS.filter((i) => !todayNames.includes(i.name));

    return (
      <div className="max-w-lg mx-auto pb-24">
        {/* Logo and Header */}
        <div className="bg-white/90 backdrop-blur-md rounded-4xl shadow-sm border border-gray-100 p-8 mb-6 text-center transform hover:scale-[1.01] transition-transform duration-300">
          <img
            src="/pic/EN_Horizon_Color.png"
            alt="Logo"
            className="max-h-20 mx-auto mb-5 object-contain drop-shadow-sm"
          />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-700 to-indigo-600 mb-2">
            แบบตรวจเช็คประหยัดพลังงาน
          </h1>
          <p className="text-sm text-gray-500 font-medium mb-5">Carbon One Committee</p>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-2xl text-sm font-semibold border border-blue-100 shadow-inner">
            <span>📅 {getThaiDayOfWeek(todayStr)} {formatDateThai(todayStr)}</span>
          </div>
        </div>

        {/* Character Cards */}
        <div className="bg-white rounded-4xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="text-xl">👤</span> เลือกชื่อของคุณ
            </h2>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
              เวรวันนี้: {todayInspectors.length} คน
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Today's Inspectors (Active) */}
            {todayInspectors.map((inspector) => (
              <button
                key={inspector.name}
                onClick={() => setSelectedInspector(inspector.name)}
                className="relative flex flex-col items-center p-4 rounded-3xl border-[2.5px] border-transparent bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-blue-500 hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.2)] hover:-translate-y-1 transition-all duration-300 active:scale-95 group overflow-hidden"
              >
                {/* Background glow */}
                <div className="absolute inset-0 bg-linear-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Badge */}
                <div className="absolute top-3 right-3 bg-linear-to-r from-green-400 to-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10 animate-pulse">
                  วันนี้
                </div>

                {/* Avatar */}
                <div className="relative w-20 h-20 rounded-full mb-3 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.15)] overflow-hidden bg-gray-50 border-[3px] border-white group-hover:border-blue-100 transition-colors z-10 shrink-0">
                  {inspector.image ? (
                    <Avatar src={inspector.image} alt={inspector.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110 smooth-image" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-500 bg-blue-50">
                      {inspector.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="relative z-10 text-center w-full">
                  <div className="font-bold text-gray-800 text-sm mb-1.5 truncate group-hover:text-blue-700 transition-colors">{inspector.name}</div>
                  <div className="text-[10px] font-semibold text-indigo-600 bg-indigo-50/80 backdrop-blur-sm px-2.5 py-1 rounded-xl inline-block truncate max-w-full border border-indigo-100/50">
                    🏢 {inspector.buildingNames.join(', ')}
                  </div>
                </div>
              </button>
            ))}

            {/* Other Inspectors (Now Clickable for substitution) */}
            {otherInspectors.map((inspector) => (
              <button
                key={inspector.name}
                onClick={() => handleSelectOtherInspector(inspector.name)}
                className="flex flex-col items-center p-4 rounded-3xl border border-gray-100 bg-gray-50/30 grayscale hover:grayscale-0 hover:border-yellow-400 hover:bg-yellow-50/50 transition-all duration-300 active:scale-95"
              >
                <div className="w-16 h-16 rounded-full mb-3 shadow-inner overflow-hidden border-2 border-white bg-gray-100 shrink-0">
                  {inspector.image_url ? (
                    <Avatar src={inspector.image_url} alt={inspector.name} className="w-full h-full object-cover object-top smooth-image" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400 bg-gray-100">
                      {inspector.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-center w-full">
                  <div className="font-semibold text-gray-500 text-xs truncate mb-1">{inspector.name}</div>
                  <div className="text-[9px] font-medium text-gray-400 bg-gray-200/50 px-2 py-0.5 rounded-lg inline-block truncate max-w-[90%]">
                    {inspector.default_building || 'ไม่ระบุอาคาร'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
            <p className="text-[11px] text-yellow-700 leading-relaxed">
              💡 <strong>การเปลี่ยนเวร:</strong> หากวันนี้คนที่มีเวรไม่สะดวก สามารถคลิกที่ชื่อท่านอื่น (สีเทา) เพื่อกดมา "ตรวจแทน" ได้เลยครับ
            </p>
          </div>

          {/* Empty State when no inspectors exist */}
          {ALL_INSPECTORS.length === 0 && (
            <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 mt-4">
              <div className="text-4xl mb-3">📭</div>
              <h3 className="text-gray-700 font-bold mb-1">ยังไม่มีข้อมูลผู้ตรวจ</h3>
              <p className="text-sm text-gray-500">กรุณาไปที่เมนู ⚙️ Admin เพื่อเพิ่มรายชื่อผู้ตรวจและกะประเมิน</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== STEP 2: CHECKLIST FORM FOR ASSIGNED BUILDING =====
  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Config Warning */}
      {!isConfigured() && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-xs text-red-700">
            ⚠️ <strong>ยังไม่ได้ตั้งค่า Google Sheet!</strong> กรุณาใส่ URL ใน <code>src/data/api.js</code>
          </p>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-xs text-red-700">❌ {submitError}</p>
        </div>
      )}

      {/* Loading Existing */}
      {loadingExisting && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-4 animate-pulse">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-blue-200 rounded-full"></div>
             <div className="h-4 bg-gray-200 rounded-lg w-1/2"></div>
          </div>
          <div className="mt-3 space-y-2">
             <div className="h-3 bg-gray-200 rounded-md w-full"></div>
             <div className="h-3 bg-gray-200 rounded-md w-4/5"></div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">📋 แบบตรวจเช็ค</h1>
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            ← เปลี่ยนผู้ตรวจ
          </button>
        </div>

        {/* Date (read-only) */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium text-gray-500 w-14">วันที่:</span>
          <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600 font-medium">
            📅 {getThaiDayOfWeek(todayStr)} {formatDateThai(todayStr)}
          </div>
        </div>

        {/* Inspector & Building */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium text-gray-500 w-14">ผู้ตรวจ:</span>
          <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            👤 {selectedInspector}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 w-14">อาคาร:</span>
          <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            🏢 {assignment.buildings.map(b => b.name).join(', ')}
          </span>
        </div>
      </div>

      {/* Buildings & Room Cards */}
      {assignment.buildings.map((building) => {
        const activeRooms = building.rooms.filter(r => r.is_active !== false);
        if (activeRooms.length === 0) return null; // Don't show building if all rooms are inactive
        
        return (
          <div key={building.id} className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 ml-2 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg text-sm">🏢</span> {building.name}
            </h2>
            {activeRooms.map((room) => {
              const checks = getRoomChecks(room.id);
              const allChecked = CHECKLIST_ITEMS.every((item) => checks[item.id]);
              const isSaved = savedRooms[room.id];
              const roomScore = CHECKLIST_ITEMS.filter((item) => checks[item.id]).length;

              return (
                <div
                  key={room.id}
                  className={`bg-white rounded-2xl shadow-sm border mb-3 overflow-hidden transition-all duration-300 ${isSaved ? 'border-green-300' : 'border-gray-200'
                    }`}
                >
                  {/* Room Header */}
                  <div
                    className={`px-4 py-3 flex items-center justify-between ${allChecked ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${allChecked ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="font-semibold text-sm text-gray-800">🚪 {room.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roomScore === 4 ? 'bg-green-100 text-green-700' : roomScore > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                        ⭐ {roomScore}/4 คะแนน
                      </span>
                      {isSaved && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          ✅ บันทึกแล้ว
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="p-4 space-y-3">
                    {CHECKLIST_ITEMS.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-sm text-gray-700">{item.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${checks[item.id] ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                            {checks[item.id] ? '+1' : '0'}
                          </span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={checks[item.id] || false}
                            onChange={() => handleToggle(room.id, item.id)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleSubmitRoom(room, building)}
                      disabled={submitting}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${submitResult?.roomId === room.id && submitResult?.success
                        ? 'bg-green-500 text-white'
                        : submitting
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-sm'
                        }`}
                    >
                      {submitResult?.roomId === room.id && submitResult?.success
                        ? '✅ บันทึกสำเร็จ!'
                        : submitting
                          ? '⏳ กำลังบันทึก...'
                          : isSaved
                            ? '🔄 อัปเดต'
                            : '💾 บันทึก'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Save All Floating Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 pointer-events-none z-40 flex justify-center">
        <button
          onClick={handleSaveAll}
          disabled={submitting}
          className={`pointer-events-auto shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-w-lg w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 ${submitting
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:shadow-[0_8px_30px_rgba(59,130,246,0.3)] hover:-translate-y-1'
            }`}
        >
          {submitting ? (
            <>
              <span className="animate-spin text-xl">⏳</span>
              กำลังบันทึกทั้งหมด...
            </>
          ) : (
            <>
              <span className="text-xl">💾</span>
              บันทึกห้องที่ยังไม่เซฟทั้งหมด
            </>
          )}
        </button>
      </div>
    </div>
  );
}
