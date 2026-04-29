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
import { COLORS } from '../../constants/theme';
import BottomSheet, { FieldRow, SheetBtn } from '../../components/BottomSheet';
import { calculateExpenseSummary, uid } from '../../utils/tripUtils';

const CAT_COLORS = {
  transport: COLORS.primary,
  hotel: COLORS.secondary,
  food: '#F59E0B',
  activity: COLORS.teal,
  other: COLORS.textMuted,
};

const CAT_LABELS = {
  transport: '✈️ เดินทาง',
  hotel: '🏨 ที่พัก',
  food: '🍜 อาหาร',
  activity: '🎭 กิจกรรม',
  other: '📦 อื่น ๆ',
};

const CAT_ICONS = {
  transport: '✈️',
  hotel: '🏨',
  food: '🍜',
  activity: '🎭',
  other: '📦',
};

export default function ExpensesTab({ trip, onUpdateTrip, onToast }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSheet, setShowSheet] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    byId: trip.members[0]?.id || '',
    amount: '',
    cat: 'food',
    participants: trip.members.map((member) => member.id),
  });

  const summary = useMemo(() => calculateExpenseSummary(trip), [trip]);
  const categoryTotals = useMemo(() => {
    const map = {};
    (trip.expenses || []).forEach((expense) => {
      map[expense.cat] = (map[expense.cat] || 0) + Number(expense.amount || 0);
    });
    return map;
  }, [trip.expenses]);

  const filters = ['all', ...Object.keys(categoryTotals)];
  const filtered = activeFilter === 'all'
    ? trip.expenses || []
    : (trip.expenses || []).filter((expense) => expense.cat === activeFilter);

  const openCreate = () => {
    setEditingExpenseId(null);
    setForm({
      name: '',
      byId: trip.members[0]?.id || '',
      amount: '',
      cat: 'food',
      participants: trip.members.map((member) => member.id),
    });
    setShowSheet(true);
  };

  const openEdit = (expense) => {
    setEditingExpenseId(expense.id);
    setForm({
      name: expense.name,
      byId: expense.byId,
      amount: String(expense.amount),
      cat: expense.cat,
      participants: expense.participants || [],
    });
    setShowSheet(true);
  };

  const toggleParticipant = (memberId) => {
    setForm((prev) => {
      const exists = prev.participants.includes(memberId);
      const participants = exists
        ? prev.participants.filter((item) => item !== memberId)
        : [...prev.participants, memberId];
      return { ...prev, participants };
    });
  };

  const saveExpense = () => {
    const amount = Number(form.amount);
    if (!form.name.trim()) {
      onToast?.('กรุณากรอกรายการค่าใช้จ่าย', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      onToast?.('จำนวนเงินไม่ถูกต้อง', 'error');
      return;
    }
    if (!form.participants.length) {
      onToast?.('เลือกคนที่หารอย่างน้อย 1 คน', 'error');
      return;
    }

    const expensePayload = {
      id: editingExpenseId || uid('expense'),
      icon: CAT_ICONS[form.cat] || '💸',
      name: form.name.trim(),
      byId: form.byId,
      by: trip.members.find((member) => member.id === form.byId)?.name || '',
      amount,
      participants: form.participants,
      split: form.participants.length,
      cat: form.cat,
    };

    onUpdateTrip?.(trip.id, (prevTrip) => ({
      expenses: editingExpenseId
        ? (prevTrip.expenses || []).map((expense) => (expense.id === editingExpenseId ? expensePayload : expense))
        : [...(prevTrip.expenses || []), expensePayload],
    }));

    setShowSheet(false);
    onToast?.(editingExpenseId ? 'แก้ไขรายจ่ายแล้ว' : 'เพิ่มรายจ่ายแล้ว', 'success');
  };

  const deleteExpense = (expenseId) => {
    Alert.alert('ลบรายจ่าย', 'ต้องการลบรายการนี้ใช่ไหม', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: () => {
          onUpdateTrip?.(trip.id, (prevTrip) => ({
            expenses: (prevTrip.expenses || []).filter((expense) => expense.id !== expenseId),
          }));
          onToast?.('ลบรายจ่ายแล้ว', 'info');
        },
      },
    ]);
  };

  return (
    <View>
      <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.sumCard}>
        <Text style={styles.sumLbl}>ยอดรวมทั้งหมด</Text>
        <Text style={styles.sumTotal}>฿{summary.total.toLocaleString()}</Text>
        <View style={styles.sumRow}>
          {[
            { n: trip.members.length, l: 'คน' },
            { n: `฿${summary.perPerson.toLocaleString()}`, l: 'เฉลี่ย/คน' },
            { n: (trip.expenses || []).length, l: 'รายการ' },
          ].map((item, index) => (
            <View key={item.l} style={[styles.sumStat, index === 1 && styles.sumStatMid]}>
              <Text style={styles.sumStatN}>{item.n}</Text>
              <Text style={styles.sumStatL}>{item.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {!!summary.balances.length && (
        <>
          <Text style={styles.secLbl}>สรุปยอดแต่ละคน</Text>
          <View style={styles.balGrid}>
            {summary.balances.map((member) => (
              <View key={member.id} style={styles.balCard}>
                <View style={[styles.balAv, { backgroundColor: member.color }]}>
                  <Text style={styles.balAvTxt}>{member.name[0]}</Text>
                </View>
                <Text style={styles.balName}>{member.name}</Text>
                <Text style={[styles.balAmt, { color: member.net >= 0 ? COLORS.success : COLORS.danger }]}>
                  {member.net >= 0 ? '+' : ''}{member.net.toLocaleString()} ฿
                </Text>
                <Text style={styles.balMeta}>
                  จ่าย {Math.round(member.paid).toLocaleString()} · หาร {Math.round(member.owed).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity onPress={openCreate} activeOpacity={0.85} style={{ marginBottom: 14 }}>
        <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.addBtn}>
          <Text style={styles.addBtnTxt}>+ เพิ่มรายจ่าย</Text>
        </LinearGradient>
      </TouchableOpacity>

      {(trip.expenses || []).length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.filterRow}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[styles.filterChip, activeFilter === filter && styles.filterChipOn]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterTxt, activeFilter === filter && styles.filterTxtOn]}>
                    {filter === 'all' ? 'ทั้งหมด' : CAT_LABELS[filter] || filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {filtered.map((expense) => {
            const payer = trip.members.find((member) => member.id === expense.byId);
            return (
              <TouchableOpacity key={expense.id} style={styles.expRow} onPress={() => openEdit(expense)} activeOpacity={0.85}>
                <View style={[styles.expIcon, { backgroundColor: `${CAT_COLORS[expense.cat] || COLORS.primary}18` }]}>
                  <Text style={{ fontSize: 22 }}>{expense.icon}</Text>
                </View>
                <View style={styles.expInfo}>
                  <Text style={styles.expName}>{expense.name}</Text>
                  <Text style={styles.expBy}>
                    {payer?.name || expense.by} จ่าย · หาร {expense.participants?.length || expense.split} คน
                  </Text>
                </View>
                <Text style={[styles.expAmt, { color: CAT_COLORS[expense.cat] || COLORS.primary }]}>
                  ฿{Number(expense.amount || 0).toLocaleString()}
                </Text>
                <TouchableOpacity onPress={() => deleteExpense(expense.id)} style={styles.delBtn}>
                  <Text style={styles.delTxt}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          <View style={styles.settlementCard}>
            <Text style={styles.secLbl}>ยอดจ่ายคืนแนะนำ</Text>
            {summary.settlements.length === 0 ? (
              <Text style={styles.settlementEmpty}>ตอนนี้ยอดสมดุลกันแล้ว</Text>
            ) : (
              summary.settlements.map((item) => (
                <View key={`${item.fromId}-${item.toId}`} style={styles.settleRow}>
                  <Text style={styles.settleName}>{item.from} จ่ายให้ {item.to}</Text>
                  <Text style={styles.settleAmt}>฿{item.amount.toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💸</Text>
          <Text style={styles.emptyTitle}>ยังไม่มีรายจ่าย</Text>
          <Text style={styles.emptySub}>เพิ่มค่าใช้จ่ายรายการแรก แล้วระบบจะคำนวณหารให้แบบแยกตามคนที่ร่วมจ่าย</Text>
        </View>
      )}

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingExpenseId ? 'แก้ไขรายจ่าย' : 'เพิ่มรายจ่าย'}>
        <FieldRow label="ประเภท">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {Object.entries(CAT_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setForm((prev) => ({ ...prev, cat: key }))}
                  style={[styles.filterChip, form.cat === key && styles.filterChipOn]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterTxt, form.cat === key && styles.filterTxtOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </FieldRow>

        <FieldRow label="รายการ">
          <TextInput
            style={styles.sheetInput}
            placeholder="เช่น โรงแรมคืนแรก"
            placeholderTextColor={COLORS.textMuted}
            value={form.name}
            onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
          />
        </FieldRow>

        <FieldRow label="จำนวนเงิน">
          <TextInput
            style={styles.sheetInput}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={form.amount}
            onChangeText={(value) => setForm((prev) => ({ ...prev, amount: value }))}
          />
        </FieldRow>

        <FieldRow label="ใครเป็นคนจ่าย">
          <View style={styles.memberChipWrap}>
            {trip.members.map((member) => (
              <TouchableOpacity
                key={member.id}
                onPress={() => setForm((prev) => ({ ...prev, byId: member.id }))}
                style={[
                  styles.memberChip,
                  form.byId === member.id && { backgroundColor: member.color, borderColor: member.color },
                ]}
                activeOpacity={0.85}
              >
                <Text style={[styles.memberChipTxt, form.byId === member.id && styles.memberChipTxtOn]}>{member.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </FieldRow>

        <FieldRow label="หารกับใครบ้าง">
          <View style={styles.memberChipWrap}>
            {trip.members.map((member) => {
              const active = form.participants.includes(member.id);
              return (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => toggleParticipant(member.id)}
                  style={[styles.memberChip, active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.memberChipTxt, active && styles.memberChipTxtOn]}>{member.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FieldRow>

        {form.amount && Number(form.amount) > 0 && form.participants.length > 0 ? (
          <View style={styles.splitPreview}>
            <Text style={styles.splitPreviewTxt}>
              คนละ ฿{Math.round(Number(form.amount) / form.participants.length).toLocaleString()}
            </Text>
          </View>
        ) : null}

        <SheetBtn onPress={saveExpense} label={editingExpenseId ? 'บันทึกการแก้ไข' : 'บันทึกรายจ่าย'} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sumCard: { borderRadius: 20, padding: 20, marginBottom: 14 },
  sumLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', marginBottom: 4 },
  sumTotal: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 16 },
  sumRow: { flexDirection: 'row' },
  sumStat: { flex: 1, alignItems: 'center' },
  sumStatMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  sumStatN: { fontSize: 16, fontWeight: '800', color: '#fff' },
  sumStatL: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  secLbl: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  balGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  balCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4 },
  balAv: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  balAvTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  balName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  balAmt: { fontSize: 16, fontWeight: '800' },
  balMeta: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  addBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  addBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  filterChip: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  filterChipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.bgMuted },
  filterTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTxtOn: { color: COLORS.primary },
  expRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  expIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expInfo: { flex: 1 },
  expName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  expBy: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  expAmt: { fontSize: 16, fontWeight: '800' },
  delBtn: { padding: 6 },
  delTxt: { fontSize: 13, color: COLORS.danger, fontWeight: '700' },
  settlementCard: { marginTop: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  settlementEmpty: { fontSize: 13, color: COLORS.textMuted },
  settleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.border },
  settleName: { fontSize: 13, color: COLORS.text },
  settleAmt: { fontSize: 13, fontWeight: '800', color: COLORS.success },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  sheetInput: { backgroundColor: COLORS.bgInput, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: COLORS.text },
  memberChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.bgMuted, borderWidth: 1, borderColor: COLORS.border },
  memberChipTxt: { fontSize: 12, color: COLORS.textMuted },
  memberChipTxtOn: { color: '#fff', fontWeight: '700' },
  splitPreview: { backgroundColor: COLORS.bgMuted, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8 },
  splitPreviewTxt: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
});
