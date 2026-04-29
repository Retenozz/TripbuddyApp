import { supabase } from '../lib/supabase';
import { MEMBER_COLORS } from '../constants/theme';

/** Pick a random member color for new users */
function randomColor() {
  return MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
}

// ─── Sign Up ─────────────────────────────────────────────────────────────────
export async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { name: name.trim(), color: randomColor() },
    },
  });
  if (error) throw error;
  return data;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Get current session user as app-compatible object ───────────────────────
export function sessionToAppUser(session) {
  if (!session?.user) return null;
  const { id, email, user_metadata } = session.user;
  return {
    id,
    email,
    name: user_metadata?.name || email.split('@')[0],
    color: user_metadata?.color || randomColor(),
    avatar: user_metadata?.avatar || null,
    notificationPrefs: user_metadata?.notificationPrefs || {},
  };
}

// ─── Update user profile metadata ────────────────────────────────────────────
export async function updateProfile(updates) {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  });
  if (error) throw error;
  return data;
}

// ─── Listen to auth state changes ────────────────────────────────────────────
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ? sessionToAppUser(session) : null);
  });
  return data.subscription; // call subscription.unsubscribe() on cleanup
}

// ─── Restore existing session on app start ───────────────────────────────────
export async function restoreSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ? sessionToAppUser(data.session) : null;
}
