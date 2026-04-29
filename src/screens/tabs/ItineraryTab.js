import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, CATEGORY_COLORS } from '../../constants/theme';
import BottomSheet, { FieldRow, SheetBtn } from '../../components/BottomSheet';
import CalendarPicker from '../../components/CalendarPicker';
import { fmtDate } from '../../constants/data';
import { uid } from '../../utils/tripUtils';

const CATS = ['✈️ เดินทาง', '🏨 ที่พัก', '🍜 อาหาร', '🛍️ ชอปปิง', '⛩️ วัด', '🎭 บันเทิง', '🌿 ธรรมชาติ'];
const TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export default function ItineraryTab({ trip, onUpdateTrip, onToast }) {
  const [showActivitySheet, setShowActivitySheet] = useState(false);
  const [showDaySheet, setShowDaySheet] = useState(false);
  const [showDayDatePicker, setShowDayDatePicker] = useState(false);
  const [targetDayId, setTargetDayId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [dayForm, setDayForm] = useState({ dayName: '', date: '' });
  const [activityForm, setActivityForm] = useState({ time: '09:00', title: '', desc: '', cat: '✈️ เดินทาง' });

  const itinerary = useMemo(() => trip.itinerary || [], [trip.itinerary]);

  const resetActivity = () => {
    setActivityForm({ time: '09:00', title: '', desc: '', cat: '✈️ เดินทาง' });
    setEditingItemId(null);
  };

  const openAddActivity = (dayId) => {
    setTargetDayId(dayId);
    resetActivity();
    setShowActivitySheet(true);
  };

  const openEditActivity = (dayId, item) => {
    setTargetDayId(dayId);
    setEditingItemId(item.id);
    setActivityForm({ time: item.time, title: item.title, desc: item.desc, cat: item.cat });
    setShowActivitySheet(true);
  };

  const saveActivity = () => {
    if (!activityForm.title.trim()) { onToast?.('กรุณากรอกชื่อกิจกรรม', 'error'); return; }
    onUpdateTrip?.(trip.id, (prevTrip) => ({
      itinerary: (prevTrip.itinerary || []).map((day) => {
        if (day.id !== targetDayId) return day;
        const updatedItem = {
          id: editingItemId || uid('item'),
          time: activityForm.time,
          title: activityForm.title.trim(),
          desc: activityForm.desc.trim(),
          cat: activityForm.cat,
        };
        const items = editingItemId
          ? day.items.map((item) => (item.id === editingItemId ? updatedItem : item))
          : [...day.items, updatedItem];
        return { ...day, items: [...items].sort((a, b) => a.time.localeCompare(b.time)) };
      }),
    }));
    setShowActivitySheet(false);
    onToast?.(editingItemId ? 'แก้ไขกิจกรรมแล้ว' : 'เพิ่มกิจกรรมแล้ว', 'success');
    resetActivity();
  };

  const deleteActivity = (dayId, itemId) => {
    Alert.alert('ลบกิจกรรม', 'ต้องการลบกิจกรรมนี้ใช่ไหม', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: () => {
        onUpdateTrip?.(trip.id, (prevTrip) => ({
          itinerary: (prevTrip.itinerary || []).map((day) => (
            day.id !== dayId ? day : { ...day, items: day.items.filter((item) => item.id !== itemId) }
          )),
        }));
        onToast?.('ลบกิจกรรมแล้ว', 'info');
      }},
    ]);
  };

  const saveDay = () => {
    if (!dayForm.dayName.trim()) { onToast?.('กรุณากรอกชื่อวัน', 'error'); return; }
    onUpdateTrip?.(trip.id, (prevTrip) => ({
      itinerary: [
        ...(prevTrip.itinerary || []),
        { id: uid('day'), day: (prevTrip.itinerary || []).length + 1, dayName: dayForm.dayName.trim(), date: dayForm.date, items: [] },
      ],
    }));
    setDayForm({ dayName: '', date: '' });
    setShowDaySheet(false);
    onToast?.('เพิ่มวันในแผนทริปแล้ว', 'success');
  };

  const deleteDay = (dayId) => {
    Alert.alert('ลบวันในแผน', 'กิจกรรมในวันนั้นจะถูกลบทั้งหมด', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: () => {
        onUpdateTrip?.(trip.id, (prevTrip) => ({
          itinerary: (prevTrip.itinerary || []).filter((day) => day.id !== dayId).map((day, index) => ({ ...day, day: index + 1 })),
        }));
        onToast?.('ลบวันในแผนแล้ว', 'info');
      }},
    ]);
  };

  if (!itinerary.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🗓️</Text>
        <Text style={styles.emptyTitle}>ยังไม่มีแผนการเดินทาง</Text>
        <Text style={styles.emptySub}>เริ่มจากเพิ่มวันแรกของทริป แล้วค่อยเติมกิจกรรมในแต่ละช่วงเวลา</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={() => setShowDaySheet(true)}>
          <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.addFirstBtn}>
            <Text style={styles.addFirstTxt}>+ เพิ่มวันแรก</Text>
          </LinearGradient>
        </TouchableOpacity>

        <BottomSheet visible={showDaySheet} onClose={() => setShowDaySheet(false)} title="เพิ่มวันในแผน" snapHeight="55%">
          <FieldRow label="ชื่อวัน">
            <TextInput style={styles.sheetInput} placeholder="เช่น เดินทาง / เที่ยวเมือง" placeholderTextColor={COLORS.textMuted}
              value={dayForm.dayName} onChangeText={(v) => setDayForm((p) => ({ ...p, dayName: v }))} />
          </FieldRow>
          <FieldRow label="วันที่ (ถ้ามี)">
            <TouchableOpacity style={styles.dateBox} onPress={() => setShowDayDatePicker(true)} activeOpacity={0.85}>
              <Text style={styles.dateBoxValue}>{dayForm.date ? fmtDate(dayForm.date) : 'เลือกวัน'}</Text>
            </TouchableOpacity>
          </FieldRow>
          <SheetBtn onPress={saveDay} label="บันทึกวันแรก" />
        </BottomSheet>

        <CalendarPicker visible={showDayDatePicker} onClose={() => setShowDayDatePicker(false)}
          onSelect={(v) => setDayForm((p) => ({ ...p, date: v }))} selectedDate={dayForm.date}
          title="เลือกวันที่ของวันในแผน" />
      </View>
    );
  }

  return (
    <View>
      {itinerary.map((day, index) => {
        const dayColor = [COLORS.primary, COLORS.secondary, '#F59E0B', COLORS.teal][index % 4];
        return (
          <View key={day.id} style={styles.dayBlock}>
            <View style={styles.dayHead}>
              <LinearGradient colors={[dayColor, `${dayColor}CC`]} style={styles.dayBadge}>
                <Text style={styles.dayBadgeTxt}>DAY {day.day}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.dayName}>{day.dayName}</Text>
                {day.date ? <Text style={styles.dayDate}>{fmtDate(day.date)}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => deleteDay(day.id)} activeOpacity={0.8}>
                <Text style={styles.deleteDayText}>ลบ</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeline}>
              <View style={[styles.timelineLine, { backgroundColor: `${dayColor}40` }]} />
              {day.items.map((item) => {
                const catColor = CATEGORY_COLORS[item.cat] || COLORS.primary;
                return (
                  <View key={item.id} style={styles.tlItem}>
                    <View style={[styles.tlDot, { backgroundColor: catColor }]} />
                    <TouchableOpacity style={styles.tlCard} onLongPress={() => openEditActivity(day.id, item)} activeOpacity={0.85}>
                      <View style={styles.tlTop}>
                        <Text style={[styles.tlTime, { color: catColor }]}>{item.time}</Text>
                        <View style={styles.tlTopRight}>
                          <View style={[styles.tlCatBadge, { backgroundColor: `${catColor}18` }]}>
                            <Text style={[styles.tlCatTxt, { color: catColor }]}>{item.cat}</Text>
                          </View>
                          <TouchableOpacity onPress={() => deleteActivity(day.id, item.id)} style={styles.delBtn}>
                            <Text style={styles.delTxt}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.tlTitle}>{item.title}</Text>
                      {item.desc ? <Text style={styles.tlDesc}>{item.desc}</Text> : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.addAct} onPress={() => openAddActivity(day.id)} activeOpacity={0.85}>
              <Text style={styles.addActTxt}>+ เพิ่มกิจกรรมใน DAY {day.day}</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={styles.addDayBtn} onPress={() => setShowDaySheet(true)} activeOpacity={0.85}>
        <Text style={styles.addDayTxt}>+ เพิ่มวันใหม่</Text>
      </TouchableOpacity>

      <BottomSheet visible={showActivitySheet} onClose={() => setShowActivitySheet(false)}
        title={editingItemId ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรม'}>
        <FieldRow label="เวลา">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.timeRow}>
              {TIMES.map((time) => (
                <TouchableOpacity key={time} onPress={() => setActivityForm((p) => ({ ...p, time }))}
                  style={[styles.timeChip, activityForm.time === time && styles.timeChipOn]} activeOpacity={0.85}>
                  <Text style={[styles.timeChipTxt, activityForm.time === time && styles.timeChipTxtOn]}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </FieldRow>
        <FieldRow label="ชื่อกิจกรรม">
          <TextInput style={styles.sheetInput} placeholder="เช่น ตลาดโต้รุ่ง" placeholderTextColor={COLORS.textMuted}
            value={activityForm.title} onChangeText={(v) => setActivityForm((p) => ({ ...p, title: v }))} />
        </FieldRow>
        <FieldRow label="รายละเอียด">
          <TextInput style={[styles.sheetInput, styles.sheetTextarea]} placeholder="เช่น จุดนัดพบ / สิ่งที่ต้องเตรียม" placeholderTextColor={COLORS.textMuted}
            value={activityForm.desc} onChangeText={(v) => setActivityForm((p) => ({ ...p, desc: v }))} multiline />
        </FieldRow>
        <FieldRow label="ประเภท">
          <View style={styles.catGrid}>
            {CATS.map((cat) => (
              <TouchableOpacity key={cat} onPress={() => setActivityForm((p) => ({ ...p, cat }))}
                style={[styles.catChip, activityForm.cat === cat && styles.catChipOn]} activeOpacity={0.85}>
                <Text style={[styles.catChipTxt, activityForm.cat === cat && styles.catChipTxtOn]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </FieldRow>
        <SheetBtn onPress={saveActivity} label={editingItemId ? 'บันทึกการแก้ไข' : 'เพิ่มกิจกรรม'} />
      </BottomSheet>

      <BottomSheet visible={showDaySheet} onClose={() => setShowDaySheet(false)} title="เพิ่มวันในแผน" snapHeight="55%">
        <FieldRow label="ชื่อวัน">
          <TextInput style={styles.sheetInput} placeholder="เช่น วันเที่ยวคาเฟ่" placeholderTextColor={COLORS.textMuted}
            value={dayForm.dayName} onChangeText={(v) => setDayForm((p) => ({ ...p, dayName: v }))} />
        </FieldRow>
        <FieldRow label="วันที่ (ถ้ามี)">
          <TouchableOpacity style={styles.dateBox} onPress={() => setShowDayDatePicker(true)} activeOpacity={0.85}>
            <Text style={styles.dateBoxValue}>{dayForm.date ? fmtDate(dayForm.date) : 'เลือกวัน'}</Text>
          </TouchableOpacity>
        </FieldRow>
        <SheetBtn onPress={saveDay} label="เพิ่มวัน" />
      </BottomSheet>

      <CalendarPicker visible={showDayDatePicker} onClose={() => setShowDayDatePicker(false)}
        onSelect={(v) => setDayForm((p) => ({ ...p, date: v }))} selectedDate={dayForm.date}
        title="เลือกวันที่ของวันในแผน" />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  addFirstBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 4 },
  addFirstTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  dayBlock: { marginBottom: 24 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dayBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  dayBadgeTxt: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  dayName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dayDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  deleteDayText: { fontSize: 12, color: COLORS.danger, fontWeight: '700' },
  timeline: { paddingLeft: 24, position: 'relative' },
  timelineLine: { position: 'absolute', left: 9, top: 10, bottom: 10, width: 2, borderRadius: 2 },
  tlItem: { position: 'relative', marginBottom: 10 },
  tlDot: { position: 'absolute', left: -20, top: 14, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff', zIndex: 1 },
  tlCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  tlTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tlTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tlTime: { fontSize: 12, fontWeight: '700' },
  tlCatBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tlCatTxt: { fontSize: 10, fontWeight: '600' },
  delBtn: { padding: 4 },
  delTxt: { fontSize: 12, color: COLORS.danger, fontWeight: '700' },
  tlTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  tlDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  addAct: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, padding: 11, alignItems: 'center', borderStyle: 'dashed', marginTop: 4, marginLeft: 24 },
  addActTxt: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  addDayBtn: { borderWidth: 2, borderColor: COLORS.border2, borderRadius: 14, padding: 13, alignItems: 'center', borderStyle: 'dashed', marginTop: 4 },
  addDayTxt: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  sheetInput: { backgroundColor: COLORS.bgInput, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: COLORS.text },
  sheetTextarea: { minHeight: 64, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  timeChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.bgMuted, borderWidth: 1, borderColor: COLORS.border },
  timeChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeChipTxt: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  timeChipTxtOn: { color: '#fff', fontWeight: '700' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.bgMuted, borderWidth: 1, borderColor: COLORS.border },
  catChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipTxt: { fontSize: 12, color: COLORS.textMuted },
  catChipTxtOn: { color: '#fff', fontWeight: '700' },
  dateBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12 },
  dateBoxValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});
