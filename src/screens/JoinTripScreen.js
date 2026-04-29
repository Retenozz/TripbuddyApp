import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import MemberAvatar from '../components/MemberAvatar';

/**
 * JoinTripScreen
 *
 * หน้านี้มี **สองส่วนที่ต่างกันชัดเจน**:
 *
 * 1. "เข้าร่วมทริปด้วย Invite Code"
 *    - ใช้รหัสที่เจ้าของทริปแชร์ให้
 *    - เมื่อ join สำเร็จ → ผู้ใช้กลายเป็นสมาชิกทริปนั้นจริงๆ
 *    - เข้าถึงแชท ค่าใช้จ่าย โหวต ฯลฯ ร่วมกันได้
 *    - handler: onJoinByCode(code) ← เชื่อมกับ handleJoinByCode ใน App.js
 *
 * 2. "ทริปแนะนำ / เทมเพลต"
 *    - ทริปที่คนอื่น share เป็นสาธารณะ (sharedAt != null)
 *    - กด "ใช้เทมเพลต" → **คัดลอกทริปนั้นเป็นทริปใหม่ของตัวเอง** ไม่ได้ join เข้าทริปต้นฉบับ
 *    - handler: onUseTemplate(trip) ← เชื่อมกับ handleImportSharedTrip ใน App.js
 */
export default function JoinTripScreen({
  onBack,
  onJoinByCode,
  onUseTemplate,
  sharedTrips = [],
  currentUser,
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // กรองทริปที่ผู้ใช้ยังไม่ได้ join (เอาไว้แสดงเป็น template เท่านั้น)
  const templateTrips = useMemo(
    () => sharedTrips.filter(
      (trip) => !trip.members.some((m) => m.id === currentUser?.id),
    ),
    [currentUser?.id, sharedTrips],
  );

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('กรุณากรอกรหัสเชิญก่อน');
      return;
    }
    setLoading(true);
    setError('');
    const ok = await onJoinByCode?.(trimmed);
    setLoading(false);
    if (!ok) {
      setError('ไม่พบรหัสนี้ หรือคุณเป็นสมาชิกทริปนี้แล้ว');
    } else {
      setCode('');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.gradStart, COLORS.gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เข้าร่วมทริป</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── ส่วนที่ 1: Join ด้วย Invite Code ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionBadgeRow}>
            <View style={[styles.sectionBadge, { backgroundColor: '#E8F4FF' }]}>
              <Text style={styles.sectionBadgeText}>🔑 เข้าร่วมทริปเพื่อน</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>กรอก Invite Code</Text>
          <Text style={styles.sectionHint}>
            ขอรหัสจากเพื่อนที่สร้างทริป แล้วกรอกด้านล่าง{'\n'}
            เมื่อเข้าร่วมแล้วจะเห็นแชท ค่าใช้จ่าย และแผนเดินทางร่วมกันได้เลย
          </Text>

          <TextInput
            style={styles.codeInput}
            placeholder="เช่น CM2025X"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(v) => { setCode(v); if (error) setError(''); }}
            onSubmitEditing={handleJoin}
          />

          {!!error && <Text style={styles.errorText}>⚠️ {error}</Text>}

          <TouchableOpacity onPress={handleJoin} activeOpacity={0.85} disabled={loading}>
            <LinearGradient
              colors={[COLORS.gradStart, COLORS.gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.joinBtn, loading && { opacity: 0.6 }]}
            >
              <Text style={styles.joinBtnText}>
                {loading ? 'กำลังเข้าร่วม...' : '🚀 เข้าร่วมทริป'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>หรือ</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── ส่วนที่ 2: ทริปแนะนำ / เทมเพลต ── */}
        <View style={styles.sectionBadgeRow}>
          <View style={[styles.sectionBadge, { backgroundColor: '#F0FBF6' }]}>
            <Text style={styles.sectionBadgeText}>🗺️ ทริปแนะนำ (เทมเพลต)</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>แผนเที่ยวที่คนอื่นแชร์ไว้</Text>
        <Text style={styles.sectionHint}>
          นำไปใช้เป็นต้นแบบวางแผนทริปของตัวเองได้เลย{'\n'}
          <Text style={{ color: COLORS.danger, fontWeight: '700' }}>
            ⚠️ การใช้เทมเพลต ≠ การเข้าร่วมทริปนั้น
          </Text>
          {'\n'}ถ้าจะร่วมทริปเพื่อนจริงๆ ให้ใช้รหัสเชิญด้านบน
        </Text>

        {templateTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>ยังไม่มีเทมเพลตทริปในตอนนี้</Text>
            <Text style={styles.emptyText}>
              เมื่อเพื่อนหรือคนอื่นแชร์แผนเที่ยวสาธารณะ จะปรากฏที่นี่
            </Text>
          </View>
        ) : (
          templateTrips.map((trip) => (
            <TemplateTripCard
              key={trip.id}
              trip={trip}
              onUseTemplate={() => onUseTemplate?.(trip)}
            />
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function TemplateTripCard({ trip, onUseTemplate }) {
  return (
    <View style={styles.tripCard}>
      <View style={styles.tripTop}>
        <Text style={styles.tripEmoji}>{trip.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripName}>{trip.name}</Text>
          <Text style={styles.tripDesc} numberOfLines={2}>
            {trip.description || 'แผนเที่ยวแชร์โดยชุมชน'}
          </Text>
        </View>
        {/* แสดง sharedBy แทน inviteCode เพื่อไม่ให้สับสน */}
        <View style={styles.sharedByPill}>
          <Text style={styles.sharedByText}>
            โดย {trip.sharedBy || trip.ownerName || 'TripBuddy'}
          </Text>
        </View>
      </View>

      <View style={styles.tripFoot}>
        <View style={styles.avatarRow}>
          {trip.members.slice(0, 4).map((m, i) => (
            <MemberAvatar
              key={m.id}
              name={m.name}
              color={m.color}
              size={26}
              style={{ marginLeft: i === 0 ? 0 : -8, borderWidth: 2, borderColor: '#fff' }}
            />
          ))}
          <Text style={styles.memberCount}>{trip.members.length} คน</Text>
        </View>

        <TouchableOpacity
          onPress={onUseTemplate}
          style={styles.templateBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.templateBtnText}>ใช้เป็นเทมเพลต</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

  content: { padding: 16, paddingBottom: 40 },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 8,
  },
  sectionBadgeRow: { flexDirection: 'row', marginBottom: 10 },
  sectionBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  sectionHint: {
    fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 14,
  },

  codeInput: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 10,
  },
  errorText: { fontSize: 12, color: COLORS.danger, marginBottom: 10 },
  joinBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  joinBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },

  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 10,
  },
  tripTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  tripEmoji: { fontSize: 30 },
  tripName: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  tripDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  sharedByPill: {
    backgroundColor: '#F0FBF6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  sharedByText: { fontSize: 10, fontWeight: '700', color: '#1a7a4a' },

  tripFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  memberCount: { marginLeft: 8, fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  templateBtn: {
    backgroundColor: '#F0FBF6',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A8E6C8',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  templateBtnText: { fontSize: 12, fontWeight: '700', color: '#1a7a4a' },
});
