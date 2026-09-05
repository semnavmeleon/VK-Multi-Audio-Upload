// Service worker — handles chrome.downloads calls for playlist download feature,
// and resolving SoundCloud links to direct, downloadable audio URLs.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'VKD_DOWNLOAD') {
    let { url, filename, folder } = msg;

    // Normalize protocol-relative URLs (//cs*.vkuserdata.com/...)
    if (url?.startsWith('//')) url = 'https:' + url;

    if (!url?.startsWith('http') && !url?.startsWith('blob:')) {
      console.warn('[vmu] bad url:', url?.substring(0, 80));
      sendResponse({ ok: false, error: 'bad url: ' + (url?.substring(0, 60) || 'null') });
      return false;
    }

    console.log('[vmu] downloading:', url.substring(0, 100));

    chrome.downloads.download(
      {
        url,
        filename: `${folder || 'VK Music'}/${filename}`,
        conflictAction: 'uniquify',
      },
      id => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message;
          console.warn('[vmu] download error:', err, url.substring(0, 80));
          sendResponse({ ok: false, error: err });
        } else {
          sendResponse({ ok: true, id });
        }
      }
    );
    return true; // keep message channel open for async callback
  }

  if (msg.type === 'VKD_SC_RESOLVE') {
    resolveSoundCloud(msg.url)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (msg.type === 'VKD_GENIUS_SEARCH') {
    geniusSearch(msg.query)
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (msg.type === 'VKD_GENIUS_TRACKS') {
    geniusAlbumTracks(msg.albumId, msg.albumUrl)
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (msg.type === 'VKD_FETCH_IMAGE') {
    fetchImageAsDataUrl(msg.url)
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (msg.type === 'VKD_SCAN_PLAYLISTS') {
    scanPlaylistsInHiddenTab(msg.url)
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  return false;
});

// ─── SoundCloud resolving ──────────────────────────────────────────────────
// SoundCloud's public site is backed by a private API that requires a
// `client_id` query param. There's no official way to obtain one — it's
// pulled out of the JS bundle the soundcloud.com homepage loads, same trick
// every third-party SoundCloud downloader uses. Cached in memory + storage
// so we don't re-scrape on every download; re-fetched on the first 401.
let scClientIdCache = null;

async function getCachedClientId() {
  if (scClientIdCache) return scClientIdCache;
  const stored = await chrome.storage.local.get('scClientId');
  if (stored.scClientId) {
    scClientIdCache = stored.scClientId;
    return scClientIdCache;
  }
  return null;
}

async function fetchFreshClientId() {
  const homeRes = await fetch('https://soundcloud.com/', { credentials: 'omit' });
  if (!homeRes.ok) throw new Error('soundcloud.com unreachable (' + homeRes.status + ')');
  const html = await homeRes.text();
  const scriptUrls = [...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  if (!scriptUrls.length) throw new Error('no SoundCloud asset scripts found');

  // The client_id lives in one specific bundle — try from the end, that's
  // usually where the smaller app-shell bundles (as opposed to vendor libs)
  // are listed.
  for (const scriptUrl of scriptUrls.reverse()) {
    const jsRes = await fetch(scriptUrl, { credentials: 'omit' });
    if (!jsRes.ok) continue;
    const js = await jsRes.text();
    const m = js.match(/client_id\s*:\s*"([a-zA-Z0-9]+)"/) || js.match(/client_id=([a-zA-Z0-9]+)/);
    if (m) return m[1];
  }
  throw new Error('client_id not found in SoundCloud bundles');
}

async function getClientId(forceRefresh) {
  if (!forceRefresh) {
    const cached = await getCachedClientId();
    if (cached) return cached;
  }
  const id = await fetchFreshClientId();
  scClientIdCache = id;
  await chrome.storage.local.set({ scClientId: id });
  return id;
}

async function scApiGet(path, clientId) {
  const sep = path.includes('?') ? '&' : '?';
  return fetch(`${path}${sep}client_id=${clientId}`, { credentials: 'omit' });
}

function scSanitize(name) {
  return (name || '').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

// Picks the best transcoding we can turn into a plain downloadable URL —
// progressive (a single signed mp3 URL) only. HLS transcodings need an
// m3u8 fetch + segment stitching we don't do for SoundCloud, so tracks that
// only expose HLS are reported as unsupported rather than silently skipped.
function pickProgressiveTranscoding(track) {
  const transcodings = track?.media?.transcodings || [];
  return transcodings.find(t => t.format?.protocol === 'progressive') || null;
}

async function resolveStreamUrl(transcodingUrl, clientId) {
  const res = await scApiGet(transcodingUrl, clientId);
  if (res.status === 401) return { unauthorized: true };
  if (!res.ok) return { error: `stream lookup failed (${res.status})` };
  const data = await res.json();
  return { streamUrl: data.url };
}

async function trackToDescriptor(track, clientId) {
  const artist = track.publisher_metadata?.artist || track.user?.username || 'Unknown';
  const title = track.title || 'Untitled';
  const transcoding = pickProgressiveTranscoding(track);
  if (!transcoding) {
    return { ok: false, title, artist, error: 'нет прямого mp3-потока (только HLS)' };
  }
  const streamRes = await resolveStreamUrl(transcoding.url, clientId);
  if (streamRes.unauthorized) return { ok: false, title, artist, error: 'unauthorized', retry: true };
  if (streamRes.error || !streamRes.streamUrl) return { ok: false, title, artist, error: streamRes.error || 'no stream url' };
  return {
    ok: true,
    title,
    artist,
    filename: scSanitize(`${artist} - ${title}`) + '.mp3',
    url: streamRes.streamUrl,
  };
}

// Batch-fetches full track objects for playlist entries that only came back
// as stubs (id only) in the playlist's own resolve response.
async function fetchFullTracks(ids, clientId) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const res = await scApiGet(`https://api-v2.soundcloud.com/tracks?ids=${chunk.join(',')}`, clientId);
    if (!res.ok) continue;
    out.push(...await res.json());
  }
  return out;
}

// Share links (on.soundcloud.com/xxx, snd.sc/xxx) 302-redirect to the real
// soundcloud.com/user/track URL — the resolve API 404s if given the short
// link directly, so we need the real URL first. soundcloud.com URLs already
// at their canonical host are passed through untouched (no extra request).
async function canonicalizeUrl(url) {
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return url; }
  if (hostname === 'soundcloud.com') return url;
  try {
    const res = await fetch(url, { redirect: 'follow', credentials: 'omit' });
    return res.url || url;
  } catch {
    return url;
  }
}

async function resolveSoundCloud(rawUrl) {
  if (!/^https?:\/\/([a-z0-9-]+\.)?(soundcloud\.com|snd\.sc)\//i.test(rawUrl || '')) {
    return { ok: false, error: 'это не похоже на ссылку soundcloud.com' };
  }

  const url = await canonicalizeUrl(rawUrl);

  let clientId = await getClientId(false);
  let resolveRes = await scApiGet(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}`, clientId);

  if (resolveRes.status === 401) {
    // Cached client_id died (SoundCloud rotates them) — fetch a fresh one once.
    clientId = await getClientId(true);
    resolveRes = await scApiGet(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}`, clientId);
  }

  if (resolveRes.status === 404) return { ok: false, error: `трек/сет не найден (удалён или приватный) — проверялась ссылка: ${url}` };
  if (!resolveRes.ok) return { ok: false, error: `SoundCloud API вернул ${resolveRes.status}` };

  const data = await resolveRes.json();

  let rawTracks;
  if (data.kind === 'track') {
    rawTracks = [data];
  } else if (data.kind === 'playlist' || data.kind === 'system-playlist') {
    const stubs = (data.tracks || []).filter(t => !t.media);
    const full = (data.tracks || []).filter(t => t.media);
    const fetched = stubs.length ? await fetchFullTracks(stubs.map(t => t.id), clientId) : [];
    rawTracks = [...full, ...fetched];
  } else {
    return { ok: false, error: `неподдерживаемый тип ссылки: ${data.kind || 'unknown'}` };
  }

  if (!rawTracks.length) return { ok: false, error: 'треки не найдены' };

  const descriptors = [];
  for (const t of rawTracks) {
    let d = await trackToDescriptor(t, clientId);
    if (d.retry) {
      clientId = await getClientId(true);
      d = await trackToDescriptor(t, clientId);
    }
    descriptors.push(d);
  }

  const tracks = descriptors.filter(d => d.ok);
  const failed = descriptors.filter(d => !d.ok);
  if (!tracks.length) {
    return { ok: false, error: failed[0]?.error || 'не удалось получить ни одного трека' };
  }
  return { ok: true, tracks, failedCount: failed.length };
}

// ─── Genius (playlist "sort as Genius tracklist" source) ────────────────────
// Genius's own site talks to its unofficial genius.com/api/* endpoints
// (distinct from the documented, API-key-gated api.genius.com) — same calls
// the album page's own React app makes, unauthenticated, no key needed. A
// bare service-worker fetch to them has no real page behind it though (no
// referrer, no cookies a returning visitor would have, nothing a bot-check
// could see as "a browser actually visited this"), which risks Genius
// rate-limiting or blocking it. So instead every Genius request opens the
// real page in a background window (minimized, unfocused — never steals
// focus from VK) and runs the fetch/DOM-read *inside that page's own
// context* via chrome.scripting.executeScript, indistinguishable from an
// ordinary visitor's browser, then closes the window again.

// Resolves once `tabId` finishes loading (or immediately if it already has).
function waitForTabComplete(tabId, timeoutMs = 15000) {
  return chrome.tabs.get(tabId).then(tab => {
    if (tab.status === 'complete') return;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = fn => {
        if (done) return;
        done = true;
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timer);
        fn();
      };
      const listener = (id, info) => {
        if (id === tabId && info.status === 'complete') finish(resolve);
      };
      chrome.tabs.onUpdated.addListener(listener);
      const timer = setTimeout(() => finish(() => reject(new Error('hidden_page_load_timeout'))), timeoutMs);
    });
  });
}

// Opens `url` in a minimized, unfocused window, waits for it to finish
// loading, then runs `func(...args)` inside that page and closes the window
// either way. `func` runs in an isolated world with no closure over this
// file's scope (chrome.scripting.executeScript constraint) — it must be
// self-contained and resolve to {ok:true, data} or {ok:false, error} itself,
// since a thrown error inside it isn't distinguishable from other
// executeScript rejection shapes.
async function runInGeniusPage(url, func, args = []) {
  const win = await chrome.windows.create({ url, focused: false, state: 'minimized', type: 'popup' });
  // 'minimized' at creation time is unreliable on some platforms — reassert it.
  await chrome.windows.update(win.id, { state: 'minimized', focused: false }).catch(() => {});
  const tabId = win.tabs?.[0]?.id;
  try {
    if (!tabId) throw new Error('genius_window_no_tab');
    await waitForTabComplete(tabId);
    const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
    const value = injection?.result;
    if (!value) throw new Error('genius_no_result');
    if (!value.ok) throw new Error(value.error || 'genius_page_failed');
    return value.data;
  } finally {
    chrome.windows.remove(win.id).catch(() => {});
  }
}

// ─── Playlist duplicate check: scan the real playlist list in a hidden tab ──
// audio.getPlaylists (VK's internal web API) required hand-parsing the
// access_token out of localStorage and reconstructing the client_id, and the
// whole paginated fetch had to finish inside one 15s window — fragile for any
// account with a lot of playlists, and any failure (timeout, token hiccup)
// silently proceeded as "no duplicate found" with zero feedback. Instead of
// calling the API, open the owner's own /audios page in a background window
// (same trick as runInGeniusPage above) and let our own content.js — already
// auto-injected there via manifest content_scripts, no extra host permission
// needed — click "Показать все" and scroll the catalog list until every
// playlist cell is mounted, then read titles straight off the DOM: exactly
// what a user would see if they checked by hand.
// content.js's VMU_SCAN_PLAYLISTS listener is registered once the content
// script runs, which races the window's 'complete' status slightly (SPA
// hydration, document_idle timing) — retry on "no receiving end" instead of
// failing on the first attempt.
function sendMessageWithRetry(tabId, message, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      chrome.tabs.sendMessage(tabId, message, res => {
        const err = chrome.runtime.lastError;
        if (err || !res) {
          if (Date.now() >= deadline) { reject(new Error(err?.message || 'scan_timeout')); return; }
          setTimeout(attempt, 400);
          return;
        }
        resolve(res);
      });
    };
    attempt();
  });
}

async function scanPlaylistsInHiddenTab(url) {
  if (!url) throw new Error('scan_no_url');
  const win = await chrome.windows.create({ url, focused: false, state: 'minimized', type: 'popup' });
  await chrome.windows.update(win.id, { state: 'minimized', focused: false }).catch(() => {});
  const tabId = win.tabs?.[0]?.id;
  try {
    if (!tabId) throw new Error('scan_window_no_tab');
    await waitForTabComplete(tabId, 20000);
    const result = await sendMessageWithRetry(tabId, { type: 'VMU_SCAN_PLAYLISTS' }, 30000);
    if (!result.ok) throw new Error(result.error || 'scan_failed');
    return { ok: true, titles: result.titles || [] };
  } finally {
    chrome.windows.remove(win.id).catch(() => {});
  }
}

async function geniusSearch(query) {
  if (!query || !query.trim()) return { ok: false, error: 'пустой запрос' };
  try {
    const albums = await runInGeniusPage('https://genius.com/', async (q) => {
      try {
        const res = await fetch('/api/search/album?q=' + encodeURIComponent(q), { credentials: 'same-origin' });
        if (!res.ok) return { ok: false, error: 'Genius API вернул ' + res.status };
        const data = await res.json();
        const hits = data?.response?.sections?.[0]?.hits || [];
        const found = hits
          .filter(h => h.type === 'album' && h.result)
          .map(h => ({
            id: h.result.id,
            name: h.result.name || '',
            artist: h.result.artist?.name || '',
            release: h.result.release_date_for_display || '',
            cover: h.result.cover_art_thumbnail_url || h.result.cover_art_url || null,
            // Full-res variant for the cover-text-overlay editor (vs. the thumbnail
            // above, used for the small result-list icon) — falls back to the
            // thumbnail if Genius didn't send a separate full-size URL.
            coverFull: h.result.cover_art_url || h.result.cover_art_thumbnail_url || null,
            url: h.result.url,
          }));
        if (!found.length) return { ok: false, error: 'ничего не найдено на Genius' };
        return { ok: true, data: found };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    }, [query]);
    return { ok: true, albums };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

// Loads the album page directly when albumId isn't already known (e.g. the
// user pasted a genius.com/albums/... link instead of using search) so
// window.__PRELOADED_STATE__ can supply its numeric id, then paginates that
// same page's own /api/albums/{id}/tracks. Genius doesn't embed the actual
// tracklist in the page's initial state, only the id, so the follow-up calls
// are still needed — just run in-page now instead of bare from the worker.
async function geniusAlbumTracks(albumId, albumUrl) {
  const url = albumUrl || 'https://genius.com/';
  try {
    const tracks = await runInGeniusPage(url, async (knownId) => {
      try {
        let id = knownId;
        if (!id) id = window.__PRELOADED_STATE__?.islands?.album?.id;
        if (!id) return { ok: false, error: 'не нашёл id альбома на странице' };
        const out = [];
        let nextPage = 1, guard = 0;
        while (nextPage && guard++ < 10) {
          const res = await fetch(`/api/albums/${id}/tracks?page=${nextPage}`, { credentials: 'same-origin' });
          if (!res.ok) break;
          const data = await res.json();
          const pageTracks = data?.response?.tracks || [];
          for (const t of pageTracks) out.push({ number: t.number || 0, title: t.song?.title || '', artist: t.song?.artist_names || '' });
          nextPage = data?.response?.next_page || null;
        }
        if (!out.length) return { ok: false, error: 'треклист альбома пуст' };
        out.sort((a, b) => a.number - b.number);
        return { ok: true, data: out };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    }, [albumId || null]);
    return { ok: true, tracks };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

// Fetches an image cross-origin and hands it back to content.js as a data:
// URL — used by the cover-text-overlay editor to load a Genius cover onto a
// <canvas>. Drawing a cross-origin <img> straight onto canvas taints it
// (getImageData/toBlob throw) unless the remote server opts in with CORS
// headers, which Genius's image CDN doesn't reliably do. Fetching here in
// the service worker sidesteps that: with host_permissions for the target
// origin, the extension's own fetch isn't subject to the page's CORS
// restrictions. Returned as a data: URL (base64 string) rather than the raw
// ArrayBuffer since that's guaranteed to survive chrome.runtime.sendMessage
// without relying on structured-clone support for binary payloads.
async function fetchImageAsDataUrl(url) {
  if (!url) return { ok: false, error: 'пустой URL' };
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
  const buf = await res.arrayBuffer();
  const mime = res.headers.get('content-type') || 'image/jpeg';
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return { ok: true, dataUrl: `data:${mime};base64,${btoa(binary)}` };
}
