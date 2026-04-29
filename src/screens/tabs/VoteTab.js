import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import BottomSheet, { FieldRow, SheetBtn } from '../../components/BottomSheet';
import { uid } from '../../utils/tripUtils';

const TYPES = ['🌿 ธรรมชาติ', '🏖️ ทะเล', '🏔️ ภูเขา', '⛩️ วัด', '🛒 ตลาด', '🍜 อาหาร', '🎭 บันเทิง', '🌸 ดอกไม้', '🏛️ พิพิธภัณฑ์'];

export default function VoteTab({ trip, currentUser, onUpdateTrip, onToast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ place: '', type: '🌿 ธรรมชาติ', desc: '' });

  const setVote = (voteId, value) => {
    onUpdateTrip?.(trip.id, (prevTrip) => ({
      votes: (prevTrip.votes || []).map((vote) => {
        if (vote.id !== voteId) return vote;
        const nextVotes = { ...(vote.votes || {}) };
        if (nextVotes[currentUser.id] === value) {
          delete nextVotes[currentUser.id];
        } else {
          nextVotes[currentUser.id] = value;
        }
        return { ...vote, votes: nextVotes };
      }),
    }));
  };

  const addPlace = () => {
    if (!form.place.trim()) {
      onToast?.('กรุณากรอกชื่อสถานที่', 'error');
      return;
    }

    onUpdateTrip?.(trip.id, (prevTrip) => ({
      votes: [
        ...(prevTrip.votes || []),
        {
          id: uid('vote'),
          place: form.place.trim(),
          type: form.type,
          desc: form.desc.trim(),
          votes: {},
        },
      ],
    }));

    setForm({ place: '', type: '🌿 ธรรมชาติ', desc: '' });
    setShowAdd(false);
    onToast?.('เพิ่มสถานที่ให้โหวตแล้ว', 'success');
  };

  const deletePlace = (voteId) => {
    Alert.alert('ลบสถานที่โหวต', 'ต้องการลบรายการนี้ใช่ไหม', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: () => {
          onUpdateTrip?.(trip.id, (prevTrip) => ({
            votes: (prevTrip.votes || []).filter((vote) => vote.id !== voteId),
          }));
          onToast?.('ลบรายการโหวตแล้ว', 'info');
        },
      },
    ]);
  };

  return (
    <View>
      <Text style={styles.intro}>โหวตสถานที่ที่อยากไปด้วยกัน ทุกคนในกลุ่มสามารถลงคะแนนได้แบบ yes / no</Text>

      {(trip.votes || []).length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>ยังไม่มีรายการโหวต</Text>
          <Text style={styles.emptyText}>เพิ่มสถานที่ที่ทีมกำลังตัดสินใจ เพื่อให้ทุกคนช่วยกันโหวตได้ทันที</Text>
        </View>
      ) : (
        (trip.votes || []).map((vote) => {
          const yesCount = Object.values(vote.votes || {}).filter((value) => value === 'yes').length;
          const noCount = Object.values(vote.votes || {}).filter((value) => value === 'no').length;
          const totalVoters = trip.members.length || 1;
          const pct = Math.min(100, (yesCount / totalVoters) * 100);
          const myVote = vote.votes?.[currentUser.id] || null;
          const winner = yesCount > 0 && yesCount >= Math.ceil(totalVoters / 2);

          return (
            <View key={vote.id} style={[styles.vCard, myVote && styles.vCardVoted]}>
              {winner && (
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.winBanner}>
                  <Text style={styles.winTxt}>คะแนนส่วนใหญ่เห็นด้วยแล้ว</Text>
                </LinearGradient>
              )}
              <View style={styles.vcHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vcName}>{vote.place}</Text>
                  <View style={styles.vcTypeBadge}>
                    <Text style={styles.vcTypeTxt}>{vote.type}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.vcScore}>{yesCount}/{trip.members.length}</Text>
                  <TouchableOpacity onPress={() => deletePlace(vote.id)} activeOpacity={0.8}>
                    <Text style={styles.deleteLink}>ลบ</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {vote.desc ? <Text style={styles.vcDesc}>{vote.desc}</Text> : null}

              <View style={styles.barRow}>
                <Text style={styles.countTxt}>👍 {yesCount}</Text>
                <View style={styles.barBg}>
                  <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={[styles.barFill, { width: pct > 0 ? `${pct}%` : '2%' }]} />
                </View>
                <Text style={styles.countTxt}>👎 {noCount}</Text>
              </View>

              {myVote ? (
                <View style={styles.votedRow}>
                  <View style={styles.votedBadge}>
                    <Text style={styles.votedTxt}>คุณโหวต {myVote === 'yes' ? 'อยากไป' : 'ยังไม่อยากไป'} แล้ว</Text>
                  </View>
                  <TouchableOpacity onPress={() => setVote(vote.id, myVote)} activeOpacity={0.8}>
                    <Text style={styles.changeLink}>ยกเลิก</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.vActRow}>
                  <TouchableOpacity onPress={() => setVote(vote.id, 'yes')} style={{ flex: 1 }} activeOpacity={0.85}>
                    <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.vYes}>
                      <Text style={styles.vYesTxt}>👍 อยากไป</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setVote(vote.id, 'no')} style={styles.vNo} activeOpacity={0.85}>
                    <Text style={styles.vNoTxt}>👎 ไม่ไป</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      <TouchableOpacity onPress={() => setShowAdd(true)} activeOpacity={0.85} style={{ marginTop: 4 }}>
        <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.addBtn}>
          <Text style={styles.addBtnTxt}>+ เพิ่มสถานที่โหวต</Text>
        </LinearGradient>
      </TouchableOpacity>

      <BottomSheet visible={showAdd} onClose={() => setShowAdd(false)} title="เพิ่มสถานที่โหวต">
        <FieldRow label="ชื่อสถานที่">
          <TextInput
            style={styles.sheetInput}
            placeholder="เช่น เขาตะเกียบ"
            placeholderTextColor={COLORS.textMuted}
            value={form.place}
            onChangeText={(value) => setForm((prev) => ({ ...prev, place: value }))}
          />
        </FieldRow>

        <FieldRow label="ประเภท">
          <View style={styles.typeGrid}>
            {TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setForm((prev) => ({ ...prev, type }))}
                style={[styles.typeChip, form.type === type && styles.typeChipOn]}
                activeOpacity={0.85}
              >
                <Text style={[styles.typeChipTxt, form.type === type && styles.typeChipTxtOn]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </FieldRow>

        <FieldRow label="คำอธิบาย">
          <TextInput
            style={[styles.sheetInput, styles.sheetTextarea]}
            placeholder="รายละเอียดสถานที่หรือเหตุผลที่อยากไป"
            placeholderTextColor={COLORS.textMuted}
            value={form.desc}
            onChangeText={(value) => setForm((prev) => ({ ...prev, desc: value }))}
            multiline
          />
        </FieldRow>

        <SheetBtn onPress={addPlace} label="บันทึกสถานที่" />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16, lineHeight: 20 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  vCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden' },
  vCardVoted: { borderColor: COLORS.primary },
  winBanner: { marginHorizontal: -16, marginTop: -16, marginBottom: 12, paddingVertical: 6, paddingHorizontal: 16 },
  winTxt: { fontSize: 12, fontWeight: '700', color: '#fff', textAlign: 'center' },
  vcHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  vcName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  vcTypeBadge: { backgroundColor: COLORS.bgMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  vcTypeTxt: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  vcScore: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  deleteLink: { fontSize: 12, color: COLORS.danger },
  vcDesc: { fontSize: 13, color: COLORS.textMuted, marginBottom: 12, lineHeight: 18 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  countTxt: { fontSize: 12 },
  barBg: { flex: 1, height: 6, backgroundColor: COLORS.bgMuted, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  votedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  votedBadge: { flex: 1, backgroundColor: COLORS.bgMuted, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  votedTxt: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  changeLink: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  vActRow: { flexDirection: 'row', gap: 8 },
  vYes: { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  vYesTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  vNo: { flex: 1, backgroundColor: COLORS.bgMuted, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  vNoTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  addBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  addBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  sheetInput: { backgroundColor: COLORS.bgInput, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: COLORS.text },
  sheetTextarea: { minHeight: 72, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.bgMuted, borderWidth: 1, borderColor: COLORS.border },
  typeChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipTxt: { fontSize: 12, color: COLORS.textMuted },
  typeChipTxtOn: { color: '#fff', fontWeight: '700' },
});
