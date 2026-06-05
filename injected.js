// Runs in page context — intercepts XHR/fetch and handles file/UI injection from content script
(function () {
  if (window.__vkMultiUploadInjected) return;
  window.__vkMultiUploadInjected = true;

  const pause = ms => new Promise(r => setTimeout(r, ms));

  // ── Capture VK's own al_audio.php hashes for reuse ───────────────────────────
  window.__vmuHashes = {};
  // Callback for one-shot response capture
  let __savePlaylistCapture = null;
  // Capture audio.editPlaylist params for reorder
  let __editPlaylistCapture = null;

  function parseBodyStr(body) {
    if (body instanceof URLSearchParams) return body.toString();
    if (typeof body === 'string') return body;
    if (body instanceof FormData) return [...body.entries()].map(([k,v]) => `${k}=${v}`).join('&');
    return '';
  }

  function extractAct(bodyStr, url) {
    return bodyStr.match(/(?:^|&)act=([^&]+)/)?.[1]
      || url.match(/[?&]act=([^&]+)/)?.[1]
      || '';
  }

  function extractHash(bodyStr) {
    return bodyStr.match(/(?:^|&)hash=([^&]+)/)?.[1] || '';
  }

  // ── XHR interceptor ──────────────────────────────────────────────────────────
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._vkUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!this._vkUrl) return origSend.call(this, body);
    const url = this._vkUrl;

    // Audio file upload — match pu.vk.com, vkontakte.ru, or any upload.php endpoint
    const isUploadUrl = url.includes('pu.vk.com') || url.includes('vkontakte.ru') || url.includes('upload.php');
    if (isUploadUrl) {
      const xhr = this;
      this.addEventListener('load', () => window.postMessage({ type: 'VK_UPLOAD_DONE', response: xhr.responseText }, '*'));
      this.addEventListener('error', () => window.postMessage({ type: 'VK_UPLOAD_DONE', error: true }, '*'));
    }

    // Capture hashes from VK's own al_audio.php calls
    if (url.includes('al_audio.php')) {
      const bStr = parseBodyStr(body);
      const act = extractAct(bStr, url);
      const hash = extractHash(bStr);
      if (hash) { window.__vmuHashes[act || '_page'] = hash; window.__vmuHashes._page = hash; }

      const xhr = this;
      this.addEventListener('load', () => {
        // VK uses save_playlist on personal pages, playlists_edit_data on group pages
        if ((act === 'save_playlist' || act === 'playlists_edit_data') && __savePlaylistCapture) {
          const cb = __savePlaylistCapture;
          __savePlaylistCapture = null;
          cb(xhr.responseText);
        }
        try {
          const d = JSON.parse(xhr.responseText);
          if (d?.payload) walkForHashes(d.payload);
        } catch {}
      });
    }

    // Capture audio.editPlaylist API calls (VK's new API for saving playlists)
    if (url.includes('audio.editPlaylist')) {
      const bStr = parseBodyStr(body);
      if (__editPlaylistCapture) {
        const cb = __editPlaylistCapture;
        __editPlaylistCapture = null;
        cb(bStr);
      }
    }

    return origSend.call(this, body);
  };

  // ── Fetch interceptor ────────────────────────────────────────────────────────
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    // Audio file upload — match pu.vk.com, vkontakte.ru, or any upload.php endpoint
    const isUploadUrl = url.includes('pu.vk.com') || url.includes('vkontakte.ru') || url.includes('upload.php');
    if (isUploadUrl) {
      return origFetch.apply(this, args).then(result => {
        result.clone().text().then(text => {
          window.postMessage({ type: 'VK_UPLOAD_DONE', response: text }, '*');
        }).catch(() => window.postMessage({ type: 'VK_UPLOAD_DONE', error: true }, '*'));
        return result;
      }, err => {
        window.postMessage({ type: 'VK_UPLOAD_DONE', error: true }, '*');
        throw err;
      });
    }

    const result = await origFetch.apply(this, args);

    if (url.includes('al_audio.php')) {
      const bStr = parseBodyStr(args[1]?.body);
      const act = extractAct(bStr, url);
      const hash = extractHash(bStr);
      if (hash) { window.__vmuHashes[act || '_page'] = hash; window.__vmuHashes._page = hash; }

      result.clone().text().then(text => {
        if ((act === 'save_playlist' || act === 'playlists_edit_data') && __savePlaylistCapture) {
          const cb = __savePlaylistCapture;
          __savePlaylistCapture = null;
          cb(text);
        }
        try {
          const d = JSON.parse(text);
          if (d?.payload) walkForHashes(d.payload);
        } catch {}
      }).catch(() => {});
    }

    // Capture audio.editPlaylist API calls (VK's new API for saving playlists)
    if (url.includes('audio.editPlaylist')) {
      const bStr = parseBodyStr(args[1]?.body);
      if (__editPlaylistCapture) {
        const cb = __editPlaylistCapture;
        __editPlaylistCapture = null;
        cb(bStr);
      }
    }

    return result;
  };

  function walkForHashes(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 4) return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.length >= 25 && /^[a-zA-Z0-9_\-]+$/.test(v)) {
        if (k.includes('hash') || k.includes('Hash')) window.__vmuHashes[k] = v;
      }
      walkForHashes(v, depth + 1);
    }
  }

  // ── Message dispatcher ────────────────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    if (!e.data || e.source !== window) return;

    switch (e.data.type) {

      case 'VK_INJECT_FILE': {
        const { name, mimeType, buffer } = e.data;
        const file = new File([buffer], name, { type: mimeType || 'audio/mpeg' });
        let tries = 0;
        (function tryInject() {
          // Prefer the VK-native input (marked during embedding), fall back to any file input
          const input = document.querySelector('[data-vmu-vk="1"]') || document.querySelector('input[type="file"]');
          if (input) {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            window.postMessage({ type: 'VK_FILE_INJECTED', ok: true }, '*');
          } else if (tries++ < 20) {
            setTimeout(tryInject, 200);
          } else {
            window.postMessage({ type: 'VK_FILE_INJECTED', ok: false, error: 'input not found' }, '*');
          }
        })();
        break;
      }

      case 'VK_CREATE_PLAYLIST': {
        const { title, description, trackNames, coverBuf } = e.data;
        // Store cover as a File object so the dialog can inject it
        window.__vmuPendingCover = coverBuf
          ? new File([coverBuf], 'cover.jpg', { type: 'image/jpeg' })
          : null;
        createPlaylistViaUI(title, description, trackNames || [])
          .then(r => window.postMessage({ type: 'VK_PLAYLIST_CREATED', ok: true, ...r }, '*'))
          .catch(err => { window.__vmuPendingCover = null; window.postMessage({ type: 'VK_PLAYLIST_CREATED', ok: false, error: err.message }, '*'); });
        break;
      }

      case 'VK_GET_RECENT_AUDIOS': {
        window.postMessage({ type: 'VK_RECENT_AUDIOS', ids: getRecentAudioIdsFromDOM(e.data.count) }, '*');
        break;
      }

      // Fallback: add via al_audio.php (for editing existing playlists)
      case 'VK_ADD_TO_PLAYLIST': {
        const { ownerId, playlistId, audioIds } = e.data;
        callAlAudio('add_to_playlist', {
          owner_id: ownerId, playlist_id: playlistId, audio_ids: audioIds.join(',')
        }).then(d => window.postMessage({ type: 'VK_ADD_PLAYLIST_DONE', ok: d?.payload?.[0] === 0, data: JSON.stringify(d?.payload?.[1]).substring(0,100) }, '*'))
          .catch(err => window.postMessage({ type: 'VK_ADD_PLAYLIST_DONE', ok: false, error: err.message }, '*'));
        break;
      }

      case 'VK_REMOVE_FROM_PLAYLIST': {
        const { ownerId, playlistId, audioId } = e.data;
        callAlAudio('remove_from_playlist', {
          owner_id: ownerId, playlist_id: playlistId, audio_ids: audioId
        }).then(d => window.postMessage({ type: 'VK_REMOVE_PLAYLIST_DONE', audioId, ok: d?.payload?.[0] === 0 }, '*'))
          .catch(err => window.postMessage({ type: 'VK_REMOVE_PLAYLIST_DONE', audioId, ok: false, error: err.message }, '*'));
        break;
      }

      case 'VK_UPLOAD_COVER': {
        injectCoverFile(new File([e.data.buffer], 'cover.jpg', { type: 'image/jpeg' }));
        break;
      }
    }
  });

  // ── Create playlist via VK UI automation ─────────────────────────────────────
  // Pure ASCII/unicode-escape strings — no Cyrillic source bytes
  const LBL_CREATE  = '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442'; // \u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442
  const LBL_SAVE    = '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'; // \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c
  const LBL_ADD_AUD = 'ape_add_audios_btn';

  function findCreateBtn() {
    // Try by exact aria-label
    let btn = document.querySelector('[aria-label="' + LBL_CREATE + '"]');
    if (btn) return btn;
    // Try by button text or partial aria-label match
    for (const b of document.querySelectorAll('button')) {
      const lbl = b.getAttribute('aria-label') || '';
      const txt = b.textContent || '';
      if (lbl === LBL_CREATE || txt.trim() === LBL_CREATE) return b;
      if (lbl.indexOf('плейлист') !== -1 &&
          lbl.indexOf('Созд') !== -1) return b;
    }
    return null;
  }

  // Wait up to 8s for the button to appear (VK SPA may re-render after upload)
  function waitForCreateBtn(timeout) {
    return new Promise((resolve, reject) => {
      const btn = findCreateBtn();
      if (btn) { resolve(btn); return; }
      const deadline = Date.now() + (timeout || 8000);
      const obs = new MutationObserver(() => {
        const found = findCreateBtn();
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] });
      setTimeout(() => {
        obs.disconnect();
        const found = findCreateBtn();
        found ? resolve(found) : reject(new Error('btn_create_playlist_not_found'));
      }, deadline - Date.now());
    });
  }

  function findCropSaveBtn() {
    // Try known class names
    for (const sel of ['.photo_crop_button_save', '[class*="cropSave"]', '[class*="crop_save"]']) {
      const btn = document.querySelector(sel);
      if (btn) return btn;
    }
    // Fallback: find button with "Сохранить" text inside crop/photo dialogs
    for (const btn of document.querySelectorAll('button, .FlatButton')) {
      const txt = (btn.textContent || '').trim();
      if (txt === 'Сохранить' && btn.closest('[class*="crop"], [class*="photo_editor"], .pv_save_btn, .popup_box_container')) {
        return btn;
      }
    }
    // Last resort: any "Сохранить и продолжить" or "Сохранить" inside a popup that appeared after cover
    for (const btn of document.querySelectorAll('.popup_box_container button, .box_layout button')) {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Сохран') && btn.offsetParent !== null) return btn;
    }
    return null;
  }

  // PHASE 1: Create empty playlist (title + description + cover, no tracks)
  // PHASE 2: Open edit dialog on new playlist — ._ape_audio_item items are directly visible there
  async function createPlaylistViaUI(title, description, trackNames) {
    const createBtn = await waitForCreateBtn(8000);

    const responseText = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { __savePlaylistCapture = null; __editPlaylistCapture = null; reject(new Error('save_playlist_timeout')); }, 30000);
      const onCapture = (text) => { clearTimeout(timeout); __savePlaylistCapture = null; __editPlaylistCapture = null; resolve(text); };
      __savePlaylistCapture = onCapture;
      __editPlaylistCapture = onCapture;

      (async () => {
        createBtn.click();
        const dialog = await waitForEl('.audio_pl_edit_box', 4000);
        if (!dialog) { clearTimeout(timeout); __savePlaylistCapture = null; reject(new Error('dialog_not_opened')); return; }

        await pause(400);

        // Fill title
        const titleEl = dialog.querySelector('#ape_pl_name') || dialog.querySelector('input.ape_pl_input');
        if (titleEl) setVal(titleEl, title);

        // Fill description — use execCommand to preserve \n as real newline
        const descEl = dialog.querySelector('#ape_pl_description') || dialog.querySelector('textarea.ape_pl_input');
        if (descEl) {
          descEl.focus();
          descEl.select();
          const inserted = document.execCommand('insertText', false, description);
          if (!inserted || !descEl.value.includes('\n')) setVal(descEl, description);
          descEl.blur();
        }

        // Inject cover via .ape_cover click-intercept
        if (window.__vmuPendingCover) {
          const coverEl = dialog.querySelector('.ape_cover, ._ape_cover');
          if (coverEl) {
            const coverFile = window.__vmuPendingCover;
            window.__vmuPendingCover = null;
            await new Promise((res) => {
              let intercepted = false;
              const origClick = HTMLInputElement.prototype.click;
              HTMLInputElement.prototype.click = function () {
                if (!intercepted && this.type === 'file') {
                  intercepted = true;
                  HTMLInputElement.prototype.click = origClick;
                  const dt = new DataTransfer();
                  dt.items.add(coverFile);
                  this.files = dt.files;
                  this.dispatchEvent(new Event('change', { bubbles: true }));
                  // Wait for crop dialog and confirm it
                  let n = 0;
                  const t = setInterval(() => {
                    const cropBtn = findCropSaveBtn();
                    if (cropBtn) {
                      cropBtn.click();
                      clearInterval(t);
                      // Wait for crop to apply and cover thumbnail to update
                      let waitN = 0;
                      const waitT = setInterval(() => {
                        const coverImg = dialog.querySelector('.ape_cover img, .ape_cover [style*="background"]');
                        if (coverImg || ++waitN >= 10) { clearInterval(waitT); res(); }
                      }, 500);
                      return;
                    }
                    if (++n >= 30) { clearInterval(t); res(); }
                  }, 400);
                  return;
                }
                return origClick.call(this);
              };
              coverEl.click();
              setTimeout(() => {
                if (!intercepted) { HTMLInputElement.prototype.click = origClick; res(); }
              }, 8000);
            });
            await pause(1000);
          } else {
            window.__vmuPendingCover = null;
          }
        }

        // Save playlist (no tracks yet)
        await pause(300);
        const boxLayout = dialog.closest('.box_layout') || dialog.closest('.box_body')?.parentElement;
        const saveBtn = (boxLayout || document).querySelector('.FlatButton--primary') || document.querySelector('.FlatButton--primary');
        if (!saveBtn) { clearTimeout(timeout); __savePlaylistCapture = null; reject(new Error('save_btn_not_found')); return; }
        saveBtn.click();
      })();
    });

    // Get playlist ID: primary = find by title in DOM (data-id attr),
    // fallback = parse from network response.
    let result = null;
    for (let i = 0; i < 12; i++) {
      result = findPlaylistInDOMByTitle(title) || parsePlaylistIdFromResponse(responseText);
      if (result) break;
      await pause(500);
    }
    if (!result) throw new Error('playlist_id_not_found');
    console.log('[vmu] Playlist created:', result.ownerId, result.playlistId);

    // PHASE 2: Add tracks via UI.
    if (trackNames.length > 0) {
      if (typeof window.nav?.reload === 'function') {
        console.log('[vmu] SPA reload to reset APE state...');
        window.nav.reload();
        await pause(3000);
      }
      await addTracksViaEditDialog(title, result.playlistId, trackNames);
    }

    return result;
  }

  // Find edit button near a playlist cell element
  function findEditBtnInCell(cell) {
    if (!cell) return null;
    // data-testid variant (new VK)
    let btn = cell.querySelector('[data-testid="MusicPlaylistItem_OpenEditing"]');
    if (btn) return btn;
    // Class-based variants
    btn = cell.querySelector('.audio_pl__edit, .audio_pl_actions__edit, [class*="edit"]');
    if (btn) return btn;
    // aria-label containing "редакт" (case-insensitive)
    for (const b of cell.querySelectorAll('button, [role="button"]')) {
      const lbl = (b.getAttribute('aria-label') || b.title || b.textContent || '').toLowerCase();
      if (lbl.includes('редакт')) return b; // "редакт"
    }
    return null;
  }

  // Open edit dialog for the newly created playlist and select tracks by name
  async function addTracksViaEditDialog(playlistTitle, playlistId, trackNames) {
    // Wait for new playlist to appear in DOM (VK SPA updates after save)
    let editBtn = null;
    for (let i = 0; i < 20; i++) {
      await pause(600);

      // Find by title text
      for (const el of document.querySelectorAll('[data-testid="MusicPlaylistItem_Title"], .audio_pl__title, .audio_pl_item__title')) {
        if (el.textContent?.trim().includes(playlistTitle.substring(0, 8))) {
          const cell = el.closest('[data-testid="MusicPlaylistItem_Cell"], .audio_pl_item, .audio_pl') || el.parentElement?.parentElement;
          const btn = findEditBtnInCell(cell);
          if (btn) { editBtn = btn; break; }
        }
      }
      if (editBtn) break;

      // Fallback: find by playlist ID in any link/href
      for (const link of document.querySelectorAll('[href*="_' + playlistId + '"]')) {
        const cell = link.closest('[data-testid="MusicPlaylistItem_Cell"], .audio_pl_item, .audio_pl') || link.parentElement?.parentElement;
        const btn = findEditBtnInCell(cell);
        if (btn) { editBtn = btn; break; }
      }
      if (editBtn) break;
    }

    if (!editBtn) {
      console.warn('[vmu] addTracksViaEditDialog: edit button not found for playlist', playlistId, playlistTitle);
      return;
    }

    console.log('[vmu] Opening edit dialog for playlist', playlistId);
    editBtn.click();
    const dialog = await waitForEl('.audio_pl_edit_box', 4000);
    if (!dialog) { console.warn('[vmu] Edit dialog not opened'); return; }

    // Give VK time to attach event handlers to the dialog
    await pause(1000);

    // Must click ape_add_audios_btn to reveal ._ape_audio_item list.
    const addAudiosBtn = dialog.querySelector('.ape_add_audios_btn');
    if (!addAudiosBtn) { console.warn('[vmu] ape_add_audios_btn not found in edit dialog'); return; }

    let items = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log('[vmu] ape_add_audios_btn click attempt', attempt);
      addAudiosBtn.click();
      items = await waitForItems(dialog, 1, 3000);
      if (items.length > 0) { console.log('[vmu] Items appeared after attempt', attempt); break; }
      if (attempt < 3) await pause(1000);
    }

    if (!items.length) { console.warn('[vmu] No ._ape_audio_item after 3 attempts'); return; }
    console.log('[vmu] Found', items.length, '._ape_audio_item items, matching by name...');

    // Match tracks by name instead of just taking first N
    await selectTracksByName(items, trackNames);

    await pause(300);

    // Set up capture for the audio.editPlaylist call that fires on save
    const editPlaylistBody = await new Promise((resolve) => {
      __editPlaylistCapture = (body) => resolve(body);
      // Also set a timeout in case VK uses the old al_audio.php path
      setTimeout(() => resolve(null), 10000);

      // Must click Сохранить — without it tracks are NOT persisted
      const boxLayout = dialog.closest('.box_layout') || dialog.closest('.box_body')?.parentElement;
      const saveBtn = (boxLayout || document).querySelector('.FlatButton--primary') || document.querySelector('.FlatButton--primary');
      if (!saveBtn) { console.warn('[vmu] Save button not found in edit dialog'); __editPlaylistCapture = null; resolve(null); return; }
      console.log('[vmu] Clicking Save');
      saveBtn.click();
    });

    await pause(1500);

    // Reorder tracks to match album order
    if (editPlaylistBody && trackNames.length > 1) {
      await reorderPlaylistTracks(editPlaylistBody, trackNames);
      await pause(1000);
    }
  }

  // Wait for ._ape_audio_item elements to appear in dialog
  function waitForItems(dialog, minCount, timeout) {
    return new Promise(resolve => {
      const check = () => {
        const items = [...dialog.querySelectorAll('._ape_audio_item')];
        if (items.length >= minCount || items.length > 0) { resolve(items); return; }
        const obs = new MutationObserver(() => {
          const found = [...dialog.querySelectorAll('._ape_audio_item')];
          if (found.length > 0) { obs.disconnect(); clearTimeout(t); resolve(found); }
        });
        obs.observe(dialog, { childList: true, subtree: true });
        const t = setTimeout(() => { obs.disconnect(); resolve([...dialog.querySelectorAll('._ape_audio_item')]); }, timeout);
      };
      check();
    });
  }

  function normalizeStr(s) {
    return (s || '').toLowerCase().replace(/[\s\-–—_.,:;!?'"()[\]{}]+/g, ' ').trim();
  }

  function getItemText(item) {
    const titleEl = item.querySelector('.audio_row__title_inner, .ai_title, [class*="audio_title"]');
    const artistEl = item.querySelector('.audio_row__performers, .ai_artist, [class*="audio_artist"]');
    const title = normalizeStr(titleEl?.textContent || '');
    const artist = normalizeStr(artistEl?.textContent || '');
    // Also try full text if selectors don't match
    const fullText = normalizeStr(item.textContent || '');
    return { title, artist, fullText };
  }

  function trackMatchesItem(trackName, itemText) {
    const tTitle = normalizeStr(trackName.title);
    const tArtist = normalizeStr(trackName.artist);

    // Exact match on title
    if (tTitle && itemText.title && itemText.title.includes(tTitle)) return true;
    if (tTitle && itemText.fullText.includes(tTitle)) {
      // If we have artist, verify it too
      if (tArtist) {
        return itemText.artist.includes(tArtist) || itemText.fullText.includes(tArtist);
      }
      return true;
    }
    // Partial: check if significant portion of the title is in the item
    if (tTitle.length > 4) {
      const words = tTitle.split(' ').filter(w => w.length > 2);
      const matchedWords = words.filter(w => itemText.fullText.includes(w));
      if (matchedWords.length >= Math.ceil(words.length * 0.7)) return true;
    }
    return false;
  }

  // Reorder audio_ids to match trackNames order, then send audio.editPlaylist
  async function reorderPlaylistTracks(capturedBody, trackNames) {
    if (!capturedBody || !trackNames.length) return;

    // Parse captured params
    const params = {};
    capturedBody.split('&').forEach(pair => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        params[decodeURIComponent(pair.substring(0, eqIdx))] = decodeURIComponent(pair.substring(eqIdx + 1));
      }
    });

    const audioIdsStr = params.audio_ids;
    if (!audioIdsStr) { console.warn('[vmu] No audio_ids in captured editPlaylist call'); return; }

    // Parse audio_ids: "ownerID_audioID_hash,ownerID_audioID_hash,..."
    const audioEntries = audioIdsStr.split(',').map(entry => {
      const parts = entry.split('_');
      // Format: ownerID_audioID_hash (e.g. -206614096_456239638_b332ffe4664ae5ed82)
      return { full: entry, ownerId: parts[0], audioId: parts[1], hash: parts.slice(2).join('_') };
    });

    // We need to find the title/artist for each audio ID to match with trackNames
    // Look them up in the DOM - they were just visible in the edit dialog
    const audioIdToName = {};
    document.querySelectorAll('._audio_row').forEach(row => {
      const cls = row.className;
      const match = cls.match(/_audio_row_(-?\d+_\d+)/);
      if (match) {
        const titleEl = row.querySelector('.audio_row__title_inner, .ai_title');
        const artistEl = row.querySelector('.audio_row__performers, .ai_artist');
        audioIdToName[match[1]] = {
          title: normalizeStr(titleEl?.textContent || ''),
          artist: normalizeStr(artistEl?.textContent || ''),
          fullText: normalizeStr(row.textContent || '')
        };
      }
    });

    // Build ordered audio_ids based on trackNames
    const orderedEntries = [];
    const used = new Set();

    for (const trackName of trackNames) {
      let bestEntry = null;
      for (const entry of audioEntries) {
        const key = entry.ownerId + '_' + entry.audioId;
        if (used.has(key)) continue;
        const nameInfo = audioIdToName[key];
        if (nameInfo && trackMatchesItem(trackName, nameInfo)) {
          bestEntry = entry;
          used.add(key);
          break;
        }
      }
      if (bestEntry) orderedEntries.push(bestEntry);
    }

    // Add any remaining entries not matched (shouldn't happen, but just in case)
    for (const entry of audioEntries) {
      const key = entry.ownerId + '_' + entry.audioId;
      if (!used.has(key)) orderedEntries.push(entry);
    }

    const newAudioIds = orderedEntries.map(e => e.full).join(',');
    if (newAudioIds === audioIdsStr) {
      console.log('[vmu] Track order already correct, no reorder needed');
      return;
    }

    console.log('[vmu] Reordering tracks via audio.editPlaylist...');

    // Send the reorder request
    const formData = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === 'audio_ids') formData.append(k, newAudioIds);
      else formData.append(k, v);
    }

    try {
      const resp = await origFetch('https://api.vk.com/method/audio.editPlaylist?' + new URLSearchParams({v: '5.280', client_id: '6287487'}).toString(), {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      console.log('[vmu] Reorder result:', data.response ? 'success' : 'error', data);
    } catch (err) {
      console.error('[vmu] Reorder failed:', err);
    }
  }

  // Select tracks by matching names in album order (first track in trackNames = first clicked)
  async function selectTracksByName(items, trackNames) {
    // Build text map for all items
    const itemTexts = items.map(item => ({ item, text: getItemText(item) }));

    let selectedCount = 0;
    // Click in album order (trackNames is already in correct order)
    for (const trackName of trackNames) {
      let matched = null;
      for (const { item, text } of itemTexts) {
        if (item.classList.contains('ape_selected')) continue;
        if (trackMatchesItem(trackName, text)) {
          matched = item;
          break;
        }
      }
      if (matched) {
        const chk = matched.querySelector('.ape_check') || matched;
        chk.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        selectedCount++;
        await pause(100);
      } else {
        console.warn('[vmu] Track not found in list:', trackName.artist, '-', trackName.title);
      }
    }
    console.log('[vmu] Selected', selectedCount, 'of', trackNames.length, 'tracks by name');
  }

  // Primary: find newly created playlist by title in DOM.
  // MusicPlaylistItem_Cell has data-id="ownerId_playlistId" (e.g. "-206614096_32").
  function findPlaylistInDOMByTitle(title) {
    if (!title) return null;
    const prefix = title.substring(0, 12).toLowerCase();
    const ownerMatch = location.href.match(/audios(-?\d+)/);
    const ownerId = ownerMatch ? ownerMatch[1] : String(window.vk?.id || '');
    for (const cell of document.querySelectorAll('[data-testid="MusicPlaylistItem_Cell"][data-id]')) {
      const cellTitle = cell.querySelector('[data-testid="MusicPlaylistItem_Title"]')?.textContent?.trim().toLowerCase() || '';
      if (cellTitle.includes(prefix)) {
        const m = cell.getAttribute('data-id')?.match(/^([-\d]+)_(\d+)$/);
        if (m) return { ownerId: m[1], playlistId: parseInt(m[2]) };
      }
    }
    return null;
  }

  // Fallback: parse playlist ID from network response text.
  function parsePlaylistIdFromResponse(responseText) {
    const ownerMatch = location.href.match(/audios(-?\d+)/);
    const ownerId = ownerMatch ? ownerMatch[1] : String(window.vk?.id || '');
    try {
      const data = JSON.parse(responseText);
      const p1 = data?.payload?.[1];
      // Look for a key named "id", "playlist_id", or similar first
      const findById = (v, depth = 0) => {
        if (depth > 5 || !v || typeof v !== 'object') return null;
        for (const [k, val] of Object.entries(v)) {
          if ((k === 'id' || k === 'playlist_id') && typeof val === 'number' && val > 0 && val < 10_000_000) return val;
          const found = findById(val, depth + 1);
          if (found) return found;
        }
        return null;
      };
      const playlistId = findById(Array.isArray(p1) ? p1[0] : p1);
      if (playlistId) return { playlistId, ownerId };
    } catch {}
    // Last resort: find newest cell in DOM
    const first = document.querySelector('[data-testid="MusicPlaylistItem_Cell"][data-id]');
    const m = first?.getAttribute('data-id')?.match(/^([-\d]+)_(\d+)$/);
    if (m) return { ownerId: m[1], playlistId: parseInt(m[2]) };
    return null;
  }

  // ── Get recent audio IDs from page DOM ────────────────────────────────────────
  function getRecentAudioIdsFromDOM(count) {
    const ids = [];
    const seen = new Set();

    // VK audio rows: .audio_row[data-full-id="ownerId_audioId"]
    for (const el of document.querySelectorAll('[data-full-id]')) {
      const id = el.dataset.fullId;
      if (!id || seen.has(id)) continue;
      // Skip: system/fake IDs starting with -200
      const [ownerId] = id.split('_');
      if (ownerId.startsWith('-200')) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= count) break;
    }

    // Fallback: audio links /audio{owner}_{id}
    if (!ids.length) {
      for (const link of document.querySelectorAll('a[href^="/audio"]')) {
        const m = link.href.match(/\/audio(-?\d+)_(\d+)/);
        if (!m || m[1].startsWith('-200')) continue;
        const id = `${m[1]}_${m[2]}`;
        if (!seen.has(id)) { seen.add(id); ids.push(id); }
        if (ids.length >= count) break;
      }
    }

    return ids;
  }

  // ── al_audio.php direct call (uses captured hashes) ──────────────────────────
  async function callAlAudio(act, params) {
    const hash = window.__vmuHashes[act] || window.__vmuHashes._page || getPageHashFromDOM();
    if (!hash) throw new Error('Хэш не найден');
    const body = new URLSearchParams({ act, al: '1', hash, ...params });
    const res = await origFetch('/al_audio.php', { method: 'POST', body, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const text = await res.text();
    return JSON.parse(text);
  }

  function getPageHashFromDOM() {
    for (const s of document.querySelectorAll('script:not([src])')) {
      const m = s.textContent.match(/"hash"\s*:\s*"([a-zA-Z0-9_\-]{30,70})"/);
      if (m) return m[1];
    }
    return null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function setVal(el, value) {
    // Works for both React and old VK inputs
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function waitForEl(selector, timeout) {
    return new Promise(resolve => {
      const el = document.querySelector(selector);
      if (el) { resolve(el); return; }
      const obs = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
    });
  }

  // ── Cover upload via file input intercept ─────────────────────────────────────
  function injectCoverFile(coverFile) {
    const coverEl = document.querySelector('.ape_cover');
    if (!coverEl) { window.postMessage({ type: 'VK_COVER_DONE', ok: false, error: 'ape_cover не найден' }, '*'); return; }

    let intercepted = false;
    const origClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (!intercepted && this.type === 'file') {
        intercepted = true;
        HTMLInputElement.prototype.click = origClick;
        const dt = new DataTransfer();
        dt.items.add(coverFile);
        this.files = dt.files;
        this.dispatchEvent(new Event('change', { bubbles: true }));
        watchCropAndConfirm();
        return;
      }
      return origClick.call(this);
    };

    coverEl.click();
    setTimeout(() => {
      if (!intercepted) { HTMLInputElement.prototype.click = origClick; window.postMessage({ type: 'VK_COVER_DONE', ok: false, error: 'input не появился' }, '*'); }
    }, 4000);
  }

  function watchCropAndConfirm() {
    let n = 0;
    const t = setInterval(() => {
      const btn = findCropSaveBtn();
      if (btn) { btn.click(); clearInterval(t); setTimeout(() => window.postMessage({ type: 'VK_COVER_DONE', ok: true }, '*'), 2000); return; }
      if (++n >= 25) { clearInterval(t); window.postMessage({ type: 'VK_COVER_DONE', ok: true }, '*'); }
    }, 400);
  }
})();
