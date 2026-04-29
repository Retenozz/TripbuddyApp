import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import MemberAvatar from '../components/MemberAvatar';
import BottomSheet, { FieldRow, SheetBtn } from '../components/BottomSheet';
import { nightsBetween } from '../constants/data';
import { supabase } from '../lib/supabase';

export default function ProfileScreen({
  currentUser,
  trips,
  unreadCount = 0,
  onBack,
  onLogout,
  onUpdateUser,
  onToast,
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    name: currentUser.name,
    phone: currentUser.phone || '',
    bio: currentUser.bio || '',
  });

  useEffect(() => {
    setForm({
      name: currentUser.name,
      phone: currentUser.phone || '',
      bio: currentUser.bio || '',
    });
  }, [currentUser.bio, currentUser.name, currentUser.phone]);

  const totalTrips = trips.length;
  const totalNights = useMemo(
    () => trips.reduce((sum, trip) => sum + nightsBetween(trip.startDate, trip.endDate), 0),
    [trips],
  );
  const totalSpent = useMemo(
    () => trips.reduce(
      (sum, trip) => sum + (trip.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0),
      0,
    ),
    [trips],
  );

  const notificationPrefs = currentUser.notificationPrefs || {};

  const toggleNotification = (key, value) => {
    onUpdateUser?.({ notificationPrefs: { ...notificationPrefs, [key]: value } });
  };

  // ── Upload avatar to Supabase Storage ──────────────────────────────────────
  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { onToast?.('ต้องอนุญาตให้เข้าถึงรูปภาพก่อน', 'error'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingAvatar(true);
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `${currentUser.id}/avatar.${ext}`;

      // Fetch the image as a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = data?.publicUrl;

      if (avatarUrl) {
        await onUpdateUser?.({ avatar: avatarUrl });
        onToast?.('อัปโหลดรูปโปรไฟล์แล้ว', 'success');
      }
    } catch (err) {
      onToast?.('อัปโหลดรูปไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!form.name.trim()) { onToast?.('กรุณากรอกชื่อผู้ใช้', 'error'); return; }
    await onUpdateUser?.({
      name: form.name.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
    });
    setShowEdit(false);
    onToast?.('บันทึกข้อมูลโปรไฟล์แล้ว', 'success');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[COLORS.gradStart, COLORS.gradEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>โปรไฟล์และการตั้งค่า</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>

        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85} disabled={uploadingAvatar}>
            <MemberAvatar name={currentUser.name} color={currentUser.color} size={90} avatarUrl={currentUser.avatar} />
            <View style={styles.editAvatarBtn}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.editAvatarTxt}>แก้ไข</Text>}
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>{currentUser.name}</Text>
          <Text style={styles.displayEmail}>{currentUser.email}</Text>
          {currentUser.bio ? <Text style={styles.displayBio}>{currentUser.bio}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          {[
            { n: totalTrips, l: 'ทริป', icon: '✈️' },
            { n: totalNights, l: 'คืน', icon: '🌙' },
            { n: unreadCount, l: 'แจ้งเตือนใหม่', icon: '🔔' },
          ].map((item) => (
            <View key={item.l} style={styles.statCard}>
              <Text style={styles.statIcon}>{item.icon}</Text>
              <Text style={styles.statN}>{item.n}</Text>
              <Text style={styles.statL}>{item.l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ภาพรวมการเดินทาง</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ค่าใช้จ่ายรวมในทริปที่เข้าร่วม</Text>
            <Text style={styles.summaryValue}>฿{totalSpent.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>เบอร์โทร</Text>
            <Text style={styles.summaryText}>{currentUser.phone || 'ยังไม่ได้ตั้งค่า'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
          {[
            { label: 'ชื่อ', value: currentUser.name },
            { label: 'อีเมล', value: currentUser.email },
            { label: 'เบอร์โทร', value: currentUser.phone || 'ยังไม่ได้ตั้งค่า' },
            { label: 'Bio', value: currentUser.bio || 'ยังไม่ได้ใส่คำอธิบาย' },
          ].map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => setShowEdit(true)} activeOpacity={0.85}>
            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>แก้ไขโปรไฟล์</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>การแจ้งเตือน</Text>
          {[
            { key: 'push', label: 'เปิดการแจ้งเตือนทั้งหมด', icon: '🔔' },
            { key: 'planning', label: 'อัปเดตแผนทริป', icon: '🗓️' },
            { key: 'expense', label: 'ค่าใช้จ่ายและการหารเงิน', icon: '💸' },
            { key: 'chat', label: 'ข้อความในห้องแชท', icon: '💬' },
          ].map((item) => (
            <View key={item.key} style={styles.notifRow}>
              <View style={styles.notifLeft}>
                <Text style={styles.notifIcon}>{item.icon}</Text>
                <Text style={styles.notifLabel}>{item.label}</Text>
              </View>
              <Switch
                value={notificationPrefs[item.key] ?? true}
                onValueChange={(value) => toggleNotification(item.key, value)}
                trackColor={{ false: COLORS.border, true: `${COLORS.primary}66` }}
                thumbColor={notificationPrefs[item.key] ?? true ? COLORS.primary : '#CBD5E1'}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
          <Text style={styles.logoutTxt}>ออกจากระบบ</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit profile sheet — ไม่ให้แก้ email (Supabase Auth) */}
      <BottomSheet visible={showEdit} onClose={() => setShowEdit(false)} title="แก้ไขโปรไฟล์" snapHeight="65%">
        <FieldRow label="ชื่อที่แสดง">
          <TextInput
            style={styles.sheetInput}
            placeholder="ชื่อของคุณ"
            placeholderTextColor={COLORS.textMuted}
            value={form.name}
            onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
          />
        </FieldRow>

        <FieldRow label="อีเมล (เปลี่ยนไม่ได้)">
          <TextInput
            style={[styles.sheetInput, styles.sheetInputDisabled]}
            value={currentUser.email}
            editable={false}
          />
        </FieldRow>

        <FieldRow label="เบอร์โทร">
          <TextInput
            style={styles.sheetInput}
            placeholder="08x-xxx-xxxx"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
          />
        </FieldRow>

        <FieldRow label="Bio">
          <TextInput
            style={[styles.sheetInput, styles.sheetTextarea]}
            placeholder="เล่าความเป็นนักเดินทางของคุณสั้น ๆ"
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={form.bio}
            onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
          />
        </FieldRow>

        <SheetBtn onPress={saveProfile} label="บันทึกข้อมูล" />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 20 },
  header: { paddingTop: 0, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  editAvatarBtn: {
    position: 'absolute', right: -6, bottom: -6,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, minWidth: 52, alignItems: 'center',
  },
  editAvatarTxt: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  displayName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  displayEmail: { fontSize: 14, color: COLORS.textMuted },
  displayBio: { fontSize: 13, color: COLORS.primary, marginTop: 4, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statN: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  statL: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  section: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  summaryLabel: { fontSize: 13, color: COLORS.textMuted, flex: 1, marginRight: 10 },
  summaryValue: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  summaryText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  infoRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  primaryBtn: { marginTop: 16, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  notifLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 },
  notifIcon: { fontSize: 18 },
  notifLabel: { fontSize: 14, color: COLORS.text },
  logoutBtn: { marginHorizontal: 20, marginTop: 16, borderWidth: 1.5, borderColor: COLORS.danger, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FEF2F2' },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  sheetInput: { backgroundColor: COLORS.bgInput, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: COLORS.text },
  sheetInputDisabled: { color: COLORS.textMuted, backgroundColor: '#F3F3F3' },
  sheetTextarea: { minHeight: 88, textAlignVertical: 'top' },
});
