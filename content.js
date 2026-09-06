(function () {
  'use strict';

  // ─── inject page-context script ──────────────────────────────────────────────
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('injected.js');
  document.documentElement.prepend(s);
  s.onload = () => s.remove();

  // ─── icons ───────────────────────────────────────────────────────────────────
  const ICON_TRIGGER = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 4v11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M8.5 7.5L12 4l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 17.5h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M7 21h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
  const ICON_UPLOAD = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v8M4.5 3.5L7 1l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 10.5v1.5a1 1 0 001 1h8a1 1 0 001-1v-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
  const ICON_CLOSE = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
  const ICON_SETTINGS = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.901-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.47l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
  </svg>`;
  const ICON_SOUNDCLOUD = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1.5 8v3.2M3.3 6.5v4.7M5.1 7.2v4M6.9 5v6.2" />
    <path d="M9 6.6c.2-.15.5-.25.85-.25 1.2 0 2.15 1.05 2.15 2.35 0 .1 0 .2-.02.3h.32a1.8 1.8 0 0 1 0 3.6H9V6.6z" fill="currentColor" stroke="none"/>
  </svg>`;
  const ICON_AUDIOFX = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 2v6M3 11v3M8 2v2M8 7v7M13 2v9M13 14v0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="3" cy="9" r="1.6" fill="currentColor"/>
    <circle cx="8" cy="5.5" r="1.6" fill="currentColor"/>
    <circle cx="13" cy="12.5" r="1.6" fill="currentColor"/>
  </svg>`;
  const ICON_DD_CHEVRON = `<svg class="vmu-fx-dd-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const STATUS_ICON = {
    pending: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#555" stroke-width="1.3"/><rect x="5" y="4.5" width="1.4" height="5" rx="0.5" fill="#555"/><rect x="7.6" y="4.5" width="1.4" height="5" rx="0.5" fill="#555"/></svg>`,
    uploading: `<svg class="vmu-spin" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="rgba(38,136,235,0.2)" stroke-width="1.5"/><path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="#2688eb" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    done: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" fill="rgba(75,179,75,0.14)" stroke="#4bb34b" stroke-width="1.3"/><path d="M4.5 7l2 2 3-3" stroke="#4bb34b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" fill="rgba(230,70,70,0.12)" stroke="#e64646" stroke-width="1.3"/><path d="M5 5l4 4M9 5l-4 4" stroke="#e64646" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  };

  // ─── state ───────────────────────────────────────────────────────────────────
  let fileQueue = [];
  let isProcessing = false;
  // Batches are now sent to VK's native uploader all at once (see
  // processQueue), so several files can be in flight/pending together —
  // keyed by filename instead of a single global callback/item.
  const uploadDoneCallbacks = new Map();   // fileName -> (data) => void
  const uploadingItemsByName = new Map();  // fileName -> queue item
  // autoPlaylistClaimed: synchronous "am I the one tracking THIS upload
  // call towards auto-playlist" claim, set/checked with no `await` in
  // between (see handoffFilesNatively) so two near-simultaneous calls for
  // what's really one drop/paste never both decide to track it. Released as
  // soon as the batch is either dropped or handed to the queue below — NOT
  // held for the whole runAutoPlaylist run, or a second, genuinely separate
  // upload (e.g. the user clicking "Повторить" on a track that failed while
  // the first batch's dup-check/track-search was still in flight) would see
  // it still held and silently never get processed at all.
  let autoPlaylistClaimed = false;
  // autoPlaylistRunning / autoPlaylistQueue: actual execution serialization.
  // A batch that finishes while runAutoPlaylist is already busy with an
  // earlier one is queued, never dropped — drainAutoPlaylistQueue works
  // through them one at a time.
  let autoPlaylistRunning = false;
  let autoPlaylistQueue = [];
  let isPaused = false;
  let itemIdCounter = 0;

  // ─── playlist download state ──────────────────────────────────────────────────
  const dlTracks = new Map();   // trackId -> {id, title, artist, url}
  let dlCancelFlag = false;

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.data?.type === 'VK_UPLOAD_DONE') {
      const fn = e.data.fileName;
      const cb = fn ? uploadDoneCallbacks.get(fn) : null;
      if (cb) {
        uploadDoneCallbacks.delete(fn);
        cb(e.data);
      }
    }
    if (e.data?.type === 'VK_COVER_DONE' && window.__vmuCoverCallback) {
      window.__vmuCoverCallback(e.data);
      window.__vmuCoverCallback = null;
    }
    if (e.data?.type === 'VKD_HLS_PROGRESS') {
      const cb = hlsProgressHandlers.get(e.data.trackId);
      if (cb) cb(e.data.done, e.data.total);
    }
    if (e.data?.type === 'VKD_TRACK') {
      const t = e.data.track;
      if (t?.id && !dlTracks.has(t.id)) dlTracks.set(t.id, t);
    }
    if (e.data?.type === 'VK_UPLOAD_PROGRESS') {
      const item = e.data.fileName ? uploadingItemsByName.get(e.data.fileName) : null;
      const total = e.data.total || 0;
      if (item && total > 0) {
        item.progress = e.data.loaded / total;
        updateRowProgress(item.id);
      }
    }
    // A batch is handed to VK's native uploader all at once, but VK still
    // transfers files one at a time — this fires when THIS file's network
    // request actually starts, so only that row flips to "uploading"
    // instead of the whole batch spinning from the moment it was sent.
    if (e.data?.type === 'VK_UPLOAD_STARTED') {
      const item = e.data.fileName ? uploadingItemsByName.get(e.data.fileName) : null;
      if (item && item.status === 'pending') {
        item.status = 'uploading';
        renderQueue();
      }
    }
    // Files were actually dispatched onto VK's native input (see
    // handoffFilesNatively / VK_HANDOFF_FILES in injected.js) — swap our
    // static dropzone out for VK's own dialog content so its real progress
    // bar and success/error state show instead of our UI sitting frozen on
    // top of it.
    if (e.data?.type === 'VK_HANDOFF_DISPATCHED' && e.data.ok) {
      revealNativeUploadUI();
    }
  });

  // ─── helpers ─────────────────────────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Trigger injected.js' markRowTrackData and wait for its done-message.
  // Used by both expandPlaylistModal and harvestPageTracks — was previously a
  // fixed 80ms sleep, which over-waits when there's nothing to do and
  // under-waits during the initial big stamp. Awaiting the done-message is
  // self-paced.
  function waitForMarkRows(timeoutMs = 2000) {
    return new Promise(resolve => {
      const t = setTimeout(() => {
        window.removeEventListener('message', h);
        resolve();
      }, timeoutMs);
      function h(e) {
        if (e.source !== window || e.data?.type !== 'VKD_MARK_ROWS_DONE') return;
        clearTimeout(t);
        window.removeEventListener('message', h);
        resolve();
      }
      window.addEventListener('message', h);
      window.postMessage({ type: 'VKD_MARK_ROWS' }, '*');
    });
  }
  const isMP3 = (f) => f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3');
  const fmtSize = (b) => b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const escHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  // Small "?" badge with a native title tooltip — used throughout the audio-FX
  // panel to explain what a control actually does. Native `title` rather than
  // a custom CSS tooltip deliberately: it's rendered by the browser/OS, so it
  // always has readable contrast regardless of VK's theme, and several of
  // these icons sit inside the panel's own scrolling body where a CSS-based
  // popover would risk being clipped by overflow:auto.
  const helpIcon = (text) => ` <span class="vmu-help-icon" title="${escHtml(text)}">?</span>`;

  function waitForElement(sel, ms) {
    return new Promise(resolve => {
      const el = document.querySelector(sel);
      if (el) { resolve(el); return; }
      const obs = new MutationObserver(() => {
        const found = document.querySelector(sel);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(null); }, ms);
    });
  }

  // ─── settings ────────────────────────────────────────────────────────────────
  const SETTINGS_KEY = 'vmu_settings_v2';
  const DAILY_UPLOAD_KEY = 'vmu_daily_upload_v1';
  const DAILY_UPLOAD_LIMIT = 70; // VK's own per-account daily audio upload cap

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  // Approximate — VK's own daily-limit window reset time isn't public, so
  // this counts against local midnight. Good enough to warn well before 70.
  function getTodayUploadCount() {
    try {
      const s = JSON.parse(localStorage.getItem(DAILY_UPLOAD_KEY) || 'null');
      return s && s.date === todayStr() ? (s.count || 0) : 0;
    } catch { return 0; }
  }
  function bumpTodayUploadCount() {
    const count = getTodayUploadCount() + 1;
    try { localStorage.setItem(DAILY_UPLOAD_KEY, JSON.stringify({ date: todayStr(), count })); } catch {}
    return count;
  }
  // ISO 10-band defaults — a band's default position, and where "reset"
  // returns it to, but no longer a hard limit: each band's own {freq,gain,q}
  // in settings.audioFxBands below can drift anywhere via the EQ graph drag
  // (freq) / wheel (q, bandwidth).
  const AUDIOFX_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const EQ_DEFAULT_Q = 1.41; // RBJ-cookbook default — matches BiquadFilterNode's own peaking-EQ default
  let settings = { autoPlaylist: false, dupPlaylistCheck: true, autoAddToExistingPlaylist: true, coverDataUrl: null, autoMeta: false, autoCoverFromId3: false, workMode: 'upload', checkFullPage: false, pinSidebar: false, contentOffsetX: 0, optimizeBigPlaylists: false, hideScrollToTop: false, hideFriendsMusic: false, pinTabsBar: false, downloadThreads: 3, audioFxLimiterEnabled: false, audioFxCompEnabled: false, audioFxEqEnabled: false, audioFxThreshold: -3, audioFxRatio: 4, audioFxInputGain: 0, audioFxOutputGain: 0, audioFxAttack: 3, audioFxRelease: 250, audioFxKnee: 0, audioFxCeiling: -0.3, audioFxCeilingR: -0.3, audioFxLimRelease: 50, audioFxLimGain: 0, audioFxStyle: 3, audioFxAutoRelease: false, audioFxTruePeak: false, audioFxOversampling: 1, audioFxAutoGain: false, audioFxProcessingMode: 0, audioFxChainOrder: 0, audioFxActiveTab: 'compressor', audioFxBands: AUDIOFX_FREQS.map(f => ({ freq: f, gain: 0, q: EQ_DEFAULT_Q })), audioFxCurrentPreset: null, audioFxAB: { A: null, B: null }, audioFxABActive: 'A' };
  const AUDIOFX_STYLE_NAMES = ['Transparent', 'Dynamic', 'Punchy', 'Allround', 'Modern', 'Bus', 'Safe'];
  // Mirrors limiter-worklet.js STYLE_PRESETS' kneeShape column exactly — the
  // transfer-curve visualization runs in this (page) realm and can't import
  // the worklet module, so the knee formula's shape constants are duplicated
  // here. Keep in sync if STYLE_PRESETS changes.
  const AUDIOFX_STYLE_KNEE_SHAPES = [3.0, 2.5, 2.0, 2.0, 1.6, 1.3, 1.0];
  const AUDIOFX_OVERSAMPLE_LABELS = ['2x', '4x', '8x', '16x'];
  // Label i must describe limiter-worklet.js's CHAIN_ORDERS[i] — the dropdown
  // index is sent as the worklet's chainOrder param verbatim. Keep in sync.
  const AUDIOFX_CHAIN_ORDER_LABELS = [
    'EQ → Комп → Лим', 'EQ → Лим → Комп', 'Комп → EQ → Лим',
    'Комп → Лим → EQ', 'Лим → EQ → Комп', 'Лим → Комп → EQ',
  ];
  // Single source of truth for "what counts as an audio-FX sound parameter" —
  // saveSettings()'s whitelist and preset snapshots both iterate this list,
  // so a new limiter/EQ field only ever needs adding here once. (Deliberately
  // excludes audioFxActiveTab/audioFxCurrentPreset/audioFxAB(Active) — those
  // are UI/meta navigation state, not sound parameters, so presets don't
  // touch them.)
  const AUDIOFX_FIELD_KEYS = [
    'audioFxLimiterEnabled', 'audioFxCompEnabled', 'audioFxEqEnabled', 'audioFxThreshold', 'audioFxRatio', 'audioFxInputGain', 'audioFxOutputGain',
    'audioFxAttack', 'audioFxRelease', 'audioFxKnee', 'audioFxCeiling', 'audioFxCeilingR', 'audioFxLimRelease', 'audioFxLimGain', 'audioFxStyle',
    'audioFxAutoRelease', 'audioFxTruePeak', 'audioFxOversampling', 'audioFxAutoGain', 'audioFxProcessingMode', 'audioFxChainOrder', 'audioFxBands',
  ];
  const AUDIOFX_PRESETS_KEY = 'vmu_audiofx_presets_v1';

  // Migrates audioFxBands from the pre-parametric-EQ shape (plain numbers,
  // frequency implied by array index into AUDIOFX_FREQS) or the earlier
  // {freq,gain}-only shape (pre-width-drag) to the current {freq,gain,q}
  // objects — each band's center frequency and width are now themselves
  // adjustable, so both have to be stored per-band instead of read off a
  // fixed ISO array / shared constant. Idempotent: already-migrated arrays
  // pass through unchanged.
  function migrateEqBands(bands) {
    if (!Array.isArray(bands) || bands.length !== AUDIOFX_FREQS.length) {
      return AUDIOFX_FREQS.map(f => ({ freq: f, gain: 0, q: EQ_DEFAULT_Q }));
    }
    return bands.map((b, i) => (b && typeof b === 'object')
      ? { freq: Number(b.freq) || AUDIOFX_FREQS[i], gain: Number(b.gain) || 0, q: Number(b.q) > 0 ? Number(b.q) : EQ_DEFAULT_Q }
      : { freq: AUDIOFX_FREQS[i], gain: Number(b) || 0, q: EQ_DEFAULT_Q });
  }

  function loadSettings() {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        Object.assign(settings, parsed);
        settings.audioFxBands = migrateEqBands(settings.audioFxBands);
        // Migrates the old single audioFxEnabled master toggle (pre-split)
        // into the two independent limiter/EQ toggles the first time a
        // settings blob saved before the split is loaded, so existing users
        // don't silently lose whichever one(s) they had on.
        if (typeof parsed.audioFxEnabled === 'boolean'
          && parsed.audioFxLimiterEnabled === undefined && parsed.audioFxEqEnabled === undefined) {
          settings.audioFxLimiterEnabled = parsed.audioFxEnabled;
          settings.audioFxEqEnabled = parsed.audioFxEnabled;
        }
        // Migrates blobs saved before the compressor/limiter stage split:
        // the old single "Лимитер" toggle drove both the compression
        // envelope and the ceiling, so it seeds the new compressor toggle
        // too. A/B slots persist full snapshots — normalize those the same
        // way so switching to an old slot doesn't zero the new fields.
        if (parsed.audioFxCompEnabled === undefined) settings.audioFxCompEnabled = settings.audioFxLimiterEnabled;
        for (const slot of ['A', 'B']) {
          if (settings.audioFxAB && settings.audioFxAB[slot]) normalizeFxSnapshot(settings.audioFxAB[slot]);
        }
      }
    } catch {}
    if (settings.workMode !== 'check') settings.workMode = 'upload';
  }

  function saveSettings() {
    try {
      const out = {
        autoPlaylist: settings.autoPlaylist,
        dupPlaylistCheck: settings.dupPlaylistCheck,
        autoAddToExistingPlaylist: settings.autoAddToExistingPlaylist,
        coverDataUrl: settings.coverDataUrl,
        autoMeta: settings.autoMeta,
        autoCoverFromId3: settings.autoCoverFromId3,
        workMode: settings.workMode,
        checkFullPage: settings.checkFullPage,
        pinSidebar: settings.pinSidebar,
        contentOffsetX: settings.contentOffsetX,
        optimizeBigPlaylists: settings.optimizeBigPlaylists,
        hideScrollToTop: settings.hideScrollToTop,
        hideFriendsMusic: settings.hideFriendsMusic,
        pinTabsBar: settings.pinTabsBar,
        downloadThreads: settings.downloadThreads,
        audioFxActiveTab: settings.audioFxActiveTab,
        audioFxCurrentPreset: settings.audioFxCurrentPreset,
        audioFxAB: settings.audioFxAB,
        audioFxABActive: settings.audioFxABActive,
      };
      for (const key of AUDIOFX_FIELD_KEYS) out[key] = settings[key];
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(out));
    } catch {}
  }

  function loadAudioFxPresets() {
    try {
      const s = localStorage.getItem(AUDIOFX_PRESETS_KEY);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  }
  function saveAudioFxPresets(presets) {
    try { localStorage.setItem(AUDIOFX_PRESETS_KEY, JSON.stringify(presets)); } catch {}
  }
  function snapshotAudioFxSettings() {
    const snap = {};
    // audioFxBands is the one array-valued field — copy it, not just the
    // reference. Without this, A/B slots (and presets) captured while
    // sharing the live settings.audioFxBands array would alias each other:
    // editing EQ bands on slot B would silently mutate slot A's stored snapshot
    // too, since both would still point at the same underlying array. Each
    // element is itself an object now (freq+gain+q) — clone those too, so a
    // future in-place mutation of one band can't leak across snapshots.
    for (const key of AUDIOFX_FIELD_KEYS) {
      const v = settings[key];
      snap[key] = key === 'audioFxBands'
        ? v.map(b => ({ freq: b.freq, gain: b.gain, q: b.q }))
        : (Array.isArray(v) ? v.slice() : v);
    }
    return snap;
  }
  // Presets originally stored the flat settings snapshot directly under the
  // name key; richer presets (category/tags) wrap it as {settings, category,
  // tags} instead. These three accessors read through either shape so
  // presets saved before this change keep working untouched.
  function presetSettingsOf(entry) { return entry && entry.settings ? entry.settings : entry; }
  // Fills the stage-split fields into a snapshot saved before they existed
  // (old presets / A-B slots), mutating it in place: the old "Лимитер"
  // toggle covered the compression too, so it seeds audioFxCompEnabled.
  function normalizeFxSnapshot(snap) {
    if (!snap) return snap;
    if (snap.audioFxCompEnabled === undefined) snap.audioFxCompEnabled = !!snap.audioFxLimiterEnabled;
    if (snap.audioFxLimRelease === undefined) snap.audioFxLimRelease = 50;
    if (snap.audioFxChainOrder === undefined) snap.audioFxChainOrder = 0;
    snap.audioFxBands = migrateEqBands(snap.audioFxBands);
    return snap;
  }
  function presetCategoryOf(entry) { return (entry && entry.category) || 'Без категории'; }
  function presetTagsOf(entry) { return (entry && Array.isArray(entry.tags)) ? entry.tags : []; }

  // Captured from the literal `settings` object above, before loadSettings()
  // overlays whatever the user has saved — the single source of truth for
  // both the "Базовый" factory preset and the panel's "reset all" button, so
  // neither can drift out of sync with the actual defaults declared above.
  const AUDIOFX_DEFAULTS = snapshotAudioFxSettings();

  loadSettings();

  // Seeds a "Базовый" preset with the factory defaults the first time the
  // preset store doesn't have one (fresh install, or a store that predates
  // this feature) — gives users a one-click way back to a known-good state
  // from the preset browser itself, distinct from the panel's own
  // reset-all button below.
  function ensureBaseAudioFxPreset() {
    const presets = loadAudioFxPresets();
    if (presets['Базовый']) return;
    presets['Базовый'] = { settings: Object.assign({}, AUDIOFX_DEFAULTS), category: 'Стандартные', tags: ['default'] };
    saveAudioFxPresets(presets);
  }
  ensureBaseAudioFxPreset();

  // ─── VK theme detection (light/dark) ───────────────────────────────────────
  // VK's light theme is signalled by a `vkui--vkBase--light` class on its own
  // React root div (a child of <body>, not <html>, confirmed live) — there's
  // no such marker on <html> itself. Mirroring it onto <html> as
  // `.vmu-theme-light` lets style.css key off it regardless of where a given
  // panel is mounted (some are appended straight to document.body, others
  // live inside VK's own dialog DOM). If VK ever renames/removes that class,
  // detectVkLightTheme() falls back to empirically sampling the page's own
  // background-color luminance — same conclusion, without depending on any
  // particular class name surviving VK's next redesign.
  function findVkBaseRoot() {
    return document.querySelector('[class*="vkui--vkBase--"]');
  }
  function detectVkLightTheme() {
    const root = findVkBaseRoot();
    if (root) return /vkui--vkBase--light/.test(root.className);
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const [r, g, b] = m.slice(1, 4).map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  }
  function syncVmuTheme() {
    const isLight = detectVkLightTheme();
    document.documentElement.classList.toggle('vmu-theme-light', isLight);
    return isLight;
  }
  console.log('[vmu] theme detected:', syncVmuTheme() ? 'light' : 'dark');
  const vkBaseRootEl = findVkBaseRoot();
  if (vkBaseRootEl) {
    new MutationObserver(syncVmuTheme).observe(vkBaseRootEl, { attributes: true, attributeFilter: ['class'] });
  }

  function postAudioFxState() {
    window.postMessage({
      type: 'VMU_AUDIOFX_SET',
      limiterEnabled: settings.audioFxLimiterEnabled,
      compEnabled: settings.audioFxCompEnabled,
      eqEnabled: settings.audioFxEqEnabled,
      threshold: settings.audioFxThreshold,
      ratio: settings.audioFxRatio,
      inputGain: settings.audioFxInputGain,
      outputGain: settings.audioFxOutputGain,
      attack: settings.audioFxAttack,
      release: settings.audioFxRelease,
      knee: settings.audioFxKnee,
      ceiling: settings.audioFxCeiling,
      ceilingR: settings.audioFxCeilingR,
      limRelease: settings.audioFxLimRelease,
      limGain: settings.audioFxLimGain,
      style: settings.audioFxStyle,
      autoRelease: settings.audioFxAutoRelease,
      truePeak: settings.audioFxTruePeak,
      oversampling: settings.audioFxOversampling,
      autoGain: settings.audioFxAutoGain,
      processingMode: settings.audioFxProcessingMode,
      chainOrder: settings.audioFxChainOrder,
      bands: settings.audioFxBands,
    }, '*');
  }
  // The limiter's DSP lives in a separate AudioWorklet module — injected.js
  // runs in page context and has no chrome.runtime access to resolve its
  // extension URL, so content.js (which does) hands it over once up front.
  window.postMessage({ type: 'VMU_AUDIOFX_WORKLET_URL', url: chrome.runtime.getURL('limiter-worklet.js') }, '*');
  postAudioFxState();

  // ─── audio FX metering: rAF-painted, decoupled from message arrival ───────
  // VMU_AUDIOFX_METER messages arrive off the audio thread at a fixed rate
  // (~47x/sec) but aren't perfectly paced on the main thread — writing to the
  // DOM straight from the message handler meant a burst of queued messages
  // painted several times in a row, then nothing until the next burst, which
  // read as "jumping and lagging" rather than smooth motion. The handler now
  // only stores the latest raw values (cheap); a single requestAnimationFrame
  // loop, running only while the panel is open, does all the painting once
  // per displayed frame. It also adds real peak-hold ballistics for True Peak
  // and input level, which the worklet reports as instantaneous per-report-
  // block maxima with no smoothing at the source (unlike gain reduction,
  // which is already envelope-smoothed inside the worklet).
  const meterRaw = {
    reductionDb: 0, limReductionDb: 0, inputPeakDb: null, truePeakDb: null,
    momentaryLufs: null, shortTermLufs: null, integratedLufs: null, lra: null,
    autoGainTrimDb: null,
  };
  const PEAK_HOLD_MS = 1500;
  const PEAK_DECAY_DB_PER_SEC = 20;
  const meterDisp = {
    truePeakDb: -60, truePeakHoldUntil: 0,
    inputPeakDb: -60, inputPeakHoldUntil: 0,
  };
  const HISTORY_SECONDS = 15;
  const meterHistory = []; // ring of {t, inputDb, reductionDb, truePeakDb}, trimmed to HISTORY_SECONDS
  let meterLoopRunning = false;
  let lastMeterFrameTs = 0;

  // Gain-reduction values arrive from the worklet as "max seen in this ~21ms
  // report window", reset to 0 right after each send (see limiter-worklet.js'
  // _maxCompReductionSinceReport/_maxLimReductionSinceReport). Painting that
  // raw value straight into the meter bar/readout/history-graph is a
  // staircase: it jumps to the new window's peak, holds flat for ~21ms, then
  // jumps to the next one — which on fast-release settings reads as "shows a
  // value, then resets," and is what made the history graph's shape look
  // wrong. Smoothing here (fast rise so real transients aren't hidden, slower
  // fall so it decays instead of stair-stepping) is shared by every surface
  // that shows these two numbers — bars, text, the history graph, and the
  // transfer-curve's live dot — so they can't disagree with each other.
  const meterSmooth = { reductionDb: 0, limReductionDb: 0 };
  function smoothMeterValue(cur, target, dtSec) {
    if (!isFinite(target)) return cur;
    const timeConstSec = target > cur ? 0.015 : 0.15;
    const coeff = dtSec > 0 ? 1 - Math.exp(-dtSec / timeConstSec) : 1;
    return cur + (target - cur) * coeff;
  }

  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || e.data.type !== 'VMU_AUDIOFX_METER') return;
    meterRaw.reductionDb = Number(e.data.reductionDb) || 0;
    meterRaw.limReductionDb = Number(e.data.limReductionDb) || 0;
    meterRaw.inputPeakDb = typeof e.data.inputPeakDb === 'number' ? e.data.inputPeakDb : null;
    meterRaw.truePeakDb = typeof e.data.truePeakDb === 'number' ? e.data.truePeakDb : null;
    meterRaw.momentaryLufs = e.data.momentaryLufs;
    meterRaw.shortTermLufs = e.data.shortTermLufs;
    meterRaw.integratedLufs = e.data.integratedLufs;
    meterRaw.lra = e.data.lra;
    meterRaw.autoGainTrimDb = e.data.autoGainTrimDb;
  });

  // Standard peak-meter ballistic: jump up instantly to a new higher peak,
  // hold there for PEAK_HOLD_MS, then decay at a fixed dB/sec.
  function applyPeakHold(disp, dbKey, holdKey, targetDb, nowMs, dtSec) {
    if (typeof targetDb !== 'number' || !isFinite(targetDb)) return;
    if (targetDb >= disp[dbKey]) {
      disp[dbKey] = targetDb;
      disp[holdKey] = nowMs + PEAK_HOLD_MS;
    } else if (nowMs >= disp[holdKey]) {
      disp[dbKey] = Math.max(targetDb, disp[dbKey] - PEAK_DECAY_DB_PER_SEC * dtSec);
    }
  }

  // Mirrors the worklet's knee formula (see limiter-worklet.js's STYLE_PRESETS
  // comment) so the transfer-curve canvas can plot it without any DSP state —
  // pure function of the current settings, evaluated at whatever input dB the
  // caller asks for.
  function limiterCurveOutputDb(inputDb) {
    const threshold = settings.audioFxThreshold;
    const ratio = Math.max(1, settings.audioFxRatio);
    const knee = Math.max(0, settings.audioFxKnee);
    const halfKnee = knee / 2;
    const styleIdx = Math.max(0, Math.min(AUDIOFX_STYLE_KNEE_SHAPES.length - 1, settings.audioFxStyle));
    const kneeShape = AUDIOFX_STYLE_KNEE_SHAPES[styleIdx];
    const over = inputDb - threshold;
    let reductionDb = 0;
    if (knee > 0 && over > -halfKnee && over < halfKnee) {
      const x = over + halfKnee;
      reductionDb = halfKnee * Math.pow(x / knee, kneeShape) * (1 - 1 / ratio);
    } else if (over >= halfKnee) {
      reductionDb = over * (1 - 1 / ratio);
    }
    return Math.min(inputDb - reductionDb, settings.audioFxCeiling);
  }

  // Mirrors limiter-worklet.js's designBiquadPeaking (RBJ cookbook peaking EQ)
  // so this canvas can plot each band's curve without any DSP state — Q comes
  // from the band itself (settings.audioFxBands[i].q) rather than a shared
  // constant, same as the worklet's own per-band q0..q9 AudioParams. fs is a
  // nominal 48kHz — close enough for a visualization; band centers topping
  // out at 16kHz are far enough below Nyquist at 44.1k too that the curve
  // shape doesn't meaningfully shift.
  const EQ_CURVE_FS = 48000;
  function designBiquadPeakingForCurve(f0, gainDb, Q, fs) {
    const A = Math.pow(10, gainDb / 40);
    const w0 = 2 * Math.PI * f0 / fs;
    const cosw0 = Math.cos(w0), sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Q);
    const b0 = 1 + alpha * A;
    const b1 = -2 * cosw0;
    const b2 = 1 - alpha * A;
    const a0 = 1 + alpha / A;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha / A;
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
  }
  // Evaluates a biquad's magnitude response (in dB) at frequency f by sampling
  // its digital transfer function on the unit circle (z = e^jw). Cascaded
  // biquads' magnitudes multiply, so summing each band's dB here gives the
  // exact composite response — no need to model the actual filter chain.
  function biquadMagnitudeDb(co, f, fs) {
    const w = 2 * Math.PI * f / fs;
    const cosw = Math.cos(w), sinw = Math.sin(w);
    const cos2w = Math.cos(2 * w), sin2w = Math.sin(2 * w);
    const numRe = co.b0 + co.b1 * cosw + co.b2 * cos2w;
    const numIm = -co.b1 * sinw - co.b2 * sin2w;
    const denRe = 1 + co.a1 * cosw + co.a2 * cos2w;
    const denIm = -co.a1 * sinw - co.a2 * sin2w;
    const numMag = Math.sqrt(numRe * numRe + numIm * numIm);
    const denMag = Math.sqrt(denRe * denRe + denIm * denIm);
    return 20 * Math.log10(numMag / denMag);
  }
  // Shared coordinate mapping between drawEqCurve's rendering and the pointer
  // drag handler in wireEqCanvasDrag — both need to agree pixel-for-pixel on
  // where a given {freq,gain} sits, or dots would render in one place and
  // hit-test/drag in another. Frequency axis is log (20Hz–20kHz, matches the
  // worklet's freq0..9 AudioParam range); gain axis is linear with headroom
  // past the ±12dB a band can actually be set to, so full-scale dots don't
  // touch the graph edges.
  const EQ_GRAPH_FREQ_MIN = 20, EQ_GRAPH_FREQ_MAX = 20000;
  const EQ_GRAPH_LOG_MIN = Math.log10(EQ_GRAPH_FREQ_MIN), EQ_GRAPH_LOG_MAX = Math.log10(EQ_GRAPH_FREQ_MAX);
  const EQ_GRAPH_DB_MIN = -15, EQ_GRAPH_DB_MAX = 15;
  function eqXOfFreq(f, w) {
    const clamped = Math.max(EQ_GRAPH_FREQ_MIN, Math.min(EQ_GRAPH_FREQ_MAX, f));
    return (Math.log10(clamped) - EQ_GRAPH_LOG_MIN) / (EQ_GRAPH_LOG_MAX - EQ_GRAPH_LOG_MIN) * w;
  }
  function eqFreqOfX(x, w) {
    const t = Math.max(0, Math.min(1, x / w));
    return Math.pow(10, EQ_GRAPH_LOG_MIN + (EQ_GRAPH_LOG_MAX - EQ_GRAPH_LOG_MIN) * t);
  }
  function eqYOfGain(db, h) {
    return h - (Math.max(EQ_GRAPH_DB_MIN, Math.min(EQ_GRAPH_DB_MAX, db)) - EQ_GRAPH_DB_MIN) / (EQ_GRAPH_DB_MAX - EQ_GRAPH_DB_MIN) * h;
  }
  function eqGainOfY(y, h) {
    const t = Math.max(0, Math.min(1, 1 - y / h));
    return EQ_GRAPH_DB_MIN + (EQ_GRAPH_DB_MAX - EQ_GRAPH_DB_MIN) * t;
  }

  // Which band the pointer is currently dragging/hovering on the EQ graph
  // (-1 = none) — read by drawEqCurve to highlight the active dot + draw its
  // label, written by wireEqCanvasDrag's pointer/wheel handlers. eqPointerActive
  // distinguishes an actual in-progress pointer drag from the transient
  // highlight a wheel-adjust (no pointer down) also drives through the same
  // eqDragBandIdx, so the wheel's auto-clear timeout can't stomp a real drag.
  let eqDragBandIdx = -1;
  let eqHoverBandIdx = -1;
  let eqPointerActive = false;
  let eqWheelHighlightTimer = null;

  function drawEqCurve() {
    if (settings.audioFxActiveTab !== 'eq') return;
    const canvas = document.getElementById('vmu-fx-eq-curve');
    if (!canvas) return;
    const sized = sizeCanvasForDisplay(canvas);
    if (!sized) return;
    const { ctx, w: W, h: H } = sized;
    ctx.clearRect(0, 0, W, H);

    const xOf = f => eqXOfFreq(f, W);
    const yOf = db => eqYOfGain(db, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    [100, 1000, 10000].forEach(f => {
      ctx.beginPath(); ctx.moveTo(xOf(f) + 0.5, 0); ctx.lineTo(xOf(f) + 0.5, H); ctx.stroke();
    });
    for (let db = EQ_GRAPH_DB_MIN; db <= EQ_GRAPH_DB_MAX; db += 6) {
      ctx.beginPath(); ctx.moveTo(0, yOf(db) + 0.5); ctx.lineTo(W, yOf(db) + 0.5); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.moveTo(0, yOf(0) + 0.5); ctx.lineTo(W, yOf(0) + 0.5); ctx.stroke();

    // Each band's own isolated bump — what THAT band alone does to the
    // spectrum, ignoring every other band — as a filled, translucent "wave"
    // rising (or dipping) from the 0dB line. No combined/summed curve is
    // drawn on top — each band reads as its own independent shape.
    const BAND_STEPS = 120;
    settings.audioFxBands.forEach((b, i) => {
      if (Math.abs(b.gain) < 0.01) return;
      const active = i === eqDragBandIdx || i === eqHoverBandIdx;
      const co = designBiquadPeakingForCurve(b.freq, b.gain, b.q, EQ_CURVE_FS);
      const y0 = yOf(0);
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let s = 0; s <= BAND_STEPS; s++) {
        const f = Math.pow(10, EQ_GRAPH_LOG_MIN + (EQ_GRAPH_LOG_MAX - EQ_GRAPH_LOG_MIN) * s / BAND_STEPS);
        ctx.lineTo(xOf(f), yOf(biquadMagnitudeDb(co, f, EQ_CURVE_FS)));
      }
      ctx.lineTo(W, y0);
      ctx.closePath();
      ctx.fillStyle = active ? 'rgba(38,136,235,0.20)' : 'rgba(38,136,235,0.09)';
      ctx.fill();
      ctx.strokeStyle = active ? 'rgba(38,136,235,0.65)' : 'rgba(38,136,235,0.30)';
      ctx.lineWidth = active ? 1.5 : 1;
      ctx.stroke();
    });

    // Each band's own draggable center-frequency/gain point — lines up with
    // its slider below so the curve and the controls read as the same
    // instrument. Hovered/dragged dot draws larger + filled blue so there's
    // always a clear "what am I about to grab / what am I moving" cue.
    settings.audioFxBands.forEach((b, i) => {
      const active = i === eqDragBandIdx || i === eqHoverBandIdx;
      ctx.beginPath();
      ctx.arc(xOf(b.freq), yOf(b.gain), active ? 5.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#2688eb' : '#ffffff';
      ctx.fill();
      if (active) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.stroke();
      }
    });

    if (eqDragBandIdx >= 0) {
      const b = settings.audioFxBands[eqDragBandIdx];
      const label = `${formatFreqLabel(Math.round(b.freq))} Гц · ${fmtBandDb(b.gain)} дБ · Q ${b.q.toFixed(2)}`;
      const x = xOf(b.freq), y = yOf(b.gain);
      ctx.font = '11px sans-serif';
      const tw = ctx.measureText(label).width;
      let lx = x + 9; if (lx + tw + 4 > W) lx = x - tw - 9;
      let ly = y - 9; if (ly < 11) ly = y + 19;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(label, lx, ly);
    }
  }

  // Makes the EQ graph itself draggable: pointerdown on (near) a band's dot
  // grabs it, horizontal movement re-tunes that band's center frequency
  // (log-mapped, 20Hz–20kHz), vertical movement sets its gain (±12dB), and
  // the mouse wheel over a dot narrows/widens it (Q 0.3–8, the same "how far
  // does this band's own bump reach" the filled wave already draws) — all
  // three inline on the graph, no separate width control elsewhere. The
  // per-band vertical sliders below the graph remain as a gain-only, more
  // precise complement, kept in sync with whatever the graph drag/wheel does.
  function wireEqCanvasDrag() {
    const canvas = document.getElementById('vmu-fx-eq-curve');
    if (!canvas) return;
    const HIT_RADIUS = 12; // CSS px — generous since the dots themselves render smaller

    function bandNear(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left, y = clientY - rect.top;
      let best = -1, bestDist = HIT_RADIUS;
      settings.audioFxBands.forEach((b, i) => {
        const d = Math.hypot(eqXOfFreq(b.freq, rect.width) - x, eqYOfGain(b.gain, rect.height) - y);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    function syncBandControls(i) {
      const b = settings.audioFxBands[i];
      const slider = document.getElementById(`vmu-fx-band-${i}`);
      if (slider) slider.value = String(b.gain);
      const valEl = document.getElementById(`vmu-fx-band-${i}-val`);
      if (valEl) valEl.textContent = fmtBandDb(b.gain);
      const freqEl = document.getElementById(`vmu-fx-band-${i}-freq`);
      if (freqEl) freqEl.textContent = formatFreqLabel(Math.round(b.freq));
      const qEl = document.getElementById(`vmu-fx-band-${i}-q`);
      if (qEl) qEl.textContent = formatQLabel(b.q);
    }

    canvas.addEventListener('pointerdown', (e) => {
      const idx = bandNear(e.clientX, e.clientY);
      if (idx < 0) return;
      e.preventDefault();
      clearTimeout(eqWheelHighlightTimer);
      eqPointerActive = true;
      eqDragBandIdx = idx;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', (e) => {
      if (eqPointerActive && eqDragBandIdx >= 0) {
        const rect = canvas.getBoundingClientRect();
        const freq = Math.round(eqFreqOfX(e.clientX - rect.left, rect.width));
        const gain = Math.max(-12, Math.min(12, Math.round(eqGainOfY(e.clientY - rect.top, rect.height) * 10) / 10));
        settings.audioFxBands[eqDragBandIdx] = { freq, gain, q: settings.audioFxBands[eqDragBandIdx].q };
        syncBandControls(eqDragBandIdx);
        postAudioFxState();
      } else {
        eqHoverBandIdx = bandNear(e.clientX, e.clientY);
        canvas.style.cursor = eqHoverBandIdx >= 0 ? 'grab' : 'default';
      }
    });

    function endDrag(e) {
      if (!eqPointerActive) return;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
      eqPointerActive = false;
      eqDragBandIdx = -1;
      canvas.style.cursor = 'default';
      saveSettings();
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', () => { if (!eqPointerActive) eqHoverBandIdx = -1; });

    // Double-click a dot resets just that band (frequency, gain AND width)
    // back to its ISO default — mirrors the per-slider dblclick-to-zero
    // below, but this one also undoes a frequency/width change, which the
    // slider can't touch.
    canvas.addEventListener('dblclick', (e) => {
      const idx = bandNear(e.clientX, e.clientY);
      if (idx < 0) return;
      settings.audioFxBands[idx] = { freq: AUDIOFX_FREQS[idx], gain: 0, q: EQ_DEFAULT_Q };
      syncBandControls(idx);
      saveSettings();
      postAudioFxState();
    });

    // Wheel over a dot narrows/widens that band (Q) — multiplicative steps
    // since Q is perceived logarithmically (the jump from 0.5→1 and 4→8 both
    // "sound like" one notch). Gain already has its own axis (vertical drag)
    // and its own precise control (the slider below), so wheel is free to
    // mean width here instead of duplicating that. Briefly reuses
    // eqDragBandIdx to flash the dot + label (same visual the drag itself
    // uses) so the change is visible without holding a mouse button down.
    canvas.addEventListener('wheel', (e) => {
      const idx = bandNear(e.clientX, e.clientY);
      if (idx < 0) return;
      e.preventDefault();
      const factor = e.shiftKey ? 1.04 : 1.12;
      const b = settings.audioFxBands[idx];
      const q = Math.max(0.3, Math.min(8, Math.round(b.q * (e.deltaY < 0 ? factor : 1 / factor) * 100) / 100));
      settings.audioFxBands[idx] = { freq: b.freq, gain: b.gain, q };
      syncBandControls(idx);
      saveSettings();
      postAudioFxState();
      if (!eqPointerActive) {
        eqDragBandIdx = idx;
        clearTimeout(eqWheelHighlightTimer);
        eqWheelHighlightTimer = setTimeout(() => {
          if (!eqPointerActive) eqDragBandIdx = -1;
        }, 900);
      }
    }, { passive: false });
  }

  // Makes a band readout span (contenteditable — see buildAudioFxPanel)
  // directly typeable: focusing it swaps the display text for the raw
  // number and selects it, Enter or losing focus commits whatever's typed
  // (via `set`, which clamps/persists/pushes it live), Escape reverts
  // without committing. `get`/`format` are called again after commit so a
  // clamped value is echoed back rather than the raw typed text.
  function wireInlineBandEdit(el, { get, set, format }) {
    if (!el) return;
    el.addEventListener('focus', () => {
      el.textContent = String(get());
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); el.textContent = format(get()); el.blur(); }
    });
    el.addEventListener('blur', () => {
      const n = parseFloat((el.textContent || '').replace(',', '.'));
      if (isFinite(n)) set(n);
      el.textContent = format(get());
      saveSettings();
    });
  }

  // Resizes the canvas' backing buffer to match its CSS size at the current
  // devicePixelRatio (only when it actually changed) and returns a context
  // pre-scaled so all drawing below can keep using CSS-pixel coordinates.
  function sizeCanvasForDisplay(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (!cssW || !cssH) return null;
    const pxW = Math.round(cssW * dpr), pxH = Math.round(cssH * dpr);
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: cssW, h: cssH };
  }

  function drawTransferCurve() {
    if (settings.audioFxActiveTab !== 'compressor') return;
    const canvas = document.getElementById('vmu-fx-curve');
    if (!canvas) return;
    const sized = sizeCanvasForDisplay(canvas);
    if (!sized) return;
    const { ctx, w: W, h: H } = sized;
    ctx.clearRect(0, 0, W, H);

    const dbMin = -60, dbMax = 6;
    const xOf = db => (db - dbMin) / (dbMax - dbMin) * W;
    const yOf = db => H - (Math.max(dbMin, Math.min(dbMax, db)) - dbMin) / (dbMax - dbMin) * H;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let db = dbMin; db <= dbMax; db += 12) {
      ctx.beginPath(); ctx.moveTo(xOf(db) + 0.5, 0); ctx.lineTo(xOf(db) + 0.5, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, yOf(db) + 0.5); ctx.lineTo(W, yOf(db) + 0.5); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.moveTo(xOf(dbMin), yOf(dbMin)); ctx.lineTo(xOf(dbMax), yOf(dbMax)); ctx.stroke();

    ctx.strokeStyle = 'rgba(230,76,76,0.55)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, yOf(settings.audioFxCeiling)); ctx.lineTo(W, yOf(settings.audioFxCeiling)); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,166,60,0.55)';
    ctx.beginPath(); ctx.moveTo(xOf(settings.audioFxThreshold), 0); ctx.lineTo(xOf(settings.audioFxThreshold), H); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#2688eb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const STEPS = 160;
    for (let i = 0; i <= STEPS; i++) {
      const inDb = dbMin + (dbMax - dbMin) * i / STEPS;
      const x = xOf(inDb), y = yOf(limiterCurveOutputDb(inDb));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Live operating point: measured input peak vs. measured reduction
    // (both stages) — the actual current point on the curve, not the
    // theoretical one.
    if (typeof meterRaw.inputPeakDb === 'number' && (settings.audioFxCompEnabled || settings.audioFxLimiterEnabled)) {
      const inDb = meterDisp.inputPeakDb;
      const outDb = Math.min(inDb - meterSmooth.reductionDb - meterSmooth.limReductionDb, settings.audioFxCeiling);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(xOf(inDb), yOf(outDb), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHistoryGraph() {
    if (settings.audioFxActiveTab !== 'metering') return;
    const canvas = document.getElementById('vmu-fx-history');
    if (!canvas || !meterHistory.length) return;
    const sized = sizeCanvasForDisplay(canvas);
    if (!sized) return;
    const { ctx, w: W, h: H } = sized;
    ctx.clearRect(0, 0, W, H);

    const now = meterHistory[meterHistory.length - 1].t;
    const t0 = now - HISTORY_SECONDS * 1000;
    const xOf = t => (t - t0) / (HISTORY_SECONDS * 1000) * W;
    const dbMin = -60, dbMax = 0;
    const yOf = db => H - (Math.max(dbMin, Math.min(dbMax, db)) - dbMin) / (dbMax - dbMin) * H;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let db = dbMin; db <= dbMax; db += 12) {
      ctx.beginPath(); ctx.moveTo(0, yOf(db) + 0.5); ctx.lineTo(W, yOf(db) + 0.5); ctx.stroke();
    }

    // Gain reduction — filled band from 0dB down to -reductionDb.
    ctx.fillStyle = 'rgba(230,76,76,0.32)';
    ctx.beginPath();
    ctx.moveTo(xOf(meterHistory[0].t), yOf(0));
    for (const p of meterHistory) ctx.lineTo(xOf(p.t), yOf(-p.reductionDb));
    ctx.lineTo(xOf(meterHistory[meterHistory.length - 1].t), yOf(0));
    ctx.closePath();
    ctx.fill();

    // Input level line.
    ctx.strokeStyle = 'rgba(150,180,255,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let started = false;
    for (const p of meterHistory) {
      if (typeof p.inputDb !== 'number') continue;
      const x = xOf(p.t), y = yOf(p.inputDb);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // True peak — sparse dots (only populated while the True Peak toggle is on).
    ctx.fillStyle = '#e6a63c';
    for (const p of meterHistory) {
      if (typeof p.truePeakDb !== 'number') continue;
      ctx.fillRect(xOf(p.t) - 0.5, yOf(p.truePeakDb) - 0.5, 1, 1);
    }

    // Playhead — the current instant, always pinned to the right edge.
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.moveTo(W - 1, 0); ctx.lineTo(W - 1, H); ctx.stroke();
  }

  function paintMeters(nowMs) {
    const dtSec = lastMeterFrameTs ? Math.min(0.25, (nowMs - lastMeterFrameTs) / 1000) : 0;
    lastMeterFrameTs = nowMs;

    applyPeakHold(meterDisp, 'truePeakDb', 'truePeakHoldUntil', meterRaw.truePeakDb, nowMs, dtSec);
    applyPeakHold(meterDisp, 'inputPeakDb', 'inputPeakHoldUntil', meterRaw.inputPeakDb, nowMs, dtSec);
    meterSmooth.reductionDb = smoothMeterValue(meterSmooth.reductionDb, meterRaw.reductionDb, dtSec);
    meterSmooth.limReductionDb = smoothMeterValue(meterSmooth.limReductionDb, meterRaw.limReductionDb, dtSec);

    const db = meterSmooth.reductionDb;
    const fill = document.getElementById('vmu-fx-meter-fill');
    const val = document.getElementById('vmu-fx-meter-val');
    if (fill) fill.style.width = Math.max(0, Math.min(100, (db / 24) * 100)) + '%';
    if (val) val.textContent = '-' + db.toFixed(1) + ' дБ';

    const limDb = meterSmooth.limReductionDb;
    const limFill = document.getElementById('vmu-fx-limmeter-fill');
    const limVal = document.getElementById('vmu-fx-limmeter-val');
    if (limFill) limFill.style.width = Math.max(0, Math.min(100, (limDb / 24) * 100)) + '%';
    if (limVal) limVal.textContent = '-' + limDb.toFixed(1) + ' дБ';

    const tpFill = document.getElementById('vmu-fx-tp-fill');
    const tpVal = document.getElementById('vmu-fx-tp-val');
    if (meterRaw.truePeakDb !== null) {
      const tp = meterDisp.truePeakDb;
      if (tpFill) tpFill.style.width = Math.max(0, Math.min(100, ((tp + 60) / 60) * 100)) + '%';
      if (tpVal) tpVal.textContent = tp.toFixed(1) + ' дБTP';
    } else {
      if (tpFill) tpFill.style.width = '0%';
      if (tpVal) tpVal.textContent = '— дБTP';
    }

    const fmtLufs = v => typeof v === 'number' ? v.toFixed(1) + ' LUFS' : '—';
    const mEl = document.getElementById('vmu-fx-lufs-m');
    const sEl = document.getElementById('vmu-fx-lufs-s');
    const iEl = document.getElementById('vmu-fx-lufs-i');
    const lraEl = document.getElementById('vmu-fx-lra');
    if (mEl) mEl.textContent = fmtLufs(meterRaw.momentaryLufs);
    if (sEl) sEl.textContent = fmtLufs(meterRaw.shortTermLufs);
    if (iEl) iEl.textContent = fmtLufs(meterRaw.integratedLufs);
    if (lraEl) lraEl.textContent = typeof meterRaw.lra === 'number' ? meterRaw.lra.toFixed(1) + ' LU' : '—';

    const agVal = document.getElementById('vmu-fx-autogain-val');
    if (agVal) {
      const ag = meterRaw.autoGainTrimDb;
      agVal.textContent = typeof ag === 'number' ? (ag >= 0 ? '+' : '') + ag.toFixed(1) + ' дБ' : '0.0 дБ';
    }

    // History plots the total dynamics reduction — compressor + limiter
    // stages together, which is what "how much is being taken off" means.
    // Input uses the peak-held/decaying meterDisp value, not raw
    // meterRaw.inputPeakDb — the raw value is "loudest sample in the last
    // ~21ms report window", which for real music swings by 20-30dB between
    // consecutive reports and, plotted at full density, drew as a dense
    // comb of spikes rather than a readable level trace.
    // Same reasoning as inputDb above — meterRaw.truePeakDb is also a raw
    // per-report-window max; meterDisp.truePeakDb is the peak-held version
    // already computed by applyPeakHold() a few lines up. Keep it null
    // (not 0/-60) when True Peak is off so the sparse-dot drawing below
    // still skips those points entirely, same as before.
    const truePeakForHistory = meterRaw.truePeakDb !== null ? meterDisp.truePeakDb : null;
    meterHistory.push({ t: nowMs, inputDb: meterDisp.inputPeakDb, reductionDb: db + limDb, truePeakDb: truePeakForHistory });
    const cutoff = nowMs - HISTORY_SECONDS * 1000;
    while (meterHistory.length && meterHistory[0].t < cutoff) meterHistory.shift();

    drawTransferCurve();
    drawEqCurve();
    drawHistoryGraph();
  }

  function meterTick(ts) {
    if (!meterLoopRunning) return;
    paintMeters(ts);
    requestAnimationFrame(meterTick);
  }
  function startMeterLoop() {
    if (meterLoopRunning) return;
    meterLoopRunning = true;
    lastMeterFrameTs = 0;
    requestAnimationFrame(meterTick);
  }
  function stopMeterLoop() {
    meterLoopRunning = false;
  }

  // ─── layout customizations (pin sidebar, horizontal offset) ──────────────
  // Drive layout tweaks through a single <style id="vmu-layout-style"> tag so
  // changes apply globally and survive React re-renders without per-element
  // mutation. Targets VK's #layout_sidebar and #page_body by id.
  function applyLayoutCustomizations() {
    let el = document.getElementById('vmu-layout-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'vmu-layout-style';
      (document.head || document.documentElement).appendChild(el);
    }
    const parts = [];
    const dx = Math.round(Number(settings.contentOffsetX) || 0);

    if (settings.pinSidebar) {
      // Pin the sidebar BELOW VK's fixed top bar — otherwise the first nav
      // item (Профиль) gets hidden behind it once stuck. Measure the top bar
      // at apply time so we're robust to VK UI changes (compact vs full).
      const topBar = document.querySelector('[class*="vkuiFixedLayout"]');
      const topBarH = topBar ? Math.round(topBar.getBoundingClientRect().height) : 48;
      // align-self: flex-start prevents the parent flex from stretching the
      // sidebar to its row's height so sticky has a finite anchor.
      parts.push(
        `#layout_sidebar { position: sticky !important; top: ${topBarH}px !important; align-self: flex-start !important; }`
      );
      // VK applies sticky-like behaviour to the sidebar footer
      // (`.vkui-inset-block-start-2xl` inside `#ads_wrapper`: Блог / Авторам /
      // Информация о контенте). With the sidebar pinned, that footer jumps
      // to viewport-top=48 as soon as the page scrolls past ~500px. The
      // element's computed `position` reports "static" but `top: 16px` is set
      // and an as-yet-unclear VK behaviour treats it like sticky in this
      // configuration. Forcing `position: static; top: auto` neutralises it —
      // confirmed live: footer stays at its natural in-flow position (391)
      // across the entire scroll range.
      parts.push(
        `#layout_sidebar [class*="inset-block-start-2xl"], #ads_wrapper > * { position: static !important; top: auto !important; bottom: auto !important; inset-block-start: auto !important; inset-block-end: auto !important; }`
      );
    }

    // VK's left "Наверх" scroll-to-top strip is a 397px-wide position:fixed
    // click-catcher that overlaps the sidebar whenever the horizontal offset
    // slider is used. Two modes:
    //   - hidden entirely (settings toggle)
    //   - shrunk to a small icon-only chip (default — keeps it usable but
    //     stops it from grabbing clicks past x=40)
    if (settings.hideScrollToTop) {
      parts.push(`#stl_left { display: none !important; }`);
    } else {
      // Constrain outer #stl_left (click area) to a 40px rail and stretch
      // inner #stl_bg to the rail's full height so the hover highlight
      // matches the clickable area instead of a clipped 40x40 chip. Kill
      // VK's own offsets (#stl_text margin-left:19px, svg margin-right:4px)
      // — they pushed the arrow off-center. The "Наверх" text is hidden via
      // font-size:0 on #stl_text (SVG keeps its pixel width/height
      // attributes so the arrow icon stays visible).
      parts.push(`#stl_left { width: 40px !important; }`);
      parts.push(`#stl_bg { width: 40px !important; height: calc(100% - 60px) !important; padding: 0 !important; margin: 60px 0 0 !important; overflow: hidden !important; display: flex !important; align-items: flex-start !important; justify-content: center !important; }`);
      parts.push(`#stl_text { font-size: 0 !important; margin: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 40px !important; flex: none !important; }`);
      parts.push(`#stl_text svg { width: 20px !important; height: 20px !important; margin: 0 !important; }`);
    }

    // "Музыка друзей" — the friends'-listening-activity block VK injects
    // into "Моя музыка" between "Музыканты" and the track list. VK spaces
    // catalog sections with plain 16px spacer <div>s in between rather than
    // flex/grid gap, so hiding just the section leaves both its neighbouring
    // spacers in place (32px gap instead of 16px) — also hide the spacer
    // immediately after it to collapse back to a single gap.
    if (settings.hideFriendsMusic) {
      parts.push(`[data-testid="AudioCatalog_SectionFriendsMusic"] { display: none !important; }`);
      parts.push(`[data-testid="AudioCatalog_SectionFriendsMusic"] + div { display: none !important; }`);
    }

    if (settings.optimizeBigPlaylists) {
      // content-visibility: auto tells the browser to skip layout/paint for
      // any row outside the viewport. contain-intrinsic-size keeps the
      // scrollbar accurate by reserving height for skipped rows (`auto`
      // remembers the actual size once each row has rendered at least once).
      // Heights match the measured rows (page list 48px, playlist popup 56px)
      // — a wrong estimate accumulates into phantom scroll height until every
      // row renders once. DOM nodes stay intact, so data-vmu-track stamps,
      // dupe scan and scroll-to behaviour keep working.
      parts.push(
        `[data-testid="MusicTrackRow"] { content-visibility: auto !important; contain-intrinsic-size: auto 48px !important; }`
      );
      parts.push(
        `[data-testid="MusicPlaylistTracks_MusicTrackRow"], [class*="vkitAudioRow__root"], .audio_row, .AudioRow { content-visibility: auto !important; contain-intrinsic-size: auto 56px !important; }`
      );
    }

    if (dx !== 0) {
      // Shift two containers in sync:
      //   1. LayoutWrapper__body  — the flex parent of sidebar + page_body
      //   2. TopNavigationWrapper__outer — the content wrapper INSIDE VK's
      //      fixed top bar (vkuiFixedLayout). The top bar itself is
      //      position: fixed so shifting it directly is awkward; instead we
      //      shift its inner content so logo/search/player/avatar move in
      //      lockstep with the page content underneath.
      // Why position:relative + left, not transform:
      //   - Browser quirk: `position: sticky` + `left` is ignored on elements
      //     whose containing block has no horizontal scroll (verified live —
      //     sticky + left:-230 → no visual offset). Shifting the parent
      //     instead of the sticky child sidesteps this entirely.
      //   - `transform` would move both at once, but it creates a new
      //     containing block for `position: fixed` descendants. VK modals
      //     would then anchor to the shifted container and disappear.
      // `position: relative` shifts the visible content without creating a
      // containing block for fixed children, so modals stay viewport-anchored
      // and the pinned sidebar's sticky behaviour keeps working.
      parts.push(
        `[class*="LayoutWrapper__body"], [class*="TopNavigationWrapper__outer"] { position: relative !important; left: ${dx}px !important; transition: left .15s ease; }`
      );
    }

    el.textContent = parts.join('\n');
    positionCheckPanel();
  }
  applyLayoutCustomizations();
  ensureAudioFxUI();

  // Keeps the check-mode result panel clear of VK's content column. The
  // column can be shifted horizontally via the "Смещение контента" slider
  // above; when that eats into the panel's usual right-side spot, flip the
  // panel to the left edge instead of letting it overlap the content.
  // Also clears the top nav bar AND the in-flow "now playing" block — the
  // latter (data-testid="AudioPage_PlayerBlock") isn't fixed/sticky, but it
  // sits at a fixed-looking vertical band right under the nav bar and can
  // reach further right on narrower viewports than the fixed top:76px
  // assumed, colliding with a right-anchored panel there.
  function positionCheckPanel() {
    const panel = document.getElementById('vmu-check-panel');
    if (!panel) return;
    if (panel.dataset.vmuUserMoved) return;
    const margin = 24;
    const topBar = document.querySelector('[class*="vkuiFixedLayout"]');
    const playerBlock = document.querySelector('[data-testid="AudioPage_PlayerBlock"]');
    const topBarBottom = topBar ? topBar.getBoundingClientRect().bottom : 48;
    const playerBottom = playerBlock ? playerBlock.getBoundingClientRect().bottom : 0;
    const top = Math.max(48, topBarBottom, playerBottom) + margin;
    panel.style.top = top + 'px';
    panel.style.maxHeight = `calc(100vh - ${top + margin}px)`;

    const layout = document.querySelector('[class*="LayoutWrapper__body"]');
    const rect = layout ? layout.getBoundingClientRect() : null;
    const vw = window.innerWidth;
    const rightGap = rect ? vw - rect.right : vw;
    const leftGap = rect ? rect.left : 0;
    const needsFlip = rightGap < panel.offsetWidth + margin && leftGap > rightGap;
    panel.classList.toggle('vmu-check-panel-left', needsFlip);
    panel.style.left = needsFlip ? margin + 'px' : '';
  }

  // ─── audio FX: live limiter + 10-band EQ on the currently playing track ────
  // Lives as its own floating panel (not the upload-dialog settings panel)
  // since it needs to be reachable while just listening to music, with no
  // upload dialog open. Toggled by a small button anchored next to VK's
  // persistent mini-player (AudioPage_PlayerBlock — same "pick the actually
  // visible one of the two DOM copies" logic as applyTabsBarPin below).
  function formatFreqLabel(hz) {
    return hz >= 1000 ? (hz / 1000) + 'k' : String(hz);
  }
  function fmtBandDb(v) {
    return (v > 0 ? '+' : '') + v.toFixed(1);
  }
  function formatQLabel(q) {
    return 'Q' + q.toFixed(2);
  }

  // Custom cascading dropdown — replaces native <select> for Style/Oversampling
  // so the option list can actually be themed (a native <select>'s popup is
  // OS-chrome and can't be styled to match the panel's dark UI). Markup is a
  // button (current label + chevron) followed by an absolutely-positioned
  // option list, toggled via a couple of data-vmu-dd-* hooks so the same
  // wiring works for any dropdown built with this markup.
  function buildDropdownHtml(containerId, options, selectedIdx) {
    return `
      <div class="vmu-fx-dd" id="${containerId}">
        <button type="button" class="vmu-fx-dd-btn" data-vmu-dd-btn>
          <span data-vmu-dd-label>${escHtml(options[selectedIdx] ?? options[0])}</span>
          ${ICON_DD_CHEVRON}
        </button>
        <div class="vmu-fx-dd-list" data-vmu-dd-list style="display:none">
          ${options.map((label, i) => `<button type="button" class="vmu-fx-dd-item${i === selectedIdx ? ' active' : ''}" data-value="${i}">${escHtml(label)}</button>`).join('')}
        </div>
      </div>`;
  }
  // Wires open/close + selection for one dropdown built by buildDropdownHtml.
  // onSelect(idx) fires when the user picks an option; the caller owns
  // updating settings/posting state, this only owns the widget's own UI.
  function initCustomDropdown(containerId, onSelect) {
    const root = document.getElementById(containerId);
    if (!root) return;
    const btn = root.querySelector('[data-vmu-dd-btn]');
    const label = root.querySelector('[data-vmu-dd-label]');
    const list = root.querySelector('[data-vmu-dd-list]');
    if (!btn || !list) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const opening = list.style.display === 'none';
      document.querySelectorAll('.vmu-fx-dd-list').forEach(l => {
        l.style.display = 'none';
        l.closest('.vmu-fx-dd')?.classList.remove('vmu-fx-dd-open');
      });
      if (opening) {
        list.style.display = '';
        root.classList.add('vmu-fx-dd-open');
      }
    });
    list.addEventListener('click', e => {
      const item = e.target.closest('.vmu-fx-dd-item');
      if (!item) return;
      const idx = parseInt(item.dataset.value, 10) || 0;
      list.querySelectorAll('.vmu-fx-dd-item').forEach(el => el.classList.toggle('active', el === item));
      if (label) label.textContent = item.textContent;
      list.style.display = 'none';
      root.classList.remove('vmu-fx-dd-open');
      onSelect(idx);
    });
  }
  // Updates a dropdown's displayed label/active option from outside — used
  // by refreshAllAudioFxControls after a preset/A-B load changes the value
  // from something other than the user clicking the dropdown itself.
  function syncCustomDropdown(containerId, options, idx) {
    const root = document.getElementById(containerId);
    if (!root) return;
    root.querySelectorAll('.vmu-fx-dd-item').forEach((el, i) => el.classList.toggle('active', i === idx));
    const label = root.querySelector('[data-vmu-dd-label]');
    if (label && options[idx] !== undefined) label.textContent = options[idx];
  }

  function buildAudioFxPanel() {
    const limiterRow = (id, label, min, max, step, value, unit, help) => `
      <div class="vmu-setting-row vmu-slider-row">
        <div class="vmu-setting-info">
          <span class="vmu-setting-label">${label}${help ? helpIcon(help) : ''}</span>
        </div>
        <div class="vmu-slider-wrap">
          <input type="range" id="${id}" class="vmu-slider" min="${min}" max="${max}" step="${step}" value="${value}">
          <span class="vmu-slider-value" id="${id}-val">${value}${unit}</span>
          <button type="button" id="${id}-reset" class="vmu-slider-reset" title="Сбросить">↺</button>
        </div>
      </div>`;

    // step=0.1 (vs. the old 0.5) gives finer keyboard/native-drag resolution;
    // combined with the live numeric readout and the wheel/dblclick handlers
    // wired in attachAudioFxHandlers, dragging a 90px-tall slider by hand is
    // no longer the only way to land on a precise value. All three readouts
    // (gain/freq/Q) are contenteditable — click one and type an exact value,
    // Enter/blur commits it, Escape reverts — wired in wireInlineBandEdit.
    const bands = settings.audioFxBands.map((b, i) => `
      <div class="vmu-eq-band">
        <span class="vmu-eq-band-val vmu-eq-editable" id="vmu-fx-band-${i}-val" contenteditable="true" spellcheck="false" inputmode="decimal" tabindex="0" title="Клик — ввести громкость вручную (дБ)">${fmtBandDb(b.gain)}</span>
        <input type="range" id="vmu-fx-band-${i}" class="vmu-eq-band-slider" min="-12" max="12" step="0.1" value="${b.gain}" title="Колесо мыши — шаг 0.5 дБ (Shift — 0.1 дБ), двойной клик — сброс полосы" orient="vertical">
        <span class="vmu-eq-band-freq vmu-eq-editable" id="vmu-fx-band-${i}-freq" contenteditable="true" spellcheck="false" inputmode="decimal" tabindex="0" title="Клик — ввести частоту вручную (Гц)">${formatFreqLabel(Math.round(b.freq))}</span>
        <span class="vmu-eq-band-q vmu-eq-editable" id="vmu-fx-band-${i}-q" contenteditable="true" spellcheck="false" inputmode="decimal" tabindex="0" title="Клик — ввести ширину полосы вручную (Q)">${formatQLabel(b.q)}</span>
      </div>`).join('');

    const tab = settings.audioFxActiveTab || 'compressor';
    const isTab = t => tab === t ? ' active' : '';
    const pageDisplay = t => tab === t ? '' : ' style="display:none"';

    return `
      <div id="vmu-audiofx-panel" class="vmu-audiofx-panel">
        <div class="vmu-audiofx-head">
          <span class="vmu-audiofx-title">Эквалайзер</span>
          <button type="button" id="vmu-audiofx-close" class="vmu-check-close" title="Закрыть">${ICON_CLOSE}</button>
        </div>
        <div class="vmu-audiofx-presets-row">
          <button type="button" id="vmu-fx-preset-toggle" class="vmu-audiofx-select vmu-fx-preset-toggle-btn">
            <span id="vmu-fx-preset-current">${settings.audioFxCurrentPreset ? escHtml(settings.audioFxCurrentPreset) : '— пресет —'}</span>
          </button>
          <button type="button" id="vmu-fx-preset-save" class="vmu-slider-reset" title="Сохранить текущие настройки как пресет">＋</button>
          <button type="button" id="vmu-fx-reset-all" class="vmu-slider-reset" title="Сбросить всё на дефолт">⟲</button>
          <div class="vmu-fx-ab-switch" id="vmu-fx-ab-switch" title="Быстрое A/B-сравнение двух наборов настроек">
            <button type="button" data-vmu-ab="A" class="${settings.audioFxABActive === 'A' ? 'active' : ''}">A</button>
            <button type="button" data-vmu-ab="B" class="${settings.audioFxABActive === 'B' ? 'active' : ''}">B</button>
          </div>
        </div>
        <div id="vmu-fx-preset-browser" class="vmu-fx-preset-browser" style="display:none">
          <input type="text" id="vmu-fx-preset-search" class="vmu-fx-preset-search" placeholder="Поиск по названию или тегу...">
          <div id="vmu-fx-preset-cats" class="vmu-fx-preset-cats"></div>
          <div id="vmu-fx-preset-list" class="vmu-fx-preset-list"></div>
        </div>
        <div id="vmu-fx-preset-saveform" class="vmu-fx-preset-saveform" style="display:none">
          <input type="text" id="vmu-fx-preset-name" class="vmu-fx-preset-input" placeholder="Название пресета">
          <input type="text" id="vmu-fx-preset-category" class="vmu-fx-preset-input" placeholder="Категория" list="vmu-fx-preset-cat-list">
          <datalist id="vmu-fx-preset-cat-list"></datalist>
          <input type="text" id="vmu-fx-preset-tags" class="vmu-fx-preset-input" placeholder="Теги через запятую">
          <div class="vmu-fx-preset-saveform-actions">
            <button type="button" id="vmu-fx-preset-save-confirm" class="vmu-fx-preset-btn-primary">Сохранить</button>
            <button type="button" id="vmu-fx-preset-save-cancel" class="vmu-fx-preset-btn-secondary">Отмена</button>
          </div>
        </div>
        <div class="vmu-audiofx-section vmu-audiofx-chain-section">
          <div class="vmu-setting-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Цепочка${helpIcon('Порядок обработки сигнала — в каком порядке он проходит через эквалайзер, компрессор и лимитер. Например, поставьте лимитер первым, чтобы поймать пики ещё до эквализации, или эквалайзер последним, чтобы подчистить тембр после сжатия.')}</span>
            </div>
            ${buildDropdownHtml('vmu-fx-chain-dd', AUDIOFX_CHAIN_ORDER_LABELS, settings.audioFxChainOrder)}
          </div>
          ${limiterRow('vmu-fx-input', 'Вход', -24, 24, 0.5, settings.audioFxInputGain, ' дБ', 'Гейн перед всей цепочкой обработки (EQ + компрессор + лимитер). Поднимите, если исходный сигнал слишком тихий, чтобы раскачать компрессор или лимитер.')}
          ${limiterRow('vmu-fx-output', 'Выход', -24, 24, 0.5, settings.audioFxOutputGain, ' дБ', 'Гейн после всей цепочки обработки. Компенсирует громкость, которую сняли компрессор и лимитер, либо намеренно понижает финальный уровень.')}
        </div>
        <div class="vmu-audiofx-tabs" id="vmu-audiofx-tabs" role="tablist">
          <button type="button" data-vmu-fxtab="compressor" class="${isTab('compressor')}">Компрессор</button>
          <button type="button" data-vmu-fxtab="limiter" class="${isTab('limiter')}">Лимитер</button>
          <button type="button" data-vmu-fxtab="eq" class="${isTab('eq')}">EQ</button>
          <button type="button" data-vmu-fxtab="metering" class="${isTab('metering')}">Метринг</button>
        </div>
        <div class="vmu-audiofx-body">
          <div class="vmu-audiofx-tabpage${isTab('compressor')}" data-vmu-fxtab-page="compressor"${pageDisplay('compressor')}>
            <div class="vmu-audiofx-section">
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Компрессор${helpIcon('Включает/выключает стадию компрессии. При выключении сигнал проходит через это место в цепочке без изменений — лимитер и EQ остаются на своих местах в порядке цепочки.')}</span>
                </div>
                <label class="vmu-toggle">
                  <input type="checkbox" id="vmu-fx-comp-enable" ${settings.audioFxCompEnabled ? 'checked' : ''}>
                  <span class="vmu-toggle-track"></span>
                </label>
              </div>
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Стиль${helpIcon('Характер компрессии — от мягкого и незаметного (Transparent) до жёсткого и предсказуемого (Safe). Меняет форму колена, тип детектора (пик/RMS) и подмес быстрого восстановления — сами слайдеры ниже при этом не трогает. Allround — поведение по умолчанию.')}</span>
                </div>
                ${buildDropdownHtml('vmu-fx-style-dd', AUDIOFX_STYLE_NAMES, settings.audioFxStyle)}
              </div>
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Обработка стерео${helpIcon('Связка — общее решение по громче́му из двух каналов (по умолчанию). Раздельно — независимое усиление на левом и правом канале. M-S — независимое усиление на средней (mid) и боковой (side) составляющей стерео-сигнала. Действует на обе динамические стадии.')}</span>
                </div>
                <div class="vmu-mode-switch" id="vmu-fx-procmode" role="tablist">
                  <button type="button" data-vmu-procmode="0" class="${settings.audioFxProcessingMode === 0 ? 'active' : ''}">Связка</button>
                  <button type="button" data-vmu-procmode="1" class="${settings.audioFxProcessingMode === 1 ? 'active' : ''}">Раздельно</button>
                  <button type="button" data-vmu-procmode="2" class="${settings.audioFxProcessingMode === 2 ? 'active' : ''}">M-S</button>
                </div>
              </div>
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Авто-восстановление${helpIcon('Время восстановления подстраивается под материал в реальном времени: медленнее на плотном/громком звуке (чтобы не «пампировало»), быстрее на резком/перкуссивном (чтобы успевать восстанавливаться между ударами) — вместо фиксированного значения слайдера «Восстановление» ниже.')}</span>
                </div>
                <label class="vmu-toggle">
                  <input type="checkbox" id="vmu-fx-autorelease" ${settings.audioFxAutoRelease ? 'checked' : ''}>
                  <span class="vmu-toggle-track"></span>
                </label>
              </div>
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Авто-гейн${helpIcon('Компенсирует громкость, которую забирает компрессор, чтобы сравнение вкл/выкл (A/B) было честным по громкости, а не просто «включено — значит громче». Приближение, не точный LUFS-матчинг.')}</span>
                </div>
                <span class="vmu-slider-value" id="vmu-fx-autogain-val" style="margin-right:8px">0.0 дБ</span>
                <label class="vmu-toggle">
                  <input type="checkbox" id="vmu-fx-autogain" ${settings.audioFxAutoGain ? 'checked' : ''}>
                  <span class="vmu-toggle-track"></span>
                </label>
              </div>
              <div class="vmu-audiofx-canvas-wrap">
                <canvas id="vmu-fx-curve" class="vmu-audiofx-canvas"></canvas>
              </div>
              <div class="vmu-audiofx-meter-row">
                <span class="vmu-audiofx-meter-label">Снижение усиления${helpIcon('Сколько дБ компрессор сейчас снимает с сигнала.')}</span>
                <div class="vmu-audiofx-meter"><div class="vmu-audiofx-meter-fill" id="vmu-fx-meter-fill"></div></div>
                <span class="vmu-audiofx-meter-val" id="vmu-fx-meter-val">0.0 дБ</span>
              </div>
              ${limiterRow('vmu-fx-threshold', 'Порог', -60, 0, 1, settings.audioFxThreshold, ' дБ', 'Уровень сигнала (в дБ), выше которого начинает работать компрессия. Чем ниже порог — тем больше материала попадает под сжатие.')}
              ${limiterRow('vmu-fx-ratio', 'Соотношение', 1, 20, 0.5, settings.audioFxRatio, ':1', 'Степень сжатия сигнала выше порога. Например, 4:1 означает, что превышение порога на 4 дБ на входе станет превышением всего на 1 дБ на выходе.')}
              ${limiterRow('vmu-fx-knee', 'Колено', 0, 40, 1, settings.audioFxKnee, ' дБ', 'Ширина плавного перехода вокруг порога (в дБ). 0 — жёсткое колено (компрессия включается резко ровно на пороге), больше — мягкий, постепенный переход в компрессию.')}
              ${limiterRow('vmu-fx-attack', 'Атака', 0, 100, 1, settings.audioFxAttack, ' мс', 'Как быстро (в мс) компрессор реагирует на превышение порога и начинает снижать громкость.')}
              ${limiterRow('vmu-fx-release', 'Восстановление', 0, 1000, 5, settings.audioFxRelease, ' мс', 'Как быстро (в мс) компрессор отпускает сигнал обратно после того, как уровень опустился ниже порога. Игнорируется, если включено «Авто-восстановление» выше.')}
            </div>
          </div>
          <div class="vmu-audiofx-tabpage${isTab('limiter')}" data-vmu-fxtab-page="limiter"${pageDisplay('limiter')}>
            <div class="vmu-audiofx-section">
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Лимитер${helpIcon('Настоящий lookahead brick-wall лимитер с собственной огибающей: бесконечное соотношение к потолку, атака жёстко привязана к lookahead (5 мс — огибающая успевает опуститься до выхода транзиента из задержки). Финальный клэмп остаётся только страховкой от остаточных долей дБ, а не основным механизмом ограничения.')}</span>
                </div>
                <label class="vmu-toggle">
                  <input type="checkbox" id="vmu-fx-limiter-enable" ${settings.audioFxLimiterEnabled ? 'checked' : ''}>
                  <span class="vmu-toggle-track"></span>
                </label>
              </div>
              ${limiterRow('vmu-fx-limgain', 'Гейн', -24, 24, 0.5, settings.audioFxLimGain, ' дБ', 'Отдельный дожим сигнала прямо перед лимитером, независимо от общих Входа/Выхода цепочки (вкладка сверху). Потолок остаётся тем же — лимитер просто снимает больше или меньше. Классическая ручка «подать погорячее».')}
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Истинный пик${helpIcon('Лимитирует по межсэмпловым перегрузам (inter-sample peaks), а не только по значениям самих сэмплов — важно для стриминга и вещания, где декодер может восстановить более высокий пик, чем виден в сэмплах на этой дорожке.')}</span>
                </div>
                <label class="vmu-toggle">
                  <input type="checkbox" id="vmu-fx-truepeak" ${settings.audioFxTruePeak ? 'checked' : ''}>
                  <span class="vmu-toggle-track"></span>
                </label>
              </div>
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Передискретизация${helpIcon('Кратность передискретизации для расчёта истинного пика (2×/4×/8×/16×) — настоящий полифазный FIR-банк, а не приближение. Выше — точнее, но чуть больше нагрузка на процессор. Учитывается только пока включён «Истинный пик».')}</span>
                </div>
                ${buildDropdownHtml('vmu-fx-oversampling-dd', AUDIOFX_OVERSAMPLE_LABELS, settings.audioFxOversampling)}
              </div>
              <div class="vmu-audiofx-meter-row">
                <span class="vmu-audiofx-meter-label">Снижение усиления${helpIcon('Сколько дБ лимитер сейчас снимает с сигнала.')}</span>
                <div class="vmu-audiofx-meter"><div class="vmu-audiofx-meter-fill" id="vmu-fx-limmeter-fill"></div></div>
                <span class="vmu-audiofx-meter-val" id="vmu-fx-limmeter-val">0.0 дБ</span>
              </div>
              ${limiterRow('vmu-fx-ceiling', 'Потолок', -20, 0, 0.1, settings.audioFxCeiling, ' дБ', 'Максимальный уровень сигнала на выходе лимитера (в дБ) — сигнал не может превысить этот уровень.')}
              <div class="vmu-setting-row vmu-slider-row" id="vmu-fx-ceilingr-row" style="${settings.audioFxProcessingMode === 1 ? '' : 'display:none'}">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Потолок R${helpIcon('Отдельный потолок для правого канала — учитывается только в режиме «Раздельно» на вкладке «Компрессор», когда каналы обрабатываются независимо.')}</span>
                </div>
                <div class="vmu-slider-wrap">
                  <input type="range" id="vmu-fx-ceilingr" class="vmu-slider" min="-20" max="0" step="0.1" value="${settings.audioFxCeilingR}">
                  <span class="vmu-slider-value" id="vmu-fx-ceilingr-val">${Math.round(settings.audioFxCeilingR * 10) / 10} дБ</span>
                  <button type="button" id="vmu-fx-ceilingr-reset" class="vmu-slider-reset" title="Сбросить">↺</button>
                </div>
              </div>
              ${limiterRow('vmu-fx-limrelease', 'Восстановление', 1, 1000, 1, settings.audioFxLimRelease, ' мс', 'Как быстро (в мс) лимитер отпускает снижение громкости после того, как пиковый сигнал прошёл. Атака у лимитера фиксирована (5 мс, привязана к lookahead) и отдельно не настраивается.')}
            </div>
          </div>
          <div class="vmu-audiofx-tabpage${isTab('eq')}" data-vmu-fxtab-page="eq"${pageDisplay('eq')}>
            <div class="vmu-audiofx-section">
              <div class="vmu-setting-row">
                <div class="vmu-setting-info">
                  <span class="vmu-setting-label">Эквалайзер${helpIcon('Включает/выключает 10-полосный параметрический эквалайзер.')}</span>
                </div>
                <label class="vmu-toggle">
                  <input type="checkbox" id="vmu-fx-eq-enable" ${settings.audioFxEqEnabled ? 'checked' : ''}>
                  <span class="vmu-toggle-track"></span>
                </label>
              </div>
              <div class="vmu-audiofx-canvas-wrap">
                <canvas id="vmu-fx-eq-curve" class="vmu-audiofx-canvas vmu-eq-canvas-interactive"></canvas>
              </div>
              <div class="vmu-audiofx-section-title">
                <span>Полосы${helpIcon('10 полос, по умолчанию на стандартной ISO-сетке (31 Гц – 16 кГц), каждая ±12 дБ. Точки на графике выше можно тащить прямо мышью: вертикально — громкость полосы, горизонтально — её частота. Колесо мыши на точке графика — ширина полосы (Shift — мельче шаг); колесо на полосе ниже — громкость (шаг 0.5 дБ, Shift — 0.1 дБ). Двойной клик по точке или полосе — сброс.')}</span>
                <button type="button" id="vmu-fx-eq-reset" class="vmu-slider-reset" title="Сбросить все полосы">↺</button>
              </div>
              <div class="vmu-eq-bands-row">
                <div class="vmu-eq-axis">
                  <span>+12</span><span>+6</span><span>0</span><span>−6</span><span>−12</span>
                </div>
                <div class="vmu-eq-bands">
                  <div class="vmu-eq-zero-line"></div>
                  ${bands}
                </div>
              </div>
            </div>
          </div>
          <div class="vmu-audiofx-tabpage${isTab('metering')}" data-vmu-fxtab-page="metering"${pageDisplay('metering')}>
            <div class="vmu-audiofx-section">
              <div class="vmu-audiofx-section-title">
                <span>Метринг${helpIcon('Живые измерения текущего трека: история за последние 15 секунд, пиковые и интегральные показатели громкости (LUFS/LRA) по стандарту ITU-R BS.1770-4.')}</span>
                <button type="button" id="vmu-fx-lufs-reset" class="vmu-slider-reset" title="Сбросить накопленные значения">↺</button>
              </div>
              <div class="vmu-audiofx-canvas-wrap">
                <canvas id="vmu-fx-history" class="vmu-audiofx-canvas vmu-audiofx-canvas-history"></canvas>
              </div>
              <div class="vmu-fx-history-legend">
                <span><i class="vmu-fx-legend-dot" style="background:rgba(150,180,255,0.85)"></i>Вход</span>
                <span><i class="vmu-fx-legend-dot" style="background:rgba(230,76,76,0.6)"></i>Снижение усиления</span>
                <span><i class="vmu-fx-legend-dot" style="background:#e6a63c"></i>Истинный пик</span>
              </div>
              <div class="vmu-audiofx-meter-row">
                <span class="vmu-audiofx-meter-label">Истинный пик</span>
                <div class="vmu-audiofx-meter"><div class="vmu-audiofx-meter-fill vmu-audiofx-meter-fill-tp" id="vmu-fx-tp-fill"></div></div>
                <span class="vmu-audiofx-meter-val" id="vmu-fx-tp-val">— дБTP</span>
              </div>
              <div class="vmu-setting-row"><div class="vmu-setting-info"><span class="vmu-setting-label">Мгновенная${helpIcon('Momentary LUFS — громкость за последние 400 мс, самый быстрый из LUFS-показателей, следует за сиюминутными изменениями.')}</span></div><span class="vmu-slider-value" id="vmu-fx-lufs-m">—</span></div>
              <div class="vmu-setting-row"><div class="vmu-setting-info"><span class="vmu-setting-label">Кратковременная${helpIcon('Short-term LUFS — громкость за последние 3 секунды, сглаженный показатель, обычно используется как ориентир при сведении/мастеринге.')}</span></div><span class="vmu-slider-value" id="vmu-fx-lufs-s">—</span></div>
              <div class="vmu-setting-row"><div class="vmu-setting-info"><span class="vmu-setting-label">Интегральная${helpIcon('Integrated LUFS — средняя громкость за весь трек с момента открытия панели или сброса, с гейтингом тихих участков (ITU-R BS.1770-4). Стандарт для нормализации громкости на стриминговых сервисах.')}</span></div><span class="vmu-slider-value" id="vmu-fx-lufs-i">—</span></div>
              <div class="vmu-setting-row"><div class="vmu-setting-info"><span class="vmu-setting-label">Диапазон громкости${helpIcon('LRA (Loudness Range) в LU — разброс громкости трека: разница между тихими и громкими участками. Меньше — более ровный/сжатый по динамике трек, больше — более динамичный.')}</span></div><span class="vmu-slider-value" id="vmu-fx-lra">—</span></div>
              <span class="vmu-setting-hint">Требует включённого «Истинный пик» на вкладке «Лимитер» для показаний true-peak метра.</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  // Re-syncs every control's displayed value from `settings` — needed after
  // loading a preset, since that changes many fields at once from a
  // non-user-input source (nothing else in the panel does that; every other
  // update flows through a single control's own change handler).
  function refreshAllAudioFxControls() {
    const setChecked = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    setChecked('vmu-fx-limiter-enable', settings.audioFxLimiterEnabled);
    setChecked('vmu-fx-comp-enable', settings.audioFxCompEnabled);
    setChecked('vmu-fx-eq-enable', settings.audioFxEqEnabled);
    setChecked('vmu-fx-autorelease', settings.audioFxAutoRelease);
    setChecked('vmu-fx-truepeak', settings.audioFxTruePeak);
    setChecked('vmu-fx-autogain', settings.audioFxAutoGain);

    syncCustomDropdown('vmu-fx-style-dd', AUDIOFX_STYLE_NAMES, settings.audioFxStyle);
    syncCustomDropdown('vmu-fx-oversampling-dd', AUDIOFX_OVERSAMPLE_LABELS, settings.audioFxOversampling);
    syncCustomDropdown('vmu-fx-chain-dd', AUDIOFX_CHAIN_ORDER_LABELS, settings.audioFxChainOrder);

    const procSwitch = document.getElementById('vmu-fx-procmode');
    if (procSwitch) {
      procSwitch.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.vmuProcmode, 10) === settings.audioFxProcessingMode);
      });
    }
    const ceilingRRow = document.getElementById('vmu-fx-ceilingr-row');
    if (ceilingRRow) ceilingRRow.style.display = settings.audioFxProcessingMode === 1 ? '' : 'none';

    const abSwitch = document.getElementById('vmu-fx-ab-switch');
    if (abSwitch) {
      abSwitch.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b.dataset.vmuAb === settings.audioFxABActive);
      });
    }
    const presetCurrent = document.getElementById('vmu-fx-preset-current');
    if (presetCurrent) presetCurrent.textContent = settings.audioFxCurrentPreset || '— пресет —';

    const sliderFields = [
      ['vmu-fx-threshold', 'audioFxThreshold', v => v + ' дБ'],
      ['vmu-fx-ratio', 'audioFxRatio', v => v + ':1'],
      ['vmu-fx-knee', 'audioFxKnee', v => v + ' дБ'],
      ['vmu-fx-ceiling', 'audioFxCeiling', v => (Math.round(v * 10) / 10) + ' дБ'],
      ['vmu-fx-ceilingr', 'audioFxCeilingR', v => (Math.round(v * 10) / 10) + ' дБ'],
      ['vmu-fx-input', 'audioFxInputGain', v => v + ' дБ'],
      ['vmu-fx-output', 'audioFxOutputGain', v => v + ' дБ'],
      ['vmu-fx-attack', 'audioFxAttack', v => v + ' мс'],
      ['vmu-fx-release', 'audioFxRelease', v => v + ' мс'],
      ['vmu-fx-limrelease', 'audioFxLimRelease', v => v + ' мс'],
      ['vmu-fx-limgain', 'audioFxLimGain', v => v + ' дБ'],
    ];
    for (const [id, key, fmt] of sliderFields) {
      const slider = document.getElementById(id);
      const val = document.getElementById(id + '-val');
      if (slider) slider.value = String(settings[key]);
      if (val) val.textContent = fmt(settings[key]);
    }

    settings.audioFxBands.forEach((b, i) => {
      const slider = document.getElementById(`vmu-fx-band-${i}`);
      if (slider) slider.value = String(b.gain);
      const val = document.getElementById(`vmu-fx-band-${i}-val`);
      if (val) val.textContent = fmtBandDb(b.gain);
      const freqEl = document.getElementById(`vmu-fx-band-${i}-freq`);
      if (freqEl) freqEl.textContent = formatFreqLabel(Math.round(b.freq));
      const qEl = document.getElementById(`vmu-fx-band-${i}-q`);
      if (qEl) qEl.textContent = formatQLabel(b.q);
    });
  }

  // VK renders the whole player toolbar (transport, EQ anchor, share...) twice
  // — once in-flow (scrolls away) and once as the fixed/pinned copy that
  // takes over once the page scrolls a bit past it, same duplication
  // documented above for AudioPage_PlayerBlock. Only one copy is ever
  // actually on screen at a time, so pick whichever of our injected buttons
  // currently has a real, in-viewport position to anchor the dropdown to.
  function getVisibleAudioFxBtn() {
    const btns = document.querySelectorAll('.vmu-audiofx-btn');
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && r.top >= 0 && r.top < window.innerHeight) return b;
    }
    return btns[0] || null;
  }

  function positionAudioFxUI() {
    const panel = document.getElementById('vmu-audiofx-panel');
    const btn = getVisibleAudioFxBtn();
    if (!btn || !panel || !panel.classList.contains('vmu-audiofx-panel-open')) return;
    if (panel.dataset.vmuUserMoved) return;
    const margin = 12;
    const r = btn.getBoundingClientRect();
    // Anchor under the button's own live position rather than guessing from
    // AudioPage_PlayerBlock — the button lives inline in VK's toolbar (see
    // injectAudioFxIntoPlayerBar), so its rect is the source of truth.
    const right = Math.max(margin, window.innerWidth - r.right);
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.right = right + 'px';
  }

  function toggleAudioFxPanel() {
    const panel = document.getElementById('vmu-audiofx-panel');
    if (!panel) return;
    const open = panel.classList.toggle('vmu-audiofx-panel-open');
    positionAudioFxUI();
    if (open) startMeterLoop(); else stopMeterLoop();
  }

  // Inserts the FX toggle button directly into VK's native player toolbar,
  // immediately left of "Транслировать аудиозаписи" (data-testid
  // ToggleCurrentTargets) — into EVERY copy of the toolbar VK renders (the
  // in-flow one and the fixed one that takes over on scroll), not just the
  // first match, so the button stays reachable however the page is
  // scrolled. Reuses VK's own button classes so it matches size/hover/
  // spacing without custom CSS; only inserted where missing, same
  // idempotent-on-rerender idiom as injectToolbarSettingsButtons.
  function injectAudioFxIntoPlayerBar() {
    document.querySelectorAll('[data-testid="ToggleCurrentTargets"]').forEach(anchor => {
      if (!anchor.parentElement) return;
      const prev = anchor.previousElementSibling;
      if (prev && prev.classList.contains('vmu-audiofx-btn')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = anchor.className + ' vmu-audiofx-btn';
      btn.setAttribute('data-vmu-tip', 'Эквалайзер');
      btn.innerHTML = ICON_AUDIOFX;
      btn.addEventListener('mouseenter', () => showDlTooltip(btn));
      btn.addEventListener('mouseleave', hideDlTooltip);
      btn.addEventListener('click', () => { hideDlTooltip(); toggleAudioFxPanel(); });
      anchor.parentElement.insertBefore(btn, anchor);
    });
  }

  function attachAudioFxHandlers() {
    // ─── rich preset browser: search + category filter + tags ─────────────
    let presetFilterCategory = 'Все';
    let presetFilterSearch = '';

    function applyPreset(name) {
      const presets = loadAudioFxPresets();
      const entry = presets[name];
      if (!entry) return;
      // Copy before normalizing so presets saved pre-stage-split don't get
      // mutated in storage, just read through with the new fields filled in.
      Object.assign(settings, normalizeFxSnapshot(Object.assign({}, presetSettingsOf(entry))));
      settings.audioFxCurrentPreset = name;
      saveSettings();
      refreshAllAudioFxControls();
      postAudioFxState();
      renderPresetList();
    }

    function deletePreset(name) {
      const presets = loadAudioFxPresets();
      delete presets[name];
      saveAudioFxPresets(presets);
      if (settings.audioFxCurrentPreset === name) {
        settings.audioFxCurrentPreset = null;
        saveSettings();
        const cur = document.getElementById('vmu-fx-preset-current');
        if (cur) cur.textContent = '— пресет —';
      }
      renderPresetList();
    }

    // Resets every sound parameter (compressor/limiter/EQ/chain order/style)
    // back to the hardcoded factory defaults — distinct from the per-slider
    // ↺ buttons, which reset to the value each slider had when the panel was
    // first built (i.e. whatever was loaded from localStorage on this page
    // visit), not to true factory defaults.
    function resetAudioFxToDefaults() {
      for (const key of AUDIOFX_FIELD_KEYS) {
        settings[key] = Array.isArray(AUDIOFX_DEFAULTS[key]) ? AUDIOFX_DEFAULTS[key].slice() : AUDIOFX_DEFAULTS[key];
      }
      settings.audioFxCurrentPreset = null;
      saveSettings();
      refreshAllAudioFxControls();
      postAudioFxState();
      const cur = document.getElementById('vmu-fx-preset-current');
      if (cur) cur.textContent = '— пресет —';
    }
    const resetAllBtn = document.getElementById('vmu-fx-reset-all');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', resetAudioFxToDefaults);
    }

    function renderPresetList() {
      const listEl = document.getElementById('vmu-fx-preset-list');
      const catsEl = document.getElementById('vmu-fx-preset-cats');
      const catList = document.getElementById('vmu-fx-preset-cat-list');
      if (!listEl || !catsEl) return;
      const presets = loadAudioFxPresets();
      const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
      const categories = Array.from(new Set(names.map(n => presetCategoryOf(presets[n])))).sort((a, b) => a.localeCompare(b));

      catsEl.innerHTML = ['Все', ...categories].map(c =>
        `<button type="button" class="vmu-fx-preset-cat${c === presetFilterCategory ? ' active' : ''}" data-cat="${escHtml(c)}">${escHtml(c)}</button>`
      ).join('');
      if (catList) catList.innerHTML = categories.map(c => `<option value="${escHtml(c)}">`).join('');

      const q = presetFilterSearch.trim().toLowerCase();
      const filtered = names.filter(n => {
        const entry = presets[n];
        if (presetFilterCategory !== 'Все' && presetCategoryOf(entry) !== presetFilterCategory) return false;
        if (!q) return true;
        const haystack = (n + ' ' + presetTagsOf(entry).join(' ')).toLowerCase();
        return haystack.includes(q);
      });

      listEl.innerHTML = filtered.length ? filtered.map(n => {
        const entry = presets[n];
        const tags = presetTagsOf(entry);
        return `<div class="vmu-fx-preset-item${n === settings.audioFxCurrentPreset ? ' active' : ''}" data-preset="${escHtml(n)}">
          <div class="vmu-fx-preset-item-main">
            <span class="vmu-fx-preset-item-name">${escHtml(n)}</span>
            <span class="vmu-fx-preset-item-cat">${escHtml(presetCategoryOf(entry))}</span>
            <button type="button" class="vmu-fx-preset-item-del" data-preset-del="${escHtml(n)}" title="Удалить">✕</button>
          </div>
          ${tags.length ? `<div class="vmu-fx-preset-item-tags">${tags.map(t => `<span class="vmu-fx-preset-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
        </div>`;
      }).join('') : `<div class="vmu-fx-preset-empty">Ничего не найдено</div>`;
    }

    const presetToggle = document.getElementById('vmu-fx-preset-toggle');
    const presetBrowser = document.getElementById('vmu-fx-preset-browser');
    const presetSaveForm = document.getElementById('vmu-fx-preset-saveform');
    if (presetToggle && presetBrowser) {
      presetToggle.addEventListener('click', () => {
        const opening = presetBrowser.style.display === 'none';
        presetBrowser.style.display = opening ? '' : 'none';
        if (presetSaveForm) presetSaveForm.style.display = 'none';
        if (opening) renderPresetList();
      });
    }

    const presetSearch = document.getElementById('vmu-fx-preset-search');
    if (presetSearch) {
      presetSearch.addEventListener('input', () => {
        presetFilterSearch = presetSearch.value;
        renderPresetList();
      });
    }

    const presetCats = document.getElementById('vmu-fx-preset-cats');
    if (presetCats) {
      presetCats.addEventListener('click', e => {
        const btn = e.target.closest('button[data-cat]');
        if (!btn) return;
        presetFilterCategory = btn.dataset.cat;
        renderPresetList();
      });
    }

    const presetList = document.getElementById('vmu-fx-preset-list');
    if (presetList) {
      presetList.addEventListener('click', e => {
        const delBtn = e.target.closest('button[data-preset-del]');
        if (delBtn) { deletePreset(delBtn.dataset.presetDel); return; }
        const item = e.target.closest('[data-preset]');
        if (item) applyPreset(item.dataset.preset);
      });
    }

    const presetSaveBtn = document.getElementById('vmu-fx-preset-save');
    if (presetSaveBtn && presetSaveForm) {
      presetSaveBtn.addEventListener('click', () => {
        if (presetBrowser) presetBrowser.style.display = 'none';
        presetSaveForm.style.display = presetSaveForm.style.display === 'none' ? '' : 'none';
        const nameInput = document.getElementById('vmu-fx-preset-name');
        if (presetSaveForm.style.display !== 'none' && nameInput) nameInput.focus();
        renderPresetList(); // populates the category datalist even while the browser stays hidden
      });
    }
    const presetSaveCancel = document.getElementById('vmu-fx-preset-save-cancel');
    if (presetSaveCancel && presetSaveForm) {
      presetSaveCancel.addEventListener('click', () => { presetSaveForm.style.display = 'none'; });
    }
    const presetSaveConfirm = document.getElementById('vmu-fx-preset-save-confirm');
    if (presetSaveConfirm && presetSaveForm) {
      presetSaveConfirm.addEventListener('click', () => {
        const name = (document.getElementById('vmu-fx-preset-name')?.value || '').trim();
        if (!name) return;
        const category = (document.getElementById('vmu-fx-preset-category')?.value || '').trim() || 'Без категории';
        const tags = (document.getElementById('vmu-fx-preset-tags')?.value || '')
          .split(',').map(t => t.trim()).filter(Boolean);
        const presets = loadAudioFxPresets();
        presets[name] = { settings: snapshotAudioFxSettings(), category, tags };
        saveAudioFxPresets(presets);
        settings.audioFxCurrentPreset = name;
        saveSettings();
        const cur = document.getElementById('vmu-fx-preset-current');
        if (cur) cur.textContent = name;
        presetSaveForm.style.display = 'none';
        ['vmu-fx-preset-name', 'vmu-fx-preset-category', 'vmu-fx-preset-tags'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
      });
    }

    // ─── A/B snapshot compare ───────────────────────────────────────────────
    // Switching slots saves the live settings into whichever slot was active
    // (so in-progress edits aren't lost), seeds the target slot with a copy
    // of the current settings the first time it's ever switched to (so B
    // starts identical to A and diverges from there), then loads it live.
    function switchABSlot(target) {
      if (target === settings.audioFxABActive) return;
      settings.audioFxAB[settings.audioFxABActive] = snapshotAudioFxSettings();
      if (!settings.audioFxAB[target]) settings.audioFxAB[target] = snapshotAudioFxSettings();
      Object.assign(settings, settings.audioFxAB[target]);
      settings.audioFxABActive = target;
      saveSettings();
      refreshAllAudioFxControls();
      postAudioFxState();
    }
    const abSwitch = document.getElementById('vmu-fx-ab-switch');
    if (abSwitch) {
      abSwitch.addEventListener('click', e => {
        const btn = e.target.closest('button[data-vmu-ab]');
        if (!btn) return;
        switchABSlot(btn.dataset.vmuAb);
      });
    }

    const fxTabs = document.getElementById('vmu-audiofx-tabs');
    if (fxTabs) {
      fxTabs.addEventListener('click', e => {
        const btn = e.target.closest('button[data-vmu-fxtab]');
        if (!btn) return;
        const tabName = btn.dataset.vmuFxtab;
        if (tabName === settings.audioFxActiveTab) return;
        settings.audioFxActiveTab = tabName;
        saveSettings();
        fxTabs.querySelectorAll('button').forEach(b => {
          b.classList.toggle('active', b.dataset.vmuFxtab === tabName);
        });
        document.querySelectorAll('[data-vmu-fxtab-page]').forEach(page => {
          const active = page.dataset.vmuFxtabPage === tabName;
          page.classList.toggle('active', active);
          page.style.display = active ? '' : 'none';
        });
        // Gates the worklet's K-weighting/LUFS accumulation — only costs CPU
        // while this tab is actually the one open.
        window.postMessage({ type: 'VMU_AUDIOFX_METERING_ACTIVE', active: tabName === 'metering' }, '*');
      });
    }
    // Panel can reopen directly on a persisted "metering" tab (see
    // buildAudioFxPanel's audioFxActiveTab) — tell the worklet right away
    // instead of waiting for a tab click that may never come.
    if (settings.audioFxActiveTab === 'metering') {
      window.postMessage({ type: 'VMU_AUDIOFX_METERING_ACTIVE', active: true }, '*');
    }

    const lufsResetBtn = document.getElementById('vmu-fx-lufs-reset');
    if (lufsResetBtn) {
      lufsResetBtn.addEventListener('click', () => {
        window.postMessage({ type: 'VMU_AUDIOFX_RESET_LUFS' }, '*');
      });
    }

    const limiterEnableToggle = document.getElementById('vmu-fx-limiter-enable');
    if (limiterEnableToggle) {
      limiterEnableToggle.addEventListener('change', () => {
        settings.audioFxLimiterEnabled = limiterEnableToggle.checked;
        saveSettings();
        postAudioFxState();
      });
    }
    const compEnableToggle = document.getElementById('vmu-fx-comp-enable');
    if (compEnableToggle) {
      compEnableToggle.addEventListener('change', () => {
        settings.audioFxCompEnabled = compEnableToggle.checked;
        saveSettings();
        postAudioFxState();
      });
    }
    const eqEnableToggle = document.getElementById('vmu-fx-eq-enable');
    if (eqEnableToggle) {
      eqEnableToggle.addEventListener('change', () => {
        settings.audioFxEqEnabled = eqEnableToggle.checked;
        saveSettings();
        postAudioFxState();
      });
    }

    initCustomDropdown('vmu-fx-style-dd', idx => {
      settings.audioFxStyle = idx;
      saveSettings();
      postAudioFxState();
    });

    const autoReleaseToggle = document.getElementById('vmu-fx-autorelease');
    if (autoReleaseToggle) {
      autoReleaseToggle.addEventListener('change', () => {
        settings.audioFxAutoRelease = autoReleaseToggle.checked;
        saveSettings();
        postAudioFxState();
      });
    }

    const truePeakToggle = document.getElementById('vmu-fx-truepeak');
    if (truePeakToggle) {
      truePeakToggle.addEventListener('change', () => {
        settings.audioFxTruePeak = truePeakToggle.checked;
        saveSettings();
        postAudioFxState();
      });
    }

    initCustomDropdown('vmu-fx-oversampling-dd', idx => {
      settings.audioFxOversampling = idx;
      saveSettings();
      postAudioFxState();
    });

    initCustomDropdown('vmu-fx-chain-dd', idx => {
      settings.audioFxChainOrder = idx;
      saveSettings();
      postAudioFxState();
    });

    // Any custom dropdown left open closes on an outside click, matching
    // native <select> behavior.
    document.addEventListener('click', e => {
      if (e.target.closest('.vmu-fx-dd')) return;
      document.querySelectorAll('.vmu-fx-dd-list').forEach(l => {
        l.style.display = 'none';
        l.closest('.vmu-fx-dd')?.classList.remove('vmu-fx-dd-open');
      });
    });

    const procModeSwitch = document.getElementById('vmu-fx-procmode');
    if (procModeSwitch) {
      procModeSwitch.addEventListener('click', e => {
        const btn = e.target.closest('button[data-vmu-procmode]');
        if (!btn) return;
        const mode = parseInt(btn.dataset.vmuProcmode, 10) || 0;
        if (mode === settings.audioFxProcessingMode) return;
        settings.audioFxProcessingMode = mode;
        saveSettings();
        procModeSwitch.querySelectorAll('button').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.vmuProcmode, 10) === mode);
        });
        const ceilingRRow = document.getElementById('vmu-fx-ceilingr-row');
        if (ceilingRRow) ceilingRRow.style.display = mode === 1 ? '' : 'none';
        postAudioFxState();
      });
    }

    const autoGainToggle = document.getElementById('vmu-fx-autogain');
    if (autoGainToggle) {
      autoGainToggle.addEventListener('change', () => {
        settings.audioFxAutoGain = autoGainToggle.checked;
        saveSettings();
        postAudioFxState();
      });
    }

    const limiterField = (id, key, fmt) => {
      const slider = document.getElementById(id);
      const val = document.getElementById(id + '-val');
      const reset = document.getElementById(id + '-reset');
      const defaultValue = settings[key];
      if (slider) {
        slider.addEventListener('input', () => {
          const v = parseFloat(slider.value) || 0;
          settings[key] = v;
          if (val) val.textContent = fmt(v);
          postAudioFxState();
        });
        slider.addEventListener('change', saveSettings);
      }
      if (reset && slider) {
        reset.addEventListener('click', () => {
          settings[key] = defaultValue;
          slider.value = String(defaultValue);
          if (val) val.textContent = fmt(defaultValue);
          saveSettings();
          postAudioFxState();
        });
      }
    };
    limiterField('vmu-fx-threshold', 'audioFxThreshold', v => v + ' дБ');
    limiterField('vmu-fx-ratio', 'audioFxRatio', v => v + ':1');
    limiterField('vmu-fx-knee', 'audioFxKnee', v => v + ' дБ');
    limiterField('vmu-fx-ceiling', 'audioFxCeiling', v => (Math.round(v * 10) / 10) + ' дБ');
    limiterField('vmu-fx-ceilingr', 'audioFxCeilingR', v => (Math.round(v * 10) / 10) + ' дБ');
    limiterField('vmu-fx-input', 'audioFxInputGain', v => v + ' дБ');
    limiterField('vmu-fx-output', 'audioFxOutputGain', v => v + ' дБ');
    limiterField('vmu-fx-attack', 'audioFxAttack', v => v + ' мс');
    limiterField('vmu-fx-release', 'audioFxRelease', v => v + ' мс');
    limiterField('vmu-fx-limrelease', 'audioFxLimRelease', v => v + ' мс');
    limiterField('vmu-fx-limgain', 'audioFxLimGain', v => v + ' дБ');

    // Meter painting itself is handled by the module-level rAF loop
    // (startMeterLoop/paintMeters) — see the "audio FX metering" block above,
    // started/stopped alongside the panel's open/close state below.

    // The vertical slider only ever touches gain — frequency/Q for that band
    // are whatever the EQ graph (wireEqCanvasDrag, wired below) last set them
    // to, or whatever was typed into their own readout (wireInlineBandEdit).
    settings.audioFxBands.forEach((_, i) => {
      const slider = document.getElementById(`vmu-fx-band-${i}`);
      if (!slider) return;
      const valEl = document.getElementById(`vmu-fx-band-${i}-val`);
      const freqEl = document.getElementById(`vmu-fx-band-${i}-freq`);
      const qEl = document.getElementById(`vmu-fx-band-${i}-q`);
      const setGain = (v) => {
        v = Math.max(-12, Math.min(12, Math.round(v * 10) / 10));
        settings.audioFxBands[i] = { freq: settings.audioFxBands[i].freq, gain: v, q: settings.audioFxBands[i].q };
        slider.value = String(v);
        if (valEl) valEl.textContent = fmtBandDb(v);
        postAudioFxState();
      };
      const setFreq = (f) => {
        f = Math.max(20, Math.min(20000, Math.round(f)));
        settings.audioFxBands[i] = { freq: f, gain: settings.audioFxBands[i].gain, q: settings.audioFxBands[i].q };
        postAudioFxState();
      };
      const setQ = (q) => {
        q = Math.max(0.3, Math.min(8, Math.round(q * 100) / 100));
        settings.audioFxBands[i] = { freq: settings.audioFxBands[i].freq, gain: settings.audioFxBands[i].gain, q };
        postAudioFxState();
      };
      slider.addEventListener('input', () => {
        setGain(parseFloat(slider.value) || 0);
      });
      slider.addEventListener('change', saveSettings);
      // Precision helpers — a 90px vertical slider is too short to land on a
      // specific tenth of a dB by hand alone: wheel nudges in fixed steps
      // (0.5dB per notch, 0.1dB with Shift for fine trim), double-click
      // zeroes just that one band's gain instead of resetting the whole curve.
      slider.addEventListener('wheel', e => {
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 0.5;
        setGain(settings.audioFxBands[i].gain + (e.deltaY < 0 ? step : -step));
        saveSettings();
      }, { passive: false });
      slider.addEventListener('dblclick', () => {
        setGain(0);
        saveSettings();
      });

      wireInlineBandEdit(valEl, { get: () => settings.audioFxBands[i].gain, set: setGain, format: fmtBandDb });
      wireInlineBandEdit(freqEl, { get: () => Math.round(settings.audioFxBands[i].freq), set: setFreq, format: v => formatFreqLabel(Math.round(v)) });
      wireInlineBandEdit(qEl, { get: () => settings.audioFxBands[i].q, set: setQ, format: formatQLabel });
    });

    wireEqCanvasDrag();

    const eqReset = document.getElementById('vmu-fx-eq-reset');
    if (eqReset) {
      eqReset.addEventListener('click', () => {
        settings.audioFxBands = AUDIOFX_FREQS.map(f => ({ freq: f, gain: 0, q: EQ_DEFAULT_Q }));
        settings.audioFxBands.forEach((b, i) => {
          const slider = document.getElementById(`vmu-fx-band-${i}`);
          if (slider) slider.value = '0';
          const valEl = document.getElementById(`vmu-fx-band-${i}-val`);
          if (valEl) valEl.textContent = fmtBandDb(0);
          const freqEl = document.getElementById(`vmu-fx-band-${i}-freq`);
          if (freqEl) freqEl.textContent = formatFreqLabel(b.freq);
          const qEl = document.getElementById(`vmu-fx-band-${i}-q`);
          if (qEl) qEl.textContent = formatQLabel(b.q);
        });
        saveSettings();
        postAudioFxState();
      });
    }

    const closeBtn = document.getElementById('vmu-audiofx-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('vmu-audiofx-panel').classList.remove('vmu-audiofx-panel-open');
        stopMeterLoop();
      });
    }
    // Deliberately no click-outside-to-close — the panel has sliders/inputs
    // that are easy to overshoot a click past while dragging, so it now only
    // closes via the × button or the toggle button in the player bar.
  }

  function ensureAudioFxUI() {
    syncVmuTheme(); // cheap self-heal in case the observer's target got replaced
    injectAudioFxIntoPlayerBar();
    if (!document.getElementById('vmu-audiofx-panel')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = buildAudioFxPanel();
      document.body.appendChild(wrap.firstElementChild);
      attachAudioFxHandlers();
      makePanelDraggable(document.getElementById('vmu-audiofx-panel'), document.querySelector('.vmu-audiofx-head'));
    }
    positionAudioFxUI();
  }
  window.addEventListener('resize', positionAudioFxUI);

  // ─── audio catalog header: split + pin ─────────────────────────────────────
  // VK renders the tabs/search header and whatever follows it (recently-played,
  // the VK Mix banner, etc.) as one flat card:
  // section[data-testid="AudioCatalog_Header"] > [headerlayout, search-wrapper, ...rest].
  // Physically moving "...rest" into a separate element to make it *look* like
  // its own card breaks React: confirmed live that switching tabs afterwards
  // throws "NotFoundError: Failed to execute 'removeChild'" because React still
  // expects those nodes under the original section. So neither feature below
  // ever reparents a VK-owned node — only CSS (margin/position) on the nodes
  // where they already live, plus brand-new decorative elements we own.
  const AHS_RADIUS = 12, AHS_GAP = 4, AHS_TOTAL = AHS_RADIUS * 2 + AHS_GAP;

  // Push anything after the header+search down by AHS_TOTAL and paint a
  // page-background "notch" over the gap with concave corners, faking a
  // second rounded card without touching VK's own DOM tree.
  function applyAudioHeaderSplit() {
    const sections = document.querySelectorAll('[data-testid="AudioCatalog_Header"]');
    for (const section of sections) {
      // Scoped to the recently-played block specifically (not any trailing
      // content) — e.g. the "Слушать VK Микс" banner on the Главная tab sits
      // in the same slot and should stay put.
      const rest = section.querySelector(':scope > [data-testid="AudioCatalog_BlockHeaderRecentlyPlayed"]');
      if (!rest) {
        section.querySelectorAll(':scope > .vmu-split-mask').forEach(el => el.remove());
        const prevRest = section.querySelector('.vmu-split-below');
        if (prevRest) { prevRest.classList.remove('vmu-split-below'); prevRest.style.marginTop = ''; }
        continue;
      }
      if (getComputedStyle(section).position === 'static') section.style.position = 'relative';
      rest.classList.add('vmu-split-below');
      rest.style.marginTop = AHS_TOTAL + 'px';

      let masks = [...section.querySelectorAll(':scope > .vmu-split-mask')];
      if (masks.length !== 5) {
        masks.forEach(el => el.remove());
        const mk = () => {
          const d = document.createElement('div');
          d.className = 'vmu-split-mask vmu-split-mask-corner';
          return d;
        };
        const tl = mk(), tr = mk(), bl = mk(), br = mk();
        tl.classList.add('vmu-split-mask-tl');
        tr.classList.add('vmu-split-mask-tr');
        bl.classList.add('vmu-split-mask-bl');
        br.classList.add('vmu-split-mask-br');
        const strip = document.createElement('div');
        strip.className = 'vmu-split-mask vmu-split-mask-strip';
        section.append(tl, tr, bl, br, strip);
        masks = [tl, tr, bl, br, strip];
      }

      const bg = getComputedStyle(section).backgroundColor;
      const [tl, tr, bl, br, strip] = masks;
      for (const m of [tl, tr, bl, br]) m.style.setProperty('--vmu-split-bg', bg);
      strip.style.background = bg;

      const sTop = section.getBoundingClientRect().top;
      const gapTop = rest.getBoundingClientRect().top - sTop - AHS_TOTAL;
      tl.style.top = tr.style.top = strip.style.top = gapTop + 'px';
      bl.style.top = br.style.top = (gapTop + AHS_RADIUS + AHS_GAP) + 'px';
      strip.style.height = AHS_TOTAL + 'px';
    }
  }

  // Pin the tabs row + search box under VK's fixed top bar so they stay
  // visible for the whole page scroll, merged with the top bar (matching
  // background, flush against it, no gap) once scrolled past their natural
  // position. position:sticky was tried first but it's bounded by the tabs'
  // own parent box — since that card is only ~300-400px tall, the bar
  // unstuck and vanished as soon as the user scrolled past it into
  // "Плейлисты"/"Музыканты" (confirmed live). Real position:fixed doesn't
  // have that ceiling, but needs the sticky threshold reimplemented by hand
  // (engage only once scrolled past the natural position — otherwise it'd be
  // permanently glued to the top, leaving a dead gap where it used to sit)
  // and the space it vacates reserved (padding-top on the section) only
  // while engaged, so content doesn't jump.
  function applyTabsBarPin() {
    const sections = document.querySelectorAll('[data-testid="AudioCatalog_Header"]');
    const topBar = document.querySelector('[class*="vkuiFixedLayout"]');
    const topBarBottom = topBar ? topBar.getBoundingClientRect().bottom : 48;
    // AudioPage_PlayerBlock (album art / transport controls under the nav
    // bar) is VK's persistent mini-player — confirmed live it stays fixed at
    // the same viewport position no matter how far you scroll. VK actually
    // renders *two* instances sharing this testid (a normal-flow one that
    // scrolls away, plus the fixed one that's actually on screen); querying
    // just the first one picked the wrong copy and made the anchor collapse
    // back too early, overlapping the real bar. Taking the max bottom across
    // all matches always lands on whichever is actually visible.
    let playerBottom = 0;
    let visiblePlayerBlock = null;
    for (const pb of document.querySelectorAll('[data-testid="AudioPage_PlayerBlock"]')) {
      const b = pb.getBoundingClientRect().bottom;
      if (b > playerBottom) { playerBottom = b; visiblePlayerBlock = pb; }
    }
    const anchor = Math.round(Math.max(48, topBarBottom, playerBottom));

    // The multimedia card (AudioPage_PlayerBlock's own vkitInternalGroupCard
    // wrapper) draws its "border" via a uniform inset box-shadow on ::before,
    // not a real border property. While merged, .vmu-multimedia-flat (CSS)
    // disables that and substitutes a top+left+right-only version — keeps
    // the outer edges bordered but drops the bottom line where it now
    // touches our panel, so the two read as one continuous outline instead
    // of a seam. Borrow the exact same color for both so it still looks
    // intentional, instead of hardcoding a color that'd drift from whatever
    // theme VK is currently rendering.
    const mmCard = visiblePlayerBlock ? visiblePlayerBlock.closest('section') : null;
    if (mmCard) {
      const mmBorder = getComputedStyle(mmCard, '::before').boxShadow;
      const m = mmBorder.match(/rgba?\([^)]+\)/);
      if (m) document.documentElement.style.setProperty('--vmu-pin-border', m[0]);
    }
    let anyEngaged = false;

    for (const section of sections) {
      const tabs = section.querySelector(':scope > [data-testid="headerlayout"]');
      const search = section.children[1];
      const isSearchWrap = search && search !== tabs && search.querySelector('[class*="vkuiSearch"]');
      if (!tabs) continue;

      const unpin = () => {
        for (const el of [tabs, isSearchWrap ? search : null]) {
          if (!el) continue;
          el.classList.remove('vmu-tabs-pinned', 'vmu-pin-top', 'vmu-pin-bottom');
          el.style.top = el.style.left = el.style.width = el.style.background = '';
        }
        section.style.paddingTop = '';
      };

      if (!settings.pinTabsBar) { unpin(); continue; }

      // Capture tabs' natural (in-flow) offset from the section's top exactly
      // once, before we ever touch its position — section.getBoundingClientRect().top
      // stays valid as an anchor even once pinned (a fixed child doesn't move
      // its parent), but tabs' own rect no longer reflects "where it would be"
      // once it's position:fixed, so the offset has to be cached up front.
      if (section.dataset.vmuTabsOffset === undefined) {
        section.dataset.vmuTabsOffset = String(tabs.getBoundingClientRect().top - section.getBoundingClientRect().top);
        section.dataset.vmuBasePadTop = String(parseFloat(getComputedStyle(section).paddingTop) || 0);
      }
      const tabsOffset = Number(section.dataset.vmuTabsOffset) || 0;
      const naturalTabsViewportTop = section.getBoundingClientRect().top + tabsOffset;

      if (naturalTabsViewportTop > anchor) { unpin(); continue; }

      const basePad = Number(section.dataset.vmuBasePadTop) || 0;
      const bg = getComputedStyle(section).backgroundColor;
      const sRect = section.getBoundingClientRect(); // already reflects any active content-offset shift

      anyEngaged = true;
      tabs.classList.add('vmu-tabs-pinned', 'vmu-pin-top');
      tabs.style.left = sRect.left + 'px';
      tabs.style.width = sRect.width + 'px';
      tabs.style.top = anchor + 'px';
      tabs.style.background = bg;
      const tabsH = tabs.getBoundingClientRect().height;

      let searchH = 0;
      if (isSearchWrap) {
        search.classList.add('vmu-tabs-pinned', 'vmu-pin-bottom');
        search.style.left = sRect.left + 'px';
        search.style.width = sRect.width + 'px';
        search.style.top = (anchor + tabsH) + 'px';
        search.style.background = bg;
        searchH = search.getBoundingClientRect().height;
      } else {
        // No separate search wrapper on this tab — tabs is the last piece,
        // so it needs the bottom rounding+border itself.
        tabs.classList.add('vmu-pin-bottom');
      }

      section.style.paddingTop = (basePad + tabsH + searchH) + 'px';
    }

    if (mmCard) mmCard.classList.toggle('vmu-multimedia-flat', anyEngaged);
  }

  function applyAudioCatalogLayout() {
    applyAudioHeaderSplit();
    applyTabsBarPin();
  }
  window.addEventListener('resize', applyAudioCatalogLayout);
  window.addEventListener('scroll', () => { if (settings.pinTabsBar) applyTabsBarPin(); }, { passive: true });

  // Splits off trailing reuploader/site watermarks (e.g. "(hitmos.fm)",
  // "[vk.com/reuploadunder]") from a filename fragment or raw ID3 tag value.
  // `core` is whatever real text precedes them (repeated, so
  // "Song (Live) (hitmos.fm)" only loses the site tag, not "(Live)" too);
  // `junk` is the stripped-off watermark(s) rejoined, so callers can put it
  // back where it belongs instead of just discarding it.
  function splitTrailingTagJunk(s) {
    let core = String(s || '').trim();
    const junkParts = [];
    for (;;) {
      const m = core.match(/\s*((?:\([^()]*\)|\[[^\[\]]*\]))\s*$/);
      if (!m) break;
      junkParts.unshift(m[1]);
      core = core.slice(0, m.index).trim();
    }
    return { core, junk: junkParts.join(' ') };
  }
  function stripTrailingTagJunk(s) { return splitTrailingTagJunk(s).core; }

  // True if a raw ID3 tag value is *nothing but* a trailing reuploader
  // watermark, e.g. TIT2 = " [vk.com/reuploadunder]" with no real title in
  // front of it — that's treated as "tag missing" so auto-meta falls back to
  // the filename (but see splitTrailingTagJunk: the watermark itself still
  // gets reattached to whatever the filename parser comes up with, it's not
  // just thrown away). When there IS real text before the watermark (e.g.
  // "Сказка [vk.com/reuploadunder]"), the tag is left completely untouched —
  // no stripping — since that's a normal, valid tag as far as this tool's
  // concerned.
  function isJunkTag(s) {
    return !stripTrailingTagJunk(s);
  }

  function joinWithJunk(base, junk) {
    return [base, junk].filter(Boolean).join(' ');
  }

  // ─── filename → meta parser ───────────────────────────────────────────────────
  function parseMetaFromFilename(filename) {
    function cleanPart(s) {
      return stripTrailingTagJunk(
        s
          .replace(/_/g, ' ')           // underscores → spaces
          .replace(/\s+/g, ' ')         // collapse multiple spaces
          .trim()
      ).replace(/^[\s\-–—_.,()\[\]]+|[\s\-–—_.,()\[\]]+$/g, '') // trim junk edges
       .trim();
    }
    // Strip extension, remove leading track number (e.g. "01. ", "02 - ")
    const base = filename.replace(/\.[^.]+$/, '').replace(/^\d+[\s.\-–—]+/, '').trim();
    const parts = base.split(/\s*[-–—]\s*/);
    if (parts.length >= 2) {
      return { artist: cleanPart(parts[0]), title: cleanPart(parts.slice(1).join(' – ')) };
    }
    return { artist: '', title: cleanPart(base) };
  }

  // ─── ID3v2.3 tag writer ───────────────────────────────────────────────────────
  function makeID3Frame(id, text) {
    const textBytes = new TextEncoder().encode(text);
    const frameData = new Uint8Array(1 + textBytes.length);
    frameData[0] = 3; // UTF-8 encoding byte
    frameData.set(textBytes, 1);
    const frame = new Uint8Array(10 + frameData.length);
    for (let i = 0; i < 4; i++) frame[i] = id.charCodeAt(i);
    const sz = frameData.length;
    frame[4] = (sz >> 24) & 0xff; frame[5] = (sz >> 16) & 0xff;
    frame[6] = (sz >> 8) & 0xff;  frame[7] = sz & 0xff;
    frame.set(frameData, 10);
    return frame;
  }

  function buildID3v2(frames) {
    const total = frames.reduce((s, f) => s + f.length, 0);
    const tag = new Uint8Array(10 + total);
    tag[0] = 0x49; tag[1] = 0x44; tag[2] = 0x33; // "ID3"
    tag[3] = 3; tag[4] = 0; tag[5] = 0; // version 2.3, no flags
    // Syncsafe integer for tag size
    tag[6] = (total >> 21) & 0x7f; tag[7] = (total >> 14) & 0x7f;
    tag[8] = (total >> 7) & 0x7f;  tag[9] = total & 0x7f;
    let off = 10;
    for (const f of frames) { tag.set(f, off); off += f.length; }
    return tag;
  }

  async function patchID3(file, artist, title) {
    const buf = await file.arrayBuffer();
    const v = new Uint8Array(buf);
    // Skip any existing ID3 tag so we don't double-wrap
    let audioStart = 0;
    if (v[0] === 0x49 && v[1] === 0x44 && v[2] === 0x33) {
      const tagSize = ((v[6]&0x7f)<<21)|((v[7]&0x7f)<<14)|((v[8]&0x7f)<<7)|(v[9]&0x7f);
      audioStart = 10 + tagSize;
    }
    const frames = [];
    if (artist) frames.push(makeID3Frame('TPE1', artist));
    if (title)  frames.push(makeID3Frame('TIT2', title));
    const newTag = buildID3v2(frames);
    const combined = new Uint8Array(newTag.length + v.length - audioStart);
    combined.set(newTag, 0);
    combined.set(v.subarray(audioStart), newTag.length);
    return new File([combined], file.name, { type: file.type || 'audio/mpeg' });
  }

  // ─── ID3 tag reader ───────────────────────────────────────────────────────────
  async function readID3(file) {
    try {
      // Larger slice so embedded APIC cover art (often 200KB–1MB JPEG) fits
      const buf = await file.slice(0, 2_097_152).arrayBuffer();
      const v = new Uint8Array(buf);
      if (v[0] !== 73 || v[1] !== 68 || v[2] !== 51) return {};
      const ver = v[3];
      const hasExt = !!(v[5] & 0x40);
      const tagSize = ((v[6]&0x7f)<<21)|((v[7]&0x7f)<<14)|((v[8]&0x7f)<<7)|(v[9]&0x7f);
      let p = 10;
      if (hasExt) p += ((v[p]<<24)|(v[p+1]<<16)|(v[p+2]<<8)|v[p+3]) + 4;
      const end = Math.min(10 + tagSize, v.length);
      const tags = {};
      while (p < end - 10 && v[p]) {
        const id = String.fromCharCode(v[p],v[p+1],v[p+2],v[p+3]);
        const sz = ver >= 4
          ? ((v[p+4]&0x7f)<<21)|((v[p+5]&0x7f)<<14)|((v[p+6]&0x7f)<<7)|(v[p+7]&0x7f)
          : (v[p+4]<<24)|(v[p+5]<<16)|(v[p+6]<<8)|v[p+7];
        p += 10;
        if (sz > 0 && sz < 32768 && id[0] === 'T') {
          const enc = v[p];
          const bytes = v.slice(p+1, p+sz);
          try {
            tags[id] = new TextDecoder(
              enc === 0 ? 'iso-8859-1' : enc === 3 ? 'utf-8' : 'utf-16'
            ).decode(bytes).replace(/\0/g,'').trim();
          } catch {
            tags[id] = new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/\0/g,'').trim();
          }
        } else if (id === 'APIC' && sz > 0 && p + sz <= v.length && !tags.APIC) {
          try {
            const frameEnd = p + sz;
            const enc = v[p];
            let q = p + 1;
            // MIME type (ASCII, null-terminated)
            const mimeStart = q;
            while (q < frameEnd && v[q] !== 0) q++;
            const mime = String.fromCharCode(...v.slice(mimeStart, q));
            q++;                 // skip null
            if (q < frameEnd) q++; // picture type byte
            // Description (encoding-dependent null terminator)
            if (enc === 1 || enc === 2) {
              while (q + 1 < frameEnd && !(v[q] === 0 && v[q+1] === 0)) q++;
              q += 2;
            } else {
              while (q < frameEnd && v[q] !== 0) q++;
              q++;
            }
            const data = v.slice(q, frameEnd);
            if (data.length > 100 && /^image\//.test(mime)) {
              tags.APIC = { mime, data };
            }
          } catch {}
        }
        p += Math.max(0, sz);
      }
      return tags;
    } catch { return {}; }
  }

  // ─── cover compositor ─────────────────────────────────────────────────────────
  // Same text-layer pipeline as the "Обложка с текстом" editor
  // (vmuBuildTextLayerPipeline/vmuComputePosition below), fixed to that
  // panel's default params — Impact/176/outline 3/red-on-white/center/
  // 37°/115% — so the auto-playlist cover matches what the manual editor
  // produces instead of the old separate Georgia/-45°/no-outline look.
  function makePerezalitoCover(coverDataUrl) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000; canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1000, 1000);
        const layer = vmuBuildTextLayerPipeline({
          text: 'перезалито',
          fontFamily: 'Impact',
          fontSize: 176,
          textColor: [255, 0, 0],
          outlineColor: [255, 255, 255],
          outlineWidth: 3,
          opacity: 255,
        }, 115, 37);
        const [px, py] = vmuComputePosition([1000, 1000], [layer.width, layer.height], 'center');
        ctx.drawImage(layer, px, py);
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      };
      img.onerror = () => resolve(null);
      img.src = coverDataUrl;
    });
  }

  // ─── cover text-overlay editor: color helpers ───────────────────────────────────
  // Used to be a WCAG-contrast-driven analysis of the cover's own dominant
  // colors (JS port of text_overlay_app/color_tools.py) — picked whatever
  // flat color scored best against the image so text would stay legible.
  // Replaced with a plain random color: simpler, and the live canvas
  // preview already shows at a glance whether the result reads well, so a
  // numeric contrast score never told the user anything they couldn't just
  // look at.
  function vmuRelLuminance([r, g, b]) {
    const ch = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  }
  function vmuOppositeNeutral(rgb) { return vmuRelLuminance(rgb) >= 0.5 ? [0, 0, 0] : [255, 255, 255]; }
  function vmuRgbToHex([r, g, b]) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function vmuHexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
  }
  function vmuHsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  // Random hue at high saturation/value — vivid and legible-ish without
  // ever looking at the cover itself. Outline just goes black/white
  // opposite the picked color (vmuOppositeNeutral), same as before.
  function vmuRandomTextColor() {
    return vmuHsvToRgb(Math.random(), 0.7 + Math.random() * 0.3, 0.85 + Math.random() * 0.15);
  }

  // ─── cover text-overlay editor: text layer rendering ───────────────────────────
  // JS port of text_overlay_app/image_ops.py. The outline is drawn the same
  // way PIL does it — many copies of the fill text offset around a circle —
  // rather than canvas's own stroke/lineWidth, since a stroked font distorts
  // glyph shapes at the widths this tool uses; stamping copies keeps the
  // letterforms intact and just thickens the silhouette.
  const VMU_POSITION_LABELS = [
    ['Центр', 'center'], ['Верх', 'top'], ['Низ', 'bottom'],
    ['Верх-лево', 'top-left'], ['Верх-право', 'top-right'],
    ['Низ-лево', 'bottom-left'], ['Низ-право', 'bottom-right'],
    ['Произвольно', 'custom'],
  ];
  // Curated Cyrillic-capable font list — the reference desktop tool scans
  // the OS's installed .ttf/.otf files for Cyrillic glyph coverage, which a
  // content script can't do; this is the closest browser-side equivalent
  // (common fonts a Windows/macOS box actually has, canvas falls back
  // silently to a generic sans-serif if one isn't installed).
  const VMU_COVER_FONTS = [
    'Impact', 'Arial Black', 'Arial', 'Verdana', 'Tahoma', 'Times New Roman',
    'Georgia', 'Comic Sans MS', 'Segoe UI', 'Calibri', 'Courier New', 'PT Sans', 'Roboto',
  ];

  function vmuMeasureMultiline(ctx, lines, fontCss) {
    ctx.font = fontCss;
    let maxWidth = 0, maxAscent = 0, maxDescent = 0;
    for (const line of lines) {
      const m = ctx.measureText(line || ' ');
      maxWidth = Math.max(maxWidth, m.width);
      maxAscent = Math.max(maxAscent, m.actualBoundingBoxAscent || 0);
      maxDescent = Math.max(maxDescent, m.actualBoundingBoxDescent || 0);
    }
    const sizePx = parseFloat(fontCss) || 20;
    const glyphHeight = (maxAscent + maxDescent) || sizePx * 1.2;
    const lineHeight = glyphHeight * 1.25;
    return { width: Math.max(1, Math.ceil(maxWidth)), lineHeight, ascent: maxAscent || sizePx, height: Math.max(1, Math.ceil(lineHeight * lines.length)) };
  }

  function vmuRenderTextLayer({ text, fontFamily, fontSize, textColor, outlineColor, outlineWidth, opacity }) {
    const lines = text.split('\n');
    const fontCss = `${fontSize}px "${fontFamily}", sans-serif`;
    const probeCtx = document.createElement('canvas').getContext('2d');
    const metrics = vmuMeasureMultiline(probeCtx, lines, fontCss);

    const pad = outlineWidth + 4;
    const layerW = Math.max(1, metrics.width + pad * 2);
    const layerH = Math.max(1, metrics.height + pad * 2);
    const layer = document.createElement('canvas');
    layer.width = layerW; layer.height = layerH;
    const ctx = layer.getContext('2d');
    ctx.font = fontCss;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const centerX = layerW / 2;
    const firstBaselineY = pad + metrics.ascent;
    const drawLines = color => {
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      lines.forEach((line, i) => ctx.fillText(line, centerX, firstBaselineY + i * metrics.lineHeight));
    };

    if (outlineWidth > 0) {
      const steps = Math.max(16, Math.round(outlineWidth * 10));
      for (let i = 0; i < steps; i++) {
        const angle = (2 * Math.PI * i) / steps;
        ctx.save();
        ctx.translate(outlineWidth * Math.cos(angle), outlineWidth * Math.sin(angle));
        drawLines(outlineColor);
        ctx.restore();
      }
    }
    drawLines(textColor);

    if (opacity < 255) {
      const id = ctx.getImageData(0, 0, layerW, layerH);
      const d = id.data;
      const factor = Math.max(0, opacity) / 255;
      for (let i = 3; i < d.length; i += 4) d[i] = Math.round(d[i] * factor);
      ctx.putImageData(id, 0, 0);
    }
    return layer;
  }

  function vmuApplyScale(canvas, percent) {
    if (percent === 100) return canvas;
    const w = Math.max(1, Math.round(canvas.width * percent / 100));
    const h = Math.max(1, Math.round(canvas.height * percent / 100));
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, w, h);
    return out;
  }

  // Rotates with an expanded canvas (same idea as PIL's rotate(expand=True))
  // so the already-padded layer never clips. Positive angle turns the text
  // clockwise, matching the reference tool's rotation slider direction.
  function vmuApplyRotation(canvas, angleDeg) {
    if (!angleDeg) return canvas;
    const rad = angleDeg * Math.PI / 180;
    const w = canvas.width, h = canvas.height;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    const newW = Math.ceil(w * cos + h * sin);
    const newH = Math.ceil(w * sin + h * cos);
    const out = document.createElement('canvas');
    out.width = newW; out.height = newH;
    const ctx = out.getContext('2d');
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(canvas, -w / 2, -h / 2);
    return out;
  }

  function vmuComputePosition(canvasSize, layerSize, position, customXY, margin = 20) {
    const [cw, ch] = canvasSize;
    const [lw, lh] = layerSize;
    if (position === 'custom' && customXY) {
      const [cx, cy] = customXY;
      return [Math.round(cx - lw / 2), Math.round(cy - lh / 2)];
    }
    const anchors = {
      center: [cw / 2, ch / 2],
      top: [cw / 2, margin + lh / 2],
      bottom: [cw / 2, ch - margin - lh / 2],
      'top-left': [margin + lw / 2, margin + lh / 2],
      'top-right': [cw - margin - lw / 2, margin + lh / 2],
      'bottom-left': [margin + lw / 2, ch - margin - lh / 2],
      'bottom-right': [cw - margin - lw / 2, ch - margin - lh / 2],
    };
    const [cx, cy] = anchors[position] || anchors.center;
    return [Math.round(cx - lw / 2), Math.round(cy - lh / 2)];
  }

  function vmuBuildTextLayerPipeline(opts, scalePercent, rotationDeg) {
    let layer = vmuRenderTextLayer(opts);
    layer = vmuApplyScale(layer, scalePercent);
    layer = vmuApplyRotation(layer, rotationDeg);
    return layer;
  }

  function getVkUserId() {
    // URL-first: works for any user (/audiosXXX) or group (/audios-XXX) page
    const m = location.href.match(/audios(-?\d+)/);
    if (m) return m[1];
    // Fallback: localStorage key for personal pages only
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('audio_v21_track_')) {
          const id = k.slice('audio_v21_track_'.length);
          if (/^\d+$/.test(id)) return id;
        }
      }
    } catch {}
    return null;
  }

  // ─── Playlist duplicate check: DOM scan (runs when background.js opens this
  // page in a hidden window and asks) ─────────────────────────────────────────
  // Reads the owner's real playlist titles the same way a user checking by
  // hand would: click the "Плейлисты" section's own "Показать все" then
  // scroll to the bottom repeatedly — that's what drives the catalog's lazy
  // loading — until the mounted count stops growing.
  //
  // "Показать все" isn't unique by itself: on the current user's own
  // /audios?section=all every block (Недавно прослушанные, Плейлисты,
  // Музыканты, Музыка друзей) has one, all sharing the same
  // data-testid="AudioCatalogTextLinkAction" (verified live) — clicking the
  // first match found would as likely jump into "friends' music" as into
  // playlists. findSectionShowAll walks up from the "Плейлисты" heading text
  // to the nearest ancestor that contains one such link, scoping the click to
  // the right block. (A page with only one playlists-style block, e.g.
  // someone else's /audios, still works the same way.)
  function findSectionShowAll(sectionTitle) {
    const heading = [...document.querySelectorAll('h1,h2,h3,div,span')]
      .find(el => el.children.length === 0 && el.textContent.trim() === sectionTitle);
    if (!heading) return null;
    let node = heading;
    for (let i = 0; i < 12 && node; i++) {
      const link = node.querySelector('[data-testid="AudioCatalogTextLinkAction"]');
      if (link) return link;
      node = node.parentElement;
    }
    return null;
  }

  // Returns [{id: "ownerId_playlistId", title}] — the id is what the
  // auto-add-to-existing-playlist feature needs to actually add tracks
  // (VK_ADD_TRACKS_TO_PLAYLIST), not just detect a name collision.
  async function scanAllOwnerPlaylists() {
    const CELL_SEL = '[data-testid="MusicPlaylistItem_Cell"]';
    const TITLE_SEL = '[data-testid="MusicPlaylistItem_Title"]';

    await waitForElement('[data-testid="AudioCatalogTextLinkAction"], ' + CELL_SEL, 10000);
    const showAll = findSectionShowAll('Плейлисты');
    if (showAll) {
      showAll.click();
      await waitForElement(CELL_SEL, 10000);
    } else {
      // No "Плейлисты" show-all link — either every playlist already fits
      // inline, or the owner has none. Harvest whatever's mounted rather
      // than failing outright.
      await waitForElement(CELL_SEL, 5000);
    }

    let lastCount = -1, stable = 0;
    const MAX_ITER = 60, STABLE_LIMIT = 4;
    for (let i = 0; i < MAX_ITER && stable < STABLE_LIMIT; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(600);
      const n = document.querySelectorAll(CELL_SEL).length;
      stable = (n === lastCount) ? stable + 1 : 0;
      lastCount = n;
    }

    return [...document.querySelectorAll(CELL_SEL)]
      .map(cell => ({
        id: cell.getAttribute('data-id') || '',
        title: cell.querySelector(TITLE_SEL)?.textContent?.trim() || '',
      }))
      .filter(p => p.id && p.title);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === 'VMU_SCAN_PLAYLISTS') {
        scanAllOwnerPlaylists()
          .then(playlists => sendResponse({ ok: true, playlists }))
          .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
        return true;
      }
      return false;
    });
  }

  function translateError(msg) {
    const map = {
      btn_create_playlist_not_found: 'Кнопка "Создать плейлист" не найдена. Перейдите на страницу своей музыки (/audios) и попробуйте снова.',
      dialog_not_opened: 'Диалог создания плейлиста не открылся.',
      save_btn_not_found: 'Кнопка "Сохранить" не найдена в диалоге.',
      save_playlist_timeout: 'Плейлист не был сохранён за 20 секунд.',
      playlist_id_not_found: 'Не удалось получить ID созданного плейлиста.',
    };
    return map[msg] || msg;
  }

  // Send message to injected.js and wait for response
  // matchKey (e.g. 'trackId') correlates a response to its own request when
  // several pageCall()s for the same responseType are in flight concurrently
  // (parallel playlist downloads) — without it, the first handler registered
  // resolves on the first matching-type message regardless of which request
  // it actually answers, silently handing one track's result to another's
  // promise. Callers that never run concurrently can omit it.
  function pageCall(sendType, responseType, payload, timeoutMs = 15000, matchKey) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error(`Timeout: ${responseType}`));
      }, timeoutMs);
      function handler(e) {
        if (e.source !== window || e.data?.type !== responseType) return;
        if (matchKey && e.data[matchKey] !== payload[matchKey]) return;
        window.removeEventListener('message', handler);
        clearTimeout(t);
        const d = e.data;
        d.ok !== false ? resolve(d) : reject(new Error(d.error || responseType + ' failed'));
      }
      window.addEventListener('message', handler);
      // Collect all transferable ArrayBuffers from payload
      const transfers = [];
      if (payload) {
        for (const v of Object.values(payload)) {
          if (v instanceof ArrayBuffer) transfers.push(v);
        }
      }
      window.postMessage({ type: sendType, ...payload }, '*', transfers);
    });
  }

  // ─── cover upload via VK dialog ───────────────────────────────────────────────
  async function uploadCoverViaDialog(coverBlob) {
    const buf = await coverBlob.arrayBuffer();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        window.__vmuCoverCallback = null;
        reject(new Error('Timeout загрузки обложки'));
      }, 45000);
      window.__vmuCoverCallback = (data) => {
        clearTimeout(t);
        data.ok ? resolve() : reject(new Error(data.error || 'Ошибка обложки'));
      };
      window.postMessage({ type: 'VK_UPLOAD_COVER', buffer: buf }, '*', [buf]);
    });
  }

  // VK's upload transport doesn't reliably let us correlate a done_add
  // response back to a specific filename anymore (see NATIVE_HANDOFF_ONLY) —
  // "fileName: null" comes back for native-handoff uploads, which is exactly
  // why the old per-file queue/auto-playlist trigger was frozen. Rather than
  // fight the network layer, watch the DOM instead: the page header's own
  // "N треков · M плейлиста" count is what VK's own UI trusts, and it updates
  // the moment a track actually attaches to the library, regardless of
  // transport. Scoped to AudioCatalog_BlockMusicOwner (verified live)
  // so it can't accidentally match an unrelated count elsewhere on the page.
  function getPageTrackCount() {
    const el = document.querySelector('[data-testid="AudioCatalog_BlockMusicOwner"]');
    const text = el?.textContent || '';
    const m = text.match(/([\d\s ]+)\s*(?:треков|трека|трек)(?![а-яёА-ЯЁ])/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/[\s ]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  }

  // Polls until the page's track count rises by `expected` (or times out).
  // Returns however many net new tracks actually showed up — 0 if none did,
  // which callers treat as "upload didn't really go through, don't create a
  // playlist for nothing".
  function waitForTrackCountIncrease(startCount, expected, timeoutMs) {
    timeoutMs = timeoutMs || Math.max(20000, expected * 8000);
    return new Promise(resolve => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        const now = getPageTrackCount();
        const gained = now == null ? 0 : Math.max(0, now - startCount);
        if (gained >= expected || Date.now() >= deadline) { resolve(gained); return; }
        setTimeout(tick, 1000);
      };
      tick();
    });
  }

  // Adds the just-uploaded tracks to an existing playlist (the "дозаливка"
  // case: the album already has a playlist, the user just uploaded the
  // tracks they missed the first time). `playlist.id` is
  // "ownerId_playlistId" as scanned off MusicPlaylistItem_Cell's own
  // data-id.
  //
  // This goes through VK's own edit-playlist UI (open the playlist's edit
  // dialog → "Добавить аудиозаписи" → tick the matching tracks by name →
  // click VK's own Save button), the exact same path createPlaylistViaUI
  // already uses to populate a brand-new playlist — NOT a direct
  // audio.editPlaylist call. That matters: audio.editPlaylist replaces the
  // playlist's entire track list AND requires title/description/no_discover
  // resent on every call or VK blanks them (see reorderPlaylistViaApi's own
  // comment) — a background call built from a title we scraped off a grid
  // cell would have no real description/no_discover to send and would risk
  // silently wiping them. Driving VK's own Save button instead means VK
  // resends its own live form state, so existing metadata is never at risk
  // from us. Returns false (never throws) so callers fall back to the
  // normal duplicate-playlist prompt — including when VK's picker found no
  // matching tracks, which is a real "nothing was added" outcome, not
  // success.
  async function addTracksToExistingPlaylist(playlist, trackNames) {
    const [ownerIdStr, playlistIdStr] = (playlist.id || '').split('_');
    const playlistId = parseInt(playlistIdStr, 10);
    if (!ownerIdStr || !Number.isFinite(playlistId)) return false;
    try {
      // Generous timeout: matching tracks means scrolling the owner's own
      // catalog list (selectTracksFromCommunityList in injected.js) until
      // either every track is found or the whole thing is exhausted — for a
      // large library that can take a while even though the common case
      // (just-uploaded tracks sort newest-first) resolves in a few seconds.
      const res = await pageCall('VK_ADD_TRACKS_TO_PLAYLIST', 'VK_ADD_TRACKS_TO_PLAYLIST_DONE', {
        reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ownerId: ownerIdStr, playlistId, trackNames,
      }, 120000, 'reqId');
      return !!res.ok && res.selectedCount > 0;
    } catch (err) {
      console.warn('[VK Multi Upload] addTracksToExistingPlaylist failed:', err);
      return false;
    }
  }

  // ─── auto-playlist flow ───────────────────────────────────────────────────────
  // Queues a completed batch for runAutoPlaylist instead of calling it
  // directly — a second batch (typically a retried track finishing upload
  // while the first batch's dup-check/track-search is still in flight) gets
  // its turn once the current one finishes rather than being silently
  // dropped. `onSettled` runs once this specific batch is done, success or
  // not (reloadAfterBatchIfNeeded at the call sites needs that).
  function enqueueAutoPlaylist(items, onSettled) {
    autoPlaylistQueue.push({ items, onSettled });
    drainAutoPlaylistQueue();
  }

  async function drainAutoPlaylistQueue() {
    if (autoPlaylistRunning) return;
    autoPlaylistRunning = true;
    try {
      while (autoPlaylistQueue.length) {
        const { items, onSettled } = autoPlaylistQueue.shift();
        try {
          await runAutoPlaylist(items);
        } finally {
          onSettled?.();
        }
      }
    } finally {
      autoPlaylistRunning = false;
    }
  }

  async function runAutoPlaylist(uploadedItems) {
    const done = uploadedItems.filter(i => i.status === 'done');
    if (!done.length) return;

    const ownerId = getVkUserId();
    if (!ownerId) { showProgressToast('Ошибка: ID пользователя не найден', { id: 'vmu-autoplaylist', kind: 'error' }); return; }

    showProgressToast('Читаем метаданные…', { id: 'vmu-autoplaylist' });

    try {
      const tagsList = done.map(i => i.tags || {});
      const albums  = [...new Set(tagsList.map(t => t.TALB).filter(Boolean))];
      const artists = [...new Set([
        ...tagsList.map(t => t.TPE2).filter(Boolean),
        ...tagsList.map(t => t.TPE1).filter(Boolean),
      ])].slice(0, 5);

      // Template: "Альбом (Год) Исполнитель"
      const album  = albums[0] || '';
      const year   = [...new Set(tagsList.map(t => t.TYER || t.TDRC?.substring(0,4)).filter(Boolean))][0] || '';
      const artist = artists[0] || '';
      let title = album;
      if (year)   title += ' (' + year + ')';
      if (artist) title += ' ' + artist;
      if (!title) title = done[0].file.name.replace(/\.mp3$/i,'') || 'Плейлист';

      // Description: название + подпись
      const description = title + '\nчеловек паук поможет каждому [vk.com/reuploadunder]';

      // Build track names list for matching in the edit dialog (in upload
      // order) — needed both for populating a brand-new playlist below AND
      // for the duplicate-check's auto-add-to-existing path just above it.
      const trackNames = done.map(i => {
        const tags = i.tags || {};
        const tagArtist = tags.TPE1 || tags.TPE2 || '';
        const tagTitle = tags.TIT2 || '';
        if (tagArtist && tagTitle) return { artist: tagArtist, title: tagTitle };
        const name = i.file.name.replace(/\.mp3$/i, '');
        const parts = name.split(/\s*[-–—]\s*/);
        if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
        return { artist: '', title: name };
      });

      // Duplicate check: ask before creating a second playlist with the same
      // title. Checked against the owner's REAL playlist list, scraped the
      // same way a person checking by hand would: background.js opens
      // /audios<ownerId> in a hidden, minimized window, our own content.js
      // auto-runs there (manifest content_scripts, no extra permission
      // needed), clicks "Показать все" and scrolls the catalog until every
      // playlist is mounted, then reports {id, title} pairs back — see
      // scanAllOwnerPlaylists above and scanPlaylistsInHiddenTab in
      // background.js. Replaced the old audio.getPlaylists API call, which
      // had to hand-parse a token out of localStorage and finish an entire
      // paginated fetch inside one 15s window — fragile for any account with
      // a lot of playlists, and any failure silently proceeded as "no
      // duplicate" with zero feedback.
      if (settings.dupPlaylistCheck) {
        showProgressToast('Проверяем на дубликаты…', { id: 'vmu-autoplaylist' });
        try {
          const scanRes = await new Promise(resolve => {
            try {
              chrome.runtime.sendMessage(
                { type: 'VKD_SCAN_PLAYLISTS', url: `${location.origin}/audios${ownerId}` },
                res => resolve(res)
              );
            } catch { resolve({ ok: false, error: 'extension context error' }); }
          });
          if (!scanRes?.ok) throw new Error(scanRes?.error || 'scan failed');
          const norm = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
          const match = (scanRes.playlists || []).find(p => norm(p.title) === norm(title));
          if (match) {
            // "Дозаливка" scenario: the album/playlist already exists and
            // the user is just uploading the tracks they missed the first
            // time — merge into it instead of asking to make a duplicate.
            // Falls through to the usual create-duplicate prompt if this is
            // off, or if the add itself fails for any reason.
            if (settings.autoAddToExistingPlaylist) {
              showProgressToast(`Плейлист «${title.slice(0,30)}» уже есть — добавляем треки…`, { id: 'vmu-autoplaylist' });
              const added = await addTracksToExistingPlaylist(match, trackNames);
              if (added) {
                showProgressToast(`Добавлено в «${title.slice(0,30)}»`, { id: 'vmu-autoplaylist', kind: 'done' });
                return;
              }
              console.warn('[VK Multi Upload] auto-add to existing playlist failed, falling back to duplicate prompt');
            }
            const choice = await showDupPlaylistPrompt(title);
            if (choice.dontAskAgain) {
              settings.dupPlaylistCheck = false;
              saveSettings();
              const dupToggle = document.getElementById('vmu-dupcheck-toggle');
              if (dupToggle) dupToggle.checked = false;
              const autoAddRow = document.getElementById('vmu-autoadd-row');
              if (autoAddRow) autoAddRow.classList.add('vmu-row-disabled');
            }
            if (!choice.create) {
              showProgressToast(`Отменено: плейлист «${title.slice(0,30)}» уже есть`, { id: 'vmu-autoplaylist', kind: 'error' });
              return;
            }
          }
        } catch (err) {
          // Non-fatal — the check is a courtesy, not a gate. If it fails
          // (hidden tab couldn't load, scan timed out, etc.) proceed as if
          // nothing was found, but say so — silently swallowing this used to
          // make the whole feature look broken.
          console.warn('[VK Multi Upload] duplicate playlist check failed, proceeding:', err);
          showProgressToast('Не удалось проверить на дубликаты, продолжаю без проверки…', { id: 'vmu-autoplaylist', kind: 'error' });
          await sleep(2000);
        }
      }

      // Prepare cover blob BEFORE opening the dialog (inject it during creation).
      // Priority: user-set base cover from settings → if the "Обложка из ID3"
      // toggle is on, first file's embedded ID3 APIC frame. Either source is
      // passed through makePerezalitoCover so the watermark applies uniformly.
      let coverBlob = null;
      let coverSource = null;
      if (settings.coverDataUrl) {
        coverSource = settings.coverDataUrl;
      } else if (settings.autoCoverFromId3) {
        const apicItem = done.find(i => i.tags?.APIC?.data);
        if (apicItem) {
          showProgressToast('Извлекаем обложку из ID3…', { id: 'vmu-autoplaylist' });
          const apic = apicItem.tags.APIC;
          const apicBlob = new Blob([apic.data], { type: apic.mime || 'image/jpeg' });
          coverSource = await new Promise(res => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => res(null);
            r.readAsDataURL(apicBlob);
          });
        }
      }
      if (coverSource) {
        showProgressToast('Готовим обложку…', { id: 'vmu-autoplaylist' });
        coverBlob = await makePerezalitoCover(coverSource);
      }

      // Create playlist: opens VK dialog, fills fields, injects cover, selects tracks, saves.
      // reqId as matchKey so this call's response can't cross-resolve with a
      // different overlapping VK_CREATE_PLAYLIST call's (see injected.js's
      // __playlistCreationQueue — they no longer actually run concurrently,
      // but this keeps pageCall() correct even if that ever changes).
      showProgressToast('Создаём плейлист…', { id: 'vmu-autoplaylist' });
      const created = await pageCall('VK_CREATE_PLAYLIST', 'VK_PLAYLIST_CREATED', {
        reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: title.slice(0, 255),
        description: description.slice(0, 1000),
        trackNames,
        coverBuf: coverBlob ? await coverBlob.arrayBuffer() : null,
      }, 60000, 'reqId');

      showProgressToast(`Плейлист «${title.slice(0,30)}» создан!`, { id: 'vmu-autoplaylist', kind: 'done' });
    } catch (err) {
      showProgressToast(`Ошибка: ${translateError(err.message)}`, { id: 'vmu-autoplaylist', kind: 'error' });
      console.error('[VK Multi Upload]', err);
    }
  }

  async function openAndInjectCover(ownerId, playlistId, coverBlob) {
    let editBtn = null;
    for (let i = 0; i < 10; i++) {
      editBtn = findPlaylistEditBtn(playlistId);
      if (editBtn) break;
      await sleep(600);
    }
    if (!editBtn) throw new Error('Кнопка редактирования плейлиста не найдена');

    editBtn.click();
    await sleep(700);

    const coverEl = await waitForElement('.ape_cover', 3000);
    if (!coverEl) throw new Error('.ape_cover не найден в диалоге');

    await uploadCoverViaDialog(coverBlob);
  }

  function findPlaylistEditBtn(playlistId) {
    const links = document.querySelectorAll(`[href*="_${playlistId}"], [data-id="${playlistId}"], [data-playlist-id="${playlistId}"]`);
    for (const el of links) {
      let parent = el;
      for (let i = 0; i < 6; i++) {
        parent = parent.parentElement;
        if (!parent) break;
        const btn = parent.querySelector('button');
        if (btn && btn.textContent.includes('едактир')) return btn;
      }
    }
    return null;
  }

  // ─── duplicate finder ─────────────────────────────────────────────────────────
  function getPlaylistInfoFromUrl() {
    const url = location.href;
    // /music/playlist/-206614096_44  or  /music/playlist/-206614096_44_accesshash
    const m1 = url.match(/playlist\/([-\d]+)_(\d+)(?:_([a-zA-Z0-9_]+))?/);
    if (m1) return { ownerId: m1[1], playlistId: m1[2], accessHash: m1[3] || null };
    // ?z=audio_playlist-206614096_44  or  ?z=audio_playlist-206614096_44_accesshash
    const m2 = url.match(/audio_playlist([-\d]+)_(\d+)(?:_([a-zA-Z0-9_]+))?/);
    if (m2) return { ownerId: m2[1], playlistId: m2[2], accessHash: m2[3] || null };
    // legacy ?playlist_id=&owner_id=
    const m3 = url.match(/playlist_id=(\d+)/);
    const m4 = url.match(/[?&]owner_id=([-\d]+)/);
    if (m3 && m4) return { ownerId: m4[1], playlistId: m3[1], accessHash: null };
    return null;
  }

  // Find the playlist container in DOM to scope track search
  function findPlaylistContainer(plInfo) {
    if (plInfo) {
      const plKey = `${plInfo.ownerId}_${plInfo.playlistId}`;
      // Playlist opened in a modal dialog
      const modal = [...document.querySelectorAll('[class*="vkitInternalModalBox"]')]
        .find(m => m.getBoundingClientRect().width > 0);
      if (modal) return modal;
      // Old VK playlist container with matching class
      const oldPl = document.querySelector(`[class*="_audio_pl_${plKey}"]`);
      if (oldPl) return oldPl.closest('.audio_pl_snippet, .AudioPlaylistSnippet') || oldPl;
      // Playlist page container
      const plPage = document.querySelector(`.audio_pl_snippet__list, .AudioPlaylistSnippet__list, [class*="PlaylistAudioList"]`);
      if (plPage) return plPage;
    }
    // Playlist page — use main content area, not the whole page (excludes player bar, recommendations, etc.)
    return document.querySelector('#content, .page_block, [class*="AudioBlock"], [class*="CatalogBlock"]') || document;
  }

  // Parse tracks from DOM scoped to the playlist container
  function getTracksFromDOM(plInfo) {
    const container = findPlaylistContainer(plInfo);
    const tracks = [];
    const seen = new Set();

    const rows = container.querySelectorAll(
      '.audio_row[data-full-id], [data-full-id], [data-audio-id], .AudioRow, [data-testid$="MusicTrackRow"]'
    );

    for (const row of rows) {
      const fullId = row.dataset.fullId || row.dataset.audioId;
      if (!fullId || seen.has(fullId)) continue;

      const titleEl = row.querySelector('.audio_title, .ai_title, [class*="audio_title"], [class*="AudioRow__title"]');
      const artistEl = row.querySelector('.audio_artist, .ai_artist, [class*="audio_artist"], [class*="AudioRow__artist"]');

      if (titleEl || artistEl) {
        seen.add(fullId);
        tracks.push({
          id: fullId.split('_')[1] || fullId,
          owner_id: fullId.split('_')[0] || '',
          fullId,
          title: titleEl?.textContent?.trim() || '',
          artist: artistEl?.textContent?.trim() || '',
        });
      }
    }

    // Fallback: parse from audio link hrefs within container
    if (!tracks.length) {
      const links = container.querySelectorAll('a[href^="/audio"]');
      for (const link of links) {
        const m = link.href.match(/\/audio(-?\d+)_(\d+)/);
        if (!m) continue;
        const fullId = `${m[1]}_${m[2]}`;
        if (seen.has(fullId)) continue;
        seen.add(fullId);
        tracks.push({
          id: m[2],
          owner_id: m[1],
          fullId,
          title: link.textContent?.trim() || '',
          artist: '',
        });
      }
    }

    return tracks;
  }

  // ─── playlist sort-by-dropped-files ─────────────────────────────────────────
  // "Редактирование плейлиста" popup — VK renders its track list two different
  // ways (verified live, same playlist, different opens): the old .audio_row
  // markup (data-full-id) or the modern vkit rows (data-sortable-id). Both are
  // handled here so whichever VK serves this time still works. Reordering
  // itself goes through injected.js' reorderPlaylistViaApi — see the comment
  // there for why drag can't be automated from a content script.
  // getPlaylistInfoFromUrl() only works when the popup was opened via a
  // ?z=audio_playlist-…/playlist/… deep link — clicking a playlist card from
  // a listing (the normal path) never touches location.href, so it stays
  // null. Filled in from injected.js' relayEditPlaylistIds (reads owner_id/
  // playlist_id off VK's own playlists_edit_data request) as a fallback.
  let lastEditPlaylistIds = null;
  window.addEventListener('message', e => {
    if (e.source !== window || e.data?.type !== 'VKD_EDIT_PLAYLIST_IDS') return;
    lastEditPlaylistIds = { ownerId: e.data.ownerId, playlistId: e.data.playlistId, accessHash: null };
  });

  function getEditPlaylistBox() {
    const boxes = [...document.querySelectorAll('.popup_box_container')]
      .filter(c => getComputedStyle(c).display !== 'none' && c.querySelector('.audio_pl_edit_box'));
    return boxes[boxes.length - 1] || null;
  }

  // Reads the playlist's current track list+order straight from VK's API
  // (audio.get via injected.js) instead of the popup's DOM. The row list
  // there lazy-appends in batches as its inner .ape_item_list is scrolled —
  // verified live on a 108-track playlist: only ~20 rows are mounted up
  // front. Loading the rest turned out to depend on unpredictable session
  // state — a synthetic `scrollTop` nudge reliably grew it to 108/108 in one
  // tab but did nothing in a freshly opened tab, where only a genuine (CDP
  // trusted-input) wheel scroll worked — the same trusted-input-only
  // behavior already documented for this popup's native drag reorder. A
  // content script can't dispatch trusted input, so DOM scrolling can't be
  // made reliable; going through the API sidesteps the popup's virtualized
  // DOM entirely and is what reorderPlaylistViaApi already does for the
  // matching pass on the injected.js side.
  function fetchPlaylistTracksViaApi(plInfo) {
    return new Promise(resolve => {
      const h = e => {
        if (e.source !== window || e.data?.type !== 'VKD_GET_PLAYLIST_TRACKS_DONE') return;
        window.removeEventListener('message', h);
        resolve(e.data);
      };
      window.addEventListener('message', h);
      window.postMessage({ type: 'VKD_GET_PLAYLIST_TRACKS', ownerId: plInfo.ownerId, playlistId: plInfo.playlistId, accessHash: plInfo.accessHash }, '*');
    });
  }

  // Shared by both order sources (dropped files, Genius tracklist): entries
  // is [{artist, title}] in the desired final order. Matches them against the
  // playlist's current tracks by normalizeKey, unmatched tracks keep their
  // relative order at the end, then persists via VKD_REORDER_PLAYLIST.
  async function applyPlaylistOrderFromEntries(box, entries, sourceLabel) {
    const plInfo = getPlaylistInfoFromUrl() || lastEditPlaylistIds;
    if (!plInfo) { showToast('Не удалось определить плейлист (ownerId/playlistId)', true); return; }

    showProgressToast('Загружаю треки плейлиста…', { id: 'vmu-pl-sort' });
    const trackRes = await fetchPlaylistTracksViaApi(plInfo);
    if (!trackRes.ok) { showProgressToast('Ошибка: ' + (trackRes.error || '?'), { id: 'vmu-pl-sort', kind: 'error' }); return; }

    const rows = trackRes.tracks;
    if (!rows.length) { showToast('Не нашёл треки в плейлисте', true); return; }

    // Title-first matching: different sources format multi-artist credits
    // differently enough ("ЗАМАЙ, Слава КПСС" vs "ZAMAY & Слава КПСС") that
    // requiring an exact artist match too would silently fail every track on
    // collab albums. Artist only breaks ties between rows sharing the same
    // normalized title (remixes, alternate versions, "feat." variants).
    const wordsOf = s => normalizeNamePart(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const rowMeta = rows.map(r => ({ row: r, titleKey: normalizeNamePart(r.title), titleWords: wordsOf(r.title), artistWords: new Set(wordsOf(r.artist)) }));

    // Below the normalized-title-equality tier, a looser fallback for titles
    // that are clearly the same track but not byte-identical after
    // normalization — one side appending extra credit text the stripping
    // regexes above don't recognize, a homoglyph pair (Cyrillic/Latin
    // look-alikes that read identical but are different code points), or a
    // reuploader's own spelling variant of a name (verified live: Genius'
    // "Vogifin" vs the actual VK track's "Voogifin" — one inserted letter).
    // Scored as "what fraction of the SHORTER title's words also appear in
    // the longer one" (relative to the smaller side, not a symmetric Jaccard
    // over the union) — the same shape of heuristic selectTracksBySearch/
    // trackMatchesItem already use in injected.js — rather than a single
    // whole-string edit distance, since a whole appended credit phrase
    // (several extra words) shouldn't tank the score the way it would
    // penalize a length-normalized distance metric. Per-word comparison
    // itself also tolerates a small edit distance rather than requiring
    // exact equality, so a one-letter spelling variant on an otherwise
    // identical title doesn't zero out that word's contribution.
    const FUZZY_TITLE_THRESHOLD = 0.75;
    function levenshtein(a, b) {
      if (a === b) return 0;
      const al = a.length, bl = b.length;
      if (!al) return bl;
      if (!bl) return al;
      let prev = new Array(bl + 1);
      let curr = new Array(bl + 1);
      for (let j = 0; j <= bl; j++) prev[j] = j;
      for (let i = 1; i <= al; i++) {
        curr[0] = i;
        for (let j = 1; j <= bl; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
      }
      return prev[bl];
    }
    // Tolerance scales with word length so short words still need to be
    // exact (else "от" would "fuzzy-match" half the dictionary at 1 edit).
    function wordsMatch(a, b) {
      if (a === b) return true;
      const minLen = Math.min(a.length, b.length);
      if (minLen < 4) return false;
      const maxEdits = minLen >= 8 ? 2 : 1;
      return levenshtein(a, b) <= maxEdits;
    }
    function fuzzyTitleScore(wordsA, wordsB) {
      if (wordsA.length < 2 || wordsB.length < 2) return 0; // too short to safely fuzzy-match
      const used = new Array(wordsB.length).fill(false);
      let common = 0;
      for (const wa of wordsA) {
        const idx = wordsB.findIndex((wb, j) => !used[j] && wordsMatch(wa, wb));
        if (idx !== -1) { used[idx] = true; common++; }
      }
      return common / Math.min(wordsA.length, wordsB.length);
    }

    const claimed = new Set();
    // Parallel to entries (same order, same length) — slotNumId[i] is the
    // matched row's numId for entries[i], or null while still unmatched.
    // Kept as a fixed-size array (rather than pushing only matches) so the
    // elimination pass below can fill specific gaps without disturbing the
    // positions already resolved by title matching.
    const slotNumId = new Array(entries.length).fill(null);
    const entryResults = [];
    entries.forEach((en, idx) => {
      const titleKey = normalizeNamePart(en.title);
      const artistWords = wordsOf(en.artist);
      const remaining = rowMeta.map((m, i) => ({ m, i })).filter(({ i }) => !claimed.has(i));
      let candidates = remaining.filter(({ m }) => m.titleKey === titleKey);
      if (!candidates.length) {
        const entryTitleWords = wordsOf(en.title);
        let bestFuzzy = null, bestFuzzyScore = FUZZY_TITLE_THRESHOLD;
        for (const c of remaining) {
          const score = fuzzyTitleScore(entryTitleWords, c.m.titleWords);
          if (score >= bestFuzzyScore) { bestFuzzyScore = score; bestFuzzy = c; }
        }
        candidates = bestFuzzy ? [bestFuzzy] : [];
      }
      if (!candidates.length) { entryResults.push({ artist: en.artist, title: en.title, matched: false }); return; }
      let best = candidates[0];
      if (candidates.length > 1) {
        let bestScore = -1;
        for (const c of candidates) {
          const score = artistWords.reduce((n, w) => n + (c.m.artistWords.has(w) ? 1 : 0), 0);
          if (score > bestScore) { bestScore = score; best = c; }
        }
      }
      claimed.add(best.i);
      slotNumId[idx] = best.m.row.numId;
      entryResults.push({ artist: en.artist, title: en.title, matched: true });
    });

    // Last resort for whatever's left after both title tiers above — e.g. a
    // title that's mostly redacted/garbled on one side, or phrased so
    // differently there's no usable word overlap. Text similarity can't
    // help there (at that point almost any two tracks look "equally
    // similar"), but a much stronger signal still can: if exactly as many
    // rows are left unclaimed as there are entries still unmatched,
    // everything else has already been claimed by an actual title match —
    // so there is only one way the leftovers on both sides can correspond,
    // in the same relative order they were already in. Only applied when
    // the counts line up exactly; if they don't, a genuinely missing or
    // extra track is more likely than a text-matching failure, and forcing
    // a pairing then would misalign the rest instead of just under-fixing.
    const unmatchedIdxs = [];
    for (let i = 0; i < slotNumId.length; i++) if (slotNumId[i] == null) unmatchedIdxs.push(i);
    const leftoverRowIdxs = [];
    for (let i = 0; i < rowMeta.length; i++) if (!claimed.has(i)) leftoverRowIdxs.push(i);
    if (unmatchedIdxs.length && unmatchedIdxs.length === leftoverRowIdxs.length) {
      unmatchedIdxs.forEach((entryIdx, k) => {
        const rowIdx = leftoverRowIdxs[k];
        slotNumId[entryIdx] = rowMeta[rowIdx].row.numId;
        claimed.add(rowIdx);
        entryResults[entryIdx].matched = true;
      });
    }

    const matchedOrder = slotNumId.filter(id => id != null);
    const leftovers = rows.filter((r, i) => !claimed.has(i)).map(r => r.numId);
    const finalOrder = [...matchedOrder, ...leftovers];
    const unmatched = entries.length - matchedOrder.length;

    const titleInput = box.querySelector('input.ape_pl_input');
    const descInput = box.querySelector('textarea.ape_pl_input');
    const discoverEl = box.querySelector('.ape_discover_checkbox');
    const title = titleInput?.value || '';
    const description = descInput?.value || '';
    const noDiscover = !!discoverEl?.classList.contains('checked');

    showProgressToast('Сортировка плейлиста…', { id: 'vmu-pl-sort' });

    const done = new Promise(resolve => {
      const h = e => {
        if (e.source !== window || e.data?.type !== 'VKD_REORDER_PLAYLIST_DONE') return;
        window.removeEventListener('message', h);
        resolve(e.data);
      };
      window.addEventListener('message', h);
    });
    window.postMessage({
      type: 'VKD_REORDER_PLAYLIST',
      ownerId: plInfo.ownerId,
      playlistId: plInfo.playlistId,
      accessHash: plInfo.accessHash,
      title, description, noDiscover,
      orderedNumericIds: finalOrder,
    }, '*');
    const result = await done;

    if (result.ok) {
      showProgressToast(`Готово (${sourceLabel}): переставлено ${matchedOrder.length}, не сопоставлено: ${unmatched}`, { id: 'vmu-pl-sort', kind: 'done' });
      await refreshPlaylistEditDialog();
    } else {
      showProgressToast('Ошибка сортировки: ' + (result.error || '?'), { id: 'vmu-pl-sort', kind: 'error' });
    }

    // The toast's bare "не сопоставлено: N" doesn't say WHICH tracks or why
    // — surface the actual parsed order (Genius specifically, per its own
    // toggle) so a mismatch (missing track, ё/е, script, punctuation) is
    // visible without opening devtools.
    if (sourceLabel === 'Genius' && unmatched > 0) {
      showParsedOrderPanel(entryResults, sourceLabel);
    }
  }

  // Draggable floating panel (same drag mechanics as the other panels —
  // makePanelDraggable) listing the source tracklist in the order it was
  // parsed, each row flagged matched/unmatched. Left-anchored (the other
  // floating panels default to the right) so it doesn't stack on top of
  // the cover editor if that's also open.
  function showParsedOrderPanel(entryResults, sourceLabel) {
    document.getElementById('vmu-parsedorder-panel')?.remove();

    const unmatchedCount = entryResults.filter(e => !e.matched).length;
    const panel = document.createElement('div');
    panel.id = 'vmu-parsedorder-panel';
    panel.className = 'vmu-bulkops-panel vmu-parsedorder-panel';
    panel.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Треклист с ${escHtml(sourceLabel)} — не сопоставлено: ${unmatchedCount}</span>
        <button type="button" class="vmu-check-close" id="vmu-parsedorder-close">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body">
        <div class="vmu-parsedorder-list">
          ${entryResults.map((e, i) => `
            <div class="vmu-parsedorder-row ${e.matched ? '' : 'vmu-parsedorder-row-miss'}">
              <span class="vmu-parsedorder-idx">${i + 1}</span>
              <span class="vmu-parsedorder-text">${escHtml(e.artist)} — ${escHtml(e.title)}</span>
              <span class="vmu-parsedorder-status" title="${e.matched ? 'Найден в плейлисте' : 'Не найден в плейлисте'}">${e.matched ? '✓' : '✕'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));
    panel.querySelector('#vmu-parsedorder-close').addEventListener('click', () => panel.remove());
  }

  // reorderPlaylistViaApi goes straight through VK's audio.editPlaylist —
  // the popup's own track-row list (React state, populated once when the
  // dialog opened) never hears about it, so without this the rows stay in
  // the pre-sort order even though the server-side order already changed
  // (verified live: reload the page and the new order is there). DOM-level
  // reordering of the rows themselves isn't an option — see the comment on
  // fetchPlaylistTracksViaApi above for why that list is virtualized and
  // only partially mounted. Closing and reopening the dialog is the
  // reliable way to make VK refetch+re-render it with the real order.
  async function refreshPlaylistEditDialog() {
    const container = getEditPlaylistBox();
    const closeBtn = container?.querySelector('.box_x_button');
    if (!closeBtn) return;
    closeBtn.click();
    await sleep(400);
    // Present when the edit box was opened from the playlist's own view
    // popup (pencil icon) — closing edit mode drops back to that popup,
    // which is still mounted underneath. If the edit box was reached some
    // other way and nothing is left to click, this just leaves it closed;
    // the reorder itself already succeeded and persisted regardless.
    document.querySelector('[data-testid="Action_Edit"]')?.click();
  }

  async function applyPlaylistSortFromFiles(box, files) {
    const entries = [];
    for (const f of files) entries.push(await fileToCheckEntry(f));
    return applyPlaylistOrderFromEntries(box, entries, 'файлы');
  }

  // ─── Genius tracklist order ─────────────────────────────────────────────────
  function parseGeniusQueryFromTitle(titleText) {
    let s = (titleText || '').trim();
    const yearMatch = s.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : null;
    if (yearMatch) s = (s.slice(0, yearMatch.index) + s.slice(yearMatch.index + yearMatch[0].length)).replace(/\s+/g, ' ').trim();
    return { query: s, year };
  }

  function geniusMsg(type, payload) {
    return new Promise(resolve => {
      try { chrome.runtime.sendMessage({ type, ...payload }, res => resolve(res)); }
      catch { resolve({ ok: false, error: 'extension context error' }); }
    });
  }

  async function applyPlaylistSortFromGeniusAlbum(box, album) {
    const res = await geniusMsg('VKD_GENIUS_TRACKS', { albumId: album.id, albumUrl: album.url });
    if (!res?.ok) { showToast('Genius: ' + (res?.error || 'не удалось получить треклист'), true); return; }
    const entries = res.tracks.map(t => ({ artist: stripGeniusTranslation(t.artist), title: stripGeniusTranslation(t.title) }));
    return applyPlaylistOrderFromEntries(box, entries, 'Genius');
  }

  function injectPlaylistSortToggle(box) {
    if (!box || box.dataset.vmuSortInjected) return;
    const anchor = box.querySelector('.ape_search');
    if (!anchor) return;
    box.dataset.vmuSortInjected = '1';

    const wrap = document.createElement('div');
    wrap.className = 'vmu-pl-sort-wrap';
    wrap.innerHTML = `
      <div class="vmu-pl-sort-row">
        <span class="vmu-pl-sort-label">Порядок треков${helpIcon('Как файлы — включи и перетащи (или выбери) MP3-файлы в нужном порядке, расширение сопоставит их с треками плейлиста по имени и переставит в этом порядке; несопоставленные остаются в конце. Genius — ищет альбом на Genius по названию/исполнителю/году из строки названия плейлиста выше (можно поправить перед поиском, или вставить прямую ссылку genius.com/albums/...) и переставляет треки по его треклисту.')}</span>
        <div class="vmu-pl-sort-switch" id="vmu-pl-sort-switch">
          <button type="button" data-vmu-sortsrc="files">Как файлы</button>
          <button type="button" data-vmu-sortsrc="genius">Genius</button>
        </div>
      </div>
      <div id="vmu-pl-sort-dz" class="vmu-pl-sort-dz" style="display:none">
        <span class="vmu-pl-sort-dz-hint">Перетащи MP3 в нужном порядке</span>
        <label class="vmu-pick-btn">
          ${ICON_UPLOAD}
          Выбрать файлы
          <input type="file" class="vmu-pl-sort-input" accept=".mp3,audio/mpeg" multiple>
        </label>
      </div>
      <div id="vmu-pl-genius-panel" class="vmu-pl-genius-panel" style="display:none">
        <div class="vmu-pl-genius-searchrow">
          <input type="text" id="vmu-pl-genius-q" class="vmu-pl-genius-input" placeholder="Исполнитель альбом, или ссылка genius.com/albums/...">
          <button type="button" id="vmu-pl-genius-go" class="vmu-pick-btn">Искать</button>
        </div>
        <div id="vmu-pl-genius-results" class="vmu-pl-genius-results"></div>
      </div>
    `;
    anchor.insertAdjacentElement('afterend', wrap);

    const dz = wrap.querySelector('#vmu-pl-sort-dz');
    const fileInput = wrap.querySelector('.vmu-pl-sort-input');

    const handleFiles = files => {
      const mp3s = [...files].filter(isMP3);
      if (mp3s.length) applyPlaylistSortFromFiles(box, mp3s);
    };

    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('vmu-over'); });
    dz.addEventListener('dragleave', e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('vmu-over'); });
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('vmu-over');
      handleFiles(e.dataTransfer?.files || []);
    });
    fileInput.addEventListener('change', () => {
      handleFiles(fileInput.files);
      fileInput.value = '';
    });

    // Either/or source switch — was two independent toggle rows (both could
    // be left on at once, which made no sense since only one source's panel
    // is ever acted on). One active source at a time; clicking the active
    // one again turns it off.
    const srcSwitch = wrap.querySelector('#vmu-pl-sort-switch');
    let activeSortSrc = null;
    function setActiveSortSrc(src) {
      activeSortSrc = activeSortSrc === src ? null : src;
      srcSwitch.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b.dataset.vmuSortsrc === activeSortSrc);
      });
      dz.style.display = activeSortSrc === 'files' ? '' : 'none';
      gPanelToggle(activeSortSrc === 'genius');
    }
    srcSwitch.addEventListener('click', e => {
      const btn = e.target.closest('button[data-vmu-sortsrc]');
      if (!btn) return;
      setActiveSortSrc(btn.dataset.vmuSortsrc);
    });

    // ── Genius block ──
    const gPanel = wrap.querySelector('#vmu-pl-genius-panel');
    const gInput = wrap.querySelector('#vmu-pl-genius-q');
    const gGo = wrap.querySelector('#vmu-pl-genius-go');
    const gResults = wrap.querySelector('#vmu-pl-genius-results');
    let gPrefilled = false;

    const setGeniusStatus = text => {
      gResults.innerHTML = text ? `<div class="vmu-pl-genius-status">${escHtml(text)}</div>` : '';
    };

    const renderGeniusResults = albums => {
      gResults.innerHTML = albums.map((a, i) => `
        <div class="vmu-pl-genius-result" data-idx="${i}">
          ${a.cover ? `<img src="${escHtml(a.cover)}" alt="">` : ''}
          <div class="vmu-pl-genius-result-info">
            <span class="vmu-pl-genius-result-name">${escHtml(a.name)}</span>
            <span class="vmu-pl-genius-result-meta">${escHtml(a.artist)}${a.release ? ' · ' + escHtml(a.release) : ''}</span>
          </div>
        </div>
      `).join('');
      gResults.querySelectorAll('.vmu-pl-genius-result').forEach(el => {
        el.addEventListener('click', () => {
          const album = albums[Number(el.dataset.idx)];
          setGeniusStatus('Подтягиваем треклист…');
          applyPlaylistSortFromGeniusAlbum(box, album);
        });
      });
    };

    const runGeniusSearch = async () => {
      const raw = gInput.value.trim();
      if (!raw) return;
      if (/^https?:\/\/(www\.)?genius\.com\/albums\//i.test(raw)) {
        setGeniusStatus('Подтягиваем треклист…');
        await applyPlaylistSortFromGeniusAlbum(box, { url: raw });
        return;
      }
      setGeniusStatus('Ищем на Genius…');
      const res = await geniusMsg('VKD_GENIUS_SEARCH', { query: raw });
      if (!res?.ok) { setGeniusStatus(res?.error || 'ничего не найдено'); return; }
      renderGeniusResults(res.albums);
    };

    gGo.addEventListener('click', runGeniusSearch);
    gInput.addEventListener('keydown', e => { if (e.key === 'Enter') runGeniusSearch(); });
    function gPanelToggle(show) {
      gPanel.style.display = show ? '' : 'none';
      if (show && !gPrefilled) {
        gPrefilled = true;
        const titleInput = box.querySelector('input.ape_pl_input');
        gInput.value = parseGeniusQueryFromTitle(titleInput?.value).query;
      }
    }
  }

  // ─── cover text-overlay editor: panel ───────────────────────────────────────────
  // Small reusable "label + slider + live readout + reset" row — identical
  // markup/classes to buildAudioFxPanel's limiterRow, so no new CSS is needed.
  function vmuCoveredSliderRow(id, label, min, max, step, value, unit) {
    return `
      <div class="vmu-setting-row vmu-slider-row">
        <div class="vmu-setting-info">
          <span class="vmu-setting-label">${label}</span>
        </div>
        <div class="vmu-slider-wrap">
          <input type="range" id="${id}" class="vmu-slider" min="${min}" max="${max}" step="${step}" value="${value}">
          <span class="vmu-slider-value" id="${id}-val">${value}${unit}</span>
          <button type="button" id="${id}-reset" class="vmu-slider-reset" title="Сбросить">↺</button>
        </div>
      </div>`;
  }

  // Adds the "Обложка с текстом" trigger row into the edit-playlist dialog,
  // right below the sort-toggle row injectPlaylistSortToggle already put
  // there — same insertion pattern (own .vmu-pl-sort-wrap sibling, VK's own
  // nodes untouched).
  function injectCoverEditorRow(box) {
    if (!box || box.dataset.vmuCoverInjected) return;
    const anchor = box.querySelector('.vmu-pl-sort-wrap');
    if (!anchor) return;
    box.dataset.vmuCoverInjected = '1';

    const wrap = document.createElement('div');
    wrap.className = 'vmu-pl-sort-wrap';
    wrap.innerHTML = `
      <div class="vmu-pl-sort-row">
        <span class="vmu-pl-sort-label">Обложка с текстом${helpIcon('Подтянуть обложку альбома с Genius или выбрать файл, наложить текст (шрифт, цвет, обводка, позиция, поворот — как в отдельном редакторе обложек) и сразу поставить результат обложкой этого плейлиста.')}</span>
        <button type="button" id="vmu-covered-open" class="vmu-pick-btn">Открыть</button>
      </div>
    `;
    anchor.insertAdjacentElement('afterend', wrap);
    wrap.querySelector('#vmu-covered-open').addEventListener('click', () => openCoverEditorPanel(box));
  }

  // Draggable floating panel: pick a source image (Genius album cover or a
  // local file), live-preview a text overlay on it (JS port of
  // text_overlay_app's render pipeline, see vmuBuildTextLayerPipeline
  // above), then hand the composited 1000×1000 result to
  // uploadCoverViaDialog — the same primitive the auto-playlist flow uses,
  // which clicks .ape_cover, intercepts the file input VK opens, and
  // confirms any crop step on its own. That's what makes "Применить" end
  // with the playlist's cover already selected, no manual file dialog.
  function openCoverEditorPanel(box) {
    document.getElementById('vmu-covered-panel')?.remove();

    const panel = document.createElement('div');
    panel.id = 'vmu-covered-panel';
    panel.className = 'vmu-bulkops-panel vmu-covered-panel';
    panel.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Обложка с текстом</span>
        <button type="button" class="vmu-check-close" id="vmu-covered-close">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body">
      <div class="vmu-bulk-ops vmu-covered-body">
        <div class="vmu-rename-block">
          <span class="vmu-rename-block-label">Источник</span>
          <div class="vmu-mode-switch" id="vmu-covered-src-switch">
            <button type="button" data-src="genius" class="active">Genius</button>
            <button type="button" data-src="file">Файл</button>
          </div>
        </div>
        <div id="vmu-covered-genius-block">
          <div class="vmu-pl-genius-searchrow">
            <input type="text" id="vmu-covered-genius-q" class="vmu-pl-genius-input" placeholder="Исполнитель альбом">
            <button type="button" id="vmu-covered-genius-go" class="vmu-pick-btn">Искать</button>
          </div>
          <div id="vmu-covered-genius-results" class="vmu-pl-genius-results"></div>
        </div>
        <div id="vmu-covered-file-block" style="display:none">
          <div id="vmu-covered-dz" class="vmu-pl-sort-dz">
            <span class="vmu-pl-sort-dz-hint">Перетащи картинку сюда</span>
            <label class="vmu-pick-btn">
              ${ICON_UPLOAD}
              Выбрать файл
              <input type="file" id="vmu-covered-file-input" accept="image/*" style="display:none">
            </label>
          </div>
        </div>

        <div id="vmu-covered-editor" style="display:none">
          <div class="vmu-covered-canvas-wrap">
            <canvas id="vmu-covered-canvas" width="300" height="300"></canvas>
            <span class="vmu-covered-canvas-hint">Клик по обложке — своя позиция текста</span>
          </div>

          <textarea id="vmu-covered-text" class="vmu-covered-text" rows="2" placeholder="Текст на обложке">перезалито</textarea>

          <div class="vmu-setting-row">
            <span class="vmu-setting-label">Шрифт</span>
            <select id="vmu-covered-font" class="vmu-covered-select">
              ${VMU_COVER_FONTS.map(f => `<option value="${escHtml(f)}">${escHtml(f)}</option>`).join('')}
            </select>
          </div>

          ${vmuCoveredSliderRow('vmu-covered-fontsize', 'Размер шрифта', 10, 300, 1, 176, '')}
          ${vmuCoveredSliderRow('vmu-covered-outlinewidth', 'Толщина обводки', 0, 10, 1, 3, '')}

          <div class="vmu-setting-row">
            <span class="vmu-setting-label">Цвет текста</span>
            <div class="vmu-covered-color-cell">
              <input type="color" id="vmu-covered-textcolor" value="#ff0000">
              <button type="button" id="vmu-covered-random" class="vmu-slider-reset" title="Случайный цвет">🎲</button>
            </div>
          </div>
          <div class="vmu-setting-row">
            <span class="vmu-setting-label">Цвет обводки</span>
            <input type="color" id="vmu-covered-outlinecolor" value="#ffffff">
          </div>

          <div class="vmu-setting-row">
            <span class="vmu-setting-label">Позиция</span>
            <select id="vmu-covered-position" class="vmu-covered-select">
              ${VMU_POSITION_LABELS.map(([label, key]) => `<option value="${key}">${escHtml(label)}</option>`).join('')}
            </select>
          </div>
          <div class="vmu-setting-row" id="vmu-covered-custom-row" style="display:none">
            <span class="vmu-setting-label">Коорд. X / Y</span>
            <div class="vmu-covered-xy">
              <input type="number" id="vmu-covered-x" value="500">
              <input type="number" id="vmu-covered-y" value="500">
            </div>
          </div>

          ${vmuCoveredSliderRow('vmu-covered-rotation', 'Поворот, °', -180, 180, 1, 37, '')}
          ${vmuCoveredSliderRow('vmu-covered-scale', 'Масштаб, %', 10, 500, 1, 115, '')}
          ${vmuCoveredSliderRow('vmu-covered-opacity', 'Прозрачность', 0, 255, 1, 255, '')}

          <div class="vmu-covered-actions">
            <span class="vmu-covered-status" id="vmu-covered-status"></span>
            <button type="button" id="vmu-covered-download" class="vmu-rename-cleanup-btn" title="Скачать PNG">Скачать</button>
            <button type="button" id="vmu-covered-apply" class="vmu-pick-btn" disabled>Применить как обложку</button>
          </div>
        </div>
      </div>
      </div>
    `;
    document.body.appendChild(panel);
    makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));
    panel.querySelector('#vmu-covered-close').addEventListener('click', () => panel.remove());

    const BASE = 1000;
    const state = { baseCanvas: null, resultCanvas: null, customX: 500, customY: 500, renderTimer: null };

    const canvas = panel.querySelector('#vmu-covered-canvas');
    const cctx = canvas.getContext('2d');
    const DISPLAY = canvas.width;

    const els = {
      editor: panel.querySelector('#vmu-covered-editor'),
      text: panel.querySelector('#vmu-covered-text'),
      font: panel.querySelector('#vmu-covered-font'),
      fontSize: panel.querySelector('#vmu-covered-fontsize'),
      outlineWidth: panel.querySelector('#vmu-covered-outlinewidth'),
      textColor: panel.querySelector('#vmu-covered-textcolor'),
      outlineColor: panel.querySelector('#vmu-covered-outlinecolor'),
      random: panel.querySelector('#vmu-covered-random'),
      position: panel.querySelector('#vmu-covered-position'),
      customRow: panel.querySelector('#vmu-covered-custom-row'),
      x: panel.querySelector('#vmu-covered-x'),
      y: panel.querySelector('#vmu-covered-y'),
      rotation: panel.querySelector('#vmu-covered-rotation'),
      scale: panel.querySelector('#vmu-covered-scale'),
      opacity: panel.querySelector('#vmu-covered-opacity'),
      apply: panel.querySelector('#vmu-covered-apply'),
      download: panel.querySelector('#vmu-covered-download'),
      status: panel.querySelector('#vmu-covered-status'),
    };

    for (const [id, def, unit] of [
      ['vmu-covered-fontsize', 176, ''], ['vmu-covered-outlinewidth', 3, ''],
      ['vmu-covered-rotation', 37, '°'], ['vmu-covered-scale', 115, '%'], ['vmu-covered-opacity', 255, ''],
    ]) {
      const input = panel.querySelector('#' + id);
      const val = panel.querySelector('#' + id + '-val');
      panel.querySelector('#' + id + '-reset').addEventListener('click', () => {
        input.value = def; val.textContent = def + unit; scheduleRender();
      });
      input.addEventListener('input', () => { val.textContent = input.value + unit; scheduleRender(); });
    }

    function scheduleRender(immediate) {
      if (state.renderTimer) clearTimeout(state.renderTimer);
      state.renderTimer = setTimeout(render, immediate ? 0 : 30);
    }

    function setStatus(text, isError) {
      els.status.textContent = text || '';
      els.status.style.color = isError ? '#e64646' : '';
    }

    function render() {
      if (!state.baseCanvas) return;

      const text = els.text.value;
      const fontFamily = els.font.value;
      const fontSize = Number(els.fontSize.value);
      const outlineWidth = Number(els.outlineWidth.value);
      const rotation = Number(els.rotation.value);
      const scalePercent = Number(els.scale.value);
      const opacity = Number(els.opacity.value);
      const position = els.position.value;

      const textColor = vmuHexToRgb(els.textColor.value);
      const outlineColor = vmuHexToRgb(els.outlineColor.value);

      let resultCanvas = state.baseCanvas;
      if (text.trim() && fontFamily) {
        const layer = vmuBuildTextLayerPipeline(
          { text, fontFamily, fontSize, textColor, outlineColor, outlineWidth, opacity },
          scalePercent, rotation
        );
        const [px, py] = vmuComputePosition([BASE, BASE], [layer.width, layer.height], position, [state.customX, state.customY]);
        const out = document.createElement('canvas');
        out.width = BASE; out.height = BASE;
        const octx = out.getContext('2d');
        octx.drawImage(state.baseCanvas, 0, 0);
        octx.drawImage(layer, px, py);
        resultCanvas = out;
      }

      state.resultCanvas = resultCanvas;
      cctx.clearRect(0, 0, DISPLAY, DISPLAY);
      cctx.drawImage(resultCanvas, 0, 0, DISPLAY, DISPLAY);
    }

    function loadImageIntoBase(dataUrl) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = BASE; c.height = BASE;
          c.getContext('2d').drawImage(img, 0, 0, BASE, BASE);
          state.baseCanvas = c;
          resolve();
        };
        img.onerror = () => reject(new Error('не удалось загрузить изображение'));
        img.src = dataUrl;
      });
    }

    async function setSource(dataUrl) {
      try {
        setStatus('Загружаем…');
        await loadImageIntoBase(dataUrl);
        els.editor.style.display = '';
        els.apply.disabled = false;
        setStatus('');
        scheduleRender(true);
      } catch (err) {
        setStatus(err.message || 'ошибка загрузки', true);
      }
    }

    els.text.addEventListener('input', () => scheduleRender());
    els.font.addEventListener('change', () => scheduleRender());
    els.random.addEventListener('click', () => {
      const textColor = vmuRandomTextColor();
      els.textColor.value = vmuRgbToHex(textColor);
      els.outlineColor.value = vmuRgbToHex(vmuOppositeNeutral(textColor));
      scheduleRender();
    });
    els.textColor.addEventListener('input', () => scheduleRender());
    els.outlineColor.addEventListener('input', () => scheduleRender());
    els.position.addEventListener('change', () => {
      els.customRow.style.display = els.position.value === 'custom' ? '' : 'none';
      scheduleRender();
    });
    els.x.addEventListener('input', () => { state.customX = Number(els.x.value) || 0; scheduleRender(); });
    els.y.addEventListener('input', () => { state.customY = Number(els.y.value) || 0; scheduleRender(); });

    canvas.addEventListener('click', e => {
      if (!state.baseCanvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(BASE, (e.clientX - rect.left) * (BASE / rect.width)));
      const y = Math.max(0, Math.min(BASE, (e.clientY - rect.top) * (BASE / rect.height)));
      state.customX = Math.round(x); state.customY = Math.round(y);
      els.x.value = state.customX; els.y.value = state.customY;
      if (els.position.value !== 'custom') { els.position.value = 'custom'; els.customRow.style.display = ''; }
      scheduleRender();
    });

    // ── source: Genius album cover ──
    const srcSwitch = panel.querySelector('#vmu-covered-src-switch');
    const geniusBlock = panel.querySelector('#vmu-covered-genius-block');
    const fileBlock = panel.querySelector('#vmu-covered-file-block');
    srcSwitch.addEventListener('click', e => {
      const btn = e.target.closest('button[data-src]');
      if (!btn) return;
      srcSwitch.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      const isFile = btn.dataset.src === 'file';
      geniusBlock.style.display = isFile ? 'none' : '';
      fileBlock.style.display = isFile ? '' : 'none';
    });

    const gInput = panel.querySelector('#vmu-covered-genius-q');
    const gGo = panel.querySelector('#vmu-covered-genius-go');
    const gResults = panel.querySelector('#vmu-covered-genius-results');
    const titleInput = box?.querySelector('input.ape_pl_input');
    if (titleInput?.value) gInput.value = parseGeniusQueryFromTitle(titleInput.value).query;

    async function runGeniusSearch() {
      const raw = gInput.value.trim();
      if (!raw) return;
      gResults.innerHTML = `<div class="vmu-pl-genius-status">Ищем на Genius…</div>`;
      const res = await geniusMsg('VKD_GENIUS_SEARCH', { query: raw });
      if (!res?.ok) { gResults.innerHTML = `<div class="vmu-pl-genius-status">${escHtml(res?.error || 'ничего не найдено')}</div>`; return; }
      gResults.innerHTML = res.albums.map((a, i) => `
        <div class="vmu-pl-genius-result" data-idx="${i}">
          ${a.cover ? `<img src="${escHtml(a.cover)}" alt="">` : ''}
          <div class="vmu-pl-genius-result-info">
            <span class="vmu-pl-genius-result-name">${escHtml(a.name)}</span>
            <span class="vmu-pl-genius-result-meta">${escHtml(a.artist)}${a.release ? ' · ' + escHtml(a.release) : ''}</span>
          </div>
        </div>
      `).join('');
      gResults.querySelectorAll('.vmu-pl-genius-result').forEach(el => {
        el.addEventListener('click', async () => {
          const album = res.albums[Number(el.dataset.idx)];
          setStatus('Загружаем обложку…');
          const img = await geniusMsg('VKD_FETCH_IMAGE', { url: album.coverFull || album.cover });
          if (!img?.ok) { setStatus(img?.error || 'не удалось загрузить обложку', true); return; }
          await setSource(img.dataUrl);
        });
      });
    }
    gGo.addEventListener('click', runGeniusSearch);
    gInput.addEventListener('keydown', e => { if (e.key === 'Enter') runGeniusSearch(); });

    // ── source: local file ──
    const dz = panel.querySelector('#vmu-covered-dz');
    const fileInput = panel.querySelector('#vmu-covered-file-input');
    const handleImageFile = file => {
      if (!file || !file.type.startsWith('image/')) return;
      const r = new FileReader();
      r.onload = () => setSource(r.result);
      r.readAsDataURL(file);
    };
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('vmu-over'); });
    dz.addEventListener('dragleave', e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('vmu-over'); });
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('vmu-over'); handleImageFile(e.dataTransfer?.files?.[0]); });
    fileInput.addEventListener('change', () => { handleImageFile(fileInput.files?.[0]); fileInput.value = ''; });

    // ── apply / download ──
    els.apply.addEventListener('click', async () => {
      const source = state.resultCanvas || state.baseCanvas;
      if (!source) return;
      const blob = await new Promise(res => source.toBlob(res, 'image/jpeg', 0.95));
      if (!blob) { setStatus('не удалось собрать изображение', true); return; }
      els.apply.disabled = true;
      els.apply.textContent = 'Применяем…';
      setStatus('Ставим обложку плейлиста…');
      try {
        await uploadCoverViaDialog(blob);
        setStatus('Обложка применена');
        showToast('Обложка плейлиста обновлена');
      } catch (err) {
        setStatus(err.message || 'ошибка', true);
      } finally {
        els.apply.disabled = false;
        els.apply.textContent = 'Применить как обложку';
      }
    });

    els.download.addEventListener('click', () => {
      const source = state.resultCanvas || state.baseCanvas;
      if (!source) return;
      source.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'cover.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    });
  }

  // Expand the playlist popup: click "Показать все" to load the first batch,
  // then scroll the page-level scroll container (VK lazy-loads more tracks as
  // its IntersectionObserver hits the bottom of the popup). Harvests every row
  // via fiber stamps + DOM fallback. Loops until no new tracks appear for a
  // few iterations. Works for any playlist size (verified on 71-track sample).
  // Try to read the playlist's declared track count out of the popup header.
  // VK renders something like "1000 треков" / "1 трек" / "23 записи" near the
  // title; pull the first such number we find. Returns null if not visible.
  function getPlaylistTotalFromModal(modal) {
    if (!modal) return null;
    // Primary: VK's own stat node holds just the bare number (data-testid
    // musicplayliststatistics-count), separate from the "Треки" label node.
    // Reading textContent off the whole modal glues label+count+listen-count
    // together with no separator ("Треки" + "6" + "21 прослушиваний" ->
    // "Треки621 прослушиваний"), so regexing that blob below misreads "621"
    // as the total instead of "6". Read the dedicated node first.
    const countEl = modal.querySelector('[data-testid="musicplayliststatistics-count"], [data-testid$="statistics-count"]');
    if (countEl) {
      const n = parseInt((countEl.textContent || '').replace(/[\s ]/g, ''), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const text = (modal.textContent || '').slice(0, 4000);
    const m = text.match(/(\d[\d\s ]{0,6})\s*(?:трек(?:а|ов)?|записе?[йяи]|композици[йия])/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/[\s ]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // Row selector shared by every modal-scan helper below.
  const VMU_MODAL_ROW_SEL = '[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"], .audio_row, [data-full-id]';

  // Finds the currently-open playlist popup, if any.
  function findOpenPlaylistModal() {
    return [...document.querySelectorAll('[class*="vkitInternalModalBox"]')]
      .find(m => m.getBoundingClientRect().width > 0) || null;
  }

  // Switches the popup from its collapsed preview (first handful of tracks)
  // into the full scrollable list — needed once regardless of whether the
  // track data itself then comes from a DOM harvest or straight from the
  // API, since click-to-jump still needs the popup in list mode to find or
  // load any given row.
  async function revealModalList(modal) {
    const showAll = modal.querySelector('[class*="showAll"], [class*="ShowAll"]')
      || [...modal.querySelectorAll('a, button, [role="button"], div, span')].find(el => {
        const t = (el.textContent || '').trim().toLowerCase();
        return t === 'показать все' || t === 'показать всё' || t === 'show all';
      });
    if (showAll) {
      showAll.click();
      await sleep(900);
    }
  }

  // Find a scroller INSIDE the modal. Earlier versions fell back to
  // document.scrollingElement (the audios- page underneath), but the new VK
  // popup doesn't lazy-load on page scroll — it just scrolled the row list
  // visibly under the modal, which the user (correctly) complained about.
  // If the modal exposes no internal scroller, we drive lazy-loading by
  // scrolling the LAST audio row into view: that pokes any IntersectionObserver
  // sentinel without touching the underlying page scroll position.
  function findModalScroller(modal) {
    return [...modal.querySelectorAll('*')].find(el => {
      const cs = getComputedStyle(el);
      return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10;
    }) || null;
  }

  // Asks injected.js to invoke VK's own tail-fetch callback via React fiber
  // props (VK's IntersectionObserver sentinel doesn't fire in the hybrid
  // old-box-layer hosting of the new playlist modal). Resolves true when the
  // callback exists — in that mode no scrolling is needed at all.
  function requestPlaylistTailLoad() {
    return new Promise(resolve => {
      let done = false;
      const finish = ok => {
        if (done) return;
        done = true;
        clearTimeout(t);
        window.removeEventListener('message', h);
        resolve(ok);
      };
      const t = setTimeout(() => finish(false), 400);
      const h = e => {
        if (e.source !== window || e.data?.type !== 'VKD_PLAYLIST_TAIL_LOAD_DONE') return;
        finish(!!e.data.ok);
      };
      window.addEventListener('message', h);
      window.postMessage({ type: 'VKD_PLAYLIST_TAIL_LOAD' }, '*');
    });
  }

  // Looks up an already-mounted popup row for trackId without scrolling.
  function findModalRowByTrackId(modal, trackId) {
    try {
      const r = modal.querySelector(`[data-full-id="${CSS.escape(String(trackId))}"]`);
      if (r) return r;
    } catch {}
    return [...modal.querySelectorAll('[data-vmu-track]')].find(r => {
      try { return JSON.parse(r.dataset.vmuTrack).id === trackId; } catch { return false; }
    }) || null;
  }

  // On-demand click-to-jump inside a playlist popup: scanForDuplicates now
  // reads the playlist via the audio.get API first (loadPlaylistTracksViaAPI)
  // instead of expanding the whole popup up front, so most rows a marker/list
  // click targets aren't mounted into the popup's DOM yet. Runs the same
  // tail-load/scroll dance expandPlaylistModal uses, but stops the moment the
  // target row appears instead of walking the whole playlist.
  async function scrollModalToTrackId(modal, trackId, onProgress) {
    let row = findModalRowByTrackId(modal, trackId);
    if (row) return row;

    const modalScroller = findModalScroller(modal);
    const MAX_ITER = 200;
    const STABLE_LIMIT = 15, STABLE_LIMIT_FAST = 5;
    let stable = 0, lastCount = modal.querySelectorAll(VMU_MODAL_ROW_SEL).length, loaderMode = false;

    for (let i = 0; i < MAX_ITER && stable < (loaderMode ? STABLE_LIMIT_FAST : STABLE_LIMIT); i++) {
      if (onProgress) onProgress(i);
      loaderMode = await requestPlaylistTailLoad();
      if (loaderMode) {
        const startRows = modal.querySelectorAll(VMU_MODAL_ROW_SEL).length;
        for (let w = 0; w < 12 && modal.querySelectorAll(VMU_MODAL_ROW_SEL).length === startRows; w++) {
          await sleep(125);
        }
      } else {
        if (modalScroller) {
          if (i % 3 === 2) {
            modalScroller.scrollTop = Math.max(0, modalScroller.scrollHeight - modalScroller.clientHeight - 800);
            await sleep(120);
          }
          modalScroller.scrollTop = modalScroller.scrollHeight;
        }
        await sleep(450);
        const rowsNow = modal.querySelectorAll(VMU_MODAL_ROW_SEL);
        const lastRow = rowsNow[rowsNow.length - 1];
        if (lastRow) {
          lastRow.scrollIntoView({ block: i % 4 === 3 ? 'end' : 'nearest' });
          await sleep(250);
        }
      }
      await waitForMarkRows();
      row = findModalRowByTrackId(modal, trackId);
      if (row) return row;
      const c = modal.querySelectorAll(VMU_MODAL_ROW_SEL).length;
      if (c === lastCount) stable++; else { stable = 0; lastCount = c; }
    }
    return null;
  }

  async function expandPlaylistModal(onProgress, isCancelled) {
    const modal = findOpenPlaylistModal();
    if (!modal) return [];

    const declaredTotal = getPlaylistTotalFromModal(modal);
    await revealModalList(modal);

    const collected = new Map();

    async function harvest() {
      await waitForMarkRows();
      const rows = modal.querySelectorAll('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"], .audio_row, [data-full-id]');
      for (const r of rows) {
        // Fast path — skip the full JSON.parse if we've already collected
        // this track (looked up via the tiny data-vmu-id attribute). Without
        // this, every iteration re-parses every row's data-vmu-track and
        // the cost grows linearly with collected size → quadratic overall.
        const fastId = r.dataset?.vmuId;
        if (fastId && collected.has(fastId)) continue;

        let id = null, title = '', artist = '', fullId = null, isBlocked = false;
        if (r.dataset && r.dataset.vmuTrack) {
          try {
            const t = JSON.parse(r.dataset.vmuTrack);
            id = t.id; fullId = t.id; title = t.title || ''; artist = t.artist || '';
            isBlocked = !!t.isBlocked;
          } catch {}
        }
        if (!id && r.dataset && r.dataset.fullId) {
          id = r.dataset.fullId; fullId = id;
          title = (r.querySelector('.audio_title, .ai_title, [class*="title"]')?.textContent || '').trim();
          artist = (r.querySelector('.audio_artist, .ai_artist, [class*="performers"]')?.textContent || '').trim();
        }
        if (id && !collected.has(id)) collected.set(id, { id, fullId, title, artist, isBlocked });
      }
    }

    const modalScroller = findModalScroller(modal);

    await harvest();
    const reportProgress = () => {
      if (!onProgress) return;
      try { onProgress(collected.size, declaredTotal); } catch {}
    };
    reportProgress();

    // Harvest loop. Fast path drives VK's fetch callback directly and only
    // waits for rows to actually land (poll, not fixed sleeps), so each
    // ~20-track batch costs its network time — no scroll choreography.
    // Scroll-dance fallback for markups without the fiber callback: VK's
    // lazy-loader there needs *motion* between batches, not just being at
    // the bottom (jump up every 3rd iter, poke last row every 4th).
    let stable = 0, lastSize = collected.size;
    const MAX_ITER = 200;
    const STABLE_LIMIT = 15;      // scroll fallback needs many "motion" retries
    const STABLE_LIMIT_FAST = 5;  // direct loader either fetches or is exhausted
    let loaderMode = false;
    for (let i = 0; i < MAX_ITER && stable < (loaderMode ? STABLE_LIMIT_FAST : STABLE_LIMIT); i++) {
      if (isCancelled?.()) break;
      loaderMode = await requestPlaylistTailLoad();
      if (loaderMode) {
        const startRows = modal.querySelectorAll(VMU_MODAL_ROW_SEL).length;
        for (let w = 0; w < 12 && modal.querySelectorAll(VMU_MODAL_ROW_SEL).length === startRows; w++) {
          await sleep(125);
        }
      } else {
        if (modalScroller) {
          if (i % 3 === 2) {
            modalScroller.scrollTop = Math.max(0, modalScroller.scrollHeight - modalScroller.clientHeight - 800);
            await sleep(120);
          }
          modalScroller.scrollTop = modalScroller.scrollHeight;
        }
        await sleep(450);
        // `end` actually scrolls the nearest scrollable ancestor when the row
        // is off-screen (which is when lazy-load needs to fire). `nearest`
        // bails out if the row is technically visible and skips the trigger.
        const rowsNow = modal.querySelectorAll(VMU_MODAL_ROW_SEL);
        const lastRow = rowsNow[rowsNow.length - 1];
        if (lastRow) {
          lastRow.scrollIntoView({ block: i % 4 === 3 ? 'end' : 'nearest' });
          await sleep(250);
        }
      }
      await harvest();
      reportProgress();
      // Everything the header declared is collected — skip the stable-tail wait
      if (declaredTotal && collected.size >= declaredTotal) break;
      if (collected.size === lastSize) stable++; else { stable = 0; lastSize = collected.size; }
    }

    // Reset the modal-internal scroller so the user sees the playlist top
    // when scanning finishes. Don't touch document.scrollingElement.
    if (modalScroller) modalScroller.scrollTop = 0;

    return [...collected.values()];
  }

  // Load a playlist's full track list via VKD_LOAD_SECTIONS (al_audio.php).
  // Tracks arrive as VKD_TRACK messages; we consume them into a fresh array
  // (NOT the global dlTracks Map, to avoid contaminating playlist download).
  async function loadPlaylistTracksViaAPI(pl, onProgress) {
    if (!pl?.ownerId || !pl?.playlistId) return [];

    // Capture VKD_TRACK messages until VKD_SECTIONS_DONE
    const captured = new Map();
    const onMsg = e => {
      if (e.source !== window || !e.data) return;
      if (e.data.type === 'VKD_TRACK') {
        const t = e.data.track;
        if (t?.id && !captured.has(t.id)) {
          captured.set(t.id, {
            id: t.id,
            fullId: t.id,
            title: t.title || '',
            artist: t.artist || '',
            duration: t.duration || 0,
            url: t.url || null,
            // Set by tryEmitTrackObj (audio.get path) from the url field;
            // the legacy al_audio.php fallback doesn't carry this, so it's a
            // best-effort guess, refined below by enrichBlockedFromDom.
            isBlocked: !!t.isBlocked,
          });
          if (onProgress) onProgress(captured.size);
        }
      }
    };
    window.addEventListener('message', onMsg);

    // Reset injected.js' dedup set so we get a clean stream
    window.postMessage({ type: 'VKD_RESET_DL' }, '*');

    const done = new Promise(resolve => {
      const t = setTimeout(resolve, 30000);
      const h = e => {
        if (e.source === window && e.data?.type === 'VKD_SECTIONS_DONE') {
          clearTimeout(t); window.removeEventListener('message', h); resolve();
        }
      };
      window.addEventListener('message', h);
      window.postMessage({
        type: 'VKD_LOAD_SECTIONS',
        ownerId: pl.ownerId,
        playlistId: pl.playlistId,
        accessHash: pl.accessHash || null,
      }, '*');
    });
    await done;
    window.removeEventListener('message', onMsg);
    return [...captured.values()];
  }

  // For each currently-mounted popup row, look up its track in the array and
  // copy isBlocked. Tracks not visible stay isBlocked=false (we can't know).
  function enrichBlockedFromDom(tracks) {
    const byId = new Map(tracks.map(t => [t.id || t.fullId, t]));
    const rows = document.querySelectorAll('[data-vmu-track]');
    for (const r of rows) {
      try {
        const d = JSON.parse(r.dataset.vmuTrack);
        if (d?.isBlocked && byId.has(d.id)) byId.get(d.id).isBlocked = true;
      } catch {}
    }
  }

  // Shared by the playlist dupe/blocked scanner (scanForDuplicates) and the
  // page-wide "Массовые операции" cleanup section — same grouping-by-key
  // logic, same "first occurrence is the original, the rest are dupes" rule.
  // tracks: [{artist, title, isBlocked, ...}]. Duplicate key ignores case and
  // whitespace, same as normalizeKey elsewhere, but intentionally simpler
  // (no bracket/feat. stripping) — this flags exact-metadata duplicates, not
  // fuzzy title matches.
  // Same artist+title isn't proof of the same recording — skits, freestyles
  // and alternate versions legitimately reuse a title with a different
  // length. Within each artist+title bucket, tracks only count as duplicates
  // of each other if their duration also matches (a few seconds of slack for
  // encoding/rounding differences between re-uploads of the same file).
  const DUPE_DURATION_TOLERANCE_SEC = 2;

  function findDuplicatesAndBlocked(tracks) {
    const buckets = new Map();
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const key = `${track.artist}|||${track.title}`.toLowerCase().trim();
      if (!key.includes('|||') || (!track.artist && !track.title)) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ index: i, track });
    }

    const dupes = [];
    const dupeIndexSet = new Set();
    const dupeGroups = [];
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      const durGroups = [];
      for (const entry of bucket) {
        const dur = entry.track.duration || 0;
        let g = durGroups.find(g => Math.abs(g.duration - dur) <= DUPE_DURATION_TOLERANCE_SEC);
        if (!g) { g = { duration: dur, entries: [] }; durGroups.push(g); }
        g.entries.push(entry);
      }
      for (const g of durGroups) {
        if (g.entries.length < 2) continue;
        const [orig, ...rest] = g.entries;
        const label = `${orig.track.artist || ''}${orig.track.artist ? ' — ' : ''}${orig.track.title || ''}`.trim()
          || `Трек ${orig.index + 1}`;
        for (const entry of rest) {
          dupes.push({ track: entry.track, original: orig.track });
          dupeIndexSet.add(entry.index);
        }
        dupeIndexSet.add(orig.index);
        dupeGroups.push({ label, indices: g.entries.map(e => e.index) });
      }
    }
    dupeGroups.sort((a, b) => a.indices[0] - b.indices[0]);

    const blockedIndices = [];
    for (let i = 0; i < tracks.length; i++) if (tracks[i].isBlocked) blockedIndices.push(i);

    return { dupes, dupeGroups, dupeIndexSet, blockedIndices };
  }

  async function scanForDuplicates(plInfoArg, statusCallback, cancelToken) {
    const pl = plInfoArg || getPlaylistInfoFromUrl();
    const report = statusCallback || ((msg, isError) => showToast(msg, isError));
    const isCancelled = () => !!cancelToken?.cancelled;

    if (!pl) {
      report('Перейдите на страницу плейлиста для поиска дубликатов', true);
      return;
    }

    clearDupeMarkers();
    report('Раскрываем плейлист…');

    try {
      // Primary path: expand the playlist popup (click "Показать все") and
      // drive VK's lazy-loader until it stops yielding new rows. This mounts
      // every row into VK's own DOM/React state, which the in-popup
      // highlight and the click-to-jump markers below both need — they can
      // only scroll to a row that actually exists.
      let tracks = await expandPlaylistModal((loaded, total) => {
        if (total) report(`Раскрываем плейлист… ${loaded} / ${total}`, false, { loaded, total });
        else report(`Раскрываем плейлист… ${loaded}`);
      }, isCancelled);

      const wasCancelled = isCancelled() && tracks.length > 0;

      // Fallback A: audio.get via VK's API client — no DOM mounting, so any
      // resulting dupe/blocked markers won't be able to jump to their row.
      // Skipped when the user stopped the scan early: partial DOM-mounted
      // results are what they asked to see, not a fuller API-fetched set.
      if (!tracks.length && !isCancelled() && pl.ownerId && pl.playlistId) {
        report('Загружаем список треков…');
        tracks = await loadPlaylistTracksViaAPI(pl, n => {
          report(`Загружаем список треков… ${n}`);
        });
      }

      // Fallback B: rows already mounted in popup DOM
      if (!tracks.length) {
        const fromDom = getTracksFromDOM(pl);
        if (fromDom.length) tracks = fromDom;
      }

      if (!tracks.length) {
        report(isCancelled() ? 'Остановлено' : 'Треки не найдены', true);
        return;
      }

      // Mark blocked tracks from any currently-visible popup rows (best-effort
      // on top of the API's own url-based isBlocked guess — see tryEmitTrackObj).
      enrichBlockedFromDom(tracks);

      const { dupes, dupeGroups, dupeIndexSet, blockedIndices } = findDuplicatesAndBlocked(tracks);

      const scannedNote = wasCancelled ? ` (остановлено, проверено ${tracks.length})` : '';

      if (!dupes.length && !blockedIndices.length) {
        report(`В ${tracks.length} треках всё чисто${scannedNote}`);
        return;
      }

      const msgParts = [];
      if (dupes.length) msgParts.push(`Дубликатов: ${dupes.length}`);
      if (blockedIndices.length) msgParts.push(`Недоступных: ${blockedIndices.length}`);
      report(`${msgParts.join(' · ')} из ${tracks.length}${scannedNote}`);

      const dupeIndices = [...dupeIndexSet].sort((a, b) => a - b);
      if (dupes.length) highlightDuplicateTracks(dupes);
      if (blockedIndices.length) highlightBlockedTracks(tracks, blockedIndices);
      buildIssuePanel(tracks, dupeIndices, blockedIndices, dupeGroups);
    } catch (err) {
      report(`Ошибка: ${err.message}`, true);
    }
  }

  // Highlight every row whose track participates in a duplicate set (both the
  // original first occurrence and the dupes), so users can spot the pairs
  // directly in the playlist popup. Replaces the old delete-dialog flow.
  function highlightDuplicateTracks(dupes) {
    document.querySelectorAll('.vmu-dupe-highlight').forEach(el => el.classList.remove('vmu-dupe-highlight'));
    const ids = new Set();
    for (const d of dupes) {
      if (d.track?.fullId) ids.add(d.track.fullId);
      if (d.original?.fullId) ids.add(d.original.fullId);
      if (d.track?.id) ids.add(String(d.track.id));
      if (d.original?.id) ids.add(String(d.original.id));
    }
    const rows = document.querySelectorAll('[data-full-id], [data-vmu-track], [data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"], .audio_row');
    for (const row of rows) {
      let rowId = row.dataset?.fullId || null;
      if (!rowId && row.dataset?.vmuTrack) {
        try { rowId = JSON.parse(row.dataset.vmuTrack).id; } catch {}
      }
      if (rowId && ids.has(rowId)) row.classList.add('vmu-dupe-highlight');
    }
  }

  // Mark blocked / VK-unavailable tracks with a red accent. Detected from
  // entity.data.isBlocked (or null url) — set by markRowTrackData in injected.js.
  function highlightBlockedTracks(tracks, blockedIndices) {
    const ids = new Set();
    for (const i of blockedIndices) {
      const t = tracks[i];
      if (t?.fullId) ids.add(t.fullId);
      if (t?.id) ids.add(String(t.id));
    }
    const rows = document.querySelectorAll('[data-full-id], [data-vmu-track], [data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"], .audio_row');
    for (const row of rows) {
      let rowId = row.dataset?.fullId || null;
      if (!rowId && row.dataset?.vmuTrack) {
        try { rowId = JSON.parse(row.dataset.vmuTrack).id; } catch {}
      }
      if (rowId && ids.has(rowId)) row.classList.add('vmu-blocked-highlight');
    }
  }

  // Clear highlight rows and tear down the minimap (used at scan start, and
  // automatically when the playlist modal closes).
  function clearDupeMarkers() {
    document.querySelectorAll('.vmu-dupe-highlight, .vmu-blocked-highlight').forEach(el => {
      el.classList.remove('vmu-dupe-highlight');
      el.classList.remove('vmu-blocked-highlight');
    });
    const panel = document.getElementById('vmu-issue-panel');
    if (panel) {
      panel._vmuCleanup?.();
      panel.remove();
    }
  }

  // Helper: scroll a popup row into view and flash it. Used by both the
  // minimap markers and the blocked-list entries. expandPlaylistModal
  // already mounts every row during scanForDuplicates' scan, so this is
  // usually the fast lookup below; scrollModalToTrackId is the fallback for
  // whatever wasn't (a row virtualized back out, etc).
  async function focusModalRowByTrackId(modal, trackId) {
    // The row may already be mounted (user scrolled past it, or a previous
    // scan loaded it) but not yet stamped with data-vmu-track — markRowTrackData
    // only stamps on request, not on every DOM change. Ask for a fresh stamp
    // pass first so an already-there row is found instantly instead of
    // falling through to the scroll hunt for no reason.
    await waitForMarkRows();
    let row = findModalRowByTrackId(modal, trackId);
    if (!row) {
      const toastId = 'vmu-jump-toast';
      showProgressToast('Ищем трек в плейлисте…', { kind: 'progress', id: toastId });
      try {
        row = await scrollModalToTrackId(modal, trackId, n => {
          showProgressToast(`Ищем трек в плейлисте… (${n})`, { kind: 'progress', id: toastId });
        });
      } catch (e) {
        console.warn('[vmu] scrollModalToTrackId failed:', e.message);
      }
      if (!row) {
        showProgressToast('Трек не найден в плейлисте', { kind: 'error', id: toastId });
        return;
      }
      document.getElementById(toastId)?.remove();
    }
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.remove('vmu-dupe-flash');
    void row.offsetWidth;
    row.classList.add('vmu-dupe-flash');
    setTimeout(() => row.classList.remove('vmu-dupe-flash'), 1400);
  }

  // Unified issue panel: small marker strip (dupes amber + blocked red) on
  // the left edge, optional scrollable list of blocked tracks on the right
  // with a single header (counts + copy-to-clipboard). Click any marker or
  // list row to jump to that track in the playlist popup.
  function buildIssuePanel(tracks, dupeIndices, blockedIndices, dupeGroups) {
    dupeGroups = dupeGroups || [];
    document.getElementById('vmu-issue-panel')?.remove();
    const modal = findOpenPlaylistModal();
    if (!modal || (!dupeIndices.length && !blockedIndices.length)) return;

    const hasListContent = blockedIndices.length > 0 || dupeGroups.length > 0;
    const panel = document.createElement('div');
    panel.id = 'vmu-issue-panel';
    panel.classList.toggle('vmu-ip-has-list', hasListContent);

    // ── marker column ────────────────────────────────────────────────────
    const mm = document.createElement('div');
    mm.className = 'vmu-ip-mm';
    // Show numeric badge only when there is no separate list to label things
    if (!blockedIndices.length && dupeIndices.length) {
      const badge = document.createElement('div');
      badge.className = 'vmu-ip-mm-badge';
      badge.textContent = String(dupeIndices.length);
      badge.title = `Дубликатов: ${dupeIndices.length}`;
      mm.appendChild(badge);
    }
    const inner = document.createElement('div');
    inner.className = 'vmu-ip-mm-inner';
    mm.appendChild(inner);

    const total = tracks.length;
    const blockedSet = new Set(blockedIndices);
    const all = [
      ...blockedIndices.map(idx => ({ idx, blocked: true })),
      ...dupeIndices.filter(idx => !blockedSet.has(idx)).map(idx => ({ idx, blocked: false })),
    ];
    for (const { idx, blocked } of all) {
      const t = tracks[idx] || {};
      const mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'vmu-dupe-marker' + (blocked ? ' vmu-dupe-marker-blocked' : '');
      // Place each marker at the centre of its track-slot so the first and last
      // ones stay inside the column instead of being half-clipped at the edges.
      mark.style.top = `${((idx + 0.5) / Math.max(1, total)) * 100}%`;
      const label = `${t.artist || ''}${t.artist ? ' — ' : ''}${t.title || ''}`.trim() || `Трек ${idx + 1}`;
      mark.title = (blocked ? '[недоступен] ' : '') + label;
      mark.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const trackId = t?.fullId || t?.id;
        if (trackId) focusModalRowByTrackId(modal, trackId);
      });
      inner.appendChild(mark);
    }
    panel.appendChild(mm);

    // ── list column (blocked + duplicate groups) ─────────────────────────
    if (hasListContent) {
      const right = document.createElement('div');
      right.className = 'vmu-ip-listcol';

      const stats = [];
      if (blockedIndices.length) stats.push(`Недоступно: ${blockedIndices.length}`);
      if (dupeIndices.length) stats.push(`Дубликаты: ${dupeIndices.length}`);
      const head = document.createElement('div');
      head.className = 'vmu-bl-head';
      head.innerHTML = `<span class="vmu-bl-title">${stats.join(' · ')}</span>
        <button class="vmu-bl-copy" type="button" title="Скопировать недоступные">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="12" rx="2"/><path d="M3 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/></svg>
          <span class="vmu-bl-copy-label">Копировать</span>
        </button>`;
      right.appendChild(head);

      const list = document.createElement('div');
      list.className = 'vmu-bl-list';

      const blockedLines = [];
      if (blockedIndices.length) {
        const sectionHead = document.createElement('div');
        sectionHead.className = 'vmu-bl-section-head vmu-bl-section-blocked';
        sectionHead.textContent = `Недоступные · ${blockedIndices.length}`;
        list.appendChild(sectionHead);
        for (const idx of blockedIndices) {
          const t = tracks[idx] || {};
          const label = `${t.artist || ''}${t.artist ? ' — ' : ''}${t.title || ''}`.trim() || `Трек ${idx + 1}`;
          blockedLines.push(label);
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'vmu-bl-item';
          row.title = label;
          const rowText = document.createElement('span');
          rowText.className = 'vmu-bl-item-text';
          rowText.textContent = label;
          row.appendChild(rowText);
          row.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const trackId = t?.fullId || t?.id;
            if (trackId) focusModalRowByTrackId(modal, trackId);
          });
          list.appendChild(row);
        }
      }

      if (dupeGroups.length) {
        const sectionHead = document.createElement('div');
        sectionHead.className = 'vmu-bl-section-head vmu-bl-section-dupes';
        sectionHead.textContent = `Дубликаты · ${dupeGroups.length} ${dupeGroups.length === 1 ? 'группа' : 'групп'}`;
        list.appendChild(sectionHead);
        for (const g of dupeGroups) {
          const group = document.createElement('div');
          group.className = 'vmu-bl-group';

          const title = document.createElement('div');
          title.className = 'vmu-bl-group-title';
          title.title = g.label;
          const nameSpan = document.createElement('span');
          nameSpan.className = 'vmu-bl-group-name';
          nameSpan.textContent = g.label;
          const countSpan = document.createElement('span');
          countSpan.className = 'vmu-bl-group-count';
          countSpan.textContent = '×' + g.indices.length;
          title.append(nameSpan, countSpan);
          group.appendChild(title);

          const positions = document.createElement('div');
          positions.className = 'vmu-bl-group-positions';
          for (const idx of g.indices) {
            const t = tracks[idx] || {};
            const pos = document.createElement('button');
            pos.type = 'button';
            pos.className = 'vmu-bl-pos';
            pos.textContent = `#${idx + 1}`;
            pos.title = g.label;
            pos.addEventListener('click', e => {
              e.preventDefault(); e.stopPropagation();
              const trackId = t?.fullId || t?.id;
              if (trackId) focusModalRowByTrackId(modal, trackId);
            });
            positions.appendChild(pos);
          }
          group.appendChild(positions);
          list.appendChild(group);
        }
      }

      right.appendChild(list);

      const copyBtn = head.querySelector('.vmu-bl-copy');
      const copyText = blockedLines.length
        ? blockedLines.join('\n')
        : dupeGroups.map(g => `${g.label} (×${g.indices.length}: ${g.indices.map(i => '#' + (i + 1)).join(', ')})`).join('\n');
      if (!blockedLines.length) copyBtn.title = 'Скопировать дубликаты';
      copyBtn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const labelEl = copyBtn.querySelector('.vmu-bl-copy-label');
        const orig = labelEl?.textContent || 'Копировать';
        navigator.clipboard.writeText(copyText).then(() => {
          if (labelEl) labelEl.textContent = 'Скопировано';
          copyBtn.classList.add('vmu-bl-copy-ok');
          setTimeout(() => {
            if (!copyBtn.isConnected) return;
            if (labelEl) labelEl.textContent = orig;
            copyBtn.classList.remove('vmu-bl-copy-ok');
          }, 1500);
        }).catch(() => {
          if (labelEl) labelEl.textContent = 'Ошибка';
          setTimeout(() => { if (copyBtn.isConnected && labelEl) labelEl.textContent = orig; }, 1500);
        });
      });
      panel.appendChild(right);
    }

    document.body.appendChild(panel);

    // expandPlaylistModal already mounted every flagged row during the scan,
    // so this mostly just applies once — kept as a live watcher too in case
    // anything mounts later (Fallback A/B paths, or VK re-rendering a row),
    // so the amber/red highlight stays correct without a full re-scan.
    const dupeTrackIds = new Set();
    for (const idx of dupeIndices) {
      const t = tracks[idx];
      if (t?.fullId) dupeTrackIds.add(t.fullId);
      if (t?.id) dupeTrackIds.add(String(t.id));
    }
    const blockedTrackIds = new Set();
    for (const idx of blockedIndices) {
      const t = tracks[idx];
      if (t?.fullId) blockedTrackIds.add(t.fullId);
      if (t?.id) blockedTrackIds.add(String(t.id));
    }
    async function reapplyIssueHighlights() {
      // Newly-mounted rows aren't stamped with data-vmu-track until asked —
      // request a fresh stamp pass first so rows that just landed actually
      // pick up the highlight this tick instead of waiting for some later,
      // unrelated stamp trigger.
      await waitForMarkRows();
      const rows = modal.querySelectorAll('[data-full-id], [data-vmu-track], [data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"], .audio_row');
      for (const row of rows) {
        let rowId = row.dataset?.fullId || null;
        if (!rowId && row.dataset?.vmuTrack) {
          try { rowId = JSON.parse(row.dataset.vmuTrack).id; } catch {}
        }
        if (!rowId) continue;
        if (dupeTrackIds.has(rowId)) row.classList.add('vmu-dupe-highlight');
        if (blockedTrackIds.has(rowId)) row.classList.add('vmu-blocked-highlight');
      }
    }
    reapplyIssueHighlights();

    const positionPanel = () => {
      const r = modal.getBoundingClientRect();
      if (r.width === 0) return;
      panel.style.left = (r.right + 6) + 'px';
      const top = Math.max(60, Math.min(r.top + 220, window.innerHeight - 320));
      panel.style.top = top + 'px';
    };
    positionPanel();
    const ro = new ResizeObserver(positionPanel);
    ro.observe(modal);
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', positionPanel, true);
    let reapplyScheduled = false;
    const mo = new MutationObserver(() => {
      if (!document.body.contains(modal) || modal.getBoundingClientRect().width === 0) {
        panel._vmuCleanup?.();
        panel.remove();
        return;
      }
      if (reapplyScheduled) return;
      reapplyScheduled = true;
      requestAnimationFrame(() => { reapplyScheduled = false; reapplyIssueHighlights(); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    panel._vmuCleanup = () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel, true);
    };
  }

  function parseTracksFromPayload(list) {
    const tracks = [];
    for (const item of list) {
      if (Array.isArray(item) && item.length >= 5) {
        // VK internal format: [id, owner_id, url, url2, title, artist, ...]
        tracks.push({
          id: String(item[0]),
          owner_id: String(item[1]),
          fullId: `${item[1]}_${item[0]}`,
          title: String(item[3] || item[4] || ''),
          artist: String(item[4] || item[5] || ''),
        });
      }
    }
    return tracks;
  }

  // ─── settings panel ───────────────────────────────────────────────────────────
  // Standalone, draggable modal (own floating panel, same look as
  // .vmu-bulkops-panel) reachable from the toolbar gear (injectToolbarSettingsButtons)
  // instead of living inside VK's own upload dialog — settings shouldn't
  // require opening the upload flow just to reach them, and this also
  // sidesteps ever having two copies of the same ids mounted at once.
  let settingsPanelOpen = false;

  function closeSettingsPanel() {
    settingsPanelOpen = false;
    document.getElementById('vmu-settings-modal')?.remove();
    const toolbarBtn = document.getElementById('vmu-toolbar-settings-btn');
    if (toolbarBtn) toolbarBtn.style.color = '';
  }

  function toggleSettings() {
    syncVmuTheme(); // cheap self-heal in case the observer's target got replaced
    if (document.getElementById('vmu-settings-modal')) { closeSettingsPanel(); return; }
    closeSoundCloudPanel();
    settingsPanelOpen = true;
    const modal = document.createElement('div');
    modal.id = 'vmu-settings-modal';
    modal.className = 'vmu-bulkops-panel vmu-settings-modal';
    modal.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Настройки</span>
        <button type="button" class="vmu-check-close" id="vmu-settings-modal-close" title="Закрыть">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body">${buildSettingsPanel()}</div>
    `;
    document.body.appendChild(modal);
    const panel = modal.querySelector('#vmu-settings-panel');
    if (panel) panel.style.display = 'block';
    makePanelDraggable(modal, modal.querySelector('.vmu-bulkops-head'));
    modal.querySelector('#vmu-settings-modal-close').addEventListener('click', closeSettingsPanel);
    attachSettingsHandlers();
    const toolbarBtn = document.getElementById('vmu-toolbar-settings-btn');
    if (toolbarBtn) toolbarBtn.style.color = '#2688eb';
  }

  function buildSettingsPanel() {
    const hasCover = !!settings.coverDataUrl;
    const isCheck = settings.workMode === 'check';
    return `
      <div id="vmu-settings-panel" style="display:none">
        <div class="vmu-settings-section" id="vmu-general-section">
          <div class="vmu-setting-row vmu-setting-row-wide">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Режим работы</span>
              <span class="vmu-setting-hint">Проверка — сверить имена файлов с треками на странице, без загрузки</span>
            </div>
            <div class="vmu-mode-switch" id="vmu-mode-switch" role="tablist">
              <button type="button" data-vmu-mode="upload" class="${isCheck ? '' : 'active'}">Загрузка</button>
              <button type="button" data-vmu-mode="check" class="${isCheck ? 'active' : ''}">Проверка</button>
            </div>
          </div>

          <div class="vmu-setting-row ${isCheck ? '' : 'vmu-row-disabled'}" id="vmu-check-scope-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Сканировать всю страницу</span>
              <span class="vmu-setting-hint">По умолчанию — только первые 100 треков</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-check-fullpage-toggle" ${settings.checkFullPage ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Закрепить сайдбар</span>
              <span class="vmu-setting-hint">Левая колонка следует за прокруткой страницы</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-pin-sidebar-toggle" ${settings.pinSidebar ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row vmu-slider-row vmu-setting-row-wide">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Смещение контента</span>
              <span class="vmu-setting-hint">Сдвиг сайдбара и основной колонки по горизонтали</span>
            </div>
            <div class="vmu-slider-wrap">
              <input type="range" id="vmu-offset-x" class="vmu-slider" min="-400" max="400" step="5" value="${settings.contentOffsetX}">
              <span class="vmu-slider-value" id="vmu-offset-x-val">${settings.contentOffsetX > 0 ? '+' : ''}${settings.contentOffsetX}px</span>
              <button type="button" id="vmu-offset-x-reset" class="vmu-slider-reset" title="Сбросить">↺</button>
            </div>
          </div>

          <div class="vmu-setting-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Оптимизация больших плейлистов</span>
              <span class="vmu-setting-hint">Пропускать рендеринг строк за пределами экрана — меньше лагов при скролле длинных списков</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-optimize-toggle" ${settings.optimizeBigPlaylists ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Скрыть кнопку «Наверх»</span>
              <span class="vmu-setting-hint">Полностью убрать левую полосу со скроллом наверх</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-hide-stl-toggle" ${settings.hideScrollToTop ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Скрыть «Музыка друзей»</span>
              <span class="vmu-setting-hint">Убрать блок с прослушанным у друзей на странице «Моя музыка»</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-hide-friends-music-toggle" ${settings.hideFriendsMusic ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Закрепить панель вкладок</span>
              <span class="vmu-setting-hint">«Моя музыка» / «Обзор» / поиск сливаются с верхней панелью при прокрутке</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-pin-tabs-toggle" ${settings.pinTabsBar ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row vmu-slider-row vmu-setting-row-wide">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Потоков скачивания</span>
              <span class="vmu-setting-hint">Сколько треков плейлиста скачивать одновременно</span>
            </div>
            <div class="vmu-slider-wrap">
              <input type="range" id="vmu-dl-threads" class="vmu-slider" min="1" max="25" step="1" value="${settings.downloadThreads}">
              <span class="vmu-slider-value" id="vmu-dl-threads-val">${settings.downloadThreads}</span>
              <button type="button" id="vmu-dl-threads-reset" class="vmu-slider-reset" title="Сбросить">↺</button>
            </div>
          </div>
        </div>

        <div class="vmu-settings-section ${isCheck ? 'vmu-row-disabled' : ''}" id="vmu-upload-only-section">
          <div class="vmu-setting-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Авто-плейлист</span>
              <span class="vmu-setting-hint">Создать плейлист после загрузки</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-ap-toggle" ${settings.autoPlaylist ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row ${settings.autoPlaylist ? '' : 'vmu-row-disabled'}" id="vmu-dupcheck-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Проверка дубликатов плейлиста</span>
              <span class="vmu-setting-hint">Спрашивать перед созданием, если плейлист с таким названием уже есть</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-dupcheck-toggle" ${settings.dupPlaylistCheck ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row ${settings.autoPlaylist && settings.dupPlaylistCheck ? '' : 'vmu-row-disabled'}" id="vmu-autoadd-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Авто-добавление в существующий плейлист</span>
              <span class="vmu-setting-hint">Если плейлист с таким названием уже есть — добавить в него дозалитые треки вместо вопроса о дубликате</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-autoadd-toggle" ${settings.autoAddToExistingPlaylist ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div id="vmu-cover-row" class="vmu-setting-row vmu-setting-row-wide ${settings.autoPlaylist ? '' : 'vmu-row-disabled'}">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Обложка</span>
              <span class="vmu-setting-hint">Выберите базовый JPG/PNG (1000×1000)</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              ${hasCover ? `<div id="vmu-cover-preview" title="Нажмите для смены"></div>` : ''}
              <label class="vmu-cover-pick-btn" title="Выбрать обложку">
                ${hasCover ? '↺' : '+ Выбрать'}
                <input type="file" id="vmu-cover-input" accept="image/*" style="display:none">
              </label>
              ${hasCover ? `<button id="vmu-cover-clear" title="Удалить обложку">✕</button>` : ''}
            </div>
          </div>

          <div class="vmu-setting-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Авто-метаданные</span>
              <span class="vmu-setting-hint">Заполнить исполнителя и название из имени файла, если теги пусты</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-meta-toggle" ${settings.autoMeta ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>

          <div class="vmu-setting-row ${settings.autoPlaylist && !settings.coverDataUrl ? '' : 'vmu-row-disabled'}" id="vmu-id3cover-row">
            <div class="vmu-setting-info">
              <span class="vmu-setting-label">Обложка из ID3</span>
              <span class="vmu-setting-hint">Использовать встроенную обложку первого трека (если нет выбранной выше)</span>
            </div>
            <label class="vmu-toggle">
              <input type="checkbox" id="vmu-id3cover-toggle" ${settings.autoCoverFromId3 ? 'checked' : ''}>
              <span class="vmu-toggle-track"></span>
            </label>
          </div>
        </div>
      </div>`;
  }

  function attachSettingsHandlers() {
    const modeSwitch = document.getElementById('vmu-mode-switch');
    if (modeSwitch) {
      modeSwitch.addEventListener('click', e => {
        const btn = e.target.closest('button[data-vmu-mode]');
        if (!btn) return;
        const mode = btn.dataset.vmuMode;
        if (mode === settings.workMode) return;
        settings.workMode = mode;
        saveSettings();
        modeSwitch.querySelectorAll('button').forEach(b => {
          b.classList.toggle('active', b.dataset.vmuMode === mode);
        });
        const isCheck = mode === 'check';
        document.getElementById('vmu-upload-only-section')?.classList.toggle('vmu-row-disabled', isCheck);
        document.getElementById('vmu-check-scope-row')?.classList.toggle('vmu-row-disabled', !isCheck);
        // Update dropzone hint to reflect the active mode
        const dzLabel = document.querySelector('#vmu-dropzone .vmu-dz-label');
        const dzHint = document.querySelector('#vmu-dropzone .vmu-dz-hint');
        if (dzLabel) dzLabel.textContent = isCheck
          ? 'Перетащите MP3 для проверки'
          : 'Перетащите MP3 файлы сюда';
        if (dzHint) dzHint.textContent = isCheck
          ? 'имена файлов будут сверены с треками на странице'
          : 'не более 200 МБ каждый';
        const headerTitle = document.getElementById('vmu-header-title');
        if (headerTitle) headerTitle.textContent = isCheck ? 'Проверка аудиозаписей' : 'Загрузка аудиозаписей';
      });
    }

    const hideStlToggle = document.getElementById('vmu-hide-stl-toggle');
    if (hideStlToggle) {
      hideStlToggle.addEventListener('change', () => {
        settings.hideScrollToTop = hideStlToggle.checked;
        saveSettings();
        applyLayoutCustomizations();
      });
    }

    const hideFriendsMusicToggle = document.getElementById('vmu-hide-friends-music-toggle');
    if (hideFriendsMusicToggle) {
      hideFriendsMusicToggle.addEventListener('change', () => {
        settings.hideFriendsMusic = hideFriendsMusicToggle.checked;
        saveSettings();
        applyLayoutCustomizations();
      });
    }

    const pinTabsToggle = document.getElementById('vmu-pin-tabs-toggle');
    if (pinTabsToggle) {
      pinTabsToggle.addEventListener('change', () => {
        settings.pinTabsBar = pinTabsToggle.checked;
        saveSettings();
        applyTabsBarPin();
      });
    }

    const optimizeToggle = document.getElementById('vmu-optimize-toggle');
    if (optimizeToggle) {
      optimizeToggle.addEventListener('change', () => {
        settings.optimizeBigPlaylists = optimizeToggle.checked;
        saveSettings();
        applyLayoutCustomizations();
      });
    }

    const pinSidebarToggle = document.getElementById('vmu-pin-sidebar-toggle');
    if (pinSidebarToggle) {
      pinSidebarToggle.addEventListener('change', () => {
        settings.pinSidebar = pinSidebarToggle.checked;
        saveSettings();
        applyLayoutCustomizations();
      });
    }

    const offsetSlider = document.getElementById('vmu-offset-x');
    const offsetVal = document.getElementById('vmu-offset-x-val');
    if (offsetSlider) {
      offsetSlider.addEventListener('input', () => {
        const v = parseInt(offsetSlider.value, 10) || 0;
        settings.contentOffsetX = v;
        if (offsetVal) offsetVal.textContent = (v > 0 ? '+' : '') + v + 'px';
        applyLayoutCustomizations();
        if (settings.pinTabsBar) applyTabsBarPin();
      });
      offsetSlider.addEventListener('change', saveSettings);
    }
    const offsetReset = document.getElementById('vmu-offset-x-reset');
    if (offsetReset && offsetSlider) {
      offsetReset.addEventListener('click', () => {
        settings.contentOffsetX = 0;
        offsetSlider.value = '0';
        if (offsetVal) offsetVal.textContent = '0px';
        saveSettings();
        applyLayoutCustomizations();
        if (settings.pinTabsBar) applyTabsBarPin();
      });
    }

    const dlThreadsSlider = document.getElementById('vmu-dl-threads');
    const dlThreadsVal = document.getElementById('vmu-dl-threads-val');
    if (dlThreadsSlider) {
      dlThreadsSlider.addEventListener('input', () => {
        const v = Math.max(1, Math.min(25, parseInt(dlThreadsSlider.value, 10) || 1));
        settings.downloadThreads = v;
        if (dlThreadsVal) dlThreadsVal.textContent = String(v);
      });
      dlThreadsSlider.addEventListener('change', saveSettings);
    }
    const dlThreadsReset = document.getElementById('vmu-dl-threads-reset');
    if (dlThreadsReset && dlThreadsSlider) {
      dlThreadsReset.addEventListener('click', () => {
        settings.downloadThreads = 3;
        dlThreadsSlider.value = '3';
        if (dlThreadsVal) dlThreadsVal.textContent = '3';
        saveSettings();
      });
    }

    const fullPageToggle = document.getElementById('vmu-check-fullpage-toggle');
    if (fullPageToggle) {
      fullPageToggle.addEventListener('change', () => {
        settings.checkFullPage = fullPageToggle.checked;
        saveSettings();
      });
    }

    const toggle = document.getElementById('vmu-ap-toggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        settings.autoPlaylist = toggle.checked;
        saveSettings();
        const coverRow = document.getElementById('vmu-cover-row');
        if (coverRow) coverRow.classList.toggle('vmu-row-disabled', !settings.autoPlaylist);
        const id3Row = document.getElementById('vmu-id3cover-row');
        if (id3Row) id3Row.classList.toggle('vmu-row-disabled', !(settings.autoPlaylist && !settings.coverDataUrl));
        const dupRow = document.getElementById('vmu-dupcheck-row');
        if (dupRow) dupRow.classList.toggle('vmu-row-disabled', !settings.autoPlaylist);
        const autoAddRow = document.getElementById('vmu-autoadd-row');
        if (autoAddRow) autoAddRow.classList.toggle('vmu-row-disabled', !(settings.autoPlaylist && settings.dupPlaylistCheck));
      });
    }

    const dupCheckToggle = document.getElementById('vmu-dupcheck-toggle');
    if (dupCheckToggle) {
      dupCheckToggle.addEventListener('change', () => {
        settings.dupPlaylistCheck = dupCheckToggle.checked;
        saveSettings();
        const autoAddRow = document.getElementById('vmu-autoadd-row');
        if (autoAddRow) autoAddRow.classList.toggle('vmu-row-disabled', !(settings.autoPlaylist && settings.dupPlaylistCheck));
      });
    }

    const autoAddToggle = document.getElementById('vmu-autoadd-toggle');
    if (autoAddToggle) {
      autoAddToggle.addEventListener('change', () => {
        settings.autoAddToExistingPlaylist = autoAddToggle.checked;
        saveSettings();
      });
    }

    const id3CoverToggle = document.getElementById('vmu-id3cover-toggle');
    if (id3CoverToggle) {
      id3CoverToggle.addEventListener('change', () => {
        settings.autoCoverFromId3 = id3CoverToggle.checked;
        saveSettings();
      });
    }

    const coverInput = document.getElementById('vmu-cover-input');
    if (coverInput) {
      coverInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          settings.coverDataUrl = reader.result;
          saveSettings();
          // Rebuild settings panel to show preview
          const panel = document.getElementById('vmu-settings-panel');
          if (panel) {
            const wasOpen = settingsPanelOpen;
            rebuildSettingsPanel();
            if (wasOpen) document.getElementById('vmu-settings-panel').style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      });
    }

    const coverClear = document.getElementById('vmu-cover-clear');
    if (coverClear) {
      coverClear.addEventListener('click', () => {
        settings.coverDataUrl = null;
        saveSettings();
        rebuildSettingsPanel();
        if (settingsPanelOpen) document.getElementById('vmu-settings-panel').style.display = 'block';
      });
    }

    const coverPreview = document.getElementById('vmu-cover-preview');
    if (coverPreview && settings.coverDataUrl) {
      coverPreview.style.cssText = `width:32px;height:32px;border-radius:4px;background:url('${settings.coverDataUrl}') center/cover;cursor:pointer;flex-shrink:0`;
    }

    const metaToggle = document.getElementById('vmu-meta-toggle');
    if (metaToggle) {
      metaToggle.addEventListener('change', () => {
        settings.autoMeta = metaToggle.checked;
        saveSettings();
      });
    }

  }

  function rebuildSettingsPanel() {
    const panel = document.getElementById('vmu-settings-panel');
    if (!panel) return;
    const newPanel = document.createElement('div');
    newPanel.innerHTML = buildSettingsPanel();
    panel.replaceWith(newPanel.firstElementChild);
    attachSettingsHandlers();
  }

  // ─── SoundCloud download panel ─────────────────────────────────────────────
  // Same standalone-modal treatment as settings above — its own draggable
  // floating panel from the toolbar SC button, independent of the upload
  // dialog.
  let soundCloudPanelOpen = false;

  function closeSoundCloudPanel() {
    soundCloudPanelOpen = false;
    document.getElementById('vmu-sc-modal')?.remove();
    const toolbarBtn = document.getElementById('vmu-toolbar-sc-btn');
    if (toolbarBtn) toolbarBtn.style.color = '';
  }

  function toggleSoundCloud() {
    syncVmuTheme();
    if (document.getElementById('vmu-sc-modal')) { closeSoundCloudPanel(); return; }
    closeSettingsPanel();
    soundCloudPanelOpen = true;
    const modal = document.createElement('div');
    modal.id = 'vmu-sc-modal';
    modal.className = 'vmu-bulkops-panel vmu-sc-modal';
    modal.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Скачать с SoundCloud</span>
        <button type="button" class="vmu-check-close" id="vmu-sc-modal-close" title="Закрыть">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body">${buildSoundCloudPanel()}</div>
    `;
    document.body.appendChild(modal);
    const panel = modal.querySelector('#vmu-sc-panel');
    if (panel) panel.style.display = 'block';
    makePanelDraggable(modal, modal.querySelector('.vmu-bulkops-head'));
    modal.querySelector('#vmu-sc-modal-close').addEventListener('click', closeSoundCloudPanel);
    attachSoundCloudHandlers();
    const toolbarBtn = document.getElementById('vmu-toolbar-sc-btn');
    if (toolbarBtn) toolbarBtn.style.color = '#ff7700';
    document.getElementById('vmu-sc-input')?.focus();
  }

  function buildSoundCloudPanel() {
    return `
      <div id="vmu-sc-panel" style="display:none">
        <div class="vmu-sc-row">
          <input type="text" id="vmu-sc-input" class="vmu-sc-input" placeholder="Ссылка на трек или сет SoundCloud…" spellcheck="false" autocomplete="off">
          <button type="button" id="vmu-sc-download-btn" class="vmu-pick-btn vmu-sc-download-btn">Скачать</button>
        </div>
        <div id="vmu-sc-status" class="vmu-sc-status"></div>
      </div>`;
  }

  function scMsg(type, payload) {
    return new Promise(resolve => {
      try { chrome.runtime.sendMessage({ type, ...payload }, res => resolve(res)); }
      catch { resolve({ ok: false, error: 'extension context error' }); }
    });
  }

  function setScStatus(text, kind) {
    const el = document.getElementById('vmu-sc-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'vmu-sc-status' + (kind ? ` vmu-sc-status-${kind}` : '');
  }

  async function handleSoundCloudDownload() {
    const input = document.getElementById('vmu-sc-input');
    const btn = document.getElementById('vmu-sc-download-btn');
    const url = (input?.value || '').trim();
    if (!/^https?:\/\/([a-z0-9-]+\.)?(soundcloud\.com|snd\.sc)\//i.test(url)) {
      setScStatus('Вставьте ссылку на трек или сет soundcloud.com', 'error');
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Скачиваем…'; }
    setScStatus('Получаем информацию о треке…');

    const res = await scMsg('VKD_SC_RESOLVE', { url });
    if (!res?.ok) {
      setScStatus('Ошибка: ' + (res?.error || 'не удалось получить трек'), 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Скачать'; }
      return;
    }

    const tracks = res.tracks;
    let ok = 0, fail = 0;
    for (const t of tracks) {
      setScStatus(`Скачиваем ${ok + fail + 1}/${tracks.length}: ${t.artist} — ${t.title}`);
      const dl = await scMsg('VKD_DOWNLOAD', { url: t.url, filename: t.filename, folder: 'SoundCloud' });
      if (dl?.ok) ok++; else fail++;
    }

    const skipped = res.failedCount || 0;
    const parts = [`скачано: ${ok}`];
    if (fail) parts.push(`ошибок сохранения: ${fail}`);
    if (skipped) parts.push(`пропущено (нет прямого потока): ${skipped}`);
    setScStatus(`Готово — ${parts.join(', ')}`, fail || skipped ? 'error' : 'done');

    if (btn) { btn.disabled = false; btn.textContent = 'Скачать'; }
    if (ok && !fail) input.value = '';
  }

  function attachSoundCloudHandlers() {
    const btn = document.getElementById('vmu-sc-download-btn');
    if (btn && !btn.dataset.vmuBound) {
      btn.dataset.vmuBound = '1';
      btn.addEventListener('click', handleSoundCloudDownload);
    }
    const input = document.getElementById('vmu-sc-input');
    if (input && !input.dataset.vmuBound) {
      input.dataset.vmuBound = '1';
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSoundCloudDownload();
      });
    }
  }

  // ─── retry / copy helpers ──────────────────────────────────────────────────
  function retryOne(idx) {
    if (fileQueue[idx] && fileQueue[idx].status === 'error') {
      fileQueue[idx].status = 'pending';
      fileQueue[idx].errorMsg = null;
      renderQueue();
      if (!isProcessing) processQueue();
    }
  }

  function retryAll() {
    let any = false;
    fileQueue.forEach(item => {
      if (item.status === 'error') { item.status = 'pending'; item.errorMsg = null; any = true; }
    });
    if (any) { renderQueue(); if (!isProcessing) processQueue(); }
  }

  // Cancel an item: if it's uploading, abort the XHR (status flips to
  // pending again via the catch in processQueue once the abort comes back);
  // if it's queued/done/error, just drop it from the queue.
  function cancelOne(idx) {
    const item = fileQueue[idx];
    if (!item) return;
    if (item.status === 'uploading') {
      item.abortReason = 'cancel';
      window.postMessage({ type: 'VMU_CANCEL_UPLOAD', fileName: item.file.name }, '*');
    } else {
      fileQueue.splice(idx, 1);
      renderQueue();
    }
  }

  // Pause / resume the queue. Batches now go to VK's native uploader all at
  // once, so "pause" can't stop it mid-batch — it aborts every file that's
  // still uploading (each re-uploads from scratch on resume, VK's protocol
  // doesn't support resuming a partial upload) and simply doesn't start a
  // new batch for anything still pending until resumed.
  function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
      for (const item of fileQueue) {
        if (item.status !== 'uploading') continue;
        item.abortReason = 'pause';
        window.postMessage({ type: 'VMU_CANCEL_UPLOAD', fileName: item.file.name }, '*');
      }
    } else if (!isProcessing) {
      processQueue();
    }
    renderQueue();
  }

  // Update only the progress bar of one item, without touching the rest of
  // the DOM (called many times per second during upload).
  function updateRowProgress(itemId) {
    const item = fileQueue.find(i => i.id === itemId);
    if (!item) return;
    const list = document.getElementById('vmu-list');
    const bar = list?.querySelector(`.vmu-progress[data-id="${itemId}"]`);
    if (bar) bar.style.width = `${Math.round((item.progress || 0) * 100)}%`;
  }

  function copyFailed() {
    const names = fileQueue.filter(f => f.status === 'error').map(f => f.file.name);
    if (!names.length) return;
    navigator.clipboard.writeText(names.join('\n')).then(() => {
      const btn = document.getElementById('vmu-copy-failed');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ Скопировано';
        setTimeout(() => { if (btn.isConnected) btn.textContent = orig; }, 1500);
      }
    }).catch(() => {});
  }

  // ─── render ───────────────────────────────────────────────────────────────────
  function renderQueue() {
    const list = document.getElementById('vmu-list');
    if (!list) return;

    list.innerHTML = fileQueue.map((item, idx) => {
      const raw = item.file.name.replace(/\.mp3$/i, '');
      const name = raw.length > 48 ? raw.slice(0, 46) + '…' : raw;
      const errHtml = item.errorMsg ? `<span class="vmu-errmsg">${item.errorMsg}</span>` : '';
      const retryBtn = item.status === 'error' ? `<button class="vmu-retry-btn" data-idx="${idx}" title="Повторить">↺</button>` : '';
      const cancelTitle = item.status === 'uploading' ? 'Отменить загрузку' : 'Убрать из очереди';
      const cancelBtn = `<button class="vmu-cancel-btn" data-idx="${idx}" title="${cancelTitle}">✕</button>`;
      const progressBar = item.status === 'uploading'
        ? `<div class="vmu-progress" data-id="${item.id}" style="width:${Math.round((item.progress || 0) * 100)}%"></div>`
        : '';
      return `<div class="vmu-item vmu-${item.status}">
        <span class="vmu-icon">${STATUS_ICON[item.status]}</span>
        <span class="vmu-info">
          <span class="vmu-name" title="${item.file.name}">${name}</span>${errHtml}
        </span>
        <span class="vmu-sz">${fmtSize(item.file.size)}</span>
        ${retryBtn}
        ${cancelBtn}
        ${progressBar}
      </div>`;
    }).join('');

    const counts = { pending: 0, uploading: 0, done: 0, error: 0 };
    fileQueue.forEach(f => counts[f.status]++);

    let txt = '';
    if (isPaused && (counts.pending || counts.uploading)) txt = `На паузе · в очереди: ${counts.pending + counts.uploading}`;
    else if (counts.uploading)                txt = 'Загружается…';
    else if (counts.pending)             txt = `В очереди: ${counts.pending}`;
    else if (counts.error && counts.done) txt = `Загружено: ${counts.done}, ошибок: ${counts.error}`;
    else if (counts.done)                txt = `Все треки загружены: ${counts.done}`;
    else if (counts.error)               txt = `Ошибок: ${counts.error}`;

    const st = document.getElementById('vmu-status');
    if (st) st.textContent = txt;

    const clearBtn = document.getElementById('vmu-clear');
    if (clearBtn) clearBtn.style.display = (counts.done || counts.error) ? '' : 'none';

    const hasWork = counts.pending > 0 || counts.uploading > 0;
    const allSettled = fileQueue.length > 0 && !hasWork;
    const buttons = [];
    if (hasWork) {
      const pauseIcon = isPaused
        ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M4 2 L11 7 L4 12 Z"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="2" width="3" height="10" rx="0.8"/><rect x="8" y="2" width="3" height="10" rx="0.8"/></svg>`;
      buttons.push(`<button class="vmu-action-btn vmu-pause-btn ${isPaused ? 'vmu-resume' : ''}" id="vmu-pause-btn" data-vmu-tip="${isPaused ? 'Продолжить' : 'Пауза'}">${pauseIcon}</button>`);
      const dailyCount = getTodayUploadCount();
      const nearLimit = dailyCount >= DAILY_UPLOAD_LIMIT - 10;
      buttons.push(`<span class="vmu-daily-count${nearLimit ? ' vmu-daily-count-warn' : ''}" title="Загружено сегодня (лимит ВК — ${DAILY_UPLOAD_LIMIT}/сутки)">${dailyCount}/${DAILY_UPLOAD_LIMIT}</span>`);
    }
    if (allSettled && counts.error > 0) {
      buttons.push(`<button class="vmu-action-btn" id="vmu-copy-failed" data-vmu-tip="Скопировать имена ошибок">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="12" rx="2"/><path d="M3 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/></svg>
        </button>`);
      buttons.push(`<button class="vmu-action-btn" id="vmu-retry-all" data-vmu-tip="Повторить все">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 5v5h-5"/><path d="M16.7 14a7 7 0 1 1-1.4-7.4L17 8"/></svg>
        </button>`);
    }
    renderUploadSidePanel(buttons.join(''));
  }

  // ─── queue ────────────────────────────────────────────────────────────────────
  // FROZEN: the whole per-file queue UI (progress bars, retry/cancel, pause,
  // auto-playlist trigger, processQueue/prepareFileForUpload below) depended
  // on correlating VK's own upload requests back to a specific file — which
  // stopped being reliable once VK moved to a transport our XHR/fetch
  // interceptors can't always see (see the long comment in processQueue).
  // Rather than keep fighting VK's upload internals, files now go straight
  // into VK's own native input and VK's own dialog shows the rest — our UI
  // is just the drop zone + "Выбрать файлы" button. Flip this back to true
  // to re-enable the rich queue if a reliable per-file signal is found
  // again; the old code is untouched below, just unreachable.
  const NATIVE_HANDOFF_ONLY = true;

  // Un-hides VK's own dialog content (see the `vmuNativeMiddle` hide in
  // injectIntoVkDialog) and drops our own dropzone UI, so VK's real
  // progress/success/error state — updated by VK's own re-render once the
  // handed-off input's change event lands — becomes visible instead of our
  // static dropzone sitting on top of it forever.
  function revealNativeUploadUI() {
    nativeUiRevealed = true;
    // Put VK's real file input back at its exact original spot (the anchor
    // comment left in injectIntoVkDialog) before un-hiding the section
    // around it — injectIntoVkDialog pulls this node out to be a direct
    // (invisible) child of the dialog box so our own dropzone can drive it
    // independently of whatever's hidden underneath, but that meant the
    // revealed native section came back missing the one input VK's own
    // post-upload UI actually needs. Left orphaned like that, VK's native
    // "не удалось загрузить — загрузить ещё раз?" retry for a failed track
    // has no scoped input to reuse and falls back to a fresh, unscoped
    // upload — which is why a retried track landed in the uploader's own
    // personal audio instead of the community. Restoring the exact original
    // node (not a clone) to its exact original position keeps VK's own
    // event handlers, closures and DOM-position-based lookups all intact.
    const input = document.querySelector('[data-vmu-vk="1"]');
    if (input?.__vmuAnchor?.parentNode) {
      input.__vmuAnchor.parentNode.insertBefore(input, input.__vmuAnchor);
      input.__vmuAnchor.remove();
    }
    if (input) {
      input.__vmuAnchor = null;
      input.removeAttribute('data-vmu-vk');
      input.style.cssText = '';
    }
    document.querySelectorAll('[data-vmu-native-middle="1"]').forEach(c => {
      c.style.display = '';
      delete c.dataset.vmuNativeMiddle;
    });
    document.getElementById('vmu-embedded')?.remove();
  }

  // Reads ID3 (for auto-meta), then hands every file straight to VK's own
  // hidden native file input (see VK_HANDOFF_FILES in injected.js) and lets
  // VK's own dialog do the rest — no progress/status tracking on our side.
  async function handoffFilesNatively(files) {
    // Claim the auto-playlist slot synchronously, before any `await` below —
    // if addFiles() ever fires twice for what's really one upload action
    // (observed live: two near-identical empty playlists both created from
    // the same drop), the old code only checked !autoPlaylistRunning AFTER
    // the whole ID3-reading loop, which is full of await points. Both
    // concurrent calls would sail through that check while the flag was
    // still false and each create their own playlist. Checking-and-setting
    // here, with no await in between, closes that race (single-threaded JS
    // runs this synchronous prefix to completion before yielding).
    //
    // autoPlaylistClaimed is released as soon as THIS batch is either
    // dropped or hand off to enqueueAutoPlaylist below — it only needs to
    // survive the synchronous prefix above, not the whole upload+dup-check+
    // track-search pipeline. Holding it that long is what used to silently
    // swallow a retried track that finished uploading while an earlier
    // batch's runAutoPlaylist was still busy: the retry's own synchronous
    // check saw the flag still held, decided not to track, and its tracks
    // never got fed into auto-playlist at all.
    const shouldTrackPlaylist = settings.autoPlaylist && !autoPlaylistClaimed;
    if (shouldTrackPlaylist) autoPlaylistClaimed = true;
    const startCountEarly = shouldTrackPlaylist ? getPageTrackCount() : null;

    const items = [];
    const batchItems = [];
    for (const f of files) {
      let file = f;
      // Read unconditionally (not just under autoMeta) — auto-playlist needs
      // these tags for its title/description/track-order logic below even
      // when the user doesn't want tags rewritten into the file itself.
      let tags = {};
      try { tags = await readID3(f); } catch {}
      if (settings.autoMeta) {
        try {
          const artistSplit = splitTrailingTagJunk(tags.TPE1 || tags.TPE2);
          const titleSplit = splitTrailingTagJunk(tags.TIT2);
          const hasArtist = !!(tags.TPE1 || tags.TPE2) && !!artistSplit.core;
          const hasTitle = !!tags.TIT2 && !!titleSplit.core;
          if (!hasArtist || !hasTitle) {
            const parsed = parseMetaFromFilename(f.name);
            const artist = hasArtist ? (tags.TPE1 || tags.TPE2) : joinWithJunk(parsed.artist, artistSplit.junk);
            const title = hasTitle ? tags.TIT2 : joinWithJunk(parsed.title, titleSplit.junk);
            if (artist || title) file = await patchID3(f, artist, title);
          }
        } catch {}
      }
      const buffer = await file.arrayBuffer();
      items.push({ name: file.name, mimeType: file.type || 'audio/mpeg', buffer });
      batchItems.push({ file, tags, status: 'done' });
    }
    // Optimistic count — without per-file confirmation from VK we can't know
    // exactly how many actually landed, only how many we handed off. Close
    // enough for the "you're approaching VK's 70/day cap" warning this is for.
    for (let i = 0; i < items.length; i++) bumpTodayUploadCount();

    window.postMessage({ type: 'VK_HANDOFF_FILES', items }, '*', items.map(i => i.buffer));

    const startCount = startCountEarly;
    if (startCount != null) {
      showProgressToast('Ждём подтверждения загрузки…', { id: 'vmu-autoplaylist' });
      waitForTrackCountIncrease(startCount, items.length)
        .then(gained => {
          autoPlaylistClaimed = false; // decided — a new upload can claim the next slot now
          if (gained > 0) { enqueueAutoPlaylist(batchItems); return; }
          showProgressToast('Ошибка: загрузка не подтвердилась, плейлист не создан', { id: 'vmu-autoplaylist', kind: 'error' });
        })
        .catch(err => {
          autoPlaylistClaimed = false;
          showProgressToast(`Ошибка: ${translateError(err.message)}`, { id: 'vmu-autoplaylist', kind: 'error' });
        });
    }
  }

  function addFiles(files) {
    if (!files.length) return;
    if (settings.workMode === 'check') {
      runCheckMode(files);
      return;
    }
    if (NATIVE_HANDOFF_ONLY) {
      handoffFilesNatively(files);
      return;
    }
    autoPlaylistClaimed = false;
    files.forEach(f => {
      const item = { id: ++itemIdCounter, file: f, status: 'pending', errorMsg: null, tags: {}, progress: 0 };
      fileQueue.push(item);
      // Read ID3 tags asynchronously (non-blocking)
      readID3(f).then(tags => { item.tags = tags; }).catch(() => {});
    });
    renderQueue();
    if (!isProcessing) processQueue();
  }

  // ─── check mode ──────────────────────────────────────────────────────────────
  // "Проверка" mode: read filenames + ID3 of dropped files, close the upload
  // modal, scroll the page list to harvest every audio row's track info via the
  // injected.js fiber walker, then compare and show which files are already
  // present on the page and which are missing.
  let checkModeRunning = false;

  // Whole-title aliases across scripts — deliberately just the handful of
  // near-universal, unambiguous album-structure track names where a
  // Latin-alphabet spelling and a Cyrillic one are equally common in the
  // wild and nothing else could plausibly share that (short, one-word)
  // name. Not a general transliterator: real title words have too many
  // valid many-to-one romanizations to guess safely (e.g. "Интро" could in
  // principle transliterate several ways — this table only maps the one
  // spelling that's actually standard for each).
  const NAME_TRANSLIT_ALIASES = {
    intro: 'интро',
    outro: 'аутро',
    skit: 'скит',
  };

  function normalizeNamePart(s) {
    const norm = String(s || '')
      // Genius titles sometimes arrive Unicode-decomposed (e.g. "й" as base
      // "и" + combining breve U+0306) while VK titles are precomposed —
      // verified live: "другой" from Genius silently failed to match VK's
      // "другой" despite being visually identical, because the raw strings
      // differed byte-for-byte. NFC folds both to the same composed form.
      .normalize('NFC')
      .toLowerCase()
      // ё vs е is treated as the same letter almost everywhere in casual
      // Russian typing — verified live: "ребёнок" (VK title) silently
      // failed to match Genius's "ребенок" over exactly this one letter.
      .replace(/ё/g, 'е')
      .replace(/[–—]/g, '-')
      // strip square/curly bracket tags like "[vk.com/reuploadunder]" or "(Live)"
      .replace(/[\[\{].*?[\]\}]/g, ' ')
      .replace(/\([^)]*\)\s*$/g, ' ')
      // drop "feat. X" / "ft. X" / "при участии X" / "при уч. X" / "с уч. X"
      // suffixes so credits don't break matching — [а-я-]*\.? after "уч"
      // covers every abbreviation level a reuploader types, from "уч."/"уч-и"
      // up through the full "участии"/"участием", not just the one spelled-
      // out form. [\s(]+ (not just \s+) before the keyword also rescues a
      // malformed credits parenthetical — e.g. "(при участии A, B (2000) и C"
      // with no final ")", verified live on a real reuploaded track — where a
      // nested "(...)" inside the credits list steals the real closing paren,
      // so the trailing-paren strip above only eats the innermost group and
      // leaves "(при участии ..." dangling with a "(" immediately before it
      // instead of whitespace.
      .replace(/[\s(]+(?:feat\.?|ft\.?|(?:при|с)\s+уч[а-я-]*\.?)\s+.*$/i, '')
      .replace(/[«»"'`’]/g, '')
      // Trailing "?"/"!" is often present on only one side of a match —
      // Genius keeps title punctuation, reuploaded filenames routinely drop
      // it — so ignore it rather than let it block an otherwise-exact match.
      .replace(/[?!]+\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Canonicalize to the Cyrillic spelling so "Intro" and "Интро" (either
    // order, either source) land on the same key regardless of which side
    // used which script.
    return NAME_TRANSLIT_ALIASES[norm] || norm;
  }
  function normalizeKey(artist, title) {
    return normalizeNamePart(artist) + '|||' + normalizeNamePart(title);
  }

  async function fileToCheckEntry(f) {
    const tags = await readID3(f).catch(() => ({}));
    const tagArtist = isJunkTag(tags.TPE1 || tags.TPE2) ? '' : (tags.TPE1 || tags.TPE2 || '');
    const tagTitle = isJunkTag(tags.TIT2) ? '' : (tags.TIT2 || '');
    let artist = tagArtist, title = tagTitle;
    if (!artist || !title) {
      const parsed = parseMetaFromFilename(f.name);
      if (!artist) artist = parsed.artist;
      if (!title) title = parsed.title;
    }
    return {
      name: f.name,
      artist,
      title,
      key: normalizeKey(artist, title),
    };
  }

  // Close the upload dialog through VK's own controls — the native close /
  // cancel buttons are the only path that tears down both the modal and its
  // dim overlay (Escape is ignored by this modal, verified live).
  function closeUploadModal() {
    setBlockAudioHide(false);
    const box = getUploadDialog();
    if (!box) return;
    // Native controls (kept intact by injectIntoVkDialog)
    const native = box.querySelector('[data-testid="UploadAudio_CancelButton"]')
                || box.querySelector('[data-testid="modal-close-button"]');
    if (native) { native.click(); return; }
    // Find a button with close-text inside the modal, ignoring our own buttons
    const closeByText = [...box.querySelectorAll('button')].find(b => {
      if (b.id?.startsWith('vmu-') || b.classList.contains('vmu-clear-native')) return false;
      const t = (b.textContent || '').trim().toLowerCase();
      return t === 'закрыть' || t === 'отмена' || t === 'close' || t === 'cancel';
    });
    if (closeByText) { closeByText.click(); return; }
    // Escape fallback
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
    // Last resort — hide the whole popout (dim overlay included), not just the box
    const popup = box.closest('[class*="vkuiPopoutWrapper__host"], .popup_box_container, [class*="vkitModalPage"]') || box;
    popup.style.display = 'none';
  }

  // Auto-scroll the audios page to load every row and harvest tracks. Reads
  // `data-vmu-track` stamps set by injected.js' markRowTrackData — content.js
  // can't reach React fiber from the isolated world, but the data attribute
  // bridges that gap. Triggers VKD_MARK_ROWS each iteration so freshly mounted
  // rows are stamped before we read them. Rows inside the upload dialog are
  // explicitly skipped — that dialog has no audio rows on the audios page but
  // sometimes shadows the row selector if it stays open.
  // limit = null → full page until lazy-load stops yielding more rows
  // limit = N    → stop after collecting N tracks (no scrolling beyond what
  //                is already loaded; the page renders ~100 rows on open)
  // Scope to the "Треки" section specifically. The /audios overview page
  // also renders "Недавно прослушанные" and other preview widgets using
  // the exact same MusicTrackRow markup — scanning the whole document
  // pulled those in as false "already on the page" matches. Falls back to
  // the whole document on markups where this section isn't present.
  // VK renamed the testid from AudioCatalog_SectionTracks to
  // AudioCatalog_BlockMusicAudiosList; keep both so either markup works.
  // Shared by harvestPageTracks (full scan) and scrollPageToTrackId
  // (on-demand click-to-jump scroll).
  function getPageScanRoot() {
    return document.querySelector(
      '[data-testid="AudioCatalog_BlockMusicAudiosList"], [data-testid="AudioCatalog_SectionTracks"]'
    ) || document;
  }

  // Finds VK's real scrollable container for the audios page. Shared by
  // harvestPageTracks (full scan) and scrollPageToTrackId (on-demand
  // click-to-jump scroll) — both need to drive VK's lazy-loader.
  function findPageScroller() {
    const candidates = [...document.querySelectorAll('*')].filter(el => {
      // Exclude our own injected UI (results panel from a previous check,
      // settings/EQ panels, toasts, ...). A leftover scrollable panel like
      // #vmu-check-panel's track list sorts earlier in document order than
      // VK's real scroller, so it used to get picked here — the scroll dance
      // below then scrolled OUR panel instead of the page, and VK's
      // lazy-loader never fired past the first batch (page pagination
      // appeared "broken" whenever a previous check panel was still open).
      if (el.closest('[id^="vmu-"], [class*="vmu-"]')) return false;
      const cs = getComputedStyle(el);
      return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10;
    });
    return candidates[0] || document.scrollingElement;
  }

  // Looks up an already-mounted page row for trackId without scrolling.
  // Shared by focusPageRowByTrackId's fast path and scrollPageToTrackId's
  // per-iteration check.
  function findPageRowByTrackId(trackId, scanRoot) {
    const rows = (scanRoot || getPageScanRoot()).querySelectorAll('[data-vmu-track]');
    for (const row of rows) {
      const fastId = row.dataset?.vmuId;
      if (fastId && fastId !== trackId) continue;
      try {
        const t = JSON.parse(row.dataset.vmuTrack);
        if (t?.id === trackId) return row;
      } catch {}
    }
    return null;
  }

  // On-demand click-to-jump: harvestPageTracks (below) already mounts every
  // row during its own full scan, so most clicks find their row instantly
  // via the fast path above. This is the fallback for the rest — a reopened
  // panel, a row that got virtualized back out, etc. Drives the same "wake
  // VK's lazy-loader" scroll dance harvestPageTracks uses, but stops the
  // moment the target row shows up instead of walking the whole page.
  async function scrollPageToTrackId(trackId, onProgress) {
    const scanRoot = getPageScanRoot();
    let row = findPageRowByTrackId(trackId, scanRoot);
    if (row) return row;

    const sc = findPageScroller();
    const initialTop = sc ? sc.scrollTop : 0;

    const MAX_ITER = 120;
    const STABLE_LIMIT = 15;
    let stable = 0, lastHeight = sc ? sc.scrollHeight : 0;

    for (let i = 0; i < MAX_ITER && stable < STABLE_LIMIT; i++) {
      if (onProgress) onProgress(i);
      if (sc) {
        if (i % 3 === 2) {
          sc.scrollTop = Math.max(0, sc.scrollHeight - sc.clientHeight - 1000);
          await sleep(120);
        }
        sc.scrollTop = sc.scrollHeight;
      }
      await sleep(450);
      if (i % 4 === 3) {
        const rows = scanRoot.querySelectorAll('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"]');
        const lastRow = rows[rows.length - 1];
        if (lastRow) lastRow.scrollIntoView({ block: 'end' });
        await sleep(300);
      }
      await waitForMarkRows();
      row = findPageRowByTrackId(trackId, scanRoot);
      if (row) return row;
      const h = sc ? sc.scrollHeight : 0;
      if (h === lastHeight) stable++; else { stable = 0; lastHeight = h; }
    }

    // Not found even after the lazy-loader stopped yielding new rows —
    // restore where the user was instead of leaving them scrolled to the
    // bottom of the page for nothing.
    if (sc) sc.scrollTop = initialTop;
    return null;
  }

  async function harvestPageTracks(onProgress, limit) {
    const collected = new Map();
    const scanRoot = getPageScanRoot();

    function pull() {
      const uploadBox = getUploadDialog();
      const rows = scanRoot.querySelectorAll('[data-vmu-track]');
      for (const row of rows) {
        if (uploadBox && uploadBox.contains(row)) continue;
        // Fast path — same as expandPlaylistModal's harvest(): use the tiny
        // data-vmu-id attribute to short-circuit known rows without paying
        // for JSON.parse on every iteration.
        const fastId = row.dataset?.vmuId;
        if (fastId && collected.has(fastId)) {
          if (limit && collected.size >= limit) return;
          continue;
        }
        try {
          const t = JSON.parse(row.dataset.vmuTrack);
          if (t?.id && !collected.has(t.id)) collected.set(t.id, t);
          if (limit && collected.size >= limit) return;
        } catch {}
      }
    }

    const sc = findPageScroller();
    const initialTop = sc ? sc.scrollTop : 0;

    async function refreshStamps() {
      // Ask injected.js to (re-)stamp every newly-mounted audio row and
      // wait for its done-message instead of a fixed sleep. With the
      // :not([data-vmu-id]) filter in injected.js, this is now O(new rows)
      // rather than O(all rows), so the response comes back ~immediately
      // once the initial big batch is processed.
      await waitForMarkRows();
    }

    await refreshStamps();
    pull();
    if (onProgress) onProgress(collected.size);

    // Scroll-and-harvest loop. Stops on either:
    //   - limit reached
    //   - lazy-load is exhausted (stable count for 15 iterations)
    //
    // Plain `scrollTop = scrollHeight` triggers VK's lazy-load only for the
    // first few batches — measured live on a 684-row library, it plateaued
    // at ~340 rows. VK's IntersectionObserver seems to need *motion*, not
    // just being at the bottom. Mixing in a backwards scroll and a periodic
    // `scrollIntoView` on the last row keeps the observer firing all the way
    // to the end (verified live — full 684/684 with the same library).
    let stable = 0, last = collected.size;
    const MAX_ITER = 200;
    const STABLE_LIMIT = 15;
    for (let i = 0; i < MAX_ITER && stable < STABLE_LIMIT; i++) {
      if (limit && collected.size >= limit) break;
      if (sc) {
        // Every 3rd iter, jump up first so the next scroll-to-bottom registers
        // as fresh motion. This wakes lazy-load up after it plateaus.
        if (i % 3 === 2) {
          sc.scrollTop = Math.max(0, sc.scrollHeight - sc.clientHeight - 1000);
          await sleep(120);
        }
        sc.scrollTop = sc.scrollHeight;
      }
      await sleep(450);
      // Every 4th iter, ask the LAST currently-mounted row to scrollIntoView.
      // This pokes VK's bottom-sentinel even when scrollHeight already matches.
      if (i % 4 === 3) {
        const rows = scanRoot.querySelectorAll('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"]');
        const lastRow = rows[rows.length - 1];
        if (lastRow) lastRow.scrollIntoView({ block: 'end' });
        await sleep(300);
      }
      await refreshStamps();
      pull();
      if (onProgress) onProgress(collected.size);
      if (collected.size === last) stable++; else { stable = 0; last = collected.size; }
    }

    // Restore scroll position so the user lands where they were
    if (sc) sc.scrollTop = initialTop;

    // Honour the limit strictly — trim insertion-ordered Map to first N
    if (limit && collected.size > limit) {
      const trimmed = new Map();
      let n = 0;
      for (const [k, v] of collected) {
        if (n++ >= limit) break;
        trimmed.set(k, v);
      }
      return trimmed;
    }
    return collected;
  }

  async function runCheckMode(files) {
    if (checkModeRunning) return;
    checkModeRunning = true;
    try {
      // 1) parse names
      const entries = [];
      for (const f of files) {
        entries.push(await fileToCheckEntry(f));
      }

      // 2) close the upload modal
      closeUploadModal();
      await sleep(250);

      // Drop any results panel left over from a previous check run — besides
      // being stale, its scrollable track list would otherwise be a candidate
      // for findPageScroller() (used by harvestPageTracks below and by
      // scrollPageToTrackId's on-demand click-to-jump).
      document.getElementById('vmu-check-panel')?._vmuCleanup?.();
      document.getElementById('vmu-check-panel')?.remove();

      // 3) harvest tracks from the page (default: first 100; full page on demand)
      const limit = settings.checkFullPage ? null : 100;
      const limitTxt = limit ? ` / ${limit}` : '';
      showProgressToast(`Сверка: считываем треки страницы (0${limitTxt})…`, { kind: 'progress', id: 'vmu-check-toast' });
      const pageMap = await harvestPageTracks(n => {
        showProgressToast(`Сверка: считываем треки страницы (${n}${limitTxt})…`, { kind: 'progress', id: 'vmu-check-toast' });
      }, limit);
      const pageTracks = [...pageMap.values()];

      // 4) build lookup by normalized key, also track ids for click-to-jump
      const pageKeyToTrack = new Map();
      pageTracks.forEach((t, index) => {
        const k = normalizeKey(t.artist, t.title);
        if (!pageKeyToTrack.has(k)) pageKeyToTrack.set(k, { track: t, index });
      });

      const present = [];
      const missing = [];
      for (const e of entries) {
        const hit = pageKeyToTrack.get(e.key);
        if (hit) present.push({ ...e, match: hit.track, pageIndex: hit.index });
        else missing.push(e);
      }

      buildCheckResultPanel({ entries, present, missing, pageTracks });
      const doneEl = document.getElementById('vmu-check-toast');
      if (doneEl) doneEl.remove();
    } catch (err) {
      console.warn('[VMU CHECK]', err);
      showProgressToast(`Сверка не удалась: ${err.message}`, { kind: 'error', id: 'vmu-check-toast' });
    } finally {
      checkModeRunning = false;
    }
  }

  // Scroll the audios page to a row matching trackId and flash it. Used by
  // both minimap markers and clickable "present" list items. harvestPageTracks
  // mounts every row during the scan that produced these results, so this is
  // usually just the fast lookup below; scrollPageToTrackId is the fallback
  // for whatever wasn't (a reopened panel, a row virtualized back out).
  async function focusPageRowByTrackId(trackId) {
    // The row may already be mounted (user scrolled past it earlier, or VK
    // loaded it as part of the normal page render) but not yet stamped with
    // data-vmu-track — markRowTrackData only stamps on request. Ask for a
    // fresh stamp pass first so an already-there row is found instantly
    // instead of falling through to the scroll hunt for no reason.
    await waitForMarkRows();
    let target = findPageRowByTrackId(trackId);
    if (!target) {
      const toastId = 'vmu-jump-toast';
      showProgressToast('Ищем трек на странице…', { kind: 'progress', id: toastId });
      try {
        target = await scrollPageToTrackId(trackId, n => {
          showProgressToast(`Ищем трек на странице… (${n})`, { kind: 'progress', id: toastId });
        });
      } catch (e) {
        console.warn('[vmu] scrollPageToTrackId failed:', e.message);
      }
      if (!target) {
        showProgressToast('Трек не найден на странице', { kind: 'error', id: toastId });
        return;
      }
      document.getElementById(toastId)?.remove();
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('vmu-dupe-flash');
    void target.offsetWidth;
    target.classList.add('vmu-dupe-flash');
    setTimeout(() => target.classList.remove('vmu-dupe-flash'), 1400);
  }

  // Shared by bulk-ops (and could replace the reorder feature's inline copy,
  // left as-is since it's already proven live) — title-first matching, artist
  // only as a tiebreaker between rows sharing the same normalized title. See
  // applyPlaylistOrderFromEntries's comment: different sources format
  // multi-artist credits too differently for exact artist matching to work.
  function matchByTitleThenArtist(entries, candidates) {
    const wordsOf = s => normalizeNamePart(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const meta = candidates.map(c => ({ titleKey: normalizeNamePart(c.title), artistWords: new Set(wordsOf(c.artist)) }));
    const claimed = new Set();
    const matches = [];
    entries.forEach((en, ei) => {
      const titleKey = normalizeNamePart(en.title);
      const artistWords = wordsOf(en.artist);
      const cands = meta.map((m, i) => ({ m, i })).filter(({ m, i }) => !claimed.has(i) && m.titleKey === titleKey);
      if (!cands.length) return;
      let best = cands[0];
      if (cands.length > 1) {
        let bestScore = -1;
        for (const c of cands) {
          const score = artistWords.reduce((n, w) => n + (c.m.artistWords.has(w) ? 1 : 0), 0);
          if (score > bestScore) { bestScore = score; best = c; }
        }
      }
      claimed.add(best.i);
      matches.push({ entryIndex: ei, candidateIndex: best.i });
    });
    return matches;
  }

  // This group's own uploads all carry a trailing "[vk.com/reuploadunder]"-
  // style watermark that neither Genius nor local files know about — syncing
  // title verbatim from either source would silently strip it. Reappend the
  // current title's trailing bracket tag onto the new title unless the new
  // title already ends with one of its own.
  function preserveBracketTag(oldTitle, newTitle) {
    const m = (oldTitle || '').match(/\s*(\[[^\]]*\])\s*$/);
    if (!m) return newTitle;
    if (/\]\s*$/.test((newTitle || '').trim())) return newTitle;
    return `${newTitle} ${m[1]}`;
  }

  // Genius annotates every non-English name/title with a parenthesized
  // English transliteration right after it — "Слава КПСС (Slava KPSS)",
  // "ЗАМАЙ (ZAMAY) & Слава КПСС (Slava KPSS)", "Двуглавый орёл (Double-headed
  // Eagle)" — useful for their own search, not something that belongs in a
  // VK title/artist field when synced. Strips every "(...)" group, not just
  // a trailing one (artist strings can have one per name).
  function stripGeniusTranslation(s) {
    return String(s || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  }

  // Makes a fixed-position panel draggable by a handle inside it (its header,
  // typically) — pointer events so mouse and touch both work with one
  // listener set. Switches the panel from whatever positioning it started
  // with (e.g. `right`-anchored) to an explicit left/top pair on first drag,
  // clamped so it can't be dragged fully off-screen. A click on a button/link
  // inside the handle (the panel's own close button) starts no drag.
  function makePanelDraggable(panel, handle) {
    let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button, a, input')) return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      startLeft = r.left; startTop = r.top;
      startX = e.clientX; startY = e.clientY;
      panel.style.left = startLeft + 'px';
      panel.style.top = startTop + 'px';
      panel.style.right = 'auto';
      // Marks the panel as manually placed so any auto-repositioning logic
      // elsewhere (e.g. positionAudioFxUI/positionCheckPanel reacting to
      // resize or reopen) can skip and leave the user's placement alone.
      panel.dataset.vmuUserMoved = '1';
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('vmu-dragging');
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      const maxLeft = Math.max(0, window.innerWidth - 60);
      const maxTop = Math.max(0, window.innerHeight - 40);
      panel.style.left = Math.min(Math.max(0, startLeft + dx), maxLeft) + 'px';
      panel.style.top = Math.min(Math.max(0, startTop + dy), maxTop) + 'px';
    });
    const stopDrag = e => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('vmu-dragging');
      try { handle.releasePointerCapture(e.pointerId); } catch {}
    };
    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);
  }

  // Inline "are you sure" step for a mass edit/delete apply button — swaps
  // the button out for a message + Да/Отмена pair in place, rather than a
  // native confirm() (blockable, and looks out of place next to the rest of
  // the panel). Resolves true only on an explicit "Да" click; restores the
  // trigger button either way.
  function vmuConfirmBulkAction(actionsEl, triggerBtn, message, confirmLabel) {
    return new Promise(resolve => {
      triggerBtn.style.display = 'none';
      const bar = document.createElement('div');
      bar.className = 'vmu-bulk-confirm';
      bar.innerHTML = `
        <span class="vmu-bulk-confirm-msg">${escHtml(message)}</span>
        <button type="button" class="vmu-bulk-confirm-yes">${escHtml(confirmLabel)}</button>
        <button type="button" class="vmu-bulk-confirm-no">Отмена</button>
      `;
      actionsEl.appendChild(bar);
      const cleanup = ok => {
        bar.remove();
        triggerBtn.style.display = '';
        resolve(ok);
      };
      bar.querySelector('.vmu-bulk-confirm-yes').addEventListener('click', () => cleanup(true));
      bar.querySelector('.vmu-bulk-confirm-no').addEventListener('click', () => cleanup(false));
    });
  }

  // Standalone panel — doesn't need a prior "Проверка" file-drop scan.
  // Triggered from the floating button injected by injectBulkOpsButton()
  // (present on any audios page). Scans the page itself the moment it opens.
  let _bulkOpsCancelled = false;
  async function openBulkOpsPanel() {
    const oldPanel = document.getElementById('vmu-bulkops-panel');
    oldPanel?._vmuCleanup?.();
    oldPanel?.remove();
    _bulkOpsCancelled = false;

    const panel = document.createElement('div');
    panel.id = 'vmu-bulkops-panel';
    panel.className = 'vmu-bulkops-panel';
    panel.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Массовые операции</span>
        <button type="button" class="vmu-check-close" id="vmu-bulkops-close" title="Закрыть">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body">
        <div class="vmu-bulkops-scan-status">Сканируем страницу…</div>
      </div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('#vmu-bulkops-close').addEventListener('click', () => {
      _bulkOpsCancelled = true;
      panel._vmuCleanup?.();
      panel.remove();
    });
    makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));

    const bodyEl = panel.querySelector('.vmu-bulkops-body');
    const statusEl = panel.querySelector('.vmu-bulkops-scan-status');
    // Always the whole page here, regardless of the "Проверка" full-page
    // setting — a bulk operation that silently only considered the first 100
    // of e.g. 983 tracks looks exactly like "didn't process all the tracks".
    const pageMap = await harvestPageTracks(n => {
      if (statusEl.isConnected) statusEl.textContent = `Сканируем страницу… (${n})`;
    }, null);
    if (_bulkOpsCancelled) return;

    const pageTracks = [...pageMap.values()];
    bodyEl.innerHTML = `<div class="vmu-bulkops-scan-status">Треков на странице: ${pageTracks.length}</div>`;
    buildDupesCleanupSection(bodyEl, pageTracks, panel);
    buildBulkOpsSection(bodyEl, { pageTracks, entries: [] });
  }

  // Small floating "are you sure" popup anchored under the mass-ops button —
  // the panel it opens can rename or delete a lot of tracks in one go, so a
  // stray click on the button shouldn't drop straight into it. Custom-styled
  // (not native confirm(), same reasoning as vmuConfirmBulkAction) so it
  // looks like part of the extension instead of a browser dialog.
  function vmuConfirmMassOpsLaunch(anchorBtn) {
    return new Promise(resolve => {
      document.getElementById('vmu-massop-confirm')?.remove();
      const rect = anchorBtn.getBoundingClientRect();
      const pop = document.createElement('div');
      pop.id = 'vmu-massop-confirm';
      pop.className = 'vmu-massop-confirm';
      pop.style.top = `${rect.bottom + 8}px`;
      pop.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
      pop.innerHTML = `
        <div class="vmu-massop-confirm-msg">Открыть массовые операции? Там можно разом переименовать или удалить много треков.</div>
        <div class="vmu-massop-confirm-actions">
          <button type="button" class="vmu-massop-confirm-no">Отмена</button>
          <button type="button" class="vmu-massop-confirm-yes">Да, открыть</button>
        </div>
      `;
      document.body.appendChild(pop);

      const cleanup = ok => {
        document.removeEventListener('mousedown', onOutside, true);
        document.removeEventListener('keydown', onKey, true);
        pop.remove();
        resolve(ok);
      };
      const onOutside = e => {
        if (pop.contains(e.target) || e.target === anchorBtn) return;
        cleanup(false);
      };
      const onKey = e => { if (e.key === 'Escape') cleanup(false); };
      pop.querySelector('.vmu-massop-confirm-yes').addEventListener('click', () => cleanup(true));
      pop.querySelector('.vmu-massop-confirm-no').addEventListener('click', () => cleanup(false));
      document.addEventListener('mousedown', onOutside, true);
      document.addEventListener('keydown', onKey, true);
    });
  }

  // Real button, inserted as a sibling into VK's own button group next to
  // "Загрузить аудиозапись" (not a clone of VK's node — appending a fresh
  // element into a container React already owns is the same safe pattern
  // injectSingleDlBtn already uses elsewhere; cloning/mutating VK's own node
  // risks React's reconciliation fighting us on the next re-render).
  // Copies the upload button's OWN inline size (width/height/min-width/
  // min-height — VK sets these directly on the element, not via the shared
  // className our clones already copy) so a smaller icon glyph (16/20px vs
  // VK's own 24px) still centers inside the same box height instead of the
  // button shrinking to fit it — verified live: without this, icon-button
  // midpoints were off by 2-4px against the native upload button.
  function matchNativeButtonBox(btn, referenceBtn) {
    const inlineStyle = referenceBtn.getAttribute('style');
    if (inlineStyle) btn.setAttribute('style', inlineStyle);
  }

  function injectBulkOpsButton() {
    if (document.getElementById('vmu-bulkops-btn')) return;
    const uploadBtn = document.querySelector('[data-testid="AudioCatalogUploadAudioAction"]');
    const group = uploadBtn?.parentElement;
    if (!group) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'vmu-bulkops-btn';
    btn.className = uploadBtn.className;
    matchNativeButtonBox(btn, uploadBtn);
    btn.setAttribute('aria-label', 'Массовые операции');
    // Native title swapped for the same custom vkit-style bubble the other
    // toolbar-injected buttons (.vmu-audiofx-btn) use — see showDlTooltip's
    // isNewVk check — so it looks like one of VK's own tooltips instead of
    // the browser's default one.
    btn.setAttribute('data-vmu-tip', 'Массовые операции');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h14M3 10h10M3 14h6"/></svg>`;
    btn.addEventListener('mouseenter', () => showDlTooltip(btn));
    btn.addEventListener('mouseleave', hideDlTooltip);
    btn.addEventListener('click', async () => {
      hideDlTooltip();
      if (document.getElementById('vmu-massop-confirm')) return;
      const confirmed = await vmuConfirmMassOpsLaunch(btn);
      if (confirmed) openBulkOpsPanel();
    });
    group.insertBefore(btn, uploadBtn);
  }

  // Settings and SoundCloud-download were previously only reachable from
  // inside VK's own upload dialog (its header gear/SC icons). These toolbar
  // buttons sit right next to the catalog's own upload button instead, one
  // click away, and open their own standalone draggable modals (toggleSettings
  // / toggleSoundCloud) — no upload dialog involved at all anymore.
  function injectToolbarSettingsButtons() {
    if (document.getElementById('vmu-toolbar-settings-btn')) return;
    const uploadBtn = document.querySelector('[data-testid="AudioCatalogUploadAudioAction"]');
    const group = uploadBtn?.parentElement;
    if (!group) return;
    const gearBtn = document.createElement('button');
    gearBtn.type = 'button';
    gearBtn.id = 'vmu-toolbar-settings-btn';
    gearBtn.className = uploadBtn.className;
    matchNativeButtonBox(gearBtn, uploadBtn);
    gearBtn.setAttribute('aria-label', 'Настройки');
    gearBtn.setAttribute('data-vmu-tip', 'Настройки');
    gearBtn.innerHTML = ICON_SETTINGS;
    gearBtn.addEventListener('mouseenter', () => showDlTooltip(gearBtn));
    gearBtn.addEventListener('mouseleave', hideDlTooltip);
    gearBtn.addEventListener('click', () => { hideDlTooltip(); toggleSettings(); });
    group.insertBefore(gearBtn, uploadBtn);

    const scBtn = document.createElement('button');
    scBtn.type = 'button';
    scBtn.id = 'vmu-toolbar-sc-btn';
    scBtn.className = uploadBtn.className;
    matchNativeButtonBox(scBtn, uploadBtn);
    scBtn.setAttribute('aria-label', 'Скачать с SoundCloud');
    scBtn.setAttribute('data-vmu-tip', 'Скачать с SoundCloud');
    scBtn.innerHTML = ICON_SOUNDCLOUD;
    scBtn.addEventListener('mouseenter', () => showDlTooltip(scBtn));
    scBtn.addEventListener('mouseleave', hideDlTooltip);
    scBtn.addEventListener('click', () => { hideDlTooltip(); toggleSoundCloud(); });
    group.insertBefore(scBtn, gearBtn);
  }

  function injectCatalogToolbarButtons() {
    injectBulkOpsButton();
    injectToolbarSettingsButtons();
  }
  new MutationObserver(() => injectCatalogToolbarButtons()).observe(document.body, { childList: true, subtree: true });
  injectCatalogToolbarButtons();

  function buildBulkOpsSection(list, { pageTracks, entries }) {
    const wrap = document.createElement('div');
    wrap.className = 'vmu-bulk-ops';
    wrap.innerHTML = `
      <div class="vmu-rename-block">
        <span class="vmu-rename-block-label">Источник</span>
        <div class="vmu-mode-switch" id="vmu-bulk-source-switch" role="tablist">
          <button type="button" data-src="files" class="active">Файлы</button>
          <button type="button" data-src="genius">Genius</button>
        </div>
      </div>
      <div id="vmu-bulk-files-block">
        <div id="vmu-bulk-files-dz" class="vmu-pl-sort-dz">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9M6.5 6.5L10 3l3.5 3.5"/><path d="M4 13.5v1.5A1.5 1.5 0 0 0 5.5 16.5h9a1.5 1.5 0 0 0 1.5-1.5v-1.5"/></svg>
          <span class="vmu-pl-sort-dz-hint">Перетащи MP3 сюда</span>
          <label class="vmu-pick-btn">
            ${ICON_UPLOAD}
            Выбрать файлы
            <input type="file" id="vmu-bulk-files-input" class="vmu-pl-sort-input" accept=".mp3,audio/mpeg" multiple>
          </label>
        </div>
      </div>
      <div id="vmu-bulk-genius-block" style="display:none">
        <div class="vmu-pl-genius-searchrow">
          <input type="text" id="vmu-bulk-genius-q" class="vmu-pl-genius-input" placeholder="Исполнитель альбом, или ссылка genius.com/albums/...">
          <button type="button" id="vmu-bulk-genius-go" class="vmu-pick-btn">Искать</button>
        </div>
        <div id="vmu-bulk-genius-results" class="vmu-pl-genius-results"></div>
      </div>
      <div class="vmu-rename-block">
        <span class="vmu-rename-block-label">Синхронизировать</span>
        <div class="vmu-rename-checks">
          <label class="vmu-rename-check">
            <input type="checkbox" id="vmu-bulk-op-artist" checked>
            <span>Исполнителя</span>
          </label>
          <label class="vmu-rename-check">
            <input type="checkbox" id="vmu-bulk-op-title">
            <span>Название</span>
          </label>
        </div>
      </div>
      <div class="vmu-bulk-source-hint" id="vmu-bulk-source-hint"></div>
      <div class="vmu-rename-actions">
        <button type="button" id="vmu-bulk-preview-btn" class="vmu-rename-preview-btn" disabled>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.3"/></svg>
          Показать превью
        </button>
        <button type="button" id="vmu-bulk-cleanup-btn" class="vmu-rename-cleanup-btn" title="Очистить «(транскрипцию)» в скобках у уже переименованных треков">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13.7 3.5a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L9.2 16H4v-5.2L13.7 3.5z"/><path d="M7 16h9M11.2 5.5l4.3 4.3"/></svg>
          Скобки
        </button>
      </div>
      <div id="vmu-bulk-preview"></div>
    `;
    list.appendChild(wrap);

    let sourceEntries = entries.length ? entries : null;
    let sourceLabel = 'файлы';
    const hintEl = wrap.querySelector('#vmu-bulk-source-hint');
    const previewBtn = wrap.querySelector('#vmu-bulk-preview-btn');
    const previewHost = wrap.querySelector('#vmu-bulk-preview');

    function updateHint() {
      previewHost.innerHTML = '';
      if (!sourceEntries || !sourceEntries.length) {
        hintEl.textContent = 'Источник не выбран';
        previewBtn.disabled = true;
        return;
      }
      hintEl.textContent = `${sourceLabel}: ${sourceEntries.length} записей`;
      previewBtn.disabled = false;
    }
    updateHint();

    wrap.querySelector('#vmu-bulk-source-switch').addEventListener('click', e => {
      const btn = e.target.closest('button[data-src]');
      if (!btn) return;
      wrap.querySelectorAll('#vmu-bulk-source-switch button').forEach(b => b.classList.toggle('active', b === btn));
      const isGenius = btn.dataset.src === 'genius';
      wrap.querySelector('#vmu-bulk-genius-block').style.display = isGenius ? '' : 'none';
      wrap.querySelector('#vmu-bulk-files-block').style.display = isGenius ? 'none' : '';
      if (!isGenius) { sourceEntries = entries.length ? entries : null; sourceLabel = 'файлы'; }
      else { sourceEntries = null; sourceLabel = 'Genius'; }
      updateHint();
    });

    const filesDz = wrap.querySelector('#vmu-bulk-files-dz');
    const filesInput = wrap.querySelector('#vmu-bulk-files-input');
    const handleBulkFiles = async files => {
      const mp3s = [...files].filter(isMP3);
      if (!mp3s.length) return;
      const parsed = [];
      for (const f of mp3s) parsed.push(await fileToCheckEntry(f));
      sourceEntries = parsed;
      sourceLabel = 'файлы';
      updateHint();
    };
    filesDz.addEventListener('dragover', e => { e.preventDefault(); filesDz.classList.add('vmu-over'); });
    filesDz.addEventListener('dragleave', e => { if (!filesDz.contains(e.relatedTarget)) filesDz.classList.remove('vmu-over'); });
    filesDz.addEventListener('drop', e => {
      e.preventDefault();
      filesDz.classList.remove('vmu-over');
      handleBulkFiles(e.dataTransfer?.files || []);
    });
    filesInput.addEventListener('change', () => { handleBulkFiles(filesInput.files); filesInput.value = ''; });

    const gInput = wrap.querySelector('#vmu-bulk-genius-q');
    const gResults = wrap.querySelector('#vmu-bulk-genius-results');
    const setGStatus = t => { gResults.innerHTML = t ? `<div class="vmu-pl-genius-status">${escHtml(t)}</div>` : ''; };
    const renderGResults = albums => {
      gResults.innerHTML = albums.map((a, i) => `
        <div class="vmu-pl-genius-result" data-idx="${i}">
          ${a.cover ? `<img src="${escHtml(a.cover)}" alt="">` : ''}
          <div class="vmu-pl-genius-result-info">
            <span class="vmu-pl-genius-result-name">${escHtml(a.name)}</span>
            <span class="vmu-pl-genius-result-meta">${escHtml(a.artist)}${a.release ? ' · ' + escHtml(a.release) : ''}</span>
          </div>
        </div>`).join('');
      gResults.querySelectorAll('.vmu-pl-genius-result').forEach(el => {
        el.addEventListener('click', async () => {
          const album = albums[Number(el.dataset.idx)];
          setGStatus('Подтягиваем треклист…');
          const res = await geniusMsg('VKD_GENIUS_TRACKS', { albumId: album.id, albumUrl: album.url });
          if (!res?.ok) { setGStatus(res?.error || 'ошибка'); return; }
          sourceEntries = res.tracks.map(t => ({ artist: stripGeniusTranslation(t.artist), title: stripGeniusTranslation(t.title) }));
          sourceLabel = 'Genius: ' + album.name;
          setGStatus(`Загружено ${sourceEntries.length} треков`);
          updateHint();
        });
      });
    };
    const runGSearch = async () => {
      const raw = gInput.value.trim();
      if (!raw) return;
      if (/^https?:\/\/(www\.)?genius\.com\/albums\//i.test(raw)) {
        setGStatus('Подтягиваем треклист…');
        const res = await geniusMsg('VKD_GENIUS_TRACKS', { albumUrl: raw });
        if (!res?.ok) { setGStatus(res?.error || 'ошибка'); return; }
        sourceEntries = res.tracks.map(t => ({ artist: stripGeniusTranslation(t.artist), title: stripGeniusTranslation(t.title) }));
        sourceLabel = 'Genius';
        setGStatus(`Загружено ${sourceEntries.length} треков`);
        updateHint();
        return;
      }
      setGStatus('Ищем на Genius…');
      const res = await geniusMsg('VKD_GENIUS_SEARCH', { query: raw });
      if (!res?.ok) { setGStatus(res?.error || 'ничего не найдено'); return; }
      renderGResults(res.albums);
    };
    wrap.querySelector('#vmu-bulk-genius-go').addEventListener('click', runGSearch);
    gInput.addEventListener('keydown', e => { if (e.key === 'Enter') runGSearch(); });

    previewBtn.addEventListener('click', () => {
      if (!sourceEntries || !sourceEntries.length) return;
      const opArtist = wrap.querySelector('#vmu-bulk-op-artist').checked;
      const opTitle = wrap.querySelector('#vmu-bulk-op-title').checked;
      if (!opArtist && !opTitle) { previewHost.innerHTML = '<div class="vmu-check-empty">Выбери хотя бы одну операцию</div>'; return; }

      const matches = matchByTitleThenArtist(sourceEntries, pageTracks);
      const changes = [];
      for (const { entryIndex, candidateIndex } of matches) {
        const en = sourceEntries[entryIndex];
        const tr = pageTracks[candidateIndex];
        const newArtist = opArtist ? en.artist : tr.artist;
        const newTitle = opTitle ? preserveBracketTag(tr.title, en.title) : tr.title;
        if (newArtist === tr.artist && newTitle === tr.title) continue;
        changes.push({ track: tr, oldArtist: tr.artist, oldTitle: tr.title, newArtist, newTitle });
      }

      if (!changes.length) {
        previewHost.innerHTML = `<div class="vmu-check-empty">Изменений нет (сопоставлено ${matches.length} из ${sourceEntries.length})</div>`;
        return;
      }

      renderQueue(changes);
    });

    // Self-referential cleanup: no source needed, just strips leftover
    // Genius-style "(English transcription)" parens from whatever pageTracks
    // already have — for tracks a bulk sync applied before this stripping
    // existed. [vk.com/...] uses square brackets, untouched by this.
    wrap.querySelector('#vmu-bulk-cleanup-btn').addEventListener('click', () => {
      const changes = [];
      for (const tr of pageTracks) {
        const newArtist = stripGeniusTranslation(tr.artist);
        const newTitle = stripGeniusTranslation(tr.title);
        if (newArtist === tr.artist && newTitle === tr.title) continue;
        changes.push({ track: tr, oldArtist: tr.artist, oldTitle: tr.title, newArtist, newTitle });
      }
      if (!changes.length) {
        previewHost.innerHTML = '<div class="vmu-check-empty">Скобок с транскрипцией не найдено</div>';
        return;
      }
      renderQueue(changes);
    });

    // Renders the change list as a real queue: every row gets a live status
    // (waiting → applying → done/error) as VKD_BULK_EDIT_PROGRESS comes in,
    // per item — not just an aggregate "N ok / M failed" toast, so it's
    // obvious which specific tracks need a retry rather than a vague "some
    // didn't go through". "Применить" only (re-)sends rows still pending or
    // errored — already-done rows are left alone, so a retry after a partial
    // run doesn't redo work that already succeeded.
    function renderQueue(changes) {
      previewHost.innerHTML = `
        <div class="vmu-bulk-preview-summary" id="vmu-bulk-summary">Изменится: ${changes.length}</div>
        <div class="vmu-bulk-preview-list" id="vmu-bulk-preview-list">
          ${changes.map((c, i) => `
            <div class="vmu-bulk-preview-item" data-idx="${i}" data-status="pending">
              <span class="vmu-bulk-status-dot" title="В очереди"></span>
              <div class="vmu-bulk-preview-text">
                <div class="vmu-bulk-preview-old">${escHtml(c.oldArtist)} — ${escHtml(c.oldTitle)}</div>
                <div class="vmu-bulk-preview-new">${escHtml(c.newArtist)} — ${escHtml(c.newTitle)}</div>
              </div>
            </div>`).join('')}
        </div>
        <div class="vmu-bulk-preview-actions">
          <button type="button" id="vmu-bulk-apply-btn" class="vmu-pick-btn">Применить (${changes.length})</button>
        </div>
      `;
      const listEl = previewHost.querySelector('#vmu-bulk-preview-list');
      const summaryEl = previewHost.querySelector('#vmu-bulk-summary');
      const applyBtn = previewHost.querySelector('#vmu-bulk-apply-btn');

      const setRowStatus = (i, status, title) => {
        const row = listEl.querySelector(`[data-idx="${i}"]`);
        if (!row) return;
        row.dataset.status = status;
        const dot = row.querySelector('.vmu-bulk-status-dot');
        if (title) dot.title = title;
      };

      applyBtn.addEventListener('click', async () => {
        const pending = changes
          .map((c, i) => ({ c, i }))
          .filter(({ i }) => listEl.querySelector(`[data-idx="${i}"]`)?.dataset.status !== 'done');
        if (!pending.length) return;

        const actionsEl = previewHost.querySelector('.vmu-bulk-preview-actions');
        const confirmed = await vmuConfirmBulkAction(
          actionsEl, applyBtn,
          'Точно начать? Изменения уйдут в ВК сразу, без предпросмотра результата.',
          'Да, применить'
        );
        if (!confirmed) return;

        // ownerId is per track, not shared for the whole batch — a group's
        // own "Треки" listing mixes tracks it actually owns with ones added
        // from other owners, and audio.edit needs the correct pairing per item.
        const edits = [];
        const editIdxMap = [];
        for (const { c, i } of pending) {
          const parts = String(c.track.id).split('_');
          if (parts.length < 2) continue;
          edits.push({ ownerId: parts[0], audioId: Number(parts[1]), artist: c.newArtist, title: c.newTitle });
          editIdxMap.push(i);
          setRowStatus(i, 'pending', 'В очереди');
        }
        if (!edits.length) { showToast('Не удалось определить owner_id/audio_id', true); return; }

        applyBtn.disabled = true;
        applyBtn.textContent = `Применяем 0/${edits.length}…`;

        const onProgress = e => {
          if (e.source !== window || e.data?.type !== 'VKD_BULK_EDIT_PROGRESS') return;
          applyBtn.textContent = `Применяем ${e.data.done}/${e.data.total}…`;
          const rowIdx = editIdxMap[e.data.index];
          if (rowIdx != null) setRowStatus(rowIdx, e.data.itemOk ? 'done' : 'error', e.data.itemOk ? 'Готово' : (e.data.error || 'Ошибка'));
        };
        window.addEventListener('message', onProgress);

        const done = new Promise(resolve => {
          const h = e => {
            if (e.source !== window || e.data?.type !== 'VKD_BULK_EDIT_DONE') return;
            window.removeEventListener('message', h);
            resolve(e.data);
          };
          window.addEventListener('message', h);
        });
        window.postMessage({ type: 'VKD_BULK_EDIT', edits }, '*');
        const result = await done;
        window.removeEventListener('message', onProgress);

        const failCount = listEl.querySelectorAll('[data-status="error"]').length;
        if (result.ok) {
          summaryEl.textContent = failCount
            ? `Применено: ${changes.length - failCount} из ${changes.length}, ошибок: ${failCount}`
            : `Готово: применено ${changes.length} из ${changes.length}`;
        } else {
          summaryEl.textContent = 'Ошибка запроса: ' + (result.error || '?');
        }
        applyBtn.disabled = false;
        applyBtn.textContent = failCount ? `Повторить неудачные (${failCount})` : `Применить (${changes.length})`;
        if (!failCount) applyBtn.style.display = 'none';
      });
    }
  }

  // Reuses findDuplicatesAndBlocked (same detection as the playlist dupe/
  // blocked scanner) against the page-wide harvest. Presentation mirrors
  // buildIssuePanel's grouped list (label + all positions per duplicate set,
  // not one flat row per track) since that's clearer than a flat list once
  // there are more than a couple of duplicate pairs — same reason it already
  // looks better for playlists. Duplicate groups keep their first
  // occurrence; only later copies (and blocked tracks) are queued for
  // removal via bulkDeleteTracks (audio.delete).
  function buildDupesCleanupSection(list, pageTracks, panel) {
    const wrap = document.createElement('div');
    wrap.className = 'vmu-cleanup';
    list.appendChild(wrap);

    // Persistent amber/red highlight directly on the page — same treatment
    // scanForDuplicates already gives the playlist popup. harvestPageTracks
    // already mounted every row by the time this runs, but reapplying on
    // mutation is cheap insurance against anything that mounts later (a
    // manual scroll, VK re-rendering a section) — torn down when the panel
    // closes (wired through panel._vmuCleanup below).
    function watchPageHighlights(dupes, blockedIndices) {
      // Newly-mounted rows aren't stamped with data-vmu-track until asked —
      // request a fresh stamp pass before each reapply so rows VK just added
      // actually pick up the highlight instead of waiting for some later,
      // unrelated stamp trigger.
      const reapply = async () => {
        await waitForMarkRows();
        if (dupes.length) highlightDuplicateTracks(dupes);
        if (blockedIndices.length) highlightBlockedTracks(pageTracks, blockedIndices);
      };
      reapply();
      let scheduled = false;
      const mo = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; reapply(); });
      });
      mo.observe(getPageScanRoot(), { childList: true, subtree: true });
      return () => {
        mo.disconnect();
        document.querySelectorAll('.vmu-dupe-highlight, .vmu-blocked-highlight').forEach(el => {
          el.classList.remove('vmu-dupe-highlight');
          el.classList.remove('vmu-blocked-highlight');
        });
      };
    }

    function render() {
      panel._vmuCleanup?.();
      panel._vmuCleanup = null;

      const { dupes, dupeGroups, blockedIndices } = findDuplicatesAndBlocked(pageTracks);

      if (!dupes.length && !blockedIndices.length) {
        wrap.innerHTML = `<div class="vmu-bulkops-scan-status">Дубликатов и заблокированных не найдено</div>`;
        return;
      }

      // Same removal set as before — first occurrence of each duplicate
      // group is kept, the rest (plus every blocked track) are queued.
      const toRemove = new Map();
      for (const d of dupes) {
        if (!d.track?.id) continue;
        toRemove.set(d.track.id, d.track);
      }
      for (const i of blockedIndices) {
        const t = pageTracks[i];
        if (t?.id) toRemove.set(t.id, t);
      }
      const removeItems = [...toRemove.values()];

      wrap.innerHTML = `
        <div class="vmu-cleanup-stats">
          ${blockedIndices.length ? `
            <span class="vmu-cleanup-stat vmu-cleanup-stat-blocked">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7.3"/><path d="M5.2 5.2l9.6 9.6" stroke-linecap="round"/></svg>
              ${blockedIndices.length} недоступно
            </span>` : ''}
          ${dupes.length ? `
            <span class="vmu-cleanup-stat vmu-cleanup-stat-dupes">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="10" rx="2"/><path d="M3 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/></svg>
              ${dupes.length} дублей
            </span>` : ''}
          <button class="vmu-cleanup-copy" type="button" title="Скопировать список">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="12" rx="2"/><path d="M3 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/></svg>
          </button>
        </div>
        <div class="vmu-cleanup-list" id="vmu-bulk-dupes-list"></div>
        <div class="vmu-cleanup-actions">
          <button type="button" id="vmu-bulk-dupes-apply-btn" class="vmu-cleanup-delete-btn">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6m2 0-.6 10.2a1.5 1.5 0 0 1-1.5 1.3H7.1a1.5 1.5 0 0 1-1.5-1.3L5 6"/></svg>
            <span class="vmu-cleanup-delete-btn-label">Удалить (${removeItems.length})</span>
          </button>
        </div>
      `;
      const listEl = wrap.querySelector('#vmu-bulk-dupes-list');
      const blockedLines = [];

      if (blockedIndices.length) {
        const sectionHead = document.createElement('div');
        sectionHead.className = 'vmu-cleanup-section-head is-blocked';
        sectionHead.innerHTML = `Недоступные <span class="vmu-cleanup-count-sub">· ${blockedIndices.length}</span>`;
        listEl.appendChild(sectionHead);
        const cards = document.createElement('div');
        cards.className = 'vmu-cleanup-cards';
        for (const idx of blockedIndices) {
          const t = pageTracks[idx] || {};
          const label = `${t.artist || ''}${t.artist ? ' — ' : ''}${t.title || ''}`.trim() || `Трек ${idx + 1}`;
          blockedLines.push(label);
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'vmu-cleanup-card';
          row.title = 'Перейти к треку · будет удалён';
          if (t.id) row.dataset.trackId = t.id;
          const rowText = document.createElement('span');
          rowText.className = 'vmu-cleanup-card-text';
          rowText.textContent = label;
          const tag = document.createElement('span');
          tag.className = 'vmu-cleanup-card-tag';
          tag.textContent = 'удалить';
          row.append(rowText, tag);
          row.addEventListener('click', () => { if (t.id) focusPageRowByTrackId(t.id); });
          cards.appendChild(row);
        }
        listEl.appendChild(cards);
      }

      if (dupeGroups.length) {
        const sectionHead = document.createElement('div');
        sectionHead.className = 'vmu-cleanup-section-head is-dupes';
        sectionHead.innerHTML = `Дубликаты <span class="vmu-cleanup-count-sub">· ${dupeGroups.length} ${dupeGroups.length === 1 ? 'группа' : 'групп'}</span>`;
        listEl.appendChild(sectionHead);
        const groupsWrap = document.createElement('div');
        groupsWrap.className = 'vmu-cleanup-cards';
        for (const g of dupeGroups) {
          const group = document.createElement('div');
          group.className = 'vmu-cleanup-group';

          const title = document.createElement('div');
          title.className = 'vmu-cleanup-group-head';
          title.title = g.label;
          const nameSpan = document.createElement('span');
          nameSpan.className = 'vmu-cleanup-group-name';
          nameSpan.textContent = g.label;
          const countSpan = document.createElement('span');
          countSpan.className = 'vmu-cleanup-group-count';
          countSpan.textContent = '×' + g.indices.length;
          title.append(nameSpan, countSpan);
          group.appendChild(title);

          const positions = document.createElement('div');
          positions.className = 'vmu-cleanup-positions';
          g.indices.forEach((idx, gi) => {
            const t = pageTracks[idx] || {};
            const kept = gi === 0;
            const pos = document.createElement('button');
            pos.type = 'button';
            pos.className = 'vmu-cleanup-pos ' + (kept ? 'vmu-cleanup-pos-kept' : 'vmu-cleanup-pos-remove');
            pos.textContent = `#${idx + 1}`;
            pos.title = kept ? `${g.label} · оригинал, останется` : `${g.label} · будет удалён`;
            if (!kept && t.id) pos.dataset.trackId = t.id;
            pos.addEventListener('click', () => { if (t.id) focusPageRowByTrackId(t.id); });
            positions.appendChild(pos);
          });
          group.appendChild(positions);
          groupsWrap.appendChild(group);
        }
        listEl.appendChild(groupsWrap);
      }

      const copyBtn = wrap.querySelector('.vmu-cleanup-copy');
      const copyText = blockedLines.length
        ? blockedLines.join('\n')
        : dupeGroups.map(g => `${g.label} (×${g.indices.length}: ${g.indices.map(i => '#' + (i + 1)).join(', ')})`).join('\n');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(copyText).then(() => {
          copyBtn.classList.add('vmu-cleanup-copy-ok');
          copyBtn.title = '✓ Скопировано';
          setTimeout(() => {
            if (!copyBtn.isConnected) return;
            copyBtn.classList.remove('vmu-cleanup-copy-ok');
            copyBtn.title = 'Скопировать список';
          }, 1400);
        }).catch(() => {});
      });

      const applyBtn = wrap.querySelector('#vmu-bulk-dupes-apply-btn');
      const applyBtnLabel = applyBtn.querySelector('.vmu-cleanup-delete-btn-label');
      const setItemStatus = (trackId, status, title) => {
        listEl.querySelectorAll(`[data-track-id="${trackId}"]`).forEach(el => {
          el.dataset.status = status;
          el.title = title;
        });
      };

      applyBtn.addEventListener('click', async () => {
        const pending = removeItems.filter(t => listEl.querySelector(`[data-track-id="${t.id}"]`)?.dataset.status !== 'done');
        if (!pending.length) return;

        const actionsEl = wrap.querySelector('.vmu-cleanup-actions');
        const confirmed = await vmuConfirmBulkAction(
          actionsEl, applyBtn,
          'Точно начать? Удаление из ВК необратимо.',
          'Да, удалить'
        );
        if (!confirmed) return;

        const toDelete = [];
        const idOfIndex = [];
        for (const t of pending) {
          const parts = String(t.id).split('_');
          if (parts.length < 2) continue;
          toDelete.push({ ownerId: parts[0], audioId: Number(parts[1]) });
          idOfIndex.push(t.id);
          setItemStatus(t.id, 'pending', 'В очереди');
        }
        if (!toDelete.length) { showToast('Не удалось определить owner_id/audio_id', true); return; }

        applyBtn.disabled = true;
        applyBtnLabel.textContent = `Удаляем 0/${toDelete.length}…`;

        const onProgress = e => {
          if (e.source !== window || e.data?.type !== 'VKD_BULK_DELETE_PROGRESS') return;
          applyBtnLabel.textContent = `Удаляем ${e.data.done}/${e.data.total}…`;
          const trackId = idOfIndex[e.data.index];
          if (trackId) setItemStatus(trackId, e.data.itemOk ? 'done' : 'error', e.data.itemOk ? 'Удалено' : (e.data.error || 'Ошибка'));
        };
        window.addEventListener('message', onProgress);

        const done = new Promise(resolve => {
          const h = e => {
            if (e.source !== window || e.data?.type !== 'VKD_BULK_DELETE_DONE') return;
            window.removeEventListener('message', h);
            resolve(e.data);
          };
          window.addEventListener('message', h);
        });
        window.postMessage({ type: 'VKD_BULK_DELETE', items: toDelete }, '*');
        const result = await done;
        window.removeEventListener('message', onProgress);

        if (!result.ok) {
          showToast('Ошибка запроса: ' + (result.error || '?'), true);
          applyBtn.disabled = false;
          applyBtnLabel.textContent = `Удалить (${pending.length})`;
          return;
        }

        const failCount = idOfIndex.filter(id => listEl.querySelector(`[data-track-id="${id}"]`)?.dataset.status === 'error').length;
        if (!failCount) {
          // Drop successfully-deleted tracks from pageTracks in place — the
          // rename section below shares this same array — then re-scan the
          // page-local dupe/blocked state fresh (groups can shift once
          // members are removed).
          const removedIds = new Set(idOfIndex);
          for (let k = pageTracks.length - 1; k >= 0; k--) {
            if (removedIds.has(pageTracks[k].id)) pageTracks.splice(k, 1);
          }
          render();
          return;
        }
        applyBtn.disabled = false;
        applyBtnLabel.textContent = `Повторить неудачные (${failCount})`;
      });

      panel._vmuCleanup = watchPageHighlights(dupes, blockedIndices);
    }

    render();
  }

  function buildCheckResultPanel({ entries, present, missing, pageTracks }) {
    document.getElementById('vmu-check-panel')?._vmuCleanup?.();
    document.getElementById('vmu-check-panel')?.remove();
    const pageCount = pageTracks.length;

    const panel = document.createElement('div');
    panel.id = 'vmu-check-panel';
    panel.className = 'vmu-check-panel';

    const head = document.createElement('div');
    head.className = 'vmu-check-head';
    head.innerHTML = `
      <div class="vmu-check-title-wrap">
        <span class="vmu-check-title">Сверка</span>
        <span class="vmu-check-subtitle">${entries.length} файлов · ${pageCount} на странице · найдено ${present.length}</span>
      </div>
      <div class="vmu-check-head-actions">
        <button class="vmu-check-close" type="button" title="Закрыть">${ICON_CLOSE}</button>
      </div>
    `;
    panel.appendChild(head);

    // Small copy-icon helper. Shows brief "Скопировано" feedback in title attr.
    const COPY_SVG = `<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="12" rx="2"/><path d="M3 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/></svg>`;
    function makeCopyBtn(getText, title) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vmu-check-section-copy';
      b.title = title;
      b.innerHTML = COPY_SVG;
      b.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const text = getText();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          const orig = b.title;
          b.title = '✓ Скопировано';
          b.classList.add('vmu-check-section-copy-ok');
          setTimeout(() => {
            if (!b.isConnected) return;
            b.title = orig;
            b.classList.remove('vmu-check-section-copy-ok');
          }, 1400);
        }).catch(() => {});
      });
      return b;
    }
    function joinArtistTitle(items, getter) {
      return items.map(it => {
        const x = getter ? getter(it) : it;
        return (x.artist ? x.artist + ' — ' : '') + (x.title || x.name || '');
      }).join('\n');
    }
    function uniqueArtists(items, getter) {
      const seen = new Set();
      const out = [];
      for (const it of items) {
        const x = getter ? getter(it) : it;
        const a = (x.artist || '').trim();
        if (!a) continue;
        const k = a.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(a);
      }
      return out.join('\n');
    }

    // Body: two columns — minimap strip on the left, scrollable list on the right
    const body = document.createElement('div');
    body.className = 'vmu-check-body';

    // ── minimap ──────────────────────────────────────────────────────────
    const mm = document.createElement('div');
    mm.className = 'vmu-check-mm';
    const mmInner = document.createElement('div');
    mmInner.className = 'vmu-check-mm-inner';
    mm.appendChild(mmInner);

    // Build a Set of page indexes that are "found"
    const foundIndices = new Set(present.map(p => p.pageIndex));
    const presentByIndex = new Map(present.map(p => [p.pageIndex, p]));

    for (let i = 0; i < pageTracks.length; i++) {
      const t = pageTracks[i];
      const isFound = foundIndices.has(i);
      const mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'vmu-check-marker' + (isFound ? ' vmu-check-marker-found' : '');
      mark.style.top = `${((i + 0.5) / Math.max(1, pageTracks.length)) * 100}%`;
      const label = `${i + 1}. ${(t.artist ? t.artist + ' — ' : '')}${t.title || ''}`.trim();
      mark.title = (isFound ? '✓ ' : '') + label;
      mark.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        if (t?.id) focusPageRowByTrackId(t.id);
      });
      mmInner.appendChild(mark);
    }
    body.appendChild(mm);

    // ── list column ──────────────────────────────────────────────────────
    const list = document.createElement('div');
    list.className = 'vmu-check-list';

    function section(title, cls, items, formatter, onClickItem, copyBtns) {
      const sh = document.createElement('div');
      sh.className = 'vmu-check-section-head ' + cls;
      const txt = document.createElement('span');
      txt.className = 'vmu-check-section-text';
      txt.textContent = `${title} · ${items.length}`;
      sh.appendChild(txt);
      if (copyBtns) for (const b of copyBtns) sh.appendChild(b);
      list.appendChild(sh);
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'vmu-check-empty';
        empty.textContent = '—';
        list.appendChild(empty);
        return;
      }
      for (const item of items) {
        const row = document.createElement(onClickItem ? 'button' : 'div');
        if (onClickItem) row.type = 'button';
        row.className = 'vmu-check-item ' + cls + '-item' + (onClickItem ? ' vmu-check-item-clickable' : '');
        row.innerHTML = formatter(item);
        if (onClickItem) {
          row.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            onClickItem(item);
          });
        }
        list.appendChild(row);
      }
    }

    section('Отсутствуют на странице', 'vmu-check-missing', missing, e => {
      const label = (e.artist ? escHtml(e.artist) + ' — ' : '') + escHtml(e.title || e.name);
      return `<span class="vmu-check-dot"></span><span class="vmu-check-item-text" title="${escHtml(e.name)}">${label}</span>`;
    }, null, [
      makeCopyBtn(() => joinArtistTitle(missing), 'Скопировать отсутствующие'),
    ]);

    section('Уже есть на странице', 'vmu-check-present', present, p => {
      const label = (p.artist ? escHtml(p.artist) + ' — ' : '') + escHtml(p.title || p.name);
      const pos = `<span class="vmu-check-pos">#${p.pageIndex + 1}</span>`;
      return `<span class="vmu-check-dot"></span><span class="vmu-check-item-text" title="${escHtml(p.name)}">${label}</span>${pos}`;
    }, p => focusPageRowByTrackId(p.match?.id), [
      makeCopyBtn(() => joinArtistTitle(present), 'Скопировать имеющиеся'),
    ]);

    // ── full page-track list (mini-menu like duplicate finder) ───────────
    section('Все треки страницы', 'vmu-check-all', pageTracks.map((t, i) => ({ t, i })), ({ t, i }) => {
      const label = (t.artist ? escHtml(t.artist) + ' — ' : '') + escHtml(t.title || '');
      const status = foundIndices.has(i) ? '<span class="vmu-check-tick">✓</span>' : '';
      return `<span class="vmu-check-num">#${i + 1}</span><span class="vmu-check-item-text" title="${escHtml(label)}">${label}</span>${status}`;
    }, ({ t }) => focusPageRowByTrackId(t.id), [
      makeCopyBtn(() => joinArtistTitle(pageTracks), 'Скопировать все треки (Artist — Title)'),
      (() => {
        const b = makeCopyBtn(() => uniqueArtists(pageTracks), 'Скопировать только артистов (уникальные)');
        b.classList.add('vmu-check-section-copy-alt');
        b.innerHTML = `<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></svg>`;
        return b;
      })(),
    ]);

    body.appendChild(list);
    panel.appendChild(body);
    document.body.appendChild(panel);
    makePanelDraggable(panel, head);

    positionCheckPanel();
    const onResize = () => positionCheckPanel();
    window.addEventListener('resize', onResize);
    panel._vmuCleanup = () => window.removeEventListener('resize', onResize);

    head.querySelector('.vmu-check-close').addEventListener('click', () => {
      panel._vmuCleanup();
      panel.remove();
    });
  }

  // ─── helpers to find VK's upload dialog (new and old VK) ────────────────────
  function getUploadDialog() {
    // Protected zombie: injected.js kept this element alive while our flag is
    // set. VK may have replaced the body with a success screen AND started a
    // close animation (display:none / opacity:0), so skip the width check —
    // armBoxVisibility will restore visibility on the next 300 ms tick.
    const zombie = document.querySelector('[class*="vkitInternalModalBox"][data-vmu-protected]');
    if (zombie) return zombie;
    // New VK: vkitInternalModalBox containing audio file input
    const newDlg = [...document.querySelectorAll('[class*="vkitInternalModalBox"]')]
      .find(m => m.getBoundingClientRect().width > 0 &&
                 (m.querySelector('input[accept*="audio"], input[accept*="mp3"]') ||
                  m.querySelector('[data-testid="UploadAudio_SelectFileButton"]')) &&
                 !isPlaylistDialog(m));
    if (newDlg) return newDlg;
    // Old VK fallback
    return document.querySelector('.audio_add_box') || null;
  }
  function getUploadDialogBody(box) {
    if (!box) return null;
    // vkitModalBody__container is gone (VK hashes it away with no semantic
    // trace now) and there's no data-testid replacement for the generic
    // middle section, so pick it positionally: the one child that isn't the
    // header or footer — mirrors the children-filter injectIntoVkDialog
    // already uses successfully for the main New-VK path.
    const header = box.querySelector('[data-testid="modalheader"]');
    const footer = box.querySelector('[data-testid="modalfooter"]');
    const mid = [...box.children].find(c => c !== header && c !== footer);
    return mid || box;
  }
  // The "create playlist" dialog contains its own audio upload input, so the
  // vkitInternalModalBox matcher above would grab it and injectIntoVkDialog
  // would wipe VK's playlist form (also breaking the auto-playlist flow).
  // Detect it by the playlist-name input in the surrounding dialog.
  function isPlaylistDialog(m) {
    let el = m;
    for (let i = 0; el && el !== document.body && el.id !== 'spa_layout_content' && i < 10; i++, el = el.parentElement) {
      if (el.querySelector?.('input[placeholder*="лейлист"]')) return true;
    }
    return false;
  }

  // ─── global drag & drop interceptor ──────────────────────────────────────────
  // VK's own upload dialog (.audio_add_box) overlays an invisible native drop
  // target on top of our embedded panel, so e.target during drop is VK's element,
  // not ours — `embedded.contains(e.target)` never matches. VK's handler then
  // grabs the dropped files into its native uploader (via the preserved vkInput
  // listeners), so tracks upload silently without ever reaching our queue/UI.
  // The actual interception (window-capture + preventDefault/stopImmediatePropagation,
  // matched by drop COORDINATES against our panel's bounding box) lives in
  // injector_early.js, which runs at document_start — before VK's own bundle
  // attaches its window-level drag/drop listeners, so ours fire first regardless
  // of same-node listener order. It forwards matches here via a custom event.
  window.addEventListener('vmu-files-dropped', e => {
    addFiles([...e.detail.files].filter(isMP3));
  });

  function setBlockAudioHide(block) {
    window.postMessage({ type: 'VMU_BLOCK_AUDIO_HIDE', block }, '*');
  }

  // Patches ID3 tags from the filename when Auto-metadata is on and either
  // artist or title is missing from the file's own tags. Returns the file
  // to actually upload (patched copy, or the original if nothing to do).
  async function prepareFileForUpload(item) {
    let file = item.file;
    if (settings.autoMeta) {
      const tags = item.tags || {};
      const artistSplit = splitTrailingTagJunk(tags.TPE1 || tags.TPE2);
      const titleSplit = splitTrailingTagJunk(tags.TIT2);
      const hasArtist = !!(tags.TPE1 || tags.TPE2) && !!artistSplit.core;
      const hasTitle = !!tags.TIT2 && !!titleSplit.core;
      if (!hasArtist || !hasTitle) {
        const parsed = parseMetaFromFilename(file.name);
        const artist = hasArtist ? (tags.TPE1 || tags.TPE2) : joinWithJunk(parsed.artist, artistSplit.junk);
        const title = hasTitle ? tags.TIT2 : joinWithJunk(parsed.title, titleSplit.junk);
        if (artist || title) {
          try { file = await patchID3(file, artist, title); } catch {}
        }
      }
    }
    return file;
  }

  // Whether the most recently sent batch actually went through VK's native
  // uploader (Upload.onFileApiSend) — set from VK_INJECT_FILES' response.
  // reloadAfterBatchIfNeeded uses this: native uploads update VK's own store
  // directly, so nothing needs to reload; the frozen/DOM-input fallbacks
  // don't, and still need the old reload-to-see-it workaround.
  let lastBatchNative = true;

  async function processQueue() {
    if (isProcessing) return;
    if (isPaused) return;
    const pending = fileQueue.filter(f => f.status === 'pending');
    console.log('[VMU QUEUE] processQueue: pending=', pending.length,
      'uploading=', fileQueue.filter(f => f.status === 'uploading').length,
      'done=', fileQueue.filter(f => f.status === 'done').length,
      'error=', fileQueue.filter(f => f.status === 'error').length,
      'batch=', pending.map(f => f.file.name));
    if (!pending.length) {
      renderQueue();
      if (fileQueue.length > 0 && !fileQueue.some(f => f.status === 'uploading')) {
        // Trigger auto-playlist if enabled (once per completed batch) — always
        // enqueued, never gated on !autoPlaylistRunning: that used to drop a
        // batch that completed while an earlier one's runAutoPlaylist was
        // still busy (see enqueueAutoPlaylist above) instead of giving it a
        // turn once the current one finishes.
        if (settings.autoPlaylist) {
          enqueueAutoPlaylist([...fileQueue], reloadAfterBatchIfNeeded);
        } else {
          reloadAfterBatchIfNeeded();
        }
      }
      return;
    }

    setBlockAudioHide(true);
    isProcessing = true;

    // Resolve (possibly ID3-patched) files for the whole batch up front,
    // then hand VK's native uploader every one of them in a single call —
    // it drives its own internal queue/progress for the batch now instead
    // of us feeding it one file at a time and waiting between each.
    const jobs = pending.map(item => ({ item, file: null, _finish: null }));
    for (const job of jobs) {
      job.file = await prepareFileForUpload(job.item);
      job.item.progress = 0;
      // Marked 'uploading' as soon as the batch is about to be sent — NOT
      // left 'pending' waiting for a per-file network signal. This whole
      // path is FROZEN (see NATIVE_HANDOFF_ONLY) precisely because that
      // signal turned out unreliable: VK's current transport isn't always
      // visible to our XHR/fetch interceptors, so a file could sit
      // uncorrelated forever. If it stayed 'pending', the top-of-function
      // `fileQueue.filter(f => f.status === 'pending')` would pick the same
      // stuck items back up on the very next loop iteration and resend the
      // whole batch again — verified live, this actually happened and
      // uploaded duplicate copies of the same tracks repeatedly. Marking
      // 'uploading' immediately removes them from that filter for good,
      // even if we never learn how the upload actually turned out.
      job.item.status = 'uploading';
    }
    renderQueue();

    // Register a settle function per file BEFORE sending anything, so a
    // very fast response can't race past having a callback registered —
    // matches each file's completion back to its row by filename (see
    // extractUploadFileName in injected.js), since several files can now
    // be in flight/pending together.
    const settled = jobs.map(job => new Promise(resolveSettled => {
      const { item, file } = job;
      let done = false;
      const finish = (outcome) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        uploadDoneCallbacks.delete(file.name);
        uploadingItemsByName.delete(file.name);
        resolveSettled({ item, ...outcome });
      };
      job._finish = finish;
      const timer = setTimeout(() => {
        console.log('[VMU UPLOAD] 90s timeout —', file.name);
        finish({ error: new Error('Timeout загрузки (90s)') });
      }, 90_000);
      uploadingItemsByName.set(file.name, item);
      uploadDoneCallbacks.set(file.name, data => {
        console.log('[VMU UPLOAD] VK_UPLOAD_DONE received:', file.name, 'aborted=', !!data.aborted, 'error=', !!data.error, 'errorMsg=', data.errorMsg, 'code=', data.errorCode, 'resp=', (data.response || '').slice(0, 100));
        if (data.aborted) { finish({ error: new Error('__ABORTED__') }); return; }
        if (data.error) {
          const e = new Error(data.errorMsg || 'Ошибка сети');
          e.vkCode = data.errorCode;
          finish({ error: e });
          return;
        }
        try {
          const r = JSON.parse(data.response);
          if (r.error_code) {
            console.log('[VMU UPLOAD] VK error_code=', r.error_code, r.error_msg);
            finish({ error: new Error(`VK ${r.error_code}: ${r.error_msg}`) });
          } else { finish({ result: r }); }
        } catch { finish({ result: undefined }); }
      });
    }));

    const items = [];
    for (const { file } of jobs) {
      const buffer = await file.arrayBuffer();
      items.push({ name: file.name, mimeType: file.type || 'audio/mpeg', buffer });
    }
    console.log('[VMU UPLOAD] sending VK_INJECT_FILES for', items.map(i => i.name));
    try {
      lastBatchNative = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Timeout инжекта')), 5000);
        const handler = e => {
          if (e.source !== window || e.data?.type !== 'VK_FILES_INJECTED') return;
          window.removeEventListener('message', handler);
          clearTimeout(t);
          console.log('[VMU UPLOAD] VK_FILES_INJECTED ok=', e.data.ok, 'native=', e.data.native, 'err=', e.data.error);
          e.data.ok ? resolve(!!e.data.native) : reject(new Error(e.data.error));
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'VK_INJECT_FILES', items }, '*', items.map(i => i.buffer));
      });
    } catch (err) {
      // Injection itself failed — nothing was ever sent, so settle every
      // job as an error right away instead of waiting out each 90s timeout.
      for (const job of jobs) job._finish({ error: err });
    }

    const results = await Promise.all(settled);
    for (const { item, error } of results) {
      if (error) {
        if (error.message === '__ABORTED__') {
          const reason = item.abortReason || 'cancel';
          item.progress = 0;
          delete item.abortReason;
          if (reason === 'cancel') {
            const i = fileQueue.indexOf(item);
            if (i >= 0) fileQueue.splice(i, 1);
          } else {
            item.status = 'pending'; // paused — keep for resume
          }
        } else {
          item.status = 'error';
          item.errorMsg = error.message;
          console.warn('[VK Multi Upload]', error.message);
          // VK rate limit (code 8) — fail the rest of the batch immediately,
          // every other file in it would just hit the same wall.
          const code = error.vkCode;
          if (code === 8 || code === '8') {
            for (const f of fileQueue) {
              if (f.status === 'pending' || f.status === 'uploading') { f.status = 'error'; f.errorMsg = error.message; }
            }
          }
        }
      } else {
        item.status = 'done';
        item.progress = 1;
        bumpTodayUploadCount();
      }
    }

    renderQueue();
    isProcessing = false;
    // Hold-open stays on until the user explicitly closes — drag-and-drop
    // of more files keeps working without re-opening the dialog.
    await sleep(1000);
    processQueue();
  }

  // Native uploads (the normal case now) update VK's own store directly, so
  // the visible list is already correct — just release the close lock. Only
  // the frozen/DOM-input fallback paths in VK_INJECT_FILES never touch VK's
  // store, so THEY still need the page-reload workaround to show up.
  function reloadAfterBatchIfNeeded() {
    if (lastBatchNative) {
      setBlockAudioHide(false);
      return;
    }
    location.reload();
  }

  // ─── Embed full UI into VK's native upload dialog ────────────────────────────
  function buildEmbeddedUI(withOwnHeader) {
    const wrap = document.createElement('div');
    wrap.id = 'vmu-embedded';
    const isCheck = settings.workMode === 'check';
    const dzLabel = isCheck ? 'Перетащите MP3 для проверки' : 'Перетащите MP3 файлы сюда';
    const dzHint = isCheck ? 'имена файлов будут сверены с треками на странице' : 'не более 200 МБ каждый';
    // Own header (title + ✕) is only rendered when the dialog has no native
    // header we could keep — otherwise the native title and close button
    // stay as-is. Settings/SoundCloud used to live here too (gear + SC icon
    // next to the close button) but both moved out to their own standalone,
    // draggable modals reachable from the catalog toolbar (see toggleSettings
    // / toggleSoundCloud) — no longer tied to this dialog's lifecycle at all.
    const ownHeader = withOwnHeader ? `
      <div id="vmu-header">
        <span id="vmu-header-title">${isCheck ? 'Проверка аудиозаписей' : 'Загрузка аудиозаписей'}</span>
        <button type="button" id="vmu-close-btn" class="vmu-settings-btn-header" title="Закрыть">${ICON_CLOSE}</button>
      </div>` : '';
    wrap.innerHTML = `
      ${ownHeader}

      <div id="vmu-dropzone">
        <div class="vmu-dz-label">${dzLabel}</div>
        <div class="vmu-dz-hint">${dzHint}</div>
        <label class="vmu-pick-btn">
          ${ICON_UPLOAD}
          Выбрать файлы
          <input type="file" id="vmu-input" accept=".mp3,audio/mpeg" multiple>
        </label>
      </div>

      <div id="vmu-list"></div>

      <div id="vmu-footer">
        <span id="vmu-status"></span>
        <button type="button" id="vmu-clear" class="vmu-clear-native" style="display:none">Очистить</button>
      </div>
    `;
    return wrap;
  }

  // Floating side panel rendered OUTSIDE the .audio_add_box popup, pinned to
  // its right edge. Same approach as the playlist dupe/blocked-tracks panel.
  // Contains icon-only action buttons (pause, copy-failed, retry-all). Auto-
  // disappears when there's nothing actionable.
  function renderUploadSidePanel(buttonsHtml) {
    if (!buttonsHtml) {
      const old = document.getElementById('vmu-upload-side');
      if (old) { old._vmuCleanup?.(); old.remove(); }
      return;
    }
    const box = getUploadDialog();
    const popup = box?.closest('.popup_box_container') || box;
    if (!popup) {
      const old = document.getElementById('vmu-upload-side');
      if (old) { old._vmuCleanup?.(); old.remove(); }
      return;
    }
    let panel = document.getElementById('vmu-upload-side');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'vmu-upload-side';
      document.body.appendChild(panel);

      const positionPanel = () => {
        const r = popup.getBoundingClientRect();
        if (r.width === 0) {
          panel._vmuCleanup?.();
          panel.remove();
          return;
        }
        panel.style.left = (r.right + 8) + 'px';
        // Vertically centered on the popup's right edge
        const ph = panel.offsetHeight || 0;
        panel.style.top = Math.max(8, r.top + (r.height - ph) / 2) + 'px';
      };
      positionPanel();
      // Re-center once the panel has its real height after the first render
      requestAnimationFrame(positionPanel);
      const ro = new ResizeObserver(positionPanel);
      ro.observe(popup);
      window.addEventListener('resize', positionPanel);
      window.addEventListener('scroll', positionPanel, true);
      const mo = new MutationObserver(() => {
        if (!document.body.contains(popup) || popup.getBoundingClientRect().width === 0) {
          panel._vmuCleanup?.();
          panel.remove();
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      panel._vmuCleanup = () => {
        ro.disconnect();
        mo.disconnect();
        window.removeEventListener('resize', positionPanel);
        window.removeEventListener('scroll', positionPanel, true);
      };
      panel.addEventListener('click', e => {
        if (e.target.closest('#vmu-copy-failed')) copyFailed();
        else if (e.target.closest('#vmu-retry-all')) retryAll();
        else if (e.target.closest('#vmu-pause-btn')) togglePause();
      });
    }
    panel.innerHTML = buttonsHtml;
    // Re-center vertically against the popup after the content height changes
    const popup2 = getUploadDialog()?.closest('.popup_box_container') || getUploadDialog();
    if (popup2) {
      const r = popup2.getBoundingClientRect();
      const ph = panel.offsetHeight || 0;
      panel.style.top = Math.max(8, r.top + (r.height - ph) / 2) + 'px';
    }
  }

  // True once revealNativeUploadUI() has deliberately removed #vmu-embedded
  // to let VK's own progress UI show. The onPageMutated watchdog further
  // down treats a missing #vmu-embedded as "VK wiped our UI, re-inject it" —
  // true in the old architecture, but exactly wrong here: it was undoing
  // the reveal within one MutationObserver tick (~120ms), so the native
  // progress bar never stayed visible. Reset whenever a dialog is freshly
  // (re-)injected, since that's back to showing our own dropzone.
  let nativeUiRevealed = false;

  function injectIntoVkDialog(box) {
    if (box.dataset.vmuInjected) return;
    box.dataset.vmuInjected = '1';
    nativeUiRevealed = false;

    // Save VK's original file input (with its VK event listeners intact).
    // Leaves a comment-node anchor at its exact original spot so
    // revealNativeUploadUI() can put it back there later — see that
    // function for why the input has to actually return, not just the
    // section around it.
    const vkInput = box.querySelector('input[type="file"]');
    if (vkInput) {
      const anchor = document.createComment('vmu-vk-input-anchor');
      vkInput.before(anchor);
      vkInput.__vmuAnchor = anchor;
      vkInput.setAttribute('data-vmu-vk', '1');
      vkInput.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;overflow:hidden;';
    }

    // New VK (2026): the box holds [data-testid="modalheader"] (title + the
    // only close button that properly tears down the modal AND its overlay),
    // a middle section (limitations text + "Выбрать файл") and
    // [data-testid="modalfooter"] («Выбрать из своих аудиозаписей» /
    // «Закрыть»). Keep header and footer, swap only the middle section.
    const header = box.querySelector('[data-testid="modalheader"], [class*="vkitModalHeader"]');
    const footer = box.querySelector('[data-testid="modalfooter"], [class*="vkitModalFooter"]');
    if (header || footer) {
      // NATIVE_HANDOFF_ONLY: hide VK's own middle section instead of
      // destroying it. Once files are handed off (see handoffFilesNatively),
      // VK's own re-render — its real progress bar, its own success/error
      // state — needs a real DOM node to land in; a node we already called
      // .remove() on can't come back without fighting React's reconciliation
      // (see the "removeChild blocked" guard elsewhere in this file). Hiding
      // leaves VK's own tree completely intact underneath ours, ready to
      // reveal the moment revealNativeUploadUI() runs.
      [...box.children].forEach(c => {
        if (c === header || c === footer) return;
        c.dataset.vmuNativeMiddle = '1';
        c.style.display = 'none';
      });
      const ui = buildEmbeddedUI(false);
      if (footer) box.insertBefore(ui, footer);
      else box.appendChild(ui);
      if (vkInput) box.appendChild(vkInput);
      injectClearIntoNativeFooter(footer);
    } else {
      // No recognizable native chrome (old VK .audio_add_box) — replace the
      // body and render our own header with gear and close button.
      const body = getUploadDialogBody(box);
      body.innerHTML = '';
      body.appendChild(buildEmbeddedUI(true));
      if (vkInput) body.appendChild(vkInput);
    }

    attachEmbeddedHandlers();
    renderQueue();
  }

  // Relocates the (already-built, listener-attached) #vmu-clear button from
  // our own footer to sit right after VK's native "Выбрать из своих
  // аудиозаписей" button, instead of duplicating it — same DOM node, same
  // visibility toggle in renderQueue and click handler in
  // attachEmbeddedHandlers, just moved. No-op (stays in our own footer) on
  // old-VK markup, which has no such native footer to anchor to.
  function injectClearIntoNativeFooter(footer) {
    if (!footer) return;
    const clearBtn = document.getElementById('vmu-clear');
    if (!clearBtn) return;
    const pickBtn = [...footer.querySelectorAll('button')]
      .find(b => (b.textContent || '').trim() === 'Выбрать из своих аудиозаписей');
    if (!pickBtn || clearBtn.previousElementSibling === pickBtn) return;
    pickBtn.insertAdjacentElement('afterend', clearBtn);
  }

  function attachEmbeddedHandlers() {
    document.getElementById('vmu-close-btn')?.addEventListener('click', closeUploadModal);
    document.getElementById('vmu-clear')?.addEventListener('click', () => {
      fileQueue = fileQueue.filter(f => f.status === 'uploading' || f.status === 'pending');
      renderQueue();
    });

    document.getElementById('vmu-input')?.addEventListener('change', e => {
      addFiles([...e.target.files].filter(isMP3));
      e.target.value = '';
    });

    document.getElementById('vmu-list')?.addEventListener('click', e => {
      const retryBtn = e.target.closest('.vmu-retry-btn');
      if (retryBtn) { retryOne(parseInt(retryBtn.dataset.idx, 10)); return; }
      const cancelBtn = e.target.closest('.vmu-cancel-btn');
      if (cancelBtn) { cancelOne(parseInt(cancelBtn.dataset.idx, 10)); return; }
    });

    // The side action buttons live in a floating panel outside the popup; its
    // click listener is wired up in renderUploadSidePanel().
  }

  // ─── dupes button injection into playlists ────────────────────────────────────
  // ─── dupes button inside playlist dialog ─────────────────────────────────────
  let _pendingDupesPlaylist = null;

  // Single delegated listener — catches ANY click on ANY playlist card element
  document.addEventListener('click', e => {
    const card = e.target.closest('[class*="_audio_pl_"]');
    if (!card) return;
    const m = card.className.match(/_audio_pl_([-\d]+_\d+)/);
    if (!m) return;
    const parts = m[1].split('_');
    _pendingDupesPlaylist = { ownerId: parts[0], playlistId: parts[1] };
  }, true);

  // Bottom slide-up confirmation for runAutoPlaylist's duplicate-playlist
  // check — styled to sit alongside VK's own dialogs/toasts (uses the same
  // --vmu-* theme tokens as the settings panel, so it follows light/dark
  // automatically). Resolves to {create, dontAskAgain}; dontAskAgain mirrors
  // the "Больше не спрашивать" checkbox and is also exposed as the
  // standalone "Проверка дубликатов плейлиста" settings toggle, so either
  // one flips the same settings.dupPlaylistCheck flag.
  function showDupPlaylistPrompt(title) {
    return new Promise(resolve => {
      document.getElementById('vmu-dup-toast')?.remove();
      const el = document.createElement('div');
      el.id = 'vmu-dup-toast';
      el.className = 'vmu-dup-toast';

      const icon = document.createElement('div');
      icon.className = 'vmu-dup-toast-icon';
      icon.textContent = '⚠';

      const body = document.createElement('div');
      body.className = 'vmu-dup-toast-body';
      const titleEl = document.createElement('div');
      titleEl.className = 'vmu-dup-toast-title';
      titleEl.textContent = 'Такой плейлист уже есть';
      const textEl = document.createElement('div');
      textEl.className = 'vmu-dup-toast-text';
      textEl.textContent = `«${title}» уже есть среди ваших плейлистов. Создать ещё один?`;
      body.append(titleEl, textEl);

      const top = document.createElement('div');
      top.className = 'vmu-dup-toast-top';
      top.append(icon, body);

      // Same custom checkbox pattern as .vmu-toggle elsewhere (hidden input +
      // a styled sibling) instead of a bare native checkbox — sits on the
      // same row as the buttons below, not its own row above them.
      const checkLabel = document.createElement('label');
      checkLabel.className = 'vmu-dup-toast-check';
      const checkInput = document.createElement('input');
      checkInput.type = 'checkbox';
      const checkBox = document.createElement('span');
      checkBox.className = 'vmu-dup-toast-checkbox';
      const checkText = document.createElement('span');
      checkText.className = 'vmu-dup-toast-check-label';
      checkText.textContent = 'Больше не спрашивать';
      checkLabel.append(checkInput, checkBox, checkText);

      const actions = document.createElement('div');
      actions.className = 'vmu-dup-toast-actions';
      const btnNo = document.createElement('button');
      btnNo.type = 'button';
      btnNo.className = 'vmu-dup-toast-btn';
      btnNo.textContent = 'Не создавать';
      const btnYes = document.createElement('button');
      btnYes.type = 'button';
      btnYes.className = 'vmu-dup-toast-btn vmu-dup-toast-btn-primary';
      btnYes.textContent = 'Создать дубликат';
      actions.append(btnNo, btnYes);

      const footer = document.createElement('div');
      footer.className = 'vmu-dup-toast-footer';
      footer.append(checkLabel, actions);

      el.append(top, footer);
      document.body.appendChild(el);
      // Double rAF so the initial (offscreen) state actually paints before
      // the "-shown" class is added — otherwise the browser can coalesce
      // both into one frame and the slide-up transition never plays.
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('vmu-dup-toast-shown')));

      let settled = false;
      const finish = create => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        el.classList.remove('vmu-dup-toast-shown');
        setTimeout(() => el.remove(), 250);
        resolve({ create, dontAskAgain: checkInput.checked });
      };
      btnYes.addEventListener('click', () => finish(true));
      btnNo.addEventListener('click', () => finish(false));
      // Safety net so an unanswered prompt (tab backgrounded, user walked
      // away) never leaves runAutoPlaylist hanging forever — defaults to
      // NOT creating a duplicate, the less surprising outcome if nobody
      // was actually there to answer.
      const timer = setTimeout(() => finish(false), 45000);
    });
  }

  // Both toasts below share the same bottom-center slide-up card look as
  // showDupPlaylistPrompt's duplicate-playlist confirmation (.vmu-notice —
  // see its CSS for the shared visual language) instead of the old ad-hoc
  // bottom-left colored boxes, so every extension notice reads as one
  // consistent design instead of two different ones.
  function showToast(msg, isError) {
    document.getElementById('vmu-toast')?.remove();
    const el = document.createElement('div');
    el.id = 'vmu-toast';
    el.className = 'vmu-notice';
    const icon = document.createElement('div');
    icon.className = 'vmu-notice-icon ' + (isError ? 'vmu-notice-icon-error' : 'vmu-notice-icon-success');
    icon.textContent = isError ? '✕' : '✓';
    const text = document.createElement('div');
    text.className = 'vmu-notice-text';
    text.textContent = msg;
    el.append(icon, text);
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('vmu-notice-shown')));
    setTimeout(() => {
      el.classList.remove('vmu-notice-shown');
      setTimeout(() => el.remove(), 280);
    }, 5000);
  }

  // Persistent progress toast — same slot as showToast but updates in place
  // and shows an optional progress bar. Pass kind: 'done' or 'error' to
  // auto-dismiss after 4s; 'progress' keeps it on screen until next update.
  function showProgressToast(title, opts) {
    const kind = opts?.kind || 'progress';
    const pct = typeof opts?.pct === 'number' ? Math.max(0, Math.min(100, opts.pct)) : null;
    const id = opts?.id || 'vmu-progress';
    let el = document.getElementById(id);
    if (!el) {
      // Clear any plain toast so they don't stack on top
      document.getElementById('vmu-toast')?.remove();
      el = document.createElement('div');
      el.id = id;
      el.className = 'vmu-notice';
      el.innerHTML = `
        <div class="vmu-notice-icon"><span class="vmu-notice-spin"></span></div>
        <div class="vmu-notice-body">
          <div class="vmu-notice-text"></div>
          <div class="vmu-notice-bar" style="display:none"><div class="vmu-notice-bar-fill" style="width:0%"></div></div>
        </div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('vmu-notice-shown')));
    }
    // A call arriving mid-fade-out (its remove() timer already fired the
    // class removal but not the element removal yet) needs the shown class
    // put back, or the update would render invisible until it got yanked
    // out from under itself.
    clearTimeout(el._vmuTimer);
    clearTimeout(el._vmuRemoveTimer);
    el.classList.add('vmu-notice-shown');
    const iconEl = el.querySelector('.vmu-notice-icon');
    iconEl.className = 'vmu-notice-icon ' + (kind === 'error' ? 'vmu-notice-icon-error' : kind === 'done' ? 'vmu-notice-icon-success' : 'vmu-notice-icon-progress');
    iconEl.innerHTML = kind === 'error' ? '✕' : kind === 'done' ? '✓' : '<span class="vmu-notice-spin"></span>';
    el.querySelector('.vmu-notice-text').textContent = title || '';
    const bar = el.querySelector('.vmu-notice-bar');
    const fill = el.querySelector('.vmu-notice-bar-fill');
    if (pct !== null) { bar.style.display = ''; fill.style.width = pct + '%'; }
    else if (kind !== 'progress') bar.style.display = 'none';
    if (kind === 'done' || kind === 'error') {
      el._vmuTimer = setTimeout(() => {
        el.classList.remove('vmu-notice-shown');
        el._vmuRemoveTimer = setTimeout(() => el.remove(), 280);
      }, 4000);
    }
  }

  // Per-trackId HLS progress callbacks registered by downloadSingleTrack
  const hlsProgressHandlers = new Map();

  const ICON_DUPES_SCAN = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="10" rx="2"/><path d="M3 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/></svg>`;
  const ICON_DUPES_STOP = `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="5" width="10" height="10" rx="1.5"/></svg>`;

  function makeDupesBtn(plInfo) {
    const btn = document.createElement('button');
    btn.className = 'vmu-dupes-dialog-btn';
    btn.setAttribute('data-vmu-dupes-dialog', '1');
    btn.setAttribute('data-vmu-tip', 'Проверить на дубликаты');
    btn.innerHTML = ICON_DUPES_SCAN;
    let cancelToken = null;
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (cancelToken) {
        // Scan in progress — this click stops it and shows whatever was
        // collected so far instead of starting a new scan.
        cancelToken.cancelled = true;
        btn.disabled = true;
        return;
      }
      cancelToken = { cancelled: false };
      btn.innerHTML = ICON_DUPES_STOP;
      btn.classList.add('vmu-dupes-dialog-btn-scanning');
      btn.setAttribute('data-vmu-tip', 'Остановить поиск');
      scanForDuplicates(plInfo, (msg, isError) => {
        showToast(msg, isError);
      }, cancelToken).finally(() => {
        cancelToken = null;
        btn.disabled = false;
        btn.innerHTML = ICON_DUPES_SCAN;
        btn.classList.remove('vmu-dupes-dialog-btn-scanning');
        btn.setAttribute('data-vmu-tip', 'Проверить на дубликаты');
      });
    });
    return btn;
  }

  // Two download buttons for the playlist edit dialog: one downloads each track
  // as a separate file, the other bundles them into a single ZIP.
  function makeDlDialogBtn(plInfo, mode) {
    const isZip = mode === 'zip';
    const btn = document.createElement('button');
    btn.className = 'vmu-dl-dialog-btn vmu-dl-dialog-btn-' + mode;
    btn.setAttribute('data-vmu-dl-dialog', mode);
    btn.setAttribute('data-vmu-tip', isZip ? 'Скачать ZIP' : 'Скачать треками');
    btn.innerHTML = isZip
      ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5L5 4h10l1.5 2.5v9a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-9z"/><path d="M3.5 7h13"/><path d="M10 10v4M8 12.2l2 2 2-2"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10M7 10l3 3 3-3"/><path d="M3 15h14"/></svg>`;
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (document.getElementById('vmu-dlp-strip')) return;
      startDlSession(plInfo, mode);
    });
    return btn;
  }

  function tryInjectDupesIntoEditDialog() {
    // Prefer URL-derived info — it may contain accessHash from popup URL (?z=audio_playlist...)
    const urlInfo = getPlaylistInfoFromUrl();
    const plInfo = urlInfo || _pendingDupesPlaylist;
    if (!plInfo) return;

    // Find the VISIBLE modal — React keeps multiple instances, only one has non-zero dimensions
    const modal = [...document.querySelectorAll('[class*="vkitInternalModalBox"]')]
      .find(m => m.getBoundingClientRect().width > 0);
    if (!modal) return;
    if (modal.querySelector('input[type="text"]')) return;
    if (modal.querySelector('[data-vmu-dupes-dialog]')) return;

    // VK's playlist popup body has two rows of icon-only buttons rendered as
    // vkuiButtonGroup__stretch inside a vkuiFlex__wrap container. The old code
    // looked for a button with literal text "Слушать", which VK removed when
    // they switched the play/follow/share/etc buttons to icon-only. Anchor on
    // the structural class instead — works whether or not labels are present.
    let anchorGroup = modal.querySelector('[class*="vkuiButtonGroup__stretch"]');
    if (!anchorGroup) {
      // Legacy fallback: look for the "Слушать" text button
      const listenBtn = [...modal.querySelectorAll('button')]
        .find(b => b.textContent.trim() === 'Слушать');
      anchorGroup = listenBtn?.closest('[class*="vkuiButtonGroup"]') || null;
    }
    if (!anchorGroup) return;

    // The flex wrapper that hosts all body-button rows — its presence just
    // confirms we're looking at the right dialog (playlist view, not e.g.
    // the plain edit form).
    const flexParent = anchorGroup.closest('[class*="vkuiFlex__host"]')
      || anchorGroup.parentElement?.parentElement;
    if (!flexParent) return;

    const newRow = document.createElement('div');
    newRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;padding:8px 0 0;';
    newRow.appendChild(makeDupesBtn(plInfo));
    newRow.appendChild(makeDlDialogBtn(plInfo, 'individual'));
    newRow.appendChild(makeDlDialogBtn(plInfo, 'zip'));

    // Appending inside flexParent used to be enough to have the row sit below
    // VK's own buttons, but VK's header (MusicPlaylistModal_Header, was
    // vkitAudioListBoxHeader__root) now has a fixed height + overflow:hidden
    // — sized for exactly VK's own rows, so a 3rd row appended inside it gets
    // silently clipped and never shows up. Insert it as a sibling right after
    // the header instead (same header/body split dlpInit's progress strip
    // already relies on), landing it in the unclipped body area below.
    const headerEl = modal.querySelector('[data-testid="MusicPlaylistModal_Header"]');
    if (headerEl && headerEl.parentNode) {
      headerEl.insertAdjacentElement('afterend', newRow);
      // Measured BEFORE insertion (inserting a sibling after headerEl doesn't
      // move headerEl/flexParent, only pushes the body down):
      // Vertical — headerEl reserves ~40-50px of its own bottom padding below
      // the native button row (for its own now-empty layout slot), so
      // appending after the whole header leaves a big dead gap before our
      // row. Pull newRow up by that exact gap so it sits flush under the
      // native buttons — its own 8px top padding then reads as a normal row
      // gap instead of a stray empty band.
      // Horizontal — headerEl spans the album art + the text/button column,
      // but flexParent (the native button row, both icon subgroups) only
      // covers the text/button column further right. A full-width newRow
      // therefore starts under the album art, not under the buttons. Match
      // flexParent's left offset and width so it lines up with the buttons
      // above it instead of the artwork.
      const headerRect = headerEl.getBoundingClientRect();
      const flexRect = flexParent.getBoundingClientRect();
      const gap = headerRect.bottom - flexRect.bottom;
      if (gap > 8) newRow.style.marginTop = `-${Math.round(gap)}px`;
      newRow.style.marginLeft = `${Math.round(flexRect.left - headerRect.left)}px`;
      newRow.style.width = `${Math.round(flexRect.width)}px`;
    } else {
      flexParent.appendChild(newRow);
    }
  }

  // ─── playlist download feature ────────────────────────────────────────────────


  // ─── Embedded download progress (no backdrop) ────────────────────────────────
  // The progress strip is injected into the visible playlist modal between its
  // header and body. If no modal is open, falls back to a fixed floating bar.
  // Per-track status is shown as a badge inside the row's right-side slot.
  let _dlpStrip = null;

  function startDlSession(plInfo, mode) {
    dlpInit(mode);
    runPlaylistDownload(plInfo, mode);
  }

  function getActiveModal() {
    return [...document.querySelectorAll('[class*="vkitInternalModalBox"]')]
      .find(m => m.getBoundingClientRect().width > 0) || null;
  }

  function dlpInit(mode) {
    dlpClose();
    const strip = document.createElement('div');
    strip.id = 'vmu-dlp-strip';
    strip.className = 'vmu-dlp-strip';
    strip.innerHTML = `
      <div class="vmu-dlp-row1">
        <span class="vmu-dlp-mode">${mode === 'zip' ? 'ZIP' : 'Треки'}</span>
        <span class="vmu-dlp-phase">Готовим скачивание…</span>
        <span class="vmu-dlp-counter"></span>
        <button class="vmu-dlp-stop" type="button">Остановить</button>
      </div>
      <div class="vmu-dlp-barwrap"><div class="vmu-dlp-bar" style="width:0%"></div></div>
      <div class="vmu-dlp-error" style="display:none"></div>`;
    const modal = getActiveModal();
    if (modal) {
      // Insert between header and body. VK renamed both again: the header's
      // class lost the vkitAudioListBoxHeader__root semantic name (now a bare
      // hash), but it kept a context testid (MusicPlaylistModal_Header) with
      // MusicPlaylistModal_Body as its sibling — same relationship the old
      // class pair described, just moved from class to data-testid.
      const header = modal.querySelector('[data-testid="MusicPlaylistModal_Header"], [class*="vkitAudioListBoxHeader__root"]');
      const body = modal.querySelector('[data-testid="MusicPlaylistModal_Body"], [class*="vkitModalBody__container"]');
      if (header && body && header.parentNode === body.parentNode) {
        body.parentNode.insertBefore(strip, body);
      } else {
        modal.appendChild(strip);
      }
      strip.classList.add('vmu-dlp-in-modal');
    } else {
      strip.classList.add('vmu-dlp-floating');
      document.body.appendChild(strip);
    }
    strip.querySelector('.vmu-dlp-stop').onclick = () => {
      dlCancelFlag = true;
      const b = strip.querySelector('.vmu-dlp-stop');
      if (b) { b.textContent = 'Останавливаем…'; b.disabled = true; }
    };
    _dlpStrip = strip;
  }

  function dlpClose() {
    document.getElementById('vmu-dlp-strip')?.remove();
    // Also clear any per-row badges
    document.querySelectorAll('.vmu-row-status').forEach(n => n.remove());
    _dlpStrip = null;
  }

  function dlSetPhase(text) {
    const el = _dlpStrip?.querySelector('.vmu-dlp-phase');
    if (el) el.textContent = text;
  }

  function dlSetProgress(done, total) {
    const bar = _dlpStrip?.querySelector('.vmu-dlp-bar');
    const cnt = _dlpStrip?.querySelector('.vmu-dlp-counter');
    if (bar) bar.style.width = total > 0 ? Math.round((done / total) * 100) + '%' : '0%';
    if (cnt) cnt.textContent = total > 0 ? `${done}/${total}` : '';
  }

  function dlSetError(msg) {
    const el = _dlpStrip?.querySelector('.vmu-dlp-error');
    if (!el) return;
    if (msg) { el.style.display = ''; el.textContent = msg; }
    else el.style.display = 'none';
  }

  function dlSetFinished(ok) {
    if (!_dlpStrip) return;
    _dlpStrip.classList.add(ok ? 'vmu-dlp-done' : 'vmu-dlp-error-state');
    const stop = _dlpStrip.querySelector('.vmu-dlp-stop');
    if (stop) { stop.textContent = 'Закрыть'; stop.disabled = false; stop.onclick = dlpClose; }
  }

  // Per-track row badges removed — progress is now communicated only through
  // the strip. Kept as no-ops so existing call sites in runPlaylistDownload
  // don't need to change.
  function dlAddRow() {}
  function dlUpdateRow() {}

  async function scrollToCollect() {
    let last = dlTracks.size, unchanged = 0;
    while (unchanged < 4 && !dlCancelFlag) {
      window.postMessage({ type: 'VKD_SCROLL_LOAD' }, '*');
      await sleep(750);
      const now = dlTracks.size;
      dlSetPhase(`Прокручиваем список… найдено ${now}`);
      unchanged = now === last ? unchanged + 1 : 0;
      last = now;
    }
  }

  function sendDlMsg(url, filename) {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'VKD_DOWNLOAD', url, filename }, res => resolve(res));
      } catch { resolve({ ok: false }); }
    });
  }

  function dlSanitize(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  function dlPad(n, total) {
    return String(n).padStart(String(total).length, '0');
  }

  // ── Extract tracks from popup DOM (React fiber) ──────────────────────────
  function extractTracksFromPopupDOM() {
    const tracks = [];
    const seen = new Set();

    // New VK (2026) uses [data-testid$="MusicTrackRow"]; older builds used
    // vkitAudioRow__root with CSS modules hash
    const modal = [...document.querySelectorAll('[class*="vkitInternalModalBox"]')]
      .find(m => m.getBoundingClientRect().width > 0);
    const container = modal || document;
    const rows = container.querySelectorAll('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"], .AudioRow, [data-full-id]');

    for (const row of rows) {
      try {
        const fiberKey = Object.keys(row).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
        if (fiberKey) {
          const fiber = row[fiberKey];
          const props = fiber.memoizedProps || fiber.pendingProps;
          const entity = props?.track?.entity;
          if (entity) {
            const identity = entity.data?.identity;
            const ownerId = identity?.ownerId;
            const audioId = identity?.id;
            const trackId = (ownerId && audioId) ? `${ownerId}_${audioId}` : `dom_${tracks.length}`;
            if (seen.has(trackId)) continue;
            seen.add(trackId);

            const artistName = entity.authors?.main?.[0]?.name || entity.subtitle || '';
            tracks.push({
              id: trackId,
              title: entity.title || '',
              artist: artistName,
              url: entity.url || null,
              duration: entity.duration || 0,
            });
            continue;
          }
        }

        // Fallback for old VK: data-full-id + text content
        const fullId = row.dataset?.fullId;
        if (!fullId) continue;
        if (seen.has(fullId)) continue;
        seen.add(fullId);

        const titleEl = row.querySelector('[class*="title_inner"], .ai_title');
        const artistEl = row.querySelector('[class*="performers"], .ai_artist');
        tracks.push({
          id: fullId,
          title: (titleEl?.textContent || '').trim(),
          artist: (artistEl?.textContent || '').trim(),
          url: null,
          duration: 0,
        });
      } catch {}
    }
    return tracks;
  }

  function isGoodUrl(url) {
    return url && url.startsWith('http') && !url.includes('/a2/') && !url.includes('.m3u8');
  }

  async function resolveDirectUrls(tracks) {
    // Only try to resolve tracks that DON'T already have good direct URLs
    const needResolve = tracks.filter(t => !isGoodUrl(t.url));
    const ids = needResolve.map(t => t.id).filter(id => !id.startsWith('dom_'));
    if (!ids.length) { console.log('[vmu] all tracks already have direct URLs'); return; }
    console.log('[vmu] resolving', ids.length, 'tracks via reload_audio');

    try {
      const result = await pageCall('VKD_RELOAD_AUDIO', 'VKD_RELOAD_AUDIO_DONE', { ids }, 15000);
      if (result?.resolved) {
        for (const [trackId, url] of Object.entries(result.resolved)) {
          const t = dlTracks.get(trackId);
          // Only update if the track doesn't already have a good URL
          if (t && !isGoodUrl(t.url) && isGoodUrl(url)) {
            console.log('[vmu] resolved', trackId, '->', url.substring(0, 60));
            t.url = url;
          }
        }
      }
    } catch (e) {
      console.warn('[vmu] resolveDirectUrls failed:', e.message);
    }
  }

  // ─── Inline ZIP writer (store method, no compression) ────────────────────────
  // MP3/AAC don't compress meaningfully; store-only keeps the code small and the
  // builder fast. Each file entry is: local header + name + data; central dir
  // appended at the end, then End-Of-Central-Directory record.
  function vmuZipBuild(files) {
    const enc = new TextEncoder();
    if (!vmuZipBuild._crcTbl) {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c >>> 0;
      }
      vmuZipBuild._crcTbl = t;
    }
    const T = vmuZipBuild._crcTbl;
    const crc32 = (buf) => {
      let c = 0xFFFFFFFF;
      for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
      return (c ^ 0xFFFFFFFF) >>> 0;
    };

    const parts = [];
    const central = [];
    let offset = 0;
    const dosTime = 0, dosDate = 0x21; // 1980-01-01

    for (const f of files) {
      const nameBytes = enc.encode(f.name);
      const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
      const crc = crc32(data);
      const size = data.length;

      const lh = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true); // UTF-8 filename
      lv.setUint16(8, 0, true);      // store
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      parts.push(lh, data);

      const ch = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      central.push(ch);

      offset += lh.length + data.length;
    }

    let centralSize = 0;
    for (const c of central) centralSize += c.length;
    const centralOffset = offset;
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralOffset, true);
    return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
  }

  async function runPlaylistDownload(plInfo, mode) {
    dlCancelFlag = false;
    // Snapshot tracks already captured during popup load (early injection path)
    const preloaded = new Map(dlTracks);
    dlTracks.clear();
    window.postMessage({ type: 'VKD_RESET_DL' }, '*');

    try {
      if (plInfo?.ownerId && plInfo?.playlistId) {
        dlSetPhase('Загружаем треки плейлиста…');
        await new Promise(resolve => {
          const t = setTimeout(resolve, 30000);
          const h = e => {
            if (e.source === window && e.data?.type === 'VKD_SECTIONS_DONE') {
              clearTimeout(t); window.removeEventListener('message', h); resolve();
            }
          };
          window.addEventListener('message', h);
          window.postMessage({ type: 'VKD_LOAD_SECTIONS', ownerId: plInfo.ownerId, playlistId: plInfo.playlistId, accessHash: plInfo.accessHash || null }, '*');
        });
      } else {
        dlSetPhase('Прокручиваем список…');
        await scrollToCollect();
      }

      if (dlCancelFlag) { dlSetPhase('Отменено'); return; }

      // ALWAYS extract from popup DOM via React fiber (runs in page context via injected.js)
      dlSetPhase('Читаем треки из попапа…');

      await expandPlaylistModal((loaded, total) => {
        if (total) {
          dlSetPhase(`Раскрываем плейлист… ${loaded} / ${total}`);
          dlSetProgress(loaded, total);
        } else {
          dlSetPhase(`Раскрываем плейлист… ${loaded}`);
        }
      });

      // Extract via page context (injected.js can read React fiber, content.js cannot)
      // Fiber extraction is authoritative — it reads only tracks visible in the playlist popup
      let fiberTracks = [];
      try {
        const domResult = await pageCall('VKD_EXTRACT_DOM', 'VKD_EXTRACT_DOM_DONE', {}, 10000);
        fiberTracks = domResult?.tracks || [];
        console.log('[vmu] fiber extracted:', fiberTracks.length, 'tracks');
      } catch (e) {
        console.warn('[vmu] fiber extraction failed:', e.message);
      }

      if (fiberTracks.length > 0) {
        // Use ONLY fiber tracks (they come from the playlist popup, not from random API responses)
        // Enrich them with URLs from intercepted data if fiber didn't have a URL
        const fiberMap = new Map();
        for (const t of fiberTracks) {
          const intercepted = dlTracks.get(t.id) || preloaded.get(t.id);
          if (!t.url && intercepted?.url) t.url = intercepted.url;
          fiberMap.set(t.id, t);
        }
        dlTracks.clear();
        fiberMap.forEach((v, k) => dlTracks.set(k, v));
      } else {
        // Fallback: merge preloaded snapshot if fiber failed
        if (preloaded.size > 0) {
          preloaded.forEach((v, k) => { if (!dlTracks.has(k)) dlTracks.set(k, v); });
        }
      }

      console.log('[vmu] final playlist tracks:', dlTracks.size);

      // Build download queue — ALL tracks with any URL (direct or HLS)
      const queue = [...dlTracks.values()].filter(t => t.url && t.url.startsWith('http'));
      console.log('[vmu] download queue:', queue.length, '(direct:', queue.filter(t => isGoodUrl(t.url)).length, ', HLS:', queue.filter(t => !isGoodUrl(t.url)).length, ')');

      const total = queue.length;

      if (total === 0) {
        const hlsCount = [...dlTracks.values()].filter(t => t.url && (t.url.includes('/a2/') || t.url.includes('.m3u8'))).length;
        const noUrl = [...dlTracks.values()].filter(t => !t.url || !t.url.startsWith('http')).length;
        const msg = dlTracks.size === 0
          ? 'Треки не найдены. Откройте плейлист и попробуйте ещё раз'
          : `Нет прямых ссылок (HLS: ${hlsCount}, без URL: ${noUrl}). VK отдаёт стрим-формат`;
        console.warn('[vmu]', msg);
        dlSetPhase(msg);
        dlSetFinished(false);
        return;
      }

      dlSetProgress(0, total);
      console.log('[vmu] download queue:', total, 'tracks, first url:', queue[0]?.url?.substring(0, 100));

      // Phase 2 — fetch loop. In ZIP mode we accumulate Uint8Arrays + filenames
      // and build a single archive at the end. In individual mode we download
      // each blob via chrome.downloads as it lands. Runs as a small pool of
      // concurrent workers (settings.downloadThreads, capped 1-25) pulling
      // from a shared cursor instead of one file at a time — each worker
      // still paces itself with the original 120ms gap between its own
      // downloads, so a single-thread setting behaves exactly as before.
      const zipFiles = [];
      let done = 0, errors = 0;
      const wantBuffer = (mode === 'zip');
      const threads = Math.max(1, Math.min(25, Math.round(Number(settings.downloadThreads)) || 1));

      let cursor = 0;
      async function downloadQueuedTrack(i) {
        const track = queue[i];
        const meta = [track.artist, track.title].filter(s => String(s || '').trim()).join(' - ') || 'track';
        const fn = dlSanitize(`${dlPad(i + 1, total)} - ${meta}`);
        const isHls = track.url.includes('/a2/') || track.url.includes('.m3u8');
        let res, ext = 'mp3', bytes = null;

        try {
          if (isHls) {
            const hlsUrl = track.url.includes('.m3u8') ? track.url : track.url + '/index.m3u8';
            // Segment concurrency stays modest here (unlike the single-track
            // path below) — this already runs inside one of `threads`
            // parallel track workers, so multiplying by a full second
            // concurrency dial per track would fan out to threads×N
            // simultaneous connections instead of a bounded total.
            const hlsSegConcurrency = Math.max(1, Math.min(6, settings.downloadThreads));
            const r = await pageCall('VKD_HLS_DOWNLOAD', 'VKD_HLS_DOWNLOAD_DONE', { url: hlsUrl, trackId: track.id, returnBuffer: wantBuffer, concurrency: hlsSegConcurrency }, 300000, 'trackId');
            if (r?.ok) {
              ext = r.ext || 'ts';
              if (wantBuffer) { bytes = r.buffer; res = { ok: true }; }
              else { res = await sendDlMsg(r.blobUrl, fn + '.' + ext); }
            } else res = { ok: false, error: r?.error || 'HLS failed' };
          } else {
            const r = await pageCall('VKD_FETCH_BLOB', 'VKD_FETCH_BLOB_DONE', { url: track.url, trackId: track.id, returnBuffer: wantBuffer }, 180000, 'trackId');
            if (r?.ok) {
              if (wantBuffer) { bytes = r.buffer; res = { ok: true }; }
              else { res = await sendDlMsg(r.blobUrl, fn + '.mp3'); }
            } else res = { ok: false, error: r?.error || 'fetch failed' };
          }
        } catch (e) { res = { ok: false, error: e.message }; }

        console.log('[vmu] dl', i + 1, res?.ok ? 'OK' : ('ERR: ' + res?.error), isHls ? 'HLS' : 'direct');
        if (res?.ok) {
          done++;
          if (wantBuffer && bytes) zipFiles.push({ name: fn + '.' + ext, data: new Uint8Array(bytes) });
        } else {
          errors++;
        }
        dlSetPhase(`${done + errors}/${total} — ${track.artist ? track.artist + ' — ' : ''}${track.title}`);
        dlSetProgress(done, total);
      }

      async function downloadWorker() {
        while (!dlCancelFlag) {
          const i = cursor++;
          if (i >= queue.length) return;
          await downloadQueuedTrack(i);
          await sleep(120);
        }
      }

      dlSetPhase(`Начинаем скачивание: ${total} треков (потоков: ${threads})`);
      await Promise.all(Array.from({ length: Math.min(threads, queue.length) }, downloadWorker));

      // ZIP mode: build the archive and trigger one download
      if (wantBuffer && zipFiles.length > 0 && !dlCancelFlag) {
        dlSetPhase(`Собираем ZIP… (${zipFiles.length} треков)`);
        const playlistName = dlSanitize(getPlaylistTitle() || 'playlist');
        const zipBlob = vmuZipBuild(zipFiles);
        const blobUrl = URL.createObjectURL(zipBlob);
        const zipRes = await sendDlMsg(blobUrl, playlistName + '.zip');
        if (!zipRes?.ok) errors++;
      }

      dlSetPhase(dlCancelFlag
        ? `Остановлено — ${done} из ${total}`
        : `Готово · ${done}${errors ? `, ошибок ${errors}` : ''} из ${total}`);
      dlSetFinished(!dlCancelFlag && errors === 0);
    } catch (err) {
      dlSetPhase('Ошибка: ' + err.message);
      dlSetFinished(false);
      console.error('[VK Multi Upload DL]', err);
    }
  }

  function getPlaylistTitle() {
    const modal = getActiveModal();
    if (!modal) return null;
    // vkitAudioListBoxHeader__info's class is hashed away now; VK gives the
    // title itself a stable testid instead, so read it directly rather than
    // hunting for an <a> or a TextClamp-classed span inside the info block.
    const title = modal.querySelector('[data-testid="MusicPlaylistModal_Title"], [class*="vkitAudioListBoxHeader__info"] a, [class*="vkitAudioListBoxHeader__info"] [class*="TextClamp"]');
    return title?.textContent?.trim() || null;
  }

  // ─── Single-track download on hover ──────────────────────────────────────────

  const ICON_DL_SINGLE = `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2.5a.75.75 0 0 1 .75.75v8.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 1.06-1.06l2.72 2.72V3.25A.75.75 0 0 1 10 2.5zM3.5 14.25a.75.75 0 0 1 .75.75v1.5h11.5V15a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75.75H3.5a.75.75 0 0 1-.75-.75V15a.75.75 0 0 1 .75-.75z"/></svg>`;
  const ICON_DL_STOP = `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="5.5" y="5.5" width="9" height="9" rx="1.5"/></svg>`;

  function getTrackDataFromRow(row) {
    // New VK: data stamped by injected.js (React fiber is not visible from the isolated world)
    if (row.dataset?.vmuTrack) {
      try {
        const t = JSON.parse(row.dataset.vmuTrack);
        if (t?.id) return t;
      } catch {}
    }
    // Old VK: data-full-id + DOM text
    const fullId = row.dataset?.fullId || (row.className.match(/_audio_row_(\S+)/) || [])[1];
    if (fullId) {
      const titleEl = row.querySelector('.audio_title, .ai_title, [class*="audio_title"], [class*="AudioRow__title"], .audio_row__title_inner');
      const artistEl = row.querySelector('.audio_artist, .ai_artist, [class*="audio_artist"], [class*="AudioRow__artist"], .audio_row__performers a');
      // reload_audio requires per-track hashes (actionHash/urlHash) as auth —
      // they live at index 13 of the data-audio array: add/edit/action/delete/replace/url/restore
      let reloadId = null;
      try {
        const da = JSON.parse(row.getAttribute('data-audio'));
        const h = String(da[13] || '').split('/');
        if (h[2] && h[5]) reloadId = `${da[1]}_${da[0]}_${h[2]}_${h[5]}`;
      } catch {}
      return {
        id: fullId,
        title: (titleEl?.textContent || '').trim(),
        artist: (artistEl?.textContent || '').trim(),
        url: null,
        reloadId,
      };
    }
    return null;
  }

  async function downloadSingleTrack(track, btnEl) {
    const label = `${track.artist ? track.artist + ' — ' : ''}${track.title}`;
    showProgressToast(`Получение ссылки… ${label}`, { kind: 'progress' });
    if (!track.url) {
      try {
        const result = await pageCall('VKD_RELOAD_AUDIO', 'VKD_RELOAD_AUDIO_DONE', { ids: [track.reloadId || track.id] }, 8000);
        if (result?.resolved?.[track.id]) track.url = result.resolved[track.id];
      } catch {}
    }
    if (!track.url) {
      showProgressToast('Не удалось получить ссылку на трек', { kind: 'error' });
      return;
    }

    // Mark loading + swap icon to "stop" so the click-handler knows to send
    // VKD_CANCEL_SOLO_DL on the next click. Tooltip updates too.
    btnEl.classList.add('vmu-single-dl-loading');
    btnEl.dataset.vmuTrackId = track.id;
    btnEl.dataset.vmuCancelled = '';
    const origIcon = btnEl.innerHTML;
    const origTip = btnEl.getAttribute('data-vmu-tip') || 'Скачать';
    btnEl.innerHTML = ICON_DL_STOP;
    btnEl.setAttribute('data-vmu-tip', 'Отменить');
    const restoreBtn = () => {
      btnEl.classList.remove('vmu-single-dl-loading');
      btnEl.innerHTML = origIcon;
      btnEl.setAttribute('data-vmu-tip', origTip);
      delete btnEl.dataset.vmuTrackId;
      delete btnEl.dataset.vmuCancelled;
    };

    const fn = dlSanitize([track.artist, track.title].filter(s => String(s || '').trim()).join(' - ') || 'track');
    const isHls = track.url.includes('/a2/') || track.url.includes('.m3u8');
    let res;

    try {
      if (isHls) {
        showProgressToast(`Подготовка HLS… ${label}`, { kind: 'progress', pct: 0 });
        hlsProgressHandlers.set(track.id, (done, total) => {
          const pct = total ? Math.round((done / total) * 100) : 0;
          showProgressToast(`Скачивание ${pct}% · ${label}`, { kind: 'progress', pct });
        });
        const hlsUrl = track.url.includes('.m3u8') ? track.url : track.url + '/index.m3u8';
        // No outer track-level parallelism competing here (single track), so
        // this goes past the general 1-10 "download threads" dial — segments
        // are small and latency-bound, not bandwidth-bound, so a higher
        // concurrency than that setting's own max keeps paying off.
        const hlsResult = await pageCall('VKD_HLS_DOWNLOAD', 'VKD_HLS_DOWNLOAD_DONE', { url: hlsUrl, trackId: track.id, concurrency: 12 }, 300000, 'trackId');
        hlsProgressHandlers.delete(track.id);
        if (hlsResult?.aborted) {
          res = { ok: false, aborted: true };
        } else if (hlsResult?.ok && hlsResult.blobUrl) {
          showProgressToast(`Сохранение файла… ${label}`, { kind: 'progress', pct: 100 });
          res = await sendDlMsg(hlsResult.blobUrl, fn + '.' + (hlsResult.ext || 'ts'));
        } else {
          res = { ok: false, error: hlsResult?.error || 'HLS failed' };
        }
      } else {
        showProgressToast(`Скачивание… ${label}`, { kind: 'progress' });
        const fetchResult = await pageCall('VKD_FETCH_BLOB', 'VKD_FETCH_BLOB_DONE', { url: track.url, trackId: track.id }, 120000, 'trackId');
        if (fetchResult?.aborted) {
          res = { ok: false, aborted: true };
        } else if (fetchResult?.ok && fetchResult.blobUrl) {
          res = await sendDlMsg(fetchResult.blobUrl, fn + '.mp3');
        } else {
          res = { ok: false, error: fetchResult?.error || 'fetch failed' };
        }
      }
    } catch (e) {
      res = { ok: false, error: e.message };
    } finally {
      hlsProgressHandlers.delete(track.id);
    }

    restoreBtn();
    if (res?.aborted) {
      showProgressToast(`Отменено · ${label}`, { kind: 'error' });
    } else if (res?.ok) {
      showProgressToast(`Готово · ${label}`, { kind: 'done' });
    } else {
      showProgressToast('Ошибка: ' + (res?.error || 'unknown'), { kind: 'error' });
    }
  }

  // Single body-portal tooltip for all download buttons. CSS ::after tooltips
  // get clipped by VK's gallery containers (ui_gallery__inner_cont has
  // overflow: hidden) on the first row of every column; rendering the tooltip
  // as a position:fixed element appended to body escapes any ancestor clip.
  function getDlTooltipEl() {
    let el = document.getElementById('vmu-tooltip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vmu-tooltip';
      document.body.appendChild(el);
    }
    return el;
  }
  function showDlTooltip(btn) {
    const text = btn.getAttribute('data-vmu-tip');
    if (!text) return;
    const el = getDlTooltipEl();
    el.textContent = text;
    // Default flavour matches VK's old tt_w.tt_black tooltip (used across the
    // legacy audio rows and top-bar icons). Buttons inside the new vkui
    // playlist modal get the vkui-style tooltip via .vmu-tooltip-new.
    const isNewVk = btn.classList.contains('vmu-single-dl-vkit')
      || btn.classList.contains('vmu-single-dl-after')
      || btn.classList.contains('vmu-audiofx-btn')
      || btn.id === 'vmu-bulkops-btn'
      || btn.id === 'vmu-toolbar-settings-btn'
      || btn.id === 'vmu-toolbar-sc-btn';
    el.classList.toggle('vmu-tooltip-new', isNewVk);
    // Reset placement modifier before measuring so layout reflects the
    // default-above tail height.
    el.classList.remove('vmu-tooltip-below');
    el.classList.add('vmu-tooltip-show');
    const br = btn.getBoundingClientRect();
    const tr = el.getBoundingClientRect();
    // 8 px gap so the 5 px tail tip just touches the icon's edge.
    const GAP = 8;
    let top = br.top - tr.height - GAP;
    if (top < 4) {
      top = br.bottom + GAP;
      el.classList.add('vmu-tooltip-below');
    }
    let left = br.left + br.width / 2 - tr.width / 2;
    left = Math.max(4, Math.min(window.innerWidth - tr.width - 4, left));
    el.style.top = top + 'px';
    el.style.left = left + 'px';
  }
  function hideDlTooltip() {
    const el = document.getElementById('vmu-tooltip');
    if (el) el.classList.remove('vmu-tooltip-show');
  }

  // ─── Global bridge: native title="" → the custom #vmu-tooltip bubble ───────
  // This project has 50+ title="..." call sites (help icons, reset buttons,
  // EQ band labels, panel close buttons, etc.), most built via innerHTML
  // template strings where wiring an explicit data-vmu-tip + mouseenter/
  // mouseleave pair per element (the pattern .vmu-audiofx-btn and friends use
  // deliberately) isn't practical. Delegating on document instead covers all
  // of them — present now or added later — without touching those call
  // sites: on hover, swap title for data-vmu-tip (so the browser's own
  // tooltip doesn't also render) and show our bubble; on leave, swap back.
  // Scoped to elements inside something carrying a vmu- id/class so this
  // never touches VK's own native title="" tooltips elsewhere on the page.
  let _vmuTitleHoverEl = null;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[title]');
    if (!el || el === _vmuTitleHoverEl) return;
    const text = el.getAttribute('title');
    if (!text || !el.closest('[id^="vmu-"], [class*="vmu-"]')) return;
    _vmuTitleHoverEl = el;
    el.setAttribute('data-vmu-tip', text);
    el.removeAttribute('title');
    showDlTooltip(el);
  }, true);
  document.addEventListener('mouseout', e => {
    if (!_vmuTitleHoverEl) return;
    // mouseout bubbles and fires on every child boundary crossing too — only
    // actually leaving (relatedTarget outside the tracked element, or gone
    // entirely) should hide the tooltip, not moving from the element onto
    // its own child icon/text.
    if (e.relatedTarget && _vmuTitleHoverEl.contains(e.relatedTarget)) return;
    const el = _vmuTitleHoverEl;
    const text = el.getAttribute('data-vmu-tip');
    if (text) el.setAttribute('title', text);
    el.removeAttribute('data-vmu-tip');
    _vmuTitleHoverEl = null;
    hideDlTooltip();
  }, true);

  function makeSingleDlBtn(row, extraClass) {
    const btn = document.createElement('button');
    btn.className = 'vmu-single-dl' + (extraClass ? ' ' + extraClass : '');
    btn.innerHTML = ICON_DL_SINGLE;
    btn.setAttribute('data-vmu-tip', 'Скачать');
    // Stop mousedown/pointerdown so VK doesn't start playback through our button
    for (const evt of ['mousedown', 'pointerdown', 'touchstart']) {
      btn.addEventListener(evt, e => { e.stopPropagation(); e.stopImmediatePropagation(); }, true);
    }
    btn.addEventListener('mouseenter', () => showDlTooltip(btn));
    btn.addEventListener('mouseleave', hideDlTooltip);
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      hideDlTooltip();
      if (btn.classList.contains('vmu-single-dl-loading')) {
        // Second click while the download is running = abort it.
        const tid = btn.dataset.vmuTrackId;
        if (tid) {
          btn.dataset.vmuCancelled = '1';
          window.postMessage({ type: 'VKD_CANCEL_SOLO_DL', trackId: tid }, '*');
        }
        return;
      }
      const track = getTrackDataFromRow(row);
      if (!track) { showToast('Не удалось определить трек', true); return; }
      downloadSingleTrack(track, btn);
    }, true);
    return btn;
  }

  function injectSingleDlBtn(row) {
    if (!getTrackDataFromRow(row)) return;

    // Prefer the actions button group: VK's own action panel, class
    // vkuiButtonGroup__host — capital B, so a lowercase [class*="buttonGroup"]
    // substring match silently never hits. Note this is nested one level
    // inside a [data-testid="audiorow-actions"] wrapper (display:block, used
    // for hover positioning) — target the inner flex row directly, not the
    // wrapper, or the button renders outside the icon row's flex flow.
    // Works for both page-level rows and playlist-modal rows (modal rows have
    // it too, but VK mounts it after first sweep — so if a previous sweep
    // placed the button into the after-slot fallback, migrate it here now
    // that the proper slot exists).
    const btnGroup = row.querySelector('[class*="buttonGroup" i]');
    if (btnGroup) {
      const existing = row.querySelector('.vmu-single-dl');
      if (existing && existing.parentElement === btnGroup) return;
      if (existing) existing.remove();
      btnGroup.prepend(makeSingleDlBtn(row, 'vmu-single-dl-vkit'));
      return;
    }

    if (row.querySelector('.vmu-single-dl')) return;

    // Fallback: the row's trailing slot (data-testid="audiorow-actions"; was
    // class vkitAudioRow__after before VK hashed it away). Used when
    // buttonGroup is not in DOM yet (rare). A subsequent sweep with
    // buttonGroup present will migrate it.
    const after = row.querySelector('[data-testid="audiorow-actions"], [class*="vkitAudioRow__after"]');
    if (after) {
      after.classList.add('vmu-after-host');
      after.prepend(makeSingleDlBtn(row, 'vmu-single-dl-after'));
      return;
    }
    // Old VK: actions container appears only on hover — handled by the observer below
  }

  // Both old and new VK mount a row's action buttons lazily, only while the
  // row is hovered (removed again on mouseleave) — old VK as
  // .audio_row__actions, new VK as [data-testid="audiorow-actions"] inside
  // MusicTrackRow. The debounced scanAndInjectDlBtns (150ms) plus the
  // throttled page-mutation watcher (~120ms) run too late relative to that
  // mount/unmount window, so the button only ever showed up if a hover
  // happened to overlap a sweep — inject immediately on the mutation that
  // creates either container instead of waiting for the next sweep.
  new MutationObserver(muts => {
    for (const mut of muts) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== 1) continue;
        const acts = node.matches?.('.audio_row__actions') ? [node]
          : node.querySelectorAll ? [...node.querySelectorAll('.audio_row__actions')] : [];
        for (const act of acts) {
          if (act.querySelector('.vmu-single-dl')) continue;
          const row = act.closest('.audio_row, [data-full-id]');
          if (!row || !getTrackDataFromRow(row)) continue;
          act.prepend(makeSingleDlBtn(row, 'vmu-single-dl-act'));
        }

        const groups = node.matches?.('[class*="buttonGroup" i]') ? [node]
          : node.querySelectorAll ? [...node.querySelectorAll('[class*="buttonGroup" i]')] : [];
        for (const group of groups) {
          const row = group.closest('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"]');
          if (!row) continue;
          injectSingleDlBtn(row);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Ask injected.js to stamp data-vmu-track on vkit rows (fiber data lives in
  // the page world), then inject buttons once attributes are in place. We do
  // three passes — virtualized lists sometimes finish mounting after the first
  // mark; the cheap re-scans catch any rows that landed late.
  function markAndInjectAll() {
    const sweep = () => {
      window.postMessage({ type: 'VKD_MARK_ROWS' }, '*');
      setTimeout(() => {
        const rows = document.querySelectorAll('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"], .AudioRow, .audio_row, [data-full-id]');
        for (const row of rows) injectSingleDlBtn(row);
      }, 50);
    };
    sweep();
    setTimeout(sweep, 200);
    setTimeout(sweep, 600);
  }

  let _dlBtnTimer = null;
  function scanAndInjectDlBtns() {
    clearTimeout(_dlBtnTimer);
    _dlBtnTimer = setTimeout(markAndInjectAll, 150);
  }

  // Dedicated watcher for popup modal — scans at 400ms and 900ms after it appears,
  // then attaches an inner observer that re-runs markAndInjectAll whenever the
  // virtualized list swaps rows (scroll inside the modal).
  let _modalDlTimer1 = null, _modalDlTimer2 = null;
  let _modalInnerObs = null;
  function attachModalInnerObserver(modal) {
    if (!modal || modal.__vmuObsAttached) return;
    modal.__vmuObsAttached = true;
    let t = null;
    const obs = new MutationObserver(muts => {
      for (const mut of muts) {
        for (const node of mut.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"]') || node.querySelector?.('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"]')) {
            clearTimeout(t);
            t = setTimeout(markAndInjectAll, 60);
            return;
          }
        }
      }
    });
    obs.observe(modal, { childList: true, subtree: true });
    _modalInnerObs = obs;
  }
  new MutationObserver(muts => {
    for (const mut of muts) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== 1) continue;
        const modalNode = node.matches?.('[class*="vkitInternalModalBox"]')
          ? node
          : node.querySelector?.('[class*="vkitInternalModalBox"]');
        if (!modalNode) continue;
        clearTimeout(_modalDlTimer1); clearTimeout(_modalDlTimer2);
        _modalDlTimer1 = setTimeout(markAndInjectAll, 400);
        _modalDlTimer2 = setTimeout(() => { markAndInjectAll(); attachModalInnerObserver(modalNode); }, 900);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // "Редактирование плейлиста" popup — old .audio_pl_edit_box markup (see
  // getEditPlaylistBox). Runs on a delay since the track rows underneath it
  // mount slightly after the box itself.
  new MutationObserver(muts => {
    for (const mut of muts) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== 1) continue;
        const hasEditBox = node.matches?.('.audio_pl_edit_box') || node.querySelector?.('.audio_pl_edit_box');
        if (!hasEditBox) continue;
        setTimeout(() => {
          const editBox = getEditPlaylistBox();
          injectPlaylistSortToggle(editBox);
          injectCoverEditorRow(editBox);
        }, 250);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  let _dupesDialogTimer = null;
  // ─── SPA watcher + dialog watcher ────────────────────────────────────────────
  let lastHref = location.href;

  function onPageMutated() {
    // SPA navigation: reset state
    if (location.href !== lastHref) {
      lastHref = location.href;
      _pendingDupesPlaylist = null;
      fileQueue = [];
      autoPlaylistClaimed = false;
      autoPlaylistRunning = false;
      autoPlaylistQueue = [];
      isProcessing = false;
      uploadDoneCallbacks.clear();
      uploadingItemsByName.clear();
      dlTracks.clear();
      dlCancelFlag = true;
      dlpClose();
    }

    // Inject into VK's upload dialog whenever it appears;
    // also re-inject if VK replaced the body content (success screen after upload) —
    // but NOT if #vmu-embedded is missing because revealNativeUploadUI() just
    // deliberately removed it (nativeUiRevealed) — this used to fight that
    // reveal every ~120ms and put the dropzone straight back.
    const box = getUploadDialog();
    if (box && !box.dataset.vmuInjected) injectIntoVkDialog(box);
    if (box && box.dataset.vmuInjected && !document.getElementById('vmu-embedded') && !nativeUiRevealed) {
      delete box.dataset.vmuInjected;
      injectIntoVkDialog(box);
    }
    // Restore Clear's spot next to "Выбрать из своих аудиозаписей" if VK
    // re-rendered its native footer (cheap no-op once already in place)
    if (box && box.dataset.vmuInjected) {
      injectClearIntoNativeFooter(box.querySelector('[data-testid="modalfooter"], [class*="vkitModalFooter"]'));
    }

    // Inject download buttons on music/playlist pages
    // Inject dupes button into playlist edit dialog (debounced)
    clearTimeout(_dupesDialogTimer);
    _dupesDialogTimer = setTimeout(tryInjectDupesIntoEditDialog, 300);

    // Inject single-track download buttons
    scanAndInjectDlBtns();

    // Keep the audio catalog header split/pin in sync with VK's re-renders
    applyAudioCatalogLayout();

    // Restore the audio FX button/panel if VK re-rendered over them
    ensureAudioFxUI();
  }

  // Coalesce mutation storms (scrolling a 1000-row playlist fires hundreds of
  // childList batches per second) into at most ~8 handler runs/sec, and skip
  // batches that add/remove no element nodes (text-only churn). Fixed-delay
  // throttle rather than a resetting debounce so a continuous storm can't
  // starve the handler.
  let _mutScheduled = false;
  const hasElementNode = list => {
    for (let i = 0; i < list.length; i++) if (list[i].nodeType === 1) return true;
    return false;
  };
  new MutationObserver(muts => {
    if (_mutScheduled) return;
    let relevant = false;
    for (const m of muts) {
      if (hasElementNode(m.addedNodes) || hasElementNode(m.removedNodes)) { relevant = true; break; }
    }
    if (!relevant) return;
    _mutScheduled = true;
    setTimeout(() => {
      _mutScheduled = false;
      onPageMutated();
    }, 120);
  }).observe(document.body, { childList: true, subtree: true });
})();