// src/components/BottomSheet.js
// Generic bottom-sheet modal with gradient header
import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

export default function BottomSheet({ visible, onClose, title, children, snapHeight = '85%' }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxHeight: snapHeight }]} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function FieldRow({ label, children }) {
  return (
    <View style={f.wrap}>
      <Text style={f.lbl}>{label}</Text>
      {children}
    </View>
  );
}

export function SheetInput({ ...props }) {
  const { TextInput } = require('react-native');
  return <TextInput style={f.input} placeholderTextColor={COLORS.textMuted} {...props} />;
}

export function SheetBtn({ onPress, label, color }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginTop: 8 }}>
      <LinearGradient
        colors={color === 'green' ? [COLORS.success, '#059669'] : [COLORS.gradStart, COLORS.gradEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={f.btn}
      >
        <Text style={f.btnTxt}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 16, fontWeight: '800', color: '#fff' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },
  body: { padding: 20, paddingBottom: 36 },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  lbl: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input: { backgroundColor: COLORS.bgInput, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: COLORS.text },
  btn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
