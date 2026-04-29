import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function Toast({ msg, type = 'info', onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  const borderColors = { success: COLORS.success, error: COLORS.danger, info: COLORS.primary };
  const icons = { success: '✅', error: '❌', info: '📋' };
  return (
    <View style={[styles.toast, { borderColor: borderColors[type] || COLORS.primary }]}>
      <Text style={styles.icon}>{icons[type]}</Text>
      <Text style={[styles.msg, { color: borderColors[type] }]} numberOfLines={2}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', top: 60, left: 20, right: 20, zIndex: 9999,
    backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: COLORS.primary, shadowOpacity: 0.18, shadowRadius: 16,
    elevation: 12,
  },
  icon: { fontSize: 18 },
  msg: { fontSize: 13, fontWeight: '600', flex: 1 },
});
