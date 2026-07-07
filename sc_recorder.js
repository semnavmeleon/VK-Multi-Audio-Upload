// SoundCloud recorder — getDisplayMedia + lamejs MP3 encoding at 128kbps.
// Source stream from SoundCloud is 128-160kbps AAC, so 128kbps MP3 matches
// the actual quality ceiling without inflating file size.

(function () {
  'use strict';

  const MP3_KBPS = 128; // matches SC's source quality; 320 just wastes space

  let audioCtx = null;
  let sourceNode = null;
  let processorNode = null;
  let mp3encoder = null;
  let mp3chunks = [];
  let isRecording = false;

  // ── UI ────────────────────────────────────────────────────────────────────

  function buildUI() {
    if (document.getElementById('vmu-sc-rec')) return;

    const wrap = document.createElement('div');
    wrap.id = 'vmu-sc-rec';
    wrap.style.cssText = [
      'position:fixed', 'bottom:72px', 'right:16px', 'z-index:2147483647',
      'display:flex', 'flex-direction:column', 'align-items:flex-end', 'gap:6px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    ].join(';');

    const status = document.createElement('div');
    status.id = 'vmu-sc-rec-status';
    status.style.cssText = [
      'background:rgba(0,0,0,.72)', 'color:#fff', 'border-radius:12px',
      'padding:5px 13px', 'font-size:12px', 'display:none', 'max-width:300px',
      'text-align:right', 'line-height:1.45',
    ].join(';');

    const btn = document.createElement('button');
    btn.id = 'vmu-sc-rec-btn';
    btn.textContent = '⏺ Записать MP3';
    btn.style.cssText = [
      'background:#ff5500', 'color:#fff', 'border:none', 'border-radius:20px',
      'padding:8px 18px', 'font-size:13px', 'font-weight:600', 'cursor:pointer',
      'box-shadow:0 2px 10px rgba(0,0,0,.4)', 'transition:background .15s',
    ].join(';');
    btn.addEventListener('click', onButtonClick);

    wrap.appendChild(status);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  function setStatus(text, visible = true) {
    const el = document.getElementById('vmu-sc-rec-status');
    if (!el) return;
    el.textContent = text;
    el.style.display = (visible && text) ? 'block' : 'none';
  }

  function setBtn(text, color, disabled = false) {
    const btn = document.getElementById('vmu-sc-rec-btn');
    if (!btn) return;
    btn.textContent = text;
    btn.style.background = color;
    btn.disabled = disabled;
  }

  function trackTitle() {
    const el =
      document.querySelector('.playbackSoundBadge__titleLink') ||
      document.querySelector('.soundTitle__title') ||
      document.querySelector('h1');
    return (el?.textContent || '').trim() || 'soundcloud-track';
  }

  // ── Recording ─────────────────────────────────────────────────────────────

  async function startRecording() {
    let displayStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 },
        audio: true,
        preferCurrentTab: true,
      });
    } catch (err) {
      setBtn('⏺ Записать MP3', '#ff5500');
      if (err.name !== 'NotAllowedError') setStatus('Ошибка: ' + err.message);
      else setStatus('', false);
      return;
    }

    displayStream.getVideoTracks().forEach(t => t.stop());
    const audioTracks = displayStream.getAudioTracks();
    if (!audioTracks.length) {
      setStatus('Нет аудио — поставь галочку "Поделиться звуком вкладки" в диалоге');
      setBtn('⏺ Записать MP3', '#ff5500');
      return;
    }

    const audioStream = new MediaStream(audioTracks);
    const sampleRate = 44100;

    audioCtx = new AudioContext({ sampleRate });
    sourceNode = audioCtx.createMediaStreamSource(audioStream);

    // ScriptProcessor collects PCM samples → lamejs encodes to MP3 on the fly
    const bufSize = 8192;
    processorNode = audioCtx.createScriptProcessor(bufSize, 2, 2);

    mp3encoder = new lamejs.Mp3Encoder(2, sampleRate, MP3_KBPS);
    mp3chunks = [];

    processorNode.onaudioprocess = (e) => {
      if (!isRecording) return;
      const left  = e.inputBuffer.getChannelData(0);
      const right = e.inputBuffer.getChannelData(1);
      const l16 = f32ToI16(left);
      const r16 = f32ToI16(right);
      const buf = mp3encoder.encodeBuffer(l16, r16);
      if (buf.length) mp3chunks.push(new Uint8Array(buf));
    };

    sourceNode.connect(processorNode);
    processorNode.connect(audioCtx.destination); // pass audio through to speakers

    isRecording = true;
    setBtn('⏹ Стоп', '#c0392b');
    setStatus('🔴 Запись идёт…');

    audioTracks[0].addEventListener('ended', stopRecording, { once: true });
  }

  function f32ToI16(f32) {
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return i16;
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    setBtn('⏺ Записать MP3', '#ff5500');
    setStatus('Кодируем MP3…');

    // Flush remaining MP3 frames
    if (mp3encoder) {
      const tail = mp3encoder.flush();
      if (tail.length) mp3chunks.push(new Uint8Array(tail));
    }

    // Cleanup audio graph
    try { processorNode?.disconnect(); } catch (_) {}
    try { sourceNode?.disconnect(); }    catch (_) {}
    try { audioCtx?.close(); }          catch (_) {}
    processorNode = sourceNode = audioCtx = mp3encoder = null;

    saveRecording();
  }

  function saveRecording() {
    if (!mp3chunks.length) { setStatus('', false); return; }

    const total = mp3chunks.reduce((s, c) => s + c.length, 0);
    const mp3 = new Uint8Array(total);
    let off = 0;
    for (const c of mp3chunks) { mp3.set(c, off); off += c.length; }
    mp3chunks = [];

    const blob = new Blob([mp3], { type: 'audio/mpeg' });
    const safe = trackTitle()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/\s+/g, ' ').trim().slice(0, 160);
    const filename = (safe || 'soundcloud-track') + '.mp3';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);

    setStatus('✓ ' + filename);
    setTimeout(() => setStatus('', false), 5000);
  }

  function onButtonClick() {
    if (isRecording) {
      stopRecording();
    } else {
      setBtn('⏺ Записать MP3', '#ff5500', true);
      setStatus('Открываем диалог выбора вкладки…');
      startRecording().finally(() => {
        if (!isRecording) setBtn('⏺ Записать MP3', '#ff5500', false);
      });
    }
  }

  // ── Init & SPA re-injection ───────────────────────────────────────────────

  function tryInject() {
    if (document.body && !document.getElementById('vmu-sc-rec')) buildUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject);
  } else {
    tryInject();
  }

  const _push = history.pushState.bind(history);
  history.pushState = function (...a) { _push(...a); setTimeout(tryInject, 800); };
  window.addEventListener('popstate', () => setTimeout(tryInject, 800));
})();
