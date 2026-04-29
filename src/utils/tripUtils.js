import { MEMBER_COLORS } from '../constants/theme';

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

export function memberIdFromName(name = '', fallback = 0) {
  return `member-${slugify(name)}-${fallback}`;
}

export function makeCode(prefix = '') {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  if (!prefix) return random;
  const cleanPrefix = String(prefix).replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase();
  return `${cleanPrefix}${random}`.slice(0, 8);
}

export function buildUser(user = {}) {
  const baseName = user.name?.trim() || user.email?.split('@')?.[0] || 'Traveler';

  return {
    id: user.id || `user-${slugify(user.email || baseName)}`,
    name: baseName,
    email: user.email || '',
    color: user.color || MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)],
    phone: user.phone || '',
    bio: user.bio || '',
    notificationPrefs: {
      push: user.notificationPrefs?.push ?? true,
      expense: user.notificationPrefs?.expense ?? true,
      chat: user.notificationPrefs?.chat ?? true,
      planning: user.notificationPrefs?.planning ?? true,
    },
  };
}

export function formatClock(date = new Date()) {
  return new Date(date).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTripRole(trip, userId) {
  if (!trip || !userId) return 'guest';
  if (trip.ownerId === userId) return 'owner';
  return trip.members?.some((member) => member.id === userId) ? 'member' : 'guest';
}

export function isTripMember(trip, userId) {
  return getTripRole(trip, userId) !== 'guest';
}

function ensureMembers(rawTrip) {
  const members = (rawTrip.members || []).map((member, index) => ({
    id: member.id || memberIdFromName(member.name, index),
    name: member.name || `Member ${index + 1}`,
    color: member.color || MEMBER_COLORS[index % MEMBER_COLORS.length],
    role: member.role || (index === 0 ? 'owner' : 'member'),
  }));

  if (!members.length) {
    members.push({
      id: 'member-owner-0',
      name: 'Owner',
      color: MEMBER_COLORS[0],
      role: 'owner',
    });
  }

  const ownerId = rawTrip.ownerId || members.find((member) => member.role === 'owner')?.id || members[0].id;

  return members.map((member) => ({
    ...member,
    role: member.id === ownerId ? 'owner' : 'member',
  }));
}

export function normalizeTrip(rawTrip = {}) {
  const members = ensureMembers(rawTrip);
  const ownerId = rawTrip.ownerId || members.find((member) => member.role === 'owner')?.id || members[0].id;
  const memberNameMap = Object.fromEntries(members.map((member, index) => [member.name, member.id || memberIdFromName(member.name, index)]));

  const itinerary = (rawTrip.itinerary || []).map((day, dayIndex) => ({
    id: day.id || `day-${rawTrip.id || 'trip'}-${dayIndex}`,
    day: day.day || dayIndex + 1,
    dayName: day.dayName || `Day ${dayIndex + 1}`,
    date: day.date || '',
    items: (day.items || []).map((item, itemIndex) => ({
      id: item.id || `item-${rawTrip.id || 'trip'}-${dayIndex}-${itemIndex}`,
      time: item.time || '09:00',
      title: item.title || '',
      desc: item.desc || '',
      cat: item.cat || 'Activity',
    })),
  }));

  const expenses = (rawTrip.expenses || []).map((expense, expenseIndex) => {
    const fallbackPayer = members[0];
    const byId = expense.byId || memberNameMap[expense.by] || fallbackPayer.id;
    const splitCount = Math.max(1, Number(expense.split) || members.length || 1);
    const participants = Array.isArray(expense.participants) && expense.participants.length
      ? expense.participants.filter((memberId) => members.some((member) => member.id === memberId))
      : members.slice(0, splitCount).map((member) => member.id);

    return {
      id: expense.id || `expense-${rawTrip.id || 'trip'}-${expenseIndex}`,
      icon: expense.icon || '💸',
      name: expense.name || '',
      byId,
      by: members.find((member) => member.id === byId)?.name || expense.by || fallbackPayer.name,
      amount: Number(expense.amount) || 0,
      participants: participants.length ? participants : [byId],
      split: participants.length || splitCount,
      cat: expense.cat || 'other',
    };
  });

  const votes = (rawTrip.votes || []).map((vote, voteIndex) => {
    const mappedVotes = {};

    Object.entries(vote.votes || {}).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      const member = Number.isFinite(Number(key)) ? members[Number(key)] : members.find((item) => item.id === key || item.name === key);
      if (!member) return;

      mappedVotes[member.id] = value === true || value === 'yes' ? 'yes' : 'no';
    });

    return {
      id: vote.id || `vote-${rawTrip.id || 'trip'}-${voteIndex}`,
      place: vote.place || '',
      type: vote.type || '📍 Place',
      desc: vote.desc || '',
      votes: mappedVotes,
    };
  });

  const messages = (rawTrip.messages || []).map((message, messageIndex) => {
    if (message.sys) {
      return {
        id: message.id || `msg-${rawTrip.id || 'trip'}-${messageIndex}`,
        sys: message.sys,
      };
    }

    const fromId = typeof message.from === 'number'
      ? members[message.from]?.id
      : message.fromId || memberNameMap[message.from] || message.from;

    return {
      id: message.id || `msg-${rawTrip.id || 'trip'}-${messageIndex}`,
      fromId: fromId || ownerId,
      text: message.text || '',
      time: message.time || formatClock(),
    };
  });

  const places = (rawTrip.places || []).map((place, placeIndex) => ({
    id: place.id || `place-${rawTrip.id || 'trip'}-${placeIndex}`,
    name: place.name || '',
    lat: Number(place.lat) || 0,
    lng: Number(place.lng) || 0,
    type: place.type || '📍 จุดถ่ายรูป',
    note: place.note || '',
  }));

  return {
    id: rawTrip.id || uid('trip'),
    emoji: rawTrip.emoji || '🧳',
    name: rawTrip.name || 'Trip',
    description: rawTrip.description || '',
    startDate: rawTrip.startDate || '',
    endDate: rawTrip.endDate || '',
    budget: rawTrip.budget || 'mid',
    inviteCode: rawTrip.inviteCode || null,
    shareCode: rawTrip.shareCode || null,
    coverPhoto: rawTrip.coverPhoto || '',
    members,
    ownerId,
    ownerName: members.find((member) => member.id === ownerId)?.name || members[0].name,
    itinerary,
    expenses,
    votes,
    messages,
    places,
    sharedAt: rawTrip.sharedAt || null,
    sharedBy: rawTrip.sharedBy || null,
    sourceTripId: rawTrip.sourceTripId || null,
    sourceShareCode: rawTrip.sourceShareCode || null,
    updatedAt: rawTrip.updatedAt || new Date().toISOString(),
  };
}

export function updateTripList(trips, tripId, updater) {
  return trips.map((trip) => {
    if (trip.id !== tripId) return trip;
    return normalizeTrip({
      ...trip,
      ...updater(trip),
      id: trip.id,
      updatedAt: new Date().toISOString(),
    });
  });
}

export function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function isDateInRange(target, start, end) {
  if (!target || !start || !end) return false;
  return dateKey(target) >= dateKey(start) && dateKey(target) <= dateKey(end);
}

export function listDatesBetween(start, end) {
  if (!start || !end) return [];
  const result = [];
  const cursor = new Date(start);
  const limit = new Date(end);

  while (cursor <= limit) {
    result.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export function calculatePlanningProgress(trip) {
  const checkpoints = [
    (trip.itinerary || []).length > 0,
    (trip.expenses || []).length > 0,
    (trip.votes || []).length > 0,
    (trip.places || []).length > 0,
  ];
  const completed = checkpoints.filter(Boolean).length;
  const value = Math.round((completed / checkpoints.length) * 100);

  return {
    value,
    label: value === 100 ? 'พร้อมเดินทาง' : `วางแผนแล้ว ${value}%`,
    barValue: Math.max(12, value),
  };
}

export function calculateExpenseSummary(trip) {
  const members = trip.members || [];
  const total = (trip.expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const balances = members.map((member) => ({
    ...member,
    paid: 0,
    owed: 0,
    net: 0,
  }));
  const balanceMap = Object.fromEntries(balances.map((member) => [member.id, member]));

  (trip.expenses || []).forEach((expense) => {
    const payer = balanceMap[expense.byId];
    if (payer) payer.paid += Number(expense.amount || 0);

    const participants = (expense.participants || []).filter((memberId) => balanceMap[memberId]);
    const splitMembers = participants.length ? participants : members.map((member) => member.id);
    const share = splitMembers.length ? Number(expense.amount || 0) / splitMembers.length : 0;

    splitMembers.forEach((memberId) => {
      balanceMap[memberId].owed += share;
    });
  });

  balances.forEach((member) => {
    member.net = Math.round(member.paid - member.owed);
  });

  const settlements = [];
  const creditors = balances
    .filter((member) => member.net > 0)
    .map((member) => ({ ...member }));
  const debtors = balances
    .filter((member) => member.net < 0)
    .map((member) => ({ ...member, net: Math.abs(member.net) }));

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.net, debtor.net);

    settlements.push({
      fromId: debtor.id,
      from: debtor.name,
      toId: creditor.id,
      to: creditor.name,
      amount: Math.round(amount),
    });

    creditor.net -= amount;
    debtor.net -= amount;

    if (creditor.net <= 1) creditorIndex += 1;
    if (debtor.net <= 1) debtorIndex += 1;
  }

  return {
    total,
    perPerson: members.length ? Math.round(total / members.length) : 0,
    balances,
    settlements,
  };
}

export function getNextFreeDate(trips, fromDate = new Date()) {
  const start = new Date(fromDate);

  for (let offset = 0; offset < 90; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(candidate.getDate() + offset);
    const candidateKey = dateKey(candidate);
    const occupied = trips.some((trip) => isDateInRange(candidateKey, trip.startDate, trip.endDate));
    if (!occupied) return candidateKey;
  }

  return null;
}

export function cloneSharedTripForUser(sourceTrip, user) {
  const owner = buildUser(user);

  return normalizeTrip({
    emoji: sourceTrip.emoji,
    name: sourceTrip.name,
    description: sourceTrip.description,
    startDate: sourceTrip.startDate,
    endDate: sourceTrip.endDate,
    budget: sourceTrip.budget,
    coverPhoto: sourceTrip.coverPhoto,
    ownerId: owner.id,
    ownerName: owner.name,
    inviteCode: makeCode(owner.name),
    members: [
      { id: owner.id, name: owner.name, color: owner.color, role: 'owner' },
    ],
    itinerary: (sourceTrip.itinerary || []).map((day) => ({
      day: day.day,
      dayName: day.dayName,
      date: day.date,
      items: (day.items || []).map((item) => ({
        time: item.time,
        title: item.title,
        desc: item.desc,
        cat: item.cat,
      })),
    })),
    expenses: (sourceTrip.expenses || []).map((expense) => ({
      icon: expense.icon,
      name: expense.name,
      amount: expense.amount,
      cat: expense.cat,
      byId: owner.id,
      by: owner.name,
      participants: [owner.id],
      split: 1,
    })),
    votes: (sourceTrip.votes || []).map((vote) => ({
      place: vote.place,
      type: vote.type,
      desc: vote.desc,
      votes: {},
    })),
    places: (sourceTrip.places || []).map((place) => ({
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      type: place.type,
      note: place.note,
    })),
    messages: [
      { sys: `${owner.name} เพิ่มเทมเพลต "${sourceTrip.name}" มาไว้ในรายการทริป` },
    ],
    sourceTripId: sourceTrip.id,
    sourceShareCode: sourceTrip.shareCode || null,
  });
}
