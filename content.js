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
  const STATUS_ICON = {
    pending: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#555" stroke-width="1.3"/><rect x="5" y="4.5" width="1.4" height="5" rx="0.5" fill="#555"/><rect x="7.6" y="4.5" width="1.4" height="5" rx="0.5" fill="#555"/></svg>`,
    uploading: `<svg class="vmu-spin" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="rgba(38,136,235,0.2)" stroke-width="1.5"/><path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="#2688eb" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    done: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" fill="rgba(75,179,75,0.14)" stroke="#4bb34b" stroke-width="1.3"/><path d="M4.5 7l2 2 3-3" stroke="#4bb34b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" fill="rgba(230,70,70,0.12)" stroke="#e64646" stroke-width="1.3"/><path d="M5 5l4 4M9 5l-4 4" stroke="#e64646" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  };

  // ─── state ───────────────────────────────────────────────────────────────────
  let fileQueue = [];
  let isProcessing = false;
  let uploadDoneCallback = null;
  let autoPlaylistRunning = false;

  // ─── playlist download state ──────────────────────────────────────────────────
  const dlTracks = new Map();   // trackId -> {id, title, artist, url}
  let dlCancelFlag = false;

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.data?.type === 'VK_UPLOAD_DONE' && uploadDoneCallback) {
      uploadDoneCallback(e.data);
      uploadDoneCallback = null;
    }
    if (e.data?.type === 'VK_COVER_DONE' && window.__vmuCoverCallback) {
      window.__vmuCoverCallback(e.data);
      window.__vmuCoverCallback = null;
    }
    if (e.data?.type === 'VKD_TRACK') {
      const t = e.data.track;
      if (t?.id && !dlTracks.has(t.id)) {
        dlTracks.set(t.id, t);
        const el = document.getElementById('vmu-dl-collected');
        if (el) el.textContent = `Найдено: ${dlTracks.size}`;
      }
    }
  });

  // ─── helpers ─────────────────────────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const isMP3 = (f) => f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3');
  const fmtSize = (b) => b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const escHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function getVkBtn() {
    return document.querySelector('[aria-label="Загрузить аудиозапись"]');
  }

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
  let settings = { autoPlaylist: false, coverDataUrl: null, autoMeta: false };

  function loadSettings() {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) Object.assign(settings, JSON.parse(s));
    } catch {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        autoPlaylist: settings.autoPlaylist,
        coverDataUrl: settings.coverDataUrl,
        autoMeta: settings.autoMeta,
      }));
    } catch {}
  }

  loadSettings();

  // ─── filename → meta parser ───────────────────────────────────────────────────
  function parseMetaFromFilename(filename) {
    function cleanPart(s) {
      return s
        .replace(/_/g, ' ')           // underscores → spaces
        .replace(/\s+/g, ' ')         // collapse multiple spaces
        .replace(/^[\s\-–—_.,()\[\]]+|[\s\-–—_.,()\[\]]+$/g, '') // trim junk edges
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
      const buf = await file.slice(0, 131072).arrayBuffer();
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
        }
        p += Math.max(0, sz);
      }
      return tags;
    } catch { return {}; }
  }

  // ─── cover compositor ─────────────────────────────────────────────────────────
  function makePerezalitoCover(coverDataUrl) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000; canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1000, 1000);
        ctx.save();
        ctx.translate(500, 500);
        ctx.rotate(-Math.PI / 4);
        ctx.font = 'bold italic 132px Georgia,"Times New Roman",serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(230,0,0,0.92)';
        ctx.fillText('перезалито', 0, 0);
        ctx.restore();
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      };
      img.onerror = () => resolve(null);
      img.src = coverDataUrl;
    });
  }

  // ─── VK internal API via al_audio.php (browser-native, no external tokens) ────

  function getPageHash() {
    for (const s of document.querySelectorAll('script:not([src])')) {
      const m = s.textContent.match(/"hash"\s*:\s*"([a-zA-Z0-9_\-]{30,70})"/);
      if (m) return m[1];
    }
    return '';
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

  // Generic al_audio.php call (works for read operations; write ops may need UI)
  async function alAudio(act, params) {
    const hash = getPageHash();
    const body = new URLSearchParams({ act, al: '1', hash, ...params });
    const res = await fetch('/al_audio.php', {
      method: 'POST',
      body,
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`al_audio.php ответил не JSON`); }
    if (data.payload?.[0] !== 0) {
      throw new Error(`al_audio.php ${act}: код ${data.payload?.[0]}`);
    }
    return data.payload?.[1] ?? [];
  }

  // Send message to injected.js and wait for response
  function pageCall(sendType, responseType, payload, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error(`Timeout: ${responseType}`));
      }, timeoutMs);
      function handler(e) {
        if (e.source !== window || e.data?.type !== responseType) return;
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

  // ─── status helpers ───────────────────────────────────────────────────────────
  function setPlaylistStatus(text, isError) {
    const el = document.getElementById('vmu-pl-status');
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? '#e64646' : '#4bb34b';
    el.style.display = text ? 'block' : 'none';
  }

  // ─── auto-playlist flow ───────────────────────────────────────────────────────
  async function runAutoPlaylist(uploadedItems) {
    const done = uploadedItems.filter(i => i.status === 'done');
    if (!done.length) return;

    const ownerId = getVkUserId();
    if (!ownerId) { setPlaylistStatus('Ошибка: ID пользователя не найден', true); return; }

    setPlaylistStatus('Читаем метаданные…');

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

      // Build track names list for matching in the edit dialog (in upload order)
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

      // Prepare cover blob BEFORE opening the dialog (inject it during creation)
      let coverBlob = null;
      if (settings.coverDataUrl) {
        setPlaylistStatus('Готовим обложку…');
        coverBlob = await makePerezalitoCover(settings.coverDataUrl);
      }

      // Create playlist: opens VK dialog, fills fields, injects cover, selects tracks, saves
      setPlaylistStatus('Создаём плейлист…');
      const created = await pageCall('VK_CREATE_PLAYLIST', 'VK_PLAYLIST_CREATED', {
        title: title.slice(0, 255),
        description: description.slice(0, 1000),
        trackNames,
        coverBuf: coverBlob ? await coverBlob.arrayBuffer() : null,
      }, 60000);

      setPlaylistStatus(`✓ Плейлист «${title.slice(0,30)}» создан!`);
    } catch (err) {
      setPlaylistStatus(`Ошибка: ${translateError(err.message)}`, true);
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

  // Parse tracks from DOM on the current playlist page
  function getTracksFromDOM() {
    const tracks = [];
    const seen = new Set();

    // Try various VK audio row selectors
    const rows = document.querySelectorAll(
      '.audio_row[data-full-id], [data-full-id], [data-audio-id], .AudioRow'
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

    // Fallback: parse from audio link hrefs
    if (!tracks.length) {
      const links = document.querySelectorAll('a[href^="/audio"]');
      for (const link of links) {
        const m = link.href.match(/\/audio(-?\d+)_(\d+)/);
        if (!m) continue;
        const fullId = `${m[1]}_${m[2]}`;
        if (seen.has(fullId)) continue;
        seen.add(fullId);
        const row = link.closest('[class*="audio"], [class*="Audio"]') || link.parentElement;
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

  async function scanForDuplicates(plInfoArg, statusCallback) {
    const pl = plInfoArg || getPlaylistInfoFromUrl();
    const report = statusCallback || ((msg, isError) => setPlaylistStatus(msg, isError));

    if (!pl) {
      report('Перейдите на страницу плейлиста для поиска дубликатов', true);
      return;
    }

    report('Читаем треки со страницы…');

    try {
      let tracks = getTracksFromDOM();

      if (!tracks.length) {
        report('Загружаем через API…');
        try {
          const result = await pageCall('VK_LOAD_PLAYLIST', 'VK_PLAYLIST_LOADED', {
            ownerId: pl.ownerId,
            playlistId: pl.playlistId,
            offset: 0,
          }, 10000);
          try {
            const raw = JSON.parse(result.raw || '{}');
            const list = raw?.payload?.[1];
            if (Array.isArray(list)) tracks = parseTracksFromPayload(list);
          } catch {}
        } catch (apiErr) {
          report(`Не удалось загрузить треки: ${apiErr.message}`, true);
          return;
        }
      }

      if (!tracks.length) {
        report('Треки не найдены', true);
        return;
      }

      const seen = new Map();
      const dupes = [];
      for (const track of tracks) {
        const key = `${track.artist}|||${track.title}`.toLowerCase().trim();
        if (!key.includes('|||') || (!track.artist && !track.title)) continue;
        if (seen.has(key)) {
          dupes.push({ track, original: seen.get(key) });
        } else {
          seen.set(key, track);
        }
      }

      if (!dupes.length) {
        report(`Дубликаты не найдены в ${tracks.length} треках ✓`);
        return;
      }

      report(`Найдено ${dupes.length} дубликатов из ${tracks.length} треков`);
      showDupesDialog(dupes, pl.ownerId, pl.playlistId);
    } catch (err) {
      report(`Ошибка: ${err.message}`, true);
    }
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

  function showDupesDialog(dupes, ownerId, playlistId) {
    document.getElementById('vmu-dupes-backdrop')?.remove();
    const wrap = document.createElement('div');
    wrap.id = 'vmu-dupes-backdrop';
    wrap.innerHTML = `
      <div id="vmu-dupes-modal">
        <div id="vmu-dupes-header">
          <span>Найдено дубликатов: ${dupes.length}</span>
          <button id="vmu-dupes-close">${ICON_CLOSE}</button>
        </div>
        <div id="vmu-dupes-list">
          ${dupes.map((d, i) => `
            <label class="vmu-dupe-item">
              <input type="checkbox" class="vmu-dupe-cb" data-idx="${i}" checked>
              <span class="vmu-dupe-name">${escHtml(d.track.artist)} — ${escHtml(d.track.title)}</span>
              <span class="vmu-dupe-id">id:${d.track.id}</span>
            </label>`).join('')}
        </div>
        <div id="vmu-dupes-footer">
          <span id="vmu-dupes-status"></span>
          <div style="display:flex;gap:8px">
            <button id="vmu-dupes-selall">Все</button>
            <button id="vmu-dupes-delete">Удалить выбранные</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
    document.getElementById('vmu-dupes-close').onclick = () => wrap.remove();
    document.getElementById('vmu-dupes-selall').onclick = () => {
      const cbs = wrap.querySelectorAll('.vmu-dupe-cb');
      const anyUnchecked = [...cbs].some(c => !c.checked);
      cbs.forEach(c => c.checked = anyUnchecked);
    };

    document.getElementById('vmu-dupes-delete').onclick = async () => {
      const checked = [...wrap.querySelectorAll('.vmu-dupe-cb:checked')];
      if (!checked.length) return;
      const btn = document.getElementById('vmu-dupes-delete');
      const st = document.getElementById('vmu-dupes-status');
      btn.disabled = true;
      let removed = 0;
      for (const cb of checked) {
        const track = dupes[parseInt(cb.dataset.idx)].track;
        const audioId = track.fullId || `${track.owner_id}_${track.id}`;
        try {
          const res = await pageCall('VK_REMOVE_FROM_PLAYLIST', 'VK_REMOVE_PLAYLIST_DONE', {
            ownerId,
            playlistId,
            audioId,
          }, 10000);
          if (!res.ok) throw new Error('Сервер вернул ошибку');
          cb.closest('.vmu-dupe-item').style.opacity = '0.35';
          st.textContent = `Удалено: ${++removed}`;
        } catch (e) {
          st.textContent = `Ошибка: ${e.message}`;
        }
        await sleep(400);
      }
      st.textContent = `✓ Удалено ${removed} дубликатов`;
      btn.disabled = false;
    };
  }

  // ─── settings panel ───────────────────────────────────────────────────────────
  let settingsPanelOpen = false;

  function toggleSettings() {
    settingsPanelOpen = !settingsPanelOpen;
    const panel = document.getElementById('vmu-settings-panel');
    const btn = document.getElementById('vmu-settings-btn');
    if (panel) panel.style.display = settingsPanelOpen ? 'block' : 'none';
    if (btn) btn.style.color = settingsPanelOpen ? '#2688eb' : '';
  }

  function buildSettingsPanel() {
    const hasCover = !!settings.coverDataUrl;
    return `
      <div id="vmu-settings-panel" style="display:none">
        <div class="vmu-settings-section">
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

          <div id="vmu-cover-row" class="vmu-setting-row ${settings.autoPlaylist ? '' : 'vmu-row-disabled'}">
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
        </div>

        <div class="vmu-settings-section">
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
        </div>

        <div id="vmu-pl-status" style="display:none;padding:6px 12px 8px;font-size:11.5px;color:#4bb34b;font-family:inherit"></div>
      </div>`;
  }

  function attachSettingsHandlers() {
    const toggle = document.getElementById('vmu-ap-toggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        settings.autoPlaylist = toggle.checked;
        saveSettings();
        const coverRow = document.getElementById('vmu-cover-row');
        if (coverRow) coverRow.classList.toggle('vmu-row-disabled', !settings.autoPlaylist);
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
      return `<div class="vmu-item vmu-${item.status}">
        <span class="vmu-icon">${STATUS_ICON[item.status]}</span>
        <span class="vmu-info">
          <span class="vmu-name" title="${item.file.name}">${name}</span>${errHtml}
        </span>
        <span class="vmu-sz">${fmtSize(item.file.size)}</span>
        ${retryBtn}
      </div>`;
    }).join('');

    const counts = { pending: 0, uploading: 0, done: 0, error: 0 };
    fileQueue.forEach(f => counts[f.status]++);

    let txt = '';
    if (fileQueue.length === 0)          txt = 'Перетащите файлы или нажмите «Выбрать»';
    else if (counts.uploading)           txt = 'Загружается…';
    else if (counts.pending)             txt = `В очереди: ${counts.pending}`;
    else if (counts.error && counts.done) txt = `Загружено: ${counts.done}, ошибок: ${counts.error}`;
    else if (counts.done)                txt = `Все треки загружены: ${counts.done}`;
    else if (counts.error)               txt = `Ошибок: ${counts.error}`;

    const st = document.getElementById('vmu-status');
    if (st) st.textContent = txt;

    const allSettled = fileQueue.length > 0 && !fileQueue.some(f => f.status === 'pending' || f.status === 'uploading');
    const fa = document.getElementById('vmu-footer-actions');
    if (fa) {
      if (allSettled && counts.error > 0) {
        fa.innerHTML = `<button class="vmu-action-btn" id="vmu-copy-failed">📋 Скопировать</button><button class="vmu-action-btn" id="vmu-retry-all">↺ Повторить все</button>`;
      } else {
        fa.innerHTML = '';
      }
    }
  }

  // ─── queue ────────────────────────────────────────────────────────────────────
  function addFiles(files) {
    if (!files.length) return;
    autoPlaylistRunning = false;
    files.forEach(f => {
      const item = { file: f, status: 'pending', errorMsg: null, tags: {} };
      fileQueue.push(item);
      // Read ID3 tags asynchronously (non-blocking)
      readID3(f).then(tags => { item.tags = tags; }).catch(() => {});
    });
    renderQueue();
    if (!isProcessing) processQueue();
  }

  function showCompletionGif() {
    const existing = document.getElementById('vmu-gif-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'vmu-gif-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('done.gif');
    img.style.cssText = 'max-width:80vw;max-height:80vh;border-radius:8px;pointer-events:none;';
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    const dismiss = () => overlay.remove();
    overlay.addEventListener('click', dismiss);
    setTimeout(dismiss, 4000);
  }

  async function processQueue() {
    if (isProcessing) return;
    const next = fileQueue.find(f => f.status === 'pending');
    if (!next) {
      renderQueue();
      if (fileQueue.length > 0 && !fileQueue.some(f => f.status === 'uploading')) {
        // Trigger auto-playlist if enabled (once per completed batch)
        if (settings.autoPlaylist && !autoPlaylistRunning) {
          autoPlaylistRunning = true;
          if (!settingsPanelOpen) toggleSettings();
          runAutoPlaylist([...fileQueue]).finally(() => { autoPlaylistRunning = false; });
        }
      }
      return;
    }

    isProcessing = true;
    next.status = 'uploading';
    renderQueue();

    try {
      await uploadOne(next);
      next.status = 'done';
    } catch (err) {
      next.status = 'error';
      next.errorMsg = err.message;
      console.warn('[VK Multi Upload]', err.message);
    }

    renderQueue();
    isProcessing = false;
    await sleep(2000);
    processQueue();
  }

  async function uploadOne(item) {
    let file = item.file;

    if (settings.autoMeta) {
      const tags = item.tags || {};
      const hasArtist = !!(tags.TPE1 || tags.TPE2);
      const hasTitle = !!tags.TIT2;
      if (!hasArtist || !hasTitle) {
        const parsed = parseMetaFromFilename(file.name);
        const artist = hasArtist ? (tags.TPE1 || tags.TPE2) : parsed.artist;
        const title = hasTitle ? tags.TIT2 : parsed.title;
        if (artist || title) {
          try { file = await patchID3(file, artist, title); } catch {}
        }
      }
    }

    // Dialog is already open — just inject directly into VK's hidden input.
    // Set the callback before injection to avoid losing a fast upload response.
    const uploadPromise = new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        uploadDoneCallback = null;
        reject(new Error('Timeout загрузки (90s)'));
      }, 90_000);
      uploadDoneCallback = data => {
        clearTimeout(t);
        if (data.error) { reject(new Error('Ошибка сети')); return; }
        try {
          const r = JSON.parse(data.response);
          r.error_code ? reject(new Error(`VK ${r.error_code}: ${r.error_msg}`)) : resolve(r);
        } catch { resolve(); }
      };
    });

    const buffer = await file.arrayBuffer();
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout инжекта')), 5000);
      const handler = e => {
        if (e.source !== window || e.data?.type !== 'VK_FILE_INJECTED') return;
        window.removeEventListener('message', handler);
        clearTimeout(t);
        e.data.ok ? resolve() : reject(new Error(e.data.error));
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'VK_INJECT_FILE', name: file.name, mimeType: file.type || 'audio/mpeg', buffer }, '*', [buffer]);
    });

    await uploadPromise;
    await sleep(2000);
  }

  // ─── Embed full UI into VK's native upload dialog ────────────────────────────
  function buildEmbeddedUI() {
    const wrap = document.createElement('div');
    wrap.id = 'vmu-embedded';
    wrap.innerHTML = `
      <div id="vmu-header">
        <span id="vmu-title">Загрузить несколько треков</span>
        <button id="vmu-settings-btn" title="Настройки">${ICON_SETTINGS}</button>
      </div>

      ${buildSettingsPanel()}

      <div id="vmu-dropzone">
        <div class="vmu-dz-label">Перетащите MP3 файлы сюда</div>
        <div class="vmu-dz-hint">не более 200 МБ каждый</div>
        <label class="vmu-pick-btn">
          ${ICON_UPLOAD}
          Выбрать файлы
          <input type="file" id="vmu-input" accept=".mp3,audio/mpeg" multiple>
        </label>
      </div>

      <div id="vmu-list"></div>

      <div id="vmu-footer">
        <span id="vmu-status">Перетащите файлы или нажмите «Выбрать»</span>
        <div id="vmu-footer-actions"></div>
        <button id="vmu-clear">Очистить</button>
      </div>
    `;
    return wrap;
  }

  function injectIntoVkDialog(box) {
    if (box.dataset.vmuInjected) return;
    box.dataset.vmuInjected = '1';

    // Save VK's original file input (with its VK event listeners intact)
    const vkInput = box.querySelector('input[type="file"]');
    if (vkInput) {
      vkInput.setAttribute('data-vmu-vk', '1');
      vkInput.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;overflow:hidden;';
    }

    // Clear VK's content and inject our UI
    box.innerHTML = '';
    box.appendChild(buildEmbeddedUI());

    // Re-append VK's input so it stays in the DOM with its event listeners
    if (vkInput) box.appendChild(vkInput);

    attachEmbeddedHandlers();
    renderQueue();
  }

  function attachEmbeddedHandlers() {
    document.getElementById('vmu-settings-btn')?.addEventListener('click', toggleSettings);

    document.getElementById('vmu-clear')?.addEventListener('click', () => {
      fileQueue = fileQueue.filter(f => f.status === 'uploading' || f.status === 'pending');
      renderQueue();
    });

    document.getElementById('vmu-input')?.addEventListener('change', e => {
      addFiles([...e.target.files].filter(isMP3));
      e.target.value = '';
    });

    const dz = document.getElementById('vmu-dropzone');
    const embedded = document.getElementById('vmu-embedded');
    if (dz && embedded) {
      let dragCounter = 0;
      embedded.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; dz.classList.add('vmu-over'); });
      embedded.addEventListener('dragleave', e => { e.preventDefault(); dragCounter--; if (dragCounter <= 0) { dragCounter = 0; dz.classList.remove('vmu-over'); } });
      embedded.addEventListener('dragover', e => e.preventDefault());
      embedded.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0; dz.classList.remove('vmu-over');
        addFiles([...e.dataTransfer.files].filter(isMP3));
      });
    }

    document.getElementById('vmu-list')?.addEventListener('click', e => {
      const btn = e.target.closest('.vmu-retry-btn');
      if (btn) retryOne(parseInt(btn.dataset.idx, 10));
    });

    document.getElementById('vmu-footer')?.addEventListener('click', e => {
      if (e.target.closest('#vmu-copy-failed')) copyFailed();
      else if (e.target.closest('#vmu-retry-all')) retryAll();
    });

    attachSettingsHandlers();
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

  function showToast(msg, isError) {
    document.getElementById('vmu-toast')?.remove();
    const el = document.createElement('div');
    el.id = 'vmu-toast';
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:20px;left:20px;z-index:999999;background:${isError ? '#b71c1c' : '#1b5e20'};color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.5);max-width:340px;word-break:break-word;pointer-events:none;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function makeDupesBtn(plInfo) {
    const btn = document.createElement('button');
    btn.className = 'vmu-dupes-dialog-btn';
    btn.setAttribute('data-vmu-dupes-dialog', '1');
    btn.textContent = 'Дубликаты';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      scanForDuplicates(plInfo, (msg, isError) => {
        showToast(msg, isError);
      }).finally(() => { btn.disabled = false; });
    });
    return btn;
  }

  function makeDlDialogBtn(plInfo) {
    const btn = document.createElement('button');
    btn.className = 'vmu-dl-dialog-btn';
    btn.setAttribute('data-vmu-dl-dialog', '1');
    btn.textContent = 'Скачать';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (!document.getElementById('vmu-dl-backdrop')) showDlModal(plInfo);
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

    const listenBtn = [...modal.querySelectorAll('button')]
      .find(b => b.textContent.trim() === 'Слушать');
    if (!listenBtn) return;

    const btnGroup = listenBtn.closest('[class*="vkuiButtonGroup"]');
    if (!btnGroup) return;

    btnGroup.appendChild(makeDupesBtn(plInfo));
    btnGroup.appendChild(makeDlDialogBtn(plInfo));
  }

  // ─── playlist download feature ────────────────────────────────────────────────

  const ICON_DL_SM = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v8M4 6.5l2.5 2.5 2.5-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 11.5h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

  const DL_HDR_SELS = [
    '.AudioPlaylistSnippet__controls',
    '.AudioPlaylistHeader__controls',
    '.audio_page_header__controls',
    '[class*="PlaylistHeader"][class*="controls"]',
    '.AudioFilters',
    '.audio_page_header',
    '.CatalogSection__titleWrapped',
  ];

  function tryInjectDlButton() {
    const h = location.href;
    if (!h.includes('/music') && !h.includes('/audio')) return;
    if (document.getElementById('vmu-dl-btn')) return;
    let target = null;
    for (const sel of DL_HDR_SELS) {
      target = document.querySelector(sel);
      if (target) break;
    }
    if (!target) return;
    const btn = document.createElement('button');
    btn.id = 'vmu-dl-btn';
    btn.className = 'vmu-dl-page-btn';
    btn.innerHTML = `${ICON_DL_SM} Скачать плейлист`;
    btn.onclick = () => { if (!document.getElementById('vmu-dl-backdrop')) showDlModal(); };
    target.appendChild(btn);
  }

  function showDlModal(plInfo) {
    document.getElementById('vmu-dl-backdrop')?.remove();
    const backdrop = document.createElement('div');
    backdrop.id = 'vmu-dl-backdrop';
    backdrop.innerHTML = `
      <div id="vmu-dl-modal">
        <div id="vmu-dl-header">
          <span>Скачивание плейлиста</span>
          <button id="vmu-dl-close">${ICON_CLOSE}</button>
        </div>
        <div id="vmu-dl-prog-wrap"><div id="vmu-dl-bar" style="width:0%"></div></div>
        <div id="vmu-dl-status-line">
          <span id="vmu-dl-phase">Загружаем треки…</span>
          <span id="vmu-dl-collected"></span>
        </div>
        <div id="vmu-dl-list"></div>
        <div id="vmu-dl-footer">
          <span id="vmu-dl-foot-txt"></span>
          <button id="vmu-dl-stop">Остановить</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeDlModal(); });
    document.getElementById('vmu-dl-close').onclick = closeDlModal;
    document.getElementById('vmu-dl-stop').onclick = () => {
      dlCancelFlag = true;
      const s = document.getElementById('vmu-dl-stop');
      if (s) s.textContent = 'Останавливаем…';
    };
    runPlaylistDownload(plInfo);
  }

  function closeDlModal() {
    dlCancelFlag = true;
    document.getElementById('vmu-dl-backdrop')?.remove();
  }

  function dlSetPhase(text) {
    const el = document.getElementById('vmu-dl-phase');
    if (el) el.textContent = text;
  }

  function dlSetProgress(done, total) {
    const bar = document.getElementById('vmu-dl-bar');
    const foot = document.getElementById('vmu-dl-foot-txt');
    if (bar) bar.style.width = total > 0 ? Math.round((done / total) * 100) + '%' : '0%';
    if (foot) foot.textContent = '';
  }

  function dlAddRow(track, status) {
    const list = document.getElementById('vmu-dl-list');
    if (!list) return;
    const old = document.getElementById('vmu-dlr-' + track.id);
    if (old) { old.className = 'vmu-dl-row vmu-' + status; return; }
    const div = document.createElement('div');
    div.id = 'vmu-dlr-' + track.id;
    div.className = 'vmu-dl-row vmu-' + status;
    div.innerHTML = `<span class="vmu-icon">${STATUS_ICON[status] || STATUS_ICON.pending}</span><span class="vmu-dl-row-name">${escHtml(track.artist)} — ${escHtml(track.title)}</span>`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
    // Keep DOM small — drop oldest settled rows beyond 80
    const settled = list.querySelectorAll('.vmu-done, .vmu-error');
    if (settled.length > 80) settled[0].remove();
  }

  function dlUpdateRow(trackId, status, errMsg) {
    const row = document.getElementById('vmu-dlr-' + trackId);
    if (!row) return;
    row.className = 'vmu-dl-row vmu-' + status;
    const icon = row.querySelector('.vmu-icon');
    if (icon) icon.innerHTML = STATUS_ICON[status] || STATUS_ICON.done;
    if (errMsg) {
      const nameEl = row.querySelector('.vmu-dl-row-name');
      if (nameEl) nameEl.title = errMsg;
    }
  }

  async function scrollToCollect() {
    let last = dlTracks.size, unchanged = 0;
    while (unchanged < 4 && !dlCancelFlag) {
      window.postMessage({ type: 'VKD_SCROLL_LOAD' }, '*');
      await sleep(750);
      const now = dlTracks.size;
      const el = document.getElementById('vmu-dl-collected');
      if (el) el.textContent = `Найдено: ${now}`;
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

    // New VK uses vkitAudioRow__root with CSS modules hash
    const modal = [...document.querySelectorAll('[class*="vkitInternalModalBox"]')]
      .find(m => m.getBoundingClientRect().width > 0);
    const container = modal || document;
    const rows = container.querySelectorAll('[class*="vkitAudioRow__root"], .AudioRow, [data-full-id]');

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

  async function runPlaylistDownload(plInfo) {
    dlCancelFlag = false;
    // Snapshot tracks already captured during popup load (early injection path)
    const preloaded = new Map(dlTracks);
    dlTracks.clear();
    window.postMessage({ type: 'VKD_RESET_DL' }, '*');

    const pageBtn = document.getElementById('vmu-dl-btn');
    if (pageBtn) pageBtn.disabled = true;

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

      // Expand and scroll popup to load all tracks
      const modal = [...document.querySelectorAll('[class*="vkitInternalModalBox"]')]
        .find(m => m.getBoundingClientRect().width > 0);
      if (modal) {
        // Click "Показать все" if present (VK hides tracks beyond first 5)
        const showAll = modal.querySelector('[class*="showAll"], [class*="ShowAll"]')
          || [...modal.querySelectorAll('a, button, [role="button"]')].find(el => {
            const t = (el.textContent || '').trim().toLowerCase();
            return t === 'показать все' || t === 'показать всё' || t === 'show all';
          });
        if (showAll) {
          showAll.click();
          await sleep(1000);
        }
        // Scroll to load virtualized tracks
        const scrollable = modal.querySelector('[class*="vkitInternalModalBoxContent"], [class*="ModalBox__content"]') || modal;
        for (let s = 0; s < 10; s++) {
          scrollable.scrollTop = scrollable.scrollHeight;
          await sleep(300);
        }
        scrollable.scrollTop = 0;
        await sleep(300);
      }

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
        const stopBtn = document.getElementById('vmu-dl-stop');
        if (stopBtn) stopBtn.style.display = 'none';
        return;
      }

      dlSetPhase(`Начинаем скачивание: ${total} треков`);
      dlSetProgress(0, total);
      console.log('[vmu] download queue:', total, 'tracks, first url:', queue[0]?.url?.substring(0, 100));

      // Phase 2 — download queue
      let done = 0, errors = 0;
      for (let i = 0; i < queue.length; i++) {
        if (dlCancelFlag) break;
        const track = queue[i];
        dlAddRow(track, 'uploading');
        dlSetPhase(`${i + 1} / ${total} — ${track.artist ? track.artist + ' — ' : ''}${track.title}`);

        const fn = dlSanitize(`${dlPad(i + 1, total)} - ${track.artist} - ${track.title}`);
        const isHls = track.url.includes('/a2/') || track.url.includes('.m3u8');
        let res;

        if (isHls) {
          // HLS: fetch m3u8 → download segments → concat → blob → download
          const hlsUrl = track.url.includes('.m3u8') ? track.url : track.url + '/index.m3u8';
          try {
            const hlsResult = await pageCall('VKD_HLS_DOWNLOAD', 'VKD_HLS_DOWNLOAD_DONE', { url: hlsUrl, trackId: track.id }, 120000);
            if (hlsResult?.ok && hlsResult.blobUrl) {
              const ext = hlsResult.ext || 'ts';
              res = await sendDlMsg(hlsResult.blobUrl, fn + '.' + ext);
            } else {
              res = { ok: false, error: hlsResult?.error || 'HLS failed' };
            }
          } catch (e) {
            res = { ok: false, error: e.message };
          }
        } else {
          // Fetch in page context (sends correct Referer + cookies), then download blob
          try {
            const fetchResult = await pageCall('VKD_FETCH_BLOB', 'VKD_FETCH_BLOB_DONE', { url: track.url, trackId: track.id }, 120000);
            if (fetchResult?.ok && fetchResult.blobUrl) {
              res = await sendDlMsg(fetchResult.blobUrl, fn + '.mp3');
            } else {
              res = { ok: false, error: fetchResult?.error || 'fetch failed' };
            }
          } catch (e) {
            res = { ok: false, error: e.message };
          }
        }

        console.log('[vmu] dl', i + 1, res?.ok ? 'OK' : ('ERR: ' + res?.error), isHls ? 'HLS' : 'direct');
        if (res?.ok) { done++; dlUpdateRow(track.id, 'done'); }
        else          { errors++; dlUpdateRow(track.id, 'error', res?.error); }
        dlSetProgress(done, total);
        await sleep(180);
      }

      const stopBtn = document.getElementById('vmu-dl-stop');
      dlSetPhase(dlCancelFlag
        ? `Остановлено — скачано ${done} из ${total}`
        : `Готово! Скачано ${done}${errors ? `, ошибок ${errors}` : ''} из ${total}`);
      if (stopBtn) stopBtn.style.display = 'none';
    } catch (err) {
      dlSetPhase('Ошибка: ' + err.message);
      console.error('[VK Multi Upload DL]', err);
    } finally {
      if (pageBtn) pageBtn.disabled = false;
    }
  }

  // ─── Single-track download on hover ──────────────────────────────────────────

  const ICON_DL_SINGLE = `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2.5a.75.75 0 0 1 .75.75v8.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 1.06-1.06l2.72 2.72V3.25A.75.75 0 0 1 10 2.5zM3.5 14.25a.75.75 0 0 1 .75.75v1.5h11.5V15a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75.75H3.5a.75.75 0 0 1-.75-.75V15a.75.75 0 0 1 .75-.75z"/></svg>`;

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
    if (!track.url) {
      // Ask injected.js (page context) to briefly trigger VK's player on this track,
      // grab the decoded URL from <audio>.src, then restore previous playback state
      try {
        const result = await pageCall('VKD_SNIFF_URL', 'VKD_SNIFF_URL_DONE', { trackId: track.id, reloadId: track.reloadId }, 12000);
        if (result?.url) track.url = result.url;
      } catch {}
    }
    if (!track.url) { showToast('Не удалось получить ссылку на трек', true); return; }

    btnEl.classList.add('vmu-single-dl-loading');
    const fn = dlSanitize(`${track.artist} - ${track.title}`);
    const isHls = track.url.includes('/a2/') || track.url.includes('.m3u8');
    let res;

    try {
      if (isHls) {
        const hlsUrl = track.url.includes('.m3u8') ? track.url : track.url + '/index.m3u8';
        const hlsResult = await pageCall('VKD_HLS_DOWNLOAD', 'VKD_HLS_DOWNLOAD_DONE', { url: hlsUrl, trackId: track.id }, 120000);
        if (hlsResult?.ok && hlsResult.blobUrl) {
          res = await sendDlMsg(hlsResult.blobUrl, fn + '.' + (hlsResult.ext || 'ts'));
        } else {
          res = { ok: false, error: hlsResult?.error || 'HLS failed' };
        }
      } else {
        const fetchResult = await pageCall('VKD_FETCH_BLOB', 'VKD_FETCH_BLOB_DONE', { url: track.url, trackId: track.id }, 120000);
        if (fetchResult?.ok && fetchResult.blobUrl) {
          res = await sendDlMsg(fetchResult.blobUrl, fn + '.mp3');
        } else {
          res = { ok: false, error: fetchResult?.error || 'fetch failed' };
        }
      }
    } catch (e) {
      res = { ok: false, error: e.message };
    }

    btnEl.classList.remove('vmu-single-dl-loading');
    if (res?.ok) {
      showToast(`${track.artist ? track.artist + ' — ' : ''}${track.title}`);
    } else {
      showToast('Ошибка: ' + (res?.error || 'unknown'), true);
    }
  }

  function makeSingleDlBtn(row, extraClass) {
    const btn = document.createElement('button');
    btn.className = 'vmu-single-dl' + (extraClass ? ' ' + extraClass : '');
    btn.innerHTML = ICON_DL_SINGLE;
    btn.title = 'Скачать';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.classList.contains('vmu-single-dl-loading')) return;
      // Read fresh — virtualized lists recycle row elements for other tracks
      const track = getTrackDataFromRow(row);
      if (!track) { showToast('Не удалось определить трек', true); return; }
      downloadSingleTrack(track, btn);
    });
    return btn;
  }

  function injectSingleDlBtn(row) {
    if (row.querySelector('.vmu-single-dl')) return;
    if (!getTrackDataFromRow(row)) return;

    // New VK: inject into buttonGroup inside actions area
    const btnGroup = row.querySelector('[class*="buttonGroup"]');
    if (btnGroup) btnGroup.prepend(makeSingleDlBtn(row, 'vmu-single-dl-vkit'));
    // Old VK: actions container appears only on hover — handled by the observer below
  }

  // Old VK: .audio_row__actions is created on row hover and removed on mouseleave —
  // inject immediately when it appears (no debounce, otherwise the hover is missed)
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
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Ask injected.js to stamp data-vmu-track on vkit rows (fiber data lives in the
  // page world), then inject buttons once attributes are in place
  function markAndInjectAll() {
    window.postMessage({ type: 'VKD_MARK_ROWS' }, '*');
    setTimeout(() => {
      const rows = document.querySelectorAll('[class*="vkitAudioRow__root"], .AudioRow, .audio_row, [data-full-id]');
      for (const row of rows) injectSingleDlBtn(row);
    }, 50);
  }

  let _dlBtnTimer = null;
  function scanAndInjectDlBtns() {
    clearTimeout(_dlBtnTimer);
    _dlBtnTimer = setTimeout(markAndInjectAll, 150);
  }

  // Dedicated watcher for popup modal — scans at 400ms and 900ms after it appears
  let _modalDlTimer1 = null, _modalDlTimer2 = null;
  new MutationObserver(muts => {
    for (const mut of muts) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== 1) continue;
        const isModal = node.matches?.('[class*="vkitInternalModalBox"]') || node.querySelector?.('[class*="vkitInternalModalBox"]');
        if (!isModal) continue;
        clearTimeout(_modalDlTimer1); clearTimeout(_modalDlTimer2);
        _modalDlTimer1 = setTimeout(markAndInjectAll, 400);
        _modalDlTimer2 = setTimeout(markAndInjectAll, 900);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  let _dupesDialogTimer = null;
  // ─── SPA watcher + dialog watcher ────────────────────────────────────────────
  let lastHref = location.href;
  new MutationObserver(() => {
    // SPA navigation: reset state
    if (location.href !== lastHref) {
      lastHref = location.href;
      _pendingDupesPlaylist = null;
      fileQueue = [];
      autoPlaylistRunning = false;
      isProcessing = false;
      uploadDoneCallback = null;
      dlTracks.clear();
      dlCancelFlag = true;
      document.getElementById('vmu-dl-backdrop')?.remove();
    }

    // Inject into VK's upload dialog whenever it appears
    const box = document.querySelector('.audio_add_box:not([data-vmu-injected])');
    if (box) injectIntoVkDialog(box);

    // Inject download button on music/playlist pages
    if (!document.getElementById('vmu-dl-btn')) tryInjectDlButton();

    // Inject dupes button into playlist edit dialog (debounced)
    clearTimeout(_dupesDialogTimer);
    _dupesDialogTimer = setTimeout(tryInjectDupesIntoEditDialog, 300);

    // Inject single-track download buttons
    scanAndInjectDlBtns();
  }).observe(document.body, { childList: true, subtree: true });
})();
