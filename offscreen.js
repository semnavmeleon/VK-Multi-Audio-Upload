// Offscreen document — records tab audio via tabCapture stream.
// Connects to background via a Port for reliable two-way messaging.

let mediaRecorder = null;
let chunks = [];
let stream = null;
let playbackEl = null;
let trackTitle = '';

// Connect to background — port is the reliable channel for all commands
const port = chrome.runtime.connect({ name: 'sc-recorder' });

port.onMessage.addListener((msg) => {
  if (msg.type === 'SC_OFFSCREEN_START') {
    startCapture(msg.streamId, msg.trackTitle).catch(err => {
      port.postMessage({ type: 'SC_CAPTURE_ERROR', error: err.message });
    });
  }
  if (msg.type === 'SC_OFFSCREEN_STOP') {
    stopCapture();
  }
});

async function startCapture(streamId, title) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  if (playbackEl) { playbackEl.srcObject = null; playbackEl = null; }
  if (stream) stream.getTracks().forEach(t => t.stop());

  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  // tabCapture routes audio away from speakers — pipe it back
  playbackEl = new Audio();
  playbackEl.srcObject = stream;
  playbackEl.volume = 1;
  await playbackEl.play();

  trackTitle = title || 'soundcloud-track';
  chunks = [];

  const mime = ['audio/webm;codecs=opus', 'audio/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) || '';
  const opts = { audioBitsPerSecond: 160000 };
  if (mime) opts.mimeType = mime;

  mediaRecorder = new MediaRecorder(stream, opts);
  mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
  mediaRecorder.onstop = saveRecording;
  mediaRecorder.start(500);

  port.postMessage({ type: 'SC_CAPTURE_STARTED' });
}

function stopCapture() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else {
    // Nothing was recording — still clean up
    saveRecording();
  }
}

function saveRecording() {
  if (playbackEl) { playbackEl.srcObject = null; playbackEl = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }

  if (!chunks.length) {
    port.postMessage({ type: 'SC_CAPTURE_DONE', filename: null });
    chunks = [];
    mediaRecorder = null;
    return;
  }

  const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
  const ext = (mediaRecorder?.mimeType || '').includes('ogg') ? '.ogg' : '.webm';
  const safe = trackTitle
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  const filename = 'SoundCloud/' + (safe || 'soundcloud-track') + ext;

  chunks = [];
  mediaRecorder = null;

  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, conflictAction: 'uniquify' }, () => {
    URL.revokeObjectURL(url);
    port.postMessage({ type: 'SC_CAPTURE_DONE', filename });
  });
}
