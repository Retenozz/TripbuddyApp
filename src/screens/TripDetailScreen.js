import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { fmtDate, nightsBetween } from '../constants/data';
import MemberAvatar from '../components/MemberAvatar';
import BottomSheet, { FieldRow, SheetBtn } from '../components/BottomSheet';
import CalendarPicker from '../components/CalendarPicker';
import ItineraryTab from './tabs/ItineraryTab';
import ExpensesTab from './tabs/ExpensesTab';
import VoteTab from './tabs/VoteTab';
import ChatTab from './tabs/ChatTab';
import MapTab from './tabs/MapTab';
import { calculatePlanningProgress, getTripRole } from '../utils/tripUtils';

const DTABS = [
  { id: 'plan', icon: '🗓️', label: 'แผนการ' },
  { id: 'expense', icon: '💸', label: 'ค่าใช้จ่าย' },
  { id: 'map', icon: '🗺️', label: 'แผนที่' },
  { id: 'vote', icon: '🗳️', label: 'โหวต' },
  { id: 'chat', icon: '💬', label: 'แชท' },
];

export default function TripDetailScreen({
  trip,
  onBack,
  currentUser,
  onToast,
  onShareTrip,    // แชร์เป็น public template → ไปอยู่ในทริปแนะนำ
  onJoinTrip,     // ใช้ invite code เข้าร่วมทริปนี้ (เฉพาะตอน role === 'guest')
  onUpdateTrip,
  onDeleteTrip,
}) {
  const [tab, setTab] = useState('plan');
  const insets = useSafeAreaInsets();
  const [showManage, setShowManage] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false); // sheet เชิญเพื่อนด้วย invite code
  const [showShareSheet, setShowShareSheet] = useState(false);   // sheet แชร์เป็น template สาธารณะ
  const [showStartCal, setShowStartCal] = useState(false);
  const [showEndCal, setShowEndCal] = useState(false);
  const [shareInfo, setShareInfo] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [editForm, setEditForm] = useState({
    name: trip.name,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    coverPhoto: trip.coverPhoto || '',
  });

  useEffect(() => {
    setEditForm({
      name: trip.name,
      description: trip.description,
      startDate: trip.startDate,
      endDate: trip.endDate,
      coverPhoto: trip.coverPhoto || '',
    });
  }, [trip.coverPhoto, trip.description, trip.endDate, trip.name, trip.startDate]);

  const role = getTripRole(trip, currentUser.id);
  const canManage = role === 'owner';
  const progress = useMemo(() => calculatePlanningProgress(trip), [trip]);
  const nights = nightsBetween(trip.startDate, trip.endDate);

  const setEditField = (key, value) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const saveTrip = () => {
    if (!editForm.name.trim()) { onToast?.('กรุณาใส่ชื่อทริป', 'error'); return; }
    if (!editForm.startDate || !editForm.endDate || editForm.startDate > editForm.endDate) {
      onToast?.('วันที่ทริปไม่ถูกต้อง', 'error'); return;
    }
    onUpdateTrip?.(trip.id, {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      coverPhoto: editForm.coverPhoto.trim(),
    });
    setShowManage(false);
    onToast?.('อัปเดตข้อมูลทริปแล้ว', 'success');
  };

  // ─── คัดลอก Invite Link (เชิญเพื่อนร่วมทริป) ───────────────────────────
  const handleCopyInviteLink = async () => {
    const link = `https://tripbuddy.app/join/${trip.inviteCode}`;
    await Clipboard.setStringAsync(link);
    setInviteCopied(true);
    onToast?.('คัดลอกลิงก์เชิญแล้ว! ส่งให้เพื่อนที่ LINE ได้เลย 🔗', 'success');
    setTimeout(() => setInviteCopied(false), 2500);
  };

  // ─── แชร์เป็น Public Template ───────────────────────────────────────────
  const handlePublishTemplate = async () => {
    const result = await onShareTrip?.(trip);
    if (!result) return;
    setShareInfo(result);
    setShowShareSheet(true);
    onToast?.(`แชร์ ${trip.name} ไปยังทริปแนะนำแล้ว!`, 'success');
  };

  const handleCopyShareLink = async () => {
    if (!shareInfo?.shareUrl) return;
    await Clipboard.setStringAsync(shareInfo.shareUrl);
    onToast?.('คัดลอกลิงก์เทมเพลตแล้ว', 'success');
  };

  const renderTab = () => {
    const commonProps = { trip, currentUser, onToast, onUpdateTrip };
    if (tab === 'plan') return <ItineraryTab {...commonProps} />;
    if (tab === 'expense') return <ExpensesTab {...commonProps} />;
    if (tab === 'map') return <MapTab {...commonProps} />;
    if (tab === 'vote') return <VoteTab {...commonProps} />;
    return <ChatTab {...commonProps} />;
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      {/* ── Hero Header ── */}
      <LinearGradient
        colors={[COLORS.gradStart, COLORS.gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.85}>
          <View style={styles.backBtn}><Text style={styles.backArrow}>←</Text></View>
          <Text style={styles.backTxt}>กลับ</Text>
        </TouchableOpacity>

        <View style={styles.heroMain}>
          <Text style={styles.heroEmoji}>{trip.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{trip.name}</Text>
            <Text style={styles.heroMeta}>📅 {fmtDate(trip.startDate)} · 🌙 {nights} คืน</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {role === 'owner' ? '👑 Owner' : role === 'member' ? '🙋 Member' : '👀 Guest'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroFoot}>
          <View style={styles.memberStack}>
            {trip.members.slice(0, 5).map((m, i) => (
              <MemberAvatar
                key={m.id} name={m.name} color={m.color} size={30}
                style={{ marginLeft: i === 0 ? 0 : -8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}
              />
            ))}
            <Text style={styles.memberCnt}>{trip.members.length} คน</Text>
          </View>

          <View style={styles.heroActions}>
            {/* Guest: ปุ่ม Join (ใช้ invite code เข้าร่วม) */}
            {role === 'guest' && (
              <TouchableOpacity style={styles.heroActionBtn} onPress={() => onJoinTrip?.(trip)} activeOpacity={0.85}>
                <Text style={styles.heroActionTxt}>🔑 Join</Text>
              </TouchableOpacity>
            )}
            {/* Member/Owner: ปุ่มเชิญเพื่อน */}
            {role !== 'guest' && (
              <TouchableOpacity style={styles.heroActionBtn} onPress={() => setShowInviteSheet(true)} activeOpacity={0.85}>
                <Text style={styles.heroActionTxt}>🔗 เชิญ</Text>
              </TouchableOpacity>
            )}
            {/* Owner: แชร์เป็น template + Manage */}
            {canManage && (
              <>
                <TouchableOpacity style={styles.heroActionBtn} onPress={handlePublishTemplate} activeOpacity={0.85}>
                  <Text style={styles.heroActionTxt}>📢 แชร์</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroActionBtn} onPress={() => setShowManage(true)} activeOpacity={0.85}>
                  <Text style={styles.heroActionTxt}>⚙️</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ── Meta strip ── */}
      <View style={styles.metaStrip}>
        <View>
          <Text style={styles.metaLabel}>Invite code</Text>
          <Text style={styles.metaValue}>{trip.inviteCode}</Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>Planning</Text>
          <Text style={styles.metaValue}>{progress.value}%</Text>
        </View>
        {trip.sharedAt && (
          <View>
            <Text style={styles.metaLabel}>เทมเพลตสาธารณะ</Text>
            <Text style={[styles.metaValue, { color: '#1a7a4a' }]}>✅ แชร์แล้ว</Text>
          </View>
        )}
      </View>

      {/* ── Tabs ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll} contentContainerStyle={styles.tabsCont}
      >
        {DTABS.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => setTab(item.id)}
            style={[styles.dtab, tab === item.id && styles.dtabOn]}
            activeOpacity={0.85}
          >
            {tab === item.id ? (
              <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.dtabGrad}>
                <Text style={styles.dtabTxtOn}>{item.icon} {item.label}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.dtabTxt}>{item.icon} {item.label}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'chat' ? (
        <View style={styles.body}>
          {renderTab()}
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyCont}>
          {renderTab()}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════
          BOTTOM SHEET: เชิญเพื่อนร่วมทริป (Invite)
          เป็นคนละเรื่องกับการ "แชร์เป็น template"
      ════════════════════════════════════════ */}
      <BottomSheet
        visible={showInviteSheet}
        onClose={() => setShowInviteSheet(false)}
        title="เชิญเพื่อนเข้าทริป 🔑"
        snapHeight="60%"
      >
        <View style={styles.inviteInfoCard}>
          <Text style={styles.inviteInfoTitle}>Invite Code</Text>
          <Text style={styles.inviteCode}>{trip.inviteCode}</Text>
          <Text style={styles.inviteLink}>
            tripbuddy.app/join/{trip.inviteCode}
          </Text>
          <Text style={styles.inviteDesc}>
            เพื่อนที่กรอกรหัสหรือกดลิงก์นี้จะ{' '}
            <Text style={{ fontWeight: '800', color: COLORS.primary }}>
              เข้าร่วมทริปนี้จริงๆ
            </Text>
            {' '}และเห็นแชท ค่าใช้จ่าย โหวตร่วมกันได้
          </Text>
        </View>

        <SheetBtn
          onPress={handleCopyInviteLink}
          label={inviteCopied ? '✅ คัดลอกแล้ว!' : '📋 คัดลอกลิงก์เชิญ'}
        />

        <View style={styles.memberListBox}>
          <Text style={styles.memberListTitle}>สมาชิกปัจจุบัน ({trip.members.length} คน)</Text>
          {trip.members.map((m) => (
            <View key={m.id} style={styles.memberListRow}>
              <MemberAvatar name={m.name} color={m.color} size={32} />
              <Text style={styles.memberListName}>{m.name}</Text>
              <View style={[styles.memberRolePill, m.role === 'owner' && styles.memberRolePillOwner]}>
                <Text style={[styles.memberRoleTxt, m.role === 'owner' && styles.memberRoleTxtOwner]}>
                  {m.role === 'owner' ? 'Owner' : 'Member'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </BottomSheet>

      {/* ════════════════════════════════════════
          BOTTOM SHEET: แชร์เป็น Public Template
          คนอื่นจะเห็นในทริปแนะนำและนำไปใช้เป็น template ได้
          ไม่ใช่การ join เข้าทริปต้นฉบับ
      ════════════════════════════════════════ */}
      <BottomSheet
        visible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="แชร์แผนเที่ยวสาธารณะ 📢"
        snapHeight="60%"
      >
        <View style={styles.shareInfoCard}>
          <Text style={styles.shareInfoTitle}>แผนนี้ถูกแชร์เป็นสาธารณะแล้ว</Text>
          <Text style={styles.shareInfoDesc}>
            คนอื่นจะเห็นทริปนี้ในหน้า "ทริปแนะนำ" และสามารถ{' '}
            <Text style={{ fontWeight: '800' }}>คัดลอกไปเป็นทริปของตัวเองได้</Text>
            {'\n\n'}
            <Text style={{ color: COLORS.danger, fontWeight: '700' }}>
              ⚠️ การแชร์นี้ไม่ได้เชิญใครเข้าทริปต้นฉบับ
            </Text>
            {'\n'}หากต้องการเชิญเพื่อนเข้าร่วมทริปนี้จริงๆ ให้ใช้ปุ่ม "เชิญ" แทน
          </Text>
        </View>

        <FieldRow label="ลิงก์เทมเพลต">
          <View style={styles.shareLinkBox}>
            <Text style={styles.shareLinkText}>{shareInfo?.shareUrl || '-'}</Text>
          </View>
        </FieldRow>

        <SheetBtn onPress={handleCopyShareLink} label="📋 คัดลอกลิงก์เทมเพลต" />
      </BottomSheet>

      {/* ── Manage Trip ── */}
      <BottomSheet visible={showManage} onClose={() => setShowManage(false)} title="จัดการทริป">
        <FieldRow label="ชื่อทริป">
          <TextInput
            style={styles.sheetInput}
            value={editForm.name}
            onChangeText={(v) => setEditField('name', v)}
            placeholder="ชื่อทริป"
            placeholderTextColor={COLORS.textMuted}
          />
        </FieldRow>
        <FieldRow label="คำอธิบาย">
          <TextInput
            style={[styles.sheetInput, styles.sheetTextarea]}
            value={editForm.description}
            onChangeText={(v) => setEditField('description', v)}
            placeholder="รายละเอียดทริป"
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
        </FieldRow>
        <FieldRow label="วันเริ่ม / วันกลับ">
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBox} onPress={() => setShowStartCal(true)} activeOpacity={0.85}>
              <Text style={styles.dateBoxLabel}>เริ่ม</Text>
              <Text style={styles.dateBoxValue}>{fmtDate(editForm.startDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBox} onPress={() => setShowEndCal(true)} activeOpacity={0.85}>
              <Text style={styles.dateBoxLabel}>กลับ</Text>
              <Text style={styles.dateBoxValue}>{fmtDate(editForm.endDate)}</Text>
            </TouchableOpacity>
          </View>
        </FieldRow>
        <FieldRow label="รูปปก (URL)">
          <TextInput
            style={styles.sheetInput}
            value={editForm.coverPhoto}
            onChangeText={(v) => setEditField('coverPhoto', v)}
            placeholder="https://..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
        </FieldRow>
        <SheetBtn onPress={saveTrip} label="บันทึกการเปลี่ยนแปลง" />
        <TouchableOpacity
          onPress={() => { setShowManage(false); onDeleteTrip?.(trip.id); }}
          activeOpacity={0.85}
          style={styles.deleteTripBtn}
        >
          <Text style={styles.deleteTripTxt}>ลบทริปนี้</Text>
        </TouchableOpacity>
        <CalendarPicker visible={showStartCal} onClose={() => setShowStartCal(false)} onSelect={(v) => setEditField('startDate', v)} selectedDate={editForm.startDate} title="เลือกวันเริ่ม" />
        <CalendarPicker visible={showEndCal} onClose={() => setShowEndCal(false)} onSelect={(v) => setEditField('endDate', v)} selectedDate={editForm.endDate} minDate={editForm.startDate} title="เลือกวันกลับ" />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingHorizontal: 20, paddingBottom: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 16, color: '#fff', fontWeight: '700' },
  backTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  heroEmoji: { fontSize: 44 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroMeta: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  roleBadge: { alignSelf: 'flex-start', marginTop: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberStack: { flexDirection: 'row', alignItems: 'center' },
  memberCnt: { marginLeft: 10, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroActionBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  heroActionTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  metaStrip: {
    backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 20, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  metaLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  tabsScroll: { flexShrink: 0, maxHeight: 56 },
  tabsCont: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  dtab: { borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden' },
  dtabOn: { borderColor: 'transparent' },
  dtabGrad: { paddingVertical: 7, paddingHorizontal: 14 },
  dtabTxt: { paddingVertical: 7, paddingHorizontal: 14, fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  dtabTxtOn: { fontSize: 13, color: '#fff', fontWeight: '700' },
  body: { flex: 1 },
  bodyCont: { padding: 16, paddingBottom: 32 },
  bodyChatWrap: { flex: 1 },

  // Invite sheet
  inviteInfoCard: { backgroundColor: '#EEF6FF', borderRadius: 16, padding: 18, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: '#C8E0F8' },
  inviteInfoTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  inviteCode: { fontSize: 30, fontWeight: '800', color: COLORS.primary, letterSpacing: 6, marginBottom: 4 },
  inviteLink: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  inviteDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  memberListBox: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginTop: 12 },
  memberListTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  memberListRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  memberListName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  memberRolePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.bgMuted },
  memberRolePillOwner: { backgroundColor: '#FFF3E0' },
  memberRoleTxt: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  memberRoleTxtOwner: { color: '#E67E00' },

  // Share template sheet
  shareInfoCard: { backgroundColor: '#F0FBF6', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#A8E6C8' },
  shareInfoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  shareInfoDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  shareLinkBox: { borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', padding: 14 },
  shareLinkText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },

  // Manage sheet
  sheetInput: { backgroundColor: COLORS.bgInput, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: COLORS.text },
  sheetTextarea: { minHeight: 80, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBox: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12 },
  dateBoxLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  dateBoxValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  deleteTripBtn: { marginTop: 12, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.danger, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FEF2F2' },
  deleteTripTxt: { fontSize: 14, fontWeight: '700', color: COLORS.danger },
});
