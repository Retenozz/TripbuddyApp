import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

const APP_ICON = require('../../assets/android-icon-foreground.png');

function SplashScreen({ onStart }) {
  return (
    <Pressable style={splash.screen} onPress={onStart}>
      <View style={splash.center}>
        <View style={splash.brandRow}>
          <View style={splash.logoShell}>
            <Image source={APP_ICON} style={splash.logo} resizeMode="contain" />
          </View>
          <Text style={splash.brandText}>
            Trip<Text style={splash.brandAccent}>BUDDY</Text>
          </Text>
        </View>

        <View style={splash.loaderTrack}>
          <View style={splash.loaderFill} />
        </View>
      </View>

      <Text style={splash.prompt}>Tap to Start</Text>
    </Pressable>
  );
}

function AuthForm({ mode, onModeChange, onSubmit }) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetError = () => { if (error) setError(''); };

  const handleSubmit = async () => {
    // ── Validation ──────────────────────────────────────────
    if (isRegister && !name.trim()) {
      setError('กรุณากรอกชื่อที่ใช้แสดง'); return;
    }
    if (!email.trim() || !password.trim()) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน'); return;
    }
    if (!email.includes('@')) {
      setError('อีเมลไม่ถูกต้อง'); return;
    }
    if (password.length < 6) {
      setError('รหัสผ่านควรมีอย่างน้อย 6 ตัวอักษร'); return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน'); return;
    }

    setError('');
    setLoading(true);

    try {
      // ส่ง mode ไปด้วยเพื่อให้ App.js รู้ว่าจะ signIn หรือ signUp
      await onSubmit({
        mode: isRegister ? 'register' : 'login',
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        password,
      });
    } catch (err) {
      // App.js จะ showToast แต่ถ้ามี message ให้แสดงใน form ด้วย
      setError(err?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={auth.screen}>
      <ScrollView contentContainerStyle={auth.content} keyboardShouldPersistTaps="handled">
        <View style={auth.hero}>
          <View style={auth.iconShell}>
            <Image source={APP_ICON} style={auth.icon} resizeMode="contain" />
          </View>
          <Text style={auth.title}>{isRegister ? 'Create Account' : 'User Login'}</Text>
          <Text style={auth.subtitle}>
            {isRegister ? 'สมัครสมาชิกเพื่อเริ่มวางแผนทริปใหม่' : 'Plan your next trip with one shared space.'}
          </Text>
        </View>

        <View style={auth.modeSwitch}>
          <TouchableOpacity
            style={[auth.modeBtn, !isRegister && auth.modeBtnActive]}
            onPress={() => onModeChange('login')}
            activeOpacity={0.8}
          >
            <Text style={[auth.modeTxt, !isRegister && auth.modeTxtActive]}>เข้าสู่ระบบ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[auth.modeBtn, isRegister && auth.modeBtnActive]}
            onPress={() => onModeChange('register')}
            activeOpacity={0.8}
          >
            <Text style={[auth.modeTxt, isRegister && auth.modeTxtActive]}>ลงทะเบียน</Text>
          </TouchableOpacity>
        </View>

        <View style={auth.form}>
          {isRegister && (
            <View style={auth.inputShell}>
              <TextInput
                style={auth.input}
                placeholder="ชื่อที่ใช้แสดง"
                placeholderTextColor="#A3B7C6"
                value={name}
                onChangeText={(v) => { setName(v); resetError(); }}
              />
            </View>
          )}
            
          <View style={auth.inputShell}>
            <TextInput
              style={auth.input}
              placeholder="Email"
              placeholderTextColor="#A3B7C6"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(v) => { setEmail(v); resetError(); }}
            />
          </View>

          <View style={auth.inputShell}>
            <TextInput
              style={auth.input}
              placeholder="Password"
              placeholderTextColor="#A3B7C6"
              secureTextEntry={!showPw}
              value={password}
              onChangeText={(v) => { setPassword(v); resetError(); }}
            />
            <TouchableOpacity onPress={() => setShowPw(p => !p)} activeOpacity={0.7}>
              <Text style={auth.showPw}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {isRegister && (
            <View style={auth.inputShell}>
              <TextInput
                style={auth.input}
                placeholder="Confirm password"
                placeholderTextColor="#A3B7C6"
                secureTextEntry={!showPw}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); resetError(); }}
              />
            </View>
          )}

          {!isRegister && (
            <TouchableOpacity style={auth.forgotWrap} activeOpacity={0.7} disabled>
              <Text style={auth.forgotText}>Forgot Password? (เร็วๆ นี้)</Text>
            </TouchableOpacity>
          )}

          {!!error && <Text style={auth.errorText}>{error}</Text>}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={auth.submitWrap}
          >
            <LinearGradient
              colors={[COLORS.gradStart, COLORS.gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={auth.submitBtn}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={auth.submitTxt}>{isRegister ? 'สมัครสมาชิก' : 'Login'}</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={auth.divider}>
            <View style={auth.dividerLine} />
            <Text style={auth.dividerText}>or</Text>
            <View style={auth.dividerLine} />
          </View>

          <TouchableOpacity style={auth.googleBtn} activeOpacity={0.85} disabled>
            <View style={auth.googleMark}>
              <Text style={auth.googleMarkTxt}>G</Text>
            </View>
            <Text style={[auth.googleText, { color: COLORS.textMuted }]}>Continue with Google (เร็วๆ นี้)</Text>
          </TouchableOpacity>

          <Text style={auth.helperText}>
            {isRegister ? 'สมัครเสร็จแล้วจะเข้าใช้งานได้ทันที' : 'ยังไม่มีบัญชี? '}
            {!isRegister && (
              <Text style={auth.helperLink} onPress={() => onModeChange('register')}>กดลงทะเบียน</Text>
            )}
          </Text>

          {isRegister && (
            <Text style={auth.helperText}>
              มีบัญชีอยู่แล้ว?{' '}
              <Text style={auth.helperLink} onPress={() => onModeChange('login')}>เข้าสู่ระบบ</Text>
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const splash = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#2489D4',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 160,
    paddingBottom: 52,
    paddingHorizontal: 28,
  },
  center: { width: '100%', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 72 },
  logoShell: {
    width: 82, height: 82, borderRadius: 28, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#166EAC', shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
  },
  logo: { width: 54, height: 54 },
  brandText: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  brandAccent: { color: '#FFD15C' },
  loaderTrack: {
    width: '76%', height: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden',
  },
  loaderFill: { width: '68%', height: '100%', borderRadius: 999, backgroundColor: '#FFFFFF' },
  prompt: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});

const auth = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EDF7FD' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 44 },
  hero: { alignItems: 'center', marginBottom: 24 },
  iconShell: {
    width: 86, height: 86, borderRadius: 28, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 4, marginBottom: 18,
  },
  icon: { width: 48, height: 48 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text },
  subtitle: { marginTop: 8, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  modeSwitch: {
    flexDirection: 'row', backgroundColor: '#DCEFFF',
    borderRadius: 999, padding: 4, marginBottom: 18,
  },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  modeBtnActive: { backgroundColor: '#FFFFFF' },
  modeTxt: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  modeTxtActive: { color: COLORS.primary, fontWeight: '700' },
  form: { width: '100%' },
  inputShell: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 999, borderWidth: 1, borderColor: '#D9EAF6',
    paddingHorizontal: 18, minHeight: 52, marginBottom: 12,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 12 },
  showPw: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  forgotWrap: { alignSelf: 'flex-end', marginTop: 2, marginBottom: 14 },
  forgotText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  errorText: { fontSize: 12, color: COLORS.danger, textAlign: 'center', marginBottom: 12 },
  submitWrap: { alignItems: 'center' },
  submitBtn: {
    minWidth: 160, borderRadius: 999, paddingVertical: 13,
    paddingHorizontal: 42, alignItems: 'center', justifyContent: 'center',
  },
  submitTxt: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#D9EAF6' },
  dividerText: { fontSize: 12, color: COLORS.textMuted },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#FFFFFF', borderRadius: 999,
    borderWidth: 1, borderColor: '#D9EAF6', minHeight: 52,
  },
  googleMark: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF4EE',
  },
  googleMarkTxt: { fontSize: 14, fontWeight: '800', color: '#F97316' },
  googleText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  helperText: { marginTop: 18, textAlign: 'center', fontSize: 12, color: COLORS.textMuted },
  helperLink: { color: COLORS.primary, fontWeight: '700' },
});

export default function AuthScreen({ onLogin }) {
  const [phase, setPhase] = useState('splash');
  const [mode, setMode] = useState('login');

  if (phase === 'splash') {
    return <SplashScreen onStart={() => setPhase('auth')} />;
  }

  return <AuthForm mode={mode} onModeChange={setMode} onSubmit={onLogin} />;
}
