import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import MemberAvatar from '../../components/MemberAvatar';
import { formatClock, uid } from '../../utils/tripUtils';

export default function ChatTab({ trip, currentUser, onUpdateTrip }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const messages = trip.messages || [];

  // scroll ลงล่างเมื่อ messages เปลี่ยน
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    onUpdateTrip?.(trip.id, (prev) => ({
      messages: [...(prev.messages || []), {
        id: uid('msg'),
        fromId: currentUser.id,
        text,
        time: formatClock(),
      }],
    }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listCont}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTxt}>ยังไม่มีข้อความ เริ่มคุยกันได้เลย!</Text>
          </View>
        )}

        {messages.map((msg, index) => {
          // system message
          if (msg.sys) {
            return (
              <View key={msg.id || `sys-${index}`} style={styles.sysRow}>
                <View style={styles.sysPill}>
                  <Text style={styles.sysTxt}>{msg.sys}</Text>
                </View>
              </View>
            );
          }

          const isMe = msg.fromId === currentUser.id;
          const member = trip.members.find((m) => m.id === msg.fromId) || currentUser;

          return (
            <View key={msg.id || `msg-${index}`} style={[styles.msgRow, isMe && styles.msgRowMe]}>
              {!isMe && (
                <MemberAvatar name={member.name} color={member.color} size={30} />
              )}
              <View style={[styles.bstack, isMe && styles.bstackMe]}>
                {!isMe && (
                  <Text style={[styles.sender, { color: member.color }]}>{member.name}</Text>
                )}
                {isMe ? (
                  <LinearGradient
                    colors={[COLORS.gradStart, COLORS.gradEnd]}
                    style={[styles.bubble, styles.bubbleMe]}
                  >
                    <Text style={styles.bubbleTxtMe}>{msg.text}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.bubble, styles.bubbleOther]}>
                    <Text style={styles.bubbleTxt}>{msg.text}</Text>
                  </View>
                )}
                <Text style={[styles.time, isMe && styles.timeMe]}>{msg.time}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Input bar — ติดล่างสุด ── */}
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ข้อความ..."
          placeholderTextColor={COLORS.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <TouchableOpacity onPress={send} activeOpacity={0.85} disabled={!input.trim()}>
          <LinearGradient
            colors={input.trim() ? [COLORS.gradStart, COLORS.gradEnd] : ['#C8DCF0', '#C8DCF0']}
            style={styles.sendBtn}
          >
            <Text style={styles.sendTxt}>➤</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  list: {
    flex: 1,
  },
  listCont: {
    padding: 16,
    paddingBottom: 12,
    gap: 12,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: { fontSize: 48 },
  emptyTxt: { fontSize: 14, color: COLORS.textMuted },

  // system message
  sysRow: { alignItems: 'center' },
  sysPill: {
    backgroundColor: COLORS.bgMuted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  sysTxt: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  // message row
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  bstack: { maxWidth: '72%' },
  bstackMe: { alignItems: 'flex-end' },
  sender: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleTxt: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bubbleTxtMe: { fontSize: 14, color: '#fff', lineHeight: 20 },
  time: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  timeMe: { textAlign: 'right' },

  // input bar
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendTxt: { fontSize: 15, color: '#fff' },
});
