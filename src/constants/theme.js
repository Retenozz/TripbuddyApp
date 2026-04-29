export const COLORS = {
  // Primary blue system for splash/login/home
  primary:   '#2B90D9',
  primary2:  '#56B8F1',
  secondary: '#F4C95F',
  secondary2:'#FFE08A',
  accent:    '#8FD5FF',

  // Gradient stops
  gradStart: '#2088D3',
  gradMid:   '#52B4ED',
  gradEnd:   '#8AD8FF',

  // Backgrounds
  bg:        '#EAF6FF',
  bgCard:    '#FFFFFF',
  bgInput:   '#F7FBFE',
  bgMuted:   '#DCEFFF',

  // Borders
  border:    '#CAE2F3',
  border2:   '#A2CAE3',

  // Text
  text:      '#17324B',
  textSub:   '#2B90D9',
  textMuted: '#7C95A8',
  textWhite: '#FFFFFF',

  // Status
  success:   '#79C545',
  warning:   '#F4B248',
  danger:    '#E55B5B',
  info:      '#49A9F5',

  // Tab colors
  teal:      '#46C7F6',

  // Dark card (for contrast sections)
  dark:      '#194A6E',
  dark2:     '#275E86',
};

export const MEMBER_COLORS = [
  '#7C3AED','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444',
];

export const TRIP_EMOJIS = [
  '🏖️','🏔️','🌴','🗼','🎌','🏝️','🌿','🎡','🛕','🧊','🌸','🌊','🏕️','🗺️','🌄','🎠',
];

export const BUDGET_OPTS = [
  { id:'budget', icon:'💰', label:'ประหยัด',  range:'< ฿5,000/คน' },
  { id:'mid',    icon:'💳', label:'ปานกลาง',  range:'฿5K–15K/คน' },
  { id:'comfy',  icon:'🛎️', label:'สบายๆ',    range:'฿15K–30K/คน' },
  { id:'luxury', icon:'💎', label:'หรูหรา',   range:'฿30K+/คน' },
];

export const STEPS       = ['emoji','info','dates','budget','invite','review'];
export const STEP_LABELS = ['ธีม','ชื่อ','วันที่','งบ','เชิญเพื่อน','ยืนยัน'];

export const CATEGORY_COLORS = {
  '✈️ เดินทาง':  '#7C3AED',
  '🏨 ที่พัก':   '#EC4899',
  '🛍️ ช้อปปิ้ง': '#F59E0B',
  '⛩️ วัด':      '#10B981',
  '🍜 อาหาร':    '#EF4444',
  '🎭 บันเทิง':  '#3B82F6',
};
