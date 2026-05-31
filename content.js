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
  const ICON_SETTINGS = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.4"/>
    <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.36 3.64l-1.06 1.06M4.7 11.3l-1.06 1.06M12.36 12.36l-1.06-1.06M4.7 4.7L3.64 3.64" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
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
  let settings = { autoPlaylist: false, coverDataUrl: null };

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
      }));
    } catch {}
  }

  loadSettings();

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
    const m1 = url.match(/playlist\/([-\d]+)_(\d+)/);
    if (m1) return { ownerId: m1[1], playlistId: m1[2] };
    const m2 = url.match(/playlist_id=(\d+)/);
    const m3 = url.match(/[?&]owner_id=([-\d]+)/);
    if (m2 && m3) return { ownerId: m3[1], playlistId: m2[1] };
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

  async function scanForDuplicates() {
    const pl = getPlaylistInfoFromUrl();
    if (!pl) {
      setPlaylistStatus('Перейдите на страницу плейлиста для поиска дубликатов', true);
      return;
    }

    setPlaylistStatus('Читаем треки со страницы…');

    try {
      // Primary: read from DOM (user is on the playlist page)
      let tracks = getTracksFromDOM();

      // If DOM is empty, try al_audio.php load_section
      if (!tracks.length) {
        setPlaylistStatus('Загружаем через API…');
        try {
          const result = await pageCall('VK_LOAD_PLAYLIST', 'VK_PLAYLIST_LOADED', {
            ownerId: pl.ownerId,
            playlistId: pl.playlistId,
            offset: 0,
          }, 10000);
          // Parse the raw response if possible
          try {
            const raw = JSON.parse(result.raw || '{}');
            const list = raw?.payload?.[1];
            if (Array.isArray(list)) {
              tracks = parseTracksFromPayload(list);
            }
          } catch {}
        } catch (apiErr) {
          setPlaylistStatus(`Не удалось загрузить треки: ${apiErr.message}`, true);
          return;
        }
      }

      if (!tracks.length) {
        setPlaylistStatus('Треки не найдены — откройте страницу плейлиста', true);
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
        setPlaylistStatus(`Дубликаты не найдены в ${tracks.length} треках ✓`);
        return;
      }

      setPlaylistStatus(`Найдено ${dupes.length} дубликатов из ${tracks.length} треков`);
      showDupesDialog(dupes, pl.ownerId, pl.playlistId);
    } catch (err) {
      setPlaylistStatus(`Ошибка: ${err.message}`, true);
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
              <span class="vmu-setting-label">Дубликаты</span>
              <span class="vmu-setting-hint">${getPlaylistInfoFromUrl() ? 'Текущий плейлист' : 'Откройте страницу плейлиста'}</span>
            </div>
            <button id="vmu-scan-dupes" class="vmu-scan-btn" ${getPlaylistInfoFromUrl() ? '' : 'disabled'}>Найти</button>
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

    const scanBtn = document.getElementById('vmu-scan-dupes');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => scanForDuplicates());
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

  // ─── modal ───────────────────────────────────────────────────────────────────
  function openModal() {
    if (!document.getElementById('vmu-backdrop')) buildModal();
    document.getElementById('vmu-backdrop').style.display = 'flex';
    renderQueue();
  }

  function closeModal() {
    const el = document.getElementById('vmu-backdrop');
    if (el) el.style.display = 'none';
    settingsPanelOpen = false;
    const panel = document.getElementById('vmu-settings-panel');
    if (panel) panel.style.display = 'none';
  }

  function buildModal() {
    const wrap = document.createElement('div');
    wrap.id = 'vmu-backdrop';
    wrap.innerHTML = `
      <div id="vmu-modal">
        <div id="vmu-header">
          <span id="vmu-title">Загрузить несколько треков</span>
          <div style="display:flex;align-items:center;gap:6px">
            <button id="vmu-settings-btn" title="Настройки">${ICON_SETTINGS}</button>
            <button id="vmu-close">${ICON_CLOSE}</button>
          </div>
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
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', e => { if (e.target === wrap) closeModal(); });
    document.getElementById('vmu-close').addEventListener('click', closeModal);
    document.getElementById('vmu-settings-btn').addEventListener('click', toggleSettings);

    document.getElementById('vmu-clear').addEventListener('click', () => {
      fileQueue = fileQueue.filter(f => f.status === 'uploading' || f.status === 'pending');
      renderQueue();
    });

    document.getElementById('vmu-input').addEventListener('change', e => {
      addFiles([...e.target.files]);
      e.target.value = '';
    });

    const dz = document.getElementById('vmu-dropzone');
    const modal = document.getElementById('vmu-modal');
    let dragCounter = 0;
    modal.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; dz.classList.add('vmu-over'); });
    modal.addEventListener('dragleave', e => { e.preventDefault(); dragCounter--; if (dragCounter <= 0) { dragCounter = 0; dz.classList.remove('vmu-over'); } });
    modal.addEventListener('dragover', e => e.preventDefault());
    modal.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0; dz.classList.remove('vmu-over');
      addFiles([...e.dataTransfer.files].filter(isMP3));
    });
    wrap.addEventListener('dragover', e => e.preventDefault());
    wrap.addEventListener('drop', e => { e.preventDefault(); });

    document.getElementById('vmu-list').addEventListener('click', e => {
      const btn = e.target.closest('.vmu-retry-btn');
      if (btn) retryOne(parseInt(btn.dataset.idx, 10));
    });

    document.getElementById('vmu-footer').addEventListener('click', e => {
      if (e.target.closest('#vmu-copy-failed')) copyFailed();
      else if (e.target.closest('#vmu-retry-all')) retryAll();
    });

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
      await uploadOne(next.file);
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

  async function uploadOne(file) {
    // Wait for any previous upload dialog to fully close
    for (let i = 0; i < 10; i++) {
      const oldInput = document.querySelector('input[type="file"][accept*="mp3"]');
      if (!oldInput) break;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(300);
    }

    const btn = getVkBtn();
    if (!btn) throw new Error('Кнопка загрузки не найдена');
    btn.click();

    const input = await waitForElement('input[type="file"][accept*="mp3"]', 5000);
    if (!input) throw new Error('Диалог ВК не открылся');

    await sleep(500);

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

    // Close the dialog and wait until it's actually gone
    for (let i = 0; i < 15; i++) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(300);
      if (!document.querySelector('input[type="file"][accept*="mp3"]')) break;
    }

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout загрузки (90s)')), 90_000);
      uploadDoneCallback = data => {
        clearTimeout(t);
        if (data.error) { reject(new Error('Ошибка сети')); return; }
        try {
          const r = JSON.parse(data.response);
          r.error_code ? reject(new Error(`VK ${r.error_code}: ${r.error_msg}`)) : resolve(r);
        } catch { resolve(); }
      };
    });

    await sleep(2000);
  }

  // ─── tooltip ──────────────────────────────────────────────────────────────────
  function ensureTooltip() {
    let tip = document.getElementById('vmu-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'vmu-tooltip';
      tip.textContent = 'Загрузить несколько треков';
      document.body.appendChild(tip);
    }
    return tip;
  }

  let tooltipTimer = null;

  function showTooltip(anchorEl) {
    const tip = ensureTooltip();
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      const r = anchorEl.getBoundingClientRect();
      tip.style.left = Math.round(r.left + r.width / 2 - tip.offsetWidth / 2) + 'px';
      tip.style.top  = Math.round(r.bottom + 14) + 'px';
      tip.classList.add('vmu-tooltip-visible');
      requestAnimationFrame(() => {
        tip.style.left = Math.round(r.left + r.width / 2 - tip.offsetWidth / 2) + 'px';
      });
    }, 300);
  }

  function hideTooltip() {
    clearTimeout(tooltipTimer);
    document.getElementById('vmu-tooltip')?.classList.remove('vmu-tooltip-visible');
  }

  // ─── trigger button ───────────────────────────────────────────────────────────
  function injectTrigger() {
    if (document.getElementById('vmu-trigger')) return;
    const vkBtn = getVkBtn();
    if (!vkBtn) return;

    const btn = document.createElement('button');
    btn.id = 'vmu-trigger';
    btn.innerHTML = ICON_TRIGGER;
    btn.addEventListener('click', e => { e.stopPropagation(); hideTooltip(); openModal(); });
    btn.addEventListener('mouseenter', () => showTooltip(btn));
    btn.addEventListener('mouseleave', hideTooltip);

    vkBtn.insertAdjacentElement('afterend', btn);
  }

  // ─── SPA watcher ─────────────────────────────────────────────────────────────
  let lastHref = location.href;
  new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      document.getElementById('vmu-trigger')?.remove();
      closeModal();
    }
    injectTrigger();
  }).observe(document.body, { childList: true, subtree: true });

  injectTrigger();
  setTimeout(injectTrigger, 500);
  setTimeout(injectTrigger, 1500);
  setTimeout(injectTrigger, 3000);
})();
