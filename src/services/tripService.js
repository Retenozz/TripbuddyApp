import { supabase } from '../lib/supabase';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToTrip(row) {
  if (!row) return null;
  // invite_code / share_code ใช้ค่าจาก column เสมอ (canonical source)
  // แล้วค่อย fallback ไป data JSONB ถ้า column ยัง null
  return {
    ...row.data,
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    inviteCode: row.invite_code || row.data?.inviteCode || null,
    shareCode: row.share_code  || row.data?.shareCode  || null,
    sharedAt:  row.shared_at   || row.data?.sharedAt   || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * แปลง trip object → row สำหรับ insert
 * invite_code และ share_code ต้องขึ้น column จริง ไม่ใช่แค่ใน data JSONB
 */
function tripToRow(trip, userId, userName) {
  const {
    id, ownerId, ownerName,
    inviteCode, shareCode, sharedAt,
    createdAt, updatedAt,
    ...rest
  } = trip;

  // ตัด inviteCode / shareCode ออกจาก rest ด้วย (เผื่อยังอยู่)
  delete rest.inviteCode;
  delete rest.shareCode;
  delete rest.sharedAt;

  const isValidUUID = !!(
    id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  return {
    id:          isValidUUID ? id : undefined,
    owner_id:    ownerId || userId,
    owner_name:  ownerName || userName,
    invite_code: inviteCode || null,
    share_code:  shareCode  || null,
    shared_at:   sharedAt   || null,
    data:        rest,
  };
}

function isUserTripRow(row, userId) {
  if (!row || !userId) return false;
  if (row.owner_id === userId) return true;
  const members = row.data?.members;
  return Array.isArray(members) ? members.some((m) => m.id === userId) : false;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchMyTrips(userId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) { console.error('[tripService] fetchMyTrips error:', error); throw error; }
  return (data || []).filter((row) => isUserTripRow(row, userId)).map(rowToTrip);
}

export async function fetchSharedTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .not('shared_at', 'is', null)
    .order('shared_at', { ascending: false })
    .limit(50);

  if (error) { console.error('[tripService] fetchSharedTrips error:', error); throw error; }
  return (data || []).map(rowToTrip);
}

export async function fetchTripByShareCode(shareCode) {
  const code = String(shareCode || '').trim().toUpperCase();
  if (!code) return null;

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_code', code)
    .maybeSingle();

  if (error) { console.error('[tripService] fetchTripByShareCode error:', error); throw error; }
  return data ? rowToTrip(data) : null;
}

export async function fetchTripByInviteCode(inviteCode) {
  const code = String(inviteCode || '').trim().toUpperCase();
  if (!code) return null;

  console.log('[tripService] fetchTripByInviteCode:', code);

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('invite_code', code)
    .maybeSingle();

  console.log('[tripService] fetchTripByInviteCode result:', { found: !!data, error: error?.message });

  if (error) { console.error('[tripService] fetchTripByInviteCode error:', error); throw error; }
  return data ? rowToTrip(data) : null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTrip(trip, userId, userName) {
  const row = tripToRow(trip, userId, userName);

  // ถ้ายังไม่มี invite_code ให้สร้างให้
  if (!row.invite_code) {
    row.invite_code = Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  console.log('[tripService] createTrip invite_code:', row.invite_code);

  const { data, error } = await supabase
    .from('trips')
    .insert(row)
    .select()
    .single();

  if (error) { console.error('[tripService] createTrip error:', error); throw error; }
  return rowToTrip(data);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTrip(tripId, changes) {
  // ดึง row ปัจจุบันก่อนเพื่อ merge JSONB และรักษา invite_code ไว้
  const { data: existing, error: fetchErr } = await supabase
    .from('trips')
    .select('data, invite_code, share_code, owner_id')
    .eq('id', tripId)
    .single();

  if (fetchErr) { console.error('[tripService] updateTrip fetch error:', fetchErr); throw fetchErr; }

  const {
    ownerId, ownerName,
    inviteCode, shareCode, sharedAt,
    id, createdAt, updatedAt,
    ...rest
  } = changes;

  // ตัด inviteCode / shareCode ออกจาก rest ด้วย
  delete rest.inviteCode;
  delete rest.shareCode;
  delete rest.sharedAt;

  // merge data JSONB — ห้ามลบ field เดิมออก
  const mergedData = { ...(existing?.data || {}), ...rest };

  const patch = {
    data: mergedData,
    // รักษา invite_code ของ row เดิมเสมอ อย่าให้ถูก null ทับ
    invite_code: existing?.invite_code || null,
    // share_code และ shared_at อัปเดตได้ถ้า changes ส่งมา
    ...(shareCode  !== undefined ? { share_code: shareCode }   : {}),
    ...(sharedAt   !== undefined ? { shared_at:  sharedAt }    : {}),
  };

  console.log('[tripService] updateTrip patch invite_code:', patch.invite_code, 'tripId:', tripId);

  const { data, error } = await supabase
    .from('trips')
    .update(patch)
    .eq('id', tripId)
    .select()
    .single();

  if (error) { console.error('[tripService] updateTrip error:', error); throw error; }
  return rowToTrip(data);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTrip(tripId) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) { console.error('[tripService] deleteTrip error:', error); throw error; }
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToTrip(tripId, onChange) {
  const channel = supabase
    .channel(`trip-${tripId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
      (payload) => { if (payload.new) onChange(rowToTrip(payload.new)); }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToUserTrips(userId, onInsert, onUpdate, onDelete) {
  const channel = supabase
    .channel(`user-trips-${userId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trips' },
      (payload) => { if (isUserTripRow(payload.new, userId)) onInsert?.(rowToTrip(payload.new)); }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trips' },
      (payload) => { if (isUserTripRow(payload.new, userId)) onUpdate?.(rowToTrip(payload.new)); }
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'trips' },
      (payload) => { if (payload.old?.id) onDelete?.(payload.old.id); }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
