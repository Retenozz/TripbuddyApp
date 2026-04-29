import React from 'react';
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

const TYPE_LABELS = {
  success: 'สำเร็จ',
  info: 'อัปเดต',
  warning: 'เตือน',
};

export default function NotificationScreen({
  notifications,
  onBack,
  onMarkAllRead,
  onClearAll,
  onOpenTrip,
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <LinearGradient
        colors={[COLORS.gradStart, COLORS.gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onMarkAllRead} activeOpacity={0.85}>
          <Text style={styles.actionText}>อ่านทั้งหมด</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onClearAll} activeOpacity={0.85}>
          <Text style={styles.actionText}>ล้างรายการ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!notifications.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>ยังไม่มีการแจ้งเตือน</Text>
            <Text style={styles.emptyText}>เมื่อมีการสร้างทริป แก้แผน หรือมีคนเข้าร่วมทริป รายการจะมาแสดงที่นี่</Text>
          </View>
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => item.tripId && onOpenTrip?.(item.tripId)}
              activeOpacity={item.tripId ? 0.85 : 1}
            >
              <View style={styles.cardTop}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{TYPE_LABELS[item.type] || 'แจ้งเตือน'}</Text>
                </View>
                <Text style={styles.timeText}>{item.timeLabel}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardText}>{item.body}</Text>
              {item.tripName ? <Text style={styles.tripText}>Trip: {item.tripName}</Text> : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 10,
  },
  cardUnread: {
    borderColor: COLORS.primary,
    backgroundColor: '#F4FAFF',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.bgMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  tripText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
