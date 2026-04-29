import React, { useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { fmtDateShort, nightsBetween } from '../constants/data';
import MemberAvatar from '../components/MemberAvatar';
import {
  calculatePlanningProgress,
  getNextFreeDate,
  isTripMember,
} from '../utils/tripUtils';

const HOME_TABS = [
  { id: 'home', icon: '🏠', label: 'หน้าหลัก' },
  { id: 'explore', icon: '🧭', label: 'สำรวจ' },
  { id: 'create', icon: '+', label: 'สร้าง' },
  { id: 'trips', icon: '🗓️', label: 'ทริป' },
  { id: 'profile', icon: '👤', label: 'โปรไฟล์' },
];

const BUDGET_LABELS = {
  budget: 'Budget',
  mid: 'Smart',
  comfy: 'Comfort',
  luxury: 'Luxury',
};

function BottomNav({ active, onChange, onCreate, onExplorePress, onProfilePress, onTripsPress, bottomInset = 8 }) {
  const handlePress = (id) => {
    if (id === 'create') return onCreate?.();
    if (id === 'explore') return onExplorePress?.();
    if (id === 'profile') return onProfilePress?.();
    if (id === 'trips') return onTripsPress?.();
    onChange(id);
  };

  return (
    <View style={[nav.bar, { paddingBottom: bottomInset }]}>
      {HOME_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={nav.item}
          onPress={() => handlePress(tab.id)}
          activeOpacity={0.85}
        >
          {tab.id === 'create' ? (
            <LinearGradient
              colors={[COLORS.gradStart, COLORS.gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={nav.createBtn}
            >
              <Text style={nav.createIcon}>{tab.icon}</Text>
            </LinearGradient>
          ) : (
            <>
              <Text style={[nav.icon, active === tab.id && nav.iconActive]}>{tab.icon}</Text>
              <Text style={[nav.label, active === tab.id && nav.labelActive]}>{tab.label}</Text>
              {active === tab.id && <View style={nav.dot} />}
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.sectionRow}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function TripCard({
  trip,
  role,
  onPress,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionTone = 'default',
}) {
  const tripNights = nightsBetween(trip.startDate, trip.endDate);
  const totalSpent = (trip.expenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const planning = calculatePlanningProgress(trip);
  const budgetLabel = BUDGET_LABELS[trip.budget] || 'Plan';
  const roleLabel = role === 'owner' ? 'Owner' : role === 'member' ? 'Member' : 'Open';

  return (
    <TouchableOpacity style={card.card} onPress={onPress} activeOpacity={0.9}>
      {trip.coverPhoto ? (
        <ImageBackground source={{ uri: trip.coverPhoto }} style={card.hero} imageStyle={card.heroImage}>
          <LinearGradient
            colors={['rgba(18,45,67,0.08)', 'rgba(18,45,67,0.65)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={card.heroOverlay}
          >
            <View style={card.heroTop}>
              <View style={card.codeChip}>
                <Text style={card.codeChipText}>{trip.inviteCode}</Text>
              </View>
              <View style={card.nightChip}>
                <Text style={card.nightChipText}>{tripNights > 0 ? `${tripNights} คืน` : 'Day Trip'}</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={[COLORS.gradStart, COLORS.gradEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={card.hero}
        >
          <View style={card.fallbackCenter}>
            <Text style={card.fallbackEmoji}>{trip.emoji}</Text>
          </View>
        </LinearGradient>
      )}

      <View style={card.body}>
        <View style={card.headingRow}>
          <View style={{ flex: 1 }}>
            <Text style={card.name}>{trip.name}</Text>
            <Text style={card.desc} numberOfLines={2}>{trip.description}</Text>
          </View>
          <View style={card.levelChip}>
            <Text style={card.levelChipText}>{budgetLabel}</Text>
          </View>
        </View>

        <View style={card.metaRow}>
          <Text style={card.metaText}>📅 {fmtDateShort(trip.startDate)} - {fmtDateShort(trip.endDate)}</Text>
          <Text style={card.metaText}>👥 {trip.members.length} คน</Text>
        </View>

        <View style={card.memberRow}>
          <View style={card.avatarRow}>
            {trip.members.slice(0, 4).map((member, avatarIndex) => (
              <MemberAvatar
                key={member.id}
                name={member.name}
                color={member.color}
                size={28}
                style={{
                  marginLeft: avatarIndex === 0 ? 0 : -8,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }}
              />
            ))}
          </View>
          <View style={card.rolePill}>
            <Text style={card.rolePillText}>{roleLabel}</Text>
          </View>
        </View>

        <View style={card.progressHeader}>
          <Text style={card.progressText}>{planning.label}</Text>
          <Text style={card.progressText}>฿{totalSpent.toLocaleString()}</Text>
        </View>

        <View style={card.progressTrack}>
          <View style={[card.progressFill, { width: `${planning.barValue}%` }]} />
        </View>

        <View style={card.footerRow}>
          <Text style={card.tapHint}>{role === 'guest' ? 'แตะเพื่อดูรายละเอียดทริป' : 'แตะเพื่อดูปฏิทินทริป'}</Text>
          <View style={card.footerActions}>
            {secondaryActionLabel ? (
              <TouchableOpacity
                style={[
                  card.inlineBtn,
                  secondaryActionTone === 'danger' && card.inlineBtnDanger,
                ]}
                onPress={onSecondaryAction}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    card.inlineBtnText,
                    secondaryActionTone === 'danger' && card.inlineBtnTextDanger,
                  ]}
                >
                  {secondaryActionLabel}
                </Text>
              </TouchableOpacity>
            ) : null}

            {actionLabel ? (
              <TouchableOpacity style={card.inlineBtn} onPress={onAction} activeOpacity={0.85}>
                <Text style={card.inlineBtnText}>{actionLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const nav = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  icon: { fontSize: 18, opacity: 0.45 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10, color: COLORS.textMuted },
  labelActive: { color: COLORS.primary, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  createBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 8,
  },
  createIcon: { fontSize: 30, lineHeight: 32, color: '#FFFFFF' },
});

const card = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D8EAF7',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  hero: { height: 118, justifyContent: 'space-between' },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { flex: 1, padding: 14, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  codeChip: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  codeChipText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  nightChip: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  nightChipText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  fallbackCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackEmoji: { fontSize: 36 },
  body: { padding: 16 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  desc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  levelChip: { backgroundColor: COLORS.bgMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  levelChipText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  metaText: { fontSize: 12, color: COLORS.textMuted, flexShrink: 1 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  avatarRow: { flexDirection: 'row' },
  rolePill: { backgroundColor: '#F4FAFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  rolePillText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: '#DFF1C8', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.success },
  footerRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  footerActions: { flexDirection: 'row', gap: 8 },
  tapHint: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  inlineBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  inlineBtnDanger: {
    borderColor: '#F6CACA',
    backgroundColor: '#FFF5F5',
  },
  inlineBtnTextDanger: { color: COLORS.danger },
});

export default function HomeScreen({
  trips,
  sharedTrips = [],
  currentUser,
  notificationCount = 0,
  onSelect,
  onTripsPress,
  onCreate,
  onProfilePress,
  onExplorePress,
  onJoinPress,
  onImportSharedTrip,
  onOpenNotifications,
  onDeleteTrip,
}) {
  const [activeNav, setActiveNav] = useState('home');
  const insets = useSafeAreaInsets();

  const joinedTrips = useMemo(
    () => trips.filter((trip) => isTripMember(trip, currentUser.id)),
    [currentUser.id, trips],
  );
  const suggestedTrips = useMemo(() => sharedTrips, [sharedTrips]);
  const nextFreeDate = useMemo(
    () => getNextFreeDate(joinedTrips),
    [joinedTrips],
  );

  const confirmDeleteTrip = (trip) => {
    Alert.alert(
      'ลบทริป',
      `ต้องการลบทริป "${trip.name}" ใช่ไหม`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => onDeleteTrip?.(trip),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greetingCard}>
          <View>
            <Text style={styles.greetingLabel}>สวัสดีครับ คุณ</Text>
            <Text style={styles.greetingName}>{currentUser.name}</Text>
            <Text style={styles.greetingSub}>
              {nextFreeDate ? `วันว่างถัดไป: ${fmtDateShort(nextFreeDate)}` : 'เดือนนี้คิวแน่นแล้ว'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onOpenNotifications} style={styles.notifyBtn} activeOpacity={0.85}>
              <Text style={styles.notifyIcon}>🔔</Text>
              {notificationCount > 0 && (
                <View style={styles.notifyBadge}>
                  <Text style={styles.notifyBadgeText}>{Math.min(notificationCount, 9)}+</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onProfilePress} activeOpacity={0.85}>
              <MemberAvatar
                name={currentUser.name}
                color={currentUser.color}
                size={48}
                style={styles.profileAvatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatNum}>{joinedTrips.length}</Text>
            <Text style={styles.quickStatLabel}>ทริปทั้งหมด</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatNum}>
              {joinedTrips.filter((t) => new Date(t.startDate) >= new Date()).length}
            </Text>
            <Text style={styles.quickStatLabel}>ทริปที่กำลังจะมา</Text>
          </View>
          <TouchableOpacity style={[styles.quickStatCard, styles.quickActionCard]} onPress={() => onJoinPress?.()} activeOpacity={0.85}>
            <Text style={styles.quickActionIcon}>🔑</Text>
            <Text style={styles.quickActionText}>Join</Text>
          </TouchableOpacity>
        </View>

        {/* Banner สร้างทริปใหม่ */}
        
        <SectionHeader
          title="ทริปของคุณ"
          subtitle={joinedTrips.length ? `${joinedTrips.length} รายการที่คุณอยู่ในทริป` : 'ยังไม่มีทริปที่เข้าร่วม'}
          actionLabel={joinedTrips.length ? 'ดูปฏิทิน' : undefined}
          onAction={onTripsPress}
        />

        {!joinedTrips.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧳</Text>
            <Text style={styles.emptyTitle}>ยังไม่มีทริปของคุณ</Text>
            <Text style={styles.emptyText}>เริ่มจากสร้างทริปใหม่ หรือเข้าร่วมทริปด้วย invite code จากเพื่อน</Text>
            <View style={styles.emptyActionRow}>
              <TouchableOpacity onPress={onCreate} activeOpacity={0.85}>
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.emptyPrimaryBtn}>
                  <Text style={styles.emptyPrimaryText}>สร้างทริป</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={onJoinPress} style={styles.emptySecondaryBtn} activeOpacity={0.85}>
                <Text style={styles.emptySecondaryText}>Join ทริป</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          joinedTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              role={trip.ownerId === currentUser.id ? 'owner' : 'member'}
              onPress={() => onSelect(trip)}
              secondaryActionLabel={trip.ownerId === currentUser.id ? 'ลบ' : undefined}
              onSecondaryAction={trip.ownerId === currentUser.id ? () => confirmDeleteTrip(trip) : undefined}
              secondaryActionTone="danger"
            />
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav
        active={activeNav}
        onChange={setActiveNav}
        onCreate={onCreate}
        onExplorePress={onExplorePress}
        onProfilePress={onProfilePress}
        onTripsPress={onTripsPress}
        bottomInset={Math.max(insets.bottom, 8)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  greetingCard: {
    backgroundColor: '#F4F7FA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5EDF4',
  },
  greetingLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  greetingName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  greetingSub: { fontSize: 12, color: COLORS.primary, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifyBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifyIcon: { fontSize: 18 },
  notifyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifyBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  profileAvatar: { borderWidth: 3, borderColor: '#FFFFFF' },
  quickStatsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  quickStatNum: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  quickStatLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  quickActionCard: { alignItems: 'center', justifyContent: 'center' },
  quickActionIcon: { fontSize: 20, marginBottom: 4 },
  quickActionText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  heroBanner: { marginTop: 14, borderRadius: 18, overflow: 'hidden' },
  heroBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  heroBannerText: { flex: 1 },
  heroBannerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  heroBannerArrow: { fontSize: 32, color: '#fff', opacity: 0.8 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 18,
    paddingBottom: 14,
  },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text },
  sectionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  sectionAction: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 36,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  emptyActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  emptyPrimaryBtn: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  emptyPrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emptySecondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptySecondaryText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  suggestedEmpty: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  suggestedEmptyText: { fontSize: 13, color: COLORS.textMuted },
});
