import { useState } from 'react';
import { addInspector, deleteInspector, updateInspector, addSchedule, deleteSchedule } from '../data/api';

export default function Admin({ masterData, onRefresh }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');

    const [activeTab, setActiveTab] = useState('inspectors');

    const [newInspectorName, setNewInspectorName] = useState('');
    const [newInspectorImage, setNewInspectorImage] = useState('/pic/user.jpg');
    const [newInspectorBuilding, setNewInspectorBuilding] = useState('อาคาร 1');

    const [editingInspector, setEditingInspector] = useState(null);
    const [editName, setEditName] = useState('');
    const [editImage, setEditImage] = useState('');
    const [editBuilding, setEditBuilding] = useState('');

    const [newScheduleDay, setNewScheduleDay] = useState(1);
    const [newScheduleInspector, setNewScheduleInspector] = useState('');
    const [newScheduleBuilding, setNewScheduleBuilding] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'admin1234') {
            setIsLoggedIn(true);
        } else {
            alert('รหัสผ่านไม่ถูกต้อง (ลอง admin1234)');
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2rem] shadow-sm border border-gray-100 text-center">
                <div className="text-4xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 mb-6">เข้าสู่ระบบ Admin</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="password"
                        placeholder="รหัสผ่าน"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors shadow-sm">เข้าสู่ระบบ</button>
                </form>
            </div>
        );
    }

    const handleAddInspector = async () => {
        if (!newInspectorName) return alert('กรอกชื่อด้วยครับ');
        await addInspector({
            name: newInspectorName,
            image_url: newInspectorImage,
            default_building: newInspectorBuilding
        });
        setNewInspectorName('');
        onRefresh();
    };

    const handleDeleteInspector = async (name) => {
        if (window.confirm(`ลบผู้ตรวจ ${name} แน่หรือไม่? กฎเวรที่เกี่ยวข้องจะถูกลบไปด้วยนะครับ!`)) {
            await deleteInspector(name);
            onRefresh();
        }
    };

    const openEditInspector = (ins) => {
        setEditingInspector(ins.name);
        setEditName(ins.name);
        setEditImage(ins.image_url || '');
        setEditBuilding(ins.default_building || 'อาคาร 1');
    };

    const handleUpdateInspector = async () => {
        if (!editName) return alert('กรอกชื่อด้วยครับ');
        await updateInspector(editingInspector, {
            name: editName,
            image_url: editImage,
            default_building: editBuilding
        });
        setEditingInspector(null);
        onRefresh();
    };

    const handleAddSchedule = async () => {
        if (!newScheduleInspector || !newScheduleBuilding) return alert('เลือกผู้ตรวจและอาคารให้ครบครับ');
        await addSchedule({
            day_index: Number(newScheduleDay),
            inspector_name: newScheduleInspector,
            building_id: newScheduleBuilding
        });
        onRefresh();
    };

    const handleDeleteSchedule = async (dayIndex, inspectorName) => {
        if (window.confirm('ลบตารางเวรนี้แน่หรือไม่?')) {
            await deleteSchedule(dayIndex, inspectorName);
            onRefresh();
        }
    };

    return (
        <div className="max-w-lg mx-auto pb-8 relative">
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 mb-6 text-center">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 mb-2">
                    ⚙️ ระบบจัดการข้อมูลหลังบ้าน
                </h1>
                <p className="text-sm text-gray-500">จัดการรายชื่อผู้ตรวจและตารางเวร</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                <button
                    onClick={() => setActiveTab('inspectors')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'inspectors' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    👤 ผู้ตรวจ
                </button>
                <button
                    onClick={() => setActiveTab('schedules')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'schedules' ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    📅 ตารางเวร
                </button>
            </div>

            {activeTab === 'inspectors' && (
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 space-y-6">
                    <h2 className="text-lg font-bold text-gray-800">เพิ่มผู้ตรวจใหม่</h2>
                    <div className="space-y-3">
                        <input type="text" placeholder="ชื่อผู้ตรวจ" value={newInspectorName} onChange={e => setNewInspectorName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
                        <input type="text" placeholder="URL รูปโปรไฟล์ (เช่น /pic/nam.jpg)" value={newInspectorImage} onChange={e => setNewInspectorImage(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
                        <select value={newInspectorBuilding} onChange={e => setNewInspectorBuilding(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                            {masterData.buildings.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                        <button onClick={handleAddInspector} className="w-full bg-purple-600 text-white font-bold py-2.5 rounded-xl hover:bg-purple-700 transition-colors">➕ เพิ่มผู้ตรวจ</button>
                    </div>

                    <hr className="border-gray-100" />
                    <h2 className="text-lg font-bold text-gray-800">รายชื่อผู้ตรวจปัจจุบัน</h2>
                    <div className="space-y-3">
                        {masterData.inspectors.map(ins => (
                            <div key={ins.name} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <img src={ins.image_url || '/pic/user.jpg'} className="w-10 h-10 rounded-full object-cover object-top border-2 border-white shadow-sm" />
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{ins.name}</div>
                                        <div className="text-xs text-gray-500">{ins.default_building}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEditInspector(ins)} className="text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100">แก้ไข</button>
                                    <button onClick={() => handleDeleteInspector(ins.name)} className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100">ลบ</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'schedules' && (
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 space-y-6">
                    <h2 className="text-lg font-bold text-gray-800">จัดการตารางเวร</h2>
                    <div className="space-y-3">
                        <select value={newScheduleDay} onChange={e => setNewScheduleDay(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                            <option value={1}>วันจันทร์</option>
                            <option value={2}>วันอังคาร</option>
                            <option value={3}>วันพุธ</option>
                            <option value={4}>วันพฤหัสบดี</option>
                            <option value={5}>วันศุกร์</option>
                        </select>
                        <select value={newScheduleInspector} onChange={e => setNewScheduleInspector(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                            <option value="">-- เลือกผู้ตรวจ --</option>
                            {masterData.inspectors.map(ins => (
                                <option key={ins.name} value={ins.name}>{ins.name}</option>
                            ))}
                        </select>
                        <select value={newScheduleBuilding} onChange={e => setNewScheduleBuilding(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                            <option value="">-- เลือกอาคาร --</option>
                            {masterData.buildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <button onClick={handleAddSchedule} className="w-full bg-pink-600 text-white font-bold py-2.5 rounded-xl hover:bg-pink-700 transition-colors">📅 เพิ่มเวร</button>
                    </div>

                    <hr className="border-gray-100" />
                    <h2 className="text-lg font-bold text-gray-800">ตารางเวรปัจจุบัน</h2>
                    <div className="space-y-4">
                        {masterData.schedules.map(day => (
                            <div key={day.dayIndex} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="font-bold text-sm text-pink-600 mb-3 border-b border-gray-200 pb-2">{day.day}</h3>
                                {day.inspectors.length === 0 ? (
                                    <div className="text-xs text-gray-400 italic">ไม่มีเวร</div>
                                ) : (
                                    <div className="space-y-2">
                                        {day.inspectors.map((ins, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <div className="text-gray-700"><span className="font-semibold">{ins.name}</span> <span className="text-gray-400 text-xs">({ins.buildingName})</span></div>
                                                <button onClick={() => handleDeleteSchedule(day.dayIndex, ins.name)} className="text-red-400 hover:text-red-600 text-xs">ลบ</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Inspector Popup */}
            {editingInspector && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl animate-fade-in-up">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">แก้ไขข้อมูล: {editingInspector}</h2>
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-600">ชื่อผู้ตรวจ</label>
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl" />

                            <label className="block text-sm font-medium text-gray-600 mt-2">URL รูปโปรไฟล์</label>
                            <input type="text" value={editImage} onChange={e => setEditImage(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl" />

                            <label className="block text-sm font-medium text-gray-600 mt-2">อาคารหลัก</label>
                            <select value={editBuilding} onChange={e => setEditBuilding(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                                {masterData.buildings.map(b => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                            </select>

                            <div className="flex gap-2 mt-6">
                                <button onClick={() => setEditingInspector(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-colors">ยกเลิก</button>
                                <button onClick={handleUpdateInspector} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-colors">บันทึก</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
