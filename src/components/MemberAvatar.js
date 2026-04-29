import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function MemberAvatar({ name = '', color = COLORS.primary, size = 32, style = {}, avatarUrl }) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }
  return (
    <View style={[styles.av, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{(name[0] || '?').toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  av: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  letter: { fontWeight: '700', color: '#fff' },
});
