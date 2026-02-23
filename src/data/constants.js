// constants.js

export const CAMPAIGN_DATES = {
  inspectionStart: '2026-02-23', // วันเริ่มตรวจ
  campaignStart: '2026-03-01',   // วันเริ่มแคมเปญ
  yearEnd: '2026-12-31',         // วันสิ้นปี-ประกาศผล
};

export const CHECKLIST_ITEMS = [
  { id: 'lights', label: 'ปิดไฟ(ช่วงพักเที่ยง)', icon: '💡' },
  { id: 'computer', label: 'ปิดคอม/หน้าจอ', icon: '💻' },
  { id: 'aircon', label: 'ปิดแอร์', icon: '❄️' },
  { id: 'fan', label: 'ปิดพัดลม', icon: '🌪️' },
];

// Helper Functions
export function getThaiDayOfWeek(dateStr) {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const d = new Date(dateStr);
  return days[d.getDay()];
}

export function formatDateThai(dateStr) {
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
