import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { fmtDate, fmtDateShort, getCalendarDays } from '../constants/data';
import MemberAvatar from '../components/MemberAvatar';

const CALENDAR_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const CALENDAR_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const formatDateKey = (year, month, day) => (
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
);

const getTripStatusLabel = (trip, dateKey) => {
  if (trip.startDate === dateKey && trip.endDate === dateKey) return 'ไป-กลับวันเดียว';
  if (trip.startDate === dateKey) return 'วันเริ่มทริป';
  if (trip.endDate === dateKey) return 'วันกลับ';
  return 'อยู่ในทริป';
};

export default function TripCalendarScreen({
  trips,
  focusTrip,
  onBack,
  onOpenTrip,
  onCreateFromDate,
}) {
  const initialDate = focusTrip?.startDate ? new Date(focusTrip.startDate) : new Date();
  const insets = useSafeAreaInsets();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    focusTrip?.startDate || formatDateKey(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate()),
  );

  const days = getCalendarDays(viewYear, viewMonth);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const tripsByDate = useMemo(() => {
    const map = {};

    trips.forEach((trip) => {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);

      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const key = formatDateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        if (!map[key]) map[key] = [];
        map[key].push(trip);
      }
    });

    return map;
  }, [trips]);

  const monthStats = useMemo(() => {
    let busyDays = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = formatDateKey(viewYear, viewMonth, day);
      if ((tripsByDate[key] || []).length > 0) busyDays += 1;
    }

    return {
      busyDays,
      freeDays: Math.max(0, daysInMonth - busyDays),
    };
  }, [daysInMonth, tripsByDate, viewMonth, viewYear]);

  const selectedTrips = tripsByDate[selectedDate] || [];
  const selectedDayIsFree = selectedTrips.length === 0;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }
    setViewMonth((month) => month - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }
    setViewMonth((month) => month + 1);
  };

  const renderCell = (day, index) => {
    if (!day) {
      return <View key={`blank-${index}`} style={styles.cell} />;
    }

    const dateKey = formatDateKey(viewYear, viewMonth, day);
    const dayTrips = tripsByDate[dateKey] || [];
    const isSelected = selectedDate === dateKey;
    const isBusy = dayTrips.length > 0;
    const isFocusDay = !!focusTrip && dayTrips.some((trip) => trip.id === focusTrip.id);

    return (
      <TouchableOpacity
        key={dateKey}
        style={styles.cell}
        activeOpacity={0.8}
        onPress={() => setSelectedDate(dateKey)}
      >
        <View
          style={[
            styles.cellInner,
            isBusy && styles.cellBusy,
            isFocusDay && styles.cellFocus,
            isSelected && styles.cellSelected,
          ]}
        >
          <Text
            style={[
              styles.cellText,
              isBusy && styles.cellBusyText,
              isSelected && styles.cellSelectedText,
            ]}
          >
            {day}
          </Text>
          <View style={styles.dotRow}>
            {isBusy ? (
              dayTrips.slice(0, 3).map((trip) => (
                <View
                  key={`${trip.id}-${dateKey}`}
                  style={[
                    styles.dot,
                    trip.id === focusTrip?.id ? styles.dotFocus : styles.dotNormal,
                    isSelected && styles.dotSelected,
                  ]}
                />
              ))
            ) : (
              <View style={styles.freeDot} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <LinearGradient
        colors={[COLORS.gradStart, COLORS.gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.8}>
          <View style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </View>
          <Text style={styles.backText}>กลับหน้าหลัก</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>ปฏิทินทริป</Text>
        <Text style={styles.headerSub}>ดูวันติดทริป วันว่าง และสร้างทริปใหม่จากวันที่ว่างได้ทันที</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <View>
              <Text style={styles.summaryLabel}>เดือนที่ดูอยู่</Text>
              <Text style={styles.summaryMonth}>{CALENDAR_MONTHS[viewMonth]} {viewYear + 543}</Text>
            </View>

            <View style={styles.summaryStats}>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{monthStats.busyDays}</Text>
                <Text style={styles.statLabel}>วันมีทริป</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{monthStats.freeDays}</Text>
                <Text style={styles.statLabel}>วันว่าง</Text>
              </View>
            </View>
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.8}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{CALENDAR_MONTHS[viewMonth]} {viewYear + 543}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.8}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dayLabelRow}>
            {CALENDAR_DAYS.map((dayName) => (
              <Text key={dayName} style={styles.dayLabel}>{dayName}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day, index) => renderCell(day, index))}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotFocus]} />
              <Text style={styles.legendText}>ทริปที่เลือก</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotNormal]} />
              <Text style={styles.legendText}>มีทริป</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendFreeDot} />
              <Text style={styles.legendText}>วันว่าง</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>วันที่เลือก</Text>
          <Text style={styles.detailDate}>{fmtDate(selectedDate)}</Text>

          {selectedDayIsFree ? (
            <View style={styles.freeDayCard}>
              <Text style={styles.freeDayTitle}>วันนี้ยังว่างอยู่</Text>
              <Text style={styles.freeDayText}>คุณยังไม่มีทริปในวันนี้ สามารถสร้างทริปใหม่โดยใช้วันนี้เป็นวันเริ่มต้นได้เลย</Text>
              <TouchableOpacity onPress={() => onCreateFromDate?.(selectedDate)} activeOpacity={0.85}>
                <LinearGradient
                  colors={[COLORS.gradStart, COLORS.gradEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createBtn}
                >
                  <Text style={styles.createBtnText}>สร้างทริปจากวันนี้</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            selectedTrips.map((trip) => (
              <View key={`${selectedDate}-${trip.id}`} style={styles.tripDayCard}>
                <View style={styles.tripDayTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripDayName}>{trip.emoji} {trip.name}</Text>
                    <Text style={styles.tripDayMeta}>
                      {getTripStatusLabel(trip, selectedDate)} · {fmtDateShort(trip.startDate)} - {fmtDateShort(trip.endDate)}
                    </Text>
                  </View>
                  <View style={styles.tripDayCode}>
                    <Text style={styles.tripDayCodeText}>{trip.inviteCode}</Text>
                  </View>
                </View>

                <View style={styles.memberRow}>
                  <View style={styles.avatarRow}>
                    {trip.members.slice(0, 4).map((member, index) => (
                      <MemberAvatar
                        key={`${trip.id}-${member.id}`}
                        name={member.name}
                        color={member.color}
                        size={28}
                        style={{
                          marginLeft: index === 0 ? 0 : -8,
                          borderWidth: 2,
                          borderColor: '#FFFFFF',
                        }}
                      />
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.openTripBtn}
                    onPress={() => onOpenTrip?.(trip)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.openTripText}>ดูรายละเอียด</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 0, paddingHorizontal: 20, paddingBottom: 22 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.84)', fontWeight: '600' },
  headerTitle: { fontSize: 24, color: '#FFFFFF', fontWeight: '800', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 18 },
  content: { padding: 16, paddingBottom: 28 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16,
  },
  summaryHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', marginBottom: 4 },
  summaryMonth: { fontSize: 20, color: COLORS.text, fontWeight: '800' },
  summaryStats: { flexDirection: 'row', gap: 8 },
  statChip: {
    backgroundColor: COLORS.bgMuted,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 76,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 24, color: COLORS.primary, fontWeight: '700', lineHeight: 28 },
  monthLabel: { fontSize: 16, color: COLORS.text, fontWeight: '800' },
  dayLabelRow: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, padding: 3 },
  cellInner: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#F7FBFE',
    borderWidth: 1,
    borderColor: '#EDF4F8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cellBusy: { backgroundColor: '#EAF6FF', borderColor: '#CFE6F5' },
  cellFocus: { backgroundColor: '#D7EEFF', borderColor: COLORS.primary },
  cellSelected: { borderWidth: 2, borderColor: COLORS.primary },
  cellText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  cellBusyText: { color: COLORS.primary, fontWeight: '800' },
  cellSelectedText: { color: COLORS.text, fontWeight: '800' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotNormal: { backgroundColor: '#6EC4F5' },
  dotFocus: { backgroundColor: COLORS.primary },
  dotSelected: { backgroundColor: COLORS.text },
  freeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#D3E0E9' },
  legendRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendFreeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D3E0E9' },
  legendText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16,
  },
  detailLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', marginBottom: 4 },
  detailDate: { fontSize: 20, color: COLORS.text, fontWeight: '800', marginBottom: 14 },
  freeDayCard: {
    borderRadius: 18,
    backgroundColor: '#F7FBFE',
    borderWidth: 1,
    borderColor: '#E4EFF7',
    padding: 16,
  },
  freeDayTitle: { fontSize: 16, color: COLORS.text, fontWeight: '700', marginBottom: 6 },
  freeDayText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 14 },
  createBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  tripDayCard: {
    borderRadius: 18,
    backgroundColor: '#F7FBFE',
    borderWidth: 1,
    borderColor: '#E4EFF7',
    padding: 16,
    marginBottom: 10,
  },
  tripDayTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  tripDayName: { fontSize: 16, color: COLORS.text, fontWeight: '800', marginBottom: 4 },
  tripDayMeta: { fontSize: 12, color: COLORS.textMuted },
  tripDayCode: { backgroundColor: COLORS.bgMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tripDayCodeText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatarRow: { flexDirection: 'row' },
  openTripBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  openTripText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
});
