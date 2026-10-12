import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { type Entry, pageAfterRemoval } from './src/model';
import { keepMedia, loadEntries, removeMedia, saveEntries } from './src/storage';
import { makeFlatPhoto, discardFlatPreview } from './src/processPhoto';
import { openManualCamera, discardManualCapture, isManualCameraAvailable } from './src/nativeCamera';
import { type ManualCapture } from './src/manualCapture';
import * as Sharing from 'expo-sharing';

type Draft = { uri: string; kind: Entry['kind']; editingId?: string; manualCapture?: ManualCapture };
const ink = '#25251f';
const paper = '#f5f0e5';

function Film({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, player => { player.loop = false; });
  return <VideoView player={player} style={styles.media} contentFit="contain" nativeControls />;
}

function Button({ title, onPress, disabled = false, subtle = false }: { title: string; onPress: () => void; disabled?: boolean; subtle?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, subtle && styles.subtleButton, (pressed || disabled) && { opacity: 0.45 }]}><Text style={[styles.buttonText, subtle && { color: ink }]}>{title}</Text></Pressable>;
}

function Journal() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [turning, setTurning] = useState(false);
  const [treatment, setTreatment] = useState<'flat' | 'editorial' | 'original'>('editorial');
  const [lookStrength, setLookStrength] = useState(0.75);
  const [renderedPreview, setRenderedPreview] = useState<{ uri: string; treatment: 'flat' | 'editorial'; strength: number } | null>(null);
  const flatPreview = renderedPreview?.treatment === treatment && renderedPreview.strength === lookStrength ? renderedPreview.uri : null;
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(false);
  const [processAttempt, setProcessAttempt] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const turningRef = useRef(false);
  const mutationRef = useRef(false);
  const pickerRef = useRef(false);
  const turn = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width - 40, 500);
  const active = entries[index];
  const draftPhoto = draft?.kind === 'photo' && !draft.editingId ? draft.uri : null;
  const needsFlat = Boolean(draftPhoto && treatment !== 'original');
  const photoToProcess = needsFlat ? draftPhoto : null;
  const draftImage = needsFlat && flatPreview ? flatPreview : draft?.uri;

  useEffect(() => { setShowOriginal(false); }, [index, active?.id]);
  useEffect(() => {
    let canceled = false;
    let generated: string | undefined;
    setRenderedPreview(null);
    setProcessingError(false);
    setProcessing(Boolean(photoToProcess));
    if (photoToProcess) {
      makeFlatPhoto(photoToProcess, treatment === 'editorial' ? 'editorial' : 'flat', lookStrength).then(uri => {
        generated = uri;
        if (canceled) { void discardFlatPreview(uri); return; }
        setRenderedPreview({ uri, treatment: treatment === 'editorial' ? 'editorial' : 'flat', strength: lookStrength });
      }).catch(() => { if (!canceled) setProcessingError(true); })
        .finally(() => { if (!canceled) setProcessing(false); });
    }
    return () => { canceled = true; if (generated) void discardFlatPreview(generated); };
  }, [photoToProcess, processAttempt, treatment, lookStrength]);

  const draftManual = draft?.manualCapture;
  useEffect(() => () => { if (draftManual) void discardManualCapture(draftManual); }, [draftManual]);

  function closeDraft() { if (!mutationRef.current) setDraft(null); }

  async function load() {
    setLoading(true);
    setLoadError(false);
    try { setEntries(await loadEntries()); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function flip(direction: number) {
    const next = index + direction;
    if (next < 0 || next >= entries.length || turningRef.current || mutationRef.current) return;
    turningRef.current = true;
    setTurning(true);
    Animated.timing(turn, { toValue: direction > 0 ? -1 : 1, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) { turn.setValue(0); turningRef.current = false; setTurning(false); return; }
      setIndex(next);
      turn.setValue(direction > 0 ? 1 : -1);
      Animated.timing(turn, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
        turningRef.current = false; setTurning(false);
      });
    });
  }
  const gestures = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 45) flip(g.dx < 0 ? 1 : -1); },
  });

  async function pick(source: 'camera' | 'library', kind: Entry['kind'] = 'photo') {
    if (pickerRef.current || turningRef.current || mutationRef.current) return;
    pickerRef.current = true; setPicking(true);
    try {
      if (source === 'camera') {
        const camera = await ImagePicker.requestCameraPermissionsAsync();
        if (!camera.granted) {
          Alert.alert('Camera access needed', 'Allow camera access in Settings to capture a moment.', [{ text: 'Cancel' }, { text: 'Settings', onPress: () => { void Linking.openSettings(); } }]);
          return;
        }

      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: kind === 'video' ? ['videos'] : ['images'], videoMaxDuration: 60, quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 1 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setNote('');
        setTreatment('editorial'); setLookStrength(0.75);
        setRenderedPreview(null);
        setDraft({ uri: asset.uri, kind: asset.type === 'video' ? 'video' : 'photo' });
      }
    } catch { Alert.alert('Couldn’t open the camera or library', 'Please try again on your phone.'); }
    finally { pickerRef.current = false; setPicking(false); }
  }

  async function captureManual() {
    if (pickerRef.current || turningRef.current || mutationRef.current) return;
    pickerRef.current = true; setPicking(true);
    try {
      const capture = await openManualCamera();
      if (capture) {
        setNote(''); setTreatment('editorial'); setLookStrength(0.75); setRenderedPreview(null);
        setDraft({ uri: capture.photoUri, kind: 'photo', manualCapture: capture });
      }
    } catch (error) { Alert.alert('Manual camera', error instanceof Error ? error.message : 'The camera could not be opened.'); }
    finally { pickerRef.current = false; setPicking(false); }
  }

  async function exportRaw() {
    if (!active?.rawUri || mutationRef.current || turningRef.current) return;
    mutationRef.current = true; setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable on this device.');
      await Sharing.shareAsync(active.rawUri, { UTI: 'com.adobe.raw-image', mimeType: 'image/x-adobe-dng', dialogTitle: 'Export original Bayer RAW' });
    } catch { Alert.alert('Couldn’t export the DNG', 'The RAW file is still kept with this page. Please try again.'); }
    finally { mutationRef.current = false; setBusy(false); }
  }

  function captureMenu() {
    Alert.alert('Keep a little moment', 'A photograph, a moving picture, a few words.', [
      ...(isManualCameraAvailable ? [{ text: 'Manual camera', onPress: () => { void captureManual(); } }] : []),
      { text: 'Take a photo', onPress: () => { void pick('camera'); } },
      { text: 'Record a video', onPress: () => { void pick('camera', 'video'); } },
      { text: 'Choose from library', onPress: () => { void pick('library'); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function publishPage() {
    if (!draft || mutationRef.current || turningRef.current || (needsFlat && !flatPreview)) return;
    mutationRef.current = true; setBusy(true);
    const copied: string[] = [];
    try {
      let next: Entry[];
      if (draft.editingId) {
        next = entries.map(entry => entry.id === draft.editingId ? { ...entry, note: note.trim() } : entry);
      } else {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const original = await keepMedia(draft.uri, draft.kind, `${id}-original`);
        copied.push(original);
        let pageUri = original;
        if (needsFlat && flatPreview) {
          pageUri = await keepMedia(flatPreview, 'photo', `${id}-flat`);
          copied.push(pageUri);
        }
        next = [...entries, { id, uri: pageUri, kind: draft.kind, note: note.trim(), createdAt: new Date().toISOString(),
          ...(needsFlat ? { originalUri: original, photoTreatment: treatment === 'editorial' ? 'editorial-v1' as const : 'flat-v1' as const, lookStrength } : {}),
          ...(draft.manualCapture ? { capture: { mode: 'manual-photo' as const, iso: draft.manualCapture.iso, shutterSeconds: draft.manualCapture.shutterSeconds } } : {}) }];
      }
      await saveEntries(next);
      setEntries(next);
      if (!draft.editingId) setIndex(next.length - 1);
      setDraft(null);
    } catch {
      await Promise.all(copied.map(removeMedia));
      Alert.alert('This page wasn’t saved', 'Your draft is still here. Check available device storage and try again.');
    } finally { mutationRef.current = false; setBusy(false); }
  }

  function deletePage() {
    if (!active || mutationRef.current || turningRef.current) return;
    const selected = active;
    Alert.alert('Remove this page?', 'Its photo or video and note will be removed from this journal. The original in your photo library is kept.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove page', style: 'destructive', onPress: async () => {
        if (mutationRef.current || turningRef.current) return;
        mutationRef.current = true; setBusy(true);
        try {
          const next = entries.filter(entry => entry.id !== selected.id);
          await saveEntries(next);
          setEntries(next); setIndex(pageAfterRemoval(index, next.length));
          await removeMedia(selected.uri);
          if (selected.originalUri && selected.originalUri !== selected.uri) await removeMedia(selected.originalUri);
          if (selected.rawUri) await removeMedia(selected.rawUri);
        } catch { Alert.alert('Couldn’t remove this page', 'Please try again.'); }
        finally { mutationRef.current = false; setBusy(false); }
      } },
    ]);
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.header}><View><Text style={styles.eyebrow}>A PRIVATE, POCKET-SIZED JOURNAL</Text><Text style={styles.logo}>little zine<Text style={styles.dot}>.</Text></Text></View><View style={styles.issue}><Text style={styles.issueText}>VOL. 01</Text><Text style={styles.issueSmall}>YOUR EVERYDAY</Text></View></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={ink} /><Text style={styles.caption}>Opening your zine…</Text></View> : loadError ? <View style={styles.center}><Text style={styles.emptyTitle}>Your pages need a moment.</Text><Text style={styles.emptyBody}>We couldn’t read your journal. Your saved media has been left untouched.</Text><Button title="Try again" onPress={() => { void load(); }} /></View> : <>
      <ScrollView contentContainerStyle={styles.main}>
        <View style={styles.sectionLine}><Text style={styles.eyebrow}>{active ? 'COLLECTED MOMENTS' : 'ISSUE ONE / BEGINS WITH YOU'}</Text><Text style={styles.small}>{entries.length.toString().padStart(2, '0')} PAGES</Text></View>
        <View style={[styles.bookStack, { width: pageWidth }]}>
          <View style={styles.backPage} /><View style={styles.middlePage} />
          <Animated.View {...gestures.panHandlers} style={[styles.page, { transformOrigin: 'left center', transform: [{ perspective: 1200 }, { rotateY: turn.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-88deg', '0deg', '88deg'] }) }] }]}>
            <View style={styles.spine} />
            {active ? <>
              <View style={styles.pageTop}><Text style={styles.small}>{new Date(active.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</Text><Text style={styles.small}>{active.kind === 'video' ? 'MOVING PICTURE' : 'FIELD NOTES'}</Text></View>
              <View style={[styles.photoFrame, index % 2 === 0 ? { transform: [{ rotate: '-1deg' }] } : { transform: [{ rotate: '1deg' }] }]}>
                {active.kind === 'photo' ? <Image source={{ uri: showOriginal && active.originalUri ? active.originalUri : active.uri }} style={styles.media} resizeMode="contain" accessibilityLabel="Your journal photograph" onError={() => Alert.alert('Media unavailable', 'This file could not be opened. Your note is still saved.')} /> : <Film key={active.id} uri={active.uri} />}
                <Text style={styles.photoLabel}>{active.photoTreatment ? showOriginal ? active.capture?.mode === 'bayer-raw' ? 'neutral RAW preview' : 'original photo' : active.photoTreatment === 'editorial-v1' ? 'editorial / a little piece of life' : 'flat / a little piece of life' : 'a little piece of life'} / {String(index + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.handwritten}>{active.note || 'Some moments don’t need words.'}</Text>
              <View style={styles.pageBottom}><Text style={styles.asterisk}>✳</Text><Text style={styles.pageNumber}>{String(index + 1).padStart(2, '0')}</Text></View>
            </> : <View style={styles.cover}>
              <Text style={styles.coverKicker}>NOTHING TOO SMALL TO KEEP</Text>
              <View style={styles.stamp}><Text style={styles.stampText}>LIFE, AS{ '\n' }IT HAPPENS.</Text></View>
              <Text style={styles.emptyTitle}>The ordinary.{ '\n' }The unforgettable.</Text>
              <Text style={styles.emptyBody}>A photo. A moving picture. A note to your future self. Make a zine out of the things you don’t want to forget.</Text>
              <Text style={styles.coverFooter}>MADE BY YOU, FOR YOU.</Text>
            </View>}
          </Animated.View>
        </View>
        {active && <>
          <View style={styles.navigation}><Button subtle title="← Previous" disabled={index === 0 || turning || busy} onPress={() => flip(-1)} /><Text style={styles.pageCount}>{index + 1} / {entries.length}</Text><Button subtle title="Next →" disabled={index === entries.length - 1 || turning || busy} onPress={() => flip(1)} /></View>
          <Text style={styles.swipeHint}>SWIPE TO TURN THE PAGE</Text>
          {active.capture && <Text style={styles.rawInfo}>{active.capture.mode === 'bayer-raw' ? 'BAYER RAW' : 'MANUAL PHOTO'} · ISO {Math.round(active.capture.iso)} · 1/{Math.round(1 / active.capture.shutterSeconds)} s</Text>}
          {active.rawUri && <Button subtle title="Export original DNG" disabled={busy || turning} onPress={() => { void exportRaw(); }} />}
          {active.originalUri && <Button subtle title={showOriginal ? 'Back to styled photo' : active.capture?.mode === 'bayer-raw' ? 'Compare neutral preview' : 'Compare original photo'} onPress={() => setShowOriginal(value => !value)} />}
          <View style={styles.editRow}><Pressable disabled={busy || turning} accessibilityRole="button" onPress={() => { setNote(active.note); setDraft({ uri: active.uri, kind: active.kind, editingId: active.id }); }}><Text style={styles.textLink}>Edit note</Text></Pressable><Text style={styles.separator}>/</Text><Pressable disabled={busy || turning} accessibilityRole="button" onPress={deletePage}><Text style={styles.textLink}>Remove page</Text></Pressable></View>
        </>}
      </ScrollView>
      <View style={styles.footer}><Text style={styles.footerNote}>Keep the small things.</Text><Button title={picking ? 'Opening…' : '+  Add a moment'} disabled={busy || picking || turning} onPress={captureMenu} /></View>
    </>}
    <Modal visible={draft !== null} animationType="slide" onRequestClose={closeDraft} presentationStyle="pageSheet">
      <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{draft?.editingId ? 'A few different words.' : 'A new little moment.'}</Text><Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Close draft" onPress={closeDraft}><Text style={styles.close}>✕</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.draftBody} keyboardShouldPersistTaps="handled">
          {draft && <View style={styles.draftMedia}>{draft.kind === 'photo' ? <Image source={{ uri: draftImage }} style={styles.media} resizeMode="contain" /> : <Film key={draft.uri} uri={draft.uri} />}</View>}
          {draft?.manualCapture && <Text style={styles.rawInfo}>MANUAL PHOTO · ISO {Math.round(draft.manualCapture.iso)} · 1/{Math.round(1 / draft.manualCapture.shutterSeconds)} s{ '\n' }Your captured photo is kept without an app filter.</Text>}
          {draftPhoto && <View style={styles.treatmentBox}>
            <Text style={styles.eyebrow}>THE FEEL OF THIS PHOTO</Text>
            <View style={styles.treatmentRow}>
              <Button title="Editorial" subtle={treatment !== 'editorial'} disabled={busy} onPress={() => setTreatment('editorial')} />
              <Button title="Flat" subtle={treatment !== 'flat'} disabled={busy} onPress={() => setTreatment('flat')} />
              <Button title="Original" subtle={treatment !== 'original'} disabled={busy} onPress={() => setTreatment('original')} />
            </View>
            <Text style={styles.treatmentHelp}>{treatment === 'editorial' ? 'Olive greens, warm neutrals, richer reds. A quiet look inspired by your reference.' : treatment === 'flat' ? 'Muted colour, softer highlights, a quieter exposure. Your original is kept.' : 'Keep the photo as captured or imported.'}</Text>
            {treatment !== 'original' && <View style={styles.treatmentRow}>
              <Button title="Light" subtle={lookStrength !== 0.45} disabled={busy} onPress={() => setLookStrength(0.45)} />
              <Button title="Medium" subtle={lookStrength !== 0.75} disabled={busy} onPress={() => setLookStrength(0.75)} />
              <Button title="Full" subtle={lookStrength !== 1} disabled={busy} onPress={() => setLookStrength(1)} />
            </View>}
            {processing && <View style={styles.processingRow}><ActivityIndicator size="small" color={ink} /><Text style={styles.treatmentHelp}>Making your photo look…</Text></View>}
            {processingError && <><Text style={styles.treatmentHelp}>The styled version couldn’t be made. Retry or keep the original.</Text><Button subtle title="Retry treatment" disabled={busy || processing} onPress={() => setProcessAttempt(value => value + 1)} /></>}
          </View>}
          <Text style={styles.eyebrow}>WHAT DO YOU WANT TO REMEMBER?</Text>
          <TextInput accessibilityLabel="Note for this moment" value={note} onChangeText={setNote} placeholder="The light, the place, the feeling…" placeholderTextColor="#8c877a" multiline maxLength={2000} editable={!busy} style={styles.noteInput} textAlignVertical="top" />
          <Text style={styles.characterCount}>{note.length} / 2000</Text>
          <Text style={styles.privacy}>Just for you. Saved on this device.</Text>
        </ScrollView>
        <View style={styles.saveBar}><Button title={busy ? 'Saving…' : draft?.editingId ? 'Save note' : 'Keep this page'} disabled={busy || (needsFlat && !flatPreview)} onPress={() => { void publishPage(); }} /></View>
      </KeyboardAvoidingView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

export default function App() { return <SafeAreaProvider><Journal /></SafeAreaProvider>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#e9e5d9' },
  header: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#cec8b9' },
  eyebrow: { fontSize: 9, letterSpacing: 1.8, color: '#686456', fontWeight: '600' },
  logo: { fontFamily: 'Georgia', fontSize: 38, letterSpacing: -2, color: ink, marginTop: 6 }, dot: { color: '#b74d35' },
  issue: { borderWidth: 1, borderColor: ink, padding: 9, transform: [{ rotate: '4deg' }] }, issueText: { fontSize: 12, fontWeight: '800', color: ink }, issueSmall: { fontSize: 6, letterSpacing: 1, marginTop: 4 },
  main: { padding: 20, alignItems: 'center', paddingBottom: 24 },
  sectionLine: { width: '100%', maxWidth: 500, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }, small: { color: '#797263', fontSize: 8, letterSpacing: 1 },
  bookStack: { marginBottom: 10, paddingBottom: 7 }, backPage: { position: 'absolute', left: 9, right: -4, top: 7, bottom: 0, backgroundColor: '#d8d0bd', borderWidth: 1, borderColor: '#bcb29d' },
  middlePage: { position: 'absolute', left: 5, right: -2, top: 4, bottom: 3, backgroundColor: '#eee7d7', borderWidth: 1, borderColor: '#d3c9b3' },
  page: { backgroundColor: paper, padding: 22, paddingLeft: 26, minHeight: 460, borderWidth: 1, borderColor: '#d6cebc', shadowColor: '#393022', shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 4, height: 8 }, elevation: 5 },
  spine: { position: 'absolute', left: 6, top: 0, bottom: 0, width: 5, backgroundColor: '#e8e0cf' },
  pageTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  photoFrame: { backgroundColor: '#fffcf3', padding: 7, paddingBottom: 12, shadowColor: '#292117', shadowOpacity: 0.13, shadowRadius: 3, shadowOffset: { width: 1, height: 2 }, elevation: 2 },
  media: { width: '100%', backgroundColor: '#ddd8cb', aspectRatio: 1 },
  photoLabel: { fontSize: 8, color: '#8b8372', marginTop: 10, textAlign: 'center', letterSpacing: 1 },
  handwritten: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 21, lineHeight: 30, color: ink, marginTop: 26, marginBottom: 24 },
  pageBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', borderTopWidth: 1, borderColor: '#ded7c7', paddingTop: 12 }, asterisk: { fontSize: 23, color: '#b74d35' }, pageNumber: { fontFamily: 'Georgia', fontSize: 15, color: ink },
  cover: { flex: 1, justifyContent: 'center', paddingVertical: 12 }, coverKicker: { fontSize: 8, letterSpacing: 1.7, textAlign: 'center', color: '#766e5f' },
  stamp: { alignSelf: 'center', borderWidth: 2, borderColor: '#b74d35', paddingHorizontal: 24, paddingVertical: 17, marginTop: 28, marginBottom: 28, transform: [{ rotate: '-7deg' }] },
  stampText: { color: '#b74d35', fontSize: 29, lineHeight: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  emptyTitle: { fontFamily: 'Georgia', fontSize: 30, lineHeight: 35, color: ink, textAlign: 'center', marginBottom: 16 }, emptyBody: { fontSize: 14, lineHeight: 22, color: '#756e60', textAlign: 'center', marginBottom: 20 }, coverFooter: { fontSize: 9, letterSpacing: 2, color: '#716958', textAlign: 'center', marginTop: 16 },
  navigation: { flexDirection: 'row', width: '100%', maxWidth: 500, alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }, pageCount: { fontFamily: 'Georgia', color: ink, fontSize: 16 }, swipeHint: { fontSize: 8, letterSpacing: 2, color: '#827a6a', marginTop: 8 },
  editRow: { flexDirection: 'row', gap: 15, marginTop: 22, alignItems: 'center' }, textLink: { fontSize: 12, color: '#6b6455', paddingVertical: 12 }, separator: { color: '#b7ad98' },
  footer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderTopWidth: 1, borderColor: '#cec8b9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, footerNote: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 15, color: '#726a5b', flexShrink: 1 },
  button: { backgroundColor: ink, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 3, minHeight: 46, justifyContent: 'center' }, subtleButton: { backgroundColor: 'transparent', paddingHorizontal: 8 }, buttonText: { color: paper, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  center: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' }, caption: { fontSize: 14, color: '#726a5b', marginTop: 12 },
  modalHeader: { padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderColor: '#cec8b9' }, modalTitle: { fontFamily: 'Georgia', fontSize: 23, color: ink, flex: 1 }, close: { fontSize: 22, color: ink, padding: 8 },
  rawInfo: { fontSize: 10, lineHeight: 17, letterSpacing: 0.8, color: '#726a5b', marginVertical: 12, textAlign: 'center' },
  treatmentBox: { marginBottom: 28 }, treatmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 8 }, treatmentHelp: { fontSize: 12, color: '#726a5b', lineHeight: 18 }, processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  draftBody: { padding: 24 }, draftMedia: { width: '100%', aspectRatio: 1, marginBottom: 28, backgroundColor: '#ddd8cb', padding: 8 }, noteInput: { fontFamily: 'Georgia', fontStyle: 'italic', color: ink, fontSize: 22, lineHeight: 31, minHeight: 160, marginTop: 18, padding: 0 }, characterCount: { textAlign: 'right', fontSize: 10, color: '#827a6a' }, privacy: { fontSize: 11, color: '#827a6a', marginTop: 24 }, saveBar: { padding: 20, borderTopWidth: 1, borderColor: '#cec8b9' },
});
