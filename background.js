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
