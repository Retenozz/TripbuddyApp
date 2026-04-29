import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { fmtDateShort, nightsBetween } from '../constants/data';

const SHARED_CARD_GRADIENTS = [
  [COLORS.gradStart, COLORS.gradEnd],
  [COLORS.primary, COLORS.primary2],
  [COLORS.gradMid, COLORS.accent],
  [COLORS.dark2, COLORS.primary2],
];

export default function ExploreScreen({ onBack, onCreateWithDest, sharedTrips = [], onSelectSharedTrip }) {
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  // กรอง sharedTrips ตาม search query
  const filteredTrips = sharedTrips.filter((trip) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      trip.name?.toLowerCase().includes(q) ||
      trip.description?.toLowerCase().includes(q) ||
      trip.sharedBy?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ทริปแนะนำ</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchIn}
            placeholder="ค้นหาทริป ชื่อ หรือเจ้าของ..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ fontSize: 16, color: COLORS.textMuted }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Shared trips list */}
      <ScrollView contentContainerStyle={styles.content}>
        {sharedTrips.length === 0 ? (
          <View style={styles.emptyShared}>
            <Text style={styles.emptyIcon}>🌍</Text>
            <Text style={styles.emptyTitle}>ยังไม่มีทริปที่แชร์</Text>
            <Text style={styles.emptySub}>
              {'เมื่อคุณหรือเพื่อนกด "แชร์ทริป"\nจะมาปรากฏที่นี่เพื่อเป็นแรงบันดาลใจ'}
            </Text>
          </View>
        ) : filteredTrips.length === 0 ? (
          <View style={styles.emptyShared}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>ไม่พบทริปที่ตรงกับคำค้นหา</Text>
            <Text style={styles.emptySub}>ลองพิมพ์ชื่อทริปหรือชื่อเจ้าของใหม่อีกครั้ง</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 4 }]}>
              🌟 ทริปที่คนแชร์ ({filteredTrips.length}{search ? ` จาก ${sharedTrips.length}` : ''})
            </Text>
            {filteredTrips.map((trip, i) => {
              const nights = nightsBetween(trip.startDate, trip.endDate);
              const grad = SHARED_CARD_GRADIENTS[i % SHARED_CARD_GRADIENTS.length];
              const itineraryCount = (trip.itinerary || []).reduce((s, d) => s + (d.items?.length || 0), 0);
              const expenseTotal = (trip.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
              return (
                <View key={trip.id + i} style={styles.sharedCard}>
                  <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sharedGrad}>
                    <View style={styles.sharedTop}>
                      <Text style={styles.sharedEmoji}>{trip.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sharedName}>{trip.name}</Text>
                        <Text style={styles.sharedDate}>
                          📅 {fmtDateShort(trip.startDate)} – {fmtDateShort(trip.endDate)}
                        </Text>
                      </View>
                      <View style={styles.nightBadge}>
                        <Text style={styles.nightBadgeTxt}>
                          {nights > 0 ? `${nights} คืน` : 'day trip'}
                        </Text>
                      </View>
                    </View>
                    {trip.description ? (
                      <Text style={styles.sharedDesc}>{trip.description}</Text>
                    ) : null}

                    <View style={styles.sharedStats}>
                      {itineraryCount > 0 && (
                        <View style={styles.sharedStatChip}>
                          <Text style={styles.sharedStatTxt}>🗃️ {itineraryCount} กิจกรรม</Text>
                        </View>
                      )}
                      {(trip.places?.length || 0) > 0 && (
                        <View style={styles.sharedStatChip}>
                          <Text style={styles.sharedStatTxt}>📍 {trip.places.length} สถานที่</Text>
                        </View>
                      )}
                      {expenseTotal > 0 && (
                        <View style={styles.sharedStatChip}>
                          <Text style={styles.sharedStatTxt}>💰 {expenseTotal.toLocaleString()} บ.</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.sharedFoot}>
                      <View style={styles.sharedMembers}>
                        {trip.members.slice(0, 4).map((m, mi) => (
                          <View
                            key={mi}
                            style={[styles.sharedAv, { backgroundColor: m.color, marginLeft: mi === 0 ? 0 : -6 }]}
                          >
                            <Text style={styles.sharedAvTxt}>{m.name[0]}</Text>
                          </View>
                        ))}
                        <Text style={styles.sharedMemberCnt}>{trip.members.length} คน</Text>
                      </View>
                      <View style={styles.sharedByBadge}>
                        <Text style={styles.sharedByTxt}>📤 {trip.sharedBy}</Text>
                      </View>
                    </View>
                  </LinearGradient>

                  <TouchableOpacity
                    style={styles.selectTripBtn}
                    onPress={() => onSelectSharedTrip?.(trip)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.selectTripBtnTxt}>✨ เลือกทริปนี้ — ได้เทมเพลตพร้อมแก้ไข</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 0, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  // top tabs
  topTabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.border },
  topTab: { flex: 1, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  topTabActive: { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  topTabTxt: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  topTabTxtActive: { color: COLORS.primary, fontWeight: '800' },
  badge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },
  // search
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1.5, borderColor: COLORS.border },
  searchIcon: { fontSize: 16 },
  searchIn: { flex: 1, fontSize: 14, color: COLORS.text },
  content: { padding: 16 },
  catRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  catChip: { borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: '#fff' },
  catChipOn: { borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  catChipTxt: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  catChipTxtOn: { fontSize: 13, color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  destCard: { width: '47%', borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  destGrad: { padding: 16, minHeight: 130 },
  destBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  destBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
  destEmoji: { fontSize: 32, marginBottom: 6 },
  destName: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  destSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  tipCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  tipIcon: { fontSize: 24, marginTop: 2 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  tipDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  // shared trips
  emptyShared: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  sharedCard: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  sharedGrad: { padding: 18 },
  sharedTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  sharedEmoji: { fontSize: 36 },
  sharedName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  sharedDate: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  nightBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  nightBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  sharedDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 10, lineHeight: 18 },
  sharedStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  sharedStatChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  sharedStatTxt: { fontSize: 11, fontWeight: '600', color: '#fff' },
  sharedFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sharedMembers: { flexDirection: 'row', alignItems: 'center' },
  sharedAv: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  sharedAvTxt: { fontSize: 9, fontWeight: '700', color: '#fff' },
  sharedMemberCnt: { marginLeft: 8, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  sharedByBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  sharedByTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  selectTripBtn: {
    backgroundColor: '#F7FBFE',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  selectTripBtnTxt: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
});
