import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

// Gradient background wrapper
export function GradientBg({ children, style }) {
  return (
    <LinearGradient
      colors={[COLORS.gradStart, COLORS.gradMid, COLORS.gradEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}

// Gradient header bar
export function GradientHeader({ children, style }) {
  return (
    <LinearGradient
      colors={[COLORS.gradStart, COLORS.gradEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, style]}
    >
      {children}
    </LinearGradient>
  );
}

// Gradient button
export function GradientButton({ onPress, children, style, textStyle, disabled }) {
  return (
    <LinearGradient
      colors={disabled
        ? ['#C4B5FD','#DDD6FE']
        : [COLORS.gradStart, COLORS.gradEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.btn, style]}
    >
      <Text
        style={[styles.btnTxt, textStyle]}
        onPress={disabled ? undefined : onPress}
      >
        {children}
      </Text>
    </LinearGradient>
  );
}

// Gradient pill badge
export function GradientPill({ children, style, textStyle }) {
  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.pill, style]}
    >
      <Text style={[styles.pillTxt, textStyle]}>{children}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 },
  btn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  pill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  pillTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
