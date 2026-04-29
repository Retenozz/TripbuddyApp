import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from './src/constants/theme';

import Toast from './src/components/Toast';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateScreen from './src/screens/CreateScreen';
import TripCalendarScreen from './src/screens/TripCalendarScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import JoinTripScreen from './src/screens/JoinTripScreen';

import {
  signIn,
  signUp,
  signOut,
  restoreSession,
  onAuthStateChange,
  updateProfile,
} from './src/services/authService';

import {
  fetchMyTrips,
  fetchSharedTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  fetchTripByShareCode,
  fetchTripByInviteCode,
  subscribeToUserTrips,
} from './src/services/tripService';

import {
  cloneSharedTripForUser,
  formatClock,
  isTripMember,
  makeCode,
  normalizeTrip,
} from './src/utils/tripUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countItineraryItems(trip) {
  return (trip?.itinerary || []).reduce((sum, day) => sum + (day.items?.length || 0), 0);
}

function canNotify(user, channel) {
  const prefs = user?.notificationPrefs || {};
  if (prefs.push === false) return false;
  if (channel && prefs[channel] === false) return false;
  return true;
}

/**
 * ดึง code จาก URL เท่านั้น เช่น "tripbuddy.app/share/ABC123" → "ABC123"
 * bare code เช่น "ABC123" จะ return null เสมอ (ไม่ match)
 */
function extractCodeFromUrl(url, routeName) {
  const text = String(url || '').trim();
  if (!text) return null;
  const pattern = new RegExp(`${routeName}/([^/?#\\s]+)`, 'i');
  const match = text.match(pattern);
  return match?.[1] ? match[1].toUpperCase() : null;
}

/**
 * ดึง bare code จาก input เช่น "ABC123" หรือ "join/ABC123"
 * ใช้สำหรับ invite code ที่ user พิมพ์มา
 */
function extractInviteCode(input) {
  const text = String(input || '').trim().toUpperCase();
  // ถ้าเป็น URL pattern เช่น join/ABC123 ให้ดึง code ออก
  const urlMatch = text.match(/(?:JOIN|INVITE)\/([A-Z0-9]{4,10})/i);
  if (urlMatch?.[1]) return urlMatch[1];
  // bare code
  if (/^[A-Z0-9]{4,10}$/.test(text)) return text;
  return null;
}

function createNotification(payload = {}) {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: payload.title || 'มีการอัปเดตใหม่',
    body: payload.body || '',
    type: payload.type || 'info',
    channel: payload.channel || 'planning',
    tripId: payload.trip?.id || payload.tripId || null,
    tripName: payload.trip?.name || payload.tripName || '',
    read: false,
    timeLabel: formatClock(),
    createdAt: new Date().toISOString(),
  };
}

function describeTripUpdate(beforeTrip, afterTrip) {
  if (!beforeTrip || !afterTrip) return null;

  const beforeMembers = beforeTrip.members?.length || 0;
  const afterMembers = afterTrip.members?.length || 0;
  if (afterMembers > beforeMembers) {
    return { title: 'มีสมาชิกใหม่เข้าทริป', body: `${afterTrip.name} มีสมาชิกเพิ่ม ${afterMembers - beforeMembers} คน`, type: 'success', channel: 'planning', trip: afterTrip };
  }

  const beforeExpenses = beforeTrip.expenses?.length || 0;
  const afterExpenses = afterTrip.expenses?.length || 0;
  if (beforeExpenses !== afterExpenses) {
    return { title: 'อัปเดตรายจ่ายทริป', body: `${afterTrip.name} ตอนนี้มี ${afterExpenses} รายการค่าใช้จ่าย`, type: 'info', channel: 'expense', trip: afterTrip };
  }

  const beforeMessages = beforeTrip.messages?.length || 0;
  const afterMessages = afterTrip.messages?.length || 0;
  if (afterMessages > beforeMessages) {
    return { title: 'มีข้อความใหม่', body: `มีข้อความใหม่ใน ${afterTrip.name}`, type: 'info', channel: 'chat', trip: afterTrip };
  }

  const beforePlanCount = countItineraryItems(beforeTrip);
  const afterPlanCount = countItineraryItems(afterTrip);
  const planningChanged =
    beforePlanCount !== afterPlanCount ||
    (beforeTrip.votes?.length || 0) !== (afterTrip.votes?.length || 0) ||
    (beforeTrip.places?.length || 0) !== (afterTrip.places?.length || 0) ||
    beforeTrip.startDate !== afterTrip.startDate ||
    beforeTrip.endDate !== afterTrip.endDate ||
    beforeTrip.name !== afterTrip.name ||
    beforeTrip.description !== afterTrip.description;

  if (planningChanged) {
    return { title: 'แผนทริปถูกอัปเดต', body: `${afterTrip.name} มีการปรับแผนล่าสุดแล้ว`, type: 'info', channel: 'planning', trip: afterTrip };
  }

  return null;
}

function toExploreTrip(trip) {
  return {
    ...trip,
    sharedBy: trip.sharedBy || trip.ownerName || trip.members?.[0]?.name || 'TripBuddy',
    sharedAt: trip.sharedAt || trip.updatedAt || new Date().toISOString(),
  };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [sharedTripsCache, setSharedTripsCache] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [detailBackScreen, setDetailBackScreen] = useState('home');
  const [createBackScreen, setCreateBackScreen] = useState('home');
  const [createDraft, setCreateDraft] = useState(null);
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingShareCode, setPendingShareCode] = useState(null);
  const handledInitialUrlRef = useRef(false);
  const realtimeUnsub = useRef(null);

  const activeTrip = useMemo(() => trips.find((t) => t.id === activeTripId) || null, [activeTripId, trips]);
  const joinedTrips = useMemo(() => (currentUser ? trips.filter((t) => isTripMember(t, currentUser.id)) : []), [currentUser, trips]);
  const sharedTemplateTrips = useMemo(() => {
    const ownShared = trips.filter((t) => t.sharedAt).map(toExploreTrip);
    const ownIds = new Set(ownShared.map((t) => t.id));
    const fromCache = sharedTripsCache.map(toExploreTrip).filter((t) => !ownIds.has(t.id));
    return [...ownShared, ...fromCache];
  }, [trips, sharedTripsCache]);
  const unreadNotificationCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const showToast = (msg, type = 'info') => setToast({ msg, type });
  const pushNotification = (payload) => {
    if (!currentUser || !canNotify(currentUser, payload.channel)) return;
    setNotifications((prev) => [createNotification(payload), ...prev].slice(0, 50));
  };

  const loadUserData = useCallback(async (user) => {
    if (!user) return;
    try {
      const [myTrips, shared] = await Promise.all([
        fetchMyTrips(user.id),
        fetchSharedTrips(),
      ]);
      setTrips(myTrips.map(normalizeTrip));
      setSharedTripsCache(shared.map(normalizeTrip));
    } catch (err) {
      showToast('โหลดข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    }
  }, []);

  const setupRealtime = useCallback((user) => {
    if (realtimeUnsub.current) realtimeUnsub.current();
    realtimeUnsub.current = subscribeToUserTrips(
      user.id,
      (newTrip) => setTrips((prev) => {
        if (prev.find((t) => t.id === newTrip.id)) return prev;
        return [normalizeTrip(newTrip), ...prev];
      }),
      (updatedTrip) => setTrips((prev) => prev.map((t) => t.id === updatedTrip.id ? normalizeTrip(updatedTrip) : t)),
      (deletedId) => setTrips((prev) => prev.filter((t) => t.id !== deletedId)),
    );
  }, []);

  useEffect(() => {
    restoreSession().then((user) => {
      if (user) {
        setCurrentUser(user);
        loadUserData(user);
        setupRealtime(user);
        setScreen('home');
      } else {
        setScreen('auth');
      }
    }).catch(() => setScreen('auth'));

    const sub = onAuthStateChange((user) => {
      if (!user) {
        setCurrentUser(null);
        setTrips([]);
        setScreen('auth');
        if (realtimeUnsub.current) realtimeUnsub.current();
      }
    });

    return () => sub.unsubscribe();
  }, []);

  const openCreate = (backScreen = 'home', draft = null) => {
    setCreateBackScreen(backScreen);
    setCreateDraft(draft);
    setScreen('create');
  };

  const openTrip = (tripOrId, backScreen = 'home') => {
    const nextTripId = typeof tripOrId === 'string' ? tripOrId : tripOrId?.id;
    if (!nextTripId) return;
    setActiveTripId(nextTripId);
    setDetailBackScreen(backScreen);
    setScreen('detail');
  };

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const handleLogin = async ({ email, password, name, mode }) => {
    try {
      let session;
      if (mode === 'register') {
        const data = await signUp({ email, password, name });
        session = data.session;
        if (!session) {
          showToast('สมัครสมาชิกสำเร็จ! กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ', 'success');
          return;
        }
      } else {
        const data = await signIn({ email, password });
        session = data.session;
      }

      const user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || name || email.split('@')[0],
        color: session.user.user_metadata?.color,
        avatar: session.user.user_metadata?.avatar || null,
        notificationPrefs: session.user.user_metadata?.notificationPrefs || {},
      };

      setCurrentUser(user);
      await loadUserData(user);
      setupRealtime(user);
      setNotifications([createNotification({ title: `ยินดีต้อนรับ ${user.name}`, body: 'เริ่มสร้างทริปใหม่ได้เลย', type: 'success', channel: 'planning' })]);
      setScreen('home');
      showToast(`ยินดีต้อนรับ ${user.name}!`, 'success');
    } catch (err) {
      showToast(err.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
    }
  };

  const handleLogout = async () => {
    try { await signOut(); } catch (_) {}
    setCurrentUser(null);
    setTrips([]);
    setActiveTripId(null);
    setCreateDraft(null);
    setNotifications([]);
    setPendingShareCode(null);
    if (realtimeUnsub.current) realtimeUnsub.current();
    setScreen('auth');
    showToast('ออกจากระบบเรียบร้อย', 'info');
  };

  const handleUpdateUser = async (updates) => {
    setCurrentUser((prev) => ({
      ...prev, ...updates,
      notificationPrefs: { ...prev?.notificationPrefs, ...updates?.notificationPrefs },
    }));
    try {
      await updateProfile(updates);
    } catch (err) {
      showToast('บันทึกโปรไฟล์ไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  // ─── Trip CRUD ─────────────────────────────────────────────────────────────
  const handleCreate = async (newTrip) => {
    try {
      const saved = await createTrip(normalizeTrip(newTrip), currentUser.id, currentUser.name);
      const full = normalizeTrip(saved);
      setTrips((prev) => [full, ...prev]);
      setActiveTripId(full.id);
      setDetailBackScreen(createBackScreen);
      setCreateDraft(null);
      setScreen('detail');
      showToast('สร้างทริปสำเร็จแล้ว', 'success');
      pushNotification({ title: 'สร้างทริปใหม่สำเร็จ', body: `${full.name} ถูกเพิ่มเข้าแผนของคุณแล้ว`, type: 'success', channel: 'planning', trip: full });
    } catch (err) {
      showToast('สร้างทริปไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  const handleUpdateTrip = async (tripId, changesOrUpdater) => {
    const beforeTrip = trips.find((t) => t.id === tripId);
    if (!beforeTrip) return;
    const changes = typeof changesOrUpdater === 'function' ? changesOrUpdater(beforeTrip) : changesOrUpdater;
    const merged = normalizeTrip({ ...beforeTrip, ...changes });
    setTrips((prev) => prev.map((t) => t.id === tripId ? merged : t));
    try {
      await updateTrip(tripId, merged);
      const notif = describeTripUpdate(beforeTrip, merged);
      if (notif) pushNotification(notif);
    } catch (err) {
      setTrips((prev) => prev.map((t) => t.id === tripId ? beforeTrip : t));
      showToast('อัปเดตทริปไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) return;
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
    if (activeTripId === tripId) { setActiveTripId(null); setScreen('home'); }
    try {
      await deleteTrip(tripId);
      showToast(`ลบทริป ${targetTrip.name} แล้ว`, 'info');
    } catch (err) {
      setTrips((prev) => [targetTrip, ...prev]);
      showToast('ลบทริปไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  // ─── Share / Import ────────────────────────────────────────────────────────
  const handleImportSharedTrip = async (tripOrCode, options = {}) => {
    let sourceTrip = typeof tripOrCode === 'string'
      ? trips.find((t) => String(t.shareCode || '').toUpperCase() === String(tripOrCode).toUpperCase())
      : tripOrCode;

    if (!sourceTrip && typeof tripOrCode === 'string') {
      try { sourceTrip = await fetchTripByShareCode(tripOrCode); } catch (_) {}
    }

    if (!sourceTrip) { showToast('ไม่พบทริปแชร์นี้', 'error'); return false; }
    if (options.previewOnly) { openTrip(sourceTrip, 'explore'); return true; }
    if (!currentUser) { setPendingShareCode(sourceTrip.shareCode || null); setScreen('auth'); return false; }
    if (sourceTrip.ownerId === currentUser.id) { openTrip(sourceTrip, 'home'); showToast('นี่คือทริปที่คุณแชร์เอง', 'info'); return true; }

    const existingCopy = trips.find((t) => t.ownerId === currentUser.id && t.sourceShareCode === sourceTrip.shareCode);
    if (existingCopy) { openTrip(existingCopy, 'home'); showToast('คุณเพิ่มเทมเพลตนี้ไว้แล้ว', 'info'); return true; }

    try {
      const cloned = cloneSharedTripForUser(sourceTrip, currentUser);
      const saved = await createTrip(cloned, currentUser.id, currentUser.name);
      const full = normalizeTrip(saved);
      setTrips((prev) => [full, ...prev]);
      setActiveTripId(full.id);
      setDetailBackScreen('explore');
      setScreen('detail');
      showToast(`เพิ่ม ${sourceTrip.name} เข้าในรายการทริปแล้ว`, 'success');
    } catch (err) {
      showToast('คัดลอกทริปไม่สำเร็จ: ' + err.message, 'error');
      return false;
    }
    return true;
  };

  const handleShareTrip = async (trip, { navigateToExplore = false } = {}) => {
    const targetTrip = trips.find((t) => t.id === trip.id);
    if (!targetTrip) return null;
    const shareCode = targetTrip.shareCode || makeCode(targetTrip.name);
    const updates = { sharedAt: new Date().toISOString(), sharedBy: currentUser?.name || targetTrip.ownerName, shareCode };
    const updated = normalizeTrip({ ...targetTrip, ...updates });
    setTrips((prev) => prev.map((t) => t.id === trip.id ? updated : t));
    setSharedTripsCache((prev) => {
      const exists = prev.find((t) => t.id === updated.id);
      return exists ? prev.map((t) => t.id === updated.id ? updated : t) : [updated, ...prev];
    });
    try { await updateTrip(trip.id, updates); } catch (err) { showToast('แชร์ทริปไม่สำเร็จ: ' + err.message, 'error'); }
    const shareUrl = Linking.createURL(`/share/${shareCode}`);
    return { shareCode, shareUrl, trip: updated };
  };

  // ─── Join by code (invite code เท่านั้น — ไม่ใช่ share code) ──────────────
  const handleJoinByCode = async (input) => {
    if (!currentUser) return false;

    const text = String(input || '').trim();

    // ถ้าเป็น URL ที่มี /share/ → ส่งไป import เทมเพลตแทน
    const shareCodeFromUrl = extractCodeFromUrl(text, 'share');
    if (shareCodeFromUrl) return handleImportSharedTrip(shareCodeFromUrl);

    // ดึง invite code (bare code หรือ join/CODE)
    const inviteCode = extractInviteCode(text);
    console.log('[handleJoinByCode] input:', text, '→ inviteCode:', inviteCode);

    if (!inviteCode) { showToast('กรุณากรอกรหัสเชิญให้ถูกต้อง', 'error'); return false; }

    // ค้นหาจาก DB ก่อน
    let targetTrip = null;
    try {
      targetTrip = await fetchTripByInviteCode(inviteCode);
    } catch (_) {}

    // fallback: ค้นหาใน local state
    if (!targetTrip) {
      targetTrip = trips.find((t) => String(t.inviteCode || '').toUpperCase() === inviteCode);
    }

    console.log('[handleJoinByCode] targetTrip found:', !!targetTrip, targetTrip?.name);

    if (!targetTrip) { showToast('ไม่พบรหัสเชิญนี้ กรุณาตรวจสอบอีกครั้ง', 'error'); return false; }

    // อยู่แล้ว → navigate ไปดูทริปนั้น
    if (isTripMember(targetTrip, currentUser.id)) {
      showToast('คุณเป็นสมาชิกทริปนี้อยู่แล้ว', 'info');
      openTrip(targetTrip.id, 'join');
      return true;
    }

    // เพิ่มตัวเองเป็น member
    const newMember = { id: currentUser.id, name: currentUser.name, color: currentUser.color || '#2489D4', role: 'member' };
    const sysMsg = { id: `sys-${Date.now()}`, sys: true, text: `${currentUser.name} เข้าร่วมทริป`, createdAt: new Date().toISOString() };
    const mergedTrip = normalizeTrip({
      ...targetTrip,
      members: [...(targetTrip.members || []), newMember],
      messages: [...(targetTrip.messages || []), sysMsg],
    });

    // Optimistic update
    setTrips((prev) => {
      const exists = prev.find((t) => t.id === mergedTrip.id);
      return exists ? prev.map((t) => t.id === mergedTrip.id ? mergedTrip : t) : [mergedTrip, ...prev];
    });

    try {
      const saved = await updateTrip(targetTrip.id, mergedTrip);
      const confirmed = normalizeTrip(saved);
      setTrips((prev) => prev.map((t) => t.id === confirmed.id ? confirmed : t));
      openTrip(confirmed.id, 'join');
      showToast(`🎉 เข้าร่วม ${confirmed.name} สำเร็จ!`, 'success');
      pushNotification({ title: 'เข้าร่วมทริปสำเร็จ', body: `คุณเป็นสมาชิกของ ${confirmed.name} แล้ว`, type: 'success', channel: 'planning', trip: confirmed });
    } catch (err) {
      setTrips((prev) => prev.map((t) => t.id === targetTrip.id ? targetTrip : t));
      showToast('เข้าร่วมทริปไม่สำเร็จ: ' + err.message, 'error');
      return false;
    }
    return true;
  };

  // ─── Deep link ─────────────────────────────────────────────────────────────
  const handleIncomingLink = useCallback((url) => {
    const shareCode = extractCodeFromUrl(url, 'share');
    if (!shareCode) return;
    if (!currentUser) { setPendingShareCode(shareCode); setScreen('auth'); return; }
    handleImportSharedTrip(shareCode);
  }, [currentUser, trips]);

  useEffect(() => {
    if (handledInitialUrlRef.current) return;
    handledInitialUrlRef.current = true;
    let active = true;
    Linking.getInitialURL().then((url) => { if (active && url) handleIncomingLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleIncomingLink(url));
    return () => { active = false; sub.remove(); };
  }, [handleIncomingLink]);

  useEffect(() => {
    if (!currentUser || !pendingShareCode) return;
    handleImportSharedTrip(pendingShareCode).then((ok) => { if (ok) setPendingShareCode(null); });
  }, [currentUser, pendingShareCode]);

  useEffect(() => {
    if (screen === 'detail' && !activeTrip) setScreen('home');
  }, [activeTrip, screen]);

  // ─── Android Back Handler ──────────────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      if (screen === 'home' || screen === 'auth' || screen === 'loading') {
        // อยู่ที่หน้าหลักหรือ auth → ออกแอปปกติ
        return false;
      }
      // หน้าอื่นๆ → ย้อนกลับตาม logic
      if (screen === 'detail') {
        setScreen(detailBackScreen || 'home');
        return true;
      }
      if (screen === 'create') {
        setCreateDraft(null);
        setScreen(createBackScreen || 'home');
        return true;
      }
      if (screen === 'calendar' || screen === 'profile' || screen === 'explore' ||
          screen === 'notifications' || screen === 'join') {
        setScreen('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [screen, detailBackScreen, createBackScreen]);

  if (screen === 'loading') {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style={screen === 'auth' ? 'auto' : 'dark'} />
        {toast ? <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} /> : null}

        {screen === 'auth' && <AuthScreen onLogin={handleLogin} />}

        {screen === 'home' && currentUser && (
          <HomeScreen
            trips={trips} sharedTrips={sharedTemplateTrips} currentUser={currentUser}
            notificationCount={unreadNotificationCount}
            onSelect={(trip) => { setActiveTripId(trip.id); setScreen('calendar'); }}
            onTripsPress={() => { setActiveTripId(null); setScreen('calendar'); }}
            onCreate={() => openCreate('home')}
            onProfilePress={() => setScreen('profile')}
            onExplorePress={() => setScreen('explore')}
            onJoinPress={() => setScreen('join')}
            onImportSharedTrip={(trip, options) => handleImportSharedTrip(trip, options)}
            onOpenNotifications={() => setScreen('notifications')}
            onDeleteTrip={(trip) => handleDeleteTrip(trip.id)}
          />
        )}

        {screen === 'calendar' && currentUser && (
          <TripCalendarScreen
            trips={joinedTrips} focusTrip={activeTrip}
            onBack={() => setScreen('home')}
            onOpenTrip={(trip) => openTrip(trip, 'calendar')}
            onCreateFromDate={(date) => openCreate('calendar', { startDate: date, endDate: date })}
          />
        )}

        {screen === 'create' && currentUser && (
          <CreateScreen
            onBack={() => { setCreateDraft(null); setScreen(createBackScreen); }}
            onCreate={handleCreate} currentUser={currentUser}
            existingTrips={joinedTrips} initialDraft={createDraft}
          />
        )}

        {screen === 'detail' && activeTrip && currentUser && (
          <TripDetailScreen
            trip={activeTrip} onBack={() => setScreen(detailBackScreen)}
            currentUser={currentUser} onToast={showToast}
            onShareTrip={(trip, opts) => handleShareTrip(trip, opts)}
            onJoinTrip={(trip) => (trip?.sharedAt ? handleImportSharedTrip(trip) : handleJoinByCode(trip?.inviteCode))}
            onUpdateTrip={handleUpdateTrip} onDeleteTrip={handleDeleteTrip}
          />
        )}

        {screen === 'profile' && currentUser && (
          <ProfileScreen
            currentUser={currentUser} trips={joinedTrips} unreadCount={unreadNotificationCount}
            onBack={() => setScreen('home')} onLogout={handleLogout}
            onUpdateUser={handleUpdateUser} onToast={showToast}
          />
        )}

        {screen === 'explore' && currentUser && (
          <ExploreScreen
            onBack={() => setScreen('home')} sharedTrips={sharedTemplateTrips}
            onCreateWithDest={(dest) => openCreate('explore', { emoji: dest.emoji, name: dest.name, description: dest.sub })}
            onSelectSharedTrip={(trip) => handleImportSharedTrip(trip)}
          />
        )}

        {screen === 'notifications' && currentUser && (
          <NotificationScreen
            notifications={notifications} onBack={() => setScreen('home')}
            onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
            onClearAll={() => setNotifications([])}
            onOpenTrip={(tripId) => {
              setNotifications((prev) => prev.map((n) => (n.tripId === tripId ? { ...n, read: true } : n)));
              openTrip(tripId, 'notifications');
            }}
          />
        )}

        {screen === 'join' && currentUser && (
          <JoinTripScreen
            onBack={() => setScreen('home')} currentUser={currentUser}
            sharedTrips={sharedTemplateTrips}
            onJoinByCode={handleJoinByCode}
            onUseTemplate={(trip) => handleImportSharedTrip(trip)}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
});
