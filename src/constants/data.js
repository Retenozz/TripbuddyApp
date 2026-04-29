export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

export const fmtDateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

export const nightsBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
};

export const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// Generate calendar days for a month
export const getCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};

export const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];

export const THAI_DAYS_SHORT = ['อา','จ','อ','พ','พฤ','ศ','ส'];

export const SAMPLE_TRIPS = [
  {
    id: 't1',
    emoji: '🏔️',
    name: 'เชียงใหม่ 2025',
    startDate: '2025-12-12',
    endDate: '2025-12-15',
    budget: 'mid',
    description: 'ดอยสุเทพ ม่อนแจ่ม ไนท์บาซาร์',
    inviteCode: 'CM2025X',
    coverPhoto: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    members: [
      { name: 'ต้น',  color: '#7C3AED' },
      { name: 'มิ้ว', color: '#EC4899' },
      { name: 'เจม',  color: '#F59E0B' },
      { name: 'เบล',  color: '#10B981' },
    ],
    itinerary: [
      {
        day: 1, dayName: 'เดินทาง', date: '2025-12-12', items: [
          { time: '06:00', title: 'เช็คอิน สุวรรณภูมิ', desc: 'Terminal 2 · ประตู D', cat: '✈️ เดินทาง' },
          { time: '09:30', title: 'ถึงเชียงใหม่ + Check-in', desc: 'Le Meridien · เมือง', cat: '🏨 ที่พัก' },
          { time: '19:00', title: 'ไนท์บาซาร์', desc: 'ช้อปปิ้ง + กินข้าวเย็น', cat: '🛍️ ช้อปปิ้ง' },
        ],
      },
      {
        day: 2, dayName: 'วัด & วัฒนธรรม', date: '2025-12-13', items: [
          { time: '07:00', title: 'วัดพระธาตุดอยสุเทพ', desc: 'ชมวิวเมือง · ตักบาตร', cat: '⛩️ วัด' },
          { time: '12:00', title: 'ข้าวซอย ลำดวน', desc: 'ร้านดัง · ใกล้เมือง', cat: '🍜 อาหาร' },
          { time: '15:00', title: 'ม่อนแจ่ม', desc: 'ชมดอกไม้บาน ถ่ายรูป', cat: '🌸 ธรรมชาติ' },
        ],
      },
    ],
    expenses: [
      { icon: '✈️', name: 'ตั๋วบิน (ไปกลับ)', by: 'ต้น',  amount: 8400, split: 4, cat: 'transport' },
      { icon: '🏨', name: 'โรงแรม 3 คืน',    by: 'มิ้ว', amount: 7200, split: 4, cat: 'hotel' },
      { icon: '🚗', name: 'รถเช่า',           by: 'เจม',  amount: 2800, split: 4, cat: 'transport' },
      { icon: '🍜', name: 'ข้าวซอย + กาแฟ',  by: 'เบล',  amount: 720,  split: 3, cat: 'food' },
    ],
    votes: [
      { place: 'ดอยอินทนนท์',  type: '🌿 ธรรมชาติ', desc: 'ยอดเขาสูงสุดในไทย วิวสวยมาก', votes: { 0: true, 1: true, 2: true, 3: false }, myVote: 'yes' },
      { place: 'ม่อนแจ่ม',     type: '🌸 ดอกไม้',   desc: 'นางพญาเสือโคร่งบาน ช่วงปลายปี', votes: { 0: true, 1: false, 2: null, 3: true }, myVote: null },
      { place: 'กาดหลวง',      type: '🛒 ตลาด',     desc: 'ตลาดเช้าเมืองเชียงใหม่', votes: { 0: false, 1: true, 2: null, 3: null }, myVote: null },
    ],
    messages: [
      { sys: 'ต้น สร้างทริป 🎉' },
      { from: 1, text: 'เย้ๆ ตื่นเต้นมาก!', time: '10:23' },
      { from: 0, text: 'จองโรงแรมไว้แล้ว Le Meridien 🏨', time: '10:24' },
      { from: 2, text: 'โหวตสถานที่ด้วยนะ อยากไปดอยอินทนนท์ 🏔️', time: '10:25' },
      { from: 3, text: 'ม่อนแจ่มก็น่าไปนะ ดอกไม้บานแน่ 🌸', time: '10:26' },
    ],
    places: [
      { id: 'p1', name: 'ดอยสุเทพ', lat: 18.8048, lng: 98.9217, type: '⛩️', note: 'วัดสวย วิวดี' },
      { id: 'p2', name: 'ไนท์บาซาร์', lat: 18.7883, lng: 98.9964, type: '🛍️', note: 'ช้อปปิ้ง' },
      { id: 'p3', name: 'Le Meridien', lat: 18.7922, lng: 98.9930, type: '🏨', note: 'ที่พัก' },
    ],
  },
  {
    id: 't2',
    emoji: '🏖️',
    name: 'ภูเก็ต Summer',
    startDate: '2026-04-10',
    endDate: '2026-04-14',
    budget: 'comfy',
    description: 'บีช ดำน้ำ ซันเซ็ท',
    inviteCode: 'PHK2026',
    coverPhoto: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    members: [
      { name: 'ต้น',  color: '#7C3AED' },
      { name: 'แนน',  color: '#F472B6' },
    ],
    itinerary: [],
    expenses: [
      { icon: '✈️', name: 'ตั๋วบิน', by: 'ต้น', amount: 5600, split: 2, cat: 'transport' },
      { icon: '🏨', name: 'รีสอร์ท 4 คืน', by: 'แนน', amount: 12000, split: 2, cat: 'hotel' },
    ],
    votes: [],
    messages: [{ sys: 'ต้น สร้างทริป 🎉' }],
    places: [],
  },
];
