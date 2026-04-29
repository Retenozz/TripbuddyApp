// src/components/CalendarPicker.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';
import { THAI_MONTHS, THAI_DAYS_SHORT, getCalendarDays } from '../constants/data';

export default function CalendarPicker({ visible, onClose, onSelect, selectedDate, minDate, title }) {
  const today = new Date();
  const initDate = selectedDate ? new Date(selectedDate) : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const days = getCalendarDays(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isSelected = (d) => {
    if (!d || !selectedDate) return false;
    const s = new Date(selectedDate);
    return s.getFullYear() === viewYear && s.getMonth() === viewMonth && s.getDate() === d;
  };

  const isDisabled = (d) => {
    if (!d || !minDate) return false;
    const cell = new Date(viewYear, viewMonth, d);
    return cell < new Date(minDate);
  };

  const isToday = (d) => {
    if (!d) return false;
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
  };

  const handlePick = (d) => {
    if (!d || isDisabled(d)) return;
    const picked = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onSelect(picked);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Title */}
          {title && <Text style={styles.title}>{title}</Text>}

          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{THAI_MONTHS[viewMonth]} {viewYear + 543}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={styles.dayLabels}>
            {THAI_DAYS_SHORT.map(d => (
              <Text key={d} style={[styles.dayLabel, d === 'อา' && { color: COLORS.danger }]}>{d}</Text>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {days.map((d, i) => {
              const sel = isSelected(d);
              const dis = isDisabled(d);
              const tod = isToday(d);
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.cell}
                  onPress={() => handlePick(d)}
                  disabled={!d || dis}
                  activeOpacity={0.7}
                >
                  {sel ? (
                    <LinearGradient
                    colors={[COLORS.gradStart, COLORS.gradEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[styles.cellSel, { borderRadius: 10 }]}
                    >
                      <Text style={styles.cellTxtSel}>{d}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.cellInner, tod && styles.cellToday, dis && styles.cellDis]}>
                      <Text style={[
                        styles.cellTxt,
                        tod && styles.cellTxtToday,
                        dis && styles.cellTxtDis,
                        !d && { opacity: 0 },
                      ]}>{d || ''}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>ปิด</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.bgMuted, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 22, color: COLORS.primary, fontWeight: '700', lineHeight: 26 },
  monthLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  dayLabels: { flexDirection: 'row', marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, padding: 2 },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cellToday: { backgroundColor: COLORS.bgMuted, borderWidth: 1.5, borderColor: COLORS.primary },
  cellDis: { opacity: 0.3 },
  cellSel: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cellTxt: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  cellTxtToday: { color: COLORS.primary, fontWeight: '800' },
  cellTxtDis: { color: COLORS.textMuted },
  cellTxtSel: { fontSize: 14, color: '#fff', fontWeight: '800' },
  closeBtn: { marginTop: 16, paddingVertical: 13, borderRadius: 14, backgroundColor: COLORS.bgMuted, alignItems: 'center' },
  closeTxt: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
