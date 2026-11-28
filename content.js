// ── opt-in CPU profiler (diagnostics) ───────────────────────────────────────
// Off unless localStorage.vmu_prof === '1' (one localStorage read otherwise).
// Wraps timers, rAF, MutationObserver callbacks, hot event listeners and
// layout-forcing reads in THIS script world and writes the per-call-site CPU
// time to localStorage ('vmu_prof_content') every 3 s, so both worlds can be
// read from the page console: JSON.parse(localStorage.vmu_prof_content).
(function () {
  let on = false;
  try { on = localStorage.getItem('vmu_prof') === '1'; } catch {}
  if (!on) return;
  const WORLD = 'content';
  const stats = new Map();
  const rec = (k, d) => {
    let s = stats.get(k);
    if (!s) { s = { n: 0, ms: 0, max: 0 }; stats.set(k, s); }
    s.n++; s.ms += d; if (d > s.max) s.max = d;
  };
  function __vmuProbeSite() {
    const st = (new Error().stack || '').split('\n');
    for (let i = 1; i < st.length; i++) {
      const l = st[i];
      if (l.includes('__vmuProbe')) continue;
      const m = l.match(/([^\/\s(]+\.js):(\d+):\d+/);
      if (m) return (/chrome-extension/.test(l) ? 'EXT ' : '') + m[1] + ':' + m[2];
    }
    return '?';
  }
  function __vmuProbeWrap(kind, fn) {
    if (typeof fn !== 'function') return fn;
    const key = kind + ' ' + __vmuProbeSite();
    return function __vmuProbeCall(...a) {
      const t = performance.now();
      try { return fn.apply(this, a); } finally { rec(key, performance.now() - t); }
    };
  }
  const _st = window.setTimeout, _si = window.setInterval, _raf = window.requestAnimationFrame;
  window.setTimeout = function __vmuProbeST(f, d, ...r) { return _st.call(this, __vmuProbeWrap('timeout', f), d, ...r); };
  window.setInterval = function __vmuProbeSI(f, d, ...r) { return _si.call(this, __vmuProbeWrap('interval', f), d, ...r); };
  window.requestAnimationFrame = function __vmuProbeRAF(f) { return _raf.call(this, __vmuProbeWrap('raf', f)); };
  const _MO = window.MutationObserver;
  window.MutationObserver = class __vmuProbeMO extends _MO {
    constructor(cb) { super(__vmuProbeWrap('mutobs', cb)); }
  };
  const HOT = new Set(['scroll', 'resize', 'mousemove', 'mouseover', 'mouseout', 'pointermove', 'pointerover', 'pointerout', 'message', 'keydown', 'wheel', 'visibilitychange', 'focusin', 'focusout', 'transitionend']);
  const lmap = new WeakMap();
  const _add = EventTarget.prototype.addEventListener, _rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function __vmuProbeAdd(type, fn, opts) {
    if (typeof fn === 'function' && HOT.has(type)) {
      let w = lmap.get(fn);
      if (!w) { w = __vmuProbeWrap('on:' + type, fn); lmap.set(fn, w); }
      return _add.call(this, type, w, opts);
    }
    return _add.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function __vmuProbeRem(type, fn, opts) {
    return _rem.call(this, type, (typeof fn === 'function' && lmap.get(fn)) || fn, opts);
  };
  // Forced layout / style reads: only slow ones (> 0.4 ms) are attributed.
  const _gbr = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function __vmuProbeGBR() {
    const t = performance.now(); const r = _gbr.call(this); const d = performance.now() - t;
    if (d > 0.4) rec('layout:getBoundingClientRect ' + __vmuProbeSite(), d);
    return r;
  };
  const _gcs = window.getComputedStyle;
  window.getComputedStyle = function __vmuProbeGCS(...a) {
    const t = performance.now(); const r = _gcs.apply(this, a); const d = performance.now() - t;
    if (d > 0.4) rec('layout:getComputedStyle ' + __vmuProbeSite(), d);
    return r;
  };
  // Network chatter (counts only).
  const _fetch = window.fetch;
  window.fetch = function __vmuProbeFetch(input, init) {
    try { const u = String(input && input.url || input).replace(/^https?:\/\//, '').split('?')[0].slice(0, 300); rec('fetch ' + u, 0); } catch {}
    return _fetch.apply(this, arguments);
  };
  const t0 = performance.now();
  const flush = () => {
    try {
      const top = [...stats.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, 300)
        .map(([k, s]) => ({ k, n: s.n, ms: +s.ms.toFixed(1), max: +s.max.toFixed(1) }));
      localStorage.setItem('vmu_prof_' + WORLD, JSON.stringify({ at: Date.now(), up: +((performance.now() - t0) / 1000).toFixed(1), total: +[...stats.values()].reduce((a, s) => a + s.ms, 0).toFixed(1), top }));
    } catch {}
  };
  _si.call(window, flush, 3000);
})();
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
  let nativeUploadTracker = null;
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
    updateNativeUploadTracker(e.data);
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
    if (e.data?.type === 'VK_HANDOFF_DISPATCHED' && e.data.ok && !e.data.batchId) {
      revealNativeUploadUI();
    }
    // Preview-swap actually replaced what's streaming — the mini-player's own
    // title/artist still read the original track (only window.ap's internal
    // identity changed), so without this the user has no visible sign the
    // swap happened at all.
    if (e.data?.type === 'VKD_PREVIEW_SWAP_DONE') {
      showSwapToast();
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

  // ─── preview-track swap ─────────────────────────────────────────────────────
  // Pushes the feature's on/off state and source-community owner id to
  // injected.js, which owns the actual player watch + the cached track index
  // (both live in page context — window.ap and the audio.get fetch can't be
  // reached from this isolated world). Called once on load and again on every
  // settings change so injected.js is never out of sync with what's on screen.
  const PREVIEW_INDEX_META_KEY = 'vmu_preview_swap_index_meta_v1';
  function sendPreviewSwapConfig() {
    window.postMessage({
      type: 'VKD_PREVIEW_SWAP_CONFIG',
      enabled: !!settings.previewSwapEnabled,
      ownerId: settings.previewSwapOwnerId || null,
      lightVisualizer: settings.lightVisualizer !== false,
    }, '*');
  }
  function readPreviewIndexMeta() {
    try { return JSON.parse(localStorage.getItem(PREVIEW_INDEX_META_KEY) || 'null'); } catch { return null; }
  }
  function previewIndexStatusText() {
    const meta = readPreviewIndexMeta();
    if (previewIndexBuilding) return 'Обновляется в фоне…';
    if (!meta || !meta.ownerId) return settings.previewSwapEnabled ? 'Индекс ещё не построен — построится автоматически' : 'Индекс ещё не построен';
    if (String(meta.ownerId) !== String(settings.previewSwapOwnerId || '')) return 'Индекс построен для другого ID — обновится автоматически';
    const d = new Date(meta.builtAt);
    const when = isNaN(d.getTime()) ? '' : ` · обновлён ${d.toLocaleString()}`;
    return `Треков в индексе: ${meta.count}${when}`;
  }
  let previewIndexBuilding = false;
  // Manual call (the button) shows toasts; a silent call is the background
  // refresh below — progress only goes to the status line in the settings.
  const PREVIEW_INDEX_LOCK_KEY = 'vmu_preview_swap_index_lock_v1';
  function setPreviewIndexStatus(text) {
    const statusEl = document.getElementById('vmu-previewswap-status');
    if (!statusEl) return;
    statusEl.textContent = text;
    const chip = statusEl.closest('.vmu-sx-status');
    if (chip) chip.setAttribute('data-state', /Обновляется/.test(text) ? 'busy' : /не построен|другого ID/.test(text) ? 'warn' : 'ok');
  }
  function rebuildPreviewSwapIndex(opts) {
    const silent = !!(opts && opts.silent === true);
    if (previewIndexBuilding) return;
    const ownerId = (settings.previewSwapOwnerId || '').trim();
    if (!ownerId || !/^-?\d+$/.test(ownerId)) {
      if (!silent) showProgressToast('Укажи числовой ID сообщества (например -206614096)', { kind: 'error', id: 'vmu-previewswap-toast' });
      return;
    }
    // Several VK tabs open at once would all start the same long fetch — the
    // lock (shared through localStorage) lets only one of them do it.
    try {
      const lock = Number(localStorage.getItem(PREVIEW_INDEX_LOCK_KEY) || 0);
      if (silent && Date.now() - lock < 3 * 60 * 1000) return;
      localStorage.setItem(PREVIEW_INDEX_LOCK_KEY, String(Date.now()));
    } catch {}
    const excludePlaylistIds = (settings.previewSwapExcludePlaylists || '')
      .split(/[\s,]+/).map(s => s.trim()).filter(s => /^\d+$/.test(s)).map(Number);
    previewIndexBuilding = true;
    if (silent) setPreviewIndexStatus('Обновляется в фоне…');
    else showProgressToast('Строим индекс треков сообщества…', { kind: 'progress', id: 'vmu-previewswap-toast' });
    const onMsg = e => {
      if (e.source !== window || !e.data) return;
      if (e.data.type === 'VKD_PREVIEW_INDEX_PROGRESS') {
        const { loaded, total } = e.data;
        const txt = `${loaded}${total ? ' из ' + total : ''}`;
        if (silent) setPreviewIndexStatus('Обновляется в фоне… ' + txt);
        else showProgressToast(`Строим индекс треков сообщества… (${txt})`, { kind: 'progress', id: 'vmu-previewswap-toast' });
      } else if (e.data.type === 'VKD_PREVIEW_INDEX_DONE') {
        window.removeEventListener('message', onMsg);
        previewIndexBuilding = false;
        try { localStorage.removeItem(PREVIEW_INDEX_LOCK_KEY); } catch {}
        if (e.data.ok) {
          if (!silent) showProgressToast(`Индекс построен: ${e.data.count} треков`, { kind: 'done', id: 'vmu-previewswap-toast' });
        } else if (silent) {
          console.warn('[vmu] фоновое обновление индекса не удалось:', e.data.error);
        } else {
          showProgressToast('Не удалось построить индекс: ' + translateError(e.data.error || ''), { kind: 'error', id: 'vmu-previewswap-toast' });
        }
        setPreviewIndexStatus(previewIndexStatusText());
      }
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ type: 'VKD_BUILD_PREVIEW_INDEX', ownerId: Number(ownerId), excludePlaylistIds }, '*');
  }

  // Background upkeep of the index: built on first use, then refreshed when
  // it is old, when the source / exclusions change, and — throttled — when a
  // restricted track found no counterpart (a fresh upload is the usual
  // reason). Nothing here needs a click or interrupts anything.
  const PREVIEW_INDEX_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const PREVIEW_INDEX_MISS_AGE_MS = 30 * 60 * 1000;
  function autoRefreshPreviewIndex(reason) {
    if (!settings.previewSwapEnabled) return;
    const ownerId = (settings.previewSwapOwnerId || '').trim();
    if (!ownerId || !/^-?\d+$/.test(ownerId)) return;
    const meta = readPreviewIndexMeta();
    const same = !!(meta && String(meta.ownerId) === ownerId && meta.builtAt);
    const age = same ? Date.now() - meta.builtAt : Infinity;
    const minAge = reason === 'settings' ? 0 : reason === 'miss' ? PREVIEW_INDEX_MISS_AGE_MS : PREVIEW_INDEX_MAX_AGE_MS;
    if (age < minAge) return;
    rebuildPreviewSwapIndex({ silent: true });
  }
  setTimeout(() => autoRefreshPreviewIndex('load'), 4000);
  setInterval(() => autoRefreshPreviewIndex('timer'), 20 * 60 * 1000);
  window.addEventListener('message', e => {
    if (e.source === window && e.data && e.data.type === 'VKD_PREVIEW_INDEX_MISS') autoRefreshPreviewIndex('miss');
  });

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
  let settings = { autoPlaylist: false, dupPlaylistCheck: true, autoAddToExistingPlaylist: true, geniusValidateAutoAdd: true, coverDataUrl: null, autoMeta: false, autoCoverFromId3: false, workMode: 'upload', checkFullPage: false, plmakeScanLimit: 100, pinSidebar: false, contentOffsetX: 0, optimizeBigPlaylists: false, hideScrollToTop: false, hideFriendsMusic: false, pinTabsBar: false, downloadThreads: 3, audioFxLimiterEnabled: false, audioFxCompEnabled: false, audioFxEqEnabled: false, audioFxThreshold: -3, audioFxRatio: 4, audioFxInputGain: 0, audioFxOutputGain: 0, audioFxAttack: 3, audioFxRelease: 250, audioFxKnee: 0, audioFxCeiling: -0.3, audioFxCeilingR: -0.3, audioFxLimRelease: 50, audioFxLimGain: 0, audioFxStyle: 3, audioFxAutoRelease: false, audioFxTruePeak: false, audioFxOversampling: 1, audioFxAutoGain: false, audioFxProcessingMode: 0, audioFxChainOrder: 0, audioFxActiveTab: 'compressor', audioFxBands: AUDIOFX_FREQS.map(f => ({ freq: f, gain: 0, q: EQ_DEFAULT_Q })), audioFxCurrentPreset: null, audioFxAB: { A: null, B: null }, audioFxABActive: 'A',
    slimEnabled: false,
    slimSj: true, slimSjCount: 5, slimSjAtt: 15.0, slimSjNoise: true,
    slimSjMode: 0, slimSjAdaptive: false, slimSjTemporal: false, slimSjBoost: false, slimSjManualFilters: [],
    slimRd: true, slimRdAmount: 2, slimRdVar: true,
    slimDc: true, slimDcVal: 0.000005,
    slimMp: true, slimMpCents: 4.0, slimMpRand: true,
    slimBd: true, slimBdType: 0,
    slimBitrate: 320, slimVolume: 100,
    slimPreserveMeta: true, slimPreserveCover: true,
    slimCommunityTag: false, slimCommunityTagText: '',
    previewSwapEnabled: false, previewSwapOwnerId: '', previewSwapExcludePlaylists: '',
    lightVisualizer: true };
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
        geniusValidateAutoAdd: settings.geniusValidateAutoAdd,
        coverDataUrl: settings.coverDataUrl,
        autoMeta: settings.autoMeta,
        autoCoverFromId3: settings.autoCoverFromId3,
        workMode: settings.workMode,
        checkFullPage: settings.checkFullPage,
        plmakeScanLimit: settings.plmakeScanLimit,
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
        slimEnabled: settings.slimEnabled,
        slimSj: settings.slimSj, slimSjCount: settings.slimSjCount,
        slimSjAtt: settings.slimSjAtt, slimSjNoise: settings.slimSjNoise,
        slimSjMode: settings.slimSjMode, slimSjAdaptive: settings.slimSjAdaptive,
        slimSjTemporal: settings.slimSjTemporal, slimSjBoost: settings.slimSjBoost,
        slimSjManualFilters: settings.slimSjManualFilters,
        slimRd: settings.slimRd, slimRdAmount: settings.slimRdAmount, slimRdVar: settings.slimRdVar,
        slimDc: settings.slimDc, slimDcVal: settings.slimDcVal,
        slimMp: settings.slimMp, slimMpCents: settings.slimMpCents, slimMpRand: settings.slimMpRand,
        slimBd: settings.slimBd, slimBdType: settings.slimBdType,
        slimBitrate: settings.slimBitrate, slimVolume: settings.slimVolume,
        slimPreserveMeta: settings.slimPreserveMeta, slimPreserveCover: settings.slimPreserveCover,
        slimCommunityTag: settings.slimCommunityTag, slimCommunityTagText: settings.slimCommunityTagText,
        previewSwapEnabled: settings.previewSwapEnabled, previewSwapOwnerId: settings.previewSwapOwnerId,
        previewSwapExcludePlaylists: settings.previewSwapExcludePlaylists,
        lightVisualizer: settings.lightVisualizer,
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
  sendPreviewSwapConfig();

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

  // A handful of ready-made EQ curves, gains per band in AUDIOFX_FREQS order
  // (31/62/125/250/500/1k/2k/4k/8k/16k). There's no single published
  // "standard" preset table — every car stereo, phone and headphone app bakes
  // in its own numbers — so these are common shapes (bass/treble shelf, the
  // car-stereo "loudness" smiley curve, vocal presence, a mid scoop for
  // rock/dance, the gentle near-flat lift classical/jazz guides describe)
  // re-fit to this EQ's own 10 ISO bands.
  // "Yamaha HS4 (бас)" is specific: those (and other small studio monitors)
  // are deliberately flat and light below ~100 Hz, so this just leans hard on
  // the bottom two bands to compensate.
  // Every preset below ships with the limiter ON (ceiling from AUDIOFX_DEFAULTS,
  // -0.3dB) — the limiter stage is an explicit opt-in that's a no-op while
  // disabled (limiter-worklet.js's limStage forces `desired = 0` whenever
  // !limEnabled), so a boost-only EQ preset with the limiter off has nothing
  // stopping it from clipping: adjacent bands' peaking curves overlap heavily
  // at this Q, so the SUMMED boost between two bands' center frequencies runs
  // well past either band's own dB number, and most streamed/mastered audio
  // has near-zero headroom left to begin with. Found live: the first cut of
  // these presets (no limiter) clipped hard on real tracks.
  const AUDIOFX_BUILTIN_PRESETS = {
    'Больше низов':        { gains: [6, 5, 3, 1, 0, 0, 0, 0, 0, 0],      category: 'Утилиты', tags: ['bass', 'бас'] },
    'Больше верхов':       { gains: [0, 0, 0, 0, 0, 0, 1, 3, 5, 6],      category: 'Утилиты', tags: ['treble', 'верха'] },
    'Для авто':            { gains: [5, 4, 2, 0, -1, -1, -1, 1, 2, 3],   category: 'Утилиты', tags: ['car', 'авто', 'loudness'] },
    'Вокал':               { gains: [-3, -2, -1, 0, 1, 2, 3, 2, 1, 0],   category: 'Утилиты', tags: ['vocal', 'вокал'] },
    'Подкасты и речь':     { gains: [-6, -4, -2, 0, 1, 2, 3, 1, 0, -2],  category: 'Утилиты', tags: ['podcast', 'speech', 'речь'] },
    'Yamaha HS4 (бас)':    { gains: [8, 7, 5, 2, 1, 0, 0, 0, 0, 0],      category: 'Утилиты', tags: ['hs4', 'yamaha', 'мониторы', 'bass'] },
    'Рок':                 { gains: [4, 3, 1, 0, -1, -1, 1, 2, 3, 2],    category: 'Жанры', tags: ['rock', 'рок'] },
    'Поп':                 { gains: [-1, 0, 1, 2, 2, 2, 2, 1, 0, -1],    category: 'Жанры', tags: ['pop', 'поп'] },
    'Джаз и классика':     { gains: [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],      category: 'Жанры', tags: ['jazz', 'classical', 'джаз', 'классика'] },
    'Электроника и танцы': { gains: [5, 4, 1, -1, -1, -1, 0, 1, 3, 4],   category: 'Жанры', tags: ['dance', 'edm', 'электроника'] },
  };
  // Seeded once each, same as "Базовый" above: never overwritten once it
  // exists, so renaming, editing or deleting one of these is permanent even
  // across an update that revises this list.
  function ensureBuiltinAudioFxPresets() {
    const presets = loadAudioFxPresets();
    let changed = false;
    for (const name in AUDIOFX_BUILTIN_PRESETS) {
      if (presets[name]) continue;
      const { gains, category, tags } = AUDIOFX_BUILTIN_PRESETS[name];
      presets[name] = {
        settings: Object.assign({}, AUDIOFX_DEFAULTS, {
          audioFxEqEnabled: true,
          audioFxLimiterEnabled: true,
          audioFxBands: AUDIOFX_FREQS.map((f, i) => ({ freq: f, gain: gains[i], q: EQ_DEFAULT_Q })),
        }),
        category, tags,
      };
      changed = true;
    }
    if (changed) saveAudioFxPresets(presets);
  }
  ensureBuiltinAudioFxPresets();

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
      const topBar = pinQuery('top', '[class*="vkuiFixedLayout"]', false);
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
      parts.push(`#stl_left, #stl_side { display: none !important; }`);
    } else {
      // Constrain outer #stl_left (click area) to a 40px rail and stretch
      // inner #stl_bg to the rail's full height so the hover highlight
      // matches the clickable area instead of a clipped 40x40 chip. Kill
      // VK's own offsets (#stl_text margin-left:19px, svg margin-right:4px)
      // — they pushed the arrow off-center. The "Наверх" text is hidden via
      // font-size:0 on #stl_text (SVG keeps its pixel width/height
      // attributes so the arrow icon stays visible).
      parts.push(`#stl_left, #stl_side { width: 40px !important; }`);
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
      parts.push(`[data-testid="AudioCatalog_SectionFriendsMusic"] + div:empty:not([id], [role], [data-testid]) { display: none !important; }`);
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

  // Themed stand-in for a native <select> in the extension's panels. A native
  // select's popup is OS chrome: in the dark theme its options inherit the
  // select's light text colour onto the popup's white background and become
  // unreadable (reported on the 216-playlist picker), and it can't be styled.
  // The real <select> stays in the DOM, hidden — its `value`, `options` and
  // `change` event are what the callers already use — and this just adds a
  // button + list in front of it:
  //  - the list is a body-level fixed popover, so a panel's overflow:hidden
  //    can't clip it (the FX dropdown above is absolutely positioned inside
  //    its panel, which is fine for two short lists, not here);
  //  - long lists (>12 options, or opts.search) get a filter box, since
  //    scrolling 200+ playlists by eye isn't workable;
  //  - programmatic `select.value = x` / `selectedIndex = n` and rebuilding
  //    the options (the playlist picker does) keep the button label in sync.
  function vmuEnhanceSelect(select, opts) {
    if (!select || select.dataset.vmuEnhanced) return;
    select.dataset.vmuEnhanced = '1';
    const maxW = getComputedStyle(select).maxWidth;

    const wrap = document.createElement('div');
    wrap.className = 'vmu-sel';
    if (maxW && maxW !== 'none') wrap.style.maxWidth = maxW;
    wrap.innerHTML = `<button type="button" class="vmu-sel-btn"><span class="vmu-sel-label"></span>${ICON_DD_CHEVRON}</button>`;
    const btn = wrap.firstElementChild;
    const label = btn.querySelector('.vmu-sel-label');
    if (select.title) btn.title = select.title;
    select.before(wrap);
    select.style.display = 'none';

    const syncLabel = () => {
      label.textContent = select.selectedOptions[0]?.textContent || '';
      btn.disabled = select.disabled;
    };
    for (const prop of ['value', 'selectedIndex']) {
      const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
      Object.defineProperty(select, prop, {
        configurable: true,
        get() { return d.get.call(this); },
        set(v) { d.set.call(this, v); syncLabel(); },
      });
    }
    new MutationObserver(syncLabel).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    syncLabel();

    let list = null;
    let teardown = null;
    const close = () => {
      if (!list) return;
      teardown?.();
      list.remove();
      list = null;
      teardown = null;
      wrap.classList.remove('vmu-sel-open');
    };
    const open = () => {
      if (list || select.disabled) return;
      const options = [...select.options];
      const searchable = opts?.search ?? options.length > 12;
      list = document.createElement('div');
      list.className = 'vmu-sel-list';
      list.innerHTML = `${searchable ? '<input type="text" class="vmu-sel-search" placeholder="Поиск…" spellcheck="false">' : ''}<div class="vmu-sel-items"></div>`;
      const itemsEl = list.querySelector('.vmu-sel-items');
      const searchEl = list.querySelector('.vmu-sel-search');
      let shown = [];
      let hi = 0;
      const paintHi = () => {
        itemsEl.querySelectorAll('.vmu-sel-item').forEach((el, i) => el.classList.toggle('vmu-sel-hi', i === hi));
        itemsEl.querySelectorAll('.vmu-sel-item')[hi]?.scrollIntoView({ block: 'nearest' });
      };
      const render = query => {
        const needle = (query || '').trim().toLowerCase();
        shown = options.filter(o => !needle || o.textContent.toLowerCase().includes(needle));
        itemsEl.innerHTML = shown.length
          ? shown.map(o => `<button type="button" class="vmu-sel-item${o.index === select.selectedIndex ? ' active' : ''}" data-i="${o.index}">${escHtml(o.textContent)}</button>`).join('')
          : '<div class="vmu-sel-empty">Ничего не найдено</div>';
        hi = Math.max(0, shown.findIndex(o => o.index === select.selectedIndex));
        if (needle) hi = 0;
        paintHi();
      };
      const pick = idx => {
        close();
        if (idx === select.selectedIndex) return;
        select.selectedIndex = idx;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      };
      render('');
      document.body.appendChild(list);

      const r = btn.getBoundingClientRect();
      const width = Math.min(Math.max(r.width, 220), window.innerWidth - 16);
      list.style.width = width + 'px';
      list.style.left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) + 'px';
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const openUp = below < Math.min(list.scrollHeight, 200) && above > below;
      list.style.maxHeight = Math.max(120, Math.min(340, openUp ? above : below)) + 'px';
      if (openUp) list.style.bottom = (window.innerHeight - r.top + 4) + 'px';
      else list.style.top = (r.bottom + 4) + 'px';
      wrap.classList.add('vmu-sel-open');
      paintHi(); // scroll the current option into view now that the list is laid out

      list.addEventListener('click', e => {
        const it = e.target.closest('.vmu-sel-item');
        if (it) pick(Number(it.dataset.i));
      });
      if (searchEl) {
        searchEl.addEventListener('input', () => render(searchEl.value));
        searchEl.addEventListener('keydown', e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(shown.length - 1, hi + 1); paintHi(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); paintHi(); }
          else if (e.key === 'Enter') { e.preventDefault(); if (shown[hi]) pick(shown[hi].index); }
        });
        searchEl.focus();
      }

      const onDown = e => { if (!list.contains(e.target) && !wrap.contains(e.target)) close(); };
      const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); btn.focus(); } };
      const onScroll = e => { if (!list.contains(e.target)) close(); };
      // The panel can be closed (or VK can re-render it away) while the list is open.
      const gone = new MutationObserver(() => { if (!wrap.isConnected) close(); });
      document.addEventListener('pointerdown', onDown, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', close);
      gone.observe(document.body, { childList: true, subtree: true });
      teardown = () => {
        document.removeEventListener('pointerdown', onDown, true);
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', close);
        gone.disconnect();
      };
    };
    btn.addEventListener('click', () => { if (list) close(); else open(); });
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
    // Panel-state checks first: getVisibleAudioFxBtn() reads button rects
    // (forced reflow), and this runs on every throttled page mutation even
    // while the panel is closed — which is nearly always.
    if (!panel || !panel.classList.contains('vmu-audiofx-panel-open')) return;
    if (panel.dataset.vmuUserMoved) return;
    const btn = getVisibleAudioFxBtn();
    if (!btn) return;
    const margin = 12;
    const r = btn.getBoundingClientRect();
    // Anchor under the button's own live position rather than guessing from
    // AudioPage_PlayerBlock — the button lives inline in VK's toolbar (see
    // injectAudioFxIntoPlayerBar), so its rect is the source of truth.
    const right = Math.max(margin, window.innerWidth - r.right);
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.right = right + 'px';
  }

  // Set by attachAudioFxHandlers (its closure owns renderPresetList/the filter
  // state the browser needs); toggleAudioFxPanel below lives outside that
  // closure. var, not let: attachAudioFxHandlers can run (and assign this)
  // before this line is ever reached in source order — same reason
  // _pinBorderEl near applyTabsBarPin is a var — so let's temporal dead zone
  // would throw on a plain page load, before the user ever touches the panel.
  var closePresetBrowserFn = null;
  function toggleAudioFxPanel() {
    const panel = document.getElementById('vmu-audiofx-panel');
    if (!panel) return;
    const open = panel.classList.toggle('vmu-audiofx-panel-open');
    positionAudioFxUI();
    if (open) startMeterLoop(); else stopMeterLoop();
    // The preset browser is its own floating window now (see attachAudioFxHandlers)
    // with document/window-level listeners of its own — closing the whole panel out
    // from under it (toolbar button, not its own × or outside click) must tear those
    // down too, not just hide it, or they pile up across repeated open/close cycles.
    if (!open) closePresetBrowserFn?.();
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
      // Its own floating window (position:fixed, anchored under the toggle
      // button) instead of an inline section of the panel — it used to push the
      // chain/tabs/sliders below it down the panel's own scroll area every time
      // it opened. Same anchor-under-the-button / outside-click-closes pattern
      // as vmuEnhanceSelect's .vmu-sel-list.
      const searchEl = document.getElementById('vmu-fx-preset-search');
      const catsEl = document.getElementById('vmu-fx-preset-cats');
      const listEl = document.getElementById('vmu-fx-preset-list');
      const positionPresetBrowser = () => {
        const r = presetToggle.getBoundingClientRect();
        const width = Math.min(340, window.innerWidth - 16);
        presetBrowser.style.width = width + 'px';
        presetBrowser.style.left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) + 'px';
        // Chrome = search box + category pills + the window's own padding/gaps;
        // only the list itself (its own scroll, see renderPresetList's CSS) gives
        // up height when the side with less room is picked.
        const chrome = (searchEl?.offsetHeight || 0) + (catsEl?.offsetHeight || 0) + 24;
        const below = window.innerHeight - r.bottom - 12;
        const above = r.top - 12;
        const openUp = below < Math.min(chrome + 180, 320) && above > below;
        if (listEl) listEl.style.maxHeight = Math.max(80, Math.min(180, (openUp ? above : below) - chrome)) + 'px';
        if (openUp) { presetBrowser.style.bottom = (window.innerHeight - r.top + 6) + 'px'; presetBrowser.style.top = ''; }
        else { presetBrowser.style.top = (r.bottom + 6) + 'px'; presetBrowser.style.bottom = ''; }
      };
      let teardownPresetBrowser = null;
      const closePresetBrowser = () => {
        if (presetBrowser.style.display === 'none') return;
        presetBrowser.style.display = 'none';
        teardownPresetBrowser?.();
        teardownPresetBrowser = null;
      };
      const openPresetBrowser = () => {
        if (presetSaveForm) presetSaveForm.style.display = 'none';
        renderPresetList();
        presetBrowser.style.display = '';
        positionPresetBrowser();
        const onDown = e => { if (!presetBrowser.contains(e.target) && !presetToggle.contains(e.target)) closePresetBrowser(); };
        const onKey = e => { if (e.key === 'Escape') closePresetBrowser(); };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', positionPresetBrowser);
        teardownPresetBrowser = () => {
          document.removeEventListener('pointerdown', onDown, true);
          document.removeEventListener('keydown', onKey, true);
          window.removeEventListener('resize', positionPresetBrowser);
        };
      };
      presetToggle.addEventListener('click', () => {
        if (presetBrowser.style.display === 'none') openPresetBrowser(); else closePresetBrowser();
      });
      closePresetBrowserFn = closePresetBrowser;
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
  // and reserve the space it vacates while engaged. The section's padding
  // must reach the bottom of the pinned rows at the merge point.
  // applyTabsBarPin runs on every scroll event, and its three document-wide
  // attribute queries (one of them a substring match over every element's
  // class) were a large part of its ~1.5 ms. The page structure it looks up
  // does not change while scrolling, so the results are reused for 1 s (and
  // dropped at once if an element left the page).
  function pinQuery(key, selector, all) {
    const _pinQ = pinQuery._s || (pinQuery._s = {}); // lazily: may run before this point of the script
    const now = performance.now();
    const hit = _pinQ[key];
    if (hit && now - hit.t < 1000 && (all ? hit.v.every(e => e.isConnected) : (!hit.v || hit.v.isConnected))) return hit.v;
    const v = all ? [...document.querySelectorAll(selector)] : document.querySelector(selector);
    _pinQ[key] = { t: now, v };
    return v;
  }
  // (The page-background notch of applyAudioHeaderSplit must NOT be moved when the bar is
  // pinned / released by hand: applyAudioHeaderSplit measures the gap from the
  // content below the bar. A second offset would move the notch over the tabs.)
  // Writes that change nothing are skipped: classList.add / a style assignment produce a
  // mutation record even when the value is the same, and this function runs from the
  // mutation watcher — so it kept waking itself (and every other observer on the page).
  function pinAddCls(el, ...cs) { for (const k of cs) if (!el.classList.contains(k)) el.classList.add(k); }
  function pinSetStyle(el, k, v) { if (el.style[k] !== v) el.style[k] = v; }

  // HOW THE MERGE WORKS (and why): VK renders the player block twice — one copy in the
  // flow and, once that has scrolled up to the top bar, a second position:fixed copy,
  // hiding the first. It makes that switch from its own asynchronous scroll handling:
  // measured live, 45–60 ms (several frames) AFTER the scroll position crossed the
  // point, and it flattens / rounds the card's corners on the same late schedule.
  // Everything the extension did was in step with the scroll, so for those frames the
  // two disagreed: a hole above the pinned tabs on the way down, the player jumping
  // from 48 to 64 px on the way up, square corners on a released player, and the
  // swapped-track panel (which follows «the visible copy») trailing by up to a second.
  // Chasing VK's switch with timers could not fix a race.
  // So VK's switch is taken out of the picture: while this feature is on
  // (html.vmu-pinmode, CSS in style.css) the IN-FLOW copy is held position:fixed
  // under the top bar in the same pass that pins the tabs (see markPlayerBlockWrap
  // for how the two copies are told apart) — VK's own fixed copy is not displayed at
  // all, and the corners and the outline depend on one thing only: html.vmu-merged,
  // set below in that same pass. (This was position:sticky, relying on the in-flow
  // wrapper's containing block being tall enough to stick within — VK's current
  // markup no longer gives it one, so it's plain position:fixed now, same as the
  // tabs: left/width still need the per-pass JS below, top comes from the
  // --vmu-topbar-h custom property already set above.)
  function applyTabsBarPin() {
    const sections = pinQuery('hdr', '[data-testid="AudioCatalog_Header"]', true);
    // This runs on every throttled page mutation (see onPageMutated), on
    // EVERY vk.com page — feed, messenger, everywhere — and the rects/computed
    // style read below each force a synchronous reflow in the middle of
    // VK's own DOM writes. All of it only feeds the pinning maths, which
    // needs both the setting on and a catalog header to pin, so skip the
    // reads entirely otherwise. With pinning off the loop below only ever
    // unpins and the flat-card class only ever gets removed — the same end
    // state the full path reached, minus the layout thrash.
    const needLayout = !!settings.pinTabsBar && sections.length > 0;
    let anchor = 0;
    let topBarBottom = 48;
    let mmCard = null;
    let playerBlocks = [];
    let flowWrap = null;
    let playerDistanceToMerge = null; // Without a player, the tabs set the threshold.
    if (needLayout) {
      const topBar = document.querySelector('[class*="vkuiFixedLayout"]');
      topBarBottom = topBar ? topBar.getBoundingClientRect().bottom : 48;
      if (applyTabsBarPin._tbh !== topBarBottom) {
        applyTabsBarPin._tbh = topBarBottom;
        document.documentElement.style.setProperty('--vmu-topbar-h', topBarBottom + 'px'); // where the pinned player sits
      }
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
      let playerH = 0;
      // fresh on every call (not cached): the appearance of VK's second, pinned copy is
      // exactly the event the merge has to catch
      playerBlocks = [...document.querySelectorAll('[data-testid="AudioPage_PlayerBlock"]')];
      for (const pb of playerBlocks) {
        markPlayerBlockWrap(pb);
        if (pb.parentElement?.classList.contains('vmu-pb-wrap-flow')) flowWrap ||= pb.parentElement;
        const r = pb.getBoundingClientRect();
        if (r.bottom > playerBottom) { playerBottom = r.bottom; visiblePlayerBlock = pb; }
        if (r.height > playerH) playerH = r.height;
      }
      // The anchor is where VK's PINNED player copy sits — the top bar's bottom
      // plus the block's own height — a constant. It used to follow whichever
      // copy was lower at the moment, so it moved by a few pixels as VK swapped
      // its copies mid-scroll: one more of the separate steps of the transition.
      anchor = Math.round(Math.max(48, playerH ? topBarBottom + playerH : topBarBottom, playerH ? 0 : playerBottom));
      // The merge starts at the very moment VK switches from the in-flow player
      // to its pinned copy (a second copy appears / the in-flow one reaches the
      // top bar), not later when the tabs happen to scroll up to the anchor — that
      // delay was what made the player's corners flatten first and the tabs and
      // the search box follow one after another a bit further down the scroll.
      // While pinned, the spacer tracks the player's natural position as the page
      // scrolls. The fixed wrapper's viewport position is constant. VK's duplicate
      // must not determine when to release the bar: it used to count as
      // well — but VK adds it a little after the merge point on the way down and
      // removes it a little after on the way up, so on the way up the bar stayed
      // pinned until VK had finished (and if scrolling stopped just there, until
      // some later mutation): the player was back to rounded corners while the tabs
      // were still merged to it.
      // (no player block at all — nothing has been played yet: null, the tabs' own rule)
      if (flowWrap) {
        const flowSlot = _pinPlayerSpacer?.nextElementSibling === flowWrap ? _pinPlayerSpacer : flowWrap;
        playerDistanceToMerge = flowSlot.getBoundingClientRect().top - topBarBottom;
      }

      // The multimedia card (AudioPage_PlayerBlock's own vkitInternalGroupCard
      // wrapper) draws its "border" via a uniform inset box-shadow on ::before,
      // not a real border property. While merged, the stylesheet (html.vmu-merged)
      // disables that and substitutes a top+left+right-only version — keeps
      // the outer edges bordered but drops the bottom line where it now
      // touches our panel, so the two read as one continuous outline instead
      // of a seam. Borrow the exact same color for both so it still looks
      // intentional, instead of hardcoding a color that'd drift from whatever
      // theme VK is currently rendering.
      mmCard = visiblePlayerBlock ? visiblePlayerBlock.closest('section') : null;
      if (mmCard) {
        const nowMs = performance.now();
        if (mmCard !== _pinBorderEl || nowMs - _pinBorderAt > 2000) {
          _pinBorderEl = mmCard; _pinBorderAt = nowMs;
          // while merged the player's own ring is switched off — the catalog header is
          // the same kind of card and keeps its ring, so it serves as the second source
          const mmBorder = getComputedStyle(mmCard, '::before').boxShadow;
          const m = mmBorder.match(/rgba?\([^)]+\)/)
            || (sections[0] ? getComputedStyle(sections[0], '::before').boxShadow.match(/rgba?\([^)]+\)/) : null);
          // writing a custom property on the root invalidates the style of
          // every node in the document — 22 ms on a feed-sized page, measured.
          // This one is re-read every two seconds and is almost always the
          // same colour, so it is only written when it actually changes.
          if (m && document.documentElement.style.getPropertyValue('--vmu-pin-border') !== m[0]) {
            document.documentElement.style.setProperty('--vmu-pin-border', m[0]);
          }
        }
      }
    }
    let anyEngaged = false;
    let engagedRect = null;

    for (const section of sections) {
      const tabs = section.querySelector(':scope > [data-testid="headerlayout"]');
      const search = section.children[1];
      const searchWrap = search && search !== tabs && search.querySelector('[class*="vkuiSearch"]') ? search : null;
      let layout = section.__vmuPinnedLayout;
      const unpin = () => {
        if (!layout) return;
        for (const el of [layout.tabs, layout.search]) {
          if (!el) continue;
          el.classList.remove('vmu-tabs-pinned', 'vmu-pin-top', 'vmu-pin-bottom');
          el.style.top = el.style.left = el.style.width = el.style.background = '';
        }
        section.style.paddingTop = layout.inlinePadding;
        delete section.__vmuPinnedLayout;
        layout = null;
      };

      if (!settings.pinTabsBar || !tabs) { unpin(); continue; }
      if (layout && (layout.tabs !== tabs || layout.search !== searchWrap)) unpin();

      const sRect = section.getBoundingClientRect();
      const tabsRect = layout ? null : tabs.getBoundingClientRect();
      const tabsOffset = layout ? layout.tabsOffset : tabsRect.top - sRect.top;
      const distanceToMerge = playerDistanceToMerge ?? (sRect.top + tabsOffset - anchor);
      if (distanceToMerge > (playerDistanceToMerge === null ? 0 : 0.5)) { unpin(); continue; }

      if (!layout) {
        const searchRect = searchWrap?.getBoundingClientRect();
        layout = section.__vmuPinnedLayout = {
          tabs,
          search: searchWrap,
          tabsOffset,
          inlinePadding: section.style.paddingTop,
          // Preserve the native spacing around the rows as well as their heights.
          flowSpacing: (searchRect || tabsRect).bottom - sRect.top - section.clientTop
            - tabsRect.height - (searchRect?.height || 0),
        };
      }

      const nowBg = performance.now();
      if (!section.__vmuBgAt || nowBg - section.__vmuBgAt > 2000) {
        section.__vmuBgAt = nowBg;
        section.__vmuBg = getComputedStyle(section).backgroundColor;
      }

      anyEngaged = true;
      engagedRect = sRect;
      for (const row of searchWrap ? [tabs, searchWrap] : [tabs]) {
        pinAddCls(row, 'vmu-tabs-pinned', row === tabs ? 'vmu-pin-top' : 'vmu-pin-bottom');
        pinSetStyle(row, 'left', sRect.left + 'px');
        pinSetStyle(row, 'width', sRect.width + 'px');
        pinSetStyle(row, 'background', section.__vmuBg);
      }
      if (!searchWrap) pinAddCls(tabs, 'vmu-pin-bottom');
      pinSetStyle(tabs, 'top', anchor + 'px');

      // A resize or a search state change can change the height of a pinned row.
      // Use its current height to position the search and reserve room below it.
      const tabsBottom = tabs.getBoundingClientRect().bottom;
      if (searchWrap) pinSetStyle(searchWrap, 'top', tabsBottom + 'px');
      const headerBottom = searchWrap ? searchWrap.getBoundingClientRect().bottom : tabsBottom;
      const sectionTopAtMerge = sRect.top - distanceToMerge + section.clientTop;
      const padding = Math.max(headerBottom - anchor + layout.flowSpacing, headerBottom - sectionTopAtMerge);
      pinSetStyle(section, 'paddingTop', padding + 'px');
    }

    // The player block's own wrapper gets the same treatment, once per pass rather than
    // per section (there's only ever one real pair of copies on the page): VK's
    // duplicate is hidden outright whenever there's a header to pin against, and the
    // in-flow one is held fixed directly above the tabs the moment they merge. Plain
    // position:fixed (not sticky, as this used to be) — see markPlayerBlockWrap's note;
    // the in-flow wrapper's own containing block is no longer tall enough to give a
    // sticky element anywhere to stick to. --vmu-topbar-h (set above) supplies the top
    // offset from CSS; only left/width (the catalog column's own, ever-changing rect)
    // need setting here, exactly like the tabs just above.
    const pinnedPlayer = anyEngaged ? flowWrap : null;
    if (_pinPlayerWrap !== pinnedPlayer) {
      if (_pinPlayerWrap) {
        _pinPlayerWrap.classList.remove('vmu-pb-wrap-pinned');
        _pinPlayerWrap.style.left = _pinPlayerWrap.style.width = '';
        _pinPlayerSpacer.remove();
      }
      _pinPlayerWrap = pinnedPlayer;
      _pinPlayerSpacer = null;
    }
    if (pinnedPlayer) {
      if (_pinPlayerSpacer?.nextElementSibling !== pinnedPlayer) {
        _pinPlayerSpacer?.remove();
        const height = pinnedPlayer.getBoundingClientRect().height;
        _pinPlayerSpacer = document.createElement('div');
        _pinPlayerSpacer.setAttribute('aria-hidden', 'true');
        _pinPlayerSpacer.style.height = height + 'px';
        pinnedPlayer.before(_pinPlayerSpacer);
      }
      pinAddCls(pinnedPlayer, 'vmu-pb-wrap-pinned');
      pinSetStyle(pinnedPlayer, 'left', engagedRect.left + 'px');
      pinSetStyle(pinnedPlayer, 'width', engagedRect.width + 'px');
    }

    _pinEngagedState = anyEngaged;
    // The only two pieces of state the look depends on (see the note above the function):
    //   vmu-pinmode — the feature is on and this page has the catalog header: the in-flow
    //                 player is fixed under the top bar, VK's own duplicate copy is not
    //                 displayed;
    //   vmu-merged  — the tabs are pinned under the player right now: flat corners, no
    //                 outline between the two. Same pass, same frame as the pin itself.
    const root = document.documentElement;
    const replaceVkPlayer = !!flowWrap;
    if (root.classList.contains('vmu-pinmode') !== replaceVkPlayer) root.classList.toggle('vmu-pinmode', replaceVkPlayer);
    if (root.classList.contains('vmu-merged') !== anyEngaged) root.classList.toggle('vmu-merged', anyEngaged);
  }

  var _pinBorderEl = null, _pinBorderAt = 0; // var: applyTabsBarPin can run before this line is reached
  var _pinPlayerWrap = null, _pinPlayerSpacer = null;
  function applyAudioCatalogLayout() {
    applyAudioHeaderSplit();
    applyTabsBarPin();
  }
  window.addEventListener('resize', applyAudioCatalogLayout);
  var _pinEngagedState = false;
  var _pinSettleTimer = null;
  window.addEventListener('scroll', () => {
    if (!settings.pinTabsBar) return;
    // The merge can only change while the in-flow player is near the top bar: far
    // down while merged, or at the very top while not, a scroll event changes
    // nothing here (a resize or a mutation re-runs the full pass), so the layout
    // reads are skipped — this handler runs on every scroll event.
    const sy = window.scrollY;
    if ((_pinEngagedState && sy > 160) || (!_pinEngagedState && sy < 2)) return;
    // and one more pass shortly after the last event, so that however VK's own
    // switch of the player copy lands relative to the final scroll event, the
    // state this settles in is the right one
    clearTimeout(_pinSettleTimer);
    _pinSettleTimer = setTimeout(() => { applyTabsBarPin(); applyAudioHeaderSplit(); }, 140);
    const before = _pinEngagedState;
    applyTabsBarPin();
    // VK swaps its player copies in its own handler, possibly a frame after ours:
    // when the merge state just flipped, apply once more next frame so the
    // anchor and the flat card follow the new copy at once
    if (_pinEngagedState !== before) requestAnimationFrame(applyTabsBarPin);
  }, { passive: true });

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
  function makePerezalitoCover(coverDataUrl, preset = VMU_COVER_DEFAULTS) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000; canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, 1000, 1000);
          const layer = vmuBuildTextLayerPipeline({
            ...preset,
            textColor: vmuHexToRgb(preset.textColor),
            outlineColor: vmuHexToRgb(preset.outlineColor),
          }, preset.scale, preset.rotation);
          const [px, py] = vmuComputePosition([1000, 1000], [layer.width, layer.height], preset.position, [preset.x, preset.y]);
          ctx.drawImage(layer, px, py);
          canvas.toBlob(resolve, 'image/jpeg', 0.92);
        } catch {
          resolve(null);
        }
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

  // Scrolls to the bottom repeatedly — that's what drives the catalog's lazy
  // loading — until countFn() stops growing for stableLimit checks in a row.
  //
  // foreground: for a scan the user is watching in their own tab. A
  // backgrounded tab never runs VK's lazy loader (confirmed live — the count
  // sits still for as long as the tab is hidden), so ticks spent hidden are
  // skipped instead of read as "the list ended". Left off for the
  // hidden-window scan, where document.hidden may never clear.
  async function scrollUntilCountStable(countFn, { sleepMs = 600, stableLimit = 4, maxIter = 60, foreground = false, onCount, shouldStop } = {}) {
    let lastCount = -1, stable = 0, iter = 0;
    while (iter < maxIter && stable < stableLimit) {
      if (shouldStop?.()) break;
      if (foreground && document.hidden) { await sleep(sleepMs); continue; }
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(sleepMs);
      if (foreground && document.hidden) continue;
      iter++;
      const n = countFn();
      stable = (n === lastCount) ? stable + 1 : 0;
      lastCount = n;
      onCount?.(n);
    }
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

    await scrollUntilCountStable(() => document.querySelectorAll(CELL_SEL).length);

    return [...document.querySelectorAll(CELL_SEL)]
      .map(cell => ({
        id: cell.getAttribute('data-id') || '',
        title: cell.querySelector(TITLE_SEL)?.textContent?.trim() || '',
      }))
      .filter(p => p.id && p.title);
  }

  // Harvests the current page's own track list — used when this content
  // script is running inside the hidden tab scanPlaylistTracksInHiddenTab
  // (background.js) opened at a playlist's own vk.ru/music/playlist/<id>
  // URL, which renders the full track list directly in the page body (no
  // popup modal involved, confirmed live). expandPlaylistModal's harvest+
  // scroll loop works unchanged here since callPlaylistTailLoader/
  // markRowTrackData (injected.js) already query `document` globally rather
  // than a specific modal element.
  // The standalone playlist page renders only a collapsed preview (5 rows,
  // "Показать все" under it — verified live on a 32-track playlist), same as
  // the popup does. expandPlaylistModal skips revealModalList when handed a
  // container (an older note here said this page needed no click; VK has since
  // collapsed it), so without this step a scan only ever saw the preview.
  // Scoped to the tracks block so an unrelated "Показать все" elsewhere on the
  // page can't be hit; VK marks the button with an audiolistitems-expandbutton
  // attribute, with its text as the fallback.
  async function revealPlaylistPageList() {
    const scope = getPlaylistPageView()?.body
      || document.querySelector('[data-testid="MusicPlaylistPage_Tracks"], [data-testid="MusicPlaylistTracks_Items"]');
    if (!scope) return false;
    const btn = scope.querySelector('[audiolistitems-expandbutton]')
      || [...scope.querySelectorAll('span, a, button, div')].find(el =>
        el.children.length === 0 && /^показать (все|всё)$/i.test((el.textContent || '').trim()));
    if (!btn) return false;
    btn.click();
    await sleep(900);
    return true;
  }

  async function scanPlaylistTracksOnPage() {
    await waitForElement(VMU_MODAL_ROW_SEL, 8000); // null on timeout = legitimately empty playlist
    await revealPlaylistPageList();
    const view = getPlaylistPageView();
    const items = await expandPlaylistModal(null, null, view?.body || view?.scope || document.body);
    // artist/title are what the original callers read. id/isBlocked/duration
    // are extras for the playlist collector: isBlocked already comes off each
    // row's stamp (expandPlaylistModal), and durations are read from those
    // same stamps here — expandPlaylistModal's own items deliberately don't
    // carry one (its other callers' duplicate matching is tuned without it).
    const durationById = new Map();
    for (const row of document.querySelectorAll('[data-vmu-track]')) {
      try {
        const d = JSON.parse(row.dataset.vmuTrack);
        if (d?.id) durationById.set(d.id, d.duration || 0);
      } catch {}
    }
    return items.map(it => ({
      artist: it.artist || '', title: it.title || '',
      id: it.id || null, isBlocked: !!it.isBlocked, duration: durationById.get(it.id) || 0,
    }));
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === 'VMU_SCAN_PLAYLISTS') {
        scanAllOwnerPlaylists()
          .then(playlists => sendResponse({ ok: true, playlists }))
          .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
        return true;
      }
      if (msg?.type === 'VMU_SCAN_PLAYLIST_TRACKS') {
        scanPlaylistTracksOnPage()
          .then(tracks => sendResponse({ ok: true, tracks }))
          .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
        return true;
      }
      if (msg?.type === 'VMU_PUERRITO_READY') {
        sendResponse({ ok: true });
        return false;
      }
      return false;
    });
  }

  function translateError(msg) {
    const map = {
      btn_create_playlist_not_found: 'Кнопка "Создать плейлист" не найдена. Перейдите на страницу своей музыки (/audios) и попробуйте снова.',
      dialog_not_opened: 'Диалог плейлиста не открылся.',
      save_btn_not_found: 'Кнопка "Сохранить" не найдена в диалоге.',
      save_playlist_timeout: 'Плейлист не был сохранён за 20 секунд.',
      playlist_id_not_found: 'Не удалось получить ID созданного плейлиста.',
      edit_button_not_found: 'Не нашёл плейлист на открытой странице (нужна его кнопка «Редактировать»). Открой страницу, где плейлист виден, и повтори.',
      add_audios_btn_not_found: 'В диалоге плейлиста нет кнопки «Добавить аудиозаписи».',
      audio_item_list_not_found: 'Список «Добавить аудиозаписи» не открылся.',
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
  function waitForTrackCountIncrease(startCount, expected, timeoutMs, onTick) {
    const target = typeof expected === 'function' ? expected : () => expected;
    timeoutMs = timeoutMs || Math.max(20000, target() * 8000);
    return new Promise(resolve => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        const now = getPageTrackCount();
        const gained = now == null ? 0 : Math.max(0, now - startCount);
        if (gained >= target() || Date.now() >= deadline) { resolve(gained); return; }
        // A batch of a dozen files buys itself a minute and a half of this
        // wait; without a visible countdown it reads as a page that simply
        // stopped doing anything.
        onTick?.(gained, Math.ceil((deadline - Date.now()) / 1000));
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

  // Fetches a specific playlist's REAL current tracks by opening its own
  // shareable URL (vk.ru/music/playlist/<ownerId>_<playlistId>) in a hidden
  // background window and reading the rendered DOM there (scanPlaylistTracksInHiddenTab
  // in background.js -> scanPlaylistTracksOnPage above) — same trick and same
  // reliability reasoning as scanAllOwnerPlaylists/scanPlaylistsInHiddenTab
  // just below use for the duplicate-playlist title scan: VK's internal API
  // client route was tried for this once already (audio.getPlaylists, then
  // later the reorder feature's audio.get) and both needed a hand-parsed
  // token/live client state — fine for an interactive feature run from the
  // page that already has it, not something worth depending on from this
  // background flow. `{ok:false}` (never throws) distinguishes a genuine
  // fetch failure from a playlist that legitimately has zero tracks.
  async function fetchPlaylistTracksViaHiddenTab(ownerId, playlistId) {
    const res = await new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(
          { type: 'VKD_SCAN_PLAYLIST_TRACKS', url: `${location.origin}/music/playlist/${ownerId}_${playlistId}` },
          r => resolve(r)
        );
      } catch { resolve({ ok: false, error: 'extension context error' }); }
    });
    if (!res?.ok) return { ok: false };
    return { ok: true, tracks: res.tracks || [] };
  }

  // Validates an auto-add-to-existing-playlist candidate against the real
  // Genius album tracklist before addTracksToExistingPlaylist blindly hands
  // it every track from this upload batch. Never throws. Resolves:
  //  { ok: false }                   Genius/playlist-fetch unavailable or
  //                                   low-confidence — caller falls back to
  //                                   today's blind-add-then-prompt behavior.
  //  { ok: true, trackNames: [] }    Genius resolved confidently but there's
  //                                   nothing to add (already complete, or
  //                                   none of this batch fills a real gap) —
  //                                   caller must NOT blind-add.
  //  { ok: true, trackNames: [...] } a Genius-confirmed subset of trackNames
  //                                   that fills a real gap.
  async function resolveGeniusTracksToAdd(title, artists, trackNames, match) {
    try {
      const { query, year } = parseGeniusQueryFromTitle(title);
      if (!query) return { ok: false };

      const searchRes = await geniusMsg('VKD_GENIUS_SEARCH', { query });
      if (!searchRes?.ok || !searchRes.albums?.length) return { ok: false };
      const top = searchRes.albums[0]; // Genius's own relevance ranking — no human here to pick

      // Confidence gate: no human is picking the album, so require
      // corroborating evidence before trusting it enough to auto-modify a
      // real playlist. Artist word-overlap is a hard requirement; the year
      // (when both sides have one) is soft/corroborating only — a Genius
      // reissue's release_date_for_display can legitimately differ from an
      // ID3 TYER.
      const artistOk = artists.some(ka => wordsOf(ka).some(kw => wordsOf(top.artist).some(cw => wordsMatch(kw, cw))));
      if (!artistOk) return { ok: false };
      if (year) {
        const releaseYear = (top.release || '').match(/\d{4}/)?.[0];
        if (releaseYear && releaseYear !== year) return { ok: false };
      }

      const tracksRes = await geniusMsg('VKD_GENIUS_TRACKS', { albumId: top.id, albumUrl: top.url });
      if (!tracksRes?.ok || !tracksRes.tracks?.length) return { ok: false };
      const geniusEntries = tracksRes.tracks.map(t => ({
        artist: stripGeniusTranslation(t.artist), title: stripGeniusTranslation(t.title),
      }));

      const [ownerIdStr, playlistIdStr] = (match.id || '').split('_');
      const playlistId = parseInt(playlistIdStr, 10);
      if (!ownerIdStr || !Number.isFinite(playlistId)) return { ok: false };

      const plTracksRes = await Promise.race([
        fetchPlaylistTracksViaHiddenTab(ownerIdStr, playlistId),
        new Promise(resolve => setTimeout(() => resolve({ ok: false }), 20000)),
      ]);
      if (!plTracksRes.ok) return { ok: false };

      const { entryResults } = matchEntriesToRows(geniusEntries, plTracksRes.tracks.map((t, i) => ({ numId: i, ...t })));
      const missingEntries = entryResults.filter(e => !e.matched).map(e => ({ artist: e.artist, title: e.title }));
      if (!missingEntries.length) return { ok: true, trackNames: [] }; // already complete per Genius

      const batchAsRows = trackNames.map((t, i) => ({ numId: i, artist: t.artist, title: t.title }));
      const { claimedRowIndices } = matchEntriesToRows(missingEntries, batchAsRows);
      return { ok: true, trackNames: trackNames.filter((_, i) => claimedRowIndices.has(i)) };
    } catch (err) {
      console.warn('[VK Multi Upload] resolveGeniusTracksToAdd failed:', err);
      return { ok: false };
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
              // Genius validation is a strict refinement in front of the
              // blind add below: it can only narrow `namesToAdd` down to a
              // Genius-confirmed subset, or skip the add entirely when
              // Genius says the playlist is already complete — never widen
              // it or invent a failure mode of its own. When Genius can't
              // be resolved confidently (`g.ok === false`), namesToAdd stays
              // the full batch, i.e. exactly today's behavior.
              let namesToAdd = trackNames;
              let skipAutoAdd = false;
              if (settings.geniusValidateAutoAdd) {
                showProgressToast('Сверяем с Genius…', { id: 'vmu-autoplaylist' });
                const g = await resolveGeniusTracksToAdd(title, artists, trackNames, match);
                if (g.ok) {
                  if (g.trackNames.length) namesToAdd = g.trackNames;
                  else skipAutoAdd = true;
                }
              }
              if (!skipAutoAdd) {
                showProgressToast(`Плейлист «${title.slice(0,30)}» уже есть — добавляем треки…`, { id: 'vmu-autoplaylist' });
                const added = await addTracksToExistingPlaylist(match, namesToAdd);
                if (added) {
                  showProgressToast(`Добавлено в «${title.slice(0,30)}»`, { id: 'vmu-autoplaylist', kind: 'done' });
                  // Reload so the freshly-added tracks are visible in the
                  // playlist (VK's own DOM lags behind its API here — same
                  // reason reloadAfterBatchIfNeeded reloads after uploads).
                  setTimeout(() => location.reload(), 1500);
                  return;
                }
                console.warn('[VK Multi Upload] auto-add to existing playlist failed, falling back to duplicate prompt');
              }
            }
            const choice = await showDupPlaylistPrompt(title);
            if (choice.dontAskAgain) {
              settings.dupPlaylistCheck = false;
              saveSettings();
              const dupToggle = document.getElementById('vmu-dupcheck-toggle');
              if (dupToggle) dupToggle.checked = false;
              const autoAddRow = document.getElementById('vmu-autoadd-row');
              if (autoAddRow) autoAddRow.classList.add('vmu-row-disabled');
              const geniusValidateRow = document.getElementById('vmu-geniusvalidate-row');
              if (geniusValidateRow) geniusValidateRow.classList.add('vmu-row-disabled');
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
      // Extra reload after playlist creation: VK caches the owner's
      // playlist list and won't show the fresh one until a full reload,
      // and its track ordering/counts on the newly-created playlist are
      // often stale in the current DOM. The outer reloadAfterBatchIfNeeded
      // fires around the same 1.5s mark — whichever setTimeout wins tears
      // down the page, the other never runs.
      setTimeout(() => location.reload(), 1500);
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
  function getPlaylistInfoFromUrl(url = location.href) {
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

  function getPlaylistModalView(plInfo) {
    for (const scope of document.querySelectorAll('[class*="vkitInternalModalBox"]')) {
      if (!scope.checkVisibility()) continue;
      const nativeHeader = scope.querySelector('[data-testid="MusicPlaylistModal_Header"], [class*="vkitAudioListBoxHeader__root"]');
      const links = [...scope.querySelectorAll('a[href^="/music/playlist/"]')];
      const titleLink = links.find(link => {
        const id = link.pathname.match(/^\/music\/playlist\/(-?\d+)_(\d+)(?:_|\/|$)/);
        return id && (!plInfo || (id[1] === String(plInfo.ownerId) && id[2] === String(plInfo.playlistId)));
      });
      if (!nativeHeader && !titleLink) continue;
      let header = nativeHeader || titleLink;
      if (!nativeHeader) while (header.parentElement !== scope) header = header.parentElement;
      const title = header.querySelector('[data-testid="MusicPlaylistModal_Title"]') || titleLink;
      const body = scope.querySelector('[data-testid="MusicPlaylistModal_Body"], [class*="vkitModalBody__container"]')
        || [...scope.children].find(el => el !== header && el.querySelector('[data-audio-id], [data-testid$="MusicTrackRow"]'));
      const oldGroup = header.querySelector('[class*="vkuiButtonGroup__stretch"]');
      const playback = header.querySelector('button:has(svg:is([class~="vkuiIcon--play_24"], [class~="vkuiIcon--pause_24"]))');
      const controls = oldGroup?.closest('[class*="vkuiFlex__host"]')
        || playback?.closest('[role="group"]')?.parentElement?.parentElement || header;
      return { scope, header, body, title, controls };
    }
    return null;
  }

  function getPlaylistPageView() {
    if (!location.pathname.startsWith('/music/playlist/')) return null;
    const scope = document.getElementById('spa_layout_content');
    const title = scope?.querySelector('h1');
    if (!title) return null;
    const action = scope.querySelector('button:has(svg:is([class~="vkuiIcon--play_24"], [class~="vkuiIcon--pause_24"], [class~="vkuiIcon--pen_outline_24"]))');
    const group = action?.closest('[role="group"]');
    const controls = group?.parentElement?.closest('[role="group"]') || group;
    const body = scope.querySelector('[data-audio-id]')?.closest('section');
    return controls ? { scope, title, controls, body } : null;
  }

  // Find the playlist container in DOM to scope track search
  function findPlaylistContainer(plInfo) {
    if (plInfo) {
      const plKey = `${plInfo.ownerId}_${plInfo.playlistId}`;
      // Playlist opened in a modal dialog
      const view = getPlaylistModalView(plInfo) || getPlaylistPageView();
      if (view) return view.body || view.scope;
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
      const stamped = getTrackDataFromRow(row);
      if (stamped?.title) {
        seen.add(fullId);
        const [ownerId, id = fullId] = fullId.split('_');
        tracks.push({ ...stamped, id, owner_id: ownerId, fullId });
        continue;
      }

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

  function isEditPlaylistBoxOpen(box) {
    return !!box && box.isConnected
      && getComputedStyle(box).display !== 'none'
      && !!box.querySelector('.audio_pl_edit_box');
  }

  // The edit dialog's own primary "Сохранить" button — same lookup
  // createPlaylistViaUI / addTracksToExistingPlaylistViaUI do on the
  // injected.js side, scoped to the dialog's own .box_layout so a
  // .FlatButton--primary elsewhere on the page can't match.
  function findEditPlaylistSaveBtn(box) {
    const dialog = box?.querySelector('.audio_pl_edit_box');
    const scope = dialog?.closest('.box_layout') || dialog?.closest('.box_body')?.parentElement || box;
    if (!scope) return null;
    const prim = [...scope.querySelectorAll('.FlatButton--primary')].filter(b => b.offsetParent !== null);
    return prim.find(b => /сохран/i.test(b.textContent || '')) || prim[0] || null;
  }

  // Saves the edit-playlist dialog after a cover was set in it. injected.js's
  // injectCoverFile deliberately never clicks this dialog's own Save (see
  // its `preExisting` snapshot — that used to close the dialog by accident
  // mid-upload), so without this the new cover was never persisted and the
  // reload that follows threw it away. Waits for the cover upload to finish
  // first (verified live: right after the file input's change event VK
  // swaps in a local blob: preview WITH a progress indicator inside
  // .ape_cover, fires a photo/v2/upload fetch, and only then drops the
  // indicator — the thumbnail alone appears ~100ms in, long before the
  // upload is done, so it can't be the signal), then for the dialog to
  // actually close — VK closes it only once the save request succeeds, so a
  // still-open dialog after the timeout means the save failed and the
  // caller must NOT reload.
  async function saveEditPlaylistDialog(box, { coverChanged = true, strictBox = false } = {}) {
    const current = () => (isEditPlaylistBoxOpen(box) ? box : strictBox ? null : getEditPlaylistBox());
    const coverBusy = b => !!b.querySelector('.ape_cover [class*="progress"], .ape_cover [class*="loading"], .ape_cover [class*="pinner"]');

    let deadline = Date.now() + 10000;
    if (coverChanged) {
      let coverReady = false;
      while (Date.now() < deadline) {
        const b = current();
        if (!b) throw new Error('Диалог плейлиста был закрыт до сохранения обложки');
        coverReady = !!b.querySelector('.ape_cover img, .ape_cover [style*="background"]') && !coverBusy(b);
        if (coverReady) break;
        await sleep(300);
      }
      if (!coverReady && strictBox) throw new Error('Загрузка обложки не завершилась');
      await sleep(500); // Let VK register the finished upload before Save reads it.
    }

    let saveBtn = null;
    deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const b = current();
      if (!b) throw new Error('Диалог плейлиста был закрыт до сохранения обложки');
      const btn = findEditPlaylistSaveBtn(b);
      if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true' && !btn.classList.contains('FlatButton--disabled')) {
        saveBtn = btn;
        break;
      }
      await sleep(300);
    }
    if (!saveBtn) throw new Error('Кнопка "Сохранить" не найдена в диалоге плейлиста');
    saveBtn.click();

    deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      await sleep(300);
      if (!isEditPlaylistBoxOpen(box) && !getEditPlaylistBox()) return;
    }
    throw new Error('Плейлист не сохранился — диалог не закрылся. Проверьте его вручную.');
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

  // Title-first fuzzy word matching, shared by playlist-order sources
  // (dropped files, Genius tracklist) AND by the Genius-validated top-up
  // feature below (matching a Genius tracklist against an existing
  // playlist's real tracks, and separately against a just-uploaded batch).
  // Different sources format multi-artist credits too differently
  // ("ЗАМАЙ, Слава КПСС" vs "ZAMAY & Слава КПСС") for exact artist matching
  // to be safe as anything but a tiebreaker between rows sharing the same
  // normalized title (remixes, alternate versions, "feat." variants).
  function wordsOf(s) { return normalizeNamePart(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean); }
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

  // entries: [{artist, title}] (desired order / the list being checked for).
  // rows: [{numId, artist, title}] (what's actually there — numId is just an
  // opaque handle a caller can use to identify which row matched; callers
  // that don't need reordering can pass anything unique, e.g. an index).
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
  function matchEntriesToRows(entries, rows) {
    const rowMeta = rows.map(r => ({ row: r, titleKey: normalizeNamePart(r.title), titleWords: wordsOf(r.title), artistWords: new Set(wordsOf(r.artist)) }));

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

    return { entryResults, matchedNumIds: slotNumId, claimedRowIndices: claimed };
  }

  // entries is [{artist, title}] in the desired final order. Matches them
  // against the playlist's current tracks, unmatched tracks keep their
  // relative order at the end, then persists via VKD_REORDER_PLAYLIST.
  async function applyPlaylistOrderFromEntries(box, entries, sourceLabel) {
    const plInfo = getPlaylistInfoFromUrl() || lastEditPlaylistIds;
    if (!plInfo) { showToast('Не удалось определить плейлист (ownerId/playlistId)', true); return; }

    showProgressToast('Загружаю треки плейлиста…', { id: 'vmu-pl-sort' });
    const trackRes = await fetchPlaylistTracksViaApi(plInfo);
    if (!trackRes.ok) { showProgressToast('Ошибка: ' + (trackRes.error || '?'), { id: 'vmu-pl-sort', kind: 'error' }); return; }

    const rows = trackRes.tracks;
    if (!rows.length) { showToast('Не нашёл треки в плейлисте', true); return; }

    const { entryResults, matchedNumIds, claimedRowIndices } = matchEntriesToRows(entries, rows);
    const matchedOrder = matchedNumIds.filter(id => id != null);
    const leftovers = rows.filter((r, i) => !claimedRowIndices.has(i)).map(r => r.numId);
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
      // Full reload instead of closing/reopening the dialog: the popup's own
      // track-row list (React state, populated once when the dialog opened)
      // never hears about the server-side reorder otherwise (verified live:
      // reload the page and the new order is there) — same reason
      // reloadAfterBatchIfNeeded reloads after uploads. Closing+reopening
      // used to do this instead, but that only works when the dialog was
      // reached via the playlist's view popup (pencil icon) — opened
      // straight from a playlist card, there's nothing to reopen it with and
      // it just stayed closed (see the injected.js vkApiFetch fix above).
      setTimeout(() => location.reload(), 1500);
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

  // Keep the artist in shortened queries when the catalog title separates it.
  function geniusCoverQueries(title) {
    const { name, artist, year } = plcParseTitle(title);
    const clean = value => value.replace(/\s+/g, ' ').trim();
    const nameWithoutSuffix = clean(name.replace(/(?:\s*\([^()]*\)|\s*\[[^\[\]]*\])+\s*$/, ''));
    const shortName = nameWithoutSuffix || name;
    const words = shortName.split(' ');
    const minWords = artist ? 1 : 2;
    const query = name => clean([name, artist].filter(Boolean).join(' '));
    const options = [
      { query: clean(parseGeniusQueryFromTitle(title).query), name },
      { query: query(shortName), name: shortName },
      ...[1, 2, 3].map(n => {
        const shortened = words.length - n >= minWords ? words.slice(0, -n).join(' ') : '';
        return { query: shortened ? query(shortened) : '', name: shortened };
      }),
    ];
    const seen = new Set();
    return options.filter(option => {
      const key = option.query.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4).map(option => ({ ...option, artist, year }));
  }

  function matchGeniusCoverAlbums(albums, { name, artist, year }) {
    const key = value => normalizeNamePart(value).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const nameKey = key(name);
    const artistKey = key(artist);
    if (!nameKey) return [];
    const matches = albums.filter(album => {
      const albumName = key(album.name);
      const albumArtist = key(stripGeniusTranslation(album.artist));
      if (artistKey) return albumName === nameKey && albumArtist === artistKey;
      return [albumName, `${albumName} ${albumArtist}`, `${albumArtist} ${albumName}`].includes(nameKey);
    });
    const byYear = year ? matches.filter(album => album.release?.match(/\b\d{4}\b/)?.[0] === String(year)) : [];
    const candidates = byYear.length ? byYear : matches;
    return candidates.length === 1 ? candidates : [];
  }

  async function searchGeniusCoverAlbums(title, select = albums => albums, stopped = () => false) {
    let error = 'Подходящая обложка на Genius не найдена';
    for (const attempt of geniusCoverQueries(title)) {
      if (stopped()) break;
      const result = await geniusMsg('VKD_GENIUS_SEARCH', { query: attempt.query });
      if (!result?.ok) {
        error = result?.error || 'Не удалось получить ответ Genius';
        continue;
      }
      const albums = select((result.albums || []).filter(album => album.coverFull || album.cover), attempt);
      if (albums.length) return { ok: true, albums };
      error = 'Подходящая обложка на Genius не найдена';
    }
    return { ok: false, error };
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

    // ─── Genius block ──
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
  const VMU_COVER_DEFAULTS = {
    text: 'перезалито',
    fontFamily: 'Impact',
    fontSize: 176,
    outlineWidth: 3,
    textColor: '#ff0000',
    outlineColor: '#ffffff',
    position: 'center',
    x: 500,
    y: 500,
    rotation: 37,
    scale: 115,
    opacity: 255,
  };

  const VMU_PUERRITO_COVER_PRESET = {
    ...VMU_COVER_DEFAULTS,
    text: 'перезалито\nмагазином чая\nпуэррито',
    fontSize: 150,
    position: 'custom',
    x: 475,
    y: 530,
  };

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
        <div class="vmu-covered-triggers">
          <button type="button" id="vmu-covered-open" class="vmu-pick-btn">Открыть</button>
          <button type="button" id="vmu-covered-puerrito" class="vmu-pick-btn">ПУЭРРИТО</button>
        </div>
      </div>
    `;
    anchor.insertAdjacentElement('afterend', wrap);
    wrap.querySelector('#vmu-covered-open').addEventListener('click', () => openCoverEditorPanel(box));
    wrap.querySelector('#vmu-covered-puerrito').addEventListener('click', () => {
      openCoverEditorPanel(box, VMU_PUERRITO_COVER_PRESET);
    });
  }

  // Adds the "Добавить с Genius" trigger row into the edit-playlist dialog,
  // after BOTH existing rows. injectPlaylistSortToggle's own wrap and
  // injectCoverEditorRow's freshly-created wrap share the exact same class
  // (.vmu-pl-sort-wrap) — a plain box.querySelector would resolve to the
  // FIRST one (the sort row) and insert this new row between the sort and
  // cover rows instead of after both, so anchor on the LAST match instead.
  function injectGeniusFindRow(box) {
    if (!box || box.dataset.vmuFindInjected) return;
    const wraps = box.querySelectorAll('.vmu-pl-sort-wrap');
    const anchor = wraps[wraps.length - 1];
    if (!anchor) return;
    box.dataset.vmuFindInjected = '1';

    const wrap = document.createElement('div');
    wrap.className = 'vmu-pl-sort-wrap';
    wrap.innerHTML = `
      <div class="vmu-pl-sort-row">
        <span class="vmu-pl-sort-label">Добавить с Genius${helpIcon('Ищет альбом на Genius, сравнивает его треклист с тем, что уже есть в этом плейлисте, ищет недостающие треки в общем каталоге сообщества и даёт выбрать, какие из найденных добавить.')}</span>
        <button type="button" id="vmu-geniusfind-open" class="vmu-pick-btn">Открыть</button>
      </div>
    `;
    anchor.insertAdjacentElement('afterend', wrap);
    wrap.querySelector('#vmu-geniusfind-open').addEventListener('click', () => openGeniusFindPanel(box));
  }

  // Draggable floating panel, left-anchored like showParsedOrderPanel (same
  // reason: doesn't stack on the cover-editor panel if that's also open).
  // Two phases in one panel: an album search (own copy of the
  // vmu-pl-genius-* search-and-pick UI injectPlaylistSortToggle already
  // uses for reordering — a human picks the album here too, same as that
  // feature) that swaps to a review checklist once a search finds matches
  // in the community catalog.
  function openGeniusFindPanel(box) {
    document.getElementById('vmu-geniusfind-panel')?.remove();

    const panel = document.createElement('div');
    panel.id = 'vmu-geniusfind-panel';
    panel.className = 'vmu-bulkops-panel vmu-geniusfind-panel';
    panel.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Добавить с Genius</span>
        <button type="button" class="vmu-check-close" id="vmu-geniusfind-close">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body">
        <div id="vmu-geniusfind-search">
          <div class="vmu-pl-genius-searchrow">
            <input type="text" id="vmu-geniusfind-q" class="vmu-pl-genius-input" placeholder="Исполнитель альбом, или ссылка genius.com/albums/...">
            <button type="button" id="vmu-geniusfind-go" class="vmu-pick-btn">Искать</button>
          </div>
          <div id="vmu-geniusfind-results" class="vmu-pl-genius-results"></div>
        </div>
        <div id="vmu-geniusfind-review" style="display:none"></div>
      </div>
    `;
    document.body.appendChild(panel);
    makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));
    panel.querySelector('#vmu-geniusfind-close').addEventListener('click', () => panel.remove());

    const searchBlock = panel.querySelector('#vmu-geniusfind-search');
    const reviewBlock = panel.querySelector('#vmu-geniusfind-review');
    const qInput = panel.querySelector('#vmu-geniusfind-q');
    const goBtn = panel.querySelector('#vmu-geniusfind-go');
    const results = panel.querySelector('#vmu-geniusfind-results');

    const setStatus = text => {
      results.innerHTML = text ? `<div class="vmu-pl-genius-status">${escHtml(text)}</div>` : '';
    };

    const renderAlbumResults = albums => {
      results.innerHTML = albums.map((a, i) => `
        <div class="vmu-pl-genius-result" data-idx="${i}">
          ${a.cover ? `<img src="${escHtml(a.cover)}" alt="">` : ''}
          <div class="vmu-pl-genius-result-info">
            <span class="vmu-pl-genius-result-name">${escHtml(a.name)}</span>
            <span class="vmu-pl-genius-result-meta">${escHtml(a.artist)}${a.release ? ' · ' + escHtml(a.release) : ''}</span>
          </div>
        </div>
      `).join('');
      results.querySelectorAll('.vmu-pl-genius-result').forEach(el => {
        el.addEventListener('click', () => {
          const album = albums[Number(el.dataset.idx)];
          runGeniusFindFlow(album, { panel, searchBlock, reviewBlock, setStatus });
        });
      });
    };

    const runSearch = async () => {
      const raw = qInput.value.trim();
      if (!raw) return;
      if (/^https?:\/\/(www\.)?genius\.com\/albums\//i.test(raw)) {
        runGeniusFindFlow({ url: raw }, { panel, searchBlock, reviewBlock, setStatus });
        return;
      }
      setStatus('Ищем на Genius…');
      const res = await geniusMsg('VKD_GENIUS_SEARCH', { query: raw });
      if (!res?.ok) { setStatus(res?.error || 'ничего не найдено'); return; }
      renderAlbumResults(res.albums);
    };
    goBtn.addEventListener('click', runSearch);
    qInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });

    const titleInput = box.querySelector('input.ape_pl_input');
    qInput.value = parseGeniusQueryFromTitle(titleInput?.value).query;
  }

  // Orchestrates the "review" half of the manual find-and-add flow: fetches
  // the Genius tracklist, narrows it down to entries missing from this
  // playlist's REAL current tracks (fetchPlaylistTracksViaHiddenTab +
  // matchEntriesToRows — the exact same building blocks the automatic
  // top-up feature uses), then asks injected.js to dry-run search the
  // community catalog for just those missing entries.
  async function runGeniusFindFlow(album, ui) {
    const { searchBlock, reviewBlock, setStatus } = ui;
    setStatus('Подтягиваем треклист…');
    const tracksRes = await geniusMsg('VKD_GENIUS_TRACKS', { albumId: album.id, albumUrl: album.url });
    if (!tracksRes?.ok || !tracksRes.tracks?.length) { setStatus(tracksRes?.error || 'не удалось получить треклист'); return; }
    const geniusEntries = tracksRes.tracks.map(t => ({ artist: stripGeniusTranslation(t.artist), title: stripGeniusTranslation(t.title) }));

    const plInfo = getPlaylistInfoFromUrl() || lastEditPlaylistIds;
    if (!plInfo) { setStatus('Не удалось определить плейлист (ownerId/playlistId)'); return; }

    setStatus('Загружаю треки плейлиста…');
    const plTracksRes = await fetchPlaylistTracksViaHiddenTab(plInfo.ownerId, plInfo.playlistId);
    if (!plTracksRes.ok) { setStatus('Не удалось загрузить треки плейлиста'); return; }

    const { entryResults } = matchEntriesToRows(geniusEntries, plTracksRes.tracks.map((t, i) => ({ numId: i, ...t })));
    const missing = entryResults.filter(e => !e.matched).map(e => ({ artist: e.artist, title: e.title }));
    if (!missing.length) { setStatus('В плейлисте уже есть все треки альбома по Genius'); return; }

    setStatus(`Ищем ${missing.length} недостающих треков в каталоге сообщества…`);
    let findRes;
    try {
      findRes = await pageCall('VK_FIND_TRACKS_IN_COMMUNITY', 'VK_FIND_TRACKS_IN_COMMUNITY_DONE', {
        reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ownerId: plInfo.ownerId, playlistId: plInfo.playlistId, trackNames: missing,
      }, 150000, 'reqId');
    } catch (err) {
      setStatus('Ошибка поиска: ' + err.message);
      return;
    }

    renderGeniusFindReview({ panel: ui.panel, searchBlock, reviewBlock }, plInfo, findRes.matches || [], findRes.unmatched || []);
  }

  // Renders the checklist of what was found, and wires the confirm button
  // that ticks exactly the checked tracks (by the stable ownerId_audioId
  // handle injected.js captured during the dry run) in VK's own picker and
  // saves. Checkboxes default CHECKED: the list is already pre-filtered to
  // genuinely-missing tracks before this point, so every row is already a
  // "should probably be added" candidate — the checkbox exists to let the
  // user exclude a fuzzy-match false positive, not to make them opt into
  // every track from zero.
  function renderGeniusFindReview({ panel, searchBlock, reviewBlock }, plInfo, matches, unmatched) {
    searchBlock.style.display = 'none';
    reviewBlock.style.display = '';

    const unmatchedHtml = unmatched.length ? `
      <div class="vmu-pl-genius-status">Не нашлось в каталоге: ${unmatched.length}</div>
      <div class="vmu-parsedorder-list">
        ${unmatched.map(e => `
          <div class="vmu-parsedorder-row vmu-parsedorder-row-miss">
            <span class="vmu-parsedorder-text">${escHtml(e.artist)} — ${escHtml(e.title)}</span>
            <span class="vmu-parsedorder-status">✕</span>
          </div>
        `).join('')}
      </div>` : '';

    if (!matches.length) {
      reviewBlock.innerHTML = `<div class="vmu-pl-genius-status">Ничего не нашлось в каталоге сообщества.</div>${unmatchedHtml}`;
      return;
    }

    reviewBlock.innerHTML = `
      <div class="vmu-pl-genius-status">Найдено ${matches.length} — выберите, что добавить:</div>
      <div class="vmu-parsedorder-list">
        ${matches.map((m, i) => `
          <label class="vmu-parsedorder-row" style="cursor:pointer">
            <input type="checkbox" class="vmu-geniusfind-check" data-idx="${i}" checked>
            <span class="vmu-parsedorder-text">${escHtml(m.artist)} — ${escHtml(m.title)}</span>
          </label>
        `).join('')}
      </div>
      <div style="display:flex;padding:8px 12px 4px">
        <button type="button" id="vmu-geniusfind-confirm" class="vmu-pick-btn">Добавить выбранные</button>
      </div>
      ${unmatchedHtml}
    `;

    reviewBlock.querySelector('#vmu-geniusfind-confirm').addEventListener('click', async () => {
      const checked = [...reviewBlock.querySelectorAll('.vmu-geniusfind-check:checked')]
        .map(c => matches[Number(c.dataset.idx)].audioId)
        .filter(Boolean);
      if (!checked.length) { showToast('Ничего не выбрано', true); return; }

      const confirmBtn = reviewBlock.querySelector('#vmu-geniusfind-confirm');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Добавляем…';
      try {
        const res = await pageCall('VK_CONFIRM_ADD_TRACKS_FROM_COMMUNITY', 'VK_CONFIRM_ADD_TRACKS_FROM_COMMUNITY_DONE', {
          reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          playlistId: plInfo.playlistId, audioIds: checked,
        }, 60000, 'reqId');
        showToast(`Добавлено треков: ${res.selectedCount}`);
        panel.remove();
        // Same reason reloadAfterBatchIfNeeded reloads after uploads: the
        // edit dialog's own track list won't show the newly-added tracks
        // until VK refetches, which only happens on a real reload.
        setTimeout(() => location.reload(), 1500);
      } catch (err) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Добавить выбранные';
        const errBox = document.createElement('div');
        errBox.className = 'vmu-pl-genius-status';
        errBox.style.color = '#e64646';
        errBox.textContent = err.message === 'dialog_closed'
          ? 'Диалог плейлиста был закрыт — откройте его заново и повторите поиск'
          : 'Ошибка: ' + err.message;
        reviewBlock.insertBefore(errBox, reviewBlock.firstChild);
      }
    });
  }

  // Draggable floating panel: pick a source image (Genius album cover or a
  // local file), live-preview a text overlay on it (JS port of
  // text_overlay_app's render pipeline, see vmuBuildTextLayerPipeline
  // above), then hand the composited 1000×1000 result to
  // uploadCoverViaDialog — the same primitive the auto-playlist flow uses,
  // which drops the file into .ape_cover's input and confirms any crop step
  // on its own, then saveEditPlaylistDialog clicks the edit dialog's own
  // Save. That's what makes "Применить" end with the cover persisted, no
  // manual file dialog or Save click.
  function openCoverEditorPanel(box, preset = VMU_COVER_DEFAULTS) {
    const { text, fontFamily, fontSize, outlineWidth, textColor, outlineColor, position, x, y, rotation, scale, opacity } = preset;
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

          <textarea id="vmu-covered-text" class="vmu-covered-text" rows="${Math.max(2, text.split('\n').length)}" placeholder="Текст на обложке"></textarea>

          <div class="vmu-setting-row">
            <span class="vmu-setting-label">Шрифт</span>
            <select id="vmu-covered-font" class="vmu-covered-select">
              ${VMU_COVER_FONTS.map(f => `<option value="${escHtml(f)}">${escHtml(f)}</option>`).join('')}
            </select>
          </div>

          ${vmuCoveredSliderRow('vmu-covered-fontsize', 'Размер шрифта', 10, 300, 1, fontSize, '')}
          ${vmuCoveredSliderRow('vmu-covered-outlinewidth', 'Толщина обводки', 0, 10, 1, outlineWidth, '')}

          <div class="vmu-setting-row">
            <span class="vmu-setting-label">Цвет текста</span>
            <div class="vmu-covered-color-cell">
              <input type="color" id="vmu-covered-textcolor" value="${textColor}">
              <button type="button" id="vmu-covered-random" class="vmu-slider-reset" title="Случайный цвет">🎲</button>
            </div>
          </div>
          <div class="vmu-setting-row">
            <span class="vmu-setting-label">Цвет обводки</span>
            <input type="color" id="vmu-covered-outlinecolor" value="${outlineColor}">
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
              <input type="number" id="vmu-covered-x" value="${x}">
              <input type="number" id="vmu-covered-y" value="${y}">
            </div>
          </div>

          ${vmuCoveredSliderRow('vmu-covered-rotation', 'Поворот, °', -180, 180, 1, rotation, '')}
          ${vmuCoveredSliderRow('vmu-covered-scale', 'Масштаб, %', 10, 500, 1, scale, '')}
          ${vmuCoveredSliderRow('vmu-covered-opacity', 'Прозрачность', 0, 255, 1, opacity, '')}

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
    const state = { baseCanvas: null, resultCanvas: null, customX: x, customY: y, renderTimer: null };

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
    els.text.value = text;
    els.font.value = fontFamily;
    els.position.value = position;
    els.customRow.style.display = position === 'custom' ? '' : 'none';
    panel.querySelectorAll('select.vmu-covered-select').forEach(s => vmuEnhanceSelect(s));

    for (const [id, def, unit] of [
      ['vmu-covered-fontsize', fontSize, ''], ['vmu-covered-outlinewidth', outlineWidth, ''],
      ['vmu-covered-rotation', rotation, '°'], ['vmu-covered-scale', scale, '%'], ['vmu-covered-opacity', opacity, ''],
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

    // ─── source: Genius album cover ──
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
    const playlistTitle = titleInput?.value || '';
    const initialQuery = parseGeniusQueryFromTitle(playlistTitle).query;
    gInput.value = initialQuery;
    let searchId = 0;

    async function runGeniusSearch() {
      const raw = gInput.value.trim();
      if (!raw) return;
      const id = ++searchId;
      gResults.innerHTML = `<div class="vmu-pl-genius-status">Ищем на Genius…</div>`;
      const isStale = () => id !== searchId || !panel.isConnected;
      const res = await searchGeniusCoverAlbums(raw === initialQuery ? playlistTitle : raw, undefined, isStale);
      if (isStale()) return;
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

    // ─── source: local file ──
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

    // ─── apply / download ──
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
        setStatus('Сохраняем плейлист…');
        await saveEditPlaylistDialog(box);
        setStatus('Обложка применена');
        showToast('Обложка плейлиста обновлена');
        // Same reason reloadAfterBatchIfNeeded reloads after uploads: the
        // playlist's cover thumbnail elsewhere on the page (grid, edit
        // dialog) stays stale until VK refetches, which only happens on a
        // real reload. Only reached once the save above went through — an
        // unsaved dialog would lose the cover on reload.
        setTimeout(() => location.reload(), 1500);
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
    for (const label of modal.querySelectorAll(':is([role="heading"], h2, h3) span')) {
      if (label.textContent.trim() !== 'Треки') continue;
      const number = [...label.parentElement.children]
        .map(el => el.textContent.trim())
        .find(text => /^\d[\d\s]*$/.test(text));
      if (number) return Number(number.replace(/\s/g, ''));
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
    return getPlaylistModalView()?.scope || null;
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

  // `container` lets a caller harvest a track list that isn't inside VK's
  // own popup modal at all — e.g. the standalone /music/playlist/<id> page,
  // which renders the same MusicTrackRow markup directly in the page body
  // (verified live) and needs no "показать все" click since it isn't a
  // collapsed preview to begin with. Every existing call keeps omitting
  // this argument, so `findOpenPlaylistModal()` + `revealModalList` still
  // run exactly as before for the popup case.
  async function expandPlaylistModal(onProgress, isCancelled, container) {
    const modal = container || findOpenPlaylistModal();
    if (!modal) return [];

    const declaredTotal = getPlaylistTotalFromModal(modal);
    if (!container) await revealModalList(modal);

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

    await harvest();
    const reportProgress = () => {
      if (!onProgress) return;
      try { onProgress(collected.size, declaredTotal); } catch {}
    };
    reportProgress();
    if (declaredTotal && collected.size >= declaredTotal) return [...collected.values()];
    const modalScroller = findModalScroller(modal);

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
      const page = findOpenPlaylistModal() ? null : getPlaylistPageView();
      if (page) await revealPlaylistPageList();
      let tracks = await expandPlaylistModal((loaded, total) => {
        if (total) report(`Раскрываем плейлист… ${loaded} / ${total}`, false, { loaded, total });
        else report(`Раскрываем плейлист… ${loaded}`);
      }, isCancelled, page?.body || page?.scope);

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

    // ─── marker column ────────────────────────────────────────────────────
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

    // ─── list column (blocked + duplicate groups) ─────────────────────────
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

  let settingsActiveTab = 'upload';
  let vmuDdOutsideClickBound = false;

  // Sections of the settings window (left rail). `id` is also the pane id.
  const SX_ICON = {
    upload:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>',
    swap:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h13"/><path d="M15 5l3 3-3 3"/><path d="M19 16H6"/><path d="M9 13l-3 3 3 3"/></svg>',
    ui:       '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>',
    slim:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h2.5l2-6 3 12 3-9 2 5 1.5-2H21"/></svg>',
    search:   '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
  };
  const SX_SECTIONS = [
    { id: 'upload',   title: 'Загрузка',       sub: 'Режим работы, плейлист, обложка и метаданные' },
    { id: 'swap',     title: 'Подмена треков', sub: 'Треки играют в версиях из вашего сообщества' },
    { id: 'ui',       title: 'Интерфейс',      sub: 'Колонки, панели и положение контента' },
    { id: 'download', title: 'Скачивание',     sub: 'Скачивание плейлистов' },
    { id: 'slim',     title: 'Обфускация',     sub: 'Приёмы, которые меняют звук и метаданные при загрузке' },
  ];

  // Visual state of the index status line: ok / busy / warn.
  function previewIndexState(text) {
    if (/Обновляется/.test(text)) return 'busy';
    if (/не построен|другого ID/.test(text)) return 'warn';
    return 'ok';
  }

  function buildSettingsPanel() {
    const hasCover = !!settings.coverDataUrl;
    const isCheck = settings.workMode === 'check';
    // anything saved from the old two-tab layout opens on the first section
    const tab = SX_SECTIONS.some(s => s.id === settingsActiveTab) ? settingsActiveTab : 'upload';
    const slimOn = settings.slimEnabled;
    const slimSjOk = slimOn && settings.slimSj;
    const slimRdOk = slimOn && settings.slimRd;
    const slimDcOk = slimOn && settings.slimDc;
    const slimMpOk = slimOn && settings.slimMp;
    const slimBdOk = slimOn && settings.slimBd;
    const slimTagOk = slimOn && settings.slimCommunityTag;
    const BROKEN_TYPES = ['HUGE (1–10 часов)', 'TINY (0–3 сек)', 'RANDOM (1–120 мин)', 'MAX'];
    const QUALITY_PRESETS = ['320 kbps', '256 kbps', '192 kbps', '128 kbps'];

    // ── small builders ──────────────────────────────────────────────────────
    const tgl = (id, on) => `<label class="vmu-toggle"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="vmu-toggle-track"></span></label>`;
    // One setting: label + hint on the left, its control on the right.
    // o.stack puts the control under the text (inputs that need the width).
    const row = (label, hint, ctl, o = {}) => `
      <div class="vmu-sx-row${o.stack ? ' vmu-sx-row-stack' : ''}${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''}>
        <div class="vmu-sx-info">
          <span class="vmu-sx-label">${label}</span>
          ${hint ? `<span class="vmu-sx-hint">${hint}</span>` : ''}
        </div>
        <div class="vmu-sx-ctl">${ctl}</div>
      </div>`;
    const card = (title, body, o = {}) => `
      <div class="vmu-sx-card${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''}>
        ${title ? `<div class="vmu-sx-card-title">${title}</div>` : ''}
        ${body}
      </div>`;
    const slider = (id, min, max, step, val, shown, reset) => `
      <div class="vmu-slider-wrap vmu-sx-slider">
        <input type="range" id="${id}" class="vmu-slider" min="${min}" max="${max}" step="${step}" value="${val}">
        <span class="vmu-slider-value" id="${id}-val">${shown}</span>
        ${reset ? `<button type="button" id="${id}-reset" class="vmu-slider-reset" title="Сбросить">↺</button>` : ''}
      </div>`;
    // A group of the obfuscation pane: a header with its own switch + a body.
    const group = (id, toggleId, checked, title, body, bodyOk) => `
      <div class="vmu-sx-group${slimOn ? '' : ' vmu-row-disabled'}" id="${id}-group">
        <div class="vmu-sx-group-head">
          ${tgl(toggleId, checked)}
          <span class="vmu-sx-group-title">${title}</span>
        </div>
        <div class="vmu-sx-group-body${bodyOk ? '' : ' vmu-row-disabled'}" id="${id}-body">${body}</div>
      </div>`;

    const indexStatus = previewIndexStatusText();
    const offsetShown = `${settings.contentOffsetX > 0 ? '+' : ''}${settings.contentOffsetX}px`;

    // ── panes ───────────────────────────────────────────────────────────────
    const paneUpload = `
      ${card('Режим работы', `
        ${row('Режим', 'Проверка — сверить имена файлов с треками на странице, без загрузки', `
          <div class="vmu-mode-switch" id="vmu-mode-switch" role="tablist">
            <button type="button" data-vmu-mode="upload" class="${isCheck ? '' : 'active'}">Загрузка</button>
            <button type="button" data-vmu-mode="check" class="${isCheck ? 'active' : ''}">Проверка</button>
          </div>`)}
        ${row('Сканировать всю страницу', 'По умолчанию проверяются только первые 100 треков', tgl('vmu-check-fullpage-toggle', settings.checkFullPage), { id: 'vmu-check-scope-row', cls: isCheck ? '' : 'vmu-row-disabled' })}
      `, { id: 'vmu-general-section' })}

      <div class="vmu-sx-note${isCheck ? '' : ' vmu-sx-hidden'}" id="vmu-upload-only-note">
        Сейчас включена «Проверка» — настройки загрузки ниже не действуют, пока не вернётесь в режим «Загрузка».
      </div>

      <div class="vmu-sx-stack${isCheck ? ' vmu-row-disabled' : ''}" id="vmu-upload-only-section">
        ${card('Авто-плейлист', `
          ${row('Создавать плейлист после загрузки', 'Загруженные треки сразу попадут в новый плейлист', tgl('vmu-ap-toggle', settings.autoPlaylist))}
          ${row('Проверять дубликаты плейлиста', 'Спросить перед созданием, если плейлист с таким названием уже есть', tgl('vmu-dupcheck-toggle', settings.dupPlaylistCheck), { id: 'vmu-dupcheck-row', cls: `vmu-sx-sub${settings.autoPlaylist ? '' : ' vmu-row-disabled'}` })}
          ${row('Добавлять в существующий плейлист', 'Если такой плейлист уже есть — добавить в него дозалитые треки вместо вопроса о дубликате', tgl('vmu-autoadd-toggle', settings.autoAddToExistingPlaylist), { id: 'vmu-autoadd-row', cls: `vmu-sx-sub vmu-sx-sub2${settings.autoPlaylist && settings.dupPlaylistCheck ? '' : ' vmu-row-disabled'}` })}
          ${row('Сверять с Genius перед добавлением', 'Добавлять только недостающие по треклисту Genius. Медленнее — открывает дополнительные вкладки', tgl('vmu-geniusvalidate-toggle', settings.geniusValidateAutoAdd), { id: 'vmu-geniusvalidate-row', cls: `vmu-sx-sub vmu-sx-sub3${settings.autoPlaylist && settings.dupPlaylistCheck && settings.autoAddToExistingPlaylist ? '' : ' vmu-row-disabled'}` })}
        `)}
        ${card('Обложка и метаданные', `
          ${row('Обложка плейлиста', 'Базовый JPG/PNG, лучше 1000×1000', `
            <div class="vmu-sx-coverctl">
              ${hasCover ? `<div id="vmu-cover-preview" title="Нажмите для смены"></div>` : ''}
              <label class="vmu-cover-pick-btn" title="Выбрать обложку">
                ${hasCover ? '↺' : '+ Выбрать'}
                <input type="file" id="vmu-cover-input" accept="image/*" style="display:none">
              </label>
              ${hasCover ? `<button id="vmu-cover-clear" title="Удалить обложку">✕</button>` : ''}
            </div>`, { id: 'vmu-cover-row', cls: settings.autoPlaylist ? '' : 'vmu-row-disabled' })}
          ${row('Обложка из ID3', 'Брать встроенную обложку первого трека, если выше ничего не выбрано', tgl('vmu-id3cover-toggle', settings.autoCoverFromId3), { id: 'vmu-id3cover-row', cls: settings.autoPlaylist && !settings.coverDataUrl ? '' : 'vmu-row-disabled' })}
          ${row('Авто-метаданные', 'Заполнить исполнителя и название из имени файла, если теги пусты', tgl('vmu-meta-toggle', settings.autoMeta))}
        `)}
      </div>`;

    const paneSwap = `
      ${card('', `
        ${row(`Подменять треки на наши <span class="vmu-sx-badge">бета</span>${helpIcon('Бета: проверено на единичных треках.\nИногда подмена не срабатывает\nили берётся не тот трек.')}`,
          'Если такой же трек (по автору и названию) есть в сообществе — плеер играет его версию, очередь не трогается',
          tgl('vmu-previewswap-toggle', settings.previewSwapEnabled))}
      `)}
      ${card('Источник', `
        ${row('ID сообщества', 'Откуда брать полные версии', `
          <div class="vmu-sx-inline">
            <input type="text" id="vmu-previewswap-owner" class="vmu-sx-input" placeholder="-206614096" value="${escHtml(settings.previewSwapOwnerId || '')}" style="width:120px">
            <button type="button" id="vmu-previewswap-usepage" class="vmu-sx-btn">Текущая страница</button>
          </div>`)}
        ${row('Индекс треков', 'Собирается и обновляется сам: при первом запуске, раз в несколько часов, при смене источника и когда для трека не нашлось пары',
          `<button type="button" id="vmu-previewswap-rebuild" class="vmu-sx-btn">Обновить сейчас</button>`)}
        <div class="vmu-sx-statusline">
          <span class="vmu-sx-status" data-state="${previewIndexState(indexStatus)}"><i class="vmu-sx-dot"></i><span id="vmu-previewswap-status">${escHtml(indexStatus)}</span></span>
        </div>
      `)}
      ${card('Исключения', `
        ${row('Исключить плейлисты из подмены', 'ID плейлистов через запятую (например альтернативные или цензурные версии) — их треки не предлагаются как замена',
          `<input type="text" id="vmu-previewswap-exclude" class="vmu-sx-input" placeholder="44, 123" value="${escHtml(settings.previewSwapExcludePlaylists || '')}">`, { stack: true })}
      `)}`;

    const paneUi = `
      ${card('Колонки и панели', `
        ${row('Закрепить сайдбар', 'Левая колонка следует за прокруткой страницы', tgl('vmu-pin-sidebar-toggle', settings.pinSidebar))}
        ${row('Закрепить панель вкладок', '«Моя музыка» / «Обзор» / поиск сливаются с верхней панелью при прокрутке', tgl('vmu-pin-tabs-toggle', settings.pinTabsBar))}
        ${row('Скрыть кнопку «Наверх»', 'Полностью убрать левую полосу со скроллом наверх', tgl('vmu-hide-stl-toggle', settings.hideScrollToTop))}
        ${row('Скрыть «Музыка друзей»', 'Убрать блок с прослушанным у друзей на странице «Моя музыка»', tgl('vmu-hide-friends-music-toggle', settings.hideFriendsMusic))}
      `)}
      ${card('Положение', `
        ${row('Смещение контента', 'Сдвиг сайдбара и основной колонки по горизонтали', slider('vmu-offset-x', -400, 400, 5, settings.contentOffsetX, offsetShown, true), { stack: true })}
      `)}
      ${card('Производительность', `
        ${row('Оптимизация больших плейлистов', 'Пропускать отрисовку строк за пределами экрана — меньше лагов при прокрутке длинных списков', tgl('vmu-optimize-toggle', settings.optimizeBigPlaylists))}
        ${row('Лёгкая анимация эквалайзера', 'Полоски у играющего трека обновляются 10 раз в секунду вместо 60 — заметно меньше нагрузка на процессор при воспроизведении', tgl('vmu-lightviz-toggle', settings.lightVisualizer !== false))}
      `)}`;

    const paneDownload = `
      ${card('Плейлисты', `
        ${row('Потоков скачивания', 'Сколько треков плейлиста скачивать одновременно', slider('vmu-dl-threads', 1, 25, 1, settings.downloadThreads, String(settings.downloadThreads), true), { stack: true })}
      `)}`;

    const paneSlim = `
      ${card('', `
        ${row('Обфускация аудио', 'Главный переключатель. Ниже включаются отдельные приёмы — все они действуют только при включённой обфускации', tgl('vmu-slim-enabled', slimOn))}
      `)}

      ${group('vmu-slim-sj', 'vmu-slim-sj', settings.slimSj, 'Спектральный джиттер', `
        ${row('Режим', '', buildDropdownHtml('vmu-slim-sj-mode-dd', ['Случайные', 'Конструктор'], settings.slimSjMode))}
        ${row('Количество полос', '', slider('vmu-slim-sj-count', 1, 50, 1, settings.slimSjCount, String(settings.slimSjCount)))}
        ${row('Глубина аттенюации (дБ)', '', slider('vmu-slim-sj-att', 1, 40, 0.5, settings.slimSjAtt, `${settings.slimSjAtt} дБ`))}
        ${row('Адаптивные частоты', 'По пикам спектра', tgl('vmu-slim-sj-adaptive', settings.slimSjAdaptive), { id: 'vmu-slim-sj-adaptive-row' })}
        ${row('Временна́я модуляция', '±1.5 дБ, 0.15 Гц', tgl('vmu-slim-sj-temporal', settings.slimSjTemporal))}
        ${row('Компенсирующий буст', '+0.5 дБ на F×1.5', tgl('vmu-slim-sj-boost', settings.slimSjBoost))}
        ${row('Добавить шум', '', tgl('vmu-slim-sj-noise', settings.slimSjNoise))}
        <div id="vmu-slim-sj-constructor"${settings.slimSjMode !== 1 ? ' style="display:none"' : ''}>
          <div class="vmu-slim-sj-presets">
            <span class="vmu-sx-mini">Пресет:</span>
            ${['Мягкий', 'Лёгкий', 'Средний', 'Сильный', 'Жёсткий', 'Максимум'].map((n, i) =>
              `<button class="vmu-slim-preset-btn" data-sj-preset="${i}">${n}</button>`).join('')}
          </div>
          <div class="vmu-slim-sj-table-hdr">
            <span>Частота (Гц)</span><span>Ослаб. (дБ)</span><span>Q</span><span></span>
          </div>
          <div id="vmu-slim-sj-rows">
            ${(settings.slimSjManualFilters || []).map((flt, i) => `
            <div class="vmu-slim-sj-row" data-sj-row="${i}">
              <input type="number" class="vmu-slim-sj-num vmu-slim-sj-freq" min="20" max="20000" step="50" value="${flt.freq}">
              <input type="number" class="vmu-slim-sj-num vmu-slim-sj-att-v" min="1" max="40" step="0.5" value="${flt.att}">
              <input type="number" class="vmu-slim-sj-num vmu-slim-sj-q" min="0.5" max="10" step="0.1" value="${flt.q}">
              <button class="vmu-slim-sj-del-btn" data-del-row="${i}">✕</button>
            </div>`).join('')}
          </div>
          <button id="vmu-slim-sj-add-row">+ Добавить фильтр</button>
        </div>
      `, slimSjOk)}

      ${group('vmu-slim-rd', 'vmu-slim-rd', settings.slimRd, 'Дрейф ресемплинга', `
        ${row('Величина дрейфа (Гц)', '', slider('vmu-slim-rd-amount', 1, 100, 1, settings.slimRdAmount, `${settings.slimRdAmount} Гц`))}
        ${row('Вибрато-модуляция', '', tgl('vmu-slim-rd-var', settings.slimRdVar))}
      `, slimRdOk)}

      ${group('vmu-slim-dc', 'vmu-slim-dc', settings.slimDc, 'DC-смещение', `
        ${row('Величина смещения', '', slider('vmu-slim-dc-val', 1, 1000, 1, Math.round(settings.slimDcVal * 1e6), (settings.slimDcVal).toExponential(1)))}
      `, slimDcOk)}

      ${group('vmu-slim-mp', 'vmu-slim-mp', settings.slimMp, 'Микропитч', `
        ${row('Сдвиг (центы)', '', slider('vmu-slim-mp-cents', 0.1, 50, 0.1, settings.slimMpCents, `${settings.slimMpCents} ¢`))}
        ${row('Случайное направление (±)', '', tgl('vmu-slim-mp-rand', settings.slimMpRand))}
      `, slimMpOk)}

      ${group('vmu-slim-bd', 'vmu-slim-bd', settings.slimBd, 'Поддельная длительность (TLEN)', `
        ${row('Тип фальсификации', '', buildDropdownHtml('vmu-slim-bd-type-dd', BROKEN_TYPES, settings.slimBdType))}
      `, slimBdOk)}

      <div class="vmu-sx-group${slimOn ? '' : ' vmu-row-disabled'}" id="vmu-slim-output-group">
        <div class="vmu-sx-group-head"><span class="vmu-sx-group-title">Выходной файл</span></div>
        <div class="vmu-sx-group-body">
          ${row('Битрейт MP3', '', buildDropdownHtml('vmu-slim-bitrate-dd', QUALITY_PRESETS, [320, 256, 192, 128].indexOf(settings.slimBitrate)))}
          ${row('Громкость выхода', '', slider('vmu-slim-volume', 0, 200, 1, settings.slimVolume, `${settings.slimVolume}%`))}
          ${row('Сохранить метаданные', '', tgl('vmu-slim-preserve-meta', settings.slimPreserveMeta))}
          ${row('Сохранить обложку', '', tgl('vmu-slim-preserve-cover', settings.slimPreserveCover))}
        </div>
      </div>

      ${group('vmu-slim-tag', 'vmu-slim-tag', settings.slimCommunityTag, 'Тег сообщества', `
        ${row('Текст метки', '', `<input type="text" id="vmu-slim-tag-text" class="vmu-sx-input" placeholder="@club123456" value="${settings.slimCommunityTagText ? settings.slimCommunityTagText.replace(/"/g, '&quot;') : ''}" maxlength="120">`, { stack: true })}
      `, slimTagOk)}`;

    const panes = { upload: paneUpload, swap: paneSwap, ui: paneUi, download: paneDownload, slim: paneSlim };
    const cur = SX_SECTIONS.find(s => s.id === tab);

    return `
      <div id="vmu-settings-panel" style="display:none">
        <div class="vmu-sx-shell">
          <nav class="vmu-sx-nav" id="vmu-sx-nav" aria-label="Разделы настроек">
            ${SX_SECTIONS.map(s => `
              <button type="button" class="vmu-sx-nav-item${s.id === tab ? ' active' : ''}" data-vmu-sx-tab="${s.id}" title="${s.title}">
                <span class="vmu-sx-nav-ico">${SX_ICON[s.id]}</span><span class="vmu-sx-nav-txt">${s.title}</span>
              </button>`).join('')}
            <div class="vmu-sx-nav-foot">Изменения сохраняются сразу</div>
          </nav>
          <div class="vmu-sx-main">
            <div class="vmu-sx-top">
              <div class="vmu-sx-heading">
                <div class="vmu-sx-h1" id="vmu-sx-h1">${cur.title}</div>
                <div class="vmu-sx-h2" id="vmu-sx-h2">${cur.sub}</div>
              </div>
              <label class="vmu-sx-search">
                <span class="vmu-sx-search-ico">${SX_ICON.search}</span>
                <input type="text" id="vmu-sx-search" placeholder="Поиск по настройкам" autocomplete="off" spellcheck="false">
              </label>
            </div>
            <div class="vmu-sx-scroll" id="vmu-sx-scroll">
              ${SX_SECTIONS.map(s => `
                <section class="vmu-sx-pane" id="vmu-sx-pane-${s.id}" data-vmu-sx-pane="${s.id}"${s.id !== tab ? ' style="display:none"' : ''}>
                  <div class="vmu-sx-pane-title">${s.title}</div>
                  ${panes[s.id]}
                </section>`).join('')}
              <div class="vmu-sx-empty" id="vmu-sx-empty" style="display:none">Ничего не найдено</div>
            </div>
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
        document.getElementById('vmu-upload-only-note')?.classList.toggle('vmu-sx-hidden', !isCheck);
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
        if (settings.hideFriendsMusic) vmuStampFriendsMusicSection();
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

    const lightVizToggle = document.getElementById('vmu-lightviz-toggle');
    if (lightVizToggle) {
      lightVizToggle.addEventListener('change', () => {
        settings.lightVisualizer = lightVizToggle.checked;
        saveSettings();
        sendPreviewSwapConfig();
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

    const previewSwapToggle = document.getElementById('vmu-previewswap-toggle');
    if (previewSwapToggle) {
      previewSwapToggle.addEventListener('change', () => {
        settings.previewSwapEnabled = previewSwapToggle.checked;
        saveSettings();
        sendPreviewSwapConfig();
        autoRefreshPreviewIndex('load');
        setPreviewIndexStatus(previewIndexStatusText());
      });
    }
    const previewSwapOwnerInput = document.getElementById('vmu-previewswap-owner');
    if (previewSwapOwnerInput) {
      previewSwapOwnerInput.addEventListener('change', () => {
        settings.previewSwapOwnerId = previewSwapOwnerInput.value.trim();
        saveSettings();
        sendPreviewSwapConfig();
        autoRefreshPreviewIndex('settings');
        setPreviewIndexStatus(previewIndexStatusText());
      });
    }
    const previewSwapUsePage = document.getElementById('vmu-previewswap-usepage');
    if (previewSwapUsePage) {
      previewSwapUsePage.addEventListener('click', () => {
        const ownerMatch = location.href.match(/audios(-?\d+)/);
        if (!ownerMatch) {
          showProgressToast('Открой страницу аудио сообщества (vk.ru/audios-…)', { kind: 'error', id: 'vmu-previewswap-toast' });
          return;
        }
        settings.previewSwapOwnerId = ownerMatch[1];
        saveSettings();
        sendPreviewSwapConfig();
        if (previewSwapOwnerInput) previewSwapOwnerInput.value = ownerMatch[1];
        autoRefreshPreviewIndex('settings');
        setPreviewIndexStatus(previewIndexStatusText());
      });
    }
    const previewSwapRebuild = document.getElementById('vmu-previewswap-rebuild');
    if (previewSwapRebuild) previewSwapRebuild.addEventListener('click', rebuildPreviewSwapIndex);
    const previewSwapExclude = document.getElementById('vmu-previewswap-exclude');
    if (previewSwapExclude) {
      previewSwapExclude.addEventListener('change', () => {
        settings.previewSwapExcludePlaylists = previewSwapExclude.value.trim();
        saveSettings();
        autoRefreshPreviewIndex('settings'); // the exclusions change what the index contains
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
        const geniusValidateRow = document.getElementById('vmu-geniusvalidate-row');
        if (geniusValidateRow) geniusValidateRow.classList.toggle('vmu-row-disabled', !(settings.autoPlaylist && settings.dupPlaylistCheck && settings.autoAddToExistingPlaylist));
      });
    }

    const dupCheckToggle = document.getElementById('vmu-dupcheck-toggle');
    if (dupCheckToggle) {
      dupCheckToggle.addEventListener('change', () => {
        settings.dupPlaylistCheck = dupCheckToggle.checked;
        saveSettings();
        const autoAddRow = document.getElementById('vmu-autoadd-row');
        if (autoAddRow) autoAddRow.classList.toggle('vmu-row-disabled', !(settings.autoPlaylist && settings.dupPlaylistCheck));
        const geniusValidateRow = document.getElementById('vmu-geniusvalidate-row');
        if (geniusValidateRow) geniusValidateRow.classList.toggle('vmu-row-disabled', !(settings.autoPlaylist && settings.dupPlaylistCheck && settings.autoAddToExistingPlaylist));
      });
    }

    const autoAddToggle = document.getElementById('vmu-autoadd-toggle');
    if (autoAddToggle) {
      autoAddToggle.addEventListener('change', () => {
        settings.autoAddToExistingPlaylist = autoAddToggle.checked;
        saveSettings();
        const geniusValidateRow = document.getElementById('vmu-geniusvalidate-row');
        if (geniusValidateRow) geniusValidateRow.classList.toggle('vmu-row-disabled', !(settings.autoPlaylist && settings.dupPlaylistCheck && settings.autoAddToExistingPlaylist));
      });
    }

    const geniusValidateToggle = document.getElementById('vmu-geniusvalidate-toggle');
    if (geniusValidateToggle) {
      geniusValidateToggle.addEventListener('change', () => {
        settings.geniusValidateAutoAdd = geniusValidateToggle.checked;
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

    // ─── Section rail + search ──────────────────────────────────────────────
    // One pane is shown at a time; typing in the search box instead shows every
    // pane with only the matching settings (cards/groups with no match are
    // hidden along with their pane), so a setting can be found without
    // knowing which section it lives in.
    const sxNav = document.getElementById('vmu-sx-nav');
    const sxSearch = document.getElementById('vmu-sx-search');
    const sxScroll = document.getElementById('vmu-sx-scroll');
    const sxPanes = () => [...document.querySelectorAll('#vmu-settings-panel .vmu-sx-pane')];
    function sxShowTab(tab) {
      settingsActiveTab = tab;
      sxNav?.querySelectorAll('.vmu-sx-nav-item').forEach(b => b.classList.toggle('active', b.dataset.vmuSxTab === tab));
      sxPanes().forEach(p => { p.style.display = p.dataset.vmuSxPane === tab ? '' : 'none'; });
      const meta = SX_SECTIONS.find(s => s.id === tab);
      const h1 = document.getElementById('vmu-sx-h1'), h2 = document.getElementById('vmu-sx-h2');
      if (meta && h1) h1.textContent = meta.title;
      if (meta && h2) h2.textContent = meta.sub;
      if (sxScroll) sxScroll.scrollTop = 0;
    }
    function sxApplySearch() {
      const q = (sxSearch?.value || '').trim().toLowerCase();
      const root = document.getElementById('vmu-settings-panel');
      if (!root) return;
      root.classList.toggle('vmu-sx-searching', !!q);
      const items = root.querySelectorAll('.vmu-sx-row, .vmu-sx-group, .vmu-sx-card, .vmu-sx-note');
      items.forEach(el => el.classList.remove('vmu-sx-nomatch'));
      let any = false;
      if (!q) {
        sxPanes().forEach(p => { p.style.display = p.dataset.vmuSxPane === settingsActiveTab ? '' : 'none'; });
        document.getElementById('vmu-sx-empty').style.display = 'none';
        return;
      }
      sxPanes().forEach(p => {
        let paneHit = false;
        p.querySelectorAll('.vmu-sx-card, .vmu-sx-group').forEach(box => {
          const rows = [...box.querySelectorAll('.vmu-sx-row')];
          const titleHit = (box.querySelector('.vmu-sx-card-title, .vmu-sx-group-title')?.textContent || '').toLowerCase().includes(q);
          let hit = titleHit;
          rows.forEach(r => {
            const m = titleHit || r.textContent.toLowerCase().includes(q);
            r.classList.toggle('vmu-sx-nomatch', !m);
            if (m) hit = true;
          });
          box.classList.toggle('vmu-sx-nomatch', !hit);
          if (hit) paneHit = true;
        });
        p.querySelectorAll('.vmu-sx-note').forEach(n => n.classList.add('vmu-sx-nomatch'));
        p.style.display = paneHit ? '' : 'none';
        if (paneHit) any = true;
      });
      document.getElementById('vmu-sx-empty').style.display = any ? 'none' : '';
    }
    if (sxNav) {
      sxNav.addEventListener('click', e => {
        const btn = e.target.closest('button[data-vmu-sx-tab]');
        if (!btn) return;
        if (sxSearch && sxSearch.value) { sxSearch.value = ''; sxApplySearch(); }
        sxShowTab(btn.dataset.vmuSxTab);
      });
    }
    if (sxSearch) {
      sxSearch.addEventListener('input', sxApplySearch);
      sxSearch.addEventListener('keydown', e => {
        if (e.key === 'Escape' && sxSearch.value) { e.stopPropagation(); sxSearch.value = ''; sxApplySearch(); }
      });
    }

    function refreshDisabledGroups() {
      const on = settings.slimEnabled;
      ['vmu-slim-sj-group','vmu-slim-rd-group','vmu-slim-dc-group','vmu-slim-mp-group',
       'vmu-slim-bd-group','vmu-slim-output-group','vmu-slim-tag-group'].forEach(id => {
        document.getElementById(id)?.classList.toggle('vmu-row-disabled', !on);
      });
      document.getElementById('vmu-slim-sj-body')?.classList.toggle('vmu-row-disabled', !(on && settings.slimSj));
      document.getElementById('vmu-slim-rd-body')?.classList.toggle('vmu-row-disabled', !(on && settings.slimRd));
      document.getElementById('vmu-slim-dc-body')?.classList.toggle('vmu-row-disabled', !(on && settings.slimDc));
      document.getElementById('vmu-slim-mp-body')?.classList.toggle('vmu-row-disabled', !(on && settings.slimMp));
      document.getElementById('vmu-slim-bd-body')?.classList.toggle('vmu-row-disabled', !(on && settings.slimBd));
      document.getElementById('vmu-slim-tag-body')?.classList.toggle('vmu-row-disabled', !(on && settings.slimCommunityTag));
    }

    function bindToggle(id, key, parse) {
      const el = document.getElementById(id);
      if (!el) return;
      const ev = el.tagName === 'INPUT' && el.type === 'range' ? 'input' : 'change';
      el.addEventListener(ev, () => {
        settings[key] = parse ? parse(el.value) : (el.type === 'checkbox' ? el.checked : el.value);
        saveSettings();
        refreshDisabledGroups();
      });
      if (el.type === 'range') el.addEventListener('change', saveSettings);
    }

    bindToggle('vmu-slim-enabled', 'slimEnabled');
    bindToggle('vmu-slim-sj', 'slimSj');
    bindToggle('vmu-slim-rd', 'slimRd');
    bindToggle('vmu-slim-dc', 'slimDc');
    bindToggle('vmu-slim-mp', 'slimMp');
    bindToggle('vmu-slim-bd', 'slimBd');
    bindToggle('vmu-slim-sj-noise', 'slimSjNoise');
    bindToggle('vmu-slim-rd-var', 'slimRdVar');
    bindToggle('vmu-slim-mp-rand', 'slimMpRand');
    bindToggle('vmu-slim-preserve-meta', 'slimPreserveMeta');
    bindToggle('vmu-slim-preserve-cover', 'slimPreserveCover');

    initCustomDropdown('vmu-slim-sj-mode-dd', idx => {
      settings.slimSjMode = idx;
      saveSettings();
      const ctor = document.getElementById('vmu-slim-sj-constructor');
      if (ctor) ctor.style.display = idx === 1 ? '' : 'none';
    });

    bindToggle('vmu-slim-sj-adaptive', 'slimSjAdaptive');
    bindToggle('vmu-slim-sj-temporal', 'slimSjTemporal');
    bindToggle('vmu-slim-sj-boost',    'slimSjBoost');

    const _SJ_PRESETS = [
      [{freq:630,att:3.0,q:1.5},{freq:3150,att:4.0,q:1.5}],
      [{freq:400,att:5.0,q:2.0},{freq:1600,att:6.0,q:2.0},{freq:6300,att:5.0,q:2.0}],
      [{freq:250,att:8.0,q:2.5},{freq:800,att:9.0,q:2.5},{freq:2500,att:8.0,q:2.5},{freq:8000,att:7.0,q:2.0},{freq:12500,att:6.0,q:1.5}],
      [{freq:120,att:12.0,q:3.0},{freq:400,att:14.0,q:3.0},{freq:1000,att:15.0,q:3.0},{freq:3150,att:14.0,q:3.0},{freq:6300,att:12.0,q:2.5},{freq:10000,att:10.0,q:2.0}],
      [{freq:120,att:18.0,q:4.0},{freq:250,att:20.0,q:4.0},{freq:630,att:22.0,q:4.0},{freq:1200,att:20.0,q:4.0},{freq:2500,att:20.0,q:3.5},{freq:4000,att:18.0,q:3.5},{freq:8000,att:18.0,q:3.0},{freq:12500,att:15.0,q:3.0}],
      [{freq:120,att:25.0,q:5.0},{freq:250,att:28.0,q:5.0},{freq:400,att:30.0,q:5.0},{freq:800,att:28.0,q:5.0},{freq:1200,att:30.0,q:5.0},{freq:2000,att:28.0,q:4.5},{freq:3150,att:28.0,q:4.5},{freq:5000,att:25.0,q:4.0},{freq:8000,att:25.0,q:4.0},{freq:10000,att:22.0,q:4.0},{freq:12500,att:20.0,q:3.5}],
    ];

    document.querySelectorAll('[data-sj-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = _SJ_PRESETS[parseInt(btn.dataset.sjPreset)];
        if (!preset) return;
        settings.slimSjManualFilters = preset.map(f => ({...f}));
        settings.slimSjMode = 1;
        settings.slimSjCount = settings.slimSjManualFilters.length;
        saveSettings();
        rebuildSettingsPanel();
      });
    });

    const _addSjRow = document.getElementById('vmu-slim-sj-add-row');
    if (_addSjRow) {
      _addSjRow.addEventListener('click', () => {
        settings.slimSjManualFilters = [...(settings.slimSjManualFilters || []), {freq: 1000, att: settings.slimSjAtt, q: 2.0}];
        settings.slimSjCount = settings.slimSjManualFilters.length;
        saveSettings();
        rebuildSettingsPanel();
      });
    }

    document.querySelectorAll('[data-del-row]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.delRow);
        settings.slimSjManualFilters = (settings.slimSjManualFilters || []).filter((_, j) => j !== i);
        settings.slimSjCount = settings.slimSjManualFilters.length;
        saveSettings();
        rebuildSettingsPanel();
      });
    });

    document.querySelectorAll('.vmu-slim-sj-row').forEach((row, i) => {
      const freqEl = row.querySelector('.vmu-slim-sj-freq');
      const attEl  = row.querySelector('.vmu-slim-sj-att-v');
      const qEl    = row.querySelector('.vmu-slim-sj-q');
      const save = () => {
        if (!settings.slimSjManualFilters[i]) return;
        settings.slimSjManualFilters[i] = {
          freq: parseFloat(freqEl.value) || 1000,
          att:  parseFloat(attEl.value)  || 7,
          q:    parseFloat(qEl.value)    || 2,
        };
        saveSettings();
      };
      [freqEl, attEl, qEl].forEach(el => el && el.addEventListener('change', save));
    });

    initCustomDropdown('vmu-slim-bd-type-dd', idx => {
      settings.slimBdType = idx;
      saveSettings();
    });
    initCustomDropdown('vmu-slim-bitrate-dd', idx => {
      settings.slimBitrate = [320, 256, 192, 128][idx] || 320;
      saveSettings();
    });
    if (!vmuDdOutsideClickBound) {
      vmuDdOutsideClickBound = true;
      document.addEventListener('click', e => {
        if (e.target.closest('.vmu-fx-dd')) return;
        document.querySelectorAll('.vmu-fx-dd-list').forEach(l => {
          l.style.display = 'none';
          l.closest('.vmu-fx-dd')?.classList.remove('vmu-fx-dd-open');
        });
      });
    }

    function bindSlider(id, key, parse, fmt) {
      const el = document.getElementById(id);
      const lbl = document.getElementById(id + '-val');
      if (!el) return;
      el.addEventListener('input', () => {
        settings[key] = parse(el.value);
        if (lbl) lbl.textContent = fmt(settings[key]);
      });
      el.addEventListener('change', saveSettings);
    }
    {
      const _SJ_FREQ_POOL = [60,80,120,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,7000,8000,9000,10000,12500,14000,16000,18000,20000];
      const _cntEl  = document.getElementById('vmu-slim-sj-count');
      const _cntLbl = document.getElementById('vmu-slim-sj-count-val');
      if (_cntEl) {
        _cntEl.addEventListener('input', () => {
          settings.slimSjCount = parseInt(_cntEl.value, 10);
          if (_cntLbl) _cntLbl.textContent = String(settings.slimSjCount);
        });
        _cntEl.addEventListener('change', () => {
          saveSettings();
          if (settings.slimSjMode !== 1) return;
          const target  = settings.slimSjCount;
          const filters = settings.slimSjManualFilters || [];
          const current = filters.length;
          if (target > current) {
            const used  = new Set(filters.map(f => f.freq));
            const avail = _SJ_FREQ_POOL.filter(f => !used.has(f));
            for (let n = 0; n < target - current; n++) {
              const pool = avail.length > 0 ? avail : [..._SJ_FREQ_POOL];
              const idx  = Math.floor(Math.random() * pool.length);
              const freq = pool[idx];
              if (avail.length > 0) avail.splice(idx, 1);
              const att  = parseFloat((settings.slimSjAtt / 2 + Math.random() * (settings.slimSjAtt / 2)).toFixed(1));
              filters.push({freq, att, q: 2.0});
            }
            settings.slimSjManualFilters = filters;
            saveSettings();
            rebuildSettingsPanel();
          } else if (target < current) {
            settings.slimSjManualFilters = filters.slice(0, target);
            saveSettings();
            rebuildSettingsPanel();
          }
        });
      }
    }
    bindSlider('vmu-slim-sj-att', 'slimSjAtt', v => parseFloat(v), v => `${v} дБ`);
    bindSlider('vmu-slim-rd-amount', 'slimRdAmount', v => parseInt(v,10), v => `${v} Гц`);
    bindSlider('vmu-slim-dc-val', 'slimDcVal', v => parseInt(v,10) * 1e-6, v => v.toExponential(1));
    bindSlider('vmu-slim-mp-cents', 'slimMpCents', v => parseFloat(v), v => `${v} ¢`);
    bindSlider('vmu-slim-volume', 'slimVolume', v => parseInt(v,10), v => `${v}%`);

    const slimTag = document.getElementById('vmu-slim-tag');
    if (slimTag) {
      slimTag.addEventListener('change', () => {
        settings.slimCommunityTag = slimTag.checked;
        saveSettings();
        document.getElementById('vmu-slim-tag-body')?.classList.toggle('vmu-row-disabled', !(settings.slimEnabled && slimTag.checked));
      });
    }
    const slimTagText = document.getElementById('vmu-slim-tag-text');
    if (slimTagText) {
      slimTagText.addEventListener('input', () => { settings.slimCommunityTagText = slimTagText.value; });
      slimTagText.addEventListener('change', saveSettings);
    }

  }

  function rebuildSettingsPanel() {
    const panel = document.getElementById('vmu-settings-panel');
    if (!panel) return;
    const wasVisible = panel.style.display !== 'none';
    const newPanel = document.createElement('div');
    newPanel.innerHTML = buildSettingsPanel();
    const newEl = newPanel.firstElementChild;
    panel.replaceWith(newEl);
    if (wasVisible) newEl.style.display = 'block';
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
    const tracker = nativeUploadTracker;
    if (tracker?.view.isConnected) {
      const row = tracker.rows[idx];
      if (!row || !NATIVE_UPLOAD_CANCELLABLE.has(row.state) || row.cancelRequested) return;
      if (tracker.handedOff) {
        row.cancelRequested = true;
        window.postMessage({ type: 'VMU_CANCEL_UPLOAD', trackId: row.id }, '*');
      } else {
        row.state = 'cancelled';
      }
      renderNativeUploadTracker(tracker);
      return;
    }
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
    if (nativeUploadTracker?.list === list) {
      renderNativeUploadTracker(nativeUploadTracker);
      return;
    }

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

  const NATIVE_UPLOAD_ACTIVE = new Set(['preparing', 'waiting', 'uploading', 'saving']);
  const NATIVE_UPLOAD_CANCELLABLE = new Set(['preparing', 'waiting', 'uploading']);

  function startNativeUploadTracker(files) {
    const box = getUploadDialog();
    const view = box?.querySelector('#vmu-embedded');
    const list = view?.querySelector('#vmu-list');
    if (!list) return null;
    if (nativeUploadTracker) releaseNativeUploadTracker(nativeUploadTracker);
    const tracker = {
      id: crypto.randomUUID(),
      box,
      view,
      list,
      rows: files.map((file, index) => ({ file, index, state: 'waiting', progress: null, reason: '' })),
      timer: null,
      observer: null,
      preparing: true,
      handedOff: false,
    };
    list.replaceChildren();
    list.setAttribute('aria-label', 'Очередь загрузки');
    for (const row of tracker.rows) {
      row.id = `${tracker.id}:${row.index}`;
      row.element = document.createElement('div');
      list.append(row.element);
    }
    tracker.observer = new MutationObserver(() => {
      if (!box.isConnected) {
        if (box.dataset.vmuTrackedUpload === tracker.id) setBlockAudioHide(false, tracker.id);
        releaseNativeUploadTracker(tracker);
        return;
      }
      if (!view.isConnected) {
        const footer = box.querySelector('[data-testid="modalfooter"], [class*="vkitModalFooter"]');
        if (footer?.parentElement === box) box.insertBefore(view, footer);
        else box.append(view);
      }
    });
    nativeUploadTracker = tracker;
    tracker.observer.observe(document.body, { childList: true, subtree: true });
    renderNativeUploadTracker(tracker);
    return tracker;
  }

  function releaseNativeUploadTracker(tracker) {
    clearTimeout(tracker.timer);
    tracker.observer.disconnect();
    if (nativeUploadTracker === tracker) nativeUploadTracker = null;
  }

  function renderNativeUploadTracker(tracker) {
    const states = {
      preparing: 'Подготовка', waiting: 'В очереди', uploading: 'Загружается',
      saving: 'ВК сохраняет', done: 'Загружен', error: 'Ошибка', unconfirmed: 'Нет подтверждения',
      cancelled: 'Отменён',
    };
    for (const row of tracker.rows) {
      const el = row.element;
      const cancelling = String(!!row.cancelRequested);
      if (el.dataset.state !== row.state || el.dataset.reason !== row.reason || el.dataset.cancelling !== cancelling) {
        el.dataset.state = row.state;
        el.dataset.reason = row.reason;
        el.dataset.cancelling = cancelling;
        const iconState = row.state === 'saving' ? 'uploading' :
          Object.hasOwn(STATUS_ICON, row.state) ? row.state : 'pending';
        el.className = `vmu-item vmu-${iconState}`;
        el.innerHTML = `<span class="vmu-icon"></span><span class="vmu-info">
          <span class="vmu-name"></span></span><span class="vmu-sz"></span>`;
        const icon = el.querySelector('.vmu-icon');
        const name = el.querySelector('.vmu-name');
        name.textContent = row.file.name.replace(/\.mp3$/i, '');
        name.title = row.file.name;
        const status = el.querySelector('.vmu-sz');
        status.textContent = row.cancelRequested ? 'Отмена…' : states[row.state];
        if (row.reason) status.title = row.reason;
        if (row.state === 'error') {
          const marker = document.createElement('button');
          marker.type = 'button';
          marker.className = 'vmu-icon vmu-track-error-tip';
          marker.innerHTML = STATUS_ICON.error;
          marker.dataset.vmuTip = row.reason;
          marker.setAttribute('aria-label', `Ошибка: ${row.reason}`);
          const reason = document.createElement('span');
          reason.className = 'vmu-errmsg';
          reason.id = `vmu-upload-reason-${row.id.replace(':', '-')}`;
          reason.textContent = row.reason;
          reason.hidden = true;
          marker.setAttribute('aria-expanded', 'false');
          marker.setAttribute('aria-controls', reason.id);
          marker.addEventListener('mouseenter', () => showDlTooltip(marker));
          marker.addEventListener('mouseleave', hideDlTooltip);
          marker.addEventListener('focus', () => showDlTooltip(marker));
          marker.addEventListener('blur', hideDlTooltip);
          marker.addEventListener('click', () => {
            reason.hidden = !reason.hidden;
            marker.setAttribute('aria-expanded', String(!reason.hidden));
          });
          icon.replaceWith(marker);
          name.after(reason);
        } else {
          icon.innerHTML = STATUS_ICON[iconState];
          icon.setAttribute('aria-hidden', 'true');
        }
        if (NATIVE_UPLOAD_CANCELLABLE.has(row.state)) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'vmu-cancel-btn';
          button.dataset.idx = row.index;
          button.textContent = '✕';
          button.title = 'Отменить загрузку';
          button.setAttribute('aria-label', `Отменить загрузку файла ${row.file.name}`);
          button.disabled = !!row.cancelRequested;
          el.append(button);
        }
        if (iconState === 'uploading') {
          const bar = document.createElement('span');
          bar.className = 'vmu-progress';
          bar.setAttribute('role', 'progressbar');
          bar.setAttribute('aria-label', row.file.name);
          el.append(bar);
        }
      }
      const bar = el.querySelector('.vmu-progress');
      if (bar) {
        const progress = row.progress == null ? null : Math.round(row.progress * 100);
        bar.style.width = `${progress ?? 0}%`;
        if (progress == null) bar.removeAttribute('aria-valuenow');
        else bar.setAttribute('aria-valuenow', String(progress));
      }
    }
    const active = tracker.rows.filter(row => NATIVE_UPLOAD_ACTIVE.has(row.state)).length;
    const done = tracker.rows.filter(row => row.state === 'done').length;
    const errors = tracker.rows.filter(row => row.state === 'error').length;
    const cancelled = tracker.rows.filter(row => row.state === 'cancelled').length;
    const unknown = tracker.rows.length - active - done - errors - cancelled;
    const parts = [`Файлов: ${tracker.rows.length}`];
    if (done) parts.push(`загружено: ${done}`);
    if (errors) parts.push(`ошибок: ${errors}`);
    if (cancelled) parts.push(`отменено: ${cancelled}`);
    if (unknown) parts.push(`без подтверждения: ${unknown}`);
    const summary = tracker.view.querySelector('#vmu-status');
    const label = parts.join(' · ');
    if (summary.textContent !== label) summary.textContent = label;
    tracker.list.setAttribute('aria-busy', String(active > 0));
    const picker = document.getElementById('vmu-input');
    if (picker) picker.disabled = tracker.preparing || active > 0;
    const pickerButton = document.getElementById('vmu-pick-open');
    if (pickerButton) pickerButton.disabled = tracker.preparing || active > 0;
    const clearButton = tracker.box.querySelector('#vmu-clear');
    if (clearButton) clearButton.style.display = tracker.preparing || active ? 'none' : '';
    if (!active) clearTimeout(tracker.timer);
  }

  function resetUploadTrackerDeadline(tracker) {
    clearTimeout(tracker.timer);
    tracker.timer = setTimeout(() => {
      if (nativeUploadTracker !== tracker) return;
      for (const row of tracker.rows) {
        if (!NATIVE_UPLOAD_ACTIVE.has(row.state)) continue;
        row.state = 'unconfirmed';
        row.cancelRequested = false;
        row.reason = 'ВК не прислал результат для этого файла.';
      }
      renderNativeUploadTracker(tracker);
    }, 120_000);
  }

  function updateNativeUploadTracker(data) {
    const tracker = nativeUploadTracker;
    if (!tracker || !data) return;
    if (data.type === 'VK_UPLOAD_CANCEL_RESULT') {
      const row = tracker.rows.find(entry => entry.id === data.trackId);
      if (!row?.cancelRequested) return;
      row.cancelRequested = false;
      if (data.ok) {
        row.state = 'cancelled';
        row.reason = '';
      } else if (NATIVE_UPLOAD_CANCELLABLE.has(row.state)) {
        row.state = 'saving';
        row.reason = 'Файл уже передан ВК. Ожидаем результат.';
      }
      renderNativeUploadTracker(tracker);
      return;
    }
    if (data.type === 'VK_HANDOFF_DISPATCHED') {
      if (data.batchId !== tracker.id) return;
      resetUploadTrackerDeadline(tracker);
      const single = tracker.rows.filter(row => row.state !== 'error' && row.state !== 'cancelled').length === 1;
      for (const row of tracker.rows) {
        if (row.state !== 'waiting') continue;
        if (!data.ok) {
          row.state = 'error';
          row.reason = 'Не удалось передать файл в окно загрузки ВК.';
        } else if (single) {
          // With a single file its identity is known as soon as VK receives it.
          row.state = 'uploading';
        }
      }
      renderNativeUploadTracker(tracker);
      return;
    }
    if (!['VK_UPLOAD_STARTED', 'VK_UPLOAD_PROGRESS', 'VK_UPLOAD_SAVING', 'VK_UPLOAD_DONE'].includes(data.type)) return;
    const matching = data.trackId ? tracker.rows.filter(row => row.id === data.trackId) :
      data.fileName ? tracker.rows.filter(row => row.transferName === data.fileName) : [];
    if (matching.length !== 1) return;
    const [row] = matching;
    if (!NATIVE_UPLOAD_ACTIVE.has(row.state) && !(row.state === 'unconfirmed' && data.type === 'VK_UPLOAD_DONE')) return;
    if (data.type === 'VK_UPLOAD_SAVING') {
      row.state = 'saving';
      row.progress = 1;
    } else if (data.type === 'VK_UPLOAD_DONE') {
      row.cancelRequested = false;
      row.state = data.error ? 'error' : data.confirmed ? 'done' : 'unconfirmed';
      if (data.error) {
        row.reason = Number(data.errorCode) === 270
          ? 'Запись удалена по требованию правообладателя. ВК запрещает её повторную загрузку.'
          : typeof data.errorMsg === 'string' && data.errorMsg.trim()
            ? data.errorMsg.trim().slice(0, 500)
            : data.aborted ? 'Загрузка прервана.' : 'ВК не сообщил причину ошибки.';
      } else if (!data.confirmed) row.reason = 'ВК не подтвердил сохранение записи.';
    } else if (row.state !== 'saving') {
      row.state = 'uploading';
      if (data.type === 'VK_UPLOAD_PROGRESS' && data.total > 0) {
        row.progress = Math.max(0, Math.min(1, data.loaded / data.total));
      }
    }
    resetUploadTrackerDeadline(tracker);
    renderNativeUploadTracker(tracker);
  }

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

  function floatToInt16(f32) {
    const out = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }

  const SPECTRAL_FREQ_POOL = [
    60, 80, 100, 120, 160, 200, 250, 315,
    400, 500, 630, 800, 1000, 1250, 1600, 2000,
    2500, 3150, 4000, 5000, 6300, 7000, 8000, 9000,
    10000, 11000, 12500, 14000, 16000, 18000, 19000, 20000,
  ];

  function findSpectralPeaks(samples, sampleRate, n) {
    const maxSamples = Math.min(samples.length, sampleRate * 5);
    const energies = SPECTRAL_FREQ_POOL
      .filter(f => f < sampleRate / 2)
      .map(freq => {
        const omega = 2 * Math.PI * freq / sampleRate;
        const coeff = 2 * Math.cos(omega);
        let s1 = 0, s2 = 0;
        for (let i = 0; i < maxSamples; i++) {
          const s0 = samples[i] + coeff * s1 - s2;
          s2 = s1; s1 = s0;
        }
        return { freq, energy: s1 * s1 + s2 * s2 - coeff * s1 * s2 };
      });
    energies.sort((a, b) => b.energy - a.energy);
    const picked = [];
    for (const { freq } of energies) {
      if (picked.every(p => Math.abs(Math.log2(freq / p)) >= 0.5)) {
        picked.push(freq);
        if (picked.length >= n) break;
      }
    }
    return picked.length > 0 ? picked : null;
  }

  function pickSpectralFreqs(pool, n, minOctaveGap) {
    const tryPick = (gap) => {
      const picked = [];
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      for (const f of shuffled) {
        if (picked.every(p => Math.abs(Math.log2(f / p)) >= gap)) {
          picked.push(f);
          if (picked.length >= n) break;
        }
      }
      return picked;
    };
    let result = tryPick(minOctaveGap);
    if (result.length < n && minOctaveGap > 0.1) result = tryPick(minOctaveGap * 0.5);
    if (result.length < n) result = tryPick(0);
    return result;
  }

  function resampleLinear(samples, fromRate, toRate) {
    if (fromRate === toRate) return samples;
    const ratio = fromRate / toRate;
    const outLen = Math.round(samples.length * toRate / fromRate);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const src = i * ratio;
      const lo = Math.floor(src);
      const hi = Math.min(lo + 1, samples.length - 1);
      const t = src - lo;
      out[i] = samples[lo] * (1 - t) + samples[hi] * t;
    }
    return out;
  }

  async function applyAudioProcessing(file, onProgress) {
    const buf = await file.arrayBuffer();
    const originalBuf = buf.slice();

    const tmpCtx = new AudioContext();
    let audioBuffer;
    try {
      audioBuffer = await tmpCtx.decodeAudioData(buf.slice());
    } finally {
      tmpCtx.close();
    }

    const channels = Math.min(audioBuffer.numberOfChannels, 2);
    const sampleRate = audioBuffer.sampleRate;
    const numSamples = audioBuffer.length;

    const needsAudioPass = settings.slimSj || settings.slimVolume !== 100;
    let renderedBuffer = audioBuffer;
    if (needsAudioPass) {
      const offCtx = new OfflineAudioContext(channels, numSamples, sampleRate);
      const src = offCtx.createBufferSource();
      src.buffer = audioBuffer;
      let lastNode = src;

      if (settings.slimVolume !== 100) {
        const gain = offCtx.createGain();
        gain.gain.value = settings.slimVolume / 100;
        lastNode.connect(gain);
        lastNode = gain;
      }

      if (settings.slimSj) {
        let filterDefs = [];
        if (settings.slimSjMode === 1 && settings.slimSjManualFilters?.length > 0) {
          filterDefs = settings.slimSjManualFilters.map(flt => ({
            freq: flt.freq, att: flt.att, q: flt.q,
          }));
        } else {
          const n = Math.max(1, settings.slimSjCount | 0);
          const att = settings.slimSjAtt;
          let freqs = null;
          if (settings.slimSjAdaptive) {
            freqs = findSpectralPeaks(audioBuffer.getChannelData(0), sampleRate, n);
          }
          if (!freqs) freqs = pickSpectralFreqs(SPECTRAL_FREQ_POOL, n, 0.5);
          filterDefs = freqs.map(freq => ({
            freq,
            att: att / 2 + Math.random() * att / 2,
            q: Math.max(0.8, Math.min(6.0, 2.0 + 0.4 * Math.log2(freq / 1000))) + (Math.random() * 0.4 - 0.2),
          }));
        }
        const nFilters = filterDefs.length;
        for (let fi = 0; fi < nFilters; fi++) {
          const { freq, att, q } = filterDefs[fi];
          if (freq > sampleRate / 2 - 200) continue;
          const f = offCtx.createBiquadFilter();
          f.type = 'peaking';
          f.frequency.value = freq;
          f.gain.value = -att;
          f.Q.value = q;
          if (settings.slimSjTemporal) {
            const osc = offCtx.createOscillator();
            osc.frequency.value = 0.15;
            const phi = fi * 2 * Math.PI / nFilters;
            osc.setPeriodicWave(offCtx.createPeriodicWave(
              new Float32Array([0, Math.sin(phi)]),
              new Float32Array([0, Math.cos(phi)])
            ));
            const modG = offCtx.createGain();
            // Negative sign matches desktop: gain = -(att + 1.5*sin(...))
            // Clamp depth so effective gain never exceeds -0.3 dB (mirrors desktop's min(-0.3, ...))
            modG.gain.value = -Math.min(1.5, Math.max(0, att - 0.3));
            osc.connect(modG);
            modG.connect(f.gain);
            osc.start(0);
          }
          lastNode.connect(f);
          lastNode = f;
          if (settings.slimSjBoost) {
            const boostFreq = Math.min(Math.round(freq * 1.5), 20000);
            if (boostFreq < sampleRate / 2 - 200) {
              const bf = offCtx.createBiquadFilter();
              bf.type = 'peaking';
              bf.frequency.value = boostFreq;
              bf.gain.value = 0.5;
              bf.Q.value = Math.max(0.8, Math.min(6.0, 2.0 + 0.4 * Math.log2(boostFreq / 1000)));
              lastNode.connect(bf);
              lastNode = bf;
            }
          }
        }
      }

      lastNode.connect(offCtx.destination);
      src.start(0);
      renderedBuffer = await offCtx.startRendering();
    }

    if (onProgress) { onProgress(0.35); await new Promise(r => setTimeout(r, 0)); }

    let leftF32 = renderedBuffer.getChannelData(0).slice();
    let rightF32 = channels > 1 ? renderedBuffer.getChannelData(1).slice() : leftF32;
    let encSampleRate = sampleRate;

    if (settings.slimMp) {
      let cents = settings.slimMpCents;
      if (settings.slimMpRand && Math.random() < 0.5) cents = -cents;
      const shiftedSr = Math.round(sampleRate * Math.pow(2, cents / 1200));
      leftF32 = resampleLinear(leftF32, sampleRate, shiftedSr);
      if (channels > 1) rightF32 = resampleLinear(rightF32, sampleRate, shiftedSr);
      encSampleRate = sampleRate;
    }

    if (settings.slimRd) {
      const drift = settings.slimRdAmount | 0;
      const driftedSr = sampleRate + drift;
      leftF32 = resampleLinear(leftF32, sampleRate, driftedSr);
      if (channels > 1) rightF32 = resampleLinear(rightF32, sampleRate, driftedSr);
      if (settings.slimRdVar) {
        const wRate = 0.08 * 2 * Math.PI / driftedSr;
        const depth = 0.002;
        for (let i = 0; i < leftF32.length; i++) {
          const mod = 1.0 + depth * Math.sin(i * wRate);
          leftF32[i] *= mod;
          if (channels > 1) rightF32[i] *= mod;
        }
      }
    }

    if (settings.slimSj && settings.slimSjNoise) {
      for (let i = 0; i < leftF32.length; i++) {
        leftF32[i] += 0.00145 * (Math.random() - 0.5) + 0.00075 * (Math.random() - 0.5);
        if (channels > 1) rightF32[i] += 0.00145 * (Math.random() - 0.5) + 0.00075 * (Math.random() - 0.5);
      }
    }

    if (settings.slimDc) {
      const dcVal = settings.slimDcVal;
      for (let i = 0; i < leftF32.length; i++) {
        leftF32[i] += dcVal;
        if (channels > 1) rightF32[i] += dcVal;
      }
    }

    if (onProgress) { onProgress(0.65); await new Promise(r => setTimeout(r, 0)); }

    const bitrate = settings.slimBitrate || 320;
    const encoder = new lamejs.Mp3Encoder(channels, encSampleRate, bitrate);
    const CHUNK = 1152;
    const mp3Parts = [];
    const totalSamples = leftF32.length;

    for (let i = 0; i < totalSamples; i += CHUNK) {
      const L = floatToInt16(leftF32.subarray(i, i + CHUNK));
      const R = floatToInt16((channels > 1 ? rightF32 : leftF32).subarray(i, i + CHUNK));
      const chunk = channels > 1 ? encoder.encodeBuffer(L, R) : encoder.encodeBuffer(L);
      if (chunk.length > 0) mp3Parts.push(new Uint8Array(chunk));
      if (onProgress && i % (CHUNK * 60) === 0) {
        onProgress(0.65 + 0.3 * (i / totalSamples));
        await new Promise(r => setTimeout(r, 0));
      }
    }
    const tail = encoder.flush();
    if (tail.length > 0) mp3Parts.push(new Uint8Array(tail));

    const totalLen = mp3Parts.reduce((s, c) => s + c.length, 0);
    let mp3Data = new Uint8Array(totalLen);
    let off = 0;
    for (const p of mp3Parts) { mp3Data.set(p, off); off += p.length; }

    let id3Frames = [];
    if (settings.slimPreserveMeta || settings.slimPreserveCover) {
      try {
        const origView = new DataView(originalBuf);
        if (origView.getUint8(0) === 0x49 && origView.getUint8(1) === 0x44 && origView.getUint8(2) === 0x33) {
          const origTagSize = ((origView.getUint8(6)&0x7f)<<21)|((origView.getUint8(7)&0x7f)<<14)|
                              ((origView.getUint8(8)&0x7f)<<7)|(origView.getUint8(9)&0x7f);
          const id3Version = origView.getUint8(3);
          let pos = 10;
          const origBytes = new Uint8Array(originalBuf);
          while (pos + 10 < 10 + origTagSize) {
            const fid = String.fromCharCode(origBytes[pos],origBytes[pos+1],origBytes[pos+2],origBytes[pos+3]);
            const b4=origBytes[pos+4],b5=origBytes[pos+5],b6=origBytes[pos+6],b7=origBytes[pos+7];
            const fsize = id3Version >= 4
              ? ((b4&0x7f)<<21)|((b5&0x7f)<<14)|((b6&0x7f)<<7)|(b7&0x7f)
              : (b4<<24)|(b5<<16)|(b6<<8)|b7;
            if (fsize <= 0 || pos + 10 + fsize > 10 + origTagSize) break;
            const frameData = origBytes.subarray(pos + 10, pos + 10 + fsize);
            if (settings.slimPreserveMeta && fid !== 'TLEN' && fid !== 'APIC') {
              id3Frames.push(rawID3Frame(fid, frameData));
            }
            if (settings.slimPreserveCover && fid === 'APIC') {
              id3Frames.push(rawID3Frame(fid, frameData));
            }
            pos += 10 + fsize;
          }
        }
      } catch (_) {}
    }

    if (settings.slimBd) {
      const type = settings.slimBdType;
      let fakeDurMs;
      if (type === 0) fakeDurMs = Math.floor(Math.random() * (10*3600 - 3600) + 3600) * 1000;
      else if (type === 1) fakeDurMs = Math.floor(Math.random() * 2901) + 100;
      else if (type === 2) fakeDurMs = Math.floor(Math.random() * (120*60 - 60) + 60) * 1000;
      else fakeDurMs = 16777215 * 1000;
      id3Frames.push(makeID3Frame('TLEN', String(fakeDurMs)));
    }

    if (settings.slimCommunityTag && settings.slimCommunityTagText) {
      id3Frames.push(makeID3Frame('TCOM', settings.slimCommunityTagText));
    }

    if (id3Frames.length > 0) {
      let audioStart = 0;
      if (mp3Data[0] === 0x49 && mp3Data[1] === 0x44 && mp3Data[2] === 0x33) {
        const tagSize = ((mp3Data[6]&0x7f)<<21)|((mp3Data[7]&0x7f)<<14)|((mp3Data[8]&0x7f)<<7)|(mp3Data[9]&0x7f);
        audioStart = 10 + tagSize;
      }
      const newTag = buildID3v2(id3Frames);
      const combined = new Uint8Array(newTag.length + mp3Data.length - audioStart);
      combined.set(newTag, 0);
      combined.set(mp3Data.subarray(audioStart), newTag.length);
      mp3Data = combined;
    }

    if (onProgress) onProgress(1);
    return new File([mp3Data], file.name, { type: 'audio/mpeg' });
  }

  function rawID3Frame(fid, data) {
    const frame = new Uint8Array(10 + data.length);
    for (let i = 0; i < 4; i++) frame[i] = fid.charCodeAt(i);
    const s = data.length;
    frame[4]=(s>>24)&0xff; frame[5]=(s>>16)&0xff; frame[6]=(s>>8)&0xff; frame[7]=s&0xff;
    frame[8]=0; frame[9]=0;
    frame.set(data, 10);
    return frame;
  }

  // Renders in place of our own #vmu-dropzone, inside whatever native VK
  // dialog is already open (same host buildEmbeddedUI mounts into for both
  // old- and new-VK markup) — not a page-covering overlay. The dialog's own
  // header/footer chrome stays put, so this reads as native progress rather
  // than a separate popup stacked on top of it.
  function showProcessingUI(totalFiles) {
    let box = document.getElementById('vmu-slim-processing');
    if (box) {
      document.getElementById('vmu-slim-counter').textContent = `0 / ${totalFiles}`;
      return;
    }
    box = document.createElement('div');
    box.id = 'vmu-slim-processing';
    box.className = 'vmu-slim-processing';
    box.innerHTML = `
      <div class="vmu-slim-processing-title">Обработка треков…</div>
      <div class="vmu-slim-processing-file" id="vmu-slim-file-name"></div>
      <div class="vmu-slim-track"><div class="vmu-slim-fill" id="vmu-slim-fill"></div></div>
      <div class="vmu-slim-counter" id="vmu-slim-counter">0 / ${totalFiles}</div>`;
    const dropzone = document.getElementById('vmu-dropzone');
    if (dropzone) {
      dropzone.style.display = 'none';
      dropzone.insertAdjacentElement('afterend', box);
    } else {
      // No dialog mounted (shouldn't normally happen — files only reach
      // handoffFilesNatively through our embedded dropzone or its drop
      // target) — fall back to a small floating card so progress still
      // has somewhere to show.
      box.classList.add('vmu-slim-processing-floating');
      document.body.appendChild(box);
    }
  }

  function updateProcessingUI(fileName, fileIdx, totalFiles, filePct) {
    const nameEl = document.getElementById('vmu-slim-file-name');
    const fillEl = document.getElementById('vmu-slim-fill');
    const cntEl = document.getElementById('vmu-slim-counter');
    const short = fileName.replace(/\.mp3$/i, '');
    if (nameEl) nameEl.textContent = short.length > 52 ? short.slice(0, 50) + '…' : short;
    const overall = ((fileIdx - 1) + (filePct || 0)) / totalFiles;
    if (fillEl) fillEl.style.width = `${Math.round(overall * 100)}%`;
    if (cntEl) cntEl.textContent = `${fileIdx} / ${totalFiles}`;
  }

  function hideProcessingUI() {
    const box = document.getElementById('vmu-slim-processing');
    if (!box) return;
    const dropzone = document.getElementById('vmu-dropzone');
    if (dropzone) dropzone.style.display = '';
    box.remove();
  }

  // Reads ID3 (for auto-meta), then hands every file straight to VK's own
  // hidden native file input (see VK_HANDOFF_FILES in injected.js) and lets
  // VK's own dialog do the rest — no progress/status tracking on our side.
  async function handoffFilesNatively(files) {
    if (nativeUploadTracker?.preparing || nativeUploadTracker?.rows.some(row => NATIVE_UPLOAD_ACTIVE.has(row.state))) return;
    const tracker = startNativeUploadTracker(files);
    if (!tracker) return;
    const uploadLocation = location.href;
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

    // Best-effort per-file failure tracking for this batch: injected.js's
    // upload-response interception posts VK_UPLOAD_DONE with
    // {fileName, error} whenever it manages to correlate a response back to
    // a specific file. That correlation isn't guaranteed under native
    // handoff (VK's newer transport sometimes hands back fileName: null —
    // see NATIVE_HANDOFF_ONLY above), so this is a bonus, not a primary
    // signal: when it DOES resolve, it lets us drop a track that's known to
    // have failed (VK's own "не удалось загрузить" rejection, e.g. a
    // duplicate) from the auto-playlist search instead of scrolling the
    // whole community catalog to the bottom hunting for it.
    const failedTrackIds = new Set();
    const onUploadDone = (e) => {
      if (e.source !== window || e.data?.type !== 'VK_UPLOAD_DONE') return;
      if (!e.data.error) return;
      const rows = e.data.trackId ? tracker.rows.filter(row => row.id === e.data.trackId) :
        e.data.fileName ? tracker.rows.filter(row => row.transferName === e.data.fileName) : [];
      if (rows.length === 1) failedTrackIds.add(rows[0].id);
    };
    if (startCountEarly != null) window.addEventListener('message', onUploadDone);

    let items = [];
    let batchItems = [];
    const slimActive = settings.slimEnabled;
    let slimIdx = 0;
    for (const f of files) {
      if (!tracker.box.isConnected) break;
      let file = f;
      const row = tracker.rows[slimIdx];
      slimIdx++;
      if (row.state === 'cancelled') continue;
      if (!isMP3(f) || !f.size || f.size > 200 * 1024 * 1024) {
        row.state = 'error';
        row.reason = !isMP3(f) ? 'Выберите файл MP3.' : !f.size ? 'Файл пуст.' : 'Размер файла превышает 200 МБ.';
        renderNativeUploadTracker(tracker);
        continue;
      }
      row.state = 'preparing';
      renderNativeUploadTracker(tracker);
      // Read unconditionally (not just under autoMeta) — auto-playlist needs
      // these tags for its title/description/track-order logic below even
      // when the user doesn't want tags rewritten into the file itself.
      let tags = {};
      try { tags = await readID3(f); } catch {}
      if (row.state === 'cancelled') continue;
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
            if (artist || title) {
              file = await patchID3(f, artist, title);
              // Keep `tags` in sync with what actually got embedded/uploaded.
              // runAutoPlaylist reads tags.TPE1/TIT2 straight off this object
              // for the playlist title AND for trackNames (what the edit
              // dialog gets searched for) — left pointing at the raw
              // pre-patch tag, a source file with a missing or junk-only
              // title (e.g. TIT2 = "[vk.com/reuploadunder]", common on this
              // community's reuploads) made the search hunt for that literal
              // junk instead of the real corrected title, matching nothing
              // and scrolling the whole catalog to the bottom.
              tags = { ...tags, TPE1: artist, TIT2: title };
            }
          }
        } catch {}
      }
      if (row.state === 'cancelled') continue;
      if (slimActive) {
        try {
          file = await applyAudioProcessing(file);
        } catch (e) { console.error('[VMU Slim] processing error:', e); }
      }
      if (row.state === 'cancelled') continue;
      try {
        const buffer = await file.arrayBuffer();
        if (row.state === 'cancelled') continue;
        items.push({ name: file.name, mimeType: file.type || 'audio/mpeg', buffer, trackId: row.id });
        row.transferName = file.name;
        row.state = 'waiting';
        batchItems.push({ file, tags, status: 'done', row });
      } catch {
        if (row.state === 'cancelled') continue;
        row.state = 'error';
        row.reason = 'Не удалось прочитать файл.';
      }
      renderNativeUploadTracker(tracker);
    }
    tracker.preparing = false;
    batchItems = batchItems.filter(item => item.row.state !== 'cancelled');
    const selected = new Set(batchItems.map(item => item.row.id));
    items = items.filter(item => selected.has(item.trackId));
    renderNativeUploadTracker(tracker);
    if (!items.length || location.href !== uploadLocation || !tracker.box.isConnected) {
      if (items.length) {
        updateNativeUploadTracker({ type: 'VK_HANDOFF_DISPATCHED', batchId: tracker.id, ok: false });
      }
      if (shouldTrackPlaylist) autoPlaylistClaimed = false;
      window.removeEventListener('message', onUploadDone);
      return;
    }
    // Optimistic count — without per-file confirmation from VK we can't know
    // exactly how many actually landed, only how many we handed off. Close
    // enough for the "you're approaching VK's 70/day cap" warning this is for.
    for (let i = 0; i < items.length; i++) bumpTodayUploadCount();

    resetUploadTrackerDeadline(tracker);
    tracker.handedOff = true;
    tracker.box.dataset.vmuTrackedUpload = tracker.id;
    setBlockAudioHide(true, tracker.id);
    window.postMessage({ type: 'VK_HANDOFF_FILES', batchId: tracker.id, items }, '*', items.map(i => i.buffer));

    const startCount = startCountEarly;
    if (startCount != null) {
      showProgressToast('Ждём подтверждения загрузки…', { id: 'vmu-autoplaylist' });
      const eligible = () => batchItems.filter(item => item.row.state !== 'cancelled' && !failedTrackIds.has(item.row.id));
      waitForTrackCountIncrease(startCount, () => batchItems.filter(item => item.row.state !== 'cancelled').length)
        .then(gained => {
          autoPlaylistClaimed = false; // decided — a new upload can claim the next slot now
          window.removeEventListener('message', onUploadDone);
          if (batchItems.every(item => item.row.state === 'cancelled')) {
            showProgressToast('Загрузка отменена', { id: 'vmu-autoplaylist', kind: 'done' });
            return;
          }
          if (gained <= 0) {
            showProgressToast('Ошибка: загрузка не подтвердилась, плейлист не создан', { id: 'vmu-autoplaylist', kind: 'error' });
            return;
          }
          if (gained < items.length) {
            // Fewer tracks landed than we sent — at least one failed
            // server-side after leaving our code (duplicate, rejected by
            // VK, etc). If VK_UPLOAD_DONE positively identified enough
            // failures to account for the whole shortfall, drop exactly
            // those and search for the rest as usual; otherwise we can't
            // tell WHICH ones are missing, and searching for all of them
            // would scroll the whole catalog hunting for tracks that were
            // never actually added.
            const survivors = eligible();
            if (survivors.length === gained) {
              showProgressToast(`${items.length - gained} из ${items.length} не загрузились — пропускаем их и добавляем остальные…`, { id: 'vmu-autoplaylist' });
              enqueueAutoPlaylist(survivors);
              return;
            }
            showProgressToast(`Загружено ${gained} из ${items.length} — часть треков не удалось загрузить, плейлист не создан автоматически`, { id: 'vmu-autoplaylist', kind: 'error' });
            return;
          }
          enqueueAutoPlaylist(eligible());
        })
        .catch(err => {
          autoPlaylistClaimed = false;
          window.removeEventListener('message', onUploadDone);
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
      .replace(/[\s(]+(?:feat\.?|ft\.?|featuring|(?:при|с)\s+уч[а-я-]*\.?|уч\.)\s+.*$/i, '')
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

  // `knownTags` lets a caller that already ran readID3 on this file (the
  // playlist-from-files panel needs the raw tags too) skip a second read.
  async function fileToCheckEntry(f, knownTags) {
    const tags = knownTags || await readID3(f).catch(() => ({}));
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

  // shouldStop(collectedMap) (optional): asked after every pull — return true
  // to stop scrolling right there, e.g. once the caller has found everything
  // it was looking for. Without it the scan runs to `limit` / the end.
  async function harvestPageTracks(onProgress, limit, shouldStop) {
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
    let stopRequested = !!shouldStop && shouldStop(collected);

    // Scroll-and-harvest loop. Stops on either:
    //   - limit reached
    //   - lazy-load is exhausted (stable count for 15 iterations)
    //   - the caller's shouldStop says it has what it needs
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
    for (let i = 0; i < MAX_ITER && stable < STABLE_LIMIT && !stopRequested; i++) {
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
      if (shouldStop && !stopRequested) stopRequested = shouldStop(collected);
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

  // Where the extension's toolbar buttons go: the button group of VK's upload
  // action. Two things made the buttons «sometimes not appear»:
  //  1. every injector skipped itself when an element with its id existed ANYWHERE
  //     on the page — but VK can keep a second, hidden copy of the toolbar (another
  //     tab, a page it navigated away from), where the button had landed; the
  //     visible toolbar then never got one. Now a button only counts when it sits
  //     in the group that is actually on screen, a stray one elsewhere is dropped.
  //  2. the settings and the SoundCloud buttons were created together behind a
  //     check for the first one only, so a lost SoundCloud button never came back.
  function getToolbarAnchor() {
    const all = document.querySelectorAll('[data-testid="AudioCatalogUploadAudioAction"]');
    if (!all.length) return null;
    let uploadBtn = all[0];
    if (all.length > 1) {
      for (const b of all) { if (b.getClientRects().length) { uploadBtn = b; break; } }
    }
    const group = uploadBtn.parentElement;
    return group ? { uploadBtn, group } : null;
  }
  function toolbarBtnPresent(group, id) {
    const el = document.getElementById(id);
    if (!el) return false;
    if (el.parentElement === group) return true;
    el.remove(); // a leftover in a stale / hidden copy of the toolbar
    return false;
  }

  function injectBulkOpsButton() {
    const anchor = getToolbarAnchor();
    if (!anchor) return;
    const { uploadBtn, group } = anchor;
    if (toolbarBtnPresent(group, 'vmu-bulkops-btn')) return;
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
    const anchor = getToolbarAnchor();
    if (!anchor) return;
    const { uploadBtn, group } = anchor;
    const haveGear = toolbarBtnPresent(group, 'vmu-toolbar-settings-btn');
    const haveSc = toolbarBtnPresent(group, 'vmu-toolbar-sc-btn');
    if (haveGear && haveSc) return;
    let gearBtn = haveGear ? document.getElementById('vmu-toolbar-settings-btn') : null;
    if (!haveGear) gearBtn = document.createElement('button');
    if (!haveGear) {
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
    }

    if (haveSc) return;
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

  // ─── Playlist from local files ───────────────────────────────────────────────
  // "Плейлист из файлов": the user picks MP3s from their PC and — without
  // uploading anything — we look for those same tracks among what the
  // community has ALREADY uploaded (the page's own track list), then build a
  // playlist from the matches (a new one, or appended to an existing one).
  // The files are only a checklist: their ID3 tags / filenames say which
  // tracks are wanted and in what order; the playlist is filled with the
  // community's own copies. Creating/filling reuses the proven edit-dialog
  // automation (VK_CREATE_PLAYLIST / VK_ADD_TRACKS_TO_PLAYLIST in injected.js)
  // — the one new thing sent along is `audioIds`, so rows are ticked by exact
  // id rather than by (substring-)name.

  // PLM-PURE-BEGIN
  const PLMAKE_SIGNATURE = 'человек паук поможет каждому [vk.com/reuploadunder]';

  // Same "Альбом (Год) Исполнитель" template runAutoPlaylist builds from the
  // tags of freshly uploaded files.
  function plmakeSuggestTitle(tagsList, fallbackName) {
    const firstOf = pick => tagsList.map(pick).find(Boolean) || '';
    const album = firstOf(t => t.TALB);
    const year = firstOf(t => t.TYER || (t.TDRC || '').substring(0, 4));
    const artist = firstOf(t => t.TPE2) || firstOf(t => t.TPE1);
    let title = album;
    if (year) title += ' (' + year + ')';
    if (artist) title += ' ' + artist;
    title = title.trim();
    return title || String(fallbackName || '').replace(/\.mp3$/i, '').trim() || 'Плейлист';
  }

  function plmakeTrackNo(tags) {
    const n = parseInt(String((tags && tags.TRCK) || '').split('/')[0], 10);
    return Number.isFinite(n) ? n : null;
  }

  // Playlist order: the ID3 track numbers when every file carries a distinct
  // one, otherwise natural filename order ("2 - x" before "10 - y").
  function plmakeSortItems(items) {
    const nums = items.map(it => plmakeTrackNo(it.tags));
    const numbered = items.length > 1 && nums.every(n => n != null) && new Set(nums).size === nums.length;
    if (numbered) return items.map((it, i) => ({ it, n: nums[i] })).sort((a, b) => a.n - b.n).map(x => x.it);
    return [...items].sort((a, b) => a.entry.name.localeCompare(b.entry.name, undefined, { numeric: true, sensitivity: 'base' }));
  }

  // For every file entry: the community track it stands for, or null.
  // Built on matchEntriesToRows (title-first, fuzzy fallback), minus the pairs
  // that only exist through its last-resort "as many leftovers as unmatched
  // entries" pairing — right when reordering a playlist against itself, wrong
  // here, where the page holds far more tracks than the files looked up.
  // `sure` is false when several page tracks share the file's exact title and
  // none shares a word of its artist: probably a same-named track by someone
  // else, so the caller leaves it unticked for the user to confirm.
  function plmakeMatch(entries, tracks) {
    const rows = tracks.map((t, i) => ({ numId: i, artist: t.artist || '', title: t.title || '' }));
    const rowKeys = rows.map(r => normalizeNamePart(r.title));
    const { matchedNumIds } = matchEntriesToRows(entries, rows);
    return entries.map((en, i) => {
      const idx = matchedNumIds[i];
      const titleKey = normalizeNamePart(en.title);
      if (idx == null || !titleKey) return null;
      const sameTitle = titleKey === rowKeys[idx];
      if (!sameTitle && fuzzyTitleScore(wordsOf(en.title), wordsOf(rows[idx].title)) < FUZZY_TITLE_THRESHOLD) return null;
      let sure = true;
      if (sameTitle && rowKeys.filter(k => k === titleKey).length > 1) {
        const enWords = wordsOf(en.artist);
        const rowWords = wordsOf(rows[idx].artist);
        sure = !enWords.length || enWords.some(w => rowWords.some(rw => wordsMatch(w, rw)));
      }
      // `exact`: the title matched as-is, not via the fuzzy tier. A fuzzy
      // stand-in found early may be beaten by a real match further down the
      // page, so the scan only stops early on exact matches.
      return { track: tracks[idx], sure, exact: sameTitle };
    });
  }
  // PLM-PURE-END

  // Playlists whose cell is mounted on the open page — exactly the ones the
  // edit-dialog automation can reach (it clicks the cell's own edit button).
  function plmakeMountedPlaylists() {
    const seen = new Set();
    const out = [];
    for (const c of document.querySelectorAll('[data-testid="MusicPlaylistItem_Cell"][data-id]')) {
      const id = c.getAttribute('data-id');
      const title = c.querySelector('[data-testid="MusicPlaylistItem_Title"]')?.textContent?.trim() || '';
      if (!id || !title || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, title });
    }
    return out;
  }

  function closePlaylistMakerPanel() {
    document.getElementById('vmu-plmake-panel')?.remove();
  }

  function injectPlaylistMakerButton() {
    const anchor = getToolbarAnchor();
    if (!anchor) return;
    const { uploadBtn, group } = anchor;
    if (toolbarBtnPresent(group, 'vmu-plmake-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'vmu-plmake-btn';
    btn.className = uploadBtn.className;
    matchNativeButtonBox(btn, uploadBtn);
    btn.setAttribute('aria-label', 'Плейлист из файлов');
    btn.setAttribute('data-vmu-tip', 'Плейлист из файлов');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h10M3 9h10M3 13h6"/><path d="M15 11v5M12.5 13.5h5"/></svg>`;
    btn.addEventListener('mouseenter', () => showDlTooltip(btn));
    btn.addEventListener('mouseleave', hideDlTooltip);
    btn.addEventListener('click', () => { hideDlTooltip(); openPlaylistMakerPanel(); });
    group.insertBefore(btn, document.getElementById('vmu-bulkops-btn') || uploadBtn);
  }

  function openPlaylistMakerPanel() {
    syncVmuTheme();
    closePlaylistMakerPanel();

    const ownerMatch = location.href.match(/audios(-?\d+)/);
    const pageOwnerId = ownerMatch ? ownerMatch[1] : null;

    const panel = document.createElement('div');
    panel.id = 'vmu-plmake-panel';
    panel.className = 'vmu-bulkops-panel vmu-plmake-panel';
    panel.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Плейлист из файлов</span>
        <button type="button" class="vmu-check-close" id="vmu-plmake-close" title="Закрыть">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body vmu-plcollect-body">
        <div class="vmu-plmake-hint">Выбери MP3 с компьютера — расширение найдёт эти же треки среди уже загруженных в сообщество и соберёт из них плейлист. Файлы никуда не загружаются.</div>
        <div id="vmu-plmake-dz" class="vmu-pl-sort-dz">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9M6.5 6.5L10 3l3.5 3.5"/><path d="M4 13.5v1.5A1.5 1.5 0 0 0 5.5 16.5h9a1.5 1.5 0 0 0 1.5-1.5v-1.5"/></svg>
          <span class="vmu-pl-sort-dz-hint">Перетащи MP3 сюда</span>
          <label class="vmu-pick-btn">
            ${ICON_UPLOAD}
            Выбрать файлы
            <input type="file" id="vmu-plmake-input" class="vmu-pl-sort-input" accept=".mp3,audio/mpeg" multiple>
          </label>
        </div>
        <div class="vmu-bulk-source-hint" id="vmu-plmake-files-hint">Файлы не выбраны</div>

        <div class="vmu-plc-section vmu-plc-section-first">
          <div class="vmu-mode-switch" id="vmu-plmake-mode" role="tablist">
            <button type="button" data-mode="new" class="active">Новый плейлист</button>
            <button type="button" data-mode="existing">В существующий</button>
          </div>
          <div id="vmu-plmake-new" class="vmu-plmake-group">
            <input type="text" id="vmu-plmake-title" class="vmu-plc-input vmu-plmake-field" placeholder="Название плейлиста" spellcheck="false">
            <textarea id="vmu-plmake-desc" class="vmu-plc-input vmu-plmake-field vmu-plmake-desc" placeholder="Описание" spellcheck="false"></textarea>
            <label class="vmu-rename-check" id="vmu-plmake-cover-row" style="display:none">
              <input type="checkbox" id="vmu-plmake-cover"><span>Обложка (из настроек или из тегов файлов)</span>
            </label>
          </div>
          <div id="vmu-plmake-existing" class="vmu-plmake-group" style="display:none">
            <div class="vmu-plc-row">
              <select id="vmu-plmake-pl-select" class="vmu-covered-select" title="Плейлист, в который добавить треки"></select>
              <button type="button" id="vmu-plmake-pl-refresh" class="vmu-plc-link" title="Перечитать плейлисты, видимые на странице">Обновить</button>
            </div>
            <div class="vmu-plc-row">
              <span class="vmu-bulk-source-hint" id="vmu-plmake-pl-hint"></span>
              <button type="button" id="vmu-plmake-pl-all" class="vmu-plc-link" title="Прочитать список всех плейлистов сообщества через скрытое окно (медленнее)">Все плейлисты</button>
            </div>
          </div>
        </div>

        <div class="vmu-plc-row" title="Сколько первых треков страницы читать при поиске. Поиск остановится раньше, как только найдёт все файлы.">
          <span class="vmu-plc-label">Просматривать треков</span>
          <span class="vmu-plc-range">
            <input type="number" id="vmu-plmake-limit" class="vmu-plc-input vmu-plc-input-sm" min="1" step="50" value="100">
            <label class="vmu-rename-check">
              <input type="checkbox" id="vmu-plmake-whole"><span>вся страница</span>
            </label>
          </span>
        </div>
        <div class="vmu-plc-actions">
          <button type="button" id="vmu-plmake-find" class="vmu-pick-btn" disabled>Найти в сообществе</button>
          <button type="button" id="vmu-plmake-rescan" class="vmu-plc-link" style="display:none" title="Заново прочитать треки со страницы">Пересканировать</button>
        </div>
        <div class="vmu-plc-status" id="vmu-plmake-status"></div>
        <div class="vmu-plmake-list" id="vmu-plmake-list"></div>
        <div class="vmu-plc-actions">
          <span class="vmu-plc-count" id="vmu-plmake-count"></span>
          <button type="button" id="vmu-plmake-go" class="vmu-pick-btn" disabled>Создать плейлист</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));
    panel.querySelector('#vmu-plmake-close').addEventListener('click', closePlaylistMakerPanel);

    const $ = sel => panel.querySelector(sel);
    const dz = $('#vmu-plmake-dz');
    const fileInput = $('#vmu-plmake-input');
    const filesHint = $('#vmu-plmake-files-hint');
    const modeSwitch = $('#vmu-plmake-mode');
    const newBlock = $('#vmu-plmake-new');
    const existingBlock = $('#vmu-plmake-existing');
    const titleInput = $('#vmu-plmake-title');
    const descInput = $('#vmu-plmake-desc');
    const coverRow = $('#vmu-plmake-cover-row');
    const coverCheck = $('#vmu-plmake-cover');
    const plSelect = $('#vmu-plmake-pl-select');
    vmuEnhanceSelect(plSelect, { search: true });
    const plHint = $('#vmu-plmake-pl-hint');
    const findBtn = $('#vmu-plmake-find');
    const rescanBtn = $('#vmu-plmake-rescan');
    const statusEl = $('#vmu-plmake-status');
    const listEl = $('#vmu-plmake-list');
    const countEl = $('#vmu-plmake-count');
    const goBtn = $('#vmu-plmake-go');
    const limitInput = $('#vmu-plmake-limit');
    const wholeCheck = $('#vmu-plmake-whole');

    let items = [];          // [{ file, tags, entry }] in playlist order
    let matches = null;      // parallel to items: { track, sure } | null — null array until "Найти"
    let checked = new Set(); // indices that go into the playlist
    // The last page read: { tracks, limit (null = whole page), early (stopped
    // because every file was already found), forItems (the file list an
    // `early` read was only good for) }.
    let scan = null;
    let mode = 'new';
    let busy = false;
    let titleTouched = false, descTouched = false, coverTouched = false;

    const setStatus = (text, isError) => {
      statusEl.textContent = text || '';
      statusEl.classList.toggle('vmu-plmake-status-error', !!isError);
    };

    function updateControls() {
      const n = matches ? [...checked].filter(i => matches[i]).length : 0;
      findBtn.disabled = busy || !items.length;
      rescanBtn.style.display = scan ? '' : 'none';
      rescanBtn.disabled = busy;
      goBtn.textContent = mode === 'new' ? 'Создать плейлист' : 'Добавить в плейлист';
      goBtn.disabled = busy || !n || (mode === 'existing' && !plSelect.value);
      countEl.textContent = matches ? `Выбрано: ${n} из ${items.length}` : '';
    }
    function setBusy(b) {
      busy = b;
      for (const el of [titleInput, descInput, coverCheck, plSelect, fileInput, limitInput, wholeCheck]) el.disabled = b;
      // "вся страница" owns the number box's enabled state when not busy
      if (!b) limitInput.disabled = wholeCheck.checked;
      panel.classList.toggle('vmu-plmake-busy', b);
      // Lets the SPA-navigation watcher keep this panel (and its progress
      // line) alive: adding to a playlist that isn't on the open page opens
      // that playlist's own page mid-operation.
      if (b) panel.dataset.vmuBusy = '1'; else delete panel.dataset.vmuBusy;
      updateControls();
    }

    // How much of the page "Найти" may read — persisted, same spirit as the
    // check mode's "сканировать всю страницу" (default: just the first
    // screenfuls; the whole library only on request).
    limitInput.value = String(settings.plmakeScanLimit > 0 ? settings.plmakeScanLimit : 100);
    wholeCheck.checked = !(settings.plmakeScanLimit > 0);
    limitInput.disabled = wholeCheck.checked;
    const readLimit = () => {
      if (wholeCheck.checked) return null;
      const n = parseInt(limitInput.value, 10);
      return Number.isFinite(n) && n > 0 ? n : 100;
    };
    const saveLimit = () => {
      settings.plmakeScanLimit = wholeCheck.checked ? 0 : (readLimit() || 100);
      saveSettings();
    };
    limitInput.addEventListener('change', () => {
      limitInput.value = String(readLimit() || 100);
      saveLimit();
    });
    wholeCheck.addEventListener('change', () => {
      limitInput.disabled = wholeCheck.checked;
      saveLimit();
    });

    function renderList() {
      listEl.innerHTML = items.map((it, i) => {
        const m = matches ? matches[i] : null;
        const found = !!m;
        const foundText = m
          ? `${m.track.artist ? m.track.artist + ' — ' : ''}${m.track.title}`
          : '';
        const second = !matches ? ''
          : found
            ? `<span class="vmu-plmake-found${m.sure ? '' : ' vmu-plmake-unsure'}">${escHtml(foundText)}${m.sure ? '' : ' — проверь: артист не совпал'}</span>`
            : '<span class="vmu-plmake-missing">не найден в сообществе</span>';
        return `
          <label class="vmu-plmake-row" data-found="${found ? 1 : 0}">
            <input type="checkbox" data-i="${i}"${found && checked.has(i) ? ' checked' : ''}${found ? '' : ' disabled'}>
            <span class="vmu-bulk-preview-text">
              <span class="vmu-plmake-file">${i + 1}. ${escHtml(it.entry.name)}</span>
              ${second}
            </span>
          </label>`;
      }).join('');
      updateControls();
    }
    listEl.addEventListener('change', e => {
      const box = e.target.closest('input[data-i]');
      if (!box) return;
      const i = Number(box.dataset.i);
      if (box.checked) checked.add(i); else checked.delete(i);
      updateControls();
    });

    // Cover: the settings cover wins, else the first file with embedded art —
    // the same priority runAutoPlaylist uses.
    const hasCoverSource = () => !!(settings.coverDataUrl || items.some(it => it.tags?.APIC?.data));
    async function resolveCoverSource() {
      if (settings.coverDataUrl) return settings.coverDataUrl;
      const apicItem = items.find(it => it.tags?.APIC?.data);
      if (!apicItem) return null;
      const apic = apicItem.tags.APIC;
      const blob = new Blob([apic.data], { type: apic.mime || 'image/jpeg' });
      return new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => res(null);
        r.readAsDataURL(blob);
      });
    }

    function refreshSuggestions() {
      if (!titleTouched) titleInput.value = items.length ? plmakeSuggestTitle(items.map(it => it.tags), items[0].file.name) : '';
      if (!descTouched) descInput.value = titleInput.value ? `${titleInput.value}\n${PLMAKE_SIGNATURE}` : '';
      const hasSource = hasCoverSource();
      coverRow.style.display = hasSource ? '' : 'none';
      if (!coverTouched) coverCheck.checked = !!(settings.coverDataUrl || (settings.autoCoverFromId3 && hasSource));
    }
    titleInput.addEventListener('input', () => {
      titleTouched = true;
      if (!descTouched) descInput.value = titleInput.value ? `${titleInput.value}\n${PLMAKE_SIGNATURE}` : '';
    });
    descInput.addEventListener('input', () => { descTouched = true; });
    coverCheck.addEventListener('change', () => { coverTouched = true; });

    async function handleFiles(fileList) {
      if (busy) return;
      const mp3s = [...fileList].filter(isMP3);
      if (!mp3s.length) { setStatus('Нужны MP3-файлы', true); return; }
      setBusy(true);
      setStatus('Читаю теги…');
      try {
        const read = [];
        for (const file of mp3s) {
          const tags = await readID3(file).catch(() => ({}));
          read.push({ file, tags, entry: await fileToCheckEntry(file, tags) });
        }
        if (!panel.isConnected) return;
        items = plmakeSortItems(read);
        matches = null;
        checked = new Set();
        filesHint.textContent = `Файлов: ${items.length}`;
        refreshSuggestions();
        setStatus('');
      } finally {
        if (panel.isConnected) { setBusy(false); renderList(); }
      }
    }
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('vmu-over'); });
    dz.addEventListener('dragleave', e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('vmu-over'); });
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('vmu-over');
      handleFiles(e.dataTransfer?.files || []);
    });
    fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

    async function findInCommunity() {
      if (busy || !items.length) return;
      if (!pageOwnerId) {
        setStatus('Открой страницу аудио сообщества (vk.ru/audios-…) и запусти заново', true);
        return;
      }
      const limit = readLimit();           // null = whole page
      const entries = items.map(it => it.entry);
      setBusy(true);
      try {
        // A previous read is reused when it already covers what's asked for:
        // an equal-or-larger cap, the whole page, or an early stop that was
        // for this very file list.
        const reusable = scan && (scan.early
          ? scan.forItems === items
          : (scan.limit == null || (limit != null && scan.limit >= limit)));
        if (!reusable) {
          setStatus(`Читаю треки страницы… (0${limit ? ' из ' + limit : ''})`);
          let early = false;
          // Stop scrolling the moment every file has a confident, exact-title
          // match — the rest of a 2 700-track page can't change the result.
          // (Fuzzy or ambiguous matches keep reading, up to the cap, since a
          // better one may still be further down.)
          const allFound = collected => {
            if (collected.size < entries.length) return false;
            early = plmakeMatch(entries, [...collected.values()]).every(m => m && m.sure && m.exact);
            return early;
          };
          const map = await harvestPageTracks(n => {
            if (statusEl.isConnected) setStatus(`Читаю треки страницы… (${n}${limit ? ' из ' + limit : ''})`);
          }, limit, allFound);
          scan = { tracks: [...map.values()], limit, early, forItems: items };
        }
        if (!panel.isConnected) return;
        const tracks = limit != null && scan.tracks.length > limit ? scan.tracks.slice(0, limit) : scan.tracks;
        matches = plmakeMatch(entries, tracks);
        checked = new Set(matches.flatMap((m, i) => (m && m.sure ? [i] : [])));
        const found = matches.filter(Boolean).length;
        let msg = scan.early && found === items.length
          ? `Найдено ${found} из ${items.length} среди первых ${tracks.length} треков страницы`
          : `Просмотрено треков: ${tracks.length}. Найдено ${found} из ${items.length}`;
        // Capped read with files still missing: they may simply be further down.
        const total = getPageTrackCount();
        if (found < items.length && limit != null && tracks.length >= limit && (total == null || total > tracks.length)) {
          msg += ` — остальные могут быть глубже: увеличь число или отметь «вся страница»`;
        }
        setStatus(msg);
      } catch (err) {
        console.warn('[VK Multi Upload] playlist-maker find failed:', err);
        setStatus('Ошибка: ' + translateError(err.message), true);
      } finally {
        if (panel.isConnected) { setBusy(false); renderList(); }
      }
    }
    findBtn.addEventListener('click', findInCommunity);
    rescanBtn.addEventListener('click', () => { scan = null; matches = null; checked = new Set(); renderList(); findInCommunity(); });

    // Existing-playlist picker
    function fillPlaylists(list, hint) {
      plSelect.innerHTML = list.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.title)}</option>`).join('');
      plHint.textContent = hint;
      updateControls();
    }
    const showMountedPlaylists = () => {
      const list = plmakeMountedPlaylists();
      fillPlaylists(list, list.length
        ? `На странице плейлистов: ${list.length}`
        : 'На странице нет плейлистов — нажми «Все плейлисты»');
    };
    $('#vmu-plmake-pl-refresh').addEventListener('click', showMountedPlaylists);
    $('#vmu-plmake-pl-all').addEventListener('click', async () => {
      if (busy) return;
      if (!pageOwnerId) { plHint.textContent = 'Нужна страница /audios… сообщества'; return; }
      setBusy(true);
      plHint.textContent = 'Читаю плейлисты (откроется скрытое окно)…';
      try {
        const res = await new Promise(resolve => {
          try {
            chrome.runtime.sendMessage({ type: 'VKD_SCAN_PLAYLISTS', url: `${location.origin}/audios${pageOwnerId}` }, r => resolve(r));
          } catch { resolve({ ok: false, error: 'extension context error' }); }
        });
        if (!res?.ok) throw new Error(res?.error || 'scan failed');
        if (panel.isConnected) fillPlaylists(res.playlists || [], `Плейлистов в сообществе: ${(res.playlists || []).length}. Если нужного нет на открытой странице, добавление может не сработать`);
      } catch (err) {
        if (panel.isConnected) plHint.textContent = 'Не удалось прочитать плейлисты: ' + (err.message || err);
      } finally {
        if (panel.isConnected) setBusy(false);
      }
    });
    plSelect.addEventListener('change', updateControls);

    modeSwitch.addEventListener('click', e => {
      const b = e.target.closest('button[data-mode]');
      if (!b || busy) return;
      mode = b.dataset.mode;
      modeSwitch.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      newBlock.style.display = mode === 'new' ? '' : 'none';
      existingBlock.style.display = mode === 'existing' ? '' : 'none';
      if (mode === 'existing' && !plSelect.options.length) showMountedPlaylists();
      updateControls();
    });

    async function run() {
      if (busy || !matches) return;
      const chosen = items.map((_, i) => i).filter(i => matches[i] && checked.has(i));
      if (!chosen.length) return;
      const tracks = chosen.map(i => matches[i].track);
      const audioIds = tracks.map(t => t.id);
      const trackNames = tracks.map(t => ({ artist: t.artist || '', title: t.title || '' }));
      const reqId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const fail = msg => {
        setStatus(msg, true);
        showProgressToast(msg, { id: 'vmu-plmake', kind: 'error' });
      };

      setBusy(true);
      try {
        if (mode === 'new') {
          const title = titleInput.value.trim();
          if (!title) { setStatus('Введи название плейлиста', true); return; }
          let coverBuf = null;
          if (coverCheck.checked && hasCoverSource()) {
            setStatus('Готовим обложку…');
            const src = await resolveCoverSource();
            const blob = src ? await makePerezalitoCover(src) : null;
            coverBuf = blob ? await blob.arrayBuffer() : null;
          }
          setStatus('Создаём плейлист и добавляем треки… не закрывай вкладку');
          showProgressToast('Создаём плейлист…', { id: 'vmu-plmake' });
          // Generous timeout: ticking by id scrolls the community's whole
          // picker list until every track has been seen.
          const created = await pageCall('VK_CREATE_PLAYLIST', 'VK_PLAYLIST_CREATED', {
            reqId,
            title: title.slice(0, 255),
            description: descInput.value.slice(0, 1000),
            trackNames, audioIds, coverBuf,
          }, 240000, 'reqId');
          const added = created.selectedCount || 0;
          if (!added) {
            fail(`Плейлист «${title.slice(0, 30)}» создан, но треки добавить не удалось — добавь их вручную`);
            return;
          }
          setStatus(`Готово: «${title}» — добавлено ${added} из ${tracks.length}`);
          showProgressToast(`Плейлист «${title.slice(0, 30)}» создан: ${added} из ${tracks.length}`, { id: 'vmu-plmake', kind: 'done' });
        } else {
          const [plOwner, plId] = (plSelect.value || '').split('_');
          const playlistId = parseInt(plId, 10);
          if (!plOwner || !Number.isFinite(playlistId)) { setStatus('Выбери плейлист', true); return; }
          const plTitle = plSelect.selectedOptions[0]?.textContent || '';
          setStatus('Добавляем треки в плейлист… не закрывай вкладку');
          showProgressToast('Добавляем треки…', { id: 'vmu-plmake' });
          const res = await pageCall('VK_ADD_TRACKS_TO_PLAYLIST', 'VK_ADD_TRACKS_TO_PLAYLIST_DONE', {
            reqId, ownerId: plOwner, playlistId, trackNames, audioIds,
          }, 240000, 'reqId');
          if (!res.selectedCount) {
            fail('Ничего не добавлено — возможно, все эти треки уже есть в плейлисте');
            return;
          }
          setStatus(`Готово: в «${plTitle}» добавлено ${res.selectedCount} из ${tracks.length}`);
          showProgressToast(`Добавлено в «${plTitle.slice(0, 30)}»: ${res.selectedCount} из ${tracks.length}`, { id: 'vmu-plmake', kind: 'done' });
        }
        // Same reload the auto-playlist flow does: VK's DOM lags behind the
        // fresh playlist / newly added tracks until a full reload.
        setTimeout(() => location.reload(), 2000);
      } catch (err) {
        console.warn('[VK Multi Upload] playlist-maker failed:', err);
        fail('Ошибка: ' + translateError(err.message));
      } finally {
        if (panel.isConnected) setBusy(false);
      }
    }
    goBtn.addEventListener('click', run);

    renderList();
  }

  // ─── Пакетная заливка альбомов ───────────────────────────────────────────────
  // Pick a whole folder of MP3s, let the extension split it into albums by
  // their ID3 tags (folder name as the fallback), untick what shouldn't go,
  // and then, album by album: upload its tracks through VK's own uploader,
  // reload, find the freshly uploaded copies on the page by exact audio id,
  // and build a playlist out of exactly those. Then reload again and take the
  // next album.
  //
  // The loop reloads the page on purpose (VK's own list, and the picker the
  // playlist dialog reads, both lag behind an upload until a full reload), and
  // a reload wipes every variable in this file. So the WHOLE run lives in
  // chrome.storage.local — the album list, which tracks were ticked, what has
  // already been uploaded, which playlist was made, where in the loop we are —
  // and is picked back up by bulkalbResumeOnLoad() on the next page load. The
  // files themselves can't go in chrome.storage (10 MB quota, no Blobs), so
  // their bytes live in an IndexedDB store on vk.ru's own origin, keyed by the
  // same ids the state refers to.
  //
  // Every step is idempotent on purpose, because a reload can land anywhere:
  //  • a batch is marked 'uploading' BEFORE the hand-off is posted, and a run
  //    resumed in that stage never re-posts it — a track that silently failed
  //    is reported as missing rather than risking a second copy;
  //  • playlist creation is marked 'creating' before the call, and a run
  //    resumed in that stage looks for a playlist with that title first and
  //    only fills the gaps, instead of creating a second one;
  //  • tracks are matched to the queue by exact audioId (same approach as
  //    «Плейлист из файлов»), never by name, so re-running a step can't attach
  //    the wrong track.

  const BULKALB_STATE_KEY = 'vmu_bulkalbums_run_v1';
  const BULKALB_SESSION_KEY = 'vmu_bulkalbums_session_v1';
  // VK itself allows more per day (see DAILY_UPLOAD_LIMIT); this is the
  // per-session ceiling the run holds itself to, counted per account.
  const BULKALB_SESSION_LIMIT = 40;
  const BULKALB_DB_NAME = 'vmu_bulkalbums_files';
  const BULKALB_STORE = 'files';
  const BULKALB_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const BULKALB_SIGNATURE = PLMAKE_SIGNATURE;

  // Which VK account this counts against. remixsid — the real session
  // cookie — is HttpOnly and invisible from here, but VK names its VK-ID
  // auth cookie after the signed-in user (`ma__<uid>_nsid`, verified live),
  // which gives the account, and remixstid changes when the session does.
  // Only a hash of the cookie value is ever stored: the value itself is a
  // credential and has no business sitting in extension storage.
  function bulkalbAccountKey() {
    const raw = document.cookie || '';
    const uid = raw.match(/(?:^|;\s*)ma__(\d+)_nsid=/)?.[1] || '';
    const sess = raw.match(/(?:^|;\s*)remixstid=([^;]*)/)?.[1]
      || raw.match(/(?:^|;\s*)ma__\d+_nsid=([^;]*)/)?.[1] || '';
    if (!uid && !sess) return 'anon';
    let h = 0x811c9dc5;
    for (let i = 0; i < sess.length; i++) { h ^= sess.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (uid || 'u') + ':' + (h >>> 0).toString(36);
  }

  function bulkalbStorageGet(key) {
    return new Promise(resolve => {
      try { chrome.storage.local.get(key, r => resolve(chrome.runtime.lastError ? null : (r || {})[key] || null)); }
      catch { resolve(null); }
    });
  }
  function bulkalbStorageSet(key, value) {
    return new Promise(resolve => {
      try { chrome.storage.local.set({ [key]: value }, () => resolve(!chrome.runtime.lastError)); }
      catch { resolve(false); }
    });
  }
  function bulkalbStorageDel(key) {
    return new Promise(resolve => {
      try { chrome.storage.local.remove(key, () => resolve(true)); } catch { resolve(false); }
    });
  }

  // Session counter: how many tracks this account has already had uploaded by
  // the feature. Reset — not carried over — the moment the cookie says this is
  // a different account or a different session.
  async function bulkalbReadSession() {
    const accountKey = bulkalbAccountKey();
    const s = await bulkalbStorageGet(BULKALB_SESSION_KEY);
    if (!s || s.accountKey !== accountKey) return { accountKey, count: 0 };
    return { accountKey, count: Math.max(0, s.count || 0) };
  }
  async function bulkalbBumpSession(n) {
    const s = await bulkalbReadSession();
    const count = Math.max(0, s.count + n);
    await bulkalbStorageSet(BULKALB_SESSION_KEY, { accountKey: s.accountKey, count, at: Date.now() });
    return count;
  }
  async function bulkalbResetSession() {
    await bulkalbStorageSet(BULKALB_SESSION_KEY, { accountKey: bulkalbAccountKey(), count: 0, at: Date.now() });
  }

  // ── file bytes: IndexedDB, because they must outlive the reloads ───────────
  let _bulkalbDbP = null;
  function bulkalbDb() {
    if (_bulkalbDbP) return _bulkalbDbP;
    _bulkalbDbP = new Promise((resolve, reject) => {
      const rq = indexedDB.open(BULKALB_DB_NAME, 1);
      rq.onupgradeneeded = () => {
        if (!rq.result.objectStoreNames.contains(BULKALB_STORE)) rq.result.createObjectStore(BULKALB_STORE);
      };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error || new Error('idb open failed'));
    }).catch(err => { _bulkalbDbP = null; throw err; });
    return _bulkalbDbP;
  }
  async function bulkalbPutBlob(key, blob) {
    const db = await bulkalbDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(BULKALB_STORE, 'readwrite');
      tx.objectStore(BULKALB_STORE).put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('idb write failed'));
      tx.onabort = () => reject(tx.error || new Error('idb write aborted'));
    });
  }
  async function bulkalbGetBlob(key) {
    const db = await bulkalbDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BULKALB_STORE, 'readonly');
      const rq = tx.objectStore(BULKALB_STORE).get(key);
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => reject(rq.error || new Error('idb read failed'));
    });
  }
  async function bulkalbDeleteBlobs(keys) {
    if (!keys.length) return;
    try {
      const db = await bulkalbDb();
      await new Promise((resolve) => {
        const tx = db.transaction(BULKALB_STORE, 'readwrite');
        const store = tx.objectStore(BULKALB_STORE);
        for (const k of keys) store.delete(k);
        tx.oncomplete = resolve;
        tx.onerror = resolve;
        tx.onabort = resolve;
      });
    } catch {}
  }
  async function bulkalbDropFiles() {
    _bulkalbDbP = null;
    try { indexedDB.deleteDatabase(BULKALB_DB_NAME); } catch {}
  }

  // ── grouping files into albums ─────────────────────────────────────────────
  // Album identity, in order of trust: the ID3 album tag (plus its album
  // artist, so two different artists' "Greatest Hits" don't merge), then the
  // folder the file came from, then "every loose file is its own album".
  function bulkalbFolderOf(file) {
    const rel = file.webkitRelativePath || file._vmuRelPath || '';
    if (!rel) return '';
    const parts = rel.split('/').filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : '';
  }
  function bulkalbGroupKey(file, tags) {
    const album = (tags.TALB || '').trim();
    if (album) {
      const artist = (tags.TPE2 || tags.TPE1 || '').trim();
      return 'tag\u0000' + normalizeNamePart(album) + '\u0000' + normalizeNamePart(artist);
    }
    const folder = bulkalbFolderOf(file);
    if (folder) return 'dir\u0000' + folder.toLowerCase();
    return 'file\u0000' + (file.name || '').toLowerCase();
  }

  // [{ file, tags, entry }] → albums in a stable order, tracks sorted the same
  // way «Плейлист из файлов» sorts them (ID3 track numbers when they're all
  // there and distinct, natural filename order otherwise).
  function bulkalbGroupItems(items) {
    const byKey = new Map();
    for (const it of items) {
      const key = bulkalbGroupKey(it.file, it.tags || {});
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(it);
    }
    const albums = [];
    for (const [key, list] of byKey) {
      const sorted = plmakeSortItems(list);
      const tagsList = sorted.map(it => it.tags || {});
      const firstOf = pick => tagsList.map(pick).find(Boolean) || '';
      const folder = bulkalbFolderOf(sorted[0].file);
      const title = plmakeSuggestTitle(tagsList, folder || sorted[0].file.name);
      albums.push({
        key,
        title,
        album: firstOf(t => t.TALB),
        artist: firstOf(t => t.TPE2) || firstOf(t => t.TPE1),
        year: firstOf(t => t.TYER || (t.TDRC || '').substring(0, 4)),
        folder,
        source: key.startsWith('tag\u0000') ? 'tags' : key.startsWith('dir\u0000') ? 'folder' : 'file',
        items: sorted,
      });
    }
    albums.sort((a, b) => a.title.localeCompare(b.title, 'ru', { numeric: true, sensitivity: 'base' }));
    return albums;
  }

  // Files out of a drop: a dropped FOLDER arrives as a directory entry, not as
  // files, so the tree is walked (and each file remembers the path it came
  // from, which is what the folder-name fallback above groups by).
  async function bulkalbFilesFromDrop(dt) {
    const out = [];
    const items = dt?.items ? [...dt.items] : [];
    const entries = items.map(i => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
    if (!entries.length) return [...(dt?.files || [])].filter(isMP3);

    const readDir = dirReader => new Promise(resolve => {
      const acc = [];
      const step = () => dirReader.readEntries(batch => {
        if (!batch.length) { resolve(acc); return; }
        acc.push(...batch);
        step();
      }, () => resolve(acc));
      step();
    });
    const walk = async (entry, prefix) => {
      if (entry.isFile) {
        const file = await new Promise(res => entry.file(res, () => res(null)));
        if (file && isMP3(file)) {
          try { file._vmuRelPath = prefix + file.name; } catch {}
          out.push(file);
        }
        return;
      }
      if (!entry.isDirectory) return;
      const children = await readDir(entry.createReader());
      for (const child of children) await walk(child, prefix + entry.name + '/');
    };
    for (const e of entries) await walk(e, '');
    return out;
  }

  // ── the run state ──────────────────────────────────────────────────────────
  function bulkalbLoadState() { return bulkalbStorageGet(BULKALB_STATE_KEY); }
  function bulkalbSaveState(state) { return bulkalbStorageSet(BULKALB_STATE_KEY, state); }
  async function bulkalbDiscardRun(state) {
    const keys = [];
    for (const a of (state?.albums || [])) {
      if (a.coverKey) keys.push(a.coverKey);
      for (const t of a.tracks) keys.push(t.fileKey);
    }
    await bulkalbDeleteBlobs(keys);
    await bulkalbStorageDel(BULKALB_STATE_KEY);
  }

  const BULKALB_ACTIVE = s => !!s && (s.status === 'running' || s.status === 'paused');
  const bulkalbQueuedTracks = state => (state?.albums || []).reduce(
    (n, a) => n + (a.stage === 'done' || a.stage === 'failed' || a.stage === 'skipped' ? 0 : a.tracks.filter(t => !t.uploaded).length), 0);

  // ── toolbar button + setup panel ───────────────────────────────────────────
  function closeBulkAlbumsPanel() { document.getElementById('vmu-bulkalb-panel')?.remove(); }

  function injectBulkAlbumsButton() {
    const anchor = getToolbarAnchor();
    if (!anchor) return;
    const { uploadBtn, group } = anchor;
    if (toolbarBtnPresent(group, 'vmu-bulkalb-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'vmu-bulkalb-btn';
    btn.className = uploadBtn.className;
    matchNativeButtonBox(btn, uploadBtn);
    btn.setAttribute('aria-label', 'Альбомы с диска');
    btn.setAttribute('data-vmu-tip', 'Альбомы с диска');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5V15a1.5 1.5 0 0 0 1.5 1.5h12A1.5 1.5 0 0 0 17.5 15V7.5a1.5 1.5 0 0 0-1.5-1.5H9.5L8 4H4a1.5 1.5 0 0 0-1.5 1.5z"/><path d="M10 13.5V9M8 11l2-2 2 2"/></svg>`;
    btn.addEventListener('mouseenter', () => showDlTooltip(btn));
    btn.addEventListener('mouseleave', hideDlTooltip);
    btn.addEventListener('click', () => { hideDlTooltip(); openBulkAlbumsPanel(); });
    group.insertBefore(btn, document.getElementById('vmu-plmake-btn') || uploadBtn);
  }

  async function openBulkAlbumsPanel() {
    syncVmuTheme();
    closeBulkAlbumsPanel();

    // A run already going owns the screen — show its progress instead of
    // offering to start a second one on top of it.
    const existing = await bulkalbLoadState();
    if (BULKALB_ACTIVE(existing)) { bulkalbRenderProgress(existing); return; }

    const ownerId = location.href.match(/audios(-?\d+)/)?.[1] || null;

    const panel = document.createElement('div');
    panel.id = 'vmu-bulkalb-panel';
    panel.className = 'vmu-bulkops-panel vmu-bulkalb-panel';
    panel.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Альбомы с диска</span>
        <button type="button" class="vmu-check-close" id="vmu-bulkalb-close" title="Закрыть">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body vmu-plcollect-body">
        <div class="vmu-plmake-hint">Выбери папку с альбомами — расширение разберёт файлы по альбомам (теги ID3, иначе имя папки), зальёт их по очереди и для каждого соберёт плейлист. Между альбомами страница перезагружается, прогон продолжится сам.</div>
        <div id="vmu-bulkalb-dz" class="vmu-pl-sort-dz">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9M6.5 6.5L10 3l3.5 3.5"/><path d="M4 13.5v1.5A1.5 1.5 0 0 0 5.5 16.5h9a1.5 1.5 0 0 0 1.5-1.5v-1.5"/></svg>
          <span class="vmu-pl-sort-dz-hint">Перетащи сюда папку или файлы</span>
          <label class="vmu-pick-btn">
            ${ICON_UPLOAD}
            Папка
            <input type="file" id="vmu-bulkalb-dir" class="vmu-pl-sort-input" webkitdirectory directory multiple>
          </label>
          <label class="vmu-pick-btn vmu-plc-secondary">
            Файлы
            <input type="file" id="vmu-bulkalb-input" class="vmu-pl-sort-input" accept=".mp3,audio/mpeg" multiple>
          </label>
        </div>
        <div class="vmu-bulk-source-hint" id="vmu-bulkalb-files-hint">Ничего не выбрано</div>

        <div class="vmu-plc-section vmu-plc-section-first">
          <div class="vmu-plc-row">
            <span class="vmu-plc-label">Лимит этой сессии</span>
            <span class="vmu-bulk-source-hint" id="vmu-bulkalb-limit"></span>
          </div>
          <label class="vmu-rename-check" id="vmu-bulkalb-cover-row" style="display:none">
            <input type="checkbox" id="vmu-bulkalb-cover"><span>Обложки плейлистов (из настроек или из тегов файлов)</span>
          </label>
        </div>

        <div class="vmu-plc-section">
          <div class="vmu-plc-row">
            <span class="vmu-plc-label" id="vmu-bulkalb-summary">Альбомы</span>
            <span class="vmu-plc-range">
              <button type="button" id="vmu-bulkalb-all" class="vmu-plc-link">Выбрать всё</button>
              <button type="button" id="vmu-bulkalb-none" class="vmu-plc-link">Снять всё</button>
            </span>
          </div>
          <div class="vmu-bulkalb-tree" id="vmu-bulkalb-tree"></div>
        </div>

        <div class="vmu-plc-status" id="vmu-bulkalb-status"></div>
        <div class="vmu-plc-actions">
          <span class="vmu-plc-count" id="vmu-bulkalb-count"></span>
          <button type="button" id="vmu-bulkalb-go" class="vmu-pick-btn" disabled>Залить</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));
    panel.querySelector('#vmu-bulkalb-close').addEventListener('click', closeBulkAlbumsPanel);

    const $ = sel => panel.querySelector(sel);
    const dz = $('#vmu-bulkalb-dz');
    const dirInput = $('#vmu-bulkalb-dir');
    const fileInput = $('#vmu-bulkalb-input');
    const filesHint = $('#vmu-bulkalb-files-hint');
    const limitHint = $('#vmu-bulkalb-limit');
    const coverRow = $('#vmu-bulkalb-cover-row');
    const coverCheck = $('#vmu-bulkalb-cover');
    const summaryEl = $('#vmu-bulkalb-summary');
    const treeEl = $('#vmu-bulkalb-tree');
    const statusEl = $('#vmu-bulkalb-status');
    const countEl = $('#vmu-bulkalb-count');
    const goBtn = $('#vmu-bulkalb-go');
    const actionsEl = goBtn.parentElement;

    let albums = [];          // [{ ..., items, checked:Set<trackIdx>, open:bool }]
    let busy = false;
    let session = await bulkalbReadSession();

    const setStatus = (text, isError) => {
      statusEl.textContent = text || '';
      statusEl.classList.toggle('vmu-plmake-status-error', !!isError);
    };
    const renderLimit = () => {
      const left = Math.max(0, BULKALB_SESSION_LIMIT - session.count);
      limitHint.textContent = `залито ${session.count} из ${BULKALB_SESSION_LIMIT}, осталось ${left}`;
    };
    const selectedCount = () => albums.reduce((n, a) => n + a.checked.size, 0);
    const hasCoverSource = () => !!(settings.coverDataUrl || albums.some(a => a.items.some(it => it.tags?.APIC?.data)));

    function updateControls() {
      const n = selectedCount();
      const picked = albums.filter(a => a.checked.size).length;
      countEl.textContent = albums.length ? `Выбрано: ${n} ${plcPlural(n, 'трек', 'трека', 'треков')} в ${picked} ${plcPlural(picked, 'альбоме', 'альбомах', 'альбомах')}` : '';
      summaryEl.textContent = albums.length ? `Альбомы: ${albums.length}` : 'Альбомы';
      goBtn.disabled = busy || !n;
      const left = Math.max(0, BULKALB_SESSION_LIMIT - session.count);
      goBtn.textContent = n > left && left > 0 ? `Залить (${left} сейчас)` : 'Залить';
    }
    function setBusy(b) {
      busy = b;
      for (const el of [dirInput, fileInput, coverCheck, goBtn]) el.disabled = b;
      panel.classList.toggle('vmu-plmake-busy', b);
      updateControls();
    }

    function renderTree() {
      const scroll = treeEl.scrollTop;
      treeEl.innerHTML = albums.map((a, ai) => {
        const all = a.checked.size === a.items.length;
        const none = a.checked.size === 0;
        const srcTag = a.source === 'tags' ? '' : a.source === 'folder' ? ' <span class="vmu-bulkalb-src">по папке</span>' : ' <span class="vmu-bulkalb-src">без альбома</span>';
        const rows = a.items.map((it, ti) => `
          <label class="vmu-bulkalb-track">
            <input type="checkbox" data-a="${ai}" data-t="${ti}"${a.checked.has(ti) ? ' checked' : ''}>
            <span class="vmu-bulk-preview-text">
              <span class="vmu-plmake-found">${escHtml((it.entry.artist ? it.entry.artist + ' — ' : '') + (it.entry.title || it.entry.name))}</span>
              <span class="vmu-plmake-file">${escHtml(it.entry.name)}</span>
            </span>
          </label>`).join('');
        return `
          <div class="vmu-bulkalb-album" data-a="${ai}"${a.open ? ' data-open="1"' : ''}>
            <div class="vmu-bulkalb-albumhead">
              <input type="checkbox" data-a="${ai}"${all ? ' checked' : ''}>
              <button type="button" class="vmu-bulkalb-toggle" data-a="${ai}" aria-label="Развернуть">${a.open ? '▾' : '▸'}</button>
              <span class="vmu-bulk-preview-text">
                <span class="vmu-plmake-found">${escHtml(a.title)}${srcTag}</span>
                <span class="vmu-plmake-file">${a.checked.size} из ${a.items.length} ${plcPlural(a.items.length, 'трека', 'треков', 'треков')}</span>
              </span>
            </div>
            <div class="vmu-bulkalb-tracks">${rows}</div>
          </div>`;
      }).join('');
      // Tri-state can only be set from script, never from markup.
      for (const box of treeEl.querySelectorAll('.vmu-bulkalb-albumhead input[type="checkbox"]')) {
        const a = albums[Number(box.dataset.a)];
        box.indeterminate = a.checked.size > 0 && a.checked.size < a.items.length;
      }
      treeEl.scrollTop = scroll;
      updateControls();
    }

    treeEl.addEventListener('change', e => {
      const box = e.target.closest('input[type="checkbox"]');
      if (!box || busy) return;
      const a = albums[Number(box.dataset.a)];
      if (!a) return;
      if (box.dataset.t == null) {
        a.checked = box.checked ? new Set(a.items.map((_, i) => i)) : new Set();
      } else {
        const ti = Number(box.dataset.t);
        if (box.checked) a.checked.add(ti); else a.checked.delete(ti);
      }
      renderTree();
    });
    treeEl.addEventListener('click', e => {
      const t = e.target.closest('.vmu-bulkalb-toggle');
      if (!t) return;
      const a = albums[Number(t.dataset.a)];
      a.open = !a.open;
      renderTree();
    });
    $('#vmu-bulkalb-all').addEventListener('click', () => {
      if (busy) return;
      for (const a of albums) a.checked = new Set(a.items.map((_, i) => i));
      renderTree();
    });
    $('#vmu-bulkalb-none').addEventListener('click', () => {
      if (busy) return;
      for (const a of albums) a.checked = new Set();
      renderTree();
    });

    async function handleFiles(fileList) {
      if (busy) return;
      const mp3s = [...fileList].filter(isMP3);
      if (!mp3s.length) { setStatus('В выбранном нет MP3-файлов', true); return; }
      setBusy(true);
      setStatus(`Читаю теги… 0 из ${mp3s.length}`);
      try {
        const read = [];
        for (const file of mp3s) {
          const tags = await readID3(file).catch(() => ({}));
          read.push({ file, tags, entry: await fileToCheckEntry(file, tags) });
          if (read.length % 10 === 0 && statusEl.isConnected) setStatus(`Читаю теги… ${read.length} из ${mp3s.length}`);
        }
        if (!panel.isConnected) return;
        albums = bulkalbGroupItems(read).map(a => ({ ...a, checked: new Set(a.items.map((_, i) => i)), open: false }));
        const bytes = read.reduce((n, it) => n + it.file.size, 0);
        filesHint.textContent = `Файлов: ${read.length} · Альбомов: ${albums.length} · ${(bytes / 1048576).toFixed(0)} МБ`;
        const src = hasCoverSource();
        coverRow.style.display = src ? '' : 'none';
        coverCheck.checked = !!(settings.coverDataUrl || (settings.autoCoverFromId3 && src));
        setStatus('');
      } finally {
        if (panel.isConnected) { setBusy(false); renderTree(); }
      }
    }
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('vmu-over'); });
    dz.addEventListener('dragleave', e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('vmu-over'); });
    dz.addEventListener('drop', async e => {
      e.preventDefault();
      dz.classList.remove('vmu-over');
      handleFiles(await bulkalbFilesFromDrop(e.dataTransfer));
    });
    dirInput.addEventListener('change', () => { handleFiles(dirInput.files); dirInput.value = ''; });
    fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

    // Build the persisted run out of what's ticked and start it.
    async function start() {
      if (busy || !selectedCount()) return;
      if (!ownerId) { setStatus('Открой страницу аудио сообщества (vk.ru/audios-…) и запусти заново', true); return; }
      session = await bulkalbReadSession();
      renderLimit();
      if (session.count >= BULKALB_SESSION_LIMIT) {
        setStatus(`Лимит сессии исчерпан: ${session.count} из ${BULKALB_SESSION_LIMIT}. Перезайди в VK или сбрось счётчик.`, true);
        return;
      }
      const picked = albums.filter(a => a.checked.size);
      const total = selectedCount();
      const ok = await vmuConfirmBulkAction(
        actionsEl, goBtn,
        `Залить ${total} ${plcPlural(total, 'трек', 'трека', 'треков')} (${picked.length} ${plcPlural(picked.length, 'альбом', 'альбома', 'альбомов')})? Страница будет перезагружаться между альбомами.`,
        'Залить');
      if (!ok) return;

      setBusy(true);
      setStatus('Сохраняю файлы для прогона…');
      const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const state = {
        version: 1,
        runId,
        createdAt: Date.now(),
        ownerId,
        origin: location.origin,
        status: 'running',
        cursor: 0,
        note: '',
        albums: [],
      };
      try {
        let stored = 0;
        for (let ai = 0; ai < picked.length; ai++) {
          const a = picked[ai];
          const chosen = [...a.checked].sort((x, y) => x - y).map(i => a.items[i]);
          const tracks = [];
          for (let ti = 0; ti < chosen.length; ti++) {
            const it = chosen[ti];
            const fileKey = `${runId}/${ai}/${ti}`;
            await bulkalbPutBlob(fileKey, it.file);
            stored++;
            if (statusEl.isConnected) setStatus(`Сохраняю файлы для прогона… ${stored} из ${total}`);
            tracks.push({
              fileKey,
              name: it.file.name,
              type: it.file.type || 'audio/mpeg',
              entry: it.entry,
              // Only the frames the upload and the playlist title actually
              // read — APIC and the rest would blow past chrome.storage's quota.
              tags: {
                TPE1: it.tags?.TPE1 || '', TPE2: it.tags?.TPE2 || '', TIT2: it.tags?.TIT2 || '',
                TALB: it.tags?.TALB || '', TYER: it.tags?.TYER || '', TDRC: it.tags?.TDRC || '',
                TRCK: it.tags?.TRCK || '',
              },
              uploaded: false,
              audioId: null,
            });
          }
          let coverKey = null;
          if (coverCheck.checked) {
            const src = await bulkalbResolveCoverSource(a.items);
            if (src) {
              try {
                const blob = await makePerezalitoCover(src);
                if (blob) { coverKey = `${runId}/${ai}/cover`; await bulkalbPutBlob(coverKey, blob); }
              } catch (err) { console.warn('[VK Multi Upload] bulk albums: cover failed', err); }
            }
          }
          state.albums.push({
            title: a.title, album: a.album, artist: a.artist, year: a.year, folder: a.folder,
            playlistTitle: a.title,
            playlistDescription: `${a.title}\n${BULKALB_SIGNATURE}`,
            stage: 'pending',
            error: null,
            startCount: null,
            gained: null,
            sentCount: 0,
            playlistKey: null,
            addedCount: 0,
            coverKey,
            tracks,
          });
        }
      } catch (err) {
        console.warn('[VK Multi Upload] bulk albums: could not store files', err);
        await bulkalbDiscardRun(state);
        setBusy(false);
        setStatus('Не удалось сохранить файлы для прогона: ' + (err.message || err), true);
        return;
      }
      await bulkalbSaveState(state);
      closeBulkAlbumsPanel();
      bulkalbRenderProgress(state);
      bulkalbTick();
    }
    goBtn.addEventListener('click', start);

    renderLimit();
    limitHint.title = 'Счёт ведётся по куке аккаунта и сбрасывается, когда меняется сессия VK';
    limitHint.style.cursor = 'pointer';
    limitHint.addEventListener('click', async () => {
      if (busy) return;
      await bulkalbResetSession();
      session = await bulkalbReadSession();
      renderLimit();
      updateControls();
      setStatus('Счётчик сессии сброшен');
    });
    renderTree();
  }

  // Cover for an album's playlist: the user's own cover from settings wins,
  // else the first embedded ID3 picture — the same priority runAutoPlaylist uses.
  async function bulkalbResolveCoverSource(items) {
    if (settings.coverDataUrl) return settings.coverDataUrl;
    const withArt = items.find(it => it.tags?.APIC?.data);
    if (!withArt) return null;
    const apic = withArt.tags.APIC;
    const blob = new Blob([apic.data], { type: apic.mime || 'image/jpeg' });
    return new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
  }

  // ── progress panel ─────────────────────────────────────────────────────────
  const BULKALB_STAGE_LABEL = {
    pending: 'в очереди',
    uploading: 'заливается',
    uploaded: 'залит, собираю плейлист',
    creating: 'создаётся плейлист',
    done: 'готово',
    failed: 'ошибка',
    skipped: 'пропущен',
  };

  function bulkalbRenderProgress(state, note) {
    if (!state) { document.getElementById('vmu-bulkalb-run')?.remove(); return; }
    let panel = document.getElementById('vmu-bulkalb-run');
    if (!panel) {
      syncVmuTheme();
      panel = document.createElement('div');
      panel.id = 'vmu-bulkalb-run';
      panel.className = 'vmu-bulkops-panel vmu-bulkalb-run';
      panel.innerHTML = `
        <div class="vmu-bulkops-head">
          <span class="vmu-bulkops-title">Заливка альбомов</span>
          <button type="button" class="vmu-check-close" id="vmu-bulkalb-run-hide" title="Свернуть">${ICON_CLOSE}</button>
        </div>
        <div class="vmu-bulkops-body vmu-plcollect-body">
          <div class="vmu-plc-status" id="vmu-bulkalb-run-note"></div>
          <div class="vmu-bulkalb-tree" id="vmu-bulkalb-run-list"></div>
          <div class="vmu-plc-actions">
            <span class="vmu-plc-count" id="vmu-bulkalb-run-count"></span>
            <button type="button" id="vmu-bulkalb-resume" class="vmu-pick-btn" style="display:none">Продолжить</button>
            <button type="button" id="vmu-bulkalb-stop" class="vmu-pick-btn vmu-plc-secondary">Остановить</button>
          </div>
        </div>`;
      document.body.appendChild(panel);
      makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));
      panel.querySelector('#vmu-bulkalb-run-hide').addEventListener('click', () => panel.remove());
      panel.querySelector('#vmu-bulkalb-stop').addEventListener('click', async () => {
        const s = await bulkalbLoadState();
        if (!s) { panel.remove(); return; }
        s.status = 'stopped';
        await bulkalbSaveState(s);
        await bulkalbDiscardRun(s);
        panel.remove();
        showProgressToast('Заливка альбомов остановлена', { id: 'vmu-bulkalb', kind: 'done' });
      });
      panel.querySelector('#vmu-bulkalb-resume').addEventListener('click', async () => {
        const s = await bulkalbLoadState();
        if (!s) { panel.remove(); return; }
        s.status = 'running';
        s.note = '';
        await bulkalbSaveState(s);
        bulkalbRenderProgress(s);
        bulkalbTick();
      });
    }
    if (note != null) state.note = note;
    const done = state.albums.filter(a => a.stage === 'done').length;
    panel.querySelector('#vmu-bulkalb-run-note').textContent = state.note || '';
    panel.querySelector('#vmu-bulkalb-run-count').textContent =
      `Альбомов готово: ${done} из ${state.albums.length}` + (state.sessionLeft != null ? ` · лимит: осталось ${state.sessionLeft}` : '');
    panel.querySelector('#vmu-bulkalb-resume').style.display = state.status === 'paused' ? '' : 'none';
    panel.querySelector('#vmu-bulkalb-run-list').innerHTML = state.albums.map((a, i) => `
      <div class="vmu-bulkalb-runrow" data-stage="${a.stage}"${i === state.cursor ? ' data-current="1"' : ''}>
        <span class="vmu-bulk-preview-text">
          <span class="vmu-plmake-found">${escHtml(a.title)}</span>
          <span class="vmu-plmake-file">${escHtml(a.error || BULKALB_STAGE_LABEL[a.stage] || a.stage)} · ${a.tracks.filter(t => t.uploaded).length} из ${a.tracks.length}${a.addedCount ? ` · в плейлисте ${a.addedCount}` : ''}</span>
        </span>
      </div>`).join('');
    return panel;
  }

  // ── the loop ───────────────────────────────────────────────────────────────
  let bulkalbTicking = false;

  // Opens VK's own upload dialog and waits until injected.js can see the
  // native file input it hands the batch to.
  async function bulkalbOpenUploadDialog() {
    for (let i = 0; i < 40; i++) {
      if (document.querySelector('[data-vmu-vk="1"]')) return true;
      if (i % 10 === 0) {
        const btn = document.querySelector('[data-testid="AudioCatalogUploadAudioAction"]');
        if (btn && !getUploadDialog()) btn.click();
      }
      await sleep(300);
    }
    return !!document.querySelector('[data-vmu-vk="1"]');
  }

  // Hands one album's files to VK's native uploader — the same single
  // transport handoffFilesNatively uses (VK_HANDOFF_FILES → the dialog's own
  // input), with the same per-file preparation (filename→ID3 patch under
  // «Авто-метаданные», then the Slim processing chain when it's on).
  async function bulkalbUploadFiles(files, onStep) {
    const items = [];
    const slim = settings.slimEnabled;
    if (slim) showProcessingUI(files.length);
    try {
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        onStep?.(i, files.length, file.name);
        if (settings.autoMeta) {
          try {
            const tags = file._vmuTags || {};
            const artistSplit = splitTrailingTagJunk(tags.TPE1 || tags.TPE2);
            const titleSplit = splitTrailingTagJunk(tags.TIT2);
            const hasArtist = !!(tags.TPE1 || tags.TPE2) && !!artistSplit.core;
            const hasTitle = !!tags.TIT2 && !!titleSplit.core;
            if (!hasArtist || !hasTitle) {
              const parsed = parseMetaFromFilename(file.name);
              const artist = hasArtist ? (tags.TPE1 || tags.TPE2) : joinWithJunk(parsed.artist, artistSplit.junk);
              const title = hasTitle ? tags.TIT2 : joinWithJunk(parsed.title, titleSplit.junk);
              if (artist || title) file = await patchID3(file, artist, title);
            }
          } catch {}
        }
        if (slim) {
          try {
            updateProcessingUI(file.name, i + 1, files.length, 0);
            file = await applyAudioProcessing(file, pct => updateProcessingUI(file.name, i + 1, files.length, pct));
          } catch (err) { console.error('[VMU Slim] processing error:', err); }
        }
        items.push({ name: file.name, mimeType: file.type || 'audio/mpeg', buffer: await file.arrayBuffer() });
      }
    } finally {
      if (slim) hideProcessingUI();
    }
    if (!await bulkalbOpenUploadDialog()) throw new Error('Не удалось открыть диалог загрузки VK');
    return new Promise(resolve => {
      const h = e => {
        if (e.source !== window || e.data?.type !== 'VK_HANDOFF_DISPATCHED') return;
        window.removeEventListener('message', h);
        clearTimeout(t);
        resolve(!!e.data.ok);
      };
      const t = setTimeout(() => { window.removeEventListener('message', h); resolve(false); }, 20000);
      window.addEventListener('message', h);
      window.postMessage({ type: 'VK_HANDOFF_FILES', items }, '*', items.map(i => i.buffer));
    });
  }

  // The album's tracks as the page now shows them, matched by title/artist and
  // kept as exact audio ids — the same matcher «Плейлист из файлов» uses, run
  // against the top of the catalog where a fresh upload lands.
  async function bulkalbResolveAudioIds(album, onProgress) {
    const wanted = album.tracks.filter(t => t.uploaded);
    if (!wanted.length) return { ids: [], missing: [] };
    const entries = wanted.map(t => t.entry);
    const limit = Math.max(150, wanted.length * 6);
    const allFound = collected => collected.size >= entries.length
      && plmakeMatch(entries, [...collected.values()]).every(m => m && m.sure && m.exact);
    const map = await harvestPageTracks(onProgress, limit, allFound);
    const matches = plmakeMatch(entries, [...map.values()]);
    const ids = [];
    const missing = [];
    matches.forEach((m, i) => {
      if (m) { wanted[i].audioId = m.track.id; ids.push(m.track.id); }
      else missing.push(wanted[i].name);
    });
    return { ids, missing };
  }

  // Playlists whose cell is mounted right now, by title — used to tell a
  // half-finished creation (page died between "created" and "filled") from one
  // that never happened, so a resumed run can never make a second playlist.
  function bulkalbFindPlaylistByTitle(title) {
    const norm = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const want = norm(title);
    for (const p of plmakeMountedPlaylists()) if (norm(p.title) === want) return p;
    return null;
  }
  async function bulkalbScanPlaylistByTitle(ownerId, title) {
    const res = await new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'VKD_SCAN_PLAYLISTS', url: `${location.origin}/audios${ownerId}` }, r => resolve(r));
      } catch { resolve({ ok: false }); }
    });
    if (!res?.ok) return null;
    const norm = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const want = norm(title);
    return (res.playlists || []).find(p => norm(p.title) === want) || null;
  }

  function bulkalbReload() { setTimeout(() => location.reload(), 1200); }

  async function bulkalbTick() {
    if (bulkalbTicking) return;
    bulkalbTicking = true;
    try { await bulkalbRun(); }
    catch (err) {
      console.error('[VK Multi Upload] bulk albums run failed:', err);
      const s = await bulkalbLoadState();
      if (s) {
        s.status = 'paused';
        s.note = 'Ошибка: ' + translateError(err.message || String(err));
        await bulkalbSaveState(s);
        bulkalbRenderProgress(s);
      }
    } finally { bulkalbTicking = false; }
  }

  async function bulkalbRun() {
    let state = await bulkalbLoadState();
    if (!state || state.status !== 'running') return;
    if (Date.now() - (state.createdAt || 0) > BULKALB_MAX_AGE_MS) {
      await bulkalbDiscardRun(state);
      showProgressToast('Старый прогон заливки альбомов отброшен', { id: 'vmu-bulkalb', kind: 'error' });
      return;
    }
    // Skip past everything already settled.
    while (state.cursor < state.albums.length
      && ['done', 'failed', 'skipped'].includes(state.albums[state.cursor].stage)) state.cursor++;
    if (state.cursor >= state.albums.length) {
      const done = state.albums.filter(a => a.stage === 'done').length;
      await bulkalbDiscardRun(state);
      bulkalbRenderProgress(null);
      showProgressToast(`Заливка альбомов закончена: готово ${done} из ${state.albums.length}`, { id: 'vmu-bulkalb', kind: 'done' });
      return;
    }

    const album = state.albums[state.cursor];
    const session = await bulkalbReadSession();
    state.sessionLeft = Math.max(0, BULKALB_SESSION_LIMIT - session.count);
    bulkalbRenderProgress(state, `«${album.title}»…`);

    if (album.stage === 'pending') {
      const todo = album.tracks.filter(t => !t.uploaded);
      const left = state.sessionLeft;
      if (left <= 0 || (todo.length > left && left < BULKALB_SESSION_LIMIT)) {
        // Stopping BEFORE a partial album: half an album uploaded and then
        // cut off is worse than waiting, and the rest of the queue stays
        // saved for the next session.
        state.status = 'paused';
        state.note = `Лимит сессии ${BULKALB_SESSION_LIMIT} исчерпан (залито ${session.count}). В очереди осталось ${bulkalbQueuedTracks(state)} ${plcPlural(bulkalbQueuedTracks(state), 'трек', 'трека', 'треков')} в ${state.albums.length - state.cursor} ${plcPlural(state.albums.length - state.cursor, 'альбоме', 'альбомах', 'альбомах')}.`;
        await bulkalbSaveState(state);
        bulkalbRenderProgress(state);
        showProgressToast(state.note, { id: 'vmu-bulkalb', kind: 'error' });
        return;
      }
      const batch = todo.slice(0, left);

      // Marked BEFORE anything is sent: a reload between the hand-off and the
      // confirmation must never cause a second copy of these tracks.
      album.stage = 'uploading';
      album.startCount = getPageTrackCount();
      album.sentCount = batch.length;
      for (const t of batch) t.sent = true;
      await bulkalbSaveState(state);
      await bulkalbBumpSession(batch.length);
      for (let i = 0; i < batch.length; i++) bumpTodayUploadCount();

      const files = [];
      for (const t of batch) {
        const blob = await bulkalbGetBlob(t.fileKey);
        if (!blob) throw new Error(`Файл «${t.name}» не найден в хранилище прогона`);
        const f = new File([blob], t.name, { type: t.type || 'audio/mpeg' });
        f._vmuTags = t.tags || {};
        files.push(f);
      }
      bulkalbRenderProgress(state, `«${album.title}»: готовлю ${batch.length} ${plcPlural(batch.length, 'файл', 'файла', 'файлов')}…`);
      const sent = await bulkalbUploadFiles(files, (i, n, name) =>
        bulkalbRenderProgress(state, `«${album.title}»: ${i + 1} из ${n} — ${name}`));
      if (!sent) throw new Error('VK не принял файлы (диалог загрузки не отдал свой input)');

      bulkalbRenderProgress(state, `«${album.title}»: жду подтверждения загрузки…`);
      const gained = album.startCount != null
        ? await waitForTrackCountIncrease(album.startCount, batch.length, null, (got, left) =>
            bulkalbRenderProgress(state, `«${album.title}»: подтвердилось ${got} из ${batch.length}, жду ещё ${left} с…`))
        : (await sleep(Math.max(15000, batch.length * 4000)), batch.length);
      album.gained = gained;
      // Without per-file confirmation from VK the honest reading is "as many
      // as the library grew by" — matching below works by id, so a track that
      // never landed simply won't be found and is reported, not guessed at.
      for (const t of batch) t.uploaded = true;
      album.stage = 'uploaded';
      if (gained <= 0) album.error = 'загрузка не подтвердилась';
      await bulkalbSaveState(state);
      // Through VK's own close button, so the modal and its dim overlay both
      // go: a reload fired with the upload modal still up leaves VK asking
      // whether to leave the page on some builds.
      try { closeUploadModal(); } catch {}
      bulkalbRenderProgress(state, `«${album.title}»: загружено, перезагружаю страницу…`);
      bulkalbReload();
      return;
    }

    if (album.stage === 'uploading') {
      // Resumed after a reload that landed mid-hand-off: the batch is already
      // on its way to VK, so it is never re-sent — move on and let the id
      // match below say what actually arrived.
      for (const t of album.tracks) if (t.sent) t.uploaded = true;
      album.stage = 'uploaded';
      await bulkalbSaveState(state);
      bulkalbRenderProgress(state, `«${album.title}»: проверяю, что залилось…`);
    }

    if (album.stage === 'uploaded') {
      bulkalbRenderProgress(state, `«${album.title}»: ищу залитые треки на странице…`);
      const { ids, missing } = await bulkalbResolveAudioIds(album, n =>
        bulkalbRenderProgress(state, `«${album.title}»: просмотрено треков ${n}…`));
      if (!ids.length) {
        album.stage = 'failed';
        album.error = 'залитые треки не нашлись на странице';
        state.cursor++;
        await bulkalbSaveState(state);
        bulkalbRenderProgress(state);
        bulkalbReload();
        return;
      }
      album.audioIds = ids;
      album.missing = missing;
      album.stage = 'creating';
      await bulkalbSaveState(state);
    }

    if (album.stage === 'creating') {
      const ids = album.audioIds || [];
      const trackNames = album.tracks
        .filter(t => t.audioId && ids.includes(t.audioId))
        .map(t => ({ artist: t.entry.artist || '', title: t.entry.title || '' }));

      // Resumed into this stage: a playlist with this title may already exist
      // from the attempt that was cut short. Fill that one instead of making a
      // twin of it.
      let existing = album.playlistKey
        ? { id: album.playlistKey, title: album.playlistTitle }
        : bulkalbFindPlaylistByTitle(album.playlistTitle);
      if (!existing && album.createAttempted) {
        bulkalbRenderProgress(state, `«${album.title}»: проверяю, не создался ли плейлист…`);
        existing = await bulkalbScanPlaylistByTitle(state.ownerId, album.playlistTitle);
      }

      if (existing) {
        album.playlistKey = existing.id;
        await bulkalbSaveState(state);
        bulkalbRenderProgress(state, `«${album.title}»: плейлист уже есть, дозаполняю…`);
        const [plOwner, plIdStr] = String(existing.id).split('_');
        const res = await pageCall('VK_ADD_TRACKS_TO_PLAYLIST', 'VK_ADD_TRACKS_TO_PLAYLIST_DONE', {
          reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          ownerId: plOwner, playlistId: parseInt(plIdStr, 10), trackNames, audioIds: ids,
        }, 300000, 'reqId').catch(err => ({ ok: false, error: err.message }));
        album.addedCount = res?.selectedCount || 0;
        album.stage = 'done';
        if (!album.addedCount) album.error = 'треки в плейлист не добавились';
      } else {
        album.createAttempted = true;
        await bulkalbSaveState(state);
        bulkalbRenderProgress(state, `«${album.title}»: создаю плейлист…`);
        let coverBuf = null;
        if (album.coverKey) {
          const blob = await bulkalbGetBlob(album.coverKey).catch(() => null);
          if (blob) coverBuf = await blob.arrayBuffer();
        }
        const created = await pageCall('VK_CREATE_PLAYLIST', 'VK_PLAYLIST_CREATED', {
          reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          title: String(album.playlistTitle).slice(0, 255),
          description: String(album.playlistDescription).slice(0, 1000),
          trackNames, audioIds: ids, coverBuf,
        }, 300000, 'reqId');
        album.playlistKey = created.ownerId != null ? `${created.ownerId}_${created.playlistId}` : null;
        album.addedCount = created.selectedCount || 0;
        album.stage = 'done';
        if (!album.addedCount) album.error = 'плейлист создан, но треки не добавились';
      }

      if (album.missing?.length) {
        album.error = (album.error ? album.error + '; ' : '') + `не найдено треков: ${album.missing.length}`;
      }
      // An album bigger than the whole session budget is the one case that
      // uploads only part of itself (see the limit check above) — say so
      // instead of quietly leaving tracks behind.
      const leftOver = album.tracks.filter(t => !t.uploaded).length;
      if (leftOver) album.error = (album.error ? album.error + '; ' : '') + `не поместилось в лимит: ${leftOver}`;
      // Done with this album's bytes — a 40-track run would otherwise sit on
      // hundreds of megabytes until the whole thing finished.
      await bulkalbDeleteBlobs([...album.tracks.map(t => t.fileKey), album.coverKey].filter(Boolean));
      state.cursor++;
      await bulkalbSaveState(state);
      bulkalbRenderProgress(state, `«${album.title}»: готово. Перезагружаю страницу…`);
      bulkalbReload();
    }
  }

  // Picked back up on every page load: the loop above reloads the page on
  // purpose, so this is what makes it a loop at all.
  async function bulkalbResumeOnLoad() {
    const state = await bulkalbLoadState();
    if (!BULKALB_ACTIVE(state)) return;
    if (state.origin && state.origin !== location.origin) return;
    const here = location.href.match(/audios(-?\d+)/)?.[1] || null;
    if (state.ownerId && here !== state.ownerId) {
      // A run belongs to one community's page; anywhere else it just waits.
      bulkalbRenderProgress(state, `Прогон ждёт страницу сообщества ${state.ownerId}`);
      return;
    }
    bulkalbRenderProgress(state);
    if (state.status !== 'running') return;
    // Let VK finish mounting its list first — getPageTrackCount, the picker
    // and the matcher all read the rendered page.
    for (let i = 0; i < 40 && !vmuPageHasAudio(true); i++) await sleep(500);
    await sleep(1500);
    bulkalbTick();
  }

  // ─── Playlist order ──────────────────────────────────────────────────────────
  // VK removed drag-to-reorder for playlists from the desktop site (community
  // and personal music); the server method is still there and VK's own web
  // client still contains the call (see movePlaylist in injected.js). This is
  // the missing UI: list every playlist, let the user drag them into the order
  // they want, then send the smallest set of audio.reorderPlaylists moves that
  // gets there — one call per move, like the app does on every drop.

  // PLO-PURE-BEGIN
  // Indices (into `arr`) of one longest strictly increasing subsequence.
  function ploLisIndices(arr) {
    const tails = [];                       // tails[k]: index of the smallest tail of an increasing run of length k+1
    const prev = new Array(arr.length).fill(-1);
    for (let i = 0; i < arr.length; i++) {
      let lo = 0, hi = tails.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[tails[mid]] < arr[i]) lo = mid + 1; else hi = mid;
      }
      if (lo > 0) prev[i] = tails[lo - 1];
      tails[lo] = i;
    }
    const keep = new Set();
    for (let k = tails.length ? tails[tails.length - 1] : -1; k !== -1; k = prev[k]) keep.add(k);
    return keep;
  }

  // Server-side semantics of one move: take `id` out, then put it right after
  // `after`, or — with no `after` — right before `before`.
  function ploApplyMove(order, m) {
    const out = order.filter(x => x !== m.id);
    if (m.toTop) { out.unshift(m.id); return out; }
    if (m.after != null) out.splice(out.indexOf(m.after) + 1, 0, m.id);
    else if (m.before != null) out.splice(out.indexOf(m.before), 0, m.id);
    else out.push(m.id);
    return out;
  }

  // The fewest single-playlist moves that turn `current` into `target` (same
  // ids, any order): the longest run of playlists already in the right
  // relative order stays put, every other one is moved once — straight after
  // its predecessor in the target (or before the current first item, for the
  // very top). Moves are listed in the order they have to be sent.
  function ploPlanMoves(current, target) {
    const pos = new Map(current.map((id, i) => [id, i]));
    const keep = ploLisIndices(target.map(id => pos.get(id)));
    let cur = current.slice();
    const moves = [];
    for (let i = 0; i < target.length; i++) {
      if (keep.has(i)) continue;
      const id = target[i];
      const m = i === 0
        ? { id, after: null, before: cur.find(x => x !== id) ?? null }
        : { id, after: target[i - 1], before: null };
      cur = ploApplyMove(cur, m);
      // Report BOTH neighbours the item has after the move — the payload
      // shape VK's own client sends ({after, before}, either may be absent).
      const at = cur.indexOf(id);
      moves.push({ id, after: at > 0 ? cur[at - 1] : null, before: at < cur.length - 1 ? cur[at + 1] : null });
    }
    return moves;
  }

  // For lists where VK only honours "move to the top" — a community's
  // playlists: verified live, there a relative move (after/before a valid
  // neighbour) is accepted with `1` and silently ignored, while a move with
  // no neighbour puts the playlist first. The playlists that stay put must be
  // a suffix of the target that already appears in the same relative order in
  // the current list; every other playlist goes to the top, the one wanted
  // lowest first, so each lands above those moved before it. That is also the
  // fewest possible top-moves: whatever is never moved has to be such a
  // suffix, and this takes the longest one.
  function ploPlanTopMoves(current, target) {
    const pos = new Map(current.map((id, i) => [id, i]));
    let k = target.length;
    while (k > 0 && (k === target.length || pos.get(target[k - 1]) < pos.get(target[k]))) k--;
    const moves = [];
    for (let i = k - 1; i >= 0; i--) moves.push({ id: target[i], after: null, before: null, toTop: true });
    return moves;
  }
  // PLO-PURE-END

  function closePlaylistOrderPanel() {
    document.getElementById('vmu-plorder-panel')?.remove();
  }

  function injectPlaylistOrderButton() {
    const anchor = getToolbarAnchor();
    if (!anchor) return;
    const { uploadBtn, group } = anchor;
    if (toolbarBtnPresent(group, 'vmu-plorder-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'vmu-plorder-btn';
    btn.className = uploadBtn.className;
    matchNativeButtonBox(btn, uploadBtn);
    btn.setAttribute('aria-label', 'Порядок плейлистов');
    btn.setAttribute('data-vmu-tip', 'Порядок плейлистов');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v14M3.5 5.5L6 3l2.5 2.5M3.5 14.5L6 17l2.5-2.5"/><path d="M12 6h5M12 10h5M12 14h5"/></svg>`;
    btn.addEventListener('mouseenter', () => showDlTooltip(btn));
    btn.addEventListener('mouseleave', hideDlTooltip);
    btn.addEventListener('click', () => { hideDlTooltip(); openPlaylistOrderPanel(); });
    group.insertBefore(btn, document.getElementById('vmu-plmake-btn') || document.getElementById('vmu-bulkops-btn') || uploadBtn);
  }

  function openPlaylistOrderPanel() {
    syncVmuTheme();
    closePlaylistOrderPanel();

    const ownerMatch = location.href.match(/audios(-?\d+)/);
    const ownerId = ownerMatch ? ownerMatch[1] : null;

    // Resume support: if VK blocks/rejects a request mid-apply (flood
    // control that outlasts the retries, or a hard refusal), the target
    // order the user picked is saved here — reopening the panel (even after
    // a forced page reload, e.g. an expired token) restores it so the user
    // just reviews and hits «Применить» again instead of re-building the
    // order from scratch. Cleared once a run finishes with no mismatch.
    const ploKey = 'vmu-plorder-target-' + ownerId;
    function ploSaveTarget(idsList) {
      try { sessionStorage.setItem(ploKey, JSON.stringify({ ids: idsList, ts: Date.now() })); } catch {}
    }
    function ploLoadTarget() {
      try {
        const data = JSON.parse(sessionStorage.getItem(ploKey) || 'null');
        return Array.isArray(data?.ids) ? data.ids : null;
      } catch { return null; }
    }
    function ploClearTarget() {
      try { sessionStorage.removeItem(ploKey); } catch {}
    }

    const panel = document.createElement('div');
    panel.id = 'vmu-plorder-panel';
    panel.className = 'vmu-bulkops-panel vmu-plorder-panel';
    panel.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">Порядок плейлистов</span>
        <button type="button" class="vmu-check-close" id="vmu-plorder-close" title="Закрыть">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body vmu-plcollect-body">
        <div class="vmu-plmake-hint">Перетащи плейлисты в нужный порядок и нажми «Применить». Кнопки в углу плитки переносят плейлист в начало или в конец. Изменения уходят в VK по одному перемещению, как из приложения.</div>
        <div class="vmu-plo-paste-row">
          <textarea id="vmu-plorder-paste" class="vmu-plc-input vmu-plo-paste-text" rows="3" spellcheck="false" placeholder="Вставь ссылки или ID плейлистов в нужном порядке (можно прямо весь список построчно) — остальные останутся как есть"></textarea>
          <div class="vmu-plo-paste-btns">
            <button type="button" id="vmu-plorder-autosort" class="vmu-pick-btn vmu-plc-secondary" title="Разбирает «Название (Год) Автор» у каждого плейлиста и группирует по автору; что не разобралось — в конец">Сортировать по авторам (А→Я)</button>
            <button type="button" id="vmu-plorder-paste-apply" class="vmu-pick-btn vmu-plc-secondary">Расставить по списку</button>
          </div>
        </div>
        <div class="vmu-plo-bury-row">
          <div class="vmu-plmake-hint vmu-plo-bury-hint" id="vmu-plorder-bury-hint">Нажми «Сортировать по авторам» — появится список авторов, из которого можно кликом отправить кого-то в самый низ, после всех.</div>
          <div class="vmu-plo-bury-chips" id="vmu-plorder-bury-chips" style="display:none"></div>
        </div>
        <div class="vmu-plc-status" id="vmu-plorder-status">Загружаю плейлисты…</div>
        <div class="vmu-plmake-hint vmu-plo-info" id="vmu-plorder-info" style="display:none"></div>
        <div class="vmu-slim-track" id="vmu-plorder-bar" style="display:none"><div class="vmu-slim-fill" id="vmu-plorder-bar-fill"></div></div>
        <div class="vmu-plo-list" id="vmu-plorder-list"></div>
        <div class="vmu-plc-actions">
          <span class="vmu-plc-count" id="vmu-plorder-count"></span>
          <button type="button" id="vmu-plorder-reload" class="vmu-plc-link" style="display:none" title="Перезагрузить страницу, чтобы каталог показал новый порядок">Обновить страницу</button>
          <button type="button" id="vmu-plorder-stop" class="vmu-pick-btn vmu-plc-secondary" style="display:none">Остановить</button>
          <button type="button" id="vmu-plorder-reset" class="vmu-pick-btn vmu-plc-secondary" disabled>Сбросить</button>
          <button type="button" id="vmu-plorder-apply" class="vmu-pick-btn" disabled>Применить</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));
    panel.querySelector('#vmu-plorder-close').addEventListener('click', closePlaylistOrderPanel);

    const $ = sel => panel.querySelector(sel);
    const statusEl = $('#vmu-plorder-status');
    const infoEl = $('#vmu-plorder-info');
    const barEl = $('#vmu-plorder-bar');
    const barFill = $('#vmu-plorder-bar-fill');
    const listEl = $('#vmu-plorder-list');
    const countEl = $('#vmu-plorder-count');
    const applyBtn = $('#vmu-plorder-apply');
    const resetBtn = $('#vmu-plorder-reset');
    const reloadBtn = $('#vmu-plorder-reload');
    const stopBtn = $('#vmu-plorder-stop');
    const pasteBox = $('#vmu-plorder-paste');
    const pasteApplyBtn = $('#vmu-plorder-paste-apply');
    const autoSortBtn = $('#vmu-plorder-autosort');
    const buryHintEl = $('#vmu-plorder-bury-hint');
    const buryChipsEl = $('#vmu-plorder-bury-chips');
    reloadBtn.addEventListener('click', () => location.reload());

    let orig = [];            // playlist ids in the order the server has them
    let items = [];           // playlist objects in the order being edited
    let byId = new Map();
    let busy = false;
    let cancelled = false;
    let dropMark = null;      // { id, after } while dragging
    let dragged = new Set();  // ids the user moved by hand since the last load / reset

    const setStatus = (text, isError) => {
      statusEl.textContent = text || '';
      statusEl.classList.toggle('vmu-plmake-status-error', !!isError);
    };
    const setProgress = frac => {
      barEl.style.display = frac == null ? 'none' : '';
      if (frac != null) barFill.style.width = Math.round(frac * 100) + '%';
    };
    const ids = () => items.map(p => p.id);
    // Communities only honour "move to the top" (see ploPlanTopMoves); a
    // personal list takes relative moves (verified live on both).
    const isCommunity = () => Number(ownerId) < 0;
    const pending = () => (isCommunity() ? ploPlanTopMoves : ploPlanMoves)(orig, ids());

    function updateControls() {
      const plan = pending();
      const moves = plan.length;
      const changed = ids().filter((id, i) => id !== orig[i]).length;
      applyBtn.disabled = busy || !moves;
      resetBtn.disabled = busy || !moves;
      applyBtn.textContent = busy ? 'Применяю…' : (moves ? `Применить (${moves})` : 'Применить');
      countEl.textContent = items.length ? `Плейлистов: ${items.length}${changed ? ` · сдвинуто: ${changed}` : ''}` : '';
      // Why N requests when only a few playlists were dragged: say it.
      const lifted = isCommunity() ? plan.filter(m => !dragged.has(m.id)).length : 0;
      if (!busy && moves && isCommunity()) {
        infoEl.style.display = '';
        const mins = Math.max(0.1, Math.round(moves * 0.8 / 60 * 10) / 10);
        infoEl.textContent = lifted
          ? `Вы переставили: ${dragged.size}. В сообществе VK принимает только «в начало», поэтому понадобится ${moves} запросов (≈ ${mins} мин): плейлисты, которые должны оказаться выше (помечены «↑»), поднимутся заново в прежнем порядке — друг относительно друга они не сдвинутся.`
          : `Запросов: ${moves}. В сообществе VK принимает только «в начало».`;
      } else {
        infoEl.style.display = 'none';
      }
    }
    function setBusy(b) {
      busy = b;
      panel.classList.toggle('vmu-plmake-busy', b);
      if (b) panel.dataset.vmuBusy = '1'; else delete panel.dataset.vmuBusy;
      listEl.querySelectorAll('.vmu-plo-tile').forEach(r => { r.draggable = !b; });
      updateControls();
    }

    const iconTop = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2.5h8M7 12V5.5M4 8l3-3 3 3"/></svg>';
    const iconBottom = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5h8M7 2v6.5M4 6l3 3 3-3"/></svg>';

    // Blocks (cover tiles in a grid, like the catalog's playlist cards), not
    // rows: a cover is what people recognise a playlist by.
    function render() {
      const scroll = listEl.scrollTop;
      const lift = isCommunity() ? new Set(pending().map(m => m.id)) : new Set();
      listEl.innerHTML = items.map((p, i) => `
        <div class="vmu-plo-tile${dragged.has(p.id) && p.id !== orig[i] ? ' vmu-plo-changed' : (lift.has(p.id) && !dragged.has(p.id) ? ' vmu-plo-lift' : '')}" draggable="${busy ? 'false' : 'true'}" data-id="${p.id}">
          <div class="vmu-plo-art">
            ${p.cover ? `<img class="vmu-plo-cover" src="${escHtml(p.cover)}" alt="" decoding="async" draggable="false">` : '<span class="vmu-plo-cover vmu-plo-cover-empty"></span>'}
            <span class="vmu-plo-pos">${i + 1}</span>
            <span class="vmu-plo-meta" title="Треков в плейлисте">${p.count}</span>
            <span class="vmu-plo-actions">
              <button type="button" class="vmu-plo-btn" data-act="top" title="В начало">${iconTop}</button>
              <button type="button" class="vmu-plo-btn" data-act="bottom" title="В конец">${iconBottom}</button>
            </span>
          </div>
          <div class="vmu-plo-title" title="${escHtml(p.title)}">${escHtml(p.title)}</div>
        </div>`).join('');
      listEl.scrollTop = scroll;
      updateControls();
    }

    function move(id, refId, after) {
      if (id === refId) return;
      const from = items.findIndex(p => p.id === id);
      if (from < 0) return;
      const [it] = items.splice(from, 1);
      const to = items.findIndex(p => p.id === refId);
      items.splice(after ? to + 1 : to, 0, it);
    }

    // Paste-a-list shortcut: one playlist link/ID per line, in the wanted
    // order — same idea as applyPlaylistOrderFromEntries, but for playlists
    // instead of tracks, and matched by ID instead of title (unambiguous).
    // A line with no "http" and that isn't pure digits is ignored, so pasting
    // a whole formatted list (headers, blank lines, "### Artist (N)" counts)
    // works as-is: only lines ending in a playlist URL or a bare ID count.
    function parsePastedPlaylistIds(text) {
      const order = [];
      const seen = new Set();
      for (const raw of String(text || '').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        let id = null;
        if (/^\d+$/.test(line)) {
          id = Number(line);
        } else if (/https?:\/\//i.test(line)) {
          const m = line.match(/(\d+)(?!.*\d)/);
          if (m) id = Number(m[1]);
        }
        if (id == null || !Number.isFinite(id) || seen.has(id)) continue;
        seen.add(id);
        order.push(id);
      }
      return order;
    }

    // Auto-sort shortcut: parses "Название (Год) Автор" (or "Название Год
    // Автор" with no parens) out of each playlist's own title and groups by
    // the author — same rule as the paste-order helper's source data used,
    // only inline instead of from a pasted list. A multi-credit title keeps
    // only the first-listed name as the sort key ("Баста, Гуф" -> "баста").
    // Titles that don't fit the pattern can't be attributed and go last, in
    // their current order. This is a generic text pattern, not a per-artist
    // alias table: literal spelling/script variants (e.g. a Cyrillic vs
    // Latin spelling of the same name) sort as different authors.
    const YEAR_PAREN_RE = /\((\d{4}(?:-\d{4})?)\s*\)/;
    const YEAR_BARE_RE = /(?<!\d)((?:19|20)\d{2})(?!\d)/;
    // Only the main/album artist is wanted, never a featured one — so this
    // splits on every common "and another artist joins in" separator,
    // including both "feat." and "ft." (with or without the trailing dot;
    // `\b...\b` keeps "feat" from matching inside "feature").
    const AUTHOR_SEP_RE = /\s*(?:,|&|\/|;|\bfeat\.?\b|\bft\.?\b)\s*/i;
    // "Artist - Album (Year)" / "Artist - Song - Song (Year)": the year sits
    // at the very end with nothing after it, so there's no "Автор" tail to
    // read — real community data has playlists titled exactly this way
    // (metal/black-metal releases mostly). Only trusted when an explicit
    // " - " splits the text before the year; a bare leading phrase with no
    // separator (e.g. "Артист все синглы и фиты (2018-2026)") is too
    // ambiguous to guess at and is left unattributed, same as before.
    const DASH_SEP_RE = /\s+[-–—]\s+/;
    function extractAuthorKey(title) {
      const t = String(title || '');
      const m = YEAR_PAREN_RE.exec(t) || YEAR_BARE_RE.exec(t);
      if (!m) return null;
      const after = t.slice(m.index + m[0].length).trim();
      if (after) {
        const primary = after.split(AUTHOR_SEP_RE)[0].trim();
        return primary ? primary.toLowerCase() : null;
      }
      const dashParts = t.slice(0, m.index).split(DASH_SEP_RE);
      if (dashParts.length < 2) return null;
      // Same main-artist-only rule applies here too — "Artist1 & Artist2 -
      // Album (Year)" should key on "Artist1", not the whole credit list.
      const primary = dashParts[0].split(AUTHOR_SEP_RE)[0].trim();
      return primary ? primary.toLowerCase() : null;
    }
    // Same year match extractAuthorKey found, as a number — a "(2018-2026)"
    // range sorts on its start year. Grouping by author only fixes WHICH
    // playlists sit together; within one author's group they were still
    // left in whatever order the page happened to have them (reported:
    // "года поломаны, не в хронологическом порядке"), so this re-sorts
    // each author's own playlists oldest -> newest once they're grouped.
    function extractYear(title) {
      const t = String(title || '');
      const m = YEAR_PAREN_RE.exec(t) || YEAR_BARE_RE.exec(t);
      return m ? parseInt(m[1], 10) : null;
    }
    // Cyrillic code points (U+0400+) all sort after Latin ones (U+0061-007A)
    // in a plain string compare, so a straight `<`/`>` on the raw keys puts
    // every Latin-named author in one block before every Cyrillic-named one
    // instead of interleaving them alphabetically ("конфликт алфавитов",
    // reported live on this community's own mixed-script catalog). Sorting
    // by a transliterated key instead makes both alphabets compare on the
    // same scale — "баста" -> "basta" lands next to "big baby tape", not
    // after "эфир в норме". Transliteration is comparison-only: the actual
    // grouping key (and everything shown/applied) stays the original text.
    const CYR_TRANSLIT = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
      и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
      с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
      щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    };
    const translitKey = s => String(s || '').replace(/[а-яё]/g, ch => CYR_TRANSLIT[ch] ?? ch);

    // Same real artist, two different typed-out keys: not just script
    // (handled above) but plain typos across the community's own playlist
    // titles ("Frendly Thug 52 NGG" vs "FRIENDLY THUG 52 NGG" — someone
    // dropped an "i"). Levenshtein distance on the transliterated keys
    // catches this, but only when it's safe to: a 1-char difference on a
    // 3-letter key is 33% of the string and could just as easily be two
    // unrelated artists, so short keys require an exact match and the
    // threshold is relative to length, not a flat character count. Checked
    // against this community's real 46 parsed authors live: only the one
    // genuine typo pair crosses it, nothing else comes close (verified via
    // Claude in Chrome before this shipped — see [[playlist-order-feature]]).
    function levenshtein(a, b) {
      const al = a.length, bl = b.length;
      if (!al) return bl;
      if (!bl) return al;
      let prev = new Array(bl + 1);
      for (let j = 0; j <= bl; j++) prev[j] = j;
      for (let i = 1; i <= al; i++) {
        const cur = [i];
        for (let j = 1; j <= bl; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        }
        prev = cur;
      }
      return prev[bl];
    }
    function isFuzzyAuthorMatch(ta, tb) {
      if (ta === tb) return true;
      const minLen = Math.min(ta.length, tb.length);
      if (minLen < 6) return false; // too short to risk it
      if (Math.abs(ta.length - tb.length) > 3) return false; // cheap pre-filter
      const maxLen = Math.max(ta.length, tb.length);
      const dist = levenshtein(ta, tb);
      return dist <= 3 && dist / maxLen <= 0.15;
    }
    // Groups raw extractAuthorKey() outputs into clusters of "same real
    // author" (script variants + close typos merged), each with one
    // representative key (whichever raw key has the most playlists — ties
    // keep whichever was seen first). `groups` stays keyed by the ORIGINAL
    // raw key for lookups; this only decides which raw keys count as one.
    function clusterAuthorKeys(rawKeys, groups) {
      const tl = rawKeys.map(translitKey);
      const parent = rawKeys.map((_, i) => i);
      const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      const union = (x, y) => { const rx = find(x), ry = find(y); if (rx !== ry) parent[rx] = ry; };
      for (let i = 0; i < rawKeys.length; i++) {
        for (let j = i + 1; j < rawKeys.length; j++) {
          if (tl[i] === tl[j] || isFuzzyAuthorMatch(tl[i], tl[j])) union(i, j);
        }
      }
      const clusters = new Map(); // root index -> raw key indices
      for (let i = 0; i < rawKeys.length; i++) {
        const r = find(i);
        if (!clusters.has(r)) clusters.set(r, []);
        clusters.get(r).push(i);
      }
      return [...clusters.values()].map(idxs => {
        const keys = idxs.map(i => rawKeys[i]);
        let rep = keys[0], repCount = groups.get(rep).length;
        for (const k of keys) { const c = groups.get(k).length; if (c > repCount) { rep = k; repCount = c; } }
        const playlists = [];
        for (const k of keys) playlists.push(...groups.get(k));
        return { key: rep, count: playlists.length, playlists };
      });
    }

    // Bury-list: instead of making the user type author names from memory
    // (a typo wouldn't match the parsed key at all), autosort builds the
    // list of every author it actually found and offers it as clickable
    // chips — the user just points at who goes to the very end, after even
    // the unattributed tail. Selection is remembered per community across
    // reopenings.
    const buryStoreKey = 'vmu-plorder-bury-' + ownerId;
    let buryKeySet = new Set();
    try { buryKeySet = new Set(JSON.parse(localStorage.getItem(buryStoreKey) || '[]')); } catch {}
    const saveBury = () => { try { localStorage.setItem(buryStoreKey, JSON.stringify([...buryKeySet])); } catch {} };
    let authorGroupInfo = []; // [{key, count}] — every distinct author from the last parse, any script
    function renderBuryChips() {
      if (!authorGroupInfo.length) {
        buryHintEl.style.display = '';
        buryChipsEl.style.display = 'none';
        return;
      }
      buryHintEl.style.display = 'none';
      buryChipsEl.style.display = '';
      const sorted = [...authorGroupInfo].sort((a, b) => {
        const ta = translitKey(a.key), tb = translitKey(b.key);
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });
      buryChipsEl.innerHTML = sorted.map(a => {
        const label = a.key.charAt(0).toUpperCase() + a.key.slice(1);
        const on = buryKeySet.has(a.key);
        return `<button type="button" class="vmu-plo-bury-chip${on ? ' vmu-plo-bury-chip-on' : ''}" data-key="${escHtml(a.key)}" title="${on ? 'В самом низу — клик, чтобы вернуть в обычную сортировку' : 'Отправить в самый низ, после всех'}">${escHtml(label)} <span class="vmu-plo-bury-chip-n">${a.count}</span></button>`;
      }).join('');
    }
    buryChipsEl.addEventListener('click', e => {
      const b = e.target.closest('.vmu-plo-bury-chip');
      if (!b || busy) return;
      const key = b.dataset.key;
      if (buryKeySet.has(key)) buryKeySet.delete(key); else buryKeySet.add(key);
      saveBury();
      sortItemsByAuthor();
    });

    function sortItemsByAuthor() {
      if (busy) return;
      const keyed = items.map(p => ({ p, key: extractAuthorKey(p.title) }));
      const groups = new Map();
      const unknown = [];
      for (const x of keyed) {
        if (x.key == null) { unknown.push(x.p); continue; }
        if (!groups.has(x.key)) groups.set(x.key, []);
        groups.get(x.key).push(x.p);
      }
      const clusters = clusterAuthorKeys([...groups.keys()], groups);
      for (const c of clusters) {
        // Newest first within an author's own group.
        c.playlists.sort((a, b) => (extractYear(b.title) ?? 0) - (extractYear(a.title) ?? 0));
      }
      authorGroupInfo = clusters.map(c => ({ key: c.key, count: c.count }));
      // Bury-list authors are pulled out of the normal grouping before the
      // sort and tacked on at the very end (alphabetised the same way among
      // themselves), after even the unattributed tail — "у параши", below
      // absolutely everyone else.
      const cmpTranslit = (a, b) => {
        const ta = translitKey(a), tb = translitKey(b);
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      };
      const buriedClusters = clusters.filter(c => buryKeySet.has(c.key)).sort((a, b) => cmpTranslit(a.key, b.key));
      const restClusters = clusters.filter(c => !buryKeySet.has(c.key)).sort((a, b) => cmpTranslit(a.key, b.key));
      const ordered = [];
      for (const c of restClusters) ordered.push(...c.playlists);
      ordered.push(...unknown);
      const buried = [];
      for (const c of buriedClusters) buried.push(...c.playlists);
      ordered.push(...buried);
      items = ordered;
      dragged = new Set(items.map(p => p.id));
      render();
      renderBuryChips();
      setStatus(`Отсортировано по авторам: групп — ${restClusters.length}`
        + (unknown.length ? `, без определённого автора — ${unknown.length}` : '')
        + (buried.length ? `, в самый низ — ${buried.length}` : '')
        + '. Проверь список и нажми «Применить».');
    }

    // ── drag & drop (HTML5) ──
    let dragId = null;
    const clearMark = () => {
      listEl.querySelectorAll('.vmu-plo-drop-before, .vmu-plo-drop-after').forEach(r => r.classList.remove('vmu-plo-drop-before', 'vmu-plo-drop-after'));
      dropMark = null;
    };
    listEl.addEventListener('dragstart', e => {
      const tile = e.target.closest?.('.vmu-plo-tile');
      if (!tile || busy) { e.preventDefault(); return; }
      dragId = Number(tile.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(dragId)); } catch {}
      tile.classList.add('vmu-plo-dragging');
    });
    listEl.addEventListener('dragover', e => {
      if (dragId == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // edge auto-scroll: the list is 200+ rows tall
      const lr = listEl.getBoundingClientRect();
      if (e.clientY < lr.top + 44) listEl.scrollTop -= 14;
      else if (e.clientY > lr.bottom - 44) listEl.scrollTop += 14;
      const tile = e.target.closest?.('.vmu-plo-tile');
      clearMark();
      if (!tile) return;
      const id = Number(tile.dataset.id);
      if (id === dragId) return;
      // Grid reading order: the left half of a tile means "before it", the
      // right half "after it".
      const r = tile.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      tile.classList.add(after ? 'vmu-plo-drop-after' : 'vmu-plo-drop-before');
      dropMark = { id, after };
    });
    listEl.addEventListener('drop', e => {
      if (dragId == null) return;
      e.preventDefault();
      const mark = dropMark;
      clearMark();
      const id = dragId;
      dragId = null;
      if (mark) { move(id, mark.id, mark.after); dragged.add(id); render(); }
    });
    listEl.addEventListener('dragend', () => {
      dragId = null;
      clearMark();
      listEl.querySelectorAll('.vmu-plo-dragging').forEach(r => r.classList.remove('vmu-plo-dragging'));
    });
    listEl.addEventListener('click', e => {
      const b = e.target.closest('.vmu-plo-btn');
      if (!b || busy) return;
      const id = Number(b.closest('.vmu-plo-tile').dataset.id);
      const from = items.findIndex(p => p.id === id);
      const [it] = items.splice(from, 1);
      if (b.dataset.act === 'top') items.unshift(it); else items.push(it);
      dragged.add(id);
      render();
    });

    // ── talking to injected.js ──
    const reqId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    async function fetchList() {
      const r = await pageCall('VKD_PLAYLIST_ORDER_LIST', 'VKD_PLAYLIST_ORDER_LIST_DONE', { reqId: reqId(), ownerId }, 60000, 'reqId');
      if (!r.success) throw new Error(r.error || 'не удалось получить список');
      return r.items || [];
    }
    // One move. VK maps its flood control onto "access denied" among other
    // things, so a refusal is only retried once something in this run has
    // already gone through — a real refusal on the very first move fails fast.
    async function sendMove(m, anySucceeded) {
      const owner = byId.get(m.id)?.ownerId ?? ownerId;
      const delays = [3000, 8000, 20000, 45000];
      for (let attempt = 0; ; attempt++) {
        const r = await pageCall('VKD_PLAYLIST_ORDER_MOVE', 'VKD_PLAYLIST_ORDER_MOVE_DONE',
          { reqId: reqId(), ownerId: owner, playlistId: m.id, after: m.after, before: m.before }, 30000, 'reqId');
        if (r.success) return { ok: true };
        const floodish = r.code === 6 || r.code === 9 || r.code === 29 || r.code === -1
          || (anySucceeded && (r.code === 15 || /access denied|too many/i.test(r.error || '')));
        if (!floodish || attempt >= delays.length) return { ok: false, code: r.code, error: r.error };
        setStatus(`VK просит подождать… повтор через ${Math.round(delays[attempt] / 1000)} с`);
        await sleep(delays[attempt]);
      }
    }

    async function load() {
      setBusy(true);
      setProgress(null);
      reloadBtn.style.display = 'none';
      try {
        if (!ownerId) throw new Error('Открой страницу музыки (vk.ru/audios…) и запусти заново');
        setStatus('Загружаю плейлисты…');
        const list = await fetchList();
        if (!panel.isConnected) return;
        items = list;
        orig = ids();
        dragged = new Set();
        byId = new Map(items.map(p => [p.id, p]));
        const foreign = items.filter(p => String(p.ownerId) !== String(ownerId)).length;
        setStatus(items.length
          ? `Плейлистов: ${items.length}${foreign ? ` (из них чужих, на которые вы подписаны: ${foreign})` : ''}${isCommunity() ? '. В сообществе VK умеет только поднимать плейлист в начало — порядок будет собран такими переносами' : ''}`
          : 'Плейлистов нет');

        // Resume support: an earlier apply() in this tab (or before a forced
        // reload) left a target order that never finished — restore it so
        // the user reviews and hits «Применить» again instead of starting
        // over. pending() below naturally shows 0 and the button stays
        // disabled if it turns out to already be fully applied.
        const savedTarget = ploLoadTarget();
        if (savedTarget && savedTarget.length) {
          const restored = savedTarget.map(id => byId.get(id)).filter(Boolean);
          if (restored.length) {
            const extra = items.filter(p => !savedTarget.includes(p.id));
            items = [...restored, ...extra];
            dragged = new Set(restored.map(p => p.id));
            const left = (isCommunity() ? ploPlanTopMoves : ploPlanMoves)(orig, ids()).length;
            setStatus(left
              ? `Восстановлен незавершённый порядок (прошлая попытка прервалась). Осталось запросов: ${left} — проверь и нажми «Применить», либо «Сбросить», чтобы начать заново.`
              : 'Восстановлен незавершённый порядок — он уже применён, можно закрыть.');
          } else {
            ploClearTarget();
          }
        }
      } catch (err) {
        console.warn('[VK Multi Upload] playlist-order load failed:', err);
        setStatus('Ошибка: ' + (err.message || err), true);
        items = []; orig = [];
      } finally {
        if (panel.isConnected) { setBusy(false); render(); }
      }
    }

    // Sends the moves; never throws, always reports how far it got.
    async function sendAll(target) {
      const res = { sent: 0, total: 0, problem: null };
      try {
        // Plan from what the server has RIGHT NOW, not from what was loaded
        // earlier — the order may have changed since (app, other tab).
        setStatus('Сверяю с порядком на сервере…');
        const freshIds = (await fetchList()).map(p => p.id);
        const sameSet = freshIds.length === target.length && freshIds.every(id => byId.has(id));
        if (!sameSet) { res.problem = 'Список плейлистов изменился — перезагружаю, выбери порядок заново'; return res; }
        let relative = !isCommunity();
        let moves = (relative ? ploPlanMoves : ploPlanTopMoves)(freshIds, target);
        let expected = freshIds;          // the order the server should have after the moves sent so far
        res.total = moves.length;
        for (let next = 0; next < moves.length;) {
          if (!panel.isConnected) { res.problem = 'Окно закрыто'; return res; }
          if (cancelled) { res.problem = `Остановлено: выполнено ${res.sent} из ${res.total}`; return res; }
          const m = moves[next];
          setStatus(`Перемещаю: ${res.sent + 1} из ${res.total} — «${byId.get(m.id)?.title || m.id}»`);
          setProgress(res.sent / res.total);
          const r = await sendMove(m, res.sent > 0);
          if (!r.ok) {
            res.problem = r.code === 5
              ? 'Токен VK устарел — обновите страницу (F5) и повторите; уже выполнено перемещений: ' + res.sent
              : `VK отклонил перемещение ${res.sent + 1} из ${res.total}: ${r.error || 'ошибка'}${r.code ? ` (код ${r.code})` : ''}`;
            return res;
          }
          res.sent++;
          next++;
          expected = ploApplyMove(expected, m);
          // A relative move can be accepted (`1`) and still ignored — that is
          // exactly what a community does — so the first one is checked
          // against the server; if it did nothing, plan again from what the
          // server really has, using top-moves only.
          if (relative && res.sent === 1) {
            const now = (await fetchList()).map(p => p.id);
            if (JSON.stringify(now) !== JSON.stringify(expected)) {
              console.info('[VK Multi Upload] relative move ignored by VK, falling back to top-moves');
              relative = false;
              moves = ploPlanTopMoves(now, target);
              expected = now;
              next = 0;
              res.total = res.sent + moves.length;
              setStatus('VK игнорирует перемещение рядом с соседом — собираю порядок переносами в начало…');
              await sleep(600);
            }
          }
          await sleep(450);
        }
      } catch (err) {
        console.warn('[VK Multi Upload] playlist-order apply failed:', err);
        res.problem = 'Ошибка: ' + (err.message || err);
      }
      return res;
    }

    async function apply() {
      if (busy) return;
      const planned = pending().length;
      if (isCommunity() && planned > 25) {
        const mins = Math.max(1, Math.round(planned * 0.8 / 60));
        const ok = await vmuConfirmBulkAction(applyBtn.parentElement, applyBtn,
          `Понадобится ${planned} запросов (≈ ${mins} мин). В сообществе VK принимает только «в начало», поэтому плейлисты выше перенесённого поднимутся заново. Продолжить?`, 'Применить');
        if (!ok) return;
      }
      const target = ids();
      ploSaveTarget(target);
      cancelled = false;
      stopBtn.disabled = false;
      setBusy(true);
      stopBtn.style.display = '';
      const { sent, total, problem } = await sendAll(target);
      stopBtn.style.display = 'none';
      setProgress(null);
      if (!panel.isConnected) return;

      // Show the truth either way: re-read what the server ended up with.
      let mismatch = null;
      try {
        const list = await fetchList();
        byId = new Map(list.map(p => [p.id, p]));
        orig = list.map(p => p.id);
        const freshIds = orig;
        mismatch = target.length === freshIds.length
          ? freshIds.filter((id, i) => id !== target[i]).length
          : Math.max(target.length, freshIds.length);
        if (problem || mismatch !== 0) {
          // Unfinished: keep editing the ORIGINAL target (refreshed with
          // current item data), not the partial server order, so pending()
          // immediately reflects just what's left — a plain «Применить»
          // continues from here instead of silently losing the plan.
          items = target.map(id => byId.get(id)).filter(Boolean);
          const extra = list.filter(p => !target.includes(p.id));
          items.push(...extra);
          dragged = new Set(target);
        } else {
          items = list;
          dragged = new Set();
        }
      } catch { /* keep what is on screen */ }

      if (problem) {
        setStatus(problem + ' — список не потерян: проверь и нажми «Применить» ещё раз, чтобы продолжить с этого места.', true);
      } else if (total === 0) {
        setStatus('Порядок уже такой, как нужно');
        ploClearTarget();
      } else if (mismatch === 0) {
        setStatus(`Готово: порядок применён (перемещений: ${sent})`);
        ploClearTarget();
      } else {
        setStatus(`Применено ${sent} из ${total}, но на сервере порядок отличается от выбранного (позиций: ${mismatch}) — нажми «Применить» ещё раз, чтобы закончить перестановку`, true);
      }
      if (sent) reloadBtn.style.display = '';
      setBusy(false);
      render();
    }

    stopBtn.addEventListener('click', () => { cancelled = true; stopBtn.disabled = true; });
    applyBtn.addEventListener('click', apply);
    resetBtn.addEventListener('click', () => {
      if (busy) return;
      items = orig.map(id => byId.get(id));
      dragged = new Set();
      ploClearTarget();
      render();
    });
    autoSortBtn.addEventListener('click', sortItemsByAuthor);
    pasteApplyBtn.addEventListener('click', () => {
      if (busy) return;
      const order = parsePastedPlaylistIds(pasteBox.value);
      if (!order.length) { showToast('Не нашёл в тексте ни одной ссылки/ID плейлиста', true); return; }
      const pos = new Map(order.map((id, i) => [id, i]));
      const known = items.filter(p => pos.has(p.id)).sort((a, b) => pos.get(a.id) - pos.get(b.id));
      const rest = items.filter(p => !pos.has(p.id));
      const missing = order.filter(id => !byId.has(id)).length;
      items = [...known, ...rest];
      dragged = new Set(known.map(p => p.id));
      render();
      setStatus(`Порядок из списка применён: расставлено ${known.length} из ${items.length}`
        + (missing ? `, не найдено на странице: ${missing}` : '')
        + '. Остальное — в прежнем порядке. Проверь список и нажми «Применить».');
    });
    load();
  }

  function injectCatalogToolbarButtons() {
    // each one on its own: a failure in one must not skip the ones after it
    for (const fn of [injectPlaylistOrderButton, injectPlaylistMakerButton, injectBulkAlbumsButton, injectBulkOpsButton, injectToolbarSettingsButtons]) {
      try { fn(); } catch (err) { console.warn('[VK Multi Upload] toolbar button failed:', fn.name, err); }
    }
  }
  // Safety net: the mutation watcher re-injects after VK re-renders the toolbar,
  // but a re-render it does not report (or one that lands between two passes)
  // would leave the toolbar short until the next unrelated mutation. A check is a
  // handful of cheap lookups, so it also runs on a slow timer.
  setInterval(() => { if (!document.hidden && vmuPageHasAudio()) injectCatalogToolbarButtons(); }, 1500);
  // Re-injection after VK re-renders the toolbar is driven from the throttled
  // page-mutation watcher (onPageMutated, ≤~8 runs/sec) instead of a
  // dedicated body-subtree observer of its own: that one ran these lookups
  // (each a document-wide attribute scan) on EVERY mutation batch, on every
  // vk.com page, buttons present or not.
  injectCatalogToolbarButtons();
  // A batch-album run reloads the page between albums on purpose, so it is
  // this call — not the click that started it — that keeps the loop going.
  setTimeout(() => { bulkalbResumeOnLoad().catch(err => console.warn('[VK Multi Upload] bulk albums resume failed:', err)); }, 2000);

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

    // ─── minimap ──────────────────────────────────────────────────────────
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

    // ─── list column ──────────────────────────────────────────────────────
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

    // ─── full page-track list (mini-menu like duplicate finder) ───────────
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
  const UPLOAD_MODAL_BOX = '[class*="vkitInternalModalBox"], .audio_add_box';
  const UPLOAD_MODAL_INPUT = 'input[type="file"][accept*="audio"], input[type="file"][accept*="mp3"], [data-testid="UploadAudio_SelectFileButton"]';

  function mountNewUploadDialog(mutations) {
    const boxes = new Set();
    for (const { target, addedNodes } of mutations) {
      if (!addedNodes.length) continue;
      const parentBox = target.closest?.(UPLOAD_MODAL_BOX);
      if (parentBox) boxes.add(parentBox);
      for (const node of addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches(UPLOAD_MODAL_BOX)) boxes.add(node);
        else for (const box of node.querySelectorAll(UPLOAD_MODAL_BOX)) boxes.add(box);
      }
    }

    for (const box of boxes) {
      if (!box.isConnected || box.dataset.vmuInjected || !box.querySelector(UPLOAD_MODAL_INPUT) ||
          !box.checkVisibility() || isPlaylistDialog(box)) continue;
      vmuStampUploadDialog([box]);
      injectIntoVkDialog(box);
      return;
    }
  }

  function getUploadDialog() {
    // Protected zombie: injected.js kept this element alive while our flag is
    // set. VK may have replaced the body with a success screen AND started a
    // close animation (display:none / opacity:0), so skip the width check —
    // armBoxVisibility will restore visibility on the next 300 ms tick.
    // One document scan for both lookups (this runs on every throttled page
    // mutation): the zombie is simply the first modal box carrying the
    // protected marker, in the same document order the old two-selector
    // version resolved it in.
    const modalBoxes = [...document.querySelectorAll('[class*="vkitInternalModalBox"]')];
    const zombie = modalBoxes.find(m => m.hasAttribute('data-vmu-protected'));
    if (zombie) return zombie;
    // New VK: vkitInternalModalBox containing audio file input
    const newDlg = modalBoxes
      .find(m => m.getBoundingClientRect().width > 0 &&
                 m.querySelector(UPLOAD_MODAL_INPUT) &&
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
    const files = [...e.detail.files];
    addFiles(settings.workMode === 'check' ? files.filter(isMP3) : files);
  });

  function setBlockAudioHide(block, batchId) {
    window.postMessage({ type: 'VMU_BLOCK_AUDIO_HIDE', block, batchId }, '*');
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

  // Reload the page unconditionally after every completed batch. Even native
  // uploads (which do update VK's own store) leave the visible audio list
  // and the playlist modal DOM stale — a track can succeed at the API level
  // and remain invisible until reload, which then breaks the duplicate scan
  // on the next click since it can only see rows VK has actually mounted.
  // Called from processQueue AFTER runAutoPlaylist finishes (via
  // enqueueAutoPlaylist's onSettled), so the auto-playlist flow — which
  // drives VK's own create-playlist dialog off trackNames metadata, not the
  // background page's DOM — completes first and isn't torn down by the
  // reload. A short delay lets the final "готово / плейлист создан" toast
  // register visually before the page tears down.
  function reloadAfterBatchIfNeeded() {
    setBlockAudioHide(false);
    setTimeout(() => location.reload(), 1500);
  }

  // ─── Embed full UI into VK's native upload dialog ────────────────────────────
  function buildEmbeddedUI(withOwnHeader) {
    const wrap = document.createElement('div');
    wrap.id = 'vmu-embedded';
    const isCheck = settings.workMode === 'check';
    const dzLabel = isCheck ? 'Перетащите MP3 для проверки' : 'Файлы для загрузки';
    const dzHint = isCheck ? 'Имена файлов будут сверены с треками на странице' : 'Перетащите MP3 сюда. До 200 МБ на файл.';
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
        <div class="vmu-dz-copy">
          <div class="vmu-dz-label">${dzLabel}</div>
          <div class="vmu-dz-hint">${dzHint}</div>
        </div>
        <button type="button" id="vmu-pick-open" class="vmu-pick-btn">
          ${ICON_UPLOAD}
          Выбрать файлы
        </button>
        <input type="file" id="vmu-input" accept=".mp3,audio/mpeg" multiple>
      </div>

      <div id="vmu-list"></div>

      <div id="vmu-footer">
        <span id="vmu-status" role="status"></span>
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
    document.getElementById('vmu-pick-open')?.addEventListener('click', () => {
      document.getElementById('vmu-input')?.click();
    });
    document.getElementById('vmu-close-btn')?.addEventListener('click', closeUploadModal);
    document.getElementById('vmu-clear')?.addEventListener('click', () => {
      if (nativeUploadTracker && !nativeUploadTracker.rows.some(row => NATIVE_UPLOAD_ACTIVE.has(row.state))) {
        releaseNativeUploadTracker(nativeUploadTracker);
      }
      fileQueue = fileQueue.filter(f => f.status === 'uploading' || f.status === 'pending');
      renderQueue();
    });

    document.getElementById('vmu-input')?.addEventListener('change', e => {
      const files = [...e.target.files];
      addFiles(settings.workMode === 'check' ? files.filter(isMP3) : files);
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
    const card = e.target.closest?.('[data-testid="MusicPlaylistItem_Cell"], [class*="_audio_pl_"]');
    if (!card) return;
    const m = card.dataset.id?.match(/^(-?\d+_\d+)$/) || card.className.match(/_audio_pl_([-\d]+_\d+)/);
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
  // Check / cross as SVG (the plain ✓ ✕ glyphs render differently per font and
  // look rough); the tick draws itself once when the notice appears.
  const ICON_NOTICE_OK = '<svg class="vmu-notice-svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path class="vmu-notice-tick" d="M3.4 8.7l3.1 3.1 6.1-7.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_NOTICE_ERR = '<svg class="vmu-notice-svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.6 4.6l6.8 6.8M11.4 4.6l-6.8 6.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // Short «Подменено» notice for the track swap. Several swapped tracks in a
  // row keep ONE notice on screen: it only refreshes (tick redraws, a small
  // pulse, timer restarts) instead of sliding out and in for every track.
  function showSwapToast() {
    let el = document.getElementById('vmu-swap-toast');
    if (!el) {
      document.getElementById('vmu-toast')?.remove();
      el = document.createElement('div');
      el.id = 'vmu-swap-toast';
      el.className = 'vmu-notice vmu-notice-compact';
      el.innerHTML = '<div class="vmu-notice-icon vmu-notice-icon-success"></div><div class="vmu-notice-text">Подменено</div>';
      document.body.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('vmu-notice-shown')));
    } else {
      el.classList.remove('vmu-notice-pulse');
      void el.offsetWidth;
      el.classList.add('vmu-notice-pulse');
    }
    el.querySelector('.vmu-notice-icon').innerHTML = ICON_NOTICE_OK;
    clearTimeout(el._vmuTimer);
    clearTimeout(el._vmuRemoveTimer);
    el.classList.add('vmu-notice-shown');
    el._vmuTimer = setTimeout(() => {
      el.classList.remove('vmu-notice-shown');
      el._vmuRemoveTimer = setTimeout(() => el.remove(), 300);
    }, 1800);
  }

  function showToast(msg, isError) {
    document.getElementById('vmu-toast')?.remove();
    const el = document.createElement('div');
    el.id = 'vmu-toast';
    el.className = 'vmu-notice';
    const icon = document.createElement('div');
    icon.className = 'vmu-notice-icon ' + (isError ? 'vmu-notice-icon-error' : 'vmu-notice-icon-success');
    icon.innerHTML = isError ? ICON_NOTICE_ERR : ICON_NOTICE_OK;
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
    iconEl.innerHTML = kind === 'error' ? ICON_NOTICE_ERR : kind === 'done' ? ICON_NOTICE_OK : '<span class="vmu-notice-spin"></span>';
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
      startDlSession(plInfo, mode, btn);
    });
    return btn;
  }

  function injectPlaylistViewActions() {
    const urlInfo = getPlaylistInfoFromUrl();
    const modal = getPlaylistModalView();
    const page = getPlaylistPageView();
    const view = modal || page;
    if (!view) return;
    const plInfo = (modal && modal.title?.href && getPlaylistInfoFromUrl(modal.title.href)) || urlInfo || _pendingDupesPlaylist;
    if (!plInfo) return;
    const key = plInfo.ownerId + "_" + plInfo.playlistId + "_" + (plInfo.accessHash || "");
    const existing = view.scope.querySelector("[data-vmu-playlist-actions]");
    if (existing?.dataset.vmuPlaylistActions === key) {
      if (view.controls.nextElementSibling !== existing) view.controls.after(existing);
      return;
    }
    existing?.remove();

    const newRow = document.createElement("div");
    newRow.className = "vmu-playlist-actions";
    newRow.dataset.vmuPlaylistActions = key;
    const dupesBtn = makeDupesBtn(plInfo);
    newRow.appendChild(dupesBtn);
    newRow.appendChild(makeDlDialogBtn(plInfo, 'individual'));
    newRow.appendChild(makeDlDialogBtn(plInfo, 'zip'));

    view.controls.after(newRow);
  }

  // ─── playlist download feature ────────────────────────────────────────────────


  // ─── Embedded download progress (no backdrop) ────────────────────────────────
  // Keep progress in the playlist window, below its header and above its content.
  let _dlpStrip = null;
  let _dlpCloseTimer = null;

  function startDlSession(plInfo, mode, button) {
    if (_dlpStrip?.isConnected && !_dlpStrip.matches('.vmu-dlp-done, .vmu-dlp-error-state')) return;
    dlpInit(mode, button);
    runPlaylistDownload(plInfo, mode);
  }

  function dlpInit(mode, button) {
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
    const modal = button.closest('[class*="vkitInternalModalBox"], [role="dialog"]');
    const page = modal ? null : getPlaylistPageView();
    if (modal) {
      const view = getPlaylistModalView();
      let header = view?.scope === modal ? view.header : button;
      while (header.parentElement !== modal) header = header.parentElement;
      header.after(strip);
      strip.classList.add('vmu-dlp-in-modal');
    } else if (page) {
      if (page.body) page.body.before(strip);
      else page.scope.prepend(strip);
      strip.classList.add('vmu-dlp-in-modal');
    } else {
      strip.classList.add("vmu-dlp-floating");
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
    clearTimeout(_dlpCloseTimer);
    _dlpCloseTimer = null;
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
    const strip = _dlpStrip;
    if (!strip) return;
    strip.classList.add(ok ? 'vmu-dlp-done' : 'vmu-dlp-error-state');
    const stop = strip.querySelector('.vmu-dlp-stop');
    if (stop) { stop.textContent = 'Закрыть'; stop.disabled = false; stop.onclick = dlpClose; }
    clearTimeout(_dlpCloseTimer);
    if (ok) {
      _dlpCloseTimer = setTimeout(() => {
        if (_dlpStrip === strip) dlpClose();
      }, 1600);
    }
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
        chrome.runtime.sendMessage({ type: 'VKD_DOWNLOAD', url, filename }, res => {
          const error = chrome.runtime.lastError?.message;
          resolve(error ? { ok: false, error } : res);
        });
      } catch (err) { resolve({ ok: false, error: err.message }); }
    });
  }

  function dlSanitize(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  function dlPad(n, total) {
    return String(n).padStart(String(total).length, '0');
  }

  // ─── Extract tracks from popup DOM (React fiber) ──────────────────────────
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

      if (dlCancelFlag) {
        dlSetPhase('Отменено');
        dlSetFinished(false);
        return;
      }

      // ALWAYS extract from popup DOM via React fiber (runs in page context via injected.js)
      dlSetPhase('Читаем треки из попапа…');

      const page = findOpenPlaylistModal() ? null : getPlaylistPageView();
      if (page) await revealPlaylistPageList();
      await expandPlaylistModal((loaded, total) => {
        if (total) {
          dlSetPhase(`Раскрываем плейлист… ${loaded} / ${total}`);
          dlSetProgress(loaded, total);
        } else {
          dlSetPhase(`Раскрываем плейлист… ${loaded}`);
        }
      }, () => dlCancelFlag, page?.body || page?.scope);

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
        if (wantBuffer && res?.ok && !bytes?.byteLength) {
          res = { ok: false, error: 'Получен пустой аудиофайл' };
        }
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
        if (!zipRes?.ok) {
          URL.revokeObjectURL(blobUrl);
          dlSetPhase('Не удалось скачать ZIP');
          dlSetError(zipRes?.error || 'Chrome не подтвердил скачивание архива.');
          dlSetFinished(false);
          return;
        }
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
    const view = getPlaylistModalView() || getPlaylistPageView();
    return view?.title?.textContent?.trim() || null;
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
  function showDlTooltip(btn, forceNew) {
    const text = btn.getAttribute('data-vmu-tip');
    if (!text) return;
    const el = getDlTooltipEl();
    el.textContent = text;
    // Default flavour matches VK's old tt_w.tt_black tooltip (used across the
    // legacy audio rows and top-bar icons). Buttons inside the new vkui
    // playlist modal get the vkui-style tooltip via .vmu-tooltip-new.
    // One look for every bubble of the extension: the current VK one (dark, rounded,
    // wrapped). The legacy translucent black one (tt_black) is gone — it showed on the
    // toolbar buttons that were not on the old «new-style» list and looked foreign.
    const isNewVk = true;
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
  // Covers the whole page, VK's own title="" included: the browser's grey native
  // tooltip next to our bubbles looked like two different apps. (Only the title is
  // taken off while the pointer is over the element and put back on leave.)
  let _vmuTitleHoverEl = null;
  const _tipRelease = () => {
    const el = _vmuTitleHoverEl;
    if (!el) return;
    const text = el.getAttribute('data-vmu-tip');
    if (text && !el.hasAttribute('title') && el.isConnected) el.setAttribute('title', text);
    el.removeAttribute('data-vmu-tip');
    _vmuTitleHoverEl = null;
    hideDlTooltip();
  };
  document.addEventListener('mouseover', e => {
    if (!(e.target instanceof Element)) return;
    // still inside the element whose title is currently shown (its title is already
    // taken off, so closest('[title]') would find an ancestor instead)
    if (_vmuTitleHoverEl && _vmuTitleHoverEl.contains(e.target)) return;
    const el = e.target.closest('[title]');
    if (!el || el.closest('#vmu-tooltip')) return;
    const text = (el.getAttribute('title') || '').trim();
    if (!text) return;
    if (_vmuTitleHoverEl) _tipRelease();
    _vmuTitleHoverEl = el;
    el.setAttribute('data-vmu-tip', text);
    el.removeAttribute('title');
    // every title in the extension's own panels gets the current VK bubble
    // (dark, rounded, wrapped) — the legacy black one is only for the old rows' explicit buttons
    showDlTooltip(el, true);
  }, true);
  document.addEventListener('mouseout', e => {
    if (!_vmuTitleHoverEl) return;
    // mouseout bubbles and fires on every child boundary crossing too — only
    // actually leaving (relatedTarget outside the tracked element, or gone
    // entirely) should hide the tooltip, not moving from the element onto
    // its own child icon/text.
    if (e.relatedTarget && _vmuTitleHoverEl.contains(e.relatedTarget)) return;
    _tipRelease();
  }, true);
  // an element that is clicked, scrolled away or re-rendered under the pointer does not
  // always get a mouseout — the bubble must not stay behind
  document.addEventListener('mousedown', () => { if (_vmuTitleHoverEl) _tipRelease(); }, true);
  window.addEventListener('scroll', () => { if (_vmuTitleHoverEl) _tipRelease(); }, { passive: true, capture: true });
  setInterval(() => { if (_vmuTitleHoverEl && !_vmuTitleHoverEl.isConnected) _tipRelease(); }, 700);

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

  // VK's action-icon row inside a track row. It used to carry a readable
  // class (vkuiButtonGroup__host — capital B, so the match below is
  // case-insensitive); VK has since hashed it to vkit-XXXX utility classes
  // with nothing semantic left, so when the class lookup misses, find it
  // structurally instead: the child of the row's
  // [data-testid="audiorow-actions"] slot that holds the action buttons
  // (verified live 2026-10: slot is display:block, the group inside it is an
  // inline-flex row of 24x24 wrappers with 8px right margins). Without this
  // the download button fell back to the slot itself and stacked ABOVE the
  // icon row. Returns null while only the duration label is mounted (no
  // buttons yet) and for playlist-modal rows, which keep using the slot
  // fallback in injectSingleDlBtn.
  function findRowActionGroup(row) {
    const byClass = row.querySelector('[class*="buttonGroup" i]');
    if (byClass) return byClass;
    const slot = row.querySelector('[data-testid="audiorow-actions"]');
    if (!slot) return null;
    for (const child of slot.children) {
      if (child.classList.contains('vmu-single-dl')) continue;
      if (child.querySelector('button, [role="button"]')) return child;
    }
    return null;
  }

  function injectSingleDlBtn(row) {
    if (!getTrackDataFromRow(row)) return;

    // Prefer the actions button group: VK's own action panel. It is nested
    // one level inside a [data-testid="audiorow-actions"] wrapper
    // (display:block, used for hover positioning) — target the inner flex
    // row directly, not the wrapper, or the button renders outside the icon
    // row's flex flow.
    // Works for both page-level rows and playlist-modal rows (modal rows have
    // it too, but VK mounts it after first sweep — so if a previous sweep
    // placed the button into the after-slot fallback, migrate it here now
    // that the proper slot exists).
    const btnGroup = findRowActionGroup(row);
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
  const NEW_ROW_ACTIONS_SEL = '[class*="buttonGroup" i], [data-testid="audiorow-actions"]';
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

        // New VK: the action group (old class, or — now that its class is
        // hashed — the slot it mounts into), or the group itself appearing
        // inside a slot that was already there (parent check, O(1)).
        const groups = node.matches?.(NEW_ROW_ACTIONS_SEL) ? [node]
          : node.querySelectorAll ? [...node.querySelectorAll(NEW_ROW_ACTIONS_SEL)] : [];
        if (node.parentElement?.matches?.('[data-testid="audiorow-actions"]')) groups.push(node.parentElement);
        // VK's build of 2026-11-17 marks neither the slot nor its class — the
        // node that mounts inside a row and brings the icons with it IS the slot
        if (!groups.length) {
          const stampedRow = vmuStampRowActions(node);
          if (stampedRow) injectSingleDlBtn(stampedRow);
        }
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
  //
  // Profiled on the live page (scrolling a 500-row list): this was ~70 % of all
  // the extension's script time. Each mutation burst (up to 8 a second while
  // scrolling) ran three sweeps, and every sweep walked EVERY row — parsing its
  // JSON and running several selector queries — although on the new VK nearly
  // every row has nothing to inject until it is hovered (the hover observer
  // above handles that). So: (1) a row that was swept recently and has not
  // changed is skipped, (2) bursts are coalesced — one series of sweeps at a
  // time, with one trailing series if more mutations arrived meanwhile.
  // Is there anything on this page the music machinery can work on at all?
  // On the feed, in messages, in photos there is not, and the sweeps that go
  // looking cost 138 ms a minute there (profiled) for nothing. VK's own
  // data-audio-id on every track row is the honest signal: the top-bar player
  // and an (empty) role="dialog" are in the DOM of EVERY page — measured — so
  // neither of those can gate anything. Asking costs 0.12 ms, and the answer
  // is kept for a quarter of a second; every caller that reacts to a DOM
  // change asks for a fresh one.
  var _vmuAudioAt = 0, _vmuAudioSeen = false;
  function vmuPageHasAudio(fresh) {
    const now = performance.now();
    if (!fresh && now - _vmuAudioAt < 250) return _vmuAudioSeen;
    _vmuAudioAt = now;
    _vmuAudioSeen = !!(document.querySelector('[data-audio-id]')
      || document.querySelector('[data-full-id]')
      || document.querySelector('.AudioRow')
      || document.querySelector('.audio_row'));
    return _vmuAudioSeen;
  }

  var _sweepGateUntil = 0, _sweepTrailing = false;
  function markAndInjectAll(force) {
    // three passes, each with a document-wide scan and a round trip to the
    // page world, over a page that has no track rows on it
    if (!vmuPageHasAudio(force)) return;
    const t0 = performance.now();
    if (!force && t0 < _sweepGateUntil) { _sweepTrailing = true; return; }
    _sweepGateUntil = t0 + 700;
    const sweep = () => {
      window.postMessage({ type: 'VKD_MARK_ROWS' }, '*');
      setTimeout(() => {
        const now = performance.now();
        const rows = document.querySelectorAll('[data-testid$="MusicTrackRow"], [class*="vkitAudioRow__root"], .AudioRow, .audio_row, [data-full-id]');
        for (const row of rows) {
          const sig = (row.dataset && (row.dataset.vmuTrack || row.dataset.fullId)) || '';
          const seen = row.__vmuSwept;
          if (seen && seen.sig === sig && now - seen.t < 4000) continue;
          injectSingleDlBtn(row);
          row.__vmuSwept = { sig, t: now };
        }
      }, 50);
    };
    sweep();
    setTimeout(sweep, 200);
    setTimeout(sweep, 600);
    setTimeout(() => {
      if (!_sweepTrailing) return;
      _sweepTrailing = false;
      _sweepGateUntil = 0;
      markAndInjectAll();
    }, 720);
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
            t = setTimeout(() => markAndInjectAll(true), 60);
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
        _modalDlTimer1 = setTimeout(() => markAndInjectAll(true), 400);
        _modalDlTimer2 = setTimeout(() => { markAndInjectAll(true); attachModalInnerObserver(modalNode); }, 900);
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
          injectGeniusFindRow(editBox);
        }, 250);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // ─── Playlists catalog page: "TITLE - link" list ─────────────────────────────
  // On a /music/catalog/<id> "Плейлисты" page (the lazy-loaded grid of playlist
  // cards) a link under "Создать плейлист" scrolls the whole grid in and shows
  // every playlist as one "НАЗВАНИЕ - ссылка" line in a copy-ready text box.
  const PL_LIST_BLOCK_SEL = '[data-testid="music_playlists_list_block"]';
  const PL_CELL_SEL = '[data-testid="MusicPlaylistItem_Cell"]';
  const PL_TITLE_SEL = '[data-testid="MusicPlaylistItem_Title"]';
  const PL_COLLECT_TOAST_ID = 'vmu-plcollect-progress';
  let plCollectRunning = false;

  // The scan currently in flight (if any) — a per-scan token, not a shared
  // flag, so closing the panel cancels THAT scan only and a panel opened right
  // afterwards can't accidentally revive it.
  let plcActiveScan = null;
  // playlist id -> { tracks, source }. Kept for the page's lifetime so closing
  // and re-opening the panel (or re-collecting the list) doesn't throw away a
  // scan that may have taken minutes.
  const plcCache = new Map();

  function closePlaylistCollectPanel() {
    if (plcActiveScan) plcActiveScan.cancel = true;
    document.getElementById('vmu-plcollect-modal')?.remove();
  }

  function findPlaylistCatalogList(pathname = location.pathname) {
    const nativeList = document.querySelector(PL_LIST_BLOCK_SEL);
    if (nativeList) return nativeList;
    if (!pathname.startsWith('/music/catalog/')) return null;
    const [first, second] = document.querySelectorAll(PL_CELL_SEL);
    if (!first) return null;
    const catalog = first.closest('main, [role="main"]') || document.body;
    let list = first.parentElement;
    if (!list || list === catalog) return first;
    while (second && !list.contains(second) && list.parentElement && list.parentElement !== catalog) {
      list = list.parentElement;
    }
    return list;
  }

  async function collectCatalogPlaylists(onCount, shouldStop, onPlaysProgress) {
    await waitForElement(PL_CELL_SEL, 10000);
    const cells = () => (document.querySelector(PL_LIST_BLOCK_SEL) || document).querySelectorAll(PL_CELL_SEL);
    await scrollUntilCountStable(() => cells().length, {
      sleepMs: 800, stableLimit: 5, maxIter: 300, foreground: true, onCount, shouldStop,
    });
    const seen = new Set();
    const out = [];
    const cards = [...cells()];
    for (const [index, cell] of cards.entries()) {
      if (shouldStop?.()) break;
      const id = cell.getAttribute('data-id') || '';
      const title = (cell.querySelector(PL_TITLE_SEL)?.textContent || '').replace(/\s+/g, ' ').trim();
      if (!id || !title || seen.has(id)) continue;
      seen.add(id);
      const counters = plcCellCounters(cell);
      const tracks = counters[0]?.value;
      const count = tracks && !tracks.approximate ? tracks.count : null;
      const item = { id, title, url: `${location.origin}/music/playlist/${id}`, count };
      if (onPlaysProgress) {
        onPlaysProgress(index + 1, cards.length);
        const credits = cell.querySelectorAll(
          '[data-testid*="playlistitem_artist" i], [data-testid*="playlistitem_performer" i], a[href^="/artist/"], a[href^="/music/artist/"]',
        );
        item.artist = [...new Set([...credits].map(el => el.textContent.trim()).filter(Boolean))].join(', ');
        item.plays = await plcReadCardPlays(cell, counters[1], shouldStop);
      }
      out.push(item);
    }
    return out;
  }

  // VK shows the track count first and the play count second on catalog cards.
  function plcCellCounters(cell) {
    const counters = [];
    for (const el of cell.querySelectorAll('span')) {
      if (el.children.length || el.closest(PL_TITLE_SEL) || el.closest('a')) continue;
      const value = plcParsePlayCount(el.textContent);
      if (value) counters.push({ el, value });
      if (counters.length === 2) break;
    }
    return counters;
  }

  function plcReadPlayTooltip(cell, counter) {
    const candidates = [];
    const labels = ['title', 'data-vmu-tip', 'aria-label', 'data-tooltip'];
    const elements = [cell, ...cell.querySelectorAll('[title], [data-vmu-tip], [aria-label], [data-tooltip], [aria-describedby]')];
    for (const el of elements) {
      const related = (el.getAttribute('aria-describedby') || '').split(/\s+/)
        .map(id => id && document.getElementById(id)?.textContent);
      const knownCounter = !!counter && (el === counter.el || (el !== cell && el.contains(counter.el)));
      for (const label of [...labels.map(attr => el.getAttribute(attr)), ...related]) {
        const value = plcParsePlayCount(label, true) || (knownCounter && plcParsePlayCount(label));
        if (value) candidates.push(value);
      }
    }
    for (const el of cell.querySelectorAll('[role="tooltip"], [data-testid*="playcount" i], [data-testid*="listencount" i], span')) {
      if (el.children.length || el.closest(PL_TITLE_SEL) || el.closest('a')) continue;
      const value = plcParsePlayCount(el.textContent, el.matches('span, [role="tooltip"]'));
      if (value) candidates.push(value);
    }
    return candidates.find(value => !value.approximate) || candidates[0] || null;
  }

  async function plcReadCardPlays(cell, counter, shouldStop) {
    const tip = plcReadPlayTooltip(cell, counter);
    if (tip && !tip.approximate) return tip;
    if (counter && !counter.value.approximate) return counter.value;
    // VK can mount the tooltip outside the card when it first receives a hover.
    const target = counter?.el || cell;
    if (target.isConnected && !shouldStop?.()) {
      const tooltips = () => [...document.querySelectorAll('[role="tooltip"]')]
        .filter(el => el.getClientRects().length);
      const alreadyOpen = new Set(tooltips());
      target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
      target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      try {
        for (let i = 0; i < 4 && !shouldStop?.(); i++) {
          await sleep(125);
          const hovered = plcReadPlayTooltip(cell, counter);
          if (hovered && !hovered.approximate) return hovered;
          for (const el of tooltips()) {
            if (alreadyOpen.has(el)) continue;
            const value = plcParsePlayCount(el.textContent, true);
            if (value && !value.approximate) return value;
          }
        }
      } finally {
        target.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
        target.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }));
      }
    }
    return tip || counter?.value || null;
  }

  // ─── Playlist collector: data layer ──────────────────────────────────────────
  // Everything from here to PLC-PURE-END is pure (no DOM, no chrome.*) so it can
  // be exercised on its own. Duplicate/blocked detection is NOT re-invented:
  // plcAnalyze feeds every collected track through the same
  // findDuplicatesAndBlocked the per-playlist finder and the "Массовые
  // операции" cleanup already use — one artist+title(+duration) rule across
  // the extension — just over all playlists at once, so a duplicate group can
  // span several playlists.
  // PLC-PURE-BEGIN
  const PLC_COLLATOR = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  const PLC_NUMBER_FORMAT = new Intl.NumberFormat('ru-RU');
  const PLC_PLAY_NUMBER = '(\\d{1,3}(?: \\d{3})+|\\d+)(?:[.,](\\d+))? *(тыс\\.?|млн\\.?|млрд\\.?|[kкmb])?';
  const PLC_PLAY_LABEL = 'прослушивани[а-яё]*';
  const PLC_PLAY_ONLY = new RegExp(`^${PLC_PLAY_NUMBER}$`, 'i');
  const PLC_PLAY_BEFORE_LABEL = new RegExp(`${PLC_PLAY_NUMBER} *${PLC_PLAY_LABEL}`, 'i');
  const PLC_PLAY_AFTER_LABEL = new RegExp(`${PLC_PLAY_LABEL} *[:—-]? *${PLC_PLAY_NUMBER}`, 'i');

  const PLC_DEFAULT_VIEW = {
    query: '', yearFrom: null, yearTo: null, minTracks: null, maxTracks: null,
    trackFilter: 'all',   // all | issues | blocked | dupes | dupes-other
    sort: 'page',         // page | name-asc | name-desc | artist-asc | year-asc | year-desc | count-desc | count-asc
    group: 'none',        // none | year | letter
    showTracks: true, showLinks: true, marks: true, dupeWhere: true, numbering: true,
  };

  function plcParsePlayCount(text, labeled = false) {
    const value = String(text ?? '').trim().replace(/\s+/g, ' ');
    const match = labeled
      ? value.match(PLC_PLAY_BEFORE_LABEL) || value.match(PLC_PLAY_AFTER_LABEL)
      : value.match(PLC_PLAY_ONLY);
    if (!match) return null;
    const [, integer, fraction, rawUnit] = match;
    const unit = rawUnit?.toLowerCase().replace(/\.$/, '');
    const scale = { тыс: 1000, k: 1000, к: 1000, млн: 1000000, m: 1000000, млрд: 1000000000, b: 1000000000 }[unit];
    if (fraction && !scale) return null;
    const amount = Math.round(Number(integer.replace(/ /g, '') + (fraction ? '.' + fraction : '')) * (scale || 1));
    return Number.isSafeInteger(amount) ? { count: amount, approximate: !!scale } : null;
  }

  function plcPlural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // The community titles playlists "Название (2021) Артист1, Артист2". The year
  // is read from a bracketed 4-digit year first (so "Патрули (5 лет вони)
  // (2020) Овсянкин" still finds 2020), then from a bare year that isn't at
  // the very start of the title. Everything before it is the album name,
  // everything after it the artist list.
  function plcParseTitle(rawTitle) {
    const t = String(rawTitle || '').replace(/\s+/g, ' ').trim();
    const inRange = y => y >= 1950 && y <= new Date().getFullYear() + 1;
    let hit = null, m;
    const bracketRe = /[(\[]\s*((?:19|20)\d{2})\s*[)\]]/g;
    while ((m = bracketRe.exec(t))) {
      if (inRange(+m[1])) { hit = { year: +m[1], start: m.index, end: m.index + m[0].length }; break; }
    }
    if (!hit) {
      const looseRe = /(^|[^\d])((?:19|20)\d{2})(?!\d)/g;
      while ((m = looseRe.exec(t))) {
        const start = m.index + m[1].length;
        if (start > 0 && inRange(+m[2])) { hit = { year: +m[2], start, end: start + 4 }; break; }
      }
    }
    if (!hit) return { year: null, name: t, artist: '' };
    return {
      year: hit.year,
      name: t.slice(0, hit.start).trim() || t,
      artist: t.slice(hit.end).trim().replace(/^[-–—:,;\s]+/, ''),
    };
  }

  function plcMakePlaylist(raw, index) {
    const p = plcParseTitle(raw.title);
    const artist = raw.artist || p.artist || raw.title?.match(/^(.+?)\s+[-—–]\s+\S/)?.[1] || '';
    return {
      id: raw.id || '', title: raw.title, url: raw.url, index,
      year: p.year, name: p.name || raw.title, artist,
      declared: Number.isFinite(raw.count) ? raw.count : null,
      plays: raw.plays || null,
      tracks: null, scanSource: null, scanError: null, tried: null,
    };
  }

  // API-route tracks only carry raw signals (hasUrl / restricted); whether a
  // missing url means "blocked" can only be judged once we know this account's
  // audio.get returns urls at all — if not a single track in the whole scan
  // had one, an empty url says nothing and only the explicit restricted flag
  // counts (otherwise every track would be reported blocked). DOM-route
  // tracks already carry isBlocked straight from VK's own row data.
  function plcFinalizeBlocked(playlists) {
    let urlSeen = false;
    for (const pl of playlists) for (const t of pl.tracks || []) if (t.viaApi && t.hasUrl) urlSeen = true;
    for (const pl of playlists) for (const t of pl.tracks || []) {
      if (t.viaApi) t.isBlocked = !!t.restricted || (urlSeen && !t.hasUrl);
    }
  }

  // Annotates every scanned track in place: blocked, dupeHere (same
  // artist+title+duration elsewhere in ITS OWN playlist) and dupeElsewhere
  // (the other playlists it also appears in, in page order).
  function plcAnalyze(playlists) {
    const flat = [];
    for (const pl of playlists) {
      if (!pl.tracks) continue;
      for (const t of pl.tracks) {
        t.blocked = !!t.isBlocked;
        t.dupeHere = false;
        t.dupeElsewhere = [];
        flat.push({
          artist: String(t.artist || ''), title: String(t.title || ''),
          duration: t.duration || 0, isBlocked: !!t.isBlocked, pl, t,
        });
      }
    }
    const { dupeGroups } = findDuplicatesAndBlocked(flat);
    for (const g of dupeGroups) {
      const members = g.indices.map(i => flat[i]);
      for (const m of members) {
        for (const o of members) {
          if (o === m) continue;
          if (o.pl === m.pl) m.t.dupeHere = true;
          else if (!m.t.dupeElsewhere.includes(o.pl)) m.t.dupeElsewhere.push(o.pl);
        }
      }
    }
    for (const it of flat) it.t.dupeElsewhere.sort((a, b) => a.index - b.index);
  }

  // A scan is "incomplete" when the card said the playlist has more tracks than
  // came back — the classic case being a list that was never expanded.
  function plcIsIncomplete(pl) {
    return !!pl.tracks && pl.declared != null && pl.tracks.length < pl.declared;
  }

  // Still worth (re)scanning: never scanned, or incomplete and not yet tried
  // through BOTH routes (once both have had their go, another pass would only
  // return the same thing).
  function plcNeedsWork(pl) {
    if (!pl.tracks) return true;
    return plcIsIncomplete(pl) && !(pl.tried && pl.tried.api && pl.tried.window);
  }

  function plcStats(playlists) {
    const s = { total: playlists.length, scanned: 0, failed: 0, incomplete: 0, tracks: 0, blocked: 0, dupeTracks: 0, dupeElsewhere: 0 };
    for (const pl of playlists) {
      if (!pl.tracks) { if (pl.scanError) s.failed++; continue; }
      s.scanned++;
      if (plcIsIncomplete(pl)) s.incomplete++;
      for (const t of pl.tracks) {
        s.tracks++;
        if (t.blocked) s.blocked++;
        if (t.dupeHere || (t.dupeElsewhere && t.dupeElsewhere.length)) s.dupeTracks++;
        if (t.dupeElsewhere && t.dupeElsewhere.length) s.dupeElsewhere++;
      }
    }
    return s;
  }

  // Sort key: ignores leading punctuation/brackets/quotes, case and ё/е.
  function plcSortKey(s) {
    return String(s || '').replace(/^[^\p{L}\p{N}]+/u, '').toLowerCase().replace(/ё/g, 'е');
  }

  function plcLeadArtist(credit) {
    return String(credit || '').split(/[,;]|\s+[&+×xх]\s+|\s+\(?\s*(?:feat\.?|ft\.?|featuring|при участии)\s+/i)[0].trim();
  }

  function plcFirstArtistKey(pl) {
    return plcSortKey(plcLeadArtist(pl.artist));
  }

  function plcLetterKey(name) {
    const ch = plcSortKey(name).charAt(0);
    if (!ch) return '#';
    if (/\d/.test(ch)) return '0–9';
    if (/\p{L}/u.test(ch)) return ch.toUpperCase();
    return '#';
  }

  function plcTrackVisible(t, filter) {
    const other = !!(t.dupeElsewhere && t.dupeElsewhere.length);
    const anyDupe = !!t.dupeHere || other;
    switch (filter) {
      case 'blocked': return !!t.blocked;
      case 'dupes': return anyDupe;
      case 'dupes-other': return other;
      case 'issues': return !!t.blocked || anyDupe;
      default: return true;
    }
  }

  // Applies the view's filters + sort (+ grouping) to the playlists.
  // Returns { items: [{pl, tracks}], groups: null | [{key, label, items}] };
  // `tracks` is the (track-filtered) subset to show, or null if unscanned.
  function plcSelect(playlists, view) {
    const q = String(view.query || '').trim().toLowerCase();
    const trackFiltering = view.trackFilter !== 'all';
    const items = [];
    for (const pl of playlists) {
      if (view.yearFrom != null || view.yearTo != null) {
        if (pl.year == null) continue;
        if (view.yearFrom != null && pl.year < view.yearFrom) continue;
        if (view.yearTo != null && pl.year > view.yearTo) continue;
      }
      const n = pl.tracks ? pl.tracks.length : null;
      if (view.minTracks != null && (n == null || n < view.minTracks)) continue;
      if (view.maxTracks != null && (n == null || n > view.maxTracks)) continue;

      let tracks = pl.tracks ? pl.tracks.filter(t => plcTrackVisible(t, view.trackFilter)) : null;
      if (q && !pl.title.toLowerCase().includes(q)) {
        // The playlist's own title didn't match — it only stays if one of its
        // tracks does, and then only those tracks are shown.
        if (!tracks) continue;
        tracks = tracks.filter(t => `${t.artist || ''} ${t.title || ''}`.toLowerCase().includes(q));
        if (!tracks.length) continue;
      }
      if (trackFiltering && (!tracks || !tracks.length)) continue;
      items.push({ pl, tracks });
    }

    const cmpName = (a, b) => PLC_COLLATOR.compare(plcSortKey(a.pl.name), plcSortKey(b.pl.name));
    const cmpYear = dir => (a, b) => {
      const ya = a.pl.year, yb = b.pl.year;
      if (ya == null && yb == null) return 0;
      if (ya == null) return 1;
      if (yb == null) return -1;
      return dir * (ya - yb);
    };
    const count = it => (it.pl.tracks ? it.pl.tracks.length : -1);
    let cmp = null;
    switch (view.sort) {
      case 'name-asc': cmp = cmpName; break;
      case 'name-desc': cmp = (a, b) => cmpName(b, a); break;
      case 'artist-asc': cmp = (a, b) => {
        const ka = plcFirstArtistKey(a.pl), kb = plcFirstArtistKey(b.pl);
        if (!ka !== !kb) return ka ? -1 : 1;
        return PLC_COLLATOR.compare(ka, kb) || cmpName(a, b);
      }; break;
      case 'year-asc': cmp = (a, b) => cmpYear(1)(a, b) || cmpName(a, b); break;
      case 'year-desc': cmp = (a, b) => cmpYear(-1)(a, b) || cmpName(a, b); break;
      case 'count-desc': cmp = (a, b) => (count(b) - count(a)) || cmpName(a, b); break;
      case 'count-asc': cmp = (a, b) => (count(a) - count(b)) || cmpName(a, b); break;
    }
    // Ties (and the whole 'page' order) fall back to the order on the page.
    if (cmp) items.sort((a, b) => cmp(a, b) || (a.pl.index - b.pl.index));
    else items.sort((a, b) => a.pl.index - b.pl.index);

    // Whether ANY playlist has scan data at all — plcBuildText only flags a
    // single unscanned playlist once there's scan data to contrast it with
    // (before a scan, the output only includes the playlist-level details).
    const anyScanned = playlists.some(p => !!p.tracks);
    if (view.group !== 'year' && view.group !== 'letter') return { items, groups: null, anyScanned };
    const buckets = new Map();
    for (const it of items) {
      const key = view.group === 'year' ? (it.pl.year == null ? '' : String(it.pl.year)) : plcLetterKey(it.pl.name);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(it);
    }
    const keys = [...buckets.keys()];
    if (view.group === 'year') {
      const desc = view.sort === 'year-desc';
      keys.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : desc ? b - a : a - b));
    } else {
      keys.sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a === '0–9' ? -1 : b === '0–9' ? 1 : PLC_COLLATOR.compare(a, b)));
    }
    const groups = keys.map(key => ({ key, label: key === '' ? 'Без года' : key, items: buckets.get(key) }));
    return { items, groups, anyScanned };
  }

  function plcOtherPlaylistsLabel(others) {
    const shown = others.slice(0, 3).map(p => (p.title.length > 45 ? p.title.slice(0, 42) + '…' : p.title));
    const rest = others.length - shown.length;
    return shown.join('; ') + (rest > 0 ? ` и ещё ${rest}` : '');
  }

  function plcTrackLine(t, n, view) {
    const artist = String(t.artist || '').trim(), title = String(t.title || '').trim();
    let line = `  ${view.numbering ? n + '. ' : '- '}${artist ? artist + ' — ' : ''}${title || '(без названия)'}`;
    if (view.marks) {
      const bits = [];
      if (t.blocked) bits.push('недоступен');
      const where = [];
      if (t.dupeHere) where.push('в этом плейлисте');
      const others = t.dupeElsewhere || [];
      if (others.length) {
        where.push(view.dupeWhere
          ? 'в: ' + plcOtherPlaylistsLabel(others)
          : `ещё в ${others.length} ${plcPlural(others.length, 'плейлисте', 'плейлистах', 'плейлистах')}`);
      }
      if (where.length) bits.push('дубль ' + where.join(', '));
      if (bits.length) line += ` [${bits.join('; ')}]`;
    }
    return line;
  }

  function plcPlayLabel(plays) {
    if (!plays) return 'нет данных о прослушиваниях';
    const { count, approximate } = plays;
    return `${approximate ? '≈ ' : ''}${PLC_NUMBER_FORMAT.format(count)} ${plcPlural(count, 'прослушивание', 'прослушивания', 'прослушиваний')}`;
  }

  function plcPlaySummary(items) {
    const authors = new Map();
    const unresolved = [];
    const total = { count: 0, approximate: false, known: 0, unknown: 0 };
    const artistKey = name => name.normalize('NFC').toLowerCase();
    const add = (stats, plays) => {
      if (plays) {
        stats.count += plays.count;
        stats.approximate ||= plays.approximate;
        stats.known++;
      } else {
        stats.unknown++;
      }
    };
    for (const { pl } of items) {
      add(total, pl.plays);
      let artist = plcLeadArtist(pl.artist);
      if (!artist && pl.tracks?.length && !plcIsIncomplete(pl)) {
        const first = plcLeadArtist(pl.tracks[0].artist);
        const key = artistKey(first);
        if (key && pl.tracks.every(track => artistKey(plcLeadArtist(track.artist)) === key)) {
          artist = first;
        }
      }
      if (!artist) {
        unresolved.push(pl);
        continue;
      }
      const key = artistKey(artist);
      if (!authors.has(key)) authors.set(key, { name: artist, count: 0, approximate: false, known: 0, unknown: 0 });
      add(authors.get(key), pl.plays);
    }
    const describe = stats => {
      if (!stats.known) return 'нет данных о прослушиваниях';
      const missing = stats.unknown ? ` (без данных: ${PLC_NUMBER_FORMAT.format(stats.unknown)})` : '';
      return plcPlayLabel(stats) + missing;
    };
    const ranked = [...authors.values()].sort((a, b) =>
      (b.known > 0) - (a.known > 0) || b.count - a.count || PLC_COLLATOR.compare(a.name, b.name));
    return [
      '=== Прослушивания по основным артистам ===',
      ...ranked.map(stats => `${stats.name} — ${describe(stats)}`),
      ...(unresolved.length ? [
        '',
        `Не удалось определить автора (${PLC_NUMBER_FORMAT.format(unresolved.length)})`,
        ...unresolved.map(pl => `  ${pl.title} — ${plcPlayLabel(pl.plays)}`),
      ] : []),
      '',
      `Всего по списку — ${describe(total)}`,
    ];
  }

  // Builds the preview and the shared text for copy and download.
  function plcBuildText(selection, view) {
    const lines = [];
    let trackCount = 0;
    const withTracks = !!view.showTracks;
    const blockGap = () => { if (lines.length && lines[lines.length - 1] !== '') lines.push(''); };
    const renderItem = ({ pl, tracks }) => {
      const body = [];
      if (withTracks) {
        if (tracks) {
          tracks.forEach((t, i) => body.push(plcTrackLine(t, i + 1, view)));
          trackCount += tracks.length;
          if (!tracks.length && pl.tracks && !pl.tracks.length) body.push('  (пусто)');
          if (plcIsIncomplete(pl)) body.push(`  (собрано ${pl.tracks.length} из ${pl.declared} — плейлист прочитан не полностью)`);
        } else if (selection.anyScanned) {
          body.push(pl.scanError ? `  (треки не собраны: ${pl.scanError})` : '  (треки не собраны)');
        }
      }
      if (body.length) blockGap();
      lines.push(`${pl.title} — ${plcPlayLabel(pl.plays)}${view.showLinks ? ` - ${pl.url}` : ''}`);
      if (body.length) lines.push(...body, '');
    };
    if (selection.groups) {
      for (const g of selection.groups) {
        blockGap();
        lines.push(`=== ${g.label} ===`);
        for (const it of g.items) renderItem(it);
      }
    } else {
      for (const it of selection.items) renderItem(it);
    }
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    if (selection.items.length) lines.push('', ...plcPlaySummary(selection.items));
    return { text: lines.join('\n'), playlistCount: selection.items.length, trackCount };
  }
  // PLC-PURE-END

  // One playlist's tracks. Tries VK's audio.get through the page (fast — one
  // request per 250 tracks, no extra windows), then falls back to the same
  // hidden-window DOM scan the auto-playlist flow already trusts
  // (fetchPlaylistTracksViaHiddenTab → scanPlaylistTracksOnPage), for when the
  // API route errors — VK's API has proven flaky before (see that function's
  // comment), which is why the browser-driven route stays available as its
  // own mode. `method`: 'auto' (API, window as fallback), 'api' (API only) or
  // 'window' (windows only).
  async function plcFetchPlaylistTracks(pl, method) {
    const [ownerId, playlistId] = String(pl.id).split('_');
    if (!ownerId || !playlistId) return { ok: false, error: 'некорректный id плейлиста' };
    let lastError = '';
    let apiTracks = null;
    const tried = { api: false, window: false };
    // A result short of what the card declares is treated like an empty API
    // answer in 'auto' mode: not believed until the other route has weighed
    // in (the larger of the two wins).
    const complete = tracks => pl.declared == null || tracks.length >= pl.declared;
    if (method !== 'window') {
      tried.api = true;
      for (let attempt = 0; attempt < 2 && !apiTracks; attempt++) {
        try {
          const res = await pageCall('VKD_COLLECT_PLAYLIST_TRACKS', 'VKD_COLLECT_PLAYLIST_TRACKS_DONE', {
            reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            ownerId, playlistId, accessHash: null,
          }, 60000, 'reqId');
          apiTracks = (res.tracks || []).map(t => ({
            id: `${t.ownerId}_${t.numId}`, artist: t.artist || '', title: t.title || '',
            duration: t.duration || 0, hasUrl: !!t.hasUrl, restricted: !!t.restricted, viaApi: true,
          }));
        } catch (err) {
          lastError = err?.message || String(err);
          // Missing token is permanent — retrying only wastes a second.
          if (attempt === 0 && lastError !== 'no_access_token') await sleep(1200);
          else break;
        }
      }
      // An empty (or short) API answer is believed only in 'api' mode: in
      // 'auto' it could just as well be a silent failure (private playlist,
      // flood control), so the window scan double-checks it.
      if (apiTracks && ((apiTracks.length && complete(apiTracks)) || method === 'api')) {
        return { ok: true, source: 'api', tracks: apiTracks, tried };
      }
    }
    if (method !== 'api') {
      tried.window = true;
      const res = await fetchPlaylistTracksViaHiddenTab(ownerId, playlistId);
      if (res.ok) {
        const winTracks = (res.tracks || []).map(t => ({
          id: t.id || null, artist: t.artist || '', title: t.title || '',
          duration: t.duration || 0, isBlocked: !!t.isBlocked,
        }));
        // Both routes answered but disagree — keep whichever read more.
        if (apiTracks && apiTracks.length > winTracks.length) return { ok: true, source: 'api', tracks: apiTracks, tried };
        return { ok: true, source: 'window', apiFailed: method !== 'window' && !apiTracks, tracks: winTracks, tried };
      }
      if (apiTracks) return { ok: true, source: 'api', tracks: apiTracks, tried };
      lastError = lastError || 'не удалось открыть плейлист';
    }
    return { ok: false, error: lastError || 'ошибка', apiFailed: method !== 'window' && !apiTracks, tried };
  }

  // Walks every playlist that has no tracks yet (cached ones are skipped).
  // Sequential on purpose: VK throttles bursts of audio.* calls, and the
  // window route opens a real browser window per playlist.
  // Bounded worker pool — up to `concurrency` playlists in flight at once,
  // each running the same sequential steps the single-threaded version did
  // (fetch, merge, pace). concurrency:1 is exactly the old sequential loop.
  // apiFailStreak is shared across workers: a plain counter, not a lock — two
  // workers can race a read/write around the same await, which only means the
  // auto-mode circuit breaker trips a call or two early/late, never wrong
  // results. onProgress gets a 4th argument (the other playlists currently in
  // flight) that callers may ignore.
  async function plcScanTracks(playlists, { method, token, concurrency, onProgress }) {
    const todo = playlists.filter(plcNeedsWork);
    const startHref = location.href;
    const stopped = () => token.cancel || location.href !== startHref;
    const n = Math.max(1, Math.min(16, Math.floor(concurrency) || 1));
    let done = 0;
    let cursor = 0;
    let apiFailStreak = 0;
    const active = new Set();

    async function worker() {
      for (;;) {
        if (stopped()) return;
        const idx = cursor++;
        if (idx >= todo.length) return;
        const pl = todo[idx];
        active.add(pl);
        onProgress(done, todo.length, pl, [...active]);
        // In 'auto' mode, a few API failures in a row (no token, VK rejecting
        // the call) mean the API route isn't going to work for this scan —
        // go straight to the window route for the rest instead of paying a
        // failed attempt on every remaining playlist. One success resets it.
        const effective = method === 'auto' && apiFailStreak >= 3 ? 'window' : method;
        const res = await plcFetchPlaylistTracks(pl, effective);
        if (effective !== 'window') apiFailStreak = res.apiFailed ? apiFailStreak + 1 : 0;
        pl.tried = { api: !!(pl.tried && pl.tried.api) || !!res.tried?.api, window: !!(pl.tried && pl.tried.window) || !!res.tried?.window };
        if (res.ok) {
          // A re-scan of an incomplete playlist must never make it worse.
          if (!pl.tracks || res.tracks.length >= pl.tracks.length) {
            pl.tracks = res.tracks;
            pl.scanSource = res.source;
          }
          pl.scanError = null;
          plcCache.set(pl.id, { tracks: pl.tracks, source: pl.scanSource, tried: pl.tried });
        } else if (!pl.tracks) {
          pl.scanError = res.error || 'ошибка';
        }
        active.delete(pl);
        done++;
        onProgress(done, todo.length, pl, [...active]);
        if (!stopped()) await sleep(method === 'window' ? 300 : 120);
      }
    }

    await Promise.all(Array.from({ length: Math.min(n, todo.length) || 1 }, worker));
    return { done, total: todo.length, stopped: stopped() };
  }

  // The collector panel: the original copy-ready "НАЗВАНИЕ - ссылка" list, now
  // with playlist listen totals and an optional track scan. Filters, sorting
  // and grouping rebuild the preview and export together.
  function showPlaylistCollectPanel(playlistsRaw) {
    syncVmuTheme();
    closePlaylistCollectPanel();

    const playlists = playlistsRaw.map((p, i) => plcMakePlaylist(p, i));
    for (const pl of playlists) {
      const cached = plcCache.get(pl.id);
      if (cached) { pl.tracks = cached.tracks; pl.scanSource = cached.source; pl.tried = cached.tried || null; }
    }
    plcFinalizeBlocked(playlists);
    plcAnalyze(playlists);
    const view = { ...PLC_DEFAULT_VIEW };
    const nf = n => n.toLocaleString('ru-RU');

    const opt = (value, label) => `<option value="${value}">${escHtml(label)}</option>`;
    const check = (id, label, checked, needsTracks) => `
      <label class="vmu-rename-check${needsTracks ? ' vmu-plc-needs-tracks' : ''}">
        <input type="checkbox" id="vmu-plc-${id}"${checked ? ' checked' : ''}><span>${escHtml(label)}</span>
      </label>`;

    const modal = document.createElement('div');
    modal.id = 'vmu-plcollect-modal';
    modal.className = 'vmu-bulkops-panel vmu-plcollect-modal';
    modal.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title" id="vmu-plc-title">Плейлисты: ${playlists.length}</span>
        <button type="button" class="vmu-check-close" id="vmu-plcollect-close" title="Закрыть">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body vmu-plcollect-body">
        <div class="vmu-plc-section vmu-plc-section-first">
          <div class="vmu-plc-row">
            <button type="button" id="vmu-plc-scan-btn" class="vmu-pick-btn"></button>
            <button type="button" id="vmu-plc-reset" class="vmu-plc-link" title="Забыть собранные треки">Сбросить</button>
          </div>
          <div class="vmu-plc-row">
            <select id="vmu-plc-method" class="vmu-covered-select" title="Как читать треки плейлистов">
              ${opt('auto', 'Авто: быстро через API, при сбое — через окно')}
              ${opt('api', 'Только API страницы (быстро)')}
              ${opt('window', 'Только скрытые окна (медленно, надёжнее)')}
            </select>
            <span class="vmu-plc-label" title="Сколько плейлистов читать одновременно. Для «через окна» — сколько скрытых окон открыто разом; много потоков может задевать лимиты VK.">Потоков</span>
            <input type="number" id="vmu-plc-concurrency" class="vmu-plc-input vmu-plc-input-sm" min="1" max="16" step="1" value="3">
          </div>
          <div class="vmu-slim-track" id="vmu-plc-bar" style="display:none"><div class="vmu-slim-fill" id="vmu-plc-bar-fill"></div></div>
          <div class="vmu-plc-status" id="vmu-plc-status"></div>
        </div>

        <div class="vmu-plc-section">
          <div class="vmu-rename-block-label">Фильтры</div>
          <div class="vmu-plc-row">
            <span class="vmu-plc-label">Поиск</span>
            <input type="text" id="vmu-plc-query" class="vmu-plc-input" placeholder="плейлист, артист или трек" spellcheck="false">
          </div>
          <div class="vmu-plc-row">
            <span class="vmu-plc-label">Год</span>
            <span class="vmu-plc-range">
              <input type="number" id="vmu-plc-yfrom" class="vmu-plc-input vmu-plc-input-sm" placeholder="от" min="1950" max="2100">
              <span>—</span>
              <input type="number" id="vmu-plc-yto" class="vmu-plc-input vmu-plc-input-sm" placeholder="до" min="1950" max="2100">
            </span>
          </div>
          <div class="vmu-plc-row vmu-plc-needs-tracks">
            <span class="vmu-plc-label">Треков в плейлисте</span>
            <span class="vmu-plc-range">
              <input type="number" id="vmu-plc-minc" class="vmu-plc-input vmu-plc-input-sm" placeholder="от" min="0">
              <span>—</span>
              <input type="number" id="vmu-plc-maxc" class="vmu-plc-input vmu-plc-input-sm" placeholder="до" min="0">
            </span>
          </div>
          <div class="vmu-plc-row vmu-plc-needs-tracks">
            <span class="vmu-plc-label">Показывать треки</span>
            <select id="vmu-plc-trackfilter" class="vmu-covered-select">
              ${opt('all', 'Все')}
              ${opt('issues', 'Только проблемные (недоступные и дубли)')}
              ${opt('blocked', 'Только недоступные')}
              ${opt('dupes', 'Только дубли (где угодно)')}
              ${opt('dupes-other', 'Только дубли в других плейлистах')}
            </select>
          </div>
        </div>

        <div class="vmu-plc-section">
          <div class="vmu-rename-block-label">Вид</div>
          <div class="vmu-plc-row">
            <span class="vmu-plc-label">Сортировка</span>
            <select id="vmu-plc-sort" class="vmu-covered-select">
              ${opt('page', 'Как на странице')}
              ${opt('name-asc', 'Название А→Я')}
              ${opt('name-desc', 'Название Я→А')}
              ${opt('artist-asc', 'Артист А→Я')}
              ${opt('year-asc', 'Год: старые сначала')}
              ${opt('year-desc', 'Год: новые сначала')}
              ${opt('count-desc', 'Треков: больше сначала')}
              ${opt('count-asc', 'Треков: меньше сначала')}
            </select>
          </div>
          <div class="vmu-plc-row">
            <span class="vmu-plc-label">Группировать</span>
            <select id="vmu-plc-group" class="vmu-covered-select">
              ${opt('none', 'Без группировки')}
              ${opt('year', 'По годам')}
              ${opt('letter', 'По первой букве')}
            </select>
          </div>
          <div class="vmu-plc-checks">
            ${check('showlinks', 'Ссылки', true, false)}
            ${check('showtracks', 'Треки внутри', true, true)}
            ${check('numbering', 'Нумерация', true, true)}
            ${check('marks', 'Пометки (недоступен / дубль)', true, true)}
            ${check('dupewhere', 'Указывать, где ещё дубль', true, true)}
          </div>
        </div>

        <textarea id="vmu-plcollect-text" class="vmu-plcollect-text" readonly spellcheck="false" wrap="off"></textarea>
        <div class="vmu-plc-actions">
          <span class="vmu-plc-count" id="vmu-plc-count"></span>
          <button type="button" id="vmu-plcollect-copy" class="vmu-pick-btn">Копировать</button>
          <button type="button" id="vmu-plc-download" class="vmu-pick-btn vmu-plc-secondary">Скачать .txt</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    makePanelDraggable(modal, modal.querySelector('.vmu-bulkops-head'));
    modal.querySelector('#vmu-plcollect-close').addEventListener('click', closePlaylistCollectPanel);

    const $ = sel => modal.querySelector(sel);
    modal.querySelectorAll('select.vmu-covered-select').forEach(s => vmuEnhanceSelect(s));
    const ta = $('#vmu-plcollect-text');
    const scanBtn = $('#vmu-plc-scan-btn');
    const statusEl = $('#vmu-plc-status');
    const bar = $('#vmu-plc-bar');
    const barFill = $('#vmu-plc-bar-fill');
    const readInt = el => { const v = parseInt(el.value, 10); return Number.isFinite(v) ? v : null; };
    let scanning = false;

    const hasScanData = () => playlists.some(p => !!p.tracks);

    function readView() {
      view.query = $('#vmu-plc-query').value;
      view.yearFrom = readInt($('#vmu-plc-yfrom'));
      view.yearTo = readInt($('#vmu-plc-yto'));
      view.minTracks = readInt($('#vmu-plc-minc'));
      view.maxTracks = readInt($('#vmu-plc-maxc'));
      view.trackFilter = $('#vmu-plc-trackfilter').value;
      view.sort = $('#vmu-plc-sort').value;
      view.group = $('#vmu-plc-group').value;
      // Without scan data the track-based controls are greyed out and must
      // not silently keep filtering on whatever they were last set to.
      if (!hasScanData()) {
        view.trackFilter = 'all';
        view.minTracks = view.maxTracks = null;
        if (view.sort.startsWith('count-')) view.sort = 'page';
      }
      view.showLinks = $('#vmu-plc-showlinks').checked;
      view.showTracks = $('#vmu-plc-showtracks').checked;
      view.numbering = $('#vmu-plc-numbering').checked;
      view.marks = $('#vmu-plc-marks').checked;
      view.dupeWhere = $('#vmu-plc-dupewhere').checked;
    }

    // Controls that only mean something once tracks exist are greyed out
    // until then (same .vmu-row-disabled the settings panels use).
    function syncAvailability() {
      const has = hasScanData();
      modal.querySelectorAll('.vmu-plc-needs-tracks').forEach(el => el.classList.toggle('vmu-row-disabled', !has));
      for (const o of $('#vmu-plc-sort').options) if (o.value.startsWith('count-')) o.disabled = !has;
      if (!has && $('#vmu-plc-sort').value.startsWith('count-')) $('#vmu-plc-sort').value = 'page';
      $('#vmu-plc-reset').style.display = has && !scanning ? '' : 'none';
    }

    function refresh() {
      readView();
      const selection = plcSelect(playlists, view);
      const { text, playlistCount, trackCount } = plcBuildText(selection, view);
      ta.value = text;
      const parts = [`Показано плейлистов: ${nf(playlistCount)} из ${nf(playlists.length)}`];
      if (hasScanData() && view.showTracks) parts.push(`треков: ${nf(trackCount)}`);
      $('#vmu-plc-count').textContent = parts.join(' · ');
      syncAvailability();
    }

    function updateScanUi() {
      const missing = playlists.filter(plcNeedsWork).length;
      const s = plcStats(playlists);
      if (scanning) {
        scanBtn.textContent = 'Остановить';
      } else if (!hasScanData()) {
        scanBtn.textContent = 'Собрать треки плейлистов';
      } else if (missing) {
        scanBtn.textContent = `Дособрать треки (${nf(missing)})`;
      } else {
        scanBtn.textContent = 'Пересобрать треки';
      }
      if (scanning) return;
      if (!hasScanData()) {
        statusEl.textContent = 'Треки не собраны — в тексте только названия и ссылки. Сбор читает каждый плейлист и находит недоступные треки и дубли между плейлистами.';
        return;
      }
      const bits = [
        `Треки: ${nf(s.tracks)} в ${nf(s.scanned)} из ${nf(s.total)} плейлистов`,
        `недоступных: ${nf(s.blocked)}`,
        `дублей: ${nf(s.dupeTracks)} (в других плейлистах: ${nf(s.dupeElsewhere)})`,
      ];
      if (s.incomplete) bits.push(`прочитано не полностью: ${nf(s.incomplete)}`);
      if (s.failed) bits.push(`не удалось: ${nf(s.failed)}`);
      statusEl.textContent = bits.join(' · ');
    }

    async function runScan() {
      if (scanning) { if (plcActiveScan) plcActiveScan.cancel = true; scanBtn.disabled = true; scanBtn.textContent = 'Останавливаем…'; return; }
      // "Пересобрать" (everything already scanned) starts from scratch.
      if (!playlists.some(plcNeedsWork)) resetScan();
      const method = $('#vmu-plc-method').value;
      const concEl = $('#vmu-plc-concurrency');
      const concurrency = Math.max(1, Math.min(16, parseInt(concEl.value, 10) || 1));
      concEl.value = concurrency; // reflect the clamp back (e.g. "0" or "99" typed in)
      const token = { cancel: false };
      plcActiveScan = token;
      scanning = true;
      $('#vmu-plc-method').disabled = true;
      concEl.disabled = true;
      bar.style.display = '';
      barFill.style.width = '0%';
      updateScanUi();
      syncAvailability();
      let note = '';
      try {
        const res = await plcScanTracks(playlists, {
          method, token, concurrency,
          onProgress: (done, total, pl, active) => {
            if (!modal.isConnected) return;
            barFill.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
            const short = t => (t.length > 40 ? t.slice(0, 37) + '…' : t);
            const names = (active && active.length ? active : [pl]).map(p => short(p.title));
            const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ` и ещё ${names.length - 3}` : '');
            statusEl.textContent = `Читаем плейлисты: ${nf(done)} / ${nf(total)} — ${shown}`;
          },
        });
        if (res.stopped) note = 'Остановлено. ';
      } catch (err) {
        console.error('[VK Multi Upload] playlist track scan failed:', err);
        note = 'Ошибка: ' + (err?.message || err) + '. ';
      } finally {
        scanning = false;
        if (plcActiveScan === token) plcActiveScan = null;
        // Whatever was collected before a stop/error is still worth analysing.
        plcFinalizeBlocked(playlists);
        plcAnalyze(playlists);
        if (modal.isConnected) {
          bar.style.display = 'none';
          scanBtn.disabled = false;
          $('#vmu-plc-method').disabled = false;
          concEl.disabled = false;
          updateScanUi();
          if (note) statusEl.textContent = note + statusEl.textContent;
          refresh();
        }
      }
    }

    function resetScan() {
      for (const pl of playlists) { pl.tracks = null; pl.scanSource = null; pl.scanError = null; pl.tried = null; }
      plcCache.clear();
      // The track-based controls go back to neutral along with the data.
      $('#vmu-plc-trackfilter').value = 'all';
      $('#vmu-plc-minc').value = '';
      $('#vmu-plc-maxc').value = '';
      if ($('#vmu-plc-sort').value.startsWith('count-')) $('#vmu-plc-sort').value = 'page';
    }

    scanBtn.addEventListener('click', runScan);
    $('#vmu-plc-reset').addEventListener('click', () => {
      resetScan();
      updateScanUi();
      refresh();
    });

    let refreshTimer = null;
    const scheduleRefresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 120); };
    modal.addEventListener('input', scheduleRefresh);
    modal.addEventListener('change', scheduleRefresh);

    const copyBtn = $('#vmu-plcollect-copy');
    copyBtn.addEventListener('click', async () => {
      const text = ta.value;
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch {}
      if (!ok) {
        ta.select();
        try { ok = document.execCommand('copy'); } catch {}
      }
      copyBtn.textContent = ok ? '✓ Скопировано' : 'Нажмите Ctrl+C';
      setTimeout(() => { if (copyBtn.isConnected) copyBtn.textContent = 'Копировать'; }, 1500);
    });
    $('#vmu-plc-download').addEventListener('click', () => {
      const blob = new Blob([ta.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const owner = (playlists[0]?.id || '').split('_')[0];
      a.href = url; a.download = `playlists${owner ? '_' + owner : ''}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    });

    updateScanUi();
    refresh();
    ta.focus();
    ta.select();
    // select() scrolls the box to the end of the selection — start at the top.
    ta.scrollTop = 0;
    ta.scrollLeft = 0;
  }

  async function runPlaylistCollect() {
    if (plCollectRunning) return;
    plCollectRunning = true;
    const startHref = location.href;
    const startY = window.scrollY;
    const btn = document.getElementById('vmu-plcollect-btn');
    if (btn) btn.disabled = true;
    closePlaylistCollectPanel();
    const navigatedAway = () => location.href !== startHref;
    showProgressToast('Собираем плейлисты…', { id: PL_COLLECT_TOAST_ID });
    try {
      const playlists = await collectCatalogPlaylists(
        n => showProgressToast(`Собираем плейлисты… найдено ${n}`, { id: PL_COLLECT_TOAST_ID }),
        navigatedAway,
        (done, total) => {
          if (done === 1 || done === total || done % 10 === 0) {
            showProgressToast(`Собираем прослушивания… ${done} из ${total}`, { id: PL_COLLECT_TOAST_ID });
          }
        }
      );
      if (navigatedAway()) {
        document.getElementById(PL_COLLECT_TOAST_ID)?.remove();
      } else if (!playlists.length) {
        showProgressToast('Плейлисты на странице не найдены', { id: PL_COLLECT_TOAST_ID, kind: 'error' });
      } else {
        showProgressToast(`Готово — плейлистов: ${playlists.length}`, { id: PL_COLLECT_TOAST_ID, kind: 'done' });
        showPlaylistCollectPanel(playlists);
      }
    } catch (err) {
      showProgressToast('Ошибка: ' + (err?.message || err), { id: PL_COLLECT_TOAST_ID, kind: 'error' });
    } finally {
      plCollectRunning = false;
      if (btn?.isConnected) btn.disabled = false;
      if (!navigatedAway()) window.scrollTo(0, startY);
    }
  }

  // ─── ПУЭРРИТО: обновление плейлистов каталога ──────────────────────────────────
  function insertPuerritoTag(description) {
    if (/\[vk\.com\/puerrito\]/i.test(description)) return description;
    const marker = /\[\[vk\.com\/reuploadunder\]\(https?:\/\/vk\.com\/reuploadunder\)\]|\[vk\.com\/reuploadunder\](?:\(https?:\/\/vk\.com\/reuploadunder\))?/i;
    return description.replace(marker, '$& [vk.com/puerrito]');
  }

  const PUERRITO_CHECK_SIZE = 384;
  let puerritoCoverSamples;

  function puerritoRed(data, i) {
    return data[i] > 135 && data[i] - Math.max(data[i + 1], data[i + 2]) > 65;
  }

  function puerritoWhite(data, i) {
    return Math.min(data[i], data[i + 1], data[i + 2]) > 155;
  }

  function getPuerritoCoverSamples() {
    if (puerritoCoverSamples) return puerritoCoverSamples;
    const preset = VMU_PUERRITO_COVER_PRESET;
    const layer = vmuBuildTextLayerPipeline({
      ...preset,
      textColor: vmuHexToRgb(preset.textColor),
      outlineColor: vmuHexToRgb(preset.outlineColor),
    }, preset.scale, preset.rotation);
    const size = PUERRITO_CHECK_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const [x, y] = vmuComputePosition([1000, 1000], [layer.width, layer.height], preset.position, [preset.x, preset.y]);
    const scale = size / 1000;
    ctx.drawImage(layer, x * scale, y * scale, layer.width * scale, layer.height * scale);
    const { data } = ctx.getImageData(0, 0, size, size);
    const red = [], white = [], edge = [];
    const solidRed = i => data[i * 4 + 3] > 235 && puerritoRed(data, i * 4);
    for (let y = 6; y < size - 6; y += 2) {
      for (let x = 6; x < size - 6; x += 2) {
        const i = y * size + x;
        if ([i, i - 1, i + 1, i - size, i + size].every(solidRed)) {
          red.push(i);
        } else if (data[i * 4 + 3] > 160 && puerritoWhite(data, i * 4)) {
          white.push(i);
        } else if (data[i * 4 + 3] < 10 &&
            [i - 4, i + 4, i - 4 * size, i + 4 * size].some(solidRed)) {
          edge.push(i);
        }
      }
    }
    puerritoCoverSamples = { red, white, edge };
    return puerritoCoverSamples;
  }

  function matchesPuerritoCover(image) {
    const size = PUERRITO_CHECK_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const { red, white, edge } = getPuerritoCoverSamples();
    const proportion = (points, offset, check) =>
      points.reduce((sum, i) => sum + Number(check(data, (i + offset) * 4)), 0) / (points.length || 1);
    for (const dy of [0, -2, 2]) {
      for (const dx of [0, -2, 2]) {
        const offset = dy * size + dx;
        const fill = proportion(red, offset, puerritoRed);
        if (fill < 0.80) continue;
        if (fill - proportion(edge, offset, puerritoRed) > 0.32) return true;
        const outline = proportion(white, offset, puerritoWhite);
        if (outline > 0.30 && outline - proportion(edge, offset, puerritoWhite) > 0.20) return true;
      }
    }
    return false;
  }

  async function readPuerritoCoverImage(url) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) return await createImageBitmap(await response.blob());
    } catch {}
    if (!/^https:\/\/[^/]*\b(?:userapi\.com|vkuserphoto\.ru)\//i.test(url)) return null;
    const image = await geniusMsg('VMU_PUERRITO_READ_COVER', { url });
    if (!image?.ok) return null;
    try {
      const response = await fetch(image.dataUrl);
      return await createImageBitmap(await response.blob());
    } catch {
      return null;
    }
  }

  async function checkPuerritoCover(box, stopped) {
    for (let attempt = 0; attempt < 6 && !stopped(); attempt++) {
      const cover = box.querySelector('.ape_cover, ._ape_cover');
      if (cover) {
        const urls = new Set();
        for (const img of cover.querySelectorAll('img')) {
          if (img.currentSrc) urls.add(img.currentSrc);
          if (img.getAttribute('src')) urls.add(img.src);
        }
        for (const el of [cover, ...cover.querySelectorAll('[style*="background"], [class*="ape_cover"]')]) {
          const background = getComputedStyle(el).backgroundImage;
          for (const [, quoted, singleQuoted, bare] of background.matchAll(/url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g)) {
            const url = quoted || singleQuoted || bare?.trim();
            if (url) urls.add(url);
          }
        }
        let checked = false;
        for (const url of urls) {
          if (stopped()) return null;
          const image = await readPuerritoCoverImage(url);
          if (!image) continue;
          try {
            if (Math.min(image.width, image.height) >= 80) {
              if (matchesPuerritoCover(image)) return true;
              checked = true;
            }
          } finally {
            image.close();
          }
        }
        if (checked) return false;
        if (urls.size) return null;
        if (cover.querySelector('input[type="file"]')) return false;
      }
      await sleep(200);
    }
    return null;
  }

  async function findPuerritoCover(title, stopped) {
    const result = await searchGeniusCoverAlbums(title, matchGeniusCoverAlbums, stopped);
    if (!result.ok) return { error: result.error };
    const [album] = result.albums;
    for (const url of new Set([album.coverFull, album.cover])) {
      if (stopped()) break;
      if (!url) continue;
      const image = await geniusMsg('VKD_FETCH_IMAGE', { url });
      if (!image?.ok) continue;
      const blob = await makePerezalitoCover(image.dataUrl, VMU_PUERRITO_COVER_PRESET);
      if (blob) return { blob };
    }
    return { error: 'Не удалось загрузить обложку с Genius' };
  }

  async function updatePuerritoPlaylist(playlist, stopped) {
    const [ownerId, playlistId] = playlist.id.split('_');
    if (getEditPlaylistBox()) throw new Error('Закрой открытый диалог редактирования');
    lastEditPlaylistIds = null;
    const opened = await pageCall('VKD_OPEN_PLAYLIST_EDITOR', 'VKD_PLAYLIST_EDITOR_OPENED', {
      ownerId, playlistId, reqId: crypto.randomUUID(),
    }, 12000, 'reqId');
    if (opened?.unavailable === 'card') return { cardUnavailable: true, error: 'карточка плейлиста не подгрузилась' };
    if (opened?.unavailable === 'pencil') return { error: 'на карточке не найдена кнопка редактирования' };
    if (opened?.unavailable === 'viewer') return { viewerOpened: true, error: 'VK открыл просмотр вместо редактора' };
    const box = getEditPlaylistBox();
    if (!box) throw new Error('Диалог редактирования закрылся');
    const ids = lastEditPlaylistIds;
    if (ids && (String(ids.ownerId) !== ownerId || String(ids.playlistId) !== playlistId)) {
      throw new Error('Открылся диалог другого плейлиста');
    }

    try {
      if (stopped()) return null;
      const branded = await checkPuerritoCover(box, stopped);
      if (stopped()) return null;
      if (branded === true) return { alreadyBranded: true };
      if (branded === null) return { coverError: 'не удалось проверить текущую обложку' };
      if (getEditPlaylistBox() !== box) throw new Error('Диалог закрылся во время проверки обложки');
      const { blob: cover, error: coverError } = await findPuerritoCover(playlist.title, stopped);
      if (stopped()) return null;
      if (getEditPlaylistBox() !== box) throw new Error('Диалог закрылся во время поиска обложки');
      const field = box.querySelector('#ape_pl_description, textarea.ape_pl_input');
      let descriptionChanged = false;
      let descriptionError = '';
      if (field) {
        const description = insertPuerritoTag(field.value);
        const limit = field.maxLength >= 0 ? field.maxLength : 1000;
        descriptionChanged = description !== field.value && description.length <= limit;
        if (description.length > limit && description !== field.value) {
          descriptionError = 'тег не помещается в описание';
        } else if (!/\[vk\.com\/puerrito\]/i.test(description)) {
          descriptionError = 'в описании отсутствует [vk.com/reuploadunder]';
        }
        if (descriptionChanged) {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
          setter.call(field, description);
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        descriptionError = 'поле описания недоступно';
      }

      if (cover) await uploadCoverViaDialog(cover);
      if (cover || descriptionChanged) {
        await saveEditPlaylistDialog(box, { coverChanged: !!cover, strictBox: true });
      }
      return { coverChanged: !!cover, coverError, descriptionChanged, descriptionError };
    } finally {
      if (isEditPlaylistBoxOpen(box)) {
        box.querySelector('.box_x_button, ._box_x_button, .popup_box_close')?.click();
      }
    }
  }

  const puerritoPage = () => location.pathname.replace(/\/$/, '');

  async function loadPuerritoCatalogCards(playlists, stopped) {
    const mountedIds = () => new Set(
      [...document.querySelectorAll(PL_CELL_SEL)].map(cell => cell.getAttribute('data-id')),
    );
    let mounted = mountedIds();
    const ready = () => playlists.every(playlist => mounted.has(playlist.id));
    if (ready() || stopped()) return;
    await waitForElement(PL_CELL_SEL, 8000);
    await scrollUntilCountStable(() => {
      mounted = mountedIds();
      return mounted.size;
    }, { sleepMs: 600, stableLimit: 5, maxIter: 100, shouldStop: () => ready() || stopped() });
  }

  async function processPuerritoQueue(playlists, { cancelled, onProgress, onResult, loadCards = false }) {
    let processed = 0;
    const route = puerritoPage();
    const stopped = () => cancelled() || puerritoPage() !== route;
    if (loadCards) await loadPuerritoCatalogCards(playlists, stopped);
    for (const playlist of playlists) {
      if (stopped()) break;
      onProgress(playlist.title);
      try {
        const result = await updatePuerritoPlaylist(playlist, stopped);
        if (!result) break;
        onResult(playlist.title, result, playlist.id);
        if (result.viewerOpened) return { processed: processed + 1, error: result.error };
      } catch (err) {
        onResult(playlist.title, { error: err.message }, playlist.id);
        if (getEditPlaylistBox()) {
          return { processed: processed + 1, error: 'Остался открыт диалог редактирования' };
        }
      }
      processed++;
    }
    return { processed, stopped: stopped() };
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onConnect) {
    chrome.runtime.onConnect.addListener(port => {
      if (port.name !== 'vmu-puerrito-worker') return;
      let started = false;
      let cancelled = false;
      let connected = true;
      const send = data => {
        if (connected) {
          try { port.postMessage(data); } catch { connected = false; }
        }
      };
      port.onDisconnect.addListener(() => { connected = false; });
      port.onMessage.addListener(message => {
        if (message.type === 'stop') cancelled = true;
        if (message.type !== 'start' || started) return;
        started = true;
        void processPuerritoQueue(message.playlists, {
          cancelled: () => cancelled || !connected,
          loadCards: true,
          onProgress: title => send({ type: 'progress', title }),
          onResult: (title, result, id) => send({ type: 'result', title, result, id }),
        }).then(result => send({ type: 'done', ...result }),
          err => send({ type: 'done', error: err.message }));
      });
    });
  }

  function processPuerritoBackgroundQueue(playlists, signal, onProgress, onResult) {
    return new Promise(resolve => {
      let port;
      let heartbeat;
      let startedCount = 0;
      let completedCount = 0;
      let finished = false;
      const finish = result => {
        if (finished) return;
        finished = true;
        signal.removeEventListener('abort', stop);
        clearInterval(heartbeat);
        try { port?.disconnect(); } catch {}
        resolve({ ...result, startedCount, completedCount });
      };
      const send = message => {
        try { port.postMessage(message); }
        catch (err) { finish({ error: err.message }); }
      };
      const stop = () => send({ type: 'stop' });
      if (signal.aborted) { finish({ stopped: true }); return; }
      try {
        port = chrome.runtime.connect({ name: 'vmu-puerrito-queue' });
        port.onDisconnect.addListener(() => finish({
          error: chrome.runtime.lastError?.message || 'Связь с фоновой вкладкой потеряна',
        }));
        port.onMessage.addListener(message => {
          if (message.type === 'progress') {
            startedCount++;
            onProgress(message.title);
          } else if (message.type === 'result') {
            completedCount++;
            onResult(message.title, message.result, message.id);
          } else if (message.type === 'done') {
            finish(message);
          }
        });
        signal.addEventListener('abort', stop, { once: true });
        // A live port alone does not keep the extension service worker awake.
        heartbeat = setInterval(() => send({ type: 'ping' }), 15000);
        send({ type: 'start', playlists });
      } catch (err) {
        finish({ error: err.message });
      }
    });
  }

  function openPuerritoCatalogPanel() {
    const existing = document.getElementById('vmu-puerrito-panel');
    if (existing?.dataset.running) return;
    if (getEditPlaylistBox()) {
      showToast('Сначала закрой открытый диалог редактирования', true);
      return;
    }
    existing?.remove();
    syncVmuTheme();
    const panel = document.createElement('div');
    panel.id = 'vmu-puerrito-panel';
    panel.className = 'vmu-bulkops-panel vmu-plcollect-modal';
    panel.innerHTML = `
      <div class="vmu-bulkops-head">
        <span class="vmu-bulkops-title">ПУЭРРИТО · плейлисты</span>
        <button type="button" class="vmu-check-close" title="Закрыть">${ICON_CLOSE}</button>
      </div>
      <div class="vmu-bulkops-body vmu-plcollect-body">
        <div class="vmu-plc-status" id="vmu-puerrito-status" role="status"></div>
        <textarea class="vmu-plcollect-text" aria-label="Результаты обновления" rows="6" readonly></textarea>
        <div class="vmu-plc-actions">
          <label class="vmu-plc-label">Потоков
            <select class="vmu-covered-select" id="vmu-puerrito-threads">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
          <button type="button" class="vmu-pick-btn" id="vmu-puerrito-start">Обновить плейлисты</button>
          <button type="button" class="vmu-pick-btn" id="vmu-puerrito-stop" hidden>Остановить</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    makePanelDraggable(panel, panel.querySelector('.vmu-bulkops-head'));
    const status = panel.querySelector('#vmu-puerrito-status');
    const report = panel.querySelector('textarea');
    const stop = panel.querySelector('#vmu-puerrito-stop');
    const start = panel.querySelector('#vmu-puerrito-start');
    const threads = panel.querySelector('#vmu-puerrito-threads');
    const close = panel.querySelector('.vmu-check-close');
    const initialPage = puerritoPage();
    const controller = new AbortController();
    const stopRun = () => {
      controller.abort();
      stop.disabled = true;
      status.textContent = 'Останавливаем обработку…';
    };
    stop.addEventListener('click', stopRun);
    close.addEventListener('click', () => {
      if (panel.dataset.running) stopRun();
      else panel.remove();
    });

    start.addEventListener('click', async () => {
      if (panel.dataset.running) return;
      if (puerritoPage() !== initialPage) {
        status.textContent = 'Вернись к списку плейлистов, чтобы начать';
        return;
      }
      if (getEditPlaylistBox()) {
        status.textContent = 'Сначала закрой открытый диалог редактирования';
        return;
      }
      panel.dataset.running = '1';
      threads.disabled = true;
      start.hidden = true;
      stop.hidden = false;
      const cancelled = () => controller.signal.aborted;
      const collectionStopped = () => cancelled() || puerritoPage() !== initialPage;
      try {
        status.textContent = 'Собираем плейлисты…';
        const playlists = await collectCatalogPlaylists(n => {
          if (!collectionStopped()) status.textContent = `Собираем плейлисты… найдено ${n}`;
        }, collectionStopped);
        if (!playlists.length || collectionStopped()) {
          status.textContent = collectionStopped() ? 'Обработка остановлена' : 'Плейлисты не найдены';
          return;
        }
        const count = Math.min(playlists.length, Math.max(1, Math.min(4, Number(threads.value) || 1)));
        const queues = Array.from({ length: count }, () => []);
        playlists.forEach((playlist, index) => queues[index % count].push(playlist));
        let done = 0;
        let covers = 0;
        let branded = 0;
        let tags = 0;
        const active = Array(count).fill('');
        const summary = () => `обработано ${done}/${playlists.length} · обложек: ${covers} · тегов: ${tags} · уже ПУЭРРИТО: ${branded}`;
        const renderStatus = () => {
          if (!cancelled()) status.textContent = [summary(), ...active.filter(Boolean)].join('\n');
        };
        const progress = (index, title) => {
          active[index] = title ? `Поток ${index + 1} · ${title}` : '';
          renderStatus();
        };
        const record = (title, result) => {
          done++;
          if (result.coverChanged) covers++;
          if (result.descriptionChanged) tags++;
          if (result.alreadyBranded) branded++;
          const details = result.error || [
            result.alreadyBranded ? 'фирменная обложка уже стоит' :
              result.coverChanged ? 'обложка обновлена' : result.coverError,
            result.descriptionChanged ? 'тег добавлен' : result.descriptionError,
          ].filter(Boolean).join(', ');
          if (details) report.value += `${title} — ${details}\n`;
          renderStatus();
        };
        const recover = new Set();
        const deferOrRecord = (title, result, id) => {
          if (result.cardUnavailable && id) recover.add(id);
          else record(title, result);
        };
        const runLocal = (queue, retry = false) => processPuerritoQueue(queue, {
          cancelled, loadCards: retry, onProgress: title => progress(0, title),
          onResult: retry ? record : deferOrRecord,
        }).then(result => {
          if (result.error) report.value += `Поток 1 — ${result.error}\n`;
          if (result.stopped) controller.abort();
          progress(0, '');
          return result;
        });
        renderStatus();
        const [local] = await Promise.all([
          runLocal(queues[0]),
          ...queues.slice(1).map(async (queue, index) => {
            progress(index + 1, 'открываем вкладку…');
            const result = await processPuerritoBackgroundQueue(
              queue, controller.signal, title => progress(index + 1, title), deferOrRecord,
            );
            progress(index + 1, '');
            if (result.error || (result.stopped && !cancelled())) {
              report.value += `Поток ${index + 2} — ${result.error || 'обработка прервана'}\n`;
              if (!cancelled()) {
                if (result.startedCount > result.completedCount) {
                  record(queue[result.completedCount].title, { error: 'результат сохранения неизвестен' });
                }
                for (const playlist of queue.slice(result.startedCount)) recover.add(playlist.id);
              }
            }
          }),
        ]);
        if (recover.size && !cancelled() && !local.error) {
          report.value += 'Продолжаем в текущей вкладке с плейлистами, до которых не дошли другие потоки.\n';
          await runLocal(playlists.filter(playlist => recover.has(playlist.id)), true);
        }
        const outcome = cancelled() ? 'Остановлено' : done < playlists.length ? 'Завершено частично' : 'Готово';
        status.textContent = `${outcome} · ${summary()}`;
      } catch (err) {
        controller.abort();
        status.textContent = `Ошибка: ${err.message}`;
      } finally {
        delete panel.dataset.running;
        stop.remove();
      }
    });
  }

  function injectPlaylistCollectButton() {
    const list = findPlaylistCatalogList();
    const existing = document.getElementById('vmu-plcollect-btn')?.closest('.vmu-plcollect-row');
    if (!list?.parentElement) {
      existing?.remove();
      return;
    }
    if (existing) {
      if (existing.nextElementSibling !== list) list.before(existing);
      return;
    }
    const row = document.createElement('div');
    row.className = 'vmu-plcollect-row';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'vmu-plcollect-btn';
    btn.className = 'vmu-plcollect-btn';
    btn.textContent = 'Собрать список плейлистов';
    btn.addEventListener('click', e => { e.stopPropagation(); runPlaylistCollect(); });
    const puerrito = document.createElement('button');
    puerrito.type = 'button';
    puerrito.className = 'vmu-plcollect-btn';
    puerrito.textContent = 'Обновить все плейлисты · ПУЭРРИТО';
    puerrito.addEventListener('click', e => { e.stopPropagation(); openPuerritoCatalogPanel(); });
    row.append(btn, puerrito);
    list.parentElement.insertBefore(row, list);
  }

  // ─── SPA watcher + dialog watcher ────────────────────────────────────────────
  let lastHref = location.href;


  // ── VK's data-testid attributes, put back ────────────────────────────────
  // Until the VK build of 2026-11-16 every part of the music UI carried a
  // data-testid, and about 110 selectors here and in injected.js are built on
  // it. The build shipped on the 17th compiles those ids out: checked live on
  // the page, all 1646 host elements whose React props still have a
  // data-testid key carry the value undefined, and VKUI's own bundle ships a
  // literal «"data-testid": void 0» — there is nothing left on the page to
  // switch back on. Without the ids the extension loses the player block, the
  // track rows, the toolbar and the catalog header all at once.
  // So they are stamped back on here, from what the new build still gives:
  // VK's own data-audio-id, ARIA roles, the tab links' hrefs and the
  // accessible names of the controls (the extension is Russian-only anyway).
  // Everything downstream keeps working unchanged, and on a build that still
  // marks its own UI this does nothing at all.
  const VMU_STAMPED = 'data-vmu-stamped';
  function vmuStamp(el, id) {
    if (!el) return null;
    if (el.getAttribute('data-testid') !== id) {
      el.setAttribute('data-testid', id);
      el.setAttribute(VMU_STAMPED, '1');
    }
    return el;
  }
  function vmuLabel(el) {
    return (el.getAttribute('aria-label') || el.textContent || '').trim();
  }
  // the swap panel (injected.js) is a COPY of the player block living in the
  // page — stamping it would make it look like a second native player
  function vmuInOverlay(el) { return !!el.closest('#vmu-overlay-panel'); }

  // Tells the player block's own wrapper div (VK's in-flow copy) apart from its
  // duplicate (a second copy VK keeps around and makes position:fixed once the
  // page scrolls past the first — see applyTabsBarPin's "HOW THE MERGE WORKS").
  // Used to be "whichever wrapper has a later <section> sibling" (the in-flow
  // one sits alongside the rest of the catalog's section blocks) — VK's current
  // build no longer puts either copy next to a sibling section, so that test
  // now fails for both and applyTabsBarPin's CSS hid the whole player. The
  // duplicate is the one VK itself already makes position:fixed a few ancestors
  // up; the in-flow one never is. Marked once (by applyTabsBarPin, on whatever
  // AudioPage_PlayerBlock it finds, testid native or stamped) — the wrapper
  // node is stable across VK's own re-renders of its content.
  function markPlayerBlockWrap(sec) {
    const wrap = sec.parentElement;
    if (!wrap || wrap.classList.contains('vmu-pb-wrap-flow') || wrap.classList.contains('vmu-pb-wrap-fixed')) return;
    let anc = wrap, fixedHost = null;
    for (let d = 0; d < 4 && anc; d++) {
      if (getComputedStyle(anc).position === 'fixed') { fixedHost = anc; break; }
      anc = anc.parentElement;
    }
    if (fixedHost && fixedHost !== wrap) fixedHost.classList.add('vmu-pb-fixed-host');
    wrap.classList.add(fixedHost ? 'vmu-pb-wrap-fixed' : 'vmu-pb-wrap-flow');
  }

  function vmuStampPlayerBlocks() {
    for (const sec of document.querySelectorAll('section')) {
      if (sec.getAttribute('data-testid') === 'AudioPage_PlayerBlock'
        && sec.querySelector('[data-testid="audio-player-controls-state-button"]')
        && sec.querySelector('[data-testid="audioplayerplaybackbody-progressbar"]')) continue;
      if (vmuInOverlay(sec)) continue;
      const btns = sec.querySelectorAll('button');
      if (btns.length < 5) continue;
      // the transport: «предыдущая», the play/pause button, «следующая» — three
      // buttons in a row, which no other block on the page has
      let prev = -1, next = -1;
      for (let i = 0; i < btns.length && next < 0; i++) {
        const l = vmuLabel(btns[i]);
        if (prev < 0) { if (/^Предыдущая/i.test(l)) prev = i; }
        else if (/^Следующая/i.test(l)) next = i;
      }
      if (prev < 0 || next !== prev + 2) continue;
      vmuStamp(sec, 'AudioPage_PlayerBlock');
      vmuStamp(btns[prev], 'audio-player-controls-backward-button');
      vmuStamp(btns[prev + 1], 'audio-player-controls-state-button');
      vmuStamp(btns[next], 'audio-player-controls-forward-button');
      let mute = null;
      for (const b of btns) {
        const l = vmuLabel(b);
        if (/^Поделиться/i.test(l)) vmuStamp(b, 'MusicAudio_Share');
        else if (/^Транслировать/i.test(l)) vmuStamp(b, 'ToggleCurrentTargets');
        else if (/звук$/i.test(l)) mute = b;
      }
      // the volume bar sits next to the mute button; the progress bars are the
      // only sliders that carry a label of their own
      if (mute && mute.parentElement) {
        vmuStamp(mute.parentElement.querySelector('[role="slider"]:not([aria-label])')
          || mute.parentElement.querySelector('[role="slider"]'), 'audioplayervolumeslider-bar');
      }
      // Each of the stacked fills (buffered / played / hover) is a slider of
      // its own, one inline-styled bar inside each; the box that holds all
      // three is the one the panel copies, measures and seeks in.
      const fill = sec.querySelector('[role="slider"][aria-label]');
      if (fill) {
        let barBox = fill;
        while (barBox && barBox.parentElement && barBox.parentElement !== sec
          && barBox.querySelectorAll('[role="slider"]').length < 2) barBox = barBox.parentElement;
        if (barBox && barBox.querySelectorAll('[role="slider"]').length >= 2) vmuStamp(barBox, 'audioplayerplaybackbody-progressbar');
      }
      // the clock, which VK makes clickable (it toggles elapsed / remaining)
      for (const t of sec.querySelectorAll('[role="button"]')) {
        if (/^-?\d+:\d\d$/.test(t.textContent.trim())) { vmuStamp(t, 'audioplayerplaybackbody-progresstime'); break; }
      }
      // the title is a link to the track; its own box is the one the overlay
      // panel rewrites, the box around it also holds the restriction badge
      const link = sec.querySelector('a[href*="/audio"]');
      if (link && link.parentElement && link.parentElement.parentElement) {
        const titleBox = link.parentElement;
        const titleRow = titleBox.parentElement;
        vmuStamp(titleBox, 'audioplayeraudioinfo-title');
        for (const n of titleRow.children) {
          if (n !== titleBox && n.querySelector('svg')) { vmuStamp(n, 'audioplayeraudioinfo-titleNoticeIcon'); break; }
        }
        if (titleRow.nextElementSibling) vmuStamp(titleRow.nextElementSibling, 'audioplayeraudioinfo-extra');
      }
      const img = sec.querySelector('img');
      if (img) {
        let cov = img.parentElement;
        while (cov && cov !== sec && cov.parentElement !== sec
          && cov.parentElement && cov.parentElement.getBoundingClientRect().width <= 48) cov = cov.parentElement;
        vmuStamp(cov, 'audioplayerplaybackbody-cover');
      }
    }
  }

  // VK's top-bar mini player opens a drop-down that carries a SECOND full
  // player — the same transport, timeline, clock and title as the block at the
  // bottom of the page, but it lives in a role="dialog" portal instead of a
  // <section>, so vmuStampPlayerBlocks never sees it. It is given ids of its
  // own on purpose: everything that looks for «the page's player block»
  // (getVisibleNativePanel, the panel the swap copies and hides) must keep
  // finding that one and never this one.
  function vmuStampTopPopup() {
    for (const dlg of document.querySelectorAll('[role="dialog"]')) {
      if (vmuInOverlay(dlg)) continue;
      if (dlg.querySelector('[data-testid="TopPlayerPopup_StateButton"]')
        && dlg.querySelector('[data-testid="TopPlayerPopup_ProgressBar"]')) continue;
      const btns = [...dlg.querySelectorAll('button')];
      if (btns.length < 5) continue;
      // the same signature as the player block: «предыдущая», play/pause,
      // «следующая», three buttons in a row
      let prev = -1, next = -1;
      for (let i = 0; i < btns.length && next < 0; i++) {
        const l = vmuLabel(btns[i]);
        if (prev < 0) { if (/^Предыдущая/i.test(l)) prev = i; }
        else if (/^Следующая/i.test(l)) next = i;
      }
      if (prev < 0 || next !== prev + 2) continue;
      vmuStamp(btns[prev], 'TopPlayerPopup_PrevButton');
      vmuStamp(btns[prev + 1], 'TopPlayerPopup_StateButton');
      vmuStamp(btns[next], 'TopPlayerPopup_NextButton');
      // the title is a link to the track, on the same line as the transport —
      // the drop-down holds the whole queue below, and those are links too
      const bt = btns[prev + 1].getBoundingClientRect();
      const link = [...dlg.querySelectorAll('a[href*="/audio"]')]
        .find(a => Math.abs(a.getBoundingClientRect().top - bt.top) < 40);
      let strip = btns[prev + 1];
      while (strip && strip !== dlg && !(link ? strip.contains(link)
        : strip.querySelector('[role="slider"]'))) strip = strip.parentElement;
      if (!strip || strip === dlg) continue;
      vmuStamp(strip, 'TopPlayerPopup_Block');
      if (link && link.parentElement && link.parentElement.parentElement) {
        const titleBox = link.parentElement;
        const titleRow = titleBox.parentElement;
        vmuStamp(titleBox, 'TopPlayerPopup_Title');
        for (const n of titleRow.children) {
          if (n !== titleBox && n.querySelector('svg')) { vmuStamp(n, 'TopPlayerPopup_NoticeIcon'); break; }
        }
        if (titleRow.nextElementSibling) vmuStamp(titleRow.nextElementSibling, 'TopPlayerPopup_Extra');
      }
      // the buffered fill is the only slider here with a label of its own; the
      // box that holds all the stacked fills is the timeline
      const fill = strip.querySelector('[role="slider"][aria-label]');
      if (fill) {
        let barBox = fill;
        while (barBox && barBox.parentElement && barBox.parentElement !== strip
          && barBox.querySelectorAll('[role="slider"]').length < 2) barBox = barBox.parentElement;
        if (barBox && barBox.querySelectorAll('[role="slider"]').length >= 2) vmuStamp(barBox, 'TopPlayerPopup_ProgressBar');
      }
      for (const t of strip.querySelectorAll('[role="button"]')) {
        if (/^-?\d+:\d\d$/.test(t.textContent.trim())) { vmuStamp(t, 'TopPlayerPopup_ProgressTime'); break; }
      }
    }
  }

  // the small player in VK's top bar: the extension reads the restriction
  // badge from it and writes the community title into it
  function vmuStampTopPlayer() {
    const tp = document.querySelector('[class*="TopNavigation__player"]');
    if (!tp) return;
    const media = tp.querySelector('[role="button"]');
    if (!media) return;
    vmuStamp(media, 'AudioPlayerBlock_AudioMedia');
    // «Artist — Title»: the player's own text. The transport buttons carry
    // text too («Предыдущая аудиозапись» and so on, for screen readers), and
    // they sit inside this same tappable — so anything within a button is not
    // the title.
    const texts = [];
    const walker = document.createTreeWalker(media, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.data.trim() || !n.parentElement || n.parentElement.closest('button')) continue;
      texts.push(n);
    }
    if (!texts.length) return;
    let box = texts[0].parentElement;
    while (box && box !== media && !texts.every(n => box.contains(n))) box = box.parentElement;
    if (!box || box === media) return;
    // the restriction badge («!» in a grey circle) rides beside the title, in a
    // box of its own; injected.js hides it while the community copy plays, so
    // the stamped title must hold it
    const icon = media.querySelector('svg[class*="error_circle"], svg[class*="warning"]');
    if (icon && !box.contains(icon)) {
      let up = box;
      while (up && up !== media && !up.contains(icon)) up = up.parentElement;
      if (up && up !== media && !up.querySelector('button')) box = up;
    }
    vmuStamp(box, 'TopAudioPlayer_Title');
    if (icon) {
      vmuStamp(icon.parentElement && icon.parentElement !== box ? icon.parentElement : icon,
        'audioplayeraudioinfo-titleNoticeIcon');
    }
  }

  function vmuStampCatalog() {
    // The header card the extension pins and hangs its toolbar on:
    // [the row of tabs or the «Музыка <community>» title, VK's search field,
    // whatever follows]. The second child being VK's own search is what marks
    // it — it holds on /audio, where the first row is the tabs, and on a
    // community's audios page, where it is the title and the upload / new
    // playlist buttons (confirmed live on both).
    let sec = null;
    for (const s of document.querySelectorAll('section')) {
      if (vmuInOverlay(s)) continue;
      const head = s.children[0], search = s.children[1];
      if (!head || !search || !search.querySelector('[class*="vkuiSearch"]')) continue;
      // a music page, not some other part of VK that happens to have a search
      if (!head.querySelector('a[href*="section="]') && !/Загрузить/i.test(head.textContent)
        && !s.querySelector('[data-audio-id]')) continue;
      sec = s;
      break;
    }
    if (sec) {
      vmuStamp(sec, 'AudioCatalog_Header');
      vmuStamp(sec.children[0], 'headerlayout');
      // applyAudioHeaderSplit pushes «the rest» down and paints the notch over
      // the gap — meant for the «недавно прослушанные» strip only. The other
      // things VK puts in that slot (the «Слушать VK Микс» banner, a
      // community's track/playlist counts) must stay where they are, and the
      // strip is the only one of them that carries track rows.
      // its own heading and its carousel are two children of the header now,
      // and the margin put on the heading carries the carousel with it
      const rest = sec.children[2];
      if (rest && (/^Недавно прослушанные/i.test(rest.textContent.trim())
        || rest.querySelector('[data-audio-id]'))) vmuStamp(rest, 'AudioCatalog_BlockHeaderRecentlyPlayed');
      for (const b of sec.querySelectorAll('button')) {
        if (/^Загрузить/i.test(vmuLabel(b))) { vmuStamp(b, 'AudioCatalogUploadAudioAction'); break; }
      }
    }
    // the track list: the one block that holds the bulk of the rows. On a
    // community's page VK keeps the rows in the very section the header is in,
    // so this is not scoped away from it — only the section-level id is, since
    // an element cannot carry both.
    let best = null, bestN = 4;
    for (const s of document.querySelectorAll('section')) {
      if (vmuInOverlay(s)) continue;
      const n = s.querySelectorAll('[data-audio-id]').length;
      if (n > bestN) { best = s; bestN = n; }
    }
    if (best) {
      if (best !== sec) vmuStamp(best, 'AudioCatalog_SectionTracks');
      // the list itself: the innermost box that still holds most of the rows
      // (each row sits in a wrapper of its own)
      let box = best.querySelector('[data-audio-id]');
      while (box && box.parentElement && box.parentElement !== best
        && box.querySelectorAll('[data-audio-id]').length < 5) box = box.parentElement;
      if (box && box.querySelectorAll('[data-audio-id]').length >= 5) vmuStamp(box, 'AudioCatalog_BlockMusicAudiosList');
    }
  }

  function vmuStampRows() {
    for (const row of document.querySelectorAll('[data-audio-id]:not([data-testid])')) {
      if (vmuInOverlay(row)) continue;
      vmuStamp(row, 'MusicTrackRow');
      const tap = row.querySelector('[role="button"]');
      if (tap) vmuStamp(tap, 'audiorow-tappable');
    }
  }

  // The row of the track that is playing grows a timeline of its own — the
  // same component as the players', stacked fills inside a role="presentation"
  // that listens on pointerdown. Only that one row has one, so this looks for
  // the sliders directly instead of walking every row.
  function vmuStampRowProgress() {
    for (const s of document.querySelectorAll('[data-audio-id] [role="slider"]')) {
      if (vmuInOverlay(s)) continue;
      let box = s.parentElement;
      while (box && !box.hasAttribute('data-audio-id')
        && box.querySelectorAll('[role="slider"]').length < 2) box = box.parentElement;
      if (!box || box.hasAttribute('data-audio-id')) continue;
      // the timeline, not the row around it
      if (box.getAttribute('role') !== 'presentation') {
        box = [...box.querySelectorAll('[role="presentation"]')]
          .find(p => p.querySelectorAll('[role="slider"]').length >= 2);
        if (!box) continue;
      }
      vmuStamp(box, 'MusicTrackRow_ProgressBar');
    }
  }

  // the action icons mount only while the row is hovered, so this is called
  // from the observer that watches for them (below), not from the sweep
  function vmuStampRowActions(node) {
    if (!node || node.nodeType !== 1 || !node.parentElement || !node.closest) return null;
    const row = node.closest('[data-audio-id], [data-testid$="MusicTrackRow"]');
    if (!row || row.querySelector('[data-testid="audiorow-actions"]')) return null;
    const n = node.querySelectorAll('button').length;
    if (!n) return null;
    // the cover's own play overlay mounts on hover too: the icon row is the
    // last cell of the row, and it brings more than one button
    if (n < 2 && node.parentElement.lastElementChild !== node) return null;
    vmuStamp(node, 'audiorow-actions');
    return row;
  }

  // VK's own audio-upload dialog. injectIntoVkDialog keeps VK's header and
  // footer and swaps only the middle section for the extension's queue UI —
  // with neither the ids nor the old vkitModalHeader/Footer class names left
  // (checked live on the 17.11 build), it found no header at all, took the
  // TITLE row for the body and wiped it: the dialog lost its heading and its
  // close cross, and VK's own «Выбрать файл» section stayed on screen under
  // our dropzone. The layout itself is unchanged — [header, body, footer] —
  // and the footer is the one row holding VK's real «Закрыть» <button>, while
  // the header's own close control is a role="button" with the same name.
  function vmuStampUploadDialog(boxes = document.querySelectorAll('[role="dialog"]')) {
    for (const box of boxes) {
      if (vmuInOverlay(box)) continue;
      if (!String(box.className || '').includes('vkitInternalModalBox')) continue;
      if (box.querySelector('[data-testid="modalfooter"]')) continue;
      if (!box.querySelector('input[type="file"][accept*="audio"], input[type="file"][accept*="mp3"], [data-vmu-vk="1"]')) continue;
      if (isPlaylistDialog(box)) continue;
      const kids = [...box.children];
      if (kids.length < 2) continue;
      const isClose = el => /^Закрыть$/i.test(vmuLabel(el));
      const footer = [...kids].reverse().find(c => [...c.querySelectorAll('button')].some(isClose));
      const header = kids.find(c => c !== footer && !c.querySelector('input[type="file"]'));
      if (footer) {
        vmuStamp(footer, 'modalfooter');
        const cancel = [...footer.querySelectorAll('button')].find(isClose);
        if (cancel) vmuStamp(cancel, 'UploadAudio_CancelButton');
      }
      if (header && header !== footer) {
        vmuStamp(header, 'modalheader');
        const close = [...header.querySelectorAll('[role="button"], button')].find(isClose);
        if (close) vmuStamp(close, 'modal-close-button');
      }
      const pick = [...box.querySelectorAll('label, button, [role="button"]')]
        .find(el => /^Выбрать файл/i.test(vmuLabel(el)));
      if (pick) vmuStamp(pick, 'UploadAudio_SelectFileButton');
    }
  }

  // Playlist cells. VK still writes the playlist's own «ownerId_playlistId»
  // into data-id (checked live: 21 cells on the community page) — only the
  // testid went, so a cell is recognised by that id plus the actions every
  // playlist cell carries («Редактировать / Слушать / Поделиться»). Without
  // this the whole playlist half of the extension is blind: creating one and
  // then filling it, the duplicate check and the «в существующий» picker all
  // look up MusicPlaylistItem_Cell.
  function vmuStampPlaylists() {
    for (const cell of document.querySelectorAll('[data-id]:not([data-testid])')) {
      if (vmuInOverlay(cell)) continue;
      if (!/^-?\d+_\d+$/.test(cell.getAttribute('data-id') || '')) continue;
      if (cell.hasAttribute('data-audio-id')) continue;
      const action = cell.querySelector('[aria-label="Редактировать"], [aria-label="Слушать"], [title="Редактировать"]');
      if (!action && !/Редактировать|Слушать/.test(cell.textContent || '')) continue;
      vmuStamp(cell, 'MusicPlaylistItem_Cell');
      // the title sits inside the cell's own «Открыть» control
      let open = cell.querySelector('[role="button"][aria-label="Открыть"]');
      if (!open) {
        open = [...cell.querySelectorAll('[role="button"]')]
          .find(b => !/^(Редактировать|Слушать|Поделиться)$/i.test(vmuLabel(b)));
      }
      const title = open?.firstElementChild || open;
      if (title) vmuStamp(title, 'MusicPlaylistItem_Title');
    }
  }

  function vmuStampPlaylistPageEditAction() {
    if (!location.pathname.startsWith('/music/playlist/') ||
        document.querySelector('#spa_layout_content [data-testid="Action_Edit"]')) return;
    const controls = getPlaylistPageView()?.controls;
    if (!controls) return;
    const edit = controls.querySelector('button:has(svg[class~="vkuiIcon--pen_outline_24"])')
      || [...controls.querySelectorAll('button, [role="button"]')]
        .find(button => /^Редактировать(?: плейлист)?$/i.test(vmuLabel(button)));
    if (edit) vmuStamp(edit, 'Action_Edit');
  }

  function vmuStampFriendsMusicSection() {
    const catalog = document.getElementById('spa_layout_content');
    if (!catalog || catalog.querySelector('[data-testid="AudioCatalog_SectionFriendsMusic"]')) return;
    for (const heading of catalog.querySelectorAll('section > :is([role="heading"], h2, h3)')) {
      if (vmuLabel(heading) !== 'Музыка друзей' &&
          heading.firstElementChild?.textContent.trim() !== 'Музыка друзей') continue;
      vmuStamp(heading.parentElement, 'AudioCatalog_SectionFriendsMusic');
      return;
    }
  }

  let _vmuStampAt = 0, _vmuNativeAt = -1e9, _vmuNative = false;
  function restoreVkTestIds(force) {
    const now = performance.now();
    if (!force && now - _vmuStampAt < 60) return;
    _vmuStampAt = now;
    if (settings.hideFriendsMusic) vmuStampFriendsMusicSection();
    vmuStampPlaylistPageEditAction();
    // A build that still marks its own music UI: leave the page alone (asking
    // for VK's own ids, not just any — another extension's data-testid must not
    // look like VK's). Which build this is cannot change while the page is
    // open, so it is settled at most once every ten seconds, and with plain
    // lookups: the «:not(stamped)» form of the same question walked the tree.
    if (now - _vmuNativeAt > 10000) {
      _vmuNativeAt = now;
      _vmuNative = false;
      for (const id of ['MusicTrackRow', 'AudioPage_PlayerBlock', 'audiorow-tappable']) {
        const el = document.querySelector('[data-testid="' + id + '"]');
        if (el && !el.hasAttribute(VMU_STAMPED)) { _vmuNative = true; break; }
      }
    }
    if (_vmuNative) return;
    // the catalog, the rows and their timelines only exist where rows do; the
    // player block comes with them (and is re-stamped as long as it is there,
    // whatever the page). The two cheap ones are left alone: the top-bar
    // player is a single lookup and the swap renames it on any page, and the
    // drop-down stamper walks a dialog's buttons only when one is open.
    const hasRows = vmuPageHasAudio(force);
    if (hasRows || document.querySelector('[data-testid="AudioPage_PlayerBlock"]')) {
      try { vmuStampPlayerBlocks(); } catch (err) { console.warn('[VK Multi Upload] testid player:', err); }
    }
    try { vmuStampTopPlayer(); } catch (err) { console.warn('[VK Multi Upload] testid top player:', err); }
    try { vmuStampTopPopup(); } catch (err) { console.warn('[VK Multi Upload] testid top popup:', err); }
    try { vmuStampUploadDialog(); } catch (err) { console.warn('[VK Multi Upload] testid upload dialog:', err); }
    try { vmuStampPlaylists(); } catch (err) { console.warn('[VK Multi Upload] testid playlists:', err); }
    if (hasRows) {
      try { vmuStampCatalog(); } catch (err) { console.warn('[VK Multi Upload] testid catalog:', err); }
      try { vmuStampRows(); } catch (err) { console.warn('[VK Multi Upload] testid rows:', err); }
      try { vmuStampRowProgress(); } catch (err) { console.warn('[VK Multi Upload] testid row progress:', err); }
    }
  }
  setInterval(() => { if (!document.hidden) restoreVkTestIds(); }, 1000);
  restoreVkTestIds(true);
  // a stamp of which build of this file the browser actually loaded, so a
  // page check can tell a reloaded extension from a stale one
  document.documentElement.setAttribute('data-vmu-build', '2026-11-26-puerrito-catalog');
  injectPlaylistCollectButton();
  injectPlaylistViewActions();

  function onPageMutated() {
    restoreVkTestIds(true);
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
      closePlaylistCollectPanel();
      if (!document.getElementById('vmu-plmake-panel')?.dataset.vmuBusy) closePlaylistMakerPanel();
      if (!document.getElementById('vmu-plorder-panel')?.dataset.vmuBusy) closePlaylistOrderPanel();
    }

    // Everything below that works on the catalog, the rows or the player has
    // nothing to find on a page without track rows. The upload dialog is the
    // exception: it is driven by a modal appearing, and that can happen from
    // anywhere, so its block stays outside this.
    const hasAudio = vmuPageHasAudio(true);

    // Own try/catch: this used to be its own observer, so a failure here
    // (or in any step below) must not be able to skip or be skipped by the
    // others.
    if (hasAudio) {
      try { injectCatalogToolbarButtons(); } catch (err) { console.warn('[VK Multi Upload] toolbar inject failed:', err); }
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

    injectPlaylistViewActions();

    injectPlaylistCollectButton();
    if (hasAudio) {
      // Inject single-track download buttons
      scanAndInjectDlBtns();

      // Keep the audio catalog header split/pin in sync with VK's re-renders
      applyAudioCatalogLayout();

      // Restore the audio FX button/panel if VK re-rendered over them
      ensureAudioFxUI();
    } else if (_vmuWasAudio) {
      // just left the music pages: one last pass, so the pinned bar, the
      // header split and the state classes are taken back off
      try { applyAudioCatalogLayout(); } catch (err) { console.warn('[VK Multi Upload] layout reset failed:', err); }
    }
    _vmuWasAudio = hasAudio;
  }
  var _vmuWasAudio = false;

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
    // The initial upload UI must mount in this mutation batch, before a paint.
    // Catalog updates and reinjection after upload can remain throttled.
    try { mountNewUploadDialog(muts); } catch (err) { console.warn('[VK Multi Upload] upload dialog:', err); }
    // before the throttle: every selector below depends on the ids being there
    restoreVkTestIds();
    if (_mutScheduled) return;
    let relevant = false;
    for (const m of muts) {
      if (hasElementNode(m.addedNodes) || hasElementNode(m.removedNodes)) { relevant = true; break; }
    }
    if (!relevant) return;
    _mutScheduled = true;
    // 250 ms (was 120): while scrolling a long list this runs for the whole
    // scroll, and every run walks the toolbar / dialog / layout injectors
    setTimeout(() => {
      _mutScheduled = false;
      onPageMutated();
    }, 250);
  }).observe(document.body, { childList: true, subtree: true });
})();
