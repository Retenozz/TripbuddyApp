import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TRIP_EMOJIS } from '../constants/theme';
import { fmtDate, genCode, nightsBetween } from '../constants/data';
import MemberAvatar from '../components/MemberAvatar';
import CalendarPicker from '../components/CalendarPicker';
import { buildUser, isDateInRange, memberIdFromName } from '../utils/tripUtils';

const CREATE_STEPS = ['ธีม', 'ข้อมูลทริป', 'วันที่', 'เชิญเพื่อน', 'ยืนยัน'];

function parseInvitees(text = '') {
  return text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

export default function CreateScreen({
  onBack,
  onCreate,
  currentUser,
  existingTrips = [],
  initialDraft = null,
}) {
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    emoji: initialDraft?.emoji || '🏖️',
    name: initialDraft?.name || '',
    description: initialDraft?.description || '',
    startDate: initialDraft?.startDate || '',
    endDate: initialDraft?.endDate || '',
    coverPhoto: initialDraft?.coverPhoto || '',
    inviteesText: initialDraft?.inviteesText || '',
  });
  const [inviteCode] = useState(initialDraft?.inviteCode || genCode());
  const [showCalStart, setShowCalStart] = useState(false);
  const [showCalEnd, setShowCalEnd] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const tripNights = nightsBetween(form.startDate, form.endDate);
  const invitees = useMemo(() => parseInvitees(form.inviteesText), [form.inviteesText]);

  const conflictingTrips = useMemo(() => {
    if (!form.startDate || !form.endDate) return [];
    return existingTrips.filter((trip) => {
      const overlapsStart = isDateInRange(form.startDate, trip.startDate, trip.endDate);
      const overlapsEnd = isDateInRange(form.endDate, trip.startDate, trip.endDate);
      const containsTrip = isDateInRange(trip.startDate, form.startDate, form.endDate);
      return overlapsStart || overlapsEnd || containsTrip;
    });
  }, [existingTrips, form.endDate, form.startDate]);

  const validateStep = () => {
    if (step === 1) {
      const nextErrors = {};
      if (!form.name.trim()) nextErrors.name = 'กรุณาตั้งชื่อทริป';
      if (form.description.trim().length < 4) nextErrors.description = 'ช่วยใส่รายละเอียดทริปสั้น ๆ อย่างน้อย 4 ตัวอักษร';
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return Object.keys(nextErrors).length === 0;
    }
    if (step === 2) {
      const nextErrors = {};
      if (!form.startDate) nextErrors.startDate = 'กรุณาเลือกวันเริ่ม';
      if (!form.endDate) nextErrors.endDate = 'กรุณาเลือกวันกลับ';
      if (form.startDate && form.endDate && form.startDate > form.endDate) nextErrors.endDate = 'วันกลับต้องไม่ก่อนวันเริ่ม';
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return Object.keys(nextErrors).length === 0;
    }
    if (step === 3 && invitees.length > 8) {
      setErrors((prev) => ({ ...prev, inviteesText: 'เชิญเพื่อนได้สูงสุด 8 คนต่อครั้ง' }));
      return false;
    }
    return true;
  };

  const pickCoverPhoto = async () => {
    try {
      setPickingImage(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrors((prev) => ({ ...prev, coverPhoto: 'ต้องอนุญาตให้เข้าถึงรูปภาพก่อน' }));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (result.canceled) return;
      const pickedUri = result.assets?.[0]?.uri;
      if (!pickedUri) {
        setErrors((prev) => ({ ...prev, coverPhoto: 'เลือกรูปไม่สำเร็จ ลองใหม่อีกครั้ง' }));
        return;
      }
      setField('coverPhoto', pickedUri);
    } finally {
      setPickingImage(false);
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    if (step < CREATE_STEPS.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    const owner = buildUser(currentUser);
    const invitedMembers = invitees.map((name, index) => ({
      id: memberIdFromName(name, index),
      name,
      color: COLORS.gradStart,
      role: 'member',
    }));

    setSubmitting(true);
    try {
    // ไม่สร้าง id ที่นี่แล้ว — App.js จะให้ Supabase generate UUID ให้
    await onCreate({
      emoji: form.emoji,
      name: form.name.trim(),
      description: form.description.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      budget: 'mid',
      inviteCode,
      coverPhoto: form.coverPhoto.trim(),
      ownerId: owner.id,
      ownerName: owner.name,
      members: [
        { id: owner.id, name: owner.name, color: owner.color, role: 'owner' },
        ...invitedMembers,
      ],
      itinerary: [],
      expenses: [],
      votes: [],
      places: [],
      messages: [
        { sys: `${owner.name} สร้างทริป "${form.name.trim()}"` },
      ],
    });
    } catch (err) {
      setErrors((prev) => ({ ...prev, _submit: err.message || 'สร้างทริปไม่สำเร็จ กรุณาลองใหม่' }));
    } finally {
      setSubmitting(false);
    }
  };

  const nextLabel = step === CREATE_STEPS.length - 1 ? 'สร้างทริปเลย' : 'ถัดไป';

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <LinearGradient
        colors={[COLORS.gradStart, COLORS.gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>สร้างทริปใหม่</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.progRow}>
          {CREATE_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progDot,
                index === step ? styles.progDotActive : index < step ? styles.progDotDone : styles.progDotPending,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progLbl}>ขั้นตอน {step + 1}/{CREATE_STEPS.length} · {CREATE_STEPS[step]}</Text>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyPad} keyboardShouldPersistTaps="handled">

        {/* ── STEP 0: Theme ── */}
        {step === 0 && (
          <View>
            <Text style={styles.stepQ}>เลือกธีมทริป</Text>
            <Text style={styles.stepHint}>เลือกอีโมจิให้นึกออกง่าย หรือ import รูปจากเครื่องเพื่อใช้เป็นภาพปกของทริปได้เลย</Text>
            <View style={styles.importRow}>
              <TouchableOpacity onPress={pickCoverPhoto} activeOpacity={0.85} style={styles.importBtnWrap}>
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.importBtn}>
                  <Text style={styles.importBtnText}>{pickingImage ? 'กำลังเลือกรูป...' : 'Import รูป'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              {form.coverPhoto ? (
                <TouchableOpacity onPress={() => setField('coverPhoto', '')} style={styles.clearPhotoBtn} activeOpacity={0.85}>
                  <Text style={styles.clearPhotoText}>ล้างรูป</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {form.coverPhoto ? (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: form.coverPhoto }} style={styles.photoPreview} />
                <View style={styles.photoMetaRow}>
                  <Text style={styles.photoPreviewLabel}>รูปนี้จะถูกใช้เป็นภาพปกของทริป</Text>
                  <View style={styles.photoEmojiBadge}>
                    <Text style={styles.photoEmojiText}>{form.emoji}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.photoHintCard}>
                <Text style={styles.photoHintText}>ยังไม่ได้เลือกรูปปก ถ้า import รูปไว้ การ์ดทริปในหน้า home จะใช้รูปนี้อัตโนมัติ</Text>
              </View>
            )}
            <View style={styles.emojiGrid}>
              {TRIP_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => setField('emoji', emoji)}
                  style={[styles.emojiOpt, form.emoji === emoji && styles.emojiOptOn]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emojiTxt}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP 1: Info ── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepQ}>ข้อมูลทริป</Text>
            <Text style={styles.stepHint}>ใส่ชื่อ รายละเอียด และรูปปกถ้ามี เพื่อให้คนในทริปเห็นภาพเดียวกันตั้งแต่ต้น</Text>
            <Text style={styles.flbl}>ชื่อทริป</Text>
            <TextInput
              style={[styles.finput, errors.name && styles.errorInput]}
              placeholder="เช่น หัวหิน weekend"
              placeholderTextColor={COLORS.textMuted}
              value={form.name}
              onChangeText={(value) => setField('name', value)}
              maxLength={50}
            />
            {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            <Text style={styles.flbl}>คำอธิบาย</Text>
            <TextInput
              style={[styles.finput, styles.multiInput, errors.description && styles.errorInput]}
              placeholder="เช่น คาเฟ่ริมหาด จุดถ่ายรูป ตลาดกลางคืน"
              placeholderTextColor={COLORS.textMuted}
              value={form.description}
              onChangeText={(value) => setField('description', value)}
              multiline
              numberOfLines={4}
            />
            {!!errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            <Text style={styles.flbl}>ลิงก์รูปปก (ถ้ามี)</Text>
            <TextInput
              style={[styles.finput, errors.coverPhoto && styles.errorInput]}
              placeholder="https://..."
              placeholderTextColor={COLORS.textMuted}
              value={form.coverPhoto}
              onChangeText={(value) => setField('coverPhoto', value)}
              autoCapitalize="none"
            />
            {!!errors.coverPhoto && <Text style={styles.errorText}>{errors.coverPhoto}</Text>}
            {form.coverPhoto ? (
              <View style={styles.linkPreviewCard}>
                <Image source={{ uri: form.coverPhoto }} style={styles.linkPreviewImage} />
                <Text style={styles.linkPreviewText}>พรีวิวภาพปกปัจจุบัน</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── STEP 2: Dates ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepQ}>วันเดินทาง</Text>
            <Text style={styles.stepHint}>ระบบจะช่วยเตือนถ้าวันที่เลือกชนกับทริปอื่นที่คุณมีอยู่แล้ว</Text>
            <View style={styles.datePair}>
              <TouchableOpacity style={[styles.dateBox, errors.startDate && styles.errorInput]} onPress={() => setShowCalStart(true)} activeOpacity={0.8}>
                <Text style={styles.dateLbl}>วันเริ่ม</Text>
                <Text style={[styles.dateVal, !form.startDate && styles.dateValMuted]}>
                  {form.startDate ? fmtDate(form.startDate) : 'เลือกวัน'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateBox, errors.endDate && styles.errorInput]} onPress={() => setShowCalEnd(true)} activeOpacity={0.8}>
                <Text style={styles.dateLbl}>วันกลับ</Text>
                <Text style={[styles.dateVal, !form.endDate && styles.dateValMuted]}>
                  {form.endDate ? fmtDate(form.endDate) : 'เลือกวัน'}
                </Text>
              </TouchableOpacity>
            </View>
            {!!errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
            {!!errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
            {tripNights > 0 && (
              <LinearGradient colors={['#E8F6FF', '#F7FCFF']} style={styles.nightBox}>
                <Text style={styles.nightTxt}>{tripNights} คืน · {tripNights + 1} วัน</Text>
              </LinearGradient>
            )}
            {conflictingTrips.length > 0 && (
              <View style={styles.warnCard}>
                <Text style={styles.warnTitle}>ช่วงวันที่นี้ชนกับทริปเดิม</Text>
                {conflictingTrips.map((trip) => (
                  <Text key={trip.id} style={styles.warnText}>
                    • {trip.name} ({fmtDate(trip.startDate)} - {fmtDate(trip.endDate)})
                  </Text>
                ))}
              </View>
            )}
            <CalendarPicker visible={showCalStart} onClose={() => setShowCalStart(false)} onSelect={(date) => setField('startDate', date)} selectedDate={form.startDate} title="เลือกวันเริ่มต้น" />
            <CalendarPicker visible={showCalEnd} onClose={() => setShowCalEnd(false)} onSelect={(date) => setField('endDate', date)} selectedDate={form.endDate} minDate={form.startDate} title="เลือกวันสิ้นสุด" />
          </View>
        )}

        {/* ── STEP 3: Invite ── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepQ}>เชิญเพื่อน</Text>
            <Text style={styles.stepHint}>พิมพ์ชื่อเพื่อนคั่นด้วย comma หรือขึ้นบรรทัดใหม่ ระบบจะเตรียมสมาชิกไว้ให้ในทริปทันที</Text>
            <Text style={styles.flbl}>รายชื่อเพื่อน</Text>
            <TextInput
              style={[styles.finput, styles.multiInput, errors.inviteesText && styles.errorInput]}
              placeholder="เช่น มิว, เจม, เบล"
              placeholderTextColor={COLORS.textMuted}
              value={form.inviteesText}
              onChangeText={(value) => setField('inviteesText', value)}
              multiline
            />
            {!!errors.inviteesText && <Text style={styles.errorText}>{errors.inviteesText}</Text>}
            <LinearGradient colors={['#E8F6FF', '#F7FCFF']} style={styles.codeBox}>
              <Text style={styles.codeLbl}>Invite Code</Text>
              <Text style={styles.codeVal}>{inviteCode}</Text>
              <Text style={styles.codeLink}>tripbuddy.app/join/{inviteCode}</Text>
            </LinearGradient>
            <View style={styles.membersBox}>
              <Text style={styles.membersTitle}>สมาชิกที่จะอยู่ในทริปนี้</Text>
              <View style={styles.memberRow}>
                <MemberAvatar name={currentUser.name} color={currentUser.color} size={36} />
                <Text style={styles.memberName}>{currentUser.name}</Text>
                <View style={styles.ownerPill}><Text style={styles.ownerPillText}>Owner</Text></View>
              </View>
              {invitees.map((name, index) => (
                <View key={`${name}-${index}`} style={styles.memberRow}>
                  <MemberAvatar name={name} color={COLORS.gradStart} size={36} />
                  <Text style={styles.memberName}>{name}</Text>
                  <Text style={styles.pendingText}>Pending invite</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP 4: Confirm ── */}
        {step === 4 && (
          <View>
            <Text style={styles.stepQ}>ยืนยันสร้างทริป</Text>
            <Text style={styles.stepHint}>ตรวจข้อมูลอีกครั้ง ก่อนบันทึกลงระบบ</Text>
            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reviewCard}>
              {form.coverPhoto ? <Image source={{ uri: form.coverPhoto }} style={styles.reviewPhoto} /> : null}
              <Text style={styles.rvEmoji}>{form.emoji}</Text>
              <Text style={styles.rvName}>{form.name || 'ทริปใหม่'}</Text>
              <Text style={styles.rvDate}>{fmtDate(form.startDate)} → {fmtDate(form.endDate)}</Text>
            </LinearGradient>
            <View style={styles.rvDetails}>
              {[
                { label: 'ระยะเวลา', value: `${tripNights} คืน / ${tripNights + 1} วัน` },
                { label: 'Invite code', value: inviteCode, code: true },
                { label: 'สมาชิกทั้งหมด', value: `${invitees.length + 1} คน` },
                { label: 'รูปปก', value: form.coverPhoto ? 'มีแล้ว' : 'ยังไม่ได้ใส่' },
              ].map((row) => (
                <View key={row.label} style={styles.rvRow}>
                  <Text style={styles.rvLbl}>{row.label}</Text>
                  <Text style={[styles.rvVal, row.code && styles.rvValCode]}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        {!!errors._submit && <Text style={[styles.errorText, { marginBottom: 8 }]}>{errors._submit}</Text>}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85} disabled={submitting}>
          <LinearGradient
            colors={[step === CREATE_STEPS.length - 1 ? COLORS.success : COLORS.gradStart, step === CREATE_STEPS.length - 1 ? '#63A93A' : COLORS.gradEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
          >
            <Text style={styles.nextTxt}>{submitting ? 'กำลังสร้างทริป...' : nextLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 0, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  progRow: { flexDirection: 'row', gap: 5, marginBottom: 6 },
  progDot: { height: 4, flex: 1, borderRadius: 4 },
  progDotActive: { backgroundColor: '#fff' },
  progDotDone: { backgroundColor: 'rgba(255,255,255,0.6)' },
  progDotPending: { backgroundColor: 'rgba(255,255,255,0.25)' },
  progLbl: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  body: { flex: 1 },
  bodyPad: { padding: 20, paddingBottom: 120 },
  stepQ: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  stepHint: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 20 },
  importRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  importBtnWrap: { flex: 1 },
  importBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  importBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  clearPhotoBtn: { borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 13 },
  clearPhotoText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  photoPreviewCard: { backgroundColor: '#fff', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  photoPreview: { width: '100%', height: 160, borderRadius: 14, marginBottom: 10, backgroundColor: COLORS.bgMuted },
  photoMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  photoPreviewLabel: { flex: 1, fontSize: 12, color: COLORS.textMuted },
  photoEmojiBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgMuted, alignItems: 'center', justifyContent: 'center' },
  photoEmojiText: { fontSize: 18 },
  photoHintCard: { borderRadius: 16, backgroundColor: '#F7FBFE', borderWidth: 1, borderColor: '#E4EFF7', padding: 14, marginBottom: 16 },
  photoHintText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiOpt: { width: '17%', aspectRatio: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: COLORS.border, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emojiOptOn: { borderColor: COLORS.primary, backgroundColor: COLORS.bgMuted },
  emojiTxt: { fontSize: 28 },
  flbl: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 6, marginTop: 4 },
  finput: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.text, marginBottom: 10 },
  multiInput: { minHeight: 90, textAlignVertical: 'top' },
  errorInput: { borderColor: COLORS.danger },
  errorText: { fontSize: 12, color: COLORS.danger, marginBottom: 10 },
  linkPreviewCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 12, marginBottom: 6 },
  linkPreviewImage: { width: '100%', height: 150, borderRadius: 12, backgroundColor: COLORS.bgMuted, marginBottom: 8 },
  linkPreviewText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  datePair: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  dateBox: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 14, padding: 14 },
  dateLbl: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  dateVal: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  dateValMuted: { color: COLORS.textMuted },
  nightBox: { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 14 },
  nightTxt: { fontSize: 15, color: COLORS.textSub, fontWeight: '700' },
  warnCard: { backgroundColor: '#FFF7E8', borderRadius: 14, borderWidth: 1, borderColor: '#F4D48D', padding: 14 },
  warnTitle: { fontSize: 14, fontWeight: '800', color: '#8A5A00', marginBottom: 6 },
  warnText: { fontSize: 12, color: '#8A5A00', lineHeight: 18 },
  codeBox: { borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16 },
  codeLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: COLORS.primary, marginBottom: 8 },
  codeVal: { fontSize: 30, fontWeight: '800', color: COLORS.primary, letterSpacing: 8, marginBottom: 4 },
  codeLink: { fontSize: 12, color: COLORS.textMuted },
  membersBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  membersTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  memberName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  ownerPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.bgMuted },
  ownerPillText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  pendingText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  reviewCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  reviewPhoto: { width: '100%', height: 150, borderRadius: 16, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  rvEmoji: { fontSize: 60, marginBottom: 10 },
  rvName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4, textAlign: 'center' },
  rvDate: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  rvDetails: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  rvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  rvLbl: { fontSize: 13, color: COLORS.textMuted },
  rvVal: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  rvValCode: { color: COLORS.primary, fontWeight: '800', letterSpacing: 2 },
  footer: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, backgroundColor: COLORS.bg, borderTopWidth: 1, borderColor: COLORS.border },
  nextBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
