import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { COLORS } from '../../constants/theme';
import BottomSheet, { FieldRow, SheetBtn } from '../../components/BottomSheet';
import { uid } from '../../utils/tripUtils';

// ─── Constants ────────────────────────────────────────────────
const PLACE_TYPES = [
  '⛩️ วัด', '🏖️ ทะเล/ชายหาด', '🏔️ ภูเขา/ดอย', '🛍️ ชอปปิง',
  '🍜 อาหาร', '🏨 ที่พัก', '🎭 บันเทิง', '🏛️ พิพิธภัณฑ์',
  '🌿 ธรรมชาติ', '📸 จุดถ่ายรูป',
];
const DEFAULT_LAT = 13.7563;
const DEFAULT_LNG = 100.5018;

// ─── Helpers ──────────────────────────────────────────────────
function hasCoords(place) {
  const lat = Number(place?.lat);
  const lng = Number(place?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}

function getPlaceIcon(type = '') {
  const icon = type.trim().split(' ')[0];
  return icon && icon.length <= 4 ? icon : '📍';
}

function buildGoogleMapsUrl(places, trip) {
  const wc = places.filter(hasCoords);
  if (wc.length === 1) return `https://www.google.com/maps/search/?api=1&query=${wc[0].lat},${wc[0].lng}`;
  if (wc.length > 1) return `https://www.google.com/maps/dir/${wc.map((p) => `${p.lat},${p.lng}`).join('/')}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((trip?.name || 'Thailand') + ' Thailand')}`;
}

async function geocodeQuery(query, { retries = 2, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: { Accept: 'application/json', 'Accept-Language': 'th,en', 'User-Agent': 'TripBuddy/1.0' },
        signal: controller.signal,
      },
    );

    if (res.status === 429) {
      // Rate-limited — back off and retry once more
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 1500));
        return geocodeQuery(query, { retries: retries - 1, timeoutMs });
      }
      throw Object.assign(new Error('rate_limit'), { code: 'RATE_LIMIT' });
    }

    if (!res.ok) {
      throw Object.assign(
        new Error(`http_error_${res.status}`),
        { code: 'HTTP_ERROR', status: res.status },
      );
    }

    const data = await res.json();
    if (!data.length) throw Object.assign(new Error('not_found'), { code: 'NOT_FOUND' });

    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('timeout'), { code: 'TIMEOUT' });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Main map HTML ─────────────────────────────────────────────
function buildMainHTML(places) {
  const wc = places.filter(hasCoords);
  let cLat = DEFAULT_LAT, cLng = DEFAULT_LNG, zoom = 6;
  if (wc.length === 1) { cLat = Number(wc[0].lat); cLng = Number(wc[0].lng); zoom = 13; }
  else if (wc.length > 1) {
    cLat = wc.reduce((s, p) => s + Number(p.lat), 0) / wc.length;
    cLng = wc.reduce((s, p) => s + Number(p.lng), 0) / wc.length;
    zoom = 9;
  }
  const markersJS = wc.map((p) => {
    const icon = getPlaceIcon(p.type);
    const name = p.name.replace(/['"\\]/g, ' ');
    const note = (p.note || p.type || 'สถานที่').replace(/['"\\]/g, ' ');
    return `L.marker([${Number(p.lat)},${Number(p.lng)}],{icon:L.divIcon({html:'<div style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))">${icon}</div>',className:'',iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-16]})}).addTo(map).bindPopup('<b>${name}</b><br>${note}');`;
  }).join('\n');
  const fitJS = wc.length > 1 ? `map.fitBounds([${wc.map((p) => `[${p.lat},${p.lng}]`).join(',')}],{padding:[40,40]});` : '';
  return `<!DOCTYPE html><html>
<head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%;background:#EAF6FF}.leaflet-container{background:#EAF6FF}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${cLat},${cLng}],${zoom});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
${markersJS}${fitJS}
</script></body></html>`;
}

// ─── Picker map HTML ───────────────────────────────────────────
// ส่ง lat/lng มาเป็น string เพื่อ inject เข้า HTML ได้ง่าย
function buildPickerHTML(lat, lng) {
  return `<!DOCTYPE html><html>
<head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;background:#EAF6FF}
.leaflet-container{background:#EAF6FF}
#hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
  background:rgba(23,50,75,.88);color:#fff;font-size:12px;padding:7px 16px;
  border-radius:20px;pointer-events:none;z-index:999;white-space:nowrap}
</style></head>
<body>
<div id="map"></div>
<div id="hint">แตะแผนที่เพื่อย้ายหมุด หรือลากหมุดได้เลย</div>
<script>
var pinIcon=L.divIcon({html:'<div style="font-size:30px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4))">📍</div>',className:'',iconSize:[32,40],iconAnchor:[16,38],popupAnchor:[0,-38]});
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${lat},${lng}],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var marker=L.marker([${lat},${lng}],{icon:pinIcon,draggable:true}).addTo(map);

function send(la,lo){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({lat:la,lng:lo}));}

marker.on('dragend',function(e){var p=e.target.getLatLng();send(p.lat,p.lng);});
map.on('click',function(e){marker.setLatLng(e.latlng);send(e.latlng.lat,e.latlng.lng);});

// เรียกจาก RN เพื่อกระโดดไปตำแหน่งใหม่
window.moveTo=function(la,lo){map.setView([la,lo],14);marker.setLatLng([la,lo]);send(la,lo);};
</script></body></html>`;
}

// ─── Picker Modal ──────────────────────────────────────────────
function PickerModal({ visible, initLat, initLng, onConfirm, onClose }) {
  const wvRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [cur, setCur] = useState({ lat: initLat, lng: initLng });

  // เมื่อ modal เปิดใหม่ reset
  useEffect(() => {
    if (visible) { setCur({ lat: initLat, lng: initLng }); setReady(false); }
  }, [visible, initLat, initLng]);

  const html = useMemo(() => buildPickerHTML(initLat, initLng), [initLat, initLng]);

  const onMsg = useCallback((e) => {
    try { const { lat, lng } = JSON.parse(e.nativeEvent.data); setCur({ lat, lng }); } catch {}
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={pm.header}>
            <Text style={pm.headerTxt}>📍 เลือกตำแหน่งบนแผนที่</Text>
            <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
              <Text style={pm.closeTxt}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={{ flex: 1 }}>
            {!ready && (
              <View style={pm.loader}>
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
            )}
            <WebView
              ref={wvRef}
              source={{ html }}
              style={{ flex: 1, opacity: ready ? 1 : 0 }}
              javaScriptEnabled domStorageEnabled originWhitelist={['*']}
              onLoadEnd={() => setReady(true)}
              onMessage={onMsg}
              scrollEnabled={false}
            />
          </View>

          <View style={pm.coordRow}>
            <Text style={pm.coordTxt}>🌐 {cur.lat.toFixed(5)}, {cur.lng.toFixed(5)}</Text>
          </View>

          <TouchableOpacity onPress={() => onConfirm(cur.lat, cur.lng)} activeOpacity={0.85} style={pm.confirmWrap}>
            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={pm.confirmBtn}>
              <Text style={pm.confirmTxt}>✓ ยืนยันตำแหน่งนี้</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function MapTab({ trip, onUpdateTrip, onToast }) {
  const mainWvRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  // Sheet state
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: PLACE_TYPES[9], note: '' });

  // Geocode status
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | found | error
  const [pinnedLat, setPinnedLat] = useState(DEFAULT_LAT);
  const [pinnedLng, setPinnedLng] = useState(DEFAULT_LNG);

  // Picker modal
  const [showPicker, setShowPicker] = useState(false);

  const debounceRef = useRef(null);

  const places = trip?.places || [];
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) || null;

  const mainHTML = useMemo(
    () => buildMainHTML(places),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(places)],
  );

  const itineraryCount = useMemo(
    () => (trip?.itinerary || []).reduce((s, d) => s + (d.items?.length || 0), 0),
    [trip],
  );

  // ── Auto-geocode เมื่อพิมพ์ชื่อสถานที่ ──────────────────────
  const triggerGeocode = useCallback((name) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!name.trim()) { setGeoStatus('idle'); return; }

    setGeoStatus('loading');
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await geocodeQuery(name + ' Thailand');
        setPinnedLat(result.lat);
        setPinnedLng(result.lng);
        setGeoStatus('found');
      } catch (err) {
        setGeoStatus('error');
        // Surface actionable errors via toast so the user knows what happened
        if (err.code === 'RATE_LIMIT') {
          onToast?.('⚠️ Nominatim rate-limit — ลองปักหมุดเองบนแผนที่', 'error');
        } else if (err.code === 'TIMEOUT') {
          onToast?.('⏱ เชื่อมต่อช้าเกินไป — ตรวจสอบอินเทอร์เน็ต', 'error');
        } else if (err.code === 'HTTP_ERROR') {
          onToast?.(`❌ เซิร์ฟเวอร์ตอบกลับ ${err.status} — ลองเลือกเองบนแผนที่แทน`, 'error');
        }
        // NOT_FOUND is expected — silent fallback to map picker, no toast needed
      }
    }, 800);
  }, [onToast]);

  const handleNameChange = (v) => {
    setForm((p) => ({ ...p, name: v }));
    triggerGeocode(v);
  };

  // ── Save place ────────────────────────────────────────────────
  const addPlace = () => {
    if (!form.name.trim()) { onToast?.('กรุณากรอกชื่อสถานที่', 'error'); return; }
    const newPlace = {
      id: uid('place'),
      name: form.name.trim(),
      type: form.type,
      note: form.note.trim(),
      lat: geoStatus === 'found' ? pinnedLat : 0,
      lng: geoStatus === 'found' ? pinnedLng : 0,
    };
    onUpdateTrip?.(trip.id, (prev) => ({ places: [...(prev.places || []), newPlace] }));
    setShowAdd(false);
    resetSheet();
    onToast?.(`เพิ่ม ${newPlace.name} แล้ว${geoStatus === 'found' ? ' 📍' : ''}`, 'success');
  };

  const resetSheet = () => {
    setForm({ name: '', type: PLACE_TYPES[9], note: '' });
    setGeoStatus('idle');
    setPinnedLat(DEFAULT_LAT);
    setPinnedLng(DEFAULT_LNG);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const deletePlace = (placeId) => {
    Alert.alert('ลบสถานที่', 'ต้องการลบสถานที่นี้ออกจากทริปใช่ไหม', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: () => {
          onUpdateTrip?.(trip.id, (prev) => ({ places: (prev.places || []).filter((p) => p.id !== placeId) }));
          if (selectedPlaceId === placeId) setSelectedPlaceId(null);
          onToast?.('ลบสถานที่แล้ว', 'info');
        },
      },
    ]);
  };

  const openGoogleMaps = async () => {
    const url = buildGoogleMapsUrl(places, trip);
    try { await Linking.openURL(url); }
    catch { onToast?.('เปิด Google Maps ไม่สำเร็จ', 'error'); }
  };

  // ── Geo status pill ──────────────────────────────────────────
  const GeoPill = () => {
    if (geoStatus === 'idle') return null;
    if (geoStatus === 'loading') return (
      <View style={styles.geoPill}>
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
        <Text style={styles.geoPillTxt}>กำลังค้นหาตำแหน่ง...</Text>
      </View>
    );
    if (geoStatus === 'found') return (
      <TouchableOpacity style={[styles.geoPill, styles.geoPillFound]} onPress={() => setShowPicker(true)} activeOpacity={0.85}>
        <Text style={styles.geoPillFoundTxt}>
          📌 เจอตำแหน่งแล้ว · {pinnedLat.toFixed(4)}, {pinnedLng.toFixed(4)}{'  '}
          <Text style={{ textDecorationLine: 'underline' }}>แก้ไข</Text>
        </Text>
      </TouchableOpacity>
    );
    return (
      <TouchableOpacity style={[styles.geoPill, styles.geoPillError]} onPress={() => setShowPicker(true)} activeOpacity={0.85}>
        <Text style={styles.geoPillErrTxt}>⚠️ หาตำแหน่งไม่เจอ · กดเพื่อเลือกเองบนแผนที่</Text>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <View>
      {/* ── MAIN MAP ── */}
      <View style={styles.mapBox}>
        {!mapReady && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.mapLoaderTxt}>กำลังโหลดแผนที่...</Text>
          </View>
        )}
        <WebView
          ref={mainWvRef}
          source={{ html: mainHTML }}
          style={[styles.map, !mapReady && { opacity: 0 }]}
          originWhitelist={['*']} javaScriptEnabled domStorageEnabled
          onLoadEnd={() => setMapReady(true)}
          scrollEnabled={false}
        />
        <View pointerEvents="none" style={styles.badgeWrap}>
          <LinearGradient colors={['rgba(23,50,75,0.92)', 'rgba(43,144,217,0.82)']} style={styles.badge}>
            <Text style={styles.badgeLabel}>กำลังแสดง</Text>
            <Text style={styles.badgeTitle} numberOfLines={1}>
              {selectedPlace?.name || trip?.name || 'แผนที่ทริป'}
            </Text>
            <Text style={styles.badgeSub} numberOfLines={1}>
              {places.filter(hasCoords).length > 0
                ? `${places.filter(hasCoords).length} สถานที่มีพิกัด`
                : 'ข้อมูล OpenStreetMap'}
            </Text>
          </LinearGradient>
        </View>
      </View>

      {/* ── ACTIONS ── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={openGoogleMaps} activeOpacity={0.85} style={styles.actionWrap}>
          <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnTxt}>📍 เปิดใน Google Maps</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { resetSheet(); setShowAdd(true); }} activeOpacity={0.85} style={styles.actionWrap}>
          <View style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnTxt}>＋ เพิ่มสถานที่</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.helperTxt}>
        แผนที่ใช้ข้อมูล OpenStreetMap · สถานที่ที่มีพิกัดจะขึ้น marker อัตโนมัติ
      </Text>

      {/* ── STATS ── */}
      <View style={styles.statsRow}>
        {[
          { value: places.length, label: 'สถานที่', icon: '📍' },
          { value: itineraryCount, label: 'กิจกรรม', icon: '🗓️' },
          { value: trip?.members?.length || 0, label: 'สมาชิก', icon: '👥' },
        ].map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{item.icon}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── PLACE LIST ── */}
      <Text style={styles.sectionLabel}>สถานที่ในทริป</Text>

      {places.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>ยังไม่มีสถานที่ในทริปนี้</Text>
          <Text style={styles.emptyText}>
            กด "＋ เพิ่มสถานที่" แล้วพิมพ์ชื่อ ระบบจะหาพิกัดให้อัตโนมัติ
          </Text>
        </View>
      ) : (
        places.map((place, index) => {
          const isSel = place.id === selectedPlaceId;
          return (
            <TouchableOpacity
              key={place.id}
              style={[styles.placeRow, isSel && styles.placeRowActive]}
              onPress={() => setSelectedPlaceId(isSel ? null : place.id)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isSel ? [COLORS.gradStart, COLORS.gradEnd] : ['#E8F6FF', '#FFFFFF']}
                style={styles.placeIcon}
              >
                <Text style={styles.placeIconTxt}>{getPlaceIcon(place.type)}</Text>
              </LinearGradient>
              <View style={styles.placeInfo}>
                <View style={styles.placeTopRow}>
                  <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                  <Text style={styles.placeIndex}>#{index + 1}</Text>
                </View>
                <Text style={styles.placeType} numberOfLines={1}>{place.type || 'สถานที่'}</Text>
                {!!place.note && <Text style={styles.placeNote} numberOfLines={2}>{place.note}</Text>}
                <Text style={styles.placeMapMode}>
                  {hasCoords(place) ? '📌 มีพิกัดจริงแล้ว' : '🔍 ยังไม่มีพิกัด'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => deletePlace(place.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.deleteBtnTxt}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      )}

      {/* ── ADD PLACE SHEET ── */}
      <BottomSheet
        visible={showAdd}
        onClose={() => { setShowAdd(false); resetSheet(); }}
        title="เพิ่มสถานที่"
        snapHeight="90%"
      >
        {/* ชื่อสถานที่ — auto geocode */}
        <FieldRow label="ชื่อสถานที่">
          <TextInput
            style={styles.sheetInput}
            placeholder="เช่น วัดพระแก้ว, หาดป่าตอง, เซ็นทรัลเวิลด์..."
            placeholderTextColor={COLORS.textMuted}
            value={form.name}
            onChangeText={handleNameChange}
            autoFocus
          />
          {/* สถานะการค้นหาพิกัด */}
          <GeoPill />
        </FieldRow>

        {/* ปุ่มเลือกเองบนแผนที่ */}
        <FieldRow label="ตำแหน่งบนแผนที่">
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            activeOpacity={0.85}
            style={styles.mapPickBtn}
          >
            <Text style={styles.mapPickBtnTxt}>
              {geoStatus === 'found'
                ? '🗺️ ดูหรือแก้ตำแหน่งบนแผนที่'
                : '🗺️ เลือกตำแหน่งเองบนแผนที่'}
            </Text>
          </TouchableOpacity>
        </FieldRow>

        {/* ประเภท */}
        <FieldRow label="ประเภท">
          <View style={styles.typeGrid}>
            {PLACE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setForm((p) => ({ ...p, type }))}
                style={[styles.typeChip, form.type === type && styles.typeChipActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.typeChipTxt, form.type === type && styles.typeChipTxtActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FieldRow>

        {/* โน้ต */}
        <FieldRow label="โน้ตเพิ่มเติม">
          <TextInput
            style={[styles.sheetInput, styles.noteInput]}
            placeholder="เช่น แวะตอนเย็น หรือเป็นจุดถ่ายรูป"
            placeholderTextColor={COLORS.textMuted}
            value={form.note}
            onChangeText={(v) => setForm((p) => ({ ...p, note: v }))}
            multiline
          />
        </FieldRow>

        <SheetBtn
          onPress={addPlace}
          label={geoStatus === 'found' ? 'บันทึกสถานที่ 📍' : 'บันทึกสถานที่'}
        />
      </BottomSheet>

      {/* ── PICKER MODAL ── */}
      <PickerModal
        visible={showPicker}
        initLat={pinnedLat}
        initLng={pinnedLng}
        onConfirm={(lat, lng) => {
          setPinnedLat(lat);
          setPinnedLng(lng);
          setGeoStatus('found');
          setShowPicker(false);
          onToast?.('ปักหมุดสำเร็จ', 'success');
        }}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  mapBox: { height: 300, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg, marginBottom: 14 },
  mapLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, gap: 10, zIndex: 10 },
  mapLoaderTxt: { fontSize: 13, color: COLORS.textMuted },
  map: { flex: 1 },
  badgeWrap: { position: 'absolute', top: 12, left: 12, right: 12, alignItems: 'flex-start' },
  badge: { maxWidth: '88%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 },
  badgeLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.72)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  badgeTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  badgeSub: { fontSize: 12, color: 'rgba(255,255,255,0.86)' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionWrap: { flex: 1 },
  primaryBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryBtnTxt: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: COLORS.border },
  secondaryBtnTxt: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  helperTxt: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  placeRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.bgMuted },
  placeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  placeIconTxt: { fontSize: 22 },
  placeInfo: { flex: 1 },
  placeTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  placeName: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.text, marginRight: 8 },
  placeIndex: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  placeType: { fontSize: 12, color: COLORS.primary, marginBottom: 3 },
  placeNote: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 3 },
  placeMapMode: { fontSize: 11, color: COLORS.textMuted },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCEAEA' },
  deleteBtnTxt: { fontSize: 12, fontWeight: '800', color: COLORS.danger },
  // sheet
  sheetInput: { backgroundColor: COLORS.bgInput, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: COLORS.text },
  noteInput: { minHeight: 72, textAlignVertical: 'top' },
  geoPill: { flexDirection: 'row', alignItems: 'center', marginTop: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.bgMuted },
  geoPillTxt: { fontSize: 12, color: COLORS.textMuted },
  geoPillFound: { backgroundColor: '#EDFBF0' },
  geoPillFoundTxt: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  geoPillError: { backgroundColor: '#FEF3CD' },
  geoPillErrTxt: { fontSize: 12, color: '#B45309', fontWeight: '600' },
  mapPickBtn: { borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff', alignItems: 'center' },
  mapPickBtnTxt: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: COLORS.bgMuted, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipTxt: { fontSize: 12, color: COLORS.textMuted },
  typeChipTxtActive: { color: '#FFFFFF', fontWeight: '700' },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { height: '88%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, zIndex: 10 },
  coordRow: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.bgMuted, alignItems: 'center' },
  coordTxt: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  confirmWrap: { padding: 16 },
  confirmBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
